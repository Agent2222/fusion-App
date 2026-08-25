/** Shared program residency payment amounts (USD cents) and display helpers. */

import { parseProgramStartDate } from './programAlumniEligibility.js';
import {
    applicantDisplayNamesFromPayload,
    getApplicantCategory,
    getApplicantFlightCostCents,
    getApplicantIsTester,
    getApplicantLocalTravelCostCents,
    getApplicantManualDepositSubmitted,
    getApplicantSpecialProgramTotalCents,
    getApplicantSponsorshipMode,
    getApplicantSponsoredCreditCents,
    getApplicantSponsoredPercent,
} from './studioPlainForms.js';
import {
    programRowConfirmedArtistNames,
    programRowConfirmedSlotState,
} from './studioArtistPrograms.js';

export const PROGRAM_RESIDENCY_BASE_TOTAL_CENTS = 500000;
export const PROGRAM_OWN_FLIGHT_CREDIT_CENTS = 80000;
export const PROGRAM_DEFAULT_DEPOSIT_CENTS = 100000;
export const PROGRAM_VETERAN_DISCOUNT_CENTS = 100000;

/**
 * @param {unknown} value
 * @returns {number}
 */
function normalizeCents(value) {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/**
 * Parse a USD display string (e.g. "$5,000 USD") to cents.
 * @param {unknown} value
 * @returns {number}
 */
export function parseUsdDisplayToCents(value) {
    const raw = String(value ?? '').replace(/,/g, '');
    const m = raw.match(/\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:USD)?/i);
    if (!m) return 0;
    return Math.round(Number(m[1]) * 100);
}

/**
 * @param {unknown} cents
 * @returns {string}
 */
export function formatUsdFromCents(cents) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
    }).format(normalizeCents(cents) / 100);
}

/**
 * @param {object | null | undefined} programRow — row from {@link import('./database.js').getPrograms}
 * @returns {number} deposit amount in USD cents
 */
export function resolveProgramDepositCents(programRow) {
    if (!programRow || typeof programRow !== 'object') {
        return PROGRAM_DEFAULT_DEPOSIT_CENTS;
    }
    const row = /** @type {Record<string, unknown>} */ (programRow);
    const en =
        row.enCard && typeof row.enCard === 'object'
            ? /** @type {Record<string, unknown>} */ (row.enCard)
            : {};
    const pp =
        en.programPage && typeof en.programPage === 'object'
            ? /** @type {Record<string, unknown>} */ (en.programPage)
            : {};
    const af =
        pp.applicationForm && typeof pp.applicationForm === 'object'
            ? /** @type {Record<string, unknown>} */ (pp.applicationForm)
            : {};
    const depositDisplay = String(
        row.depositAmountDisplay ?? en.depositAmountDisplay ?? af.depositAmountDisplay ?? '',
    ).trim();
    const parsed = parseUsdDisplayToCents(depositDisplay);
    return parsed > 0 ? parsed : PROGRAM_DEFAULT_DEPOSIT_CENTS;
}

/**
 * Member My Payments: never charge a deposit larger than the effective total due
 * (e.g. heavy partial sponsorship).
 * @param {number} programDepositCents
 * @param {number} totalDueCents
 * @returns {number}
 */
export function resolveMemberChargeableDepositCents(programDepositCents, totalDueCents) {
    const deposit = normalizeCents(programDepositCents);
    const total = normalizeCents(totalDueCents);
    if (total > 0) return Math.min(deposit, total);
    return deposit;
}

/**
 * Member My Payments total due: prefer summary, then approval, else compute from category/sponsorship.
 * @param {{
 *   summaryTotalDueCents?: number | null,
 *   approvalTotalDueCents?: number | null,
 *   category?: string,
 *   ownFlight?: boolean,
 *   specialProgramTotalCents?: number,
 *   sponsorshipMode?: string,
 *   sponsoredCreditCents?: number,
 *   sponsoredPercent?: number,
 * }} args
 * @returns {number}
 */
export function resolveMemberProgramTotalDueCents(args = {}) {
    if (args.summaryTotalDueCents != null && args.summaryTotalDueCents !== '') {
        return normalizeCents(args.summaryTotalDueCents);
    }
    if (args.approvalTotalDueCents != null && args.approvalTotalDueCents !== '') {
        return normalizeCents(args.approvalTotalDueCents);
    }
    const category = String(args.category || 'general');
    const ownFlight = Boolean(args.ownFlight);
    const specialProgramTotalCents = normalizeCents(args.specialProgramTotalCents);
    const sponsorshipMode = String(args.sponsorshipMode || 'none').toLowerCase();
    let sponsoredCreditCents = normalizeCents(args.sponsoredCreditCents);
    const sponsoredPercent = Math.max(0, Math.min(100, Math.round(Number(args.sponsoredPercent || 0))));
    if (sponsorshipMode === 'partial' && sponsoredPercent > 0 && sponsoredCreditCents <= 0) {
        const base =
            specialProgramTotalCents > 0
                ? specialProgramTotalCents
                : computeMemberProgramTotalDueCents({ category, ownFlight });
        sponsoredCreditCents = Math.round((base * sponsoredPercent) / 100);
    }
    return computeApplicantEffectiveTotalDueCents({
        category,
        ownFlight,
        specialProgramTotalCents,
        sponsorshipMode,
        sponsoredCreditCents,
    });
}

/**
 * Total expected residency revenue per filled slot (deposit is part of this total).
 * @param {object | null | undefined} programRow
 * @returns {{ depositCents: number, totalPerSlotCents: number }}
 */
