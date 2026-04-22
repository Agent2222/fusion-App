import { SEO_MEDIA_DEFAULT, withSeoImageAlt } from '../../utils/mediaAltSeo.js';

/**
 * Program detail: main image 5:4 + left vertical thumbnail strip (~200px).
 * Data: `programPage.stripGalleryImages` (max 20 URLs). Click a thumb to change the main image.
 * Strip scrolls when needed; up/down controls appear when content overflows.
 */

const MAX_IMAGES = 20;
const STRIP_WIDTH_PX = 200;

/**
 * @param {HTMLImageElement} img
 * @param {string} url
 * @returns {Promise<void>}
 */
function assignImageWhenLoaded(img, url) {
    return new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => {
            img.src = url;
            resolve();
        };
        i.onerror = () => reject(new Error('image load failed'));
        i.src = url;
    });
}

class ProgramStripGalleryElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        /** @type {string[]} */
        this._urls = [];
        /** @type {string} */
        this._altBase = '';
        /** @type {number} */
        this._selected = 0;
        /** @type {HTMLElement | null} */
        this._mainImg = null;
        /** @type {HTMLElement | null} */
        this._stripScroll = null;
        /** @type {HTMLElement | null} */
        this._btnUp = null;
        /** @type {HTMLElement | null} */
        this._btnDown = null;
        /** @type {ResizeObserver | null} */
        this._ro = null;
        /** Keeps the thumbnail column from growing taller than `.psg-main`. */
        /** @type {ResizeObserver | null} */
        this._mainSizeRo = null;
        this._onScroll = () => this._updateScrollButtons();
        this._onWinResize = () => {
            this._syncStripColToMainHeight();
            this._updateScrollButtons();
        };
    }

    /**
     * @param {unknown[]} urls
     * @param {{ altBase?: unknown }} [opts]
     */
    setImages(urls, opts = {}) {
        this._urls = Array.isArray(urls)
            ? urls.map((u) => String(u ?? '').trim()).filter(Boolean).slice(0, MAX_IMAGES)
            : [];
        this._altBase = String(opts?.altBase ?? '').trim();
        void this._render();
    }

    /**
     * @param {'main' | 'thumb'} kind
     * @param {number} index
     * @returns {string}
     */
    _altForSlot(kind, index) {
        const base = this._altBase || 'Program';
        const label =
            kind === 'thumb'
                ? `${base} gallery thumbnail ${index + 1}`
                : `${base} gallery image ${index + 1}`;
        return withSeoImageAlt(label);
    }

    connectedCallback() {
        window.addEventListener('resize', this._onWinResize, { passive: true });
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this._onWinResize);
        if (this._ro && this._stripScroll) {
            this._ro.unobserve(this._stripScroll);
            this._ro.disconnect();
            this._ro = null;
        }
        if (this._mainSizeRo) {
            this._mainSizeRo.disconnect();
            this._mainSizeRo = null;
        }
        if (this._stripScroll) {
            this._stripScroll.removeEventListener('scroll', this._onScroll);
        }
    }

    _isHorizontalStrip() {
        return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 768px)').matches;
    }

    _updateScrollButtons() {
        const el = this._stripScroll;
        const up = this._btnUp;
        const down = this._btnDown;
        if (!el || !up || !down) return;
        const horiz = this._isHorizontalStrip();
        if (horiz) {
            const { scrollLeft, scrollWidth, clientWidth } = el;
            const can = scrollWidth > clientWidth + 1;
            up.textContent = '◀';
            down.textContent = '▶';
            up.setAttribute('aria-label', 'Scroll thumbnails left');
            down.setAttribute('aria-label', 'Scroll thumbnails right');
            up.hidden = !can || scrollLeft <= 2;
            down.hidden = !can || scrollLeft >= scrollWidth - clientWidth - 2;
        } else {
            up.textContent = '▲';
            down.textContent = '▼';
            up.setAttribute('aria-label', 'Scroll thumbnails up');
            down.setAttribute('aria-label', 'Scroll thumbnails down');
            const { scrollTop, scrollHeight, clientHeight } = el;
            const canScroll = scrollHeight > clientHeight + 1;
            up.hidden = !canScroll || scrollTop <= 2;
            down.hidden = !canScroll || scrollTop >= scrollHeight - clientHeight - 2;
        }
    }

    _scrollStrip(delta) {
        const el = this._stripScroll;
        if (!el) return;
        if (this._isHorizontalStrip()) {
            el.scrollBy({ left: delta, behavior: 'smooth' });
        } else {
            el.scrollBy({ top: delta, behavior: 'smooth' });
        }
    }

    /** Desktop: strip column height matches `.psg-main` exactly (flex line must not grow from thumb content). */
    _syncStripColToMainHeight() {
        const mainEl = this.shadowRoot?.querySelector('.psg-main');
        const stripCol = this.shadowRoot?.querySelector('.psg-strip-col');
        if (!(mainEl instanceof HTMLElement) || !(stripCol instanceof HTMLElement)) return;
        if (this._isHorizontalStrip()) {
            stripCol.style.height = '';
            stripCol.style.maxHeight = '';
            return;
        }
        const h = mainEl.getBoundingClientRect().height;
        if (h > 0) {
            const px = `${Math.round(h)}px`;
            stripCol.style.height = px;
            stripCol.style.maxHeight = px;
        }
    }

    _bindMainHeightToStripColumn() {
        if (this._mainSizeRo) {
            this._mainSizeRo.disconnect();
            this._mainSizeRo = null;
        }
        const mainEl = this.shadowRoot?.querySelector('.psg-main');
        if (!(mainEl instanceof HTMLElement)) return;
        this._mainSizeRo = new ResizeObserver(() => {
            this._syncStripColToMainHeight();
            this._updateScrollButtons();
        });
        this._mainSizeRo.observe(mainEl);
        queueMicrotask(() => this._syncStripColToMainHeight());
    }

    async _selectIndex(idx) {
        if (!this._urls.length || idx < 0 || idx >= this._urls.length) return;
        this._selected = idx;
        const main = this._mainImg;
        if (!(main instanceof HTMLImageElement)) return;
        const url = this._urls[idx];
        try {
            await assignImageWhenLoaded(main, url);
            main.alt = this._altForSlot('main', idx);
        } catch {
            /* keep previous */
        }
        this._stripScroll?.querySelectorAll('.psg-thumb').forEach((node) => {
            const i = Number(node.getAttribute('data-psg-idx'));
            node.classList.toggle('psg-thumb--active', i === idx);
        });
        const active = this._stripScroll?.querySelector(`.psg-thumb[data-psg-idx="${idx}"]`);
        active?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        queueMicrotask(() => this._updateScrollButtons());
    }

    async _render() {
        if (!this.shadowRoot) return;

        if (this._stripScroll) {
            this._stripScroll.removeEventListener('scroll', this._onScroll);
        }
        if (this._ro) {
            this._ro.disconnect();
            this._ro = null;
        }
        if (this._mainSizeRo) {
            this._mainSizeRo.disconnect();
            this._mainSizeRo = null;
        }

        if (!this._urls.length) {
            this.setAttribute('hidden', '');
            this.shadowRoot.innerHTML = '';
            this._mainImg = null;
            this._stripScroll = null;
            this._btnUp = null;
            this._btnDown = null;
            return;
        }

        this.removeAttribute('hidden');

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    margin: 0 0 1.75rem 0;
                    box-sizing: border-box;
                    container-type: inline-size;
                }
                :host([hidden]) {
                    display: none !important;
                }
                .psg-root {
                    display: flex;
                    flex-direction: row;
                    /* stretch would force .psg-main's height to the strip column and break aspect-ratio */
                    align-items: flex-start;
                    gap: 1rem;
                    width: 100%;
                    box-sizing: border-box;
                }
                .psg-strip-col {
                    width: ${STRIP_WIDTH_PX}px;
                    flex-shrink: 0;
                    flex-grow: 0;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    align-self: flex-start;
                    background: var(--bg, #f5f5f0);
                    border-radius: 2px;
                    overflow: hidden;
                }
                .psg-nav {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 2rem;
                    padding: 0.2rem 0;
                    background: color-mix(in srgb, var(--c2, #333) 8%, transparent);
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                    color: var(--c2, #333);
                }
                .psg-nav:hover {
                    background: color-mix(in srgb, var(--c2, #333) 15%, transparent);
                }
                .psg-nav[hidden] {
                    display: none !important;
                }
                .psg-strip-scroll {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 0.45rem;
                    padding: 0.35rem;
                    scrollbar-width: thin;
                }
                .psg-thumb {
                    position: relative;
                    flex: 0 0 auto;
                    width: 100%;
                    aspect-ratio: 3 / 2;
                    border: 2px solid transparent;
                    border-radius: 2px;
                    overflow: hidden;
                    cursor: pointer;
                    padding: 0;
                    background: #0001;
                    box-sizing: border-box;
                }
                .psg-thumb:focus-visible {
                    outline: 2px solid var(--c2, currentColor);
                    outline-offset: 2px;
                }
                .psg-thumb--active {
                    border-color: var(--c2, currentColor);
                }
                .psg-thumb img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    pointer-events: none;
                }
                .psg-main {
                    flex: 1 1 0;
                    align-self: flex-start;
                    width: 100%;
                    min-width: 0;
                    min-height: 0;
                    aspect-ratio: 5 / 4;
                    height: auto;
                    position: relative;
                    background: var(--bg, #f5f5f0);
                    border-radius: 2px;
                    overflow: hidden;
                }
                .psg-main img {
                    display: block;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                @media (max-width: 768px) {
                    .psg-root {
                        flex-direction: column;
                        max-height: none;
                    }
                    /* Column flex + flex:1 1 0 uses main-axis basis 0 for height → .psg-main collapsed */
                    .psg-main {
                        flex: 0 0 auto;
                        align-self: stretch;
                        width: 100%;
                        aspect-ratio: 5 / 4;
                        height: auto;
                    }
                    .psg-strip-col {
                        width: 100%;
                        max-height: min(168px, 40vh);
                        flex-direction: row;
                        align-items: stretch;
                    }
                    .psg-nav {
                        width: 2.25rem;
                        min-height: auto;
                        min-width: 2.25rem;
                        padding: 0 0.15rem;
                    }
                    .psg-strip-scroll {
                        flex-direction: row;
                        overflow-x: auto;
                        overflow-y: hidden;
                        flex: 1;
                        min-height: 0;
                    }
                    .psg-thumb {
                        flex-shrink: 0;
                        width: 96px;
                        aspect-ratio: 3 / 2;
                        height: auto;
                    }
                }
            </style>
            <div class="psg-root" part="root">
                <div class="psg-strip-col" part="strip-column">
                    <button type="button" class="psg-nav psg-nav--up" part="nav-up" aria-label="Scroll thumbnails up">▲</button>
                    <div class="psg-strip-scroll" part="strip-scroll"></div>
                    <button type="button" class="psg-nav psg-nav--down" part="nav-down" aria-label="Scroll thumbnails down">▼</button>
                </div>
                <div class="psg-main" part="main">
                    <img class="psg-main-img" alt="${SEO_MEDIA_DEFAULT}" decoding="async" loading="eager" />
                </div>
            </div>
        `;

        this._stripScroll = this.shadowRoot.querySelector('.psg-strip-scroll');
        this._btnUp = this.shadowRoot.querySelector('.psg-nav--up');
        this._btnDown = this.shadowRoot.querySelector('.psg-nav--down');
        this._mainImg = this.shadowRoot.querySelector('.psg-main-img');

        const scrollEl = this._stripScroll;
        if (scrollEl) {
            scrollEl.addEventListener('scroll', this._onScroll, { passive: true });
            this._ro = new ResizeObserver(() => this._updateScrollButtons());
            this._ro.observe(scrollEl);
        }

        const navStep = () => {
            const el = this._stripScroll;
            if (!el) return 100;
            return this._isHorizontalStrip()
                ? Math.max(80, el.clientWidth * 0.5)
                : Math.max(80, el.clientHeight * 0.5);
        };
        this._btnUp?.addEventListener('click', () => {
            const step = navStep();
            this._scrollStrip(this._isHorizontalStrip() ? -step : -step);
        });
        this._btnDown?.addEventListener('click', () => {
            const step = navStep();
            this._scrollStrip(step);
        });

        if (scrollEl) {
            for (let i = 0; i < this._urls.length; i++) {
                const u = this._urls[i];
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `psg-thumb${i === this._selected ? ' psg-thumb--active' : ''}`;
                btn.dataset.psgIdx = String(i);
                btn.setAttribute('aria-label', `Show image ${i + 1}`);
                const im = document.createElement('img');
                im.src = u;
                im.alt = this._altForSlot('thumb', i);
                btn.appendChild(im);
                btn.addEventListener('click', () => void this._selectIndex(i));
                scrollEl.appendChild(btn);
            }
        }

        this._bindMainHeightToStripColumn();

        const main = this._mainImg;
        if (main instanceof HTMLImageElement) {
            try {
                await assignImageWhenLoaded(main, this._urls[this._selected]);
                main.alt = this._altForSlot('main', this._selected);
            } catch {
                this.setAttribute('hidden', '');
                this.shadowRoot.innerHTML = '';
                return;
            }
        }

        this._syncStripColToMainHeight();

        queueMicrotask(() => this._updateScrollButtons());
    }
}

customElements.define('app-program-strip-gallery', ProgramStripGalleryElement);

export { ProgramStripGalleryElement };
