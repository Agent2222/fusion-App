/**
 * Wide Studio modal for editing a community video record.
 */
import { openStudioModal } from '../../utils/studioModal.js';
import {
    normalizeCommunityVideoRecord,
    normalizeVideoSlug,
    parseVideoLocales,
    stringifyVideoLocales,
} from '../../utils/videoPageModel.js';
import { getCommunityArtistsForStudio } from '../../utils/database.js';
import { uploadVideoFile } from '../../utils/studioVideoUpload.js';
import { uploadBlobToS3 } from '../../utils/studioS3Upload.js';
import { mountVideoFrameCapture, videoFrameCaptureShellHtml } from '../../utils/videoFrameCapture.js';
import { captureStudioVideoEvent } from '../../utils/videosPosthog.js';
import {
    bindVideoTimestampEditor,
    collectChaptersFromPanel,
    collectTopicsFromPanel,
    renderVideoTimestampEditorHtml,
} from '../../utils/videoTimestampFields.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** @type {File | null} */
let pendingLocalVideoFile = null;

/**
 * @param {Record<string, unknown> | null} rec
 * @param {{
 *   canEdit?: boolean,
 *   onSave: (rec: Record<string, unknown>) => Promise<void>,
 *   onDelete?: () => Promise<void>,
 *   featured?: { videoIds: string[], heroVideoId: string | null },
 *   onFeaturedChange?: (cfg: { featuredVideoIds: string[], heroVideoId: string | null }) => Promise<void>,
 *   otherVideos?: Array<Record<string, unknown>>,
 * }} opts
 */
