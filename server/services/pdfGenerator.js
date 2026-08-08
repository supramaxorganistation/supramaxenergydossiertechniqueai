import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, '..');

/**
 * Formate un nombre avec la virgule française (1.23 -> 1,23).
 */
function fr(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '–';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: digits });
}

function fr0(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '–';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

/**
 * Génère le PDF complet : dossier technique STEG (pages 1-22) puis
 * les annexes (fiches techniques / documents téléversés) fusionnées.
 *
 * @param {Object} dossierData - Dossier complet (customerDetails, pvSystemParams, equipment, documents)
 * @param {Object} complianceReport - Résultat de computeStegCompliance
 * @param {Array<{fileName:string,fileUrl:string}>} [annexeFiles] - Documents à insérer en annexes (chemins serveur)
 * @returns {Promise<Buffer>}
 */
export async function generateStegPDF(dossierData, complianceReport, annexeFiles = []) {
  const htmlContent = generateStegHTML(dossierData, complianceReport);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const mainPdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageBreaks: true,
    displayHeaderFooter: true,
    headerTemplate: htmlHeader(dossierData),
    footerTemplate: htmlFooter(),
    margin: { top: '105px', bottom: '80px', left: '60px', right: '60px' },
  });

  await browser.close();

  const pdfDoc = await PDFDocument.load(mainPdf);

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

/**
 * En-tête courant (toutes pages) : "Sigle installateur" à gauche, STEG à droite.
 */
