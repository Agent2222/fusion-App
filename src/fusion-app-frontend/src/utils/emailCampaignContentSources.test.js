import { describe, it, expect, vi } from 'vitest';

vi.mock('./database.js', () => ({
    getArtistsForStudio: async () => [],
    getContentBundleForStudio: async () => ({}),
    getJournalEntries: async () => [],
    getProgramDisplayNameFromRow: (p) => {
        const en = p?.enCard && typeof p.enCard === 'object' ? p.enCard : {};
        return String(en.headline || en.location || en.focus || p?.id || '').trim();
    },
    getPrograms: async () => [],
    listCommunityVideosStudio: async () => [],
}));

import {
    buildTemplateDraftFromSource,
    collectStudioEmailMedia,
    collectStudioImageUrls,
    finalizeQuickDesignSlots,
    mergeQuickDesignSlots,
    parseCampaignMeta,
    parseEmailLayoutLlmJson,
    pickEmailHeroMedia,
    resolveFeaturedArtistSource,
    resolveJournalSource,
    resolveProgramSource,
    resolveVideoSource,
    serializeCampaignMeta,
} from './emailCampaignContentSources.js';
import {
    FUSION_EMAIL_STYLES,
    defaultProgramUpdateLayoutSlots,
    extractFusionEmailSlots,
    isEmailVideoUrl,
    renderFusionEmailFromSlots,
} from './emailFusionLayout.js';