export function resolveProgramTotalPerSlotCents(programRow) {
    const depositCents = resolveProgramDepositCents(programRow);
    if (!programRow || typeof programRow !== 'object') {
        return { depositCents, totalPerSlotCents: PROGRAM_RESIDENCY_BASE_TOTAL_CENTS };
    }
    const en =
        programRow.enCard && typeof programRow.enCard === 'object'
            ? /** @type {Record<string, unknown>} */ (programRow.enCard)
            : {};
    const pp =
        en.programPage && typeof en.programPage === 'object'
            ? /** @type {Record<string, unknown>} */ (en.programPage)
            : {};
    const details =
        pp.programDetails && typeof pp.programDetails === 'object'
            ? /** @type {Record<string, unknown>} */ (pp.programDetails)
            : {};
    const costs =
        details.costs && typeof details.costs === 'object'
            ? /** @type {Record<string, unknown>} */ (details.costs)
            : {};
    const baseParsed = parseUsdDisplayToCents(costs.base);
    const remainingParsed = parseUsdDisplayToCents(costs.remainingBalance);
    if (baseParsed > 0 && baseParsed >= depositCents) {
        return { depositCents, totalPerSlotCents: baseParsed };
    }
    if (remainingParsed > 0) {
        return { depositCents, totalPerSlotCents: depositCents + remainingParsed };
    }
    return { depositCents, totalPerSlotCents: PROGRAM_RESIDENCY_BASE_TOTAL_CENTS };
}

/**
 * @param {string} category
 * @returns {number}
 */
export function applicantCategoryDiscountCents(category) {
    return category === 'veteran' ? PROGRAM_VETERAN_DISCOUNT_CENTS : 0;
}

/**
 * @param {{ category?: string, ownFlight?: boolean }} args
 * @returns {number}
 */
export function computeMemberProgramTotalDueCents({ category, ownFlight }) {
    const base = PROGRAM_RESIDENCY_BASE_TOTAL_CENTS;
    const categoryDiscount = applicantCategoryDiscountCents(String(category || 'general'));
    const flightCredit = ownFlight ? PROGRAM_OWN_FLIGHT_CREDIT_CENTS : 0;
    return Math.max(0, base - categoryDiscount - flightCredit);
}

/**
 * Effective program total due after special price + sponsorship.
 * Special price is an absolute override of list price (veteran discount does not stack on top).
 * Own-flight credit still applies to list price only when no special price is set.
 *
 * @param {{
 *   category?: string,
 *   ownFlight?: boolean,
 *   specialProgramTotalCents?: number,
 *   sponsorshipMode?: 'none' | 'partial' | 'full',
 *   sponsoredCreditCents?: number,
 * }} args
 * @returns {number}
 */
export function computeApplicantEffectiveTotalDueCents({
    category,
    ownFlight,
    specialProgramTotalCents,
    sponsorshipMode,
    sponsoredCreditCents,
}) {
    const special = normalizeCents(specialProgramTotalCents);
    const base =
        special > 0
            ? special
            : computeMemberProgramTotalDueCents({ category, ownFlight });
    const mode = String(sponsorshipMode || 'none').toLowerCase();
    if (mode === 'full') return 0;
    if (mode === 'partial') {
        return Math.max(0, base - normalizeCents(sponsoredCreditCents));
    }
    return base;
}

/**
 * @param {string} payloadJson
 * @param {{ category?: string, ownFlight?: boolean }} [ctx]
 */
export function computeApplicantEffectiveTotalDueFromPayload(payloadJson, ctx = {}) {
    const category = ctx.category || getApplicantCategory(payloadJson);
    const ownFlight = Boolean(ctx.ownFlight);
    const specialProgramTotalCents = getApplicantSpecialProgramTotalCents(payloadJson);
    const sponsorshipMode = getApplicantSponsorshipMode(payloadJson);
    let sponsoredCreditCents = getApplicantSponsoredCreditCents(payloadJson);
    const pct = getApplicantSponsoredPercent(payloadJson);
    if (sponsorshipMode === 'partial' && pct != null && sponsoredCreditCents <= 0) {
        const base =
            specialProgramTotalCents > 0
                ? specialProgramTotalCents
                : computeMemberProgramTotalDueCents({ category, ownFlight });
        sponsoredCreditCents = Math.round((base * pct) / 100);
    }
    return computeApplicantEffectiveTotalDueCents({
        category,
        ownFlight,
        specialProgramTotalCents,
        sponsorshipMode,
        sponsoredCreditCents,
    });
}

/**
 * Deposit waived via full sponsorship (no money required).
 * @param {string} payloadJson
 */
export function isApplicantDepositWaived(payloadJson) {
    if (getApplicantSponsorshipMode(payloadJson) === 'full') return true;
    // Category labels that mean the slot is covered without a deposit.
    const category = getApplicantCategory(payloadJson);
    return category === 'sponsored' || category === 'extSponsored';
}

/**
 * Real deposit money received (ledger / summary) — excludes checkbox-only and full sponsorship waiver.
 * @param {object} applicant
 * @param {ReturnType<typeof buildProgramPaymentIndex>} index
 * @param {object | null | undefined} [programRow]
 */
export function isApplicantDepositPaid(applicant, index, programRow = null) {
    if (!applicant || typeof applicant !== 'object') return false;
    const payloadJson = String(applicant.payloadJson || '');
    if (isApplicantDepositWaived(payloadJson)) return false;
    const appId = String(applicant.id || '').trim();
    const summary = index.summariesByApplicationId.get(appId);
    const depositStatus = String(summary?.depositStatus || '');
    if (depositStatus === 'paid' || depositStatus === 'paid_full') return true;
    const depositAmountCents = resolveApplicantDepositAmountCents(summary, programRow);
    const ledger = index.ledgerByApplicationId.get(appId) || [];
    return ledgerHasDepositPayment(ledger, depositAmountCents);
}

/**
 * Slot/revenue cohort: real deposit paid or fully sponsored (deposit waived).
 * @param {object} applicant
 * @param {ReturnType<typeof buildProgramPaymentIndex>} index
 * @param {object | null | undefined} [programRow]
 */
