import { describe, expect, it } from 'vitest';
import {
    MAX_ARTIST_AUDIO_ENTRIES,
    addArtistAudioEntry,
    applyAudioUploadToCollection,
    emptyArtistAudioCollection,
    normalizeArtistAudioCollection,
    pendingAudioSaveError,
    removeArtistAudioEntry,
    replaceArtistAudioEntry,
    setArtistAudioHighlight,
    titleFromAudioFileName,
    uniqueAudioUploadFieldKey,
    validateAudioFile,
} from './artistAudioCollection.js';

function col(entries, extra = {}) {
    return {
        ...emptyArtistAudioCollection(),
        entries,
        ...extra,
    };
}

describe('artistAudioCollection CRUD', () => {
    it('creates a bite, reads it back, and sets highlight when empty', () => {
        const created = addArtistAudioEntry(
            emptyArtistAudioCollection(),
            'https://cdn.example.test/a1.mp3',
            'Studio notes',
            '2026-08-26T12:00:00Z',
        );
        expect(created.entries).toEqual([
            {
                url: 'https://cdn.example.test/a1.mp3',
                title: 'Studio notes',
                addedAt: '2026-08-26T12:00:00Z',
            },
        ]);
        expect(created.highlightUrl).toBe('https://cdn.example.test/a1.mp3');
        expect(normalizeArtistAudioCollection(created).entries).toHaveLength(1);
    });

    it('replaces a bite in place and clears approval for the old URL', () => {
        const start = col(
            [
                { url: 'https://cdn.example.test/old.mp3', title: 'Old', addedAt: 't1' },
                { url: 'https://cdn.example.test/keep.mp3', title: 'Keep', addedAt: 't2' },
            ],
            {
                highlightUrl: 'https://cdn.example.test/old.mp3',
                approvedUrls: ['https://cdn.example.test/old.mp3', 'https://cdn.example.test/keep.mp3'],
                fullSiteApprovedUrls: ['https://cdn.example.test/old.mp3'],
            },
        );
        const next = replaceArtistAudioEntry(
            start,
            'https://cdn.example.test/old.mp3',
            'https://cdn.example.test/new.mp3',
            'New take',
            't3',
        );
        expect(next.entries.map((e) => e.url)).toEqual([
            'https://cdn.example.test/new.mp3',
            'https://cdn.example.test/keep.mp3',
        ]);
        expect(next.entries[0].title).toBe('New take');
        expect(next.highlightUrl).toBe('https://cdn.example.test/new.mp3');
        expect(next.approvedUrls).toEqual(['https://cdn.example.test/keep.mp3']);
        expect(next.fullSiteApprovedUrls).toEqual([]);
    });

    it('deletes a bite and moves highlight to the remaining first entry', () => {
        const start = col(
            [
                { url: 'https://cdn.example.test/a.mp3', title: 'A', addedAt: 't1' },
                { url: 'https://cdn.example.test/b.mp3', title: 'B', addedAt: 't2' },
            ],
            { highlightUrl: 'https://cdn.example.test/a.mp3' },
        );
        const next = removeArtistAudioEntry(start, 'https://cdn.example.test/a.mp3');
        expect(next.entries).toHaveLength(1);
        expect(next.entries[0].url).toBe('https://cdn.example.test/b.mp3');
        expect(next.highlightUrl).toBe('https://cdn.example.test/b.mp3');
    });

    it('applyAudioUploadToCollection adds or replaces based on replaceUrl', () => {
        const added = applyAudioUploadToCollection(emptyArtistAudioCollection(), {
            url: 'https://cdn.example.test/a.mp3',
            title: 'A',
            ts: 't1',
        });
        expect(added.entries).toHaveLength(1);
        const replaced = applyAudioUploadToCollection(added, {
            url: 'https://cdn.example.test/b.mp3',
            title: 'B',
            replaceUrl: 'https://cdn.example.test/a.mp3',
            ts: 't2',
        });
        expect(replaced.entries).toEqual([
            { url: 'https://cdn.example.test/b.mp3', title: 'B', addedAt: 't2' },
        ]);
    });

    it('replaces at the 5-bite cap without growing the collection', () => {
        let filled = emptyArtistAudioCollection();
        for (let i = 0; i < MAX_ARTIST_AUDIO_ENTRIES; i += 1) {
            filled = addArtistAudioEntry(filled, `https://cdn.example.test/${i}.mp3`, `Clip ${i}`, `t${i}`);
        }
        const next = applyAudioUploadToCollection(filled, {
            url: 'https://cdn.example.test/swap.mp3',
            title: 'Swap',
            replaceUrl: 'https://cdn.example.test/0.mp3',
            ts: 'tx',
        });
        expect(next.entries).toHaveLength(5);
        expect(next.entries[0]).toEqual({
            url: 'https://cdn.example.test/swap.mp3',
            title: 'Swap',
            addedAt: 'tx',
        });
    });

    it('rejects a sixth create and a missing delete/replace target', () => {
        let filled = emptyArtistAudioCollection();
        for (let i = 0; i < MAX_ARTIST_AUDIO_ENTRIES; i += 1) {
            filled = addArtistAudioEntry(filled, `https://cdn.example.test/${i}.mp3`, `Clip ${i}`, `t${i}`);
        }
        expect(() =>
            addArtistAudioEntry(filled, 'https://cdn.example.test/extra.mp3', 'Extra', 'tx'),
        ).toThrow(/Maximum of 5/);
        expect(() => removeArtistAudioEntry(filled, 'https://missing.example/x.mp3')).toThrow(
            /not found/,
        );
        expect(() =>
            replaceArtistAudioEntry(
                filled,
                'https://missing.example/x.mp3',
                'https://cdn.example.test/n.mp3',
                'N',
            ),
        ).toThrow(/not found/);
    });

    it('rejects duplicate URLs on create', () => {
        const start = addArtistAudioEntry(
            emptyArtistAudioCollection(),
            'https://cdn.example.test/a.mp3',
            'A',
        );
        expect(() => addArtistAudioEntry(start, 'https://cdn.example.test/a.mp3', 'Again')).toThrow(
            /already exists/,
        );
    });

    it('sets highlight only for a URL in the collection', () => {
        const start = addArtistAudioEntry(
            emptyArtistAudioCollection(),
            'https://cdn.example.test/a.mp3',
            'A',
        );
        const next = setArtistAudioHighlight(start, 'https://cdn.example.test/a.mp3');
        expect(next.highlightUrl).toBe('https://cdn.example.test/a.mp3');
        expect(() => setArtistAudioHighlight(start, 'https://cdn.example.test/nope.mp3')).toThrow(
            /not found/,
        );
    });
});

