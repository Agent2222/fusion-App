import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ICON_KEYS, STUDIO_NAV_ICON_ALIASES, studioGroupIconHref, studioNavIconHref } from './studioIconRegistry.js';

const iconsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/icons');

describe('studio scheduled-tasks icons', () => {
    it('registers dedicated nav and moderation group keys', () => {
        expect(ICON_KEYS.nav).toContain('nav-scheduled-tasks');
        expect(ICON_KEYS.nav).toContain('nav-videos');
        expect(ICON_KEYS.nav).toContain('nav-user-studio');
        expect(ICON_KEYS.nav).toContain('nav-profile-images');
        expect(ICON_KEYS.nav).toContain('nav-broadcasts');
        expect(ICON_KEYS.groups).toContain('group-moderation');
        expect(STUDIO_NAV_ICON_ALIASES['audio-files']).toBe('nav-sound');
        expect(STUDIO_NAV_ICON_ALIASES.links).toBe('nav-content');
        expect(STUDIO_NAV_ICON_ALIASES['scheduled-tasks']).toBeUndefined();
    });

    it('has SVG assets for sections that used to fall back to a bullet', () => {
        const files = [
            'ic-nav-scheduled-tasks.svg',
            'ic-nav-videos.svg',
            'ic-nav-user-studio.svg',
            'ic-nav-profile-images.svg',
            'ic-nav-broadcasts.svg',
            'ic-group-moderation.svg',
        ];
        for (const file of files) {
            expect(existsSync(path.join(iconsDir, file)), file).toBe(true);
        }
    });

    it('resolves hrefs so the sidebar will not use the bullet fallback', () => {
        expect(studioNavIconHref('scheduled-tasks')).toMatch(/ic-nav-scheduled-tasks/);
        expect(studioNavIconHref('videos')).toMatch(/ic-nav-videos/);
        expect(studioNavIconHref('user-studio')).toMatch(/ic-nav-user-studio/);
        expect(studioNavIconHref('profile-images')).toMatch(/ic-nav-profile-images/);
        expect(studioNavIconHref('broadcasts')).toMatch(/ic-nav-broadcasts/);
        expect(studioNavIconHref('audio-files')).toMatch(/ic-nav-sound/);
        expect(studioNavIconHref('links')).toMatch(/ic-nav-content/);
        expect(studioGroupIconHref('Moderation')).toMatch(/ic-group-moderation/);
    });
});
