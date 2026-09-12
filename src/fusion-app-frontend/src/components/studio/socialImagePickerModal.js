/**
 * Studio Social — pick a still image from site content (tabbed by type).
 */
import '../../styles/studioEmailCampaign.css';
import { openStudioModal } from '../../utils/studioModal.js';
import {
    collectStudioSocialMedia,
    loadEmailStudioContentCaches,
} from '../../utils/emailCampaignContentSources.js';

/**
 * @param {string} s
 */
function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
}

const TABS = [
    { id: 'all', label: 'All' },
    { id: 'Artists', label: 'Artists' },
    { id: 'Programs', label: 'Programs' },
    { id: 'Journal', label: 'Journal' },
    { id: 'Videos', label: 'Videos' },
    { id: 'Website', label: 'Website' },
];

/**
 * @param {{
 *   media?: Array<{ url: string, label: string, group: string, thumb: string }>,
 *   caches?: object,
 *   onSelect: (sel: { url: string, label: string }) => void,
 * }} opts
 */
export async function openSocialImagePickerModal(opts = {}) {
    let media = Array.isArray(opts.media) ? opts.media.slice() : [];
    if (!media.length) {
        const caches = opts.caches || (await loadEmailStudioContentCaches());
        media = Array.isArray(caches.socialMedia)
            ? caches.socialMedia
            : collectStudioSocialMedia(caches);
    }
    media = media.filter((m) => m && m.url && m.kind !== 'video');

    const { close, root } = openStudioModal(
        `<div class="studio-ec-media studio-ec-social-picker" data-social-picker>
      <p class="studio-muted" style="margin:0 0 0.65rem">Choose a still image for the social graphic. Tabs filter by content type.</p>
      <div class="studio-ec-media__tabs" role="tablist" aria-label="Image source">
        ${TABS.map(
            (t, i) =>
                `<button type="button" class="studio-ec-media__tab${i === 0 ? ' is-active' : ''}" data-stab="${esc(t.id)}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}">${esc(t.label)}</button>`,
        ).join('')}
      </div>
      <label class="studio-field">
        <span>Search</span>
        <input type="search" class="studio-input" id="social-picker-search" placeholder="Filter by label…" />
      </label>
      <div class="studio-ec-media__grid studio-ec-social-picker__grid" id="social-picker-grid" role="listbox"></div>
      <p class="studio-muted studio-ec-media__empty" id="social-picker-empty" hidden>No images in this tab.</p>
      <p class="studio-modal-actions" style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.85rem;flex-wrap:wrap">
        <button type="button" class="studio-btn-ghost" id="social-picker-cancel">Cancel</button>
        <button type="button" class="studio-btn-primary" id="social-picker-use" disabled>Use image</button>
      </p>
    </div>`,
        { title: 'Pick social image', wide: true },
    );

    /** @type {string} */
    let selectedUrl = '';
    /** @type {string} */
    let selectedLabel = '';
    let activeTab = 'all';
    const grid = root.querySelector('#social-picker-grid');
    const emptyEl = root.querySelector('#social-picker-empty');
    const useBtn = root.querySelector('#social-picker-use');
    const searchInp = root.querySelector('#social-picker-search');

    const filtered = () => {
        const q = (searchInp instanceof HTMLInputElement ? searchInp.value : '')
            .trim()
            .toLowerCase();
        return media.filter((m) => {
            if (activeTab !== 'all' && m.group !== activeTab) return false;
            if (!q) return true;
            return `${m.label} ${m.group}`.toLowerCase().includes(q);
        });
    };

    const paint = () => {
        const rows = filtered();
        if (emptyEl instanceof HTMLElement) emptyEl.hidden = rows.length > 0;
        if (!(grid instanceof HTMLElement)) return;
        grid.innerHTML = rows
            .map((m) => {
                const sel = m.url === selectedUrl ? ' is-selected' : '';
                const thumb = esc(m.thumb || m.url);
                return `<button type="button" class="studio-ec-media__item${sel}" role="option" data-url="${esc(m.url)}" data-label="${esc(m.label)}" aria-selected="${m.url === selectedUrl ? 'true' : 'false'}">
          <span class="studio-ec-media__thumb" style="background-image:url('${thumb}')"></span>
          <span class="studio-ec-media__label">${esc(m.label)}</span>
          <span class="studio-ec-media__group">${esc(m.group)}</span>
        </button>`;
            })
            .join('');
    };

    root.querySelectorAll('[data-stab]').forEach((btn) => {
        btn.addEventListener('click', () => {
            activeTab = btn.getAttribute('data-stab') || 'all';
            root.querySelectorAll('[data-stab]').forEach((b) => {
                const on = b.getAttribute('data-stab') === activeTab;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            paint();
        });
    });

    grid?.addEventListener('click', (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        const item = t.closest('.studio-ec-media__item[data-url]');
        if (!(item instanceof HTMLElement) || !grid.contains(item)) return;
        selectedUrl = item.getAttribute('data-url') || '';
        selectedLabel = item.getAttribute('data-label') || '';
        if (useBtn instanceof HTMLButtonElement) useBtn.disabled = !selectedUrl;
        paint();
    });

    grid?.addEventListener('dblclick', (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        const item = t.closest('.studio-ec-media__item[data-url]');
        if (!(item instanceof HTMLElement)) return;
        selectedUrl = item.getAttribute('data-url') || '';
        selectedLabel = item.getAttribute('data-label') || '';
        if (selectedUrl && typeof opts.onSelect === 'function') {
            opts.onSelect({ url: selectedUrl, label: selectedLabel });
            close();
        }
    });

    searchInp?.addEventListener('input', () => paint());
    root.querySelector('#social-picker-cancel')?.addEventListener('click', () => close());
    useBtn?.addEventListener('click', () => {
        if (!selectedUrl || typeof opts.onSelect !== 'function') return;
        opts.onSelect({ url: selectedUrl, label: selectedLabel });
        close();
    });

    paint();
}
