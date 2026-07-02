/**
 * Studio email body — pick images or videos from artist media, video library, upload, or URL.
 */
import { openStudioModal } from '../../utils/studioModal.js';
import { uploadBlobToS3 } from '../../utils/studioS3Upload.js';
import { prepareImageFileForUpload } from '../../utils/imageUploadPrep.js';
import { getDataSource } from '../../utils/database.js';
import {
    emailInlineMediaBlock,
    emailHeroMediaBlock,
    isEmailVideoUrl,
} from '../../utils/emailFusionLayout.js';
import { loadEmailStudioContentCaches } from '../../utils/emailCampaignContentSources.js';

/**
 * @param {string} s
 */
function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {{ url: string, alt?: string, placement?: 'hero' | 'inline', posterUrl?: string }} sel
 * @returns {string}
 */
export function emailMediaInsertHtml(sel) {
    const placement = sel.placement === 'hero' ? 'hero' : 'inline';
    const alt = String(sel.alt ?? '').trim();
    const posterUrl = String(sel.posterUrl ?? '').trim();
    if (placement === 'hero') return emailHeroMediaBlock(sel.url, alt, posterUrl);
    return emailInlineMediaBlock(sel.url, alt, posterUrl);
}

/** @deprecated Use emailMediaInsertHtml */
export const emailImageInsertHtml = emailMediaInsertHtml;

/**
 * @param {{
 *   media?: Array<{ url: string, label: string, group: string, thumb: string, kind?: 'image' | 'video', posterUrl?: string }>,
 *   images?: Array<{ url: string, label: string, group: string, thumb: string, kind?: 'image' | 'video', posterUrl?: string }>,
 *   onSelect: (sel: { url: string, alt: string, placement: 'hero' | 'inline', posterUrl?: string }) => void,
 * }} opts
 */
