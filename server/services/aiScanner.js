import fs from 'fs';
import path from 'path';
import { aiClient, AI_MODEL, stripThinking } from './aiClient.js';

/** Max characters of extracted PDF text sent to the model. */
const MAX_PDF_TEXT = 14000;

/**
 * Extract technical specifications from a PDF datasheet.
 * Qwen3-8B is text-only: the PDF text is extracted server-side (pdf-parse)
 * and the model returns the specs as JSON.
 * @param {Buffer} fileBuffer - PDF file content
 * @param {string} fileName - Original filename
 * @returns {Promise<Object>} Extracted equipment specs
 */
export async function scanDatasheet(fileBuffer, fileName) {
  try {
    // Extract the text content of the PDF (same pdf-parse v2 API as docxToPdf.js)
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
    const result = await parser.getText();
    const pdfText = (result.pages || []).map((p) => p.text || '').join('\n').trim();
    if (!pdfText) throw new Error('Aucun texte extractible dans ce PDF');

    // Prepare the prompt for AI extraction
    const extractionPrompt = `Analyze this technical datasheet and extract the specifications.

    Return a JSON object with this structure:
    {
      "category": "PANEL" | "INVERTER" | "PROTECTION_DC" | "PROTECTION_AC" | "CABLE",
      "brand": "manufacturer name",
      "model": "model number",
      "specs": {
        // For PANELS: pmax (W), vmpp (V), impp (A), voc (V), isc (A), coeffVoc (%/°C), coeffIsc (%/°C), irm (A - reverse current withstand, e.g. 15), irradiance (W/m²), panelWeightKg (kg), panelLengthMm (mm), panelWidthMm (mm), panelAreaM2 (m²)
        // For INVERTERS: pac (W), vdcMax (V), idcMax (A), iscMax (A), nbMppt (number), mpptMin (V), mpptMax (V), vac (V), iacMax (A)
        // For DC PROTECTION (switch/disconnector and surge arrester): usec (V), ucpv (V), up (V), in (A for switch, kA for SPD), iscpv (A), inDisj (A), sensitivity (mA), uw (V - insulation withstand, e.g. 1000)
        // For AC PROTECTION (breaker and surge arrester): uoc (V), in (A), udis (V), inDisj (A), sensitivity (mA), uc (V), up (V), uw (V), type (I or II)
        // For CABLES: section (mm²), iz (A), material (Cu|Al), insulation (PVC|PR|XLPE), voltageRating (V), length (m), color
      }
    }

    Temperature coefficients: express them in %/°C (e.g. -0.25 means -0.25%/°C). Do NOT convert to decimals.
    Extract only numeric values. If a specification is not found, use null.
    Return ONLY valid JSON, no additional text.

    Datasheet text:
    ${pdfText.slice(0, MAX_PDF_TEXT)}`;

    const response = await aiClient().chat.completions.create({
      model: AI_MODEL,
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'You are a precise technical datasheet parser. You answer only with valid JSON.' },
        { role: 'user', content: extractionPrompt + '\n/no_think' },
      ],
    });

    const raw = stripThinking(response.choices?.[0]?.message?.content || '');

    // Parse and validate JSON response
    let parsedSpecs;
    try {
      parsedSpecs = JSON.parse(raw);
    } catch (e) {
      // Try to extract JSON from response if wrapped in text
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedSpecs = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to extract valid JSON from AI response');
      }
    }

    return {
      success: true,
      category: parsedSpecs.category || 'UNKNOWN',
      brand: parsedSpecs.brand || 'Unknown',
      model: parsedSpecs.model || 'Unknown',
      specs: parsedSpecs.specs || {},
      fileName,
      scannedAt: new Date(),
    };
  } catch (error) {
    console.error('Datasheet scan error:', error);
    return {
      success: false,
      error: error.message,
      category: 'UNKNOWN',
      brand: 'Unknown',
      model: 'Unknown',
      specs: {},
    };
  }
}

/**
 * Batch scan multiple datasheets
 */
export async function scanMultipleDatasheets(fileBuffers) {
  const results = await Promise.all(
    fileBuffers.map(({ buffer, fileName }) => scanDatasheet(buffer, fileName))
  );
  return results;
}
