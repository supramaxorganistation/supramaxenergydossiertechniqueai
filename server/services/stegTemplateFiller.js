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

const PAGE_H = 842; // A4 hauteur (pt)

function fmt(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '–';
  let s = n.toFixed(digits);
  if (digits > 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',');
}

function fr0(v) {
  const n = Number(v);
  return Number.isFinite(n) ? String(n.toFixed(0)) : '–';
}

/**
 * Carte de remplissage : génère les commandes de texte à dessiner sur le
 * gabarit STEG (21 pages). Les coordonnées proviennent de l'extraction pdfjs
 * du modèle (origine coin supérieur gauche) ; la conversion en coordonnées
 * pdf-lib (origine bas gauche) est faite lors de l'application.
 *
 * @param {Object} dossierData
 * @param {Object} report - computeStegCompliance
 * @returns {Array<{p:number,x:number,yTop:number,text:string,size:number,bold?:boolean}>}
 */
export function buildFillCommands(dossierData, report) {
  const cmds = [];
  const push = (p, x, yTop, text, size = 8.5, bold = false) => {
    if (text == null || String(text).trim() === '') return;
    cmds.push({ p, x, yTop, text: String(text), size, bold });
  };

  const { customerDetails = {}, pvSystemParams = {}, equipment = {}, createdBy } = dossierData;
  const cd = customerDetails;
  const ps = pvSystemParams || {};
  const eq = equipment || {};
  const panel = eq.panel?.specs || {};
  const inv = eq.inverter?.specs || {};
  const dcProt = eq.dcProtection?.specs || {};
  const acProt = eq.acProtection?.specs || {};
  const dcCable = eq.dcCable?.specs || {};
  const acCable = eq.acCable?.specs || {};

  const installer = createdBy?.name || ps.installer || 'Eminence Energie';
  const clientName = cd.name || '–';
  const reference = cd.stegMeterRef || ps.stegMeterRef || '–';
  const address = cd.address || ps.address || '–';

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
  const dcCableRef = dcCable.section ? 'EN 50618 H1Z2Z2-K ' + fr0(dcCable.section) + ' mm²' : '***';
  const acCableRef = 'H05VV-F';

  // ---- Valeurs moteur de calcul ----
  const pt = report?.parameters?.panelTemperatureAdjustments || {};
  const sc = report?.compatibility?.stringComputation || {};
  const pr = report?.compatibility?.powerRatio || {};
  const ms = report?.compatibility?.maxStringsParallel || {};
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
  const npOpt = Math.max(sc.npOpt ?? 1, 1);
  const ratio = pr.ratio ?? 1.02;
  const pvPower = pr.pvPower ?? pmax * panelCount;
  const acPower = pr.acPower ?? pac;

  const usec = dcProt.usec || ds.selectedUsec || 800;
  const isec = ds.selectedIsec ?? dcProt.inDisj ?? 20;
  const usecReq = ds.usecRequired ?? fmt(voc * panelCount, 1);
  const isecReq = ds.isecRequired ?? fmt(1.25 * isc, 2);

  const spdDcU = spdDc.selectedUcpv ?? dcProt.ucpv ?? 600;
  const spdDcUp = spdDc.selectedUp ?? dcProt.up ?? 2800;
  const spdDcIn = spdDc.selectedIn ?? dcProt.in ?? 20;
  const spdDcIsc = spdDc.selectedIscpv ?? dcProt.iscpv ?? 1000;
  const spdDcUReq = spdDc.ucpvRequired ?? fmt(1.2 * voc * panelCount, 0);
  const spdDcUpLimit = spdDc.upLimit ?? fmt(0.8 * (dcProt.uw || 6000), 0);

  const inDisj = acProt.inDisj || ab.recommended || 16;
  const ieMin = inv.iacMax || ab.ieMin || 14.3;
  const izAcCable = cac.iz ?? 42;
  const sensi = ab.sensitivityA ? Math.round(ab.sensitivityA * 1000) : 30;

  const spdAcU = spdAc.selectedUc ?? acProt.uc ?? 275;
  const spdAcUp = spdAc.selectedUp ?? acProt.up ?? 1000;
  const spdAcIn = spdAc.selectedIn ?? acProt.in ?? 20;
  const spdAcUReq = spdAc.ucRequired ?? Math.round(1.1 * vac);
  const spdAcUpLimit = spdAc.upLimit ?? Math.round(0.8 * (acProt.uw || 1500));

  // Câbles DC
  const dcIz = cdc.iz ?? dcCable.iz ?? 42;
  const dcSection = cdc.section ?? dcCable.section ?? 4;
  const dcIzPrime = cdc.izPrime ?? 34.44;
  const dcIb = cdc.ib ?? fmt(1.25 * isc, 2);
  const dcK = cdc.kFactors || {};
  const dcL = cdc.length ?? ps.dcCableLength ?? 14;
  const dcRho = 0.02314;
  const dcUmp = vmpp * panelCount;
  const dcDropV = fmt((2 * dcRho * dcL * impp) / dcSection, 2);
  const dcDropP = fmt(((2 * dcRho * dcL * impp) / (dcSection * dcUmp)) * 100, 3);

  // Câbles AC (deux tronçons)
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
  // PAGE 1 : COUVERTURE
  // =====================================================================
  push(0, 74, 130, installer, 9, true);
  const valX = 210;
  push(0, valX, 444, clientName, 9);
  push(0, valX, 467, reference, 9);
  push(0, valX, 489, address, 9);
  if (cd.gpsLatitude) {
    push(
      0, valX, 503,
      'GPS : Lat ' + fmt(cd.gpsLatitude, 6) + ' - Lon ' + fmt(cd.gpsLongitude, 6) + (cd.gpsAltitude ? ' - Alt ' + fr0(cd.gpsAltitude) + ' m' : ''),
      8
    );
  }
  push(0, valX, 512, peakLabel, 9);
  push(0, valX, 535, installer, 9);
  push(0, valX, 558, dateStr, 9);
  push(0, valX, 581, '1.0', 9);

  // =====================================================================
  // PAGE 2 : SOMMAIRE
  // =====================================================================
  const toc = [
    ['I. Introduction générale', 4],
    ['II. Documentation de la Solution proposée', 4],
    ['III. Equipements de la Solution proposée', 4],
    ['IV. Caractéristiques Techniques des équipements choisis :', 5],
    ['  1. Panneau', 5],
    ['  2. Onduleur (s)', 5],
    ['  3. Caractéristiques équipements DC et AC', 6],
    ['  4. Compatibilité de l\u2019onduleur :', 6],
    ['V. Dimensionnement Dispositifs de protection coté DC :', 9],
    ['  1. Nombre maximal de chaînes en parallèle sans protection', 9],
    ['  2. Fusible DC', 9],
    ['  3. Interrupteur sectionneur DC', 10],
    ['  4. Parafoudre DC', 10],
    ['VI. Dimensionnement Dispositifs de protection coté AC :', 11],
    ['  1. Disjoncteur (différentiel) AC :', 11],
    ['  2. Parafoudre AC', 11],
    ['VII. Dimensionnement Câble DC/AC', 12],
    ['  1. Câbles DC', 12],
    ['  2. Câbles AC', 15],
    ['VIII. Description du câblage des panneaux et de la mise à la terre', 17],
    ['IX. Description de la mise en œuvre de la structure', 18],
    ['X. Système de comptage', 18],
    ['ANNEXE IPV', 19],
  ];
  toc.forEach(([title, page], i) => {
    const y = 228 + i * 15;
    const x = title.startsWith('  ') ? 124 : 110;
    const clean = title.replace(/^ {2}/, '');
    push(1, x, y, clean, 9, true);
    const titleLen = clean.length * 4.7;
    const dots = Math.max(6, Math.round((500 - (x + titleLen)) / 3.5));
    push(1, x + titleLen, y, '\u2026'.repeat(dots), 9);
    push(1, 500, y, String(page), 9, true);
  });
  push(1, 71, 128, installer, 8, true);

  // =====================================================================
  // PAGES 2..21 : sigle installateur en en-tête
  // =====================================================================
  for (let p = 2; p <= 20; p++) push(p, 71, 130, installer, 8, true);

  // =====================================================================
  // PAGE 4 : I. Introduction + III. Equipements
  // =====================================================================
  push(3, 107, 177, 'Dans le cadre de la production d\u2019énergie électrique, la société ' + installer + ' a procédé à l\u2019étude d\u2019une installation de production photovoltaïque raccordée au réseau basse tension de la STEG.', 8.5);
  push(3, 107, 191, 'Le présent dossier technique, relatif à M. / Mme ' + clientName + ', ' + address + ', est destiné à la STEG pour l\u2019approbation de l\u2019installation ' + peakLabel + '.', 8.5);
  push(3, 107, 205, 'Date prévisionnelle de mise en service : ' + dateStr + '.', 8.5);

  const eqTable = [
    [true, 'Modules', fr0(panelCount), panelBrand, panelModel],
    [true, 'Onduleurs', '1', invBrand, invModel],
    [false, 'Fusibles', '***', '***', '***'],
    [true, 'Parafoudres DC', '1', dcProtBrand, dcProtModel],
    [true, 'Interrupteurs Sectionneurs DC', '1', dcProtBrand, eq.dcProtection?.model2 || 'XL7-63 2P'],
    [true, 'Parafoudre AC', '1', acProtBrand, acProtModel],
    [false, 'Interrupteur sectionneur général', '***', '***', '***'],
  ];
  const eqCols = { nombre: 255, marque: 342, reference: 438 };
  eqTable.forEach(([fill, , nombre, marque, referenceCell], i) => {
    const y = 602 + i * 14.5;
    if (fill) {
      push(3, eqCols.nombre, y, String(nombre), 8.5);
      push(3, eqCols.marque, y, String(marque), 8.5);
      push(3, eqCols.reference, y, String(referenceCell), 8.5);
    }
  });

  // =====================================================================
  // PAGE 5 : suite équipements + IV.1 Panneau + IV.2 Onduleur
  // =====================================================================
  const eqTable2 = [
    [true, 'Disjoncteurs diff\u00e9rentiel AC 30mA', '1', 'SUNTREE', 'SCB8LE-63 C16'],
    [false, 'Disjoncteur général AC', '***', '***', '***'],
    [true, 'Câble DC', '***', dcCableBrand, dcCableRef],
    [true, 'Câble AC', '***', acCableBrand, acCableRef],
    [false, 'Câble de mise à la terre', '***', '***', '***'],
    [false, 'Connecteur MC4', '***', '***', '***'],
    [true, 'Répartiteurs', '1', 'NHC01series', '2*7'],
    [false, 'Chemin de câble', '***', '***', '***'],
  ];
  eqTable2.forEach(([fill, , nombre, marque, referenceCell], i) => {
    const y = 127 + i * 14.5;
    if (fill) {
      push(4, eqCols.nombre, y, String(nombre), 8.5);
      push(4, eqCols.marque, y, String(marque), 8.5);
      push(4, eqCols.reference, y, String(referenceCell), 8.5);
    }
  });

  const panelRows = [
    [404, panelBrand],
    [418, panelModel],
    [432, fr0(pmax) + ' W'],
    [447, fmt(vmpp) + ' V'],
    [461, fmt(impp) + ' A'],
    [475, fmt(voc) + ' V'],
    [490, fmt(isc) + ' A'],
    [504, fmt(coeffVoc, 2) + '%/°C'],
    [518, fmt(coeffIsc, 2) + '%/°C'],
    [533, fr0(irm) + ' A'],
  ];
  panelRows.forEach(([y, text]) => push(4, 490, y, text, 8.5));

  push(4, 120, 628, '1', 9, true);
  push(4, 250, 628, String(panelCount), 9, true);
  push(4, 360, 628, fr0(pmax * panelCount) + ' Wc', 9, true);
  push(4, 470, 628, fmt(ratio, 2), 9, true);

  // =====================================================================
  // PAGE 6 : Onduleur N°1 + Caractéristiques équipements DC/AC + Compatibilité
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
    [458, 'Type 1 ou 2', '2'],
    [472, 'Ucpv =', fmt(spdDcU) + ' V'],
    [485, 'Up =', fmt(spdDcUp) + ' V'],
    [499, 'In =', fmt(spdDcIn) + ' kA'],
    [513, 'Iscpv =', fmt(spdDcIsc) + ' A'],
    [527, 'Usec =', fmt(usec) + ' V'],
    [541, 'Isec =', fmt(isec) + ' A'],
    [555, 'Udis =', fmt(acProt.udis || vac) + ' V'],
    [569, 'In =', fr0(inDisj) + ' A'],
    [583, 'Pouvoir de coupure =', fmt(acProt.icn || 6) + ' kA'],
    [597, 'Sensibilité =', fr0(sensi) + ' mA'],
    [611, 'Type 1 ou 2', '2'],
    [625, 'Ucpv =', fmt(spdAcU) + ' V'],
    [639, 'Up =', fmt(spdAcUp) + ' V'],
    [653, 'In =', fmt(spdAcIn) + ' kA'],
    [681, 'Section', fr0(dcSection) + ' mm²'],
    [695, 'Courant admissible Iz=', fr0(dcIz) + ' A'],
    [709, 'Section', fr0(acSection) + ' mm²'],
    [723, 'Courant admissible Iz=', fr0(acIz) + ' A'],
  ];
  dcAcRows.forEach(([y, label, value]) => push(5, 400, y, String(value), 8.5));

  push(6, 420, 285, fmt(coeffVoc, 2) + '%/°C', 8.5);
  push(6, 420, 326, fmt(coeffIsc, 2) + '%/°C', 8.5);
  push(6, 420, 368, fmt(umpptMax, 0) + ' V', 8.5);
  push(6, 420, 395, fmt(umpptMin, 0) + ' V', 8.5);
  push(6, 420, 423, fmt(idcMax, 1) + ' A', 8.5);
  push(6, 420, 451, fmt(iscMaxInv, 1) + ' A', 8.5);
  push(6, 420, 478, fmt(isc, 2) + ' A', 8.5);

  // =====================================================================
  // PAGE 7 : Nsmax + application numérique
  // =====================================================================
  const vocMin10 = pt.vocMin10 ?? fmt(voc * (1 + coeffVoc / 100 * ((pt.tmin ?? -10) - 25)), 2);
  push(6, 90, 660, 'Voc(-10°C) = ' + fmt(voc, 2) + ' × (1 + ' + fmt(coeffVoc, 2) + '/100 × (' + fmt(pt.tmin ?? -10, 0) + ' - 25)) = ' + fmt(vocMin10, 2) + ' V', 8.5);
  push(6, 90, 676, 'Nsmax = E¯( ' + fr0(udcMax) + ' / ' + fmt(vocMin10, 2) + ' ) = ' + fr0(nsMax) + ' panneaux', 8.5);

  // =====================================================================
  // PAGE 8 : Nsoptimal / Nsmin / Npmax / Npoptimal / compat puissance
  // =====================================================================
  const vmppMin10 = pt.vmppMin10 ?? fmt(vmpp * (1 + coeffVoc / 100 * ((pt.tmin ?? -10) - 25)), 2);
  const vmpp85 = pt.vmpp85 ?? fmt(vmpp * (1 + coeffVoc / 100 * ((pt.tmax ?? 85) - 25)), 2);
  const isc85 = pt.isc85 ?? fmt(isc * (1 + coeffIsc / 100 * ((pt.tmax ?? 85) - 25)), 2);
  const impp85 = pt.impp85 ?? fmt(impp * (1 + coeffIsc / 100 * ((pt.tmax ?? 85) - 25)), 2);

  push(7, 90, 228, 'Vmp(-10°C) = ' + fmt(vmpp, 2) + ' × (1 + ' + fmt(coeffVoc, 2) + '/100 × (-10 - 25)) = ' + fmt(vmppMin10, 2) + ' V', 8.5);
  push(7, 90, 244, 'Nsoptimal = E¯( ' + fr0(umpptMax) + ' / ' + fmt(vmppMin10, 2) + ' ) = ' + fr0(nsOpt) + ' panneaux', 8.5);
  push(7, 90, 352, 'Vmp(85°C) = ' + fmt(vmpp, 2) + ' × (1 + ' + fmt(coeffVoc, 2) + '/100 × (85 - 25)) = ' + fmt(vmpp85, 2) + ' V', 8.5);
  push(7, 90, 368, 'Nsmin = E⁺( ' + fr0(umpptMin) + ' / ' + fmt(vmpp85, 2) + ' ) = ' + fr0(nsMin) + ' panneau', 8.5);
  push(7, 90, 473, 'Isc(85°C) = ' + fmt(isc, 2) + ' × (1 + ' + fmt(coeffIsc, 2) + '/100 × (85 - 25)) = ' + fmt(isc85, 2) + ' A', 8.5);
  push(7, 90, 489, 'Npmax = E¯( ' + fmt(iscMaxInv, 2) + ' / ' + fmt(isc85, 2) + ' ) = ' + fr0(npMax) + ' chaîne', 8.5);
  push(7, 90, 595, 'Imp(85°C) = ' + fmt(impp, 2) + ' × (1 + ' + fmt(coeffIsc, 2) + '/100 × (85 - 25)) = ' + fmt(impp85, 2) + ' A', 8.5);
  push(7, 90, 611, 'Npoptimal = E¯( ' + fmt(idcMax, 2) + ' / ' + fmt(impp85, 2) + ' ) = ' + fr0(npOpt) + ' chaîne', 8.5);
  push(7, 150, 727, '0,9 ≤ ( ' + fr0(pvPower) + ' / ' + fr0(acPower) + ' ) = ' + fmt(ratio, 2) + ' ≤ 1,3  (valide)', 8.5, true);

  // =====================================================================
  // PAGE 9 : V.1 Ncmax + V.2 Fusible
  // =====================================================================
  push(8, 90, 355, 'Ncmax ≤ (1 + ' + fr0(ms.irm ?? irm) + ' / ' + fmt(isc, 2) + ') = ' + fmt(ms.ncmax ?? 1 + irm / isc, 2) + ' chaînes', 8.5);
  push(8, 90, 370, 'Npmax ≤ 0,5 × (1 + ' + fr0(ms.irm ?? irm) + ' / ' + fmt(isc85, 2) + ') = ' + fr0(ms.npmaxProtection ?? 1) + ' chaîne', 8.5);

  // =====================================================================
  // PAGE 10 : V.3 Sectionneur DC + V.4 Parafoudre DC
  // =====================================================================
  push(9, 90, 300, 'Usec = ' + fr0(usec) + ' V > Voc(-10°C) champ PV = ' + fmt(usecReq, 1) + ' V (valide)', 8.5);
  push(9, 90, 314, 'Isec = ' + fmt(isec, 2) + ' A > 1,25 × Isc champ PV = ' + fmt(isecReq, 2) + ' A (valide)', 8.5);
  push(9, 340, 312, fmt(isec, 2), 8.5);
  push(9, 336, 334, fr0(usec), 8.5);
  push(9, 90, 377, 'Interrupteur sectionneur DC choisi : ' + dcProtBrand + ' ' + fr0(usec) + ' V Type 2, référence ' + (eq.dcProtection?.model2 || 'XL7-63 2P') + ' ou similaire.', 8.5, true);
  push(9, 330, 635, fmt(spdDcU, 0) + ' V > ' + fr0(spdDcUReq) + ' V (valide)', 8.5);
  push(9, 330, 657, fmt(spdDcUp, 0) + ' V < ' + fr0(spdDcUpLimit) + ' V (valide)', 8.5);
  push(9, 330, 678, fr0(spdDcIn) + ' kA > 5 kA (valide)', 8.5);
  push(9, 330, 700, fr0(spdDcIsc) + ' A > 1,25 × Isc = ' + fmt(1.25 * isc, 2) + ' A (valide)', 8.5);
  push(9, 90, 722, 'Parafoudre DC choisi : ' + dcProtBrand + ' Type 2, référence ' + dcProtModel + ' ou similaire.', 8.5, true);

  // =====================================================================
  // PAGE 11 : VI.1 Disjoncteur AC + VI.2 Parafoudre AC
  // =====================================================================
  push(10, 90, 417, 'Imax onduleur = ' + fmt(ieMin, 1) + ' A ≤ Ie = ' + fr0(inDisj) + ' A ≤ Iz câble AC = ' + fr0(izAcCable) + ' A (valide)', 8.5);
  push(10, 330, 342, fmt(acProt.udis || vac, 0) + ' V', 8.5);
  push(10, 330, 364, fr0(inDisj) + ' A', 8.5);
  push(10, 330, 386, fr0(sensi) + ' mA', 8.5);
  push(10, 90, 451, 'Disjoncteur différentiel AC choisi : SUNTREE 2 pôles ' + fr0(inDisj) + ' A, ' + fr0(sensi) + ' mA, référence SCB8LE-63 C16 ou similaire.', 8.5, true);
  push(10, 330, 708, fr0(spdAcU) + ' V > ' + fr0(spdAcUReq) + ' V (valide)', 8.5);
  push(10, 330, 730, fr0(spdAcIn) + ' kA > 5 kA (valide)', 8.5);

  // =====================================================================
  // PAGE 12 : Parafoudre AC (Up) + conclusion
  // =====================================================================
  push(11, 310, 125, 'utilisé = ' + fmt(spdAcUp, 0) + ' V < ' + fr0(spdAcUpLimit) + ' V (valide)', 8.5);
  push(11, 90, 168, 'Parafoudre AC choisi : ' + acProtBrand + ' Type 2, référence ' + acProtModel + ' 275 V ou similaire.', 8.5, true);

  // =====================================================================
  // PAGE 14 : Conclusion câble DC + chute de tension DC
  // =====================================================================
  push(13, 130, 249, fmt(dcIb, 2) + ' A', 8.5);
  push(13, 245, 224, fr0(dcSection) + ' mm²', 8.5);
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

  push(13, 150, 716, 'La Chute de Tension est Δu (%) = ' + dcDropP + ' % << 3 %.  (Valide le choix du câble).', 9, true);

  // =====================================================================
  // PAGE 16 : Conclusion câble AC
  // =====================================================================
  push(15, 130, 706, fmt(acI, 1) + ' A', 8.5);
  push(15, 248, 693, fr0(acSection) + ' mm²', 8.5);
  push(15, 370, 707, fmt(acIzPrime, 2) + ' A', 8.5);
  push(15, 453, 707, fr0(acIz) + ' A', 8.5);

  // =====================================================================
  // PAGE 17 : Chute de tension AC (2 tronçons) + conclusion + VIII
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

  push(16, 90, 520, 'Δutot = Δu1 + Δu2 = ' + acDrop1P + ' + ' + acDrop2P + ' = ' + acDropTotal + ' % << 3 %.  (Valide le choix du câble).', 9, true);

  push(16, 110, 700, 'Les modules photovoltaïques (' + fr0(panelCount) + ') sont raccordés en série (1 chaîne). Les câbles DC (double isolation, résistants aux UV) relient les chaînes au coffret de protection DC puis à l\u2019onduleur ; les câbles AC relient l\u2019onduleur au coffret AC puis au point d\u2019injection.', 8.5);
  push(16, 110, 714, 'Mise à la terre : câbles de terre de section 10 mm², mise à la terre entre panneaux par rondelles bimétal et cosses de 6 mm², regard de terre rectangulaire 40 × 40, 3 piquets de 1,5 m distants de 35 cm. Valeur de terre vérifiée < 25 Ω.', 8.5);

  // =====================================================================
  // PAGE 18 : IX. Structure
  // =====================================================================
  push(17, 107, 208, 'La structure porteuse des panneaux est métallique en aluminium, adaptée au supportage sur toiture-terrasse : 3 triangles doubles en cornière aluminium 40/40, fixés sur 7 dalles en béton (37 kg chacune), liens entre triangles par rails Omega et pinces en aluminium, câbles en acier de section 6 mm² pour la bordure du toit. Résistance aux vents jusqu\u2019à ' + fmt(wa.windSpeedKmh ?? 120, 0) + ' km/h.', 8.5);

  return cmds;
}

/**
 * Applique les commandes sur le gabarit STEG et renvoie le PDF rempli (21 pages).
 * @param {Object} dossierData
 * @param {Object} complianceReport
 * @returns {Promise<Buffer>}
 */
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
