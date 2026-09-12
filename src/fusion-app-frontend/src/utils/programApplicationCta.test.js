import { describe, expect, it } from 'vitest';
import {
    programApplicationClosedCtaLabel,
    programApplicationCtaSubLabel,
    programApplicationsAreOpen,
    programDrawCtaLabel,
    programDrawCtaSubLabel,
} from './programApplicationCta.js';

describe('programApplicationsAreOpen', () => {
    it('is true only for open when a studio status is set', () => {
        expect(programApplicationsAreOpen('open')).toBe(true);
        expect(programApplicationsAreOpen('Open')).toBe(true);
        expect(programApplicationsAreOpen('full')).toBe(false);
        expect(programApplicationsAreOpen('comingUp')).toBe(false);
        expect(programApplicationsAreOpen('completed')).toBe(false);
        expect(programApplicationsAreOpen('active')).toBe(false);
    });

    it('treats empty status as open unless acceptingApplications is false', () => {
        expect(programApplicationsAreOpen('')).toBe(true);
        expect(programApplicationsAreOpen('', true)).toBe(true);
        expect(programApplicationsAreOpen('', false)).toBe(false);
    });
});

describe('programApplicationClosedCtaLabel', () => {
    it('uses Program full when studioStatus is full', () => {
        expect(programApplicationClosedCtaLabel('full')).toBe('Program full');
        expect(programApplicationClosedCtaLabel('Full')).toBe('Program full');
    });

    it('uses Coming soon for upcoming and other closed statuses', () => {
        expect(programApplicationClosedCtaLabel('comingUp')).toBe('Coming soon');
        expect(programApplicationClosedCtaLabel('completed')).toBe('Coming soon');
        expect(programApplicationClosedCtaLabel('')).toBe('Coming soon');
    });
});

describe('programDrawCtaLabel', () => {
    it('uses Program Draw when the draw is closed even if config is still active', () => {
        expect(programDrawCtaLabel(true, false, true)).toBe('Program Draw');
        expect(programDrawCtaSubLabel(100, true, true)).toBe(
            'Get notified when the next draw opens',
        );
    });

    it('uses Enter Program Draw only when open and active', () => {
        expect(programDrawCtaLabel(true, false, false)).toBe('Enter Program Draw');
    });
});

describe('programApplicationCtaSubLabel', () => {
    it('keeps apply copy while applications are open', () => {
        expect(programApplicationCtaSubLabel('open', true)).toBe('Apply for the residency program');
        expect(programApplicationCtaSubLabel('full', true)).toBe('Apply for the residency program');
    });

    it('does not invite apply when the program is full or closed', () => {
        expect(programApplicationCtaSubLabel('full', false)).toBe('This residency is at capacity');
        expect(programApplicationCtaSubLabel('comingUp', false)).toBe('Applications open soon');
    });
});
