/**
 * Group flattened CMS string rows into EN/JA pairs for side-by-side Studio editing.
 * Supports `en.*` / `ja.*` at the root and nested `....en....` / `....ja....` segments (e.g. join-network-flow).
 */

/**
 * @param {string} path
 * @returns {string | null} canonical key, or null if path has no en/ja locale segment
 */
export function localePairKey(path) {
    if (path.startsWith('en.')) {
        return `@:${path.slice(3)}`;
    }
    if (path.startsWith('ja.')) {
        return `@:${path.slice(3)}`;
    }
    const i = path.indexOf('.en.');
    if (i >= 0) {
        return `${path.slice(0, i)}.@:${path.slice(i + 4)}`;
    }
    const j = path.indexOf('.ja.');
    if (j >= 0) {
        return `${path.slice(0, j)}.@:${path.slice(j + 4)}`;
    }
    return null;
}

/**
 * @param {string} path
 * @returns {'en' | 'ja' | null}
 */
export function pathLocaleSide(path) {
    if (path.startsWith('en.')) return 'en';
    if (path.startsWith('ja.')) return 'ja';
    if (path.includes('.en.')) return 'en';
    if (path.includes('.ja.')) return 'ja';
    return null;
}

/**
 * @param {{ path: string, label: string, value: string }[]} rows
 * @returns {Array<
 *   | { type: 'pair'; key: string; en: (typeof rows)[0]; ja: (typeof rows)[0] }
 *   | { type: 'single'; row: (typeof rows)[0] }
 * >}
 */
export function groupLocaleContentRows(rows) {
    /** @type {Map<string, { en?: (typeof rows)[0]; ja?: (typeof rows)[0] }>} */
    const m = new Map();
    /** @type {(typeof rows)[0][]} */
    const singles = [];

    for (const r of rows) {
        const key = localePairKey(r.path);
        const side = pathLocaleSide(r.path);
        if (!key || !side) {
            singles.push(r);
            continue;
        }
        let slot = m.get(key);
        if (!slot) {
            slot = {};
            m.set(key, slot);
        }
        if (side === 'en') {
            slot.en = r;
        } else {
            slot.ja = r;
        }
    }

    /** @type {Array<{ type: 'pair'; key: string; en: (typeof rows)[0]; ja: (typeof rows)[0] } | { type: 'single'; row: (typeof rows)[0] }>} */
    const out = [];
    for (const [, slot] of m) {
        if (slot.en && slot.ja) {
            out.push({
                type: 'pair',
                key: localePairKey(slot.en.path) || '',
                en: slot.en,
                ja: slot.ja,
            });
        } else if (slot.en) {
            out.push({ type: 'single', row: slot.en });
        } else if (slot.ja) {
            out.push({ type: 'single', row: slot.ja });
        }
    }
    for (const r of singles) {
        out.push({ type: 'single', row: r });
    }

    out.sort((a, b) => {
        const pa = a.type === 'pair' ? a.en.path : a.row.path;
        const pb = b.type === 'pair' ? b.en.path : b.row.path;
        return pa.localeCompare(pb);
    });
    return out;
}
