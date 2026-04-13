/**
 * Walk `testData`-like trees for Studio coverage verification (Vitest / scripts).
 * Bundled webpack assets appear as objects; we emit a single path with kind `assetModule`.
 */

/**
 * @param {unknown} value
 * @param {string} prefix
 * @returns {{ path: string, kind: string }[]}
 */
export function enumerateJsonPaths(value, prefix = '') {
    /** @type {{ path: string, kind: string }[]} */
    const out = [];

    if (value === null || value === undefined) {
        if (prefix) out.push({ path: prefix, kind: 'nullish' });
        return out;
    }

    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') {
        if (prefix) out.push({ path: prefix, kind: t });
        return out;
    }

    if (t !== 'object') {
        if (prefix) out.push({ path: prefix, kind: t });
        return out;
    }

    if (Array.isArray(value)) {
        value.forEach((item, i) => {
            const p = prefix ? `${prefix}.${i}` : String(i);
            out.push(...enumerateJsonPaths(item, p));
        });
        return out;
    }

    const o = /** @type {Record<string, unknown>} */ (value);
    if (typeof o.default === 'string' && (Object.keys(o).length <= 3 || o.__esModule != null)) {
        if (prefix) out.push({ path: prefix, kind: 'assetModule' });
        return out;
    }

    for (const k of Object.keys(o)) {
        const p = prefix ? `${prefix}.${k}` : k;
        out.push(...enumerateJsonPaths(o[k], p));
    }
    return out;
}

/**
 * @param {string} path
 * @param {string[]} prefixes
 */
export function pathMatchesAnyPrefix(path, prefixes) {
    for (const pre of prefixes) {
        if (path === pre || path.startsWith(`${pre}.`)) return true;
    }
    return false;
}
