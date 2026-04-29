/**
 * Built-in HTML templates for Studio → Email (client-side; optional templateId on save).
 * Motoko may store templateId for audit only.
 */
import { DEFAULT_SIGNATURE_HTML } from './emailHtml.js';

/**
 * @typedef {{ id: string, name: string, defaultSubject: string, defaultPreview: string, bodyHtml: string, notes?: string }} EmailTemplateDef
 */

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
