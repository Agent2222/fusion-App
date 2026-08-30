/**
 * Artist audio-bite collection CRUD (max 5).
 * Shared by the settings profile UI and database.js test-mode so create / replace / delete stay aligned with the canister.
 */

export const MAX_ARTIST_AUDIO_ENTRIES = 5;
export const MAX_ARTIST_AUDIO_BYTES = 10 * 1024 * 1024;

/**
 * @typedef {{ url: string, title: string, addedAt: string }} ArtistAudioEntry
 * @typedef {{
 *   entries: ArtistAudioEntry[],
 *   highlightUrl: string,
 *   approvedUrls: string[],
 *   fullSiteApprovedUrls: string[],
 * }} ArtistAudioCollection
 */

/** @returns {ArtistAudioCollection} */
export function emptyArtistAudioCollection() {
    return {
        entries: [],
        highlightUrl: '',
        approvedUrls: [],
        fullSiteApprovedUrls: [],
    };
}

/**
 * @param {unknown} raw
 * @returns {ArtistAudioCollection}
 */
export function normalizeArtistAudioCollection(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const entries = Array.isArray(src.entries)
        ? src.entries
              .map((e) => ({
                  url: String(e?.url ?? '').trim(),
                  title: String(e?.title ?? ''),
                  addedAt: String(e?.addedAt ?? e?.added_at ?? ''),
              }))
              .filter((e) => e.url)
        : [];
    const approvedUrls = Array.isArray(src.approvedUrls)
        ? src.approvedUrls.map((u) => String(u))
        : [];
    const fullSiteApprovedUrls = Array.isArray(src.fullSiteApprovedUrls ?? src.full_site_approved_urls)
        ? (src.fullSiteApprovedUrls ?? src.full_site_approved_urls).map((u) => String(u))
        : approvedUrls.slice();
    return {
        entries,
        highlightUrl: String(src.highlightUrl ?? src.highlight_url ?? ''),
        approvedUrls,
        fullSiteApprovedUrls,
    };
}

/**
 * @param {ArtistAudioCollection} col
 * @returns {ArtistAudioCollection}
 */
function cloneCollection(col) {
    return {
        entries: col.entries.map((e) => ({ ...e })),
        highlightUrl: col.highlightUrl,
        approvedUrls: [...col.approvedUrls],
        fullSiteApprovedUrls: [...col.fullSiteApprovedUrls],
    };
}

/**
 * @param {unknown} file
 * @param {{ maxBytes?: number }} [opts]
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateAudioFile(file, opts = {}) {
    const maxBytes = opts.maxBytes ?? MAX_ARTIST_AUDIO_BYTES;
    if (!file || typeof file !== 'object') {
        return { ok: false, error: 'No audio file selected.' };
    }
    const size = Number(file.size);
    if (!Number.isFinite(size) || size < 1) {
        return { ok: false, error: 'That audio file is empty.' };
    }
    if (size > maxBytes) {
        return {
            ok: false,
            error: `Audio file is too large (${Math.round(size / 1024)} KB). Maximum size is ${Math.round(maxBytes / 1024)} KB.`,
        };
    }
    const type = String(file.type || '').trim().toLowerCase();
    if (type && !type.startsWith('audio/') && type !== 'video/webm' && type !== 'application/ogg') {
        return { ok: false, error: 'Choose an audio file.' };
    }
    return { ok: true };
}

/**
 * @param {unknown} name
 * @returns {string}
 */
export function titleFromAudioFileName(name) {
    const stem = String(name || '')
        .trim()
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return stem.slice(0, 120);
}

/**
 * @param {{ file?: unknown, title?: unknown, entryCount?: number, replaceUrl?: unknown }} input
 * @returns {string | null}
 */
export function pendingAudioSaveError(input = {}) {
    const file = input.file;
    const title = String(input.title ?? '').trim();
    const entryCount = Number(input.entryCount) || 0;
    const replaceUrl = String(input.replaceUrl ?? '').trim();
    const fileCheck = validateAudioFile(file);
    if (!fileCheck.ok) return fileCheck.error;
    if (!title) return 'Add an audio title before saving.';
    if (!replaceUrl && entryCount >= MAX_ARTIST_AUDIO_ENTRIES) {
        return 'Maximum of 5 audio bites reached. Delete or replace an existing bite first.';
    }
    return null;
}

/**
 * @param {ArtistAudioCollection} col
 * @param {string} url
 * @param {string} title
 * @param {string} [ts]
 * @returns {ArtistAudioCollection}
 */
