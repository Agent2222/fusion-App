import { describe, expect, it } from 'vitest';
import {
    CHANNEL_LABELS,
    KIND_LABELS,
    REPEAT_LABELS,
    SCHEDULED_TASKS_EMPTY,
    SCHEDULED_TASKS_SUBTITLE,
    SCHEDULED_TASKS_TITLE,
    comingUpRailHtml,
    filterScheduledTasks,
    lastResultLabel,
    needsALookRailHtml,
    scheduledTaskCardHtml,
    scheduledTaskStats,
    scheduledTasksEmptyHtml,
    scheduledTasksHeroHtml,
    scheduledTasksStatsHtml,
    staffCopyHasForbiddenTerms,
} from './scheduledTaskCopy.js';

const sampleTask = {
    id: 'st-1',
    name: 'Kaga arrival reminder',
    enabled: true,
    channels: 'email',
    kind: 'flight_followup',
    programIds: ['prog-kaga'],
    timezone: 'Asia/Tokyo',
    nextRunAtIso: '2026-09-04T00:00:00.000Z',
    lastStatus: '',
};

describe('scheduledTaskCopy', () => {
    it('uses staff labels for kinds, channels, and repeat', () => {
        expect(KIND_LABELS.flight_followup).toBe('Remind artists to add arrival time');
        expect(KIND_LABELS.comms_invite).toBe('Send chat room invite');
        expect(KIND_LABELS.custom).toBe('Write your own message');
        expect(KIND_LABELS.announce_day).toBe('Announce the day’s schedule');
        expect(CHANNEL_LABELS.both).toBe('Email and LINE');
        expect(REPEAT_LABELS.daily).toBe('Every day');
        expect(REPEAT_LABELS.weekly).toBe('Every week');
    });

    it('renders hero, stats, empty state, and attention with staff language', () => {
        const html = [
            scheduledTasksHeroHtml({ canEdit: true }),
            scheduledTasksStatsHtml({ on: 2, dueSoon: 1, sentToday: 0, failed: 1 }),
            scheduledTasksEmptyHtml(),
            scheduledTaskCardHtml(sampleTask, { programNames: ['Kaga City Artist Residency'] }),
            comingUpRailHtml([sampleTask]),
            needsALookRailHtml([{ task: sampleTask, reason: 'LINE chat isn’t connected' }]),
        ].join('\n');
        expect(html).toContain(SCHEDULED_TASKS_TITLE);
        expect(html).toContain(SCHEDULED_TASKS_SUBTITLE);
        expect(html).toContain('New task');
        expect(html).toContain('Pause all tasks');
        expect(html).toContain('Sending today or tomorrow');
        expect(html).toContain('Sent today');
        expect(html).toContain('Didn’t send');
        expect(html).toContain(SCHEDULED_TASKS_EMPTY);
        expect(html).toContain('Coming up');
        expect(html).toContain('Needs a look');
        expect(html).toContain('LINE chat isn’t connected');
        expect(staffCopyHasForbiddenTerms(html)).toBe(false);
    });

    it('never includes cron, tick, or API in staff-facing helpers', () => {
        const html = scheduledTasksHeroHtml({ canEdit: true }) + scheduledTasksEmptyHtml();
        expect(html).not.toMatch(/cron/i);
        expect(html).not.toMatch(/tick/i);
        expect(html).not.toMatch(/\bAPI\b/);
        expect(html).not.toMatch(/\bjob\b/i);
    });

    it('filters tabs and shows sent / won’t repeat', () => {
        const paused = { ...sampleTask, id: 'p', enabled: false };
        const failed = { ...sampleTask, id: 'f', lastStatus: 'failed' };
        const sentOnce = { ...sampleTask, id: 's', enabled: false, repeat: 'once', lastStatus: 'ok' };
        expect(filterScheduledTasks([sampleTask, paused, failed], { tab: 'on' })).toHaveLength(2);
        expect(filterScheduledTasks([sampleTask, paused, failed], { tab: 'paused' })).toHaveLength(1);
        expect(filterScheduledTasks([sampleTask, paused, failed], { tab: 'failed' })).toHaveLength(1);
        expect(lastResultLabel(sentOnce)).toBe('Sent · won’t repeat');
        expect(scheduledTaskStats([sampleTask, failed]).failed).toBe(1);
        const announce = { ...sampleTask, id: 'ad', kind: 'announce_day', channels: 'line' };
        expect(filterScheduledTasks([announce], { channel: 'line' })).toHaveLength(1);
        expect(filterScheduledTasks([announce], { channel: 'email' })).toHaveLength(0);
    });
});