describe('emailCampaignContentSources', () => {
    it('parseCampaignMeta round-trips via serializeCampaignMeta', () => {
        const meta = { templateId: 'tpl_journal_entry', source: { type: 'journal', id: '42' } };
        const notes = serializeCampaignMeta(meta, 'Staff note here');
        const parsed = parseCampaignMeta(notes);
        expect(parsed.meta).toEqual(meta);
        expect(parsed.humanNotes).toBe('Staff note here');
    });

    it('parseCampaignMeta returns raw notes when no prefix', () => {
        const parsed = parseCampaignMeta('Just human notes');
        expect(parsed.meta).toBeNull();
        expect(parsed.humanNotes).toBe('Just human notes');
    });

    it('resolveFeaturedArtistSource maps artist fields', () => {
        const slots = resolveFeaturedArtistSource({
            slug: 'jane-doe',
            image: 'https://cdn.example/card.jpg',
            locales: {
                en: {
                    name: 'Jane Doe',
                    discipline: 'Painting',
                    bio: 'Bio text here.',
                },
            },
        });
        expect(slots.eyebrow).toBe('Artist Spotlight');
        expect(slots.heroImageUrl).toContain('card.jpg');
        expect(slots.cta?.href).toContain('/profile/jane-doe');
        expect(slots.subject).toContain('Jane Doe');
    });

    it('resolveJournalSource maps journal entry', () => {
        const slots = resolveJournalSource({
            id: '7',
            imageSrc: 'https://cdn.example/journal.jpg',
            en: { title: 'Studio Notes', description: 'A long description.' },
        });
        expect(slots.eyebrow).toBe('Journal');
        expect(slots.cta?.href).toContain('/journal/entry/7');
        expect(slots.subject).toBe('Studio Notes');
    });

    it('resolveProgramSource maps program card', () => {
        const slots = resolveProgramSource({
            id: 'kaga-2026',
            routeLink: '/program/kaga-ishikawa',
            enCard: {
                focus: 'Japan Artist Residency',
                location: 'Kaga City, Ishikawa',
                year: '2026',
                briefDescription: 'Applications open.',
                heroMediaSrc: 'https://cdn.example/program.jpg',
            },
        });
        expect(slots.eyebrow).toBe('Program Update');
        expect(slots.heroImageUrl).toContain('program.jpg');
        expect(slots.cta?.href).toContain('kaga-ishikawa');
    });

    it('resolveVideoSource maps community video', () => {
        const slots = resolveVideoSource({
            id: 'vid_1',
            slug: 'studio-visit',
            posterUrl: 'https://cdn.example/poster.jpg',
            previewVideoUrl: 'https://cdn.example/preview.mp4',
            overlayGuests: 'Jane Doe',
            overlayDuration: '12 min',
            localesJson: JSON.stringify({
                headlineEn: 'Studio Visit',
                lineEn: 'Inside the practice.',
                bodyEn: 'A conversation about process and place.',
                kickerEn: 'Fusion Video',
            }),
        });
        expect(slots.eyebrow).toBe('Fusion Video');
        expect(slots.heroImageUrl).toContain('poster.jpg');
        expect(slots.headlineHtml).toContain('Studio<br>Visit');
        expect(slots.bodyHtml).toContain('Featuring Jane Doe');
        expect(slots.cta?.href).toBe('https://www.fusionart.world/videos');
        expect(slots.cta?.label).toBe('WATCH NOW');
        expect(slots.subject).toBe('Studio Visit');
    });

    it('buildTemplateDraftFromSource works for featured video template', () => {
        const draft = buildTemplateDraftFromSource(
            'tpl_featured_video',
            { type: 'video', id: 'vid_1' },
            {
                videos: [
                    {
                        id: 'vid_1',
                        posterUrl: 'https://cdn.example/poster.jpg',
                        localesJson: JSON.stringify({
                            headlineEn: 'New Clip',
                            lineEn: 'Watch now.',
                        }),
                    },
                ],
            },
        );
        expect(draft).not.toBeNull();
        expect(draft?.bodyHtml).toContain('fusion-email-layout');
        expect(draft?.subject).toBe('New Clip');
    });

    it('collectStudioEmailMedia separates images and videos', () => {
        const items = collectStudioEmailMedia(
            [
                {
                    image: 'https://cdn.example/a.jpg',
                    heroProfileImage: 'https://cdn.example/a.jpg',
                    locales: { en: { name: 'A' } },
                },
            ],
            [
                {
                    posterUrl: 'https://cdn.example/poster.jpg',
                    imageUrl: 'https://cdn.example/clip.mp4',
                    previewVideoUrl: 'https://cdn.example/preview.mp4',
                    slug: 'clip-1',
                },
            ],
        );
        expect(items.some((i) => i.kind === 'image' && i.url.includes('poster.jpg'))).toBe(true);
        expect(items.some((i) => i.kind === 'video' && i.url.includes('preview.mp4'))).toBe(true);
        expect(items.some((i) => i.url.includes('.mp4') && i.kind === 'image')).toBe(false);
        expect(collectStudioImageUrls([], [{ imageUrl: 'https://cdn.example/x.mp4', slug: 'x' }])).toHaveLength(
            0,
        );
    });

    it('pickEmailHeroMedia uses video when only mp4 is available', () => {
        const pick = pickEmailHeroMedia(['https://cdn.example/hero.mp4']);
        expect(pick.heroImageUrl).toContain('.mp4');
        expect(pick.heroPosterUrl).toBe('');
    });

    it('pickEmailHeroMedia prefers still image and keeps mp4 poster fallback', () => {
        const pick = pickEmailHeroMedia([
            'https://cdn.example/hero.mp4',
            'https://cdn.example/fallback.jpg',
        ]);
        expect(pick.heroImageUrl).toContain('fallback.jpg');
        expect(pick.heroPosterUrl).toBe('');
    });

    it('buildTemplateDraftFromSource returns branded body', () => {
        const draft = buildTemplateDraftFromSource(
            'tpl_featured_artist',
            { type: 'artist', id: 'a1' },
            {
                artists: [
                    {
                        id: 'a1',
                        slug: 'a1',
                        image: 'https://cdn.example/a.jpg',
                        locales: { en: { name: 'Artist One' } },
                    },
                ],
            },
        );
        expect(draft).not.toBeNull();
        expect(draft?.bodyHtml).toContain('fusion-email-layout');
        expect(draft?.subject).toContain('Artist One');
    });

    it('program calendar template lists confirmed events for the selected program', () => {
        const draft = buildTemplateDraftFromSource(
            'tpl_program_calendar',
            { type: 'program', id: 'kaga' },
            {
                programs: [
                    {
                        id: 'kaga',
                        enCard: {
                            focus: 'Kaga City Artist Residency',
                            location: 'Kaga City, Ishikawa',
                            headline: 'Kaga City Artist Residency',
                        },
                    },
                ],
                scheduleEvents: [
                    {
                        id: 'e1',
                        title: 'Welcome breakfast',
                        date: '2026-09-14',
                        startTime: '09:00',
                        endTime: '10:30',
                        allDay: false,
                        status: 'confirmed',
                        relationKind: 'program',
                        relationProgramId: 'kaga',
                        programId: 'kaga',
                    },
                    {
                        id: 'e2',
                        title: 'Draft only',
                        date: '2026-09-15',
                        startTime: '09:00',
                        endTime: '10:00',
                        status: 'draft',
                        relationKind: 'program',
                        programId: 'kaga',
                    },
                    {
                        id: 'e3',
                        title: 'Other program',
                        date: '2026-09-16',
                        startTime: '09:00',
                        endTime: '10:00',
                        status: 'confirmed',
                        relationKind: 'program',
                        programId: 'other',
                    },
                ],
            },
        );
        expect(draft).not.toBeNull();
        expect(draft?.subject).toBe('Kaga City Artist Residency Calendar');
        expect(draft?.bodyHtml).toContain('Welcome breakfast');
        expect(draft?.bodyHtml).toContain('Sep 14');
        expect(draft?.bodyHtml).toContain('9:00 AM');
        expect(draft?.bodyHtml).not.toContain('Draft only');
        expect(draft?.bodyHtml).not.toContain('Other program');
        expect(draft?.bodyHtml).toContain('c34ec160-kaga_2.jpg');
        expect(draft?.bodyHtml).toContain('VIEW CALENDAR');
        expect(draft?.bodyHtml).not.toContain('DOWNLOAD CALENDAR');
        expect(draft?.bodyHtml).toContain('Week 1');
    });

    it('flight follow-up template binds program name, hero, and travel prep cards', () => {
        const draft = buildTemplateDraftFromSource(
            'tpl_flight_followup',
            { type: 'program', id: 'kaga' },
            {
                programs: [
                    {
                        id: 'kaga',
                        enCard: {
                            headline: 'Kaga City Artist Residency',
                            focus: 'Kaga City Artist Residency',
                            location: 'Kaga City, Ishikawa',
                            imageSrc: 'https://cdn.example/kaga-hero.jpg',
                        },
                    },
                ],
                travelPrepLinks: [
                    {
                        title: 'Suica',
                        url: 'https://example.com/suica',
                        description: 'JR East IC card',
                        imageUrl: 'https://cdn.example/suica.png',
                        sortOrder: 0,
                    },
                ],
            },
        );
        expect(draft).not.toBeNull();
        expect(draft?.subject).toBe('Kaga City Artist Residency — add your arrival date and time');
        expect(draft?.bodyHtml).toContain('FLIGHT FOLLOW-UP');
        expect(draft?.bodyHtml).toContain('ADD ARRIVAL TIME');
        expect(draft?.bodyHtml).toContain('https://cdn.example/kaga-hero.jpg');
        expect(draft?.bodyHtml).toContain('Travel preparation');
        expect(draft?.bodyHtml).toContain('Suica');
        expect(draft?.bodyHtml).toContain('JR East IC card');
        expect(draft?.bodyHtml).not.toContain('Confirmation number');
    });

    it('reminder template keeps last-chance copy when program source is applied', () => {
        const draft = buildTemplateDraftFromSource(
            'tpl_reminder',
            { type: 'program', id: 'kaga' },
            {
                programs: [
                    {
                        id: 'kaga',
                        routeLink: '/program/kaga-ishikawa',
                        enCard: {
                            focus: 'Japan Artist Residency',
                            location: 'Kaga City, Ishikawa',
                            year: '2026',
                            imageSrc: 'https://cdn.example/kaga.jpg',
                            briefDescription: 'Generic program update brief that must not replace reminder copy.',
                        },
                    },
                ],
            },
        );
        expect(draft).not.toBeNull();
        expect(draft?.bodyHtml).toContain('This is<br>your window.');
        expect(draft?.bodyHtml).toContain('DEADLINE APPROACHING');
        expect(draft?.bodyHtml).toContain('APPLY BEFORE THE DEADLINE');
        expect(draft?.bodyHtml).toContain('https://cdn.example/kaga.jpg');
        expect(draft?.bodyHtml).toContain('/program/kaga-ishikawa');
        expect(draft?.bodyHtml).not.toContain('Program Update');
        expect(draft?.bodyHtml).not.toContain('Generic program update brief');
        expect(draft?.subject.toLowerCase()).toContain('last chance');
    });

    it('mergeQuickDesignSlots preserves source factual fields and normalizes body', () => {
        const merged = mergeQuickDesignSlots(
            {
                eyebrow: 'AI Eyebrow',
                headlineHtml: 'AI Headline',
                bodyHtml: '<p style="color:#333">AI body</p><p>More</p>',
                cta: { label: 'AI CTA', href: 'https://ai.example' },
                heroImageUrl: 'https://ai.example/hero.jpg',
                subject: 'AI subject',
            },
            {
                eyebrow: 'Artist Spotlight',
                headlineHtml: 'Jane<br>Doe',
                cta: { label: 'VIEW PROFILE', href: 'https://www.fusionart.world/profile/jane' },
                heroImageUrl: 'https://cdn.example/jane.jpg',
                subject: 'Jane Doe — Artist spotlight',
            },
        );
        expect(merged.headlineHtml).toBe('Jane<br>Doe');
        expect(merged.cta?.href).toContain('/profile/jane');
        expect(merged.bodyHtml).toContain(FUSION_EMAIL_STYLES.bodyLead);
        expect(merged.bodyHtml).not.toContain('#333');
        expect(merged.subject).toBe('AI subject');
    });

    it('finalizeQuickDesignSlots preserves editor hero and applies template defaults', () => {
        const merged = finalizeQuickDesignSlots(
            'tpl_general',
            { bodyHtml: '<p style="color:#666">Refined copy.</p>' },
            {
                editorSlots: {
                    heroImageUrl: 'https://cdn.example/keep-hero.jpg',
                    heroAlt: 'Hero alt',
                    eyebrow: 'Program Update',
                },
            },
        );
        expect(merged.heroImageUrl).toBe('https://cdn.example/keep-hero.jpg');
        expect(merged.eyebrow).toBe('Program Update');
        expect(merged.bodyHtml).toContain(FUSION_EMAIL_STYLES.bodyLead);
        expect(merged.bodyHtml).not.toContain('#666');
    });

    it('parseEmailLayoutLlmJson strips markdown fences', () => {
        const raw = '```json\n{"subject":"Hi","layout":{"eyebrow":"Test","bodyHtml":"<p>x</p>"}}\n```';
        const parsed = parseEmailLayoutLlmJson(raw);
        expect(parsed?.subject).toBe('Hi');
        expect(parsed?.layout?.eyebrow).toBe('Test');
    });
});
