/**
 * LINE Messaging API — group summary + text push helpers.
 */

export const LINE_PUSH_MAX_CHARS = 5000;
export const LINE_API_BASE = 'https://api.line.me/v2/bot';

/**
 * @param {unknown} binding
 * @param {string} [room]
 * @returns {string}
 */
export function resolveBoundGroupId(binding, room) {
    const key = String(room || '').trim().toLowerCase();
    const rec = binding && typeof binding === 'object' ? /** @type {Record<string, unknown>} */ (binding) : {};
    if (key === 'general') return String(rec.groupGeneralId ?? '').trim();
    if (key === 'announce' || key === 'announcements') return String(rec.groupAnnounceId ?? '').trim();
    return '';
}

/**
 * @param {unknown} text
 * @returns {string}
 */
export function assertLinePushText(text) {
    const t = String(text ?? '').trim();
    if (!t) {
        const err = new Error('text required');
        err.code = 'LINE_TEXT_REQUIRED';
        throw err;
    }
    if (t.length > LINE_PUSH_MAX_CHARS) {
        const err = new Error(`text exceeds ${LINE_PUSH_MAX_CHARS} characters`);
        err.code = 'LINE_TEXT_TOO_LONG';
        throw err;
    }
    return t;
}

/**
 * @param {string} [room]
 * @returns {boolean}
 */
export function isLinePushRoom(room) {
    const key = String(room || '').trim().toLowerCase();
    return key === 'general' || key === 'announce' || key === 'announcements';
}

/**
 * @param {string} [room]
 * @returns {'general' | 'announce' | ''}
 */
export function normalizeLinePushRoom(room) {
    const key = String(room || '').trim().toLowerCase();
    if (key === 'general') return 'general';
    if (key === 'announce' || key === 'announcements') return 'announce';
    return '';
}

/**
 * @param {string} groupId
 * @param {string} accessToken
 * @returns {Promise<string>}
 */
export async function fetchLineGroupSummaryName(groupId, accessToken) {
    const id = String(groupId || '').trim();
    const token = String(accessToken || '').trim();
    if (!id || !token) return '';
    const res = await fetch(`${LINE_API_BASE}/group/${encodeURIComponent(id)}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return '';
    const json = await res.json().catch(() => null);
    return String(json?.groupName || '').trim();
}

/**
 * @param {{ groupId: string, text: string, accessToken: string }} opts
 */
export async function pushLineTextToGroup(opts) {
    const groupId = String(opts?.groupId || '').trim();
    const accessToken = String(opts?.accessToken || '').trim();
    const text = assertLinePushText(opts?.text);
    if (!groupId) {
        const err = new Error('LINE room is not linked');
        err.code = 'LINE_ROOM_UNBOUND';
        throw err;
    }
    if (!accessToken) {
        const err = new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
        err.code = 'LINE_TOKEN_MISSING';
        throw err;
    }
    const res = await fetch(`${LINE_API_BASE}/message/push`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            to: groupId,
            messages: [{ type: 'text', text }],
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        const err = new Error(body || `LINE push HTTP ${res.status}`);
        err.code = 'LINE_PUSH_FAILED';
        err.status = res.status;
        throw err;
    }
    return res.json().catch(() => ({ ok: true }));
}
