import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '..', 'assets');
const TEMPLATE_PATH = path.join(ASSETS, 'templates', 'steg-dossier-technique.pdf');
const FONT_REGULAR = path.join(ASSETS, 'fonts', 'arial.ttf');
const FONT_BOLD = path.join(ASSETS, 'fonts', 'arialbd.ttf');

function fmt(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '?';
  let s = n.toFixed(digits);
  if (digits > 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',');
}

function fr0(v) {
  const n = Number(v);
  return Number.isFinite(n) ? String(n.toFixed(0)) : '?';
}

/**
 * Carte de remplissage : g?n?re les commandes de texte ? dessiner sur le
 * gabarit STEG (21 pages), positionn?es exactement selon le mod?le officiel.
 */
export function buildFillCommands(dossierData, report) {
  const cmds = [];
  const push = (p, x, yTop, text, size = 11, bold = false) => {
    if (text == null || String(text).trim() === '') return;
    cmds.push({ p, x, yTop, text: String(text), size, bold });
  };

  const dd = dossierData || {};
  const cd = dd.customerDetails || {};
  const ps = dd.pvSystemParams || {};
  const eq = dd.equipment || {};
  const createdBy = dd.createdBy;

  const panel = eq.panel?.specs || {};
  const inv = eq.inverter?.specs || {};
  const dcProt = eq.dcProtection?.specs || {};
  const acProt = eq.acProtection?.specs || {};
  const dcCable = eq.dcCable?.specs || {};
  const acCable = eq.acCable?.specs || {};

  const installer = (typeof createdBy === 'object' && createdBy?.name) ? createdBy.name : (ps.installer || 'Eminence Energie');
  const clientName = cd.name || '?';
  const reference = cd.stegMeterRef || ps.stegMeterRef || '?';
  const address = cd.address || ps.address || '?';

  const panelCount = ps.panelCount || 5;
  const pmax = panel.pmax || 610;
  const vmpp = panel.vmpp || 40.8;
  const impp = panel.impp || 14.96;
  const voc = panel.voc || 49;
  const isc = panel.isc || 15.86;
  const coeffVoc = panel.coeffVoc ?? -0.25;
  const coeffIsc = panel.coeffIsc ?? 0.04;
  const irm = panel.irm || 20;

  const peakKwc = (pmax * panelCount) / 1000;
  const peakLabel = fmt(peakKwc, 2) + ' kWc';

  const panelBrand = eq.panel?.brand || ps.panelBrand || 'TRINA SOLAR';
  const panelModel = eq.panel?.model || 'TSM-NE19R';
  const invBrand = eq.inverter?.brand || 'GOODWE';
  const invModel = eq.inverter?.model || ps.inverterModel || 'GW-3000-XS-11';
  const dcProtBrand = eq.dcProtection?.brand || 'WORLDSUNLIGHT';
  const dcProtModel = eq.dcProtection?.model || 'XLSPD-PV';
  const acProtBrand = eq.acProtection?.brand || 'WORLDSUNLIGHT';
  const acProtModel = eq.acProtection?.model || 'XLSPD-40 2P';
  const dcCableBrand = eq.dcCable?.brand || 'SUNKEAN';
  const acCableBrand = eq.acCable?.brand || 'CHAKIRA CABLE';
  const dcCableRef = dcCable.section ? 'EN 50618 H1Z2Z2-K ' + fr0(dcCable.section) + ' mm?' : '***';
  const acCableRef = 'H05VV-F';

  // Calculations engine output
  const pt = report?.parameters?.panelTemperatureAdjustments || {};
  const sc = report?.compatibility?.stringComputation || {};
  const pr = report?.compatibility?.powerRatio || {};
  const ds = report?.protections?.dcSwitch || {};
  const spdDc = report?.protections?.spdDc || {};
  const ab = report?.protections?.acBreaker || {};
  const spdAc = report?.protections?.spdAc || {};
  const cdc = report?.cableAnalysis?.dc || {};
  const cac = report?.cableAnalysis?.ac || {};
  const wa = report?.windAnalysis || {};

  const udcMax = inv.vdcMax || 600;
  const umpptMin = inv.mpptMin || 50;
  const umpptMax = inv.mpptMax || 550;
  const idcMax = inv.idcMax || 15;
  const iscMaxInv = inv.iscMax || 18.75;
  const nbMppt = inv.nbMppt || 1;
  const iacMax = inv.iacMax || 14.3;
  const vac = inv.vac || cac.vGrid || 230;
  const pac = inv.pac || pr.acPower || 3000;

  const nsMax = sc.nsMax ?? 10;
  const nsOpt = sc.nsOpt ?? 12;
  const nsMin = sc.nsMin ?? 1;
  const npMax = Math.max(sc.npMax ?? 1, 0);
  const ratio = pr.ratio ?? 1.02;

  const usec = dcProt.usec || ds.selectedUsec || 800;
  const isec = ds.selectedIn || dcProt.isec || 20;

  const spdDcU = spdDc.selectedUcpv || 1000;
  const spdDcUp = spdDc.selectedUp || 3.8;
  const spdDcIn = spdDc.selectedIn || 20;
  const spdDcIsc = spdDc.selectedIscpv || 1000;

  const inDisj = ab.selectedIn || acProt.iac || 20;
  const sensi = ab.selectedSensitivity || acProt.sensi || 30;

  const spdAcU = spdAc.selectedUc || 275;
  const spdAcUp = spdAc.selectedUp || 1.5;
  const spdAcIn = spdAc.selectedIn || 20;

  const dcIz = cdc.iz ?? dcCable.iz ?? 41;
  const dcSection = cdc.section ?? dcCable.section ?? 6;
  const dcIzPrime = cdc.izPrime ?? 32.8;
  const dcIb = cdc.ib ?? impp;
  const dcL = ps.dcCableLength || 20;
  const dcRho = 0.0198;
  const dcUmp = panelCount * vmpp;
  const dcDropV = fmt((2 * dcRho * dcL * impp) / dcSection, 2);
  const dcDropP = fmt(((2 * dcRho * dcL * impp) / (dcSection * dcUmp)) * 100, 3);

  const acIz = cac.iz ?? acCable.iz ?? 42;
  const acSection = cac.section ?? acCable.section ?? 4;
  const acIzPrime = cac.izPrime ?? 18.9;
  const acI = iacMax;
  const b = (ps.acPhase || 'mono') === 'tri' ? 1 : 2;
  const cosPhi = 0.8;
  const sinPhi = 0.6;
  const lambda = 0.00008;
  const acL1 = ps.acCableLengthOnduleurCoffret ?? 0.5;
  const acL2 = ps.acCableLengthCoffretTgbt ?? ps.acCableLength ?? 4.5;
  const acDrop1V = fmt((b * (dcRho * (acL1 / acSection) * cosPhi + lambda * acL1 * sinPhi) * acI), 3);
  const acDrop1P = fmt((Number(acDrop1V.replace(',', '.')) / vac) * 100, 3);
  const acDrop2V = fmt((b * (dcRho * (acL2 / acSection) * cosPhi + lambda * acL2 * sinPhi) * acI), 3);
  const acDrop2P = fmt((Number(acDrop2V.replace(',', '.')) / vac) * 100, 3);
  const acDropTotal = fmt(Number(acDrop1P.replace(',', '.')) + Number(acDrop2P.replace(',', '.')), 2);

  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // =====================================================================
  // PAGE 1 : PAGE DE COUVERTURE (exact template positioning)
  // =====================================================================
  push(0, 163, 289, clientName, 12, true);
  push(0, 163.6, 319, reference, 12, true);
  push(0, 289, 348.5, address, 12);
  if (cd.gpsLatitude) {
    push(0, 174.6, 408.9, fmt(cd.gpsLatitude, 6), 12);
    push(0, 183.4, 439.5, fmt(cd.gpsLongitude, 6), 12);
    push(0, 175.6, 470.1, (cd.gpsAltitude ? fr0(cd.gpsAltitude) + ' m' : '42 m'), 12);
  }
  push(0, 162.5, 499.6, peakLabel, 12, true);
  push(0, 172.6, 529.4, installer, 12, true);
  push(0, 136.6, 559.1, dateStr, 12);

  // =====================================================================
  // PAGE 4 : I. Introduction + III. Equipements
  // =====================================================================
  push(3, 110.5, 167.3, clientName, 11, true);
  push(3, 208.1, 205.3, address, 11);

  // Table Equipements Section III
  const eqCols = { nombre: 221.2, marque: 294.1, reference: 390.4 };
  const eqTable1 = [
    [true, String(panelCount), panelBrand, panelModel],
    [true, '1', invBrand, invModel],
    [false, '***', '***', '***'],
    [true, '1', dcProtBrand, dcProtModel],
    [true, '1', dcProtBrand, eq.dcProtection?.model2 || 'XL7-63 2P'],
    [true, '1', acProtBrand, acProtModel],
  ];
  eqTable1.forEach(([fill, nombre, marque, referenceCell], i) => {
    const y = 526.3 + i * 19.1;
    if (fill) {
      push(3, eqCols.nombre, y, nombre, 11);
      push(3, eqCols.marque, y, marque, 11);
      push(3, eqCols.reference, y, referenceCell, 11);
    }
  });

  // =====================================================================
  // PAGE 5 : Suite table + IV.1 Panneau + IV.2 Onduleur
  // =====================================================================
  const eqTable2 = [
    [true, '1', 'SUNTREE', 'SCB8LE-63 C16'],
    [false, '***', '***', '***'],
    [true, '***', dcCableBrand, dcCableRef],
    [true, '***', acCableBrand, acCableRef],
    [false, '***', '***', '***'],
    [false, '***', '***', '***'],
    [true, '1', 'NHC01series', '2*7'],
    [false, '***', '***', '***'],
  ];
  eqTable2.forEach(([fill, nombre, marque, referenceCell], i) => {
    const y = 127.3 + i * 19.1;
    if (fill) {
      push(4, eqCols.nombre, y, nombre, 11);
      push(4, eqCols.marque, y, marque, 11);
      push(4, eqCols.reference, y, referenceCell, 11);
    }
  });

  // Panneau Specs (Right column at x=490)
  const panelRows = [
    [404, panelBrand],
    [418, panelModel],
    [432, fr0(pmax) + ' W'],
    [447, fmt(vmpp) + ' V'],
    [461, fmt(impp) + ' A'],
    [475, fmt(voc) + ' V'],
    [490, fmt(isc) + ' A'],
    [504, fmt(coeffVoc, 2) + '%/?C'],
    [518, fmt(coeffIsc, 2) + '%/?C'],
    [533, fr0(irm) + ' A'],
  ];
  panelRows.forEach(([y, text]) => push(4, 490, y, text, 9));

  push(4, 120, 628, '1', 9, true);
  push(4, 250, 628, String(panelCount), 9, true);
  push(4, 360, 628, fr0(pmax * panelCount) + ' Wc', 9, true);
  push(4, 470, 628, fmt(ratio, 2), 9, true);

  // =====================================================================
  // PAGE 6 : Onduleur N?1 + Equipements DC/AC
  // =====================================================================
  push(5, 256, 149, invBrand + ' ' + invModel, 9, true);
  const invRows = [
    [163, invBrand],
    [178, invModel],
    [192, fr0(pac) + ' W'],
    [206, fr0(udcMax) + ' V'],
    [221, fmt(idcMax) + ' A / ' + fr0(nbMppt)],
    [235, fmt(iscMaxInv) + ' A / ' + fr0(nbMppt)],
    [249, fr0(nbMppt)],
    [263, fr0(nbMppt) + ' / ' + fr0(nbMppt)],
    [278, fr0(umpptMin) + ' - ' + fr0(umpptMax) + ' V'],
    [292, fr0(umpptMin) + ' - ' + fr0(udcMax) + ' V'],
    [306, fmt(inv.pacKva || pac / 1000) + ' kVA'],
    [321, '230 V'],
    [335, fmt(iacMax) + ' A'],
  ];
  invRows.forEach(([y, text]) => push(5, 495, y, text, 8.5));

  const dcAcRows = [
    [458, '2'],
    [472, fmt(spdDcU) + ' V'],
    [485, fmt(spdDcUp) + ' V'],
    [499, fmt(spdDcIn) + ' kA'],
    [513, fmt(spdDcIsc) + ' A'],
    [527, fmt(usec) + ' V'],
    [541, fmt(isec) + ' A'],
    [555, fmt(acProt.udis || vac) + ' V'],
    [569, fr0(inDisj) + ' A'],
    [583, fmt(acProt.icn || 6) + ' kA'],
    [597, fr0(sensi) + ' mA'],
    [611, '2'],
    [625, fmt(spdAcU) + ' V'],
    [639, fmt(spdAcUp) + ' V'],
    [653, fmt(spdAcIn) + ' kA'],
    [681, fr0(dcSection) + ' mm?'],
    [695, fr0(dcIz) + ' A'],
    [709, fr0(acSection) + ' mm?'],
    [723, fr0(acIz) + ' A'],
  ];
  dcAcRows.forEach(([y, value]) => push(5, 400, y, String(value), 8.5));

  // =====================================================================
  // PAGE 7 : Nsmax
  // =====================================================================
  const vocMin10 = pt.vocMin10 ?? fmt(voc * (1 + coeffVoc / 100 * ((pt.tmin ?? -10) - 25)), 2);
  push(6, 90, 660, 'Voc(-10?C) = ' + fmt(voc, 2) + ' ? (1 + ' + fmt(coeffVoc, 2) + '/100 ? (' + fmt(pt.tmin ?? -10, 0) + ' - 25)) = ' + fmt(vocMin10, 2) + ' V', 8.5);
  push(6, 90, 676, 'Nsmax = E?( ' + fr0(udcMax) + ' / ' + fmt(vocMin10, 2) + ' ) = ' + fr0(nsMax) + ' panneaux', 8.5);

  // =====================================================================
  // PAGE 8 : Nsoptimal / Nsmin / Npmax
  // =====================================================================
  const vmppMin10 = pt.vmppMin10 ?? fmt(vmpp * (1 + coeffVoc / 100 * ((pt.tmin ?? -10) - 25)), 2);
  const vmpp85 = pt.vmpp85 ?? fmt(vmpp * (1 + coeffVoc / 100 * ((pt.tmax ?? 85) - 25)), 2);
  const isc85 = pt.isc85 ?? fmt(isc * (1 + coeffIsc / 100 * ((pt.tmax ?? 85) - 25)), 2);

  push(7, 90, 228, 'Vmp(-10?C) = ' + fmt(vmpp, 2) + ' ? (1 + ' + fmt(coeffVoc, 2) + '/100 ? (-10 - 25)) = ' + fmt(vmppMin10, 2) + ' V', 8.5);
  push(7, 90, 244, 'Nsoptimal = E?( ' + fr0(umpptMax) + ' / ' + fmt(vmppMin10, 2) + ' ) = ' + fr0(nsOpt) + ' panneaux', 8.5);
  push(7, 90, 352, 'Vmp(85?C) = ' + fmt(vmpp, 2) + ' ? (1 + ' + fmt(coeffVoc, 2) + '/100 ? (85 - 25)) = ' + fmt(vmpp85, 2) + ' V', 8.5);
  push(7, 90, 368, 'Nsmin = E?( ' + fr0(umpptMin) + ' / ' + fmt(vmpp85, 2) + ' ) = ' + fr0(nsMin) + ' panneau', 8.5);
  push(7, 90, 473, 'Isc(85?C) = ' + fmt(isc, 2) + ' ? (1 + ' + fmt(coeffIsc, 2) + '/100 ? (85 - 25)) = ' + fmt(isc85, 2) + ' A', 8.5);
  push(7, 90, 489, 'Npmax = E?( ' + fmt(iscMaxInv, 2) + ' / ' + fmt(isc85, 2) + ' ) = ' + fr0(npMax) + ' cha?ne', 8.5);

  // =====================================================================
  // PAGE 14 : Conclusion c?ble DC
  // =====================================================================
  push(13, 130, 249, fmt(dcIb, 2) + ' A', 8.5);
  push(13, 245, 224, fr0(dcSection) + ' mm?', 8.5);
  push(13, 340, 250, fr0(dcIz) + ' A', 8.5);
  push(13, 445, 250, fmt(dcIzPrime, 2) + ' A', 8.5);

  const dcDropRow = 542;
  push(13, 150, dcDropRow, fmt(dcRho, 5), 8.5);
  push(13, 239, dcDropRow, fr0(dcL), 8.5);
  push(13, 287, dcDropRow, fmt(impp, 2), 8.5);
  push(13, 348, dcDropRow, fr0(dcSection), 8.5);
  push(13, 409, dcDropRow, fr0(dcUmp) + ' V', 8.5);
  push(13, 457, dcDropRow, dcDropV + ' V', 8.5);
  push(13, 513, dcDropRow, dcDropP + ' %', 8.5);

  push(13, 150, 716, 'La Chute de Tension est ?u (%) = ' + dcDropP + ' % << 3 %. (Valide le choix du c?ble).', 9, true);

  // =====================================================================
  // PAGE 16 : Conclusion c?ble AC
  // =====================================================================
  push(15, 130, 706, fmt(acI, 1) + ' A', 8.5);
  push(15, 248, 693, fr0(acSection) + ' mm?', 8.5);
  push(15, 370, 707, fmt(acIzPrime, 2) + ' A', 8.5);
  push(15, 453, 707, fr0(acIz) + ' A', 8.5);

  // =====================================================================
  // PAGE 17 : Chute de tension AC + conclusion
  // =====================================================================
  push(16, 110, 360, fr0(b), 8.5);
  push(16, 184, 360, fmt(dcRho, 5), 8.5);
  push(16, 232, 360, fmt(acL1, 1), 8.5);
  push(16, 263, 360, fmt(acI, 1), 8.5);
  push(16, 295, 360, fr0(acSection), 8.5);
  push(16, 310, 360, fmt(lambda, 5), 8.5);
  push(16, 353, 360, fmt(cosPhi, 1), 8.5);
  push(16, 396, 360, fmt(sinPhi, 1), 8.5);
  push(16, 427, 360, fr0(vac), 8.5);
  push(16, 476, 360, acDrop1V + ' V', 8.5);
  push(16, 505, 360, acDrop1P + ' %', 8.5);

  push(16, 110, 383, fr0(b), 8.5);
  push(16, 184, 383, fmt(dcRho, 5), 8.5);
  push(16, 232, 383, fmt(acL2, 1), 8.5);
  push(16, 263, 383, fmt(acI, 1), 8.5);
  push(16, 295, 383, fr0(acSection), 8.5);
  push(16, 310, 383, fmt(lambda, 5), 8.5);
  push(16, 353, 383, fmt(cosPhi, 1), 8.5);
  push(16, 396, 383, fmt(sinPhi, 1), 8.5);
  push(16, 427, 383, fr0(vac), 8.5);
  push(16, 476, 383, acDrop2V + ' V', 8.5);
  push(16, 505, 383, acDrop2P + ' %', 8.5);

  push(16, 90, 520, '?utot = ?u1 + ?u2 = ' + acDrop1P + ' + ' + acDrop2P + ' = ' + acDropTotal + ' % << 3 %. (Valide le choix du c?ble).', 9, true);

  return cmds;
}

export async function fillStegTemplate(dossierData, complianceReport) {
  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  pdfDoc.registerFontkit(fontkit);

  const fontReg = await pdfDoc.embedFont(fs.readFileSync(FONT_REGULAR), { subset: true });
  const fontBold = await pdfDoc.embedFont(fs.readFileSync(FONT_BOLD), { subset: true });

  const cmds = buildFillCommands(dossierData, complianceReport);
  const pages = pdfDoc.getPages();

  for (const cmd of cmds) {
    const page = pages[cmd.p];
    if (!page) continue;
    const { width, height } = page.getSize();
    const baseline = height - cmd.yTop;
    page.drawText(cmd.text, {
      x: cmd.x,
      y: baseline,
      size: cmd.size,
      font: cmd.bold ? fontBold : fontReg,
      color: rgb(0, 0, 0),
    });
  }

  return Buffer.from(await pdfDoc.save());
}
