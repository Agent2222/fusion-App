/**
 * Program application deadline + payment-plan month math (program public page).
 */

import { findApplicationDeadlineDateFromKeyDates } from './programApplicationFormContext.js';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {string} s
 * @returns {string[]}
 */
export function splitTextLinesForBullets(s) {
    if (!s || typeof s !== 'string') return [];
    return s
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
}

/**
 * @param {string} text
 * @param {string} [defaultCurrency] 'USD' | 'JPY' | 'UNKNOWN'
 * @returns {{ amount: number, defaultCurrency: string } | null}
 * amount: major units (dollars / yen) for display math, not always integer for USD.
 */
export function parseLooseCurrencyToNumber(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    let s = t.replace(/[\s\u00a0,，]/g, '');
    s = s.replace(/USD/gi, '');
    s = s.replace(/円/g, '');
    s = s.replace(/[¥$]/g, '');
    s = s.replace(/[^\d.]/g, '');
    const n = parseFloat(s);
    if (!Number.isFinite(n) || n <= 0) return null;
    const raw = t;
    let def = 'UNKNOWN';
    if (/[¥]|[円]/.test(raw) || (raw.includes('円') && !raw.includes('$'))) def = 'JPY';
    else if (raw.includes('$') || /\bUSD\b/i.test(raw)) def = 'USD';
    return { amount: n, defaultCurrency: def };
}

/**
 * @param {string} raw
 * @returns {Date | null} deadline end-of local day (approx)
 */
function parseDateFromIsoOrDisplay(raw) {
    const t = String(raw || '').trim();
    if (!t) return null;
    if (ISO_RE.test(t)) {
        const d = new Date(`${t}T23:59:59`);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const ms = Date.parse(t);
    if (!Number.isNaN(ms)) {
        return new Date(ms);
    }
    return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} programPage
 * @param {string} [programYear]
 * @returns {Date | null}
 */
export function resolveProgramApplicationDeadlineDate(programPage, programYear) {
    const pp = programPage && typeof programPage === 'object' ? programPage : {};
    const af =
        pp.applicationForm && typeof pp.applicationForm === 'object'
            ? /** @type {Record<string, unknown>} */ (pp.applicationForm)
            : {};
    const details =
        pp.programDetails && typeof pp.programDetails === 'object'
            ? /** @type {Record<string, unknown>} */ (pp.programDetails)
            : {};
    const keyDates = Array.isArray(details.keyDates) ? details.keyDates : [];
    const year = String(programYear ?? '').trim();

    const iso = String(af.applicationDeadlineIso ?? '').trim();
    if (iso && ISO_RE.test(iso)) {
        const d = parseDateFromIsoOrDisplay(iso);
        if (d) return d;
    }

    let deadline = String(af.applicationDeadlineDisplay ?? '').trim();
    if (!deadline) {
        deadline = findApplicationDeadlineDateFromKeyDates(keyDates);
        if (deadline && year && !deadline.includes(year)) {
            deadline = `${deadline}, ${year}`;
        }
    }
    if (!deadline) return null;
    return parseDateFromIsoOrDisplay(deadline);
}

/**
 * Whole calendar months from the start of "today" (local) to `deadline` (inclusive enough for payment options).
 * If deadline is not after today, returns 0.
 * @param {Date} now - typically `new Date()` (or inject for tests)
 * @param {Date} deadline
 * @returns {number} integer >= 0, max option count for 1..M
 */
export function countCalendarMonthsFromNowToDeadline(now, deadline) {
    if (!deadline || !now || Number.isNaN(deadline.getTime()) || Number.isNaN(now.getTime())) return 0;
    if (deadline.getTime() <= now.getTime()) return 0;
    const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const b = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (b.getDate() < a.getDate()) months -= 1;
    if (months < 1) {
        return 1;
    }
    return months;
}

/**
 * @param {string} remainingText
 * @param {number} months
 * @returns {string}
 */
export function formatMonthlyFromRemainingAndMonths(remainingText, months) {
    const t = String(remainingText || '').trim();
    const m = Math.max(1, Math.floor(months));
    const p = parseLooseCurrencyToNumber(t);
    if (!p) return '—';
    const per = p.amount / m;
    if (p.defaultCurrency === 'JPY' || t.includes('円') || t.includes('¥')) {
        return `¥${Math.round(per).toLocaleString()}`;
    }
    if (p.defaultCurrency === 'USD' || t.includes('$')) {
        return `$${per < 1 ? per.toFixed(2) : per.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
    }
    return per % 1 === 0 ? String(Math.round(per)) : per.toFixed(2);
}