export function isApplicantDepositSatisfied(applicant, index, programRow = null) {
    if (!applicant || typeof applicant !== 'object') return false;
    if (isApplicantDepositWaived(String(applicant.payloadJson || ''))) return true;
    return isApplicantDepositPaid(applicant, index, programRow);
}

/**
 * Monthly installment options available before the program start month.
 * Counts calendar months from the current month up to (but not including) the start month.
 *
 * @param {string} startDateText
 * @param {string} [yearText]
 * @param {Date} [now]
 * @returns {number}
 */
export function countPaymentPlanMonthsUntilStart(startDateText, yearText = '', now = new Date()) {
    const start = parseProgramStartDate(String(startDateText || ''), String(yearText || ''));
    if (!start || Number.isNaN(start.getTime())) return 0;

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    if (startDay.getTime() <= today.getTime()) return 0;

    let count = 0;
    const cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    const startMonth = new Date(startDay.getFullYear(), startDay.getMonth(), 1);
    while (cursor.getTime() < startMonth.getTime()) {
        count += 1;
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return count;
}

const LEDGER_PAYMENT_TYPES = new Set(['deposit', 'full_payment', 'manual', 'staff_manual']);
const LEDGER_SUCCEEDED = new Set(['succeeded', 'paid']);

/**
 * @param {unknown} row
 */
export function isLedgerRowSucceeded(row) {
    return LEDGER_SUCCEEDED.has(String(row?.status || '').toLowerCase());
}

/**
 * @param {unknown} row
 */
export function isLedgerPaymentRow(row) {
    return isLedgerRowSucceeded(row) && LEDGER_PAYMENT_TYPES.has(String(row?.paymentType || ''));
}

/**
 * @param {unknown} row
 * @returns {'stripe' | 'paypal' | 'staff'}
 */
export function ledgerRowSource(row) {
    const type = String(row?.paymentType || '');
    if (type === 'staff_manual' || type === 'staff_fee' || type === 'staff_travel') return 'staff';
    const provider = String(row?.paymentProvider || '').toLowerCase();
    if (provider === 'paypal') return 'paypal';
    if (provider === 'staff') return 'staff';
    return 'stripe';
}

/**
 * @param {unknown} row
 */
export function ledgerRowTypeLabel(row) {
    const type = String(row?.paymentType || '').replace(/_/g, ' ');
    return type || 'payment';
}

/**
 * @param {object[] | null | undefined} rows
 */
export function sumLedgerPaymentsCents(rows) {
    let total = 0;
    for (const row of Array.isArray(rows) ? rows : []) {
        if (!isLedgerPaymentRow(row)) continue;
        total += normalizeCents(row.amountCents);
    }
    return total;
}

/**
 * @param {object[] | null | undefined} rows
 */
export function sumLedgerFeesCents(rows) {
    let total = 0;
    for (const row of Array.isArray(rows) ? rows : []) {
        if (!isLedgerRowSucceeded(row)) continue;
        if (String(row?.paymentType || '') === 'staff_travel') continue;
        total += normalizeCents(row.feeCents);
    }
    return total;
}

/**
 * @param {object[] | null | undefined} rows
 */
export function sumLedgerTravelFeesCents(rows) {
    let total = 0;
    for (const row of Array.isArray(rows) ? rows : []) {
        if (!isLedgerRowSucceeded(row)) continue;
        if (String(row?.paymentType || '') !== 'staff_travel') continue;
        total += normalizeCents(row.feeCents);
    }
    return total;
}

/**
 * @param {object[] | null | undefined} ledger
 * @param {number} depositAmountCents
 */
export function ledgerHasDepositPayment(ledger, depositAmountCents) {
    const deposit = normalizeCents(depositAmountCents);
    for (const row of Array.isArray(ledger) ? ledger : []) {
        if (!isLedgerRowSucceeded(row)) continue;
        const type = String(row?.paymentType || '');
        if (type === 'deposit' || type === 'full_payment') return true;
        if (type === 'staff_manual' && normalizeCents(row.amountCents) >= deposit && deposit > 0) {
            return true;
        }
    }
    return false;
}

/**
 * Member dashboard: deposit secured (manual staff flag, summary, or ledger).
 * @param {object | null | undefined} approval
 * @param {object | null | undefined} summary
 * @param {object[] | null | undefined} ledger
 * @param {number} [depositAmountCents]
 */
export function isMemberProgramDepositPaid(approval, summary, ledger, depositAmountCents = 0) {
    if (approval?.manualDepositSubmitted === true) return true;
    const depositStatus = String(summary?.depositStatus || '');
    if (depositStatus === 'paid' || depositStatus === 'paid_full') return true;
    const deposit =
        normalizeCents(depositAmountCents) ||
        normalizeCents(summary?.depositAmountCents) ||
        PROGRAM_DEFAULT_DEPOSIT_CENTS;
    if (ledgerHasDepositPayment(ledger, deposit)) return true;
    const totalPaid = normalizeCents(summary?.totalPaidCents);
    return totalPaid >= deposit && deposit > 0;
}

/**
 * @param {object} applicant
 * @param {object[] | null | undefined} ledger
 * @param {object | null | undefined} summary
 * @param {number} depositAmountCents
 */
export function computeEffectiveTotalPaymentsCents(applicant, ledger, summary, depositAmountCents) {
    const ledgerTotal = sumLedgerPaymentsCents(ledger);
    const payloadJson = String(applicant?.payloadJson || '');
    // Fully sponsored: never invent a synthetic deposit; only real ledger money counts.
    if (isApplicantDepositWaived(payloadJson)) {
        return ledgerTotal;
    }
    const manualDeposit = getApplicantManualDepositSubmitted(payloadJson);
    const deposit = normalizeCents(depositAmountCents) || PROGRAM_DEFAULT_DEPOSIT_CENTS;
    if (manualDeposit && !ledgerHasDepositPayment(ledger, deposit)) {
        return ledgerTotal + deposit;
    }
    const summaryPaid = normalizeCents(summary?.totalPaidCents);
    if (summaryPaid > ledgerTotal) return summaryPaid;
    return ledgerTotal;
}

/**
 * @param {object | null | undefined} summary
 * @param {object | null | undefined} programRow
 */
export function resolveApplicantDepositAmountCents(summary, programRow) {
    const fromSummary = normalizeCents(summary?.depositAmountCents);
    if (fromSummary > 0) return fromSummary;
    return resolveProgramDepositCents(programRow);
}

/**
 * @param {ReturnType<typeof buildStudioProgramFinanceRow>[]} rows
 */
export function computeFinancePanelTotals(rows) {
    const list = Array.isArray(rows) ? rows : [];
    let currentRevenueCents = 0;
    for (const row of list) {
        currentRevenueCents += Math.max(
            0,
            normalizeCents(row.totalPaymentsCents) - normalizeCents(row.paymentFeesCents),
        );
    }
    return { currentRevenueCents, rowCount: list.length };
}

/**
 * @param {object | null | undefined} paymentsBundle
 * @returns {{
 *   summariesByApplicationId: Map<string, object>,
 *   ledgerByApplicationId: Map<string, object[]>,
 *   plansById: Map<string, object>,
 *   summariesByKey: Map<string, object>,
 * }}
 */
export function buildProgramPaymentIndex(paymentsBundle) {
    const bundle = paymentsBundle && typeof paymentsBundle === 'object' ? paymentsBundle : {};
    /** @type {Map<string, object>} */
    const summariesByApplicationId = new Map();
    /** @type {Map<string, object>} */
    const summariesByKey = new Map();
    /** @type {Map<string, object[]>} */
    const ledgerByApplicationId = new Map();
    /** @type {Map<string, object>} */
    const plansById = new Map();

    for (const summary of Array.isArray(bundle.summaries) ? bundle.summaries : []) {
        const appId = String(summary?.applicationId || '').trim();
        const key = String(summary?.key || '').trim();
        if (appId) summariesByApplicationId.set(appId, summary);
        if (key) summariesByKey.set(key, summary);
    }
    for (const row of Array.isArray(bundle.ledger) ? bundle.ledger : []) {
        const appId = String(row?.applicationId || '').trim();
        if (!appId) continue;
        if (!ledgerByApplicationId.has(appId)) ledgerByApplicationId.set(appId, []);
        ledgerByApplicationId.get(appId).push(row);
    }
    for (const plan of Array.isArray(bundle.plans) ? bundle.plans : []) {
        const id = String(plan?.id || '').trim();
        if (id) plansById.set(id, plan);
    }
    return { summariesByApplicationId, ledgerByApplicationId, plansById, summariesByKey };
}

/**
 * @param {object} applicant
 * @param {ReturnType<typeof buildProgramPaymentIndex>} index
 */
export function isApplicantSlotSecured(applicant, index) {
    if (!applicant || typeof applicant !== 'object') return false;
    const payloadJson = String(applicant.payloadJson || '');
    if (getApplicantSponsorshipMode(payloadJson) === 'full') return true;
    if (getApplicantManualDepositSubmitted(payloadJson)) return true;
    const appId = String(applicant.id || '').trim();
    const summary = index.summariesByApplicationId.get(appId);
    const depositStatus = String(summary?.depositStatus || '');
    if (depositStatus === 'paid' || depositStatus === 'paid_full') return true;
    if (normalizeCents(summary?.totalDueCents) === 0 && summary) return true;
    const deposit =
        normalizeCents(summary?.depositAmountCents) || PROGRAM_DEFAULT_DEPOSIT_CENTS;
    if (normalizeCents(summary?.totalPaidCents) >= deposit && deposit > 0) return true;
    const ledger = index.ledgerByApplicationId.get(appId) || [];
    if (
        ledger.some((row) => {
            const type = String(row?.paymentType || '');
            return (
                isLedgerRowSucceeded(row) &&
                (type === 'deposit' || type === 'full_payment' || type === 'staff_manual')
            );
        })
    ) {
        return true;
    }
    // Cumulative PayPal "manual" (and other succeeded) payments that cover the deposit.
    let paidSum = 0;
    for (const row of ledger) {
        if (!isLedgerRowSucceeded(row)) continue;
        const type = String(row?.paymentType || '');
        if (type === 'refund' || type === 'program_award_entry') continue;
        paidSum += normalizeCents(row?.amountCents);
    }
    return paidSum >= deposit && deposit > 0;
}

/**
 * Finance includes slot-secured applicants unless they withdrew or were pulled out.
 * @param {object | null | undefined} applicant
 */
export function isApplicantFinanceActive(applicant) {
    if (!applicant || typeof applicant !== 'object') return false;
    const s = String(applicant.status || '');
    return s !== 'withdrawn' && s !== 'pulledOut';
}

/**
 * @param {object} applicant
 * @param {ReturnType<typeof buildProgramPaymentIndex>} index
 */
export function applicantPaymentContext(applicant, index) {
    const appId = String(applicant?.id || '').trim();
    const summary = index.summariesByApplicationId.get(appId) || null;
    const ledger = index.ledgerByApplicationId.get(appId) || [];
    const plan =
        summary?.activePlanId != null
            ? index.plansById.get(String(summary.activePlanId)) || null
            : null;
    const ownFlight = summary?.ownFlight === true || String(summary?.ownFlight || '').toLowerCase() === 'true';
    const payloadJson = String(applicant?.payloadJson || '');
    const category = getApplicantCategory(payloadJson);
    const listPriceCents = computeMemberProgramTotalDueCents({ category, ownFlight });
    const specialProgramTotalCents = getApplicantSpecialProgramTotalCents(payloadJson);
    const sponsorshipMode = getApplicantSponsorshipMode(payloadJson);
    let sponsoredCreditCents = getApplicantSponsoredCreditCents(payloadJson);
    const sponsoredPercent = getApplicantSponsoredPercent(payloadJson);
    if (sponsorshipMode === 'partial' && sponsoredPercent != null && sponsoredCreditCents <= 0) {
        const base = specialProgramTotalCents > 0 ? specialProgramTotalCents : listPriceCents;
        sponsoredCreditCents = Math.round((base * sponsoredPercent) / 100);
    }
    const priceCategoryCents = computeApplicantEffectiveTotalDueCents({
        category,
        ownFlight,
        specialProgramTotalCents,
        sponsorshipMode,
        sponsoredCreditCents,
    });
    const totalPaymentsCents = sumLedgerPaymentsCents(ledger);
    const paymentFeesCents = sumLedgerFeesCents(ledger);
    const installmentCount = Math.max(0, Math.round(Number(plan?.installmentCount ?? 0)));
    const installmentAmountCents = Math.max(0, Math.round(Number(plan?.installmentAmountCents ?? 0)));
    const planPriceCents =
        installmentAmountCents > 0
            ? installmentAmountCents
            : installmentCount > 0
              ? Math.round(priceCategoryCents / installmentCount)
              : 0;
    const planActive = Boolean(plan && String(plan.status || '').toLowerCase() === 'active');
    return {
        summary,
        ledger,
        plan,
        ownFlight,
        category,
        listPriceCents,
        specialProgramTotalCents,
        sponsorshipMode,
        sponsoredCreditCents,
        sponsoredPercent,
        priceCategoryCents,
        totalPaymentsCents,
        paymentFeesCents,
        planPriceCents,
        planActive,
        remainingBalanceCents: Math.max(0, priceCategoryCents - totalPaymentsCents),
    };
}

/**
 * @param {object} applicant
 * @param {object | null | undefined} programRow
 * @param {ReturnType<typeof buildProgramPaymentIndex>} index
 * @param {{ partner1Cents?: number, partner2Cents?: number, partner3Cents?: number }} [partners]
 */
export function buildStudioProgramFinanceRow(applicant, programRow, index, partners = {}) {
    const appId = String(applicant?.id || '').trim();
    const programId = String(applicant?.programId || '').trim();
    const payloadJson = String(applicant?.payloadJson || '');
    const names = applicantDisplayNamesFromPayload(payloadJson, String(applicant?.fullName || ''));
    const ctx = applicantPaymentContext(applicant, index);
    const depositWaived = isApplicantDepositWaived(payloadJson);
    const depositAmountCents = depositWaived
        ? 0
        : resolveApplicantDepositAmountCents(ctx.summary, programRow);
    const totalPaymentsCents = computeEffectiveTotalPaymentsCents(
        applicant,
        ctx.ledger,
        ctx.summary,
        depositAmountCents,
    );
    const ticketsCents = getApplicantFlightCostCents(payloadJson);
    const localTravelPayloadCents = getApplicantLocalTravelCostCents(payloadJson);
    const localTravelLedgerCents = sumLedgerTravelFeesCents(ctx.ledger);
    const localTravelCents = localTravelPayloadCents + localTravelLedgerCents;
    const partner1Cents = normalizeCents(partners.partner1Cents);
    const partner2Cents = normalizeCents(partners.partner2Cents);
    const partner3Cents = normalizeCents(partners.partner3Cents);
    const subtotalCents =
        ctx.paymentFeesCents + ticketsCents + localTravelCents + partner1Cents + partner2Cents + partner3Cents;
    const profitCents = totalPaymentsCents - subtotalCents;
    const remainingBalanceCents = Math.max(0, ctx.priceCategoryCents - totalPaymentsCents);
    const depositPaid = !depositWaived && isApplicantDepositPaid(applicant, index, programRow);
    return {
        applicantId: appId,
        programId,
        email: String(applicant?.email || '').trim(),
        firstName: names.firstName,
        lastName: names.lastName,
        discipline: names.discipline,
        category: ctx.category,
        listPriceCents: ctx.listPriceCents,
        specialProgramTotalCents: ctx.specialProgramTotalCents,
        sponsorshipMode: ctx.sponsorshipMode,
        sponsoredCreditCents: ctx.sponsoredCreditCents,
        sponsoredPercent: ctx.sponsoredPercent,
        priceCategoryCents: ctx.priceCategoryCents,
        depositAmountCents,
        depositWaived,
        slotSecured: isApplicantSlotSecured(applicant, index),
        depositPaid,
        planActive: ctx.planActive,
        planPriceCents: ctx.planPriceCents,
        totalPaymentsCents,
        paymentFeesCents: ctx.paymentFeesCents,
        ticketsCents,
        localTravelPayloadCents,
        localTravelLedgerCents,
        localTravelCents,
        ownFlight: ctx.ownFlight,
        partner1Cents,
        partner2Cents,
        partner3Cents,
        subtotalCents,
        remainingBalanceCents,
        profitCents,
        ledger: ctx.ledger,
        summary: ctx.summary,
        plan: ctx.plan,
        payloadJson,
        isTester: getApplicantIsTester(payloadJson),
    };
}

/**
 * @param {object[]} applicants
 * @param {object[]} programs
 * @param {ReturnType<typeof buildProgramPaymentIndex>} index
 * @param {{ filterProgramId?: string | null, activeOnly?: boolean }} [opts]
 */
export function buildStudioProgramFinanceRows(applicants, programs, index, opts = {}) {
    const filterProgramId = opts.filterProgramId ? String(opts.filterProgramId).trim() : '';
    const activeOnly = opts.activeOnly !== false;
    /** @type {Map<string, object>} */
    const programById = new Map();
    for (const p of Array.isArray(programs) ? programs : []) {
        programById.set(String(p?.id || ''), p);
    }
    /** @type {ReturnType<typeof buildStudioProgramFinanceRow>[]} */
    const rows = [];
    for (const applicant of Array.isArray(applicants) ? applicants : []) {
        if (!applicant || typeof applicant !== 'object') continue;
        const programId = String(applicant.programId || '').trim();
        if (!programId) continue;
        if (filterProgramId && programId !== filterProgramId) continue;
        const programRow = programById.get(programId) || null;
        if (activeOnly && programRow) {
            const status = String(programRow.studioStatus || '');
            const isActive = status === 'active' || status === 'open' || status === 'full';
            if (!isActive) continue;
        }
        if (getApplicantIsTester(String(applicant.payloadJson || ''))) continue;
        if (!isApplicantFinanceActive(applicant)) continue;
        if (!isApplicantSlotSecured(applicant, index)) continue;
        rows.push(buildStudioProgramFinanceRow(applicant, programRow, index));
    }
    rows.sort((a, b) => {
        const pc = a.programId.localeCompare(b.programId);
        if (pc !== 0) return pc;
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, undefined, {
            sensitivity: 'base',
        });
    });
    return rows;
}

