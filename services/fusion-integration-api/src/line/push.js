/**
 * LINE Messaging API — group summary + text push helpers.
 */

export const LINE_PUSH_MAX_CHARS = 5000;
export const LINE_API_BASE = 'https://api.line.me/v2/bot';

/**
 * Candid optional / tuple-safe text.
 * @param {unknown} val
 * @returns {string}
 */
export function candidText(val) {
    if (val == null) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number' || typeof val === 'bigint') return String(val).trim();
    if (Array.isArray(val)) return candidText(val[0]);
    return '';
}

/**
 * @param {unknown} raw
 * @returns {{ programId: string, groupGeneralId: string, groupAnnounceId: string }}
 */
export function normalizeLineBinding(raw) {
    if (Array.isArray(raw)) {
        if (raw.length === 1 && raw[0] && typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
            return normalizeLineBinding(raw[0]);
        }
        if (raw.length >= 3) {
            return {
                programId: candidText(raw[0]),
                groupGeneralId: candidText(raw[1]),
                groupAnnounceId: candidText(raw[2]),
            };
        }
        return { programId: '', groupGeneralId: '', groupAnnounceId: '' };
    }
    const rec = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
    return {
        programId: candidText(rec.programId),
        groupGeneralId: candidText(rec.groupGeneralId ?? rec.group_general_id),
        groupAnnounceId: candidText(rec.groupAnnounceId ?? rec.group_announce_id),
    };
}

/**
 * Infer General vs Announcements from the LINE group title.
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
 * Schedule / day announce must post to Announcements — never General.
 * If Comms assigned the two groups backwards, send using the slot that is actually Announcements.
 * @param {unknown} binding
 * @param {{ announceName?: string, generalName?: string }} [names]
 * @returns {string}
 */
export function pickAnnounceGroupId(binding, names = {}) {
    const rec = normalizeLineBinding(binding);
    const announceId = rec.groupAnnounceId;
    const generalId = rec.groupGeneralId;
    const announceRole = lineRoomRoleFromName(names.announceName);
    const generalRole = lineRoomRoleFromName(names.generalName);
    if (announceId && generalId && announceId !== generalId) {
        if (announceRole === 'general' && generalRole === 'announce') return generalId;
        if (announceRole === 'general' && !generalRole) return generalId;
        if (!announceRole && generalRole === 'announce') return generalId;
    }
    if (announceId && announceRole !== 'general') return announceId;
    if (generalId && generalRole === 'announce') return generalId;
    return announceId;
}

/**
 * @param {unknown} binding
 * @param {string} [room]
 * @returns {string}
 */
export function resolveBoundGroupId(binding, room) {
    const key = String(room || '').trim().toLowerCase();
    const rec = normalizeLineBinding(binding);
    if (key === 'general') return rec.groupGeneralId;
    if (key === 'announce' || key === 'announcements') return rec.groupAnnounceId;
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

/**
 * Push one to five LINE message objects (text, flex, etc.) to a group or user.
 * @param {{ to: string, messages: object[], accessToken: string }} opts
 */
export async function pushLineMessages(opts) {
    const to = String(opts?.to || '').trim();
    const accessToken = String(opts?.accessToken || '').trim();
    const messages = Array.isArray(opts?.messages) ? opts.messages : [];
    if (!to) {
        const err = new Error('LINE destination is missing');
        err.code = 'LINE_DEST_MISSING';
        throw err;
    }
    if (!accessToken) {
        const err = new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
        err.code = 'LINE_TOKEN_MISSING';
        throw err;
    }
    if (!messages.length) {
        const err = new Error('messages required');
        err.code = 'LINE_MESSAGES_REQUIRED';
        throw err;
    }
    if (messages.length > 5) {
        const err = new Error('at most 5 messages per send');
        err.code = 'LINE_MESSAGES_TOO_MANY';
        throw err;
    }
    const res = await fetch(`${LINE_API_BASE}/message/push`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, messages }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        const lineNotFound = res.status === 404 || /not found/i.test(body);
        const err = new Error(
            lineNotFound
                ? 'LINE could not deliver this message. Add the Fusion Official Account as a friend on this LINE account, then try Send test again.'
                : body || `LINE push HTTP ${res.status}`,
        );
        err.code = 'LINE_PUSH_FAILED';
        err.status = res.status;
        throw err;
    }
    return res.json().catch(() => ({ ok: true }));
}
