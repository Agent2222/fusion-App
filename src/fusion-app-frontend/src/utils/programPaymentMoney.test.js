import { describe, it, expect, vi } from 'vitest';

vi.mock('./studioArtistPrograms.js', () => ({
    programRowConfirmedArtistNames: () => [],
    programRowConfirmedSlotState: () => ({ reserved: 0, confirmed: 0, total: 0 }),
}));

import {
    buildProgramPaymentIndex,
    buildStudioProgramFinanceRow,
    buildStudioProgramFinanceRows,
    computeApplicantEffectiveTotalDueCents,
    computeFinanceProgramTableTotals,
    parseProgramFinancePartnerDefaults,
    resolveApplicantPartnerCents,
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
    programPromotionsForProgram,
    sortFinancePromotionsByDateDesc,
    sumTeamMemberOwedCents,
    sumTeamMemberPaidCents,
    teamMemberDisbursementRemainingCents,
    teamMemberDisbursementRemainingWithProgramCents,
    teamMemberOutstandingOwedCents,
    isApplicantDepositPaid,
    isApplicantDepositSatisfied,
    isApplicantDepositWaived,
    isApplicantSlotSecured,
    resolveMemberChargeableDepositCents,
    resolveMemberProgramTotalDueCents,
    PROGRAM_DEFAULT_DEPOSIT_CENTS,
    PROGRAM_RESIDENCY_BASE_TOTAL_CENTS,
    PROGRAM_VETERAN_DISCOUNT_CENTS,
} from './programPaymentMoney.js';
import { mergeApplicantStaffFields } from './studioPlainForms.js';

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

describe('resolveMemberProgramTotalDueCents', () => {
    it('prefers summary total over list price', () => {
        expect(
            resolveMemberProgramTotalDueCents({
                summaryTotalDueCents: 250000,
                category: 'general',
            }),
        ).toBe(250000);
    });

    it('uses approval total when no summary', () => {
        expect(
            resolveMemberProgramTotalDueCents({
                approvalTotalDueCents: 320000,
                category: 'general',
            }),
        ).toBe(320000);
    });

    it('computes partial sponsorship off list price for My Payments', () => {
        expect(
            resolveMemberProgramTotalDueCents({
                category: 'general',
                ownFlight: false,
                sponsorshipMode: 'partial',
                sponsoredCreditCents: 150000,
            }),
        ).toBe(PROGRAM_RESIDENCY_BASE_TOTAL_CENTS - 150000);
    });

    it('computes percent sponsorship when credit missing', () => {
        expect(
            resolveMemberProgramTotalDueCents({
                category: 'general',
                ownFlight: false,
                sponsorshipMode: 'partial',
                sponsoredPercent: 20,
            }),
        ).toBe(PROGRAM_RESIDENCY_BASE_TOTAL_CENTS - Math.round((PROGRAM_RESIDENCY_BASE_TOTAL_CENTS * 20) / 100));
    });
});

