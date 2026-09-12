import { describe, expect, it, vi } from 'vitest';
import * as studioArtistPrograms from './studioArtistPrograms.js';

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
    cleanCurrentProgramAudienceConfirmedLists,
    isActiveMemberAccount,
    isCurrentProgramCohortApplicant,
    isExcludedFromCurrentProgramAudienceStatus,
    listStaleCurrentProgramConfirmedArtists,
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

    it('treats pulled-out and deleted statuses as off the current-program audience', () => {
        expect(isExcludedFromCurrentProgramAudienceStatus('pulledOut')).toBe(true);
        expect(isExcludedFromCurrentProgramAudienceStatus('pulled-out')).toBe(true);
        expect(isExcludedFromCurrentProgramAudienceStatus('withdrawn')).toBe(true);
        expect(isExcludedFromCurrentProgramAudienceStatus('deleted')).toBe(true);
        expect(isExcludedFromCurrentProgramAudienceStatus('accepted')).toBe(false);
        expect(
            isCurrentProgramCohortApplicant({
                status: 'pulledOut',
                payloadJson: JSON.stringify({ manualDepositSubmitted: true }),
            }),
        ).toBe(false);
    });

    it('drops pulled-out and deleted artists from the current program batch', async () => {
        const localesJson = JSON.stringify({
            en: {
                programPage: {
                    confirmedArtists: ['Kept Artist', 'Pulled Artist', 'Gone Artist'],
                },
            },
        });
        const ctx = emptyCtx({
            currentProgramSeason: 'fusionKaga',
            programs: [{ id: 'fusionKaga', studioStatus: 'open', localesJson }],
            artists: [
                { id: 'kept', en: { name: 'Kept Artist' }, contactEmail: 'kept@example.com' },
                { id: 'pulled', en: { name: 'Pulled Artist' }, contactEmail: 'pulled@example.com' },
            ],
            artistEmailById: new Map([
                ['kept', 'kept@example.com'],
                ['pulled', 'pulled@example.com'],
            ]),
            artistIdByName: new Map([
                ['kept artist', 'kept'],
                ['pulled artist', 'pulled'],
            ]),
            applicants: [
                {
                    id: 'kept|app',
                    programId: 'fusionKaga',
                    email: 'kept@example.com',
                    fullName: 'Kept Artist',
                    status: 'accepted',
                    payloadJson: '{}',
                },
                {
                    id: 'pulled|app',
                    programId: 'fusionKaga',
                    email: 'pulled@example.com',
                    fullName: 'Pulled Artist',
                    status: 'pulledOut',
                    payloadJson: JSON.stringify({ manualDepositSubmitted: true }),
                },
                {
                    id: 'gone|app',
                    programId: 'fusionKaga',
                    email: 'gone@example.com',
                    fullName: 'Gone Artist',
                    status: 'accepted',
                    payloadJson: '{}',
                },
            ],
        });

        const { emails } = await resolveCohortEmails(COHORT_CURRENT_PROGRAM, { ctx });
        expect(emails).toEqual(['kept@example.com']);

        const stale = listStaleCurrentProgramConfirmedArtists(ctx);
        expect(stale.map((row) => `${row.name}:${row.reason}`).sort()).toEqual([
            'Gone Artist:deleted',
            'Pulled Artist:pulledOut',
        ]);

        const spy = vi.spyOn(studioArtistPrograms, 'updateProgramReservedArtist').mockResolvedValue();
        const cleaned = await cleanCurrentProgramAudienceConfirmedLists({ ctx });
        expect(cleaned.removed).toBe(2);
        expect(cleaned.failed).toBe(0);
        expect(spy).toHaveBeenCalledTimes(2);
        spy.mockRestore();
    });
});
