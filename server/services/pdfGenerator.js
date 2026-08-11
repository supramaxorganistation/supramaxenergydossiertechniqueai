import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fillStegTemplate } from './stegTemplateFiller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, '..');

/**
 * Génère le PDF du dossier technique STEG à partir du gabarit officiel
 * (21 pages) dans lequel les valeurs du dossier sont inscrites aux
 * coordonnées exactes, puis fusionne les annexes téléversées (PDF & images).
 *
 * @param {Object} dossierData - Dossier complet (customerDetails, pvSystemParams, equipment, documents)
 * @param {Object} complianceReport - Résultat de computeStegCompliance
 * @param {Array<{fileName:string,fileUrl:string}>} [annexeFiles] - Documents à insérer en annexes
 * @returns {Promise<Buffer>}
 */
export async function generateStegPDF(dossierData, complianceReport, annexeFiles = []) {
  const stegBuffer = await fillStegTemplate(dossierData, complianceReport);
  const pdfDoc = await PDFDocument.load(stegBuffer);

  for (const file of annexeFiles || []) {
    const filePath = resolveUploadPath(file.fileUrl);
    if (!filePath || !fs.existsSync(filePath)) continue;

    const ext = path.extname(filePath).toLowerCase();
    try {
      const fileBytes = fs.readFileSync(filePath);

      if (ext === '.pdf') {
        const annexDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
        const pages = await pdfDoc.copyPages(annexDoc, annexDoc.getPageIndices());
        pages.forEach((p) => pdfDoc.addPage(p));
      } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        const image = ext === '.png' 
          ? await pdfDoc.embedPng(fileBytes)
          : await pdfDoc.embedJpg(fileBytes);

        const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4
        const { width: pageW, height: pageH } = page.getSize();
        const margin = 40;
        const maxW = pageW - margin * 2;
        const maxH = pageH - margin * 2;
        
        const scale = Math.min(maxW / image.width, maxH / image.height, 1);
        const drawW = image.width * scale;
        const drawH = image.height * scale;
        const x = (pageW - drawW) / 2;
        const y = (pageH - drawH) / 2;

        page.drawImage(image, { x, y, width: drawW, height: drawH });
      }
    } catch (err) {
      console.error(`Annexe ignorée (${file.fileName || file.fileUrl}) :`, err.message);
    }
  }

  return Buffer.from(await pdfDoc.save());
}

function resolveUploadPath(fileUrl) {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('/uploads/') || fileUrl.startsWith('uploads/')) {
    return path.join(SERVER_ROOT, fileUrl.replace(/^\/uploads\//, 'uploads/'));
  }
  if (fs.existsSync(fileUrl)) return fileUrl;
  return null;
}
