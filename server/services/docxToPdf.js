/**
 * DOCX → PDF conversion via LibreOffice (headless).
 *
 * Converts the filled DOCX (official template) into a pixel-identical PDF,
 * preserving styles, tables and the auto-updated "Table des matières" page.
 *
 * Throws when LibreOffice is not installed so callers can fall back to the
 * legacy coordinate-based PDF generator.
 */

import fs from 'fs';
import path from 'path';
import libre from 'libreoffice-convert';
import JSZip from 'jszip';

const CANDIDATE_PATHS = [
    process.env.LIBRE_OFFICE_EXE,
    path.join(process.env.PROGRAMFILES || 'C:/Program Files', 'LibreOffice/program/soffice.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'LibreOffice/program/soffice.exe'),
].filter(Boolean);

function findSoffice() {
    for (const p of CANDIDATE_PATHS) {
        try {
            if (fs.existsSync(p)) return p;
        } catch {
            /* ignore */
        }
    }
    return null;
}

/** @returns {boolean} true when LibreOffice is available on this machine. */
export function isLibreOfficeAvailable() {
    return findSoffice() !== null;
}

/**
 * @param {Buffer} docxBuffer
 * @returns {Promise<Buffer>} PDF content
 */
export async function convertDocxToPdf(docxBuffer) {
    const soffice = findSoffice();
    if (!soffice) {
        throw new Error('LibreOffice not found — DOCX→PDF conversion unavailable');
    }

    return new Promise((resolve, reject) => {
        const options = {
            sofficeBinaryPaths: [soffice],
            execOptions: { timeout: 120_000, maxBuffer: 64 * 1024 * 1024 },
            fileName: 'dossier.docx',
        };
        libre.convertWithOptions(docxBuffer, '.pdf', undefined, options, (err, pdfBuffer) => {
            if (err) return reject(err);
            resolve(Buffer.from(pdfBuffer));
        });
    });
}

// ── Two-pass conversion with a real "Table des matières" ─────────────
// LibreOffice does not recalculate Word TOC fields during headless
// conversion, so we:
//   pass 1 → convert the DOCX (TOC placeholder) and read heading pages
//   pass 2 → rebuild the DOCX with a static TOC (entries + page numbers)
//            and convert again.

const PARA_RE = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
const WT_RE = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
const paraTextOf = (p) => [...p.matchAll(WT_RE)].map((m) => m[1]).join('');
const normalize = (s) =>
    s.toLowerCase().replace(/[\u2018\u2019']/g, "'").replace(/\s+/g, ' ').trim();

function xmlEscape(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/** Headings (Heading1/2/3 paragraphs) in document order. */
async function extractHeadings(docxBuffer) {
    const zip = await JSZip.loadAsync(docxBuffer);
    const xml = await zip.file('word/document.xml').async('string');
    const headings = [];
    for (const m of xml.matchAll(PARA_RE)) {
        const p = m[0];
        const style = (p.match(/w:pStyle w:val="([^"]+)"/) || [])[1] || '';
        const level = /^Heading1$/.test(style) ? 0 : /^Heading2$/.test(style) ? 0 : /^Heading3$/.test(style) ? 1 : -1;
        if (level < 0) continue;
        const text = paraTextOf(p).replace(/\s+/g, ' ').trim();
        if (text) headings.push({ text, level, xml: p });
    }
    return headings;
}

/** Locate each heading's page number in the pass-1 PDF. */
async function mapHeadingPages(pdfBuffer, headings) {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    const result = await parser.getText();
    const pages = (result.pages || []).map((p) => normalize(p.text || ''));

    const entries = [];
    let searchFrom = 0;
    for (const h of headings) {
        const needle = normalize(h.text);
        const short = needle.slice(0, Math.min(40, needle.length));
        let found = -1;
        for (let i = searchFrom; i < pages.length; i++) {
            if (pages[i].includes(needle) || (short.length >= 12 && pages[i].includes(short))) {
                found = i;
                break;
            }
        }
        if (found >= 0) {
            entries.push({ text: h.text, level: h.level, page: found + 1 });
            searchFrom = found; // headings only move forward
        }
    }
    return entries;
}

/** Replace the TOC field paragraph with static entries (right dot-tab + page). */
async function injectStaticToc(docxBuffer, entries) {
    const zip = await JSZip.loadAsync(docxBuffer);
    let xml = await zip.file('word/document.xml').async('string');

    let tocPara = null;
    for (const m of xml.matchAll(PARA_RE)) {
        if (m[0].includes('TOC \\o')) {
            tocPara = m[0];
            break;
        }
    }
    if (!tocPara) throw new Error('TOC field paragraph not found in DOCX');

    const entryParas = entries
        .map(({ text, level, page }) => {
            const indent = level > 0 ? '<w:ind w:left="420"/>' : '';
            return (
                '<w:p><w:pPr>' +
                '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9350"/></w:tabs>' +
                `<w:spacing w:after="80"/>${indent}` +
                '</w:pPr>' +
                `<w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>` +
                '<w:r><w:tab/></w:r>' +
                `<w:r><w:t>${page}</w:t></w:r></w:p>`
            );
        })
        .join('');

    xml = xml.replace(tocPara, entryParas);
    zip.file('word/document.xml', xml);

    return Buffer.from(
        await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }),
    );
}

/**
 * Convert a filled dossier DOCX to PDF with a real Table des matières
 * (correct page numbers) on page 2. Falls back to the plain conversion
 * when the TOC cannot be resolved.
 *
 * @param {Buffer} docxBuffer
 * @returns {Promise<Buffer>} PDF content
 */
export async function convertDocxToPdfWithStaticToc(docxBuffer) {
    const pass1 = await convertDocxToPdf(docxBuffer);
    try {
        const headings = await extractHeadings(docxBuffer);
        const entries = await mapHeadingPages(pass1, headings);
        if (entries.length === 0) return pass1;
        const staticDocx = await injectStaticToc(docxBuffer, entries);
        const finalPdf = await convertDocxToPdf(staticDocx);
        console.log(`[PDF] Static TOC injected (${entries.length} entries) — 2-pass conversion done`);
        return finalPdf;
    } catch (error) {
        console.warn('[PDF] Static TOC pass failed, returning pass-1 PDF:', error.message);
        return pass1;
    }
}
