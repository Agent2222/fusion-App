import { describe, it, expect, vi } from 'vitest';

vi.mock('./studioArtistPrograms.js', () => ({
    programRowConfirmedArtistNames: () => [],
    programRowConfirmedSlotState: () => ({ reserved: 0, confirmed: 0, total: 0 }),
}));

import {
    buildProgramPaymentIndex,
    buildStudioProgramFinanceRow,
    computeApplicantEffectiveTotalDueCents,
    computeApplicantEffectiveTotalDueFromPayload,
    computeProgramExpectedRevenueCents,
    computeProgramCollectedPaymentsCents,
    computeProgramProfitCents,
    computeProgramPaidDisbursementsCents,
    computeStaffPaidDisbursementsCents,
    computeAdminFundedStaffPaidCents,
    computeProgramFundedStaffPaidCents,
    computeAdminNetProgramPayoutCents,
    computeProjectedPayoutCents,
    programPromotionExpenseCents,
    sumTeamMemberOwedCents,
    sumTeamMemberPaidCents,
    teamMemberOutstandingOwedCents,
    teamMemberDisbursementRemainingCents,
    teamMemberDisbursementRemainingWithProgramCents,
    isApplicantDepositPaid,
    isApplicantDepositSatisfied,
    isApplicantDepositWaived,
    isApplicantSlotSecured,
    PROGRAM_RESIDENCY_BASE_TOTAL_CENTS,
    PROGRAM_VETERAN_DISCOUNT_CENTS,
} from './programPaymentMoney.js';

describe('computeApplicantEffectiveTotalDueCents', () => {
    it('uses list price by default', () => {
        expect(
            computeApplicantEffectiveTotalDueCents({
                category: 'general',
                ownFlight: false,
            }),
        ).toBe(PROGRAM_RESIDENCY_BASE_TOTAL_CENTS);
    });

    it('applies veteran discount only on list price', () => {
        expect(
            computeApplicantEffectiveTotalDueCents({
                category: 'veteran',
                ownFlight: false,
            }),
        ).toBe(PROGRAM_RESIDENCY_BASE_TOTAL_CENTS - PROGRAM_VETERAN_DISCOUNT_CENTS);
    });

    it('special price overrides list (including veteran)', () => {
        expect(
            computeApplicantEffectiveTotalDueCents({
                category: 'veteran',
                ownFlight: false,
                specialProgramTotalCents: 350000,
            }),
        ).toBe(350000);
    });

    it('full sponsorship is zero', () => {
        expect(
            computeApplicantEffectiveTotalDueCents({
                category: 'general',
                sponsorshipMode: 'full',
                specialProgramTotalCents: 400000,
            }),
        ).toBe(0);
    });

    it('partial sponsorship subtracts credit', () => {
        expect(
            computeApplicantEffectiveTotalDueCents({
                category: 'general',
                sponsorshipMode: 'partial',
                specialProgramTotalCents: 400000,
                sponsoredCreditCents: 50000,
            }),
        ).toBe(350000);
    });

    it('partial sponsorship never goes negative', () => {
        expect(
            computeApplicantEffectiveTotalDueCents({
                category: 'general',
                sponsorshipMode: 'partial',
                sponsoredCreditCents: 9_000_000,
            }),
        ).toBe(0);
    });
});

describe('computeApplicantEffectiveTotalDueFromPayload', () => {
    it('computes percent credit when cents missing', () => {
        const payload = JSON.stringify({
            sponsorshipMode: 'partial',
            sponsoredPercent: 20,
            specialProgramTotalCents: 500000,
        });
        expect(computeApplicantEffectiveTotalDueFromPayload(payload)).toBe(400000);
    });
});

