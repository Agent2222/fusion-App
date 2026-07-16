import { navigate } from '../../router.js';
import {
    ARTIST_CARD_PREVIEW_CHIP_CSS,
    enhanceArtistCardForPreview,
} from '../../utils/artistCardPreviewChip.js';
import {
    artistDisplayDiscipline,
    artistDisplayName,
    artistEnglishBlock,
    artistLocaleBlock,
    artistSlugFromName,
} from '../../utils/artistSlug.js';
import { applyArtistCardImage } from '../../utils/artistCardPlaceholder.js';
import {
    getArtistCardImageUrlForCurrentMode,
    ARTIST_CARD_IMAGE_MODE_EVENT,
} from '../../utils/artistCardImageMode.js';
import { withSeoImageAlt } from '../../utils/mediaAltSeo.js';

import prepIcon from '../../assets/icon-cal.png';
import showingIcon from '../../assets/icon-loc.png';
import availableIcon from '../../assets/icon-art.png';

const PAGE_SIZE = 20;

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class ArtistsGAFeedElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.pool = [];
        this.currentPage = 0;
        this._shellReady = false;
        /** @type {(() => void) | null} */
        this._onCardImageMode = null;
    }

    getArtists() {
        return this.pool;
    }

    /**
     * @param {Array} artists — full pool (e.g. from `buildFeedPool` in `artistsFeed.js`)
     */
    setArtists(artists) {
        this.pool = Array.isArray(artists) ? artists : [];
        this.currentPage = 0;
        if (this._shellReady) {
            this.updatePage();
        }
    }

    connectedCallback() {
        this.ensureShell();
        if (this.pool.length) {
            this.updatePage();
        }
    }

    disconnectedCallback() {
        if (this._onCardImageMode) {
            window.removeEventListener(ARTIST_CARD_IMAGE_MODE_EVENT, this._onCardImageMode);
            this._onCardImageMode = null;
        }
    }

    ensureShell() {
        if (this._shellReady) return;
        this._shellReady = true;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .artists-ga-feed {
                    width: 100%;
                    box-sizing: border-box;
                }

                .feed-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    width: 92%;
                    padding-left: 4%;
                    padding-right: 4%;
                    min-height: 0;
                    margin-top: 1.75rem;
                    gap: 1.8rem;
                }

                .artist-card {
                    display: grid;
                    grid-template-rows: minmax(0, 1fr) auto;
                    min-width: 0;
                    cursor: pointer;
                    transition: opacity 0.25s ease;
                }

                .artist-card:hover {
                    opacity: 0.92;
                }

                .artist-card:hover .artist-card-image > img {
                    transform: scale(1.06);
                }

                .artist-card:has(.artist-card-preview-chip:hover) .artist-card-image > img {
                    transform: none;
                }

                .artist-card-image {
                    width: 100%;
                    aspect-ratio: 3.5 / 4;
                    overflow: hidden;
                    background: var(--c3);
                }

                .artist-card-image > img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: top;
                    transform-origin: center center;
                    transition: transform 0.35s ease;
                }

                .artist-card-image > img.artist-card-img--placeholder {
                    object-fit: contain;
                    object-position: center;
                    background: var(--c3);
                }

                .artist-card-content {
                    height: 150px;
                    display: flex;
                    flex-direction: column;
                    align-items: start;
                    justify-content: start;
                    padding-left: 10%;
                    padding-top: 8%;
                    background-color: var(--c7);
                    gap: 0.15rem;
                    color: var(--c2);
                }

                .artist-card-title {
                    font-size: clamp(1rem, 2vw, 1.5rem);
                    font-variation-settings: var(--fv-card-title);
                    color: var(--c2);
                    line-height: 1.2;
                    text-align: start;
                }

                .artist-card-discipline {
                    font-size: clamp(0.8rem, 1.1vw, 1.2rem);
                    font-variation-settings: var(--fv-caption);
                    color: var(--c2);
                    line-height: 1.2;
                    text-align: center;
                    opacity: 0.9;
                }

                .feed-nav-row--top {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 1.25rem;
                    padding-bottom: 0.35rem;
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

                .artist-card-status {
                    padding-left: 10%;
                    padding-right: 10%;
                    padding-top: 1.5%;
                    padding-bottom: 1.5%;
                    max-width: 80%;
                    background-color: var(--c7);
                    gap: 0.15rem;
                    color: var(--c2);
                    border: 1px solid var(--c2);
                    font-size: clamp(0.8rem, 0.9vw, 1.1rem);
                    font-variation-settings: var(--fv-card-title);
                    text-align: start;
                    display: flex;
                    align-items: center;
                    justify-content: start;
                    margin-top: 4%;
                    opacity: 0.9;
                    position: relative;
                }

                .bgBlock {
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: -1;
                    opacity: 0.3;
                }

                .status-icon {
                    width: 1.3rem;
                    height: 1.3rem;
                    margin-right: 0.5rem;
                }

                .studio-category  {
                    color: var(--c4);
                    border: 1px solid var(--c4);
                }
                .prep-category  {
                    color: var(--c5);
                    border: 1px solid var(--c5);
                }
                .showing-category  {
                    color: var(--c2);
                    border: 1px solid var(--c1);
                }

                .showing-category-bg {
                    background-color: var(--c1);
                }

                .prep-category-bg {
                    background-color: var(--c5);
                }

                .studio-category-bg {
                    background-color: var(--c4);
                }

                .available-category-bg {
                    opacity: 0.5;
                }

                .available-category  {
                    color: var(--c2);
                    background-color: var(--bg);
                    border: 1px solid var(--bg);
                }

                .status-icon-studio {
                    width: .9rem;
                    height: .9rem;
                    margin-right: 0.5rem;
                    background-color: var(--c4);
                    border-radius: 50%;
                }

                @media (max-width: 900px) {
                    .feed-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }

                @media (max-width: 768px) {
                    .artist-card {
                        min-height: 0;
                    }

                    .artist-card-content {
                        height: auto;
                        min-height: 0;
                        padding: 0.65rem 8% 0.8rem;
                        justify-content: flex-start;
                    }

                    .artist-card-title {
                        font-size: clamp(0.85rem, 3.5vw, 1.25rem);
                    }

                    .artist-card-discipline {
                        font-size: clamp(0.72rem, 2.8vw, 0.95rem);
                    }

                    .artist-card-status {
                        margin-top: 0.4rem;
                        padding-left: 0;
                        padding-right: 0;
                        max-width: 100%;
                    }
                }

                @media (max-width: 520px) {
                    .feed-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .artist-card-content {
                        padding: 0.55rem 6% 0.7rem;
                    }
                }

                ${ARTIST_CARD_PREVIEW_CHIP_CSS}
            </style>
            <div class="artists-ga-feed">
                <div class="feed-nav-row feed-nav-row--top">
                    <div class="feed-nav">
                        <div class="feed-nav-buttons">
                            <button type="button" class="nav-btn" id="btnBackGATop" aria-label="Previous page">Back</button>
                            <button type="button" class="nav-btn" id="btnNextGATop" aria-label="Next page">Next</button>
                        </div>
                        <div class="feed-page-label" id="feedPageLabelGATop" aria-hidden="true">Pg. 1</div>
                    </div>
                </div>
                <div class="feed-grid" id="feedGridGA"></div>
                <div class="feed-footer">
                    <div class="feed-nav">
                        <div class="feed-nav-buttons">
                            <button type="button" class="nav-btn" id="btnBackGA" aria-label="Previous page">Back</button>
                            <button type="button" class="nav-btn" id="btnNextGA" aria-label="Next page">Next</button>
                        </div>
                        <div class="feed-page-label" id="feedPageLabelGA" aria-live="polite">Pg. 1</div>
                    </div>
                </div>
            </div>
        `;

        this.gridEl = this.shadowRoot.getElementById('feedGridGA');
        this.btnBack = this.shadowRoot.getElementById('btnBackGA');
        this.btnNext = this.shadowRoot.getElementById('btnNextGA');
        this.btnBackTop = this.shadowRoot.getElementById('btnBackGATop');
        this.btnNextTop = this.shadowRoot.getElementById('btnNextGATop');
        this.pageLabelEl = this.shadowRoot.getElementById('feedPageLabelGA');
        this.pageLabelTopEl = this.shadowRoot.getElementById('feedPageLabelGATop');

        this.btnBack.addEventListener('click', () => this.goPrev());
        this.btnNext.addEventListener('click', () => this.goNext());
        this.btnBackTop.addEventListener('click', () => this.goPrev());
        this.btnNextTop.addEventListener('click', () => this.goNext());

        if (!this._onCardImageMode) {
            this._onCardImageMode = () => this.updatePage();
            window.addEventListener(ARTIST_CARD_IMAGE_MODE_EVENT, this._onCardImageMode);
        }
    }

    statusIcon(status) {
        switch (status) {
            case 'studio':
                return `<div class="status-icon-studio"></div>`;
            case 'prep':
                return `<img src="${prepIcon}" alt="${escapeHtml(withSeoImageAlt('Prep'))}" class="status-icon">`;
            case 'showing':
                return `<img src="${showingIcon}" alt="${escapeHtml(withSeoImageAlt('Showing'))}" class="status-icon">`;
            case 'available':
                return `<img src="${availableIcon}" alt="${escapeHtml(withSeoImageAlt('Available'))}" class="status-icon">`;
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

    updatePage() {
        if (!this._shellReady) return;

        const grid = this.gridEl;
        grid.innerHTML = '';

        const total = this.pool.length;
        const totalPages = total === 0 ? 1 : Math.ceil(total / PAGE_SIZE);
        const start = this.currentPage * PAGE_SIZE;
        const slice = this.pool.slice(start, start + PAGE_SIZE);

        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';

        for (let i = 0; i < slice.length; i++) {
            const artist = slice[i];
            const artistName = artistDisplayName(artist, locale);
            const artistDiscipline = artistDisplayDiscipline(artist, locale);
            const loc = artistLocaleBlock(artist, locale);
            const artistStatus = loc?.status;
            const card = document.createElement('div');
            card.classList.add('artist-card');
            card.addEventListener('click', () => {
                const en = artistEnglishBlock(artist);
                const slug = artist.slug || artistSlugFromName(en?.name ?? '');
                navigate(`/profile/${encodeURIComponent(slug)}`);
            });

            let category = null;
            let statusText = null;
            if (artistStatus === 'studio') {
                category = 'studio-category';
                statusText = 'In Studio';
            } else if (artistStatus === 'prep') {
                statusText = 'Preparing for Exhibition';
                category = 'prep-category';
            } else if (artistStatus === 'showing') {
                category = 'showing-category';
                statusText = 'Show in-progress';
            } else if (artistStatus === 'available') {
                category = 'available-category';
                statusText = 'Available for<br>commissions';
            }

            const statusIcon = this.statusIcon(artistStatus);

            card.innerHTML = `
                <div class="artist-card-image">
                    <img alt="${escapeHtml(withSeoImageAlt(artistName))}" loading="lazy" decoding="async">
                </div>
                <div class="artist-card-content">
                    <div class="artist-card-title">${escapeHtml(artistName)}</div>
                    <div class="artist-card-discipline">${escapeHtml(artistDiscipline)}</div>
                    <div class="artist-card-status ${category}"><div class="bgBlock ${category}-bg"></div>${statusIcon} <span class="status-text">${statusText}</span></div>
                </div>
            `;
            enhanceArtistCardForPreview(card, artist);
            const gaImg = card.querySelector('.artist-card-image img');
            applyArtistCardImage(gaImg, getArtistCardImageUrlForCurrentMode(artist));
            grid.appendChild(card);
        }

        const backDisabled = this.currentPage <= 0;
        const nextDisabled = total === 0 || this.currentPage >= totalPages - 1;
        this.btnBack.disabled = backDisabled;
        this.btnNext.disabled = nextDisabled;
        this.btnBackTop.disabled = backDisabled;
        this.btnNextTop.disabled = nextDisabled;

        const pageLabelText = total === 0 ? 'Pg. 1' : `Pg. ${this.currentPage + 1}`;
        if (this.pageLabelEl) {
            this.pageLabelEl.textContent = pageLabelText;
        }
        if (this.pageLabelTopEl) {
            this.pageLabelTopEl.textContent = pageLabelText;
        }
    }
}

customElements.define('app-artists-ga-feed', ArtistsGAFeedElement);

export { ArtistsGAFeedElement };
