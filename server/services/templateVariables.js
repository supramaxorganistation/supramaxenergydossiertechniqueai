/**
 * Template Variables Registry
 *
 * Catalogue of every {{placeholder}} available in
 * assets/templates/template-safe-placeholders.docx, with French labels,
 * grouping for the UI, and the list of keys that can be auto-generated
 * by AI (Gemini) in French.
 */

import { AI_TEXT_KEYS } from './aiTextGenerator.js';

export { AI_TEXT_KEYS };

// ── French labels (explicit) ─────────────────────────────────────────
const LABELS = {
    // Page de garde
    clientBT: 'Client BT (CIN / matricule)',
    reference: 'Référence compteur STEG',
    location: 'Localisation (adresse + GPS)',
    power: 'Puissance de l’installation',
    sigle_installateur: 'Libellé « Sigle installateur » (en-tête de page)',
    date: 'Date du dossier',
    version: 'Version du document',
    // Introduction
    introduction: 'Introduction générale de l\u2019étude',
    // Tableau équipements
    module_qty: 'Modules PV — Quantité',
    module_brand: 'Modules PV — Marque',
    module_ref: 'Modules PV — Référence',
    inverter_qty: 'Onduleur — Quantité',
    inverter_brand: 'Onduleur — Marque',
    inverter_ref: 'Onduleur — Référence',
    fuse_qty: 'Fusibles DC — Quantité',
    fuse_brand: 'Fusibles DC — Marque',
    fuse_ref: 'Fusibles DC — Référence',
    spdDC_qty: 'Parafoudre DC — Quantité',
    spdDC_brand: 'Parafoudre DC — Marque',
    spdDC_ref: 'Parafoudre DC — Référence',
    isolatorDC_qty: 'Sectionneur DC — Quantité',
    isolatorDC_brand: 'Sectionneur DC — Marque',
    isolatorDC_ref: 'Sectionneur DC — Référence',
    spdAC_qty: 'Parafoudre AC — Quantité',
    spdAC_brand: 'Parafoudre AC — Marque',
    spdAC_ref: 'Parafoudre AC — Référence',
    isolatorAC_qty: 'Sectionneur AC — Quantité',
    isolatorAC_brand: 'Sectionneur AC — Marque',
    isolatorAC_ref: 'Sectionneur AC — Référence',
    rcdAC_qty: 'Disjoncteur différentiel AC — Quantité',
    rcdAC_brand: 'Disjoncteur différentiel AC — Marque',
    rcdAC_ref: 'Disjoncteur différentiel AC — Référence',
    mainBreaker_qty: 'Disjoncteur principal — Quantité',
    mainBreaker_brand: 'Disjoncteur principal — Marque',
    mainBreaker_ref: 'Disjoncteur principal — Référence',
    cableDC_qty: 'Câble DC — Quantité',
    cableDC_brand: 'Câble DC — Marque',
    cableDC_ref: 'Câble DC — Référence',
    cableAC_qty: 'Câble AC — Quantité',
    cableAC_brand: 'Câble AC — Marque',
    cableAC_ref: 'Câble AC — Référence',
    earthCable_qty: 'Câble de terre — Quantité',
    earthCable_brand: 'Câble de terre — Marque',
    earthCable_ref: 'Câble de terre — Référence',
    mc4_qty: 'Connecteurs MC4 — Quantité',
    mc4_brand: 'Connecteurs MC4 — Marque',
    mc4_ref: 'Connecteurs MC4 — Référence',
    splitter_qty: 'Répartiteurs — Quantité',
    splitter_brand: 'Répartiteurs — Marque',
    splitter_ref: 'Répartiteurs — Référence',
    cableTray_qty: 'Chemin de câbles — Quantité',
    cableTray_brand: 'Chemin de câbles — Marque',
    cableTray_ref: 'Chemin de câbles — Référence',
    // Spécifications panneau
    panel_brand: 'Panneau — Marque',
    panel_ref: 'Panneau — Référence',
    panel_power: 'Panneau — Puissance (W)',
    panel_vmpp: 'Panneau — Vmpp',
    panel_impp: 'Panneau — Impp',
    panel_voc: 'Panneau — Voc',
    panel_isc: 'Panneau — Isc',
    panel_beta: 'Panneau — Coeff. tension β',
    panel_alpha: 'Panneau — Coeff. courant α',
    panel_irm: 'Panneau — Courant inverse admissible Ir m',
    // Chaînes
    inverter1_no: 'Onduleur n°',
    inverter1_panels: 'Nombre de panneaux / chaîne',
    inverter1_dc_power: 'Puissance DC',
    inverter1_ratio: 'Ratio DC/AC',
    // Onduleur
    inverter_label: 'Onduleur — Désignation',
    inverter_ac_w: 'Puissance AC nominale',
    inverter_vdcmax: 'Tension DC max',
    inverter_idcmax: 'Courant DC max / MPPT',
    inverter_iscmax: 'Courant Isc max / MPPT',
    inverter_mppt_count: 'Nombre de MPPT',
    inverter_inputs_mppt: 'Entrées par MPPT',
    inverter_mppt_range: 'Plage MPPT',
    inverter_input_range: 'Plage de tension d\u2019entrée',
    inverter_ac_kva: 'Puissance apparente (kVA)',
    inverter_output_voltage: 'Tension de sortie',
    inverter_iacmax: 'Courant AC max',
    // Protections
    fuse_voltage: 'Fusible — Tension',
    fuse_current: 'Fusible — Courant',
    spdDC_type: 'Parafoudre DC — Type',
    spdDC_ucpv: 'Parafoudre DC — Ucpv',
    spdDC_up: 'Parafoudre DC — Up',
    spdDC_in: 'Parafoudre DC — In',
    spdDC_iscpv: 'Parafoudre DC — Iscpv',
    isolatorDC_usec: 'Sectionneur DC — Usec',
    isolatorDC_isec: 'Sectionneur DC — Isec',
    rcdAC_udis: 'Différentiel AC — Udis',
    rcdAC_in: 'Différentiel AC — In',
    rcdAC_breaking: 'Différentiel AC — Pouvoir de coupure',
    rcdAC_sensitivity: 'Différentiel AC — Sensibilité',
    spdAC_type: 'Parafoudre AC — Type',
    spdAC_ucpv: 'Parafoudre AC — Uc',
    spdAC_up: 'Parafoudre AC — Up',
    spdAC_in: 'Parafoudre AC — In',
    cableDC_section: 'Câble DC — Section',
    cableDC_iz: 'Câble DC — Iz',
    cableAC_section: 'Câble AC — Section',
    cableAC_iz: 'Câble AC — Iz',
    // Compatibilité onduleur
    voc_minus10: 'Voc à -10 °C',
    nsmax: 'Ns max',
    vmp_minus10: 'Vmp à -10 °C',
    nsoptimal: 'Ns optimal',
    vmp_85: 'Vmp à 85 °C',
    nsmin: 'Ns min',
    isc_85: 'Isc à 85 °C',
    npmax: 'Np max',
    imp_85: 'Imp à 85 °C',
    npoptimal: 'Np optimal',
    dc_power: 'Puissance DC totale',
    ac_power: 'Puissance AC',
    power_ratio: 'Ratio de puissance',
    ncmax: 'Nc max (chaînes parallèle)',
    fuse_npmax: 'Np max avec fusibles',
    fuse_desc: 'Conclusion protection chaînes (fusibles)',
    // Descriptions protections
    isolatorDC_desc: 'Description sectionneur DC',
    spdDC_desc: 'Description parafoudre DC',
    rcdAC_desc: 'Description différentiel AC',
    spdAC_desc: 'Description parafoudre AC',
    isolatorAC_desc: 'Description sectionneur AC',
    reference_type_fabricant_interrupteur: 'Référence / type / fabricant interrupteur',
    // Câbles
    a_calculer: 'Formule Iz\u2019 (note de calcul)',
    troncons_consideres_calcul: 'Tronçons considérés pour le calcul',
    tableau_norme_indication: 'Indication norme (tableaux)',
    cableDC_admissible: 'Câble DC — courant admissible',
    cableDC_izcorr: 'Câble DC — Iz\u2019 corrigé',
    cableAC_admissible: 'Câble AC — courant admissible',
    cableAC_izcorr: 'Câble AC — Iz\u2019 corrigé',
    dc1_label3: 'DC1 — Libellé tronçon R3',
    dc2_label3: 'DC2 — Libellé tronçon R3',
    // Câblage & structure
    earth_cable_desc: 'Section câbles de mise à la terre',
    structure_desc: 'Description mise en œuvre structure',
    // Annexes
    ordre_tableau_documentation_annexes: 'Documentation technique (annexes)',
    ordre_tableau_I_documentation_annexes: 'Documentation annexe (tableau I)',
};

