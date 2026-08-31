/**
 * Who should receive a scheduled task (email list + LINE rooms).
 */

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
 * @param {object} task
 * @param {{ groupGeneralId?: string, groupAnnounceId?: string }} binding
 */
export function lineRoomsForTask(task, binding) {
    const kind = String(task?.kind || '');
    if (kind === 'announce_day') {
        const announce = String(binding?.groupAnnounceId || '').trim();
        return announce ? [{ room: 'announce', groupId: announce }] : [];
    }
    const channels = String(task?.channels || '');
    if (channels !== 'line' && channels !== 'both') return [];
    const want = String(task?.lineRooms || 'both');
    const rooms = [];
    const general = String(binding?.groupGeneralId || '').trim();
    const announce = String(binding?.groupAnnounceId || '').trim();
    if ((want === 'general' || want === 'both') && general) {
        rooms.push({ room: 'general', groupId: general });
    }
    if ((want === 'announce' || want === 'both') && announce) {
        rooms.push({ room: 'announce', groupId: announce });
    }
    return rooms;
}

/**
 * @param {object} task
 * @param {{ groupGeneralId?: string, groupAnnounceId?: string }} binding
 */
export function lineRoomsMissing(task, binding) {
    if (String(task?.kind || '') === 'announce_day') {
        return String(binding?.groupAnnounceId || '').trim() ? [] : ['announce'];
    }
    const channels = String(task?.channels || '');
    if (channels !== 'line' && channels !== 'both') return [];
    const want = String(task?.lineRooms || 'both');
    const missing = [];
    if ((want === 'general' || want === 'both') && !String(binding?.groupGeneralId || '').trim()) {
        missing.push('general');
    }
    if ((want === 'announce' || want === 'both') && !String(binding?.groupAnnounceId || '').trim()) {
        missing.push('announce');
    }
    return missing;
}
