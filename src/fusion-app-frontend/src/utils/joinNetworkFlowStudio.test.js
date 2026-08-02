import { describe, expect, it } from 'vitest';
import { testData } from '../testData.js';
import { stagesForFlow } from './joinNetworkFlowFieldManifest.js';
import {
    collectJoinNetworkFlowDraft,
    mergeJoinNetworkFlowBundle,
    normalizeJoinNetworkFlowBundle,
} from '../components/studio/sections/joinNetworkFlowStudio.js';

describe('joinNetworkFlowStudio', () => {
    const base = testData.joinNetworkFlow;

    it('mergeJoinNetworkFlowBundle preserves untouched keys', () => {
        const draft = {
            membership: {
                band: {
                    en: { title: 'Edited headline' },
                },
            },
        };
        const merged = mergeJoinNetworkFlowBundle(base, draft);
        expect(merged.membership.band.en.title).toBe('Edited headline');
        expect(merged.membership.band.en.openLabel).toBe(base.membership.band.en.openLabel);
        expect(merged.access.band.en.title).toBe(base.access.band.en.title);
        expect(merged.apply).toEqual(base.apply);
    });

    it('mergeJoinNetworkFlowBundle deep-merges nested plan fields', () => {
        const draft = {
            membership: {
                value: {
                    en: {
                        planMonthly: {
                            displayPrice: '$55',
                        },
                    },
                },
            },
        };
        const merged = mergeJoinNetworkFlowBundle(base, draft);
        expect(merged.membership.value.en.planMonthly.displayPrice).toBe('$55');
        expect(merged.membership.value.en.planMonthly.title).toBe(
            base.membership.value.en.planMonthly.title,
        );
    });

    it('normalizeJoinNetworkFlowBundle migrates planBimonthly to planMonthly', () => {
        const legacy = {
            membership: {
                value: {
                    en: {
                        planBimonthly: { title: 'Legacy monthly', displayPrice: '$55' },
                        planAnnual: { title: 'Annual' },
                    },
                },
                payment: {
                    en: {
                        bimonthly: { amount: '$55.00', planKey: 'bi_monthly' },
                        annual: { amount: '$260.00' },
                    },
                },
            },
        };
        const normalized = normalizeJoinNetworkFlowBundle(legacy);
        expect(normalized.membership.value.en.planMonthly.title).toBe('Legacy monthly');
        expect(normalized.membership.value.en.planBimonthly).toBeUndefined();
        expect(normalized.membership.payment.en.monthly.amount).toBe('$55.00');
        expect(normalized.membership.payment.en.monthly.planKey).toBe('monthly');
        expect(normalized.membership.payment.en.bimonthly).toBeUndefined();
    });

    it('round-trip: full draft merge replaces nested edits while keeping siblings', () => {
        const state = JSON.parse(JSON.stringify(base));
        state.membership.entry.en.dialogTitle = 'Studio test title';
        state.membership.value.en.includes = ['One', 'Two'];
        state.membership.confirmation.en.links = [{ id: 'home', label: 'Home', href: '/' }];

        const merged = mergeJoinNetworkFlowBundle(base, state);
        expect(merged.membership.entry.en.dialogTitle).toBe('Studio test title');
        expect(merged.membership.value.en.includes).toEqual(['One', 'Two']);
        expect(merged.membership.confirmation.en.links).toEqual([
            { id: 'home', label: 'Home', href: '/' },
        ]);
        expect(merged.access.band.en.title).toBe(base.access.band.en.title);
    });

    it('collectJoinNetworkFlowDraft returns empty object when container not registered', () => {
        expect(collectJoinNetworkFlowDraft({})).toEqual({});
    });

    it('stagesForFlow lists only stages present in bundle', () => {
        const membershipStages = stagesForFlow('membership', base);
        expect(membershipStages).toContain('band');
        expect(membershipStages).toContain('value');
        expect(membershipStages).toContain('linkAccountExempt');

        const partial = { membership: { band: base.membership.band, entry: base.membership.entry } };
        const partialStages = stagesForFlow('membership', partial);
        expect(partialStages).toEqual(['band', 'entry']);
        expect(partialStages).not.toContain('payment');
    });

    it('stagesForFlow differs by flow type keys', () => {
        expect(stagesForFlow('access', base)).toContain('band');
        expect(stagesForFlow('apply', base).length).toBeGreaterThan(0);
    });
});
