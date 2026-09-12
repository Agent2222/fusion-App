/**
 * Who should receive a scheduled task (email list + LINE rooms).
 */
import { normalizeLineBinding, pickAnnounceGroupId } from '../line/push.js';

const SKIP_STATUS = new Set(['withdrawn', 'pulledOut']);

/**
 * @param {unknown} email
 */
export function isPublicEmail(email) {
    const e = String(email || '')
        .trim()
        .toLowerCase();
    return e.includes('@') && !e.endsWith('.invalid');
}

/**
 * @param {object} row
 */
export function isConfirmedAudienceRow(row) {
    if (!row?.slotSecured) return false;
    if (SKIP_STATUS.has(String(row.status || ''))) return false;
    return true;
}

/**
 * @param {object} task
 * @param {object} row
 */
export function shouldSkipAudienceRow(task, row) {
    if (!task?.skipIfDone) return false;
    const kind = String(task.kind || '');
    if (kind === 'flight_followup') return Boolean(row?.hasArrival);
    if (kind === 'comms_invite') return Boolean(String(row?.inviteSentAt || '').trim());
    return false;
}

/**
 * @param {object} task
 * @param {object[]} applicants
 */
export function emailRecipientsForTask(task, applicants) {
    if (String(task?.kind || '') === 'announce_day') return [];
    return (Array.isArray(applicants) ? applicants : []).filter((row) => {
        if (!isConfirmedAudienceRow(row)) return false;
        if (!isPublicEmail(row.email)) return false;
        if (shouldSkipAudienceRow(task, row)) return false;
        return true;
    });
}

/**
 * LINE destinations for a task. Announcements always uses the Comms Announcements room
 * (same pick as Studio → Comms schedule posts), including when the two slots were swapped.
 * @param {object} task
 * @param {unknown} binding
 * @param {{ announceName?: string, generalName?: string }} [names]
 */
export function lineRoomsForTask(task, binding, names = {}) {
    const rec = normalizeLineBinding(binding);
    const kind = String(task?.kind || '');
    const channels = String(task?.channels || '');
    const wantLine = kind === 'announce_day' || channels === 'line' || channels === 'both';
    if (!wantLine) return [];
    const want = String(task?.lineRooms || 'announce');
    const announceId = pickAnnounceGroupId(binding, names);
    const rooms = [];
    if (announceId) rooms.push({ room: 'announce', groupId: announceId });
    if (kind !== 'announce_day' && (want === 'general' || want === 'both')) {
        if (rec.groupGeneralId && rec.groupGeneralId !== announceId) {
            rooms.push({ room: 'general', groupId: rec.groupGeneralId });
        }
    }
    return rooms;
}

/**
 * @param {object} task
 * @param {unknown} binding
 * @param {{ announceName?: string, generalName?: string }} [names]
 */
export function lineRoomsMissing(task, binding, names = {}) {
    const rec = normalizeLineBinding(binding);
    const kind = String(task?.kind || '');
    const channels = String(task?.channels || '');
    const wantLine = kind === 'announce_day' || channels === 'line' || channels === 'both';
    if (!wantLine) return [];
    const announceId = pickAnnounceGroupId(binding, names);
    const missing = [];
    if (!announceId) missing.push('announce');
    const want = String(task?.lineRooms || 'announce');
    if (kind !== 'announce_day' && (want === 'general' || want === 'both') && !rec.groupGeneralId) {
        missing.push('general');
    }
    return missing;
}

/**
 * Load live LINE group titles, then resolve rooms the same way Comms does.
 * @param {object} task
 * @param {unknown} binding
 * @param {(groupId: string) => Promise<string>} [fetchLineGroupName]
 */
export async function resolveLineRoomsForTask(task, binding, fetchLineGroupName) {
    const rec = normalizeLineBinding(binding);
    /** @type {{ announceName?: string, generalName?: string }} */
    const names = {};
    if (typeof fetchLineGroupName === 'function') {
        const [announceName, generalName] = await Promise.all([
            rec.groupAnnounceId ? fetchLineGroupName(rec.groupAnnounceId) : '',
            rec.groupGeneralId ? fetchLineGroupName(rec.groupGeneralId) : '',
        ]);
        names.announceName = announceName || '';
        names.generalName = generalName || '';
    }
    return {
        rooms: lineRoomsForTask(task, binding, names),
        missing: lineRoomsMissing(task, binding, names),
        names,
    };
}