export async function openEmailMediaPickerModal(opts = {}) {
    let media = Array.isArray(opts.media)
        ? opts.media
        : Array.isArray(opts.images)
          ? opts.images
          : [];
    if (!media.length) {
        const caches = await loadEmailStudioContentCaches();
        media = caches.media || caches.images || [];
    }

    const { close, root } = openStudioModal(
        `<div class="studio-ec-media" data-ec-media-root>
      <div class="studio-ec-media__tabs" role="tablist">
        <button type="button" class="studio-ec-media__tab is-active" data-tab="library">Library</button>
        <button type="button" class="studio-ec-media__tab" data-tab="upload">Upload</button>
        <button type="button" class="studio-ec-media__tab" data-tab="url">URL</button>
      </div>
      <div class="studio-ec-media__panel" data-panel="library">
        <label class="studio-field">
          <span>Search</span>
          <input type="search" class="studio-input" id="ec-media-search" placeholder="Filter by label…" />
        </label>
        <div class="studio-ec-media__grid" id="ec-media-grid" role="listbox"></div>
        <p class="studio-muted studio-ec-media__empty" id="ec-media-empty" hidden>No media in library. Upload or paste a URL.</p>
      </div>
      <div class="studio-ec-media__panel" data-panel="upload" hidden>
        <p class="studio-muted">Upload an image or video to Fusion storage (live mode).</p>
        <label class="studio-file-label studio-btn-secondary">
          Choose file
          <input type="file" id="ec-media-upload" accept="image/*,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" class="studio-sr-only" />
        </label>
        <p class="studio-muted" id="ec-media-upload-status"></p>
      </div>
      <div class="studio-ec-media__panel" data-panel="url" hidden>
        <label class="studio-field">
          <span>Image or video URL</span>
          <input type="url" class="studio-input" id="ec-media-url" placeholder="https://cdn.fusionart.world/…" />
        </label>
        <button type="button" class="studio-btn-secondary" id="ec-media-url-use">Use URL</button>
      </div>
      <div class="studio-ec-media__insert">
        <label class="studio-field">
          <span>Alt text</span>
          <input type="text" class="studio-input" id="ec-media-alt" placeholder="Describe the media" />
        </label>
        <fieldset class="studio-ec-media__placement">
          <legend class="studio-sr-only">Placement</legend>
          <label><input type="radio" name="ec-media-placement" value="inline" checked /> Inline</label>
          <label><input type="radio" name="ec-media-placement" value="hero" /> Hero (centered)</label>
        </fieldset>
        <p class="studio-modal-actions" style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.75rem;flex-wrap:wrap">
          <button type="button" class="studio-btn-ghost" id="ec-media-cancel">Cancel</button>
          <button type="button" class="studio-btn-primary" id="ec-media-insert" disabled>Insert media</button>
        </p>
      </div>
    </div>`,
        { title: 'Insert media', wide: true },
    );

    /** @type {string} */
    let selectedUrl = '';
    /** @type {string} */
    let selectedPoster = '';
    /** @type {'image' | 'video'} */
    let selectedKind = 'image';
    const grid = root.querySelector('#ec-media-grid');
    const emptyEl = root.querySelector('#ec-media-empty');
    const insertBtn = root.querySelector('#ec-media-insert');
    const altInp = root.querySelector('#ec-media-alt');
    const searchInp = root.querySelector('#ec-media-search');

    const thumbStyle = (item) => {
        const thumb = String(item.thumb || '').trim();
        if (thumb && !isEmailVideoUrl(thumb)) {
            return `background-image:url('${esc(thumb)}')`;
        }
        if (item.kind === 'video' || isEmailVideoUrl(item.url)) {
            return 'background:#111111';
        }
        return `background-image:url('${esc(item.url)}')`;
    };

    const renderGrid = (filter = '') => {
        if (!(grid instanceof HTMLElement)) return;
        const q = filter.trim().toLowerCase();
        const list = media.filter(
            (item) =>
                !q ||
                item.label.toLowerCase().includes(q) ||
                item.group.toLowerCase().includes(q),
        );
        if (emptyEl instanceof HTMLElement) {
            emptyEl.hidden = list.length > 0;
        }
        grid.innerHTML = list
            .map((item) => {
                const isVideo = item.kind === 'video' || isEmailVideoUrl(item.url);
                const selected = selectedUrl === item.url;
                return `<button type="button" class="studio-ec-media__item${selected ? ' is-selected' : ''}${isVideo ? ' is-video' : ''}" data-url="${esc(item.url)}" data-label="${esc(item.label)}" data-kind="${isVideo ? 'video' : 'image'}" data-poster="${esc(item.posterUrl || item.thumb || '')}" role="option">
          <span class="studio-ec-media__thumb" style="${thumbStyle({ ...item, kind: isVideo ? 'video' : 'image' })}">${isVideo ? '<span class="studio-ec-media__play" aria-hidden="true">▶</span>' : ''}</span>
          <span class="studio-ec-media__label">${esc(item.label)}</span>
          <span class="studio-ec-media__group">${esc(item.group)}</span>
        </button>`;
            })
            .join('');
    };

    const setSelected = (url, label = '', kind = 'image', posterUrl = '') => {
        selectedUrl = String(url || '').trim();
        selectedKind = kind === 'video' || isEmailVideoUrl(selectedUrl) ? 'video' : 'image';
        selectedPoster =
            selectedKind === 'video' && posterUrl && !isEmailVideoUrl(posterUrl) ? posterUrl : '';
        if (insertBtn instanceof HTMLButtonElement) insertBtn.disabled = !selectedUrl;
        if (altInp instanceof HTMLInputElement && label && !altInp.value.trim()) {
            altInp.value = label;
        }
        renderGrid(searchInp instanceof HTMLInputElement ? searchInp.value : '');
    };

    renderGrid();

    root.querySelectorAll('.studio-ec-media__tab').forEach((btn) => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            root.querySelectorAll('.studio-ec-media__tab').forEach((b) => {
                b.classList.toggle('is-active', b === btn);
            });
            root.querySelectorAll('.studio-ec-media__panel').forEach((p) => {
                const show = p.getAttribute('data-panel') === tab;
                p.toggleAttribute('hidden', !show);
            });
        });
    });

    grid?.addEventListener('click', (e) => {
        const btn = /** @type {HTMLElement} */ (e.target)?.closest?.('[data-url]');
        if (!btn) return;
        setSelected(
            btn.getAttribute('data-url') || '',
            btn.getAttribute('data-label') || '',
            btn.getAttribute('data-kind') || 'image',
            btn.getAttribute('data-poster') || '',
        );
    });

    searchInp?.addEventListener('input', () => {
        renderGrid(searchInp instanceof HTMLInputElement ? searchInp.value : '');
    });

    root.querySelector('#ec-media-url-use')?.addEventListener('click', () => {
        const urlInp = root.querySelector('#ec-media-url');
        const url = urlInp instanceof HTMLInputElement ? urlInp.value.trim() : '';
        if (!url) return;
        setSelected(url, '', isEmailVideoUrl(url) ? 'video' : 'image');
        root.querySelector('[data-tab="library"]')?.dispatchEvent(new Event('click'));
    });

    root.querySelector('#ec-media-upload')?.addEventListener('change', async (ev) => {
        const input = /** @type {HTMLInputElement} */ (ev.target);
        const file = input.files?.[0];
        const status = root.querySelector('#ec-media-upload-status');
        if (!file) return;
        if (getDataSource() !== 'live') {
            if (status) status.textContent = 'Upload requires Live data and Integration API.';
            return;
        }
        if (status) status.textContent = 'Uploading…';
        try {
            const isVideo = file.type.startsWith('video/') || isEmailVideoUrl(file.name);
            const blob = isVideo ? file : await prepareImageFileForUpload(file);
            const url = await uploadBlobToS3(blob, null, { area: 'studio/email' });
            const kind = isVideo ? 'video' : 'image';
            media = [
                ...media,
                {
                    url,
                    label: file.name,
                    group: 'Upload',
                    thumb: kind === 'image' ? url : '',
                    kind,
                },
            ];
            setSelected(url, file.name, kind);
            if (status) status.textContent = 'Uploaded.';
            root.querySelector('[data-tab="library"]')?.dispatchEvent(new Event('click'));
        } catch (err) {
            if (status) status.textContent = err instanceof Error ? err.message : String(err);
        } finally {
            input.value = '';
        }
    });

    root.querySelector('#ec-media-cancel')?.addEventListener('click', () => close());

    insertBtn?.addEventListener('click', () => {
        if (!selectedUrl) return;
        const alt = altInp instanceof HTMLInputElement ? altInp.value.trim() : '';
        const placement =
            root.querySelector('input[name="ec-media-placement"]:checked')?.value === 'hero'
                ? 'hero'
                : 'inline';
        opts.onSelect?.({
            url: selectedUrl,
            alt,
            placement,
            posterUrl: selectedKind === 'video' ? selectedPoster : '',
        });
        close();
    });
}
