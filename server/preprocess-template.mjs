/**
 * One-shot template preprocessor for template-safe-placeholders.docx
 *
 *  1. Converts remaining literal markers into {{placeholder}} variables:
 *       "A Choisir la section des câbles de mise à la terre…" → {{earth_cable_desc}}
 *       "A décrire"                                            → {{structure_desc}}
 *  2. Renames the SOMMAIRE heading into TABLE DES MATIÈRES and
 *     replaces its placeholder content ({{a_completer}} + dotted line)
 *     with a real Word TOC field (auto-updated on open → page 2).
 *  3. Guarantees page breaks so the TOC sits on its own page (page 2)
 *     and the body starts on page 3.
 *  4. Enables <w:updateFields> in word/settings.xml so Word/LibreOffice
 *     refresh the TOC (with real page numbers) on open/convert.
 *
 * Keeps a .bak copy of the original template. Safe to re-run (idempotent).
 */
import JSZip from 'jszip';
import fs from 'fs';

const TPL = 'assets/templates/template-safe-placeholders.docx';
const BAK = 'assets/templates/template-safe-placeholders.bak.docx';

const raw = fs.readFileSync(TPL);
if (!fs.existsSync(BAK)) fs.writeFileSync(BAK, raw); // backup once

const zip = await JSZip.loadAsync(raw);
let xml = await zip.file('word/document.xml').async('string');