// ── Auto-labels for repetitive route table keys ──────────────────────
const ROUTE_SUFFIX = {
    rho: 'ρ (Ω·mm²/m)',
    length: 'Longueur (m)',
    current: 'Courant (A)',
    section: 'Section (mm²)',
    voltage: 'Tension',
    du: 'Chute Δu (V)',
    du_pct: 'Chute Δu (%)',
    L: 'Longueur L (m)',
    I: 'Courant I (A)',
    S: 'Section S (mm²)',
    lambda: 'λ',
    cosphi: 'cos φ',
    sinphi: 'sin φ',
    V: 'Tension V',
    b: 'Coefficient b',
};

function autoLabel(key) {
    if (LABELS[key]) return LABELS[key];
    const dcRoute = key.match(/^dc([12])_r([123])_(.+)$/);
    if (dcRoute) {
        return `DC${dcRoute[1]} — Tronçon R${dcRoute[2]} — ${ROUTE_SUFFIX[dcRoute[3]] || dcRoute[3]}`;
    }
    const acRoute = key.match(/^ac_r([12])_(.+)$/);
    if (acRoute) {
        return `AC — Tronçon R${acRoute[1]} — ${ROUTE_SUFFIX[acRoute[2]] || acRoute[2]}`;
    }
    return key.replace(/_/g, ' ');
}

