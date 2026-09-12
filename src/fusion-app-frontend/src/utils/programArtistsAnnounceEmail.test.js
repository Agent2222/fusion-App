import { describe, expect, it, vi } from 'vitest';

vi.mock('../config.js', () => ({
    getPublicSiteOrigin: () => 'https://fusionart.world',
}));

import { isFusionEmailLayout } from './emailFusionLayout.js';
import {
    PROGRAM_ARTISTS_ANNOUNCE_TEMPLATE_ID,
    artistsForProgramAnnounce,
    buildProgramArtistsAnnounceEmailHtml,
    buildProgramArtistsAnnounceLayoutSlots,
    buildProgramArtistsGridHtml,
    programArtistGridImageUrl,
    programArtistsAnnounceLabel,
    programArtistsCohortPageHref,
    defaultProgramArtistsAnnounceBodyHtml,
    sampleProgramArtistsAnnounceHtml,
    withAnnounceLeadAndGrid,
} from './programArtistsAnnounceEmail.js';

const kaga = {
    id: 'fusionKaga',
    year: '2026',
    visibility: 'public',
    routeLink: '/program/kaga-ishikawa',
    enCard: {
        headline: 'Fusion Kaga - Fall 2026 Artist Residency',
        focus: 'Japan Artist Residency',
        location: 'Kaga City, Ishikawa',
        year: '2026',
        startDate: 'September 2026',
        imageSrc: 'https://cdn.example/kaga-hero.jpg',
    },
};

const artistA = {
    id: 'a1',
    slug: 'ada-west',
    image: 'https://cdn.example/ada-art.jpg',
    heroProfileImage: 'https://cdn.example/ada.jpg',
    locales: { en: { name: 'Ada West', programs: ['fusionKaga'] } },
};
const artistB = {
    id: 'a2',
    slug: 'ben-ortiz',
    image: 'https://cdn.example/ben.jpg',
    locales: { en: { name: 'Ben Ortiz', programs: ['fusionKaga'] } },
};
const artistC = {
    id: 'a3',
    slug: 'cara-ng',
    image: 'https://cdn.example/cara.jpg',
    locales: { en: { name: 'Cara Ng', programs: ['fusionKaga'] } },
};
const artistD = {
    id: 'a4',
    slug: 'dana-yu',
    image: 'https://cdn.example/dana.jpg',
    locales: { en: { name: 'Dana Yu', programs: ['fusionKaga'] } },
};
const other = {
    id: 'z9',
    slug: 'other',
    image: 'https://cdn.example/other.jpg',
    locales: { en: { name: 'Other Artist', programs: ['fusionTokyo'] } },
};

describe('programArtistsAnnounceLabel', () => {
    it('builds a short Kaga Fall 2026 residency label', () => {
        expect(programArtistsAnnounceLabel(kaga)).toBe('Kaga Fall 2026');
    });
});

describe('programArtistsCohortPageHref', () => {
    it('points at the public cohort artists page, not link in bio', () => {
        const href = programArtistsCohortPageHref(kaga, [kaga], [artistA]);
        expect(href).toBe('https://fusionart.world/artists/kaga-ishikawa-2026');
        expect(href).not.toMatch(/instagram|link in bio/i);
    });
});

describe('artistsForProgramAnnounce', () => {
    it('keeps enrolled program artists and sorts by name', () => {
        const rows = artistsForProgramAnnounce(kaga, [artistC, other, artistA]);
        expect(rows.map((a) => a.slug)).toEqual(['ada-west', 'cara-ng']);
    });
});

describe('programArtistGridImageUrl', () => {
    it('prefers a profile still over artwork', () => {
        expect(programArtistGridImageUrl(artistA)).toContain('ada.jpg');
    });
});

describe('buildProgramArtistsGridHtml', () => {
    it('lays out three portraits per row', () => {
        const html = buildProgramArtistsGridHtml([artistA, artistB, artistC, artistD]);
        expect(html).toContain('fusion-email-artist-grid');
        expect(html.match(/<tr>/g)?.length).toBe(2);
        expect(html).toContain('Ada West');
        expect(html).toContain('/profile/ada-west');
        expect(html).toContain('width="33.33%"');
        expect((html.match(/width="33.33%"/g) || []).length).toBe(6);
    });
});

describe('withAnnounceLeadAndGrid', () => {
    it('replaces the lead and drops the select-a-program hint', () => {
        const out = withAnnounceLeadAndGrid(
            defaultProgramArtistsAnnounceBodyHtml(),
            'Introducing the artists joining FUSION’s Kaga Fall 2026 residency!',
            buildProgramArtistsGridHtml([artistA]),
        );
        expect(out).toContain('Introducing the artists joining FUSION’s Kaga Fall 2026 residency!');
        expect(out).not.toMatch(/Select a program under Content source/i);
        expect(out).toContain('ada.jpg');
    });
});

describe('buildProgramArtistsAnnounceLayoutSlots', () => {
    it('fills portraits, cohort CTA, and keeps announcement copy', () => {
        const slots = buildProgramArtistsAnnounceLayoutSlots({
            program: kaga,
            artists: [artistA, artistB, other],
            programs: [kaga],
        });
        expect(slots.headlineHtml).toBe('Meet The<br>Artists');
        expect(slots.pillLabel).toBe('MEET THE ARTISTS');
        expect(slots.cta?.label).toBe('MEET THE ARTISTS');
        expect(slots.cta?.href).toBe('https://fusionart.world/artists/kaga-ishikawa-2026');
        expect(slots.bodyHtml).toContain('Ada West');
        expect(slots.bodyHtml).toContain('Ben Ortiz');
        expect(slots.bodyHtml).not.toContain('Other Artist');
        expect(slots.bodyHtml).toMatch(/interdisciplinary artist/i);
        expect(slots.bodyHtml).toMatch(/Hatori Onsen/i);
        expect(slots.bodyHtml).toMatch(/Tokyo Gendai/i);
        expect(slots.bodyHtml).not.toMatch(/link in bio/i);
        expect(slots.bodyHtml).toMatch(/cohort artists page/i);
        expect(slots.subject).toBe('Meet the artists — Kaga Fall 2026');
        expect(slots.heroImageUrl).toContain('kaga-hero.jpg');
    });
});

describe('sample and bound HTML', () => {
    it('default template is branded and asks for a program', () => {
        const html = sampleProgramArtistsAnnounceHtml();
        expect(isFusionEmailLayout(html)).toBe(true);
        expect(html).toContain('/artists/kaga-ishikawa-2026');
        expect(html).toMatch(/Select a program/i);
        expect(PROGRAM_ARTISTS_ANNOUNCE_TEMPLATE_ID).toBe('tpl_program_artists');
    });

    it('bound email renders a 3-up grid and cohort CTA', () => {
        const html = buildProgramArtistsAnnounceEmailHtml({
            program: kaga,
            artists: [artistA, artistB, artistC],
            programs: [kaga],
        });
        expect(isFusionEmailLayout(html)).toBe(true);
        expect(html).toContain('MEET THE ARTISTS');
        expect(html).toContain('Ada West');
        expect(html).toContain('/artists/kaga-ishikawa-2026');
        expect(html).not.toMatch(/link in bio/i);
    });
});
