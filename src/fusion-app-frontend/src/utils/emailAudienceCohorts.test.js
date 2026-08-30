import { describe, expect, it, vi } from 'vitest';

vi.mock('./database.js', () => ({
    adminListAccountContactsForStudio: async () => [],
    getAccountsForStudio: async () => [],
    getApplicants: async () => [],
    getArtistsForStudio: async () => [],
    getCurrentProgramSeason: async () => '',
    getProgramDisplayNameFromRow: (p) => String(p?.id || ''),
    getPrograms: async () => [],
    getSubscribersForEmailStudio: async () => [],
    listProgramAwardEntriesStudio: async () => [],
}));

import {
    COHORT_ACTIVE_MEMBERS,
    COHORT_CURRENT_PROGRAM,
    isActiveMemberAccount,
    isCurrentProgramCohortApplicant,
    resolveCohortEmails,
    resolveCurrentProgramIds,
} from './emailAudienceCohorts.js';

function emptyCtx(over = {}) {
    return {
        accounts: [],
        contactsByPrincipal: new Map(),
        artists: [],
        artistEmailById: new Map(),
        artistIdByName: new Map(),
        programs: [],
        applicants: [],
        subscribers: [],
        veteranArtistIds: new Set(),
        currentProgramSeason: '',
        ...over,
    };
}

describe('emailAudienceCohorts', () => {
    it('treats manual exempt accounts as active memberships', () => {
        expect(isActiveMemberAccount({ membershipExemptManual: true })).toBe(true);
        expect(
            isActiveMemberAccount({
                membershipExemptManual: true,
                stripeSubscriptionStatus: 'canceled',
            }),
        ).toBe(true);
        expect(isActiveMemberAccount({ stripeSubscriptionStatus: 'active' })).toBe(true);
        expect(isActiveMemberAccount({ stripeSubscriptionStatus: 'canceled' })).toBe(false);
    });

    it('includes exempt members in the active-memberships batch', async () => {
        const { emails } = await resolveCohortEmails(COHORT_ACTIVE_MEMBERS, {
            ctx: emptyCtx({
                accounts: [
                    {
                        principal: 'aaa',
                        membershipExemptManual: true,
                        linkedArtistId: 'a1',
                    },
                    {
                        principal: 'bbb',
                        stripeSubscriptionStatus: 'active',
                    },
                    {
                        principal: 'ccc',
                        stripeSubscriptionStatus: 'canceled',
                    },
                ],
                contactsByPrincipal: new Map([
                    ['aaa', 'exempt@example.com'],
                    ['bbb', 'paid@example.com'],
                    ['ccc', 'lapsed@example.com'],
                ]),
            }),
        });
        expect(emails.sort()).toEqual(['exempt@example.com', 'paid@example.com']);
    });

    it('resolves current program from season, then open/full/active fallback', () => {
        const programs = [
            { id: 'fusionKaga', studioStatus: 'open' },
            { id: 'fusionTokyo2026', studioStatus: 'comingUp' },
            { id: 'old', studioStatus: 'completed' },
        ];
        expect([...resolveCurrentProgramIds(programs, 'fusionKaga')]).toEqual(['fusionKaga']);
        expect([...resolveCurrentProgramIds(programs, '')].sort()).toEqual(['fusionKaga']);
        expect([...resolveCurrentProgramIds(programs, 'missing-season')]).toEqual(['fusionKaga']);
    });

    it('includes accepted and slot-secured applicants on the current program', async () => {
        expect(
            isCurrentProgramCohortApplicant({
                status: 'accepted',
                payloadJson: '{}',
            }),
        ).toBe(true);
        expect(
            isCurrentProgramCohortApplicant({
                status: 'pending',
                payloadJson: JSON.stringify({ manualDepositSubmitted: true }),
            }),
        ).toBe(true);
        expect(
            isCurrentProgramCohortApplicant({
                status: 'pending',
                payloadJson: '{}',
            }),
        ).toBe(false);

        const { emails } = await resolveCohortEmails(COHORT_CURRENT_PROGRAM, {
            ctx: emptyCtx({
                currentProgramSeason: 'fusionKaga',
                programs: [{ id: 'fusionKaga', studioStatus: 'open' }],
                applicants: [
                    {
                        id: 'a1|app',
                        programId: 'fusionKaga',
                        email: 'accepted@example.com',
                        status: 'accepted',
                        payloadJson: '{}',
                    },
                    {
                        id: 'a2|app',
                        programId: 'fusionKaga',
                        email: 'confirmed@example.com',
                        status: 'pending',
                        payloadJson: JSON.stringify({ manualDepositSubmitted: true }),
                    },
                    {
                        id: 'a3|app',
                        programId: 'fusionKaga',
                        email: 'pending@example.com',
                        status: 'pending',
                        payloadJson: '{}',
                    },
                    {
                        id: 'a4|app',
                        programId: 'other',
                        email: 'other@example.com',
                        status: 'accepted',
                        payloadJson: '{}',
                    },
                ],
            }),
        });
        expect(emails.sort()).toEqual(['accepted@example.com', 'confirmed@example.com']);
    });
});