// ── Grouping ─────────────────────────────────────────────────────────
const GROUPS = [
    { group: 'Page de garde', keys: ['clientBT', 'reference', 'location', 'power', 'sigle_installateur', 'date', 'version'] },
    { group: 'Introduction', keys: ['introduction'] },
    { group: 'Tableau des équipements', keys: [
        'module_qty', 'module_brand', 'module_ref', 'inverter_qty', 'inverter_brand', 'inverter_ref',
        'fuse_qty', 'fuse_brand', 'fuse_ref', 'spdDC_qty', 'spdDC_brand', 'spdDC_ref',
        'isolatorDC_qty', 'isolatorDC_brand', 'isolatorDC_ref', 'spdAC_qty', 'spdAC_brand', 'spdAC_ref',
        'isolatorAC_qty', 'isolatorAC_brand', 'isolatorAC_ref', 'rcdAC_qty', 'rcdAC_brand', 'rcdAC_ref',
        'mainBreaker_qty', 'mainBreaker_brand', 'mainBreaker_ref', 'cableDC_qty', 'cableDC_brand', 'cableDC_ref',
        'cableAC_qty', 'cableAC_brand', 'cableAC_ref', 'earthCable_qty', 'earthCable_brand', 'earthCable_ref',
        'mc4_qty', 'mc4_brand', 'mc4_ref', 'splitter_qty', 'splitter_brand', 'splitter_ref',
        'cableTray_qty', 'cableTray_brand', 'cableTray_ref',
    ] },
    { group: 'Spécifications panneaux', keys: [
        'panel_brand', 'panel_ref', 'panel_power', 'panel_vmpp', 'panel_impp', 'panel_voc', 'panel_isc',
        'panel_beta', 'panel_alpha', 'panel_irm', 'inverter1_no', 'inverter1_panels', 'inverter1_dc_power', 'inverter1_ratio',
    ] },
    { group: 'Spécifications onduleur', keys: [
        'inverter_label', 'inverter_ac_w', 'inverter_vdcmax', 'inverter_idcmax', 'inverter_iscmax',
        'inverter_mppt_count', 'inverter_inputs_mppt', 'inverter_mppt_range', 'inverter_input_range',
        'inverter_ac_kva', 'inverter_output_voltage', 'inverter_iacmax',
    ] },
    { group: 'Protections DC / AC', keys: [
        'fuse_voltage', 'fuse_current', 'spdDC_type', 'spdDC_ucpv', 'spdDC_up', 'spdDC_in', 'spdDC_iscpv',
        'isolatorDC_usec', 'isolatorDC_isec', 'rcdAC_udis', 'rcdAC_in', 'rcdAC_breaking', 'rcdAC_sensitivity',
        'spdAC_type', 'spdAC_ucpv', 'spdAC_up', 'spdAC_in',
        'cableDC_section', 'cableDC_iz', 'cableAC_section', 'cableAC_iz',
    ] },
    { group: 'Compatibilité onduleur', keys: [
        'voc_minus10', 'nsmax', 'vmp_minus10', 'nsoptimal', 'vmp_85', 'nsmin', 'isc_85', 'npmax',
        'imp_85', 'npoptimal', 'dc_power', 'ac_power', 'power_ratio', 'ncmax', 'fuse_npmax', 'fuse_desc',
    ] },
    { group: 'Descriptions des protections', keys: [
        'isolatorDC_desc', 'spdDC_desc', 'rcdAC_desc', 'spdAC_desc', 'isolatorAC_desc',
        'reference_type_fabricant_interrupteur',
    ] },
    { group: 'Câbles DC', keys: [
        'a_calculer', 'troncons_consideres_calcul', 'tableau_norme_indication',
        'cableDC_admissible', 'cableDC_izcorr',
        'dc1_r1_rho', 'dc1_r1_length', 'dc1_r1_current', 'dc1_r1_section', 'dc1_r1_voltage', 'dc1_r1_du', 'dc1_r1_du_pct',
        'dc1_r2_rho', 'dc1_r2_length', 'dc1_r2_current', 'dc1_r2_section', 'dc1_r2_voltage', 'dc1_r2_du', 'dc1_r2_du_pct',
        'dc1_label3', 'dc1_r3_rho', 'dc1_r3_length', 'dc1_r3_current', 'dc1_r3_section', 'dc1_r3_voltage', 'dc1_r3_du', 'dc1_r3_du_pct',
        'dc2_r1_rho', 'dc2_r1_length', 'dc2_r1_current', 'dc2_r1_section', 'dc2_r1_voltage', 'dc2_r1_du', 'dc2_r1_du_pct',
        'dc2_r2_rho', 'dc2_r2_length', 'dc2_r2_current', 'dc2_r2_section', 'dc2_r2_voltage', 'dc2_r2_du', 'dc2_r2_du_pct',
        'dc2_label3', 'dc2_r3_rho', 'dc2_r3_length', 'dc2_r3_current', 'dc2_r3_section', 'dc2_r3_voltage', 'dc2_r3_du', 'dc2_r3_du_pct',
    ] },
    { group: 'Câbles AC', keys: [
        'cableAC_admissible', 'cableAC_izcorr',
        'ac_r1_label', 'ac_r1_b', 'ac_r1_rho', 'ac_r1_L', 'ac_r1_I', 'ac_r1_S', 'ac_r1_lambda', 'ac_r1_cosphi', 'ac_r1_sinphi', 'ac_r1_V', 'ac_r1_du', 'ac_r1_du_pct',
        'ac_r2_label', 'ac_r2_b', 'ac_r2_rho', 'ac_r2_L', 'ac_r2_I', 'ac_r2_S', 'ac_r2_lambda', 'ac_r2_cosphi', 'ac_r2_sinphi', 'ac_r2_V', 'ac_r2_du', 'ac_r2_du_pct',
    ] },
    { group: 'Câblage & structure', keys: ['earth_cable_desc', 'structure_desc'] },
    { group: 'Annexes', keys: ['ordre_tableau_documentation_annexes', 'ordre_tableau_I_documentation_annexes'] },
];

/** Keys with long prose content → rendered as textarea in the UI. */
export const LONG_TEXT_KEYS = new Set([
    'introduction', 'structure_desc', 'earth_cable_desc', 'isolatorAC_desc', 'fuse_desc',
    'isolatorDC_desc', 'spdDC_desc', 'rcdAC_desc', 'spdAC_desc',
    'troncons_consideres_calcul', 'tableau_norme_indication',
    'reference_type_fabricant_interrupteur',
    'ordre_tableau_documentation_annexes', 'ordre_tableau_I_documentation_annexes',
]);

/**
 * @returns {Array<{key:string,label:string,group:string,ai:boolean,long:boolean}>}
 */
export function listTemplateVariables() {
    const seen = new Set();
    const out = [];
    for (const { group, keys } of GROUPS) {
        for (const key of keys) {
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({
                key,
                label: autoLabel(key),
                group,
                ai: AI_TEXT_KEYS.includes(key),
                long: LONG_TEXT_KEYS.has(key),
            });
        }
    }
    return out;
}