/**
 * Expected revenue + slots claimed for deposit-paid applicants only (not reserved names).
 * @param {object | null | undefined} programRow
 * @param {object[] | null | undefined} applicantsForProgram
 * @param {ReturnType<typeof buildProgramPaymentIndex>} [paymentIndex]
 * @returns {{ expectedCents: number, filledSlots: number, veteranSlotCount: number, avgPerSlotCents: number, depositCents: number, totalPerSlotCents: number, slotsClaimed: number }}
 */
export function computeProgramExpectedRevenueCents(programRow, applicantsForProgram, paymentIndex) {
    const { depositCents, totalPerSlotCents } = resolveProgramTotalPerSlotCents(programRow);
    const applicants = Array.isArray(applicantsForProgram) ? applicantsForProgram : [];
    const index = paymentIndex || buildProgramPaymentIndex({});
    const depositPaid = applicants.filter(
        (a) =>
            isApplicantFinanceActive(a) &&
            !getApplicantIsTester(String(a?.payloadJson || '')) &&
            isApplicantDepositSatisfied(a, index, programRow),
    );
    let expectedCents = 0;
    let veteranSlotCount = 0;
    for (const applicant of depositPaid) {
        const payloadJson = String(applicant.payloadJson || '');
        const category = getApplicantCategory(payloadJson);
        const summary = index.summariesByApplicationId.get(String(applicant.id || ''));
        const ownFlight =
            summary?.ownFlight === true || String(summary?.ownFlight || '').toLowerCase() === 'true';
        expectedCents += computeApplicantEffectiveTotalDueFromPayload(payloadJson, { category, ownFlight });
        if (category === 'veteran') veteranSlotCount += 1;
    }
    const filledSlots = depositPaid.length;
    const avgPerSlotCents = filledSlots > 0 ? Math.round(expectedCents / filledSlots) : 0;
    return {
        expectedCents,
        filledSlots,
        slotsClaimed: filledSlots,
        veteranSlotCount,
        avgPerSlotCents,
        depositCents,
        totalPerSlotCents,
    };
}

