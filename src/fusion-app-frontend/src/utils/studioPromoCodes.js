/**
 * Studio promo codes for 50% membership checkout (1 / 2 / 3 months).
 * Redeemed on /join-network?ref=CODE — not the 8-digit access-code path.
 * Dynamic-imports database.js so unit tests stay off the actor graph.
 */
import { getPublicSiteOrigin } from '../config.js';
import { isRadarPreviewActive } from './radarPreview.js';

export const PROMO_PERCENT_OFF = 50;

export const PROMO_DURATION_OPTIONS = [
    { months: 1, label: '50% off first month' },
    { months: 2, label: '50% off first 2 months' },
    { months: 3, label: '50% off first 3 months' },
];

/** @type {object[] | null} */
let previewPromoCodes = null;

/**
 * @param {unknown} months
 */
export function clampPromoDurationMonths(months) {
    const n = Number(months);
    if (n >= 3) return 3;
    if (n >= 2) return 2;
    return 1;
}

/**
 * @param {unknown} months
 */
export function promoDurationLabel(months) {
    const n = clampPromoDurationMonths(months);
    const hit = PROMO_DURATION_OPTIONS.find((o) => o.months === n);
    return hit?.label || '50% off first month';
}

/**
 * @param {unknown} months
 * @param {string} [id]
 */
export function durationSelectHtml(months = 1, id = 'studioPromoDuration') {
    const selected = clampPromoDurationMonths(months);
    const opts = PROMO_DURATION_OPTIONS.map(
        (o) =>
            `<option value="${o.months}"${o.months === selected ? ' selected' : ''}>${escapeHtml(o.label)}</option>`,
    ).join('');
    return `<select id="${escapeHtml(id)}" class="studio-select" required>${opts}</select>`;
}

/**
 * @param {string} [code]
 */
export function joinUrlForPromoCode(code) {
    const origin = String(getPublicSiteOrigin() || 'https://fusionart.world').replace(/\/$/, '');
    const trimmed = String(code || '').trim();
    if (!trimmed || trimmed.includes('{')) return `${origin}/join-network`;
    return `${origin}/join-network?ref=${encodeURIComponent(trimmed.toUpperCase())}`;
}

/**
 * @param {string} html
 * @param {{ code?: string, durationMonths?: number, joinUrl?: string, label?: string }} vars
 */
export function interpolateRadarDiscountHtml(html, vars = {}) {
    const rawCode = String(vars.code || '').trim();
    const placeholder = !rawCode || rawCode.includes('{');
    const code = placeholder ? '{{DISCOUNT_CODE}}' : rawCode;
    const label = String(vars.label || promoDurationLabel(vars.durationMonths));
    const joinUrl = placeholder
        ? '{{JOIN_URL}}'
        : String(vars.joinUrl || joinUrlForPromoCode(code));
    return String(html || '')
        .replaceAll('{{DISCOUNT_CODE}}', placeholder ? '{{DISCOUNT_CODE}}' : escapeHtml(code))
        .replaceAll('{{DISCOUNT_LABEL}}', escapeHtml(label))
        .replaceAll('{{JOIN_URL}}', placeholder ? '{{JOIN_URL}}' : escapeHtml(joinUrl));
}

/**
 * @param {unknown} raw
 */
export function normalizeStudioPromoCode(raw) {
    const row = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
    const maxRaw = row.maxRedemptions;
    let maxRedemptions = null;
    if (maxRaw != null && maxRaw !== '') {
        const n = Number(Array.isArray(maxRaw) ? maxRaw[0] : maxRaw);
        if (Number.isFinite(n) && n >= 0) maxRedemptions = n;
    }
    const tag = row.campaignTag;
    const campaignTag = Array.isArray(tag) ? String(tag[0] || '') : String(tag || '');
    const expires = row.expiresAt;
    const expiresAt = Array.isArray(expires) ? String(expires[0] || '') : String(expires || '');
    return {
        code: String(row.code || '').trim().toUpperCase(),
        codeType: typeof row.codeType === 'string' ? row.codeType : 'promo',
        discountDurationMonths: clampPromoDurationMonths(row.discountDurationMonths),
        maxRedemptions,
        currentRedemptions: Number(row.currentRedemptions) || 0,
        active: row.active !== false,
        campaignTag,
        createdAt: String(row.createdAt || ''),
        expiresAt,
        partnerLabel: String(row.partnerLabel || ''),
    };
}

