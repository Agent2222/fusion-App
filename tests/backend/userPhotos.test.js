import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Principal } from '@dfinity/principal';
import {
    setupPic,
    teardownPic,
    deployBackend,
    ADMIN_PRINCIPAL,
    USER1_PRINCIPAL,
    USER2_PRINCIPAL,
} from './setup.js';

const ARTIST_ID = 'test-artist-001';
const ACCESS_CODE = '12345678';

function makeArtistRecord(id, accessCode) {
    return {
        imported: false,
        localesJson: [],
        accessCode,
        profile: {
            id,
            slug: `artist-${id}`,
            updatedAt: '2026-01-01T00:00:00Z',
            filter: [],
            galleryFilter: [],
            contactEmail: 'artist@test.com',
            image: 'https://example.com/original-artwork.jpg',
            featuredOrder: BigInt(0),
            visibility: 'visible',
        },
        notesEncrypted: [],
    };
}

async function setupLinkedArtist(actor) {
    // Admin creates the artist in the roster with an access code
    actor.setPrincipal(ADMIN_PRINCIPAL);
    await actor.upsertArtist(
        makeArtistRecord(ARTIST_ID, ACCESS_CODE),
        'https://example.com/original-hero.jpg',
    );

    // User registers with the artist's roster access code → gets linked
    actor.setPrincipal(USER1_PRINCIPAL);
    const result = await actor.registerWithJoinAccessCode(
        { artist: null },
        ACCESS_CODE,
        'Test',
        'Artist',
        'artist@test.com',
    );
    expect(result).toEqual({ ok: null });
}