describe('pending audio save guards', () => {
    const file = { name: 'take.mp3', type: 'audio/mpeg', size: 2048 };

    it('requires a real audio file and a title before upload', () => {
        expect(pendingAudioSaveError({})).toMatch(/No audio file/);
        expect(pendingAudioSaveError({ file, title: '' })).toMatch(/title/);
        expect(pendingAudioSaveError({ file, title: 'Take' })).toBeNull();
    });

    it('blocks a sixth new bite but allows replace at the cap', () => {
        expect(
            pendingAudioSaveError({
                file,
                title: 'Take',
                entryCount: 5,
            }),
        ).toMatch(/Maximum of 5/);
        expect(
            pendingAudioSaveError({
                file,
                title: 'Take',
                entryCount: 5,
                replaceUrl: 'https://cdn.example.test/old.mp3',
            }),
        ).toBeNull();
    });

    it('rejects oversized or non-audio files', () => {
        expect(
            validateAudioFile({ name: 'huge.mp3', type: 'audio/mpeg', size: 11 * 1024 * 1024 }),
        ).toMatchObject({ ok: false });
        expect(validateAudioFile({ name: 'doc.pdf', type: 'application/pdf', size: 100 })).toMatchObject({
            ok: false,
        });
        expect(validateAudioFile({ name: 'rec.webm', type: 'video/webm', size: 100 })).toEqual({
            ok: true,
        });
    });

    it('derives a title from the file name and a unique upload field key', () => {
        expect(titleFromAudioFileName('studio_session-01.mp3')).toBe('studio session 01');
        expect(uniqueAudioUploadFieldKey(() => 'abcd-efgh-ijkl')).toBe('audio-abcdefgh');
    });
});