const WT_RE = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
const paraText = (p) => [...p.matchAll(WT_RE)].map((m) => m[1]).join('');
const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** Replace the visible text of a paragraph: first <w:t> gets `newText`, others blanked. */
function setParagraphText(p, newText) {
    let first = true;
    return p.replace(WT_RE, (_m, content) => {
        if (first) {
            first = false;
            const escaped = newText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<w:t xml:space="preserve">${escaped}</w:t>`;
        }
        return '<w:t xml:space="preserve"></w:t>';
    });
}

const PARA_RE = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
const paragraphs = [...xml.matchAll(PARA_RE)].map((m) => ({ xml: m[0], index: m.index }));

const log = [];

// ── 1. Literal markers → variables ───────────────────────────────────
const markerMap = [
    { match: 'a choisir la section des câbles de mise à la terre', variable: '{{earth_cable_desc}}' },
    { match: 'a décrire', variable: '{{structure_desc}}' },
];

for (const p of paragraphs) {
    const t = norm(paraText(p.xml));
    for (const { match, variable } of markerMap) {
        if (t === match || (t.startsWith(match) && !t.includes('{{'))) {
            const updated = setParagraphText(p.xml, variable);
            xml = xml.replace(p.xml, updated);
            p.xml = updated;
            log.push(`Marker → variable: "${t.slice(0, 50)}" → ${variable}`);
        }
    }
}

// ── 1b. "Sigle installateur" (headers) → {{sigle_installateur}} ──────
// The floating textbox in header1/header2 spells the label with two runs
// ("Sigle" + " installateur"); collapse them into one placeholder run so
// the label becomes an editable variable like the others.
const SIGLE_TWO_RUNS =
    '<w:t>Sigle</w:t></w:r>' +
    '<w:r><w:rPr><w:rFonts w:ascii="Calibri"/><w:spacing w:val="-2"/><w:sz w:val="22"/></w:rPr>' +
    '<w:t> installateur</w:t></w:r>';
const SIGLE_PLACEHOLDER = '<w:t>{{sigle_installateur}}</w:t></w:r>';

for (const name of ['word/header1.xml', 'word/header2.xml']) {
    const file = zip.file(name);
    if (!file) continue;
    const headerXml = await file.async('string');
    if (headerXml.includes(SIGLE_TWO_RUNS)) {
        const count = headerXml.split(SIGLE_TWO_RUNS).length - 1;
        zip.file(name, headerXml.split(SIGLE_TWO_RUNS).join(SIGLE_PLACEHOLDER));
        log.push(`${name}: "Sigle installateur" → {{sigle_installateur}} (${count}×)`);
    } else if (headerXml.includes('{{sigle_installateur}}')) {
        log.push(`${name}: {{sigle_installateur}} already present`);
    }
}

// ── 2. SOMMAIRE → TABLE DES MATIÈRES + TOC field ────────────────────
const TOC_RUNS =
    '<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>' +
    '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r>' +
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>' +
    '<w:r><w:t xml:space="preserve">Table des matières générée automatiquement.</w:t></w:r>' +
    '<w:r><w:fldChar w:fldCharType="end"/></w:r>';

for (const p of paragraphs) {
    const t = norm(paraText(p.xml));
    if (t === 'sommaire') {
        const updated = setParagraphText(p.xml, 'TABLE DES MATIÈRES');
        xml = xml.replace(p.xml, updated);
        p.xml = updated;
        log.push('Heading: SOMMAIRE → TABLE DES MATIÈRES');
    }
}

for (const p of paragraphs) {
    const text = paraText(p.xml);
    if (text.includes('{{a_completer}}')) {
        // Keep the paragraph opening tag + <w:pPr>…</w:pPr>, swap all runs for the TOC field
        const openTag = p.xml.match(/^<w:p\b[^>]*>/)[0];
        const ppr = p.xml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || '';
        const updated = `${openTag}${ppr}${TOC_RUNS}</w:p>`;
        xml = xml.replace(p.xml, updated);
        p.xml = updated;
        log.push('Inserted TOC field (replaces {{a_completer}})');
    }
    if (/^…{3,}$/.test(text.replace(/\s/g, '')) || /^…{3,}\.?$/.test(norm(text))) {
        xml = xml.replace(p.xml, '');
        log.push('Removed dotted-line paragraph under sommaire');
    }
}

// ── 3. Page breaks: cover → TOC (page 2) → body (page 3) ────────────
const PAGE_BREAK_PARA = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

/** Find the start of the <w:p> containing the first regex match. */
function paragraphStartOf(re) {
    const m = re.exec(xml);
    if (!m) return -1;
    const pStart = xml.lastIndexOf('<w:p>', m.index);
    const pStartAttr = xml.lastIndexOf('<w:p ', m.index);
    return Math.max(pStart, pStartAttr);
}

/** Is there a page break/section break within ~20000 chars before a match? */
function hasBreakBefore(re) {
    re.lastIndex = 0;
    const m = re.exec(xml);
    if (!m) return true; // unknown → leave untouched
    const before = xml.slice(Math.max(0, m.index - 20000), m.index);
    return /<w:br w:type="page"\/>|<w:pageBreakBefore|<w:sectPr/.test(before);
}

if (!hasBreakBefore(/TABLE DES MATIÈRES/)) {
    const cut = paragraphStartOf(/TABLE DES MATIÈRES/);
    if (cut > 0) {
        xml = xml.slice(0, cut) + PAGE_BREAK_PARA + xml.slice(cut);
        log.push('Added page break before TABLE DES MATIÈRES');
    }
}
if (!hasBreakBefore(/Etude de l(.)installation photovoltaïque/)) {
    const cut = paragraphStartOf(/Etude de l(.)installation photovoltaïque/);
    if (cut > 0) {
        xml = xml.slice(0, cut) + PAGE_BREAK_PARA + xml.slice(cut);
        log.push('Added page break before body (Etude de l\'installation)');
    }
}

zip.file('word/document.xml', xml);

// ── 4. settings.xml: updateFields on open ───────────────────────────
const settingsFile = zip.file('word/settings.xml');
if (settingsFile) {
    let settings = await settingsFile.async('string');
    if (!settings.includes('<w:updateFields')) {
        settings = settings.replace(/<w:settings([^>]*)>/, '<w:settings$1><w:updateFields w:val="true"/>');
        zip.file('word/settings.xml', settings);
        log.push('settings.xml: added <w:updateFields w:val="true"/>');
    } else {
        log.push('settings.xml: updateFields already present');
    }
} else {
    log.push('WARNING: word/settings.xml not found');
}

// ── 5. Scan every part for leftover literal markers ─────────────────
for (const name of Object.keys(zip.files)) {
    if (!name.startsWith('word/') || !name.endsWith('.xml')) continue;
    const content = await zip.file(name).async('string');
    const text = [...content.matchAll(WT_RE)].map((m) => m[1]).join(' ');
    for (const word of ['compléter', 'complèter', 'décrire', 'choisir']) {
        if (new RegExp(`(a|à)\\s+${word}`, 'i').test(text)) {
            log.push(`LEFTOVER in ${name}: "${word}" still present`);
        }
    }
}

// ── Save ─────────────────────────────────────────────────────────────
const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
fs.writeFileSync(TPL, out);
console.log('Template preprocessed OK:');
log.forEach((l) => console.log('  •', l));

// ── Verify ───────────────────────────────────────────────────────────
const check = await JSZip.loadAsync(fs.readFileSync(TPL));
const checkXml = await check.file('word/document.xml').async('string');
const keys = new Set([...checkXml.matchAll(/\{\{([^{}]+)\}\}/g)].map((m) => m[1]));
console.log('\nVerification:');
console.log('  placeholders count:', keys.size);
console.log('  has earth_cable_desc:', keys.has('earth_cable_desc'));
console.log('  has structure_desc:', keys.has('structure_desc'));
console.log('  a_completer removed:', !keys.has('a_completer'));
console.log('  TOC field present:', checkXml.includes('TOC \\o'));
console.log('  TABLE DES MATIÈRES present:', checkXml.includes('TABLE DES MATIÈRES'));
for (const name of ['word/header1.xml', 'word/header2.xml']) {
    const h = await check.file(name)?.async('string');
    console.log(`  ${name}: sigle placeholder:`, h ? h.includes('{{sigle_installateur}}') : 'missing',
        '| literal left:', h ? h.includes('>Sigle<') || h.includes(' installateur<') : 'missing');
}