export async function openVideoEditorModal(rec, opts) {
    const isNew = !rec?.id;
    const initialTab = isNew ? 'media' : 'overview';
    const draft = normalizeCommunityVideoRecord(rec || { id: `vid_${Date.now()}` });
    const locales = parseVideoLocales(draft.localesJson);
    const featuredIds = Array.isArray(opts.featured?.videoIds) ? opts.featured.videoIds.map(String) : [];
    const isFeatured = featuredIds.includes(String(draft.id));
    const isHero = String(opts.featured?.heroVideoId || '') === String(draft.id);
    const featuredAtCapacity = featuredIds.length >= 6 && !isFeatured;
    const copyKeys = ['line', 'kicker', 'headline', 'body', 'ctaJoinLabel', 'ctaWatchLabel'];
    const otherVideos = (Array.isArray(opts.otherVideos) ? opts.otherVideos : []).filter(
        (v) => String(v?.id ?? '') !== String(draft.id),
    );
    const copyFromOptions = otherVideos
        .map((v) => {
            const loc = parseVideoLocales(v.localesJson);
            const title = String(loc.headlineEn || loc.headlineJa || v.slug || v.id || 'Video');
            return `<option value="${esc(String(v.id))}">${esc(title)}</option>`;
        })
        .join('');
    pendingLocalVideoFile = null;
    captureStudioVideoEvent('studio_video_modal_opened', { video_id: draft.id, is_new: isNew });

    let artists = [];
    try {
        artists = await getCommunityArtistsForStudio();
        if (!Array.isArray(artists)) artists = [];
    } catch {
        artists = [];
    }

    /** @type {{ previewChapters: unknown[], previewTopics: unknown[], fullChapters: unknown[], fullTopics: unknown[] }} */
    let timestampState = {
        previewChapters: Array.isArray(draft.previewChapters) ? [...draft.previewChapters] : [],
        previewTopics: Array.isArray(draft.previewTopics) ? [...draft.previewTopics] : [],
        fullChapters: Array.isArray(draft.fullChapters) ? [...draft.fullChapters] : [],
        fullTopics: Array.isArray(draft.fullTopics) ? [...draft.fullTopics] : [],
    };

    const body = `
        <div class="studio-modal-form studio-modal-form--video studio-video-editor">
            <div class="studio-video-editor-rail">
                <div class="studio-video-editor-poster" style="${draft.posterUrl ? `background-image:url(${esc(draft.posterUrl)})` : ''}"></div>
                <div class="studio-video-editor-pills">
                    <span>${draft.visible ? 'Visible' : 'Hidden'}</span>
                    <span>${isFeatured ? 'Featured' : 'Not featured'}${isHero ? ' ★' : ''}</span>
                    <span>${draft.previewVideoUrl ? 'Preview ✓' : 'Preview —'}</span>
                    <span>${draft.fullVideoKey ? 'Full ✓' : 'Full —'}</span>
                </div>
            </div>
            <div class="studio-video-editor-main">
                <div class="studio-tabs studio-video-editor-tabs">
                    <div class="studio-tabs__list" role="tablist">
                    <button type="button" class="studio-tabs__tab studio-video-tab${initialTab === 'overview' ? ' is-active' : ''}" data-tab="overview">Overview</button>
                    <button type="button" class="studio-tabs__tab studio-video-tab${initialTab === 'media' ? ' is-active' : ''}" data-tab="media">Media</button>
                    <button type="button" class="studio-tabs__tab studio-video-tab" data-tab="copy">Copy</button>
                    <button type="button" class="studio-tabs__tab studio-video-tab" data-tab="timestamps">Timestamps</button>
                    </div>
                </div>
                <div class="studio-video-panel studio-tabs__panel${initialTab === 'overview' ? ' is-active' : ''}" data-panel="overview"${initialTab !== 'overview' ? ' hidden' : ''}>
                    ${isNew ? '<p class="studio-modal-hint">Use the <strong>Media</strong> tab to upload preview and full videos, then add copy and timestamps before saving.</p>' : ''}
                    <label class="studio-field studio-field--inline">
                        <input type="checkbox" id="sv-visible" ${draft.visible ? 'checked' : ''} ${opts.canEdit ? '' : 'disabled'} />
                        <span>Visible on site</span>
                    </label>
                    <label class="studio-field studio-field--inline">
                        <input type="checkbox" id="sv-featured" ${isFeatured ? 'checked' : ''} ${!opts.canEdit || (featuredAtCapacity && !isFeatured) ? 'disabled' : ''} />
                        <span>Featured on Community &amp; /videos</span>
                    </label>
                    ${featuredAtCapacity ? '<p class="studio-muted studio-video-featured-hint">Featured list is full (6 max). Remove one from the featured row above, then edit this video again.</p>' : '<p class="studio-muted studio-video-featured-hint">Featured videos appear in the Community hero row and /videos page.</p>'}
                    <label class="studio-field"><span>Published (ISO)</span><input class="studio-input" id="sv-published" value="${esc(draft.publishedAt)}" /></label>
                    <label class="studio-field"><span>Sort order</span><input class="studio-input" id="sv-sort" type="number" value="${esc(draft.sortOrder)}" /></label>
                    <label class="studio-field"><span>Slug</span><input class="studio-input" id="sv-slug" value="${esc(draft.slug)}" /></label>
                </div>
                <div class="studio-video-panel studio-tabs__panel studio-video-panel--media${initialTab === 'media' ? ' is-active' : ''}" data-panel="media"${initialTab !== 'media' ? ' hidden' : ''}>
                    <div class="studio-video-panel-scroll">
                    <p class="studio-modal-hint">Upload preview (public) and full (members-only) videos. URLs are filled in automatically after upload.</p>
                    <h4 class="studio-subheading">Preview video (public)</h4>
                    <label class="studio-field studio-field--full">
                        <span>Preview video URL</span>
                        <input class="studio-input" id="sv-preview-url" value="${esc(draft.previewVideoUrl)}" placeholder="https://… or upload below" />
                    </label>
                    <div class="studio-community__file-actions">
                        <label class="studio-file-label studio-btn-ghost" for="sv-preview-file">
                            <input type="file" id="sv-preview-file" accept="video/*,.mp4,.webm,.mov" class="studio-file-input" />
                            Upload preview video
                        </label>
                    </div>
                    <h4 class="studio-subheading">Full video (members)</h4>
                    <label class="studio-field studio-field--full">
                        <span>Full video key</span>
                        <input class="studio-input" id="sv-full-key" value="${esc(draft.fullVideoKey)}" placeholder="fusionMedia/private-video/…" />
                    </label>
                    <p class="studio-muted studio-community__field-hint">Object key in storage, not a CDN URL. Example: <code>fusionMedia/private-video/Rodolfo-Full.mp4</code>. Use the key from “Upload full video” or paste a migrated key.</p>
                    <label class="studio-field studio-field--full">
                        <span>Full video file name</span>
                        <input class="studio-input" id="sv-full-name" value="${esc(draft.fullVideoFileName)}" placeholder="File name" />
                    </label>
                    <div class="studio-community__file-actions">
                        <label class="studio-file-label studio-btn-ghost" for="sv-full-file">
                            <input type="file" id="sv-full-file" accept="video/*,.mp4,.webm,.mov" class="studio-file-input" />
                            Upload full video
                        </label>
                    </div>
                    <h4 class="studio-subheading">Images</h4>
                    <label class="studio-field"><span>Poster URL</span><input class="studio-input" id="sv-poster" value="${esc(draft.posterUrl)}" /></label>
                    <label class="studio-field"><span>Card image URL</span><input class="studio-input" id="sv-image" value="${esc(draft.imageUrl)}" /></label>
                    <div class="studio-community__file-actions">
                        <label class="studio-file-label studio-btn-ghost" for="sv-poster-file">
                            <input type="file" id="sv-poster-file" accept="image/*" class="studio-file-input" />
                            Upload poster
                        </label>
                    </div>
                    ${videoFrameCaptureShellHtml(String(draft.id))}
                    </div>
                </div>
                <div class="studio-video-panel studio-tabs__panel" data-panel="copy" hidden>
                    <div class="studio-video-copy-from">
                        <label class="studio-field studio-video-copy-from__field">
                            <span>Copy from another video</span>
                            <select class="studio-select" id="sv-copy-from"${otherVideos.length ? '' : ' disabled'}>
                                <option value="">Select a video…</option>
                                ${copyFromOptions}
                            </select>
                        </label>
                        <button type="button" class="studio-btn-ghost" id="sv-copy-from-btn"${otherVideos.length ? '' : ' disabled'}>Copy copy</button>
                    </div>
                    ${copyKeys
                        .map(
                            (key) => `
                    <label class="studio-field"><span>${key} EN</span><input class="studio-input" id="sv-${key}-en" value="${esc(locales[`${key}En`])}" /></label>
                    <label class="studio-field"><span>${key} JA</span><input class="studio-input" id="sv-${key}-ja" value="${esc(locales[`${key}Ja`])}" /></label>`,
                        )
                        .join('')}
                </div>
                <div class="studio-video-panel studio-tabs__panel" data-panel="timestamps" hidden>
                    <div id="sv-timestamps-mount"></div>
                </div>
                <div class="studio-modal-actions">
                    <button type="button" class="studio-btn-primary" id="sv-save">Save</button>
                    ${opts.onDelete ? '<button type="button" class="studio-btn-danger" id="sv-delete">Delete</button>' : ''}
                    <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
                </div>
                <p id="sv-msg" class="studio-banner studio-banner--info" style="display:none"></p>
            </div>
        </div>`;

    const { close, root } = openStudioModal(body, {
        title: isNew ? 'Add video' : draft.headlineEn || draft.slug || 'Video',
        wide: true,
    });

    const posterRail = root.querySelector('.studio-video-editor-poster');
    const msg = root.querySelector('#sv-msg');
    const timestampsMount = root.querySelector('#sv-timestamps-mount');

    const readTimestampsFromDom = () => ({
        previewChapters: collectChaptersFromPanel(root, 'preview'),
        previewTopics: collectTopicsFromPanel(root, 'preview'),
        fullChapters: collectChaptersFromPanel(root, 'full'),
        fullTopics: collectTopicsFromPanel(root, 'full'),
    });

    const refreshTimestampsPanel = () => {
        if (!(timestampsMount instanceof HTMLElement)) return;
        timestampsMount.innerHTML = renderVideoTimestampEditorHtml(timestampState, artists);
        bindVideoTimestampEditor(
            timestampsMount,
            artists,
            readTimestampsFromDom,
            (next) => {
                timestampState = {
                    previewChapters: Array.isArray(next.previewChapters) ? next.previewChapters : [],
                    previewTopics: Array.isArray(next.previewTopics) ? next.previewTopics : [],
                    fullChapters: Array.isArray(next.fullChapters) ? next.fullChapters : [],
                    fullTopics: Array.isArray(next.fullTopics) ? next.fullTopics : [],
                };
            },
            refreshTimestampsPanel,
        );
    };
    refreshTimestampsPanel();

    const showMsg = (text, kind = 'info') => {
        if (!msg) return;
        msg.textContent = text;
        msg.className = `studio-banner studio-banner--${kind}`;
        msg.style.display = text ? 'block' : 'none';
    };

    root.querySelectorAll('.studio-video-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            root.querySelectorAll('.studio-video-tab').forEach((b) => b.classList.toggle('is-active', b === btn));
            root.querySelectorAll('.studio-video-panel').forEach((p) => {
                const on = p.getAttribute('data-panel') === tab;
                p.hidden = !on;
                p.classList.toggle('is-active', on);
            });
        });
    });

    const frameMount = root.querySelector('.studio-video-frame-mount');
    let teardownFrame = () => {};
    if (frameMount instanceof HTMLElement) {
        teardownFrame = mountVideoFrameCapture(frameMount, {
            videoId: String(draft.id),
            getVideoSrc: async () => {
                if (pendingLocalVideoFile) return URL.createObjectURL(pendingLocalVideoFile);
                const preview = root.querySelector('#sv-preview-url')?.value?.trim();
                return preview || null;
            },
            onCaptured: (urls) => {
                if (urls.posterUrl) root.querySelector('#sv-poster').value = urls.posterUrl;
                if (urls.imageUrl) root.querySelector('#sv-image').value = urls.imageUrl;
                if (posterRail instanceof HTMLElement && (urls.posterUrl || urls.imageUrl)) {
                    posterRail.style.backgroundImage = `url("${urls.posterUrl || urls.imageUrl}")`;
                }
                captureStudioVideoEvent('studio_video_frame_captured', { video_id: draft.id });
            },
        });
    }

    const collect = () => {
        timestampState = readTimestampsFromDom();
        const headlineEn = root.querySelector('#sv-headline-en')?.value?.trim() || '';
        const locales = {
            lineEn: root.querySelector('#sv-line-en')?.value ?? '',
            lineJa: root.querySelector('#sv-line-ja')?.value ?? '',
            kickerEn: root.querySelector('#sv-kicker-en')?.value ?? '',
            kickerJa: root.querySelector('#sv-kicker-ja')?.value ?? '',
            headlineEn,
            headlineJa: root.querySelector('#sv-headline-ja')?.value ?? '',
            bodyEn: root.querySelector('#sv-body-en')?.value ?? '',
            bodyJa: root.querySelector('#sv-body-ja')?.value ?? '',
            ctaJoinLabelEn: root.querySelector('#sv-ctaJoinLabel-en')?.value ?? '',
            ctaJoinLabelJa: root.querySelector('#sv-ctaJoinLabel-ja')?.value ?? '',
            ctaWatchLabelEn: root.querySelector('#sv-ctaWatchLabel-en')?.value ?? '',
            ctaWatchLabelJa: root.querySelector('#sv-ctaWatchLabel-ja')?.value ?? '',
        };
        return normalizeCommunityVideoRecord({
            ...draft,
            id: draft.id,
            slug: root.querySelector('#sv-slug')?.value?.trim() || normalizeVideoSlug(headlineEn || draft.id),
            visible: Boolean(root.querySelector('#sv-visible')?.checked),
            publishedAt: root.querySelector('#sv-published')?.value?.trim() || draft.publishedAt,
            sortOrder: Number(root.querySelector('#sv-sort')?.value ?? draft.sortOrder),
            previewVideoUrl: root.querySelector('#sv-preview-url')?.value?.trim() ?? '',
            fullVideoKey: root.querySelector('#sv-full-key')?.value?.trim() ?? '',
            fullVideoFileName: root.querySelector('#sv-full-name')?.value?.trim() ?? '',
            posterUrl: root.querySelector('#sv-poster')?.value?.trim() ?? '',
            imageUrl: root.querySelector('#sv-image')?.value?.trim() ?? '',
            localesJson: stringifyVideoLocales(locales),
            previewChaptersJson: JSON.stringify(timestampState.previewChapters),
            previewTopicsJson: JSON.stringify(timestampState.previewTopics),
            fullChaptersJson: JSON.stringify(timestampState.fullChapters),
            fullTopicsJson: JSON.stringify(timestampState.fullTopics),
        });
    };

    root.querySelector('#sv-preview-file')?.addEventListener('change', async (ev) => {
        const input = ev.target;
        const file = input instanceof HTMLInputElement ? input.files?.[0] : null;
        if (!file) return;
        pendingLocalVideoFile = file;
        try {
            captureStudioVideoEvent('studio_video_upload_started', { kind: 'preview', bytes: file.size });
            const result = await uploadVideoFile(file, { kind: 'preview', contentId: String(draft.id) });
            if (result.url) root.querySelector('#sv-preview-url').value = result.url;
            captureStudioVideoEvent('studio_video_upload_completed', { kind: 'preview', bytes: file.size });
            showMsg('Preview video uploaded.');
        } catch (err) {
            captureStudioVideoEvent('studio_video_upload_failed', { kind: 'preview' });
            showMsg(err instanceof Error ? err.message : String(err), 'warn');
        }
        input.value = '';
    });

    root.querySelector('#sv-full-file')?.addEventListener('change', async (ev) => {
        const input = ev.target;
        const file = input instanceof HTMLInputElement ? input.files?.[0] : null;
        if (!file) return;
        pendingLocalVideoFile = file;
        try {
            captureStudioVideoEvent('studio_video_upload_started', { kind: 'full', bytes: file.size });
            const result = await uploadVideoFile(file, { kind: 'full', contentId: String(draft.id) });
            if (result.key) root.querySelector('#sv-full-key').value = result.key;
            if (result.fileName) root.querySelector('#sv-full-name').value = result.fileName;
            captureStudioVideoEvent('studio_video_upload_completed', { kind: 'full', bytes: file.size });
            showMsg('Full video uploaded.');
        } catch (err) {
            captureStudioVideoEvent('studio_video_upload_failed', { kind: 'full' });
            showMsg(err instanceof Error ? err.message : String(err), 'warn');
        }
        input.value = '';
    });

    root.querySelector('#sv-poster-file')?.addEventListener('change', async (ev) => {
        const input = ev.target;
        const file = input instanceof HTMLInputElement ? input.files?.[0] : null;
        if (!file) return;
        try {
            const url = await uploadBlobToS3(file, null, {
                area: 'studio/videos',
                entityType: 'video',
                entityId: String(draft.id),
                fieldKey: 'poster',
            });
            root.querySelector('#sv-poster').value = url;
            root.querySelector('#sv-image').value = url;
            if (posterRail instanceof HTMLElement) posterRail.style.backgroundImage = `url("${url}")`;
        } catch (err) {
            showMsg(err instanceof Error ? err.message : String(err), 'warn');
        }
        input.value = '';
    });

    root.querySelector('#sv-copy-from-btn')?.addEventListener('click', () => {
        const select = root.querySelector('#sv-copy-from');
        const sourceId = select instanceof HTMLSelectElement ? select.value.trim() : '';
        if (!sourceId) {
            showMsg('Select a video to copy from.', 'warn');
            return;
        }
        const source = otherVideos.find((v) => String(v?.id) === sourceId);
        if (!source) {
            showMsg('Source video not found.', 'warn');
            return;
        }
        const sourceLocales = parseVideoLocales(source.localesJson);
        for (const key of copyKeys) {
            const en = root.querySelector(`#sv-${key}-en`);
            const ja = root.querySelector(`#sv-${key}-ja`);
            if (en instanceof HTMLInputElement) en.value = String(sourceLocales[`${key}En`] ?? '');
            if (ja instanceof HTMLInputElement) ja.value = String(sourceLocales[`${key}Ja`] ?? '');
        }
        const title = String(sourceLocales.headlineEn || sourceLocales.headlineJa || source.slug || 'video');
        showMsg(`Copied copy from “${title}”.`);
        captureStudioVideoEvent('studio_video_copy_from', { video_id: draft.id, source_id: sourceId });
    });

    const syncFeaturedFromModal = async (videoId) => {
        if (!opts.onFeaturedChange) return;
        const featuredEl = root.querySelector('#sv-featured');
        const wantFeatured = featuredEl instanceof HTMLInputElement ? featuredEl.checked : isFeatured;
        let ids = [...featuredIds];
        let heroId = opts.featured?.heroVideoId ? String(opts.featured.heroVideoId) : null;
        const wasFeatured = ids.includes(videoId);
        if (wantFeatured && !wasFeatured) {
            if (ids.length >= 6) {
                showMsg('Featured list is full (6 max). Save the video, then remove one from the featured row.', 'warn');
                return;
            }
            ids.push(videoId);
            if (!heroId) heroId = videoId;
        } else if (!wantFeatured && wasFeatured) {
            ids = ids.filter((id) => id !== videoId);
            if (heroId === videoId) heroId = ids[0] || null;
        }
        await opts.onFeaturedChange({ featuredVideoIds: ids, heroVideoId: heroId });
    };

    root.querySelector('#sv-save')?.addEventListener('click', async () => {
        if (!opts.canEdit) return;
        try {
            const next = collect();
            await opts.onSave(next);
            await syncFeaturedFromModal(String(next.id));
            captureStudioVideoEvent('studio_video_saved', { video_id: next.id });
            close();
            teardownFrame();
        } catch (err) {
            showMsg(err instanceof Error ? err.message : String(err), 'warn');
        }
    });

    root.querySelector('#sv-delete')?.addEventListener('click', async () => {
        if (!opts.onDelete) return;
        if (!window.confirm('Delete this video?')) return;
        await opts.onDelete();
        close();
        teardownFrame();
    });
}
