/**
 * Whether an enrolled program should show the public "Program Alumni" banner.
 * Uses canister `studioStatus` and locale card `startDate` / `year`.
 */
import { mergeLocaleDeep } from './localeFallback.js';

/** Artist `programs[]` slugs may differ from `allPrograms.programs.en[].id`. */
export const PROGRAM_ID_ALIASES = {
    'fusion-residency-2025': 'fusionKaga',
    Tokyo2026: 'fusionTokyo2026',
    tokyo2026: 'fusionTokyo2026',
    'Kaga 2026': 'fusionKaga',
    'kaga 2026': 'fusionKaga',
    'Fusion Kaga 2026': 'fusionKaga',
};

/** @param {string} id */
export function normalizeProgramId(id) {
    const s = String(id ?? '').trim();
    if (!s) return '';
    if (PROGRAM_ID_ALIASES[s]) return PROGRAM_ID_ALIASES[s];
    const lower = s.toLowerCase();
    for (const [alias, target] of Object.entries(PROGRAM_ID_ALIASES)) {
        if (alias.toLowerCase() === lower) return target;
    }
    return s;
}

/**
 * @param {string} token
 * @param {string} year
 * @returns {Date | null}
 */
function parseSlashMdYDate(token, year) {
    const m = String(token ?? '')
        .trim()
        .match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (!m) return null;
    let y = m[3] ? Number(m[3]) : Number(year);
    if (!Number.isFinite(y)) return null;
    if (m[3] && m[3].length === 2) y += 2000;
    const month = Number(m[1]);
    const day = Number(m[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(y, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
}

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
    const slashStart = parseSlashMdYDate(s, y);
    if (slashStart) return slashStart;
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
 * @param {string} endDate
 * @param {string} startDate
 * @param {string} year
 * @returns {Date | null}
 */
export function parseProgramEndDate(endDate, startDate, year) {
    const e = String(endDate ?? '').trim();
    if (!e) return null;
    const y = String(year ?? '').trim();
    const s = String(startDate ?? '').trim();

    if (/月/.test(e)) {
        const m = e.match(/(\d{1,2})月(\d{1,2})日/);
        if (m && y) {
            const d = new Date(Number(y), Number(m[1]) - 1, Number(m[2]));
            return Number.isNaN(d.getTime()) ? null : d;
        }
    }

    if (/^\d+日$/.test(e) && /月/.test(s)) {
        const startMatch = s.match(/(\d{1,2})月/);
        const endDay = e.match(/(\d+)/);
        if (startMatch && endDay && y) {
            const d = new Date(Number(y), Number(startMatch[1]) - 1, Number(endDay[1]));
            return Number.isNaN(d.getTime()) ? null : d;
        }
    }

    const slashEnd = parseSlashMdYDate(e, y);
    if (slashEnd) return slashEnd;

    if (/^\d{1,2}$/.test(e) && s) {
        const start = parseProgramStartDate(s, y);
        if (start && !Number.isNaN(start.getTime())) {
            const end = new Date(start);
            end.setDate(Number(e));
            return end;
        }
    }

    if (/\b(19|20)\d{2}\b/.test(e) || /,\s*\d{4}\s*$/.test(e)) {
        const parsed = Date.parse(e);
        if (!Number.isNaN(parsed)) return new Date(parsed);
    }

    if (y && /^\d{1,2}$/.test(e) && s) {
        const monthMatch = s.match(
            /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Oct|Nov|Dec)\b/i,
        );
        if (monthMatch) {
            const parsed = Date.parse(`${monthMatch[1]} ${e}, ${y}`);
            if (!Number.isNaN(parsed)) return new Date(parsed);
        }
    }

    if (y) {
        const parsed = Date.parse(`${e}, ${y}`);
        if (!Number.isNaN(parsed)) return new Date(parsed);
    }

    const parsed = Date.parse(e);
    return Number.isNaN(parsed) ? null : new Date(parsed);
}

/**
 * Program has not started yet (hide from alumni table).
 * @param {Record<string, unknown> | null | undefined} programCard
 * @returns {boolean}
 */
export function programIsUpcomingForAlumniTable(programCard) {
    if (!programCard || typeof programCard !== 'object') return false;
    const startDate = String(
        programCard.startDate ?? programCard.start ?? programCard.programStart ?? '',
    ).trim();
    if (!startDate) return false;
    const year = String(programCard.year ?? '').trim();
    const start = parseProgramStartDate(startDate, year);
    if (!start || Number.isNaN(start.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    return s.getTime() > today.getTime();
}

/**
 * Past/completed program runs eligible for the public alumni table.
 * Uses start/end dates first; upcoming = start still in the future.
 * @param {Record<string, unknown> | null | undefined} programCard
 * @returns {boolean}
 */
export function programQualifiesForAlumniTable(programCard) {
    if (!programCard || typeof programCard !== 'object') return false;
    if (programIsUpcomingForAlumniTable(programCard)) return false;

    const startDate = String(
        programCard.startDate ?? programCard.start ?? programCard.programStart ?? '',
    ).trim();
    const endDate = String(
        programCard.endDate ?? programCard.end ?? programCard.programEnd ?? '',
    ).trim();
    const year = String(programCard.year ?? '').trim();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = startDate ? parseProgramStartDate(startDate, year) : null;
    if (start && !Number.isNaN(start.getTime())) {
        const s = new Date(start);
        s.setHours(0, 0, 0, 0);
        if (s.getTime() > today.getTime()) return false;
    }

    if (endDate) {
        const end = parseProgramEndDate(endDate, startDate, year);
        if (end && !Number.isNaN(end.getTime())) {
            const e = new Date(end);
            e.setHours(0, 0, 0, 0);
            if (e.getTime() <= today.getTime()) return true;
            if (start && !Number.isNaN(start.getTime())) {
                const residencyEnd = new Date(start);
                residencyEnd.setDate(residencyEnd.getDate() + 28);
                residencyEnd.setHours(0, 0, 0, 0);
                if (residencyEnd.getTime() <= today.getTime()) return true;
            }
            return false;
        }
    }

    const started = programHasStartedByDate(programCard);
    if (started === true && !endDate) return true;

    const status = String(programCard.studioStatus ?? '')
        .trim()
        .toLowerCase();
    if (status === 'completed' || status === 'active') return true;

    return false;
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
