/**
 * LINE Messaging API webhook — signature verify + group event parse.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * @param {string | Buffer} rawBody
 * @param {string} [signature]
 * @param {string} [channelSecret]
 * @returns {boolean}
 */
export function verifyLineSignature(rawBody, signature, channelSecret) {
    const secret = String(channelSecret || '');
    const sig = String(signature || '');
    if (!secret || !sig) return false;
    const digest = createHmac('sha256', secret).update(rawBody).digest('base64');
    const a = Buffer.from(digest, 'utf8');
    const b = Buffer.from(sig, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

/**
 * @param {unknown} body
 * @returns {{ seen: string[], left: string[] }}
 */
export function lineGroupIdsFromWebhookBody(body) {
    const events = body && typeof body === 'object' && Array.isArray(/** @type {{ events?: unknown }} */ (body).events)
        ? /** @type {{ events: unknown[] }} */ (body).events
        : [];
    const seen = [];
    const left = [];
    const seenSet = new Set();
    const leftSet = new Set();
    for (const ev of events) {
        if (!ev || typeof ev !== 'object') continue;
        const rec = /** @type {{ type?: string, source?: { type?: string, groupId?: string } }} */ (ev);
        const source = rec.source || {};
        if (source.type !== 'group') continue;
        const groupId = String(source.groupId || '').trim();
        if (!groupId) continue;
        if (rec.type === 'leave') {
            if (!leftSet.has(groupId)) {
                leftSet.add(groupId);
                left.push(groupId);
            }
            continue;
        }
        if (rec.type === 'join' || rec.type === 'message') {
            if (!seenSet.has(groupId)) {
                seenSet.add(groupId);
                seen.push(groupId);
            }
        }
    }
    return { seen, left };
}
