/**
 * Studio Schedule — calendar helpers (Mon-start month matrix, overlaps, formatting).
 */

import { scheduleTimezoneButtonLabel } from './scheduleTimezones.js';

/** @typedef {'draft' | 'awaiting_confirmation' | 'confirmed' | 'cancelled'} CalendarEventStatus */
/** @typedef {string} CalendarEventColor */
/** @typedef {'optional' | 'suggested' | 'general'} ScheduleEventImportance */

export const SCHEDULE_INK_LIGHT = '#ffffff';
export const SCHEDULE_INK_DARK = '#111827';

/**
 * @param {unknown} hex
 */
function parseHexRgb(hex) {
    const raw = String(hex || '')
        .trim()
        .replace(/^#/, '');
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
    const n = Number.parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Relative luminance (WCAG 2).
 * @param {{ r: number, g: number, b: number }} rgb
 */
function relativeLuminance(rgb) {
    const channel = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/**
 * Pick light or dark text so the label stays readable on a category color.
 * @param {unknown} hex
 */
export function scheduleInkOnHex(hex) {
    const rgb = parseHexRgb(hex);
    if (!rgb) return SCHEDULE_INK_DARK;
    const L = relativeLuminance(rgb);
    const contrastWhite = (1.0 + 0.05) / (L + 0.05);
    const contrastBlack = (L + 0.05) / (0.05);
    return contrastWhite >= contrastBlack ? SCHEDULE_INK_LIGHT : SCHEDULE_INK_DARK;
}

/**
 * Schedule event categories — stored in the existing `color` field.
 * Hex values follow the staff category color sheet. Ink is computed for contrast.
 * @type {ReadonlyArray<{ id: string, label: string, hex: string, ink: string }>}
 */
export const SCHEDULE_EVENT_CATEGORIES = [
    { id: 'traveling', label: 'Traveling', hex: '#f4c2c8' },
    { id: 'creating', label: 'Creating', hex: '#cfe8d6' },
    { id: 'exploration', label: 'Exploration', hex: '#f3e6c0' },
    { id: 'setup', label: 'Setup / clean up', hex: '#9caf88' },
    { id: 'flights', label: 'Flights', hex: '#c5dff8' },
    { id: 'presentations', label: 'Misc presentations', hex: '#4a72c4' },
    { id: 'meals', label: 'Meals', hex: '#e0b322' },
    { id: 'external', label: 'External event', hex: '#ffe14a' },
    { id: 'workshop', label: 'Workshop / onsen event', hex: '#2ec8c8' },
    { id: 'filming', label: 'Filming', hex: '#8ef04a' },
    { id: 'tours', label: 'Tours', hex: '#ff8a1a' },
].map((c) => ({ ...c, ink: scheduleInkOnHex(c.hex) }));

/**
 * CSS variables for a calendar chip (defeats global `button { color: white }`).
 * @param {unknown} raw
 */
export function scheduleChipCssVars(raw) {
    const meta = scheduleCategoryMeta(raw);
    return `--chip-bg:${meta.hex};--chip-ink:${meta.ink}`;
}

const LEGACY_SCHEDULE_COLOR_TO_CATEGORY = {
    sage: 'setup',
    blue: 'flights',
    sand: 'exploration',
    blush: 'traveling',
};

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeScheduleColor(raw) {
    const t = String(raw || '')
        .trim()
        .toLowerCase();
    if (LEGACY_SCHEDULE_COLOR_TO_CATEGORY[t]) return LEGACY_SCHEDULE_COLOR_TO_CATEGORY[t];
    if (SCHEDULE_EVENT_CATEGORIES.some((c) => c.id === t)) return t;
    return 'creating';
}

/**
 * @param {unknown} raw
 */
export function scheduleCategoryMeta(raw) {
    const id = normalizeScheduleColor(raw);
    return SCHEDULE_EVENT_CATEGORIES.find((c) => c.id === id) || SCHEDULE_EVENT_CATEGORIES[1];
}

/**
 * @typedef {{ id: string, name: string, avatarUrl?: string, initials?: string }} CalendarPerson
 */

/**
 * @typedef {{
 *   eventId: string,
 *   eventTitle: string,
 *   overlapMinutes: number,
 *   startTime: string,
 *   endTime: string,
 * }} EventConflict
 */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   date: string,
 *   startTime: string,
 *   endTime: string,
 *   allDay?: boolean,
 *   timezone: string,
 *   programId: string,
 *   programName: string,
 *   team: string,
 *   locationId: string,
 *   locationName: string,
 *   assignedStaff: CalendarPerson[],
 *   participantIds: string[],
 *   participantCount: number,
 *   notes: string,
 *   reminderMinutes: number | null,
 *   reminderSentAt?: string,
 *   status: CalendarEventStatus,
 *   color: CalendarEventColor,
 *   relationKind?: string,
 *   relationProgramId?: string,
 *   eventKind?: 'standard' | 'workshop' | 'adventure',
 *   imageUrl?: string,
 *   publicOnSite?: boolean,
 *   importance?: ScheduleEventImportance,
 *   costCents?: number,
 *   costCurrency?: 'USD' | 'JPY' | string,
 *   costTba?: boolean,
 *   acceptRsvp?: boolean,
 *   availability?: number,
 *   rsvpIds?: string[],
 *   rsvpCount?: number,
 *   myRsvp?: boolean,
 *   createdBy?: string,
 *   conflicts: EventConflict[],
 *   createdAt: string,
 *   updatedAt: string,
 *   version: number,
 *   activity?: { id: string, at: string, text: string }[],
 * }} CalendarEvent
 */

/** @deprecated Prefer scheduleTimezoneButtonLabel() — kept for fixtures/legacy defaults. */
export const SCHEDULE_TIMEZONE_LABEL = scheduleTimezoneButtonLabel();
export const SCHEDULE_FIXTURE_TODAY = '2026-08-12';

/** @type {Record<string, string>} */
export const SCHEDULE_DOT_HEX = {
    ...Object.fromEntries(SCHEDULE_EVENT_CATEGORIES.map((c) => [c.id, c.hex])),
    sage: '#9caf88',
    blue: '#c5dff8',
    sand: '#f3e6c0',
    blush: '#f4c2c8',
};

/**
 * @param {string} ymd
 * @returns {{ y: number, m: number, d: number }}
 */
export function parseYmd(ymd) {
    const [y, m, d] = String(ymd || '')
        .split('-')
        .map((n) => Number(n));
    return { y: y || 2026, m: m || 1, d: d || 1 };
}

/**
 * @param {number} y
 * @param {number} m 1-12
 * @param {number} d
 */
export function toYmd(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * @param {string} ymd
 * @param {number} deltaDays
 */
export function addDaysYmd(ymd, deltaDays) {
    const { y, m, d } = parseYmd(ymd);
    const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
    return toYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * Monday-start weekday index 0..6
 * @param {number} y
 * @param {number} m
 * @param {number} d
 */
export function weekdayMon0(y, m, d) {
    const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return (js + 6) % 7;
}

/**
 * @param {number} year
 * @param {number} month 1-12
 * @returns {{ date: string, inMonth: boolean, day: number }[]}
 */
export function buildMonthCells(year, month) {
    const firstDow = weekdayMon0(year, month, 1);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevDays = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
    /** @type {{ date: string, inMonth: boolean, day: number }[]} */
    const cells = [];
    for (let i = 0; i < firstDow; i += 1) {
        const day = prevDays - firstDow + i + 1;
        cells.push({ date: toYmd(prevYear, prevMonth, day), inMonth: false, day });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push({ date: toYmd(year, month, day), inMonth: true, day });
    }
    let nextDay = 1;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    while (cells.length % 7 !== 0 || cells.length < 42) {
        cells.push({ date: toYmd(nextYear, nextMonth, nextDay), inMonth: false, day: nextDay });
        nextDay += 1;
        if (cells.length >= 42) break;
    }
    return cells;
}

/**
 * @param {string} hhmm "09:00" or ""
 */
export function timeToMinutes(hhmm) {
    const s = String(hhmm || '').trim();
    if (!s) return 0;
    const [h, m] = s.split(':').map((n) => Number(n));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/**
 * @param {number} mins
 */
export function minutesToHhmm(mins) {
    const m = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * @param {CalendarEvent} ev
 */
export function eventDurationLabel(ev) {
    if (ev.allDay) return 'All day';
    const mins = Math.max(0, timeToMinutes(ev.endTime) - timeToMinutes(ev.startTime));
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * @param {string} hhmm
 */
export function formatTime12(hhmm) {
    const mins = timeToMinutes(hhmm);
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const ap = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

/**
 * @param {CalendarEvent} ev
 */
export function formatTimeRange(ev) {
    if (ev.allDay) return 'All day';
    return `${formatTime12(ev.startTime)} – ${formatTime12(ev.endTime)}`;
}

/**
 * @param {string} ymd
 */
export function formatLongDate(ymd) {
    const { y, m, d } = parseYmd(ymd);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

/**
 * @param {string} ymd
 */
export function formatAgendaHeading(ymd) {
    const { y, m, d } = parseYmd(ymd);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const weekday = dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    return `Today · ${weekday} ${d}`;
}

/**
 * @param {number} year
 * @param {number} month
 */
export function formatMonthYear(year, month) {
    const dt = new Date(Date.UTC(year, month - 1, 1));
    return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * @param {CalendarEvent} a
 * @param {CalendarEvent} b
 */
export function eventsOverlap(a, b) {
    if (a.date !== b.date) return false;
    if (a.id === b.id) return false;
    if (a.allDay || b.allDay) return a.date === b.date;
    const a0 = timeToMinutes(a.startTime);
    const a1 = timeToMinutes(a.endTime);
    const b0 = timeToMinutes(b.startTime);
    const b1 = timeToMinutes(b.endTime);
    return a0 < b1 && b0 < a1;
}

/**
 * @param {CalendarEvent} a
 * @param {CalendarEvent} b
 */
export function overlapMinutes(a, b) {
    if (!eventsOverlap(a, b)) return 0;
    if (a.allDay || b.allDay) return 60;
    const a0 = timeToMinutes(a.startTime);
    const a1 = timeToMinutes(a.endTime);
    const b0 = timeToMinutes(b.startTime);
    const b1 = timeToMinutes(b.endTime);
    return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

/**
 * Mutates events' conflicts arrays from pairwise overlaps.
 * @param {CalendarEvent[]} events
 * @returns {CalendarEvent[]}
 */
export function applyConflicts(events) {
    const list = events.map((e) => ({ ...e, conflicts: /** @type {EventConflict[]} */ ([]) }));
    for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
            const a = list[i];
            const b = list[j];
            const mins = overlapMinutes(a, b);
            if (mins <= 0) continue;
            a.conflicts.push({
                eventId: b.id,
                eventTitle: b.title,
                overlapMinutes: mins,
                startTime: b.startTime,
                endTime: b.endTime,
            });
            b.conflicts.push({
                eventId: a.id,
                eventTitle: a.title,
                overlapMinutes: mins,
                startTime: a.startTime,
                endTime: a.endTime,
            });
        }
    }
    return list;
}

/**
 * @param {string} name
 */
export function initialsFromName(name) {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

/**
 * @param {CalendarEventStatus} status
 */
export function statusLabel(status) {
    if (status === 'awaiting_confirmation') return 'Awaiting confirmation';
    if (status === 'confirmed') return 'Confirmed';
    if (status === 'cancelled') return 'Cancelled';
    return 'Draft';
}

/**
 * @param {unknown} raw
 * @returns {ScheduleEventImportance}
 */
export function normalizeScheduleImportance(raw) {
    const t = String(raw || '')
        .trim()
        .toLowerCase();
    if (t === 'optional' || t === 'suggested' || t === 'general') return t;
    return 'general';
}

/**
 * @param {ScheduleEventImportance | string} importance
 */
export function scheduleImportanceLabel(importance) {
    const v = normalizeScheduleImportance(importance);
    if (v === 'optional') return 'Optional';
    if (v === 'suggested') return 'Suggested';
    return 'General';
}

/**
 * @param {unknown} raw
 * @param {boolean} [acceptRsvp]
 * @returns {number}
 */
export function clampScheduleAvailability(raw, acceptRsvp = true) {
    if (!acceptRsvp) return 0;
    const n = Math.round(Number(raw) || 0);
    if (!Number.isFinite(n) || n <= 0) return 20;
    return Math.min(200, Math.max(1, n));
}

/**
 * @param {ScheduleEventImportance | string} importance
 */
export function scheduleImportancePillClass(importance) {
    return `event-dialog__importance event-dialog__importance--${normalizeScheduleImportance(importance)}`;
}

/**
 * Optional event cost in minor units. 0 / invalid = no priced amount.
 * USD = cents; JPY = yen.
 * @param {unknown} raw
 * @returns {number}
 */
export function normalizeScheduleEventCostCents(raw) {
    const n = Math.round(Number(raw) || 0);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(n, 10_000_000);
}

/** @type {ReadonlyArray<{ value: 'USD' | 'JPY', symbol: string, label: string }>} */
export const SCHEDULE_EVENT_COST_CURRENCIES = Object.freeze([
    { value: 'USD', symbol: '$', label: '$' },
    { value: 'JPY', symbol: '¥', label: '¥' },
]);

/**
 * @param {unknown} raw
 * @returns {'USD' | 'JPY'}
 */
export function normalizeScheduleEventCostCurrency(raw) {
    const s = String(raw || '')
        .trim()
        .toUpperCase();
    if (s === 'JPY' || s === 'YEN' || s === '¥' || s === '￥') return 'JPY';
    return 'USD';
}

/**
 * @param {unknown} raw
 */
export function normalizeScheduleEventCostTba(raw) {
    if (raw === true || raw === 1 || raw === '1') return true;
    const s = String(raw ?? '')
        .trim()
        .toLowerCase();
    return s === 'true' || s === 'tba' || s === 'yes';
}

/**
 * @param {unknown} currency
 */
export function scheduleEventCostSymbol(currency) {
    return normalizeScheduleEventCostCurrency(currency) === 'JPY' ? '¥' : '$';
}

/**
 * @param {unknown} raw
 */
export function isScheduleEventCostTbaInput(raw) {
    const s = String(raw ?? '').trim().toLowerCase();
    return !s || s === 'tba';
}

/**
 * Parse an amount field into stored minor units. Empty / TBA / invalid = 0.
 * @param {unknown} raw
 * @param {unknown} [currency]
 * @returns {number}
 */
export function parseScheduleEventCostAmountToMinor(raw, currency) {
    if (isScheduleEventCostTbaInput(raw)) return 0;
    const s = String(raw ?? '')
        .trim()
        .replace(/[$,¥￥,\s]/g, '');
    if (!s) return 0;
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (normalizeScheduleEventCostCurrency(currency) === 'JPY') {
        return normalizeScheduleEventCostCents(Math.round(n));
    }
    return normalizeScheduleEventCostCents(Math.round(n * 100));
}

/**
 * Parse a USD field (`25`, `$25.00`) into cents. Empty / invalid = 0.
 * @param {unknown} raw
 * @returns {number}
 */
export function parseScheduleEventCostUsdToCents(raw) {
    return parseScheduleEventCostAmountToMinor(raw, 'USD');
}

/**
 * @param {unknown} costCents
 * @param {unknown} [currency]
 */
export function formatScheduleEventCostInputValue(costCents, currency) {
    const cents = normalizeScheduleEventCostCents(costCents);
    if (!cents) return '';
    if (normalizeScheduleEventCostCurrency(currency) === 'JPY') return String(cents);
    const dollars = cents / 100;
    return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

/**
 * @param {unknown} costCentsOrEvent
 * @param {unknown} [currency]
 * @param {unknown} [tba]
 * @returns {string} `TBA`, `$25`, `¥3000`, or empty when no cost
 */
export function formatScheduleEventCostLabel(costCentsOrEvent, currency, tba) {
    let centsRaw = costCentsOrEvent;
    let currencyRaw = currency;
    let tbaRaw = tba;
    if (costCentsOrEvent && typeof costCentsOrEvent === 'object' && !Array.isArray(costCentsOrEvent)) {
        const ev = /** @type {Record<string, unknown>} */ (costCentsOrEvent);
        centsRaw = ev.costCents;
        currencyRaw = ev.costCurrency ?? currency;
        tbaRaw = ev.costTba ?? ev.tba ?? tba;
    }
    if (normalizeScheduleEventCostTba(tbaRaw)) return 'TBA';
    const cents = normalizeScheduleEventCostCents(centsRaw);
    if (!cents) return '';
    const cur = normalizeScheduleEventCostCurrency(currencyRaw);
    if (cur === 'JPY') return `¥${cents}`;
    const dollars = cents / 100;
    const text = Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
    return `$${text}`;
}

/**
 * @param {unknown} costCents
 * @param {unknown} [tba]
 */
export function scheduleEventShowsCost(costCents, tba) {
    return normalizeScheduleEventCostTba(tba) || normalizeScheduleEventCostCents(costCents) > 0;
}

/**
 * View/edit people section label: RSVP events list RSVPs instead of assigned artists.
 * @param {boolean} acceptRsvp
 */
export function scheduleEventPeopleLabel(acceptRsvp) {
    return acceptRsvp ? 'RSVPs' : 'Artists';
}

/**
 * @param {unknown} count
 * @param {unknown} availability
 */
export function scheduleEventRsvpCountLabel(count, availability) {
    const n = Math.max(0, Math.round(Number(count) || 0));
    const cap = clampScheduleAvailability(availability, true);
    return `${n} / ${cap} RSVP${n === 1 ? '' : 's'}`;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeScheduleRsvpIds(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    const seen = new Set();
    for (const item of raw) {
        const id = String(item || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

/**
 * ISO week bounds (Mon–Sun) containing ymd.
 * @param {string} ymd
 */
export function weekRangeContaining(ymd) {
    const { y, m, d } = parseYmd(ymd);
    const dow = weekdayMon0(y, m, d);
    const start = addDaysYmd(ymd, -dow);
    const end = addDaysYmd(start, 6);
    return { start, end };
}

/**
 * @param {string} ymd
 * @param {string} start
 * @param {string} end
 */
export function ymdInRange(ymd, start, end) {
    return ymd >= start && ymd <= end;
}

/** Fixture event ids from retired `staffSeedScheduleDemoIfEmpty`. Do not match by program id. */
export const SEEDED_DEMO_SCHEDULE_EVENT_IDS = new Set([
    'evt-kaga-arrival',
    'evt-studio-orient-early',
    'evt-open-studios-10',
    'evt-gallery-10a',
    'evt-mentor-10b',
    'evt-mentor-12',
    'evt-orient-12',
    'evt-gallery-12',
    'evt-open-12',
    'evt-sync-12',
    'evt-dinner-12',
    'evt-tokyo-14',
    'evt-gallery-15',
    'evt-dinner-18',
    'evt-install-22',
    'evt-mentor-25',
    'evt-open-28',
]);

/**
 * True only for leftover demo-seed rows. Staff-created events (even if they used old
 * demo program ids like prog-kaga) must never match.
 * @param {any} row
 */
export function isSeededDemoScheduleEvent(row) {
    const id = String(row?.id || '').trim();
    const createdBy = String(row?.createdBy || '').trim();
    if (createdBy === 'seed') return true;
    return SEEDED_DEMO_SCHEDULE_EVENT_IDS.has(id);
}

/**
 * Motoko `jsonText` historically only escaped `\\` and `"`.
 * Event notes with real newlines then fail `JSON.parse` with
 * "Bad control character in string literal".
 * Escape raw control characters that appear inside JSON string literals.
 * @param {string} raw
 * @returns {string}
 */
export function escapeControlCharsInJsonStrings(raw) {
    const s = String(raw ?? '');
    let out = '';
    let inString = false;
    let escaped = false;
    for (let i = 0; i < s.length; i += 1) {
        const ch = s[i];
        const code = s.charCodeAt(i);
        if (escaped) {
            out += ch;
            escaped = false;
            continue;
        }
        if (inString && ch === '\\') {
            out += ch;
            escaped = true;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            out += ch;
            continue;
        }
        if (inString && code < 0x20) {
            if (code === 0x0a) out += '\\n';
            else if (code === 0x0d) out += '\\r';
            else if (code === 0x09) out += '\\t';
            else out += `\\u${code.toString(16).padStart(4, '0')}`;
            continue;
        }
        out += ch;
    }
    return out;
}

/**
 * Parse canister JSON text, repairing unescaped control characters in strings.
 * @param {unknown} raw
 */
export function parseCanisterJsonText(raw) {
    if (typeof raw !== 'string') return raw;
    try {
        return JSON.parse(raw);
    } catch (first) {
        try {
            return JSON.parse(escapeControlCharsInJsonStrings(raw));
        } catch {
            throw first;
        }
    }
}

/**
 * Unwrap IC replica / Candid trap text so Studio can show a short save/load reason.
 * @param {unknown} err
 */
export function formatScheduleCanisterError(err) {
    const raw = String(err && typeof err === 'object' && 'message' in err ? err.message : err || '').trim();
    if (!raw) return 'Schedule request failed';
    const reject = raw.match(/Reject text:\s*([^\n]+)/i);
    const trap = raw.match(/trapped explicitly:\s*([^\n]+)/i);
    const text = String(reject?.[1] || trap?.[1] || raw)
        .trim()
        .split('\n')[0]
        .trim();
    if (/unauthorized/i.test(text)) {
        return 'You must be signed in as staff or admin to load or change the schedule.';
    }
    if (/not editable/i.test(text)) {
        return 'You do not have permission to edit Schedule. Ask an admin to enable Schedule edit under Permissions.';
    }
    if (/not visible/i.test(text)) {
        return 'You do not have permission to view Schedule.';
    }
    if (/version conflict/i.test(text)) return 'version conflict';
    if (/Bad control character|JSON at position/i.test(text)) {
        return 'Schedule data could not be read because an event note contains a line break. Refresh after deploy, or edit that event’s notes.';
    }
    return text;
}
