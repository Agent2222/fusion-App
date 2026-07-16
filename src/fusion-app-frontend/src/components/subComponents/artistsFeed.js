import { navigate } from '../../router.js';
import {
    ARTIST_CARD_PREVIEW_CHIP_CSS,
    enhanceArtistCardForPreview,
} from '../../utils/artistCardPreviewChip.js';
import {
    artistDisplayDiscipline,
    artistDisplayName,
    artistEnglishBlock,
    artistHasResidencySignal,
    artistResidencyCardYear,
    residencyBadgeMatchesCurrentSeason,
    artistSlugFromName,
} from '../../utils/artistSlug.js';
import { applyArtistCardImage } from '../../utils/artistCardPlaceholder.js';
import {
    getArtistCardImageUrlForCurrentMode,
    ARTIST_CARD_IMAGE_MODE_EVENT,
} from '../../utils/artistCardImageMode.js';
import { getCurrentProgramSeason } from '../../utils/database.js';
import { withSeoImageAlt } from '../../utils/mediaAltSeo.js';
import {
    ARTISTS_FEED_PENDING_WRAPPER_STYLES,
    PH_LOADER_BASE_STYLES,
    programHeroLoaderHtml,
} from '../../utils/programHeroLoader.js';

/** 20 cards per page, 5 columns × 4 rows */
const PAGE_SIZE = 20;

/**
 * @param {Array} artists
 * @returns {Array}
 */
function dedupeArtistsById(artists) {
    const seen = new Set();
    const out = [];
    for (const a of artists) {
        if (!a || typeof a !== 'object') continue;
        const idRaw = a.id != null ? String(a.id).trim() : '';
        const slugRaw =
            a.slug != null && String(a.slug).trim() !== ''
                ? String(a.slug).trim().toLowerCase()
                : '';
        /* Empty id must not collapse distinct rows — fall back to slug before JSON. */
        const key = idRaw ? `id:${idRaw}` : slugRaw ? `slug:${slugRaw}` : JSON.stringify(a);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(a);
    }
    return out;
}

/**
 * @param {unknown} a
 * @returns {number}
 */
