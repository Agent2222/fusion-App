import { describe, expect, it } from 'vitest';
import {
    campaignNeedsPerRecipientTrialCodes,
    DRAW_GOAL_NOT_REACHED_TEMPLATE_ID,
    htmlNeedsTrialAccessPlaceholders,
    interpolateTrialAccessHtml,
    joinUrlForTrialAccessCode,
    normalizeTrialAccessCode,
    trialAccessCodeFromSearch,
} from './trialAccessCode.js';

describe('trialAccessCode', () => {
    it('normalizes to 8 digits', () => {
        expect(normalizeTrialAccessCode('12-34 5678')).toBe('12345678');
        expect(normalizeTrialAccessCode('abc')).toBe('');
    });

    it('builds join URL with code query', () => {
        expect(joinUrlForTrialAccessCode('12345678')).toMatch(/\/join-network\?code=12345678$/);
        expect(joinUrlForTrialAccessCode('')).toMatch(/\/join-network$/);
    });

    it('reads code from search', () => {
        expect(trialAccessCodeFromSearch('?code=87654321')).toBe('87654321');
        expect(trialAccessCodeFromSearch('?access=11112222')).toBe('11112222');
        expect(trialAccessCodeFromSearch('?ref=RADAR-A7K2')).toBe('');
    });

    it('interpolates trial placeholders', () => {
        const html = interpolateTrialAccessHtml('<p>{{TRIAL_ACCESS_CODE}}</p><a href="{{TRIAL_JOIN_URL}}">Join</a>', {
            code: '12345678',
        });
        expect(html).toContain('12345678');
        expect(html).toContain('/join-network?code=12345678');
        expect(html).not.toContain('{{TRIAL_ACCESS_CODE}}');
    });

    it('flags draw-goal template and leftover tokens', () => {
        expect(campaignNeedsPerRecipientTrialCodes(DRAW_GOAL_NOT_REACHED_TEMPLATE_ID, '')).toBe(true);
        expect(htmlNeedsTrialAccessPlaceholders('code {{TRIAL_ACCESS_CODE}}')).toBe(true);
        expect(campaignNeedsPerRecipientTrialCodes('tpl_general', '<p>hello</p>')).toBe(false);
    });
});