describe('resolveMemberChargeableDepositCents', () => {
    it('caps deposit at effective total', () => {
        expect(resolveMemberChargeableDepositCents(PROGRAM_DEFAULT_DEPOSIT_CENTS, 50000)).toBe(50000);
    });

    it('keeps full deposit when total is higher', () => {
        expect(resolveMemberChargeableDepositCents(PROGRAM_DEFAULT_DEPOSIT_CENTS, 500000)).toBe(
            PROGRAM_DEFAULT_DEPOSIT_CENTS,
        );
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

describe('program partner defaults and applicant overrides', () => {
    const programRow = {
        id: 'prog-1',
        localesJson: JSON.stringify({
            en: {},
            ja: {},
            finance: { partner1Cents: 15000, partner2Cents: 25000, partner3Cents: 0 },
        }),
    };

    it('reads partner defaults from localesJson.finance', () => {
        expect(parseProgramFinancePartnerDefaults(programRow)).toEqual({
            partner1Cents: 15000,
            partner2Cents: 25000,
            partner3Cents: 0,
        });
    });

    it('uses program defaults unless the applicant payload overrides a slot', () => {
        expect(resolveApplicantPartnerCents('{}', programRow, 1)).toBe(15000);
        expect(resolveApplicantPartnerCents('{"staffApplicantPartner1Cents":0}', programRow, 1)).toBe(0);
        expect(resolveApplicantPartnerCents('{"staffApplicantPartner2Cents":40000}', programRow, 2)).toBe(40000);
        expect(resolveApplicantPartnerCents('{}', programRow, 3)).toBe(0);
    });

    it('can clear an override back to the program default', () => {
        const withOverride = mergeApplicantStaffFields(
            {
                internalNotes: '',
                manualDepositSubmitted: false,
                partner1Cents: 0,
            },
            '{}',
        );
        expect(resolveApplicantPartnerCents(withOverride, programRow, 1)).toBe(0);
        const cleared = mergeApplicantStaffFields(
            {
                internalNotes: '',
                manualDepositSubmitted: false,
                partner1Cents: null,
            },
            withOverride,
        );
        expect(resolveApplicantPartnerCents(cleared, programRow, 1)).toBe(15000);
    });
});

describe('finance table phantom rows and totals', () => {
    const depositIndex = buildProgramPaymentIndex({
        summaries: [
            {
                applicationId: 'gone',
                depositStatus: 'paid',
                totalPaidCents: 100000,
                depositAmountCents: 100000,
            },
            {
                applicationId: 'stay',
                depositStatus: 'paid',
                totalPaidCents: 200000,
                depositAmountCents: 100000,
            },
        ],
        ledger: [
            { applicationId: 'gone', paymentType: 'deposit', status: 'succeeded', amountCents: 100000 },
            { applicationId: 'stay', paymentType: 'deposit', status: 'succeeded', amountCents: 200000 },
        ],
    });

    it('includes a deposit-only phantom row for pulled-out applicants who paid', () => {
        const rows = buildStudioProgramFinanceRows(
            [
                {
                    id: 'gone',
                    programId: 'prog-1',
                    status: 'pulledOut',
                    fullName: 'Gone Person',
                    payloadJson: JSON.stringify({ firstName: 'Gone', lastName: 'Person' }),
                },
                {
                    id: 'stay',
                    programId: 'prog-1',
                    status: 'accepted',
                    fullName: 'Stay Person',
                    payloadJson: JSON.stringify({ firstName: 'Stay', lastName: 'Person' }),
                },
            ],
            [{ id: 'prog-1', studioStatus: 'active' }],
            depositIndex,
        );
        expect(rows.map((r) => r.applicantId)).toEqual(['stay', 'gone']);
        const phantom = rows.find((r) => r.applicantId === 'gone');
        expect(phantom?.phantom).toBe(true);
        expect(phantom?.totalPaymentsCents).toBe(100000);
        expect(phantom?.profitCents).toBe(100000);
        expect(phantom?.partner1Cents).toBe(0);
        expect(phantom?.ticketsCents).toBe(0);
    });

    it('sums applicant and staff columns and keeps staff after applicants', () => {
        const applicantRows = [
            {
                depositPaid: true,
                depositAmountCents: 100000,
                planActive: true,
                planPriceCents: 50000,
                totalPaymentsCents: 200000,
                paymentFeesCents: 1000,
                ticketsCents: 2000,
                localTravelCents: 3000,
                partner1Cents: 4000,
                partner2Cents: 0,
                partner3Cents: 0,
                subtotalCents: 10000,
                remainingBalanceCents: 300000,
                profitCents: 190000,
            },
            {
                phantom: true,
                depositPaid: true,
                depositAmountCents: 100000,
                totalPaymentsCents: 100000,
                paymentFeesCents: 0,
                ticketsCents: 0,
                localTravelCents: 0,
                partner1Cents: 0,
                partner2Cents: 0,
                partner3Cents: 0,
                subtotalCents: 0,
                remainingBalanceCents: 0,
                profitCents: 100000,
            },
        ];
        const team = [
            {
                ticketsCents: 5000,
                localTravelCents: 1000,
                partner1Cents: 2000,
                partner2Cents: 0,
                partner3Cents: 0,
                payoutPercent: 10,
                status: 'active',
            },
        ];
        const totals = computeFinanceProgramTableTotals(applicantRows, team, 200000);
        expect(totals.depositCents).toBe(200000);
        expect(totals.totalPaymentsCents).toBe(300000);
        expect(totals.ticketsCents).toBe(7000);
        expect(totals.partner1Cents).toBe(6000);
        expect(totals.subtotalCents).toBe(18000);
        expect(totals.profitCents).toBe(282000);
        expect(totals.projectedPayoutCents).toBe(20000);
    });
});

describe('finance promotion date order', () => {
    it('sorts most recent start date first', () => {
        const sorted = sortFinancePromotionsByDateDesc([
            { id: 'old', startIso: '2025-01-01' },
            { id: 'new', startIso: '2026-08-15' },
            { id: 'mid', startIso: '2026-03-01' },
        ]);
        expect(sorted.map((p) => p.id)).toEqual(['new', 'mid', 'old']);
    });

    it('lists program promotions newest first and skips archived', () => {
        const rows = programPromotionsForProgram(
            [
                { id: 'a', target: 'program', programId: 'p1', startIso: '2024-06-01', status: 'active' },
                { id: 'b', target: 'program', programId: 'p1', startIso: '2026-01-10', status: 'active' },
                { id: 'c', target: 'program', programId: 'p1', startIso: '2025-12-01', status: 'archived' },
                { id: 'd', target: 'program', programId: 'other', startIso: '2026-09-01', status: 'active' },
            ],
            'p1',
        );
        expect(rows.map((p) => p.id)).toEqual(['b', 'a']);
    });
});
