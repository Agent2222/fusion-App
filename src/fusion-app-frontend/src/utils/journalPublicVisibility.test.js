import { describe, it, expect } from 'vitest';
import {
    filterPublishedJournalEntries,
    isJournalEntryPublished,
    journalEntryOnLayout,
    journalEntryOnPageState,
    journalEntryRecencyMs,
    journalEntryStatus,
    journalLayoutRowVisibility,
    resolveJournalEntryByRef,
    resolveHomeJournalCarouselEntries,
    sortJournalEntriesNewestFirst,
} from './journalPublicVisibility.js';

describe('journalPublicVisibility', () => {
    const entries = [
        { id: 'j_1', entryStatus: 'published', en: { title: 'Live' } },
        { id: 'j_2', entryStatus: 'draft', en: { title: 'Draft' } },
        { id: 'j_3', entryStatus: 'archived', en: { title: 'Archived' } },
    ];

    it('journalEntryStatus defaults to draft and normalizes values', () => {
        expect(journalEntryStatus(null)).toBe('draft');
        expect(journalEntryStatus({})).toBe('draft');
        expect(journalEntryStatus({ entryStatus: 'Published' })).toBe('published');
        expect(journalEntryStatus({ entryStatus: 'archived' })).toBe('archived');
        expect(journalEntryStatus({ entryStatus: 'bogus' })).toBe('draft');
    });

    it('isJournalEntryPublished only accepts published', () => {
        expect(isJournalEntryPublished(entries[0])).toBe(true);
        expect(isJournalEntryPublished(entries[1])).toBe(false);
        expect(isJournalEntryPublished(entries[2])).toBe(false);
        expect(isJournalEntryPublished(undefined)).toBe(false);
    });

    it('filterPublishedJournalEntries keeps published rows only', () => {
        expect(filterPublishedJournalEntries(entries).map((e) => e.id)).toEqual(['j_1']);
        expect(filterPublishedJournalEntries(null)).toEqual([]);
    });

    it('resolveJournalEntryByRef resolves id and numeric index', () => {
        expect(resolveJournalEntryByRef('j_2', entries)?.id).toBe('j_2');
        expect(resolveJournalEntryByRef('1', entries)?.id).toBe('j_2');
        expect(resolveJournalEntryByRef('missing', entries)).toBeNull();
    });

    it('journalEntryOnLayout detects layout references', () => {
        const layout = [
            { rowType: 'journal-entry', refId: 'j_1' },
            { rowType: 'event', refId: 'e1' },
            { rowType: 'journal-entry', refId: 'j_2' },
        ];
        expect(journalEntryOnLayout('j_1', layout)).toEqual({ onLayout: true, rowCount: 1 });
        expect(journalEntryOnLayout('j_9', layout)).toEqual({ onLayout: false, rowCount: 0 });
    });

    it('journalLayoutRowVisibility covers live, hidden, and broken', () => {
        const layout = { rowType: 'journal-entry', refId: 'j_1' };
        expect(journalLayoutRowVisibility(layout, entries)).toBe('live');
        expect(journalLayoutRowVisibility({ rowType: 'journal-entry', refId: 'j_2' }, entries)).toBe(
            'hidden'
        );
        expect(journalLayoutRowVisibility({ rowType: 'journal-entry', refId: 'nope' }, entries)).toBe(
            'broken'
        );
        expect(journalLayoutRowVisibility({ rowType: 'quote' }, entries)).toBe('live');
    });

    it('sortJournalEntriesNewestFirst orders by updatedAt then id timestamp', () => {
        const rows = [
            { id: 'j_100', entryStatus: 'published', updatedAt: '2024-01-01T00:00:00.000Z' },
            { id: 'j_300', entryStatus: 'published', updatedAt: '2025-06-01T00:00:00.000Z' },
            { id: 'j_200', entryStatus: 'published', updatedAt: '2024-06-01T00:00:00.000Z' },
        ];
        expect(sortJournalEntriesNewestFirst(rows).map((e) => e.id)).toEqual(['j_300', 'j_200', 'j_100']);
        expect(journalEntryRecencyMs({ id: 'j_1782316547847' })).toBe(1782316547847);
    });

    it('sortJournalEntriesNewestFirst reverses legacy numeric fixture ids', () => {
        const rows = [
            { id: 1, entryStatus: 'published' },
            { id: 2, entryStatus: 'published' },
            { id: 3, entryStatus: 'published' },
        ];
        expect(sortJournalEntriesNewestFirst(rows).map((e) => e.id)).toEqual([3, 2, 1]);
    });

    it('resolveHomeJournalCarouselEntries preserves staff order and skips unpublished', () => {
        const rows = [
            { id: 'j_3', entryStatus: 'published', en: { title: 'C' } },
            { id: 'j_1', entryStatus: 'draft', en: { title: 'A' } },
            { id: 'j_2', entryStatus: 'published', en: { title: 'B' } },
        ];
        expect(
            resolveHomeJournalCarouselEntries(['j_2', 'j_3', 'j_1', 'j_2'], rows).map((e) => e.id)
        ).toEqual(['j_2', 'j_3']);
    });

    it('journalEntryOnPageState reflects public visibility', () => {
        const layout = [{ rowType: 'journal-entry', refId: 'j_1' }, { rowType: 'journal-entry', refId: 'j_2' }];
        expect(journalEntryOnPageState('j_1', layout, entries)).toBe('yes');
        expect(journalEntryOnPageState('j_2', layout, entries)).toBe('hidden');
        expect(journalEntryOnPageState('j_3', layout, entries)).toBe('no');
        expect(journalEntryOnPageState('j_1', [], entries)).toBe('no');
    });
});
