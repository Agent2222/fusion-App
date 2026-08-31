/**
 * Next-send math for scheduled tasks (UTC ISO + IANA time zone).
 */

const LOCK_MS = 10 * 60 * 1000;
const MAX_TASKS_PER_TICK = 10;

/**
 * @param {string} timeZone
 * @param {number} utcMs
 */
function tzOffsetMs(timeZone, utcMs) {
    const tz = String(timeZone || 'Asia/Tokyo').trim() || 'Asia/Tokyo';
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
    const asUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
    );
    return asUtc - utcMs;
}

/**
 * @param {string} localYmdHm YYYY-MM-DDTHH:mm
 * @param {string} timeZone
 */
export function localDateTimeToUtcIso(localYmdHm, timeZone) {
    const raw = String(localYmdHm || '').trim();
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return '';
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const h = Number(m[4]);
    const mi = Number(m[5]);
    const asIfUtc = Date.UTC(y, mo - 1, d, h, mi);
    let utcMs = asIfUtc - tzOffsetMs(timeZone, asIfUtc);
    utcMs = asIfUtc - tzOffsetMs(timeZone, utcMs);
    return new Date(utcMs).toISOString();
}

/**
 * @param {string} isoUtc
 * @param {string} timeZone
 */
export function utcIsoToLocalDateTime(isoUtc, timeZone) {
    const ms = Date.parse(isoUtc);
    if (!Number.isFinite(ms)) return '';
    const tz = String(timeZone || 'Asia/Tokyo').trim() || 'Asia/Tokyo';
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * @param {string} isoUtc
 * @param {string} timeZone
 * @param {number} days
 */
export function addDaysToUtcIsoInZone(isoUtc, timeZone, days) {
    const local = utcIsoToLocalDateTime(isoUtc, timeZone);
    const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!m) return '';
    const utcNoon = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0);
    const next = new Date(utcNoon + Number(days) * 86400000);
    const y = next.getUTCFullYear();
    const mo = String(next.getUTCMonth() + 1).padStart(2, '0');
    const d = String(next.getUTCDate()).padStart(2, '0');
    return localDateTimeToUtcIso(`${y}-${mo}-${d}T${m[4]}:${m[5]}`, timeZone);
}

/**
 * @param {string} nextRunAtIso
 * @param {string | number | Date} [now]
 */
export function isScheduledTaskDue(nextRunAtIso, now = Date.now()) {
    const next = Date.parse(nextRunAtIso);
    const n = typeof now === 'number' ? now : Date.parse(String(now)) || Date.now();
    return Number.isFinite(next) && next <= n;
}

/**
 * @param {string} lockedUntilIso
 * @param {string | number | Date} [now]
 */
export function isScheduledTaskLocked(lockedUntilIso, now = Date.now()) {
    const lock = Date.parse(lockedUntilIso);
    if (!Number.isFinite(lock)) return false;
    const n = typeof now === 'number' ? now : Date.parse(String(now)) || Date.now();
    return lock > n;
}

/**
 * @param {object} task
 * @param {string | number | Date} [now]
 */
export function isScheduledTaskRunnable(task, now = Date.now()) {
    if (!task || !task.enabled) return false;
    if (isScheduledTaskLocked(task.lockedUntilIso, now)) return false;
    if (isAfterRepeatEnd(task, task.nextRunAtIso)) return false;
    return isScheduledTaskDue(task.nextRunAtIso, now);
}

/**
 * @param {object} task
 */
export function parseScheduledTaskWindow(task) {
    const storedEnd = String(task?.endsAtLocal || '').trim();
    const raw = String(task?.firstRunLocal || '').trim();
    const tilde = raw.indexOf('~');
    const start = tilde >= 0 ? raw.slice(0, tilde) : raw;
    const encodedEnd = tilde >= 0 ? raw.slice(tilde + 1).trim() : '';
    return {
        firstRunLocal: start,
        endsAtLocal: storedEnd || encodedEnd,
    };
}

/**
 * @param {string} startLocal
 * @param {string} [endLocal]
 */
export function encodeScheduledTaskWindow(startLocal, endLocal) {
    const start = String(startLocal || '').trim();
    const end = String(endLocal || '').trim();
    return end ? `${start}~${end}` : start;
}

/**
 * @param {unknown} raw
 */
export function normalizeAnnounceDay(raw) {
    const t = String(raw || '')
        .trim()
        .toLowerCase();
    if (t === 'tomorrow') return 'tomorrow';
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    return 'today';
}

/**
 * @param {string} announceDay
 * @param {string} timeZone
 * @param {string | number | Date} [now]
 */
export function resolveAnnounceDayYmd(announceDay, timeZone, now = Date.now()) {
    const key = normalizeAnnounceDay(announceDay);
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
    const n = typeof now === 'number' ? now : Date.parse(String(now)) || Date.now();
    const local = utcIsoToLocalDateTime(new Date(n).toISOString(), timeZone);
    const today = local.slice(0, 10);
    if (key === 'tomorrow') {
        const next = addDaysToUtcIsoInZone(new Date(n).toISOString(), timeZone, 1);
        return utcIsoToLocalDateTime(next, timeZone).slice(0, 10);
    }
    return today;
}

/**
 * @param {object} task
 * @param {string} nextRunAtIso
 */
export function isAfterRepeatEnd(task, nextRunAtIso) {
    const { endsAtLocal } = parseScheduledTaskWindow(task);
    if (!endsAtLocal) return false;
    const tz = String(task?.timezone || 'Asia/Tokyo').trim() || 'Asia/Tokyo';
    const endIso = localDateTimeToUtcIso(endsAtLocal, tz);
    if (!endIso) return false;
    return String(nextRunAtIso || '') > endIso;
}

/**
 * @param {object} task
 * @param {string} [finishedAtIso]
 */
export function nextRunAfterComplete(task, finishedAtIso) {
    const tz = String(task?.timezone || 'Asia/Tokyo').trim() || 'Asia/Tokyo';
    const repeat = String(task?.repeat || 'once').trim();
    let nextRunAtIso = String(task?.nextRunAtIso || finishedAtIso || '');
    let enabled = false;
    if (repeat === 'daily') {
        enabled = true;
        nextRunAtIso = addDaysToUtcIsoInZone(task.nextRunAtIso || finishedAtIso, tz, 1);
    } else if (repeat === 'weekly') {
        enabled = true;
        nextRunAtIso = addDaysToUtcIsoInZone(task.nextRunAtIso || finishedAtIso, tz, 7);
    }
    if (enabled && isAfterRepeatEnd(task, nextRunAtIso)) {
        return { enabled: false, nextRunAtIso };
    }
    return { enabled, nextRunAtIso };
}

/**
 * @param {string | number | Date} [now]
 */
export function lockWindowIso(now = Date.now()) {
    const n = typeof now === 'number' ? now : Date.parse(String(now)) || Date.now();
    return {
        nowIso: new Date(n).toISOString(),
        lockUntilIso: new Date(n + LOCK_MS).toISOString(),
    };
}

export { LOCK_MS, MAX_TASKS_PER_TICK };
