import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extract technical specifications from a PDF datasheet using Google Generative AI
 * @param {Buffer} fileBuffer - PDF file content
 * @param {string} fileName - Original filename
 * @returns {Promise<Object>} Extracted equipment specs
 */
export async function scanDatasheet(fileBuffer, fileName) {
  try {
    // Convert PDF to base64
    const base64Data = fileBuffer.toString('base64');

    // Prepare the prompt for AI extraction
    const extractionPrompt = `Analyze this technical datasheet PDF and extract the specifications.
    
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
    Return ONLY valid JSON, no additional text.`;

    // Use Gemini API with direct file input
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const response = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data,
        },
      },
      extractionPrompt,
    ]);

    const result = response.response.text();
    
    // Parse and validate JSON response
    let parsedSpecs;
    try {
      parsedSpecs = JSON.parse(result);
    } catch (e) {
      // Try to extract JSON from response if wrapped in text
      const jsonMatch = result.match(/\{[\s\S]*\}/);
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
