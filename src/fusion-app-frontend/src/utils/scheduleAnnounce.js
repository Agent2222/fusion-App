/**
 * Studio Schedule → LINE announce helpers (confirm copy + payloads).
 * Flex is built on the Integration API — this file is preview/labels only.
 */
import { formatLongDate, formatTimeRange } from './scheduleModel.js';

const FORBIDDEN_STAFF_COPY = /\bcron\b|\btick\b|\bjob\b|\bAPI\b/i;

export const ANNOUNCE_DAY_CHOOSE_PROGRAM = 'Choose a program first.';
export const ANNOUNCE_ROOM_UNBOUND = 'LINE chat isn’t connected for this program';
export const ANNOUNCE_DESTINATION = 'Goes to the Announcements chat.';
export const ANNOUNCE_SUCCESS_LIVE = 'Sent to Announcements';
export const ANNOUNCE_SUCCESS_TEST = 'Test sent to the LINE bot admin';
export const ANNOUNCE_EMPTY_DAY =
    'No events on the calendar. Artists will get a note that it’s a great day to create and explore.';

/**
 * @param {unknown} name
 * @returns {'' | 'general' | 'announce'}
 */
export function lineRoomRoleFromName(name) {
    const n = String(name || '').trim().toLowerCase();
    if (!n) return '';
    if (/announce|announcement|お知らせ|告知/.test(n)) return 'announce';
    if (/general|メインチャット|雑談/.test(n)) return 'general';
    return '';
}

/**
 * @param {{ groupGeneralId?: string, groupAnnounceId?: string }} binding
 * @param {{ announceName?: string, generalName?: string }} [names]
 */
