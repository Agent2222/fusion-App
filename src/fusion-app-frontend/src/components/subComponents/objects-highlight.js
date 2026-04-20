import { mergeLocaleDeep } from '../../utils/localeFallback.js';

class ObjectsHighlightComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.data = null;
        /** @type {(() => void) | null} */
        this._teardownLightbox = null;
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }

    setObjectsHighlight(data) {
        this.data = data;
        this.render();
    }

    getObjectsHighlight() {
        return this.data;
    }

    static get observedAttributes() {
        return ['active'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active') {
            if (oldVal === newVal) return;
            this.render();
        }
    }

    /** @param {ShadowRoot} root */
    _centerLightboxScroll(root) {
        const scrollEl = root.querySelector('.oh-lightbox-scroll');
        const img = root.querySelector('.oh-lightbox-img');
        if (!scrollEl || !img) return;

        const apply = () => {
            const sh = scrollEl.scrollHeight;
            const ch = scrollEl.clientHeight;
            if (sh > ch) {
                scrollEl.scrollTop = Math.max(0, (sh - ch) / 2);
            } else {
                scrollEl.scrollTop = 0;
            }
        };

        if (img.complete && img.naturalHeight > 0) {
            requestAnimationFrame(() => requestAnimationFrame(apply));
        } else {
            img.addEventListener(
                'load',
                () => requestAnimationFrame(() => requestAnimationFrame(apply)),
                { once: true }
            );
            requestAnimationFrame(() => requestAnimationFrame(apply));
        }
    }

    _closeObjectLightbox() {
        if (this._teardownLightbox) {
            this._teardownLightbox();
            this._teardownLightbox = null;
        }
        const lb = this.shadowRoot?.getElementById('ohLightbox');
        if (lb) {
            lb.hidden = true;
            lb.setAttribute('aria-hidden', 'true');
        }
        if (typeof document !== 'undefined') {
            document.body.style.overflow = '';
        }
    }

    /**
     * @param {string} imageSrc
     * @param {string} imageAlt
     * @param {Record<string, unknown>} slice — locale block (name, artist, credit, description, copy)
     */
    _openObjectLightbox(imageSrc, imageAlt, slice) {
        const root = this.shadowRoot;
        if (!root) return;

        const lb = root.getElementById('ohLightbox');
        const img = root.querySelector('.oh-lightbox-img');
        const titleEl = root.querySelector('.oh-lightbox-title');
        const artistEl = root.querySelector('.oh-lightbox-artist');
        const creditEl = root.querySelector('.oh-lightbox-credit');
        const descEl = root.querySelector('.oh-lightbox-desc');
        const copyEl = root.querySelector('.oh-lightbox-copy');
        if (!lb || !img || !titleEl || !artistEl || !creditEl || !descEl || !copyEl) return;

        const name = String(slice.name ?? '');
        const artist = String(slice.artist ?? '');
        const credit = String(slice.credit ?? '');
        const description = String(slice.description ?? '');
        const copy = String(slice.copy ?? '');

        img.src = imageSrc;
        img.alt = imageAlt;

        const setBlock = (el, text, className) => {
            const t = text.trim();
            if (!t) {
                el.hidden = true;
                el.innerHTML = '';
            } else {
                el.hidden = false;
                el.className = className;
                el.textContent = t;
            }
        };

        setBlock(titleEl, name, 'oh-lightbox-title');
        setBlock(artistEl, artist, 'oh-lightbox-artist');
        setBlock(creditEl, credit, 'oh-lightbox-credit');
        setBlock(descEl, description, 'oh-lightbox-desc');
        setBlock(copyEl, copy, 'oh-lightbox-copy');

        lb.hidden = false;
        lb.setAttribute('aria-hidden', 'false');

        if (typeof document !== 'undefined') {
            document.body.style.overflow = 'hidden';
        }

        if (this._teardownLightbox) {
            this._teardownLightbox();
            this._teardownLightbox = null;
        }

        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this._closeObjectLightbox();
            }
        };
        const closeBtn = root.querySelector('.oh-lightbox-close');
        const onCloseClick = () => this._closeObjectLightbox();
        const onImgClick = () => this._closeObjectLightbox();

        document.addEventListener('keydown', onKey);
        closeBtn?.addEventListener('click', onCloseClick);
        img.addEventListener('click', onImgClick);

        this._centerLightboxScroll(root);

        this._teardownLightbox = () => {
            document.removeEventListener('keydown', onKey);
            closeBtn?.removeEventListener('click', onCloseClick);
            img.removeEventListener('click', onImgClick);
        };
    }

    createObjects() {
        const root = this.shadowRoot;
        if (!root || !this.data) return;
        const objects = Array.isArray(this.data.objects) ? this.data.objects : [];
        const count = Math.min(4, objects.length);
        if (count === 0) return;

        const loc =
            typeof window !== 'undefined' && typeof window.getLocale === 'function'
                ? window.getLocale()
                : 'en';
        const localeSlice = (row) => {
            if (!row || typeof row !== 'object') return {};
            const en = row.en && typeof row.en === 'object' ? row.en : {};
            const ja = row.ja && typeof row.ja === 'object' ? row.ja : {};
            if (loc === 'ja') {
                return /** @type {Record<string, unknown>} */ (mergeLocaleDeep(en, ja));
            }
            return /** @type {Record<string, unknown>} */ (en);
        };

        const targets = [
            () => root.querySelector('.sect1'),
            () => root.querySelector('.sect2-content1'),
            () => root.querySelector('.sect2-content2'),
            () => root.querySelector('.sect3'),
        ];

        for (let i = 0; i < count; i++) {
            const row = objects[i];
            const slice = localeSlice(row);
            const objectImage = row.image;
            const objectAlt = slice.alt ?? '';

            if (objectImage == null || objectImage === '') continue;

            const objectCard = document.createElement('div');
            objectCard.classList.add('object-card');
            objectCard.setAttribute('role', 'button');
            objectCard.setAttribute('tabindex', '0');
            objectCard.setAttribute('aria-label', String(slice.name ?? objectAlt ?? 'View object'));
            objectCard.innerHTML = `
                <div class="object-card-image" id="object-card-${i}">
                    <img alt="" />
                </div>
            `;
            const thumbImg = objectCard.querySelector('img');
            if (thumbImg) {
                thumbImg.src = String(objectImage);
                thumbImg.alt = String(objectAlt);
            }

            const parent = targets[i]();
            if (parent) parent.appendChild(objectCard);

            const open = () => this._openObjectLightbox(String(objectImage), String(objectAlt), slice);
            objectCard.addEventListener('click', open);
            objectCard.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open();
                }
            });
        }
    }

    connectedCallback() {
        this.render();
    }

    disconnectedCallback() {
        if (this._teardownLightbox) {
            this._teardownLightbox();
            this._teardownLightbox = null;
        }
        if (typeof document !== 'undefined') {
            document.body.style.overflow = '';
        }
    }

    render() {
        if (this._teardownLightbox) {
            this._teardownLightbox();
            this._teardownLightbox = null;
        }
        if (typeof document !== 'undefined') {
            document.body.style.overflow = '';
        }

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .objects-highlight {
                    width: 100%;
                    height: calc(100vh - 120px);
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 10% 90%;
                    padding-bottom: 120px;
                }
                
                .header {
                    width: 98%;
                    height: 100%;
                    font-size: 1.4rem;
                    font-variation-settings: var(--fv-display);
                    padding-left: 2%;
                    user-select: none;
                }
                
                .content {
                    width: 80%;
                    height: 100%;
                    min-height: 0;
                    display: grid;
                    margin-left: 10%;
                    margin-right: 10%;
                    grid-template-columns: 33.33% 33.33% 33.33%;
                    grid-template-rows: 1fr;
                    overflow: hidden;
                }
                
                .object-card {
                    width: 100%;
                    height: 100%;
                    min-width: 0;
                    min-height: 0;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    cursor: pointer;
                    transition: all 0.5s ease;
                }

                .object-card:hover > .object-card-image > img {
                    transform: scale(1.05);
                }
                
                .object-card-image {
                    width: 100%;
                    min-width: 0;
                    min-height: 0;
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                }
                
                .object-card-image img {
                    display: block;
                    width: 100%;
                    height: 100%;
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: cover;
                    transition: all 0.5s ease;
                }

                .sect1 {
                    width: 100%;
                    height: 100%;
                    min-height: 0;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                }

                .sect2 {
                    width: 100%;
                    height: 100%;
                    min-height: 0;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 50% 50%;
                }

                .sect3 {
                    width: 100%;
                    height: 100%;
                    min-height: 0;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                }

                @media (max-width: 1024px) {
                    .content {
                        grid-template-columns: 1fr 1fr;
                        width: 92%;
                        margin-left: 4%;
                        margin-right: 4%;
                    }
                }

                @media (max-width: 768px) {
                    .objects-highlight {
                        height: auto;
                        min-height: 0;
                        padding-bottom: 4rem;
                        grid-template-rows: auto 1fr;
                    }

                    .header {
                        margin-bottom: 5%;
                    }

                    .content {
                        width: 100%;
                        margin-left: 0;
                        margin-right: 0;
                        min-height: 0;
                        grid-template-columns: 1fr;
                        grid-template-rows: auto;
                        align-items: stretch;
                    }

                    .sect1,
                    .sect2,
                    .sect3 {
                        grid-column: 1 / -1;
                    }

                    .sect2 {
                        grid-template-columns: 1fr;
                        grid-template-rows: auto auto;
                    }

                    .oh-lightbox-scroll {
                        overflow-x: auto;
                        overflow-y: hidden;
                        -webkit-overflow-scrolling: touch;
                        display: flex;
                        align-items: stretch;
                        justify-content: flex-start;
                        padding-bottom: env(safe-area-inset-bottom, 0);
                    }

                    .oh-lightbox-img {
                        height: 100%;
                        width: auto;
                        max-width: none;
                        min-height: 100%;
                        flex: 0 0 auto;
                        object-fit: contain;
                    }

                    .oh-lightbox-meta {
                        padding: 0;
                        left: 5%;
                        bottom: 2%;
                        max-width: 90%;
                    }
                }

                /* Full-screen lightbox: image scrolls vertically at full width; caption + close stay fixed */
                .oh-lightbox {
                    position: fixed;
                    inset: 0;
                    z-index: 200000;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    background: #000;
                    overflow: hidden;
                }

                .oh-lightbox[hidden] {
                    display: none !important;
                }

                .oh-lightbox-scroll {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    overflow-y: auto;
                    overflow-x: hidden;
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior: contain;
                    /* Lets you scroll the bottom of the image clear of the fixed caption */
                    padding-bottom: min(42vh, 16rem);
                    box-sizing: border-box;
                }

                .oh-lightbox-img {
                    width: 100%;
                    height: auto;
                    margin: 0;
                    padding: 0;
                    border: 0;
                    display: block;
                    vertical-align: top;
                    cursor: pointer;
                }

                .oh-lightbox-meta {
                    position: fixed;
                    left: 0;
                    bottom: 0;
                    z-index: 1;
                    max-width: min(92vw, 40rem);
                    padding: 1.25rem 1.5rem 1.5rem;
                    padding-bottom: max(1.25rem, env(safe-area-inset-bottom, 0px));
                    box-sizing: border-box;
                    color: var(--c3, #fff);
                    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.85);
                    pointer-events: none;
                }

                .oh-lightbox-meta .oh-lightbox-title {
                    margin: 0 0 0.35rem;
                    font-size: clamp(.8rem, 1vw, 1.5rem);
                    font-variation-settings: var(--fv-caption-fine);
                    line-height: 1.2;
                }

                .oh-lightbox-meta .oh-lightbox-artist {
                    margin: 0 0 0.35rem;
                    font-size: clamp(0.9rem, 1.4vw, 1.1rem);
                    font-variation-settings: var(--fv-emphasis);
                    opacity: 0.95;
                }

                .oh-lightbox-meta .oh-lightbox-credit {
                    margin: 0 0 0.5rem;
                    font-size: clamp(0.65rem, 0.9vw, 0.82rem);
                    font-variation-settings: var(--fv-caption-fine);
                    opacity: 0.88;
                }

                .oh-lightbox-meta .oh-lightbox-desc {
                    margin: 0 0 0.5rem;
                    font-size: clamp(0.72rem, 1vw, 0.92rem);
                    font-variation-settings: var(--fv-caption-fine);
                    line-height: 1.45;
                    opacity: 0.92;
                }

                .oh-lightbox-meta .oh-lightbox-copy {
                    margin: 0;
                    font-size: clamp(0.65rem, 0.88vw, 0.85rem);
                    font-variation-settings: var(--fv-caption-fine);
                    line-height: 1.4;
                    opacity: 0.88;
                }

                .oh-lightbox-close {
                    position: fixed;
                    top: max(0.75rem, env(safe-area-inset-top, 0px));
                    right: max(0.75rem, env(safe-area-inset-right, 0px));
                    z-index: 2;
                    width: 2.75rem;
                    height: 2.75rem;
                    margin: 0;
                    padding: 0;
                    border: 1px solid color-mix(in srgb, var(--c3, #fff) 35%, transparent);
                    border-radius: 0;
                    background: color-mix(in srgb, #000 45%, transparent);
                    color: var(--c3, #fff);
                    font-size: 1.5rem;
                    line-height: 1;
                    cursor: pointer;
                    pointer-events: auto;
                    -webkit-appearance: none;
                    appearance: none;
                    font-family: inherit;
                }

                .oh-lightbox-close:hover {
                    background: color-mix(in srgb, #000 65%, transparent);
                }
            </style>
            <div class="objects-highlight">
                <div class="header">Objects Highlights</div>
                <div class="content">
                    <div class="sect1"></div>
                    <div class="sect2">
                        <div class="sect2-content1"></div>
                        <div class="sect2-content2"></div>
                    </div>  
                    <div class="sect3"></div>
                </div>
            </div>
            <div
                class="oh-lightbox"
                id="ohLightbox"
                hidden
                aria-modal="true"
                role="dialog"
                aria-label="Object"
                aria-hidden="true"
            >
                <button type="button" class="oh-lightbox-close" aria-label="Close">×</button>
                <div class="oh-lightbox-scroll">
                    <img class="oh-lightbox-img" src="" alt="" />
                </div>
                <div class="oh-lightbox-meta">
                    <h2 class="oh-lightbox-title"></h2>
                    <p class="oh-lightbox-artist"></p>
                    <p class="oh-lightbox-credit"></p>
                    <p class="oh-lightbox-desc"></p>
                    <p class="oh-lightbox-copy"></p>
                </div>
            </div>
        `;
    }
}

customElements.define('app-objects-highlight', ObjectsHighlightComponent);

export { ObjectsHighlightComponent };