function featuredOrderOf(a) {
    if (!a || typeof a !== 'object') return Number.POSITIVE_INFINITY;
    const n = Number(/** @type {{ featuredOrder?: unknown }} */ (a).featuredOrder);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/**
 * Dedupe by artist id, then stable sort (featuredOrder asc, then slug, then id). No padding/repeats.
 * @param {Array} artists — same shape as testData.allArtists.artists
 * @returns {Array}
 */
export function buildFeedPool(artists) {
    if (!artists || artists.length === 0) return [];
    const unique = dedupeArtistsById(artists);
    return [...unique].sort((a, b) => {
        const fo = featuredOrderOf(a) - featuredOrderOf(b);
        if (fo !== 0) return fo;
        const sa = a && typeof a === 'object' && a.slug != null ? String(a.slug) : '';
        const sb = b && typeof b === 'object' && b.slug != null ? String(b.slug) : '';
        const sc = sa.localeCompare(sb);
        if (sc !== 0) return sc;
        const ia = a && typeof a === 'object' && a.id != null ? String(a.id) : '';
        const ib = b && typeof b === 'object' && b.id != null ? String(b.id) : '';
        return ia.localeCompare(ib);
    });
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class ArtistsFeedElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.pool = [];
        this.currentPage = 0;
        this._shellReady = false;
        /** Until first `setArtists` / `updatePage` completes */
        this._feedPending = true;
        /** @type {number} */
        this._pageUpdateSeq = 0;
        /** @type {(() => void) | null} */
        this._onCardImageMode = null;
    }

    getArtists() {
        return this.pool;
    }

    /**
     * @param {Array} artists — full pool (e.g. from buildFeedPool)
     */
    setArtists(artists) {
        this.pool = Array.isArray(artists) ? artists : [];
        this.currentPage = 0;
        if (this._shellReady) {
            void this.updatePage();
        }
    }

    connectedCallback() {
        this.ensureShell();
        if (this.pool.length) {
            void this.updatePage();
        } else if (this._feedPending) {
            this._showGridLoader();
        }
    }

    _showGridLoader() {
        const grid = this.gridEl;
        if (!grid) return;
        grid.classList.add('feed-grid--loading');
        grid.innerHTML = programHeroLoaderHtml({
            wrapperClass: 'artists-feed-pending-loader',
            ariaLabel: 'Loading artists',
        });
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

                ${PH_LOADER_BASE_STYLES}
                ${ARTISTS_FEED_PENDING_WRAPPER_STYLES}

                .artists-feed {
                    width: 100%;
                    box-sizing: border-box;
                }

                .header {
                    font-size: clamp(1rem, 1.2vw, 1.35rem);
                    font-variation-settings: var(--fv-display);
                    color: var(--c2);
                    padding-bottom: 3%;
                    user-select: none;
                    padding-left: 2%;
                }

                .feed-grid {
                    display: grid;
                    grid-template-columns: repeat(5, minmax(0, 1fr));
                    width: 100%;
                    min-height: 0;
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
                    position: relative;
                    width: 100%;
                    aspect-ratio: 3 / 4;
                    overflow: hidden;
                    background: var(--c3);
                }

                .residency-badge {
                    position: absolute;
                    left: 0.35rem;
                    bottom: 0.35rem;
                    z-index: 1;
                    padding: 0.2rem 0.4rem;
                    border-radius: 2px;
                    background-color: var(--c1);
                    color: var(--c3);
                    font-size: clamp(0.58rem, 0.72vw, 0.7rem);
                    font-variation-settings: var(--fv-subtitle);
                    letter-spacing: 0.04em;
                    line-height: 1.1;
                    text-align: center;
                    pointer-events: none;
                    box-sizing: border-box;
                }

                .residency-badge[hidden] {
                    display: none !important;
                }

                .residency-badge--past-season {
                    background-color: #000;
                    color: var(--c3);
                }

                .artist-card-image > img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform-origin: center center;
                    transition: transform 0.35s ease;
                }

                .artist-card-image > img.artist-card-img--placeholder {
                    object-fit: contain;
                    object-position: center;
                    background: var(--c3);
                }

                .artist-card-content {
                    min-height: 4rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 0.4rem 0.25rem 0.55rem;
                    background-color: var(--c3);
                    gap: 0.15rem;
                }

                .artist-card-title {
                    font-size: clamp(0.72rem, 0.95vw, 0.95rem);
                    font-variation-settings: var(--fv-card-title);
                    color: var(--c2);
                    line-height: 1.2;
                    text-align: center;
                }

                .artist-card-discipline {
                    font-size: clamp(0.62rem, 0.78vw, 0.8rem);
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

                .feed-meta {
                    font-size: clamp(0.75rem, 0.85vw, 0.95rem);
                    font-variation-settings: var(--fv-label);
                    color: var(--c2);
                    opacity: 0.85;
                    min-width: 12rem;
                    text-align: center;
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
                    .feed-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }

                @media (max-width: 768px) {
                    .artist-card {
                        min-height: 0;
                    }

                    .artist-card-content {
                        padding: 0.5rem 0.35rem 0.65rem;
                        gap: 0.12rem;
                    }
                }

                @media (max-width: 520px) {
                    .feed-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .artist-card-content {
                        padding: 0.45rem 0.3rem 0.55rem;
                    }
                }

                ${ARTIST_CARD_PREVIEW_CHIP_CSS}
            </style>
            <div class="artists-feed">
                <div class="header">All Artists</div>
                <div class="feed-nav-row feed-nav-row--top">
                    <div class="feed-nav">
                        <div class="feed-nav-buttons">
                            <button type="button" class="nav-btn" id="btnBackTop" aria-label="Previous page">Back</button>
                            <button type="button" class="nav-btn" id="btnNextTop" aria-label="Next page">Next</button>
                        </div>
                        <div class="feed-page-label" id="feedPageLabelTop" aria-hidden="true">Pg. 1</div>
                    </div>
                </div>
                <div class="feed-grid" id="feedGrid"></div>
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

        this.gridEl = this.shadowRoot.getElementById('feedGrid');
        this.btnBack = this.shadowRoot.getElementById('btnBack');
        this.btnNext = this.shadowRoot.getElementById('btnNext');
        this.btnBackTop = this.shadowRoot.getElementById('btnBackTop');
        this.btnNextTop = this.shadowRoot.getElementById('btnNextTop');
        this.pageLabelEl = this.shadowRoot.getElementById('feedPageLabel');
        this.pageLabelTopEl = this.shadowRoot.getElementById('feedPageLabelTop');

        this.btnBack.addEventListener('click', () => this.goPrev());
        this.btnNext.addEventListener('click', () => this.goNext());
        this.btnBackTop.addEventListener('click', () => this.goPrev());
        this.btnNextTop.addEventListener('click', () => this.goNext());

        if (!this._onCardImageMode) {
            this._onCardImageMode = () => {
                void this.updatePage();
            };
            window.addEventListener(ARTIST_CARD_IMAGE_MODE_EVENT, this._onCardImageMode);
        }
    }

    goPrev() {
        if (this.currentPage <= 0) return;
        this.currentPage -= 1;
        void this.updatePage();
        // scroll to the top of the artists feed
        this.gridEl.scrollTo({ top: 0, behavior: 'smooth' });
    }

    goNext() {
        const totalPages = Math.max(1, Math.ceil(this.pool.length / PAGE_SIZE));
        if (this.currentPage >= totalPages - 1) return;
        this.currentPage += 1;
        void this.updatePage();
        // scroll to the top of the artists feed
        this.gridEl.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async updatePage() {
        if (!this._shellReady) return;

        this._pageUpdateSeq += 1;
        const seq = this._pageUpdateSeq;

        const total = this.pool.length;
        const totalPages = total === 0 ? 1 : Math.ceil(total / PAGE_SIZE);
        const start = this.currentPage * PAGE_SIZE;
        const slice = this.pool.slice(start, start + PAGE_SIZE);

        const grid = this.gridEl;
        const keepExistingCards =
            grid &&
            grid.children.length > 0 &&
            !grid.classList.contains('feed-grid--loading');
        if (!keepExistingCards) {
            this._showGridLoader();
        }

        let currentSeason = '';
        try {
            currentSeason = (await getCurrentProgramSeason()).trim();
        } catch {
            currentSeason = '';
        }
        /* A newer updatePage or setArtists may have run while awaiting — skip stale paint. */
        if (seq !== this._pageUpdateSeq) return;

        this._feedPending = false;
        /* Clear only after season resolves so the previous page’s cards stay visible during the gap (avoids footer jump on mobile). */
        grid.classList.remove('feed-grid--loading');
        grid.innerHTML = '';

        const useSeasonCompare = currentSeason !== '';

        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';

        for (let i = 0; i < slice.length; i++) {
            const artist = slice[i];
            const artistName = artistDisplayName(artist, locale);
            const artistDiscipline = artistDisplayDiscipline(artist, locale);

            const card = document.createElement('div');
            card.classList.add('artist-card');
            card.addEventListener('click', () => {
                const en = artistEnglishBlock(artist);
                const slug =
                    artist.slug || artistSlugFromName(en?.name ?? artistDisplayName(artist, 'en'));
                navigate(`/profile/${encodeURIComponent(slug)}`);
            });
            card.innerHTML = `
                <div class="artist-card-image">
                    <div class="residency-badge" hidden></div>
                    <img alt="${escapeHtml(withSeoImageAlt(artistName))}" loading="lazy" decoding="async">
                </div>
                <div class="artist-card-content">
                    <div class="artist-card-title">${escapeHtml(artistName)}</div>
                    <div class="artist-card-discipline">${escapeHtml(artistDiscipline)}</div>
                </div>
            `;
            enhanceArtistCardForPreview(card, artist);
            const cardImg = card.querySelector('.artist-card-image img');
            applyArtistCardImage(cardImg, getArtistCardImageUrlForCurrentMode(artist));
            const residencyBadge = card.querySelector('.residency-badge');
            if (residencyBadge instanceof HTMLElement) {
                const y = artistResidencyCardYear(artist);
                residencyBadge.classList.remove('residency-badge--past-season');
                if (artistHasResidencySignal(artist) && y) {
                    residencyBadge.textContent = y;
                    residencyBadge.removeAttribute('hidden');
                    if (useSeasonCompare) {
                        const matches = residencyBadgeMatchesCurrentSeason(
                            y,
                            currentSeason,
                            artist.mostRecentProgram,
                        );
                        if (!matches) {
                            residencyBadge.classList.add('residency-badge--past-season');
                        }
                    }
                } else {
                    residencyBadge.setAttribute('hidden', '');
                }
            }
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

customElements.define('app-artists-feed', ArtistsFeedElement);

export { ArtistsFeedElement };
