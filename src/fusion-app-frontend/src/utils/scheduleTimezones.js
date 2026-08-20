/**
 * Shared schedule timezone preference (Studio Schedule + member Calendar).
 */

export const SCHEDULE_TZ_STORAGE_KEY = 'fusion.schedule.timezone';

/** @type {{ id: string, label: string, short: string }[]} */
export const SCHEDULE_TIMEZONES = [
    { id: 'America/Los_Angeles', label: 'Pacific', short: 'PT' },
    { id: 'America/New_York', label: 'Eastern', short: 'ET' },
    { id: 'America/Chicago', label: 'Central', short: 'CT' },
    { id: 'Etc/GMT', label: 'GMT', short: 'GMT' },
    { id: 'Asia/Tokyo', label: 'Japan', short: 'JST' },
];

const DEFAULT_TZ = 'America/New_York';

/**
 * @param {string} [raw]
 * @returns {string}
 */
export function normalizeScheduleTimezoneId(raw) {
    const t = String(raw || '').trim();
    if (SCHEDULE_TIMEZONES.some((z) => z.id === t)) return t;
    // Legacy stored labels from V1 fixtures
    if (/new york|edt|est|eastern/i.test(t)) return 'America/New_York';
    if (/los angeles|pdt|pst|pacific/i.test(t)) return 'America/Los_Angeles';
    if (/chicago|cdt|cst|central/i.test(t)) return 'America/Chicago';
    if (/tokyo|jst|japan/i.test(t)) return 'Asia/Tokyo';
    if (/^gmt$|etc\/gmt|utc/i.test(t)) return 'Etc/GMT';
    return DEFAULT_TZ;
}

/**
 * @returns {string} IANA id
 */
export function getScheduleTimezonePreference() {
    try {
        return normalizeScheduleTimezoneId(localStorage.getItem(SCHEDULE_TZ_STORAGE_KEY) || DEFAULT_TZ);
    } catch {
        return DEFAULT_TZ;
    }
}

/**
 * @param {string} id
 */
export function setScheduleTimezonePreference(id) {
    const next = normalizeScheduleTimezoneId(id);
    try {
        localStorage.setItem(SCHEDULE_TZ_STORAGE_KEY, next);
    } catch {
        /* ignore */
    }
    return next;
}

/**
 * @param {string} [id]
 */
export function scheduleTimezoneMeta(id) {
    const tid = normalizeScheduleTimezoneId(id || getScheduleTimezonePreference());
    return SCHEDULE_TIMEZONES.find((z) => z.id === tid) || SCHEDULE_TIMEZONES[1];
}

/**
 * Display label for toolbar / buttons, e.g. "Eastern · ET"
 * @param {string} [id]
 */
export function scheduleTimezoneButtonLabel(id) {
    const z = scheduleTimezoneMeta(id);
    return `${z.label} · ${z.short}`;
}

/**
 * Format instant (ISO, Motoko ns text, or Date) as mm/dd/yy HH:mm (24h) in zone.
 * @param {string | number | Date | null | undefined} value
 * @param {string} [zoneId]
 */
export function formatScheduleLastUpdated(value, zoneId) {
    const zone = normalizeScheduleTimezoneId(zoneId || getScheduleTimezonePreference());
    const d = coerceScheduleDate(value);
    if (!d) return '—';
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: zone,
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(d);
        const get = (type) => parts.find((p) => p.type === type)?.value || '';
        return `${get('month')}/${get('day')}/${get('year')} ${get('hour')}:${get('minute')}`;
    } catch {
        return '—';
    }
}

/**
 * Max updatedAt among events → formatted last-updated string.
 * @param {{ updatedAt?: string }[]} events
 * @param {string} [zoneId]
 */
export function formatNewestScheduleUpdated(events, zoneId) {
    let best = null;
    for (const e of events || []) {
        const d = coerceScheduleDate(e?.updatedAt);
        if (!d) continue;
        if (!best || d > best) best = d;
    }
    return formatScheduleLastUpdated(best, zoneId);
}

/**
 * @param {string | number | Date | null | undefined} value
 * @returns {Date | null}
 */
export function coerceScheduleDate(value) {
    if (value == null || value === '') return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        // Motoko Time.now() is nanoseconds
        const ms = value > 1e15 ? value / 1e6 : value > 1e12 ? value / 1e3 : value;
        const d = new Date(ms);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const s = String(value).trim();
    if (/^\d+$/.test(s)) {
        const n = Number(s);
        const ms = n > 1e15 ? n / 1e6 : n > 1e12 ? n / 1e3 : n;
        const d = new Date(ms);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Build ICS datetime in the preference zone (floating local wall time for that zone).
 * @param {string} ymd
 * @param {string} hhmm
 * @param {string} [zoneId]
 */
export function scheduleIcsLocalStamp(ymd, hhmm, zoneId) {
    const zone = normalizeScheduleTimezoneId(zoneId || getScheduleTimezonePreference());
    const [y, m, d] = String(ymd || '').split('-').map(Number);
    const [hh, mm] = String(hhmm || '00:00').split(':').map(Number);
    // Interpret wall clock in zone via format parts offset trick:
    // Create a UTC guess then adjust by zone offset for that instant.
    const guess = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0));
    const asInZone = new Date(
        guess.toLocaleString('en-US', { timeZone: zone }),
    );
    const asUtc = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' }));
    const offset = asUtc.getTime() - asInZone.getTime();
    const local = new Date(guess.getTime() + offset);
    const pad = (n) => String(n).padStart(2, '0');
    return `${local.getUTCFullYear()}${pad(local.getUTCMonth() + 1)}${pad(local.getUTCDate())}T${pad(local.getUTCHours())}${pad(local.getUTCMinutes())}00`;
}

