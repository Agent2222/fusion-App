// Editions feed: rows of 1, 2, 3, 4, then 5 tiles (15 items per page); paginated.
import { navigate } from '../../router.js';
import { mergeLocaleDeep } from '../../utils/localeFallback.js';

/** 1 + 2 + 3 + 4 + 5 = 15 items per page */
const PAGE_SIZE = 15;

/** Grid column counts per row (first row = featured width). */
const ROW_LAYOUT = [1, 2, 3, 4, 5];

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class EditionsFeedComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.pool = [];
        this.currentPage = 0;
        this._shellReady = false;
        this._onLocaleChange = () => this.updatePage();
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }

    setEditions(data) {
        this.pool = Array.isArray(data?.items) ? [...data.items] : [];
        this.currentPage = 0;
        if (this._shellReady) {
            this.updatePage();
        }
    }

    getEditions() {
        return { items: this.pool };
    }

    static get observedAttributes() {
        return ['active'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active') {
            if (oldVal === newVal) return;
            if (this._shellReady) this.updatePage();
        }
    }

    connectedCallback() {
        window.addEventListener('fusion-localechange', this._onLocaleChange);
        this.ensureShell();
        this.updatePage();
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-localechange', this._onLocaleChange);
    }

    ensureShell() {
        if (this._shellReady) return;
        this._shellReady = true;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .editions-feed {
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    // padding-left: 2%;
                    // padding-right: 2%;
                    text-align: center;
                    padding-bottom: 50px;
                }

                .feed-body {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    width: 100%;
                }

                .feed-row {
                    display: grid;
                    width: 100%;
                    // gap: 0.85rem;
                    min-height: 0;
                }

                .feed-row--1 {
                    grid-template-columns: 1fr;
                }

                .feed-row--2 {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                .feed-row--3 {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }

                .feed-row--4 {
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                }

                .feed-row--5 {
                    grid-template-columns: repeat(5, minmax(0, 1fr));
                }

                .edition-card {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    text-decoration: none;
                    color: var(--c2, #000);
                    cursor: pointer;
                    transition: transform 0.25s ease, opacity 0.25s ease;
                    box-sizing: border-box;
                }

                .edition-card:hover {
                    opacity: 0.95;
                }

                .edition-card:hover .edition-card-image img {
                    transform: scale(1.05);
                }

                .edition-card--featured .edition-card-image {
                    aspect-ratio: 21 / 9;
                }

                .edition-card:not(.edition-card--featured) .edition-card-image {
                    aspect-ratio: 3 / 4;
                }

                .edition-card-image {
                    width: 100%;
                    overflow: hidden;
                    background: var(--c3, #e8e8e8);
                    flex-shrink: 0;
                }

                .edition-card-image img {
                    display: block;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.4s ease;
                }

                .edition-card-caption {
                    flex-shrink: 0;
                    padding: 1.2rem 0 0;
                    font-size: clamp(0.72rem, 0.95vw, 0.95rem);
                    font-variation-settings: var(--fv-card-title);
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    text-align: left;
                    line-height: 1.2;
                    text-align: center;
                }

                .feed-footer {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem 1.5rem;
                    margin-top: 1.75rem;
                    padding-top: 1rem;
                }

                .feed-nav {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.65rem;
                }

                .feed-nav-buttons {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .feed-page-label {
                    font-size: clamp(0.72rem, 0.8vw, 0.9rem);
                    font-variation-settings: var(--fv-label-strong);
                    color: var(--c2);
                    opacity: 0.85;
                    letter-spacing: 0.04em;
                    user-select: none;
                }

                .nav-btn {
                    min-width: 7.5rem;
                    padding: 0.6em 1em;
                    font-size: clamp(0.75rem, 0.85vw, 0.95rem);
                    font-variation-settings: var(--fv-title);
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: var(--c2);
                    background: var(--c3);
                    border: 1px solid var(--c2);
                    cursor: pointer;
                    transition: background 0.2s ease, opacity 0.2s ease;
                }

                .nav-btn:hover:not(:disabled) {
                    background: var(--c5);
                }

                .nav-btn:disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                }

                @media (max-width: 900px) {
                    .feed-row--3 {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .feed-row--4 {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .feed-row--5 {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }

                @media (max-width: 520px) {
                    .feed-row--2,
                    .feed-row--3,
                    .feed-row--4,
                    .feed-row--5 {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .edition-card--featured .edition-card-image {
                        aspect-ratio: 4 / 3;
                    }
                }
            </style>
            <div class="editions-feed">
                <div class="feed-body" id="feedBody"></div>
                <div class="feed-footer">
                    <div class="feed-nav">
                        <div class="feed-nav-buttons">
                            <button type="button" class="nav-btn" id="btnBack" aria-label="Previous page">Back</button>
                            <button type="button" class="nav-btn" id="btnNext" aria-label="Next page">Next</button>
                        </div>
                        <div class="feed-page-label" id="feedPageLabel" aria-live="polite">Pg. 1</div>
                    </div>
                </div>
            </div>
        `;

        this.feedBody = this.shadowRoot.getElementById('feedBody');
        this.btnBack = this.shadowRoot.getElementById('btnBack');
        this.btnNext = this.shadowRoot.getElementById('btnNext');
        this.pageLabelEl = this.shadowRoot.getElementById('feedPageLabel');

        this.btnBack.addEventListener('click', () => this.goPrev());
        this.btnNext.addEventListener('click', () => this.goNext());

        if (!this._editionNavBound) {
            this._editionNavBound = true;
            this.shadowRoot.addEventListener('click', (e) => {
                const a = e.target.closest?.('a.edition-card');
                if (!a) return;
                const href = a.getAttribute('href');
                if (href && href.startsWith('/')) {
                    e.preventDefault();
                    navigate(href);
                }
            });
        }
    }

    goPrev() {
        if (this.currentPage <= 0) return;
        this.currentPage -= 1;
        this.updatePage();
    }

    goNext() {
        const totalPages = Math.max(1, Math.ceil(this.pool.length / PAGE_SIZE));
        if (this.currentPage >= totalPages - 1) return;
        this.currentPage += 1;
        this.updatePage();
    }

    /**
     * @param {HTMLElement} parent
     * @param {object} item
     * @param {boolean} featured
     */
    _appendCard(parent, item, featured) {
        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
        const en = item.en && typeof item.en === 'object' ? item.en : {};
        const ja = item.ja && typeof item.ja === 'object' ? item.ja : {};
        const copy =
            locale === 'ja'
                ? /** @type {Record<string, unknown>} */ (mergeLocaleDeep(en, ja))
                : /** @type {Record<string, unknown>} */ (en);
        const title = copy?.title || '';
        const alt = copy?.alt || title;
        const href = item.href || '#';

        const a = document.createElement('a');
        a.className = 'edition-card' + (featured ? ' edition-card--featured' : '');
        a.href = href;

        a.innerHTML = `
            <div class="edition-card-image">
                <img src="${item.imageSrc}" alt="${escapeHtml(alt)}">
            </div>
            <div class="edition-card-caption">${escapeHtml(title)}</div>
        `;
        parent.appendChild(a);
    }

    updatePage() {
        if (!this._shellReady || !this.feedBody) return;

        this.feedBody.innerHTML = '';

        const total = this.pool.length;
        const totalPages = total === 0 ? 1 : Math.ceil(total / PAGE_SIZE);
        const start = this.currentPage * PAGE_SIZE;
        const slice = this.pool.slice(start, start + PAGE_SIZE);

        let i = 0;
        for (let r = 0; r < ROW_LAYOUT.length && i < slice.length; r++) {
            const cols = ROW_LAYOUT[r];
            const remaining = slice.length - i;
            const take = Math.min(cols, remaining);
            if (take <= 0) break;

            const row = document.createElement('div');
            row.className = `feed-row feed-row--${cols}`;
            for (let k = 0; k < take; k++) {
                const featured = r === 0 && k === 0;
                this._appendCard(row, slice[i], featured);
                i += 1;
            }
            this.feedBody.appendChild(row);
        }

        this.btnBack.disabled = this.currentPage <= 0;
        this.btnNext.disabled = total === 0 || this.currentPage >= totalPages - 1;

        if (this.pageLabelEl) {
            const pageNum = total === 0 ? 1 : this.currentPage + 1;
            this.pageLabelEl.textContent = `Pg. ${pageNum}`;
        }
    }
}

customElements.define('app-editions-feed', EditionsFeedComponent);

export { EditionsFeedComponent };