describe('isApplicantDepositPaid + expected revenue', () => {
    it('treats fully sponsored as deposit waived (not money received)', () => {
        const applicant = {
            id: 'sponsored-1',
            payloadJson: JSON.stringify({ sponsorshipMode: 'full' }),
        };
        const index = buildProgramPaymentIndex({
            summaries: [
                {
                    applicationId: 'sponsored-1',
                    depositStatus: 'paid',
                    totalPaidCents: 100000,
                    depositAmountCents: 100000,
                },
            ],
            ledger: [],
        });
        expect(isApplicantDepositWaived(applicant.payloadJson)).toBe(true);
        expect(isApplicantDepositPaid(applicant, index)).toBe(false);
        expect(isApplicantDepositSatisfied(applicant, index)).toBe(true);
        expect(isApplicantSlotSecured(applicant, index)).toBe(true);
        const row = buildStudioProgramFinanceRow(applicant, {}, index);
        expect(row.depositWaived).toBe(true);
        expect(row.depositPaid).toBe(false);
        expect(row.depositAmountCents).toBe(0);
        expect(row.totalPaymentsCents).toBe(0);
        expect(row.profitCents).toBe(0);
    });

    it('treats sponsored category as deposit waived', () => {
        const applicant = {
            id: 'cat-sponsored',
            payloadJson: JSON.stringify({ staffApplicantCategory: 'sponsored' }),
        };
        const index = buildProgramPaymentIndex({
            summaries: [
                {
                    applicationId: 'cat-sponsored',
                    depositStatus: 'paid',
                    totalPaidCents: 100000,
                    depositAmountCents: 100000,
                },
            ],
            ledger: [],
        });
        expect(isApplicantDepositWaived(applicant.payloadJson)).toBe(true);
        const row = buildStudioProgramFinanceRow(applicant, {}, index);
        expect(row.depositWaived).toBe(true);
        expect(row.depositPaid).toBe(false);
        expect(row.depositAmountCents).toBe(0);
        expect(row.totalPaymentsCents).toBe(0);
    });

    it('ignores checkbox-only manual deposit', () => {
        const applicant = {
            id: 'app-1',
            payloadJson: JSON.stringify({ manualDepositSubmitted: true }),
        };
        const index = buildProgramPaymentIndex({ summaries: [], ledger: [] });
        expect(isApplicantDepositPaid(applicant, index)).toBe(false);
    });

    it('counts summary paid deposit', () => {
        const applicant = { id: 'app-1', payloadJson: '{}' };
        const index = buildProgramPaymentIndex({
            summaries: [{ applicationId: 'app-1', depositStatus: 'paid', depositAmountCents: 100000 }],
            ledger: [],
        });
        expect(isApplicantDepositPaid(applicant, index)).toBe(true);
    });

    it('sums effective dues for deposit-paid applicants only', () => {
        const applicants = [
            {
                id: 'paid-full',
                payloadJson: JSON.stringify({ sponsorshipMode: 'full' }),
            },
            {
                id: 'paid-special',
                payloadJson: JSON.stringify({ specialProgramTotalCents: 300000 }),
            },
            {
                id: 'unpaid',
                payloadJson: JSON.stringify({ specialProgramTotalCents: 999999 }),
            },
            {
                id: 'tester',
                payloadJson: JSON.stringify({
                    staffApplicantIsTester: true,
                    specialProgramTotalCents: 300000,
                }),
            },
        ];
        const index = buildProgramPaymentIndex({
            summaries: [
                { applicationId: 'paid-full', depositStatus: 'paid' },
                { applicationId: 'paid-special', depositStatus: 'paid_full' },
                { applicationId: 'tester', depositStatus: 'paid' },
            ],
            ledger: [],
        });
        const result = computeProgramExpectedRevenueCents({}, applicants, index);
        expect(result.slotsClaimed).toBe(2);
        expect(result.expectedCents).toBe(300000);
    });

    it('sums total payments and remaining for slot-secured applicants', () => {
        const applicants = [
            {
                id: 'a1',
                payloadJson: JSON.stringify({ specialProgramTotalCents: 500000 }),
            },
            {
                id: 'a2',
                payloadJson: JSON.stringify({ sponsorshipMode: 'full' }),
            },
        ];
        const index = buildProgramPaymentIndex({
            summaries: [
                {
                    applicationId: 'a1',
                    depositStatus: 'paid',
                    totalPaidCents: 100000,
                    depositAmountCents: 100000,
                },
            ],
            ledger: [
                {
                    applicationId: 'a1',
                    paymentType: 'deposit',
                    status: 'succeeded',
                    amountCents: 100000,
                },
            ],
        });
        const totals = computeProgramCollectedPaymentsCents({}, applicants, index);
        expect(totals.totalPaymentsCents).toBe(100000);
        // a1 remaining 400000 + a2 fully sponsored remaining 0
        expect(totals.remainingBalanceCents).toBe(400000);
    });
});

