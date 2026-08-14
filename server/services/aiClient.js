/**
 * AI client — Hugging Face Inference Router (OpenAI-compatible).
 *
 * Single lazy client shared by aiScanner, dossierAgent and aiTextGenerator.
 * Lazy because ES module imports run before server.js loads the root .env,
 * so HF_TOKEN is not set yet at module load time.
 */

import OpenAI from 'openai';

export const AI_MODEL = 'Qwen/Qwen3-8B:nscale';
export const AI_BASE_URL = 'https://router.huggingface.co/v1';

let client = null;
export function aiClient() {
    if (!client) {
        client = new OpenAI({
            baseURL: AI_BASE_URL,
            apiKey: process.env.HF_TOKEN || 'missing',
        });
    }
    return client;
}

export function hasAiKey() {
    return Boolean(process.env.HF_TOKEN);
}

/** Remove Qwen3 thinking blocks and trim. */
export function stripThinking(text) {
    return String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/** Pull the first JSON object out of a model reply (fences tolerated). */
export function extractJson(text) {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (!m) throw new Error('AI response is not JSON');
    return m[0];
}

/**
 * One-shot completion that must answer with a JSON object.
 * Appends /no_think so Qwen3 answers directly without a reasoning block.
 * @returns {Promise<object>} parsed JSON
 */
export async function chatJson(prompt, { system } = {}) {
    const res = await aiClient().chat.completions.create({
        model: AI_MODEL,
        temperature: 0.2,
        messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: prompt + '\n/no_think' },
        ],
    });
    const text = stripThinking(res.choices?.[0]?.message?.content || '');
    return JSON.parse(extractJson(text));
}
