/**
 * Execute due scheduled tasks (host scheduler + Send now).
 */
import { randomUUID } from 'node:crypto';
import {
    emailRecipientsForTask,
    lineRoomsForTask,
    lineRoomsMissing,
} from './audience.js';
import {
    isScheduledTaskRunnable,
    lockWindowIso,
    MAX_TASKS_PER_TICK,
    nextRunAfterComplete,
} from './schedule.js';
import {
    commsInviteSubject,
    flightFollowUpSubject,
    lineTextForTask,
    programHeroFromLocalesJson,
    programNameFromLocalesJson,
    renderCommsInviteEmail,
    renderCustomEmail,
    renderFlightFollowUpEmail,
} from './templates.js';

/**
 * @param {unknown} opt
 */
export function unwrapOpt(opt) {
    if (opt == null) return null;
    if (Array.isArray(opt)) return opt[0] ?? null;
    return opt;
}

/**
 * @param {object} task
 * @param {object} audience
 * @param {object} recipient
 */
export function buildEmailForRecipient(task, audience, recipient) {
    const programName = programNameFromLocalesJson(audience?.localesJson, audience?.programId);
    const heroUrl = programHeroFromLocalesJson(audience?.localesJson);
    const comms = unwrapOpt(audience?.comms);
    const firstName = String(recipient?.fullName || '').trim();
    const kind = String(task?.kind || '');
    if (kind === 'flight_followup') {
        return {
            to: recipient.email,
            subject: flightFollowUpSubject(programName),
            html: renderFlightFollowUpEmail({
                programName,
                applicantName: firstName,
                heroUrl,
                travelPrepLinks: audience?.travelPrepLinks,
            }),
            applicantId: recipient.applicantId,
        };
    }
    if (kind === 'comms_invite') {
        return {
            to: recipient.email,
            subject: commsInviteSubject(programName),
            html: renderCommsInviteEmail({
                programName,
                applicantName: firstName,
                heroUrl,
                comms,
                travelPrepLinks: audience?.travelPrepLinks,
            }),
            applicantId: recipient.applicantId,
        };
    }
    return {
        to: recipient.email,
        subject: String(task?.customSubject || '').trim() || `${programName} — a note from Fusion`,
        html: renderCustomEmail({
            programName,
            applicantName: firstName,
            bodyText: task?.customBodyText,
            heroUrl,
        }),
        applicantId: recipient.applicantId,
    };
}

/**
 * @param {object} opts
 */