describe('program profit and projected payout', () => {
    it('computes projected payout from percent of profit', () => {
        expect(computeProjectedPayoutCents(100000, 25)).toBe(25000);
        expect(computeProjectedPayoutCents(-5000, 50)).toBe(0);
        expect(computeProjectedPayoutCents(100000, 150)).toBe(100000);
    });

    it('subtracts team expenses from applicant profits', () => {
        const applicants = [
            {
                id: 'a1',
                payloadJson: JSON.stringify({ specialProgramTotalCents: 500000 }),
            },
        ];
        const index = buildProgramPaymentIndex({
            summaries: [
                {
                    applicationId: 'a1',
                    depositStatus: 'paid',
                    totalPaidCents: 200000,
                    depositAmountCents: 100000,
                },
            ],
            ledger: [
                {
                    applicationId: 'a1',
                    paymentType: 'deposit',
                    status: 'succeeded',
                    amountCents: 200000,
                },
            ],
        });
        const team = [{ ticketsCents: 10000, localTravelCents: 5000, partner1Cents: 0, partner2Cents: 0, partner3Cents: 0 }];
        const profit = computeProgramProfitCents({ id: 'prog-1' }, applicants, index, team);
        // applicant profit 200000 - fees0 - team 15000
        expect(profit).toBe(185000);
    });

    it('subtracts program-linked promotions from profit', () => {
        const applicants = [
            {
                id: 'a1',
                payloadJson: JSON.stringify({ specialProgramTotalCents: 500000 }),
            },
        ];
        const index = buildProgramPaymentIndex({
            summaries: [
                {
                    applicationId: 'a1',
                    depositStatus: 'paid',
                    totalPaidCents: 200000,
                    depositAmountCents: 100000,
                },
            ],
            ledger: [
                {
                    applicationId: 'a1',
                    paymentType: 'deposit',
                    status: 'succeeded',
                    amountCents: 200000,
                },
            ],
        });
        const promos = [
            { target: 'program', programId: 'prog-1', costCents: 25000, status: 'active' },
            { target: 'platform', programId: '', costCents: 99999, status: 'active' },
            { target: 'program', programId: 'other', costCents: 5000, status: 'active' },
        ];
        expect(programPromotionExpenseCents(promos, 'prog-1')).toBe(25000);
        const profit = computeProgramProfitCents({ id: 'prog-1' }, applicants, index, [], promos);
        // 200000 - 25000 promo
        expect(profit).toBe(175000);
    });

    it('computes disbursement remaining as max(0, owed − paid)', () => {
        expect(
            teamMemberDisbursementRemainingCents({ amountOwedCents: 10000, amountPaidCents: 2500 }),
        ).toBe(7500);
        expect(
            teamMemberDisbursementRemainingCents({ amountOwedCents: 1000, amountPaidCents: 5000 }),
        ).toBe(0);
    });

    it('adds program payout to remaining when include is on', () => {
        const member = { amountOwedCents: 10000, amountPaidCents: 2500 };
        expect(
            teamMemberDisbursementRemainingWithProgramCents(member, {
                includeProgramPayout: false,
                programPayoutCents: 4000,
            }),
        ).toBe(7500);
        expect(
            teamMemberDisbursementRemainingWithProgramCents(member, {
                includeProgramPayout: true,
                programPayoutCents: 4000,
            }),
        ).toBe(11500);
    });

    it('sums owed/paid from entry ledgers and subtracts paid disbursements from profit', () => {
        const member = {
            status: 'active',
            owedEntries: [
                { amountCents: 4000, status: 'active' },
                { amountCents: 1000, status: 'voided' },
                { amountCents: 1500, status: 'active' },
            ],
            paidEntries: [
                { amountCents: 2000, status: 'active', fundedBy: 'admin' },
                { amountCents: 500, status: 'active', fundedBy: 'program' },
            ],
            amountOwedCents: 99999,
            amountPaidCents: 99999,
        };
        expect(sumTeamMemberOwedCents(member)).toBe(5500);
        expect(sumTeamMemberPaidCents(member)).toBe(2500);
        // Admin-funded $20 pays down owed; program-funded $5 does not
        expect(teamMemberOutstandingOwedCents(member)).toBe(3500);
        expect(teamMemberDisbursementRemainingCents(member)).toBe(3500);
        expect(computeProgramPaidDisbursementsCents([member])).toBe(2500);

        const applicants = [
            {
                id: 'a1',
                payloadJson: JSON.stringify({ specialProgramTotalCents: 500000 }),
            },
        ];
        const index = buildProgramPaymentIndex({
            summaries: [
                {
                    applicationId: 'a1',
                    depositStatus: 'paid',
                    totalPaidCents: 200000,
                    depositAmountCents: 100000,
                },
            ],
            ledger: [
                {
                    applicationId: 'a1',
                    paymentType: 'deposit',
                    status: 'succeeded',
                    amountCents: 200000,
                },
            ],
        });
        // Only program-funded paid reduces Total profit (admin-funded does not)
        expect(computeProgramFundedStaffPaidCents([member])).toBe(500);
        expect(computeAdminFundedStaffPaidCents([member])).toBe(2000);
        expect(computeProgramProfitCents({ id: 'prog-1' }, applicants, index, [member], [])).toBe(
            199500,
        );
    });

    it('deducts admin-funded staff paid and outstanding owed from admin program payout only', () => {
        const admin = { kind: 'admin', payoutPercent: 50, paidEntries: [] };
        const staff = {
            kind: 'staff',
            owedEntries: [{ amountCents: 8000, status: 'active' }],
            paidEntries: [
                {
                    amountCents: 3000,
                    status: 'active',
                    name: 'Travel reimburse',
                    fundedBy: 'admin',
                },
                { amountCents: 2000, status: 'active', name: 'Prorated', fundedBy: 'program' },
                { amountCents: 1000, status: 'voided', fundedBy: 'admin' },
            ],
        };
        expect(computeStaffPaidDisbursementsCents([admin, staff])).toBe(5000);
        expect(computeAdminFundedStaffPaidCents([admin, staff])).toBe(3000);
        expect(computeProgramFundedStaffPaidCents([admin, staff])).toBe(2000);
        // outstanding owed = 8000 − 3000 admin-funded = 5000 (program-funded does not reduce)
        expect(teamMemberOutstandingOwedCents(staff)).toBe(5000);
        // 50% of 100000 = 50000 − 3000 admin-funded paid − 5000 outstanding
        expect(computeAdminNetProgramPayoutCents(admin, 100000, [admin, staff])).toBe(42000);
        expect(computeProjectedPayoutCents(100000, 50)).toBe(50000);
    });
});
