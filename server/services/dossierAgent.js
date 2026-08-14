/**
 * Dossier Agent — AI assistant embedded in every dossier.
 *
 * A Gemini function-calling agent that can READ and UPDATE the dossier in
 * the database (client info, PV parameters, equipment, variables), run the
 * STEG compliance check, attach the user's images as dossier documents and
 * generate the French narrative texts.
 *
 * If the GEMINI_API_KEY is missing/invalid, runAgent() throws with
 * `geminiAuth = true` and the route falls back to ruleBasedGuidance()
 * (deterministic French checklist computed from the compliance report).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
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
4. Si l'utilisateur joint une image (plaque signalétique, photo de fiche technique, schéma), analyse-la : propose ou applique les spécifications extraites via update_dossier, et enregistre l'image au dossier avec attach_user_images si c'est pertinent.
5. Pour guider vers le dossier parfait, vérifie : informations client complètes (CIN, téléphone, adresse, réf. compteur STEG), paramètres PV (nombre de panneaux, puissance, phase, longueurs de câbles, températures min/max), équipements avec marque+modèle+specs, conformité STEG sans erreur, textes narratifs rédigés, documents annexés.
6. Réponds TOUJOURS en français, de façon concise et structurée (listes à puces).`;

// ── Tool declarations (Gemini function calling) ──────────────────────

const TOOLS = [{
    functionDeclarations: [
        {
            name: 'get_dossier',
            description: 'Lit l\u2019état actuel complet du dossier (client, système PV, équipements, documents, variables).',
            parametersJsonSchema: { type: 'object', properties: {}, required: [] },
        },
        {
            name: 'get_compliance',
            description: 'Calcule le rapport de conformité STEG du dossier (erreurs, avertissements, calculs chaînes/câbles/protections).',
            parametersJsonSchema: { type: 'object', properties: {}, required: [] },
        },
        {
            name: 'update_dossier',
            description: 'Modifie une section du dossier par fusion profonde (deep merge) et enregistre en base.',
            parametersJsonSchema: {
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
        {
            name: 'attach_user_images',
            description: 'Enregistre les images jointes au message de l\u2019utilisateur dans les documents du dossier.',
            parametersJsonSchema: {
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
        {
            name: 'generate_texts',
            description: 'Rédige en français les textes narratifs du dossier (introduction, descriptions…) et les enregistre dans les variables.',
            parametersJsonSchema: {
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
    ],
}];

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
    if (/401|403|API[_ ]?KEY|authentication|permission/i.test(String(e?.message))) e.geminiAuth = true;
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
    if (!process.env.GEMINI_API_KEY) {
        const err = new Error('GEMINI_API_KEY manquante');
        err.geminiAuth = true;
        throw err;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const config = { systemInstruction: SYSTEM_PROMPT, tools: TOOLS };
    const generate = () => ai.models.generateContent({ model: 'gemini-flash-latest', contents, config });

    // Replay the persisted conversation, then the current user message
    const contents = (dossier.chatHistory || []).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text || '' }],
    }));
    contents.push({
        role: 'user',
        parts: [
            ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
            { text: message || 'Analyse ce dossier et propose les améliorations pour un dossier parfait.' },
        ],
    });

    const actions = [];
    let response;
    try {
        response = await generate();
    } catch (e) {
        throw markAuthError(e);
    }

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const calls = response.functionCalls || [];
        if (calls.length === 0) break;

        // Record the model turn verbatim (functionCall parts keep their thoughtSignature)
        const modelContent = response.candidates?.[0]?.content;
        if (modelContent) contents.push(modelContent);

        const fnParts = [];
        for (const call of calls) {
            try {
                const out = await executeTool(call.name, call.args || {}, { dossier, images, actions });
                fnParts.push({ functionResponse: { name: call.name, response: { result: out } } });
            } catch (toolErr) {
                fnParts.push({ functionResponse: { name: call.name, response: { error: toolErr.message } } });
            }
        }
        contents.push({ role: 'user', parts: fnParts });

        try {
            response = await generate();
        } catch (e) {
            throw markAuthError(e);
        }
    }

    return { reply: response.text || '', actions };
}

// ── Offline fallback (no valid Gemini key) ───────────────────────────

/**
 * Deterministic French guidance computed from the dossier + compliance
 * report. Used when the Gemini API key is missing or invalid.
 */
export function ruleBasedGuidance(dossier) {
    const lines = [];
    lines.push('⚠️ Clé Gemini invalide ou absente — mode analyse automatique (sans conversation).');
    lines.push('Renseignez une clé valide (GEMINI_API_KEY dans .env) pour activer l\u2019agent complet.');
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
    lines.push(missing.length ? `📋 Champs manquants :\n- ${missing.join('\n- ')}` : '📋 Tous les champs essentiels sont renseignés.');
    lines.push('');

    // Compliance
    try {
        const r = computeStegCompliance(dossier);
        lines.push(r.summary.fullCompliant
            ? '✅ Conformité STEG : aucune erreur détectée.'
            : `❌ Conformité STEG : ${r.summary.errorCount} erreur(s), ${r.summary.warningCount} avertissement(s).`);
        for (const e of r.errors || []) lines.push(`  • ERREUR : ${e}`);
        for (const w of r.warnings || []) lines.push(`  • ATTENTION : ${w}`);
    } catch (err) {
        lines.push('❌ Rapport de conformité indisponible : ' + err.message);
    }

    return lines.join('\n');
}
