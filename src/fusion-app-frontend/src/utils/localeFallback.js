/**
 * Deep merge for locale pairs: Japanese (or any secondary) overlays English only where
 * the secondary value is "present". Empty strings, null, empty arrays/objects count as
 * missing so English is kept — avoids blank copy and missing asset URLs when JA is partial.
 */

/**
 * @param {unknown} v
 * @returns {boolean}
 */
export function isEmptyLocaleValue(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string') return !v.trim();
    if (typeof v === 'boolean' || typeof v === 'number') return false;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'object') return Object.keys(/** @type {object} */ (v)).length === 0;
    return false;
}

/**
 * @template T
 * @param {T} v
 * @returns {T}
 */
function clone(v) {
    if (v === null || typeof v !== 'object') return v;
    try {
        return /** @type {T} */ (structuredClone(v));
    } catch {
        try {
            return /** @type {T} */ (JSON.parse(JSON.stringify(v)));
        } catch {
            return v;
        }
    }
}

/**
 * Deep-merge `secondary` over `primary`: secondary wins only for non-empty values.
 * Use for EN primary + JA secondary when the active locale is Japanese.
 *
 * @param {unknown} primary - typically English
 * @param {unknown} secondary - typically Japanese (may be partial)
 * @returns {unknown}
 */
export function mergeLocaleDeep(primary, secondary) {
    if (isEmptyLocaleValue(secondary)) return clone(primary);
    if (isEmptyLocaleValue(primary)) return clone(secondary);

    if (Array.isArray(primary) && Array.isArray(secondary)) {
        const len = Math.max(primary.length, secondary.length);
        /** @type {unknown[]} */
        const out = [];
        for (let i = 0; i < len; i++) {
            out.push(mergeLocaleDeep(primary[i], secondary[i]));
        }
        return out;
    }

    if (
        typeof primary === 'object' &&
        typeof secondary === 'object' &&
        primary !== null &&
        secondary !== null &&
        !Array.isArray(primary) &&
        !Array.isArray(secondary)
    ) {
        const p = /** @type {Record<string, unknown>} */ (primary);
        const s = /** @type {Record<string, unknown>} */ (secondary);
        /** @type {Record<string, unknown>} */
        const out = { ...p };
        for (const k of Object.keys(s)) {
            out[k] = mergeLocaleDeep(p[k], s[k]);
        }
        for (const k of Object.keys(p)) {
            if (!(k in s)) out[k] = p[k];
        }
        return out;
    }

    return isEmptyLocaleValue(secondary) ? clone(primary) : clone(secondary);
}

/**
 * First non-empty string among arguments (trimmed).
 * @param {...unknown} parts
 * @returns {string}
 */
export function firstNonEmptyString(...parts) {
    for (const p of parts) {
        if (typeof p === 'string' && p.trim()) return p;
    }
    return '';
}
