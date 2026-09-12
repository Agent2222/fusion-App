import { describe, expect, it } from 'vitest';
import { listArtistEnrolledProgramIds, removeEnrolledProgramFromArtist } from './studioArtistEnrolledPrograms.js';

describe('listArtistEnrolledProgramIds', () => {
    it('collects locale programs and mostRecentProgram', () => {
        expect(
            listArtistEnrolledProgramIds({
                mostRecentProgram: 'fusionKaga',
                locales: { en: { programs: ['fusionNihonbashi', 'Kaga 2026'] } },
            }),
        ).toEqual(['fusionNihonbashi', 'fusionKaga']);
    });
});

describe('removeEnrolledProgramFromArtist', () => {
    it('drops the program and updates mostRecentProgram to the last remaining id', () => {
        const next = removeEnrolledProgramFromArtist(
            {
                mostRecentProgram: 'fusionKaga',
                locales: { en: { programs: ['fusionNihonbashi', 'fusionKaga'] }, ja: { programs: ['fusionKaga'] } },
            },
            'fusionKaga',
        );
        expect(next.nextIds).toEqual(['fusionNihonbashi']);
        expect(next.mostRecentProgram).toBe('fusionNihonbashi');
        expect(next.locales.en.programs).toEqual(['fusionNihonbashi']);
        expect(next.locales.ja.programs).toEqual(['fusionNihonbashi']);
    });
});
