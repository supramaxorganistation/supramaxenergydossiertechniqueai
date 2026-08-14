/**
 * DOCX Branding
 *
 * Applies the Supramax Energy installer branding to a generated DOCX:
 *   - embeds the company logo (assets/logo-supramax.png) in word/media
 *   - anchors the logo on EVERY page, directly above the floating
 *     "Sigle installateur" textbox that lives in the template headers
 *     (header1.xml = cover page, header2.xml = all following pages —
 *     later sections inherit header2, so every page is covered)
 *
 * The logo position is derived from the textbox anchor coordinates so
 * it always sits centered above the "Sigle installateur" label.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');

/**
 * The logo is a plain file variable: drop any of these files into
 * server/assets/ (first match wins) and every export picks it up —
 * no code change, no restart needed.
 */
const LOGO_CANDIDATES = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo-supramax.png'];

const LOGO_HEIGHT_EMU = 900000;  // ≈ 2,4 cm
const LOGO_GAP_EMU = 40000;      // gap between logo bottom and textbox top

// Headers that carry the "Sigle installateur" textbox
const BRANDED_HEADERS = ['word/header1.xml', 'word/header2.xml'];

/** Locate the current logo file on disk (or null). */
export function findLogo() {
    for (const name of LOGO_CANDIDATES) {
        const p = path.join(ASSETS_DIR, name);
        if (fs.existsSync(p)) return { path: p, ext: path.extname(name).slice(1).toLowerCase() };
    }
    return null;
}

/** Read pixel dimensions from a PNG IHDR chunk. */
function pngSize(buffer) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Read pixel dimensions from a JPEG (first SOF0–SOF15 frame). */
function jpegSize(buffer) {
    let i = 2;
    while (i + 9 < buffer.length) {
        if (buffer[i] !== 0xff) { i += 1; continue; }
        const marker = buffer[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
            return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
        }
        i += 2 + buffer.readUInt16BE(i + 2);
    }
    return null;
}

function imageSize(buffer, ext) {
    const size = ext === 'png' ? pngSize(buffer) : jpegSize(buffer);
    if (size && size.width > 0 && size.height > 0) return size;
    return { width: 480, height: 503 }; // safe fallback (current logo ratio)
}

/**
 * Build the anchored <w:p> drawing that places the logo above the
 * "Sigle installateur" textbox found in `headerXml`.
 */
function logoParagraph(headerXml, relId, px) {
    // Locate the textbox anchor (page-relative offsets + width)
    const posH = headerXml.match(/<wp:positionH relativeFrom="page"><wp:posOffset>(-?\d+)<\/wp:posOffset><\/wp:positionH>/);
    const posV = headerXml.match(/<wp:positionV relativeFrom="page"><wp:posOffset>(-?\d+)<\/wp:posOffset><\/wp:positionV>/);
    const ext = headerXml.match(/<wp:extent cx="(\d+)" cy="(\d+)"/);

    const tbX = posH ? Number(posH[1]) : 886764;
    const tbY = posV ? Number(posV[1]) : 1302765;
    const tbW = ext ? Number(ext[1]) : 966469;

    const h = LOGO_HEIGHT_EMU;
    const w = Math.round((h * px.width) / px.height);
    const x = Math.round(tbX + tbW / 2 - w / 2);
    const y = Math.round(tbY - h - LOGO_GAP_EMU);

    return (
        '<w:p><w:r><w:drawing>' +
        '<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" ' +
        'relativeHeight="486734848" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">' +
        '<wp:simplePos x="0" y="0"/>' +
        `<wp:positionH relativeFrom="page"><wp:posOffset>${x}</wp:posOffset></wp:positionH>` +
        `<wp:positionV relativeFrom="page"><wp:posOffset>${y}</wp:posOffset></wp:positionV>` +
        `<wp:extent cx="${w}" cy="${h}"/>` +
        '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
        '<wp:wrapNone/>' +
        '<wp:docPr id="97" name="Logo Supramax Energy"/>' +
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
        '<pic:pic><pic:nvPicPr><pic:cNvPr id="97" name="logo-supramax.png"/><pic:cNvPicPr/></pic:nvPicPr>' +
        `<pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
        `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>` +
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
        '</pic:pic></a:graphicData></a:graphic>' +
        '</wp:anchor></w:drawing></w:r></w:p>'
    );
}

/**
 * Apply Supramax Energy branding to an open JSZip DOCX package.
 * Mutates the zip in place (adds media + rewrites headers/rels).
 *
 * @param {import('jszip')} zip – loaded DOCX package
 */
export async function applyBranding(zip) {
    const logo = findLogo();
    if (!logo) {
        console.warn('[BRANDING] No logo file in', ASSETS_DIR, '— skipping.');
        return;
    }

    const logoBytes = fs.readFileSync(logo.path);
    const px = imageSize(logoBytes, logo.ext);
    const jpeg = logo.ext === 'jpg' || logo.ext === 'jpeg';
    const mediaName = `media/installer-logo.${jpeg ? 'jpeg' : logo.ext}`;
    zip.file('word/' + mediaName, logoBytes);

    // Make sure [Content_Types].xml declares the image extension
    const ctFile = zip.file('[Content_Types].xml');
    if (ctFile) {
        let ct = await ctFile.async('string');
        const ext = mediaName.split('.').pop();
        if (!ct.includes(`Extension="${ext}"`)) {
            const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
            ct = ct.replace(
                /<Types\b[^>]*>/,
                (m) => m + `<Default Extension="${ext}" ContentType="${contentType}"/>`,
            );
            zip.file('[Content_Types].xml', ct);
        }
    }

    for (const headerName of BRANDED_HEADERS) {
        const headerFile = zip.file(headerName);
        if (!headerFile) continue;

        let xml = await headerFile.async('string');
        if (xml.includes('Logo Supramax Energy')) continue; // already branded

        // ── relationship ─────────────────────────────────────────────
        const relsName = headerName.replace('word/', 'word/_rels/') + '.rels';
        const IMAGE_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
        let relId;

        const relsFile = zip.file(relsName);
        if (relsFile) {
            let rels = await relsFile.async('string');
            const ids = [...rels.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
            relId = 'rId' + (ids.length > 0 ? Math.max(...ids) + 1 : 1);
            rels = rels.replace(
                '</Relationships>',
                `<Relationship Id="${relId}" Type="${IMAGE_TYPE}" Target="${mediaName}"/></Relationships>`,
            );
            zip.file(relsName, rels);
        } else {
            relId = 'rId1';
            zip.file(
                relsName,
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                `<Relationship Id="${relId}" Type="${IMAGE_TYPE}" Target="${mediaName}"/>` +
                '</Relationships>',
            );
        }

        // ── anchored logo above "Sigle installateur" ─────────────────
        xml = xml.replace('</w:hdr>', logoParagraph(xml, relId, px) + '</w:hdr>');
        zip.file(headerName, xml);
    }

    console.log('[BRANDING] Logo', path.basename(logo.path), 'placed above "Sigle installateur" in',
        BRANDED_HEADERS.join(', '));
}
