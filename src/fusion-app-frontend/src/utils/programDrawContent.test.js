import { describe, expect, it } from 'vitest';
import {
    defaultProgramDrawLocaleEn,
    defaultProgramDrawLocaleJa,
    normalizeProgramDrawBundleForStudio,
    resolveProgramDrawLocale,
} from './programDrawContent.js';

describe('program draw closed copy', () => {
    it('includes EN closed display keys distinct from inactive', () => {
        const d = defaultProgramDrawLocaleEn().display;
        expect(d.statusClosed).toBe('Draw closed');
        expect(d.headlineClosed).toMatch(/closed/i);
        expect(d.subClosed).toMatch(/next draw/i);
        expect(d.statusClosedBody).toMatch(/waitlist|notif/i);
        expect(d.engagementAwardLine).toMatch(/info@fusionart\.world/);
        expect(d.engagementAwardLine).toMatch(/guest/i);
        expect(d.statusNotScheduledBody).toMatch(/not been scheduled/i);
        expect(d.statusClosed).not.toBe(d.statusNotActive);
        expect(d.subClosed).not.toBe(d.subInactive);
    });

    it('includes JA closed display keys', () => {
        const d = defaultProgramDrawLocaleJa().display;
        expect(d.statusClosed).toBe('抽選終了');
        expect(d.headlineClosed).toContain('終了');
        expect(d.subClosed).toContain('次回');
        expect(d.statusClosedBody).toContain('ウェイトリスト');
        expect(d.statusNotScheduledBody).toContain('予定されていません');
        expect(d.engagementAwardLine).toContain('info@fusionart.world');
        expect(d.engagementAwardLine).toContain('ゲスト');
    });

    it('resolveProgramDrawLocale keeps closed defaults when CMS omits them', () => {
        const loc = resolveProgramDrawLocale({ en: { display: { badge: 'Program Draw' } } }, 'en');
        expect(loc.display.statusClosed).toBe('Draw closed');
        expect(loc.display.headlineClosed).toBe('This Program Draw has closed.');
        expect(loc.display.engagementAwardLine).toMatch(/info@fusionart\.world/);
    });

    it('studio normalize and collect keep engagementAwardLine', () => {
        const raw = {
            en: { display: { engagementAwardLine: 'Email info@fusionart.world' } },
            ja: { display: { engagementAwardLine: 'info@fusionart.world へ' } },
        };
        const studio = normalizeProgramDrawBundleForStudio(raw);
        expect(studio.en.display.engagementAwardLine).toBe('Email info@fusionart.world');
        expect(studio.ja.display.engagementAwardLine).toBe('info@fusionart.world へ');
    });
});
