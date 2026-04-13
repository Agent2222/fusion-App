/**
 * Normalizes `locales.*.world` text fields that may be string or string[] in seed data.
 * @see docs/profile-schema.md
 */

const WORLD_ARRAY_KEYS = ['perspective', 'vision', 'constructing', 'context'];

/**
 * Turn a polymorphic world text field into paragraph strings for UI.
 * @param {unknown} raw
 * @returns {string[]}
 */
export function worldTextToParagraphs(raw) {
    if (raw == null || raw === '') return [];
    if (Array.isArray(raw)) return raw.map((x) => String(x)).filter(Boolean);
    return [String(raw)];
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
