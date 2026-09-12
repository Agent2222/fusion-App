import { describe, expect, it } from 'vitest';
import {
    programCohortBrandLabel,
    programCohortHeadline,
    seasonFromProgramStartDate,
    stripArtistResidencyFromProgramTitle,
} from './programCohortHeadline.js';

describe('seasonFromProgramStartDate', () => {
    it('maps autumn starts to Fall', () => {
        expect(seasonFromProgramStartDate('September 1, 2026')).toBe('Fall');
        expect(seasonFromProgramStartDate('Oct 2026')).toBe('Fall');
    });

    it('maps early-year starts to Spring', () => {
        expect(seasonFromProgramStartDate('March 2026')).toBe('Spring');
    });
});

describe('stripArtistResidencyFromProgramTitle', () => {
    it('removes trailing Artist Residency label', () => {
        expect(stripArtistResidencyFromProgramTitle('Fusion Kaga - Fall 2026 Artist Residency')).toBe(
            'Fusion Kaga - Fall 2026',
        );
    });
});

describe('programCohortBrandLabel', () => {
    it('uses Fusion Kaga for kaga program ids', () => {
        expect(programCohortBrandLabel('fusionKaga')).toBe('Fusion Kaga');
        expect(programCohortBrandLabel('fusion-kaga-2026')).toBe('Fusion Kaga');
    });
});

describe('programCohortHeadline', () => {
    it('builds Fusion Kaga - Fall 2026 Cohort from program id + dates', () => {
        expect(
            programCohortHeadline({
                programId: 'fusionKaga',
                year: '2026',
                startDate: 'September 2026',
            }),
        ).toBe('Fusion Kaga - Fall 2026 Cohort');
    });

    it('does not duplicate season/year from CMS headline fallback', () => {
        expect(
            programCohortHeadline({
                programId: 'some-other-id',
                year: '2026',
                startDate: 'September 2026',
                headlineFallback: 'Fusion Kaga - Fall 2026 Artist Residency',
            }),
        ).toBe('Fusion Kaga - Fall 2026 Cohort');
    });

    it('falls back to confirmedHeadlineFallback when nothing else resolves', () => {
        expect(
            programCohortHeadline({
                confirmedHeadlineFallback: 'Confirmed Artists',
            }),
        ).toBe('Confirmed Artists');
    });
});
