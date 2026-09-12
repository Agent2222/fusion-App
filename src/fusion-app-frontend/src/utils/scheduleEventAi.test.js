import { describe, expect, it } from 'vitest';
import {
    applyScheduleEventRefineSuggestion,
    assignAllScheduleParticipantIds,
    assignAllScheduleStaff,
    buildScheduleEventRefinePrompt,
    buildScheduleEventRefineSource,
    parseScheduleEventRefineJson,
    scheduleEventRefineHasContext,
    stripProgramNameFromEventTitle,
    stripJoinUsOpener,
} from './scheduleEventAi.js';

describe('scheduleEventRefineHasContext', () => {
    it('is false when title, description, and program context are empty', () => {
        expect(scheduleEventRefineHasContext({})).toBe(false);
        expect(scheduleEventRefineHasContext({ title: '  ', notes: '' })).toBe(false);
    });

    it('is true when any of title, description, program, date, or location is set', () => {
        expect(scheduleEventRefineHasContext({ title: 'Studio visit' })).toBe(true);
        expect(scheduleEventRefineHasContext({ notes: 'Bring work' })).toBe(true);
        expect(scheduleEventRefineHasContext({ programName: 'Kaga' })).toBe(true);
        expect(scheduleEventRefineHasContext({ date: '2026-09-01' })).toBe(true);
        expect(scheduleEventRefineHasContext({ locationName: 'Studio A' })).toBe(true);
    });
});

describe('buildScheduleEventRefinePrompt', () => {
    it('includes program, date, and location when present', () => {
        const prompt = buildScheduleEventRefinePrompt({
            programName: 'Kaga City',
            date: '2026-09-12',
            locationName: 'Workshop',
        });
        expect(prompt).toContain('Kaga City');
        expect(prompt).toContain('2026-09-12');
        expect(prompt).toContain('Workshop');
        expect(prompt).toContain('"title"');
        expect(prompt).toContain('"description"');
        expect(prompt).toMatch(/never put it in the title/i);
        expect(prompt).toMatch(/Join us/i);
        expect(prompt).toMatch(/invitation openers/i);
    });
});

describe('buildScheduleEventRefineSource', () => {
    it('uses title and description when present', () => {
        expect(buildScheduleEventRefineSource({ title: 'Visit', notes: 'Tour the kiln' })).toContain('Visit');
        expect(buildScheduleEventRefineSource({ title: 'Visit', notes: 'Tour the kiln' })).toContain('Tour the kiln');
    });

    it('falls back to a compose stub when both fields are empty', () => {
        expect(buildScheduleEventRefineSource({})).toMatch(/compose/i);
    });
});

describe('parseScheduleEventRefineJson', () => {
    it('parses a clean object', () => {
        expect(parseScheduleEventRefineJson('{"title":"Kiln tour","description":"Meet at 10."}')).toEqual({
            title: 'Kiln tour',
            description: 'Meet at 10.',
        });
    });

    it('extracts JSON from fenced or noisy LLM output', () => {
        const raw = 'Here you go:\n```json\n{"title":"A","description":"B"}\n```\nThanks';
        expect(parseScheduleEventRefineJson(raw)).toEqual({ title: 'A', description: 'B' });
    });

    it('accepts notes as description alias and ignores extra keys', () => {
        expect(parseScheduleEventRefineJson('{"title":"A","notes":"B","extra":1}')).toEqual({
            title: 'A',
            description: 'B',
        });
    });

    it('returns null when neither title nor description is present', () => {
        expect(parseScheduleEventRefineJson('not json')).toBeNull();
        expect(parseScheduleEventRefineJson('{"foo":1}')).toBeNull();
    });
});

describe('stripProgramNameFromEventTitle', () => {
    const program = 'Fusion Kaga - Fall 2026 Artist Residency';

    it('removes the program name from a refined title', () => {
        expect(stripProgramNameFromEventTitle('Fusion Kaga - Fall 2026 Artist Residency — Studio visit', program)).toBe(
            'Studio visit',
        );
        expect(stripProgramNameFromEventTitle('Fusion Kaga: Opening dinner', program)).toBe('Opening dinner');
        expect(stripProgramNameFromEventTitle('Studio visit', program)).toBe('Studio visit');
    });

    it('does not strip a short place name out of an activity title', () => {
        expect(
            stripProgramNameFromEventTitle('Kaga walking tour', 'Kaga City Artist Residency'),
        ).toBe('Kaga walking tour');
    });
});

describe('applyScheduleEventRefineSuggestion', () => {
    it('strips the program name from the suggested title', () => {
        expect(
            applyScheduleEventRefineSuggestion(
                { title: 'Fusion Kaga — Kiln tour', description: 'Meet at the studio.' },
                { programName: 'Fusion Kaga - Fall 2026 Artist Residency' },
            ),
        ).toEqual({ title: 'Kiln tour', description: 'Meet at the studio.' });
    });

    it('strips a Join us opener from the suggested description', () => {
        expect(
            applyScheduleEventRefineSuggestion(
                { title: 'Kiln tour', description: 'Join us for a walk through the firing room at noon.' },
                { programName: 'Fusion Kaga - Fall 2026 Artist Residency' },
            ),
        ).toEqual({ title: 'Kiln tour', description: 'A walk through the firing room at noon.' });
    });
});

describe('stripJoinUsOpener', () => {
    it('drops Join us / Come join us / You’re invited prefixes', () => {
        expect(stripJoinUsOpener('Join us for a studio visit at 10.')).toBe('A studio visit at 10.');
        expect(stripJoinUsOpener('Come join us as we tour the kiln.')).toBe('Tour the kiln.');
        expect(stripJoinUsOpener('You’re invited to gather in the lounge.')).toBe('Gather in the lounge.');
        expect(stripJoinUsOpener('Meet at the studio at 10.')).toBe('Meet at the studio at 10.');
    });
});

describe('assignAllScheduleStaff', () => {
    it('maps the full roster and skips empty ids', () => {
        expect(
            assignAllScheduleStaff([
                { id: 'staff-starr', name: 'Starr Oge', initials: 'SO' },
                { id: '', name: 'Skip' },
                { id: 'staff-zoia', name: 'Zoia Amadi' },
            ]),
        ).toEqual([
            { id: 'staff-starr', name: 'Starr Oge', initials: 'SO' },
            { id: 'staff-zoia', name: 'Zoia Amadi', initials: 'ZA' },
        ]);
    });
});

describe('assignAllScheduleParticipantIds', () => {
    it('returns unique roster ids', () => {
        expect(
            assignAllScheduleParticipantIds([
                { id: 'a1' },
                { id: 'a1' },
                { id: 'a2' },
                { id: '' },
            ]),
        ).toEqual(['a1', 'a2']);
    });
});