/**
 * Sum total payments + remaining balance for slot-secured (non-tester) applicants on a program.
 * @param {object | null | undefined} programRow
 * @param {object[] | null | undefined} applicantsForProgram
 * @param {ReturnType<typeof buildProgramPaymentIndex>} [paymentIndex]
 * @returns {{ totalPaymentsCents: number, remainingBalanceCents: number }}
 */
export function computeProgramCollectedPaymentsCents(programRow, applicantsForProgram, paymentIndex) {
    const applicants = Array.isArray(applicantsForProgram) ? applicantsForProgram : [];
    const index = paymentIndex || buildProgramPaymentIndex({});
    let totalPaymentsCents = 0;
    let remainingBalanceCents = 0;
    for (const applicant of applicants) {
        if (!applicant || typeof applicant !== 'object') continue;
        if (getApplicantIsTester(String(applicant.payloadJson || ''))) continue;
        if (!isApplicantFinanceActive(applicant)) continue;
        if (!isApplicantSlotSecured(applicant, index)) continue;
        const row = buildStudioProgramFinanceRow(applicant, programRow, index);
        totalPaymentsCents += normalizeCents(row.totalPaymentsCents);
        remainingBalanceCents += normalizeCents(row.remainingBalanceCents);
    }
    return { totalPaymentsCents, remainingBalanceCents };
}

