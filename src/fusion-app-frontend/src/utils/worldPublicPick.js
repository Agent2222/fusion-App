/**
 * Public profile: choose between artist `world` and LLM `worldNew` per field using `publicWorldSource`.
 * World is the default; New World must be explicitly selected after generated copy exists.
 */

/** @typedef {'newWorld' | 'world'} PublicWorldSource */

export const PUBLIC_WORLD_SOURCE_DEFAULT = /** @type {const} */ ('world');

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
            } else if (String(item ?? '').trim()) return true;
        }
        return false;
    }
    return String(v).trim() !== '';
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
 * @returns {PublicWorldSource}
 */
export function getPublicWorldSourceFromLocales(locales) {
    if (!locales || typeof locales !== 'object') return PUBLIC_WORLD_SOURCE_DEFAULT;
    const raw = /** @type {Record<string, unknown>} */ (locales).publicWorldSource;
    if (raw === 'newWorld') return 'newWorld';
    return PUBLIC_WORLD_SOURCE_DEFAULT;
}

/**
 * Prefer `world` or `worldNew` first (per `publicWorldSource`), then the other if the preferred field is empty.
 * @param {Record<string, unknown> | null | undefined} loc
 * @param {string} key
 * @param {PublicWorldSource} [publicWorldSource]
 * @returns {unknown}
 */
export function pickPublicWorldField(loc, key, publicWorldSource = PUBLIC_WORLD_SOURCE_DEFAULT) {
    const primary = publicWorldSource === 'world' ? 'world' : 'worldNew';
    const secondary = primary === 'world' ? 'worldNew' : 'world';
    const a = worldLikeBlock(loc, primary)[key];
    const b = worldLikeBlock(loc, secondary)[key];
    if (worldFieldHasContent(a)) return a;
    if (worldFieldHasContent(b)) return b;
    return undefined;
}

const WORLD_NEW_TEXT_KEYS = ['practice', 'perspective', 'vision', 'constructing', 'context', 'quote'];

/**
 * True when there is no usable AI world copy yet (post-save auto-gen should run).
 * @param {Record<string, unknown> | null | undefined} locales
 */
export function needsInitialWorldNew(locales) {
    if (!locales || typeof locales !== 'object') return true;
    for (const code of ['en', 'ja']) {
        const loc = /** @type {Record<string, unknown>} */ (locales)[code];
        if (!loc || typeof loc !== 'object' || Array.isArray(loc)) continue;
        const wn = worldLikeBlock(loc, 'worldNew');
        for (const k of WORLD_NEW_TEXT_KEYS) {
            if (worldFieldHasContent(wn[k])) return false;
        }
    }
    return true;
}
