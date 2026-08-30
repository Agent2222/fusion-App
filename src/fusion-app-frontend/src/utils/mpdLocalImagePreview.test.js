import { describe, it, expect, vi } from 'vitest';
import {
    mpdPreviewImageElementId,
    mpdMediaSurfaceFlags,
    cacheBustMpdPreviewUrl,
    revokeMpdLocalPreview,
    showMpdLocalImagePreview,
    failMpdImagePreview,
} from './mpdLocalImagePreview.js';

function makeClassList(initial = []) {
    const set = new Set(initial);
    return {
        toggle(name, on) {
            if (on) set.add(name);
            else set.delete(name);
        },
        contains(name) {
            return set.has(name);
        },
        toArray() {
            return [...set];
        },
    };
}

function makeImg() {
    const attrs = new Map();
    return {
        src: '',
        style: { display: 'none' },
        removeAttribute(name) {
            attrs.delete(name);
            if (name === 'src') this.src = '';
        },
    };
}

function makeRoot(keys) {
    /** @type {Record<string, ReturnType<typeof makeImg>>} */
    const byId = {};
    /** @type {Record<string, { classList: ReturnType<typeof makeClassList> }>} */
    const surfaces = {};
    for (const key of keys) {
        const id = mpdPreviewImageElementId(key);
        if (id) byId[id] = makeImg();
        surfaces[key] = { classList: makeClassList() };
    }
    return {
        byId,
        surfaces,
        getElementById(id) {
            return byId[id] || null;
        },
        querySelector(sel) {
            const match = /data-mpd-media-surface="([^"]+)"/.exec(sel);
            return match ? surfaces[match[1]] || null : null;
        },
    };
}

describe('mpdLocalImagePreview', () => {
    it('maps preview keys to the profile image elements', () => {
        expect(mpdPreviewImageElementId('hero')).toBe('mpd_hero_preview');
        expect(mpdPreviewImageElementId('heroProfile')).toBe('mpd_hero_profile_preview');
        expect(mpdPreviewImageElementId('intro-0')).toBe('mpd_intro_0_thumb');
        expect(mpdPreviewImageElementId('intro-2')).toBe('mpd_intro_2_thumb');
        expect(mpdPreviewImageElementId('unknown')).toBeNull();
    });

    it('treats hasPreview as hasMedia when preview is omitted', () => {
        expect(mpdMediaSurfaceFlags({ hasMedia: true })).toEqual({
            hasMedia: true,
            hasPreview: true,
        });
        expect(mpdMediaSurfaceFlags({ hasMedia: false, hasPreview: true })).toEqual({
            hasMedia: false,
            hasPreview: true,
        });
    });

    it('cache-busts a remote preview URL without changing the stored path', () => {
        const out = cacheBustMpdPreviewUrl(
            'https://cdn.fusionart.world/uploads/account/profile/artist/me/hero.jpg',
            { now: 1700000000000, origin: 'https://fusionart.world' },
        );
        expect(out).toContain('/uploads/account/profile/artist/me/hero.jpg');
        expect(out).toContain('mpdPreview=1700000000000');
    });

    it('shows a local blob preview immediately on the hero tile', () => {
        const root = makeRoot(['hero']);
        const store = new Map();
        const urlApi = {
            createObjectURL: vi.fn(() => 'blob:hero-v1'),
            revokeObjectURL: vi.fn(),
        };
        const file = new File([new Uint8Array(8)], 'hero.jpg', { type: 'image/jpeg' });

        const url = showMpdLocalImagePreview(root, store, 'hero', file, urlApi);

        expect(url).toBe('blob:hero-v1');
        expect(store.get('hero')).toBe('blob:hero-v1');
        expect(root.byId.mpd_hero_preview.src).toBe('blob:hero-v1');
        expect(root.byId.mpd_hero_preview.style.display).toBe('block');
        expect(root.surfaces.hero.classList.contains('has-preview')).toBe(true);
        expect(root.surfaces.hero.classList.contains('has-media')).toBe(false);
        expect(urlApi.revokeObjectURL).not.toHaveBeenCalled();
    });

    it('revokes the previous blob when the image is changed', () => {
        const root = makeRoot(['heroProfile']);
        const store = new Map();
        let n = 0;
        const urlApi = {
            createObjectURL: vi.fn(() => `blob:card-v${++n}`),
            revokeObjectURL: vi.fn(),
        };
        const first = new File([new Uint8Array(8)], 'v1.png', { type: 'image/png' });
        const second = new File([new Uint8Array(8)], 'v2.png', { type: 'image/png' });

        showMpdLocalImagePreview(root, store, 'heroProfile', first, urlApi);
        showMpdLocalImagePreview(root, store, 'heroProfile', second, urlApi);

        expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:card-v1');
        expect(store.get('heroProfile')).toBe('blob:card-v2');
        expect(root.byId.mpd_hero_profile_preview.src).toBe('blob:card-v2');
    });

    it('previews an intro-gallery slot', () => {
        const root = makeRoot(['intro-1']);
        const store = new Map();
        const urlApi = {
            createObjectURL: () => 'blob:intro-1',
            revokeObjectURL: vi.fn(),
        };
        showMpdLocalImagePreview(
            root,
            store,
            'intro-1',
            new File([new Uint8Array(4)], 'g1.jpg', { type: 'image/jpeg' }),
            urlApi,
        );
        expect(root.byId.mpd_intro_1_thumb.src).toBe('blob:intro-1');
        expect(root.surfaces['intro-1'].classList.contains('has-preview')).toBe(true);
    });

    it('clears the preview and revokes the blob on failure', () => {
        const root = makeRoot(['hero']);
        const store = new Map();
        const urlApi = {
            createObjectURL: () => 'blob:hero-fail',
            revokeObjectURL: vi.fn(),
        };
        showMpdLocalImagePreview(
            root,
            store,
            'hero',
            new File([new Uint8Array(4)], 'bad.jpg', { type: 'image/jpeg' }),
            urlApi,
        );

        failMpdImagePreview(root, store, 'hero', urlApi);

        expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:hero-fail');
        expect(store.has('hero')).toBe(false);
        expect(root.byId.mpd_hero_preview.src).toBe('');
        expect(root.byId.mpd_hero_preview.style.display).toBe('none');
        expect(root.surfaces.hero.classList.contains('has-preview')).toBe(false);
        expect(root.surfaces.hero.classList.contains('has-media')).toBe(false);
    });

    it('revoke is a no-op when no preview exists', () => {
        const store = new Map();
        const urlApi = { revokeObjectURL: vi.fn() };
        revokeMpdLocalPreview(store, 'hero', urlApi);
        expect(urlApi.revokeObjectURL).not.toHaveBeenCalled();
    });
});
