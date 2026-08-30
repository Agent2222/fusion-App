/**
 * Studio Comms — LINE invite helpers (QR URLs, confirmed-applicant gate, Fusion email HTML).
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
export const DEFAULT_MEMBER_COMMS_INVITE_MESSAGE =
    "You're confirmed. Scan the QR or open the link to join the program LINE group.";

export { lineLogoUrl as LINE_PROVIDER_THUMB_URL };

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
        addFriendUrl: '',
        groupName: '',
        groupInviteUrl: '',
        addFriendQrUrl: '',
        groupQrUrl: '',
        inviteSentAtByApplicant: [],
        memberActive: false,
        inviteMessage: '',
        providerThumbUrl: '',
        updatedAt: '',
    };
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
    const basicId = String(row.basicId ?? '').trim();
    const addFriendUrl = String(row.addFriendUrl ?? '').trim() || addFriendUrlFromBasicId(basicId);
    return {
        ...base,
        programId: String(row.programId ?? programId ?? '').trim() || base.programId,
        provider: String(row.provider ?? 'line').trim() || 'line',
        oaName: String(row.oaName ?? '').trim(),
        basicId,
        channelId: String(row.channelId ?? '').trim(),
        addFriendUrl,
        groupName: String(row.groupName ?? '').trim(),
        groupInviteUrl: String(row.groupInviteUrl ?? '').trim(),
        addFriendQrUrl: String(row.addFriendQrUrl ?? '').trim(),
        groupQrUrl: String(row.groupQrUrl ?? '').trim(),
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
 * Group join assets exist (member publish + Settings card).
 * @param {unknown} cfg
 */
export function isProgramCommsMemberReady(cfg) {
    const rec = normalizeProgramCommsConfig(cfg);
    return Boolean(rec.groupInviteUrl && rec.groupQrUrl && !rec.groupQrUrl.startsWith('data:'));
}

/**
 * Studio activate is on and the group QR/link are ready.
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
        groupName: rec.groupName,
        groupInviteUrl: rec.groupInviteUrl,
        groupQrUrl: rec.groupQrUrl,
        inviteMessage: rec.inviteMessage,
        providerThumbUrl: rec.providerThumbUrl,
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
 * Official Account add-friend URL from Basic ID (`@…`).
 * @param {string} basicId
 */
export function addFriendUrlFromBasicId(basicId) {
    const raw = String(basicId || '').trim();
    if (!raw) return '';
    const id = raw.startsWith('@') ? raw : `@${raw}`;
    return `https://line.me/R/ti/p/${id}`;
}

/**
 * Config is ready to email when both join URLs and hosted QR images exist.
 * @param {unknown} cfg
 */
export function isProgramCommsInviteReady(cfg) {
    const rec = normalizeProgramCommsConfig(cfg);
    return Boolean(
        rec.addFriendUrl &&
            rec.groupInviteUrl &&
            rec.addFriendQrUrl &&
            rec.groupQrUrl &&
            !rec.addFriendQrUrl.startsWith('data:') &&
            !rec.groupQrUrl.startsWith('data:'),
    );
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
 * @param {string} [programName]
 */
export function buildProgramCommsInviteSubject(programName) {
    const name = String(programName || '').trim() || 'the program';
    return `Join the ${name} LINE chat`;
}

/**
 * @param {string} [programName]
 */
export function buildProgramCommsInvitePreview(programName) {
    const name = String(programName || '').trim() || 'the program';
    return `Add Fusion on LINE and join the ${name} group.`;
}

function qrPairHtml(addFriendQrUrl, groupQrUrl) {
    const friend = String(addFriendQrUrl || '').trim();
    const group = String(groupQrUrl || '').trim();
    if (!friend && !group) return '';
    const cell = (src, caption) =>
        src
            ? `<td align="center" valign="top" width="50%" style="padding:8px;">
<img src="${escapeHtmlForEmailLayout(src)}" alt="${escapeHtmlForEmailLayout(caption)}" width="180" style="display:block;margin:0 auto 10px;width:180px;height:auto;border:0;" />
<p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;color:#000000;">${escapeHtmlForEmailLayout(caption)}</p>
</td>`
            : '<td width="50%"></td>';
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
<tbody><tr>
${cell(friend, 'Add Fusion')}
${cell(group, 'Join the group')}
</tr></tbody></table>`;
}

/**
 * @param {{
 *   programName?: string,
 *   heroImageUrl?: string,
 *   heroAlt?: string,
 *   addFriendUrl?: string,
 *   groupInviteUrl?: string,
 *   addFriendQrUrl?: string,
 *   groupQrUrl?: string,
 *   applicantName?: string,
 *   groupName?: string,
 *   oaName?: string,
 * }} opts
 */
export function programCommsInviteSlots(opts = {}) {
    const programName = String(opts.programName || '').trim() || 'the program';
    const applicantName = String(opts.applicantName || '').trim();
    const groupName = String(opts.groupName || '').trim();
    const oaName = String(opts.oaName || '').trim() || 'Fusion';
    const greeting = applicantName
        ? `Hi ${escapeHtmlForEmailLayout(applicantName)},`
        : 'Hello,';
    const room = groupName
        ? ` the ${escapeHtmlForEmailLayout(groupName)} LINE group`
        : ' the program LINE group';
    return {
        eyebrow: 'Program Comms',
        heroImageUrl: String(opts.heroImageUrl || '').trim(),
        heroAlt: String(opts.heroAlt || programName).trim(),
        pillLabel: 'LINE',
        headlineHtml: 'Join the<br>LINE chat',
        bodyHtml: [
            fusionEmailParagraph(greeting, 'lead'),
            fusionEmailParagraph(
                `You are confirmed for ${escapeHtmlForEmailLayout(programName)}. Add ${escapeHtmlForEmailLayout(oaName)} on LINE, then scan or tap to join${room}.`,
            ),
            qrPairHtml(opts.addFriendQrUrl, opts.groupQrUrl),
            fusionEmailParagraph(
                'Save both links. The Official Account is Fusion’s public LINE; the group is the shared program room.',
                'last',
            ),
        ].join('\n'),
        cta: {
            label: 'ADD FUSION ON LINE',
            href: String(opts.addFriendUrl || '').trim() || 'https://line.me',
        },
        ctaSecondary: {
            label: 'JOIN THE GROUP',
            href: String(opts.groupInviteUrl || '').trim() || 'https://line.me',
        },
        footnote: 'Questions? Reply to this email or write the Fusion team in LINE.',
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
        addFriendUrl: 'https://line.me/R/ti/p/@fusion',
        groupInviteUrl: 'https://line.me/R/ti/g/example',
        addFriendQrUrl: 'https://fusionart.world/email/Fusion-X-logo-02.png',
        groupQrUrl: 'https://fusionart.world/email/Fusion-Logo-Sig-1.png',
        applicantName: 'Alex',
        groupName: 'Kaga Fall 2026',
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
            addFriendUrl: cfg.addFriendUrl,
            groupInviteUrl: cfg.groupInviteUrl,
            addFriendQrUrl: cfg.addFriendQrUrl,
            groupQrUrl: cfg.groupQrUrl,
            applicantName: String(row.fullName || '').trim(),
            groupName: cfg.groupName,
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
    return isFusionEmailLayout(html) && /JOIN THE GROUP/i.test(String(html || ''));
}
