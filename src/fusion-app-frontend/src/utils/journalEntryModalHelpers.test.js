import { describe, it, expect } from 'vitest';
import {
    buildJournalExpandPrompt,
    buildJournalEntryPublicLink,
    buildJournalQuickDraftPrompt,
    buildJournalRefinePrompt,
    buildJournalShortenPrompt,
    collectJournalLocalesPayload,
    journalAssistLocaleTag,
    journalEntryFormSnapshotJson,
    normalizeJournalAssistTone,
    resolveJournalEntryLink,
} from './journalEntryModalHelpers.js';

describe('journalEntryModalHelpers', () => {
    it('normalizeJournalAssistTone falls back to Elevated', () => {
        expect(normalizeJournalAssistTone('Formal')).toBe('Formal');
        expect(normalizeJournalAssistTone('bogus')).toBe('Elevated');
    });

    it('buildJournalQuickDraftPrompt includes tone and seed when provided', () => {
        const empty = buildJournalQuickDraftPrompt('Warm and direct', '');
        expect(empty).toContain('Warm and direct');
        expect(empty).toContain('plain text only');
        const seeded = buildJournalQuickDraftPrompt('Elevated', 'Notes about residency');
        expect(seeded).toContain('Notes about residency');
    });

    it('buildJournalRefinePrompt and transform prompts are plain-text only', () => {
        expect(buildJournalRefinePrompt()).toContain('plain text');
        expect(buildJournalExpandPrompt()).toContain('Expand');
        expect(buildJournalShortenPrompt()).toContain('Shorten');
    });

    it('journalAssistLocaleTag maps ja', () => {
        expect(journalAssistLocaleTag('en')).toBe('en');
        expect(journalAssistLocaleTag('ja')).toBe('ja');
    });

    it('collectJournalLocalesPayload merges plain fields into locales', () => {
        const { en, ja } = collectJournalLocalesPayload(
            { title: 'Old EN', description: 'Old body', cta: 'Read' },
            { title: 'Old JA' },
            { titleEn: 'New EN', bodyEn: 'Body EN', titleJa: '新', bodyJa: '本文' }
        );
        expect(en).toEqual({ title: 'New EN', description: 'Body EN', cta: 'Read' });
        expect(ja).toEqual({ title: '新', description: '本文' });
    });

    it('buildJournalEntryPublicLink slugifies title', () => {
        expect(buildJournalEntryPublicLink('Perhaps One of the', 'j_1')).toBe(
            '/journal/entry/perhaps-one-of-the'
        );
    });

    it('resolveJournalEntryLink prefers explicit link', () => {
        expect(resolveJournalEntryLink('/journal/entry/custom', 'Title', 'j_1')).toBe(
            '/journal/entry/custom'
        );
        expect(resolveJournalEntryLink('', 'My Title', 'j_1')).toBe('/journal/entry/my-title');
    });

    it('journalEntryFormSnapshotJson detects dirty state', () => {
        const a = journalEntryFormSnapshotJson({
            id: 'j_1',
            link: '/journal/entry/a',
            imageSrc: '',
            entryStatus: 'draft',
            titleEn: 'T',
            titleJa: '',
            bodyEn: 'B',
            bodyJa: '',
        });
        const b = journalEntryFormSnapshotJson({
            id: 'j_1',
            link: '/journal/entry/a',
            imageSrc: '',
            entryStatus: 'draft',
            titleEn: 'T2',
            titleJa: '',
            bodyEn: 'B',
            bodyJa: '',
        });
        expect(a).not.toBe(b);
    });
});
