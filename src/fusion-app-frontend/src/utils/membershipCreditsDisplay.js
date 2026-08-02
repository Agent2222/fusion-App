/**
 * Explore-programs membership credit strip (application + program draw).
 * Draw balances are stubbed until canister draw credits ship.
 */

import { normalizeMembershipTier } from './membershipPlanChange.js';

/**
 * Stub draw allowance per active period (until Motoko draw credits exist).
 * Quarterly / annual each grant 1 draw credit per billing period.
 */
export const STUB_DRAW_CREDITS_PER_PERIOD = 1;

/**
 * @param {Date} [now]
 * @returns {Date} UTC start of the next calendar quarter
 */
export function nextUtcQuarterStart(now = new Date()) {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth(); // 0–11
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
 * @param {{
 *   tier: string,
 *   appCreditBalance?: number,
 *   drawCreditBalance?: number | null,
 *   periodEndIso?: string,
 *   now?: Date,
 * }} args
 * @returns {{
 *   visible: boolean,
 *   tier: 'quarterly' | 'annual' | '',
 *   applicationCreditsLabel: string,
 *   drawCreditsLabel: string,
 *   nextCreditsLabel: string,
 *   nextCreditsHint: string,
 * } | null}
 */
export function buildMembershipCreditsStripModel(args) {
    const tier = normalizeMembershipTier(args.tier);
    if (tier !== 'quarterly' && tier !== 'annual') {
        return null;
    }
    const now = args.now instanceof Date ? args.now : new Date();
    const appBal = Math.max(0, Math.round(Number(args.appCreditBalance) || 0));
    const drawBal =
        args.drawCreditBalance == null
            ? STUB_DRAW_CREDITS_PER_PERIOD
            : Math.max(0, Math.round(Number(args.drawCreditBalance) || 0));

    const nextDate =
        tier === 'quarterly'
            ? nextUtcQuarterStart(now)
            : nextAnnualCreditDate(args.periodEndIso, now);

    const applicationCreditsLabel =
        tier === 'annual'
            ? 'Included'
            : String(appBal);

    const nextCreditsHint =
        tier === 'quarterly'
            ? 'New application and draw credits each calendar quarter'
            : 'Draw credit renews with your annual membership period';

    return {
        visible: true,
        tier,
        applicationCreditsLabel,
        drawCreditsLabel: String(drawBal),
        nextCreditsLabel: formatCreditDateLabel(nextDate),
        nextCreditsHint,
    };
}