/**
 * Expense subtotal for a program team member record.
 * @param {object | null | undefined} member
 */
export function teamMemberExpenseSubtotalCents(member) {
    if (!member || typeof member !== 'object') return 0;
    return (
        normalizeCents(member.ticketsCents) +
        normalizeCents(member.localTravelCents) +
        normalizeCents(member.partner1Cents) +
        normalizeCents(member.partner2Cents) +
        normalizeCents(member.partner3Cents)
    );
}

/**
 * Active promotions linked to a program (`target === "program"`).
 * @param {object[] | null | undefined} promotions
 * @param {string | null | undefined} programId
 */
export function programPromotionsForProgram(promotions, programId) {
    const pid = String(programId || '').trim();
    if (!pid) return [];
    return (Array.isArray(promotions) ? promotions : []).filter((p) => {
        if (!p || typeof p !== 'object') return false;
        if (String(p.status || 'active') === 'archived') return false;
        if (String(p.target || '') !== 'program') return false;
        return String(p.programId || '').trim() === pid;
    });
}

/**
 * Total promotion cost (cents) for a program.
 * @param {object[] | null | undefined} promotions
 * @param {string | null | undefined} programId
 */
export function programPromotionExpenseCents(promotions, programId) {
    let total = 0;
    for (const p of programPromotionsForProgram(promotions, programId)) {
        total += normalizeCents(p.costCents);
    }
    return total;
}

