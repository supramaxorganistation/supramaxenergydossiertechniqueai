/**
 * STEG Technical Dossier Calculation Engine
 * Implémente les formules du Dossier Type STEG et NF C 15-100.
 * Référence : Projet_Dossier_PV_Automatise_Synthese (§4).
 */

const COPPER_RESISTIVITY = 0.0198; // Ω·mm²/m à 70 °C
const ALUMINIUM_RESISTIVITY = 0.0310; // Ω·mm²/m
const DEFAULT_IRM = 15; // A - courant inverse admissible du module (défaut)
const AIR_DENSITY = 1.225; // kg/m³

// NF C 15-100 - K1 (Tableau 52C/52G) : mode de pose
const K1_MODE = {
  'PLEIN_AIR': 1.0,
  'CHEMIN_CABLE': 1.0,
  'CONDUIT_MUR': 0.9,
  'SOUS_GTT': 0.8,
  'PLEINE_TERRE': 1.0,
  'EXPOSE_SOLEIL': 0.8,
};

// NF C 15-100 - K2 (Tableau 52N) : groupement de circuits
const K2_GROUPING = { 1: 1.0, 2: 0.85, 3: 0.79, 4: 0.75, 5: 0.73, 6: 0.72, 7: 0.71 };
const K2_GROUPING_DEFAULT = 0.7;

// NF C 15-100 - K3 (Tableau 52K) : température ambiante × isolant
const K3_TEMP = {
  PVC: { 25: 1.08, 30: 1.0, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61, 60: 0.5 },
  PR: { 25: 1.04, 30: 1.0, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71 },
  XLPE: { 25: 1.04, 30: 1.0, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71 },
};

// NF C 15-100 - K4 (Tableau 52O) : nombre de couches
const K4_LAYERS = { 1: 1.0, 2: 0.8, 3: 0.73, 4: 0.7, 5: 0.66 };

// NF C 15-100 - Iz (A) cuivre, PVC, 2 ou 3 conducteurs chargés, pose sur chemin de câbles
const IZ_TABLE = [
  { section: 1.5, cuPvc: 17.5 },
  { section: 2.5, cuPvc: 24 },
  { section: 4, cuPvc: 32 },
  { section: 6, cuPvc: 41 },
  { section: 10, cuPvc: 57 },
  { section: 16, cuPvc: 76 },
  { section: 25, cuPvc: 101 },
  { section: 35, cuPvc: 125 },
  { section: 50, cuPvc: 151 },
  { section: 70, cuPvc: 192 },
  { section: 95, cuPvc: 232 },
  { section: 120, cuPvc: 269 },
];

const BREAKER_RATINGS = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100];

function round(value, digits = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? parseFloat(n.toFixed(digits)) : 0;
}

/**
 * Normalise un coefficient de température.
 * Accepte soit %/°C (-0.25), soit une fraction décimale (-0.0025).
 */
function normCoefficient(coeff) {
  const c = Number(coeff) || 0;
  return Math.abs(c) >= 0.01 ? c / 100 : c;
}

/**
 * Ajustement de température des valeurs PV.
 * @param {number} value - Valeur à 25 °C (Voc, Vmpp, Isc, Impp...)
 * @param {number} coefficient - Coefficient de température (%/°C ou fraction)
 * @param {number} temperature - Température cible en °C
 */
export function temperatureAdjustment(value, coefficient, temperature) {
  const tempDelta = temperature - 25;
  return value * (1 + normCoefficient(coefficient) * tempDelta);
}

function k1Factor(mode) {
  return K1_MODE[mode] || 1.0;
}

function k2Factor(grouping) {
  return K2_GROUPING[grouping] || K2_GROUPING_DEFAULT;
}

function k3Factor(insulation, temp) {
  const table = K3_TEMP[insulation] || K3_TEMP.PVC;
  const exact = table[temp];
  if (exact) return exact;
  const temps = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (temp <= temps[0]) return table[temps[0]];
  if (temp >= temps[temps.length - 1]) return table[temps[temps.length - 1]];
  for (let i = 0; i < temps.length - 1; i++) {
    if (temp >= temps[i] && temp <= temps[i + 1]) {
      const t0 = temps[i];
      const t1 = temps[i + 1];
      return table[t0] + ((table[t1] - table[t0]) * (temp - t0)) / (t1 - t0);
    }
  }
  return 1.0;
}