/**
 * Escape text for ICS VALUE.
 * @param {string} text
 */
export function icsEscape(text) {
    return String(text || '')
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}

/**
 * @param {object} draft
 * @param {string} [zoneId]
 */
export function buildSingleEventIcs(draft, zoneId) {
    const zone = normalizeScheduleTimezoneId(zoneId || getScheduleTimezonePreference());
    const start = scheduleIcsLocalStamp(draft.date, draft.allDay ? '00:00' : draft.startTime || '09:00', zone);
    const end = scheduleIcsLocalStamp(draft.date, draft.allDay ? '23:59' : draft.endTime || '10:00', zone);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
    const uid = `${draft.id || 'fusion-event'}@fusionart.world`;
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Fusion//Schedule//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=${zone}:${start}`,
        `DTEND;TZID=${zone}:${end}`,
        `SUMMARY:${icsEscape(draft.title || 'Event')}`,
        `LOCATION:${icsEscape(draft.locationName || '')}`,
        `DESCRIPTION:${icsEscape(draft.notes || '')}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}

/**
 * @param {object[]} events
 * @param {string} [zoneId]
 * @param {string} [calendarName]
 */
export function buildMultiEventIcs(events, zoneId, calendarName = 'Fusion Program Calendar') {
    const zone = normalizeScheduleTimezoneId(zoneId || getScheduleTimezonePreference());
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Fusion//Schedule//EN',
        'CALSCALE:GREGORIAN',
        `X-WR-CALNAME:${icsEscape(calendarName)}`,
    ];
    for (const draft of events || []) {
        const start = scheduleIcsLocalStamp(draft.date, draft.allDay ? '00:00' : draft.startTime || '09:00', zone);
        const end = scheduleIcsLocalStamp(draft.date, draft.allDay ? '23:59' : draft.endTime || '10:00', zone);
        const uid = `${draft.id || `fusion-${start}`}@fusionart.world`;
        lines.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${stamp}`,
            `DTSTART;TZID=${zone}:${start}`,
            `DTEND;TZID=${zone}:${end}`,
            `SUMMARY:${icsEscape(draft.title || 'Event')}`,
            `LOCATION:${icsEscape(draft.locationName || '')}`,
            `DESCRIPTION:${icsEscape(draft.notes || '')}`,
            'END:VEVENT',
        );
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

/**
 * @param {string} icsBody
 * @param {string} filename
 */
export function downloadIcsFile(icsBody, filename) {
    const blob = new Blob([icsBody], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Open a compact Studio modal to pick timezone; resolves with selected IANA id or null if cancelled.
 * @param {(html: string, opts?: object) => { close: Function, root: HTMLElement }} openStudioModal
 * @param {{ title?: string, currentId?: string }} [opts]
 * @returns {Promise<string | null>}
 */
export function openScheduleTimezonePicker(openStudioModal, opts = {}) {
    const current = normalizeScheduleTimezoneId(opts.currentId || getScheduleTimezonePreference());
    const radios = SCHEDULE_TIMEZONES.map(
        (z) => `<label class="studio-tz-option" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e5e1df;border-radius:8px;cursor:pointer;background:${z.id === current ? '#f3f1ef' : '#fff'}">
      <input type="radio" name="schedule-tz" value="${z.id}" ${z.id === current ? 'checked' : ''} />
      <span style="display:flex;flex-direction:column;gap:2px">
        <strong style="font-size:13px;color:#111827">${z.label}</strong>
        <span style="font-size:11px;color:#706d69">${z.id} · ${z.short}</span>
      </span>
    </label>`,
    ).join('');
    const body = `
      <div style="display:grid;gap:8px;padding:4px 0 12px">${radios}</div>
      <div class="studio-modal-actions" style="margin-top:1rem;display:flex;gap:0.5rem;justify-content:flex-end;flex-wrap:wrap">
        <button type="button" class="studio-btn-ghost" data-tz-cancel>Cancel</button>
        <button type="button" class="studio-btn-primary" data-tz-save>Use timezone</button>
      </div>`;
    return new Promise((resolve) => {
        const { close, root } = openStudioModal(body, {
            title: opts.title || 'Timezone',
            compact: true,
        });
        const finish = (value) => {
            close();
            resolve(value);
        };
        root.querySelector('[data-tz-cancel]')?.addEventListener('click', () => finish(null));
        root.querySelector('[data-tz-save]')?.addEventListener('click', () => {
            const checked = root.querySelector('input[name="schedule-tz"]:checked');
            const id = checked instanceof HTMLInputElement ? checked.value : current;
            setScheduleTimezonePreference(id);
            finish(id);
        });
    });
}

/** Relation kinds stored on events (Studio required). */
export const SCHEDULE_RELATION_KINDS = [
    { id: 'global', label: 'Global' },
    { id: 'staff', label: 'Staff' },
    { id: 'artists', label: 'Artists' },
    { id: 'collector', label: 'Collector' },
    { id: 'curator', label: 'Curator' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'program', label: 'Program' },
];

/**
 * @param {string} [raw]
 */
export function normalizeScheduleRelationKind(raw) {
    const t = String(raw || '').trim();
    return SCHEDULE_RELATION_KINDS.some((k) => k.id === t) ? t : '';
}
