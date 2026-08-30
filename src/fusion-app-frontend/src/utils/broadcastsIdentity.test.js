import { describe, expect, it } from 'vitest';
import {
    broadcastChannelKey,
    formatBroadcastDate,
    isBroadcastFulfilled,
    principalFromBroadcast,
    resolveBroadcastArtist,
} from './broadcastsIdentity.js';

describe('broadcastsIdentity', () => {
    it('reads principal from Candid Principal or owner fallback', () => {
        expect(principalFromBroadcast({ principal: { toText: () => 'abc-def' } })).toBe('abc-def');
        expect(principalFromBroadcast({ owner: 'legacy-owner' })).toBe('legacy-owner');
        expect(principalFromBroadcast({ principal: 'plain' })).toBe('plain');
    });

    it('detects channel variants and fulfillment', () => {
        expect(broadcastChannelKey({ featuredArtist: null })).toBe('featuredArtist');
        expect(isBroadcastFulfilled({ fulfilledAt: [] })).toBe(false);
        expect(isBroadcastFulfilled({ fulfilledAt: ['2026-08-01T00:00:00.000Z'] })).toBe(true);
    });

    it('formats ISO redeemed dates', () => {
        expect(formatBroadcastDate('2026-08-20T12:00:00.000Z')).toMatch(/Aug/);
        expect(formatBroadcastDate([])).toBe('—');
    });

    it('prefers linked artist name and contact email', () => {
        const accounts = new Map([['p1', { linkedArtistId: ['art-maya'] }]]);
        const contacts = new Map([['p1', { firstName: 'M', lastName: 'Fujita', email: 'maya@example.com' }]]);
        const artists = new Map([['art-maya', { name: 'Maya Fujita', contactEmail: 'studio@example.com' }]]);
        const resolved = resolveBroadcastArtist({ principal: 'p1' }, { accounts, contacts, artists });
        expect(resolved.artistName).toBe('Maya Fujita');
        expect(resolved.email).toBe('maya@example.com');
    });

    it('falls back to contact name and artist email when needed', () => {
        const accounts = new Map([['p2', { linkedArtistId: 'art-rin' }]]);
        const contacts = new Map([['p2', { fullName: 'Rin Takahashi', email: '' }]]);
        const artists = new Map([['art-rin', { locales: { en: { name: 'Rin' } }, contactEmail: 'rin@example.com' }]]);
        const resolved = resolveBroadcastArtist({ principal: 'p2' }, { accounts, contacts, artists });
        expect(resolved.artistName).toBe('Rin');
        expect(resolved.email).toBe('rin@example.com');
    });
});
