/**
 * DOCX Validator
 *
 * Validates a DOCX buffer before sending it to the client:
 *   1. ZIP structure is readable
 *   2. word/document.xml exists and is parseable XML
 *   3. No unresolved {{…}} placeholders remain (they are blanked, not an error)
 *   4. Buffer is non-empty
 */

import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

/**
 * @param {Buffer|Uint8Array} buffer
 * @returns {Promise<{
 *   valid: boolean,
 *   issues: string[],
 *   filledPlaceholders: number,
 *   unresolvedPlaceholders: string[],
 * }>}
 */
export async function validateDocxBuffer(buffer) {
    const issues = [];
    const unresolvedPlaceholders = [];
    let filledPlaceholders = 0;

    // 1. Non-empty
    if (!buffer || buffer.length === 0) {
        issues.push('Buffer is empty');
        return { valid: false, issues, filledPlaceholders, unresolvedPlaceholders };
    }

    // 2. Valid ZIP
    let zip;
    try {
        zip = await JSZip.loadAsync(buffer);
    } catch (err) {
        issues.push('Invalid ZIP: ' + err.message);
        return { valid: false, issues, filledPlaceholders, unresolvedPlaceholders };
    }

    // 3. word/document.xml exists
    const docXml = zip.file('word/document.xml');
    if (!docXml) {
        issues.push('word/document.xml not found in ZIP');
        return { valid: false, issues, filledPlaceholders, unresolvedPlaceholders };
    }

    // 4. Parse XML
    const xmlText = await docXml.async('string');
    const parser = new DOMParser();
    let doc;
    try {
        doc = parser.parseFromString(xmlText, 'text/xml');
    } catch (err) {
        issues.push('XML parse error: ' + err.message);
        return { valid: false, issues, filledPlaceholders, unresolvedPlaceholders };
    }

    // Check for parser errors (xmldom doesn't throw on malformed XML)
    const parseErrors = doc.getElementsByTagName('parsererror');
    if (parseErrors.length > 0) {
        issues.push('XML parser reported errors');
        return { valid: false, issues, filledPlaceholders, unresolvedPlaceholders };
    }

    // 5. Scan ALL word/*.xml files for unresolved {{…}} placeholders
    const xmlFiles = Object.keys(zip.files).filter(
        (n) => n.startsWith('word/') && n.endsWith('.xml'),
    );

    const TAG_RE = /\{\{([^{}]+)\}\}/g;

    for (const name of xmlFiles) {
        const text = await zip.file(name).async('string');
        let m;
        TAG_RE.lastIndex = 0;
        while ((m = TAG_RE.exec(text)) !== null) {
            unresolvedPlaceholders.push(m[1]);
        }
    }

    return {
        valid: issues.length === 0,
        issues,
        filledPlaceholders,   // will be set by the caller
        unresolvedPlaceholders: [...new Set(unresolvedPlaceholders)],
    };
}
