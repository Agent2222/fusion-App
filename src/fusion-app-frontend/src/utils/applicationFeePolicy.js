/** Application fee amounts and quarterly credit accrual (mirrors Motoko rules). */

export const APPLICATION_FEE_GUEST_CENTS = 5000;
export const APPLICATION_FEE_MEMBER_CENTS = 3500;

/**
 * Temporary: active memberships (monthly / quarterly / annual / legacy) may submit
 * applications with no per-application fee until the credit system is finished.
 * Guests still pay the guest fee. Flip to `false` when credits ship.
 */
export const TEMP_WAIVE_MEMBER_APPLICATION_FEES = true;

/** @typedef {'monthly' | 'quarterly' | 'annual' | 'bimonthly' | ''} MembershipTier */

/**
 * @param {Date} [date]
 * @returns {string} `YYYY-Qn`
 */
export function calendarQuarterKey(date = new Date()) {
    const y = date.getUTCFullYear();
    const q = Math.floor(date.getUTCMonth() / 3) + 1;
    return `${y}-Q${q}`;
}

/**
 * @param {string} key
 * @returns {number | null} absolute quarter index
 */
export function quarterKeyToIndex(key) {
    const m = /^(\d{4})-Q([1-4])$/.exec(String(key || '').trim());
    if (!m) return null;
    const year = Number(m[1]);
    const q = Number(m[2]);
    return year * 4 + (q - 1);
}

/**
 * @param {number} index
 * @returns {string}
 */
export function quarterIndexToKey(index) {
    const i = Math.max(0, Math.floor(index));
    const year = Math.floor(i / 4);
    const q = (i % 4) + 1;
    return `${year}-Q${q}`;
}

/**
 * Pure accrual catch-up (max 40 quarters).
 * @param {{ balance: number, lastAccrued: string, currentKey: string, tier: string, membershipActive: boolean }} args
 */
export function accrueQuarterlyCreditsState(args) {
    const tier = String(args.tier || '').toLowerCase();
    const membershipActive = Boolean(args.membershipActive);
    let balance = Math.max(0, Math.round(Number(args.balance) || 0));
    let lastAccrued = String(args.lastAccrued || '').trim();
    const currentKey = String(args.currentKey || '').trim() || calendarQuarterKey();

    if (tier !== 'quarterly' || !membershipActive) {
        return { balance, lastAccrued, granted: 0 };
    }

    const currentIdx = quarterKeyToIndex(currentKey);
    if (currentIdx == null) return { balance, lastAccrued, granted: 0 };

    if (!lastAccrued) {
        return { balance: balance + 1, lastAccrued: currentKey, granted: 1 };
    }

    const lastIdx = quarterKeyToIndex(lastAccrued);
    if (lastIdx == null) {
        return { balance: balance + 1, lastAccrued: currentKey, granted: 1 };
    }
    if (lastIdx >= currentIdx) {
        return { balance, lastAccrued, granted: 0 };
    }

    const gap = Math.min(40, currentIdx - lastIdx);
    return {
        balance: balance + gap,
        lastAccrued: currentKey,
        granted: gap,
    };
}

/**
 * @param {{
 *   membershipAccess: 'ok' | 'exempt' | 'needsSubscription' | 'noAccount' | string,
 *   tier: MembershipTier | string,
 *   appCreditBalance?: number,
 *   lastAccrued?: string,
 *   currentQuarterKey?: string,
 * }} args
 */
export function computeApplicationFeeDue(args) {
    const access = String(args.membershipAccess || '').toLowerCase();
    if (access === 'exempt') {
        return {
            dueCents: 0,
            reason: 'exempt',
            membershipTier: String(args.tier || ''),
            appCreditBalance: Math.max(0, Math.round(Number(args.appCreditBalance) || 0)),
        };
    }
    if (access !== 'ok') {
        return {
            dueCents: APPLICATION_FEE_GUEST_CENTS,
            reason: 'application_only',
            membershipTier: '',
            appCreditBalance: 0,
        };
    }

    const tier = String(args.tier || '').toLowerCase();
    const accrued = accrueQuarterlyCreditsState({
        balance: Number(args.appCreditBalance) || 0,
        lastAccrued: String(args.lastAccrued || ''),
        currentKey: args.currentQuarterKey || calendarQuarterKey(),
        tier,
        membershipActive: true,
    });
    const membershipTier = tier || 'monthly';

    // TEMP: all active members submit free until credits are complete.
    if (TEMP_WAIVE_MEMBER_APPLICATION_FEES) {
        return {
            dueCents: 0,
            reason: 'membership_temp',
            membershipTier,
            appCreditBalance: accrued.balance,
        };
    }

    if (tier === 'annual') {
        return {
            dueCents: 0,
            reason: 'annual',
            membershipTier: 'annual',
            appCreditBalance: accrued.balance,
        };
    }
    if (tier === 'quarterly') {
        if (accrued.balance >= 1) {
            return {
                dueCents: 0,
                reason: 'credit',
                membershipTier: 'quarterly',
                appCreditBalance: accrued.balance,
            };
        }
        return {
            dueCents: APPLICATION_FEE_MEMBER_CENTS,
            reason: 'member_fee',
            membershipTier: 'quarterly',
            appCreditBalance: 0,
        };
    }
    // monthly, bimonthly (legacy), unknown active → $35
    return {
        dueCents: APPLICATION_FEE_MEMBER_CENTS,
        reason: 'member_fee',
        membershipTier,
        appCreditBalance: accrued.balance,
    };
}
