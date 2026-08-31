/**
 * Studio Schedule — client cache synced to Motoko via database.js.
 */
import {
    deleteScheduleEventStudio,
    deleteScheduleLocationStudio,
    duplicateScheduleEventStudio,
    getApplicants,
    getProgramDisplayNameFromRow,
    getPrograms,
    listScheduleEventsStudio,
    listScheduleLocationsStudio,
    markScheduleReminderSentStudio,
    normalizeProgramVisibility,
    upsertScheduleEventStudio,
    upsertScheduleLocationStudio,
} from './database.js';
import { isScheduleReminderDue, sendScheduleEventReminderEmail } from './scheduleReminderEmail.js';
import {
    SCHEDULE_FIXTURE_TODAY,
    SCHEDULE_TIMEZONE_LABEL,
    applyConflicts,
    initialsFromName,
    normalizeScheduleColor,
    parseYmd,
    toYmd,
    clampScheduleAvailability,
    formatScheduleCanisterError,
    isSeededDemoScheduleEvent,
    normalizeScheduleImportance,
    normalizeScheduleRsvpIds,
    weekRangeContaining,
    ymdInRange,
} from './scheduleModel.js';
import { listFusionScheduleStaff, FUSION_SCHEDULE_STAFF } from './fusionStaffDirectory.js';

export { listFusionScheduleStaff };

/** @typedef {import('./scheduleModel.js').CalendarEvent} CalendarEvent */
/** @typedef {import('./scheduleModel.js').CalendarPerson} CalendarPerson */

/** Sync snapshot of Starr / Zoia / Akari — prefer {@link listFusionScheduleStaff} when picking. */
export const SCHEDULE_STAFF = FUSION_SCHEDULE_STAFF.map((s) => ({ ...s }));

/** @deprecated Dummy catalog removed — programs come from public canister rows. */
export const SCHEDULE_PROGRAMS = [];

export const SCHEDULE_TEAMS = ['Residency', 'Mentors', 'Ops', 'Exhibitions'];

/** @deprecated Dummy location catalog removed — use getScheduleLocations(). */
export const SCHEDULE_LOCATION_DEFAULTS = [];

/** @deprecated Use getScheduleLocations() — kept as alias for gradual migration */
export let SCHEDULE_LOCATIONS = [];

/** @type {CalendarEvent[]} */
let events = [];

/** @type {'idle' | 'loading' | 'ready' | 'error'} */
let loadState = 'idle';

/** @type {string} */
let loadError = '';

/** @type {{ id: string, name: string }[]} */
let programOptions = [];

/** @type {Set<string>} */
let publicProgramIds = new Set();

/** @type {{ id: string, name: string }[]} */
let locationOptions = [];

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
    events = applyConflicts(events.map((e) => ({ ...e, assignedStaff: [...(e.assignedStaff || [])] })));
    for (const fn of listeners) {
        try {
            fn();
        } catch {
            /* ignore */
        }
    }
}

/**
 * @param {any} row
 * @returns {CalendarEvent}
 */
