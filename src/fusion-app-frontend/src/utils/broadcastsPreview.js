/**
 * DEV-only Broadcasts fixtures so Playwright can review the Studio tab without II.
 */
import { isRadarPreviewEnvAllowed } from './radarPreview.js';

/**
 * @param {string} [search]
 */
export function isBroadcastsPreviewActive(search) {
    if (!isRadarPreviewEnvAllowed()) return false;
    const loc = typeof window !== 'undefined' ? window.location : null;
    const p = new URLSearchParams(String(search || loc?.search || '').replace(/^\?/, ''));
    return p.get('broadcastsPreview') === '1';
}

export function buildBroadcastsPreviewPayload() {
    return {
        redemptions: [
            {
                id: 'br-maya-featured',
                principal: 'principal-maya',
                channel: { featuredArtist: null },
                redeemedAt: '2026-08-20T14:00:00.000Z',
                fulfilledAt: [],
            },
            {
                id: 'br-rin-social',
                principal: 'principal-rin',
                channel: { socialPost: null },
                redeemedAt: '2026-08-18T09:30:00.000Z',
                fulfilledAt: [],
            },
            {
                id: 'br-kumo-news',
                principal: 'principal-kumo',
                channel: { newsletterBlast: null },
                redeemedAt: '2026-08-12T11:00:00.000Z',
                fulfilledAt: ['2026-08-14T16:00:00.000Z'],
            },
        ],
        accounts: [
            { principal: 'principal-maya', linkedArtistId: 'art-maya', slug: 'maya-fujita' },
            { principal: 'principal-rin', linkedArtistId: 'art-rin', slug: 'rin-takahashi' },
            { principal: 'principal-kumo', linkedArtistId: 'art-kumo', slug: 'studio-kumo' },
        ],
        contacts: [
            ['principal-maya', { firstName: 'Maya', lastName: 'Fujita', email: 'maya@example.com' }],
            ['principal-rin', { firstName: 'Rin', lastName: 'Takahashi', email: 'rin.takahashi@example.com' }],
            ['principal-kumo', { firstName: 'Studio', lastName: 'Kumo', email: 'hello@studiokumo.example' }],
        ],
        artists: [
            { id: 'art-maya', name: 'Maya Fujita', contactEmail: 'maya@example.com' },
            { id: 'art-rin', name: 'Rin Takahashi', contactEmail: 'rin.takahashi@example.com' },
            { id: 'art-kumo', name: 'Studio Kumo', contactEmail: 'hello@studiokumo.example' },
        ],
    };
}
