import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    LINE_PUSH_MAX_CHARS,
    assertLinePushText,
    isLinePushRoom,
    lineRoomRoleFromName,
    normalizeLineBinding,
    normalizeLinePushRoom,
    pickAnnounceGroupId,
    resolveBoundGroupId,
} from './push.js';

describe('resolveBoundGroupId', () => {
    const binding = { programId: 'p1', groupGeneralId: 'Cgen', groupAnnounceId: 'Cann' };

    it('reads general and announce rooms', () => {
        assert.equal(resolveBoundGroupId(binding, 'general'), 'Cgen');
        assert.equal(resolveBoundGroupId(binding, 'announce'), 'Cann');
        assert.equal(resolveBoundGroupId(binding, 'announcements'), 'Cann');
    });

    it('rejects an unbound room', () => {
        assert.equal(resolveBoundGroupId({ programId: 'p1', groupGeneralId: '', groupAnnounceId: '' }, 'general'), '');
        assert.equal(resolveBoundGroupId(binding, 'unknown'), '');
    });

    it('unwraps Candid optional records and text arrays', () => {
        assert.equal(
            resolveBoundGroupId([{ programId: 'p1', groupGeneralId: ['Cgen'], groupAnnounceId: ['Cann'] }], 'announce'),
            'Cann',
        );
        assert.equal(resolveBoundGroupId(['p1', 'Cgen', 'Cann'], 'announce'), 'Cann');
        assert.deepEqual(normalizeLineBinding({ group_announce_id: 'Cann', group_general_id: 'Cgen' }), {
            programId: '',
            groupGeneralId: 'Cgen',
            groupAnnounceId: 'Cann',
        });
    });
});

describe('pickAnnounceGroupId', () => {
    const assigned = { programId: 'p1', groupGeneralId: 'Cgen', groupAnnounceId: 'Cann' };

    it('keeps the announce slot when names match', () => {
        assert.equal(
            pickAnnounceGroupId(assigned, { announceName: 'Announcements', generalName: 'General' }),
            'Cann',
        );
        assert.equal(lineRoomRoleFromName('Kaga Announcements'), 'announce');
        assert.equal(lineRoomRoleFromName('General chat'), 'general');
    });

    it('sends to the group that is actually Announcements when Comms assigned the rooms backwards', () => {
        const swapped = { programId: 'p1', groupGeneralId: 'Cann', groupAnnounceId: 'Cgen' };
        assert.equal(
            pickAnnounceGroupId(swapped, { announceName: 'Kaga General', generalName: 'Kaga Announcements' }),
            'Cann',
        );
    });

    it('uses the General slot when that group is named Announcements and the announce slot is empty', () => {
        assert.equal(
            pickAnnounceGroupId(
                { programId: 'p1', groupGeneralId: 'Cann', groupAnnounceId: '' },
                { generalName: 'Announcements' },
            ),
            'Cann',
        );
    });
});

describe('assertLinePushText', () => {
    it('requires non-empty trimmed text', () => {
        assert.throws(() => assertLinePushText(''), /text required/);
        assert.throws(() => assertLinePushText('   '), /text required/);
        assert.equal(assertLinePushText('  hello  '), 'hello');
    });

    it('rejects over-long text', () => {
        assert.throws(() => assertLinePushText('x'.repeat(LINE_PUSH_MAX_CHARS + 1)), /exceeds/);
    });
});

describe('normalizeLinePushRoom', () => {
    it('normalizes room keys', () => {
        assert.equal(normalizeLinePushRoom('general'), 'general');
        assert.equal(normalizeLinePushRoom('announce'), 'announce');
        assert.equal(isLinePushRoom('announcements'), true);
        assert.equal(normalizeLinePushRoom('other'), '');
    });
});
