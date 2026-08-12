/**
 * STEG DOCX Field Map
 *
 * Single authoritative registry that maps every {{placeholder}} in the
 * Word template to a value extracted from the dossier and/or the
 * compliance report produced by computeStegCompliance().
 *
 * If a new {{tag}} is added to the template and no mapping exists here,
 * the validator will report it as "unknown".
 */

// ── helpers ──────────────────────────────────────────────────────────
function fmt(value, digits = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    let s = n.toFixed(digits);
    if (digits > 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('.', ',');
}

function fr0(v) {
    const n = Number(v);
    return Number.isFinite(n) ? String(n.toFixed(0)) : '';
}

function safe(v) {
    if (v == null || v === '' || v === 'undefined' || v === 'null' || v === 'NaN') return '';
    return String(v);
}

// ── builder ──────────────────────────────────────────────────────────

/**
 * Build the complete placeholder → value map.
 *
 * @param {Object} dossierData   – full dossier document (Mongoose)
 * @param {Object} report        – output of computeStegCompliance(dossierData)
 * @returns {Record<string, string>}
 */
export function buildFieldMap(dossierData, report) {
    const dd = dossierData || {};
    const cd = dd.customerDetails || {};
    const ps = dd.pvSystemParams || {};
    const eq = dd.equipment || {};

    // Equipment specs
    const panel = eq.panel?.specs || {};
    const inv = eq.inverter?.specs || {};
    const dcProt = eq.dcProtection?.specs || {};
    const acProt = eq.acProtection?.specs || {};
    const dcCable = eq.dcCable?.specs || {};
    const acCable = eq.acCable?.specs || {};

    // Shorthand from report
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

    // Derived values (same logic as stegTemplateFiller.js)
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

    const dcSection = dcCable.section || cdc.section || 6;
    const acSection = acCable.section || cac.section || 4;
    const dcCableRef = dcSection ? 'EN 50618 H1Z2Z2-K ' + fr0(dcSection) + ' mm²' : '';
    const acCableRef = 'H05VV-F';

    const installer = (typeof dd.createdBy === 'object' && dd.createdBy?.name)
        ? dd.createdBy.name
        : (ps.installer || 'Eminence Energie');
    const clientName = cd.name || '';
    const reference = cd.stegMeterRef || ps.stegMeterRef || '';
    const address = cd.address || ps.address || '';

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
    const npOpt = Math.max(sc.npOpt ?? 1, 0);
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

    // DC cable calculations
    const dcIz = cdc.iz ?? dcCable.iz ?? 41;
    const dcIzPrime = cdc.izPrime ?? 32.8;
    const dcIb = cdc.ib ?? impp;
    const dcL = ps.dcCableLength || 20;
    const dcRho = 0.0198;
    const dcUmp = panelCount * vmpp;
    const dcDropV = fmt((2 * dcRho * dcL * impp) / dcSection, 2);
    const dcDropP = fmt(((2 * dcRho * dcL * impp) / (dcSection * dcUmp)) * 100, 3);

    // AC cable calculations
    const acIz = cac.iz ?? acCable.iz ?? 42;
    const acIzPrime = cac.izPrime ?? 18.9;
    const acI = iacMax;
    const b = (ps.acPhase || 'mono') === 'tri' ? 1 : 2;
    const cosPhi = 0.8;
    const sinPhi = 0.6;
    const lambda = 0.00008;
    const acL1 = ps.acCableLengthOnduleurCoffret ?? 0.5;
    const acL2 = ps.acCableLengthCoffretTgbt ?? ps.acCableLength ?? 4.5;
    const acDrop1V = fmt(b * (dcRho * (acL1 / acSection) * cosPhi + lambda * acL1 * sinPhi) * acI, 3);
    const acDrop1P = fmt((Number(acDrop1V.replace(',', '.')) / vac) * 100, 3);
    const acDrop2V = fmt(b * (dcRho * (acL2 / acSection) * cosPhi + lambda * acL2 * sinPhi) * acI, 3);
    const acDrop2P = fmt((Number(acDrop2V.replace(',', '.')) / vac) * 100, 3);
    const acDropTotal = fmt(Number(acDrop1P.replace(',', '.')) + Number(acDrop2P.replace(',', '.')), 2);

    // Temperature adjustments
    const vocMin10 = pt.vocMin10 ?? fmt(voc * (1 + coeffVoc / 100 * ((pt.tmin ?? -10) - 25)), 2);
    const vmppMin10 = pt.vmppMin10 ?? fmt(vmpp * (1 + coeffVoc / 100 * ((pt.tmin ?? -10) - 25)), 2);
    const vmpp85 = pt.vmpp85 ?? fmt(vmpp * (1 + coeffVoc / 100 * ((pt.tmax ?? 85) - 25)), 2);
    const isc85 = pt.isc85 ?? fmt(isc * (1 + coeffIsc / 100 * ((pt.tmax ?? 85) - 25)), 2);
    const impp85 = pt.impp85 ?? fmt(impp * (1 + coeffIsc / 100 * ((pt.tmax ?? 85) - 25)), 2);

    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });

    // ── THE REGISTRY ───────────────────────────────────────────────────
    // Keys MUST match the exact {{placeholder}} names in the Word template.
    const fields = {

        // ── Cover page ───────────────────────────────────────────────────
        clientBT: safe(cd.cin),
        reference: safe(reference),
        location: safe(address),
        power: fmt(peakKwc, 2) + ' kWc',
        installer: safe(installer),
        date: dateStr,
        version: '1',

        // ── Introduction ─────────────────────────────────────────────────
        introduction: safe(clientName),

        // ── Equipment table ──────────────────────────────────────────────
        module_qty: String(panelCount),
        module_brand: safe(panelBrand),
        module_ref: safe(panelModel),

        inverter_qty: '1',
        inverter_brand: safe(invBrand),
        inverter_ref: safe(invModel),

        fuse_qty: '',
        fuse_brand: '',
        fuse_ref: '',

        spdDC_qty: '1',
        spdDC_brand: safe(dcProtBrand),
        spdDC_ref: safe(dcProtModel),

        isolatorDC_qty: '1',
        isolatorDC_brand: safe(dcProtBrand),
        isolatorDC_ref: safe(eq.dcProtection?.model2 || 'XL7-63 2P'),

        spdAC_qty: '1',
        spdAC_brand: safe(acProtBrand),
        spdAC_ref: safe(acProtModel),

        isolatorAC_qty: '1',
        isolatorAC_brand: safe(acProtBrand),
        isolatorAC_ref: safe(acProtModel),

        rcdAC_qty: '1',
        rcdAC_brand: safe(acProtBrand),
        rcdAC_ref: safe(acProtModel),

        mainBreaker_qty: '1',
        mainBreaker_brand: safe(acProtBrand),
        mainBreaker_ref: safe(acProtModel),

        cableDC_qty: '***',
        cableDC_brand: safe(dcCableBrand),
        cableDC_ref: safe(dcCableRef),

        cableAC_qty: '***',
        cableAC_brand: safe(acCableBrand),
        cableAC_ref: safe(acCableRef),

        earthCable_qty: '',
        earthCable_brand: '',
        earthCable_ref: '',

        mc4_qty: '',
        mc4_brand: '',
        mc4_ref: '',

        splitter_qty: '',
        splitter_brand: '',
        splitter_ref: '',

        cableTray_qty: '',
        cableTray_brand: '',
        cableTray_ref: '',

        // ── Panel specifications ─────────────────────────────────────────
        panel_brand: safe(panelBrand),
        panel_ref: safe(panelModel),
        panel_power: fr0(pmax) + ' W',
        panel_vmpp: fmt(vmpp) + ' V',
        panel_impp: fmt(impp) + ' A',
        panel_voc: fmt(voc) + ' V',
        panel_isc: fmt(isc) + ' A',
        panel_beta: fmt(coeffVoc, 2) + '%/°C',
        panel_alpha: fmt(coeffIsc, 2) + '%/°C',
        panel_irm: fr0(irm) + ' A',

        // ── String summary row ───────────────────────────────────────────
        inverter1_no: '1',
        inverter1_panels: String(panelCount),
        inverter1_dc_power: fr0(pmax * panelCount) + ' Wc',
        inverter1_ratio: fmt(ratio, 2),

        // ── Inverter specifications ──────────────────────────────────────
        inverter_label: safe(invBrand) + ' ' + safe(invModel),
        inverter_ac_w: fr0(pac) + ' W',
        inverter_vdcmax: fr0(udcMax) + ' V',
        inverter_idcmax: fmt(idcMax) + ' A / ' + fr0(nbMppt),
        inverter_iscmax: fmt(iscMaxInv) + ' A / ' + fr0(nbMppt),
        inverter_mppt_count: fr0(nbMppt),
        inverter_inputs_mppt: fr0(nbMppt) + ' / ' + fr0(nbMppt),
        inverter_mppt_range: fr0(umpptMin) + ' - ' + fr0(umpptMax) + ' V',
        inverter_input_range: fr0(umpptMin) + ' - ' + fr0(udcMax) + ' V',
        inverter_ac_kva: fmt(inv.pacKva || pac / 1000) + ' kVA',
        inverter_output_voltage: '230 V',
        inverter_iacmax: fmt(iacMax) + ' A',

        // ── DC / AC protection specs ─────────────────────────────────────
        fuse_voltage: '',
        fuse_current: '',

        spdDC_type: 'II',
        spdDC_ucpv: fmt(spdDcU) + ' V',
        spdDC_up: fmt(spdDcUp) + ' V',
        spdDC_in: fmt(spdDcIn) + ' kA',
        spdDC_iscpv: fmt(spdDcIsc) + ' A',

        isolatorDC_usec: fmt(usec) + ' V',
        isolatorDC_isec: fmt(isec) + ' A',

        rcdAC_udis: fmt(acProt.udis || vac) + ' V',
        rcdAC_in: fr0(inDisj) + ' A',
        rcdAC_breaking: fmt(acProt.icn || 6) + ' kA',
        rcdAC_sensitivity: fr0(sensi) + ' mA',

        spdAC_type: 'I ou II',
        spdAC_ucpv: fmt(spdAcU) + ' V',
        spdAC_up: fmt(spdAcUp) + ' V',
        spdAC_in: fmt(spdAcIn) + ' kA',

        cableDC_section: fr0(dcSection) + ' mm²',
        cableDC_iz: fr0(dcIz) + ' A',
        cableAC_section: fr0(acSection) + ' mm²',
        cableAC_iz: fr0(acIz) + ' A',

        // ── Inverter compatibility calculations ──────────────────────────
        voc_minus10: safe(vocMin10),
        nsmax: fr0(nsMax),

        vmp_minus10: safe(vmppMin10),
        nsoptimal: fr0(nsOpt),

        vmp_85: safe(vmpp85),
        nsmin: fr0(nsMin),

        isc_85: safe(isc85),
        npmax: fr0(npMax),

        imp_85: safe(impp85),
        npoptimal: fr0(npOpt),

        dc_power: fr0(pr.pvPower || pmax * panelCount),
        ac_power: fr0(pr.acPower || pac),
        power_ratio: fmt(ratio, 2),

        // ── Parallel strings / fuse check ────────────────────────────────
        ncmax: fmt(ms.ncmax),
        fuse_npmax: fr0(ms.npmaxProtection),
        fuse_desc: safe(ms.note || ''),

        // ── Protection descriptions ──────────────────────────────────────
        isolatorDC_desc: safe(ds.message || ''),
        spdDC_desc: safe(spdDc.message || ''),
        rcdAC_desc: safe(ab.message || ''),
        spdAC_desc: safe(spdAc.message || ''),
        isolatorAC_desc: '',

        // ── DC cable admissible / corrected ──────────────────────────────
        cableDC_admissible: safe(cdc.ib) + ' A',
        cableDC_izcorr: fmt(dcIzPrime, 2) + ' A',

        // ── DC cable routes: DC1 R1 (primary run) ───────────────────────
        dc1_r1_rho: fmt(dcRho, 5),
        dc1_r1_length: fr0(dcL),
        dc1_r1_current: fmt(impp, 2),
        dc1_r1_section: fr0(dcSection),
        dc1_r1_voltage: fr0(dcUmp) + ' V',
        dc1_r1_du: dcDropV + ' V',
        dc1_r1_du_pct: dcDropP + ' %',

        // DC1 R2 (unused by default)
        dc1_r2_rho: '', dc1_r2_length: '', dc1_r2_current: '',
        dc1_r2_section: '', dc1_r2_voltage: '', dc1_r2_du: '', dc1_r2_du_pct: '',

        // DC1 R3 label + route (unused by default)
        dc1_label3: '',
        dc1_r3_rho: '', dc1_r3_length: '', dc1_r3_current: '',
        dc1_r3_section: '', dc1_r3_voltage: '', dc1_r3_du: '', dc1_r3_du_pct: '',

        // DC2 R1/R2/R3 (unused – second string)
        dc2_r1_rho: '', dc2_r1_length: '', dc2_r1_current: '',
        dc2_r1_section: '', dc2_r1_voltage: '', dc2_r1_du: '', dc2_r1_du_pct: '',
        dc2_r2_rho: '', dc2_r2_length: '', dc2_r2_current: '',
        dc2_r2_section: '', dc2_r2_voltage: '', dc2_r2_du: '', dc2_r2_du_pct: '',
        dc2_label3: '',
        dc2_r3_rho: '', dc2_r3_length: '', dc2_r3_current: '',
        dc2_r3_section: '', dc2_r3_voltage: '', dc2_r3_du: '', dc2_r3_du_pct: '',

        // ── AC cable admissible / corrected ──────────────────────────────
        cableAC_admissible: safe(cac.ib) + ' A',
        cableAC_izcorr: fmt(acIzPrime, 2) + ' A',

        // ── AC cable routes ──────────────────────────────────────────────
        // Segment 1: onduleur → coffret
        ac_r1_label: 'Onduleur → Coffret',
        ac_r1_b: fr0(b),
        ac_r1_rho: fmt(dcRho, 5),
        ac_r1_L: fmt(acL1, 1),
        ac_r1_I: fmt(acI, 1),
        ac_r1_S: fr0(acSection),
        ac_r1_lambda: fmt(lambda, 5),
        ac_r1_cosphi: fmt(cosPhi, 1),
        ac_r1_sinphi: fmt(sinPhi, 1),
        ac_r1_V: fr0(vac),
        ac_r1_du: acDrop1V + ' V',
        ac_r1_du_pct: acDrop1P + ' %',

        // Segment 2: coffret → TGBT
        ac_r2_label: 'Coffret → TGBT',
        ac_r2_b: fr0(b),
        ac_r2_rho: fmt(dcRho, 5),
        ac_r2_L: fmt(acL2, 1),
        ac_r2_I: fmt(acI, 1),
        ac_r2_S: fr0(acSection),
        ac_r2_lambda: fmt(lambda, 5),
        ac_r2_cosphi: fmt(cosPhi, 1),
        ac_r2_sinphi: fmt(sinPhi, 1),
        ac_r2_V: fr0(vac),
        ac_r2_du: acDrop2V + ' V',
        ac_r2_du_pct: acDrop2P + ' %',
    };

    return fields;
}
