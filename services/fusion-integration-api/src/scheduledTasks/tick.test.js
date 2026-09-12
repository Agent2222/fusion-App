import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { processDueScheduledTasks, processOneScheduledTask } from './tick.js';

function taskFixture(over = {}) {
    return {
        id: 't1',
        name: 'Arrival reminder',
        enabled: true,
        channels: 'email',
        kind: 'flight_followup',
        programIds: ['p1'],
        lineRooms: 'both',
        customSubject: '',
        customBodyText: '',
        customLineText: '',
        timezone: 'Asia/Tokyo',
        firstRunLocal: '2026-09-15T09:00',
        repeat: 'once',
        skipIfDone: true,
        nextRunAtIso: '2020-01-01T00:00:00.000Z',
        lockedUntilIso: '',
        ...over,
    };
}

function audienceFixture() {
    return {
        programId: 'p1',
        localesJson: JSON.stringify({ en: { headline: 'Kaga City' } }),
        comms: [],
        lineBinding: { programId: 'p1', groupGeneralId: 'G1', groupAnnounceId: 'A1' },
        travelPrepLinks: [{ title: 'Suica', url: 'https://example.com/suica', description: 'JR East', imageUrl: '', sortOrder: 0 }],
        applicants: [
            {
                applicantId: 'a1',
                email: 'ada@example.com',
                fullName: 'Ada Lovelace',
                slotSecured: true,
                status: 'accepted',
                hasArrival: false,
                inviteSentAt: '',
            },
            {
                applicantId: 'a2',
                email: 'done@example.com',
                fullName: 'Done',
                slotSecured: true,
                status: 'accepted',
                hasArrival: true,
                inviteSentAt: '',
            },
        ],
    };
}

