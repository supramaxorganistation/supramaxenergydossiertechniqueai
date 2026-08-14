/**
 * Dossier Agent — AI assistant embedded in every dossier.
 *
 * An OpenAI-compatible function-calling agent (HF router, Qwen3-8B) that can
 * READ and UPDATE the dossier in the database (client info, PV parameters,
 * equipment, variables), run the STEG compliance check, attach the user's
 * images as dossier documents and generate the French narrative texts.
 *
 * If the HF_TOKEN is missing/invalid, runAgent() throws with
 * `aiAuth = true` and the route falls back to ruleBasedGuidance()
 * (deterministic French checklist computed from the compliance report).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { aiClient, AI_MODEL, stripThinking } from './aiClient.js';
import { computeStegCompliance } from '../utils/stegCalculations.js';
import { generateAiTexts, AI_TEXT_KEYS } from './aiTextGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

const MAX_TOOL_ROUNDS = 8;

// ── System prompt ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es « Supramax Assistant », l'agent IA expert des dossiers techniques STEG d'installations photovoltaïques raccordées au réseau basse tension (Tunisie). Tu aides l'utilisateur (installateur Supramax Energy) à constituer un dossier PARFAIT et conforme, et tu exécutes toi-même les modifications qu'il te demande.

Tes outils :
- get_dossier : lire l'état actuel du dossier (client, système PV, équipements, documents, variables).
- get_compliance : calculer le rapport de conformité STEG (chaînes, ratio de puissance, protections DC/AC, câbles NF C 15-100, tenue au vent) avec la liste des erreurs et avertissements.
- update_dossier : modifier le dossier (sections customerDetails, pvSystemParams, equipment, variables) par fusion profonde.
- attach_user_images : enregistrer les images jointes au message de l'utilisateur dans les documents du dossier.
- generate_texts : rédiger en français les textes narratifs du dossier (introduction, descriptions des protections, câblage, structure) et les enregistrer dans les variables.

Méthode :
1. Lis toujours (get_dossier / get_compliance) avant de conseiller ou de modifier.
2. Quand l'utilisateur demande une mise à jour, exécute-la avec update_dossier puis confirme précisément ce que tu as changé.
3. Signale proactivement les champs manquants ou incohérents et les non-conformités STEG, avec des recommandations chiffrées (sections de câble, calibres des protections, nombre de panneaux en série, ratio de puissance…).
4. Si l'utilisateur joint une image (plaque signalétique, photo de fiche technique, schéma), enregistre-la au dossier avec attach_user_images ; tu ne peux pas lire les images directement : demande-lui les valeurs clés si nécessaire, puis applique-les avec update_dossier.
5. Pour guider vers le dossier parfait, vérifie : informations client complètes (CIN, téléphone, adresse, réf. compteur STEG), paramètres PV (nombre de panneaux, puissance, phase, longueurs de câbles, températures min/max), équipements avec marque+modèle+specs, conformité STEG sans erreur, textes narratifs rédigés, documents annexés.
6. Réponds TOUJOURS en français, de façon concise et structurée (listes à puces).`;

// ── Tool declarations (OpenAI function calling) ─────────────────────

const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'get_dossier',
            description: 'Lit l’état actuel complet du dossier (client, système PV, équipements, documents, variables).',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_compliance',
            description: 'Calcule le rapport de conformité STEG du dossier (erreurs, avertissements, calculs chaînes/câbles/protections).',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_dossier',
            description: 'Modifie une section du dossier par fusion profonde (deep merge) et enregistre en base.',
            parameters: {
                type: 'object',
                properties: {
                    section: {
                        type: 'string',
                        enum: ['customerDetails', 'pvSystemParams', 'equipment', 'variables'],
                        description: 'Section du dossier à modifier.',
                    },
                    changes: {
                        type: 'object',
                        description: 'Champs à fusionner. Ex. equipment : {"inverter":{"brand":"GOODWE","model":"GW3000","specs":{"pac":3000}}}.',
                    },
                    note: { type: 'string', description: 'Résumé court de la modification (journal).' },
                },
                required: ['section', 'changes'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'attach_user_images',
            description: 'Enregistre les images jointes au message de l’utilisateur dans les documents du dossier.',
            parameters: {
                type: 'object',
                properties: {
                    names: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Noms de fichier optionnels pour les images jointes.',
                    },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'generate_texts',
            description: 'Rédige en français les textes narratifs du dossier (introduction, descriptions…) et les enregistre dans les variables.',
            parameters: {
                type: 'object',
                properties: {
                    keys: {
                        type: 'array',
                        items: { type: 'string' },
                        description: `Clés optionnelles (${AI_TEXT_KEYS.join(', ')}). Par défaut : toutes.`,
                    },
                },
                required: [],
            },
        },
    },
];

// ── Helpers ─────────────────────────────────────────────────────────

function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(target, source) {
    const out = { ...(target || {}) };
    for (const [k, v] of Object.entries(source || {})) {
        if (isPlainObject(v) && isPlainObject(out[k])) out[k] = deepMerge(out[k], v);
        else if (v !== undefined) out[k] = v;
    }
    return out;
}

function dossierSummary(d) {
    const eq = d.equipment || {};
    return {
        status: d.status,
        customerDetails: d.customerDetails || {},
        pvSystemParams: d.pvSystemParams || {},
        equipment: Object.fromEntries(
            Object.entries(eq).map(([k, v]) => [k, { brand: v?.brand, model: v?.model, specs: v?.specs }]),
        ),
        documents: (d.documents || []).map((x) => x.fileName),
        variables: d.variables || {},
    };
}

function complianceSummary(d) {
    const r = computeStegCompliance(d);
    return {
        summary: r.summary,
        errors: r.errors,
        warnings: r.warnings,
        compatibility: r.compatibility,
        protections: r.protections,
        cableAnalysis: r.cableAnalysis,
    };
}

const MIME_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };

async function attachImages(d, names, images, actions) {
    if (!images.length) return { attached: 0, message: 'Aucune image jointe au message.' };
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const attached = [];
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const ext = MIME_EXT[img.mimeType] || '.png';
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(img.base64, 'base64'));
        const fileName = names?.[i] || `image-assistant-${attached.length + 1}${ext}`;
        d.documents.push({ fileName, fileUrl: `/uploads/${filename}`, fileType: ext });
        attached.push(fileName);
    }
    d.markModified('documents');
    await d.save();
    actions.push({ tool: 'attach_user_images', note: attached.join(', ') });
    return { attached: attached.length, files: attached };
}

// ── Tool executor ────────────────────────────────────────────────────

async function executeTool(name, args, ctx) {
    const { dossier, images, actions } = ctx;

    switch (name) {
        case 'get_dossier':
            return dossierSummary(dossier);

        case 'get_compliance':
            return complianceSummary(dossier);

        case 'update_dossier': {
            const section = args.section;
            const allowed = ['customerDetails', 'pvSystemParams', 'equipment', 'variables'];
            if (!allowed.includes(section)) return { error: `Section inconnue : ${section}` };
            const current = dossier[section] && isPlainObject(dossier[section]) ? dossier[section] : {};
            dossier[section] = deepMerge(current, args.changes || {});
            dossier.markModified(section);
            await dossier.save();
            const note = args.note || `Mise à jour de ${section}`;
            actions.push({ tool: 'update_dossier', note });
            return { ok: true, section, note };
        }

        case 'attach_user_images':
            return attachImages(dossier, args.names, images, actions);

        case 'generate_texts': {
            const keys = Array.isArray(args.keys) && args.keys.length > 0
                ? args.keys.filter((k) => AI_TEXT_KEYS.includes(k))
                : AI_TEXT_KEYS;
            if (keys.length === 0) return { error: 'Aucune clé valide.' };
            const report = computeStegCompliance(dossier);
            const texts = await generateAiTexts(dossier, report, keys);
            dossier.variables = { ...(dossier.variables || {}), ...texts };
            dossier.markModified('variables');
            await dossier.save();
            actions.push({ tool: 'generate_texts', note: keys.join(', ') });
            return { ok: true, keys };
        }

        default:
            return { error: `Outil inconnu : ${name}` };
    }
}

// ── Agent loop ───────────────────────────────────────────────────────

function markAuthError(e) {
    if (/401|403|API[_ ]?KEY|token|authentication|unauthorized|permission/i.test(String(e?.message))) e.aiAuth = true;
    return e;
}

/**
 * Run the conversational agent for one user message.
 *
 * @param {Object} opts
 * @param {import('mongoose').Document} opts.dossier – Mongoose dossier document
 * @param {string} opts.message – user text
 * @param {Array<{mimeType:string, base64:string}>} opts.images – attached images
 * @returns {Promise<{reply:string, actions:Array<{tool:string,note?:string}>}>}
 */
