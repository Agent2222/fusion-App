import { describe, expect, it } from 'vitest';
import {
    emailRecipientsForTask,
    isConfirmedAudienceRow,
    lineRoomsForTask,
    lineRoomsMissing,
    recipientEstimateLabel,
    shouldSkipAudienceRow,
} from './scheduledTaskAudience.js';

const confirmed = {
    applicantId: 'a1',
    email: 'maya@example.com',
    slotSecured: true,
    status: 'accepted',
    hasArrival: false,
    inviteSentAt: '',
};

describe('scheduledTaskAudience', () => {
    it('keeps confirmed artists with a public email', () => {
        expect(isConfirmedAudienceRow(confirmed)).toBe(true);
        expect(
            emailRecipientsForTask({ skipIfDone: true, kind: 'custom' }, [
                confirmed,
                { ...confirmed, email: 'x.invalid' },
                { ...confirmed, status: 'withdrawn' },
            ]),
        ).toHaveLength(1);
    });

    it('skips arrival reminder when they already added arrival time', () => {
        expect(shouldSkipAudienceRow({ skipIfDone: true, kind: 'flight_followup' }, { hasArrival: true })).toBe(true);
        expect(shouldSkipAudienceRow({ skipIfDone: true, kind: 'flight_followup' }, { hasArrival: false })).toBe(false);
    });

    it('skips chat invite when already invited', () => {
        expect(
            shouldSkipAudienceRow({ skipIfDone: true, kind: 'comms_invite' }, { inviteSentAt: '2026-08-01' }),
        ).toBe(true);
        expect(shouldSkipAudienceRow({ skipIfDone: false, kind: 'comms_invite' }, { inviteSentAt: '2026-08-01' })).toBe(
            false,
        );
    });

    it('never skips write-your-own', () => {
        expect(shouldSkipAudienceRow({ skipIfDone: true, kind: 'custom' }, { hasArrival: true, inviteSentAt: 'x' })).toBe(
            false,
        );
    });

    it('lists connected LINE chats and reports missing rooms', () => {
        const task = { channels: 'both', lineRooms: 'both' };
        expect(lineRoomsForTask(task, { groupGeneralId: 'G1', groupAnnounceId: '' })).toEqual([
            { room: 'general', groupId: 'G1' },
        ]);
        expect(lineRoomsMissing(task, { groupGeneralId: 'G1', groupAnnounceId: '' })).toEqual(['announce']);
    });

    it('posts announce-day only to Announcements and never emails', () => {
        const task = { kind: 'announce_day', channels: 'line', lineRooms: 'announce' };
        expect(emailRecipientsForTask(task, [confirmed])).toEqual([]);
        expect(lineRoomsForTask(task, { groupGeneralId: 'G1', groupAnnounceId: 'A1' })).toEqual([
            { room: 'announce', groupId: 'A1' },
        ]);
        expect(lineRoomsMissing(task, { groupGeneralId: 'G1', groupAnnounceId: '' })).toEqual(['announce']);
    });

    it('writes a staff-readable recipient estimate', () => {
        expect(recipientEstimateLabel(12, 2)).toBe('Will go to ~12 people by email and 2 LINE chats');
        expect(recipientEstimateLabel(0, 0)).toBe('Will go to no one yet');
    });
});
