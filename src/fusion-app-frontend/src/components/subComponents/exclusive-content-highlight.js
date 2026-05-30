import { PH_LOADER_BASE_STYLES, programHeroLoaderHtml } from '../../utils/programHeroLoader.js';
import { captureCommunityEvent } from '../../utils/communityPosthog.js';

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

function exclusiveItemVisible(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true;
    return /** @type {Record<string, unknown>} */ (raw).visible !== false;
}

class ExclusiveContentHighlight extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Array<Record<string, unknown>>} */
        this._allItems = [];
        /** @type {Array<Record<string, unknown>>} */
        this._items = [];
        this._activeIndex = -1;
        this._loaded = false;
    }

    connectedCallback() {
        this.render();
    }

    /**
     * @param {Array<Record<string, unknown>>} items — max 6
     * @param {{ activeIndex?: number }} [opts]
     */
    setData(items, opts = {}) {
        this._loaded = true;
        this._allItems = Array.isArray(items) ? items.slice(0, 6) : [];
        this._items = this._allItems.filter((item) => exclusiveItemVisible(item));
        this._activeIndex = Number.isFinite(opts.activeIndex) ? Number(opts.activeIndex) : this._activeIndex;
        this.render();
    }

    /**
     * @param {number} index
     */
    setActiveIndex(index) {
        this._activeIndex = Number(index);
        this.render();
    }

    render() {
        if (!this._loaded) {
            this.shadow.innerHTML = `
                <style>
                    :host { display: block; width: 100%; }
                    ${PH_LOADER_BASE_STYLES}
                    .community-exclusive-pending-loader {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: clamp(10rem, 20vw, 15rem);
                        background: var(--bg, #f8f4f0);
                    }
                </style>
                ${programHeroLoaderHtml({ wrapperClass: 'community-exclusive-pending-loader', ariaLabel: 'Loading exclusive content' })}
            `;
            return;
        }
        const loc =
            typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const cards = this._allItems
            .map((raw, sourceIndex) => ({ raw, sourceIndex }))
            .filter(({ raw }) => exclusiveItemVisible(raw));

        const blocks = cards.length
            ? cards
            .map(({ raw, sourceIndex: i }) => {
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
                    <article class="ech-card ${active ? 'is-active' : ''}" data-index="${i}">
                        <div class="ech-media" style="${displayImage ? `background-image:url(${esc(displayImage)})` : ''}">
                            ${displayImage ? '' : '<span class="ech-ph">Image</span>'}
                            <div class="ech-cap">
                                <strong>${esc(title)}</strong>
                                <span>${esc(line)}</span>
                            </div>
                            <button type="button" class="ech-play" aria-label="Select feature">▶</button>
                        </div>
                    </article>
                `;
            })
            .join('')
            : '<p class="ech-empty">No exclusive content is visible right now.</p>';

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    font-family: inherit;
                    color: inherit;
                }
                .ech-head {
                    display: flex; align-items: baseline; justify-content: space-between;
                    max-width: 100%; margin: 0 auto; padding: 0 0 1rem;
                    box-sizing: border-box;
                }
                .ech-title {
                    font-size: clamp(0.68rem, 0.85vw, 0.78rem);
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    font-variation-settings: var(--fv-label);
                }
                .ech-view {
                    display: none;
                    font-size: clamp(0.78rem, 1vw, 0.88rem);
                    font-variation-settings: var(--fv-body);
                    text-decoration: underline; cursor: pointer; border: none; background: none; color: inherit;
                }
                .ech-row {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                    max-width: 100%;
                    margin: 0 auto;
                    padding: 0 0 2.25rem;
                    box-sizing: border-box;
                }
                .ech-card { min-width: 0; }
                .ech-card.is-active .ech-media {
                    outline: 1px solid var(--c2, #111);
                    outline-offset: 4px;
                }
                .ech-media {
                    position: relative;
                    aspect-ratio: 16 / 9;
                    background: #ddd center/cover no-repeat #e8e8e4;
                    background-position: center center;
                    background-size: cover;
                    border-radius: 2px;
                    overflow: hidden;
                }
                .ech-media::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    pointer-events: none;
                    background:
                        linear-gradient(90deg, rgba(0,0,0,0.76) 0%, rgba(0,0,0,0.42) 34%, rgba(0,0,0,0) 72%),
                        linear-gradient(0deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.34) 36%, rgba(0,0,0,0) 70%);
                }
                .ech-ph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #999; font-size: clamp(0.78rem, 1vw, 0.88rem); font-variation-settings: var(--fv-caption); }
                .ech-cap {
                    position: absolute; left: 0; right: auto; bottom: 0;
                    z-index: 1;
                    width: min(78%, 22rem);
                    padding: clamp(0.9rem, 1.3vw, 1.25rem);
                    font-size: clamp(0.72rem, 0.9vw, 0.86rem);
                    letter-spacing: 0.035em;
                    font-variation-settings: var(--fv-caption);
                    background: transparent;
                    color: #fff;
                    display: flex;
                    flex-direction: column;
                    gap: 0.28rem;
                }
                .ech-cap strong {
                    font-size: clamp(0.9rem, 1.25vw, 1.12rem);
                    line-height: 1.08;
                    font-variation-settings: var(--fv-subtitle);
                    text-shadow: 0 1px 12px rgba(0,0,0,0.5);
                }
                .ech-cap span {
                    max-width: 24rem;
                    opacity: 0.9;
                    line-height: 1.25;
                    text-shadow: 0 1px 10px rgba(0,0,0,0.55);
                }
                .ech-play {
                    position: absolute; bottom: 0.85rem; right: 0.85rem;
                    z-index: 2;
                    width: 2rem; height: 2rem;
                    border-radius: 50%;
                    border: 1px solid #fff;
                    background: rgba(0,0,0,0.35);
                    color: #fff;
                    cursor: pointer;
                    font-size: 0.65rem;
                    font-variation-settings: var(--fv-label);
                }
                .ech-empty {
                    margin: 0;
                    padding: 0 0 2rem;
                    color: #666;
                    font-size: 0.88rem;
                }
                @media (max-width: 1024px) {
                    .ech-row { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 768px) {
                    .ech-row { grid-template-columns: 1fr; }
                    .ech-cap { width: min(84%, 22rem); }
                }
            </style>
            <div class="ech-head">
                <span class="ech-title">EXCLUSIVE CONTENT</span>
                <button type="button" class="ech-view" id="echViewAll">View all</button>
            </div>
            <div class="ech-row">${blocks}</div>
        `;

        const select = (idx, trigger = 'card') => {
            if (!Number.isInteger(idx) || idx < 0) return;
            const item = this._allItems[idx];
            if (!exclusiveItemVisible(item)) return;
            this._activeIndex = idx;
            captureCommunityEvent('community_exclusive_feature_selected', {
                feature_index: idx,
                trigger,
                has_preview_video: Boolean(String(item?.previewVideoUrl ?? item?.videoUrl ?? '').trim()),
                has_full_video: Boolean(String(item?.fullVideoKey ?? '').trim()),
            });
            this.render();
            this.dispatchEvent(
                new CustomEvent('fusion-community-feature-select', {
                    bubbles: true,
                    composed: true,
                    detail: { index: idx, item, trigger },
                }),
            );
        };

        this.shadow.querySelectorAll('.ech-play').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.ech-card');
                select(Number(card?.getAttribute('data-index') ?? -1), 'play_button');
            });
        });

        const row = this.shadow.querySelector('.ech-row');
        if (row) {
            row.querySelectorAll('.ech-card').forEach((card) => {
                card.addEventListener('click', () => {
                    select(Number(card.getAttribute('data-index') ?? -1), 'card');
                });
            });
        }
    }
}

customElements.define('app-exclusive-content-highlight', ExclusiveContentHighlight);
export { ExclusiveContentHighlight };
