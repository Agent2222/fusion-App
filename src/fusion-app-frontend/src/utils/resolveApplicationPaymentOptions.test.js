import { describe, it, expect } from 'vitest';
import {
    joinNetworkPlansFromBundle,
    resolveApplicationPaymentOptions,
    readUseGlobalPaymentOptionDetails,
} from './resolveApplicationPaymentOptions.js';

describe('resolveApplicationPaymentOptions', () => {
    const joinBundle = {
        membership: {
            value: {
                en: {
                    planMonthly: {
                        title: 'Monthly membership',
                        displayPrice: '$30',
                        every: 'per month',
                        subtext: 'Billed monthly',
                        includedBullets: ['Profile', 'Updates'],
                    },
                    planQuarterly: {
                        title: 'Quarterly membership',
                        displayPrice: '$75',
                        every: 'per quarter',
                        includedBullets: ['Credit'],
                    },
                    planAnnual: {
                        title: 'Annual membership',
                        displayPrice: '$260',
                        every: 'per year',
                        includedBullets: ['All apps'],
                    },
                },
            },
        },
    };

    it('inherits empty fields from join network when useGlobal', () => {
        const joinPlans = joinNetworkPlansFromBundle(joinBundle, 'en');
        const r = resolveApplicationPaymentOptions({
            programOptions: {
                quarterly: {
                    title: '',
                    displayPrice: '',
                    subtext: '',
                    subtext2: '',
                    includedBullets: [],
                },
            },
            joinPlans,
            useGlobal: true,
            locale: 'en',
        });
        expect(r.quarterly.title).toBe('Quarterly membership');
        expect(r.quarterly.displayPrice).toBe('$75');
        expect(r.quarterly.includedBullets).toEqual(['Credit']);
    });

    it('keeps program overrides and applies monthly add-on defaults', () => {
        const joinPlans = joinNetworkPlansFromBundle(joinBundle, 'en');
        const r = resolveApplicationPaymentOptions({
            programOptions: {
                monthly: {
                    title: 'Custom monthly app',
                    displayPrice: '',
                    subtext: '',
                    subtext2: '',
                    includedBullets: [],
                },
            },
            joinPlans,
            useGlobal: true,
            locale: 'en',
        });
        expect(r.monthly.title).toBe('Custom monthly app');
        expect(r.monthly.displayPrice).toBe('$30');
        expect(r.monthly.subtext).toMatch(/Application fee included/i);
        expect(r.monthly.includedBullets.length).toBeGreaterThan(0);
    });

    it('skips join inherit when useGlobal false', () => {
        const joinPlans = joinNetworkPlansFromBundle(joinBundle, 'en');
        const r = resolveApplicationPaymentOptions({
            programOptions: {
                quarterly: {
                    title: '',
                    displayPrice: '',
                    subtext: '',
                    subtext2: '',
                    includedBullets: [],
                },
            },
            joinPlans,
            useGlobal: false,
            locale: 'en',
        });
        expect(r.quarterly.title).toBe('');
        expect(r.monthly.title).toBe('Monthly + application');
    });

    it('readUseGlobalPaymentOptionDetails defaults true', () => {
        expect(readUseGlobalPaymentOptionDetails({})).toBe(true);
        expect(readUseGlobalPaymentOptionDetails({ useGlobalPaymentOptionDetails: false })).toBe(
            false,
        );
    });
});
