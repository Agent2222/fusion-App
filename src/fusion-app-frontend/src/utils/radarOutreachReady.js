/**
 * Pure Radar outreach send gates (no canister / Integration API).
 */
import { wrapEmailHtml } from './emailCampaignTemplates.js';
import { isFusionEmailLayout } from './emailFusionLayout.js';
import {
    interpolateRadarDiscountHtml,
    joinUrlForPromoCode,
} from './studioPromoCodes.js';

export const RADAR_OUTREACH_BATCH_CAP = 100;
export const RADAR_OUTREACH_TEST_TO = 'info@fusionart.world';
export const RADAR_OUTREACH_TEST_CODE = 'TEST-PREVIEW';

/**
 * @param {unknown} outreach
 * @param {{ publicEmail?: string } | null | undefined} lead
 */
export function isRadarOutreachReadyToSend(outreach, lead) {
    const status = String(outreach?.status || '');
    if (status !== 'approved') return false;
    const email = String(lead?.publicEmail || '').trim();
    if (!email.includes('@')) return false;
    const subject = String(outreach?.subject || '').trim();
    const body = String(outreach?.bodyHtml || '').trim();
    return Boolean(subject && body);
}

/**
 * @param {string} body
 */
export function wrapRadarOutreachHtml(body) {
    const raw = String(body || '').trim();
    if (!raw) return '';
    if (isFusionEmailLayout(raw)) return raw;
    if (/Fusion Art World/i.test(raw) && /max-width:600px/i.test(raw)) return raw;
    if (/<[a-z][\s\S]*>/i.test(raw)) return wrapEmailHtml(raw, { includeSignature: true });
    return wrapEmailHtml(raw.replace(/\n/g, '<br/>'), { includeSignature: true });
}

/**
 * Build a Radar outreach test message for info@fusionart.world.
 * Does not mark the lead contacted. Pass a real minted/reused code;
 * TEST-PREVIEW is only a last-resort fallback for callers that omit one.
 * @param {{ subject?: string, body?: string, durationMonths?: number, code?: string }} [opts]
 */
export function buildRadarOutreachTestEmail(opts = {}) {
    const subject = String(opts.subject || '').trim();
    const body = String(opts.body || '').trim();
    if (!subject) throw new Error('Subject required.');
    if (!body) throw new Error('Body required.');
    const code = String(opts.code || '').trim() || RADAR_OUTREACH_TEST_CODE;
    const interpolated = interpolateRadarDiscountHtml(body, {
        code,
        durationMonths: opts.durationMonths,
        joinUrl: joinUrlForPromoCode(code),
    });
    const tagged = /^\[TEST\]/i.test(subject) ? subject : `[TEST] ${subject}`;
    return {
        to: RADAR_OUTREACH_TEST_TO,
        subject: tagged,
        html: wrapRadarOutreachHtml(interpolated),
        code,
    };
}
