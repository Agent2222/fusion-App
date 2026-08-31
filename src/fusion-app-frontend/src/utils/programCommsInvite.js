/**
 * Studio Comms — LINE invite helpers (store + two-room QRs, Fusion email HTML).
 */
import lineLogoUrl from '../assets/comms/line-logo.png';
import {
    escapeHtmlForEmailLayout,
    fusionEmailParagraph,
    isFusionEmailLayout,
    renderFusionEmailFromSlots,
} from './emailFusionLayout.js';

export const PROGRAM_COMMS_TEMPLATE_ID = 'tpl_program_comms_line';
export const LINE_GETTING_STARTED_URL =
    'https://developers.line.biz/en/docs/messaging-api/getting-started/#create-oa-check';
export const LINE_IOS_STORE_URL = 'https://apps.apple.com/app/line/id443904275';
export const LINE_ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=jp.naver.line.android';
export const DEFAULT_MEMBER_COMMS_INVITE_MESSAGE =
    'The program is coming up quickly. Download the LINE app, then join both official chat rooms.';

export { lineLogoUrl as LINE_PROVIDER_THUMB_URL };

const EMAIL_CTA_RED = '#c12525';
const EMAIL_CTA_INK = '#111827';

/**
 * @param {string} [programId]
 */
export function emptyProgramCommsConfig(programId = '') {
    return {
        programId: String(programId || ''),
        provider: 'line',
        oaName: '',
        basicId: '',
        channelId: '',
        iosStoreUrl: LINE_IOS_STORE_URL,
        androidStoreUrl: LINE_ANDROID_STORE_URL,
        iosThumbUrl: '',
        androidThumbUrl: '',
        iosQrUrl: '',
        androidQrUrl: '',
        groupGeneralName: '',
        groupGeneralInviteUrl: '',
        groupGeneralQrUrl: '',
        groupAnnounceName: '',
        groupAnnounceInviteUrl: '',
        groupAnnounceQrUrl: '',
        inviteSentAtByApplicant: [],
        memberActive: false,
        inviteMessage: '',
        providerThumbUrl: '',
        updatedAt: '',
    };
}

function firstNonEmptyText(...values) {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) return text;
    }
    return '';
}

function isHostedImageUrl(url) {
    const value = String(url || '').trim();
    return Boolean(value && !value.startsWith('data:'));
}

/**
 * @param {unknown} raw
 * @param {string} [programId]
 */
export function normalizeProgramCommsConfig(raw, programId = '') {
    const base = emptyProgramCommsConfig(programId);
    const row = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
    const pairs = Array.isArray(row.inviteSentAtByApplicant)
        ? row.inviteSentAtByApplicant
              .map((entry) => {
                  if (Array.isArray(entry) && entry.length >= 2) {
                      return [String(entry[0] || ''), String(entry[1] || '')];
                  }
                  return ['', ''];
              })
              .filter(([id]) => id)
        : [];
    return {
        ...base,
        programId: String(row.programId ?? programId ?? '').trim() || base.programId,
        provider: String(row.provider ?? 'line').trim() || 'line',
        oaName: String(row.oaName ?? '').trim(),
        basicId: String(row.basicId ?? '').trim(),
        channelId: String(row.channelId ?? '').trim(),
        iosStoreUrl: firstNonEmptyText(row.iosStoreUrl) || LINE_IOS_STORE_URL,
        androidStoreUrl: firstNonEmptyText(row.androidStoreUrl) || LINE_ANDROID_STORE_URL,
        iosThumbUrl: firstNonEmptyText(row.iosThumbUrl),
        androidThumbUrl: firstNonEmptyText(row.androidThumbUrl),
        iosQrUrl: firstNonEmptyText(row.iosQrUrl),
        androidQrUrl: firstNonEmptyText(row.androidQrUrl),
        groupGeneralName: firstNonEmptyText(row.groupGeneralName, row.groupName),
        groupGeneralInviteUrl: firstNonEmptyText(row.groupGeneralInviteUrl, row.groupInviteUrl),
        groupGeneralQrUrl: firstNonEmptyText(row.groupGeneralQrUrl, row.groupQrUrl),
        groupAnnounceName: firstNonEmptyText(row.groupAnnounceName),
        groupAnnounceInviteUrl: firstNonEmptyText(row.groupAnnounceInviteUrl),
        groupAnnounceQrUrl: firstNonEmptyText(row.groupAnnounceQrUrl),
        inviteSentAtByApplicant: pairs,
        memberActive: Boolean(row.memberActive),
        inviteMessage: String(row.inviteMessage ?? '').trim(),
        providerThumbUrl: String(row.providerThumbUrl ?? '').trim(),
        updatedAt: String(row.updatedAt ?? ''),
    };
}

