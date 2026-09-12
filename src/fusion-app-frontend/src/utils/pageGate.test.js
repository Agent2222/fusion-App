import { describe, it, expect } from 'vitest';
import { pathnameToPageStatusKey, isPageAllowed, gatedJoinHostHtml } from './pageGate.js';

describe('pathnameToPageStatusKey', () => {
    it('maps gated route families', () => {
        expect(pathnameToPageStatusKey('/')).toBe('home');
        expect(pathnameToPageStatusKey('/gallery-access')).toBe('galleryAccess');
        expect(pathnameToPageStatusKey('/community')).toBe('community');
        expect(pathnameToPageStatusKey('/videos')).toBe('videos');
        expect(pathnameToPageStatusKey('/context')).toBe('context');
        expect(pathnameToPageStatusKey('/programs')).toBe('programs');
        expect(pathnameToPageStatusKey('/programs/foo')).toBe('programs');
        expect(pathnameToPageStatusKey('/program/bar')).toBe('programs');
        expect(pathnameToPageStatusKey('/editions')).toBe('editions');
        expect(pathnameToPageStatusKey('/editions/x')).toBe('editions');
        expect(pathnameToPageStatusKey('/journal')).toBe('journal');
        expect(pathnameToPageStatusKey('/journal/entry/1')).toBe('journal');
        expect(pathnameToPageStatusKey('/studio')).toBe(null);
        expect(pathnameToPageStatusKey('/contact')).toBe(null);
        expect(pathnameToPageStatusKey('/links')).toBe(null);
    });
});

describe('isPageAllowed', () => {
    it('returns true only when the effective flag is strictly true', () => {
        expect(isPageAllowed(null)).toBe(false);
        expect(isPageAllowed({})).toBe(false);
        expect(isPageAllowed({ status: { public: 'true' } })).toBe(false);
        expect(isPageAllowed({ status: { public: true, dev: true } })).toBe(true);
    });
});

describe('gatedJoinHostHtml', () => {
    it('embeds encoded copy and gate attributes', () => {
        const html = gatedJoinHostHtml(
            {
                message: 'Hero HTML',
                comingSoonMessage: 'Soon',
                comingSoonCopy: 'Coming soon',
            },
            '/community',
            'community',
        );
        expect(html).toContain('data-gate-band="1"');
        expect(html).toContain('data-hide-band-open-when-authenticated="1"');
        expect(html).toContain(encodeURIComponent('Soon'));
        expect(html).toContain(encodeURIComponent('Coming soon'));
    });
});
