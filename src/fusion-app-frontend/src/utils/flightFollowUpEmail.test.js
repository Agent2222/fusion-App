import { describe, expect, it } from 'vitest';
import { isFusionEmailLayout } from './emailFusionLayout.js';
import {
    SAMPLE_COMMS_TRAVEL_PREP_LINKS,
} from './programCommsInvite.js';
import {
    buildFlightFollowUpSubject,
    profileTravelTabUrl,
    renderFlightFollowUpHtml,
    sampleFlightFollowUpHtml,
} from './flightFollowUpEmail.js';

describe('buildFlightFollowUpSubject', () => {
    it('names the program in the arrival reminder', () => {
        expect(buildFlightFollowUpSubject('Kaga City')).toBe(
            'Kaga City — add your arrival date and time',
        );
        expect(buildFlightFollowUpSubject('')).toMatch(/the program/);
    });
});

describe('renderFlightFollowUpHtml', () => {
    it('prompts for arrival time then lists travel prep cards', () => {
        const html = renderFlightFollowUpHtml({
            programName: 'Kaga City',
            applicantName: 'Sam',
            travelPrepLinks: SAMPLE_COMMS_TRAVEL_PREP_LINKS,
        });
        expect(isFusionEmailLayout(html)).toBe(true);
        expect(html).toContain('FLIGHT FOLLOW-UP');
        expect(html).toContain('Add your');
        expect(html).toContain('arrival time');
        expect(html).toContain('Sam');
        expect(html).toContain('Kaga City');
        expect(html).toContain('ADD ARRIVAL TIME');
        expect(html).toContain(profileTravelTabUrl());
        expect(html).toContain('Travel preparation');
        expect(html).toMatch(/mobile wallet/i);
        expect(html).toContain('Suica');
        expect(html).toContain('ICOCA');
        expect(html).toContain('JR East IC card');
        expect(html).not.toContain('Confirmation number');
        expect(html).not.toContain('#a2b792');
        expect(html.indexOf('ADD ARRIVAL TIME')).toBeLessThan(html.indexOf('Travel preparation'));
    });

    it('omits travel prep when no cards are saved', () => {
        const html = renderFlightFollowUpHtml({ programName: 'Kaga City' });
        expect(html).toContain('ADD ARRIVAL TIME');
        expect(html).not.toContain('Travel preparation');
    });

    it('sample includes wallet cards and stays Fusion-branded', () => {
        const html = sampleFlightFollowUpHtml();
        expect(isFusionEmailLayout(html)).toBe(true);
        expect(html).toContain('Travel preparation');
        expect(html).toContain('Suica');
        expect(html).toContain('Add to wallet');
    });
});