function mapRow(row) {
    const staff = Array.isArray(row.assignedStaff) ? row.assignedStaff : [];
    return {
        id: String(row.id),
        title: String(row.title || ''),
        date: String(row.date || ''),
        startTime: String(row.startTime || '09:00'),
        endTime: String(row.endTime || '10:00'),
        allDay: Boolean(row.allDay),
        timezone: String(row.timezone || SCHEDULE_TIMEZONE_LABEL),
        programId: String(row.programId || ''),
        programName: String(row.programName || ''),
        team: String(row.team || ''),
        locationId: String(row.locationId || ''),
        locationName: String(row.locationName || ''),
        assignedStaff: staff.map((s) => ({
            id: String(s.id || ''),
            name: String(s.name || ''),
            initials: s.initials || initialsFromName(s.name || ''),
            avatarUrl: s.avatarUrl,
        })),
        participantIds: Array.isArray(row.participantIds) ? row.participantIds.map(String) : [],
        participantCount: Number(row.participantCount) || 0,
        notes: String(row.notes || ''),
        reminderMinutes:
            row.reminderMinutes === null || row.reminderMinutes === undefined
                ? null
                : Number(row.reminderMinutes) || null,
        reminderSentAt: String(row.reminderSentAt || '').trim(),
        status: /** @type {CalendarEvent['status']} */ (row.status || 'confirmed'),
        color: /** @type {CalendarEvent['color']} */ (normalizeScheduleColor(row.color)),
        relationKind: String(row.relationKind || 'program'),
        relationProgramId: String(row.relationProgramId || row.programId || ''),
        eventKind: /** @type {CalendarEvent['eventKind']} */ (row.eventKind || 'standard'),
        imageUrl: String(row.imageUrl || '').trim(),
        publicOnSite: Boolean(row.publicOnSite),
        importance: normalizeScheduleImportance(row.importance),
        acceptRsvp: Boolean(row.acceptRsvp),
        availability: clampScheduleAvailability(row.availability, Boolean(row.acceptRsvp)),
        rsvpIds: normalizeScheduleRsvpIds(row.rsvpIds),
        rsvpCount: Math.max(0, Math.round(Number(row.rsvpCount) || 0)) || normalizeScheduleRsvpIds(row.rsvpIds).length,
        myRsvp: Boolean(row.myRsvp),
        createdBy: String(row.createdBy || ''),
        conflicts: [],
        createdAt: String(row.createdAt || ''),
        updatedAt: String(row.updatedAt || ''),
        version: Number(row.version) || 1,
        activity: Array.isArray(row.activity) ? row.activity : [],
    };
}

/**
 * @param {() => void} fn
 */
