import { describe, expect, it } from 'vitest';
import {
    clampScheduleAvailability,
    escapeControlCharsInJsonStrings,
    formatScheduleCanisterError,
    isSeededDemoScheduleEvent,
    normalizeScheduleImportance,
    normalizeScheduleRsvpIds,
    parseCanisterJsonText,
    scheduleEventPeopleLabel,
    scheduleEventRsvpCountLabel,
    scheduleImportanceLabel,
    scheduleImportancePillClass,
    weekRangeContaining,
} from './scheduleModel.js';

describe('normalizeScheduleImportance', () => {
    it('defaults unknown values to general', () => {
        expect(normalizeScheduleImportance(undefined)).toBe('general');
        expect(normalizeScheduleImportance('')).toBe('general');
        expect(normalizeScheduleImportance('urgent')).toBe('general');
    });

    it('accepts optional, suggested, and general', () => {
        expect(normalizeScheduleImportance('Optional')).toBe('optional');
        expect(normalizeScheduleImportance('SUGGESTED')).toBe('suggested');
        expect(normalizeScheduleImportance('general')).toBe('general');
    });
});

describe('clampScheduleAvailability', () => {
    it('returns 0 when RSVP is off', () => {
        expect(clampScheduleAvailability(50, false)).toBe(0);
        expect(clampScheduleAvailability(0, false)).toBe(0);
    });

    it('defaults to 20 when RSVP is on and the value is empty or zero', () => {
        expect(clampScheduleAvailability(0, true)).toBe(20);
        expect(clampScheduleAvailability('', true)).toBe(20);
        expect(clampScheduleAvailability(undefined, true)).toBe(20);
    });

    it('clamps to 1–200 when RSVP is on', () => {
        expect(clampScheduleAvailability(1, true)).toBe(1);
        expect(clampScheduleAvailability(200, true)).toBe(200);
        expect(clampScheduleAvailability(201, true)).toBe(200);
        expect(clampScheduleAvailability(-4, true)).toBe(20);
    });
});

describe('schedule importance pills', () => {
    it('labels and classes match the view pills', () => {
        expect(scheduleImportanceLabel('optional')).toBe('Optional');
        expect(scheduleImportanceLabel('suggested')).toBe('Suggested');
        expect(scheduleImportanceLabel('general')).toBe('General');
        expect(scheduleImportancePillClass('optional')).toBe(
            'event-dialog__importance event-dialog__importance--optional',
        );
        expect(scheduleImportancePillClass('suggested')).toBe(
            'event-dialog__importance event-dialog__importance--suggested',
        );
        expect(scheduleImportancePillClass('')).toBe(
            'event-dialog__importance event-dialog__importance--general',
        );
    });
});

describe('RSVP people section', () => {
    it('uses RSVPs instead of Artists when the event accepts RSVP', () => {
        expect(scheduleEventPeopleLabel(true)).toBe('RSVPs');
        expect(scheduleEventPeopleLabel(false)).toBe('Artists');
    });

    it('formats count vs cap', () => {
        expect(scheduleEventRsvpCountLabel(1, 20)).toBe('1 / 20 RSVP');
        expect(scheduleEventRsvpCountLabel(3, 20)).toBe('3 / 20 RSVPs');
        expect(scheduleEventRsvpCountLabel(0, 8)).toBe('0 / 8 RSVPs');
    });

    it('dedupes RSVP ids', () => {
        expect(normalizeScheduleRsvpIds(['a', 'a', '', 'b'])).toEqual(['a', 'b']);
        expect(normalizeScheduleRsvpIds(null)).toEqual([]);
    });
});

describe('weekRangeContaining', () => {
    it('returns Monday–Sunday bounds', () => {
        expect(weekRangeContaining('2026-08-12')).toEqual({
            start: '2026-08-10',
            end: '2026-08-16',
        });
    });
});

describe('isSeededDemoScheduleEvent', () => {
    it('matches leftover fixture ids and createdBy=seed only', () => {
        expect(isSeededDemoScheduleEvent({ id: 'evt-kaga-arrival', createdBy: 'staff' })).toBe(true);
        expect(isSeededDemoScheduleEvent({ id: 'evt-custom', createdBy: 'seed' })).toBe(true);
    });

    it('does not delete staff-created events that reused demo program ids', () => {
        expect(
            isSeededDemoScheduleEvent({
                id: 'evt-aaaaa-bbbbb-123',
                programId: 'prog-kaga',
                createdBy: 'aaaaa-bbbbb',
            }),
        ).toBe(false);
        expect(
            isSeededDemoScheduleEvent({
                id: 'evt-aaaaa-bbbbb-456',
                programId: 'prog-tokyo',
                createdBy: 'aaaaa-bbbbb',
            }),
        ).toBe(false);
    });
});

describe('formatScheduleCanisterError', () => {
    it('extracts IC reject text and maps auth traps', () => {
        expect(
            formatScheduleCanisterError(
                new Error('Call failed:\nReject text: Unauthorized: staff or admin only'),
            ),
        ).toBe('You must be signed in as staff or admin to load or change the schedule.');
        expect(
            formatScheduleCanisterError(
                'Canister xyz trapped explicitly: Studio feature not editable: schedule',
            ),
        ).toBe(
            'You do not have permission to edit Schedule. Ask an admin to enable Schedule edit under Permissions.',
        );
    });

    it('passes through short validation messages', () => {
        expect(formatScheduleCanisterError(new Error('Title required'))).toBe('Title required');
        expect(formatScheduleCanisterError(new Error('version conflict'))).toBe('version conflict');
    });
});

describe('parseCanisterJsonText', () => {
    it('parses schedule JSON that contains a raw newline in notes', () => {
        const raw = '[{"id":"evt-1","title":"Studio visit","notes":"Line one\nLine two"}]';
        expect(() => JSON.parse(raw)).toThrow(/Bad control character|JSON/i);
        const parsed = parseCanisterJsonText(raw);
        expect(parsed[0].notes).toBe('Line one\nLine two');
        expect(parsed[0].title).toBe('Studio visit');
    });

    it('leaves already-escaped strings and quotes intact', () => {
        const raw = '{"title":"Say \\"hello\\"","notes":"ok\\nthere"}';
        expect(parseCanisterJsonText(raw)).toEqual({
            title: 'Say "hello"',
            notes: 'ok\nthere',
        });
        expect(escapeControlCharsInJsonStrings(raw)).toBe(raw);
    });

    it('returns non-string values unchanged', () => {
        expect(parseCanisterJsonText([{ id: 'evt-1' }])).toEqual([{ id: 'evt-1' }]);
    });
});
