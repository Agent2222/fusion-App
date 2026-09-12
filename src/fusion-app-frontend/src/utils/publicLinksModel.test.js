import { describe, expect, it } from 'vitest';
import {
    PUBLIC_LINK_PRESETS,
    contrastInkForColorToken,
    createPublicLinkId,
    effectivePublicLinkDisplay,
    emptyPublicLink,
    enabledPublicLinks,
    findPublicLinkSourceRow,
    isPublicLinkHrefAllowed,
    movePublicLink,
    normalizePublicLink,
    normalizePublicLinkColorToken,
    normalizePublicLinks,
    removePublicLink,
    formatPublicLinkCtaLabel,
    normalizePublicLinkCardRows,
    normalizePublicLinkCardSpan,
    normalizePublicLinkCtaStyle,
    resolvePublicLinkHrefFromSource,
    resolvePublicLinkImageFromSource,
    resolvePublicLinkLabelFromSource,
    sanitizePublicLinkHref,
    sanitizePublicLinkImageUrl,
    sortPublicLinks,
    upsertPublicLink,
} from './publicLinksModel.js';

describe('sanitizePublicLinkHref', () => {
    it('allows same-origin paths and https URLs', () => {
        expect(sanitizePublicLinkHref('/artists')).toBe('/artists');
        expect(sanitizePublicLinkHref('/join-network?code=1')).toBe('/join-network?code=1');
        expect(sanitizePublicLinkHref('https://www.fusionart.world/programs')).toBe(
            'https://www.fusionart.world/programs',
        );
    });

    it('rejects protocol-relative, http, and script URLs', () => {
        expect(sanitizePublicLinkHref('//evil.example')).toBe('');
        expect(sanitizePublicLinkHref('http://example.com')).toBe('');
        expect(sanitizePublicLinkHref('javascript:alert(1)')).toBe('');
        expect(sanitizePublicLinkHref('data:text/html,hi')).toBe('');
        expect(sanitizePublicLinkHref('mailto:info@fusionart.world')).toBe('');
        expect(isPublicLinkHrefAllowed('https://ok.example')).toBe(true);
        expect(isPublicLinkHrefAllowed('/x')).toBe(true);
        expect(isPublicLinkHrefAllowed('ftp://x')).toBe(false);
    });
});

describe('normalizePublicLink / normalizePublicLinks', () => {
    it('requires label and a sanitized href', () => {
        expect(normalizePublicLink({ label: 'Artists' })).toBeNull();
        expect(normalizePublicLink({ href: '/artists' })).toBeNull();
        expect(normalizePublicLink({ label: 'Artists', href: 'javascript:x' })).toBeNull();
        const row = normalizePublicLink({ label: '  Artists  ', href: '/artists', enabled: false });
        expect(row).toMatchObject({ label: 'Artists', href: '/artists', enabled: false });
        expect(row?.id).toBeTruthy();
    });

    it('accepts name/url aliases and drops invalid or duplicate ids', () => {
        const list = normalizePublicLinks([
            { id: 'a', name: 'Artists', url: '/artists', sort_order: 2 },
            { id: 'a', name: 'Dup', url: '/programs' },
            { label: 'Bad', href: 'http://nope.example' },
            { id: 'b', label: 'Programs', path: '/programs', order: 1 },
        ]);
        expect(list.map((l) => l.id)).toEqual(['a', 'b']);
        expect(list[0].label).toBe('Artists');
        expect(list[1].href).toBe('/programs');
    });

    it('parses a JSON string', () => {
        const list = normalizePublicLinks(JSON.stringify([{ id: 'x', label: 'X', href: '/x' }]));
        expect(list).toHaveLength(1);
        expect(normalizePublicLinks('not-json')).toEqual([]);
        expect(normalizePublicLinks(null)).toEqual([]);
    });
});

