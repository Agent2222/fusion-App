/**
 * Studio → Operations → Scheduled Tasks
 */
import '../../styles/studioScheduledTasks.css';
import { studioFeatureAccess } from '../../utils/studioShellState.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { SCHEDULE_TIMEZONES } from '../../utils/scheduleTimezones.js';
import {
    addDaysToUtcIsoInZone,
    encodeScheduledTaskWindow,
    formatNextSendLabel,
    localDateTimeToUtcIso,
    normalizeAnnounceDay,
    parseScheduledTaskWindow,
    resolveAnnounceDayYmd,
    scheduledTaskTimezoneId,
    utcIsoToLocalDateTime,
} from '../../utils/scheduledTaskSchedule.js';
import { ANNOUNCE_SUCCESS_TEST, dayEventsForAnnounce, toAnnouncePayload } from '../../utils/scheduleAnnounce.js';
import {
    emailRecipientsForTask,
    lineRoomsForTask,
    lineRoomsMissing,
    recipientEstimateLabel,
} from '../../utils/scheduledTaskAudience.js';
import {
    comingUpRailHtml,
    filterScheduledTasks,
    needsALookRailHtml,
    scheduledTaskCardHtml,
    scheduledTasksEmptyHtml,
    scheduledTasksHeroHtml,
    scheduledTasksReadonlyHtml,
    scheduledTasksStatsHtml,
    scheduledTaskStats,
} from '../../utils/scheduledTaskCopy.js';
import {
    buildScheduledTasksPreviewPayload,
    isScheduledTasksPreviewActive,
} from '../../utils/scheduledTasksPreview.js';
import {
    getApplicantSlotSecuredStudio,
    getApplicants,
    getDataSource,
    getProgramDisplayNameFromRow,
    getPrograms,
    listScheduleEventsStudio,
    staffDeleteScheduledTask,
    staffGetProgramCommsConfig,
    staffGetProgramCommsLineBinding,
    staffListFlightBookingsForProgram,
    staffListScheduledTasks,
    staffUpsertScheduledTask,
} from '../../utils/database.js';
import { getApplicantManualDepositSubmitted } from '../../utils/studioPlainForms.js';
import { inviteSentAtMap, normalizeProgramCommsConfig, renderProgramCommsInviteHtml } from '../../utils/programCommsInvite.js';
import { renderFlightFollowUpHtml } from '../../utils/flightFollowUpEmail.js';
import { renderFusionEmailFromSlots } from '../../utils/emailFusionLayout.js';
import { announceScheduleOnLine, fetchScheduledTasksHealth, runScheduledTaskNow, sendEmail } from '../../utils/integrationApi.js';
import { sortApplicantProgramRows } from './applicantsProgramCards.js';

