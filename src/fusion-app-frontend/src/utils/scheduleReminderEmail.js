/**
 * Schedule event reminder emails → assigned staff, participating artists, info@fusionart.world.
 */
import { getArtistsForStudio } from './database.js';
import { wrapEmailHtml } from './emailCampaignTemplates.js';
import { sendEmailBatch } from './integrationApi.js';
import { formatLongDate, formatTimeRange } from './scheduleModel.js';
import { listFusionScheduleStaff } from './fusionStaffDirectory.js';
import { STUDIO_EMAIL_ALWAYS_CC, recordStudioEmailOutbound } from './studioEmailCc.js';

/**
 * @param {string} email
 */
function normalizeEmail(email) {
    const e = String(email || '')
        .trim()
        .toLowerCase();
    return e.includes('@') ? e : '';
}

/**
 * @param {import('./scheduleModel.js').CalendarEvent} event
 * @returns {Promise<{ to: string[], staff: string[], artists: string[], missingStaff: string[], missingArtists: string[] }>}
 */
export async function resolveScheduleReminderRecipients(event) {
    /** @type {Set<string>} */
    const to = new Set();
    /** @type {string[]} */
    const staff = [];
    /** @type {string[]} */
    const artists = [];
    /** @type {string[]} */
    const missingStaff = [];
    /** @type {string[]} */
    const missingArtists = [];

    const fusionStaff = await listFusionScheduleStaff();
    const staffById = new Map(fusionStaff.map((s) => [s.id, s]));

    for (const s of event.assignedStaff || []) {
        const live = staffById.get(s.id);
        const email = normalizeEmail(live?.email);
        if (email) {
            if (!to.has(email)) {
                to.add(email);
                staff.push(email);
            }
        } else {
            missingStaff.push(s.name || s.id);
        }
    }

    const roster = await getArtistsForStudio().catch(() => []);
    const byId = new Map();
    for (const a of roster || []) {
        const id = String(a?.id || '').trim();
        if (id) byId.set(id, a);
        const slug = String(a?.slug || '').trim();
        if (slug) byId.set(slug, a);
    }

    for (const pid of event.participantIds || []) {
        const a = byId.get(String(pid || '').trim());
        const email = normalizeEmail(a?.contactEmail || a?.contact_email);
        const name =
            String(a?.locales?.en?.name || '').trim() ||
            String(a?.name || '').trim() ||
            String(pid);
        if (email) {
            if (!to.has(email)) {
                to.add(email);
                artists.push(email);
            }
        } else {
            missingArtists.push(name);
        }
    }

    // Always include ops inbox as a primary recipient.
    const info = normalizeEmail(STUDIO_EMAIL_ALWAYS_CC);
    if (info) to.add(info);

    return {
        to: [...to],
        staff,
        artists,
        missingStaff,
        missingArtists,
    };
}

/**
 * @param {import('./scheduleModel.js').CalendarEvent} event
 */
function buildReminderHtml(event) {
    const when = event.allDay
        ? `${formatLongDate(event.date)} · All day`
        : `${formatLongDate(event.date)} · ${formatTimeRange(event)}`;
    const staffNames = (event.assignedStaff || []).map((s) => s.name).filter(Boolean).join(', ') || '—';
    const notes = String(event.notes || '').trim();
    const rem =
        event.reminderMinutes == null || event.reminderMinutes === 0
            ? 'Manual send'
            : `${event.reminderMinutes} minutes before`;

    const inner = `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#0f172a">
        This is a reminder for an upcoming Fusion schedule event.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;color:#0f172a">
        <tr><td style="padding:6px 0;color:#64748b;width:120px">Event</td><td style="padding:6px 0;font-weight:600">${escapeHtml(event.title)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">When</td><td style="padding:6px 0">${escapeHtml(when)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Timezone</td><td style="padding:6px 0">${escapeHtml(event.timezone || '—')}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Program</td><td style="padding:6px 0">${escapeHtml(event.programName || '—')}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Location</td><td style="padding:6px 0">${escapeHtml(event.locationName || '—')}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Staff</td><td style="padding:6px 0">${escapeHtml(staffNames)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Artists</td><td style="padding:6px 0">${Number(event.participantCount) || (event.participantIds || []).length || 0} participants</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Reminder</td><td style="padding:6px 0">${escapeHtml(rem)}</td></tr>
      </table>
      ${
          notes
              ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.5;color:#334155"><strong>Notes</strong><br>${escapeHtml(notes).replace(/\n/g, '<br>')}</p>`
              : ''
      }
      <p style="margin:22px 0 0;font-size:12px;color:#94a3b8">Sent from Fusion Studio → Schedule.</p>
    `;
    return wrapEmailHtml(inner, { title: `Reminder: ${event.title}` });
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Send reminder emails for an event.
 * @param {import('./scheduleModel.js').CalendarEvent} event
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<{ sentTo: string[], recipientSummary: string, missingStaff: string[], missingArtists: string[] }>}
 */
export async function sendScheduleEventReminderEmail(event, opts = {}) {
    if (!event?.id) throw new Error('Event required');
    if (!opts.force && event.reminderSentAt) {
        throw new Error('Reminder already sent. Use Send again to resend.');
    }

    const recipients = await resolveScheduleReminderRecipients(event);
    if (!recipients.to.length) {
        throw new Error('No email recipients found (staff, artists, or info@).');
    }

    const subject = `Reminder: ${event.title} — ${event.date}${event.allDay ? '' : ` ${event.startTime}`}`;
    const html = buildReminderHtml(event);
    const messages = recipients.to.map((to) => ({ to, subject, html }));

    // info@ is already in `to`; still pass as cc for Resend visibility on each message.
    const cc = [STUDIO_EMAIL_ALWAYS_CC];
    await sendEmailBatch(messages, { cc });

    const summaryParts = [
        `${recipients.to.length} recipient${recipients.to.length === 1 ? '' : 's'}`,
        recipients.staff.length ? `${recipients.staff.length} staff` : '',
        recipients.artists.length ? `${recipients.artists.length} artists` : '',
        'info@fusionart.world',
    ].filter(Boolean);

    try {
        await recordStudioEmailOutbound({
            kind: 'schedule_reminder',
            subject,
            toSummary: recipients.to.join(', '),
            cc,
            recipientCount: recipients.to.length,
        });
    } catch {
        /* outbound log is best-effort */
    }

    return {
        sentTo: recipients.to,
        recipientSummary: summaryParts.join(' · '),
        missingStaff: recipients.missingStaff,
        missingArtists: recipients.missingArtists,
    };
}

/**
 * True when now is within [start - reminderMinutes, start] for a timed event.
 * @param {import('./scheduleModel.js').CalendarEvent} event
 * @param {number} [nowMs]
 */
export function isScheduleReminderDue(event, nowMs = Date.now()) {
    const mins = Number(event?.reminderMinutes);
    if (!Number.isFinite(mins) || mins <= 0) return false;
    if (event?.status === 'cancelled') return false;
    if (event?.reminderSentAt) return false;
    if (event?.allDay) {
        // All-day: due on the morning of the event day (local), within reminder window from midnight.
        const start = Date.parse(`${event.date}T00:00:00`);
        if (!Number.isFinite(start)) return false;
        const windowStart = start - mins * 60 * 1000;
        return nowMs >= windowStart && nowMs < start + 24 * 60 * 60 * 1000;
    }
    const start = Date.parse(`${event.date}T${String(event.startTime || '09:00').padStart(5, '0')}:00`);
    if (!Number.isFinite(start)) return false;
    const windowStart = start - mins * 60 * 1000;
    return nowMs >= windowStart && nowMs < start;
}