export function subscribeSchedule(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function getScheduleLoadState() {
    return { state: loadState, error: loadError };
}

/** Last program chosen in Studio Schedule new/edit event modal. */
export const SCHEDULE_PROGRAM_PREF_KEY = 'fusion.schedule.lastProgramId';

/**
 * @returns {string}
 */
export function getScheduleProgramPreference() {
    try {
        const raw = localStorage.getItem(SCHEDULE_PROGRAM_PREF_KEY);
        if (!raw) return '';
        if (raw.startsWith('{')) {
            const parsed = JSON.parse(raw);
            return String(parsed?.id || '').trim();
        }
        return String(raw || '').trim();
    } catch {
        return '';
    }
}

/**
 * @param {string} programId
 * @param {string} [programName]
 */
export function setScheduleProgramPreference(programId, programName = '') {
    const id = String(programId || '').trim();
    if (!id) return '';
    const name = String(programName || '').trim();
    try {
        localStorage.setItem(
            SCHEDULE_PROGRAM_PREF_KEY,
            JSON.stringify({ id, name, at: Date.now() }),
        );
    } catch {
        try {
            localStorage.setItem(SCHEDULE_PROGRAM_PREF_KEY, id);
        } catch {
            /* ignore */
        }
    }
    return id;
}

/**
 * Prefer last-selected public program; fall back to first public option.
 * @param {string} [hintId] optional override (e.g. createDefaults / schedule filter)
 * @returns {{ id: string, name: string }}
 */
export function resolvePreferredScheduleProgram(hintId = '') {
    const programs = getScheduleProgramOptions({ publicOnly: true });
    if (!programs.length) return { id: '', name: '' };
    const hint = String(hintId || '').trim();
    if (hint) {
        const fromHint = programs.find((p) => p.id === hint);
        if (fromHint) return fromHint;
    }
    const remembered = getScheduleProgramPreference();
    if (remembered) {
        const hit = programs.find((p) => p.id === remembered);
        if (hit) return hit;
    }
    return programs[0];
}

/**
 * Programs for filters / modal.
 * @param {{ publicOnly?: boolean }} [opts]
 * @returns {{ id: string, name: string }[]}
 */
export function getScheduleProgramOptions(opts = {}) {
    if (opts.publicOnly) {
        return programOptions.filter((p) => publicProgramIds.has(p.id));
    }
    return programOptions.slice();
}

/**
 * Active schedule locations (from canister catalog).
 * @returns {{ id: string, name: string }[]}
 */
export function getScheduleLocations() {
    return locationOptions.slice();
}

async function refreshProgramOptions() {
    /** @type {Map<string, string>} */
    const byId = new Map();
    /** @type {Set<string>} */
    const publicIds = new Set();
    try {
        const live = await getPrograms();
        if (Array.isArray(live)) {
            for (const p of live) {
                if (normalizeProgramVisibility(p?.visibility) !== 'public') continue;
                const id = String(p?.id || p?.programId || '').trim();
                const name = getProgramDisplayNameFromRow(p) || String(p?.title || p?.name || '').trim();
                if (id && name) {
                    byId.set(id, name);
                    publicIds.add(id);
                }
            }
        }
    } catch {
        /* keep empty / event-backed */
    }
    // Preserve labels for programs already on events (e.g. legacy private) so filters/edit stay usable.
    for (const e of events) {
        if (e.programId && e.programName && !byId.has(e.programId)) {
            byId.set(e.programId, e.programName);
        }
    }
    publicProgramIds = publicIds;
    programOptions = [...byId.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Accepted applicants for a program (participant picker).
 * @param {string} programId
 * @returns {Promise<{ id: string, name: string }[]>}
 */
export async function listScheduleArtistsForProgram(programId) {
    const pid = String(programId || '').trim();
    if (!pid) return [];
    /** @type {Map<string, string>} */
    const byId = new Map();
    try {
        const applicants = await getApplicants();
        for (const a of Array.isArray(applicants) ? applicants : []) {
            if (String(a?.programId || '').trim() !== pid) continue;
            const status = String(a?.status || '')
                .trim()
                .toLowerCase();
            if (status !== 'accepted') continue;
            const appId = String(a?.id || '').trim();
            let artistId = '';
            if (appId.includes('|')) {
                artistId = appId.split('|')[0]?.trim() || '';
            }
            if (!artistId) {
                try {
                    const payload = JSON.parse(String(a?.payloadJson || '{}'));
                    artistId = String(payload?.artistId || payload?.artist_id || '').trim();
                } catch {
                    /* ignore */
                }
            }
            const id = artistId || appId;
            const name = String(a?.fullName || a?.email || id).trim();
            if (id && name && !byId.has(id)) byId.set(id, name);
        }
    } catch {
        return [];
    }
    return [...byId.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load locations from canister only (no dummy seed).
 * If the catalog is empty, create a default "Main Studio" so staff can save events.
 */
export async function loadScheduleLocations() {
    const apply = (rows) => {
        locationOptions = (Array.isArray(rows) ? rows : [])
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));
        SCHEDULE_LOCATIONS = locationOptions;
    };
    apply(await listScheduleLocationsStudio());
    if (!locationOptions.length) {
        try {
            await upsertScheduleLocationStudio({ name: 'Main Studio' });
            apply(await listScheduleLocationsStudio());
        } catch (err) {
            console.warn('[schedule] could not create default location', err);
        }
    }
    notify();
    return getScheduleLocations();
}

/**
 * @param {string} name
 * @param {string} [id]
 */
export async function createOrUpdateScheduleLocation(name, id = '') {
    const newId = await upsertScheduleLocationStudio({ id, name });
    await loadScheduleLocations();
    return String(newId);
}

/**
 * @param {string} id
 */
export async function removeScheduleLocation(id) {
    await deleteScheduleLocationStudio(id);
    await loadScheduleLocations();
}

/**
 * One-shot cleanup of leftover demo-seed rows only (fixed fixture ids / createdBy=seed).
 * Never deletes staff-created events, including ones that reused old demo program ids.
 * @param {any[]} rows
 */
async function purgeSeededDemoScheduleEvents(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const doomed = list.filter(isSeededDemoScheduleEvent);
    if (!doomed.length) return list;
    for (const row of doomed) {
        try {
            await deleteScheduleEventStudio(String(row.id));
        } catch (err) {
            console.warn('[schedule] failed to purge demo event', row?.id, err);
        }
    }
    return listScheduleEventsStudio();
}

/**
 * Load events from canister (no demo seed; purges leftover fixture events).
 * @returns {Promise<CalendarEvent[]>}
 */
export async function loadScheduleEvents() {
    loadState = 'loading';
    loadError = '';
    notify();
    try {
        await loadScheduleLocations();
        let rows = await listScheduleEventsStudio();
        rows = await purgeSeededDemoScheduleEvents(rows);
        events = applyConflicts(rows.map(mapRow));
        await refreshProgramOptions();
        loadState = 'ready';
        notify();
        // Auto-send due reminders once (best-effort; durable cron can replace later).
        queueMicrotask(() => {
            void autoSendDueScheduleReminders();
        });
        return listEvents();
    } catch (err) {
        loadState = 'error';
        loadError = formatScheduleCanisterError(err);
        notify();
        throw err;
    }
}

/**
 * Send reminder emails for an event (staff + artists + info@).
 * @param {string} eventId
 * @param {{ force?: boolean, reload?: boolean }} [opts]
 */
export async function sendEventReminder(eventId, opts = {}) {
    const ev = getEvent(eventId);
    if (!ev) throw new Error('Event not found');
    const result = await sendScheduleEventReminderEmail(ev, { force: Boolean(opts.force) });
    let sentAt = '';
    try {
        sentAt = await markScheduleReminderSentStudio(eventId, result.recipientSummary);
    } catch (err) {
        console.warn('[schedule] mark reminder sent failed', err);
        sentAt = new Date().toISOString();
    }
    if (opts.reload === false) {
        events = events.map((e) =>
            e.id === eventId
                ? {
                      ...e,
                      reminderSentAt: sentAt || e.reminderSentAt || new Date().toISOString(),
                  }
                : e,
        );
        notify();
    } else {
        await loadScheduleEvents();
    }
    return result;
}

/** @type {boolean} */
let autoReminderPassRunning = false;

async function autoSendDueScheduleReminders() {
    if (autoReminderPassRunning) return;
    autoReminderPassRunning = true;
    try {
        const due = listEvents().filter((e) => isScheduleReminderDue(e));
        for (const ev of due) {
            try {
                await sendEventReminder(ev.id, { force: false, reload: false });
            } catch (err) {
                console.warn('[schedule] auto reminder failed', ev.id, err);
            }
        }
    } finally {
        autoReminderPassRunning = false;
    }
}

/**
 * @param {{
 *   programId?: string,
 *   team?: string,
 *   locationId?: string,
 *   query?: string,
 *   month?: string,
 * }} [filters]
 */
export function listEvents(filters = {}) {
    const programId = String(filters.programId || '').trim();
    const team = String(filters.team || '').trim();
    const locationId = String(filters.locationId || '').trim();
    const query = String(filters.query || '')
        .trim()
        .toLowerCase();
    const month = String(filters.month || '').trim();
    return events
        .filter((e) => {
            if (programId && e.programId !== programId) return false;
            if (team && e.team !== team) return false;
            if (locationId && e.locationId !== locationId) return false;
            if (month && !e.date.startsWith(month)) return false;
            if (query) {
                const hay = `${e.title} ${e.locationName} ${e.programName} ${e.notes}`.toLowerCase();
                if (!hay.includes(query)) return false;
            }
            return true;
        })
        .slice()
        .sort((a, b) => {
            const dc = a.date.localeCompare(b.date);
            if (dc !== 0) return dc;
            if (a.allDay && !b.allDay) return -1;
            if (!a.allDay && b.allDay) return 1;
            return String(a.startTime).localeCompare(String(b.startTime));
        });
}

/**
 * @param {string} id
 */
export function getEvent(id) {
    return events.find((e) => e.id === id) || null;
}

/**
 * @param {string} id
 */
export function getActivity(id) {
    const ev = getEvent(id);
    const rows = Array.isArray(ev?.activity) ? ev.activity : [];
    return rows.slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

/**
 * @param {string} ymd
 * @param {ReturnType<typeof listEvents>} [list]
 */
export function eventsForDate(ymd, list) {
    const src = list || listEvents();
    return src.filter((e) => e.date === ymd);
}

/**
 * @param {ReturnType<typeof listEvents>} [list]
 */
export function computeStats(list) {
    const src = list || listEvents();
    const today = scheduleTodayYmd();
    const { start, end } = weekRangeContaining(today);
    const todayCount = src.filter((e) => e.date === today).length;
    const weekCount = src.filter((e) => ymdInRange(e.date, start, end)).length;
    const awaiting = src.filter((e) => e.status === 'awaiting_confirmation').length;
    const conflictIds = new Set();
    for (const e of src) {
        if (e.conflicts?.length) conflictIds.add(e.id);
    }
    return {
        todayCount,
        weekCount,
        awaitingCount: awaiting,
        conflictCount: conflictIds.size,
    };
}

/**
 * @param {ReturnType<typeof listEvents>} [list]
 */
export function computeAttentionItems(list) {
    const src = list || listEvents();
    /** @type {{ id: string, kind: 'conflict' | 'unconfirmed', title: string, detail: string, eventId: string }[]} */
    const items = [];
    const seenPairs = new Set();
    for (const e of src) {
        for (const c of e.conflicts || []) {
            const key = [e.id, c.eventId].sort().join('|');
            if (seenPairs.has(key)) continue;
            seenPairs.add(key);
            items.push({
                id: `att-conflict-${key}`,
                kind: 'conflict',
                title: 'Scheduling conflict',
                detail: `${e.title} overlaps with ${c.eventTitle}.`,
                eventId: e.id,
            });
        }
        if (e.status === 'awaiting_confirmation') {
            const when = e.allDay
                ? `${formatAttentionDate(e.date)} · All day`
                : `${formatAttentionDate(e.date)} · ${e.startTime}`;
            items.push({
                id: `att-unconf-${e.id}`,
                kind: 'unconfirmed',
                title: 'Unconfirmed event',
                detail: `${e.title} / ${when}`,
                eventId: e.id,
            });
        }
    }
    return items;
}

/**
 * @param {string} ymd
 */
function formatAttentionDate(ymd) {
    const { y, m, d } = parseYmd(ymd);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

export function scheduleTodayYmd() {
    const d = new Date();
    return toYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * @param {Partial<CalendarEvent> & { title: string, date: string }} input
 */
function rememberOptimisticEvent(row) {
    const mapped = mapRow(row);
    events = applyConflicts([...events.filter((e) => e.id !== mapped.id), mapped]);
    if (loadState !== 'ready') {
        loadState = 'ready';
        loadError = '';
    }
    notify();
    return getEvent(mapped.id);
}

/**
 * Reload after a successful write. A failed reload must not look like a failed save.
 */
async function reloadAfterWrite() {
    try {
        await loadScheduleEvents();
        return true;
    } catch (err) {
        console.warn('[schedule] reload after write failed', err);
        return false;
    }
}

/**
 * @param {Partial<CalendarEvent> & { title: string, date: string }} input
 */
export async function createEvent(input) {
    const publicPrograms = programOptions.filter((p) => publicProgramIds.has(p.id));
    const program =
        programOptions.find((p) => p.id === input.programId) ||
        publicPrograms[0] ||
        null;
    const locs = getScheduleLocations();
    const location = locs.find((l) => l.id === input.locationId) || locs[0] || null;
    const participantIds = Array.isArray(input.participantIds) ? input.participantIds : [];
    const programId = String(input.programId || program?.id || '').trim();
    if (!programId) {
        throw new Error(
            'Program required — choose a public program (Studio → Programs, set visibility to Public).',
        );
    }
    const locationId = String(input.locationId || location?.id || '').trim();
    if (!locationId) {
        throw new Error('Location required — add one under Manage locations.');
    }
    const payload = {
        id: '',
        expectedVersion: 0,
        title: input.title,
        date: input.date,
        startTime: input.startTime || '09:00',
        endTime: input.endTime || '10:00',
        allDay: Boolean(input.allDay),
        timezone: input.timezone || SCHEDULE_TIMEZONE_LABEL,
        programId,
        programName: input.programName || program?.name || '',
        team: input.team || 'Residency',
        locationId,
        locationName: input.locationName || location?.name || 'Main Studio',
        assignedStaff: input.assignedStaff || [],
        participantIds,
        participantCount: participantIds.length || input.participantCount || 0,
        notes: input.notes || '',
        reminderMinutes: input.reminderMinutes === undefined ? 30 : input.reminderMinutes,
        status: input.status || 'confirmed',
        color: normalizeScheduleColor(input.color),
        relationKind: input.relationKind || 'program',
        relationProgramId:
            input.relationProgramId ||
            (input.relationKind === 'program' || !input.relationKind ? programId : ''),
        eventKind: input.eventKind || 'standard',
        imageUrl: String(input.imageUrl || '').trim(),
        publicOnSite: Boolean(input.publicOnSite),
        importance: normalizeScheduleImportance(input.importance),
        acceptRsvp: Boolean(input.acceptRsvp),
        availability: clampScheduleAvailability(input.availability, Boolean(input.acceptRsvp)),
    };
    const newId = await upsertScheduleEventStudio(payload);
    await reloadAfterWrite();
    const found = getEvent(String(newId));
    if (found) return found;
    return rememberOptimisticEvent({
        ...payload,
        id: String(newId),
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'studio',
    });
}

/**
 * @param {string} id
 * @param {Partial<CalendarEvent>} patch
 */
export async function updateEvent(id, patch) {
    const prev = getEvent(id);
    if (!prev) throw new Error('Event not found');
    const next = { ...prev, ...patch, id: prev.id };
    try {
        await upsertScheduleEventStudio({
            id: prev.id,
            expectedVersion: prev.version,
            title: next.title,
            date: next.date,
            startTime: next.startTime,
            endTime: next.endTime,
            allDay: Boolean(next.allDay),
            timezone: next.timezone || SCHEDULE_TIMEZONE_LABEL,
            programId: next.programId,
            programName: next.programName,
            team: next.team || '',
            locationId: next.locationId,
            locationName: next.locationName,
            assignedStaff: next.assignedStaff || [],
            participantIds: next.participantIds || [],
            participantCount: Array.isArray(next.participantIds)
                ? next.participantIds.length
                : next.participantCount || 0,
            notes: next.notes || '',
            reminderMinutes: next.reminderMinutes,
            status: next.status,
            color: next.color,
            relationKind: next.relationKind || 'program',
            relationProgramId:
                next.relationProgramId ||
                (next.relationKind === 'program' || !next.relationKind ? next.programId : ''),
            eventKind: next.eventKind || 'standard',
            imageUrl: String(next.imageUrl || '').trim(),
            publicOnSite: Boolean(next.publicOnSite),
            importance: normalizeScheduleImportance(next.importance),
            acceptRsvp: Boolean(next.acceptRsvp),
            availability: clampScheduleAvailability(next.availability, Boolean(next.acceptRsvp)),
        });
    } catch (err) {
        const msg = formatScheduleCanisterError(err);
        if (/version conflict/i.test(msg)) {
            const e = new Error('version conflict');
            e.name = 'ScheduleVersionConflict';
            throw e;
        }
        throw new Error(msg);
    }
    await reloadAfterWrite();
    const found = getEvent(id);
    if (found) return found;
    return rememberOptimisticEvent({
        ...next,
        version: Number(prev.version) + 1,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * @param {string} id
 */
export async function deleteEvent(id) {
    await deleteScheduleEventStudio(id);
    events = events.filter((e) => e.id !== id);
    notify();
}

/**
 * @param {string} id
 */
export async function duplicateEvent(id) {
    const newId = await duplicateScheduleEventStudio(id);
    await loadScheduleEvents();
    return getEvent(String(newId));
}

/**
 * @param {number} year
 * @param {number} month
 */
export function monthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * @param {string} key
 */
export function parseMonthKey(key) {
    const [y, m] = String(key || '')
        .split('-')
        .map((n) => Number(n));
    if (!y || !m) {
        const today = scheduleTodayYmd();
        const { y: yy, m: mm } = parseYmd(today);
        return { year: yy, month: mm };
    }
    return { year: y, month: m };
}

export { SCHEDULE_FIXTURE_TODAY, SCHEDULE_TIMEZONE_LABEL, toYmd };
