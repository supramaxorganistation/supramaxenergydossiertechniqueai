/**
 * STEG Technical Dossier Calculation Engine
 * Implements NF C 15-100 and STEG compliance formulas
 */

/**
 * Temperature coefficient adjustment for PV panels
 * @param {number} value - Base value at 25°C (Voc, Impp, etc.)
 * @param {number} coefficient - Temperature coefficient (V/°C or A/°C)
 * @param {number} temperature - Target temperature in °C
 * @returns {number} Adjusted value at target temperature
 */
export function temperatureAdjustment(value, coefficient, temperature) {
  const tempDelta = temperature - 25; // Reference temperature
  return value * (1 + (coefficient / 100) * tempDelta);
}

/**
 * Compute all STEG compliance parameters for a dossier
 * @param {Object} dossierData - Complete dossier with equipment and system specs
 * @returns {Object} Full compliance report with all calculated values
 */
export function computeStegCompliance(dossierData) {
  const report = {
    timestamp: new Date(),
    errors: [],
    warnings: [],
    parameters: {},
    compatibility: {},
    cableAnalysis: {},
    windAnalysis: {},
    summary: {},
  };

  try {
    const { pvSystemParams, equipment = {} } = dossierData;

    // Extract panel specs (assume monolithic panel string for now)
    const panelSpecs = equipment.panel || {};
    const inverterSpecs = equipment.inverter || {};
    const dcProtection = equipment.dcProtection || {};
    const acProtection = equipment.acProtection || {};
    const dcCable = equipment.dcCable || {};
    const acCable = equipment.acCable || {};

    // Panel Parameters
    const panelCount = pvSystemParams?.panelCount || 1;
    const panelPower = panelSpecs.pmax || 400; // W
    const vmppBase = panelSpecs.vmpp || 40.8; // V at 25°C
    const imppBase = panelSpecs.impp || 9.8; // A at 25°C
    const vocBase = panelSpecs.voc || 49.2; // V at 25°C
    const iscBase = panelSpecs.isc || 10.5; // A at 25°C
    const coeffVoc = panelSpecs.coeffVoc || -0.25; // V/°C
    const coeffIsc = panelSpecs.coeffIsc || 0.04; // A/°C

    // Temperature adjustments (Tmin = -10°C, Tmax = 85°C)
    const vocMin10 = temperatureAdjustment(vocBase, coeffVoc, -10);
    const vmppMin10 = temperatureAdjustment(vmppBase, coeffVoc, -10);
    const vmpp85 = temperatureAdjustment(vmppBase, coeffVoc, 85);
    const isc85 = temperatureAdjustment(iscBase, coeffIsc, 85);

    report.parameters.panelTemperatureAdjustments = {
      vocBase,
      vocMin10: parseFloat(vocMin10.toFixed(2)),
      vmppBase,
      vmppMin10: parseFloat(vmppMin10.toFixed(2)),
      vmpp85: parseFloat(vmpp85.toFixed(2)),
      isc85: parseFloat(isc85.toFixed(2)),
    };

    // Inverter constraints
    const udcMax = inverterSpecs.vdcMax || 600; // V
    const umpptMin = inverterSpecs.mpptMin || 100; // V
    const umpptMax = inverterSpecs.mpptMax || 500; // V
    const iacMax = inverterSpecs.iacMax || 16; // A
    const pac = inverterSpecs.pac || 3000; // W

    // String compatibility calculations
    const nsMax = Math.floor(udcMax / vocMin10);
    const nsOpt = Math.floor(umpptMax / vmppMin10);
    const nsMin = Math.ceil(umpptMin / vmpp85);

    if (panelCount > nsMax) {
      report.errors.push(
        `Panel count (${panelCount}) exceeds maximum string size (${nsMax}) for voltage protection`
      );
    }
    if (panelCount < nsMin) {
      report.warnings.push(
        `Panel count (${panelCount}) below minimum string size (${nsMin}) for MPPT operation`
      );
    }

    report.compatibility.stringComputation = {
      nsMax,
      nsOpt,
      nsMin,
      panelCount,
      currentSelection: panelCount >= nsMin && panelCount <= nsMax ? 'VALID' : 'INVALID',
      totalVdcMin: parseFloat((vmpp85 * panelCount).toFixed(2)),
      totalVdcMax: parseFloat((vocMin10 * panelCount).toFixed(2)),
      totalVoc: parseFloat((vocBase * panelCount).toFixed(2)),
    };

    // Power ratio validation (0.9 <= ratio <= 1.3)
    const pPv = panelPower * panelCount; // Total PV power in W
    const powerRatio = pPv / pac;
    report.compatibility.powerRatio = {
      pvPower: pPv,
      acPower: pac,
      ratio: parseFloat(powerRatio.toFixed(2)),
      valid: powerRatio >= 0.9 && powerRatio <= 1.3,
      message: powerRatio >= 0.9 && powerRatio <= 1.3 ? 'COMPLIANT' : 'NON-COMPLIANT',
    };

    if (!report.compatibility.powerRatio.valid) {
      report.errors.push(
        `Power ratio ${powerRatio.toFixed(2)} outside 0.9-1.3 range (PV: ${pPv}W vs AC: ${pac}W)`
      );
    }

    // DC Cable sizing and voltage drop (NF C 15-100)
    const dcCableLength = pvSystemParams?.dcCableLength || 20; // meters
    const dcCableSection = dcCable.section || 4; // mm²
    const dcCableIz = dcCable.iz || 32; // A
    const vmppTotal = vmppMin10 * panelCount;
    const impp = imppBase; // Current per string

    // Copper resistivity at 70°C: ~0.0198 Ohm·mm²/m
    const rhoCopper = 0.0198;
    
    // Voltage drop: ΔU% = (200 * ρ * L * I) / (S * U)
    const deltaUDcPercent =
      (200 * rhoCopper * dcCableLength * impp) / (dcCableSection * vmppTotal);

    report.cableAnalysis.dc = {
      length: dcCableLength,
      section: dcCableSection,
      iz: dcCableIz,
      impp,
      vmppTotal: parseFloat(vmppTotal.toFixed(2)),
      dropPercent: parseFloat(deltaUDcPercent.toFixed(2)),
      dropVolt: parseFloat(((deltaUDcPercent / 100) * vmppTotal).toFixed(2)),
      compliant: deltaUDcPercent <= 3,
      message: deltaUDcPercent <= 3 ? '✓ PASS (<3%)' : '✗ FAIL (>3%)',
    };

    if (deltaUDcPercent > 3) {
      report.errors.push(
        `DC voltage drop ${deltaUDcPercent.toFixed(2)}% exceeds 3% limit`
      );
    }

    // AC Cable sizing
    const acCableLength = pvSystemParams?.acCableLength || 10; // meters
    const acCableSection = acCable.section || 6; // mm²
    const vGrid = 230; // V (single phase) or 400V (3-phase)
    const cosPhi = 0.95; // Power factor
    const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);

    // AC voltage drop coefficient: b depends on installation type
    const b = 2; // For single or parallel cables
    const lambda = 0.08; // Inductive reactance Ω/m for cables

    // ΔU% = b * (ρ * (L/S) * cosPhi + λ * L * sinPhi) * Imax / Vgrid * 100
    const deltaUAcPercent =
      (b * (rhoCopper * (acCableLength / acCableSection) * cosPhi +
        lambda * acCableLength * sinPhi) * iacMax / vGrid) * 100;

    report.cableAnalysis.ac = {
      length: acCableLength,
      section: acCableSection,
      vGrid,
      iacMax,
      dropPercent: parseFloat(deltaUAcPercent.toFixed(2)),
      dropVolt: parseFloat(((deltaUAcPercent / 100) * vGrid).toFixed(2)),
      compliant: deltaUAcPercent <= 3,
      message: deltaUAcPercent <= 3 ? '✓ PASS (<3%)' : '✗ FAIL (>3%)',
    };

    if (deltaUAcPercent > 3) {
      report.errors.push(
        `AC voltage drop ${deltaUAcPercent.toFixed(2)}% exceeds 3% limit`
      );
    }

    // Wind resistance (120 km/h = 33.3 m/s, pressure = 625 Pa)
    // Moment equilibrium: (Weight - Buoyancy) * Lever >= Uplift * Lever
    const panelArea = panelCount * 2.0; // Assume 2 m² per panel
    const windPressure = 625; // Pa at 120 km/h
    const windForce = windPressure * panelArea; // N
    const panelWeight = panelCount * 25; // kg (typical: 25 kg per 400W panel)
    const panelWeightN = panelWeight * 9.81; // Convert to Newtons
    const ballastHeight = 0.5; // meter height of system
    const ballastLever = 0.3; // meter lever arm for ballast

    // Simplified check: Weight moment >= Wind moment
    const windCompliant = panelWeightN >= (2 * windForce);

    report.windAnalysis = {
      windPressure: 625,
      windForce: parseFloat(windForce.toFixed(2)),
      panelArea,
      panelWeight,
      panelWeightN: parseFloat(panelWeightN.toFixed(2)),
      compliant: windCompliant,
      message: windCompliant ? '✓ PASS (Weight stable)' : '⚠ REVIEW (May need ballast)',
    };

    if (!windCompliant) {
      report.warnings.push('Wind resistance check: Consider additional ballast at 120 km/h');
    }

    // Final compliance summary
    const dcCompliant = report.cableAnalysis.dc.compliant;
    const acCompliant = report.cableAnalysis.ac.compliant;
    const stringCompliant = report.compatibility.stringComputation.currentSelection === 'VALID';
    const powerCompliant = report.compatibility.powerRatio.valid;

    report.summary = {
      fullCompliant: dcCompliant && acCompliant && stringCompliant && powerCompliant && report.errors.length === 0,
      dcCompliant,
      acCompliant,
      stringCompliant,
      powerCompliant,
      errorCount: report.errors.length,
      warningCount: report.warnings.length,
      overallStatus: report.errors.length === 0 ? 'APPROVED' : 'REQUIRES REVIEW',
    };

    return report;
  } catch (error) {
    report.errors.push(`Calculation engine error: ${error.message}`);
    report.summary.fullCompliant = false;
    report.summary.overallStatus = 'ERROR';
    return report;
  }
}
