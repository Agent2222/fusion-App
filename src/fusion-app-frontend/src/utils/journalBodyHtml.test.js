import { describe, it, expect } from 'vitest';
import {
    journalDescriptionToEditorHtml,
    journalPlainTextToEditorHtml,
    repairCorruptedJournalBodyHtml,
    sanitizeJournalBodyHtml,
} from './journalBodyHtml.js';

describe('journalBodyHtml', () => {
    it('journalDescriptionToEditorHtml wraps plain paragraphs', () => {
        const html = journalDescriptionToEditorHtml('First para.\n\nSecond para.');
        expect(html).toContain('<p>');
        expect(html).toContain('First para.');
        expect(html).toContain('Second para.');
    });

    it('sanitizeJournalBodyHtml escapes unsafe markup without DOM', () => {
        const out = sanitizeJournalBodyHtml('<p>Hi</p><script>alert(1)</script>');
        expect(out).not.toContain('<script>');
        expect(out).toContain('Hi');
    });

    it('journalDescriptionToEditorHtml wraps plain text in paragraphs', () => {
        const out = journalDescriptionToEditorHtml('Hello world');
        expect(out).toContain('<p>');
        expect(out).toContain('Hello world');
    });

    it('journalPlainTextToEditorHtml converts LLM plain text', () => {
        expect(journalPlainTextToEditorHtml('Line one')).toContain('Line one');
    });

    it('repairCorruptedJournalBodyHtml rebuilds truncated img markup', () => {
        const corrupted =
            'https://cdn.fusionart.world/uploads/studio/journal/j_1/body.jpg" alt="" loading="lazy" style="max-width:100%;"></p><p>Perhaps one of the';
        const repaired = repairCorruptedJournalBodyHtml(corrupted);
        expect(repaired).toContain('<img src="https://cdn.fusionart.world/uploads/');
        expect(repaired).toContain('Perhaps one of the');
    });

    it('repairCorruptedJournalBodyHtml decodes percent-encoded fragments', () => {
        const encoded =
            'https://cdn.fusionart.world/uploads/studio/journal/j_1/body.jpg%22%20alt=%22%22%20style=%22max-width:100%25;%22%3E%3C/p%3E%3Cp%3EHello';
        const repaired = repairCorruptedJournalBodyHtml(encoded);
        expect(repaired).toContain('<img src="');
        expect(repaired).toContain('Hello');
    });

    it('journalDescriptionToEditorHtml splits single newlines into paragraphs', () => {
        const out = journalDescriptionToEditorHtml('First paragraph.\nSecond paragraph.\nThird paragraph.');
        expect(out.match(/<p>/g)?.length).toBe(3);
        expect(out).toContain('Second paragraph.');
    });
});