describe('User Photo Upload & Change', () => {
    let pic;
    let picCtx;
    let actor;

    beforeAll(async () => {
        picCtx = await setupPic();
        pic = picCtx.pic;
    });

    afterAll(async () => {
        await teardownPic(picCtx);
    });

    beforeEach(async () => {
        const fixture = await deployBackend(pic);
        actor = fixture.actor;
    });

    // --- Profile artwork image (ArtistCore.image) ---

    describe('updateMyArtistProfilePatch', () => {
        it('updates the artist profile image', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(USER1_PRINCIPAL);

            const newImage = 'https://cdn.example.com/new-artwork.jpg';
            await actor.updateMyArtistProfilePatch(newImage, '2026-06-01T00:00:00Z');

            const record = await actor.getMyArtistRecord();
            expect(record).toHaveLength(1);
            expect(record[0].profile.image).toBe(newImage);
            expect(record[0].profile.updatedAt).toBe('2026-06-01T00:00:00Z');
        });

        it('can change the image to a different URL', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(USER1_PRINCIPAL);

            await actor.updateMyArtistProfilePatch(
                'https://cdn.example.com/first.jpg',
                '2026-06-01T00:00:00Z',
            );
            await actor.updateMyArtistProfilePatch(
                'https://cdn.example.com/second.jpg',
                '2026-06-02T00:00:00Z',
            );

            const record = await actor.getMyArtistRecord();
            expect(record[0].profile.image).toBe('https://cdn.example.com/second.jpg');
            expect(record[0].profile.updatedAt).toBe('2026-06-02T00:00:00Z');
        });

        it('traps for anonymous caller', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(Principal.anonymous());
            await expect(
                actor.updateMyArtistProfilePatch('https://example.com/x.jpg', '2026-01-01'),
            ).rejects.toThrow();
        });

        it('traps for user with no account', async () => {
            actor.setPrincipal(USER2_PRINCIPAL);
            await expect(
                actor.updateMyArtistProfilePatch('https://example.com/x.jpg', '2026-01-01'),
            ).rejects.toThrow();
        });

        it('traps for user with no linked artist', async () => {
            actor.setPrincipal(USER2_PRINCIPAL);
            await actor.registerOrUpdateAccount({ collector: null });
            await expect(
                actor.updateMyArtistProfilePatch('https://example.com/x.jpg', '2026-01-01'),
            ).rejects.toThrow();
        });

        it('traps when image URL is too long', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(USER1_PRINCIPAL);
            const tooLong = 'https://example.com/' + 'x'.repeat(5000);
            await expect(
                actor.updateMyArtistProfilePatch(tooLong, '2026-01-01'),
            ).rejects.toThrow();
        });
    });

    // --- Hero profile image (headshot for cards) ---

    describe('updateMyArtistHeroProfileImagePatch', () => {
        it('sets the hero profile image', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(USER1_PRINCIPAL);

            const heroUrl = 'https://cdn.example.com/headshot-new.jpg';
            await actor.updateMyArtistHeroProfileImagePatch(heroUrl, '2026-07-01T00:00:00Z');

            // Verify via the public list (hero images stored separately)
            const heroImages = await actor.listArtistHeroProfileImagePublic();
            const entry = heroImages.find(([id]) => id === ARTIST_ID);
            expect(entry).toBeDefined();
            expect(entry[1]).toBe(heroUrl);
        });

        it('can change the hero image to a different URL', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(USER1_PRINCIPAL);

            await actor.updateMyArtistHeroProfileImagePatch(
                'https://cdn.example.com/headshot-v1.jpg',
                '2026-07-01T00:00:00Z',
            );
            await actor.updateMyArtistHeroProfileImagePatch(
                'https://cdn.example.com/headshot-v2.jpg',
                '2026-07-02T00:00:00Z',
            );

            const heroImages = await actor.listArtistHeroProfileImagePublic();
            const entry = heroImages.find(([id]) => id === ARTIST_ID);
            expect(entry[1]).toBe('https://cdn.example.com/headshot-v2.jpg');
        });

        it('traps for anonymous caller', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(Principal.anonymous());
            await expect(
                actor.updateMyArtistHeroProfileImagePatch('https://example.com/x.jpg', '2026-01-01'),
            ).rejects.toThrow();
        });

        it('traps for user with no linked artist', async () => {
            actor.setPrincipal(USER2_PRINCIPAL);
            await actor.registerOrUpdateAccount({ gallery: null });
            await expect(
                actor.updateMyArtistHeroProfileImagePatch('https://example.com/x.jpg', '2026-01-01'),
            ).rejects.toThrow();
        });

        it('traps when URL is too long', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(USER1_PRINCIPAL);
            const tooLong = 'https://example.com/' + 'x'.repeat(5000);
            await expect(
                actor.updateMyArtistHeroProfileImagePatch(tooLong, '2026-01-01'),
            ).rejects.toThrow();
        });
    });

    // --- Quote and audio media ---

    describe('updateMyArtistQuoteAudioPatch', () => {
        it('sets quote and audio fields', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(USER1_PRINCIPAL);

            await actor.updateMyArtistQuoteAudioPatch(
                'Art is life.',
                'https://cdn.example.com/audio.mp3',
                'My Statement',
                '2026-08-01T00:00:00Z',
            );

            const media = await actor.getMyArtistMedia();
            expect(media).toHaveLength(1);
            expect(media[0].quote).toBe('Art is life.');
            expect(media[0].audioUrl).toBe('https://cdn.example.com/audio.mp3');
            expect(media[0].audioTitle).toBe('My Statement');
            expect(media[0].updatedAt).toBe('2026-08-01T00:00:00Z');
        });

        it('can change quote and audio to new values', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(USER1_PRINCIPAL);

            await actor.updateMyArtistQuoteAudioPatch(
                'First quote.',
                'https://cdn.example.com/audio-v1.mp3',
                'V1 Title',
                '2026-08-01T00:00:00Z',
            );
            await actor.updateMyArtistQuoteAudioPatch(
                'Updated quote.',
                'https://cdn.example.com/audio-v2.mp3',
                'V2 Title',
                '2026-08-02T00:00:00Z',
            );

            const media = await actor.getMyArtistMedia();
            expect(media[0].quote).toBe('Updated quote.');
            expect(media[0].audioUrl).toBe('https://cdn.example.com/audio-v2.mp3');
            expect(media[0].audioTitle).toBe('V2 Title');
        });

        it('traps for anonymous caller', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(Principal.anonymous());
            await expect(
                actor.updateMyArtistQuoteAudioPatch('q', 'https://x.com/a.mp3', 't', '2026-01-01'),
            ).rejects.toThrow();
        });

        it('traps for user with no linked artist', async () => {
            actor.setPrincipal(USER2_PRINCIPAL);
            await actor.registerOrUpdateAccount({ collector: null });
            await expect(
                actor.updateMyArtistQuoteAudioPatch('q', 'https://x.com/a.mp3', 't', '2026-01-01'),
            ).rejects.toThrow();
        });

        it('traps when audio URL is too long', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(USER1_PRINCIPAL);
            const tooLong = 'https://example.com/' + 'x'.repeat(5000);
            await expect(
                actor.updateMyArtistQuoteAudioPatch('q', tooLong, 't', '2026-01-01'),
            ).rejects.toThrow();
        });
    });

    // --- Combined: upload all then change all ---

    describe('full photo lifecycle', () => {
        it('uploads all images, then changes all of them', async () => {
            await setupLinkedArtist(actor);
            actor.setPrincipal(USER1_PRINCIPAL);

            // Initial upload of all photo/media fields
            await actor.updateMyArtistProfilePatch(
                'https://cdn.example.com/artwork-v1.jpg',
                '2026-01-01T00:00:00Z',
            );
            await actor.updateMyArtistHeroProfileImagePatch(
                'https://cdn.example.com/headshot-v1.jpg',
                '2026-01-01T00:00:00Z',
            );
            await actor.updateMyArtistQuoteAudioPatch(
                'Original quote.',
                'https://cdn.example.com/audio-v1.mp3',
                'Original Title',
                '2026-01-01T00:00:00Z',
            );

            // Verify initial state
            let record = await actor.getMyArtistRecord();
            expect(record[0].profile.image).toBe('https://cdn.example.com/artwork-v1.jpg');

            let heroImages = await actor.listArtistHeroProfileImagePublic();
            let heroEntry = heroImages.find(([id]) => id === ARTIST_ID);
            expect(heroEntry[1]).toBe('https://cdn.example.com/headshot-v1.jpg');

            let media = await actor.getMyArtistMedia();
            expect(media[0].audioUrl).toBe('https://cdn.example.com/audio-v1.mp3');

            // Change all photos/media
            await actor.updateMyArtistProfilePatch(
                'https://cdn.example.com/artwork-v2.jpg',
                '2026-02-01T00:00:00Z',
            );
            await actor.updateMyArtistHeroProfileImagePatch(
                'https://cdn.example.com/headshot-v2.jpg',
                '2026-02-01T00:00:00Z',
            );
            await actor.updateMyArtistQuoteAudioPatch(
                'New quote.',
                'https://cdn.example.com/audio-v2.mp3',
                'New Title',
                '2026-02-01T00:00:00Z',
            );

            // Verify all changed
            record = await actor.getMyArtistRecord();
            expect(record[0].profile.image).toBe('https://cdn.example.com/artwork-v2.jpg');
            expect(record[0].profile.updatedAt).toBe('2026-02-01T00:00:00Z');

            heroImages = await actor.listArtistHeroProfileImagePublic();
            heroEntry = heroImages.find(([id]) => id === ARTIST_ID);
            expect(heroEntry[1]).toBe('https://cdn.example.com/headshot-v2.jpg');

            media = await actor.getMyArtistMedia();
            expect(media[0].quote).toBe('New quote.');
            expect(media[0].audioUrl).toBe('https://cdn.example.com/audio-v2.mp3');
            expect(media[0].audioTitle).toBe('New Title');
        });
    });
});
