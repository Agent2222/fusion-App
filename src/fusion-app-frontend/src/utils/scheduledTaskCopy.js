/**
 * Staff-facing copy and list render helpers for Scheduled Tasks.
 * Never include cron, tick, job, or API in user-visible strings.
 */

import { formatNextSendLabel } from './scheduledTaskSchedule.js';

export const SCHEDULED_TASKS_TITLE = 'Scheduled Tasks';
export const SCHEDULED_TASKS_SUBTITLE =
    'Set a time to email artists or post in the program LINE chats. Fusion sends it automatically.';
export const SCHEDULED_TASKS_EMPTY =
    'No scheduled tasks yet. Create one to remind artists about arrival times, send chat invites, or write your own message.';
export const SCHEDULED_TASKS_READONLY =
    'You can view scheduled tasks, but you don’t have permission to change them.';

export const KIND_LABELS = {
    flight_followup: 'Remind artists to add arrival time',
    comms_invite: 'Send chat room invite',
    custom: 'Write your own message',
    announce_day: 'Announce the day’s schedule',
};

export const CHANNEL_LABELS = {
    email: 'Email',
    line: 'LINE chat',
    both: 'Email and LINE',
};

export const LINE_ROOM_LABELS = {
    general: 'General chat',
    announce: 'Announcements',
    both: 'Both chats',
};

export const REPEAT_LABELS = {
    once: 'Once',
    daily: 'Every day',
    weekly: 'Every week',
};

const FORBIDDEN_STAFF_COPY = /\bcron\b|\btick\b|\bjob\b|\bAPI\b/i;

export function escapeScheduledTaskHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function kindLabel(kind) {
    return KIND_LABELS[String(kind || '')] || KIND_LABELS.custom;
}

export function channelLabel(channels) {
    return CHANNEL_LABELS[String(channels || '')] || CHANNEL_LABELS.email;
}

export function lineRoomsLabel(rooms) {
    return LINE_ROOM_LABELS[String(rooms || '')] || LINE_ROOM_LABELS.both;
}

export function repeatLabel(repeat) {
    return REPEAT_LABELS[String(repeat || '')] || REPEAT_LABELS.once;
}

export function lastResultLabel(task) {
    const status = String(task?.lastStatus || '').trim().toLowerCase();
    if (!status) return '';
    if (status === 'ok' || status === 'sent' || status === 'success') {
        if (task?.enabled === false && String(task?.repeat || '') === 'once') {
            return 'Sent · won’t repeat';
        }
        return 'Sent';
    }
    if (status === 'fail' || status === 'failed' || status === 'error') return 'Didn’t send';
    return '';
}

export function isFailedTask(task) {
    const status = String(task?.lastStatus || '').trim().toLowerCase();
    return status === 'fail' || status === 'failed' || status === 'error';
}

/**
 * @param {object} task
 * @param {string | number | Date} [now]
 */
export function isDueTodayOrTomorrow(task, now = Date.now()) {
    if (!task?.enabled) return false;
    const next = Date.parse(task.nextRunAtIso);
    if (!Number.isFinite(next)) return false;
    const n = typeof now === 'number' ? now : Date.parse(String(now)) || Date.now();
    return next <= n + 48 * 60 * 60 * 1000 && next >= n - 60 * 1000;
}

/**
 * @param {object} task
 * @param {string | number | Date} [now]
 */
export function wasSentToday(task, now = Date.now()) {
    const at = Date.parse(task?.lastRunAt);
    if (!Number.isFinite(at)) return false;
    const status = String(task?.lastStatus || '').trim().toLowerCase();
    if (status && status !== 'ok' && status !== 'sent' && status !== 'success') return false;
    const n = typeof now === 'number' ? now : Date.parse(String(now)) || Date.now();
    const start = new Date(n);
    start.setHours(0, 0, 0, 0);
    return at >= start.getTime() && at <= n + 60 * 1000;
}

/**
 * @param {object[]} tasks
 * @param {string | number | Date} [now]
 */
export function scheduledTaskStats(tasks, now = Date.now()) {
    const list = Array.isArray(tasks) ? tasks : [];
    return {
        on: list.filter((t) => t?.enabled).length,
        dueSoon: list.filter((t) => isDueTodayOrTomorrow(t, now)).length,
        sentToday: list.filter((t) => wasSentToday(t, now)).length,
        failed: list.filter((t) => isFailedTask(t)).length,
    };
}

