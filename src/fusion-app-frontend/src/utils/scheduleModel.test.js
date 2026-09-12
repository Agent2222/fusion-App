import { describe, expect, it } from 'vitest';
import {
    clampScheduleAvailability,
    escapeControlCharsInJsonStrings,
    formatScheduleCanisterError,
    isSeededDemoScheduleEvent,
    normalizeScheduleColor,
    normalizeScheduleImportance,
    scheduleCategoryMeta,
    scheduleInkOnHex,
    SCHEDULE_EVENT_CATEGORIES,
    SCHEDULE_INK_DARK,
    SCHEDULE_INK_LIGHT,
    normalizeScheduleRsvpIds,
    parseCanisterJsonText,
    scheduleEventPeopleLabel,
    scheduleEventRsvpCountLabel,
    scheduleImportanceLabel,
    scheduleImportancePillClass,
    formatScheduleEventCostInputValue,
    formatScheduleEventCostLabel,
    normalizeScheduleEventCostCents,
    normalizeScheduleEventCostCurrency,
    parseScheduleEventCostAmountToMinor,
    parseScheduleEventCostUsdToCents,
    scheduleEventShowsCost,
    weekRangeContaining,
} from './scheduleModel.js';

describe('normalizeScheduleColor', () => {
    it('maps legacy color names to categories', () => {
        expect(normalizeScheduleColor('sage')).toBe('setup');
        expect(normalizeScheduleColor('blue')).toBe('flights');
        expect(normalizeScheduleColor('sand')).toBe('exploration');
        expect(normalizeScheduleColor('blush')).toBe('traveling');
    });

    it('accepts the staff category list and defaults unknown values to creating', () => {
        expect(normalizeScheduleColor('Workshop')).toBe('workshop');
        expect(normalizeScheduleColor('')).toBe('creating');
        expect(normalizeScheduleColor('magenta')).toBe('creating');
        expect(SCHEDULE_EVENT_CATEGORIES).toHaveLength(11);
        expect(scheduleCategoryMeta('meals').label).toBe('Meals');
        expect(scheduleCategoryMeta('tours').hex).toBe('#ff8a1a');
    });
});

describe('scheduleInkOnHex', () => {
    it('uses light text on dark category colors and dark text on light ones', () => {
        expect(scheduleInkOnHex('#4a72c4')).toBe(SCHEDULE_INK_LIGHT);
        expect(scheduleInkOnHex('#111827')).toBe(SCHEDULE_INK_LIGHT);
        expect(scheduleInkOnHex('#ffe14a')).toBe(SCHEDULE_INK_DARK);
        expect(scheduleInkOnHex('#cfe8d6')).toBe(SCHEDULE_INK_DARK);
        expect(scheduleCategoryMeta('presentations').ink).toBe(SCHEDULE_INK_LIGHT);
        expect(scheduleCategoryMeta('external').ink).toBe(SCHEDULE_INK_DARK);
    });
});

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

describe('schedule event cost', () => {
    it('normalizes missing and invalid cost to 0', () => {
        expect(normalizeScheduleEventCostCents(undefined)).toBe(0);
        expect(normalizeScheduleEventCostCents('')).toBe(0);
        expect(normalizeScheduleEventCostCents(-5)).toBe(0);
    });

    it('parses USD input to cents and formats a label', () => {
        expect(parseScheduleEventCostUsdToCents('$25')).toBe(2500);
        expect(parseScheduleEventCostUsdToCents('12.50')).toBe(1250);
        expect(parseScheduleEventCostUsdToCents('')).toBe(0);
        expect(formatScheduleEventCostLabel(2500)).toBe('$25');
        expect(formatScheduleEventCostLabel(1250)).toBe('$12.50');
        expect(formatScheduleEventCostLabel(0)).toBe('');
    });

    it('parses yen as whole yen and formats with ¥', () => {
        expect(normalizeScheduleEventCostCurrency('¥')).toBe('JPY');
        expect(parseScheduleEventCostAmountToMinor('3,000', 'JPY')).toBe(3000);
        expect(parseScheduleEventCostAmountToMinor('¥2500', 'JPY')).toBe(2500);
        expect(formatScheduleEventCostLabel(3000, 'JPY')).toBe('¥3000');
        expect(formatScheduleEventCostInputValue(3000, 'JPY')).toBe('3000');
    });

    it('shows TBA when no priced amount is set', () => {
        expect(formatScheduleEventCostLabel(0, 'USD', true)).toBe('TBA');
        expect(formatScheduleEventCostLabel({ costCents: 0, costCurrency: 'JPY', costTba: true })).toBe(
            'TBA',
        );
        expect(parseScheduleEventCostAmountToMinor('TBA', 'USD')).toBe(0);
        expect(scheduleEventShowsCost(0, true)).toBe(true);
        expect(scheduleEventShowsCost(0, false)).toBe(false);
        expect(scheduleEventShowsCost(2500, false)).toBe(true);
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