/**
 * Bundled provider mark. LINE uses the official brand icon; others have no default yet.
 * @param {string} [provider]
 */
export function defaultProviderThumbUrl(provider) {
    const key = String(provider || 'line').trim().toLowerCase();
    if (key === 'line') return String(lineLogoUrl || '');
    return '';
}

/**
 * @param {unknown} cfg
 */
export function resolveProviderThumbUrl(cfg) {
    const rec = normalizeProgramCommsConfig(cfg);
    return rec.providerThumbUrl || defaultProviderThumbUrl(rec.provider);
}

/**
 * Staff override if present; otherwise Fusion default copy.
 * @param {unknown} cfg
 */
export function resolveInviteMessage(cfg) {
    const rec = normalizeProgramCommsConfig(cfg);
    return rec.inviteMessage || DEFAULT_MEMBER_COMMS_INVITE_MESSAGE;
}

/**
 * @param {unknown} cfg
 */
export function isProgramCommsMemberReady(cfg) {
    const rec = normalizeProgramCommsConfig(cfg);
    return Boolean(
        rec.groupGeneralInviteUrl &&
            rec.groupAnnounceInviteUrl &&
            isHostedImageUrl(rec.groupGeneralQrUrl) &&
            isHostedImageUrl(rec.groupAnnounceQrUrl) &&
            isHostedImageUrl(rec.iosQrUrl) &&
            isHostedImageUrl(rec.androidQrUrl),
    );
}

/**
 * Studio activate is on and both rooms plus store QRs are ready.
 * @param {unknown} cfg
 */
export function isMemberCommsRoomReady(cfg) {
    const rec = normalizeProgramCommsConfig(cfg);
    return Boolean(rec.memberActive && isProgramCommsMemberReady(rec));
}

/**
 * @param {unknown} cfg
 */
export function toMemberCommsRoom(cfg) {
    const rec = normalizeProgramCommsConfig(cfg);
    return {
        programId: rec.programId,
        provider: rec.provider,
        inviteMessage: rec.inviteMessage,
        providerThumbUrl: rec.providerThumbUrl,
        iosStoreUrl: rec.iosStoreUrl,
        androidStoreUrl: rec.androidStoreUrl,
        iosThumbUrl: rec.iosThumbUrl,
        androidThumbUrl: rec.androidThumbUrl,
        iosQrUrl: rec.iosQrUrl,
        androidQrUrl: rec.androidQrUrl,
        groupGeneralName: rec.groupGeneralName,
        groupGeneralInviteUrl: rec.groupGeneralInviteUrl,
        groupGeneralQrUrl: rec.groupGeneralQrUrl,
        groupAnnounceName: rec.groupAnnounceName,
        groupAnnounceInviteUrl: rec.groupAnnounceInviteUrl,
        groupAnnounceQrUrl: rec.groupAnnounceQrUrl,
    };
}

/**
 * @param {unknown[]} configs
 * @param {Iterable<string>} [slotSecuredIds]
 */
export function filterMemberCommsRooms(configs, slotSecuredIds) {
    const secured = slotSecuredIds == null ? null : new Set([...slotSecuredIds].map((id) => String(id || '')));
    return (Array.isArray(configs) ? configs : [])
        .filter((cfg) => {
            const rec = normalizeProgramCommsConfig(cfg);
            if (!isMemberCommsRoomReady(rec)) return false;
            if (secured && !secured.has(rec.programId)) return false;
            return true;
        })
        .map(toMemberCommsRoom);
}

/**
 * Official Account add-friend URL from Basic ID (`@…`). Console notes only.
 * @param {string} basicId
 */
