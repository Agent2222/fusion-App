import { describe, expect, it } from 'vitest';
import {
    applicantJoinUnlockAccessCopy,
    applicantJoinUnlockAccessHtml,
    applicantJoinUnlockRedeemMessage,
    applicantJoinUnlockRedeemingLabel,
} from './applicantStudioJoinUnlockAccess.js';

describe('applicantJoinUnlockRedeemMessage', () => {
    it('maps every redeem outcome', () => {
        expect(applicantJoinUnlockRedeemMessage('ok')).toMatch(/3-month trial/i);
        expect(applicantJoinUnlockRedeemMessage('ok')).toMatch(/application credit/i);
        expect(applicantJoinUnlockRedeemMessage('invalidCode')).toMatch(/not valid/i);
        expect(applicantJoinUnlockRedeemMessage('inviteInactive')).toMatch(/already been used/i);
        expect(applicantJoinUnlockRedeemMessage('notTrialInvite')).toMatch(/3-month trial/i);
        expect(applicantJoinUnlockRedeemMessage('noAccount')).toMatch(/Internet Identity/i);
        expect(applicantJoinUnlockRedeemMessage('unknown')).toMatch(/Could not redeem/i);
        expect(applicantJoinUnlockRedeemMessage('')).toMatch(/Could not redeem/i);
    });

    it('includes Japanese redeem messages', () => {
        expect(applicantJoinUnlockRedeemMessage('ok', 'ja')).toContain('トライアル');
        expect(applicantJoinUnlockRedeemMessage('invalidCode', 'ja')).toContain('無効');
        expect(applicantJoinUnlockRedeemingLabel('ja')).toContain('確認');
        expect(applicantJoinUnlockRedeemingLabel('en')).toMatch(/Redeeming/i);
    });
});

describe('applicantJoinUnlock access field', () => {
    it('includes the access-code entry on Become a member', () => {
        expect(applicantJoinUnlockAccessCopy('en').accessPrompt).toMatch(/access code/i);
        const html = applicantJoinUnlockAccessHtml(applicantJoinUnlockAccessCopy('en'));
        expect(html).toContain('id="mpdJoinUnlockAccessToggle"');
        expect(html).toContain('id="mpdJoinUnlockAccessCode"');
        expect(html).toContain('id="mpdJoinUnlockAccessRedeem"');
        expect(html).toContain('inputmode="numeric"');
        expect(html).toContain('maxlength="8"');
        expect(html).toContain('Have an access code?');
        expect(html).toContain('Redeem code');
    });
});
