/**
 * Formats program card `startDate` / `endDate` / `year` for the program detail sidebar
 * (full month + day + year; supports EN month names and JA 月/日).
 */

/**
 * @param {Record<string, unknown> | null | undefined} run — merged program card (`current`)
 * @param {string} locale
 * @returns {{ start: string, end: string } | null}
 */
export function buildProgramRunSidebarDateLines(run, locale) {
    if (!run || typeof run !== 'object') return null;
    const y = String(run.year ?? '').trim();
    const s = String(run.startDate ?? '').trim();
    const e = String(run.endDate ?? '').trim();
    if (!s && !e) return null;
    if (locale === 'ja') {
        return { start: formatJaStart(s, y), end: formatJaEnd(s, e, y) };
    }
    return { start: formatEnLine(s, y, true), end: formatEnLine(e, y, false, s) };
}

/**
 * @param {string} s
 * @param {string} y
 * @param {boolean} isStart
 * @param {string} [startRef] — for end-only day token
 * @returns {string}
 */
function formatEnLine(s, y, isStart, startRef) {
    if (!s) return '';
    if (/\b(19|20)\d{2}\b/.test(s) || /,\s*\d{4}\s*$/.test(s)) {
        return s;
    }
    if (y) {
        if (isStart || /[A-Za-z]/.test(s) || s.includes('/')) {
            if (/^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Oct|Nov|Dec)\b/i.test(s) || s.includes(' ')) {
                return `${s}, ${y}`;
            }
        }
    }
    if (!isStart && /^\d{1,2}$/.test(s) && startRef) {
        const month = startRef.match(
            /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Oct|Nov|Dec)/i
        );
        if (month) {
            return y ? `${month[1]} ${s}, ${y}` : `${month[1]} ${s}`;
        }
    }
    if (y) {
        if (!/\b(19|20)\d{2}\b/.test(s)) {
            if (s.includes('–') || s.toLowerCase().includes('through') || s.toLowerCase().includes(' to ')) {
                return s;
            }
        }
    }
    return s;
}

/**
 * @param {string} s
 * @param {string} y
 */
function formatJaStart(s, y) {
    if (!s) return '';
    if (/\b(19|20)\d{2}年|^(19|20)\d{2}年/.test(s) || s.includes('年') && /20\d{2}/.test(s)) {
        return s;
    }
    if (y && s.includes('月') && s.includes('日') && !/^年/.test(s)) {
        return `${y}年${s}`;
    }
    return s;
}

/**
 * @param {string} s — start
 * @param {string} e
 * @param {string} y
 */
function formatJaEnd(s, e, y) {
    if (!e) return '';
    if (/\b(19|20)\d{2}年/.test(e) || /^20\d{2}年/.test(e)) {
        return e;
    }
    if (y) {
        if (e.includes('月') && e.includes('日')) {
            if (!/^年/.test(e) && !/^20\d{2}年/.test(e)) {
                return `${y}年${e}`;
            }
        }
    }
    if (y && /^\d+日$/.test(e) && s.includes('月')) {
        const m = s.match(/(\d+月)/);
        if (m) {
            return `${y}年${m[1]}${e}`;
        }
    }
    if (y && s.includes('日') && !e.includes('月')) {
        return `${y}年${e}`;
    }
    if (y && e && !e.includes('年')) {
        return `${y}年${e}`;
    }
    return e;
}