describe('sort / enabled / mutate', () => {
    it('sorts by sortOrder then label', () => {
        const sorted = sortPublicLinks([
            { id: 'b', label: 'Beta', href: '/b', sortOrder: 1, enabled: true },
            { id: 'a', label: 'Alpha', href: '/a', sortOrder: 1, enabled: true },
            { id: 'c', label: 'Gamma', href: '/c', sortOrder: 0, enabled: true },
        ]);
        expect(sorted.map((l) => l.id)).toEqual(['c', 'a', 'b']);
    });

    it('hides disabled items from the public list', () => {
        const enabled = enabledPublicLinks([
            { id: 'on', label: 'On', href: '/on', sortOrder: 1, enabled: true },
            { id: 'off', label: 'Off', href: '/off', sortOrder: 0, enabled: false },
        ]);
        expect(enabled.map((l) => l.id)).toEqual(['on']);
    });

    it('reorders and reindexes sortOrder', () => {
        const start = [
            { id: 'a', label: 'A', href: '/a', sortOrder: 0, enabled: true },
            { id: 'b', label: 'B', href: '/b', sortOrder: 1, enabled: true },
        ];
        const down = movePublicLink(start, 'a', 1);
        expect(down.map((l) => l.id)).toEqual(['b', 'a']);
        expect(down.map((l) => l.sortOrder)).toEqual([0, 1]);
        expect(movePublicLink(start, 'a', -1).map((l) => l.id)).toEqual(['a', 'b']);
    });

    it('upserts and removes by id', () => {
        const a = emptyPublicLink({ id: 'a', label: 'A', href: '/a' });
        const added = upsertPublicLink([], { ...a, label: 'Artists', href: '/artists' });
        expect(added).toHaveLength(1);
        expect(added[0].label).toBe('Artists');
        const updated = upsertPublicLink(added, { ...added[0], label: 'Roster' });
        expect(updated[0].label).toBe('Roster');
        expect(removePublicLink(updated, 'a')).toEqual([]);
    });

    it('creates stable-looking ids', () => {
        expect(createPublicLinkId()).toMatch(/^pl-[a-z0-9]+-[a-z0-9]+$/);
    });

    it('preset labels omit Fusion', () => {
        for (const preset of PUBLIC_LINK_PRESETS) {
            expect(preset.label.toLowerCase()).not.toContain('fusion');
            expect(preset.href.startsWith('/')).toBe(true);
        }
    });
});