export function addArtistAudioEntry(col, url, title, ts = '') {
    const next = cloneCollection(normalizeArtistAudioCollection(col));
    const cleanUrl = String(url ?? '').trim();
    const cleanTitle = String(title ?? '').trim();
    if (!cleanUrl) throw new Error('Audio URL required');
    if (!cleanTitle) throw new Error('Audio title required');
    if (next.entries.length >= MAX_ARTIST_AUDIO_ENTRIES) {
        throw new Error('Maximum of 5 audio bites reached');
    }
    if (next.entries.some((e) => e.url === cleanUrl)) {
        throw new Error('Audio URL already exists in collection');
    }
    next.entries.push({
        url: cleanUrl,
        title: cleanTitle,
        addedAt: String(ts || new Date().toISOString()),
    });
    if (!next.highlightUrl) next.highlightUrl = cleanUrl;
    return next;
}

/**
 * @param {ArtistAudioCollection} col
 * @param {string} url
 * @returns {ArtistAudioCollection}
 */
export function removeArtistAudioEntry(col, url) {
    const next = cloneCollection(normalizeArtistAudioCollection(col));
    const cleanUrl = String(url ?? '').trim();
    const before = next.entries.length;
    next.entries = next.entries.filter((e) => e.url !== cleanUrl);
    if (next.entries.length === before) {
        throw new Error('Audio URL not found in collection');
    }
    next.approvedUrls = next.approvedUrls.filter((u) => u !== cleanUrl);
    next.fullSiteApprovedUrls = next.fullSiteApprovedUrls.filter((u) => u !== cleanUrl);
    if (next.highlightUrl === cleanUrl) {
        next.highlightUrl = next.entries[0]?.url || '';
    }
    return next;
}

/**
 * Swap an existing bite for a new URL/title, keeping list position and highlight if it was highlighted.
 * @param {ArtistAudioCollection} col
 * @param {string} oldUrl
 * @param {string} newUrl
 * @param {string} title
 * @param {string} [ts]
 * @returns {ArtistAudioCollection}
 */
export function replaceArtistAudioEntry(col, oldUrl, newUrl, title, ts = '') {
    const next = cloneCollection(normalizeArtistAudioCollection(col));
    const from = String(oldUrl ?? '').trim();
    const to = String(newUrl ?? '').trim();
    const cleanTitle = String(title ?? '').trim();
    if (!from) throw new Error('Audio URL not found in collection');
    if (!to) throw new Error('Audio URL required');
    if (!cleanTitle) throw new Error('Audio title required');
    const idx = next.entries.findIndex((e) => e.url === from);
    if (idx < 0) throw new Error('Audio URL not found in collection');
    if (to !== from && next.entries.some((e) => e.url === to)) {
        throw new Error('Audio URL already exists in collection');
    }
    const wasHighlight = next.highlightUrl === from;
    next.entries[idx] = {
        url: to,
        title: cleanTitle,
        addedAt: String(ts || new Date().toISOString()),
    };
    next.approvedUrls = next.approvedUrls.filter((u) => u !== from);
    next.fullSiteApprovedUrls = next.fullSiteApprovedUrls.filter((u) => u !== from);
    if (wasHighlight) next.highlightUrl = to;
    return next;
}

/**
 * @param {ArtistAudioCollection} col
 * @param {string} url
 * @returns {ArtistAudioCollection}
 */
export function setArtistAudioHighlight(col, url) {
    const next = cloneCollection(normalizeArtistAudioCollection(col));
    const cleanUrl = String(url ?? '').trim();
    if (cleanUrl && !next.entries.some((e) => e.url === cleanUrl)) {
        throw new Error('Audio URL not found in collection');
    }
    next.highlightUrl = cleanUrl;
    return next;
}

/**
 * Apply a confirmed upload: add a new bite, or replace an existing one.
 * @param {ArtistAudioCollection} col
 * @param {{ url: string, title: string, replaceUrl?: string, ts?: string }} payload
 * @returns {ArtistAudioCollection}
 */
export function applyAudioUploadToCollection(col, payload) {
    const replaceUrl = String(payload?.replaceUrl ?? '').trim();
    if (replaceUrl) {
        return replaceArtistAudioEntry(col, replaceUrl, payload.url, payload.title, payload.ts);
    }
    return addArtistAudioEntry(col, payload.url, payload.title, payload.ts);
}

/**
 * Unique S3 field key so each bite is its own object (deterministic `audio` would overwrite).
 * @param {() => string} [uuid]
 * @returns {string}
 */
export function uniqueAudioUploadFieldKey(uuid = () => crypto.randomUUID()) {
    return `audio-${String(uuid()).replace(/-/g, '').slice(0, 8)}`;
}
