/**
 * Membership plan change options and display labels (PayPal-first; Stripe scaffold).
 */

/** @typedef {'monthly' | 'quarterly' | 'annual' | 'bimonthly'} MembershipTier */

export const MEMBERSHIP_TIER_META = Object.freeze({
    bimonthly: {
        label: 'Bi-monthly (legacy)',
        priceLine: '$50 every 2 months',
        entitlement: 'Legacy plan — consider upgrading to Monthly, Quarterly, or Annual.',
    },
    monthly: {
        label: 'Monthly membership',
        priceLine: '$30 per month',
        entitlement: 'Application fee $35 per submission.',
    },
    quarterly: {
        label: 'Quarterly membership',
        priceLine: '$75 per quarter',
        entitlement: 'One application credit per quarter; unused credits roll over.',
    },
    annual: {
        label: 'Annual membership',
        priceLine: '$260 per year',
        entitlement: 'Applications included while membership is active.',
    },
});

/**
 * @param {string} tier
 * @returns {MembershipTier | ''}
 */
export function normalizeMembershipTier(tier) {
    const t = String(tier || '')
        .trim()
        .toLowerCase();
    if (t === 'monthly' || t === 'quarterly' || t === 'annual' || t === 'bimonthly') return t;
    if (t === 'bi_monthly' || t === 'bi-monthly') return 'bimonthly';
    return '';
}

/**
 * Allowed change-plan targets for the current tier.
 * @param {string} currentTier
 * @returns {{ tier: MembershipTier, kind: 'upgrade' | 'downgrade' }[]}
 */
export function getChangePlanOptions(currentTier) {
    const cur = normalizeMembershipTier(currentTier);
    /** @type {{ tier: MembershipTier, kind: 'upgrade' | 'downgrade' }[]} */
    const out = [];
    if (cur === 'bimonthly') {
        out.push(
            { tier: 'monthly', kind: 'upgrade' },
            { tier: 'quarterly', kind: 'upgrade' },
            { tier: 'annual', kind: 'upgrade' },
        );
    } else if (cur === 'monthly') {
        out.push(
            { tier: 'quarterly', kind: 'upgrade' },
            { tier: 'annual', kind: 'upgrade' },
        );
    } else if (cur === 'quarterly') {
        out.push(
            { tier: 'annual', kind: 'upgrade' },
            { tier: 'monthly', kind: 'downgrade' },
        );
    } else if (cur === 'annual') {
        out.push(
            { tier: 'quarterly', kind: 'downgrade' },
            { tier: 'monthly', kind: 'downgrade' },
        );
    }
    return out;
}

/**
 * @param {string} planId
 * @param {{ planMonthly?: string, planQuarterly?: string, planAnnual?: string, planBimonthlyLegacy?: string, planBimonthly?: string }} config
 * @returns {MembershipTier | ''}
 */
export function membershipTierFromPlanId(planId, config) {
    const id = String(planId || '').trim();
    if (!id) return '';
    const c = config || {};
    if (id && id === String(c.planAnnual || '').trim()) return 'annual';
    if (id && id === String(c.planQuarterly || '').trim()) return 'quarterly';
    if (id && id === String(c.planMonthly || '').trim()) return 'monthly';
    const legacy = String(c.planBimonthlyLegacy || c.planBimonthly || '').trim();
    if (id && id === legacy) return 'bimonthly';
    return '';
}

/**
 * @param {string} tier
 * @param {{ planMonthly?: string, planQuarterly?: string, planAnnual?: string }} config
 */
export function planIdForTier(tier, config) {
    const t = normalizeMembershipTier(tier);
    const c = config || {};
    if (t === 'annual') return String(c.planAnnual || '').trim();
    if (t === 'quarterly') return String(c.planQuarterly || '').trim();
    if (t === 'monthly') return String(c.planMonthly || '').trim();
    return '';
}

/**
 * Start a membership plan change (PayPal revise now; Stripe scaffold).
 * @param {{ provider: string, principal: string, targetTier: string, subscriptionId?: string, returnUrl?: string, cancelUrl?: string, revisePayPal?: Function }} args
 * @returns {Promise<{ approveUrl?: string, pending?: boolean, message?: string }>}
 */
export async function startPlanChange(args) {
    const provider = String(args.provider || '').toLowerCase();
    const targetTier = normalizeMembershipTier(args.targetTier);
    if (!targetTier || targetTier === 'bimonthly') {
        throw new Error('Choose Monthly, Quarterly, or Annual.');
    }
    if (provider === 'stripe') {
        return {
            pending: false,
            message: 'Plan changes for Stripe billing are coming soon.',
        };
    }
    if (provider !== 'paypal') {
        throw new Error('Unable to change plan for this billing provider.');
    }
    const revise =
        typeof args.revisePayPal === 'function'
            ? args.revisePayPal
            : (await import('./integrationApi.js')).revisePayPalSubscription;
    const result = await revise({
        principal: String(args.principal || '').trim(),
        targetTier,
        subscriptionId: String(args.subscriptionId || '').trim() || undefined,
        returnUrl: String(args.returnUrl || '').trim() || undefined,
        cancelUrl: String(args.cancelUrl || '').trim() || undefined,
    });
    return {
        approveUrl: String(result.approveUrl || ''),
        pending: true,
        message: '',
    };
}