function htmlHeader(dossierData) {
  const installer = dossierData?.createdBy?.name || 'Sigle installateur';
  const installerShort = installer.length > 18 ? installer.slice(0, 18) + '…' : installer;
  const safe = (s) => String(s || '').replace(/[^A-Za-zÀ-ÿ0-9 .,'-]/g, '');
  return `
  <div style="width:100%; font-family: Arial, sans-serif; font-size:8px; color:#1a3a5c;">
    <table style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="width:38%; border:1px solid #1a3a5c; padding:4px 6px;">
          <div style="font-weight:bold; font-size:8px; color:#1a3a5c;">Sigle installateur</div>
          <div style="font-size:9px; font-weight:bold;">${safe(installerShort)}</div>
        </td>
        <td style="width:24%;"></td>
        <td style="width:38%; border:1px solid #1a3a5c; padding:4px 6px; text-align:center;">
          <div style="font-weight:bold; font-size:9px; color:#c0392b;">STEG</div>
          <div style="font-size:7px;">Société Tunisienne de l'Electricité et du Gaz<br/>Raccordement IPV au réseau Basse Tension</div>
        </td>
      </tr>
    </table>
  </div>`;
}

function htmlFooter() {
  return `
  <div style="width:100%; font-family: Arial, sans-serif; font-size:8px; color:#666; text-align:center;">
    Page <span class="pageNumber"></span> / <span class="totalPages"></span>
  </div>`;
}

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Génère le HTML du dossier technique STEG (structure 21 pages + page ANNEXE IPV).
 */
export function generateStegHTML(dossierData, complianceReport) {
  const { customerDetails = {}, pvSystemParams = {}, equipment = {}, documents = [], createdBy } = dossierData;
  const r = complianceReport || {};
  const pt = r.parameters?.panelTemperatureAdjustments || {};
  const sc = r.compatibility?.stringComputation || {};
  const pr = r.compatibility?.powerRatio || {};
  const ms = r.compatibility?.maxStringsParallel || {};
  const ds = r.protections?.dcSwitch || {};
  const spdDc = r.protections?.spdDc || {};
  const ab = r.protections?.acBreaker || {};
  const spdAc = r.protections?.spdAc || {};
  const cdc = r.cableAnalysis?.dc || {};
  const cac = r.cableAnalysis?.ac || {};
  const wa = r.windAnalysis || {};

  const panel = equipment?.panel?.specs || {};
  const inv = equipment?.inverter?.specs || {};
  const dcProt = equipment?.dcProtection?.specs || {};
  const acProt = equipment?.acProtection?.specs || {};
  const dcCable = equipment?.dcCable?.specs || {};
  const acCable = equipment?.acCable?.specs || {};

  const panelBrand = equipment?.panel?.brand || pvSystemParams?.panelBrand || '–';
  const panelModel = equipment?.panel?.model || '–';
  const invBrand = equipment?.inverter?.brand || '–';
  const invModel = equipment?.inverter?.model || pvSystemParams?.inverterModel || '–';
  const dcProtBrand = equipment?.dcProtection?.brand || '–';
  const dcProtModel = equipment?.dcProtection?.model || '–';
  const acProtBrand = equipment?.acProtection?.brand || '–';
  const acProtModel = equipment?.acProtection?.model || '–';
  const dcCableBrand = equipment?.dcCable?.brand || '–';
  const acCableBrand = equipment?.acCable?.brand || '–';

  const panelCount = pvSystemParams?.panelCount || sc.panelCount || 1;
  const pmax = panel.pmax || pr.pvPower / panelCount;
  const peakKwc = pvSystemParams?.peakPowerKwc || fr(pmax * panelCount / 1000).replace(',', '.') || 0;
  const installer = createdBy?.name || 'Installateur';
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const inverterPac = inv.pac || pr.acPower || 3000;
  const udcMax = inv.vdcMax || 600;
  const umpptMin = inv.mpptMin || 100;
  const umpptMax = inv.mpptMax || 500;
  const idcMax = inv.idcMax || 12.5;
  const iscMaxInv = inv.iscMax || Math.round(idcMax * 1.25 * 100) / 100;
  const iacMax = inv.iacMax || ab.ieMin || cac.iacMax || fr(pac2A(inverterPac)).replace(',', '.');
  const vac = inv.vac || cac.vGrid || 230;

  const formatDeltaVolt = (dropPercent, base) =>
    dropPercent != null && base != null ? fr((dropPercent / 100) * base) : '–';

  const coverGps = {
    lat: customerDetails.gpsLatitude,
    lon: customerDetails.gpsLongitude,
    alt: customerDetails.gpsAltitude,
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Dossier technique STEG</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: 9px; color: #111; line-height: 1.45; margin: 0; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .content { padding: 4px 2px; }
  h1.doc-title { font-size: 16px; color: #1a3a5c; text-align: center; margin: 0 0 14px; }
  h2 { font-size: 11px; color: #1a3a5c; margin: 14px 0 6px; text-transform: uppercase; }
  h3 { font-size: 10px; color: #1a3a5c; margin: 10px 0 4px; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0; }
  th, td { border: 1px solid #333; padding: 3px 5px; vertical-align: top; font-size: 8.5px; }
  th { background: #dce6f1; color: #1a3a5c; text-align: center; font-weight: bold; }
  .center { text-align: center; }
  .right { text-align: right; }
  .formula { font-size: 9px; margin: 6px 0 2px; }
  .appnum { color: #c00000; font-weight: bold; }
  .conclusion { border: 1px solid #1a3a5c; background: #f4f8fc; padding: 6px 8px; margin: 6px 0; }
  .note { font-size: 8px; color: #444; }
  .toc td { border: none; border-bottom: 1px dotted #999; padding: 4px 2px; font-size: 10px; }
  .toc .dots { text-align: right; color: #666; }
  ul { margin: 4px 0 4px 18px; padding: 0; }
  li { margin: 2px 0; }
  .page-title { border: 1px solid #1a3a5c; margin-top: 60px; padding: 40px 20px; text-align: center; }
  .page-title h1 { font-size: 20px; color: #1a3a5c; margin: 0 0 10px; }
  .page-title h2 { font-size: 14px; color: #1a3a5c; margin: 0; text-transform: none; }
  .cover-field td { border: 1px solid #333; padding: 6px 8px; }
  .cover-field .lbl { width: 150px; font-weight: bold; color: #1a3a5c; background: #dce6f1; }
</style>
</head>
<body>

<!-- ============ PAGE 1 : COUVERTURE ============ -->
<div class="page">
  <div class="content">
    <table style="width:100%; margin:10px 0 0;">
      <tr>
        <td style="width:40%; border:1px solid #1a3a5c; padding:8px; text-align:center; vertical-align:middle;">
          <div style="font-size:9px; color:#1a3a5c; font-weight:bold;">Sigle installateur</div>
          <div style="font-size:12px; font-weight:bold; margin-top:4px;">${esc(installer)}</div>
        </td>
        <td style="width:20%;"></td>
        <td style="width:40%; border:1px solid #1a3a5c; padding:8px; text-align:center; vertical-align:middle;">
          <div style="font-size:20px; font-weight:bold; color:#c0392b;">STEG</div>
          <div style="font-size:8px;">Société Tunisienne de l'Electricité et du Gaz</div>
        </td>
      </tr>
    </table>

    <h1 class="doc-title" style="margin-top:40px;">Dossier technique d'une installation<br/>photovoltaïque raccordée au réseau<br/>Basse tension</h1>

    <table class="cover-field" style="margin-top:24px;">
      <tr>
        <td class="lbl">Client BT</td>
        <td>${esc(customerDetails.name || '–')}</td>
      </tr>
      <tr>
        <td class="lbl">Référence</td>
        <td>${esc(customerDetails.stegMeterRef || '–')}</td>
      </tr>
      <tr>
        <td class="lbl">Localisation avec coordonnées GPS</td>
        <td>${esc(customerDetails.address || '–')}
          ${coverGps.lat ? `<div class="note" style="margin-top:4px;">Coordonnées GPS du site :<br/>
            Latitude : <b>${fr(coverGps.lat, 6)}</b><br/>
            Longitude : <b>${fr(coverGps.lon, 6)}</b><br/>
            Altitude : <b>${fr0(coverGps.alt)} m</b></div>` : ''}
        </td>
      </tr>
      <tr>
        <td class="lbl">Puissance</td>
        <td>${fr(peakKwc, 2)} kWc</td>
      </tr>
      <tr>
        <td class="lbl">Installateur</td>
        <td>${esc(installer)}</td>
      </tr>
      <tr>
        <td class="lbl">Date</td>
        <td>${dateStr}</td>
      </tr>
      <tr>
        <td class="lbl">Version</td>
        <td>1.0</td>
      </tr>
    </table>

    <div style="margin-top:60px; border:1px solid #1a3a5c; padding:10px; text-align:center; height:90px;">
      <div style="font-size:8px; color:#1a3a5c;">Sigle installateur</div>
      <div style="font-size:11px; font-weight:bold; margin-top:6px;">${esc(installer)}</div>
    </div>
  </div>
</div>

<!-- ============ PAGE 2 : TABLE DES MATIÈRES ============ -->
<div class="page">
  <div class="content">
    <h1 class="doc-title" style="font-size:14px;">Table des matières</h1>
    <table class="toc">
      <tr><td>I. Introduction générale</td><td class="dots">4</td></tr>
      <tr><td>II. Documentation de la Solution proposée</td><td class="dots">4</td></tr>
      <tr><td>III. Equipements de la Solution proposée</td><td class="dots">4</td></tr>
      <tr><td>IV. Caractéristiques Techniques des équipements choisis :</td><td class="dots">5</td></tr>
      <tr><td style="padding-left:18px;">1. Panneau</td><td class="dots">5</td></tr>
      <tr><td style="padding-left:18px;">2. Onduleur (s)</td><td class="dots">5</td></tr>
      <tr><td style="padding-left:18px;">3. Caractéristiques équipements DC et AC</td><td class="dots">6</td></tr>
      <tr><td style="padding-left:18px;">4. Compatibilité de l'onduleur :</td><td class="dots">6</td></tr>
      <tr><td>V. Dimensionnement Dispositifs de protection coté DC :</td><td class="dots">8</td></tr>
      <tr><td style="padding-left:18px;">1. Nombre maximal de chaînes en parallèle sans protection</td><td class="dots">8</td></tr>
      <tr><td style="padding-left:18px;">2. Interrupteur sectionneur DC</td><td class="dots">8</td></tr>
      <tr><td style="padding-left:18px;">3. Parafoudre DC</td><td class="dots">9</td></tr>
      <tr><td>VI. Dimensionnement Dispositifs de protection coté AC :</td><td class="dots">9</td></tr>
      <tr><td style="padding-left:18px;">1. Disjoncteur (différentiel) AC :</td><td class="dots">9</td></tr>
      <tr><td style="padding-left:18px;">2. Parafoudre AC</td><td class="dots">10</td></tr>
      <tr><td>VII. Dimensionnement Câble DC/AC</td><td class="dots">10</td></tr>
      <tr><td style="padding-left:18px;">1. Câbles DC</td><td class="dots">10</td></tr>
      <tr><td style="padding-left:18px;">2. Câbles AC</td><td class="dots">14</td></tr>
      <tr><td>VIII. Description du câblage des panneaux et de la mise à la terre</td><td class="dots">18</td></tr>
      <tr><td>IX. Description de la mise en œuvre de la structure</td><td class="dots">18</td></tr>
      <tr><td>ANNEXE IPV</td><td class="dots">22</td></tr>
    </table>
  </div>
</div>

<!-- ============ PAGE 3 : ETUDE (titre) ============ -->
<div class="page">
  <div class="content">
    <div class="page-title">
      <h1>Etude de l'installation photovoltaïque</h1>
      <h2>raccordée au réseau Basse Tension</h2>
    </div>
  </div>
</div>

<!-- ============ PAGE 4 : I - II - III ============ -->
<div class="page">
  <div class="content">
    <h2>I. Introduction générale</h2>
    <p>Dans le cadre de la production d'énergie électrique, la société ${esc(installer)} a procédé à l'étude d'une installation de production photovoltaïque raccordée au réseau basse tension de la STEG.</p>
    <p>Le présent dossier technique, relatif à <b>M. / Mme ${esc(customerDetails.name || 'le client')}</b>, ${esc(customerDetails.address || '')}, est destiné à la STEG pour l'approbation de l'installation ${fr(peakKwc, 2)} kWc.</p>

    <h2>II. Documentation de la Solution proposée</h2>
    <table>
      <tr><th style="width:80%;">Désignation</th><th>Annexe</th></tr>
      <tr><td>Dossier administratif</td><td class="center">N°1</td></tr>
      <tr><td>Simulation PVSyst ou équivalent</td><td class="center">N°2</td></tr>
      <tr><td>Attestation de conformité d'un prototype de la structure</td><td class="center">N°3</td></tr>
      <tr><td>Schéma unifilaire détaillé</td><td class="center">N°4</td></tr>
      <tr><td>Plan d'implantation</td><td class="center">N°5</td></tr>
      <tr><td>Plan de situation</td><td class="center">N°6</td></tr>
      <tr><td>Schéma de câblage des panneaux et disposition des chaînes</td><td class="center">N°7</td></tr>
      <tr><td>Schéma de câblage des coffrets DC</td><td class="center">N°8</td></tr>
      <tr><td>Schéma de câblage des coffrets AC</td><td class="center">N°9</td></tr>
      <tr><td>Homologation de l'onduleur</td><td class="center">N°10</td></tr>
    </table>

    <h2>III. Equipements de la Solution proposée</h2>
    <table>
      <tr><th style="width:38%;">Désignation</th><th>Nombre</th><th>Marque</th><th>Référence</th><th>Annexe</th></tr>
      <tr><td>Modules</td><td class="center">${fr0(panelCount)}</td><td>${esc(panelBrand)}</td><td>${esc(panelModel)}</td><td class="center">N°11</td></tr>
      <tr><td>Onduleurs</td><td class="center">1</td><td>${esc(invBrand)}</td><td>${esc(invModel)}</td><td class="center">N°12</td></tr>
      <tr><td>Fusibles</td><td class="center">***</td><td>***</td><td>***</td><td class="center">N°13</td></tr>
      <tr><td>Parafoudres DC</td><td class="center">1</td><td>${esc(dcProtBrand)}</td><td>${esc(dcProtModel)}</td><td class="center">N°14</td></tr>
      <tr><td>Interrupteurs Sectionneurs DC</td><td class="center">1</td><td>${esc(dcProtBrand)}</td><td>${esc(dcProtModel)}</td><td class="center">N°15</td></tr>
      <tr><td>Parafoudre AC</td><td class="center">1</td><td>${esc(acProtBrand)}</td><td>${esc(acProtModel)}</td><td class="center">N°16</td></tr>
      <tr><td>Interrupteur sectionneur général</td><td class="center">***</td><td>***</td><td>***</td><td class="center">N°17</td></tr>
      <tr><td>Disjoncteurs différentiel AC 30mA</td><td class="center">1</td><td>${esc(acProtBrand)}</td><td>${esc(acProtModel)}</td><td class="center">N°18</td></tr>
      <tr><td>Disjoncteur général AC</td><td class="center">***</td><td>***</td><td>***</td><td class="center">N°19</td></tr>
      <tr><td>Câble DC</td><td class="center">***</td><td>${esc(dcCableBrand)}</td><td>${esc(dcCable.section ? dcCable.section + ' mm²' : '***')}</td><td class="center">N°20</td></tr>
      <tr><td>Câble AC</td><td class="center">***</td><td>${esc(acCableBrand)}</td><td>${esc(acCable.section ? acCable.section + ' mm²' : '***')}</td><td class="center">N°21</td></tr>
      <tr><td>Câble de mise à la terre</td><td class="center">***</td><td>***</td><td>***</td><td class="center">N°22</td></tr>
    </table>
  </div>
</div>

<!-- ============ PAGE 5 : IV - 1 Panneau / 2 Onduleur ============ -->
<div class="page">
  <div class="content">
    <table>
      <tr><th style="width:38%;">Désignation</th><th>Nombre</th><th>Marque</th><th>Référence</th><th>Annexe</th></tr>
      <tr><td>Connecteur MC4</td><td class="center">***</td><td>***</td><td>***</td><td class="center">N°23</td></tr>
      <tr><td>Répartiteurs</td><td class="center">1</td><td>***</td><td>***</td><td class="center">N°24</td></tr>
      <tr><td>Chemin de câble</td><td class="center">***</td><td>***</td><td>***</td><td class="center">N°25</td></tr>
    </table>

    <h2>IV. Caractéristiques Techniques des équipements choisis</h2>

    <h3>1. Panneau</h3>
    <table>
      <tr><th>Marque</th><th>Référence</th><th>Puissance unitaire (W) (STC)</th><th>Vmpp (STC)</th><th>Impp (STC)</th><th>Voc (STC)</th><th>Isc (STC)</th><th>Coef. Voc</th><th>Coef. Isc</th><th>IRM</th></tr>
      <tr>
        <td>${esc(panelBrand)}</td>
        <td>${esc(panelModel)}</td>
        <td class="center">${fr0(panel.pmax)} W</td>
        <td class="center">${fr(panel.vmpp)} V</td>
        <td class="center">${fr(panel.impp)} A</td>
        <td class="center">${fr(panel.voc)} V</td>
        <td class="center">${fr(panel.isc)} A</td>
        <td class="center">${fr(panel.coeffVoc)}%/°C</td>
        <td class="center">${fr(panel.coeffIsc)}%/°C</td>
        <td class="center">${fr(panel.irm)} A</td>
      </tr>
    </table>

    <h3>2. Onduleur (s)</h3>
    <table>
      <tr><th>Numéro onduleur</th><th>Nombre panneaux</th><th>Puissance crête DC</th><th>Rapport de puissance</th></tr>
      <tr class="center">
        <td>1</td>
        <td>${fr0(panelCount)}</td>
        <td>${fr0(pmax * panelCount)} Wc</td>
        <td>${fr(pr.ratio)}</td>
      </tr>
    </table>

    <table style="margin-top:8px;">
      <tr><th colspan="2">Onduleur N°1 : ${esc(invBrand)} ${esc(invModel)}</th></tr>
      <tr><td style="width:40%;">Marque</td><td>${esc(invBrand)}</td></tr>
      <tr><td>Référence</td><td>${esc(invModel)}</td></tr>
      <tr><td>Puissance AC (W)</td><td>${fr0(inverterPac)} W</td></tr>
      <tr><td>VDCmax (V)</td><td>${fr0(udcMax)} V</td></tr>
      <tr><td>IDCmax / MPPT (A)</td><td>${fr(idcMax)} A / ${fr0(inv.nbMppt || 1)}</td></tr>
      <tr><td>Iscmax / MPPT (A)</td><td>${fr(iscMaxInv)} A</td></tr>
      <tr><td>Nb MPPT</td><td>${fr0(inv.nbMppt || 1)}</td></tr>
      <tr><td>Nb entrées / MPPT</td><td>${fr0(inv.nbMppt || 1)} / ${fr0(inv.nbMppt || 1)}</td></tr>
      <tr><td>Plage MPPT (V)</td><td>${fr0(umpptMin)} - ${fr0(umpptMax)} V</td></tr>
      <tr><td>Plage de tension d'entrée (V)</td><td>${fr0(umpptMin)} - ${fr0(udcMax)} V</td></tr>
      <tr><td>Puissance AC (kVA)</td><td>${fr(inv.pacKva || inverterPac / 1000)} kVA</td></tr>
      <tr><td>Tension de sortie (V)</td><td>${fr0(vac)} V</td></tr>
      <tr><td>IACmax (A)</td><td>${fr(iacMax)} A</td></tr>
    </table>
  </div>
</div>

<!-- ============ PAGE 6 : IV - 3 Caractéristiques DC/AC + 4 Compatibilité ============ -->
<div class="page">
  <div class="content">
    <h3>3. Caractéristiques équipements DC et AC</h3>
    <table>
      <tr><th style="width:40%;">Equipement</th><th>Caractéristiques techniques</th></tr>
      <tr>
        <td>Parafoudre DC</td>
        <td>Type : <b>${spdDc.type || 'II'}</b><br/>
            Ucpv = <b>${fr0(dcProt.ucpv)} V</b><br/>
            Up = <b>${fr0(dcProt.up)} V</b><br/>
            In = <b>${fr0(dcProt.in)} kA</b><br/>
            Iscpv = <b>${fr0(dcProt.iscpv)} A</b></td>
      </tr>
      <tr>
        <td>Interrupteur sectionneur DC</td>
        <td>Usec = <b>${fr0(dcProt.usec || dcProt.ucpv)} V</b><br/>
            Isec = <b>${fr0(dcProt.in || dcProt.inDisj)} A</b></td>
      </tr>
      <tr>
        <td>Disjoncteur (différentiel) AC</td>
        <td>Udis = <b>${fr0(acProt.udis || vac)} V</b><br/>
            In = <b>${fr0(acProt.in)} A</b><br/>
            Pouvoir de coupure = <b>${fr0(acProt.icn || 6)} kA</b><br/>
            Sensibilité = <b>${fr0((ab.sensitivityA || 0.03) * 1000)} mA</b></td>
      </tr>
      <tr>
        <td>Parafoudre AC</td>
        <td>Type : <b>${spdAc.type || 'I ou II'}</b><br/>
            Uc = <b>${fr0(acProt.uc)} V</b><br/>
            Up = <b>${fr0(acProt.up)} V</b><br/>
            In = <b>${fr0(acProt.in)} kA</b></td>
      </tr>
      <tr>
        <td>Section câbles DC</td>
        <td>Section : <b>${fr0(cdc.section)} mm²</b><br/>
            Courant admissible Iz = <b>${fr0(cdc.iz)} A</b></td>
      </tr>
      <tr>
        <td>Section câbles AC</td>
        <td>Section : <b>${fr0(cac.section)} mm²</b><br/>
            Courant admissible Iz = <b>${fr0(cac.iz)} A</b></td>
      </tr>
    </table>
    <p class="note">Aucun paratonnerre ou groupe électrogène n'est prévu pour cette installation.</p>

    <h3>4. Compatibilité de l'onduleur :</h3>
    <p>Pour s'assurer que le champ PV est compatible avec l'onduleur, on calcule :</p>
    <ul>
      <li><b>Tmin</b> : Température minimale du module prise égale à <b>${fr0(pt.tmin ?? -10)}°C</b></li>
      <li><b>Tmax</b> : Température maximale du module prise égale à <b>${fr0(pt.tmax ?? 85)}°C</b></li>
      <li><b>β</b> : Coefficient de température Voc (<b>${fr(panel.coeffVoc)}%/°C</b>)</li>
      <li><b>α</b> : Coefficient de température Isc (<b>${fr(panel.coeffIsc)}%/°C</b>)</li>
      <li><b>Umpptmax</b> : Tension maximale MPPT de l'onduleur = <b>${fr0(umpptMax)} V</b></li>
      <li><b>Umpptmin</b> : Tension minimale MPPT de l'onduleur = <b>${fr0(umpptMin)} V</b></li>
      <li><b>Imax</b> : Courant max. d'entrée de l'onduleur = <b>${fr(idcMax)} A</b></li>
      <li><b>Icc</b> : Courant de court-circuit admissible de l'onduleur = <b>${fr(iscMaxInv)} A</b></li>
      <li><b>Isc</b> : Courant de court-circuit du module (STC) = <b>${fr(pt.iscBase)} A</b></li>
    </ul>
  </div>
</div>

<!-- ============ PAGE 7 : CALCULS DC ============ -->
<div class="page">
  <div class="content">
    <h2>Calcul de compatibilité champ PV - onduleur</h2>

    <h3>Nombre maximal de panneaux en série</h3>
    <div class="formula">Voc (à ${fr0(pt.tmin ?? -10)}°C) = ${fr(pt.vocBase)} × (1 + ${fr(panel.coeffVoc)}/100 × (${fr0(pt.tmin ?? -10)} – 25)) = <span class="appnum">${fr(pt.vocMin10)} V</span></div>
    <div class="formula">Nsmax = E¯ (Udcmax / Voc(-10°C)) = E¯ (${fr0(udcMax)} / ${fr(pt.vocMin10)}) = <span class="appnum">${fr0(sc.nsMax)} panneaux</span></div>

    <h3>Nombre optimal de panneaux en série</h3>
    <div class="formula">Vmp (à ${fr0(pt.tmin ?? -10)}°C) = ${fr(pt.vmppBase)} × (1 + ${fr(panel.coeffVoc)}/100 × (${fr0(pt.tmin ?? -10)} – 25)) = <span class="appnum">${fr(pt.vmppMin10)} V</span></div>
    <div class="formula">Nsoptimal = E¯ (Umpptmax / Vmp(-10°C)) = E¯ (${fr0(umpptMax)} / ${fr(pt.vmppMin10)}) = <span class="appnum">${fr0(sc.nsOpt)} panneaux</span></div>

    <h3>Nombre minimal de panneaux en série</h3>
    <div class="formula">Vmp (à ${fr0(pt.tmax ?? 85)}°C) = ${fr(pt.vmppBase)} × (1 + ${fr(panel.coeffVoc)}/100 × (${fr0(pt.tmax ?? 85)} – 25)) = <span class="appnum">${fr(pt.vmpp85)} V</span></div>
    <div class="formula">Nsmin = E⁺ (Umpptmin / Vmp(85°C)) = E⁺ (${fr0(umpptMin)} / ${fr(pt.vmpp85)}) = <span class="appnum">${fr0(sc.nsMin)} panneau</span></div>

    <h3>Nombre maximal de chaînes en parallèle (protection – cas CC)</h3>
    <div class="formula">Isc (à ${fr0(pt.tmax ?? 85)}°C) = ${fr(pt.iscBase)} × (1 + ${fr(panel.coeffIsc)}/100 × (${fr0(pt.tmax ?? 85)} – 25)) = <span class="appnum">${fr(pt.isc85)} A</span></div>
    <div class="formula">Npmax = E¯ (Icc / Isc(85°C)) = E¯ (${fr(iscMaxInv)} / ${fr(pt.isc85)}) = <span class="appnum">${fr0(sc.npMax)} chaîne</span></div>

    <h3>Nombre optimal de chaînes en //</h3>
    <div class="formula">Imp (à ${fr0(pt.tmax ?? 85)}°C) = ${fr(pt.impp85 ?? '–')} A</div>
    <div class="formula">Npoptimal = E¯ (Imax / Imp(85°C)) = E¯ (${fr(idcMax)} / ${fr(pt.impp85 ?? '–')}) = <span class="appnum">${fr0(sc.npOpt)} chaîne</span></div>

    <h3>Compatibilité en puissance</h3>
    <p class="formula">Le rapport Pcpv/Pac ond doit être entre <b>0.9</b> et <b>1.3</b>.</p>
    <div class="formula">Application numérique : <span class="appnum">0.9 ≤ (${fr0(pr.pvPower)}/${fr0(pr.acPower)}) = ${fr(pr.ratio)} ≤ 1.3</span>
      ${pr.valid ? '<span class="note"> (valide)</span>' : '<span class="note" style="color:#c00000;"> (non valide)</span>'}
    </div>
  </div>
</div>

<!-- ============ PAGE 8 : V PROTECTIONS DC (1-2) ============ -->
<div class="page">
  <div class="content">
    <h2>V. Dimensionnement Dispositifs de protection coté DC :</h2>

    <h3>1. Nombre maximal de chaînes en parallèle sans protection</h3>
    <p class="formula">Nombre maximal de chaînes en parallèle par dispositif de protection :</p>
    <div class="formula">Ncmax ≤ (1 + IRM / Isc STC) = (1 + ${fr0(ms.irm)} / ${fr(pt.iscBase)}) = <span class="appnum">${fr(ms.ncmax)} chaînes</span></div>
    <div class="formula">Npmax protection ≤ 0.5 × (1 + IRM / Isc max) = 0.5 × (1 + ${fr0(ms.irm)} / ${fr(pt.isc85)}) = <span class="appnum">${fr0(ms.npmaxProtection)} chaîne</span></div>
    <p class="note">${esc(ms.note)}</p>

    <h3>2. Interrupteur sectionneur DC</h3>
    <p>Exigences :</p>
    <ul>
      <li>Usec &gt; Voc (-10°C) champ PV</li>
      <li>Isec &gt; 1.25 × Isc champ PV</li>
    </ul>
    <div class="formula">Application numérique :</div>
    <div class="formula">Usec = <span class="appnum">${fr0(ds.selectedUsec)} V</span> &gt; Voc (-10°C) champ PV = <span class="appnum">${fr(ds.usecRequired)} V</span>
      ${ds.selectedUsec > ds.usecRequired ? '<span class="note">(valide)</span>' : '<span class="note" style="color:#c00000;">(non valide)</span>'}
    </div>
    <div class="formula">Isec = <span class="appnum">${fr(ds.selectedIsec)} A</span> &gt; 1.25 × Isc champ PV = <span class="appnum">${fr(ds.isecRequired)} A</span>
      ${ds.selectedIsec > ds.isecRequired ? '<span class="note">(valide)</span>' : '<span class="note" style="color:#c00000;">(non valide)</span>'}
    </div>
    <table style="margin-top:8px;">
      <tr><th>Iinterrupteur utilisé</th><td class="center">${fr(ds.selectedIsec)} (A)</td></tr>
      <tr><th>Uinterrupteur utilisée</th><td class="center">${fr0(ds.selectedUsec)} (V)</td></tr>
    </table>

    <h3>3. Parafoudre DC</h3>
    <p>Exigences :</p>
    <ul>
      <li>Type <b>II</b></li>
      <li>Ucpv &gt; Uoc max = <b>1.2 × Uoc STC</b></li>
      <li>Up &lt; 80% de la Tension de tenue aux chocs (modules, onduleurs)</li>
      <li>Up &lt; 50% (équipements distants &gt; 10 m)</li>
      <li>In &gt; 5 kA</li>
      <li>Iscpv &gt; Iscmax PV = 1.25 × Isc STC</li>
    </ul>
    <div class="formula">Application numérique :</div>
    <div class="formula">Ucpv utilisé = <span class="appnum">${fr0(spdDc.selectedUcpv)} V</span> &gt; Uoc max 1.2 × Uoc STC = <span class="appnum">${fr(spdDc.ucpvRequired)} V</span>
      ${spdDc.selectedUcpv > spdDc.ucpvRequired ? '<span class="note">(valide)</span>' : '<span class="note" style="color:#c00000;">(non valide)</span>'}
    </div>
    <div class="formula">Up utilisé = <span class="appnum">${fr0(spdDc.selectedUp)} V</span> &lt; 80% × Uw = <span class="appnum">${fr(spdDc.upLimit)} V</span>
      ${spdDc.selectedUp < spdDc.upLimit ? '<span class="note">(valide)</span>' : '<span class="note" style="color:#c00000;">(non valide)</span>'}
    </div>
    <div class="formula">In utilisé = <span class="appnum">${fr(spdDc.selectedIn)} kA</span> &gt; <span class="appnum">${fr(spdDc.inRequired)} kA</span>
      ${spdDc.selectedIn > spdDc.inRequired ? '<span class="note">(valide)</span>' : '<span class="note" style="color:#c00000;">(non valide)</span>'}
    </div>
    <div class="formula">Iscpv utilisé = <span class="appnum">${fr0(spdDc.selectedIscpv)} A</span> &gt; Iscmax PV = 1.25 × Isc STC = <span class="appnum">${fr(spdDc.iscpvRequired)} A</span>
      ${spdDc.selectedIscpv > spdDc.iscpvRequired ? '<span class="note">(valide)</span>' : '<span class="note" style="color:#c00000;">(non valide)</span>'}
    </div>
  </div>
</div>

<!-- ============ PAGE 9 : V conclusion + VI AC (1) ============ -->
<div class="page">
  <div class="content">
    <div class="conclusion">
      <b>Interrupteur sectionneur DC choisi :</b> ${esc(dcProtBrand)} ${fr0(ds.selectedUsec)} V Type 2, référence ${esc(dcProtModel)} ou similaire.
    </div>
    <div class="conclusion">
      <b>Parafoudre DC choisi :</b> ${esc(dcProtBrand)} Type 2, référence ${esc(dcProtModel)} ou similaire.
    </div>

    <h2>VI. Dimensionnement Dispositifs de protection coté AC :</h2>

    <h3>1. Disjoncteur (différentiel) AC :</h3>
    <p>Exigences :</p>
    <ul>
      <li>Ue = 230 V ou 400 V</li>
      <li>Imax onduleur ≤ Ie ≤ Iz câble AC</li>
      <li>Sensibilité : 30 mA</li>
      <li>Temps coupure &lt; température limite</li>
    </ul>
    <div class="formula">Application numérique :</div>
    <div class="formula">Imax onduleur = <span class="appnum">${fr(ab.ieMin ?? iacMax)} A</span> ≤ Ie = <span class="appnum">${fr0(ab.selectedIn ?? ab.recommended)} A</span> ≤ Iz câble AC = <span class="appnum">${fr(ab.ieMax ?? cac.izPrime)} A</span>
      ${((ab.ieMin ?? 0) <= (ab.selectedIn ?? Infinity) && (ab.selectedIn ?? 0) <= (ab.ieMax ?? Infinity)) ? '<span class="note">(valide)</span>' : '<span class="note" style="color:#c00000;">(non valide)</span>'}
    </div>
    <div class="formula">Dans notre cas : Udisj = <span class="appnum">${fr0(acProt.udis || vac)} V</span>, In disj = <span class="appnum">${fr0(acProt.in || ab.selectedIn || ab.recommended)} A</span>, Sensibilité = <span class="appnum">${fr0((ab.sensitivityA || 0.03) * 1000)} mA</span>.</div>
  </div>
</div>

<!-- ============ PAGE 10 : VI AC (2) + VII intro + câbles DC ============ -->
<div class="page">
  <div class="content">
    <div class="conclusion">
      <b>Disjoncteur différentiel AC choisi :</b> ${esc(acProtBrand)} ${fr0(ab.recommended)} A, ${fr0((ab.sensitivityA || 0.03) * 1000)} mA, référence ${esc(acProtModel)} ou similaire.
    </div>

    <h3>2. Parafoudre AC</h3>
    <p>Exigences :</p>
    <ul>
      <li>Type <b>I</b> ou <b>II</b></li>
      <li>Uc &gt; 1.1 × (Ue = 230 V)</li>
      <li>Up &lt; 80% (tenue aux chocs)</li>
      <li>Up &lt; 50% (équipements distants &gt; 10 m)</li>
      <li>In &gt; 5 kA</li>
    </ul>
    <div class="formula">Caractéristiques du parafoudre choisi :</div>
    <div class="formula">Uc = <span class="appnum">${fr0(spdAc.selectedUc)} V</span> &gt; 1.1 × 230 = <span class="appnum">${fr(spdAc.ucRequired)} V</span>
      ${spdAc.selectedUc > spdAc.ucRequired ? '<span class="note">(valide)</span>' : '<span class="note" style="color:#c00000;">(non valide)</span>'}
    </div>
    <div class="formula">Up = <span class="appnum">${fr0(spdAc.selectedUp)} V</span> &lt; 80% × Uw = <span class="appnum">${fr(spdAc.upLimit)} V</span>
      ${spdAc.selectedUp < spdAc.upLimit ? '<span class="note">(valide)</span>' : '<span class="note" style="color:#c00000;">(non valide)</span>'}
    </div>
    <div class="formula">In = <span class="appnum">${fr(spdAc.selectedIn)} kA</span> &gt; <span class="appnum">${fr(spdAc.inRequired)} kA</span>
      ${spdAc.selectedIn > spdAc.inRequired ? '<span class="note">(valide)</span>' : '<span class="note" style="color:#c00000;">(non valide)</span>'}
    </div>
    <div class="conclusion">
      <b>Parafoudre AC choisi :</b> ${esc(acProtBrand)} Type ${esc(spdAc.type || 'II')}, référence ${esc(acProtModel)} ou similaire.
    </div>

    <h2>VII. Dimensionnement Câble DC/AC</h2>
    <p>Températures ambiantes : Enterré : <b>25 °C</b>, Local technique : <b>50 °C</b>, Chemin de câble non exposé au soleil : <b>50 °C</b>, Chemin de câble exposé au soleil : <b>80 °C</b>.</p>

    <h3>1. Câbles DC</h3>
    <p>Le courant admissible Iz du câble doit être corrigé par les facteurs K1, K2, K3, K4 :</p>
    <div class="formula">Iz' = Iz × (K1 × K2 × K3 × K4)</div>
    <ul>
      <li><b>K1</b> : Facteur de correction pour le mode de pose (Tableau 52C / 52G)</li>
      <li><b>K2</b> : Facteur de correction pour le groupement de circuits (Tableau 52N)</li>
      <li><b>K3</b> : Facteur de correction pour la température ambiante (Tableau 52K)</li>
      <li><b>K4</b> : Facteur de correction pour la pose en plusieurs couches (Tableau 52O)</li>
    </ul>
  </div>
</div>

<!-- ============ PAGE 11 : câbles DC - mode de pose / K1 ============ -->
<div class="page">
  <div class="content">
    <h3>Tronçon champ PV - onduleur</h3>
    <h3>Modes de pose</h3>
    <p>Les câbles photovoltaïques DC sont posés sur <b>chemin de câbles ou tablettes perforées</b> (mode de pose <b>13</b> du Tableau 52C de la Norme NF C 15-100).</p>
    <p class="note">Figure 1 : Tableau 52 C de la norme NF C 15-100 (mode de pose 13 encadré).</p>

    <h3>Méthodes de référence</h3>
    <p>Le mode de pose <b>13</b> correspond aux méthodes de référence <b>E</b> et <b>F</b> du Tableau 52G.</p>
    <p class="note">Figure 2 : Tableau 52 G de la norme NF C 15-100 (correspondance modes de pose / méthodes de référence).</p>
    <div class="formula">Mode de pose 13 → méthodes de références E et F, donc facteur de correction <span class="appnum">K1 = ${fr(cdc.kFactors?.k1)}</span>.</div>
  </div>
</div>

<!-- ============ PAGE 12 : câbles DC - K2 / K3 ============ -->
<div class="page">
  <div class="content">
    <h3>Groupement de circuits</h3>
    <p>Détermination du facteur K2 à partir du Tableau 52N (groupement de circuits).</p>
    <p class="note">Figure 3 : Tableau 52 N de la Norme NF C 15-100.</p>
    <div class="formula"><b>${fr0(cdc.kFactors?.k2 ? 1 : 1)}</b> circuit → d'après le tableau 52N, facteur de correction <span class="appnum">K2 = ${fr(cdc.kFactors?.k2)}</span>.</div>

    <h3>Température ambiante</h3>
    <p>Détermination du facteur K3 à partir du Tableau 52K (températures ambiantes).</p>
    <p class="note">Figure 4 : Tableau 52 K de la Norme NF C 15-100.</p>
    <div class="formula">Local technique : T = <b>${fr0(cdc.temp)} °C</b>. Câble d'isolation <b>${esc(cdc.insulation)}</b>.<br/>
    D'après le tableau 52K, facteur de correction <span class="appnum">K3 = ${fr(cdc.kFactors?.k3)}</span>.</div>
  </div>
</div>

<!-- ============ PAGE 13 : câbles DC - K4 / conclusion / chute DC ============ -->
<div class="page">
  <div class="content">
    <h3>Facteurs de correction pour pose en plusieurs couches</h3>
    <p>Détermination du facteur K4 à partir du Tableau 52O.</p>
    <p class="note">Figure 5 : Tableau 52 O de la Norme NF C 15-100.</p>
    <div class="formula">Câbles disposés en <b>${fr0(cdc.kFactors?.k4 ? 1 : 1)}</b> seule couche, donc facteur de correction <span class="appnum">K4 = ${fr(cdc.kFactors?.k4)}</span>.</div>

    <h3>Nombre de couches</h3>
    <div class="formula">Iz' = Iz × (K1 × K2 × K3 × K4) = <span class="appnum">${fr0(cdc.iz)} × (${fr(cdc.kFactors?.k1)} × ${fr(cdc.kFactors?.k2)} × ${fr(cdc.kFactors?.k3)} × ${fr(cdc.kFactors?.k4)}) = ${fr(cdc.izPrime)} A</span></div>

    <h3>Conclusion</h3>
    <table>
      <tr><th>Courant Admissible du câble DC</th><td class="center">${fr(cdc.ib)} A</td></tr>
      <tr><th>Section</th><td class="center">${fr0(cdc.section)} mm²</td></tr>
      <tr><th>Courant admissible Iz</th><td class="center">${fr0(cdc.iz)} A</td></tr>
      <tr><th>Courant corrigé Iz'</th><td class="center">${fr(cdc.izPrime)} A</td></tr>
    </table>

    <h3>1. Calcul de chute de tension DC</h3>
    <p>Chute de tension totale limitée à <b>3%</b>. ρ (cuivre) = <b>0.02314 Ωmm²/m</b>.</p>
    <div class="formula">Δu = 2 × ρ × L × I / S ; Δu(%) = Δu / Ump × 100</div>
    <table>
      <tr><th>Paramètre</th><th>Champ PV - Onduleur</th></tr>
      <tr><td>ρ (Ωmm²/m)</td><td class="center">${fr(cdc.rho || 0.02314)}</td></tr>
      <tr><td>L (m)</td><td class="center">${fr(cdc.length)}</td></tr>
      <tr><td>I (A)</td><td class="center">${fr(cdc.impp)}</td></tr>
      <tr><td>Section (mm²)</td><td class="center">${fr0(cdc.section)}</td></tr>
      <tr><td>Ump (V)</td><td class="center">${fr(cdc.vmppTotal)}</td></tr>
      <tr><td>Δu (V)</td><td class="center">${fr(cdc.dropVolt)}</td></tr>
      <tr><td>Δu (%)</td><td class="center">${fr(cdc.dropPercent)} %</td></tr>
    </table>
    <div class="conclusion">
      La Chute de Tension est Δu (%) = <b>${fr(cdc.dropPercent)} %</b> &lt;&lt; <b>3%</b>.
      ${cdc.compliant ? '(Valide le choix du câble)' : '<span style="color:#c00000;">(Section à revoir)</span>'}
    </div>

    <h3>Caractéristiques des câbles DC minimales :</h3>
    <ul>
      <li>Type : unipolaire, double isolation, résistant aux ultraviolets.</li>
      <li>Section : normalisée.</li>
      <li>Respect des normes des câbles pour courant continu.</li>
      <li>Température maximale admissible sur l'âme (régime permanent) : 90°C ou 120°C (isolation PRC).</li>
      <li>Température maximale admissible sur l'âme (court-circuit) : 250°C.</li>
      <li>Tension maximale en courant continu : 1.8 kV.</li>
      <li>Tension assignée en courant alternatif : U0/U : 0.6/1 (1.2) kV.</li>
    </ul>
  </div>
</div>

<!-- ============ PAGE 14 : câbles AC - intro ============ -->
<div class="page">
  <div class="content">
    <h3>2. Câbles AC</h3>
    <p>Le courant admissible Iz du câble AC doit être corrigé par les facteurs K1, K2, K3, K4 :</p>
    <div class="formula">Iz' = Iz × (K1 × K2 × K3 × K4)</div>
    <ul>
      <li><b>K1</b> : Facteur de correction pour le mode de pose (Tableau 52C / 52G)</li>
      <li><b>K2</b> : Facteur de correction pour le groupement de circuits (Tableau 52N)</li>
      <li><b>K3</b> : Facteur de correction pour la température ambiante (Tableau 52K)</li>
      <li><b>K4</b> : Facteur de correction pour la pose en plusieurs couches (Tableau 52O)</li>
    </ul>

    <h3>Tronçon onduleur - point d'injection</h3>
    <h3>Modes de pose</h3>
    <p>Les câbles AC sont posés dans des <b>conduits en montage apparent</b> (mode de pose <b>3A</b> du Tableau 52C).</p>
    <p class="note">Figure 6 : Tableau 52 C de la norme NF C 15-100 (mode de pose 3A encadré).</p>

    <h3>Méthodes de référence</h3>
    <p class="note">Figure 7 : Tableau 52 G de la norme NF C 15-100.</p>
    <div class="formula">Mode de pose <b>3A</b> → méthode de référence <b>B</b>, donc facteur de correction <span class="appnum">K1 = ${fr(cac.kFactors?.k1)}</span>.</div>
  </div>
</div>

<!-- ============ PAGE 15 : câbles AC - K2/K3/K4 ============ -->
<div class="page">
  <div class="content">
    <h3>Groupement de circuits</h3>
    <p class="note">Figure 8 : Tableau 52 N de la Norme NF C 15-100.</p>
    <div class="formula"><b>1</b> circuit → facteur de correction <span class="appnum">K2 = ${fr(cac.kFactors?.k2)}</span>.</div>

    <h3>Température ambiante</h3>
    <p class="note">Figure 9 : Tableau 52 K de la Norme NF C 15-100.</p>
    <div class="formula">Chemin de câble exposé au soleil : T = <b>${fr0(cac.temp)} °C</b>. Câble d'isolation <b>${esc(cac.insulation)}</b>.<br/>
    D'après le tableau 52K, facteur de correction <span class="appnum">K3 = ${fr(cac.kFactors?.k3)}</span>.</div>

    <h3>Facteurs de correction pour pose en plusieurs couches</h3>
    <p class="note">Figure 10 : Tableau 52 O de la Norme NF C 15-100.</p>
    <div class="formula">Câbles disposés en <b>1</b> seule couche, donc facteur de correction <span class="appnum">K4 = ${fr(cac.kFactors?.k4)}</span>.</div>

    <h3>Nombre de couches</h3>
    <div class="formula">Iz' = Iz × (K1 × K2 × K3 × K4) = <span class="appnum">${fr0(cac.iz)} × (${fr(cac.kFactors?.k1)} × ${fr(cac.kFactors?.k2)} × ${fr(cac.kFactors?.k3)} × ${fr(cac.kFactors?.k4)}) = ${fr(cac.izPrime)} A</span></div>

    <h3>Conclusion</h3>
    <table>
      <tr><th>Courant Admissible du câble AC</th><td class="center">${fr(cac.iacMax ?? cac.ib)} A</td></tr>
      <tr><th>Section</th><td class="center">${fr0(cac.section)} mm²</td></tr>
      <tr><th>Courant admissible Iz</th><td class="center">${fr0(cac.iz)} A</td></tr>
      <tr><th>Courant corrigé Iz'</th><td class="center">${fr(cac.izPrime)} A</td></tr>
    </table>

    <h3>Calcul de chute de tension AC</h3>
    <p>Chute de tension totale limitée à <b>3%</b>.</p>
    <div class="formula">b = 1 pour circuits triphasés, b = 2 pour circuits monophasés. Ici <span class="appnum">b = ${cac.phase === 'tri' ? 1 : 2}</span> (monophasé). ρ (cuivre) = <b>0.02314 Ωmm²/m</b>.</div>
    <table>
      <tr><th>Paramètre</th><th>Onduleur → coffret AC</th></tr>
      <tr><td>b</td><td class="center">${cac.phase === 'tri' ? 1 : 2}</td></tr>
      <tr><td>ρ</td><td class="center">${fr(cac.rho || 0.02314)}</td></tr>
      <tr><td>L (m)</td><td class="center">${fr(cac.length)}</td></tr>
      <tr><td>I (A)</td><td class="center">${fr(cac.iacMax)}</td></tr>
      <tr><td>Section (mm²)</td><td class="center">${fr0(cac.section)}</td></tr>
      <tr><td>λ</td><td class="center">0.00008</td></tr>
      <tr><td>cos(φ)</td><td class="center">0.8</td></tr>
      <tr><td>sin(φ)</td><td class="center">0.6</td></tr>
      <tr><td>V (V)</td><td class="center">${fr0(cac.vGrid)}</td></tr>
      <tr><td>Δu (V)</td><td class="center">${fr(cac.dropVolt)}</td></tr>
      <tr><td>Δu (%)</td><td class="center">${fr(cac.dropPercent)} %</td></tr>
    </table>
    <div class="conclusion">
      Chute de Tension totale : <b>${fr(cac.dropPercent)} %</b> &lt;&lt; <b>3%</b>.
      ${cac.compliant ? '(Valide le choix du câble)' : '<span style="color:#c00000;">(Section à revoir)</span>'}
    </div>
  </div>
</div>

<!-- ============ PAGE 16 : VIII Câblage + mise à la terre ============ -->
<div class="page">
  <div class="content">
    <h2>VIII. Description du câblage des panneaux et de la mise à la terre</h2>
    <p>Les modules photovoltaïques sont raccordés en série au nombre de <b>${fr0(panelCount)}</b>. Les câbles DC relient les chaînes de panneaux au coffret de protection DC, puis à l'onduleur.</p>
    <p>Les câbles solaires DC (double isolation, résistants aux UV) sont acheminés dans des <b>moulures PVC</b>. Les câbles AC relient l'onduleur au coffret de protection AC puis au point d'injection (compteur bidirectionnel STEG).</p>
    <p>Aucune protection contre les surintensités n'est nécessaire sur les chaînes (nombre de chaînes inférieur au nombre maximal admissible sans protection).</p>

    <h3>Mise à la terre</h3>
    <table>
      <tr><th style="width:50%;">Elément</th><th>Description</th></tr>
      <tr><td>Câbles de terre</td><td>Section <b>10 mm²</b></td></tr>
      <tr><td>Mise à la terre entre panneaux</td><td>Rondelles bimétal et cosses de <b>6 mm²</b></td></tr>
      <tr><td>Regard de terre</td><td>Rectangulaire 40 × 40</td></tr>
      <tr><td>Piquets de terre</td><td><b>3</b> piquets de <b>1.5 m</b>, distants de <b>35 cm</b>, enterrés et couverts de charbon</td></tr>
      <tr><td>Valeur de terre vérifiée</td><td>&lt; <b>25 Ω</b></td></tr>
    </table>
  </div>
</div>

<!-- ============ PAGE 17 : IX Structure ============ -->
<div class="page">
  <div class="content">
    <h2>IX. Description de la mise en œuvre de la structure</h2>
    <p>La structure porteuse des panneaux est métallique, en <b>aluminium</b>, adaptée au supportage sur toiture-terrasse.</p>
    <table>
      <tr><th style="width:55%;">Elément</th><th>Description</th></tr>
      <tr><td>Matériau</td><td>Aluminium</td></tr>
      <tr><td>Triangles doubles</td><td><b>${fr0(pvSystemParams?.structureTriangles ?? '–')}</b>, en cornière aluminium 40/40</td></tr>
      <tr><td>Fixation sur le toit</td><td>Dalles en béton (chaque dalle pèse 37 kg)</td></tr>
      <tr><td>Liens entre triangles</td><td>Rails Omega, pinces en aluminium</td></tr>
      <tr><td>Câbles en acier</td><td>Section 6 mm² pour la bordure du toit</td></tr>
      <tr><td>Résistance aux vents</td><td>Jusqu'à <b>${fr0(wa.windSpeedKmh)} km/h</b></td></tr>
    </table>

    <h3>Calculs mécaniques</h3>
    <p class="formula">Ftrainée = 1/2 × ρ × V² × S × Cr</p>
    <p class="formula">Fportance = 1/2 × ρ × V² × S × C</p>
    <p>Vérification de la stabilité :</p>
    <div class="formula">(Fpoids − 339 × S) × D ≥ 2 × 196 × S × H</div>
    <p class="formula">Fpoids = Poids du lest + Poids modules + Poids structure</p>
    <p>Pour la structure portant <b>${fr0(panelCount)}</b> panneaux :</p>
    <table>
      <tr><th>Paramètre</th><th>Valeur</th></tr>
      <tr><td>H (m)</td><td class="center">${fr(wa.supportHeight)}</td></tr>
      <tr><td>D (m)</td><td class="center">${fr(wa.leverArm)}</td></tr>
      <tr><td>S : Surface des modules (m²)</td><td class="center">${fr(wa.panelArea)}</td></tr>
      <tr><td>Masse d'une dalle (kg)</td><td class="center">37</td></tr>
      <tr><td>Nombre des dalles</td><td class="center">${fr0(pvSystemParams?.ballastCount ?? '–')}</td></tr>
      <tr><td>Pression du vent (Pa)</td><td class="center">${fr0(wa.windPressure)}</td></tr>
      <tr><td>Force du vent (N)</td><td class="center">${fr0(wa.windForce)}</td></tr>
      <tr><td>F trainée (N)</td><td class="center">${fr0(wa.trainForce)}</td></tr>
      <tr><td>F portance (N)</td><td class="center">${fr0(wa.liftForce)}</td></tr>
    </table>
  </div>
</div>

<!-- ============ PAGE 18 : calculs structure / lest ============ -->
<div class="page">
  <div class="content">
    <h3>Calcul des poids</h3>
    <table>
      <tr><th style="width:55%;">Elément</th><th>Valeur</th></tr>
      <tr><td>Poids du lest (N)</td><td class="center">${fr0(pvSystemParams?.ballastWeightKg ? pvSystemParams.ballastWeightKg * 9.81 : wa.ballastWeightKg * 9.81)}</td></tr>
      <tr><td>Masse des modules (N)</td><td class="center">${fr0(pvSystemParams?.panelWeightKg ? pvSystemParams.panelWeightKg * panelCount * 9.81 : wa.panelWeightN - (pvSystemParams?.structureWeightKg ?? 0) * 9.81)}</td></tr>
      <tr><td>Masse de la structure (N)</td><td class="center">${fr0(wa.panelWeightN - (pvSystemParams?.ballastWeightKg ?? 0) * 9.81)}</td></tr>
      <tr><td>Fpoids (N)</td><td class="center">${fr0(wa.panelWeightN + (wa.ballastWeightKg * 9.81 || 0))}</td></tr>
      <tr><td>Ballast installé (kg)</td><td class="center">${fr0(wa.ballastWeightKg)}</td></tr>
      <tr><td>Ballast requis (kg)</td><td class="center">${fr0(wa.requiredBallastKg)}</td></tr>
    </table>

    <h3>Vérification de la capacité de la structure</h3>
    <div class="formula">Vérification : (Fpoids − 339 × S) × D ≥ 2 × 196 × S × H</div>
    <div class="formula">Membre gauche : <span class="appnum">${fr(wa.formulaLeft)} N·m</span></div>
    <div class="formula">Membre droit : <span class="appnum">${fr(wa.formulaRight)} N·m</span></div>
    <div class="formula">Ratio de stabilité : <span class="appnum">${fr(wa.stabilityRatio)}</span>
      ${wa.formulaLeft >= wa.formulaRight ? '<span class="note">(valide)</span>' : '<span class="note" style="color:#c00000;">(non valide)</span>'}
    </div>
    <div class="conclusion">
      <b>Conclusion :</b> La structure est capable de supporter <b>${fr0(panelCount)}</b> panneaux dans les conditions climatiques extrêmes (<b>${fr0(wa.windSpeedKmh)} km/h</b>).
      ${wa.compliant ? '' : ' <span style="color:#c00000;">Un ballast supplémentaire (~' + fr0(wa.requiredBallastKg) + ' kg) est requis.</span>'}
    </div>
  </div>
</div>

<!-- ============ PAGE 19 : CONCLUSION ============ -->
<div class="page">
  <div class="content">
    <h2>Conclusion :</h2>
    <p>Le présent dossier technique décrit l'installation photovoltaïque d'une puissance de <b>${fr(peakKwc, 2)} kWc</b> composée de :</p>
    <ul>
      <li><b>${fr0(panelCount)}</b> panneaux ${esc(panelBrand)} ${esc(panelModel)} (${fr0(pmax)} W)</li>
      <li><b>1</b> onduleur ${esc(invBrand)} ${esc(invModel)}</li>
      <li>Un coffret de protection DC et un coffret de protection AC</li>
    </ul>
    <p>L'ensemble des équipements et des calculs de dimensionnement présentés dans ce dossier respecte les exigences de la STEG et les normes NF C 15-100.</p>
    <p>Le raccordement au réseau Basse Tension de la STEG sera réalisé conformément au schéma unifilaire joint en annexe.</p>

    <table style="margin-top:40px; border:none;">
      <tr>
        <td style="border:none; width:50%; text-align:center;">
          <div>Le demandeur,</div>
          <div style="height:60px;"></div>
          <div>${esc(customerDetails.name || '')}</div>
        </td>
        <td style="border:none; width:50%; text-align:center;">
          <div>L'installateur,</div>
          <div style="height:60px;"></div>
          <div>${esc(installer)}</div>
        </td>
      </tr>
    </table>
  </div>
</div>

<!-- ============ PAGE 20 : ANNEXE IPV ============ -->
<div class="page">
  <div class="content">
    <div class="page-title">
      <h1>ANNEXE IPV</h1>
      <h2>${esc(customerDetails.name || '')} - ${fr(peakKwc, 2)} kWc</h2>
    </div>
  </div>
</div>

</body>
</html>`;
}

// Petit helper utilitaire (courant max onduleur en mono ~ P / (V × 0.95))
function pac2A(pac) {
  return pac / (230 * 0.95);
}
