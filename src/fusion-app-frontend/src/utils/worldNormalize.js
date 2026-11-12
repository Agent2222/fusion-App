/**
 * Normalizes `locales.*.world` text fields that may be string or string[] in seed data.
 * @see docs/profile-schema.md
 */
import { isLlmFailureText } from './llmTextSanitize.js';

const WORLD_ARRAY_KEYS = ['perspective', 'vision', 'constructing', 'context'];

/** Section keys accepted in `locales.worldSourceByField` (kept in sync with worldPublicPick). */
const WORLD_SOURCE_BY_FIELD_KEYS = ['practice', 'perspective', 'vision', 'constructing', 'context', 'quote'];

/**
 * Keep only known section keys with a valid `world` / `newWorld` value.
 * @param {unknown} raw
 * @returns {Record<string, string>}
 */
function normalizeWorldSourceByFieldForStorage(raw) {
    /** @type {Record<string, string>} */
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    const src = /** @type {Record<string, unknown>} */ (raw);
    for (const key of WORLD_SOURCE_BY_FIELD_KEYS) {
        const v = src[key];
        if (v === 'world' || v === 'newWorld') out[key] = v;
    }
    return out;
}

/**
 * @param {string} s
 * @returns {boolean}
 */
function isUsableParagraph(s) {
    const t = String(s ?? '').trim();
    if (!t || isLlmFailureText(t)) return false;
    if (/Registered in\s*\)\.?$/i.test(t)) return false;
    return true;
}

/**
 * Turn a polymorphic world text field into paragraph strings for UI.
 * @param {unknown} raw
 * @returns {string[]}
 */
export function worldTextToParagraphs(raw) {
    if (raw == null || raw === '') return [];
    if (Array.isArray(raw)) {
        return raw.map((x) => String(x)).filter(isUsableParagraph);
    }
    const s = String(raw).trim();
    return isUsableParagraph(s) ? [s] : [];
}

/**
 * Same as {@link worldTextToParagraphs} — alias for profile rendering.
 * @param {unknown} raw
 * @returns {string[]}
 */
export function worldTextParts(raw) {
    return worldTextToParagraphs(raw);
}

/**
 * Merge normalized paragraphs into a DOM container (one <p> per paragraph).
 * @param {HTMLElement | null} container
 * @param {unknown} raw
 */
export function fillWorldParagraphs(container, raw) {
    if (!container) return;
    container.replaceChildren();
    for (const text of worldTextToParagraphs(raw)) {
        const p = document.createElement('p');
        p.textContent = text;
        container.appendChild(p);
    }
}

/**
 * Coerce world text fields to arrays of strings for storage (canonical JSON).
 * @param {Record<string, unknown> | null | undefined} world
 * @returns {Record<string, unknown>}
 */
export function normalizeWorldBlockForStorage(world) {
    if (!world || typeof world !== 'object') return {};
    /** @type {Record<string, unknown>} */
    const out = { ...world };
    for (const key of WORLD_ARRAY_KEYS) {
        if (Object.prototype.hasOwnProperty.call(out, key)) {
            out[key] = worldTextToParagraphs(out[key]);
        }
    }
    return out;
}

/**
 * Deep-merge `normalizeWorldBlockForStorage` into `locales[code].world` for en/ja when present.
 * @param {Record<string, unknown>} locales
 * @returns {Record<string, unknown>}
 */
export function normalizeLocalesWorldForStorage(locales) {
    if (!locales || typeof locales !== 'object') return {};
    /** @type {Record<string, unknown>} */
    const out = { ...locales };
    const pws = out.publicWorldSource;
    if (pws === 'world' || pws === 'newWorld') {
        out.publicWorldSource = pws;
    } else {
        delete out.publicWorldSource;
    }
    const byField = normalizeWorldSourceByFieldForStorage(out.worldSourceByField);
    if (Object.keys(byField).length) {
        out.worldSourceByField = byField;
    } else {
        delete out.worldSourceByField;
    }
    const ad = out.audioDisplayForArtist;
    if (ad === true || ad === false) {
        out.audioDisplayForArtist = ad;
    } else {
        delete out.audioDisplayForArtist;
    }
    for (const code of ['en', 'ja']) {
        if (!Object.prototype.hasOwnProperty.call(out, code)) continue;
        const block = out[code];
        if (!block || typeof block !== 'object' || Array.isArray(block)) continue;
        const loc = /** @type {Record<string, unknown>} */ (block);
        const w = loc.world;
        if (w && typeof w === 'object' && !Array.isArray(w)) {
            loc.world = normalizeWorldBlockForStorage(/** @type {Record<string, unknown>} */ (w));
        }
        const wn = loc.worldNew;
        if (wn && typeof wn === 'object' && !Array.isArray(wn)) {
            loc.worldNew = normalizeWorldBlockForStorage(/** @type {Record<string, unknown>} */ (wn));
        }
        out[code] = loc;
    }
    return out;
}
