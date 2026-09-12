/**
 * Built-in HTML templates for Studio → Email (client-side; optional templateId on save).
 * Motoko may store templateId for audit only.
 */
import {
    defaultProgramUpdateLayoutSlots,
    fusionEmailDiscountCodeBlock,
    fusionEmailLayout,
    fusionEmailLink,
    fusionEmailParagraph,
    FUSION_EMAIL_STYLES,
    renderFusionEmailFromSlots,
} from './emailFusionLayout.js';
import {
    PROGRAM_CALENDAR_HERO_URL,
    buildProgramCalendarEmailHtml,
    sampleProgramCalendarEvents,
} from './scheduleCalendarEmail.js';
import { interpolateRadarDiscountHtml, joinUrlForPromoCode } from './studioPromoCodes.js';
import { DRAW_GOAL_NOT_REACHED_TEMPLATE_ID } from './trialAccessCode.js';
import { sampleFlightFollowUpHtml } from './flightFollowUpEmail.js';
import { sampleProgramCommsInviteHtml } from './programCommsInvite.js';
import { sampleProgramArtistsAnnounceHtml } from './programArtistsAnnounceEmail.js';

/**
 * @typedef {'artist' | 'journal' | 'program' | 'video' | 'website'} EmailContentSourceType
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   defaultSubject: string,
 *   defaultPreview: string,
 *   bodyHtml: string,
 *   notes?: string,
 *   requiresRosterPlaceholders?: boolean,
 *   requiresTrialAccessPlaceholders?: boolean,
 *   contentSourceTypes?: EmailContentSourceType[],
 *   defaultEyebrow?: string,
 *   templateGroup?: 'updates' | 'spotlights' | 'campaigns' | 'features',
 * }} EmailTemplateDef
 */

/** Template id for “new Fusion is here” roster invite ({{ARTIST_NAME}} / {{ACCESS_CODE}}); Send blast interpolation. */
export const ROSTER_OPEN_CALL_TEMPLATE_ID = 'tpl_open_call_roster';

/**
 * Escape text for safe insertion into HTML email bodies.
 * @param {string} s
 */