/**
 * @param {{ maxRedemptions?: number | null, currentRedemptions?: number }} pc
 */
export function remainingPromoQuantity(pc) {
    const max = pc?.maxRedemptions;
    const current = Number(pc?.currentRedemptions) || 0;
    if (max == null || max === '') return Number.POSITIVE_INFINITY;
    const n = Number(max);
    if (!Number.isFinite(n)) return Number.POSITIVE_INFINITY;
    return Math.max(0, n - current);
}

/**
 * @param {{ campaignTag?: string, code?: string }} pc
 */
export function isRadarPromoCode(pc) {
    const tag = String(pc?.campaignTag || '').toLowerCase();
    return tag.startsWith('radar');
}

/**
 * Empty string means the send may proceed.
 * @param {ReturnType<typeof normalizeStudioPromoCode> | null | undefined} pc
 * @param {number} recipientCount
 */
export function campaignSendBlockedReason(pc, recipientCount) {
    if (!pc || !pc.code) return 'Pick a campaign promo code before sending.';
    if (pc.active === false) return `${pc.code} is retired.`;
    const remaining = remainingPromoQuantity(pc);
    const n = Math.max(0, Number(recipientCount) || 0);
    if (Number.isFinite(remaining) && remaining < n) {
        const uses = remaining === 1 ? 'use' : 'uses';
        return `${pc.code} has ${remaining} remaining ${uses}; you selected ${n}.`;
    }
    return '';
}

/**
 * @param {unknown[]} rows
 */
export function hydrateRadarPromoPreview(rows) {
    previewPromoCodes = Array.isArray(rows) ? rows.map((r) => normalizeStudioPromoCode(r)) : [];
    return previewPromoCodes;
}

export function resetRadarPromoPreview() {
    previewPromoCodes = null;
}

function previewStoreActive() {
    return isRadarPreviewActive() && previewPromoCodes != null;
}

/**
 * @returns {Promise<ReturnType<typeof normalizeStudioPromoCode>[]>}
 */
export async function listStudioPromoCodes() {
    if (previewStoreActive()) return previewPromoCodes.map((r) => ({ ...r }));
    const { staffListPromoCodesStudio } = await import('./database.js');
    const rows = await staffListPromoCodesStudio();
    return (Array.isArray(rows) ? rows : []).map((r) => normalizeStudioPromoCode(r));
}

/**
 * @param {{
 *   code: string,
 *   durationMonths?: number,
 *   maxRedemptions?: number | null,
 *   campaignTag?: string,
 *   expiresAt?: string | null,
 *   partnerLabel?: string | null,
 * }} opts
 */
