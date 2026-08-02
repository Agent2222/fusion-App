/**
 * Shared membership labels, filters, and badges for Studio Users + Finance.
 */
import { formatStudioDate } from './studioDateFormat.js';
import { MEMBERSHIP_TIER_META, normalizeMembershipTier } from './membershipPlanChange.js';

/**
 * @param {string | undefined} st
 * @returns {boolean}
 */
export function studioMembershipStatusIsPaid(st) {
    const s = String(st || '').toLowerCase();
    return s === 'active' || s === 'trialing' || s === 'approved';
}

/** @param {string | undefined} st */
export function studioMembershipStatusLabel(st) {
    const s = String(st || '').toLowerCase();
    if (!s) return 'No subscription';
    const map = {
        active: 'Active',
        approved: 'Active',
        trialing: 'Trialing',
        past_due: 'Past due',
        canceled: 'Canceled',
        cancelled: 'Canceled',
        unpaid: 'Unpaid',
        incomplete: 'Incomplete',
        incomplete_expired: 'Incomplete (expired)',
        paused: 'Paused',
        suspended: 'Suspended',
    };
    return map[s] || String(st);
}

/**
 * Short plan name for table / manage summary (Monthly, Quarterly, …).
 * @param {string | undefined} tier
 */
export function studioMembershipTierShortLabel(tier) {
    const t = normalizeMembershipTier(tier);
    if (!t) return '';
    if (t === 'monthly') return 'Monthly';
    if (t === 'quarterly') return 'Quarterly';
    if (t === 'annual') return 'Annual';
    if (t === 'bimonthly') return 'Bi-monthly';
    const meta = MEMBERSHIP_TIER_META[t];
    return meta?.label || t;
}

/**
 * Prefer PayPal status when that provider is active, else Stripe.
 * @param {unknown} row
 * @returns {string}
 */
export function studioEffectiveMembershipStatus(row) {
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    const paypalId = String(r.paypalSubscriptionId || '').trim();
    const provider = String(r.paymentProvider || '').toLowerCase();
    const paypalStatus = String(r.paypalSubscriptionStatus || '').trim();
    const stripeStatus = String(r.stripeSubscriptionStatus || '').trim();
    if ((provider === 'paypal' || paypalId) && paypalStatus) return paypalStatus;
    if (paypalStatus && !stripeStatus) return paypalStatus;
    return stripeStatus;
}

/**
 * Users table / manage summary: "Active · Quarterly" when tier is known.
 * @param {unknown} row
 */
export function studioMembershipCellLabel(row) {
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    if (r.membershipExemptManual) return 'Exempt (manual)';
    const statusLabel = studioMembershipStatusLabel(studioEffectiveMembershipStatus(row));
    const tierLabel = studioMembershipTierShortLabel(
        String(r.membershipTier || r.tier || ''),
    );
    if (statusLabel === 'No subscription') return statusLabel;
    if (tierLabel) return `${statusLabel} · ${tierLabel}`;
    return statusLabel;
}

/**
 * Billing provider for Studio display.
 * @param {unknown} row
 * @returns {'paypal' | 'stripe' | ''}
 */
export function studioMembershipProvider(row) {
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    const provider = String(r.paymentProvider || '').toLowerCase();
    if (provider === 'paypal' || provider === 'stripe') return provider;
    if (String(r.paypalSubscriptionId || '').trim()) return 'paypal';
    if (String(r.stripeSubscriptionId || '').trim()) return 'stripe';
    return '';
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

/** @param {{ membershipExemptManual?: boolean, stripeSubscriptionStatus?: string, paypalSubscriptionStatus?: string, paypalSubscriptionId?: string, paymentProvider?: string }} row */
export function studioMembershipDotClass(row) {
    if (row.membershipExemptManual) return 'studio-user-sub-dot--ok';
    const trialState = studioTrialState(row);
    if (trialState === 'active') return 'studio-user-sub-dot--ok';
    if (studioMembershipStatusIsPaid(studioEffectiveMembershipStatus(row))) {
        return 'studio-user-sub-dot--ok';
    }
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
    const s = studioEffectiveMembershipStatus(row).toLowerCase();
    if (studioMembershipStatusIsPaid(s)) return 'ok';
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
        : studioMembershipCellLabel(row);
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
    const status = studioEffectiveMembershipStatus(row).toLowerCase();
    if (want === 'active') {
        return (
            !r.membershipExemptManual &&
            (status === 'active' || status === 'approved')
        );
    }
    if (want === 'trialing') return !r.membershipExemptManual && status === 'trialing';
    if (want === 'past_due') return !r.membershipExemptManual && status === 'past_due';
    if (want === 'canceled') {
        return (
            !r.membershipExemptManual &&
            (status === 'canceled' || status === 'cancelled')
        );
    }
    if (want === 'none') {
        if (r.membershipExemptManual) return false;
        if (trial !== 'none') return false;
        return !status;
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
        else if (studioMembershipFilterMatch(row, 'active') || studioMembershipFilterMatch(row, 'trialing'))
            active += 1;
        else if (studioMembershipFilterMatch(row, 'past_due')) pastDue += 1;
        else if (studioMembershipFilterMatch(row, 'none')) none += 1;
    }
    return { active, pastDue, exempt, none, total: list.length };
}
