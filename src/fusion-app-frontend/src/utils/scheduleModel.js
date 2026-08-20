/**
 * Studio Schedule — calendar helpers (Mon-start month matrix, overlaps, formatting).
 */

import { scheduleTimezoneButtonLabel } from './scheduleTimezones.js';

/** @typedef {'draft' | 'awaiting_confirmation' | 'confirmed' | 'cancelled'} CalendarEventStatus */
/** @typedef {'sage' | 'blue' | 'sand' | 'blush'} CalendarEventColor */

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

/** @type {Record<CalendarEventColor, string>} */
export const SCHEDULE_DOT_HEX = {
    sage: '#6da57a',
    blue: '#4d91ca',
    sand: '#c68109',
    blush: '#8c343c',
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