export async function runAgent({ dossier, message, images = [] }) {
    if (!process.env.HF_TOKEN) {
        const err = new Error('HF_TOKEN manquante');
        err.aiAuth = true;
        throw err;
    }

    // Replay the persisted conversation, then the current user message.
    // Qwen3-8B is text-only: attached images are announced, not inlined.
    const imageNote = images.length
        ? `\n[${images.length} image(s) jointe(s) au message — à enregistrer au dossier avec attach_user_images.]`
        : '';
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(dossier.chatHistory || []).map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.text || '',
        })),
        {
            role: 'user',
            content: (message || 'Analyse ce dossier et propose les améliorations pour un dossier parfait.') + imageNote + '\n/no_think',
        },
    ];

    const actions = [];
    const ctx = { dossier, images, actions };
    let reply = '';

    try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
            const res = await aiClient().chat.completions.create({
                model: AI_MODEL,
                temperature: 0.2,
                messages,
                tools: TOOLS,
            });
            const msg = res.choices?.[0]?.message;
            if (!msg) throw new Error('Réponse AI vide');
            messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: msg.tool_calls });

            if (!msg.tool_calls || msg.tool_calls.length === 0) {
                reply = stripThinking(msg.content || '');
                break;
            }

            for (const tc of msg.tool_calls) {
                let args = {};
                try { args = JSON.parse(tc.function?.arguments || '{}'); } catch { args = {}; }
                let out;
                try {
                    out = await executeTool(tc.function.name, args, ctx);
                } catch (toolErr) {
                    out = { error: toolErr.message };
                }
                messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(out) });
            }
        }
    } catch (e) {
        throw markAuthError(e);
    }

    return { reply, actions };
}