/**
 * Active owed entries on a team member.
 * @param {object | null | undefined} member
 */
export function activeTeamMemberOwedEntries(member) {
    return (Array.isArray(member?.owedEntries) ? member.owedEntries : []).filter(
        (e) => e && String(e.status || 'active') !== 'voided',
    );
}

/**
 * Active paid entries on a team member.
 * @param {object | null | undefined} member
 */
export function activeTeamMemberPaidEntries(member) {
    return (Array.isArray(member?.paidEntries) ? member.paidEntries : []).filter(
        (e) => e && String(e.status || 'active') !== 'voided',
    );
}

/**
 * @param {object | null | undefined} member
 */
export function sumTeamMemberOwedCents(member) {
    const entries = activeTeamMemberOwedEntries(member);
    if (entries.length) {
        return entries.reduce((sum, e) => sum + normalizeCents(e.amountCents), 0);
    }
    return normalizeCents(member?.amountOwedCents);
}

/**
 * @param {object | null | undefined} member
 */
export function sumTeamMemberPaidCents(member) {
    const entries = activeTeamMemberPaidEntries(member);
    if (entries.length) {
        return entries.reduce((sum, e) => sum + normalizeCents(e.amountCents), 0);
    }
    return normalizeCents(member?.amountPaidCents);
}

/**
 * Admin-funded paid total for a member (pays down Amount owed / Remaining).
 * Legacy `amountPaidCents` without entries is treated as admin-funded.
 * @param {object | null | undefined} member
 */
export function sumTeamMemberAdminFundedPaidCents(member) {
    const entries = activeTeamMemberPaidEntries(member);
    if (entries.length) {
        return entries.reduce((sum, e) => {
            if (paidEntryFundedBy(e) !== 'admin') return sum;
            return sum + normalizeCents(e.amountCents);
        }, 0);
    }
    return normalizeCents(member?.amountPaidCents);
}

/**
 * Balance still owed after admin-funded payments (program-funded pays do not reduce this).
 * @param {object | null | undefined} member
 */
export function teamMemberOutstandingOwedCents(member) {
    return Math.max(
        0,
        sumTeamMemberOwedCents(member) - sumTeamMemberAdminFundedPaidCents(member),
    );
}

/**
 * Sum of paid disbursement entries across a program team.
 * @param {object[] | null | undefined} teamMembers
 */
export function computeProgramPaidDisbursementsCents(teamMembers) {
    let total = 0;
    for (const m of Array.isArray(teamMembers) ? teamMembers : []) {
        if (!m || String(m.status || 'active') === 'removed') continue;
        total += sumTeamMemberPaidCents(m);
    }
    return total;
}

/**
 * @param {object | null | undefined} entry
 * @returns {'admin' | 'program'}
 */
export function paidEntryFundedBy(entry) {
    return String(entry?.fundedBy || '').toLowerCase() === 'program' ? 'program' : 'admin';
}

/**
 * Sum active paid-entry amounts for non-admin team members matching `predicate`.
 * @param {object[] | null | undefined} teamMembers
 * @param {(entry: object) => boolean} predicate
 */
function sumStaffPaidEntriesBy(teamMembers, predicate) {
    let total = 0;
    for (const m of Array.isArray(teamMembers) ? teamMembers : []) {
        if (!m || String(m.status || 'active') === 'removed') continue;
        if (String(m.kind || '') === 'admin') continue;
        for (const entry of activeTeamMemberPaidEntries(m)) {
            if (!predicate(entry)) continue;
            total += normalizeCents(entry.amountCents);
        }
    }
    return total;
}

/**
 * Paid disbursements to non-admin team members (any funder).
 * @param {object[] | null | undefined} teamMembers
 */
export function computeStaffPaidDisbursementsCents(teamMembers) {
    return sumStaffPaidEntriesBy(teamMembers, () => true);
}

/**
 * Paid disbursements funded by the program (reduce Total profit).
 * @param {object[] | null | undefined} teamMembers
 */
export function computeProgramFundedStaffPaidCents(teamMembers) {
    return sumStaffPaidEntriesBy(
        teamMembers,
        (entry) => paidEntryFundedBy(entry) === 'program',
    );
}

/**
 * Paid disbursements funded by the admin (reduce admin Program Payout).
 * @param {object[] | null | undefined} teamMembers
 */
export function computeAdminFundedStaffPaidCents(teamMembers) {
    return sumStaffPaidEntriesBy(
        teamMembers,
        (entry) => paidEntryFundedBy(entry) === 'admin',
    );
}

/**
 * Active paid ledger rows for non-admin members (for admin payout breakdown).
 * @param {object[] | null | undefined} teamMembers
 * @param {'all' | 'admin' | 'program'} [fundedByFilter]
 * @returns {{ member: object, entry: object }[]}
 */
export function listStaffPaidDisbursementEntries(teamMembers, fundedByFilter = 'all') {
    const filter = String(fundedByFilter || 'all').toLowerCase();
    /** @type {{ member: object, entry: object }[]} */
    const out = [];
    for (const m of Array.isArray(teamMembers) ? teamMembers : []) {
        if (!m || String(m.status || 'active') === 'removed') continue;
        if (String(m.kind || '') === 'admin') continue;
        for (const entry of activeTeamMemberPaidEntries(m)) {
            const fundedBy = paidEntryFundedBy(entry);
            if (filter === 'admin' && fundedBy !== 'admin') continue;
            if (filter === 'program' && fundedBy !== 'program') continue;
            out.push({ member: m, entry });
        }
    }
    return out;
}

/**
 * Outstanding remaining owed to non-admin staff (owed − paid, floored at 0).
 * @param {object[] | null | undefined} teamMembers
 */
