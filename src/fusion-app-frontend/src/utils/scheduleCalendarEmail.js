/**
 * Program calendar email — Fusion General layout, confirmed program events as a bulleted schedule.
 */
import { getPublicSiteOrigin } from '../config.js';
import {
    FUSION_EMAIL_STYLES,
    fusionEmailParagraph,
    renderFusionEmailFromSlots,
} from './emailFusionLayout.js';
import { addDaysYmd, formatLongDate, formatTimeRange, weekRangeContaining } from './scheduleModel.js';

export const PROGRAM_CALENDAR_TEMPLATE_ID = 'tpl_program_calendar';
export const PROGRAM_CALENDAR_HERO_URL =
    'https://cdn.fusionart.world/uploads/studio/programs/c34ec160-kaga_2.jpg';
const STUDIO_CALENDAR_CC = 'info@fusionart.world';
const EMAIL_PREFILL_KEY = 'fusion-studio-ec-prefill-v1';

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
 * @param {import('./scheduleModel.js').CalendarEvent[]} events
 * @returns {import('./scheduleModel.js').CalendarEvent[]}
 */
export function confirmedProgramCalendarEvents(events) {
    return (Array.isArray(events) ? events : [])
        .filter((e) => e && e.status === 'confirmed')
        .slice()
        .sort((a, b) => {
            const dc = String(a.date || '').localeCompare(String(b.date || ''));
            if (dc !== 0) return dc;
            if (a.allDay && !b.allDay) return -1;
            if (!a.allDay && b.allDay) return 1;
            return String(a.startTime || '').localeCompare(String(b.startTime || ''));
        });
}

/**
 * Confirmed program-relation events for one program (ignores team/location filters).
 * @param {import('./scheduleModel.js').CalendarEvent[]} events
 * @param {string} programId
 */
export function eventsForProgramCalendar(events, programId) {
    const pid = String(programId || '').trim();
    if (!pid) return confirmedProgramCalendarEvents(events);
    return confirmedProgramCalendarEvents(events).filter((e) => {
        if (String(e.relationKind || 'program') !== 'program') return false;
        return String(e.relationProgramId || e.programId || '') === pid;
    });
}

/**
 * @param {string} programName
 */
export function programCalendarHeadlineHtml(programName) {
    const name = escapeHtml(String(programName || 'Fusion program').trim() || 'Fusion program');
    return `${name}<br>Calendar`;
}

/**
 * Studio Email composer prefill (Schedule → Email).
 * @param {{ templateId?: string, sourceType?: string, sourceId?: string }} prefill
 */
export function setEmailCampaignPrefill(prefill) {
    try {
        sessionStorage.setItem(EMAIL_PREFILL_KEY, JSON.stringify(prefill || {}));
    } catch {
        /* ignore */
    }
}

/**
 * @returns {{ templateId?: string, sourceType?: string, sourceId?: string } | null}
 */
