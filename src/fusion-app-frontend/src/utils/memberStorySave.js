/**
 * Story & World save: merge the editor's two columns plus the per-section publish
 * choice into a locales object.
 *
 * Both `world` (artist's words) and `worldNew` (AI version) stay per language: the
 * editor only ever shows one language, so the active language takes the typed AI
 * copy while the other language keeps what it already had. The publish choice is a
 * single map shared by both languages (`locales.worldSourceByField`).
 */
import { localeBlock } from './memberProfileForm.js';
import { normalizeWorldSourceByField, worldFieldHasContent } from './worldPublicPick.js';

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function cloneValue(value) {
    try {
        return JSON.parse(JSON.stringify(value ?? null));
    } catch {
        return value;
    }
}

/**
 * True when a `worldNew` block has at least one usable text unit (LLM refusal text
 * and placeholder junk count as empty, matching what the public page renders).
 * @param {unknown} worldNew
 * @returns {boolean}
 */
export function worldNewBlockHasContent(worldNew) {
    if (!worldNew || typeof worldNew !== 'object' || Array.isArray(worldNew)) return false;
    return Object.values(/** @type {Record<string, unknown>} */ (worldNew)).some((v) =>
        worldFieldHasContent(v),
    );
}

/**
 * @param {Record<string, unknown>} out - locales object being built (mutated)
 * @param {Record<string, unknown> | null | undefined} prev - currently stored locales
 * @param {{
 *   active?: 'en' | 'ja',
 *   story?: {
 *     worldNew?: Record<string, unknown>,
 *     worldSourceByField?: Record<string, unknown>,
 *   },
 * }} [options]
 * @returns {Record<string, unknown>}
 */
export function applyStorySaveToLocales(out, prev, options = {}) {
    if (!out || typeof out !== 'object') return out;
    const story = options.story && typeof options.story === 'object' ? options.story : null;
    const activeCode = options.active === 'ja' ? 'ja' : 'en';
    for (const code of ['en', 'ja']) {
        const prevWorldNew = localeBlock(prev, code).worldNew;
        /** @type {Record<string, unknown> | null} */
        let nextWorldNew =
            prevWorldNew && typeof prevWorldNew === 'object' && !Array.isArray(prevWorldNew)
                ? /** @type {Record<string, unknown>} */ (cloneValue(prevWorldNew))
                : null;
        if (
            code === activeCode &&
            story &&
            story.worldNew &&
            typeof story.worldNew === 'object' &&
            !Array.isArray(story.worldNew)
        ) {
            nextWorldNew = /** @type {Record<string, unknown>} */ (cloneValue(story.worldNew));
        }
        const block = localeBlock(out, code);
        if (worldNewBlockHasContent(nextWorldNew)) {
            block.worldNew = /** @type {Record<string, unknown>} */ (nextWorldNew);
        } else {
            delete block.worldNew;
        }
        out[code] = block;
    }
    const fieldPicks = normalizeWorldSourceByField(story ? story.worldSourceByField : null);
    if (Object.keys(fieldPicks).length) out.worldSourceByField = fieldPicks;
    return out;
}
