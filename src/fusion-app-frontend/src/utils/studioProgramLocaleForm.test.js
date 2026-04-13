import { describe, expect, it } from 'vitest';
import { deepGet, deepSet, renderProgramLocaleFormHtml } from './studioProgramLocaleForm.js';

function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

describe('studioProgramLocaleForm', () => {
    it('deepSet and deepGet nested paths including arrays', () => {
        const root = /** @type {Record<string, unknown>} */ ({});
        deepSet(root, 'programPage.offeringCards.0.title', 'Hello');
        expect(deepGet(root, 'programPage.offeringCards.0.title')).toBe('Hello');
        deepSet(root, 'programPage.programDetails.keyDates.1.date', 'Aug');
        expect(deepGet(root, 'programPage.programDetails.keyDates.1.date')).toBe('Aug');
    });

    it('renderProgramLocaleFormHtml includes grid headers', () => {
        const html = renderProgramLocaleFormHtml(esc, { focus: 'A' }, { focus: 'B' });
        expect(html).toContain('studio-prog-col-title');
        expect(html).toContain('English');
        expect(html).toContain('Program card');
    });
});