export function addFriendUrlFromBasicId(basicId) {
    const raw = String(basicId || '').trim();
    if (!raw) return '';
    const id = raw.startsWith('@') ? raw : `@${raw}`;
    return `https://line.me/R/ti/p/${id}`;
}

/**
 * Config is ready to email when both store QRs and both room QRs/URLs are hosted.
 * @param {unknown} cfg
 */
export function isProgramCommsInviteReady(cfg) {
    return isProgramCommsMemberReady(cfg);
}

/**
 * Same confirmed rule as Travel: slot secured, not withdrawn / pulled out.
 * @param {object[]} applicants
 * @param {string} programId
 */
export function confirmedApplicantsForComms(applicants, programId) {
    const pid = String(programId || '');
    return (Array.isArray(applicants) ? applicants : []).filter((row) => {
        if (String(row?.programId || '') !== pid) return false;
        const status = String(row?.status || '');
        return Boolean(row?.slotSecured) && status !== 'withdrawn' && status !== 'pulledOut';
    });
}

/**
 * @param {object | null | undefined} row
 */
export function applicantPublicEmail(row) {
    const email = String(row?.email || '').trim();
    return email.includes('@') ? email : '';
}

/**
 * @param {object[]} rows
 */
export function applicantsReadyToEmail(rows) {
    return (Array.isArray(rows) ? rows : []).filter((row) => applicantPublicEmail(row));
}

/**
 * @param {unknown} cfg
 * @returns {Map<string, string>}
 */
export function inviteSentAtMap(cfg) {
    const rec = normalizeProgramCommsConfig(cfg);
    return new Map(rec.inviteSentAtByApplicant);
}

/**
 * Motoko `Time.now()` is nanoseconds; test LS uses ISO.
 * @param {string} raw
 */
export function formatCommsInviteSentAt(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (/^\d+$/.test(s)) {
        const n = Number(s);
        const ms = n > 1e15 ? n / 1e6 : n > 1e12 ? n / 1e3 : n;
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) {
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }
    }
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return 'Sent';
}

/**
 * @param {string} [provider]
 */
export function providerAppLabel(provider) {
    const key = String(provider || 'line').trim().toLowerCase();
    if (key === 'whatsapp') return 'WhatsApp';
    if (key === 'slack') return 'Slack';
    return 'LINE';
}

/**
 * @param {string} [programName]
 */
export function buildProgramCommsInviteSubject(programName) {
    const name = String(programName || '').trim() || 'the program';
    return `The ${name} Official Chat Rooms`;
}

/**
 * @param {string} [programName]
 */
export function buildProgramCommsInvitePreview(programName) {
    const name = String(programName || '').trim() || 'the program';
    return `Download the app, then join both official ${name} chat rooms.`;
}

/**
 * In-body CTA — Fusion red or ink. Do not use layout `ctaSecondary` (sage green).
 * @param {string} label
 * @param {string} href
 * @param {string} [bg]
 */
function emailInBodyCta(label, href, bg = EMAIL_CTA_RED) {
    const text = String(label || '').trim();
    const url = String(href || '').trim();
    if (!text || !url) return '';
    return `<a href="${escapeHtmlForEmailLayout(url)}" style="display:inline-block;background:${escapeHtmlForEmailLayout(bg)};color:#ffffff;text-decoration:none;padding:12px 16px;font-size:12px;font-weight:800;letter-spacing:0.08em;">${escapeHtmlForEmailLayout(text)}</a>`;
}

/**
 * @param {{ src?: string, caption?: string, ctaLabel?: string, href?: string, ctaBg?: string }} left
 * @param {{ src?: string, caption?: string, ctaLabel?: string, href?: string, ctaBg?: string }} right
 */