// ── Offline fallback (no valid HF token) ─────────────────────────────

/**
 * Deterministic French guidance computed from the dossier + compliance
 * report. Used when the HF token is missing or invalid.
 */
export function ruleBasedGuidance(dossier) {
    const lines = [];
    lines.push('Assistant IA indisponible (clé HF_TOKEN absente ou invalide) — mode analyse automatique (sans conversation).');
    lines.push('Renseignez une clé valide (HF_TOKEN dans .env) pour activer l’agent complet.');
    lines.push('');

    // Missing fields checklist
    const missing = [];
    const cd = dossier.customerDetails || {};
    for (const [k, label] of Object.entries({ cin: 'CIN', phone: 'téléphone', address: 'adresse', stegMeterRef: 'réf. compteur STEG' })) {
        if (!cd[k]) missing.push(`client : ${label}`);
    }
    const ps = dossier.pvSystemParams || {};
    for (const [k, label] of Object.entries({
        panelCount: 'nombre de panneaux', peakPowerKwc: 'puissance crête', acPhase: 'phase AC',
        dcCableLength: 'longueur câble DC', acCableLength: 'longueur câble AC', tmin: 'temp. min', tmax: 'temp. max',
    })) {
        if (ps[k] == null || ps[k] === '') missing.push(`système PV : ${label}`);
    }
    const eq = dossier.equipment || {};
    for (const [k, label] of Object.entries({ panel: 'panneau', inverter: 'onduleur', dcProtection: 'protection DC', acProtection: 'protection AC' })) {
        if (!eq[k]?.brand || !eq[k]?.model) missing.push(`équipement : ${label} (marque/modèle)`);
    }
    lines.push(missing.length ? `Champs manquants :\n- ${missing.join('\n- ')}` : 'Tous les champs essentiels sont renseignés.');
    lines.push('');

    // Compliance
    try {
        const r = computeStegCompliance(dossier);
        lines.push(r.summary.fullCompliant
            ? 'Conformité STEG : aucune erreur détectée.'
            : `Conformité STEG : ${r.summary.errorCount} erreur(s), ${r.summary.warningCount} avertissement(s).`);
        for (const e of r.errors || []) lines.push(`  • ERREUR : ${e}`);
        for (const w of r.warnings || []) lines.push(`  • ATTENTION : ${w}`);
    } catch (err) {
        lines.push('Rapport de conformité indisponible : ' + err.message);
    }

    return lines.join('\n');
}