/**
 * @param {object[]} tasks
 * @param {{ query?: string, programId?: string, channel?: string, tab?: string }} filters
 */
export function filterScheduledTasks(tasks, filters = {}) {
    const query = String(filters.query || '').trim().toLowerCase();
    const programId = String(filters.programId || '').trim();
    const channel = String(filters.channel || '').trim();
    const tab = String(filters.tab || 'all').trim();
    return (Array.isArray(tasks) ? tasks : []).filter((task) => {
        if (tab === 'on' && !task.enabled) return false;
        if (tab === 'paused' && task.enabled) return false;
        if (tab === 'failed' && !isFailedTask(task)) return false;
        if (programId && !(Array.isArray(task.programIds) && task.programIds.includes(programId))) return false;
        if (channel === 'email') {
            if (task.kind === 'announce_day') return false;
            if (task.channels !== 'email' && task.channels !== 'both') return false;
        }
        if (channel === 'line') {
            if (task.kind !== 'announce_day' && task.channels !== 'line' && task.channels !== 'both') return false;
        }
        if (!query) return true;
        const hay = [task.name, kindLabel(task.kind), channelLabel(task.channels), lastResultLabel(task)]
            .join(' ')
            .toLowerCase();
        return hay.includes(query);
    });
}

/**
 * @param {object[]} tasks
 * @param {string | number | Date} [now]
 */
export function comingUpTasks(tasks, now = Date.now()) {
    const n = typeof now === 'number' ? now : Date.parse(String(now)) || Date.now();
    const horizon = n + 7 * 24 * 60 * 60 * 1000;
    return (Array.isArray(tasks) ? tasks : [])
        .filter((t) => t?.enabled)
        .filter((t) => {
            const next = Date.parse(t.nextRunAtIso);
            return Number.isFinite(next) && next <= horizon;
        })
        .sort((a, b) => Date.parse(a.nextRunAtIso) - Date.parse(b.nextRunAtIso))
        .slice(0, 8);
}

/**
 * @param {object} task
 * @param {{ programNames?: Record<string, string>, missingLine?: boolean, nobody?: boolean }} [meta]
 */
export function attentionReason(task, meta = {}) {
    if (isFailedTask(task)) return 'Didn’t send';
    if (meta.missingLine) return 'LINE chat isn’t connected';
    if (meta.nobody) return 'No one to send to';
    return '';
}

/**
 * @param {object[]} items { task, reason }
 */
export function attentionItems(items) {
    return (Array.isArray(items) ? items : []).filter((row) => String(row?.reason || '').trim());
}

export function scheduledTasksHeroHtml({ canEdit = true } = {}) {
    return `
      <nav class="schedule-breadcrumbs" aria-label="Breadcrumb">
        <a href="#services">Operations</a><span aria-hidden="true">·</span><strong>${SCHEDULED_TASKS_TITLE}</strong>
      </nav>
      <header class="schedule-hero">
        <div>
          <h1 class="schedule-hero__title">${SCHEDULED_TASKS_TITLE}</h1>
          <p class="schedule-hero__subtitle">${escapeScheduledTaskHtml(SCHEDULED_TASKS_SUBTITLE)}</p>
        </div>
        <div class="schedule-hero__actions">
          ${
              canEdit
                  ? `<button type="button" class="button" data-st-action="pause-all">Pause all tasks</button>
          <button type="button" class="button button--primary" data-st-action="new">New task</button>`
                  : ''
          }
        </div>
      </header>`;
}

/**
 * @param {ReturnType<typeof scheduledTaskStats>} stats
 */
export function scheduledTasksStatsHtml(stats) {
    const s = stats || { on: 0, dueSoon: 0, sentToday: 0, failed: 0 };
    const cards = [
        { tone: 'green', label: 'On', value: s.on, meta: 'Tasks' },
        { tone: 'blue', label: 'Sending today or tomorrow', value: s.dueSoon, meta: 'Tasks' },
        { tone: 'amber', label: 'Sent today', value: s.sentToday, meta: 'Tasks' },
        { tone: 'red', label: 'Didn’t send', value: s.failed, meta: 'Tasks' },
    ];
    return `<section class="schedule-stats" aria-label="Scheduled Tasks summary">${cards
        .map(
            (c) => `<article class="stat-card">
      <div class="stat-card__icon stat-card__icon--${c.tone}"></div>
      <div class="stat-card__body">
        <p class="stat-card__label">${escapeScheduledTaskHtml(c.label)}</p>
        <p class="stat-card__value">${c.value}</p>
        <p class="stat-card__meta">${escapeScheduledTaskHtml(c.meta)}</p>
      </div>
    </article>`,
        )
        .join('')}</section>`;
}

