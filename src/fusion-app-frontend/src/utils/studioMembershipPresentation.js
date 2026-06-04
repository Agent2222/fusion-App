/**
 * Shared membership labels, filters, and badges for Studio Users + Finance.
 */
import { formatStudioDate } from './studioDateFormat.js';

/** @param {string | undefined} st */
export function studioMembershipStatusLabel(st) {
    const s = String(st || '').toLowerCase();
    if (!s) return 'No subscription';
    const map = {
        active: 'Active',
        trialing: 'Trialing',
        past_due: 'Past due',
        canceled: 'Canceled',
        unpaid: 'Unpaid',
        incomplete: 'Incomplete',
        incomplete_expired: 'Incomplete (expired)',
        paused: 'Paused',
    };
    return map[s] || String(st);
}

/**
 * @param {{ trialEndsAtSec?: string | number }} row
 * @returns {'active' | 'expired' | 'none'}
 */
export function studioTrialState(row) {
    const raw = row?.trialEndsAtSec;
    const endsAtSec = Number(raw);
    if (!Number.isFinite(endsAtSec) || endsAtSec <= 0) return 'none';
    const nowSec = Date.now() / 1000;
    return nowSec <= endsAtSec ? 'active' : 'expired';
}

/** @param {{ membershipExemptManual?: boolean, stripeSubscriptionStatus?: string }} row */
export function studioMembershipDotClass(row) {
    if (row.membershipExemptManual) return 'studio-user-sub-dot--ok';
    const trialState = studioTrialState(row);
    if (trialState === 'active') return 'studio-user-sub-dot--ok';
    const s = String(row.stripeSubscriptionStatus || '').toLowerCase();
    if (s === 'active' || s === 'trialing') return 'studio-user-sub-dot--ok';
    return 'studio-user-sub-dot--err';
}

/**
 * @param {unknown} row
 * @returns {'ok' | 'warn' | 'muted'}
 */
export function studioMembershipBadgeVariant(row) {
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    if (r.membershipExemptManual) return 'muted';
    if (studioTrialState(row) === 'active') return 'ok';
    const s = String(r.stripeSubscriptionStatus || '').toLowerCase();
    if (s === 'active' || s === 'trialing') return 'ok';
    if (s === 'past_due' || s === 'unpaid') return 'warn';
    return 'muted';
}

/**
 * @param {unknown} row
 * @param {(s: string) => string} [escapeHtml]
 */
export function studioMembershipBadgeHtml(row, escapeHtml = (s) => String(s)) {
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    const variant = studioMembershipBadgeVariant(row);
    const label = r.membershipExemptManual
        ? 'Exempt (manual)'
        : studioMembershipStatusLabel(String(r.stripeSubscriptionStatus || ''));
    return `<span class="mpd-membership-badge mpd-membership-badge--${variant}"><span class="mpd-membership-badge__icon" aria-hidden="true"></span><span class="mpd-membership-badge__text"><strong>${escapeHtml(label)}</strong></span></span>`;
}

/**
 * @param {unknown} row
 * @param {string} wantMembership
 */
export function studioMembershipFilterMatch(row, wantMembership) {
    const want = String(wantMembership || '').trim();
    if (!want) return true;
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    if (want === 'exempt') return Boolean(r.membershipExemptManual);
    const trial = studioTrialState(row);
    if (want === 'trial_active') return trial === 'active';
    if (want === 'trial_expired') return trial === 'expired';
    const stripeStatus = String(r.stripeSubscriptionStatus || '').toLowerCase();
    if (want === 'active') return !r.membershipExemptManual && stripeStatus === 'active';
    if (want === 'trialing') return !r.membershipExemptManual && stripeStatus === 'trialing';
    if (want === 'past_due') return !r.membershipExemptManual && stripeStatus === 'past_due';
    if (want === 'canceled') return !r.membershipExemptManual && stripeStatus === 'canceled';
    if (want === 'none') {
        if (r.membershipExemptManual) return false;
        if (trial !== 'none') return false;
        return !stripeStatus;
    }
    return true;
}

/** @param {string | undefined} iso */
export function formatSubscriptionPeriodEnd(iso) {
    return formatStudioDate(iso);
}

/**
 * @param {string | undefined} customerId
 * @param {string | undefined} publishableKey
 */
export function studioStripeDashboardCustomerUrl(customerId, publishableKey) {
    const cid = String(customerId || '').trim();
    if (!cid.startsWith('cus_')) return '';
    const pk = String(publishableKey || '');
    const isTest = pk.startsWith('pk_test_');
    const base = isTest ? 'https://dashboard.stripe.com/test' : 'https://dashboard.stripe.com';
    return `${base}/customers/${encodeURIComponent(cid)}`;
}

/**
 * @param {unknown[]} rows
 */
export function countMembershipMetrics(rows) {
    const list = Array.isArray(rows) ? rows : [];
    let active = 0;
    let pastDue = 0;
    let exempt = 0;
    let none = 0;
    for (const row of list) {
        if (studioMembershipFilterMatch(row, 'exempt')) exempt += 1;
        else if (studioMembershipFilterMatch(row, 'active') || studioMembershipFilterMatch(row, 'trialing')) active += 1;
        else if (studioMembershipFilterMatch(row, 'past_due')) pastDue += 1;
        else if (studioMembershipFilterMatch(row, 'none')) none += 1;
    }
    return { active, pastDue, exempt, none, total: list.length };
}
