/** Shared program residency payment amounts (USD cents) and display helpers. */

import {
    applicantDisplayNamesFromPayload,
    getApplicantCategory,
    getApplicantFlightCostCents,
    getApplicantIsTester,
    getApplicantLocalTravelCostCents,
    getApplicantManualDepositSubmitted,
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
 * @returns {'stripe' | 'staff'}
 */
export function ledgerRowSource(row) {
    const type = String(row?.paymentType || '');
    return type === 'staff_manual' || type === 'staff_fee' || type === 'staff_travel' ? 'staff' : 'stripe';
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
 * @param {object} applicant
 * @param {object[] | null | undefined} ledger
 * @param {object | null | undefined} summary
 * @param {number} depositAmountCents
 */
export function computeEffectiveTotalPaymentsCents(applicant, ledger, summary, depositAmountCents) {
    const ledgerTotal = sumLedgerPaymentsCents(ledger);
    const payloadJson = String(applicant?.payloadJson || '');
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
    if (getApplicantManualDepositSubmitted(payloadJson)) return true;
    const appId = String(applicant.id || '').trim();
    const summary = index.summariesByApplicationId.get(appId);
    const depositStatus = String(summary?.depositStatus || '');
    if (depositStatus === 'paid' || depositStatus === 'paid_full') return true;
    const ledger = index.ledgerByApplicationId.get(appId) || [];
    return ledger.some((row) => {
        const type = String(row?.paymentType || '');
        return (
            isLedgerRowSucceeded(row) &&
            (type === 'deposit' || type === 'full_payment' || type === 'staff_manual')
        );
    });
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
    const category = getApplicantCategory(String(applicant?.payloadJson || ''));
    const priceCategoryCents = computeMemberProgramTotalDueCents({ category, ownFlight });
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
    const depositAmountCents = resolveApplicantDepositAmountCents(ctx.summary, programRow);
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
    return {
        applicantId: appId,
        programId,
        email: String(applicant?.email || '').trim(),
        firstName: names.firstName,
        lastName: names.lastName,
        discipline: names.discipline,
        category: ctx.category,
        priceCategoryCents: ctx.priceCategoryCents,
        depositAmountCents,
        slotSecured: isApplicantSlotSecured(applicant, index),
        depositPaid: isApplicantSlotSecured(applicant, index),
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
 * Sum expected revenue for slot-secured applicants only.
 * @param {object | null | undefined} programRow
 * @param {object[] | null | undefined} applicantsForProgram
 * @param {ReturnType<typeof buildProgramPaymentIndex>} [paymentIndex]
 * @returns {{ expectedCents: number, filledSlots: number, veteranSlotCount: number, avgPerSlotCents: number, depositCents: number, totalPerSlotCents: number }}
 */
export function computeProgramExpectedRevenueCents(programRow, applicantsForProgram, paymentIndex) {
    const { depositCents, totalPerSlotCents } = resolveProgramTotalPerSlotCents(programRow);
    const applicants = Array.isArray(applicantsForProgram) ? applicantsForProgram : [];
    const index = paymentIndex || buildProgramPaymentIndex({});
    const secured = applicants.filter((a) => isApplicantSlotSecured(a, index));
    let expectedCents = 0;
    let veteranSlotCount = 0;
    for (const applicant of secured) {
        const category = getApplicantCategory(String(applicant.payloadJson || ''));
        const summary = index.summariesByApplicationId.get(String(applicant.id || ''));
        const ownFlight =
            summary?.ownFlight === true || String(summary?.ownFlight || '').toLowerCase() === 'true';
        expectedCents += computeMemberProgramTotalDueCents({ category, ownFlight });
        if (category === 'veteran') veteranSlotCount += 1;
    }
    const filledSlots = secured.length;
    const avgPerSlotCents = filledSlots > 0 ? Math.round(expectedCents / filledSlots) : 0;
    return {
        expectedCents,
        filledSlots,
        veteranSlotCount,
        avgPerSlotCents,
        depositCents,
        totalPerSlotCents,
    };
}
