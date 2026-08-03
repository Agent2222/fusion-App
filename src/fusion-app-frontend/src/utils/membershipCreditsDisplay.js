/**
 * Explore-programs membership credit strip (application credits + Program Award entries).
 */

import { normalizeMembershipTier } from './membershipPlanChange.js';
import { calendarQuarterKey, calendarYearKey } from './applicationFeePolicy.js';

/**
 * @param {Date} [now]
 * @returns {Date} UTC start of the next calendar quarter
 */
export function nextUtcQuarterStart(now = new Date()) {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const qStartMonth = Math.floor(m / 3) * 3;
    let nextY = y;
    let nextM = qStartMonth + 3;
    if (nextM >= 12) {
        nextM = 0;
        nextY += 1;
    }
    return new Date(Date.UTC(nextY, nextM, 1, 0, 0, 0, 0));
}

/**
 * @param {string} [periodEndIso]
 * @param {Date} [now]
 * @returns {Date}
 */
export function nextAnnualCreditDate(periodEndIso, now = new Date()) {
    const pe = String(periodEndIso || '').trim();
    if (pe) {
        const d = new Date(pe);
        if (!Number.isNaN(d.getTime()) && d.getTime() > now.getTime()) {
            return d;
        }
    }
    return new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0));
}

/**
 * @param {Date} date
 * @returns {string}
 */
export function formatCreditDateLabel(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
    try {
        return new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
        }).format(date);
    } catch {
        return date.toISOString().slice(0, 10);
    }
}

/**
 * Shared model for Explore strip + membership included bullets.
 * @param {{
 *   tier: string,
 *   access?: string,
 *   appCreditBalance?: number,
 *   awardEntryBalance?: number | null,
 *   periodEndIso?: string,
 *   nextAccrualHint?: string,
 *   now?: Date,
 *   showForMonthly?: boolean,
 * }} args
 * @returns {{
 *   visible: boolean,
 *   tier: 'monthly' | 'quarterly' | 'annual' | 'bimonthly' | '',
 *   access: string,
 *   applicationCreditsLabel: string,
 *   awardEntriesLabel: string,
 *   drawCreditsLabel: string,
 *   nextCreditsLabel: string,
 *   nextCreditsHint: string,
 *   appCreditBalance: number,
 *   awardEntryBalance: number,
 *   quarterKey: string,
 *   yearKey: string,
 * } | null}
 */
export function buildMembershipCreditsStripModel(args) {
    const access = String(args.access || '')
        .trim()
        .toLowerCase();
    const tier = normalizeMembershipTier(args.tier);
    const showMonthly = Boolean(args.showForMonthly);
    const now = args.now instanceof Date ? args.now : new Date();
    const appBal = Math.max(0, Math.round(Number(args.appCreditBalance) || 0));
    const awardBal = Math.max(0, Math.round(Number(args.awardEntryBalance) || 0));
    const apiHint = String(args.nextAccrualHint || '').trim();

    if (access === 'exempt') {
        return {
            visible: true,
            tier: /** @type {'monthly' | 'quarterly' | 'annual' | 'bimonthly' | ''} */ (tier || ''),
            access: 'exempt',
            applicationCreditsLabel: String(Math.max(1, appBal)),
            awardEntriesLabel: String(awardBal),
            drawCreditsLabel: String(awardBal),
            nextCreditsLabel: apiHint || 'Included',
            nextCreditsHint:
                'Complimentary membership includes formal applications. No included Program Award credits — purchase available when a cycle is active.',
            appCreditBalance: Math.max(1, appBal),
            awardEntryBalance: awardBal,
            quarterKey: calendarQuarterKey(now),
            yearKey: calendarYearKey(now),
        };
    }

    if (tier !== 'quarterly' && tier !== 'annual' && !(showMonthly && tier === 'monthly')) {
        return null;
    }

    const nextDate =
        tier === 'quarterly'
            ? nextUtcQuarterStart(now)
            : tier === 'annual'
              ? nextAnnualCreditDate(args.periodEndIso, now)
              : null;

    let nextCreditsHint =
        'Credits apply to formal program applications only. Program Award entries are separate.';
    if (tier === 'quarterly') {
        nextCreditsHint =
            '+1 application credit and +1 Program Award entry when membership renews each quarter. Credits apply to formal applications only.';
    } else if (tier === 'annual') {
        nextCreditsHint =
            '+4 application credits and +4 Program Award entries when membership renews each year (stackable).';
    } else if (tier === 'monthly') {
        nextCreditsHint =
            'No included application credits — $35 per formal application. Buy a $50 Program Award entry on an active cycle.';
    }

    let nextCreditsLabel = nextDate ? formatCreditDateLabel(nextDate) : '—';
    if (apiHint) {
        // Prefer canister hint when it looks like a date/key; keep formatted date otherwise.
        if (/^\d{4}(-Q[1-4])?$/.test(apiHint) || apiHint.toLowerCase() === 'included') {
            nextCreditsLabel = apiHint;
        }
    }

    return {
        visible: true,
        tier: /** @type {'monthly' | 'quarterly' | 'annual' | 'bimonthly' | ''} */ (tier || ''),
        access: access || 'ok',
        applicationCreditsLabel: String(appBal),
        awardEntriesLabel: String(awardBal),
        /** @deprecated use awardEntriesLabel */
        drawCreditsLabel: String(awardBal),
        nextCreditsLabel,
        nextCreditsHint,
        appCreditBalance: appBal,
        awardEntryBalance: awardBal,
        quarterKey: calendarQuarterKey(now),
        yearKey: calendarYearKey(now),
    };
}
