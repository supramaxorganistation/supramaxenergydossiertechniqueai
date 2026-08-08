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
 * coordonnées exactes, puis fusionne les annexes téléversées.
 *
 * @param {Object} dossierData - Dossier complet (customerDetails, pvSystemParams, equipment, documents)
 * @param {Object} complianceReport - Résultat de computeStegCompliance
 * @param {Array<{fileName:string,fileUrl:string}>} [annexeFiles] - Documents à insérer en annexes
 * @returns {Promise<Buffer>}
 */
export async function generateStegPDF(dossierData, complianceReport, annexeFiles = []) {
  const pdfDoc = await PDFDocument.load(await fillStegTemplate(dossierData, complianceReport));

  for (const file of annexeFiles || []) {
    const filePath = resolveUploadPath(file.fileUrl);
    if (!filePath || !fs.existsSync(filePath)) continue;
    try {
      const annexBytes = fs.readFileSync(filePath);
      const annexDoc = await PDFDocument.load(annexBytes, { ignoreEncryption: true });
      const pages = await pdfDoc.copyPages(annexDoc, annexDoc.getPageIndices());
      pages.forEach((p) => pdfDoc.addPage(p));
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