function escapeHtmlForEmail(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Keep full display name in first-name greetings for specific artist names. */
const GREETING_FULL_NAME_EXACT = new Set(['el jngl', 'lady pluuto']);

/**
 * @param {string} rawName
 * @returns {string}
 */
function rosterGreetingName(rawName) {
    const trimmed = String(rawName ?? '').trim();
    if (!trimmed) return '';
    if (GREETING_FULL_NAME_EXACT.has(trimmed.toLowerCase())) return trimmed;
    return trimmed.split(/\s+/).filter(Boolean)[0] || trimmed;
}

/**
 * Replace roster blast tokens in template HTML (HTML-escaped values).
 * @param {string} html
 * @param {{ artistName: string, accessCode: string }} vars
 */
export function interpolateRosterBlastTemplate(html, vars) {
    const rawName = String(vars.artistName ?? '').trim();
    const firstNameRaw = rosterGreetingName(rawName);
    const name = escapeHtmlForEmail(rawName);
    const firstName = escapeHtmlForEmail(firstNameRaw);
    const code = escapeHtmlForEmail(vars.accessCode ?? '');
    return String(html ?? '')
        .replace(/\{\{ARTIST_FIRST_NAME\}\}/g, firstName)
        .replace(/\{\{ARTIST_NAME\}\}/g, name)
        .replace(/\{\{ACCESS_CODE\}\}/g, code);
}

/** Public asset URL (served from `public/email/` after build / deploy) */
const LOGO_URL = 'https://fusionart.world/email/Fusion-X-logo-02.png';

/**
 * Legacy wrapper for freeform inner HTML (Generate draft, plain conversions).
 * @param {string} innerHtml
 * @param {{ includeSignature?: boolean }} [opts]
 * @returns {string}
 */
export function wrapEmailHtml(innerHtml, opts = {}) {
    const sig =
        opts.includeSignature !== false
            ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.45">— Fusion Team</p>
<p style="margin:0 0 16px"><img src="https://fusionart.world/email/Fusion-Logo-Sig-1.png" alt="Fusion" width="120" height="auto" style="display:block;max-width:100%;height:auto;border:0" /></p>
<p style="margin:0 0 10px"><a href="https://www.fusionart.world" style="color:#111;text-decoration:underline">Fusion Art World</a></p>
<p style="margin:0;font-size:14px;line-height:1.5;color:#3f3f3f">IG: @fusion_intl | TT: @fusion_intl | YT: @fusionartworld</p>`
            : '';
    return `<div style="font-family:system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 28px 44px;background:#fff;color:#111;line-height:1.5">
<div style="text-align:center;margin:0 0 36px;padding:0 0 8px">
<img src="${LOGO_URL}" alt="Fusion" width="220" height="auto" style="display:inline-block;max-width:100%;height:auto;border:0" />
</div>
<div style="margin:0 0 40px;padding:0">
${innerHtml}
</div>
${
        sig
            ? `<div style="margin:0;padding:40px 0 0;border-top:1px solid #e5e2df">
${sig}
</div>`
            : ''
    }
</div>`;
}

const generalSlots = defaultProgramUpdateLayoutSlots();

/** @type {Record<string, EmailTemplateDef>} */
export const EMAIL_CAMPAIGN_TEMPLATES = {
    tpl_general: {
        id: 'tpl_general',
        name: 'General',
        templateGroup: 'updates',
        defaultEyebrow: 'Program Update',
        defaultSubject: 'Kaga City, Ishikawa — Artist Residency (Fall 2026)',
        defaultPreview: 'Applications are open for the next FUSION Artist Residency in Japan.',
        bodyHtml: renderFusionEmailFromSlots(generalSlots),
        notes: 'Full-width branded layout; edit copy and links per campaign.',
    },
    tpl_draw_goal_not_reached: {
        id: DRAW_GOAL_NOT_REACHED_TEMPLATE_ID,
        name: 'Draw goal not reached',
        templateGroup: 'campaigns',
        defaultEyebrow: 'Program Draw',
        defaultSubject: 'The draw goal was not reached — your engagement award is inside',
        defaultPreview: 'Every entrant still receives the engagement award: a 3-month trial and 1 application credit.',
        bodyHtml: renderFusionEmailFromSlots({
            ...defaultProgramUpdateLayoutSlots(),
            eyebrow: 'Program Draw',
            pillLabel: 'ENGAGEMENT AWARD',
            headlineHtml: 'The draw<br>goal was<br>not reached.',
            bodyHtml: [
                fusionEmailParagraph(
                    'The current Program Draw did not reach its entry goal. The draw was not executed — and every entrant still receives the engagement award.',
                    'lead',
                ),
                fusionEmailParagraph(
                    'Your award is a unique <strong>3-month Fusion trial</strong>. Use it to set up your artist profile, explore exclusive content, and stay close to upcoming residencies.',
                ),
                fusionEmailParagraph(
                    'It also includes <strong>1 application credit</strong> for a future residency — no application fee when you apply.',
                ),
                fusionEmailParagraph(
                    'Your personal access code is below. Open the join link, enter the code, and redeem — existing members redeem the same way.',
                ),
                fusionEmailDiscountCodeBlock({
                    code: '{{TRIAL_ACCESS_CODE}}',
                    label: '3-month trial + 1 application credit',
                }),
                fusionEmailParagraph(
                    `Questions? Write us at ${fusionEmailLink('mailto:info@fusionart.world', 'info@fusionart.world')}.`,
                    'last',
                ),
            ].join('\n'),
            cta: { label: 'REDEEM YOUR TRIAL', href: '{{TRIAL_JOIN_URL}}' },
            footnote: 'Each code is single-use. Redeem while signed in with your Fusion Internet Identity.',
        }),
        notes: 'Current draw applicants: unique 3-month trial code + 1 application credit per recipient.',
        requiresTrialAccessPlaceholders: true,
    },
    tpl_program_update: {
        id: 'tpl_program_update',
        name: 'Program Update',
        templateGroup: 'updates',
        defaultEyebrow: 'Program Update',
        contentSourceTypes: ['program'],
        defaultSubject: 'Program update from Fusion',
        defaultPreview: 'News and details about an upcoming Fusion residency program.',
        bodyHtml: renderFusionEmailFromSlots({
            ...generalSlots,
            eyebrow: 'Program Update',
            headlineHtml: 'Program<br>Update',
            bodyHtml: [
                fusionEmailParagraph(
                    'Select a program under Content source to pull hero image, dates, and apply link — or edit this copy manually.',
                    'lead',
                ),
                fusionEmailParagraph(
                    'Share what is new, who should apply, and one clear next step for readers.',
                    'last',
                ),
            ].join('\n'),
            cta: { label: 'VIEW PROGRAM', href: 'https://www.fusionart.world/programs' },
        }),
        notes: 'Bind a program card to auto-fill hero, title, and CTA.',
    },
    tpl_program_artists: {
        id: 'tpl_program_artists',
        name: 'Meet the Artists',
        templateGroup: 'updates',
        defaultEyebrow: 'Program Artists',
        contentSourceTypes: ['program'],
        defaultSubject: 'Meet the artists — Kaga Fall 2026',
        defaultPreview: 'Introducing the artists joining FUSION’s Kaga Fall 2026 residency.',
        bodyHtml: sampleProgramArtistsAnnounceHtml(),
        notes: 'Select a program to fill the 3-up artist grid and link to that cohort’s artists page.',
    },
    tpl_program_calendar: {
        id: 'tpl_program_calendar',
        name: 'Program Calendar',
        templateGroup: 'updates',
        defaultEyebrow: 'Schedule',
        contentSourceTypes: ['program'],
        defaultSubject: 'Kaga City Artist Residency Calendar',
        defaultPreview: 'Confirmed dates and times for the Fusion program calendar.',
        bodyHtml: buildProgramCalendarEmailHtml({
            programName: 'Kaga City Artist Residency',
            events: sampleProgramCalendarEvents(),
            heroImageUrl: PROGRAM_CALENDAR_HERO_URL,
            heroAlt: 'Kaga City, Ishikawa',
        }),
        notes: 'Select a program under Content source to pull confirmed calendar events. Hero defaults to the Kaga corridor photograph.',
    },
    tpl_program_comms_line: {
        id: 'tpl_program_comms_line',
        name: 'Program comms — official chat rooms',
        templateGroup: 'updates',
        defaultEyebrow: 'Program Comms',
        defaultSubject: 'The program Official Chat Rooms',
        defaultPreview: 'Download the app, then join both official chat rooms.',
        bodyHtml: sampleProgramCommsInviteHtml(),
        notes: 'Used by Studio → Comms. Step 1 store QRs, step 2 room QRs, then travel prep wallet cards from Studio Travel.',
    },
    tpl_flight_followup: {
        id: 'tpl_flight_followup',
        name: 'Follow up flight information',
        templateGroup: 'updates',
        defaultEyebrow: 'Travel',
        contentSourceTypes: ['program'],
        defaultSubject: 'Kaga City Artist Residency — add your arrival date and time',
        defaultPreview: 'Reminder about your Kaga City Artist Residency flight — add arrival date and time so we can meet you.',
        bodyHtml: sampleFlightFollowUpHtml(),
        notes: 'Arrival-time reminder for confirmed travelers. Distinct from Finance → Email “Flight information” (booking details). Bind a program to pull hero and travel prep wallet cards.',
    },
    tpl_featured_artist: {
        id: 'tpl_featured_artist',
        name: 'Featured Artist',
        templateGroup: 'spotlights',
        defaultEyebrow: 'Artist Spotlight',
        contentSourceTypes: ['artist'],
        defaultSubject: 'Artist spotlight',
        defaultPreview: 'A conversation with a Fusion artist — read the story.',
        bodyHtml: renderFusionEmailFromSlots({
            eyebrow: 'Artist Spotlight',
            pillLabel: 'FUSION ARTIST',
            headlineHtml: 'Artist<br>Spotlight',
            bodyHtml: [
                fusionEmailParagraph('“A short pull quote or highlight about the work.”', 'quote'),
                fusionEmailParagraph(
                    'Intro paragraph: context for readers and a clear reason to visit the full profile.',
                    'last',
                ),
            ].join('\n'),
            cta: { label: 'VIEW PROFILE', href: 'https://www.fusionart.world/artists' },
        }),
        notes: 'Bind a roster artist to pull image, name, bio, and profile link.',
    },
    tpl_featured_video: {
        id: 'tpl_featured_video',
        name: 'Featured Video',
        templateGroup: 'spotlights',
        defaultEyebrow: 'Fusion Video',
        contentSourceTypes: ['video'],
        defaultSubject: 'New video on Fusion',
        defaultPreview: 'Studio visit and conversation — watch now on Fusion.',
        bodyHtml: renderFusionEmailFromSlots({
            eyebrow: 'Fusion Video',
            pillLabel: 'FUSION VIDEO',
            headlineHtml: 'Featured<br>Video',
            bodyHtml: [
                fusionEmailParagraph(
                    'Lead with what this studio visit or conversation covers — and why it matters to the Fusion community.',
                    'lead',
                ),
                fusionEmailParagraph(
                    'Invite readers to watch the full video on fusionart.world.',
                    'last',
                ),
            ].join('\n'),
            cta: { label: 'WATCH NOW', href: 'https://www.fusionart.world/videos' },
        }),
        notes: 'Bind a community video to pull poster, title, description, and watch link.',
    },
    tpl_journal_entry: {
        id: 'tpl_journal_entry',
        name: 'Journal Entry',
        templateGroup: 'spotlights',
        defaultEyebrow: 'Journal',
        contentSourceTypes: ['journal'],
        defaultSubject: 'From the Fusion journal',
        defaultPreview: 'A new story from the Fusion journal.',
        bodyHtml: renderFusionEmailFromSlots({
            eyebrow: 'Journal',
            pillLabel: 'FUSION JOURNAL',
            headlineHtml: 'Journal<br>Entry',
            bodyHtml: [
                fusionEmailParagraph(
                    'Lead with the heart of the piece — what happened, who was involved, and why it matters to the Fusion community.',
                    'lead',
                ),
                fusionEmailParagraph(
                    'Add a short invitation to read the full entry on fusionart.world.',
                    'last',
                ),
            ].join('\n'),
            cta: { label: 'READ ENTRY', href: 'https://www.fusionart.world/journal' },
        }),
        notes: 'Bind a journal entry to pull image, title, and link.',
    },
    tpl_onboarding: {
        id: 'tpl_onboarding',
        name: 'Onboarding',
        templateGroup: 'campaigns',
        defaultEyebrow: 'Join the Network',
        contentSourceTypes: ['website'],
        defaultSubject: 'Join a curated art network — Join FUSION',
        defaultPreview:
            'A curated art network connecting artists, galleries, curators, and collectors through programs rooted in Japan.',
        bodyHtml: renderFusionEmailFromSlots({
            eyebrow: 'Join the Network',
            heroImageUrl: generalSlots.heroImageUrl,
            heroAlt: 'Fusion curated art network — Japan',
            pillLabel: 'MEMBERSHIP',
            headlineHtml: 'Your practice<br>belongs in a<br>wider context.',
            bodyHtml: [
                fusionEmailParagraph(
                    'Join a curated art network connecting artists, galleries, curators, and collectors through programs rooted in Japan.',
                    'lead',
                ),
                `<ul style="${FUSION_EMAIL_STYLES.bodyList}">
<li>Artist profile + gallery system</li>
<li>Residency &amp; program applications included</li>
<li>Access to the network and platform updates</li>
<li>Exclusive content and community</li>
</ul>`,
                fusionEmailParagraph(
                    'Create your membership in under two minutes. Secure payment by PayPal or card — cancel anytime.',
                    'last',
                ),
            ].join('\n'),
            cta: {
                label: 'JOIN FUSION',
                href: 'https://fusionart.world/join-network',
            },
            footnote: 'Residency applications included · Cancel anytime',
        }),
        notes: 'Bind a Website / Network item for story focus; CTA links to /join-network.',
    },
    tpl_open_call: {
        id: 'tpl_open_call',
        name: 'Open Call Launch',
        templateGroup: 'campaigns',
        defaultEyebrow: 'Open Call',
        defaultSubject: 'Residency open call',
        defaultPreview: 'Apply for the next Fusion residency — limited places.',
        bodyHtml: fusionEmailLayout({
            eyebrow: 'Open Call',
            pillLabel: 'RESIDENCY',
            headlineHtml: 'Residency<br>Open Call',
            bodyHtml: [
                fusionEmailParagraph(
                    'We are inviting artists to apply for the upcoming program. Share your practice and what you would explore during the residency.',
                    'lead',
                ),
                `<ul style="${FUSION_EMAIL_STYLES.bodyList}">
<li>Key dates in your local timezone</li>
<li>What we provide</li>
<li>How to apply</li>
</ul>`,
            ].join('\n'),
            cta: { label: 'APPLY NOW', href: 'https://www.fusionart.world' },
        }),
        notes: 'Add hero image via toolbar if needed.',
    },
    tpl_open_call_roster: {
        id: 'tpl_open_call_roster',
        name: 'The new Fusion is here (Send blast)',
        templateGroup: 'campaigns',
        defaultEyebrow: 'Platform Update',
        defaultSubject: 'The new Fusion is here! Your access is inside! :)',
        defaultPreview: 'The platform is live. Your profile, the network, and what is next — including Kaga.',
        bodyHtml: fusionEmailLayout({
            eyebrow: 'Platform Update',
            pillLabel: 'PLATFORM UPDATE',
            headlineHtml: 'The new<br>Fusion is<br>here.',
            bodyHtml: [
                fusionEmailParagraph(
                    '<span style="font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Your new global footprint — live now</span>',
                    'lead',
                ),
                fusionEmailParagraph('Hi {{ARTIST_FIRST_NAME}},'),
                fusionEmailParagraph(
                    'We are thrilled to say: the <strong>new Fusion platform</strong> is live! Your space for profile, programs, and the community we are building together. This is the next chapter in Fusion\'s evolution: a place where the interconnections between <strong>artists, curators, collectors, and galleries</strong> can grow in private and present in public, and where we believe that exchange will help shape the future of the art world.',
                ),
                fusionEmailParagraph(
                    'The platform is in <strong>steady development.</strong> You may notice a few kinks along the way, and it will keep evolving over time. <strong>Access is free for all Fusion veterans</strong>, and you can expect it to deepen and refine for impact and strategic positioning in the coming months.',
                ),
                fusionEmailParagraph(
                    'Below is your personal <strong>access code</strong>. Enter it when you join Fusion as an artist to link your roster profile (single use - once it is redeemed, it clears on our side).',
                ),
                '<p style="font-size:20px;line-height:1.4;margin:0 0 20px;font-weight:700;letter-spacing:0.12em;color:#000000;">{{ACCESS_CODE}}</p>',
                fusionEmailParagraph(
                    'Additionally, we\'ll be introducing guest passes to extend guest access to artists, curators or collectors you think would benefit from the platform.',
                ),
                fusionEmailParagraph(
                    'We also have a <strong>new program coming up in Kaga</strong>. If you are interested, you are welcome to <strong>reach out to us directly</strong> for an expedited process, and <strong>first return residency artists are eligible for a discount</strong>.',
                ),
                fusionEmailParagraph(
                    `If anything feels off while you explore, please email us at ${fusionEmailLink('mailto:info@fusionart.world', 'info@fusionart.world')} — we read every message and want to hear from you.`,
                    'last',
                ),
            ].join('\n'),
            cta: { label: 'SEE THE NEW FUSION', href: 'https://www.fusionart.world' },
        }),
        notes: 'Send blast: platform launch invite; per-artist name + code; Kaga + support',
        requiresRosterPlaceholders: true,
    },
    tpl_reminder: {
        id: 'tpl_reminder',
        name: 'Reminder (last chance)',
        templateGroup: 'campaigns',
        defaultEyebrow: 'Final Days',
        contentSourceTypes: ['program'],
        defaultSubject: 'Last chance — applications close soon',
        defaultPreview:
            'A few places remain. If this residency has been on your mind, now is the moment to apply.',
        bodyHtml: renderFusionEmailFromSlots({
            eyebrow: 'Final Days',
            heroImageUrl: generalSlots.heroImageUrl,
            heroAlt: 'Fusion artist residency — Japan',
            pillLabel: 'DEADLINE APPROACHING',
            headlineHtml: 'This is<br>your window.',
            bodyHtml: [
                fusionEmailParagraph(
                    'Applications for the upcoming FUSION Artist Residency close soon — and a handful of places are still open.',
                    'lead',
                ),
                fusionEmailParagraph(
                    'If Japan, focused studio time, and a community of artists, curators, and collectors have been on your mind, this is the moment. The program is shaped around place, process, and exchange: time to deepen your practice in a landscape that rewards attention.',
                ),
                fusionEmailParagraph(
                    'Submitting takes a short application. You do not need a finished proposal — we want to understand your practice, what you would explore, and why this chapter matters to you now.',
                ),
                fusionEmailParagraph(
                    'Once the call closes, we move into review. If you have been waiting for a sign, consider this it.',
                    'last',
                ),
            ].join('\n'),
            cta: {
                label: 'APPLY BEFORE THE DEADLINE',
                href: 'https://www.fusionart.world/programs',
            },
            footnote: 'Limited places · Questions? Reply to this email',
        }),
        notes: 'Bind a program to pull hero image and apply link only — reminder copy stays.',
    },
    tpl_audio_recording: {
        id: 'tpl_audio_recording',
        name: 'Audio recording',
        templateGroup: 'features',
        defaultEyebrow: 'New on Fusion',
        defaultSubject: 'Your voice carries context no CV can',
        defaultPreview:
            'Leave a short voice note about your practice — rough is welcome. Context lives in the spoken word.',
        bodyHtml: renderFusionEmailFromSlots({
            eyebrow: 'New on Fusion',
            heroImageUrl: generalSlots.heroImageUrl,
            heroAlt: 'Fusion — artist voice and context',
            pillLabel: 'AUDIO FEATURE',
            headlineHtml: 'Your voice<br>holds the<br>context.',
            bodyHtml: [
                fusionEmailParagraph(
                    'Images and bios tell part of the story. Voice does something else: it carries tone, pace, hesitation, warmth — the living context around your work.',
                    'lead',
                ),
                fusionEmailParagraph(
                    'We have added audio recording to your Fusion profile so you can leave a short voice note describing your current practice. Think of it as a spoken caption: where you are, what you are making, what you are circling.',
                ),
                fusionEmailParagraph(
                    'It does not need to be polished. Rough is fine — even preferred. A minute or two of honest speech often says more than a carefully edited paragraph.',
                ),
                fusionEmailParagraph(
                    'Open your profile settings, hit Record, and speak as you would to a collaborator who asked, “What are you working on right now?”',
                    'last',
                ),
            ].join('\n'),
            cta: {
                label: 'RECORD A SHORT NOTE',
                href: 'https://www.fusionart.world/settings/profile',
            },
            footnote: 'Rough is welcome · A minute or two is enough',
        }),
        notes: 'Platform feature announcement — edit CTA if you want a different deep link.',
    },
    tpl_radar_artists: {
        id: 'tpl_radar_artists',
        name: 'Radar — Artist invite',
        templateGroup: 'campaigns',
        defaultEyebrow: 'Fusion Radar',
        defaultSubject: 'An invitation to Fusion — 50% off membership',
        defaultPreview:
            'A personal invitation to Fusion’s curated network, with a membership discount code to join.',
        bodyHtml: renderFusionEmailFromSlots({
            eyebrow: 'From Fusion',
            heroImageUrl: generalSlots.heroImageUrl,
            heroAlt: 'Fusion — artist membership',
            pillLabel: 'INVITE',
            headlineHtml: 'You belong<br>in this<br>network.',
            bodyHtml: [
                fusionEmailParagraph(
                    'Fusion is a curated art network — artists, galleries, and programs rooted in Japan. I am writing because your practice belongs in that conversation, and I wanted the door in to be clear.',
                    'lead',
                ),
                fusionEmailParagraph(
                    'Membership is how you apply to residencies, stay in the loop, and meet the rest of the roster. Use the code below for 50% off when you join.',
                ),
                fusionEmailDiscountCodeBlock(),
                fusionEmailParagraph(
                    'If a conversation would help before you sign up, reply to this note. Otherwise, the code is yours — tap Join Fusion and enter it at checkout.',
                    'last',
                ),
            ].join('\n'),
            cta: {
                label: 'JOIN FUSION',
                href: '{{JOIN_URL}}',
            },
            footnote: '50% off applies to the first months of a monthly plan · Code is unique to this invite',
        }),
        notes: 'Radar outreach — artists. Interpolate discount code before send.',
    },
    tpl_radar_residency_invite: {
        id: 'tpl_radar_residency_invite',
        name: 'Radar — Residency invite',
        templateGroup: 'campaigns',
        defaultEyebrow: 'Fusion Radar',
        defaultSubject: 'An invitation — programs rooted in Japan',
        defaultPreview:
            'A personal note about Fusion’s Japan artist residency, with a membership discount to join.',
        bodyHtml: renderFusionEmailFromSlots({
            eyebrow: 'From Fusion',
            heroImageUrl: generalSlots.heroImageUrl,
            heroAlt: 'Fusion residency — Japan',
            pillLabel: 'RESIDENCY',
            headlineHtml: 'A place<br>for focused<br>practice.',
            bodyHtml: [
                fusionEmailParagraph(
                    'I wanted to reach out personally about Fusion’s artist residency programs rooted in Japan — and why your practice feels especially relevant to the research environment we are developing.',
                    'lead',
                ),
                fusionEmailParagraph(
                    'Membership is the path into applications and the wider network. Use this invite code for 50% off when you join.',
                ),
                fusionEmailDiscountCodeBlock(),
                fusionEmailParagraph(
                    'If you are open to a short conversation first, reply and I will share dates and structure. The code is ready whenever you are.',
                    'last',
                ),
            ].join('\n'),
            cta: {
                label: 'JOIN FUSION',
                href: '{{JOIN_URL}}',
            },
            footnote: '50% off applies to the first months of a monthly plan',
        }),
        notes: 'Radar outreach — residency candidates.',
    },
    tpl_radar_gallery_intro: {
        id: 'tpl_radar_gallery_intro',
        name: 'Radar — Gallery introduction',
        templateGroup: 'campaigns',
        defaultEyebrow: 'Fusion Radar',
        defaultSubject: 'Introducing Fusion — a curated art network',
        defaultPreview: 'Galleries, artists, and programs rooted in Japan — with a membership invite code.',
        bodyHtml: renderFusionEmailFromSlots({
            eyebrow: 'From Fusion',
            heroImageUrl: generalSlots.heroImageUrl,
            heroAlt: 'Fusion curated art network',
            pillLabel: 'GALLERY',
            headlineHtml: 'A network<br>built for<br>exchange.',
            bodyHtml: [
                fusionEmailParagraph(
                    'Fusion is a curated art network connecting artists, galleries, curators, and collectors through programs rooted in Japan. I am writing because your gallery’s program aligns with artists and themes we are developing.',
                    'lead',
                ),
                fusionEmailParagraph(
                    'If a conversation about roster exchange, residency partnerships, or introductions would be useful, I would welcome a reply. The code below is 50% off membership if you or a colleague want to join the network.',
                ),
                fusionEmailDiscountCodeBlock(),
                fusionEmailParagraph(
                    'Join with the code, or write back and we will set a time.',
                    'last',
                ),
            ].join('\n'),
            cta: {
                label: 'JOIN FUSION',
                href: '{{JOIN_URL}}',
            },
        }),
        notes: 'Radar outreach — galleries.',
    },
    tpl_radar_curator_connect: {
        id: 'tpl_radar_curator_connect',
        name: 'Radar — Curator connect',
        templateGroup: 'campaigns',
        defaultEyebrow: 'Fusion Radar',
        defaultSubject: 'Curatorial connection — Fusion & Japan',
        defaultPreview: 'Shared themes between your exhibitions and Fusion’s programs.',
        bodyHtml: renderFusionEmailFromSlots({
            eyebrow: 'From Fusion',
            heroImageUrl: generalSlots.heroImageUrl,
            heroAlt: 'Fusion — curatorial exchange',
            pillLabel: 'CURATOR',
            headlineHtml: 'Shared<br>questions<br>of place.',
            bodyHtml: [
                fusionEmailParagraph(
                    'I have been following your recent curatorial work and wanted to connect it with Fusion’s programs rooted in Japan — especially where material practice, migration, and place-based research meet.',
                    'lead',
                ),
                fusionEmailParagraph(
                    'If you are open to an introduction or a short exchange, I would be glad to continue the conversation. Membership is how the network stays in touch — 50% off with the code below.',
                ),
                fusionEmailDiscountCodeBlock(),
                fusionEmailParagraph(
                    'Join when it is useful, or reply and we will talk first.',
                    'last',
                ),
            ].join('\n'),
            cta: {
                label: 'JOIN FUSION',
                href: '{{JOIN_URL}}',
            },
        }),
        notes: 'Radar outreach — curators.',
    },
    tpl_radar_collector_intro: {
        id: 'tpl_radar_collector_intro',
        name: 'Radar — Collector / patron intro',
        templateGroup: 'campaigns',
        defaultEyebrow: 'Fusion Radar',
        defaultSubject: 'Fusion — editions, programs, and introductions',
        defaultPreview: 'Collector-adjacent introduction through Fusion’s curated network.',
        bodyHtml: renderFusionEmailFromSlots({
            eyebrow: 'From Fusion',
            heroImageUrl: generalSlots.heroImageUrl,
            heroAlt: 'Fusion — collectors and editions',
            pillLabel: 'COLLECTOR',
            headlineHtml: 'A pathway<br>into the<br>network.',
            bodyHtml: [
                fusionEmailParagraph(
                    'Fusion connects artists, galleries, curators, and collectors through programs rooted in Japan. I am reaching out because your public support of contemporary practice suggests a natural pathway into our network — via editions, events, or residency patronage.',
                    'lead',
                ),
                fusionEmailParagraph(
                    'If a personal introduction or a look at current editions would be welcome, reply and we will follow up carefully. The invite code is 50% off membership if you want a seat in the network.',
                ),
                fusionEmailDiscountCodeBlock(),
                fusionEmailParagraph(
                    'Use the code at signup, or write back and we will arrange an introduction.',
                    'last',
                ),
            ].join('\n'),
            cta: {
                label: 'JOIN FUSION',
                href: '{{JOIN_URL}}',
            },
        }),
        notes: 'Radar outreach — collector-adjacent organizations and patrons.',
    },
};

/** @deprecated Use tpl_featured_artist */
EMAIL_CAMPAIGN_TEMPLATES.tpl_artist_feature = {
    ...EMAIL_CAMPAIGN_TEMPLATES.tpl_featured_artist,
    id: 'tpl_artist_feature',
    name: 'Artist Feature (legacy)',
};

/** Group labels for template select UI. */
export const EMAIL_TEMPLATE_GROUPS = [
    { key: 'updates', label: 'Updates' },
    { key: 'spotlights', label: 'Spotlights' },
    { key: 'campaigns', label: 'Campaigns' },
    { key: 'features', label: 'Features' },
];

export { DRAW_GOAL_NOT_REACHED_TEMPLATE_ID };

/**
 * @param {string} [templateId]
 * @param {string} [html]
 */
export function templateRequiresTrialAccessPlaceholders(templateId, html) {
    const id = String(templateId || '').trim();
    if (id === DRAW_GOAL_NOT_REACHED_TEMPLATE_ID) return true;
    const tpl = EMAIL_CAMPAIGN_TEMPLATES[id];
    if (tpl?.requiresTrialAccessPlaceholders) return true;
    const s = String(html || '');
    return s.includes('{{TRIAL_ACCESS_CODE}}') || s.includes('{{TRIAL_JOIN_URL}}');
}

/**
 * @param {string} id
 * @returns {EmailTemplateDef | undefined}
 */
export function getEmailTemplateById(id) {
    if (id === 'tpl_artist_feature') return EMAIL_CAMPAIGN_TEMPLATES.tpl_featured_artist;
    return EMAIL_CAMPAIGN_TEMPLATES[id];
}

export const RADAR_EMAIL_TEMPLATE_IDS = [
    'tpl_radar_artists',
    'tpl_radar_residency_invite',
    'tpl_radar_gallery_intro',
    'tpl_radar_curator_connect',
    'tpl_radar_collector_intro',
];

/**
 * @param {{ templateId?: string, code?: string, durationMonths?: number }} opts
 */
export function renderRadarTemplateHtml(opts = {}) {
    const id = String(opts.templateId || 'tpl_radar_artists');
    const t = getEmailTemplateById(id) || getEmailTemplateById('tpl_radar_artists');
    const code = String(opts.code || '').trim();
    const html = String(t?.bodyHtml || '');
    return interpolateRadarDiscountHtml(html, {
        code,
        durationMonths: opts.durationMonths,
        joinUrl: joinUrlForPromoCode(code),
    });
}

/**
 * @returns {string}
 */
export function renderEmailTemplateSelectHtml() {
    const esc = (s) =>
        String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    const byGroup = /** @type {Record<string, EmailTemplateDef[]>} */ ({});
    for (const tpl of Object.values(EMAIL_CAMPAIGN_TEMPLATES)) {
        if (tpl.id === 'tpl_artist_feature') continue;
        const g = tpl.templateGroup || 'campaigns';
        if (!byGroup[g]) byGroup[g] = [];
        byGroup[g].push(tpl);
    }
    let html = '<option value="">— None —</option>';
    for (const { key, label } of EMAIL_TEMPLATE_GROUPS) {
        const items = byGroup[key];
        if (!items?.length) continue;
        html += `<optgroup label="${esc(label)}">`;
        for (const t of items) {
            html += `<option value="${esc(t.id)}">${esc(t.name)}</option>`;
        }
        html += '</optgroup>';
    }
    return html;
}