describe('display, color, image, and source', () => {
    it('defaults legacy JSON to button + c5 + 1 column', () => {
        const row = normalizePublicLink({ id: 'x', label: 'Artists', href: '/artists' });
        expect(row).toMatchObject({
            display: 'button',
            colorToken: 'c5',
            imageUrl: '',
            sourceType: 'url',
            sourceId: '',
            cardSpan: 1,
            cardRows: 1,
            eyebrow: '',
            subtext: '',
            ctaLabel: '',
            ctaStyle: 'outline',
            meta: '',
        });
        expect(effectivePublicLinkDisplay(row)).toBe('button');
    });

    it('whitelists color tokens and contrast ink', () => {
        expect(normalizePublicLinkColorToken('c1')).toBe('c1');
        expect(normalizePublicLinkColorToken('--bg')).toBe('bg');
        expect(normalizePublicLinkColorToken('nope')).toBe('c5');
        expect(contrastInkForColorToken('c1')).toBe('#ffffff');
        expect(contrastInkForColorToken('c2')).toBe('#ffffff');
        expect(contrastInkForColorToken('c5')).toBe('#000000');
        expect(contrastInkForColorToken('bg')).toBe('#000000');
    });

    it('rejects script and http images', () => {
        expect(sanitizePublicLinkImageUrl('javascript:alert(1)')).toBe('');
        expect(sanitizePublicLinkImageUrl('http://example.com/a.jpg')).toBe('');
        expect(sanitizePublicLinkImageUrl('/local.jpg')).toBe('');
        expect(sanitizePublicLinkImageUrl('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg');
    });

    it('keeps cards only when a https image is present', () => {
        const stale = normalizePublicLink({
            id: 'c',
            label: 'Kaga',
            href: '/programs',
            display: 'card',
            imageUrl: 'javascript:x',
        });
        expect(stale?.display).toBe('card');
        expect(stale?.imageUrl).toBe('');
        expect(effectivePublicLinkDisplay(stale)).toBe('button');

        const ok = normalizePublicLink({
            id: 'c2',
            label: 'Kaga',
            href: '/programs',
            display: 'card',
            imageUrl: 'https://cdn.example/kaga.jpg',
        });
        expect(ok?.imageUrl).toBe('https://cdn.example/kaga.jpg');
        expect(effectivePublicLinkDisplay(ok)).toBe('card');
    });

    it('persists destination templates on buttons and cards', () => {
        const btn = normalizePublicLink({
            id: 'a',
            label: 'Ada',
            href: '/profile/ada',
            sourceType: 'artist',
            sourceId: 'ada-1',
            color: 'c1',
        });
        expect(btn).toMatchObject({
            display: 'button',
            sourceType: 'artist',
            sourceId: 'ada-1',
            colorToken: 'c1',
        });
        const card = normalizePublicLink({
            id: 'b',
            label: 'Ada',
            href: '/profile/ada',
            display: 'card',
            imageUrl: 'https://cdn.example/a.jpg',
            sourceType: 'artist',
            sourceId: 'ada-1',
            cardSpan: 2,
            cardRows: 2,
        });
        expect(card).toMatchObject({ sourceType: 'artist', sourceId: 'ada-1', cardSpan: 2, cardRows: 2 });
    });

    it('whitelists card span and rows to 1 or 2', () => {
        expect(normalizePublicLinkCardSpan(2)).toBe(2);
        expect(normalizePublicLinkCardSpan('2')).toBe(2);
        expect(normalizePublicLinkCardSpan(1)).toBe(1);
        expect(normalizePublicLinkCardSpan('wide')).toBe(1);
        expect(normalizePublicLinkCardSpan(99)).toBe(1);
        expect(normalizePublicLinkCardRows(2)).toBe(2);
        expect(normalizePublicLinkCardRows('tall')).toBe(1);
        expect(emptyPublicLink({ label: 'X', href: '/artists' })).toMatchObject({ cardSpan: 1, cardRows: 1 });
    });

    it('keeps card copy fields and formats the explore CTA', () => {
        const card = normalizePublicLink({
            id: 'k',
            label: 'Kaga Fall 2026 Cohort',
            href: '/programs',
            display: 'card',
            imageUrl: 'https://cdn.example/kaga.jpg',
            eyebrow: 'Artist residency',
            subtext: 'Time. Place. New Perspectives.',
            ctaLabel: 'Explore program',
            ctaStyle: 'outline',
            meta: 'Kaga Ishikawa Japan',
        });
        expect(card).toMatchObject({
            eyebrow: 'Artist residency',
            subtext: 'Time. Place. New Perspectives.',
            ctaLabel: 'Explore program',
            ctaStyle: 'outline',
            meta: 'Kaga Ishikawa Japan',
        });
        expect(formatPublicLinkCtaLabel('')).toBe('Explore →');
        expect(formatPublicLinkCtaLabel('Become a member')).toBe('Become a member →');
        expect(normalizePublicLinkCtaStyle('solid')).toBe('solid');
        expect(normalizePublicLinkCtaStyle('ghost')).toBe('outline');
    });

    it('resolves artist, journal, and video hrefs', () => {
        expect(resolvePublicLinkHrefFromSource('artist', { slug: 'ada-loki' })).toBe('/profile/ada-loki');
        expect(resolvePublicLinkHrefFromSource('artist', { locales: { en: { name: 'Ada Loki' } } })).toBe(
            '/profile/ada-loki',
        );
        expect(resolvePublicLinkHrefFromSource('journal', { id: 'entry-9' })).toBe('/journal/entry/entry-9');
        expect(resolvePublicLinkHrefFromSource('video', { id: 'vid-1' })).toBe('/videos');
        expect(resolvePublicLinkLabelFromSource('artist', { locales: { en: { name: 'Ada Loki' } } })).toBe(
            'Ada Loki',
        );
        expect(resolvePublicLinkLabelFromSource('journal', { id: '9', en: { title: 'Field notes' } })).toBe(
            'Field notes',
        );
        expect(
            resolvePublicLinkImageFromSource('artist', { heroProfileImage: 'https://cdn.example/ada.jpg' }),
        ).toBe('https://cdn.example/ada.jpg');
        expect(
            resolvePublicLinkImageFromSource('journal', { en: { imageSrc: 'https://cdn.example/note.jpg' } }),
        ).toBe('https://cdn.example/note.jpg');
        expect(resolvePublicLinkImageFromSource('video', { posterUrl: 'http://insecure/p.jpg' })).toBe('');
    });

    it('finds a source row by id or slug', () => {
        const caches = {
            artists: [{ id: 'a1', slug: 'ada' }],
            journals: [{ id: 'j1' }],
            videos: [{ id: 'v1', slug: 'studio-visit' }],
        };
        expect(findPublicLinkSourceRow('artist', 'ada', caches)?.id).toBe('a1');
        expect(findPublicLinkSourceRow('journal', 'j1', caches)?.id).toBe('j1');
        expect(findPublicLinkSourceRow('video', 'studio-visit', caches)?.id).toBe('v1');
        expect(findPublicLinkSourceRow('url', 'x', caches)).toBeNull();
    });
});
