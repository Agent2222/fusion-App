import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lineGroupIdsFromWebhookBody, verifyLineSignature } from './line.js';

const SECRET = 'test-channel-secret';

function sign(body) {
    return createHmac('sha256', SECRET).update(body).digest('base64');
}

describe('verifyLineSignature', () => {
    it('accepts a matching HMAC', () => {
        const raw = '{"events":[]}';
        assert.equal(verifyLineSignature(raw, sign(raw), SECRET), true);
    });

    it('rejects a bad signature', () => {
        assert.equal(verifyLineSignature('{"events":[]}', 'not-valid', SECRET), false);
    });

    it('rejects missing secret or signature', () => {
        assert.equal(verifyLineSignature('{}', sign('{}'), ''), false);
        assert.equal(verifyLineSignature('{}', '', SECRET), false);
    });
});

describe('lineGroupIdsFromWebhookBody', () => {
    it('treats an empty verify payload as no groups', () => {
        assert.deepEqual(lineGroupIdsFromWebhookBody({ events: [] }), { seen: [], left: [] });
        assert.deepEqual(lineGroupIdsFromWebhookBody({}), { seen: [], left: [] });
    });

    it('collects join and group message ids', () => {
        const { seen, left } = lineGroupIdsFromWebhookBody({
            events: [
                { type: 'join', source: { type: 'group', groupId: 'Cgeneral' } },
                { type: 'message', source: { type: 'group', groupId: 'Cannounce' } },
                { type: 'message', source: { type: 'user', userId: 'U1' } },
                { type: 'join', source: { type: 'group', groupId: 'Cgeneral' } },
            ],
        });
        assert.deepEqual(seen, ['Cgeneral', 'Cannounce']);
        assert.deepEqual(left, []);
    });

    it('collects leave ids', () => {
        const { seen, left } = lineGroupIdsFromWebhookBody({
            events: [{ type: 'leave', source: { type: 'group', groupId: 'Cgone' } }],
        });
        assert.deepEqual(seen, []);
        assert.deepEqual(left, ['Cgone']);
    });
});
