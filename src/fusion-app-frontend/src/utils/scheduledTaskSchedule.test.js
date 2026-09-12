import { describe, expect, it } from 'vitest';
import {
    addDaysToUtcIsoInZone,
    encodeScheduledTaskWindow,
    isScheduledTaskDue,
    isScheduledTaskLocked,
    isScheduledTaskRunnable,
    localDateTimeToUtcIso,
    lockWindowIso,
    nextRunAfterComplete,
    normalizeAnnounceDay,
    parseScheduledTaskWindow,
    resolveAnnounceDayYmd,
    scheduledTaskTimezoneId,
    utcIsoToLocalDateTime,
} from './scheduledTaskSchedule.js';

describe('scheduledTaskSchedule', () => {
    it('converts Japan morning to the previous UTC evening', () => {
        expect(localDateTimeToUtcIso('2026-09-15T09:00', 'Asia/Tokyo')).toBe('2026-09-15T00:00:00.000Z');
        expect(localDateTimeToUtcIso('2026-09-15T09:00', 'Japan')).toBe('2026-09-15T00:00:00.000Z');
        expect(scheduledTaskTimezoneId('Japan')).toBe('Asia/Tokyo');
        expect(scheduledTaskTimezoneId('')).toBe('Asia/Tokyo');
    });

    it('marks due when next send is in the past', () => {
        expect(isScheduledTaskDue('2026-01-01T00:00:00.000Z', Date.parse('2026-01-02T00:00:00.000Z'))).toBe(true);
        expect(isScheduledTaskDue('2026-01-03T00:00:00.000Z', Date.parse('2026-01-02T00:00:00.000Z'))).toBe(false);
    });

    it('treats an expired lock as unlocked', () => {
        expect(isScheduledTaskLocked('2026-01-01T00:00:00.000Z', Date.parse('2026-01-01T00:20:00.000Z'))).toBe(false);
        expect(isScheduledTaskLocked('2026-01-01T00:20:00.000Z', Date.parse('2026-01-01T00:10:00.000Z'))).toBe(true);
    });

    it('does not run a paused or locked task', () => {
        expect(
            isScheduledTaskRunnable(
                { enabled: false, nextRunAtIso: '2020-01-01T00:00:00.000Z', lockedUntilIso: '' },
                Date.now(),
            ),
        ).toBe(false);
        expect(
            isScheduledTaskRunnable(
                {
                    enabled: true,
                    nextRunAtIso: '2020-01-01T00:00:00.000Z',
                    lockedUntilIso: '2099-01-01T00:00:00.000Z',
                },
                Date.parse('2026-01-01T00:00:00.000Z'),
            ),
        ).toBe(false);
    });

    it('advances once, every day, and every week in the task time zone', () => {
        const daily = nextRunAfterComplete({
            timezone: 'Asia/Tokyo',
            repeat: 'daily',
            nextRunAtIso: '2026-09-15T00:00:00.000Z',
        });
        expect(daily.enabled).toBe(true);
        expect(daily.nextRunAtIso).toBe('2026-09-16T00:00:00.000Z');
        const weekly = nextRunAfterComplete({
            timezone: 'Asia/Tokyo',
            repeat: 'weekly',
            nextRunAtIso: '2026-09-15T00:00:00.000Z',
        });
        expect(weekly.nextRunAtIso).toBe('2026-09-22T00:00:00.000Z');
        const once = nextRunAfterComplete({
            timezone: 'Asia/Tokyo',
            repeat: 'once',
            nextRunAtIso: '2026-09-15T00:00:00.000Z',
        });
        expect(once.enabled).toBe(false);
    });

    it('keeps local clock time across US Pacific spring-forward', () => {
        const start = localDateTimeToUtcIso('2026-03-07T09:00', 'America/Los_Angeles');
        const next = addDaysToUtcIsoInZone(start, 'America/Los_Angeles', 1);
        expect(utcIsoToLocalDateTime(next, 'America/Los_Angeles')).toBe('2026-03-08T09:00');
    });

    it('builds a 10 minute lock window', () => {
        const w = lockWindowIso(Date.parse('2026-09-15T00:00:00.000Z'));
        expect(w.nowIso).toBe('2026-09-15T00:00:00.000Z');
        expect(w.lockUntilIso).toBe('2026-09-15T00:10:00.000Z');
    });

    it('encodes and parses a start / stop window on firstRunLocal', () => {
        expect(encodeScheduledTaskWindow('2026-09-15T09:00', '2026-09-30T18:00')).toBe(
            '2026-09-15T09:00~2026-09-30T18:00',
        );
        expect(parseScheduledTaskWindow({ firstRunLocal: '2026-09-15T09:00~2026-09-30T18:00' })).toEqual({
            firstRunLocal: '2026-09-15T09:00',
            endsAtLocal: '2026-09-30T18:00',
        });
        expect(parseScheduledTaskWindow({ firstRunLocal: '2026-09-15T09:00' }).endsAtLocal).toBe('');
    });

    it('stops daily and weekly repeats after the end date and time', () => {
        const daily = nextRunAfterComplete({
            timezone: 'Asia/Tokyo',
            repeat: 'daily',
            nextRunAtIso: '2026-09-15T00:00:00.000Z',
            firstRunLocal: '2026-09-15T09:00~2026-09-16T09:00',
        });
        expect(daily.enabled).toBe(true);
        expect(daily.nextRunAtIso).toBe('2026-09-16T00:00:00.000Z');
        const afterEnd = nextRunAfterComplete({
            timezone: 'Asia/Tokyo',
            repeat: 'daily',
            nextRunAtIso: '2026-09-16T00:00:00.000Z',
            firstRunLocal: '2026-09-15T09:00~2026-09-16T09:00',
        });
        expect(afterEnd.enabled).toBe(false);
        expect(
            isScheduledTaskRunnable(
                {
                    enabled: true,
                    nextRunAtIso: '2026-09-17T00:00:00.000Z',
                    lockedUntilIso: '',
                    firstRunLocal: '2026-09-15T09:00~2026-09-16T09:00',
                    timezone: 'Asia/Tokyo',
                },
                Date.parse('2026-09-17T01:00:00.000Z'),
            ),
        ).toBe(false);
    });

    it('resolves announce day to this day, the next day, or a fixed date', () => {
        expect(normalizeAnnounceDay('Tomorrow')).toBe('tomorrow');
        expect(normalizeAnnounceDay('2026-10-02')).toBe('2026-10-02');
        expect(resolveAnnounceDayYmd('today', 'Asia/Tokyo', Date.parse('2026-09-15T00:00:00.000Z'))).toBe('2026-09-15');
        expect(resolveAnnounceDayYmd('tomorrow', 'Asia/Tokyo', Date.parse('2026-09-15T00:00:00.000Z'))).toBe(
            '2026-09-16',
        );
        expect(resolveAnnounceDayYmd('2026-10-02', 'Asia/Tokyo', Date.parse('2026-09-15T00:00:00.000Z'))).toBe(
            '2026-10-02',
        );
    });
});
