/**
 * DOCX Template Filler
 *
 * Opens a .docx (ZIP), walks every word/*.xml file, resolves {{placeholder}}
 * tags—even when split across multiple <w:r> runs—and replaces them with
 * values from the field map.
 *
 * Approach (no Docxtemplater, no Puppeteer):
 *   1. Load DOCX via JSZip
 *   2. For every word/*.xml: concatenate visible text across <w:t> nodes
 *      inside each paragraph/cell, detect {{…}} spans, then splice the
 *      replacement value into the correct <w:t> while removing the
 *      leftover fragments in sibling runs.
 *   3. Re-pack the ZIP and return a Buffer.
 */

import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildFieldMap, INSTALLER_NAME } from './stegDocxFieldMap.js';
import { validateDocxBuffer } from './docxValidator.js';
import { AI_TEXT_KEYS, generateAiTexts } from './aiTextGenerator.js';
import { applyBranding } from './docxBranding.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(
    __dirname, '..', 'assets', 'templates', 'template-safe-placeholders.docx',
);

// ── XML helpers ──────────────────────────────────────────────────────

function xmlEscape(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Prepare a replacement value for insertion inside a <w:t> node.
 * Line breaks (\n) become real Word line breaks (<w:br/>).
 */
function xmlValue(v) {
    return String(v ?? '')
        .split(/\r?\n/)
        .map(xmlEscape)
        .join('</w:t><w:br/><w:t xml:space="preserve">');
}

/**
 * Collect all XML files inside the DOCX ZIP that may contain text.
 */
function xmlFileNames(zip) {
    return Object.keys(zip.files).filter(
        (n) => n.startsWith('word/') && n.endsWith('.xml'),
    );
}

// ── Cross-run placeholder resolver ───────────────────────────────────

/**
 * Regex to find a full {{key}} tag.  The key itself never contains braces.
 */
const TAG_RE = /\{\{([^{}]+)\}\}/g;

/**
 * Replace every {{…}} placeholder in `xmlText`, looking up values in
 * `fieldMap`.  Handles tags that span multiple <w:r> runs by first
 * concatenating the visible text of sibling <w:t> elements, detecting
 * the tag in the concatenation, then splicing the replacement back.
 *
 * The implementation works on the raw XML string (not a DOM) so that
 * we never alter unrelated markup, styles, or relationships.
 */
function resolvePlaceholders(xmlText, fieldMap) {
    // Fast-path: if there are no {{ at all, skip.
    if (!xmlText.includes('{{')) return xmlText;

    // Step 1 — Build a virtual "text stream" across all <w:t> segments.
    //
    // Each entry:  { start, end, segStart, segEnd }
    //   start/end   → offsets in the full XML string where the <w:t…>…</w:t>
    //                   element's *text content* lives
    //   segStart/segEnd → offsets in the concatenated plain-text string
    //
    // We use a regex to find every <w:t …>TEXT</w:t> and record positions.

    // Matches <w:t>…</w:t> or <w:t xml:space="preserve">…</w:t>
    const WT_RE = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;

    const segments = [];
    let concat = '';
    let m;
    while ((m = WT_RE.exec(xmlText)) !== null) {
        const textStart = m.index + m[0].indexOf(m[1]);  // offset of TEXT inside XML
        const textEnd = textStart + m[1].length;
        const segStart = concat.length;
        concat += m[1];
        segments.push({
            xmlStart: textStart,
            xmlEnd: textEnd,
            segStart,
            segEnd: concat.length,
        });
    }

    // Step 2 — Find all {{key}} in the concatenated text.
    const replacements = []; // { key, cStart, cEnd } (offsets in `concat`)
    let tm;
    TAG_RE.lastIndex = 0;
    while ((tm = TAG_RE.exec(concat)) !== null) {
        replacements.push({
            key: tm[1],
            cStart: tm.index,
            cEnd: tm.index + tm[0].length,
        });
    }

    if (replacements.length === 0) return xmlText;

    // Step 3 — For each replacement, determine which <w:t> segments it
    // overlaps, then splice the value into the first overlapping segment
    // and blank out the tag characters in subsequent segments.

    // We'll build a list of edits to apply to the XML string.
    // Each edit: { xmlOffset, deleteCount, insertText }
    // Edits must be applied from end → start so that offsets remain valid.

    const edits = [];

    for (const rep of replacements) {
        const value = xmlValue(fieldMap[rep.key] ?? '');

        // Find segments overlapping [rep.cStart … rep.cEnd)
        const overlapping = segments.filter(
            (s) => s.segEnd > rep.cStart && s.segStart < rep.cEnd,
        );
        if (overlapping.length === 0) continue;

        const first = overlapping[0];
        const last = overlapping[overlapping.length - 1];

        // How many characters of the tag live in the first segment?
        const firstSegTagStart = Math.max(rep.cStart, first.segStart);
        const firstSegTagEnd = Math.min(rep.cEnd, first.segEnd);
        const firstXmlOff = first.xmlStart + (firstSegTagStart - first.segStart);
        const firstXmlDel = firstSegTagEnd - firstSegTagStart;

        // Insert the value at the start of the tag in the first segment.
        edits.push({ xmlOffset: firstXmlOff, deleteCount: firstXmlDel, insertText: value });

        // For subsequent segments, delete the portion that belongs to the tag.
        for (let i = 1; i < overlapping.length; i++) {
            const seg = overlapping[i];
            const segTagStart = Math.max(rep.cStart, seg.segStart);
            const segTagEnd = Math.min(rep.cEnd, seg.segEnd);
            const xmlOff = seg.xmlStart + (segTagStart - seg.segStart);
            const xmlDel = segTagEnd - segTagStart;
            edits.push({ xmlOffset: xmlOff, deleteCount: xmlDel, insertText: '' });
        }
    }

    // Step 4 — Apply edits from end to start.
    edits.sort((a, b) => b.xmlOffset - a.xmlOffset);

    let result = xmlText;
    for (const e of edits) {
        result = result.slice(0, e.xmlOffset) + e.insertText + result.slice(e.xmlOffset + e.deleteCount);
    }

    return result;
}

// ── Main entry point ─────────────────────────────────────────────────

/**
 * Generate a STEG technical dossier as a DOCX buffer from the official
 * template (template-safe-placeholders.docx).
 *
 * Merge order (last wins):
 *   1. buildFieldMap() — computed dossier / compliance values
 *   2. AI-generated French prose for empty narrative keys (Gemini)
 *   3. dossier.variables — user overrides defined in the dossier UI
 *
 * @param {Object} dossierData      – full dossier document (may carry .variables)
 * @param {Object} complianceReport – output of computeStegCompliance()
 * @returns {Promise<{buffer: Buffer, generatedTexts: Record<string,string>}>}
 */
export async function generateStegDOCX(dossierData, complianceReport) {
    const templateBytes = fs.readFileSync(TEMPLATE_PATH);
    const zip = await JSZip.loadAsync(templateBytes);

    const fieldMap = buildFieldMap(dossierData, complianceReport);

    // User-defined variable overrides (dossier UI)
    const userVars = dossierData?.variables && typeof dossierData.variables === 'object'
        ? dossierData.variables
        : {};

    // AI-generate French prose for narrative keys still empty AND not overridden
    const missingAiKeys = AI_TEXT_KEYS.filter(
        (k) => !fieldMap[k] && !(k in userVars),
    );
    const generatedTexts = missingAiKeys.length > 0
        ? await generateAiTexts(dossierData, complianceReport, missingAiKeys)
        : {};

    Object.assign(fieldMap, generatedTexts, userVars);

    // The installer is always Supramax Energy — overrides never apply.
    fieldMap.installer = INSTALLER_NAME;

    const usedKeys = new Set();
    const xmlFiles = xmlFileNames(zip);

    for (const name of xmlFiles) {
        const original = await zip.file(name).async('string');

        // Track which keys exist in the template (before replacement)
        for (const key of Object.keys(fieldMap)) {
            if (original.includes('{{' + key + '}}')) usedKeys.add(key);
        }

        const replaced = resolvePlaceholders(original, fieldMap);
        zip.file(name, replaced);
    }

    const allKeys = new Set(Object.keys(fieldMap));
    const unusedKeys = [...allKeys].filter((k) => !usedKeys.has(k));
    if (unusedKeys.length > 0) {
        console.log('[DOCX] Fields in map but not found in template:', unusedKeys.join(', '));
    }

    // Supramax Energy logo above "Sigle installateur" on every page
    await applyBranding(zip);

    // Pack the ZIP
    const outBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });

    // Validate before returning
    const validation = await validateDocxBuffer(outBuffer);
    if (!validation.valid) {
        console.error('[DOCX] Validation failed:', validation.issues);
        throw new Error('DOCX validation failed: ' + validation.issues.join('; '));
    }

    if (validation.unresolvedPlaceholders.length > 0) {
        console.warn(
            '[DOCX] Unresolved placeholders (left blank):',
            validation.unresolvedPlaceholders.join(', '),
        );
    }

    console.log('[DOCX] Generation OK —', usedKeys.size, '/', allKeys.size, 'fields mapped,',
        validation.unresolvedPlaceholders.length, 'unresolved (blanked).');

    return { buffer: Buffer.from(outBuffer), generatedTexts };
}
