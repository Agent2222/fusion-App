/**
 * Sync Studio Schedule events to the public CMS `events` bundle + journal layout.
 * Schedule remains source of truth; public id = schedule event id.
 */

import { formatTimeRange, parseYmd } from './scheduleModel.js';
import {
    adminGetJournalLayoutStudio,
    adminSetJournalLayoutStudio,
    getContentBundleForStudio,
    upsertContentPageStudio,
} from './database.js';

/**
 * @param {unknown} raw
 * @returns {any[]}
 */
function normalizeEventsBundle(raw) {
    if (Array.isArray(raw)) return raw.slice();
    if (raw && typeof raw === 'object' && Array.isArray(/** @type {any} */ (raw).events)) {
        return /** @type {any} */ (raw).events.slice();
    }
    return [];
}

/**
 * @param {string} ymd
 */
function formatPublicDate(ymd) {
    try {
        const { y, m, d } = parseYmd(ymd);
        return `${m}/${d}/${y}`;
    } catch {
        return String(ymd || '');
    }
}

/**
 * @param {import('./scheduleModel.js').CalendarEvent} event
 */
export function scheduleEventToCmsPublicEvent(event) {
    const id = String(event?.id || '').trim();
    const title = String(event?.title || '').trim() || 'Event';
    const location = String(event?.locationName || '').trim();
    const notes = String(event?.notes || '').trim();
    const category = String(event?.programName || '').trim() || 'Event';
    const date = formatPublicDate(String(event?.date || ''));
    const time = formatTimeRange(event);
    const image = String(event?.imageUrl || '').trim();
    const cancelled = String(event?.status || '') === 'cancelled';
    const locale = {
        category,
        title,
        date,
        time,
        location,
        address: location,
        description: notes,
        cta: 'RSVP',
    };
    const localeJa = {
        ...locale,
        cta: '詳細',
    };
    return {
        id,
        image,
        status: cancelled ? 'past' : 'upcoming',
        en: locale,
        ja: localeJa,
    };
}

/**
 * Ensure a journal layout event row exists for this id (prepend if missing).
 * @param {string} eventId
 */
async function ensureJournalEventRow(eventId) {
    const id = String(eventId || '').trim();
    if (!id) return;
    const rows = await adminGetJournalLayoutStudio();
    const list = Array.isArray(rows) ? rows.slice() : [];
    if (list.some((r) => String(r?.rowType || '') === 'event' && String(r?.refId || '') === id)) {
        return;
    }
    const next = [
        {
            rowType: 'event',
            refId: id,
            sortOrder: 0,
            featured: false,
        },
        ...list.map((r, i) => ({
            ...r,
            sortOrder: Math.max(0, Math.floor(Number(r?.sortOrder ?? i))) + 1,
        })),
    ];
    await adminSetJournalLayoutStudio(next);
}

/**
 * Remove journal layout event row(s) for this id.
 * @param {string} eventId
 */
async function removeJournalEventRow(eventId) {
    const id = String(eventId || '').trim();
    if (!id) return;
    const rows = await adminGetJournalLayoutStudio();
    const list = Array.isArray(rows) ? rows : [];
    const next = list
        .filter((r) => !(String(r?.rowType || '') === 'event' && String(r?.refId || '') === id))
        .map((r, i) => ({
            ...r,
            sortOrder: Math.max(0, Math.floor(Number(r?.sortOrder ?? i))),
        }));
    if (next.length === list.length) return;
    await adminSetJournalLayoutStudio(next);
}

/**
 * Load current CMS events array (live empty stays empty; does not write fixtures).
 * @returns {Promise<any[]>}
 */
async function loadEventsArray() {
    const raw = await getContentBundleForStudio('events', { forStudio: false });
    return normalizeEventsBundle(raw);
}

/**
 * Publish or update the CMS + journal mirror for a public schedule event.
 * @param {import('./scheduleModel.js').CalendarEvent} event
 */
export async function syncScheduleEventToPublicSite(event) {
    const id = String(event?.id || '').trim();
    if (!id) throw new Error('Event id required for public sync');
    const cms = scheduleEventToCmsPublicEvent(event);
    const list = await loadEventsArray();
    const idx = list.findIndex((e) => String(e?.id) === id);
    if (idx >= 0) list[idx] = { ...list[idx], ...cms };
    else list.push(cms);
    await upsertContentPageStudio('events', list);
    await ensureJournalEventRow(id);
}

/**
 * Remove CMS event + journal layout row for a schedule event id.
 * @param {string} eventId
 */
export async function removeScheduleEventFromPublicSite(eventId) {
    const id = String(eventId || '').trim();
    if (!id) return;
    const list = await loadEventsArray();
    const next = list.filter((e) => String(e?.id) !== id);
    if (next.length !== list.length) {
        await upsertContentPageStudio('events', next);
    }
    await removeJournalEventRow(id);
}

/**
 * After schedule save: publish when publicOnSite (and not cancelled), otherwise remove mirror.
 * @param {import('./scheduleModel.js').CalendarEvent} event
 */
export async function syncPublicSiteForScheduleEvent(event) {
    if (!event || !String(event.id || '').trim()) return;
    const cancelled = String(event.status || '') === 'cancelled';
    if (event.publicOnSite && !cancelled) {
        await syncScheduleEventToPublicSite(event);
    } else {
        await removeScheduleEventFromPublicSite(event.id);
    }
}
