import { describe, expect, it } from 'vitest';
import {
    buildKeyDatesLocalesFromRows,
    deepGet,
    deepSet,
    emptyKeyDateRow,
    emptyKeyDateSectionRow,
    keyDateRowIsEmpty,
    mergeKeyDatesSeed,
    PROGRAM_FIELD_HELPERS,
    collectProgramDrawFromForm,
    renderProgramLocaleFormHtml,
} from './studioProgramLocaleForm.js';

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

    it('renderProgramLocaleFormHtml includes tab panels and field rows', () => {
        const html = renderProgramLocaleFormHtml(esc, { focus: 'A', id: 'Test' }, { focus: 'B' });
        expect(html).toContain('data-prog-panel="basics"');
        expect(html).toContain('data-prog-panel="draw"');
        expect(html).toContain('data-prog-draw="active"');
        expect(html).toContain('data-prog-draw="totalSlots"');
        expect(html).toContain('data-prog-draw="goalReached"');
        expect(html).toContain('data-prog-draw="closed"');
        expect(html).toContain('Goal reached');
        expect(html).toContain('End program');
        expect(html).toContain('studio-prog-field-row');
        expect(html).toContain('studio-prog-editor-lang-toggle');
        expect(html).toContain('data-prog-key-dates');
        expect(html).toContain('data-prog-key-dates-add-section');
        expect(html).toContain('data-prog-translatable="1"');
        expect(html).toContain(PROGRAM_FIELD_HELPERS.id);
        expect(html).toContain('Card ID');
    });

    it('renderProgramLocaleFormHtml auto-checks Goal reached at the slot boundary', () => {
        const html = renderProgramLocaleFormHtml(esc, {}, {}, {
            active: true,
            totalSlots: 100,
            enteredCount: 100,
            closed: true,
        });
        expect(html).toMatch(/data-prog-draw="goalReached"[^>]*checked/);
        expect(html).toMatch(/data-prog-draw="closed"[^>]*checked/);
    });

    it('mergeKeyDatesSeed merges en and ja rows by index', () => {
        const rows = mergeKeyDatesSeed(
            {
                programPage: {
                    programDetails: {
                        keyDates: [{ date: 'July 5', description: 'Deadline' }],
                    },
                },
            },
            {
                programPage: {
                    programDetails: {
                        keyDates: [{ date: '7月5日', description: '締切' }],
                    },
                },
            },
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].kind).toBe('date');
        expect(rows[0].enDate).toBe('July 5');
        expect(rows[0].jaDesc).toBe('締切');
    });

    it('mergeKeyDatesSeed recognizes section rows', () => {
        const rows = mergeKeyDatesSeed(
            {
                programPage: {
                    programDetails: {
                        keyDates: [{ sectionTitle: 'Tokyo' }, { date: 'September 10', description: 'Arrival' }],
                    },
                },
            },
            {
                programPage: {
                    programDetails: {
                        keyDates: [{ sectionTitle: '東京' }, { date: '9月10日', description: '到着' }],
                    },
                },
            },
        );
        expect(rows).toHaveLength(2);
        expect(rows[0].kind).toBe('section');
        expect(rows[0].enSectionTitle).toBe('Tokyo');
        expect(rows[0].jaSectionTitle).toBe('東京');
        expect(rows[1].kind).toBe('date');
        expect(rows[1].enDate).toBe('September 10');
    });

    it('keyDateRowIsEmpty detects blank rows', () => {
        expect(keyDateRowIsEmpty(emptyKeyDateRow())).toBe(true);
        expect(keyDateRowIsEmpty({ ...emptyKeyDateRow(), enDate: 'July' })).toBe(false);
        expect(keyDateRowIsEmpty(emptyKeyDateSectionRow())).toBe(true);
        expect(keyDateRowIsEmpty({ ...emptyKeyDateSectionRow(), enSectionTitle: 'Tokyo' })).toBe(false);
    });

    it('buildKeyDatesLocalesFromRows trims empty rows and preserves order', () => {
        const { en, ja } = buildKeyDatesLocalesFromRows([
            {
                kind: 'section',
                enSectionTitle: 'Program Timeline',
                jaSectionTitle: 'プログラム日程',
                enDate: '',
                enDesc: '',
                jaDate: '',
                jaDesc: '',
            },
            {
                kind: 'date',
                enDate: 'July 5',
                enDesc: 'Application Deadline',
                jaDate: '7月5日',
                jaDesc: '締切',
                enSectionTitle: '',
                jaSectionTitle: '',
            },
            {
                kind: 'date',
                enDate: '',
                enDesc: '',
                jaDate: '',
                jaDesc: '',
                enSectionTitle: '',
                jaSectionTitle: '',
            },
        ]);
        expect(en).toEqual([
            { sectionTitle: 'Program Timeline' },
            { date: 'July 5', description: 'Application Deadline' },
        ]);
        expect(ja).toEqual([{ sectionTitle: 'プログラム日程' }, { date: '7月5日', description: '締切' }]);
    });

    it('collectProgramDrawFromForm returns closed from the End program checkbox', () => {
        const root = {
            querySelector(sel) {
                if (sel === '[data-prog-draw="active"]') return { checked: true };
                if (sel === '[data-prog-draw="totalSlots"]') return { value: '80' };
                if (sel === '[data-prog-draw="closed"]') return { checked: true };
                return null;
            },
        };
        expect(collectProgramDrawFromForm(root)).toEqual({
            active: true,
            totalSlots: 80,
            closed: true,
        });
    });

    it('collectProgramDrawFromForm defaults closed to false when the checkbox is missing', () => {
        const root = {
            querySelector(sel) {
                if (sel === '[data-prog-draw="active"]') return { checked: false };
                if (sel === '[data-prog-draw="totalSlots"]') return { value: '' };
                return null;
            },
        };
        expect(collectProgramDrawFromForm(root)).toEqual({
            active: false,
            totalSlots: 100,
            closed: false,
        });
    });
});
