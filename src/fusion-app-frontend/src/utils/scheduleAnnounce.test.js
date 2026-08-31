import { describe, expect, it } from 'vitest';
import {
    ANNOUNCE_DAY_CHOOSE_PROGRAM,
    ANNOUNCE_DESTINATION,
    ANNOUNCE_ROOM_UNBOUND,
    ANNOUNCE_SUCCESS_LIVE,
    ANNOUNCE_SUCCESS_TEST,
    announceDayButtonState,
    buildAnnounceConfirmCopy,
    dayEventsForAnnounce,
    staffCopyHasForbiddenTerms,
    toAnnouncePayload,
} from './scheduleAnnounce.js';

const dinner = {
    id: 'e1',
    title: 'Opening dinner',
    date: '2026-09-02',
    startTime: '18:00',
    endTime: '20:00',
    allDay: false,
    programId: 'prog-kaga',
    programName: 'Kaga City Artist Residency',
    status: 'confirmed',
    timezone: 'Asia/Tokyo',
    locationName: 'Hall',
    imageUrl: 'https://cdn.example.com/flier.jpg',
    acceptRsvp: true,
    color: 'meals',
};

describe('announceDayButtonState', () => {
    it('disables Announce day without a program filter', () => {
        expect(announceDayButtonState({ programId: '', eventCount: 3 })).toEqual({
            enabled: false,
            title: ANNOUNCE_DAY_CHOOSE_PROGRAM,
        });
        expect(announceDayButtonState({ programId: '   ', eventCount: 2 }).enabled).toBe(false);
    });

    it('enables Announce day when a program is selected', () => {
        expect(announceDayButtonState({ programId: 'prog-kaga' })).toEqual({
            enabled: true,
            title: '',
        });
    });
});

describe('dayEventsForAnnounce', () => {
    it('keeps only the selected program, date, and non-cancelled events', () => {
        const out = dayEventsForAnnounce(
            [
                dinner,
                { ...dinner, id: 'e2', programId: 'other' },
                { ...dinner, id: 'e3', date: '2026-09-03' },
                { ...dinner, id: 'e4', status: 'cancelled', title: 'Cancelled dinner' },
            ],
            { date: '2026-09-02', programId: 'prog-kaga' },
        );
        expect(out.map((e) => e.id)).toEqual(['e1']);
    });
});

describe('buildAnnounceConfirmCopy', () => {
    it('uses staff language and never mentions cron, tick, or API', () => {
        const copy = buildAnnounceConfirmCopy({
            kind: 'day',
            programName: dinner.programName,
            date: dinner.date,
            events: [dinner],
            announceBound: false,
        });
        expect(copy.title).toBe('Announce this day');
        expect(copy.programLine).toBe(dinner.programName);
        expect(copy.eventLines[0]).toContain('Opening dinner');
        expect(copy.destinationLine).toBe(ANNOUNCE_DESTINATION);
        expect(copy.unboundLine).toBe(ANNOUNCE_ROOM_UNBOUND);
        expect(staffCopyHasForbiddenTerms(copy.allText)).toBe(false);
        expect(staffCopyHasForbiddenTerms(copy.title)).toBe(false);
        expect(staffCopyHasForbiddenTerms(ANNOUNCE_SUCCESS_LIVE)).toBe(false);
        expect(staffCopyHasForbiddenTerms(ANNOUNCE_SUCCESS_TEST)).toBe(false);
    });

    it('titles a single-event confirm as Announce this event', () => {
        const copy = buildAnnounceConfirmCopy({
            kind: 'event',
            programName: dinner.programName,
            date: dinner.date,
            events: [dinner],
            announceBound: true,
        });
        expect(copy.title).toBe('Announce this event');
        expect(copy.unboundLine).toBe('');
    });
});

describe('toAnnouncePayload', () => {
    it('sends the fields the Integration API expects', () => {
        expect(toAnnouncePayload(dinner)).toMatchObject({
            id: 'e1',
            title: 'Opening dinner',
            date: '2026-09-02',
            acceptRsvp: true,
            imageUrl: 'https://cdn.example.com/flier.jpg',
        });
    });
});
