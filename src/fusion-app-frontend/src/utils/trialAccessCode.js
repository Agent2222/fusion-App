/**
 * 8-digit trial join invites (3-month window + application credit).
 * Redeemed on /join-network?code=XXXXXXXX — not the 50% promo ?ref= path.
 */
import { getPublicSiteOrigin } from '../config.js';

export const TRIAL_ACCESS_CODE_MONTHS = 3;
export const TRIAL_ACCESS_CODE_CREDITS = 1;
export const DRAW_GOAL_NOT_REACHED_TEMPLATE_ID = 'tpl_draw_goal_not_reached';

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeTrialAccessCode(raw) {
    return String(raw || '')
        .replace(/\D/g, '')
        .slice(0, 8);
}

/**
 * @param {string} [code]
 */
export function joinUrlForTrialAccessCode(code) {
    const origin = String(getPublicSiteOrigin() || 'https://fusionart.world').replace(/\/$/, '');
    const digits = normalizeTrialAccessCode(code);
    if (digits.length !== 8) return `${origin}/join-network`;
    return `${origin}/join-network?code=${encodeURIComponent(digits)}`;
}

/**
 * Read an 8-digit access code from /join-network query (`code` or `access`).
 * @param {string} [search]
 */
export function trialAccessCodeFromSearch(search) {
    const raw = String(search || (typeof window !== 'undefined' ? window.location.search : '') || '');
    try {
        const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
        const fromCode = normalizeTrialAccessCode(params.get('code') || params.get('access') || '');
        return fromCode.length === 8 ? fromCode : '';
    } catch {
        return '';
    }
}

/**
 * @param {string} html
 */
export function htmlNeedsTrialAccessPlaceholders(html) {
    const s = String(html || '');
    return s.includes('{{TRIAL_ACCESS_CODE}}') || s.includes('{{TRIAL_JOIN_URL}}');
}

/**
 * @param {string} [templateId]
 * @param {string} [html]
 */
export function campaignNeedsPerRecipientTrialCodes(templateId, html) {
    if (String(templateId || '').trim() === DRAW_GOAL_NOT_REACHED_TEMPLATE_ID) return true;
    return htmlNeedsTrialAccessPlaceholders(html);
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {string} html
 * @param {{ code?: string, joinUrl?: string }} vars
 */
export function interpolateTrialAccessHtml(html, vars = {}) {
    const rawCode = normalizeTrialAccessCode(vars.code);
    const placeholder = rawCode.length !== 8;
    const code = placeholder ? '{{TRIAL_ACCESS_CODE}}' : rawCode;
    const joinUrl = placeholder
        ? '{{TRIAL_JOIN_URL}}'
        : String(vars.joinUrl || joinUrlForTrialAccessCode(code));
    return String(html || '')
        .replaceAll('{{TRIAL_ACCESS_CODE}}', placeholder ? '{{TRIAL_ACCESS_CODE}}' : escapeHtml(code))
        .replaceAll('{{TRIAL_JOIN_URL}}', placeholder ? '{{TRIAL_JOIN_URL}}' : escapeHtml(joinUrl));
}
