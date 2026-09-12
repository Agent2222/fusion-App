/**
 * Who should receive a scheduled task (email list + LINE rooms).
 * Keep in sync with services/fusion-integration-api/src/scheduledTasks/audience.js
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
    const channels = String(task?.channels || '');
    const wantLine = kind === 'announce_day' || channels === 'line' || channels === 'both';
    if (!wantLine) return [];
    const want = String(task?.lineRooms || 'announce');
    const general = String(binding?.groupGeneralId || '').trim();
    const announce = String(binding?.groupAnnounceId || '').trim();
    const rooms = [];
    if (announce) rooms.push({ room: 'announce', groupId: announce });
    if (kind !== 'announce_day' && (want === 'general' || want === 'both') && general && general !== announce) {
        rooms.push({ room: 'general', groupId: general });
    }
    return rooms;
}

/**
 * @param {object} task
 * @param {{ groupGeneralId?: string, groupAnnounceId?: string }} binding
 */
export function lineRoomsMissing(task, binding) {
    const kind = String(task?.kind || '');
    const channels = String(task?.channels || '');
    const wantLine = kind === 'announce_day' || channels === 'line' || channels === 'both';
    if (!wantLine) return [];
    const announce = String(binding?.groupAnnounceId || '').trim();
    const general = String(binding?.groupGeneralId || '').trim();
    const missing = [];
    if (!announce) missing.push('announce');
    const want = String(task?.lineRooms || 'announce');
    if (kind !== 'announce_day' && (want === 'general' || want === 'both') && !general) {
        missing.push('general');
    }
    return missing;
}

/**
 * @param {number} emailCount
 * @param {number} lineCount
 */
export function recipientEstimateLabel(emailCount, lineCount) {
    const emails = Math.max(0, Number(emailCount) || 0);
    const lines = Math.max(0, Number(lineCount) || 0);
    const emailBit =
        emails === 1 ? '1 person by email' : `${emails} people by email`;
    const lineBit = lines === 1 ? '1 LINE chat' : `${lines} LINE chats`;
    if (emails === 0 && lines === 0) return 'Will go to no one yet';
    if (lines === 0) return `Will go to ~${emailBit}`;
    if (emails === 0) return `Will go to ${lineBit}`;
    return `Will go to ~${emailBit} and ${lineBit}`;
}