export function consumeEmailCampaignPrefill() {
    try {
        const raw = sessionStorage.getItem(EMAIL_PREFILL_KEY);
        sessionStorage.removeItem(EMAIL_PREFILL_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Monday–Sunday buckets numbered from the first event week (Week 1, Week 2, …).
 * Skipped calendar weeks still increment the number (Week 1 then Week 3 if Week 2 is empty).
 * @param {import('./scheduleModel.js').CalendarEvent[]} events
 * @returns {{ weekNumber: number, weekStart: string, weekEnd: string, events: import('./scheduleModel.js').CalendarEvent[] }[]}
 */
export function groupCalendarEventsByWeek(events) {
    const rows = confirmedProgramCalendarEvents(events);
    if (!rows.length) return [];
    const firstWeekStart = weekRangeContaining(rows[0].date).start;
    /** @type {Map<string, import('./scheduleModel.js').CalendarEvent[]>} */
    const byStart = new Map();
    for (const ev of rows) {
        const { start } = weekRangeContaining(ev.date);
        const existing = byStart.get(start);
        if (existing) existing.push(ev);
        else byStart.set(start, [ev]);
    }
    return [...byStart.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([weekStart, weekEvents]) => {
            let weekNumber = 1;
            let cursor = firstWeekStart;
            while (cursor < weekStart) {
                cursor = addDaysYmd(cursor, 7);
                weekNumber += 1;
            }
            return {
                weekNumber,
                weekStart,
                weekEnd: addDaysYmd(weekStart, 6),
                events: weekEvents,
            };
        });
}

/**
 * Bullet line: date, then event name, then time.
 * @param {import('./scheduleModel.js').CalendarEvent} ev
 */
export function formatCalendarEventLine(ev) {
    const date = formatLongDate(ev.date);
    const title = String(ev.title || 'Event').trim() || 'Event';
    const time = ev.allDay ? 'All day' : formatTimeRange(ev);
    return `${date} — ${title} — ${time}`;
}

/**
 * Confirmed events grouped by week, with a horizontal rule between weeks.
 * @param {import('./scheduleModel.js').CalendarEvent[]} events
 */
export function buildProgramCalendarEventListHtml(events) {
    const weeks = groupCalendarEventsByWeek(events);
    if (!weeks.length) {
        return fusionEmailParagraph('No confirmed events are on the program calendar yet.', 'lead');
    }
    return weeks
        .map((week, i) => {
            const items = week.events
                .map((ev) => `<li style="margin:0 0 8px;">${escapeHtml(formatCalendarEventLine(ev))}</li>`)
                .join('');
            const rule =
                i > 0
                    ? `<hr style="border:0;border-top:1px solid #000000;margin:22px 0 18px;" />`
                    : '';
            return `${rule}<p style="margin:0 0 10px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:800;color:#000000;">Week ${week.weekNumber}</p>
<ul style="${FUSION_EMAIL_STYLES.bodyList}">${items}</ul>`;
        })
        .join('\n');
}

/**
 * @param {{
 *   programName?: string,
 *   events?: import('./scheduleModel.js').CalendarEvent[],
 *   heroImageUrl?: string,
 *   heroAlt?: string,
 * }} [opts]
 */
export function buildProgramCalendarLayoutSlots(opts = {}) {
    const programName = String(opts.programName || 'Fusion program').trim() || 'Fusion program';
    const calendarUrl = `${getPublicSiteOrigin()}/settings/profile#calendar`;
    const listHtml = buildProgramCalendarEventListHtml(opts.events || []);
    const bodyHtml = [
        fusionEmailParagraph(
            `Here is the confirmed calendar for <strong>${escapeHtml(programName)}</strong>.`,
            'lead',
        ),
        listHtml,
        fusionEmailParagraph(
            'If you would like to organize a special experience and share it with the cohort, log in to your Settings Profile page, open the Programs section, select the Calendar tab, and add it there.',
            'last',
        ),
    ].join('\n');
    return {
        eyebrow: 'Schedule',
        heroImageUrl: String(opts.heroImageUrl || PROGRAM_CALENDAR_HERO_URL).trim() || PROGRAM_CALENDAR_HERO_URL,
        heroAlt: String(opts.heroAlt || programName).trim() || programName,
        pillLabel: 'PROGRAM CALENDAR',
        headlineHtml: programCalendarHeadlineHtml(programName),
        bodyHtml,
        cta: { label: 'VIEW CALENDAR', href: calendarUrl },
        subject: `${programName} Calendar`,
        previewText: `Confirmed dates and times for ${programName}.`.slice(0, 160),
    };
}

/**
 * @param {{
 *   programName?: string,
 *   events?: import('./scheduleModel.js').CalendarEvent[],
 *   heroImageUrl?: string,
 *   heroAlt?: string,
 * }} [opts]
 */
export function buildProgramCalendarEmailHtml(opts = {}) {
    return renderFusionEmailFromSlots(buildProgramCalendarLayoutSlots(opts));
}

/**
 * Sample events for the Studio Email template gallery.
 * @returns {import('./scheduleModel.js').CalendarEvent[]}
 */
export function sampleProgramCalendarEvents() {
    return [
        {
            id: 'sample-1',
            title: 'Welcome breakfast',
            date: '2026-09-14',
            startTime: '09:00',
            endTime: '10:30',
            allDay: false,
            status: 'confirmed',
            locationName: 'Studio kitchen',
        },
        {
            id: 'sample-2',
            title: 'Studio visit',
            date: '2026-09-16',
            startTime: '14:00',
            endTime: '16:00',
            allDay: false,
            status: 'confirmed',
            locationName: 'Kaga workshop',
        },
        {
            id: 'sample-3',
            title: 'Crit session',
            date: '2026-09-21',
            startTime: '11:00',
            endTime: '13:00',
            allDay: false,
            status: 'confirmed',
            locationName: 'Main hall',
        },
        {
            id: 'sample-4',
            title: 'Open studio',
            date: '2026-09-23',
            startTime: '16:00',
            endTime: '19:00',
            allDay: false,
            status: 'confirmed',
            locationName: '',
        },
    ];
}

/**
 * @param {string} programId
 * @returns {Promise<{ emails: string[], missing: string[] }>}
 */
export async function resolveProgramCalendarRecipients(programId) {
    const pid = String(programId || '').trim();
    /** @type {Set<string>} */
    const emails = new Set();
    /** @type {string[]} */
    const missing = [];
    if (!pid) return { emails: [], missing: [] };

    const [{ getApplicants, getArtistsForStudio }, { getApplicantIsTester }, { isApplicantFinanceActive }] =
        await Promise.all([
            import('./database.js'),
            import('./studioPlainForms.js'),
            import('./programPaymentMoney.js'),
        ]);

    const [applicants, artists] = await Promise.all([
        getApplicants().catch(() => []),
        getArtistsForStudio().catch(() => []),
    ]);
    const artistById = new Map();
    for (const a of Array.isArray(artists) ? artists : []) {
        const id = String(a?.id || '').trim();
        if (id) artistById.set(id, a);
    }

    for (const applicant of Array.isArray(applicants) ? applicants : []) {
        if (String(applicant?.programId || '').trim() !== pid) continue;
        if (!isApplicantFinanceActive(applicant)) continue;
        if (getApplicantIsTester(String(applicant?.payloadJson || ''))) continue;
        const direct = normalizeEmail(applicant?.email);
        const appId = String(applicant?.id || '').trim();
        const artistId = appId.includes('|') ? appId.split('|')[0] : '';
        const artist = artistId ? artistById.get(artistId) : null;
        const fromArtist = normalizeEmail(artist?.contactEmail || artist?.contact_email);
        const email = direct || fromArtist;
        const name = String(applicant?.fullName || artistId || appId || 'Artist').trim();
        if (email) emails.add(email);
        else missing.push(name);
    }

    return { emails: [...emails], missing };
}

/**
 * @param {string} str
 */
function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(String(str || ''));
    let binary = '';
    bytes.forEach((b) => {
        binary += String.fromCharCode(b);
    });
    return btoa(binary);
}

/**
 * @param {{
 *   programId: string,
 *   programName: string,
 *   events: import('./scheduleModel.js').CalendarEvent[],
 *   icsBody: string,
 *   icsFilename?: string,
 * }} opts
 */
export async function sendProgramCalendarEmail(opts) {
    const programId = String(opts.programId || '').trim();
    const programName = String(opts.programName || 'Fusion program').trim() || 'Fusion program';
    const events = confirmedProgramCalendarEvents(opts.events);
    if (!programId) throw new Error('Select a program first.');
    if (!events.length) throw new Error('No confirmed events to send for this program.');

    const recipients = await resolveProgramCalendarRecipients(programId);
    if (!recipients.emails.length) {
        throw new Error('No artist emails found for this program.');
    }

    const [{ getPrograms, getProgramDisplayNameFromRow }, { sendEmailBatch }, { recordStudioEmailOutbound }] =
        await Promise.all([
            import('./database.js'),
            import('./integrationApi.js'),
            import('./studioEmailCc.js'),
        ]);

    let heroImageUrl = PROGRAM_CALENDAR_HERO_URL;
    let resolvedName = programName;
    try {
        const programs = await getPrograms();
        const program = (programs || []).find((p) => String(p?.id || '') === programId);
        if (program) {
            if (!String(opts.programName || '').trim()) {
                const fromRow = getProgramDisplayNameFromRow(program);
                if (fromRow) resolvedName = fromRow;
            }
        }
    } catch {
        /* optional hero */
    }

    const html = buildProgramCalendarEmailHtml({
        programName: resolvedName,
        events,
        heroImageUrl,
        heroAlt: resolvedName,
    });
    const subject = `${resolvedName} Calendar`;
    const filename = String(opts.icsFilename || 'fusion-program-calendar.ics').trim();
    const attachments = opts.icsBody
        ? [
              {
                  filename: filename.endsWith('.ics') ? filename : `${filename}.ics`,
                  content: utf8ToBase64(opts.icsBody),
                  contentType: 'text/calendar; charset=utf-8',
              },
          ]
        : [];

    const messages = recipients.emails.map((to) => ({ to, subject, html }));
    const cc = [STUDIO_CALENDAR_CC];
    await sendEmailBatch(messages, { cc, attachments });

    try {
        await recordStudioEmailOutbound({
            kind: 'program_calendar',
            subject,
            toSummary: recipients.emails.join(', '),
            cc,
            recipientCount: recipients.emails.length,
        });
    } catch {
        /* outbound log is best-effort */
    }

    return {
        sentTo: recipients.emails,
        missing: recipients.missing,
        eventCount: events.length,
    };
}
