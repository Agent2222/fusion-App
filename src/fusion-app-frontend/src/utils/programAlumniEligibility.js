/**
 * Whether an enrolled program should show the public "Program Alumni" banner.
 * Uses canister `studioStatus` and locale card `startDate` / `year`.
 */
import { mergeLocaleDeep } from './localeFallback.js';

/** Artist `programs[]` slugs may differ from `allPrograms.programs.en[].id`. */
export const PROGRAM_ID_ALIASES = {
    'fusion-residency-2025': 'fusionKaga',
};

/**
 * @param {string} programId
 * @param {Record<string, unknown> | null | undefined} block
 * @returns {{ program: Record<string, unknown>, loc: Record<string, unknown> } | null}
 */
export function resolveProgramCardFromBlock(programId, block) {
    if (programId == null || programId === '') return null;
    const id = PROGRAM_ID_ALIASES[programId] || programId;
    const programs = block?.programs;
    const enList =
        programs && typeof programs === 'object'
            ? /** @type {Record<string, unknown>} */ (programs).en
            : null;
    const jaList =
        programs && typeof programs === 'object'
            ? /** @type {Record<string, unknown>} */ (programs).ja
            : null;
    if (!Array.isArray(enList)) return null;
    const idx = enList.findIndex((p) => p && String(p.id) === String(id));
    if (idx < 0) return null;
    const enCard = enList[idx];
    const jaCard = Array.isArray(jaList) && jaList[idx] && typeof jaList[idx] === 'object' ? jaList[idx] : {};
    const locale =
        typeof window !== 'undefined' &&
        typeof window.getLocale === 'function' &&
        window.getLocale() === 'ja'
            ? 'ja'
            : 'en';
    const program =
        locale === 'ja'
            ? /** @type {Record<string, unknown>} */ (mergeLocaleDeep(enCard, jaCard))
            : /** @type {Record<string, unknown>} */ (enCard);
    return { program, loc: program };
}

/**
 * @param {string} startDate
 * @param {string} year
 * @returns {Date | null}
 */
export function parseProgramStartDate(startDate, year) {
    const s = String(startDate ?? '').trim();
    if (!s) return null;
    let y = String(year ?? '').trim();
    if (!y) {
        const ym = s.match(/\b(19|20)\d{2}\b/);
        if (ym) y = ym[0];
    }
    if (/月/.test(s)) {
        const m = s.match(/(\d{1,2})月(\d{1,2})日/);
        if (m && y) {
            const d = new Date(Number(y), Number(m[1]) - 1, Number(m[2]));
            return Number.isNaN(d.getTime()) ? null : d;
        }
    }
    if (/\b(19|20)\d{2}\b/.test(s) || /,\s*\d{4}\s*$/.test(s)) {
        const parsed = Date.parse(s);
        if (!Number.isNaN(parsed)) return new Date(parsed);
    }
    if (y) {
        const parsed = Date.parse(`${s}, ${y}`);
        if (!Number.isNaN(parsed)) return new Date(parsed);
    }
    const parsed = Date.parse(s);
    return Number.isNaN(parsed) ? null : new Date(parsed);
}

/**
 * @param {Record<string, unknown> | null | undefined} programCard
 * @returns {boolean | null} true = started, false = future, null = unknown
 */
export function programHasStartedByDate(programCard) {
    if (!programCard || typeof programCard !== 'object') return null;
    const startDate = String(
        programCard.startDate ?? programCard.start ?? programCard.programStart ?? '',
    ).trim();
    if (!startDate) return null;
    const year = String(programCard.year ?? '').trim();
    const d = parseProgramStartDate(startDate, year);
    if (!d || Number.isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    return start.getTime() <= today.getTime();
}

/**
 * @param {Record<string, unknown> | null | undefined} programCard
 * @returns {boolean}
 */
export function programQualifiesForAlumniBanner(programCard) {
    if (!programCard || typeof programCard !== 'object') return true;

    const status = String(programCard.studioStatus ?? '')
        .trim()
        .toLowerCase();
    if (status === 'completed' || status === 'active') return true;
    if (status === 'comingup') return false;

    const startedByDate = programHasStartedByDate(programCard);
    if (startedByDate === true) return true;
    if (startedByDate === false) return false;

    if (status === 'open' || status === 'full') return false;

    return true;
}

/**
 * @param {string[]} programIds
 * @param {Record<string, unknown> | null | undefined} block
 * @returns {string[]}
 */
export function filterProgramIdsForAlumniBanner(programIds, block) {
    if (!Array.isArray(programIds) || !programIds.length) return [];
    return programIds.filter((programId) => {
        const resolved = resolveProgramCardFromBlock(programId, block);
        if (!resolved) return true;
        return programQualifiesForAlumniBanner(resolved.program);
    });
}