export async function createStudioPromoCode(opts) {
    const code = String(opts.code || '')
        .trim()
        .toUpperCase();
    if (!code) throw new Error('Code is required.');
    const durationMonths = clampPromoDurationMonths(opts.durationMonths);
    const max =
        opts.maxRedemptions == null || opts.maxRedemptions === ''
            ? null
            : Math.max(1, Math.round(Number(opts.maxRedemptions)));
    const campaignTag = String(opts.campaignTag || '').trim() || null;
    const expiresAt = String(opts.expiresAt || '').trim() || null;
    const partnerLabel = String(opts.partnerLabel || '').trim() || null;

    if (previewStoreActive()) {
        if (previewPromoCodes.some((p) => p.code === code)) {
            throw new Error('Code already exists');
        }
        const row = normalizeStudioPromoCode({
            code,
            codeType: 'promo',
            discountDurationMonths: durationMonths,
            maxRedemptions: max,
            currentRedemptions: 0,
            active: true,
            campaignTag: campaignTag || '',
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt || '',
            partnerLabel: partnerLabel || '',
        });
        previewPromoCodes = [...previewPromoCodes, row];
        return row;
    }

    const { adminCreatePromoCodeStudio } = await import('./database.js');
    await adminCreatePromoCodeStudio({
        code,
        codeType: { promo: null },
        discountType: { percentOff: PROMO_PERCENT_OFF },
        discountDurationMonths: durationMonths,
        maxRedemptions: max,
        expiresAt,
        partnerLabel,
        campaignTag,
    });
    return normalizeStudioPromoCode({
        code,
        codeType: 'promo',
        discountDurationMonths: durationMonths,
        maxRedemptions: max,
        currentRedemptions: 0,
        active: true,
        campaignTag: campaignTag || '',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt || '',
        partnerLabel: partnerLabel || '',
    });
}

/**
 * @param {string} code
 * @param {boolean} active
 */
export async function setStudioPromoCodeActive(code, active) {
    const norm = String(code || '').trim().toUpperCase();
    if (!norm) return false;
    if (previewStoreActive()) {
        const idx = previewPromoCodes.findIndex((p) => p.code === norm);
        if (idx < 0) return false;
        previewPromoCodes = previewPromoCodes.map((p, i) =>
            i === idx ? { ...p, active: Boolean(active) } : p,
        );
        return true;
    }
    const { staffSetPromoCodeActiveStudio } = await import('./database.js');
    return Boolean(await staffSetPromoCodeActiveStudio(norm, Boolean(active)));
}

const RADAR_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomRadarIndividualCode() {
    let suffix = '';
    for (let i = 0; i < 4; i += 1) {
        suffix += RADAR_CODE_CHARS[Math.floor(Math.random() * RADAR_CODE_CHARS.length)];
    }
    return `RADAR-${suffix}`;
}

/**
 * Single-use Radar invite code (maxRedemptions = 1).
 * @param {number} [durationMonths]
 * @param {{ create?: typeof createStudioPromoCode }} [deps]
 */
export async function mintRadarIndividualPromo(durationMonths = 1, deps = {}) {
    const create = typeof deps.create === 'function' ? deps.create : createStudioPromoCode;
    let lastErr = new Error('Could not mint a unique code.');
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const code = randomRadarIndividualCode();
        try {
            return await create({
                code,
                durationMonths,
                maxRedemptions: 1,
                campaignTag: 'radar-individual',
            });
        } catch (err) {
            lastErr = err instanceof Error ? err : new Error(String(err));
            if (!/already exists/i.test(lastErr.message)) throw lastErr;
        }
    }
    throw lastErr;
}

/**
 * Reuse a lead's existing invite code, or mint a single-use RADAR-XXXX.
 * Test and Approve & send share this so the preview inbox gets a real code.
 * @param {{ existingCode?: string, codeMode?: string, durationMonths?: number }} [opts]
 * @param {{ create?: typeof createStudioPromoCode, mint?: typeof mintRadarIndividualPromo }} [deps]
 */
export async function resolveRadarOutreachInviteCode(opts = {}, deps = {}) {
    const existing = String(opts.existingCode || '').trim();
    const mode = String(opts.codeMode || '').trim();
    if (mode === 'reuse' && existing) {
        return { code: existing, minted: false };
    }
    const mint = typeof deps.mint === 'function' ? deps.mint : mintRadarIndividualPromo;
    const minted = await mint(opts.durationMonths, deps);
    const code = String(minted?.code || '').trim();
    if (!code) throw new Error('Could not mint an invite code.');
    return { code, minted: true, promo: minted };
}

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