export function computeStaffOutstandingOwedCents(teamMembers) {
    let total = 0;
    for (const m of Array.isArray(teamMembers) ? teamMembers : []) {
        if (!m || String(m.status || 'active') === 'removed') continue;
        if (String(m.kind || '') === 'admin') continue;
        total += teamMemberDisbursementRemainingCents(m);
    }
    return total;
}

/**
 * Admin net program payout = projected share − admin-funded staff paid − outstanding staff owed.
 * Program-funded staff payments reduce Total profit instead.
 * @param {object | null | undefined} adminMember
 * @param {number} programProfitCents
 * @param {object[] | null | undefined} teamMembers
 */
export function computeAdminNetProgramPayoutCents(adminMember, programProfitCents, teamMembers) {
    const pct = Math.max(0, Math.min(100, Number(adminMember?.payoutPercent) || 0));
    const gross = computeProjectedPayoutCents(programProfitCents, pct);
    const adminFundedPaid = computeAdminFundedStaffPaidCents(teamMembers);
    const staffOutstanding = computeStaffOutstandingOwedCents(teamMembers);
    return Math.max(0, gross - adminFundedPaid - staffOutstanding);
}

/**
 * Base expenses = per-applicant costs (fees + tickets + travel + partners) + team member expenses + program-funded staff paid.
 * @param {object | null | undefined} programRow
 * @param {object[] | null | undefined} applicantsForProgram
 * @param {ReturnType<typeof buildProgramPaymentIndex>} [paymentIndex]
 * @param {object[] | null | undefined} [teamMembers]
 */
export function computeProgramBaseExpenseCents(
    programRow,
    applicantsForProgram,
    paymentIndex,
    teamMembers,
) {
    const applicants = Array.isArray(applicantsForProgram) ? applicantsForProgram : [];
    const index = paymentIndex || buildProgramPaymentIndex({});
    let applicantExpenses = 0;
    for (const applicant of applicants) {
        if (!applicant || typeof applicant !== 'object') continue;
        if (getApplicantIsTester(String(applicant.payloadJson || ''))) continue;
        if (!isApplicantFinanceActive(applicant)) continue;
        if (!isApplicantSlotSecured(applicant, index)) continue;
        const row = buildStudioProgramFinanceRow(applicant, programRow, index);
        applicantExpenses += normalizeCents(row.subtotalCents);
    }
    let teamExpenses = 0;
    for (const m of Array.isArray(teamMembers) ? teamMembers : []) {
        if (!m || String(m.status || 'active') === 'removed') continue;
        teamExpenses += teamMemberExpenseSubtotalCents(m);
    }
    const programFundedPaid = computeProgramFundedStaffPaidCents(teamMembers);
    return applicantExpenses + teamExpenses + programFundedPaid;
}

/**
 * Program profit = applicant profits − team expenses − promotions − program-funded staff paid.
 * Admin-funded staff payments reduce the admin Program Payout instead.
 * @param {object | null | undefined} programRow
 * @param {object[] | null | undefined} applicantsForProgram
 * @param {ReturnType<typeof buildProgramPaymentIndex>} [paymentIndex]
 * @param {object[] | null | undefined} [teamMembers]
 * @param {object[] | null | undefined} [promotions]
 */
export function computeProgramProfitCents(
    programRow,
    applicantsForProgram,
    paymentIndex,
    teamMembers,
    promotions,
) {
    const applicants = Array.isArray(applicantsForProgram) ? applicantsForProgram : [];
    const index = paymentIndex || buildProgramPaymentIndex({});
    let applicantProfit = 0;
    for (const applicant of applicants) {
        if (!applicant || typeof applicant !== 'object') continue;
        if (getApplicantIsTester(String(applicant.payloadJson || ''))) continue;
        if (!isApplicantFinanceActive(applicant)) continue;
        if (!isApplicantSlotSecured(applicant, index)) continue;
        const row = buildStudioProgramFinanceRow(applicant, programRow, index);
        applicantProfit += normalizeCents(row.profitCents);
    }
    let teamExpenses = 0;
    for (const m of Array.isArray(teamMembers) ? teamMembers : []) {
        if (!m || String(m.status || 'active') === 'removed') continue;
        teamExpenses += teamMemberExpenseSubtotalCents(m);
    }
    const promoExpenses = programPromotionExpenseCents(
        promotions,
        programRow?.id ?? programRow?.programId,
    );
    const programFundedPaid = computeProgramFundedStaffPaidCents(teamMembers);
    return applicantProfit - teamExpenses - promoExpenses - programFundedPaid;
}

/**
 * @param {number} programProfitCents
 * @param {number} payoutPercent 0–100
 */
export function computeProjectedPayoutCents(programProfitCents, payoutPercent) {
    const profit = Math.max(0, normalizeCents(programProfitCents));
    const pct = Math.max(0, Math.min(100, Number(payoutPercent) || 0));
    return Math.round((profit * pct) / 100);
}

/**
 * Remaining disbursement debt for a team member (owed − admin-funded paid).
 * Program-funded payments do not pay down this balance.
 * @param {object | null | undefined} member
 */
export function teamMemberDisbursementRemainingCents(member) {
    return teamMemberOutstandingOwedCents(member);
}

/**
 * Remaining when optionally including program payout estimate.
 * Only admin-funded payments reduce the owed balance.
 * @param {object | null | undefined} member
 * @param {{ includeProgramPayout?: boolean, programPayoutCents?: number }} [opts]
 */
export function teamMemberDisbursementRemainingWithProgramCents(member, opts = {}) {
    const owed = sumTeamMemberOwedCents(member);
    const adminPaid = sumTeamMemberAdminFundedPaidCents(member);
    const payout = opts.includeProgramPayout ? normalizeCents(opts.programPayoutCents) : 0;
    return Math.max(0, owed + payout - adminPaid);
}
