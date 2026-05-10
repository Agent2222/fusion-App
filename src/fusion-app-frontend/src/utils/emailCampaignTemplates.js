/**
 * Built-in HTML templates for Studio → Email (client-side; optional templateId on save).
 * Motoko may store templateId for audit only.
 */
import { DEFAULT_SIGNATURE_HTML } from './emailHtml.js';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   defaultSubject: string,
 *   defaultPreview: string,
 *   bodyHtml: string,
 *   notes?: string,
 *   requiresRosterPlaceholders?: boolean,
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
const GREETING_FULL_NAME_EXACT = new Set([
    'el jngl',
    'lady pluuto',
]);

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
 * @param {string} innerHtml
 * @param {{ includeSignature?: boolean }} [opts]
 * @returns {string}
 */
export function wrapEmailHtml(innerHtml, opts = {}) {
    const sig = opts.includeSignature !== false ? DEFAULT_SIGNATURE_HTML : '';
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

/** @type {Record<string, EmailTemplateDef>} */
export const EMAIL_CAMPAIGN_TEMPLATES = {
    tpl_general: {
        id: 'tpl_general',
        name: 'General',
        defaultSubject: 'Kaga City, Ishikawa — Artist Residency (Fall 2026)',
        defaultPreview: 'Applications are open for the next FUSION Artist Residency in Japan.',
        bodyHtml: `<div style="font-family:'momochidori-variable','Momochidori','Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#faf3f4;color:#000000;padding:40px 24px;line-height:1.5">

  <!-- Header -->
  <div style="padding-bottom:22px;margin-bottom:26px;display:flex;justify-content:space-between;align-items:center;">

    <img src="https://fusionart.world/email/Fusion-X-logo-02.png" alt="Fusion" width="160" style="display:block;height:auto;border:0">

    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;">
      Program Update
    </div>

  </div>

  <!-- Hero Image (Centered - email safe) -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
    <tbody><tr>
      <td align="center">
        <img src="https://fusionart-bucket.s3.us-east-2.amazonaws.com/uploads/platform-assets/program_hero-1.jpg" alt="Kaga City, Ishikawa" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;margin:0 auto;">
      </td>
    </tr>
  </tbody></table>

  <!-- Main Content -->
  <div style="border-top:1px solid #000000;border-bottom:1px solid #000000;padding:32px 0;">

    <div style="display:inline-block;background:#000000;color:#ffffff;padding:6px 12px;font-size:11px;font-weight:700;margin-bottom:18px;letter-spacing:0.06em;">
      JAPAN ARTIST RESIDENCY
    </div>

    <h1 style="margin:0 0 20px;font-size:44px;line-height:0.95;font-weight:900;letter-spacing:-0.04em;">
      Kaga City,<br>
      Ishikawa<br>
      Fall 2026
    </h1>

    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
      Applications are now open for the next FUSION Artist Residency in Japan.
    </p>

    <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
      A program shaped around place, process, and exchange, moving from the cultural energy of Japan to the quiet, craft-rich landscape of Kaga City.
    </p>

    <p style="font-size:15px;line-height:1.6;margin:0 0 28px;">
      Join an evolving platform connecting artists, curators, collectors, and galleries through residency, dialogue, and visibility.
    </p>

    <!-- CTA -->
    <a href="https://fusionart.world/program/kaga-ishikawa" style="display:inline-block;background:#c12525;color:#ffffff;text-decoration:none;padding:14px 20px;font-size:12px;font-weight:800;letter-spacing:0.08em;">
      APPLY / LEARN MORE
    </a>

    <p style="font-size:12px;margin:26px 0 0;">
      Space is limited. Early applications encouraged.
    </p>

  </div>

  <!-- Footer -->
  <div style="margin-top:30px;padding-top:22px;">

    <p style="margin:0 0 12px;font-size:13px;">
      — Fusion Team
    </p>

    <img src="https://fusionart.world/email/Fusion-Logo-Sig-1.png" alt="Fusion" width="110" style="display:block;margin-bottom:16px;border:0">

    <p style="margin:0 0 8px;font-size:13px;">
      <a href="https://www.fusionart.world" style="color:#000000;text-decoration:none;border-bottom:1px solid #000000;">
        fusionart.world
      </a>
    </p>

    <p style="margin:0;font-size:12px;color:#4a4a4a;letter-spacing:0.05em;">
      IG: @fusion_intl &nbsp;/&nbsp; TT: @fusion_intl &nbsp;/&nbsp; YT: @fusionartworld
    </p>

  </div>

</div>`,
        notes: 'Full-width branded layout (Momochidori); edit copy and links per campaign.',
    },
    tpl_open_call: {
        id: 'tpl_open_call',
        name: 'Open Call Launch',
        defaultSubject: 'Residency open call',
        defaultPreview: 'Apply for the next Fusion residency — limited places.',
        bodyHtml: wrapEmailHtml(`<h1 style="font-size:22px;margin:0 0 12px">Residency Open Call</h1>
<p style="font-size:15px;line-height:1.55;margin:0 0 16px">We are inviting artists to apply for the upcoming program. Share your practice and what you would explore during the residency.</p>
<ul style="font-size:15px;line-height:1.4;margin:0 0 20px;padding-left:1.2em">
<li>Key dates in your local timezone</li>
<li>What we provide</li>
<li>How to apply</li>
</ul>
<p style="text-align:center;margin:0"><a href="https://www.fusionart.world" style="display:inline-block;padding:12px 28px;background:#000;color:#fff;text-decoration:none;border-radius:4px;font-weight:600">Apply now</a></p>`),
        notes: 'Add hero image via toolbar if needed',
    },
    tpl_open_call_roster: {
        id: 'tpl_open_call_roster',
        name: 'The new Fusion is here',
        defaultSubject: 'The new Fusion is here! Your access is inside! :)',
        defaultPreview: 'The platform is live. Your profile, the network, and what is next — including Kaga.',
        bodyHtml: wrapEmailHtml(`<h1 style="font-size:24px;margin:0 0 14px;line-height:1.15;font-weight:800;letter-spacing:-0.02em">The new Fusion is here.</h1>
<p style="font-size:14px;line-height:1.5;margin:0 0 18px;color:#333;font-weight:600;letter-spacing:0.06em;text-transform:uppercase">Your new global footprint— live now</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 16px">Hi {{ARTIST_FIRST_NAME}},</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 16px">We are thrilled to say: the <strong>new Fusion platform</strong> is live! Your space for profile, programs, and the community we are building together. This is the next chapter in Fusion's evolution: a place where the interconnections between <strong>artists, curators, collectors, and galleries</strong> can grow in private and present in public, and where we believe that exchange will help shape the future of the art world.</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 16px">The platform is in <strong>steady development.</strong> You may notice a few kinks along the way, and it will keep evolving over time. <strong>Access is free for all Fusion veterans</strong>, and you can expect it to deepen and refine for impact and strategic positioning in the coming months.</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 16px">Below is your personal <strong>access code</strong>. Enter it when you join Fusion as an artist to link your roster profile (single use - once it is redeemed, it clears on our side).</p>
<p style="font-size:20px;line-height:1.4;margin:0 0 18px;font-weight:700;letter-spacing:0.12em">{{ACCESS_CODE}}</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 16px">Additionally, we'll be introducing guest passes to extend guest access to artists, curators or collectors you think would benefit from the platform.</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 16px">We also have a <strong>new program coming up in Kaga</strong>. If you are interested, you are welcome to <strong>reach out to us directly</strong> for an expedited process, and <strong>first return residency artists are eligible for a discount</strong>.</p>
<p style="font-size:14px;line-height:1.5;margin:0 0 20px;color:#444">If anything feels off while you explore, please email us at <a href="mailto:info@fusionart.world" style="color:#111;text-decoration:underline">info@fusionart.world</a> — we read every message and want to hear from you.</p>
<p style="text-align:center;margin:0"><a href="https://www.fusionart.world" style="display:inline-block;padding:12px 28px;background:#000;color:#fff;text-decoration:none;border-radius:4px;font-weight:600">See the new Fusion</a></p>`),
        notes: 'Send blast: platform launch invite; per-artist name + code; Kaga + support',
        requiresRosterPlaceholders: true,
    },
    tpl_reminder: {
        id: 'tpl_reminder',
        name: 'Reminder (last chance)',
        defaultSubject: 'Last chance to apply',
        defaultPreview: 'Final days — don’t miss the deadline.',
        bodyHtml: wrapEmailHtml(`<h1 style="font-size:20px;margin:0 0 10px">Reminder: closing soon</h1>
<p style="font-size:15px;line-height:1.55;margin:0 0 16px">This is a short note to remind you that applications close soon. If you have questions, simply reply to this email.</p>
<p style="text-align:center;margin:0"><a href="https://www.fusionart.world" style="display:inline-block;padding:12px 28px;background:#000;color:#fff;text-decoration:none;border-radius:4px;font-weight:600">View details</a></p>`),
    },
    tpl_artist_feature: {
        id: 'tpl_artist_feature',
        name: 'Artist Feature',
        defaultSubject: 'Artist spotlight',
        defaultPreview: 'A conversation with a Fusion artist — read the story.',
        bodyHtml: wrapEmailHtml(`<h1 style="font-size:22px;margin:0 0 12px">Artist spotlight</h1>
<!-- s3-image -->
<p style="font-size:15px;line-height:1.55;margin:0 0 12px">“A short pull quote or highlight about the work.”</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 20px">Intro paragraph: context for readers and a clear reason to visit the full profile.</p>
<p style="text-align:center;margin:0"><a href="https://www.fusionart.world" style="display:inline-block;padding:12px 28px;background:#000;color:#fff;text-decoration:none;border-radius:4px;font-weight:600">View profile</a></p>`),
    },
};

/**
 * @param {string} id
 * @returns {EmailTemplateDef | undefined}
 */
export function getEmailTemplateById(id) {
    return EMAIL_CAMPAIGN_TEMPLATES[id];
}