export async function executeScheduledTask(opts) {
    const task = opts.task;
    const actor = opts.actor;
    const startedAt = new Date().toISOString();
    let emailOk = 0;
    let emailFail = 0;
    let lineOk = 0;
    let lineFail = 0;
    let skipped = 0;
    const notes = [];
    const inviteIds = [];
    const channels = String(task.channels || 'email');

    for (const programId of Array.isArray(task.programIds) ? task.programIds : []) {
        const pid = String(programId || '').trim();
        if (!pid) continue;
        const audience = await actor.integrationGetScheduledTaskAudience(pid);
        const binding = audience?.lineBinding || {};
        const missing = lineRoomsMissing(task, binding);
        if (missing.length && (channels === 'line' || channels === 'both')) {
            notes.push(`LINE chat isn’t connected for this program (${pid}).`);
            lineFail += missing.length;
        }
        const recipients = emailRecipientsForTask(task, audience?.applicants || []);
        const allConfirmed = (audience?.applicants || []).filter(
            (r) => r.slotSecured && r.status !== 'withdrawn' && r.status !== 'pulledOut',
        );
        skipped += Math.max(0, allConfirmed.length - recipients.length);

        if (channels === 'email' || channels === 'both') {
            const messages = recipients.map((row) => buildEmailForRecipient(task, audience, row));
            if (messages.length && typeof opts.sendEmailBatch === 'function') {
                const batch = await opts.sendEmailBatch(messages);
                const results = Array.isArray(batch?.results) ? batch.results : [];
                messages.forEach((m, i) => {
                    const one = results[i];
                    const ok = one == null ? Boolean(batch?.ok !== false) : Boolean(one.ok);
                    if (ok) {
                        emailOk += 1;
                        if (m.applicantId) inviteIds.push({ programId: pid, applicantId: m.applicantId });
                    } else {
                        emailFail += 1;
                    }
                });
            } else if (!messages.length) {
                notes.push(`No one to email for ${pid}.`);
            }
        }

        if (channels === 'line' || channels === 'both') {
            const text = lineTextForTask(task);
            const rooms = lineRoomsForTask(task, binding);
            if (!text) {
                notes.push(`No LINE message written for ${pid}.`);
                lineFail += 1;
            } else {
                for (const room of rooms) {
                    try {
                        await opts.pushLine({ groupId: room.groupId, text });
                        lineOk += 1;
                    } catch (err) {
                        lineFail += 1;
                        notes.push(err instanceof Error ? err.message : String(err));
                    }
                }
            }
        }
    }

    if (inviteIds.length && String(task.kind || '') === 'comms_invite' && actor.integrationRecordProgramCommsInvites) {
        const byProgram = new Map();
        for (const row of inviteIds) {
            if (!byProgram.has(row.programId)) byProgram.set(row.programId, []);
            byProgram.get(row.programId).push(row.applicantId);
        }
        for (const [pid, ids] of byProgram) {
            await actor.integrationRecordProgramCommsInvites(pid, ids);
        }
    }

    const finishedAt = new Date().toISOString();
    const failed = emailFail > 0 || lineFail > 0;
    const sentSomething = emailOk + lineOk > 0;
    const status = failed && !sentSomething ? 'error' : failed ? 'partial' : 'ok';
    const summaryParts = [];
    if (emailOk || emailFail) summaryParts.push(`${emailOk} email sent`);
    if (lineOk || lineFail) summaryParts.push(`${lineOk} LINE chat sent`);
    if (skipped) summaryParts.push(`${skipped} skipped`);
    if (notes.length) summaryParts.push(notes[0]);
    const summary = summaryParts.join(' · ') || 'Nothing to send.';
    const next = nextRunAfterComplete(task, finishedAt);
    const run = {
        id: `run-${randomUUID()}`,
        taskId: task.id,
        startedAt,
        finishedAt,
        status,
        emailOk,
        emailFail,
        lineOk,
        lineFail,
        skipped,
        summary,
    };
    await actor.integrationCompleteScheduledTaskRun(task.id, run, next.nextRunAtIso, next.enabled);
    return { run, next };
}

/**
 * @param {object} opts
 */
export async function processDueScheduledTasks(opts) {
    const now = opts.now ?? Date.now();
    const actor = opts.actor;
    const listed = await actor.integrationListEnabledScheduledTasks();
    const due = (Array.isArray(listed) ? listed : []).filter((t) => isScheduledTaskRunnable(t, now));
    const window = lockWindowIso(now);
    const taken = due.slice(0, MAX_TASKS_PER_TICK);
    const results = [];
    for (const task of taken) {
        const claimed = unwrapOpt(await actor.integrationClaimScheduledTask(task.id, window.nowIso, window.lockUntilIso));
        if (!claimed) continue;
        const out = await executeScheduledTask({
            task: claimed,
            actor,
            sendEmailBatch: opts.sendEmailBatch,
            pushLine: opts.pushLine,
        });
        results.push(out);
    }
    return { processed: results.length, due: due.length, results };
}

/**
 * @param {object} opts
 */
export async function processOneScheduledTask(opts) {
    const now = opts.now ?? Date.now();
    const actor = opts.actor;
    const listed = await actor.integrationListEnabledScheduledTasks();
    const task = (Array.isArray(listed) ? listed : []).find((t) => String(t.id) === String(opts.taskId));
    if (!task) throw new Error('That scheduled task was not found or is paused.');
    const window = lockWindowIso(now);
    const claimed = unwrapOpt(await actor.integrationClaimScheduledTask(task.id, window.nowIso, window.lockUntilIso));
    if (!claimed) throw new Error('This task is already sending. Try again in a few minutes.');
    return executeScheduledTask({
        task: claimed,
        actor,
        sendEmailBatch: opts.sendEmailBatch,
        pushLine: opts.pushLine,
    });
}
