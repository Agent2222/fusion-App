/**
 * Branded email HTML for scheduled tasks (Node copy — do not import the Vite app).
 */

const LOGO = 'https://fusionart.world/email/Fusion-X-logo-02.png';
const SIG = 'https://fusionart.world/email/Fusion-Logo-Sig-1.png';
const CTA = '#c12525';
const INK = '#111827';
const SITE = 'https://www.fusionart.world';
const TRAVEL_URL = `${SITE}/settings/profile#travel`;
const MARKER = '<!-- fusion-email-layout -->';

/**
 * @param {string} s
 */
export function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {string} localesJson
 * @param {string} [fallback]
 */
export function programNameFromLocalesJson(localesJson, fallback = 'the program') {
    try {
        const parsed = JSON.parse(String(localesJson || '') || '{}');
        const en = parsed.en && typeof parsed.en === 'object' ? parsed.en : parsed;
        const pp = en.programPage && typeof en.programPage === 'object' ? en.programPage : {};
        const t = String(pp.headline || en.headline || en.location || en.focus || '').trim();
        if (t) return t;
    } catch {
        /* ignore */
    }
    return String(fallback || 'the program').trim() || 'the program';
}

/**
 * @param {string} localesJson
 */
export function programHeroFromLocalesJson(localesJson) {
    try {
        const parsed = JSON.parse(String(localesJson || '') || '{}');
        const en = parsed.en && typeof parsed.en === 'object' ? parsed.en : parsed;
        return String(en.imageSrc || en.heroMediaSrc || en.image || '').trim();
    } catch {
        return '';
    }
}

/**
 * @param {string} text
 */
function p(text) {
    return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#000000;">${text}</p>`;
}

/**
 * @param {string} label
 * @param {string} href
 * @param {string} [bg]
 */
function cta(label, href, bg = CTA) {
    const text = String(label || '').trim();
    const url = String(href || '').trim();
    if (!text || !url) return '';
    return `<p style="margin:0 0 28px;"><a href="${escapeHtml(url)}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;padding:14px 20px;font-size:12px;font-weight:800;letter-spacing:0.08em;">${escapeHtml(text)}</a></p>`;
}

/**
 * @param {unknown} rawLinks
 */
export function travelPrepCardsHtml(rawLinks) {
    const links = (Array.isArray(rawLinks) ? rawLinks : [])
        .map((row, i) => ({
            title: String(row?.title ?? '').trim(),
            url: String(row?.url ?? '').trim(),
            description: String(row?.description ?? '').trim(),
            imageUrl: String(row?.imageUrl ?? '').trim(),
            sortOrder: Number(row?.sortOrder ?? i) || i,
        }))
        .filter((row) => row.title || row.url || row.imageUrl)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    if (!links.length) return '';
    const cell = (link) => {
        const title = link.title || 'Travel card';
        const img = link.imageUrl
            ? `<img src="${escapeHtml(link.imageUrl)}" alt="${escapeHtml(title)}" width="120" style="display:block;margin:0 auto 10px;width:120px;height:auto;border:0;border-radius:8px;" />`
            : '';
        const desc = link.description
            ? `<p style="margin:0 0 10px;font-size:13px;line-height:1.45;color:#000000;">${escapeHtml(link.description)}</p>`
            : '';
        return `<td align="center" valign="top" style="padding:8px;">
${img}
<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;color:#000000;">${escapeHtml(title)}</p>
${desc}
${cta(link.url ? 'Add to wallet' : '', link.url, INK)}
</td>`;
    };
    const chunkSize = Math.min(3, Math.max(1, links.length));
    const rows = [];
    for (let i = 0; i < links.length; i += chunkSize) {
        rows.push(`<tr>${links.slice(i, i + chunkSize).map(cell).join('')}</tr>`);
    }
    return `${p('<strong style="letter-spacing:0.08em;text-transform:uppercase;font-size:13px;">Travel preparation</strong>')}
${p('Download one of these cards to your mobile wallet if you can — it makes getting around much easier when you arrive.')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;"><tbody>
${rows.join('\n')}
</tbody></table>`;
}

/**
 * @param {{ pill: string, headline: string, heroUrl?: string, heroAlt?: string, bodyHtml: string }} slots
 */
export function wrapFusionEmail(slots) {
    const hero = String(slots.heroUrl || '').trim()
        ? `<img src="${escapeHtml(slots.heroUrl)}" alt="${escapeHtml(slots.heroAlt || '')}" width="552" style="display:block;width:100%;height:auto;border:0;margin:0 0 24px;" />`
        : '';
    return `${MARKER}
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#faf3f4;color:#000000;padding:40px 24px;line-height:1.5">
  <div style="padding-bottom:22px;margin-bottom:26px;display:flex;justify-content:space-between;align-items:center;">
    <img src="${LOGO}" alt="Fusion" width="160" style="display:block;height:auto;border:0">
    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;">Travel</div>
  </div>
  ${hero}
  <div style="border-top:1px solid #000000;border-bottom:1px solid #000000;padding:32px 0;">
    <div style="display:inline-block;background:#000000;color:#ffffff;padding:6px 12px;font-size:11px;font-weight:700;margin-bottom:18px;letter-spacing:0.06em;">${escapeHtml(slots.pill)}</div>
    <h1 style="margin:0 0 20px;font-size:44px;line-height:0.95;font-weight:900;letter-spacing:-0.04em;">${slots.headline}</h1>
    ${slots.bodyHtml}
  </div>
  <div style="margin-top:30px;padding-top:22px;">
    <p style="margin:0 0 12px;font-size:13px;">— Fusion Team</p>
    <img src="${SIG}" alt="Fusion" width="110" style="display:block;margin-bottom:16px;border:0">
    <p style="margin:0 0 8px;font-size:13px;"><a href="${SITE}" style="color:#000000;text-decoration:none;border-bottom:1px solid #000000;">fusionart.world</a></p>
  </div>
</div>`;
}