function k4Factor(layers) {
  return K4_LAYERS[layers] || 1.0;
}

function izBase(section, material, insulation) {
  const row = IZ_TABLE.find((r) => r.section === Number(section));
  if (!row) return null;
  let iz = row.cuPvc;
  if (insulation === 'PR' || insulation === 'XLPE') iz *= 1.25;
  if (String(material).toUpperCase() === 'AL' || String(material).toUpperCase() === 'ALUMINIUM') iz *= 0.78;
  return round(iz, 1);
}

function isAluminium(material) {
  return String(material).toUpperCase() === 'AL' || String(material).toUpperCase() === 'ALUMINIUM';
}

function recommendSection(ib, material, insulation) {
  for (const row of IZ_TABLE) {
    if (izBase(row.section, material, insulation) >= ib) return row.section;
  }
  return IZ_TABLE[IZ_TABLE.length - 1].section;
}

function recommendBreaker(imax) {
  for (const rating of BREAKER_RATINGS) {
    if (rating >= imax) return rating;
  }
  return BREAKER_RATINGS[BREAKER_RATINGS.length - 1];
}

function designStatus(value, min, max) {
  if (value < min || value > max) return 'INVALID';
  return 'VALID';
}

/**
 * Dimensionne une section de câble selon NF C 15-100 : Iz' = Iz × K1 × K2 × K3 × K4.
 */
function sizeCable({ length, section, iz, material, insulation, mode, grouping, temp, layers, ib }) {
  const k1 = k1Factor(mode);
  const k2 = k2Factor(grouping);
  const k3 = k3Factor(insulation, temp);
  const k4 = k4Factor(layers);
  const totalK = round(k1 * k2 * k3 * k4);
  const izPrime = round(iz * totalK);
  const sizingOk = izPrime >= ib;
  const recommended = recommendSection(ib, material, insulation);

  return {
    kFactors: { k1: round(k1), k2: round(k2), k3: round(k3), k4: round(k4), total: totalK },
    izPrime,
    sizingOk,
    recommendedSection: recommended,
  };
}

/**
 * Moteur de calcul STEG complet.
 * @param {Object} dossierData - Dossier complet (customerDetails, pvSystemParams, equipment)
 * @returns {Object} Rapport de conformité complet
 */
