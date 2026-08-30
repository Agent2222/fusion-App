/**
 * Local audio preview for the settings Media Library before S3 upload.
 */

export const MPD_PENDING_AUDIO_STORE_KEY = 'pending';

/**
 * @param {Map<string, string>} store
 * @param {string} [key]
 * @param {{ revokeObjectURL?: (url: string) => void }} [urlApi]
 */
export function revokeMpdPendingAudio(store, key = MPD_PENDING_AUDIO_STORE_KEY, urlApi = URL) {
    const prev = store.get(key);
    if (!prev) return;
    urlApi.revokeObjectURL?.(prev);
    store.delete(key);
}

/**
 * @param {ParentNode | Document | null | undefined} root
 * @param {{ fileName?: string, replaceTitle?: string, hasPreview?: boolean }} [state]
 */
export function setMpdPendingAudioPanel(root, state = {}) {
    const panel = root?.getElementById?.('mpd_audio_pending');
    const nameEl = root?.getElementById?.('mpd_audio_pending_name');
    const hintEl = root?.getElementById?.('mpd_audio_pending_replace_hint');
    const player = root?.getElementById?.('mpd_audio_pending_player');
    const hasPreview = Boolean(state.hasPreview);
    if (panel) panel.hidden = !hasPreview;
    if (nameEl) nameEl.textContent = hasPreview ? String(state.fileName || 'Selected audio') : '';
    if (hintEl) {
        const replaceTitle = String(state.replaceTitle || '').trim();
        hintEl.hidden = !replaceTitle;
        hintEl.textContent = replaceTitle
            ? `Replacing “${replaceTitle}”. Preview the new file, then save or delete this selection.`
            : '';
    }
    if (player && 'hidden' in player) player.hidden = !hasPreview;
}

/**
 * Show a blob URL in the pending player so the member can listen before saving.
 * @param {ParentNode | Document | null | undefined} root
 * @param {Map<string, string>} store
 * @param {File | Blob} file
 * @param {{ replaceTitle?: string, createObjectURL?: (blob: Blob) => string, revokeObjectURL?: (url: string) => void }} [opts]
 * @returns {string}
 */
export function showMpdPendingAudioPreview(root, store, file, opts = {}) {
    const urlApi = {
        createObjectURL: opts.createObjectURL || URL.createObjectURL.bind(URL),
        revokeObjectURL: opts.revokeObjectURL || URL.revokeObjectURL.bind(URL),
    };
    revokeMpdPendingAudio(store, MPD_PENDING_AUDIO_STORE_KEY, urlApi);
    const url = urlApi.createObjectURL(file);
    store.set(MPD_PENDING_AUDIO_STORE_KEY, url);
    const player = root?.getElementById?.('mpd_audio_pending_player');
    if (player && 'src' in player) {
        player.src = url;
        player.hidden = false;
    }
    setMpdPendingAudioPanel(root, {
        hasPreview: true,
        fileName: file && 'name' in file ? String(file.name || 'Selected audio') : 'Selected audio',
        replaceTitle: opts.replaceTitle,
    });
    return url;
}

/**
 * Discard the local selection (does not delete a saved collection bite).
 * @param {ParentNode | Document | null | undefined} root
 * @param {Map<string, string>} store
 * @param {{ revokeObjectURL?: (url: string) => void }} [urlApi]
 */
export function clearMpdPendingAudioPreview(root, store, urlApi = URL) {
    revokeMpdPendingAudio(store, MPD_PENDING_AUDIO_STORE_KEY, urlApi);
    const player = root?.getElementById?.('mpd_audio_pending_player');
    if (player) {
        if ('pause' in player && typeof player.pause === 'function') {
            try {
                player.pause();
            } catch {
                /* ignore */
            }
        }
        player.removeAttribute?.('src');
        if ('src' in player) player.src = '';
        player.hidden = true;
    }
    setMpdPendingAudioPanel(root, { hasPreview: false });
}
