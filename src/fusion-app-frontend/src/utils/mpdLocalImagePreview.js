/**
 * Immediate local image preview for Member Profile media tiles.
 * Shows a blob URL as soon as a file is chosen, before S3 upload finishes.
 */

/**
 * @param {string} key hero | heroProfile | intro-0..2
 * @returns {string | null}
 */
export function mpdPreviewImageElementId(key) {
    if (key === 'hero') return 'mpd_hero_preview';
    if (key === 'heroProfile') return 'mpd_hero_profile_preview';
    const introMatch = /^intro-(\d+)$/.exec(String(key || ''));
    if (introMatch) return `mpd_intro_${introMatch[1]}_thumb`;
    return null;
}

/**
 * @param {string} key
 * @returns {string}
 */
export function mpdPreviewSurfaceSelector(key) {
    return `[data-mpd-media-surface="${key}"]`;
}

/**
 * @param {{ hasMedia?: boolean; hasPreview?: boolean }} state
 */
export function mpdMediaSurfaceFlags(state = {}) {
    const hasMedia = Boolean(state.hasMedia);
    const hasPreview = Boolean(state.hasPreview ?? state.hasMedia);
    return { hasMedia, hasPreview };
}

/**
 * Preview only: keep stored S3 URLs clean while forcing the browser to refetch
 * an overwritten object whose public URL did not change.
 * @param {string} url
 * @param {{ now?: number, origin?: string }} [opts]
 */
export function cacheBustMpdPreviewUrl(url, opts = {}) {
    const raw = String(url || '').trim();
    if (!raw) return raw;
    const now = opts.now ?? Date.now();
    const origin = opts.origin || (typeof window !== 'undefined' ? window.location.origin : 'https://fusionart.world');
    try {
        const u = new URL(raw, origin);
        u.searchParams.set('mpdPreview', String(now));
        return u.href;
    } catch {
        const sep = raw.includes('?') ? '&' : '?';
        return `${raw}${sep}mpdPreview=${now}`;
    }
}

/**
 * @param {Map<string, string>} store
 * @param {string} key
 * @param {{ revokeObjectURL?: (url: string) => void }} [urlApi]
 */
export function revokeMpdLocalPreview(store, key, urlApi = URL) {
    const prev = store.get(key);
    if (!prev) return;
    urlApi.revokeObjectURL?.(prev);
    store.delete(key);
}

/**
 * @param {ParentNode | Document | null | undefined} root
 * @param {string} key
 * @param {{ hasMedia?: boolean; hasPreview?: boolean }} state
 */
export function setMpdMediaSurfaceState(root, key, state) {
    const surface = root?.querySelector?.(mpdPreviewSurfaceSelector(key));
    if (!surface) return;
    const flags = mpdMediaSurfaceFlags(state);
    surface.classList.toggle('has-media', flags.hasMedia);
    surface.classList.toggle('has-preview', flags.hasPreview);
}

/**
 * @param {ParentNode | Document | null | undefined} root
 * @param {string} key
 * @param {string} url
 * @param {{ hasMedia?: boolean; hasPreview?: boolean }} [surfaceState]
 */
export function applyPreviewImageSrc(root, key, url, surfaceState = { hasMedia: false, hasPreview: true }) {
    setMpdMediaSurfaceState(root, key, surfaceState);
    const id = mpdPreviewImageElementId(key);
    const img = id ? root?.getElementById?.(id) : null;
    if (!img) return;
    img.src = url;
    img.style.display = 'block';
}

/**
 * Show immediate thumbnail from a selected file before S3 upload completes.
 * @param {ParentNode | Document | null | undefined} root
 * @param {Map<string, string>} store
 * @param {string} key
 * @param {File | Blob} file
 * @param {{ createObjectURL?: (blob: Blob) => string, revokeObjectURL?: (url: string) => void }} [urlApi]
 * @returns {string}
 */
export function showMpdLocalImagePreview(root, store, key, file, urlApi = URL) {
    revokeMpdLocalPreview(store, key, urlApi);
    const url = urlApi.createObjectURL(file);
    store.set(key, url);
    applyPreviewImageSrc(root, key, url, { hasMedia: false, hasPreview: true });
    return url;
}

/**
 * @param {ParentNode | Document | null | undefined} root
 * @param {Map<string, string>} store
 * @param {string} key
 * @param {{ revokeObjectURL?: (url: string) => void }} [urlApi]
 */
export function failMpdImagePreview(root, store, key, urlApi = URL) {
    revokeMpdLocalPreview(store, key, urlApi);
    setMpdMediaSurfaceState(root, key, { hasMedia: false, hasPreview: false });
    const id = mpdPreviewImageElementId(key);
    const img = id ? root?.getElementById?.(id) : null;
    if (!img) return;
    img.removeAttribute?.('src');
    if ('src' in img) img.src = '';
    img.style.display = 'none';
}
