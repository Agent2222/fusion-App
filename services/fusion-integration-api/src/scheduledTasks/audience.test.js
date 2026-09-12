import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    emailRecipientsForTask,
    lineRoomsForTask,
    lineRoomsMissing,
    shouldSkipAudienceRow,
} from './audience.js';

const confirmed = {
    applicantId: 'a1',
    email: 'ada@example.com',
    fullName: 'Ada',
    slotSecured: true,
    status: 'accepted',
    hasArrival: false,
    inviteSentAt: '',
};

describe('scheduled task audience', () => {
    it('skips arrival reminder when they already entered arrival', () => {
        assert.equal(shouldSkipAudienceRow({ skipIfDone: true, kind: 'flight_followup' }, { hasArrival: true }), true);
        assert.equal(shouldSkipAudienceRow({ skipIfDone: true, kind: 'flight_followup' }, { hasArrival: false }), false);
    });

    it('skips chat invite when already invited', () => {
        assert.equal(
            shouldSkipAudienceRow({ skipIfDone: true, kind: 'comms_invite' }, { inviteSentAt: '2026-01-01' }),
            true,
        );
    });

    it('filters email recipients', () => {
        const rows = [
            confirmed,
            { ...confirmed, applicantId: 'a2', email: '', fullName: 'No Mail' },
            { ...confirmed, applicantId: 'a3', slotSecured: false, email: 'x@y.com' },
            { ...confirmed, applicantId: 'a4', status: 'withdrawn', email: 'w@y.com' },
            { ...confirmed, applicantId: 'a5', hasArrival: true, email: 'done@y.com' },
        ];
        const out = emailRecipientsForTask({ kind: 'flight_followup', skipIfDone: true }, rows);
        assert.equal(out.length, 1);
        assert.equal(out[0].applicantId, 'a1');
    });

    it('lists bound LINE rooms and reports missing ones', () => {
        const task = { channels: 'both', lineRooms: 'both' };
        const rooms = lineRoomsForTask(task, { groupGeneralId: 'G1', groupAnnounceId: '' });
        assert.deepEqual(rooms, [{ room: 'general', groupId: 'G1' }]);
        assert.deepEqual(lineRoomsMissing(task, { groupGeneralId: 'G1', groupAnnounceId: '' }), ['announce']);
    });

    it('always includes the Comms Announcements room when that slot is bound', () => {
        const task = { channels: 'line', lineRooms: 'general' };
        assert.deepEqual(lineRoomsForTask(task, { groupGeneralId: 'G1', groupAnnounceId: 'A1' }), [
            { room: 'announce', groupId: 'A1' },
            { room: 'general', groupId: 'G1' },
        ]);
    });

    it('uses the group that is actually Announcements when slots were swapped', () => {
        const task = { kind: 'announce_day', channels: 'line', lineRooms: 'announce' };
        assert.deepEqual(
            lineRoomsForTask(
                task,
                { groupGeneralId: 'Cann', groupAnnounceId: 'Cgen' },
                { announceName: 'Kaga General', generalName: 'Kaga Announcements' },
            ),
            [{ room: 'announce', groupId: 'Cann' }],
        );
    });

    it('posts announce-day only to Announcements and never emails', () => {
        const task = { kind: 'announce_day', channels: 'line', lineRooms: 'announce' };
        assert.deepEqual(emailRecipientsForTask(task, [confirmed]), []);
        assert.deepEqual(lineRoomsForTask(task, { groupGeneralId: 'G1', groupAnnounceId: 'A1' }), [
            { room: 'announce', groupId: 'A1' },
        ]);
        assert.deepEqual(lineRoomsMissing(task, { groupGeneralId: 'G1', groupAnnounceId: '' }), ['announce']);
    });
});
