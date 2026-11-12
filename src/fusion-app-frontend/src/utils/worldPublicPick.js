/**
 * Public profile: choose between artist `world` and LLM `worldNew` per field.
 *
 * Source resolution order:
 * 1. `locales.worldSourceByField[key]` — the per-section choice made in the Story & World editor.
 * 2. `locales.publicWorldSource` — legacy single toggle (Studio batch / older saves).
 * 3. New World when usable `worldNew` copy exists, else World.
 */
import { isLlmFailureText } from './llmTextSanitize.js';
import { worldTextToParagraphs } from './worldNormalize.js';

/** @typedef {'newWorld' | 'world'} PublicWorldSource */

/** Fallback when no explicit preference (pickPublicWorldField still falls back to `world` per field). */
export const PUBLIC_WORLD_SOURCE_DEFAULT = /** @type {const} */ ('newWorld');

/** The six Story & World sections — also the keys of `locales.worldSourceByField`. */
export const WORLD_SECTION_KEYS = /** @type {const} */ ([
    'practice',
    'perspective',
    'vision',
    'constructing',
    'context',
    'quote',
]);

const WORLD_NEW_TEXT_KEYS = WORLD_SECTION_KEYS;

/**
 * @param {unknown} v
 * @returns {boolean}
 */
function scalarFieldHasUsableContent(v) {
    const s = String(v ?? '').trim();
    if (!s || isLlmFailureText(s)) return false;
    if (/Registered in\s*\)\.?$/i.test(s)) return false;
    return true;
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
export function worldFieldHasContent(v) {
    if (v == null || v === '') return false;
    if (Array.isArray(v)) {
        if (v.length === 0) return false;
        for (const item of v) {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
                if (String(/** @type {Record<string, unknown>} */ (item).src ?? '').trim()) return true;
            }
        }
        return worldTextToParagraphs(v).length > 0;
    }
    return scalarFieldHasUsableContent(v);
}

/**
 * @param {Record<string, unknown> | null | undefined} loc
 * @param {'world' | 'worldNew'} which
 * @returns {Record<string, unknown>}
 */
function worldLikeBlock(loc, which) {
    if (!loc || typeof loc !== 'object') return {};
    const key = which === 'worldNew' ? 'worldNew' : 'world';
    const b = /** @type {Record<string, unknown>} */ (loc)[key];
    if (b && typeof b === 'object' && !Array.isArray(b)) return /** @type {Record<string, unknown>} */ (b);
    return {};
}

/**
 * @param {Record<string, unknown> | null | undefined} locales
 * @returns {boolean}
 */
export function localesHaveUsableWorldNew(locales) {
    if (!locales || typeof locales !== 'object') return false;
    for (const code of ['en', 'ja']) {
        const loc = /** @type {Record<string, unknown>} */ (locales)[code];
        if (!loc || typeof loc !== 'object' || Array.isArray(loc)) continue;
        const wn = worldLikeBlock(loc, 'worldNew');
        for (const k of WORLD_NEW_TEXT_KEYS) {
            if (worldFieldHasContent(wn[k])) return true;
        }
    }
    return false;
}

/**
 * @param {Record<string, unknown> | null | undefined} locales
 * @returns {PublicWorldSource}
 */
export function getPublicWorldSourceFromLocales(locales) {
    if (!locales || typeof locales !== 'object') return PUBLIC_WORLD_SOURCE_DEFAULT;
    const raw = /** @type {Record<string, unknown>} */ (locales).publicWorldSource;
    if (raw === 'world') return 'world';
    if (raw === 'newWorld') return 'newWorld';
    if (localesHaveUsableWorldNew(locales)) return 'newWorld';
    return PUBLIC_WORLD_SOURCE_DEFAULT;
}

/**
 * Keep only known section keys with a valid source value.
 * @param {unknown} raw
 * @returns {Record<string, PublicWorldSource>}
 */
export function normalizeWorldSourceByField(raw) {
    /** @type {Record<string, PublicWorldSource>} */
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    const src = /** @type {Record<string, unknown>} */ (raw);
    for (const key of WORLD_SECTION_KEYS) {
        const v = src[key];
        if (v === 'world' || v === 'newWorld') out[key] = v;
    }
    return out;
}

/**
 * Which block one Story section should publish for a locales snapshot.
 * Falls back to the caller-provided global source (and then to the default).
 * @param {Record<string, unknown> | null | undefined} locales
 * @param {string} key
 * @param {PublicWorldSource} [fallback]
 * @returns {PublicWorldSource}
 */
export function getWorldSourceForField(
    locales,
    key,
    fallback = PUBLIC_WORLD_SOURCE_DEFAULT,
) {
    const base =
        fallback === 'world' || fallback === 'newWorld' ? fallback : PUBLIC_WORLD_SOURCE_DEFAULT;
    if (!locales || typeof locales !== 'object') return base;
    const map = normalizeWorldSourceByField(
        /** @type {Record<string, unknown>} */ (locales).worldSourceByField,
    );
    const picked = map[key];
    return picked === 'world' || picked === 'newWorld' ? picked : base;
}

/**
 * Read one public world field from a locale block, resolving the source from the
 * full locales root: per-section choice first, then the legacy global source.
 * @param {Record<string, unknown> | null | undefined} locales
 * @param {Record<string, unknown> | null | undefined} loc
 * @param {string} key
 * @returns {unknown}
 */
export function pickPublicWorldFieldFromLocales(locales, loc, key) {
    const globalSource = getPublicWorldSourceFromLocales(locales);
    return pickPublicWorldField(
        loc,
        key,
        globalSource,
        getWorldSourceForField(locales, key, globalSource),
    );
}

/**
 * Prefer `world` or `worldNew` first (per-section choice, else `publicWorldSource`),
 * then the other block when the preferred field is empty.
 * @param {Record<string, unknown> | null | undefined} loc
 * @param {string} key
 * @param {PublicWorldSource} [publicWorldSource]
 * @param {PublicWorldSource | null | undefined} [fieldSource]
 * @returns {unknown}
 */
export function pickPublicWorldField(
    loc,
    key,
    publicWorldSource = PUBLIC_WORLD_SOURCE_DEFAULT,
    fieldSource = null,
) {
    const requested =
        fieldSource === 'world' || fieldSource === 'newWorld' ? fieldSource : publicWorldSource;
    const primary = requested === 'world' ? 'world' : 'worldNew';
    const secondary = primary === 'world' ? 'worldNew' : 'world';
    const a = worldLikeBlock(loc, primary)[key];
    const b = worldLikeBlock(loc, secondary)[key];
    if (worldFieldHasContent(a)) return a;
    if (worldFieldHasContent(b)) return b;
    return undefined;
}
