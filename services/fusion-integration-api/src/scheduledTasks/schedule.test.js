import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
    utcIsoToLocalDateTime,
} from './schedule.js';

describe('scheduled task schedule', () => {
    it('converts Japan morning to the previous UTC evening', () => {
        const iso = localDateTimeToUtcIso('2026-09-15T09:00', 'Asia/Tokyo');
        assert.equal(iso, '2026-09-15T00:00:00.000Z');
    });

    it('marks due when next send is in the past', () => {
        assert.equal(isScheduledTaskDue('2026-01-01T00:00:00.000Z', Date.parse('2026-01-02T00:00:00.000Z')), true);
        assert.equal(isScheduledTaskDue('2026-01-03T00:00:00.000Z', Date.parse('2026-01-02T00:00:00.000Z')), false);
    });

    it('treats an expired lock as unlocked', () => {
        assert.equal(isScheduledTaskLocked('2026-01-01T00:00:00.000Z', Date.parse('2026-01-01T00:20:00.000Z')), false);
        assert.equal(isScheduledTaskLocked('2026-01-01T00:20:00.000Z', Date.parse('2026-01-01T00:10:00.000Z')), true);
    });

    it('does not run a paused or locked task', () => {
        assert.equal(
            isScheduledTaskRunnable(
                { enabled: false, nextRunAtIso: '2020-01-01T00:00:00.000Z', lockedUntilIso: '' },
                Date.now(),
            ),
            false,
        );
        assert.equal(
            isScheduledTaskRunnable(
                {
                    enabled: true,
                    nextRunAtIso: '2020-01-01T00:00:00.000Z',
                    lockedUntilIso: '2099-01-01T00:00:00.000Z',
                },
                Date.parse('2026-01-01T00:00:00.000Z'),
            ),
            false,
        );
    });

    it('advances daily and weekly in the task time zone', () => {
        const daily = nextRunAfterComplete({
            timezone: 'Asia/Tokyo',
            repeat: 'daily',
            nextRunAtIso: '2026-09-15T00:00:00.000Z',
        });
        assert.equal(daily.enabled, true);
        assert.equal(daily.nextRunAtIso, '2026-09-16T00:00:00.000Z');
        const weekly = nextRunAfterComplete({
            timezone: 'Asia/Tokyo',
            repeat: 'weekly',
            nextRunAtIso: '2026-09-15T00:00:00.000Z',
        });
        assert.equal(weekly.nextRunAtIso, '2026-09-22T00:00:00.000Z');
        const once = nextRunAfterComplete({
            timezone: 'Asia/Tokyo',
            repeat: 'once',
            nextRunAtIso: '2026-09-15T00:00:00.000Z',
        });
        assert.equal(once.enabled, false);
    });

    it('keeps local clock time across US Pacific spring-forward', () => {
        const start = localDateTimeToUtcIso('2026-03-07T09:00', 'America/Los_Angeles');
        const next = addDaysToUtcIsoInZone(start, 'America/Los_Angeles', 1);
        assert.equal(utcIsoToLocalDateTime(next, 'America/Los_Angeles'), '2026-03-08T09:00');
    });

    it('adds calendar days without using raw 24h UTC for date part', () => {
        const next = addDaysToUtcIsoInZone('2026-09-15T00:00:00.000Z', 'Asia/Tokyo', 1);
        assert.equal(next, '2026-09-16T00:00:00.000Z');
    });

    it('builds a 10 minute lock window', () => {
        const w = lockWindowIso(Date.parse('2026-09-15T00:00:00.000Z'));
        assert.equal(w.nowIso, '2026-09-15T00:00:00.000Z');
        assert.equal(w.lockUntilIso, '2026-09-15T00:10:00.000Z');
    });

    it('encodes and parses a start / stop window on firstRunLocal', () => {
        assert.equal(
            encodeScheduledTaskWindow('2026-09-15T09:00', '2026-09-30T18:00'),
            '2026-09-15T09:00~2026-09-30T18:00',
        );
        assert.deepEqual(parseScheduledTaskWindow({ firstRunLocal: '2026-09-15T09:00~2026-09-30T18:00' }), {
            firstRunLocal: '2026-09-15T09:00',
            endsAtLocal: '2026-09-30T18:00',
        });
    });

    it('stops daily repeats after the end date and time', () => {
        const lastOk = nextRunAfterComplete({
            timezone: 'Asia/Tokyo',
            repeat: 'daily',
            nextRunAtIso: '2026-09-15T00:00:00.000Z',
            firstRunLocal: '2026-09-15T09:00~2026-09-16T09:00',
        });
        assert.equal(lastOk.enabled, true);
        const afterEnd = nextRunAfterComplete({
            timezone: 'Asia/Tokyo',
            repeat: 'daily',
            nextRunAtIso: '2026-09-16T00:00:00.000Z',
            firstRunLocal: '2026-09-15T09:00~2026-09-16T09:00',
        });
        assert.equal(afterEnd.enabled, false);
        assert.equal(
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
            false,
        );
    });

    it('resolves announce day to this day, the next day, or a fixed date', () => {
        assert.equal(normalizeAnnounceDay('Tomorrow'), 'tomorrow');
        assert.equal(resolveAnnounceDayYmd('today', 'Asia/Tokyo', Date.parse('2026-09-15T00:00:00.000Z')), '2026-09-15');
        assert.equal(
            resolveAnnounceDayYmd('tomorrow', 'Asia/Tokyo', Date.parse('2026-09-15T00:00:00.000Z')),
            '2026-09-16',
        );
        assert.equal(resolveAnnounceDayYmd('2026-10-02', 'Asia/Tokyo', Date.now()), '2026-10-02');
    });
});
