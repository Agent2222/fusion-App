import { navigate } from '../../router.js';
import { captureVideosEvent } from '../../utils/videosPosthog.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function firstText(...values) {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) return text;
    }
    return '';
}

class VideosFeed extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Array<Record<string, unknown>>} */
        this._items = [];
        this._activeIndex = 0;
        this._page = 0;
        this._pageSize = 12;
        this._loaded = false;
    }

    connectedCallback() {
        this.render();
    }

    /**
     * @param {Array<Record<string, unknown>>} items
     * @param {{ activeIndex?: number }} [opts]
     */
    setData(items, opts = {}) {
        this._loaded = true;
        this._items = Array.isArray(items) ? items : [];
        this._activeIndex = Number.isFinite(opts.activeIndex) ? Number(opts.activeIndex) : this._activeIndex;
        this._page = 0;
        this.render();
    }

    setActiveIndex(index) {
        this._activeIndex = Number(index);
        this.render();
    }

    render() {
        if (!this._loaded) {
            this.shadow.innerHTML = `<style>:host{display:block;width:100%;min-height:8rem;}</style>`;
            return;
        }
        const loc = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const sectionTitle = loc === 'ja' ? 'すべての動画' : 'All Videos';
        const total = this._items.length;
        const pages = Math.max(1, Math.ceil(total / this._pageSize));
        if (this._page >= pages) this._page = Math.max(0, pages - 1);
        const start = this._page * this._pageSize;
        const slice = this._items.slice(start, start + this._pageSize);

        const cards = slice.length
            ? slice
                  .map((raw, sliceIdx) => {
                      const i = start + sliceIdx;
                      const imageUrl = String(raw?.imageUrl ?? '').trim();
                      const posterUrl = String(raw?.posterUrl ?? '').trim();
                      const displayImage = imageUrl || posterUrl;
                      const line =
                          loc === 'ja'
                              ? firstText(raw?.lineJa, raw?.lineEn)
                              : firstText(raw?.lineEn, raw?.lineJa);
                      const title =
                          loc === 'ja'
                              ? firstText(raw?.headlineJa, raw?.headlineEn, line)
                              : firstText(raw?.headlineEn, raw?.headlineJa, line);
                      const active = i === this._activeIndex;
                      return `
                    <article class="vf-card ${active ? 'is-active' : ''}" data-index="${i}">
                        <div class="vf-media" style="${displayImage ? `background-image:url(${esc(displayImage)})` : ''}">
                            ${displayImage ? '' : '<span class="vf-ph">Video</span>'}
                            <div class="vf-cap">
                                <strong>${esc(title)}</strong>
                                <span>${esc(line)}</span>
                            </div>
                            <button type="button" class="vf-play" aria-label="Watch ${esc(title)}">▶</button>
                        </div>
                    </article>`;
                  })
                  .join('')
            : '<p class="vf-empty">No videos are available right now.</p>';

        this.shadow.innerHTML = `
            <style>
                :host { display: block; width: 100%; }
                .vf-head { display: flex; align-items: baseline; justify-content: space-between; margin: 0 0 1.25rem; }
                .vf-title { font-size: 0.72rem; letter-spacing: 0.14em; font-variation-settings: var(--fv-label); }
                .vf-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
                .vf-card { cursor: pointer; border: 1px solid transparent; transition: border-color 0.2s; }
                .vf-card.is-active { border-color: var(--fg, #111); }
                .vf-media { position: relative; aspect-ratio: 16/9; background: #ddd center/cover no-repeat; overflow: hidden; }
                .vf-ph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #999; }
                .vf-cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 0.75rem; background: linear-gradient(transparent, rgba(0,0,0,0.72)); color: #fff; }
                .vf-cap strong { display: block; font-size: 0.95rem; }
                .vf-cap span { display: block; font-size: 0.72rem; opacity: 0.9; margin-top: 0.2rem; }
                .vf-play { position: absolute; inset: 0; margin: auto; width: 2.5rem; height: 2.5rem; border-radius: 50%; border: 0; background: rgba(255,255,255,0.92); cursor: pointer; }
                .vf-empty { margin: 0; color: #666; }
                .vf-pager { display: flex; gap: 0.5rem; justify-content: center; margin-top: 1.5rem; flex-wrap: wrap; }
                .vf-pager button { border: 1px solid #ccc; background: #fff; padding: 0.35rem 0.65rem; cursor: pointer; font-size: 0.8rem; }
                .vf-pager button.is-active { background: #111; color: #fff; border-color: #111; }
                @media (max-width: 1024px) { .vf-row { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 768px) { .vf-row { grid-template-columns: 1fr; } }
            </style>
            <div class="vf-head"><span class="vf-title">${esc(sectionTitle)}</span></div>
            <div class="vf-row">${cards}</div>
            ${
                pages > 1
                    ? `<div class="vf-pager">${Array.from({ length: pages }, (_, p) => `<button type="button" class="vf-page${p === this._page ? ' is-active' : ''}" data-page="${p}">${p + 1}</button>`).join('')}</div>`
                    : ''
            }
        `;

        const select = (idx, trigger = 'card') => {
            if (!Number.isInteger(idx) || idx < 0) return;
            const item = this._items[idx];
            this._activeIndex = idx;
            captureVideosEvent('videos_feature_selected', { feature_index: idx, trigger });
            this.render();
            this.dispatchEvent(
                new CustomEvent('fusion-community-feature-select', {
                    bubbles: true,
                    composed: true,
                    detail: { index: idx, item, trigger },
                }),
            );
        };

        this.shadow.querySelectorAll('.vf-play').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                select(Number(btn.closest('.vf-card')?.getAttribute('data-index') ?? -1), 'play_button');
            });
        });
        this.shadow.querySelectorAll('.vf-card').forEach((card) => {
            card.addEventListener('click', () => select(Number(card.getAttribute('data-index') ?? -1), 'card'));
        });
        this.shadow.querySelectorAll('.vf-page').forEach((btn) => {
            btn.addEventListener('click', () => {
                this._page = Number(btn.getAttribute('data-page') ?? 0);
                this.render();
            });
        });

        this.shadow.querySelectorAll('a[href^="/"]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                navigate(a.getAttribute('href') || '/');
            });
        });
    }
}

customElements.define('app-videos-feed', VideosFeed);
export { VideosFeed };