/**
 * @param {{ programName: string, applicantName?: string, heroUrl?: string, travelPrepLinks?: unknown[] }} opts
 */
export function renderFlightFollowUpEmail(opts) {
    const programName = String(opts.programName || 'the program').trim() || 'the program';
    const first = String(opts.applicantName || '').trim().split(/\s+/)[0] || '';
    const greeting = first ? `Hi ${escapeHtml(first)},` : 'Hello,';
    const bodyHtml = [
        p(greeting),
        p(
            `A reminder about your upcoming flight for ${escapeHtml(programName)}. Please add your estimated arrival date and time in your profile so we can keep up with your flight and meet you on arrival.`,
        ),
        p('Sign in, open Programs, then the Travel tab, and enter the date and time you expect to land.'),
        cta('ADD ARRIVAL TIME', TRAVEL_URL),
        travelPrepCardsHtml(opts.travelPrepLinks),
    ].join('\n');
    return wrapFusionEmail({
        pill: 'FLIGHT FOLLOW-UP',
        headline: 'Add your<br>arrival time',
        heroUrl: opts.heroUrl,
        heroAlt: programName,
        bodyHtml,
    });
}

/**
 * @param {{ programName: string, applicantName?: string, heroUrl?: string, comms?: object, travelPrepLinks?: unknown[] }} opts
 */
export function renderCommsInviteEmail(opts) {
    const programName = String(opts.programName || 'the program').trim() || 'the program';
    const first = String(opts.applicantName || '').trim().split(/\s+/)[0] || '';
    const greeting = first ? `Hi ${escapeHtml(first)},` : 'Hello,';
    const c = opts.comms && typeof opts.comms === 'object' ? opts.comms : {};
    const qr = (src, caption, href, label) => {
        const img = src
            ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(caption)}" width="140" style="display:block;margin:0 auto 8px;width:140px;height:auto;border:0;" />`
            : '';
        return `<td align="center" valign="top" style="padding:8px;">${img}<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">${escapeHtml(caption)}</p>${cta(label, href, href && label.startsWith('Join') ? CTA : INK)}</td>`;
    };
    const bodyHtml = [
        p(greeting),
        p(`${escapeHtml(programName)} is coming up quickly. Download the LINE app, then join both official chat rooms.`),
        p('<strong style="letter-spacing:0.08em;text-transform:uppercase;font-size:13px;">Step 1 — Download</strong>'),
        `<table role="presentation" width="100%"><tr>${qr(c.iosQrUrl, 'iOS', c.iosStoreUrl, 'iOS')}${qr(c.androidQrUrl, 'Android', c.androidStoreUrl, 'Android')}</tr></table>`,
        p('<strong style="letter-spacing:0.08em;text-transform:uppercase;font-size:13px;">Step 2 — Join both rooms</strong>'),
        `<table role="presentation" width="100%"><tr>${qr(c.groupGeneralQrUrl, c.groupGeneralName || 'General', c.groupGeneralInviteUrl, `Join ${c.groupGeneralName || 'General'}`)}${qr(c.groupAnnounceQrUrl, c.groupAnnounceName || 'Announcements', c.groupAnnounceInviteUrl, `Join ${c.groupAnnounceName || 'Announcements'}`)}</tr></table>`,
        travelPrepCardsHtml(opts.travelPrepLinks),
    ].join('\n');
    return wrapFusionEmail({
        pill: 'COMMUNICATIONS',
        headline: `The ${escapeHtml(programName)}<br>Official Chat Rooms`,
        heroUrl: opts.heroUrl,
        heroAlt: programName,
        bodyHtml,
    });
}

/**
 * @param {{ programName: string, applicantName?: string, subject?: string, bodyText?: string, heroUrl?: string }} opts
 */
export function renderCustomEmail(opts) {
    const programName = String(opts.programName || 'the program').trim() || 'the program';
    const first = String(opts.applicantName || '').trim().split(/\s+/)[0] || '';
    const greeting = first ? `Hi ${escapeHtml(first)},` : 'Hello,';
    const body = String(opts.bodyText || '')
        .split(/\n\s*\n/)
        .map((b) => p(escapeHtml(b.trim()).replace(/\n/g, '<br>')))
        .join('\n');
    return wrapFusionEmail({
        pill: 'PROGRAM UPDATE',
        headline: escapeHtml(programName),
        heroUrl: opts.heroUrl,
        heroAlt: programName,
        bodyHtml: `${p(greeting)}\n${body}`,
    });
}

export function flightFollowUpSubject(programName) {
    return `${String(programName || 'the program').trim() || 'the program'} — add your arrival date and time`;
}

export function commsInviteSubject(programName) {
    return `The ${String(programName || 'the program').trim() || 'the program'} Official Chat Rooms`;
}

export const CANNED_LINE = {
    flight_followup: 'Please add your arrival date and time in Fusion → Profile → Travel so we can meet you.',
    comms_invite: 'Please join both official Fusion chat rooms — the invite is in your email.',
};

/**
 * @param {object} task
 */
export function lineTextForTask(task) {
    const custom = String(task?.customLineText || '').trim();
    if (custom) return custom;
    const kind = String(task?.kind || '');
    return CANNED_LINE[kind] || '';
}
