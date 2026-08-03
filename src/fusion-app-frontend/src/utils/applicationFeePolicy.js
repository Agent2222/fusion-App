/** Application fee amounts and application credit accrual (mirrors Motoko rules). */

export const APPLICATION_FEE_GUEST_CENTS = 5000;
export const APPLICATION_FEE_MEMBER_CENTS = 3500;
export const ANNUAL_APP_CREDITS_PER_YEAR = 4;

/**
 * Must match Motoko `TEMP_WAIVE_MEMBER_APPLICATION_FEES`. Live credits use `false`.
 */
export const TEMP_WAIVE_MEMBER_APPLICATION_FEES = false;

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
 * @param {Date} [date]
 * @returns {string} `YYYY`
 */
export function calendarYearKey(date = new Date()) {
    return String(date.getUTCFullYear());
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
 * Pure accrual catch-up for quarterly (max 40 quarters).
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
 * Pure annual grant once per calendar year.
 * @param {{ balance: number, lastGrantedYear: string, yearKey: string, tier: string, membershipActive: boolean }} args
 */
export function accrueAnnualCreditsState(args) {
    const tier = String(args.tier || '').toLowerCase();
    const membershipActive = Boolean(args.membershipActive);
    let balance = Math.max(0, Math.round(Number(args.balance) || 0));
    let lastGrantedYear = String(args.lastGrantedYear || '').trim();
    const yearKey = String(args.yearKey || '').trim() || calendarYearKey();

    if (tier !== 'annual' || !membershipActive || yearKey.length !== 4) {
        return { balance, lastGrantedYear, granted: 0 };
    }
    if (lastGrantedYear === yearKey) {
        return { balance, lastGrantedYear, granted: 0 };
    }
    return {
        balance: balance + ANNUAL_APP_CREDITS_PER_YEAR,
        lastGrantedYear: yearKey,
        granted: ANNUAL_APP_CREDITS_PER_YEAR,
    };
}

/**
 * @param {{
 *   membershipAccess: 'ok' | 'exempt' | 'needsSubscription' | 'noAccount' | string,
 *   tier: MembershipTier | string,
 *   appCreditBalance?: number,
 *   lastAccrued?: string,
 *   lastAnnualGrantedYear?: string,
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
    const quarterKey = args.currentQuarterKey || calendarQuarterKey();
    let balance = Math.max(0, Math.round(Number(args.appCreditBalance) || 0));
    let lastAccrued = String(args.lastAccrued || '');

    if (tier === 'quarterly') {
        const accrued = accrueQuarterlyCreditsState({
            balance,
            lastAccrued,
            currentKey: quarterKey,
            tier,
            membershipActive: true,
        });
        balance = accrued.balance;
        lastAccrued = accrued.lastAccrued;
    } else if (tier === 'annual') {
        const accrued = accrueAnnualCreditsState({
            balance,
            lastGrantedYear: String(args.lastAnnualGrantedYear || ''),
            yearKey: calendarYearKey(),
            tier,
            membershipActive: true,
        });
        balance = accrued.balance;
    }

    const membershipTier = tier || 'monthly';

    if (TEMP_WAIVE_MEMBER_APPLICATION_FEES) {
        return {
            dueCents: 0,
            reason: 'membership_temp',
            membershipTier,
            appCreditBalance: balance,
        };
    }

    if (tier === 'quarterly' || tier === 'annual') {
        if (balance >= 1) {
            return {
                dueCents: 0,
                reason: 'credit',
                membershipTier: tier,
                appCreditBalance: balance,
            };
        }
        return {
            dueCents: APPLICATION_FEE_MEMBER_CENTS,
            reason: 'member_fee',
            membershipTier: tier,
            appCreditBalance: 0,
        };
    }

    return {
        dueCents: APPLICATION_FEE_MEMBER_CENTS,
        reason: 'member_fee',
        membershipTier,
        appCreditBalance: balance,
    };
}