function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function newTaskId() {
    return `st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultFirstRunLocal(tz = 'Asia/Tokyo') {
    const next = addDaysToUtcIsoInZone(new Date().toISOString(), tz, 1);
    const local = utcIsoToLocalDateTime(next, tz);
    return local ? `${local.slice(0, 10)}T09:00` : '';
}

function emptyTask() {
    const timezone = 'Asia/Tokyo';
    const firstRunLocal = defaultFirstRunLocal(timezone);
    return {
        id: '',
        name: '',
        enabled: true,
        channels: 'email',
        kind: 'flight_followup',
        programIds: [],
        lineRooms: 'announce',
        customSubject: '',
        customBodyText: '',
        customLineText: '',
        timezone,
        firstRunLocal,
        repeat: 'once',
        skipIfDone: true,
        nextRunAtIso: localDateTimeToUtcIso(firstRunLocal, timezone),
        lockedUntilIso: '',
        lastRunAt: '',
        lastStatus: '',
        lastSummary: '',
        createdAt: '',
        updatedAt: '',
        createdBy: '',
    };
}

/**
 * @param {string} [local]
 * @param {string} [tz]
 */
function splitLocal(local, tz) {
    const { firstRunLocal } = parseScheduledTaskWindow({ firstRunLocal: local });
    const raw = String(firstRunLocal || defaultFirstRunLocal(tz));
    const [date, time] = raw.split('T');
    return { date: date || '', time: (time || '09:00').slice(0, 5) };
}

/**
 * @param {object} task
 */
function announceDayForm(task) {
    if (String(task?.kind || '') !== 'announce_day') {
        return { mode: 'today', date: '' };
    }
    const key = normalizeAnnounceDay(task.customLineText);
    if (key === 'tomorrow') return { mode: 'tomorrow', date: '' };
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return { mode: 'date', date: key };
    return { mode: 'today', date: '' };
}

export function renderScheduledTasks() {
    const access = studioFeatureAccess('scheduled-tasks');
    if (!access.visible) {
        return `<div class="studio-section"><p class="studio-muted">You do not have access to Scheduled Tasks.</p></div>`;
    }
    return `<div class="studio-scheduled-tasks-page" id="studio-scheduled-tasks-root" data-scheduled-tasks-root data-can-edit="${access.canEdit ? '1' : '0'}"></div>`;
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initScheduledTasks(mainEl) {
    const root = mainEl.querySelector('#studio-scheduled-tasks-root');
    if (!(root instanceof HTMLElement)) return;
    const canEdit = root.dataset.canEdit === '1';
    const preview = isScheduledTasksPreviewActive();

    /** @type {{ tasks: object[], programs: object[], applicants: object[], bindings: Record<string, object>, health: string }} */
    const state = {
        tasks: [],
        programs: [],
        applicants: [],
        bindings: {},
        health: '',
        query: '',
        programId: '',
        channel: '',
        tab: 'all',
    };

    const programName = (id) => {
        const row = state.programs.find((p) => String(p.id) === String(id));
        return getProgramDisplayNameFromRow(row) || String(id || '');
    };

    function paint() {
        const stats = scheduledTaskStats(state.tasks);
        const filtered = filterScheduledTasks(state.tasks, {
            query: state.query,
            programId: state.programId,
            channel: state.channel,
            tab: state.tab,
        });
        const attention = state.tasks
            .map((task) => {
                const missingLine = (Array.isArray(task.programIds) ? task.programIds : []).some((pid) =>
                    lineRoomsMissing(task, state.bindings[pid] || {}).length,
                );
                const emails = emailRecipientsForTask(task, audienceRowsForTask(task)).length;
                const lines = (Array.isArray(task.programIds) ? task.programIds : []).reduce(
                    (n, pid) => n + lineRoomsForTask(task, state.bindings[pid] || {}).length,
                    0,
                );
                const nobody = emails === 0 && lines === 0;
                const reason = missingLine
                    ? 'LINE chat isn’t connected'
                    : nobody
                      ? 'No one to send to'
                      : String(task.lastStatus || '').toLowerCase().includes('fail')
                        ? 'Didn’t send'
                        : '';
                return { task, reason };
            })
            .filter((row) => row.reason);
        const cards = filtered
            .map((task) =>
                scheduledTaskCardHtml(task, {
                    programNames: (task.programIds || []).map(programName),
                }),
            )
            .join('');
        const programOpts = [...state.programs]
            .sort(sortApplicantProgramRows)
            .map((p) => `<option value="${esc(p.id)}" ${state.programId === p.id ? 'selected' : ''}>${esc(programName(p.id))}</option>`)
            .join('');
        root.innerHTML = `
          <div class="schedule-page">
            ${scheduledTasksHeroHtml({ canEdit })}
            ${!canEdit ? scheduledTasksReadonlyHtml() : ''}
            ${scheduledTasksStatsHtml(stats)}
            ${state.health ? `<p class="st-health">${esc(state.health)}</p>` : ''}
            <div class="st-toolbar">
              <input class="st-search" type="search" placeholder="Search tasks" value="${esc(state.query)}" data-st-search />
              <select class="filter-select" data-st-program>
                <option value="">All programs</option>
                ${programOpts}
              </select>
              <select class="filter-select" data-st-channel>
                <option value="" ${!state.channel ? 'selected' : ''}>All channels</option>
                <option value="email" ${state.channel === 'email' ? 'selected' : ''}>Email</option>
                <option value="line" ${state.channel === 'line' ? 'selected' : ''}>LINE chat</option>
              </select>
              <div class="view-tabs" role="tablist">
                ${['all', 'on', 'paused', 'failed']
                    .map((tab) => {
                        const label = tab === 'all' ? 'All' : tab === 'on' ? 'On' : tab === 'paused' ? 'Paused' : 'Didn’t send';
                        return `<button type="button" class="view-tab ${state.tab === tab ? 'is-active' : ''}" role="tab" data-st-tab="${tab}">${label}</button>`;
                    })
                    .join('')}
              </div>
            </div>
            <section class="schedule-workspace">
              <div class="st-card-list">
                ${cards || scheduledTasksEmptyHtml()}
              </div>
              <aside class="schedule-rail">
                ${comingUpRailHtml(state.tasks)}
                ${needsALookRailHtml(attention)}
              </aside>
            </section>
          </div>`;
        root.setAttribute('data-scheduled-tasks-ready', '1');
        bind();
    }

    function audienceRowsForTask(task) {
        const ids = new Set(task.programIds || []);
        return state.applicants.filter((row) => ids.has(String(row.programId || '')));
    }

    function bind() {
        root.querySelector('[data-st-search]')?.addEventListener('input', (e) => {
            state.query = String(e.target?.value || '');
            paint();
        });
        root.querySelector('[data-st-program]')?.addEventListener('change', (e) => {
            state.programId = String(e.target?.value || '');
            paint();
        });
        root.querySelector('[data-st-channel]')?.addEventListener('change', (e) => {
            state.channel = String(e.target?.value || '');
            paint();
        });
        root.querySelectorAll('[data-st-tab]').forEach((btn) => {
            btn.addEventListener('click', () => {
                state.tab = String(btn.getAttribute('data-st-tab') || 'all');
                paint();
            });
        });
        root.querySelector('[data-st-action="new"]')?.addEventListener('click', () => openModal(emptyTask(), true));
        root.querySelector('[data-st-action="pause-all"]')?.addEventListener('click', () => void pauseAll());
        root.querySelectorAll('[data-st-card]').forEach((card) => {
            card.addEventListener('click', () => {
                const id = String(card.getAttribute('data-st-card') || '');
                const task = state.tasks.find((t) => t.id === id);
                if (task) openModal({ ...task }, false);
            });
        });
    }

    async function pauseAll() {
        if (!canEdit) return;
        if (!window.confirm('Pause all tasks? Fusion will stop sending until you turn them back on.')) return;
        for (const task of state.tasks) {
            if (!task.enabled) continue;
            await staffUpsertScheduledTask({ ...task, enabled: false });
        }
        await reloadTasks();
        paint();
    }

    function estimateFor(task) {
        const emails = emailRecipientsForTask(task, audienceRowsForTask(task)).length;
        const lines = (Array.isArray(task.programIds) ? task.programIds : []).reduce(
            (n, pid) => n + lineRoomsForTask(task, state.bindings[pid] || {}).length,
            0,
        );
        return recipientEstimateLabel(emails, lines);
    }

    function openModal(task, isNew) {
        const taskWindow = parseScheduledTaskWindow(task);
        const { date, time } = splitLocal(taskWindow.firstRunLocal, task.timezone);
        const endSplit = taskWindow.endsAtLocal
            ? splitLocal(taskWindow.endsAtLocal, task.timezone)
            : { date: '', time: '' };
        const announce = announceDayForm(task);
        const customLineForForm = task.kind === 'announce_day' ? '' : task.customLineText;
        const isAnnounce = task.kind === 'announce_day';
        const programChecks = [...state.programs]
            .sort(sortApplicantProgramRows)
            .map((p) => {
                const id = String(p.id || '');
                const checked = (task.programIds || []).includes(id) ? 'checked' : '';
                return `<label class="st-check"><input type="checkbox" data-st-program-id="${esc(id)}" ${checked} ${canEdit ? '' : 'disabled'} /> ${esc(programName(id))}</label>`;
            })
            .join('');
        const taskTz = scheduledTaskTimezoneId(task.timezone);
        const tzOpts = [...SCHEDULE_TIMEZONES]
            .sort((a, b) => Number(b.id === 'Asia/Tokyo') - Number(a.id === 'Asia/Tokyo'))
            .map(
                (z) =>
                    `<option value="${esc(z.id)}" ${taskTz === z.id ? 'selected' : ''}>${esc(z.label)} time</option>`,
            )
            .join('');
        const modal = openStudioModal(
            `<form class="st-modal-form" data-st-form>
              <div class="st-modal-grid">
                <div class="st-modal-col">
                  <label class="st-field">Task name
                    <input type="text" name="name" value="${esc(task.name)}" ${canEdit ? '' : 'readonly'} />
                  </label>
                  <fieldset class="st-field st-field--programs"><legend>Programs</legend>
                    <div class="st-check-list">${programChecks || '<p class="st-help">No programs yet.</p>'}</div>
                  </fieldset>
                </div>
                <div class="st-modal-col">
                  <label class="st-field" data-st-how-send ${isAnnounce ? 'hidden' : ''}>How to send
                    <select name="channels" ${canEdit ? '' : 'disabled'}>
                      <option value="email" ${task.channels === 'email' ? 'selected' : ''}>Email</option>
                      <option value="line" ${task.channels === 'line' ? 'selected' : ''}>LINE chat</option>
                      <option value="both" ${task.channels === 'both' ? 'selected' : ''}>Email and LINE</option>
                    </select>
                  </label>
                  <label class="st-field">What to send
                    <select name="kind" ${canEdit ? '' : 'disabled'}>
                      <option value="flight_followup" ${task.kind === 'flight_followup' ? 'selected' : ''}>Remind artists to add arrival time</option>
                      <option value="comms_invite" ${task.kind === 'comms_invite' ? 'selected' : ''}>Send chat room invite</option>
                      <option value="custom" ${task.kind === 'custom' ? 'selected' : ''}>Write your own message</option>
                      <option value="announce_day" ${isAnnounce ? 'selected' : ''}>Announce the day’s schedule</option>
                    </select>
                  </label>
                  <div data-st-announce-day ${isAnnounce ? '' : 'hidden'}>
                    <label class="st-field">Which day’s schedule
                      <select name="announceDay" ${canEdit ? '' : 'disabled'}>
                        <option value="today" ${announce.mode === 'today' ? 'selected' : ''}>This day</option>
                        <option value="tomorrow" ${announce.mode === 'tomorrow' ? 'selected' : ''}>The next day</option>
                        <option value="date" ${announce.mode === 'date' ? 'selected' : ''}>A specific date</option>
                      </select>
                    </label>
                    <label class="st-field" data-st-announce-date ${announce.mode === 'date' ? '' : 'hidden'}>Which date
                      <input type="date" name="announceDate" value="${esc(announce.date)}" ${canEdit ? '' : 'readonly'} />
                    </label>
                    <p class="st-help" data-st-announce-help>Posts the day’s events in Announcements.</p>
                  </div>
                  <label class="st-field" data-st-line-rooms ${isAnnounce || task.channels === 'email' ? 'hidden' : ''}>Which LINE chats
                    <select name="lineRooms" ${canEdit ? '' : 'disabled'}>
                      <option value="general" ${task.lineRooms === 'general' ? 'selected' : ''}>General chat</option>
                      <option value="announce" ${task.lineRooms === 'announce' ? 'selected' : ''}>Announcements</option>
                      <option value="both" ${task.lineRooms === 'both' ? 'selected' : ''}>Both chats</option>
                    </select>
                  </label>
                  <div data-st-custom ${task.kind === 'custom' ? '' : 'hidden'}>
                    <label class="st-field">Email subject
                      <input type="text" name="customSubject" value="${esc(task.customSubject)}" ${canEdit ? '' : 'readonly'} />
                    </label>
                    <label class="st-field">Email message
                      <textarea name="customBodyText" ${canEdit ? '' : 'readonly'}>${esc(task.customBodyText)}</textarea>
                    </label>
                    <label class="st-field">LINE chat message
                      <textarea name="customLineText" ${canEdit ? '' : 'readonly'}>${esc(customLineForForm)}</textarea>
                    </label>
                  </div>
                  <div class="st-field-row">
                    <label class="st-field">When to send
                      <input type="date" name="date" value="${esc(date)}" ${canEdit ? '' : 'readonly'} />
                    </label>
                    <label class="st-field">Time
                      <input type="time" name="time" value="${esc(time)}" ${canEdit ? '' : 'readonly'} />
                    </label>
                  </div>
                  <div class="st-field-row">
                    <label class="st-field">Time zone
                      <select name="timezone" ${canEdit ? '' : 'disabled'}>${tzOpts}</select>
                    </label>
                    <label class="st-field">Repeat
                      <select name="repeat" ${canEdit ? '' : 'disabled'}>
                        <option value="once" ${task.repeat === 'once' ? 'selected' : ''}>Once</option>
                        <option value="daily" ${task.repeat === 'daily' ? 'selected' : ''}>Every day</option>
                        <option value="weekly" ${task.repeat === 'weekly' ? 'selected' : ''}>Every week</option>
                      </select>
                    </label>
                  </div>
                  <div data-st-repeat-end ${task.repeat === 'once' ? 'hidden' : ''}>
                    <div class="st-field-row">
                      <label class="st-field">Stop repeating on
                        <input type="date" name="endDate" value="${esc(endSplit.date)}" ${canEdit ? '' : 'readonly'} />
                      </label>
                      <label class="st-field">End time
                        <input type="time" name="endTime" value="${esc(endSplit.time)}" ${canEdit ? '' : 'readonly'} />
                      </label>
                    </div>
                    <p class="st-help">Leave blank to keep going.</p>
                  </div>
                  <label class="st-check" data-st-skip ${isAnnounce ? 'hidden' : ''}>
                    <input type="checkbox" name="skipIfDone" ${task.skipIfDone ? 'checked' : ''} ${canEdit ? '' : 'disabled'} />
                    Skip people who already did this
                  </label>
                  <p class="st-help" data-st-skip-help ${isAnnounce ? 'hidden' : ''}>Won’t email artists who already added arrival time, or who already got the chat invite.</p>
                  <p class="st-help" data-st-tz-help>Clock time uses this zone. Japan is 13 hours ahead of New York — not US time.</p>
                  <p class="st-estimate" data-st-next-send></p>
                  <p class="st-estimate" data-st-estimate>${esc(estimateFor(task))}</p>
                </div>
              </div>
              ${canEdit
                  ? `<div class="st-modal-actions">
                <button type="button" class="button" data-st-test>${isAnnounce ? 'Send me a test' : 'Send me a test email'}</button>
                <button type="button" class="button" data-st-now>Send now</button>
                ${!isNew ? `<button type="button" class="button" data-st-pause>${task.enabled ? 'Pause' : 'Turn on'}</button>` : ''}
                ${!isNew ? '<button type="button" class="button" data-st-delete>Delete</button>' : ''}
                <button type="submit" class="button button--primary">Save</button>
              </div>`
                  : ''}
            </form>`,
            {
                title: isNew ? 'New scheduled task' : 'Edit scheduled task',
                wide: true,
                panelClass: 'studio-modal-panel studio-modal-panel--wide studio-st-modal',
            },
        );

        const form = modal.root.querySelector('[data-st-form]');
        const toggleBits = () => {
            const channels = String(form.channels.value || 'email');
            const kind = String(form.kind.value || '');
            const repeat = String(form.repeat.value || 'once');
            const announceMode = String(form.announceDay?.value || 'today');
            const isAnnounceKind = kind === 'announce_day';
            const howSend = form.querySelector('[data-st-how-send]');
            const lineWrap = form.querySelector('[data-st-line-rooms]');
            const customWrap = form.querySelector('[data-st-custom]');
            const announceWrap = form.querySelector('[data-st-announce-day]');
            const announceDateWrap = form.querySelector('[data-st-announce-date]');
            const repeatEnd = form.querySelector('[data-st-repeat-end]');
            const skipWrap = form.querySelector('[data-st-skip]');
            const skipHelp = form.querySelector('[data-st-skip-help]');
            const testBtn = form.querySelector('[data-st-test]');
            if (howSend instanceof HTMLElement) howSend.hidden = isAnnounceKind;
            if (lineWrap instanceof HTMLElement) lineWrap.hidden = isAnnounceKind || channels === 'email';
            if (customWrap instanceof HTMLElement) customWrap.hidden = kind !== 'custom';
            if (announceWrap instanceof HTMLElement) announceWrap.hidden = !isAnnounceKind;
            if (announceDateWrap instanceof HTMLElement) {
                announceDateWrap.hidden = !isAnnounceKind || announceMode !== 'date';
            }
            if (repeatEnd instanceof HTMLElement) repeatEnd.hidden = repeat === 'once';
            if (skipWrap instanceof HTMLElement) skipWrap.hidden = isAnnounceKind;
            if (skipHelp instanceof HTMLElement) skipHelp.hidden = isAnnounceKind;
            if (testBtn instanceof HTMLElement) {
                testBtn.textContent = isAnnounceKind ? 'Send me a test' : 'Send me a test email';
            }
            const draft = readForm(form, task);
            const estimate = form.querySelector('[data-st-estimate]');
            if (estimate) estimate.textContent = estimateFor(draft);
            const nextSend = form.querySelector('[data-st-next-send]');
            if (nextSend) {
                nextSend.textContent = draft.nextRunAtIso
                    ? `Sends ${formatNextSendLabel(draft.nextRunAtIso, draft.timezone)}`
                    : '';
            }
        };
        form?.addEventListener('change', toggleBits);
        form?.addEventListener('input', toggleBits);
        toggleBits();

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!canEdit) return;
            const next = readForm(form, task);
            if (!next.name.trim()) {
                window.alert('Add a task name so you can find this later.');
                return;
            }
            if (!next.programIds.length) {
                window.alert('Choose at least one program.');
                return;
            }
            if (next.kind === 'announce_day' && String(form.announceDay?.value || '') === 'date' && !String(form.announceDate?.value || '').trim()) {
                window.alert('Choose which day’s schedule to post.');
                return;
            }
            const startLocal = `${form.date.value}T${form.time.value}`;
            const { endsAtLocal } = parseScheduledTaskWindow(next);
            if (endsAtLocal && endsAtLocal < startLocal) {
                window.alert('Stop repeating has to be after the first send.');
                return;
            }
            await staffUpsertScheduledTask(next);
            modal.close();
            await reloadTasks();
            paint();
        });
        form?.querySelector('[data-st-test]')?.addEventListener('click', () => void sendTest(readForm(form, task)));
        form?.querySelector('[data-st-now]')?.addEventListener('click', async () => {
            const draft = readForm(form, task);
            const confirmSend =
                draft.kind === 'announce_day'
                    ? 'Post the day’s schedule in Announcements right now?'
                    : 'Send this to everyone on the list right now?';
            if (!window.confirm(confirmSend)) return;
            const next = draft;
            await staffUpsertScheduledTask(next);
            try {
                if (preview || getDataSource() === 'test') {
                    next.lastRunAt = new Date().toISOString();
                    next.lastStatus = 'ok';
                    next.lastSummary = 'Sent';
                    if (next.repeat === 'once') next.enabled = false;
                    await staffUpsertScheduledTask(next);
                } else {
                    await runScheduledTaskNow(next.id);
                }
            } catch (err) {
                window.alert(err instanceof Error ? err.message : 'Could not send right now.');
            }
            modal.close();
            await reloadTasks();
            paint();
        });
        form?.querySelector('[data-st-pause]')?.addEventListener('click', async () => {
            const next = readForm(form, task);
            next.enabled = !next.enabled;
            await staffUpsertScheduledTask(next);
            modal.close();
            await reloadTasks();
            paint();
        });
        form?.querySelector('[data-st-delete]')?.addEventListener('click', async () => {
            if (!window.confirm('Delete this scheduled task?')) return;
            await staffDeleteScheduledTask(task.id);
            modal.close();
            await reloadTasks();
            paint();
        });
    }

    /**
     * @param {HTMLFormElement} form
     * @param {object} prior
     */
    function readForm(form, prior) {
        const programIds = [...form.querySelectorAll('[data-st-program-id]:checked')].map((el) =>
            String(el.getAttribute('data-st-program-id') || ''),
        );
        const timezone = scheduledTaskTimezoneId(form.timezone.value);
        const kind = String(form.kind.value || 'flight_followup');
        const isAnnounceKind = kind === 'announce_day';
        const repeat = String(form.repeat.value || 'once');
        const startLocal = `${form.date.value}T${form.time.value}`;
        let endLocal = '';
        if (repeat !== 'once') {
            const endDate = String(form.endDate?.value || '').trim();
            const endTime = String(form.endTime?.value || '').trim() || (endDate ? '23:59' : '');
            if (endDate && endTime) endLocal = `${endDate}T${endTime}`;
        }
        let announceDay = 'today';
        const announceMode = String(form.announceDay?.value || 'today');
        if (announceMode === 'tomorrow') announceDay = 'tomorrow';
        else if (announceMode === 'date') announceDay = String(form.announceDate?.value || '').trim();
        return {
            ...prior,
            id: prior.id || newTaskId(),
            name: String(form.name.value || '').trim(),
            enabled: prior.enabled !== false,
            channels: isAnnounceKind ? 'line' : String(form.channels.value || 'email'),
            kind,
            programIds,
            lineRooms: isAnnounceKind ? 'announce' : String(form.lineRooms.value || 'announce'),
            customSubject: String(form.customSubject.value || ''),
            customBodyText: String(form.customBodyText.value || ''),
            customLineText: isAnnounceKind ? announceDay : String(form.customLineText.value || ''),
            timezone,
            firstRunLocal: encodeScheduledTaskWindow(startLocal, endLocal),
            repeat,
            skipIfDone: isAnnounceKind ? false : Boolean(form.skipIfDone?.checked),
            nextRunAtIso: localDateTimeToUtcIso(startLocal, timezone),
        };
    }

    async function sendTest(task) {
        if (task.kind === 'announce_day') {
            const pid = String((task.programIds || [])[0] || '').trim();
            if (!pid) {
                window.alert('Choose at least one program.');
                return;
            }
            const ymd = resolveAnnounceDayYmd(task.customLineText, task.timezone);
            try {
                if (preview || getDataSource() === 'test') {
                    window.alert('Test is ready. In live mode this goes to the LINE bot admin.');
                    return;
                }
                const events = dayEventsForAnnounce(await listScheduleEventsStudio(), {
                    date: ymd,
                    programId: pid,
                });
                await announceScheduleOnLine({
                    programId: pid,
                    test: true,
                    mode: 'day',
                    programName: programName(pid),
                    date: ymd,
                    events: events.map(toAnnouncePayload),
                });
                window.alert(ANNOUNCE_SUCCESS_TEST);
            } catch (err) {
                window.alert(err instanceof Error ? err.message : 'Could not send the test.');
            }
            return;
        }
        const programNameText = programName((task.programIds || [])[0] || '');
        let html = '';
        let subject = 'Fusion scheduled task test';
        if (task.kind === 'flight_followup') {
            html = renderFlightFollowUpHtml({ programName: programNameText, applicantName: 'there' });
            subject = `${programNameText || 'Program'} — add your arrival date and time`;
        } else if (task.kind === 'comms_invite') {
            html = renderProgramCommsInviteHtml({ programName: programNameText, applicantName: 'there' });
            subject = `${programNameText || 'Program'} — join the chat rooms`;
        } else {
            html = renderFusionEmailFromSlots({
                eyebrow: 'Fusion',
                headlineHtml: esc(task.customSubject || task.name || 'A note from Fusion'),
                bodyHtml: `<p>${esc(task.customBodyText || 'This is a test of your scheduled message.').replace(/\n/g, '<br>')}</p>`,
                footnote: 'This is a test message sent from Scheduled Tasks.',
                subject: task.customSubject || task.name,
            });
            subject = task.customSubject || task.name || subject;
        }
        try {
            if (preview || getDataSource() === 'test') {
                window.alert('Test email is ready. In live mode this goes to info@fusionart.world.');
                return;
            }
            await sendEmail({
                to: 'info@fusionart.world',
                subject,
                html,
                cc: 'info@fusionart.world',
            });
            window.alert('Test email sent to info@fusionart.world.');
        } catch (err) {
            window.alert(err instanceof Error ? err.message : 'Could not send the test email.');
        }
    }

    async function reloadTasks() {
        if (preview) {
            state.tasks = buildScheduledTasksPreviewPayload().tasks;
            return;
        }
        state.tasks = await staffListScheduledTasks().catch(() => []);
    }

    async function load() {
        if (preview) {
            const payload = buildScheduledTasksPreviewPayload();
            state.tasks = payload.tasks;
            state.programs = payload.programs;
            state.applicants = payload.applicants;
            state.bindings = payload.bindings;
            state.health = 'Ready to send';
            paint();
            return;
        }
        const [programs, applicants, tasks] = await Promise.all([
            getPrograms().catch(() => []),
            getApplicants().catch(() => []),
            staffListScheduledTasks().catch(() => []),
        ]);
        state.programs = Array.isArray(programs) ? programs : [];
        state.tasks = Array.isArray(tasks) ? tasks : [];
        const rawApplicants = Array.isArray(applicants) ? applicants : [];
        const secured = await Promise.all(
            rawApplicants.map(async (row) => ({
                ...row,
                slotSecured:
                    (await getApplicantSlotSecuredStudio(row.id, row.programId, row.payloadJson).catch(() => false)) ||
                    getApplicantManualDepositSubmitted(row.payloadJson),
            })),
        );
        const inviteByApplicant = new Map();
        const bindings = {};
        const arrivalByApplicant = new Map();
        await Promise.all(
            state.programs.map(async (pr) => {
                const pid = String(pr.id || '');
                if (!pid) return;
                const cfg = await staffGetProgramCommsConfig(pid).catch(() => null);
                const sent = inviteSentAtMap(normalizeProgramCommsConfig(cfg, pid));
                for (const [aid, at] of sent.entries()) inviteByApplicant.set(`${pid}:${aid}`, at);
                bindings[pid] = await staffGetProgramCommsLineBinding(pid).catch(() => ({
                    groupGeneralId: '',
                    groupAnnounceId: '',
                }));
                const bookings = await staffListFlightBookingsForProgram(pid).catch(() => []);
                for (const b of bookings) {
                    arrivalByApplicant.set(
                        String(b.applicantId || ''),
                        Boolean(String(b.estArrivalDate || '').trim() && String(b.estArrivalTime || '').trim()),
                    );
                }
            }),
        );
        state.bindings = bindings;
        state.applicants = secured.map((row) => ({
            ...row,
            inviteSentAt: inviteByApplicant.get(`${row.programId}:${row.id}`) || '',
            hasArrival: arrivalByApplicant.get(String(row.id)) || false,
        }));
        try {
            const health = await fetchScheduledTasksHealth();
            const due = Number(health?.dueEstimate || 0);
            state.health = health?.ok
                ? due
                    ? `Sending today or tomorrow: ${due}`
                    : 'Ready to send'
                : 'Sending is paused right now';
        } catch {
            state.health = getDataSource() === 'test' ? 'Ready to send' : '';
        }
        paint();
    }

    await load();
}
