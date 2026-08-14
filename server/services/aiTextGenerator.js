/**
 * AI Text Generator (HF router — Qwen3-8B)
 *
 * Generates professional French prose for the narrative placeholders of the
 * STEG technical dossier template (introduction, structure description,
 * earthing description, etc.). Always returns a value for every requested
 * key — falling back to neutral default French text when the API fails.
 */

import { chatJson } from './aiClient.js';

/** Placeholder keys whose content is generated as French prose. */
export const AI_TEXT_KEYS = [
    'introduction',
    'structure_desc',
    'earth_cable_desc',
    'isolatorAC_desc',
    'fuse_desc',
];

/** Neutral French fallbacks used when the AI is unavailable / fails. */
export const AI_TEXT_DEFAULTS = {
    introduction:
        "Le présent dossier technique décrit l'étude de l'installation photovoltaïque raccordée au réseau Basse Tension de la STEG. " +
        "Il présente la solution proposée, les équipements retenus, les notes de calcul de dimensionnement (chaînes, protections, câbles) " +
        "ainsi que les vérifications de conformité conformément au référentiel STEG et aux normes en vigueur.",
    structure_desc:
        "Les modules photovoltaïques sont fixés sur une structure métallique galvanisée adaptée au support existant. " +
        "La structure est dimensionnée pour résister aux efforts de vent du site et fixée conformément aux recommandations du fabricant. " +
        "Une attestation de conformité délivrée par un bureau de contrôle certifie la tenue mécanique de l'ensemble.",
    earth_cable_desc:
        "La section des câbles de mise à la terre est choisie conformément au référentiel STEG et à la norme NF C 15-100 : " +
        "le conducteur de protection relie les masses des modules, de la structure et de l'onduleur à la prise de terre de l'installation.",
    isolatorAC_desc:
        "Un interrupteur-sectionneur est installé côté AC afin de permettre la coupure en charge et la séparation de l'installation " +
        "photovoltaïque du réseau pour les opérations de maintenance, conformément au schéma de liaison à la terre de l'installation.",
    fuse_desc:
        "Conformément au calcul du courant inverse admissible des modules, la protection des chaînes par fusibles est définie " +
        "selon le référentiel STEG et la norme NF C 15-100.",
};

function buildContext(dossierData, report) {
    const dd = dossierData || {};
    const cd = dd.customerDetails || {};
    const ps = dd.pvSystemParams || {};
    const eq = dd.equipment || {};
    const panelCount = ps.panelCount || 0;
    const peakKwc = ps.peakPowerKwc || ((eq.panel?.specs?.pmax || 0) * panelCount) / 1000;
    return [
        `Client : ${cd.name || 'N/A'} — adresse : ${cd.address || 'N/A'}`,
        `Puissance crête : ${peakKwc} kWc — ${panelCount} module(s) ${eq.panel?.brand || ps.panelBrand || ''} ${eq.panel?.model || ''}`.trim(),
        `Onduleur : ${eq.inverter?.brand || ''} ${eq.inverter?.model || ps.inverterModel || ''}`.trim(),
        `Protection DC : ${eq.dcProtection?.brand || ''} ${eq.dcProtection?.model || ''}`.trim(),
        `Protection AC : ${eq.acProtection?.brand || ''} ${eq.acProtection?.model || ''}`.trim(),
        `Phase AC : ${ps.acPhase === 'tri' ? 'triphasé 400 V' : 'monophasé 230 V'}`,
        report?.summary ? `Conformité STEG : ${report.summary.fullCompliant ? 'installation conforme' : 'réserves détectées'} (${report.summary.overallStatus || ''})` : '',
    ].filter(Boolean).join('\n');
}

const PROMPT_BY_KEY = {
    introduction:
        'introduction : introduction générale (2 paragraphes, ~120 mots) de l\u2019étude de l\u2019installation photovoltaïque raccordée au réseau BT de la STEG, ton professionnel.',
    structure_desc:
        'structure_desc : description de la mise en œuvre de la structure support des panneaux (fixation, matériaux, tenue au vent, attestation bureau de contrôle), ~60 mots.',
    earth_cable_desc:
        'earth_cable_desc : choix de la section des câbles de mise à la terre conformément au référentiel STEG et à la NF C 15-100, ~40 mots.',
    isolatorAC_desc:
        'isolatorAC_desc : description du dimensionnement de l\u2019interrupteur-sectionneur côté AC, ~40 mots.',
    fuse_desc:
        'fuse_desc : conclusion sur la protection des chaînes PV par fusibles (courant inverse admissible Ir m, nombre de chaînes parallèles), ~40 mots.',
};

/**
 * Generate French prose for every AI placeholder key.
 *
 * @param {Object} dossierData      – full dossier document
 * @param {Object} complianceReport – output of computeStegCompliance()
 * @param {string[]} [keys]         – subset of AI_TEXT_KEYS (default: all)
 * @returns {Promise<Record<string,string>>}
 */
export async function generateAiTexts(dossierData, complianceReport, keys = AI_TEXT_KEYS) {
    const wanted = keys.filter((k) => AI_TEXT_KEYS.includes(k));
    if (wanted.length === 0) return {};

    const apiKey = process.env.HF_TOKEN;
    if (!apiKey) {
        console.warn('[AI-TEXT] HF_TOKEN missing → using default French texts');
        return Object.fromEntries(wanted.map((k) => [k, AI_TEXT_DEFAULTS[k]]));
    }

    try {
        const prompt =
            `Tu rédiges des extraits d'un dossier technique photovoltaïque (raccordement Basse Tension STEG, Tunisie). ` +
            `Écris en français professionnel et technique. Voici le contexte de l'installation :\n` +
            buildContext(dossierData, complianceReport) +
            `\n\nGénère UNIQUEMENT un objet JSON valide avec ces clés :\n` +
            wanted.map((k) => `- ${PROMPT_BY_KEY[k]}`).join('\n') +
            `\n\nPas de texte hors JSON, pas de balises markdown.`;

        const parsed = await chatJson(prompt);

        const out = {};
        for (const k of wanted) {
            const v = typeof parsed[k] === 'string' ? parsed[k].trim() : '';
            out[k] = v || AI_TEXT_DEFAULTS[k];
        }
        console.log('[AI-TEXT] Generated:', wanted.join(', '));
        return out;
    } catch (error) {
        console.error('[AI-TEXT] AI failed, using defaults:', error.message);
        return Object.fromEntries(wanted.map((k) => [k, AI_TEXT_DEFAULTS[k]]));
    }
}