export function pickAnnounceGroupId(binding, names = {}) {
    const announceId = String(binding?.groupAnnounceId || '').trim();
    const generalId = String(binding?.groupGeneralId || '').trim();
    if (
        announceId &&
        generalId &&
        announceId !== generalId &&
        lineRoomRoleFromName(names.announceName) === 'general' &&
        lineRoomRoleFromName(names.generalName) === 'announce'
    ) {
        return generalId;
    }
    return announceId;
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {string} html
 */
export function staffCopyHasForbiddenTerms(html) {
    return FORBIDDEN_STAFF_COPY.test(String(html || ''));
}

/**
 * @param {{ programId?: string, eventCount?: number }} opts
 */
export function announceDayButtonState(opts = {}) {
    const programId = String(opts.programId || '').trim();
    if (!programId) {
        return { enabled: false, title: ANNOUNCE_DAY_CHOOSE_PROGRAM };
    }
    return { enabled: true, title: '' };
}

/**
 * @param {object[]} events
 * @param {{ date?: string, programId?: string }} opts
 */
export function dayEventsForAnnounce(events, opts = {}) {
    const ymd = String(opts.date || '').trim();
    const pid = String(opts.programId || '').trim();
    return (Array.isArray(events) ? events : []).filter((e) => {
        if (!e || typeof e !== 'object') return false;
        if (pid && String(e.programId || '') !== pid) return false;
        if (ymd && String(e.date || '') !== ymd) return false;
        if (String(e.status || '').toLowerCase() === 'cancelled') return false;
        return Boolean(String(e.title || '').trim());
    });
}

/**
 * @param {object} ev
 */
export function toAnnouncePayload(ev) {
    return {
        id: String(ev?.id || '').trim(),
        title: String(ev?.title || '').trim(),
        date: String(ev?.date || '').trim(),
        startTime: String(ev?.startTime || '').trim(),
        endTime: String(ev?.endTime || '').trim(),
        allDay: Boolean(ev?.allDay),
        timezone: String(ev?.timezone || '').trim(),
        locationName: String(ev?.locationName || '').trim(),
        imageUrl: String(ev?.imageUrl || '').trim(),
        acceptRsvp: Boolean(ev?.acceptRsvp),
        color: String(ev?.color || '').trim(),
        status: String(ev?.status || '').trim(),
    };
}

/**
 * @param {{
 *   kind: 'day' | 'event',
 *   programName?: string,
 *   date?: string,
 *   events?: object[],
 *   announceBound?: boolean,
 * }} opts
 */
export function buildAnnounceConfirmCopy(opts) {
    const kind = opts?.kind === 'event' ? 'event' : 'day';
    const title = kind === 'event' ? 'Announce this event' : 'Announce this day';
    const programLine = String(opts?.programName || '').trim() || 'Program';
    const dateLine = opts?.date ? formatLongDate(opts.date) : '';
    const eventLines = (Array.isArray(opts?.events) ? opts.events : []).map((ev) => {
        const time = formatTimeRange(ev);
        return `${ev.title || 'Event'} · ${time}`;
    });
    const emptyDayLine = kind === 'day' && !eventLines.length ? ANNOUNCE_EMPTY_DAY : '';
    const destinationLine = ANNOUNCE_DESTINATION;
    const unboundLine = opts?.announceBound === false ? ANNOUNCE_ROOM_UNBOUND : '';
    const allText = [title, programLine, dateLine, ...eventLines, emptyDayLine, destinationLine, unboundLine]
        .filter(Boolean)
        .join('\n');
    return { title, programLine, dateLine, eventLines, emptyDayLine, destinationLine, unboundLine, allText };
}

/**
 * @param {{
 *   kind: 'day' | 'event',
 *   programId: string,
 *   programName?: string,
 *   date?: string,
 *   events: object[],
 * }} opts
 */
export async function openScheduleAnnounceConfirm(opts) {
    const kind = opts?.kind === 'event' ? 'event' : 'day';
    const programId = String(opts?.programId || '').trim();
    const events = dayEventsForAnnounce(opts?.events || [], {
        date: kind === 'day' ? opts?.date : '',
        programId,
    });
    const date = String(opts?.date || events[0]?.date || '').trim();
    const programName = String(opts?.programName || events[0]?.programName || '').trim();
    const { staffGetProgramCommsLineBinding, staffListSeenLineGroups } = await import('./database.js');
    const { announceScheduleOnLine } = await import('./integrationApi.js');
    const { openStudioModal, openStudioNoticeDialog } = await import('./studioModal.js');
    let announceBound = false;
    let destinationDetail = ANNOUNCE_DESTINATION;
    try {
        const [binding, seen] = await Promise.all([
            staffGetProgramCommsLineBinding(programId),
            staffListSeenLineGroups().catch(() => []),
        ]);
        const announceId = String(binding?.groupAnnounceId || '').trim();
        const generalId = String(binding?.groupGeneralId || '').trim();
        announceBound = Boolean(announceId);
        const list = Array.isArray(seen) ? seen : [];
        const nameOf = (id) =>
            String(list.find((g) => String(g?.groupId || '') === id)?.groupName || '').trim();
        const picked = pickAnnounceGroupId(binding, {
            announceName: nameOf(announceId),
            generalName: nameOf(generalId),
        });
        const seenName = nameOf(picked);
        if (seenName) {
            destinationDetail = `${ANNOUNCE_DESTINATION} Linked group: ${seenName}.`;
        }
    } catch {
        announceBound = false;
    }
    const copy = buildAnnounceConfirmCopy({
        kind,
        programName,
        date,
        events,
        announceBound,
    });
    const listHtml = copy.eventLines.length
        ? `<ul class="schedule-announce-list">${copy.eventLines
              .map((line) => `<li>${escapeHtml(line)}</li>`)
              .join('')}</ul>`
        : `<p class="studio-muted">${escapeHtml(copy.emptyDayLine || ANNOUNCE_EMPTY_DAY)}</p>`;
    const inner = `
        <p class="schedule-announce-meta">${escapeHtml(copy.programLine)}</p>
        ${copy.dateLine ? `<p class="schedule-announce-meta">${escapeHtml(copy.dateLine)}</p>` : ''}
        ${listHtml}
        <p class="studio-muted">${escapeHtml(destinationDetail)}</p>
        ${copy.unboundLine ? `<p class="schedule-announce-warn">${escapeHtml(copy.unboundLine)}</p>` : ''}
        <p class="schedule-announce-error" data-announce-error hidden></p>
        <div class="studio-modal-actions" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #e2e8f0;display:flex;gap:0.5rem;justify-content:flex-end;flex-wrap:wrap">
            <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
            <button type="button" class="studio-btn-ghost" data-announce-test>Send test</button>
            <button type="button" class="studio-btn-primary" data-announce-now ${announceBound ? '' : 'disabled'}>Send now</button>
        </div>`;
    const { close, root } = openStudioModal(inner, { title: copy.title, compact: true });
    const errorEl = root.querySelector('[data-announce-error]');
    const setBusy = (busy) => {
        root.querySelectorAll('[data-announce-test], [data-announce-now]').forEach((btn) => {
            if (btn instanceof HTMLButtonElement) {
                if (btn.hasAttribute('data-announce-now') && !announceBound) {
                    btn.disabled = true;
                    return;
                }
                btn.disabled = busy;
            }
        });
    };
    const send = async (test) => {
        if (kind === 'event' && !events.length) {
            if (errorEl) {
                errorEl.hidden = false;
                errorEl.textContent = 'This event isn’t ready to announce.';
            }
            return;
        }
        setBusy(true);
        if (errorEl) {
            errorEl.hidden = true;
            errorEl.textContent = '';
        }
        try {
            await announceScheduleOnLine({
                programId,
                test,
                mode: kind,
                programName,
                date,
                events: events.map(toAnnouncePayload),
            });
            close();
            await openStudioNoticeDialog({
                title: test ? ANNOUNCE_SUCCESS_TEST : ANNOUNCE_SUCCESS_LIVE,
            });
        } catch (e) {
            if (errorEl) {
                errorEl.hidden = false;
                errorEl.textContent = e instanceof Error ? e.message : String(e);
            }
            setBusy(false);
        }
    };
    root.querySelector('[data-announce-test]')?.addEventListener('click', () => {
        void send(true);
    });
    root.querySelector('[data-announce-now]')?.addEventListener('click', () => {
        if (!announceBound) return;
        void send(false);
    });
    return { close, root };
}
