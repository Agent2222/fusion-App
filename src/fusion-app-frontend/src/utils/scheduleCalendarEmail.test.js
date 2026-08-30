import { describe, expect, it } from 'vitest';
import {
    PROGRAM_CALENDAR_HERO_URL,
    buildProgramCalendarEmailHtml,
    eventsForProgramCalendar,
    formatCalendarEventLine,
    groupCalendarEventsByWeek,
    programCalendarHeadlineHtml,
} from './scheduleCalendarEmail.js';

describe('scheduleCalendarEmail', () => {
    it('formats a bullet line as date, name, then time', () => {
        expect(
            formatCalendarEventLine({
                date: '2026-09-14',
                title: 'Welcome breakfast',
                startTime: '09:00',
                endTime: '10:30',
                allDay: false,
            }),
        ).toBe('Mon, Sep 14, 2026 — Welcome breakfast — 9:00 AM – 10:30 AM');
    });

    it('keeps only confirmed events for the selected program', () => {
        const rows = eventsForProgramCalendar(
            [
                {
                    id: '1',
                    title: 'A',
                    date: '2026-09-14',
                    startTime: '09:00',
                    status: 'confirmed',
                    relationKind: 'program',
                    programId: 'kaga',
                },
                {
                    id: '2',
                    title: 'B',
                    date: '2026-09-15',
                    startTime: '09:00',
                    status: 'draft',
                    relationKind: 'program',
                    programId: 'kaga',
                },
                {
                    id: '3',
                    title: 'C',
                    date: '2026-09-16',
                    startTime: '09:00',
                    status: 'confirmed',
                    relationKind: 'staff',
                    programId: 'kaga',
                },
            ],
            'kaga',
        );
        expect(rows.map((e) => e.title)).toEqual(['A']);
    });

    it('renders program name as the calendar headline and uses the Kaga hero', () => {
        expect(programCalendarHeadlineHtml('Kaga City Artist Residency')).toBe(
            'Kaga City Artist Residency<br>Calendar',
        );
        const html = buildProgramCalendarEmailHtml({
            programName: 'Kaga City Artist Residency',
            events: [
                {
                    id: '1',
                    title: 'Welcome breakfast',
                    date: '2026-09-14',
                    startTime: '09:00',
                    endTime: '10:30',
                    allDay: false,
                    status: 'confirmed',
                },
            ],
        });
        expect(html).toContain(PROGRAM_CALENDAR_HERO_URL);
        expect(html).toContain('Kaga City Artist Residency<br>Calendar');
        expect(html).toContain('<ul');
        expect(html).toContain('Welcome breakfast');
        expect(html).toContain('VIEW CALENDAR');
        expect(html).not.toContain('DOWNLOAD CALENDAR');
        expect(html).not.toContain('OPEN SCHEDULE');
        expect(html).toContain('Week 1');
    });

    it('numbers calendar weeks from the first event week and draws a rule between weeks', () => {
        const weeks = groupCalendarEventsByWeek([
            {
                id: '1',
                title: 'Welcome',
                date: '2026-09-14',
                startTime: '09:00',
                status: 'confirmed',
            },
            {
                id: '2',
                title: 'Crit',
                date: '2026-09-21',
                startTime: '11:00',
                status: 'confirmed',
            },
            {
                id: '3',
                title: 'Later',
                date: '2026-10-05',
                startTime: '10:00',
                status: 'confirmed',
            },
        ]);
        expect(weeks.map((w) => w.weekNumber)).toEqual([1, 2, 4]);
        const html = buildProgramCalendarEmailHtml({
            programName: 'Kaga',
            events: weeks.flatMap((w) => w.events),
        });
        expect(html).toContain('Week 1');
        expect(html).toContain('Week 2');
        expect(html).toContain('Week 4');
        expect(html).not.toContain('Week 3');
        expect((html.match(/<hr/g) || []).length).toBe(2);
    });
});