export function scheduledTasksEmptyHtml() {
    return `<div class="st-empty" data-st-empty="1">
      <p>${escapeScheduledTaskHtml(SCHEDULED_TASKS_EMPTY)}</p>
    </div>`;
}

export function scheduledTasksReadonlyHtml() {
    return `<p class="st-readonly">${escapeScheduledTaskHtml(SCHEDULED_TASKS_READONLY)}</p>`;
}

/**
 * @param {object} task
 * @param {{ programNames?: string[] }} [opts]
 */
export function scheduledTaskCardHtml(task, opts = {}) {
    const names = Array.isArray(opts.programNames) ? opts.programNames.filter(Boolean) : [];
    const channel = String(task.channels || 'email');
    const paused = !task.enabled;
    const failed = isFailedTask(task);
    const result = lastResultLabel(task);
    const next = paused
        ? 'Paused'
        : formatNextSendLabel(task.nextRunAtIso, task.timezone);
    return `<article class="st-card" data-st-card="${escapeScheduledTaskHtml(task.id)}">
      <div class="st-card__top">
        <h3 class="st-card__name">${escapeScheduledTaskHtml(task.name || kindLabel(task.kind))}</h3>
        <div class="st-card__chips">
          <span class="st-chip st-chip--${channel === 'line' ? 'sage' : channel === 'both' ? 'sand' : 'blue'}">${escapeScheduledTaskHtml(channelLabel(channel))}</span>
          ${paused ? '<span class="st-chip st-chip--faint">Paused</span>' : ''}
          ${failed ? '<span class="st-chip st-chip--blush">Didn’t send</span>' : ''}
        </div>
      </div>
      <p class="st-card__kind">${escapeScheduledTaskHtml(kindLabel(task.kind))}</p>
      <p class="st-card__programs">${escapeScheduledTaskHtml(names.join(', ') || 'No programs selected')}</p>
      <p class="st-card__next">${escapeScheduledTaskHtml(next)}</p>
      ${result ? `<p class="st-card__result">${escapeScheduledTaskHtml(result)}</p>` : ''}
    </article>`;
}

export function comingUpRailHtml(tasks) {
    const rows = comingUpTasks(tasks);
    if (!rows.length) {
        return `<article class="attention-card st-rail-card">
      <h2 class="st-rail-title">Coming up</h2>
      <p class="st-rail-empty">Nothing in the next 7 days.</p>
    </article>`;
    }
    return `<article class="attention-card st-rail-card">
      <h2 class="st-rail-title">Coming up</h2>
      <ul class="st-rail-list">${rows
          .map(
              (t) => `<li>
          <strong>${escapeScheduledTaskHtml(t.name || kindLabel(t.kind))}</strong>
          <span>${escapeScheduledTaskHtml(formatNextSendLabel(t.nextRunAtIso, t.timezone))}</span>
        </li>`,
          )
          .join('')}</ul>
    </article>`;
}

/**
 * @param {{ task: object, reason: string }[]} items
 */
export function needsALookRailHtml(items) {
    const rows = attentionItems(items);
    if (!rows.length) {
        return `<article class="attention-card st-rail-card">
      <h2 class="st-rail-title">Needs a look</h2>
      <p class="st-rail-empty">You’re all set.</p>
    </article>`;
    }
    return `<article class="attention-card st-rail-card">
      <h2 class="st-rail-title">Needs a look</h2>
      <ul class="st-rail-list">${rows
          .map(
              (row) => `<li>
          <strong>${escapeScheduledTaskHtml(row.task?.name || kindLabel(row.task?.kind))}</strong>
          <span>${escapeScheduledTaskHtml(row.reason)}</span>
        </li>`,
          )
          .join('')}</ul>
    </article>`;
}

/**
 * @param {string} html
 */
export function staffCopyHasForbiddenTerms(html) {
    return FORBIDDEN_STAFF_COPY.test(String(html || ''));
}