describe('scheduled task tick', () => {
    it('claims, emails, and completes without sending twice', async () => {
        const tasks = [taskFixture()];
        let claimed = false;
        let completed = 0;
        const emails = [];
        const actor = {
            integrationListEnabledScheduledTasks: async () => tasks,
            integrationClaimScheduledTask: async (id) => {
                if (claimed) return [];
                claimed = true;
                return [tasks.find((t) => t.id === id)];
            },
            integrationGetScheduledTaskAudience: async () => audienceFixture(),
            integrationCompleteScheduledTaskRun: async () => {
                completed += 1;
            },
            integrationRecordProgramCommsInvites: async () => {},
        };
        const first = await processDueScheduledTasks({
            actor,
            now: Date.parse('2026-09-15T00:00:00.000Z'),
            sendEmailBatch: async (messages) => {
                emails.push(...messages);
                return { ok: true, results: messages.map((m) => ({ to: m.to, ok: true })) };
            },
            pushLine: async () => {},
        });
        assert.equal(first.processed, 1);
        assert.equal(emails.length, 1);
        assert.match(emails[0].html, /Travel preparation/);
        assert.match(emails[0].html, /ADD ARRIVAL TIME/);
        assert.equal(completed, 1);

        const second = await processDueScheduledTasks({
            actor,
            now: Date.parse('2026-09-15T00:01:00.000Z'),
            sendEmailBatch: async (messages) => {
                emails.push(...messages);
                return { ok: true, results: messages.map((m) => ({ to: m.to, ok: true })) };
            },
            pushLine: async () => {},
        });
        assert.equal(second.processed, 0);
        assert.equal(emails.length, 1);
    });

    it('posts LINE chat to the Comms Announcements room', async () => {
        const tasks = [taskFixture({ channels: 'line', lineRooms: 'announce', customLineText: 'Hello rooms' })];
        const pushed = [];
        let run;
        const actor = {
            integrationListEnabledScheduledTasks: async () => tasks,
            integrationClaimScheduledTask: async () => [tasks[0]],
            integrationGetScheduledTaskAudience: async () => audienceFixture(),
            integrationCompleteScheduledTaskRun: async (_id, recorded) => {
                run = recorded;
            },
        };
        await processOneScheduledTask({
            actor,
            taskId: 't1',
            now: Date.parse('2026-09-15T00:00:00.000Z'),
            sendEmailBatch: async () => ({ ok: true, results: [] }),
            pushLine: async (opts) => {
                pushed.push(opts);
            },
            fetchLineGroupName: async (id) => (id === 'A1' ? 'Announcements' : 'General'),
        });
        assert.equal(run.status, 'ok');
        assert.equal(pushed.length, 1);
        assert.equal(pushed[0].groupId, 'A1');
        assert.equal(pushed[0].text, 'Hello rooms');
    });

    it('records a failed LINE send when the chat is not connected', async () => {
        const tasks = [taskFixture({ channels: 'line', customLineText: 'Hello rooms' })];
        let run;
        const actor = {
            integrationListEnabledScheduledTasks: async () => tasks,
            integrationClaimScheduledTask: async () => [tasks[0]],
            integrationGetScheduledTaskAudience: async () => ({
                ...audienceFixture(),
                lineBinding: { programId: 'p1', groupGeneralId: '', groupAnnounceId: '' },
            }),
            integrationCompleteScheduledTaskRun: async (_id, recorded) => {
                run = recorded;
            },
        };
        await processOneScheduledTask({
            actor,
            taskId: 't1',
            now: Date.parse('2026-09-15T00:00:00.000Z'),
            sendEmailBatch: async () => ({ ok: true, results: [] }),
            pushLine: async () => {},
        });
        assert.equal(run.status, 'error');
        assert.match(run.summary, /LINE chat isn’t connected/i);
        assert.equal(run.lineOk, 0);
    });

    it('posts the day’s schedule as LINE Flex and does not email', async () => {
        const tasks = [
            taskFixture({
                kind: 'announce_day',
                channels: 'line',
                lineRooms: 'announce',
                customLineText: 'today',
                timezone: 'Asia/Tokyo',
            }),
        ];
        const pushed = [];
        let run;
        const actor = {
            integrationListEnabledScheduledTasks: async () => tasks,
            integrationClaimScheduledTask: async () => [tasks[0]],
            integrationGetScheduledTaskAudience: async () => audienceFixture(),
            integrationListScheduleEventsForDay: async (programId, date) =>
                JSON.stringify([
                    {
                        id: 'ev-1',
                        title: 'Studio visit',
                        date,
                        startTime: '10:00',
                        endTime: '12:00',
                        programId,
                        acceptRsvp: true,
                    },
                ]),
            integrationCompleteScheduledTaskRun: async (_id, recorded) => {
                run = recorded;
            },
        };
        await processOneScheduledTask({
            actor,
            taskId: 't1',
            now: Date.parse('2026-09-15T00:00:00.000Z'),
            sendEmailBatch: async () => {
                throw new Error('should not email');
            },
            pushLine: async (opts) => {
                pushed.push(opts);
            },
        });
        assert.equal(run.status, 'ok');
        assert.equal(run.emailOk, 0);
        assert.equal(run.lineOk, 1);
        assert.equal(pushed.length, 1);
        assert.equal(pushed[0].groupId, 'A1');
        assert.ok(Array.isArray(pushed[0].messages));
        assert.ok(pushed[0].messages.length >= 1);
        assert.equal(pushed[0].text, undefined);
    });

    it('posts an open-day card when nothing is scheduled', async () => {
        const tasks = [
            taskFixture({
                kind: 'announce_day',
                channels: 'line',
                customLineText: 'today',
            }),
        ];
        const pushed = [];
        let run;
        const actor = {
            integrationListEnabledScheduledTasks: async () => tasks,
            integrationClaimScheduledTask: async () => [tasks[0]],
            integrationGetScheduledTaskAudience: async () => audienceFixture(),
            integrationListScheduleEventsForDay: async () => '[]',
            integrationCompleteScheduledTaskRun: async (_id, recorded) => {
                run = recorded;
            },
        };
        await processOneScheduledTask({
            actor,
            taskId: 't1',
            now: Date.parse('2026-09-15T00:00:00.000Z'),
            sendEmailBatch: async () => ({ ok: true, results: [] }),
            pushLine: async (opts) => {
                pushed.push(opts);
            },
        });
        assert.equal(run.status, 'ok');
        assert.equal(run.lineOk, 1);
        assert.equal(run.lineFail, 0);
        assert.match(run.summary, /open-day/i);
        assert.equal(pushed.length, 1);
        assert.equal(pushed[0].messages.length, 1);
        assert.equal(pushed[0].messages[0].contents.type, 'bubble');
        const texts = pushed[0].messages[0].contents.body.contents.map((c) => c.text).join(' ');
        assert.match(texts, /No events scheduled/);
        assert.match(texts, /create/);
    });
});