export function computeStegCompliance(dossierData) {
  const report = {
    timestamp: new Date(),
    errors: [],
    warnings: [],
    parameters: {},
    compatibility: {},
    protections: {},
    cableAnalysis: {},
    windAnalysis: {},
    summary: {},
  };

  try {
    const { pvSystemParams, equipment = {} } = dossierData;
    const panel = equipment.panel?.specs || {};
    const inverter = equipment.inverter?.specs || {};
    const dcProt = equipment.dcProtection?.specs || {};
    const acProt = equipment.acProtection?.specs || {};
    const dcCable = equipment.dcCable?.specs || {};
    const acCable = equipment.acCable?.specs || {};

    // Site / configuration
    const tmin = pvSystemParams?.tmin ?? -10;
    const tmax = pvSystemParams?.tmax ?? 85;
    const acPhase = pvSystemParams?.acPhase || 'mono';

    // ---- Paramètres panneaux ----
    const panelCount = pvSystemParams?.panelCount || 1;
    const pmax = panel.pmax || 400;
    const vmpp = panel.vmpp || 40.8;
    const impp = panel.impp || 9.8;
    const voc = panel.voc || 49.2;
    const isc = panel.isc || 10.5;
    const coeffVoc = panel.coeffVoc ?? -0.25;
    const coeffIsc = panel.coeffIsc ?? 0.04;
    const irm = panel.irm || DEFAULT_IRM;

    const vocMin10 = temperatureAdjustment(voc, coeffVoc, tmin);
    const vmppMin10 = temperatureAdjustment(vmpp, coeffVoc, tmin);
    const vmpp85 = temperatureAdjustment(vmpp, coeffVoc, tmax);
    const isc85 = temperatureAdjustment(isc, coeffIsc, tmax);
    const impp85 = temperatureAdjustment(impp, coeffIsc, tmax);

    report.parameters.panelTemperatureAdjustments = {
      vocBase: round(voc),
      vocMin10: round(vocMin10),
      vmppBase: round(vmpp),
      vmppMin10: round(vmppMin10),
      vmpp85: round(vmpp85),
      iscBase: round(isc),
      isc85: round(isc85),
      impp85: round(impp85),
      tmin,
      tmax,
    };

    // ---- Paramètres onduleur ----
    const udcMax = inverter.vdcMax || 600;
    const umpptMin = inverter.mpptMin || 100;
    const umpptMax = inverter.mpptMax || 500;
    const idcMax = inverter.idcMax || 12.5;
    const iscMaxInverter = inverter.iscMax || round(idcMax * 1.25);
    const nbMppt = inverter.nbMppt || 1;
    const iacMax = inverter.iacMax || 16;
    const vac = inverter.vac || 230;
    const pac = inverter.pac || 3000;

    // ---- Dimensionnement chaînes (Ns / Np) ----
    const nsMax = Math.floor(udcMax / vocMin10);
    const nsOpt = Math.floor(umpptMax / vmppMin10);
    const nsMin = Math.ceil(umpptMin / vmpp85);
    const npMax = Math.floor(iscMaxInverter / isc85);
    const npOpt = Math.floor(idcMax / impp85);

    let stringSelection = 'VALID';
    if (panelCount > nsMax) {
      stringSelection = 'INVALID';
      report.errors.push(
        `Nombre de panneaux (${panelCount}) > Nsmax (${nsMax}) : tension Voc(-10 °C) supérieure à Udcmax onduleur`
      );
    }
    if (panelCount < nsMin) {
      stringSelection = 'INVALID';
      report.warnings.push(
        `Nombre de panneaux (${panelCount}) < Nsmin (${nsMin}) : MPPT onduleur hors plage de fonctionnement`
      );
    }
    if (npMax < 1) {
      report.warnings.push(
        `Npmax (${npMax}) < 1 : Isc(85 °C) de la chaîne supérieure au courant admissible onduleur`
      );
    }

    report.compatibility.stringComputation = {
      nsMax,
      nsOpt,
      nsMin,
      npMax: Math.max(npMax, 0),
      npOpt: Math.max(npOpt, 0),
      panelCount,
      nbMppt,
      currentSelection: stringSelection,
      totalVdcMin: round(vmpp85 * panelCount),
      totalVdcMax: round(vocMin10 * panelCount),
      totalVoc: round(voc * panelCount),
      impp: round(impp),
    };

    // ---- Ratio de puissance (0.9 ≤ Pcpv/Pac ≤ 1.3) ----
    const pPv = pmax * panelCount;
    const powerRatio = pPv / pac;
    const powerValid = powerRatio >= 0.9 && powerRatio <= 1.3;
    report.compatibility.powerRatio = {
      pvPower: round(pPv),
      acPower: round(pac),
      ratio: round(powerRatio),
      valid: powerValid,
      message: powerValid ? 'COMPLIANT' : 'NON-COMPLIANT',
    };
    if (!powerValid) {
      report.errors.push(
        `Ratio de puissance ${round(powerRatio)} hors plage 0.9-1.3 (PV: ${round(pPv)} W vs AC: ${round(pac)} W)`
      );
    }

    // ---- Chaînes parallèles / fusibles (Ncmax, Npmax protection) ----
    const ncmax = 1 + irm / isc;
    const npmaxProtection = Math.floor(0.5 * (1 + irm / isc85));
    report.compatibility.maxStringsParallel = {
      ncmax: round(ncmax),
      npmaxProtection: Math.max(npmaxProtection, 0),
      irm,
      note:
        npmaxProtection > 0 && npMax > npmaxProtection
          ? 'Fusibles de chaîne requis (nombre de chaînes > Npmax protection)'
          : 'Fusibles de chaîne non obligatoires',
    };

    // ---- Protections DC ----
    const fieldVoc = voc * panelCount;
    const fieldVocMin10 = vocMin10 * panelCount;
    const fieldIsc = isc;

    const dcSwitchRequiredU = round(fieldVocMin10);
    const dcSwitchRequiredI = round(1.25 * fieldIsc);
    const selectedSwitchU = dcProt.ucpv || dcProt.usec || null;
    const selectedSwitchI = dcProt.in || dcProt.inDisj || null;
    const dcSwitchChecked = selectedSwitchU !== null && selectedSwitchI !== null;
    let dcSwitchCompliant = true;
    if (dcSwitchChecked) {
      dcSwitchCompliant = selectedSwitchU > dcSwitchRequiredU && selectedSwitchI > dcSwitchRequiredI;
    }
    const dcSwitch = {
      checked: dcSwitchChecked,
      usecRequired: dcSwitchRequiredU,
      isecRequired: dcSwitchRequiredI,
      selectedUsec: selectedSwitchU,
      selectedIsec: selectedSwitchI,
      compliant: dcSwitchCompliant,
      message: dcSwitchChecked
        ? dcSwitchCompliant
          ? '✓ Sectionneur conforme (Usec > Voc(-10 °C), Isec > 1,25 × Isc)'
          : '✗ Sectionneur sous-dimensionné'
        : 'À dimensionner (Usec > Voc(-10 °C) et Isec > 1,25 × Isc)',
    };
    if (dcSwitchChecked && !dcSwitchCompliant) {
      report.errors.push(
        `Interrupteur-sectionneur DC sous-dimensionné : besoin ${dcSwitchRequiredU} V / ${dcSwitchRequiredI} A`
      );
    } else if (!dcSwitchChecked) {
      report.warnings.push('Interrupteur-sectionneur DC non renseigné');
    }

    const spdUcpvRequired = round(1.2 * fieldVoc);
    const spdDcUpLimit = round(0.8 * (dcProt.uw || 1000));
    const spdDcChecked = dcProt.ucpv || dcProt.up || dcProt.in || dcProt.iscpv;
    let spdDcCompliant = true;
    if (spdDcChecked) {
      const okUcpv = dcProt.ucpv ? dcProt.ucpv > spdUcpvRequired : true;
      const okUp = dcProt.up ? dcProt.up < spdDcUpLimit : true;
      const okIn = dcProt.in ? dcProt.in > 5 : true;
      const okIscpv = dcProt.iscpv ? dcProt.iscpv > 1.25 * isc : true;
      spdDcCompliant = okUcpv && okUp && okIn && okIscpv;
    }
    const spdDc = {
      type: 'II',
      checked: !!spdDcChecked,
      ucpvRequired: spdUcpvRequired,
      upLimit: spdDcUpLimit,
      inRequired: 5,
      iscpvRequired: round(1.25 * isc),
      selectedUcpv: dcProt.ucpv || null,
      selectedUp: dcProt.up || null,
      selectedIn: dcProt.in || null,
      selectedIscpv: dcProt.iscpv || null,
      compliant: spdDcCompliant,
      message: spdDcChecked
        ? spdDcCompliant
          ? '✓ Parafoudre DC conforme (Ucpv > 1,2 × Uoc, Up < 0,8 × Uw, In > 5 kA)'
          : '✗ Parafoudre DC non conforme'
        : 'À dimensionner (type II, Ucpv > 1,2 × Uoc, Up < 0,8 × Uw, In > 5 kA)',
    };
    if (spdDcChecked && !spdDcCompliant) {
      report.errors.push('Parafoudre DC non conforme aux exigences STEG/NF C 15-100');
    } else if (!spdDcChecked) {
      report.warnings.push('Parafoudre DC non renseigné');
    }

    report.protections.dcSwitch = dcSwitch;
    report.protections.spdDc = spdDc;

    // ---- Protections AC ----
    const cosPhi = 0.95;
    const vGrid = acPhase === 'tri' ? 400 : 230;
    const imaxAc = pac / (acPhase === 'tri' ? vGrid * Math.sqrt(3) * cosPhi : vGrid * cosPhi);
    const recommendedBreaker = recommendBreaker(imaxAc);

    const acBreaker = {
      ieMin: round(imaxAc),
      ieMax: null,
      recommended: recommendedBreaker,
      sensitivityA: 0.03,
      selectedIn: acProt.in || null,
      checked: !!acProt.in,
      compliant: true,
      message: 'À dimensionner (Imax onduleur ≤ Ie ≤ Iz câble AC, sensibilité 30 mA)',
    };

    const spdAcUcRequired = round(1.1 * vGrid);
    const spdAcUpLimit = round(0.8 * (acProt.uw || 1500));
    const spdAcChecked = acProt.uc || acProt.up || acProt.in;
    let spdAcCompliant = true;
    if (spdAcChecked) {
      const okUc = acProt.uc ? acProt.uc > spdAcUcRequired : true;
      const okUp = acProt.up ? acProt.up < spdAcUpLimit : true;
      const okIn = acProt.in ? acProt.in > 5 : true;
      spdAcCompliant = okUc && okUp && okIn;
    }
    const spdAc = {
      type: 'I ou II',
      checked: !!spdAcChecked,
      ucRequired: spdAcUcRequired,
      upLimit: spdAcUpLimit,
      inRequired: 5,
      selectedUc: acProt.uc || null,
      selectedUp: acProt.up || null,
      selectedIn: acProt.in || null,
      compliant: spdAcCompliant,
      message: spdAcChecked
        ? spdAcCompliant
          ? '✓ Parafoudre AC conforme (Uc > 1,1 × Ue, Up < 0,8 × Uw, In > 5 kA)'
          : '✗ Parafoudre AC non conforme'
        : 'À dimensionner (type I ou II, Uc > 1,1 × Ue, Up < 0,8 × Uw, In > 5 kA)',
    };
    if (spdAcChecked && !spdAcCompliant) {
      report.errors.push('Parafoudre AC non conforme aux exigences STEG/NF C 15-100');
    } else if (!spdAcChecked) {
      report.warnings.push('Parafoudre AC non renseigné');
    }

    report.protections.acBreaker = acBreaker;
    report.protections.spdAc = spdAc;

    // ---- Câbles DC (NF C 15-100) ----
    const dcLength = pvSystemParams?.dcCableLength || 20;
    const dcSection = dcCable.section || 4;
    const dcMaterial = dcCable.material || 'CU';
    const dcInsulation = dcCable.insulation || 'PVC';
    const dcIz = dcCable.iz || izBase(dcSection, dcMaterial, dcInsulation) || 32;
    const dcMode = dcCable.mode || pvSystemParams?.dcCableMode;
    const dcGrouping = dcCable.grouping || pvSystemParams?.dcCableGrouping || 1;
    const dcTemp = dcCable.temp ?? pvSystemParams?.dcCableTemp ?? 50;
    const dcLayers = dcCable.layers || pvSystemParams?.dcCableLayers || 1;
    const ibDc = round(1.25 * isc);
    const dcSizing = sizeCable({
      length: dcLength,
      section: dcSection,
      iz: dcIz,
      material: dcMaterial,
      insulation: dcInsulation,
      mode: dcMode,
      grouping: dcGrouping,
      temp: dcTemp,
      layers: dcLayers,
      ib: ibDc,
    });

    const rhoDc = isAluminium(dcMaterial) ? ALUMINIUM_RESISTIVITY : COPPER_RESISTIVITY;
    const vmppTotal = vmppMin10 * panelCount;
    const deltaUDcPercent = (2 * rhoDc * dcLength * impp) / (dcSection * vmppTotal) * 100;
    const dcCompliant = deltaUDcPercent <= 3 && dcSizing.sizingOk;

    report.cableAnalysis.dc = {
      length: round(dcLength),
      section: round(dcSection),
      material: dcMaterial,
      insulation: dcInsulation,
      mode: dcMode || 'PLEIN_AIR',
      temp: dcTemp,
      iz: round(dcIz),
      ib: ibDc,
      ...dcSizing,
      impp: round(impp),
      vmppTotal: round(vmppTotal),
      dropPercent: round(deltaUDcPercent),
      dropVolt: round((deltaUDcPercent / 100) * vmppTotal),
      compliant: dcCompliant,
      message: dcCompliant ? '✓ PASS (≤ 3 % et Iz\' ≥ Ib)' : '✗ FAIL (chute > 3 % ou section insuffisante)',
    };
    if (deltaUDcPercent > 3) {
      report.errors.push(`Chute de tension DC ${round(deltaUDcPercent)} % > 3 %`);
    }
    if (!dcSizing.sizingOk) {
      report.errors.push(`Section câble DC insuffisante : Iz' (${dcSizing.izPrime} A) < Ib (${ibDc} A)`);
    }

    // ---- Câbles AC ----
    const acLength = pvSystemParams?.acCableLength || 10;
    const acSection = acCable.section || 6;
    const acMaterial = acCable.material || 'CU';
    const acInsulation = acCable.insulation || 'PVC';
    const acIz = acCable.iz || izBase(acSection, acMaterial, acInsulation) || 41;
    const acMode = acCable.mode || pvSystemParams?.acCableMode;
    const acGrouping = acCable.grouping || pvSystemParams?.acCableGrouping || 1;
    const acTemp = acCable.temp ?? pvSystemParams?.acCableTemp ?? 40;
    const acLayers = acCable.layers || pvSystemParams?.acCableLayers || 1;
    const ibAc = round(imaxAc);
    const acSizing = sizeCable({
      length: acLength,
      section: acSection,
      iz: acIz,
      material: acMaterial,
      insulation: acInsulation,
      mode: acMode,
      grouping: acGrouping,
      temp: acTemp,
      layers: acLayers,
      ib: ibAc,
    });

    const b = acPhase === 'tri' ? 1 : 2;
    const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
    const lambda = 0.08; // réactance linéique Ω/m
    const rhoAc = isAluminium(acMaterial) ? ALUMINIUM_RESISTIVITY : COPPER_RESISTIVITY;
    const deltaUAcPercent =
      (b * (rhoAc * (acLength / acSection) * cosPhi + lambda * acLength * sinPhi) * imaxAc / vGrid) * 100;
    const acCompliant = deltaUAcPercent <= 3 && acSizing.sizingOk;

    report.cableAnalysis.ac = {
      length: round(acLength),
      section: round(acSection),
      material: acMaterial,
      insulation: acInsulation,
      mode: acMode || 'PLEIN_AIR',
      temp: acTemp,
      iz: round(acIz),
      ib: ibAc,
      ...acSizing,
      vGrid,
      phase: acPhase,
      iacMax: round(imaxAc),
      dropPercent: round(deltaUAcPercent),
      dropVolt: round((deltaUAcPercent / 100) * vGrid),
      compliant: acCompliant,
      message: acCompliant ? '✓ PASS (≤ 3 % et Iz\' ≥ Ib)' : '✗ FAIL (chute > 3 % ou section insuffisante)',
    };
    if (deltaUAcPercent > 3) {
      report.errors.push(`Chute de tension AC ${round(deltaUAcPercent)} % > 3 %`);
    }
    if (!acSizing.sizingOk) {
      report.errors.push(`Section câble AC insuffisante : Iz' (${acSizing.izPrime} A) < Ib (${ibAc} A)`);
    }

    // Disjoncteur AC : Ie compris entre Imax onduleur et Iz' du câble
    acBreaker.ieMax = round(acSizing.izPrime);
    acBreaker.compliant =
      recommendedBreaker >= imaxAc && recommendedBreaker <= acSizing.izPrime;
    acBreaker.message = acBreaker.checked
      ? acBreaker.compliant
        ? `✓ Disjoncteur conforme (${recommendedBreaker} A ≤ Iz' ${round(acSizing.izPrime)} A)`
        : '✗ Disjoncteur non adapté'
      : `À dimensionner (Imax onduleur ${round(imaxAc)} A ≤ Ie ≤ Iz' ${round(acSizing.izPrime)} A)`;
    if (acBreaker.checked && !acBreaker.compliant) {
      report.errors.push('Disjoncteur différentiel AC non adapté');
    }

    // ---- Structure / tenue au vent ----
    const panelAreaTotal = (pvSystemParams?.panelAreaM2 ?? 2.0) * panelCount;
    const moduleWeightKg = (pvSystemParams?.panelWeightKg ?? 25) * panelCount;
    const structureWeightKg = pvSystemParams?.structureWeightKg ?? panelCount * 5;
    const ballastKg = pvSystemParams?.ballastWeightKg ?? 0;
    const windSpeed = pvSystemParams?.windSpeedKmh || 120;
    const q = 0.5 * AIR_DENSITY * Math.pow(windSpeed / 3.6, 2);
    const S = panelAreaTotal;
    const H = pvSystemParams?.supportHeightM ?? 0.5;
    const D = pvSystemParams?.ballastLeverM ?? 0.6;
    const Fpoids = (moduleWeightKg + structureWeightKg + ballastKg) * 9.81;
    const leftSide = (Fpoids - 339 * S) * D;
    const rightSide = 2 * 196 * S * H;
    const windCompliant = leftSide >= rightSide;
    const requiredBallastKg = Math.max(
      0,
      (339 * S + (2 * 196 * S * H) / D) / 9.81 - (moduleWeightKg + structureWeightKg)
    );
    const Ftrain = 0.5 * AIR_DENSITY * Math.pow(windSpeed / 3.6, 2) * S * 1.1;
    const Flift = 0.5 * AIR_DENSITY * Math.pow(windSpeed / 3.6, 2) * S * 0.4;

    report.windAnalysis = {
      windSpeedKmh: windSpeed,
      windPressure: round(q),
      panelArea: round(S),
      windForce: round(q * S),
      panelWeight: round(moduleWeightKg + structureWeightKg),
      panelWeightN: round(Fpoids),
      ballastWeightKg: round(ballastKg),
      requiredBallastKg: round(requiredBallastKg),
      stabilityRatio: round(leftSide / Math.max(rightSide, 0.0001)),
      formulaLeft: round(leftSide),
      formulaRight: round(rightSide),
      supportHeight: H,
      leverArm: D,
      trainForce: round(Ftrain),
      liftForce: round(Flift),
      compliant: windCompliant,
      message: windCompliant
        ? '✓ PASS (Structure stable)'
        : '⚠ REVIEW (Ballast supplémentaire requis)',
    };
    if (!windCompliant) {
      report.warnings.push(
        `Tenue au vent : ballast supplémentaire requis (~${round(requiredBallastKg)} kg)`
      );
    }

    // ---- Synthèse ----
    const stringCompliant = stringSelection === 'VALID';
    const dcProtectionCompliant = dcSwitch.compliant && spdDc.compliant;
    const acProtectionCompliant = acBreaker.compliant && spdAc.compliant;

    report.summary = {
      fullCompliant:
        dcCompliant &&
        acCompliant &&
        stringCompliant &&
        powerValid &&
        dcProtectionCompliant &&
        acProtectionCompliant &&
        windCompliant &&
        report.errors.length === 0,
      dcCompliant,
      acCompliant,
      stringCompliant,
      powerCompliant: powerValid,
      dcProtectionCompliant,
      acProtectionCompliant,
      windCompliant,
      errorCount: report.errors.length,
      warningCount: report.warnings.length,
      overallStatus: report.errors.length === 0 ? 'APPROVED' : 'REQUIRES REVIEW',
    };

    return report;
  } catch (error) {
    report.errors.push(`Erreur moteur de calcul : ${error.message}`);
    report.summary.fullCompliant = false;
    report.summary.overallStatus = 'ERROR';
    return report;
  }
}
