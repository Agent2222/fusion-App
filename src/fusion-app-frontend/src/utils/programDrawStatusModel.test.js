import { describe, expect, it } from 'vitest';
import {
    settingsDrawStatusClosedCopy,
    settingsDrawStatusCopy,
    settingsDrawStatusShowsLiveProgress,
    settingsDrawStatusShowsWithdraw,
} from './programDrawStatusModel.js';

const nums = { remaining: 34, claimed: 66, total: 100, cycle: 1 };

describe('settingsDrawStatusCopy', () => {
    it('keeps the live Active card copy', () => {
        const en = settingsDrawStatusCopy('en', nums);
        expect(en.title).toBe('Program Draw Entry');
        expect(en.active).toBe('Active');
        expect(en.withdraw).toBe('Withdraw entry');
        expect(en.sub).toContain('100');
        expect(en.untilWinner).toContain('34');
    });

    it('includes Japanese live labels', () => {
        const ja = settingsDrawStatusCopy('ja', nums);
        expect(ja.title).toBe('プログラム抽選エントリー');
        expect(ja.active).toBe('開催中');
        expect(ja.withdraw).toContain('取り消');
    });
});

describe('settingsDrawStatusClosedCopy', () => {
    it('tells the entrant to check email for the participation reward', () => {
        const en = settingsDrawStatusClosedCopy('en');
        expect(en.title).toBe('Program Draw Entry');
        expect(en.closed).toBe('Closed');
        expect(en.sub).toMatch(/has closed/i);
        expect(en.sub).toMatch(/email/i);
        expect(en.sub).toMatch(/participation reward/i);
        expect(en.entered).toBe('Entered');
        expect(en.redeem).toMatch(/access code/i);
        expect(en).not.toHaveProperty('withdraw');
        expect(en).not.toHaveProperty('untilWinner');
    });

    it('includes Japanese closed copy', () => {
        const ja = settingsDrawStatusClosedCopy('ja');
        expect(ja.closed).toBe('終了');
        expect(ja.sub).toContain('終了');
        expect(ja.sub).toContain('メール');
        expect(ja.redeem).toContain('アクセスコード');
        expect(ja.entered).toBe('エントリー済み');
    });
});

describe('settings draw status view flags', () => {
    it('hides live progress and withdraw when closed', () => {
        expect(settingsDrawStatusShowsLiveProgress({ closed: true })).toBe(false);
        expect(settingsDrawStatusShowsWithdraw({ closed: true })).toBe(false);
        expect(settingsDrawStatusShowsLiveProgress({ closed: false })).toBe(true);
        expect(settingsDrawStatusShowsWithdraw({})).toBe(true);
    });
});

describe('tester fixture closed preview', () => {
    it('closed copy is what the Application-only fixture should show', () => {
        const en = settingsDrawStatusClosedCopy('en');
        expect(en.closed).toBe('Closed');
        expect(en.sub).toMatch(/participation reward/i);
        expect(settingsDrawStatusShowsLiveProgress({ closed: true })).toBe(false);
    });
});
