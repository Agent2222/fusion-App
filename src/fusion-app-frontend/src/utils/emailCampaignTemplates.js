/**
 * Built-in HTML templates for Studio → Email (client-side; optional templateId on save).
 * Motoko may store templateId for audit only.
 */
import {
    defaultProgramUpdateLayoutSlots,
    fusionEmailLayout,
    fusionEmailLink,
    fusionEmailParagraph,
    FUSION_EMAIL_STYLES,
    renderFusionEmailFromSlots,
} from './emailFusionLayout.js';

/**
 * @typedef {'artist' | 'journal' | 'program' | 'video'} EmailContentSourceType
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
 *   contentSourceTypes?: EmailContentSourceType[],
 *   defaultEyebrow?: string,
 *   templateGroup?: 'updates' | 'spotlights' | 'campaigns',
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
        defaultEyebrow: 'Reminder',
        defaultSubject: 'Last chance to apply',
        defaultPreview: 'Final days — don’t miss the deadline.',
        bodyHtml: fusionEmailLayout({
            eyebrow: 'Reminder',
            pillLabel: 'DEADLINE',
            headlineHtml: 'Closing<br>Soon',
            bodyHtml: fusionEmailParagraph(
                'This is a short note to remind you that applications close soon. If you have questions, simply reply to this email.',
                'last',
            ),
            cta: { label: 'VIEW DETAILS', href: 'https://www.fusionart.world' },
        }),
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
];

/**
 * @param {string} id
 * @returns {EmailTemplateDef | undefined}
 */
export function getEmailTemplateById(id) {
    if (id === 'tpl_artist_feature') return EMAIL_CAMPAIGN_TEMPLATES.tpl_featured_artist;
    return EMAIL_CAMPAIGN_TEMPLATES[id];
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