function qrPairWithCtasHtml(left, right) {
    const cell = (slot) => {
        const src = String(slot?.src || '').trim();
        const caption = String(slot?.caption || '').trim();
        const cta = emailInBodyCta(slot?.ctaLabel, slot?.href, slot?.ctaBg || EMAIL_CTA_INK);
        if (!src && !cta) return '<td width="50%"></td>';
        const img = src
            ? `<img src="${escapeHtmlForEmailLayout(src)}" alt="${escapeHtmlForEmailLayout(caption)}" width="180" style="display:block;margin:0 auto 10px;width:180px;height:auto;border:0;" />`
            : '';
        const cap = caption
            ? `<p style="margin:0 0 10px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;color:#000000;">${escapeHtmlForEmailLayout(caption)}</p>`
            : '';
        return `<td align="center" valign="top" width="50%" style="padding:8px;">
${img}
${cap}
${cta}
</td>`;
    };
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
<tbody><tr>
${cell(left)}
${cell(right)}
</tr></tbody></table>`;
}

function emailStepHeading(label) {
    return `<p style="margin:8px 0 12px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:800;color:#000000;">${escapeHtmlForEmailLayout(label)}</p>`;
}

/**
 * @param {{
 *   programName?: string,
 *   heroImageUrl?: string,
 *   heroAlt?: string,
 *   provider?: string,
 *   iosStoreUrl?: string,
 *   androidStoreUrl?: string,
 *   iosQrUrl?: string,
 *   androidQrUrl?: string,
 *   groupGeneralName?: string,
 *   groupGeneralInviteUrl?: string,
 *   groupGeneralQrUrl?: string,
 *   groupAnnounceName?: string,
 *   groupAnnounceInviteUrl?: string,
 *   groupAnnounceQrUrl?: string,
 *   applicantName?: string,
 *   oaName?: string,
 * }} opts
 */
export function programCommsInviteSlots(opts = {}) {
    const programName = String(opts.programName || '').trim() || 'the program';
    const applicantName = String(opts.applicantName || '').trim();
    const providerLabel = providerAppLabel(opts.provider);
    const greeting = applicantName
        ? `Hi ${escapeHtmlForEmailLayout(applicantName)},`
        : 'Hello,';
    const generalName = String(opts.groupGeneralName || '').trim() || 'General';
    const announceName = String(opts.groupAnnounceName || '').trim() || 'Announcements';
    return {
        eyebrow: 'Program Comms',
        heroImageUrl: String(opts.heroImageUrl || '').trim(),
        heroAlt: String(opts.heroAlt || programName).trim(),
        pillLabel: 'COMMUNICATIONS',
        headlineHtml: `The ${escapeHtmlForEmailLayout(programName)}<br>Official Chat Rooms`,
        bodyHtml: [
            fusionEmailParagraph(greeting, 'lead'),
            fusionEmailParagraph(
                `${escapeHtmlForEmailLayout(programName)} is coming up quickly. Download the ${escapeHtmlForEmailLayout(providerLabel)} app, then join both official chat rooms.`,
            ),
            emailStepHeading('Step 1 — Download'),
            qrPairWithCtasHtml(
                {
                    src: opts.iosQrUrl,
                    caption: 'iOS',
                    ctaLabel: 'iOS',
                    href: opts.iosStoreUrl,
                    ctaBg: EMAIL_CTA_INK,
                },
                {
                    src: opts.androidQrUrl,
                    caption: 'Android',
                    ctaLabel: 'Android',
                    href: opts.androidStoreUrl,
                    ctaBg: EMAIL_CTA_INK,
                },
            ),
            emailStepHeading('Step 2 — Join both rooms'),
            qrPairWithCtasHtml(
                {
                    src: opts.groupGeneralQrUrl,
                    caption: generalName,
                    ctaLabel: `Join ${generalName}`,
                    href: opts.groupGeneralInviteUrl,
                    ctaBg: EMAIL_CTA_RED,
                },
                {
                    src: opts.groupAnnounceQrUrl,
                    caption: announceName,
                    ctaLabel: `Join ${announceName}`,
                    href: opts.groupAnnounceInviteUrl,
                    ctaBg: EMAIL_CTA_RED,
                },
            ),
        ].join('\n'),
        footnote: 'Questions? Reply to this email or write the Fusion team in the chat rooms.',
    };
}

/**
 * @param {Parameters<typeof programCommsInviteSlots>[0]} opts
 */
export function renderProgramCommsInviteHtml(opts = {}) {
    return renderFusionEmailFromSlots(programCommsInviteSlots(opts));
}

/**
 * Sample HTML for the Email studio template picker.
 */
export function sampleProgramCommsInviteHtml() {
    return renderProgramCommsInviteHtml({
        programName: 'Kaga City Artist Residency',
        heroImageUrl:
            'https://fusionart-bucket.s3.us-east-2.amazonaws.com/uploads/platform-assets/program_hero-1.jpg',
        heroAlt: 'Kaga City, Ishikawa',
        provider: 'line',
        iosStoreUrl: LINE_IOS_STORE_URL,
        androidStoreUrl: LINE_ANDROID_STORE_URL,
        iosQrUrl: 'https://fusionart.world/email/Fusion-X-logo-02.png',
        androidQrUrl: 'https://fusionart.world/email/Fusion-Logo-Sig-1.png',
        groupGeneralName: 'General',
        groupAnnounceName: 'Announcements',
        groupGeneralInviteUrl: 'https://line.me/R/ti/g/general',
        groupAnnounceInviteUrl: 'https://line.me/R/ti/g/announce',
        groupGeneralQrUrl: 'https://fusionart.world/email/Fusion-X-logo-02.png',
        groupAnnounceQrUrl: 'https://fusionart.world/email/Fusion-Logo-Sig-1.png',
        applicantName: 'Alex',
        oaName: 'Fusion',
    });
}

/**
 * Decode a PNG data URL without `fetch` (CSP connect-src does not allow `data:`).
 * @param {string} dataUrl
 * @param {string} [filename]
 * @returns {File}
 */
export function fileFromPngDataUrl(dataUrl, filename) {
    const match = String(dataUrl || '').match(/^data:([^;,]+);base64,(.+)$/i);
    if (!match) throw new Error('QR generation failed');
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename || 'qr.png', { type: match[1] || 'image/png' });
}

/**
 * @param {string} text
 * @param {string} filename
 * @returns {Promise<File>}
 */
export async function qrPngFileFromUrl(text, filename) {
    const value = String(text || '').trim();
    if (!value) throw new Error('QR text required');
    const mod = await import('qrcode');
    const QRCode = mod.default || mod;
    const dataUrl = await QRCode.toDataURL(value, {
        width: 512,
        margin: 1,
        errorCorrectionLevel: 'M',
        type: 'image/png',
    });
    return fileFromPngDataUrl(dataUrl, filename);
}

/**
 * @param {{
 *   applicants: object[],
 *   cfg: object,
 *   programName?: string,
 *   heroImageUrl?: string,
 * }} opts
 */
export function collectProgramCommsInviteMessages(opts) {
    const cfg = normalizeProgramCommsConfig(opts?.cfg);
    const programName = String(opts?.programName || '').trim();
    const heroImageUrl = String(opts?.heroImageUrl || '').trim();
    const subject = buildProgramCommsInviteSubject(programName);
    const ready = applicantsReadyToEmail(opts?.applicants || []);
    const skipped = (Array.isArray(opts?.applicants) ? opts.applicants : [])
        .filter((row) => !applicantPublicEmail(row))
        .map((row) => ({
            id: String(row?.id || ''),
            name: String(row?.fullName || row?.email || row?.id || ''),
            reason: 'no public email',
        }));
    const messages = ready.map((row) => ({
        to: applicantPublicEmail(row),
        subject,
        html: renderProgramCommsInviteHtml({
            programName,
            heroImageUrl,
            provider: cfg.provider,
            iosStoreUrl: cfg.iosStoreUrl,
            androidStoreUrl: cfg.androidStoreUrl,
            iosQrUrl: cfg.iosQrUrl,
            androidQrUrl: cfg.androidQrUrl,
            groupGeneralName: cfg.groupGeneralName,
            groupGeneralInviteUrl: cfg.groupGeneralInviteUrl,
            groupGeneralQrUrl: cfg.groupGeneralQrUrl,
            groupAnnounceName: cfg.groupAnnounceName,
            groupAnnounceInviteUrl: cfg.groupAnnounceInviteUrl,
            groupAnnounceQrUrl: cfg.groupAnnounceQrUrl,
            applicantName: String(row.fullName || '').trim(),
            oaName: cfg.oaName,
        }),
        applicantId: String(row.id || ''),
    }));
    return { messages, skipped, subject };
}

/**
 * @param {string} html
 */
export function isProgramCommsInviteHtml(html) {
    const text = String(html || '');
    return isFusionEmailLayout(text) && /COMMUNICATIONS/i.test(text) && /Official Chat Rooms/i.test(text);
}
