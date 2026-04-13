import { navigate } from '../../router.js';
import {
    artistDisplayDiscipline,
    artistDisplayName,
    artistEnglishBlock,
    artistSlugFromName,
} from '../../utils/artistSlug.js';

const MAX_ARTISTS = 30;
const MAX_PAGES = 3;
const PER_PAGE = 10;

class ConfirmedArtistsFeedComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {null | { headline: string, availableSlots: number | null, totalSlots: number | null, artists: object[] }} */
        this._data = null;
        this._slideCount = 0;
        this._activeIndex = 0;
        this._scrollRaf = null;
        /** @type {null | (() => void)} */
        this._teardownPagination = null;
    }

    /**
     * @param {{ headline: string, availableSlots: number | null, totalSlots: number | null, artists: object[] }} payload
     */
    setConfirmedArtistsFeed(payload) {
        this._data = payload;
        this.render();
        this._populate();
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }

    static get observedAttributes() {
        return ['active'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active' && oldVal !== newVal) {
            this.render();
            this._populate();
        }
    }

    _numPages(totalItems) {
        if (totalItems <= 0) return 1;
        return Math.min(MAX_PAGES, Math.ceil(totalItems / PER_PAGE));
    }

    _sliceForPage(list, pageIndex) {
        const start = pageIndex * PER_PAGE;
        return list.slice(start, start + PER_PAGE);
    }

    _createArtistCard(artist) {
        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
        const artistName = artistDisplayName(artist, locale);
        const artistImage = artist.image;
        const artistDiscipline = artistDisplayDiscipline(artist, locale);

        const card = document.createElement('div');
        card.classList.add('artist-card');

        card.addEventListener('click', (e) => {
            e.stopPropagation();
            const en = artistEnglishBlock(artist);
            const slug =
                artist.slug || artistSlugFromName(en?.name ?? artistDisplayName(artist, 'en'));
            navigate(`/profile/${encodeURIComponent(slug)}`);
        });

        card.innerHTML = `
            <div class="artist-card-image">
                <img src="${artistImage}" alt="${artistName}">
            </div>
            <div class="artist-card-content">
                <div class="artist-card-title">${artistName}</div>
                <div class="artist-card-discipline">${artistDiscipline}</div>
            </div>
        `;

        return card;
    }

    _setActiveDot(index) {
        const dots = this.shadowRoot?.querySelectorAll('.confirmed-pagination-dot');
        if (!dots?.length) return;
        this._activeIndex = Math.max(0, Math.min(index, dots.length - 1));
        dots.forEach((d, i) => {
            const on = i === this._activeIndex;
            d.classList.toggle('active', on);
            d.setAttribute('aria-current', on ? 'true' : 'false');
        });
    }

    _syncDotsFromScroll(scrollEl) {
        if (!scrollEl || !this._slideCount) return;
        const w = scrollEl.clientWidth;
        if (!w) return;
        let index = Math.round(scrollEl.scrollLeft / w);
        index = Math.max(0, Math.min(this._slideCount - 1, index));
        this._setActiveDot(index);
    }

    _goToSlide(index) {
        const scrollEl = this.shadowRoot?.querySelector('.confirmed-scroll');
        if (!scrollEl || index < 0 || index >= this._slideCount) return;
        const w = scrollEl.clientWidth;
        scrollEl.scrollTo({ left: index * w, behavior: 'smooth' });
        this._setActiveDot(index);
    }

    _bindPagination(scrollEl) {
        const onScroll = () => {
            if (this._scrollRaf) cancelAnimationFrame(this._scrollRaf);
            this._scrollRaf = requestAnimationFrame(() => {
                this._scrollRaf = null;
                this._syncDotsFromScroll(scrollEl);
            });
        };

        const onScrollEnd = () => {
            this._syncDotsFromScroll(scrollEl);
        };

        const onResize = () => {
            if (!this._slideCount) return;
            const w = scrollEl.clientWidth;
            if (!w) return;
            const i = Math.max(0, Math.min(this._slideCount - 1, this._activeIndex));
            scrollEl.scrollLeft = i * w;
        };

        scrollEl.addEventListener('scroll', onScroll, { passive: true });
        scrollEl.addEventListener('scrollend', onScrollEnd);
        window.addEventListener('resize', onResize);

        this._teardownPagination = () => {
            scrollEl.removeEventListener('scroll', onScroll);
            scrollEl.removeEventListener('scrollend', onScrollEnd);
            window.removeEventListener('resize', onResize);
            if (this._scrollRaf) {
                cancelAnimationFrame(this._scrollRaf);
                this._scrollRaf = null;
            }
        };
    }

    _populate() {
        const root = this.shadowRoot;
        if (!root || !this._data) return;

        if (typeof this._teardownPagination === 'function') {
            this._teardownPagination();
            this._teardownPagination = null;
        }

        const { headline, availableSlots, totalSlots, artists } = this._data;
        const list = Array.isArray(artists) ? artists.slice(0, MAX_ARTISTS) : [];
        const hasHeadline = Boolean(headline && String(headline).trim());
        const hasSlots =
            typeof availableSlots === 'number' &&
            Number.isFinite(availableSlots) &&
            typeof totalSlots === 'number' &&
            Number.isFinite(totalSlots);

        const hostHidden = !hasHeadline && list.length === 0;
        this.style.display = hostHidden ? 'none' : '';

        const headlineEl = root.querySelector('.confirmed-headline');
        const slotsEl = root.querySelector('.confirmed-slots');
        const scrollEl = root.querySelector('.confirmed-scroll');
        const pagWrap = root.querySelector('.confirmed-pagination-wrap');

        if (headlineEl) headlineEl.textContent = hasHeadline ? headline.trim() : '';

        if (slotsEl) {
            if (hasSlots) {
                slotsEl.hidden = false;
                slotsEl.innerHTML = `<strong>${availableSlots}</strong> of <strong>${totalSlots}</strong> Slots Remaining`;
            } else {
                slotsEl.hidden = true;
                slotsEl.textContent = '';
            }
        }

        const pageCount = this._numPages(list.length);
        this._slideCount = pageCount;
        this._activeIndex = 0;

        if (scrollEl) {
            scrollEl.innerHTML = '';
            scrollEl.scrollLeft = 0;

            for (let p = 0; p < pageCount; p++) {
                const slice = this._sliceForPage(list, p);
                const slide = document.createElement('div');
                slide.className = 'confirmed-slide';
                slide.setAttribute('data-slide-index', String(p));

                const grid = document.createElement('div');
                grid.className = 'confirmed-grid';

                slice.forEach((artist) => {
                    grid.appendChild(this._createArtistCard(artist));
                });

                slide.appendChild(grid);
                scrollEl.appendChild(slide);
            }
        }

        if (pagWrap) {
            const showDots = pageCount > 1;
            pagWrap.hidden = !showDots;
            pagWrap.innerHTML = '';
            if (showDots) {
                const dotContainer = document.createElement('div');
                dotContainer.className = 'confirmed-pagination-dot-container';
                for (let i = 0; i < pageCount; i++) {
                    const dot = document.createElement('button');
                    dot.type = 'button';
                    dot.className = 'confirmed-pagination-dot' + (i === 0 ? ' active' : '');
                    dot.setAttribute('aria-label', `Confirmed artists page ${i + 1} of ${pageCount}`);
                    dot.setAttribute('aria-current', i === 0 ? 'true' : 'false');
                    dot.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this._goToSlide(i);
                    });
                    dotContainer.appendChild(dot);
                }
                pagWrap.appendChild(dotContainer);
            }
        }

        if (scrollEl && pageCount > 1) {
            this._bindPagination(scrollEl);
        }

        this._setActiveDot(0);
    }

    disconnectedCallback() {
        if (typeof this._teardownPagination === 'function') {
            this._teardownPagination();
            this._teardownPagination = null;
        }
    }

    connectedCallback() {
        if (!this._navBound) {
            this._navBound = true;
            this.shadowRoot.addEventListener('click', (e) => {
                const a = e.target.closest?.('a[href^="/"]');
                if (!a) return;
                e.preventDefault();
                navigate(a.getAttribute('href'));
            });
        }
    }

    render() {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    padding: 3rem 0 4rem;
                    container-type: inline-size;
                    container-name: confirmed-artists;
                }

                .confirmed-wrap {
                    width: 100%;
                    margin-top: 3%;
                }

                .header-band {
                    position: relative;
                    padding: 2rem 1.5rem 1.75rem;
                    text-align: center;
                    overflow: hidden;
                }

                .header-band::after {
                    content: '';
                    position: absolute;
                    right: -36px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 112px;
                    height: 112px;
                    border-radius: 50%;
                    background: var(--c1);
                    opacity: 0.85;
                }

                .confirmed-headline {
                    position: relative;
                    z-index: 1;
                    margin: 0;
                    font-size: clamp(1rem, 1.3vw, 1.5rem);
                    font-variation-settings: var(--fv-body-wide);
                    letter-spacing: 0.02em;
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .confirmed-slots {
                    position: relative;
                    z-index: 1;
                    margin: 0.65rem 0 0;
                    font-size: clamp(0.95rem, 1.8vw, 1.15rem);
                    font-variation-settings: var(--fv-body);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                }

                .confirmed-slots strong {
                    font-variation-settings: var(--fv-label-strong);
                }

                .confirmed-scroll {
                    width: 100%;
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    align-items: stretch;
                    overflow-x: auto;
                    overflow-y: hidden;
                    scroll-snap-type: x mandatory;
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: thin;
                    scrollbar-color: var(--c2) transparent;
                }

                .confirmed-scroll::-webkit-scrollbar {
                    height: 4px;
                }

                .confirmed-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }

                .confirmed-scroll::-webkit-scrollbar-thumb {
                    background-color: var(--c2);
                    border-radius: 4px;
                }

                .confirmed-slide {
                    flex: 0 0 100%;
                    min-width: 100%;
                    width: 100%;
                    box-sizing: border-box;
                    scroll-snap-align: start;
                    scroll-snap-stop: always;
                }

                .confirmed-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    grid-auto-rows: auto;
                    gap: 0;
                    width: 100%;
                }

                .artist-card {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    cursor: pointer;
                    transition: opacity 0.25s ease;
                }

                .artist-card:hover {
                    opacity: 0.96;
                }

                .artist-card:hover .artist-card-image img {
                    transform: scale(1.06);
                }

                .artist-card-image {
                    width: 100%;
                    aspect-ratio: 3 / 4;
                    overflow: hidden;
                    background: var(--c2);
                }

                .artist-card-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    transform-origin: center top;
                    transition: transform 12s ease;
                }

                .artist-card-content {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 2rem 0.35rem 2rem;
                    background-color: var(--c3);
                    box-sizing: border-box;
                }

                .artist-card-title {
                    font-size: clamp(0.7rem, 1.1vw, 1rem);
                    font-variation-settings: var(--fv-card-title);
                    color: var(--c2);
                    letter-spacing: 0.06em;
                    line-height: 1.25;
                }

                .artist-card-discipline {
                    margin-top: 0.25rem;
                    font-size: clamp(0.65rem, 0.95vw, 0.9rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                    line-height: 1.2;
                }

                .confirmed-pagination-wrap {
                    width: 100%;
                    padding: 1.25rem 0 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .confirmed-pagination-dot-container {
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    justify-content: center;
                    align-items: center;
                }

                .confirmed-pagination-dot {
                    width: 15px;
                    height: 15px;
                    padding: 0;
                    border: none;
                    border-radius: 50%;
                    background-color: var(--c2);
                    opacity: 0.3;
                    transition: opacity 0.3s ease;
                    cursor: pointer;
                }

                .confirmed-pagination-dot:hover {
                    opacity: 0.55;
                }

                .confirmed-pagination-dot.active {
                    opacity: 0.85;
                }

                @media (max-width: 1024px) {
                    .confirmed-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }

                    :host {
                        padding: 2rem 0 3rem;
                    }
                }

                @media (max-width: 768px) {
                    .confirmed-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .header-band {
                        padding: 1.5rem 1rem 1.25rem;
                    }

                    .header-band::after {
                        width: 80px;
                        height: 80px;
                        right: -24px;
                    }

                    .artist-card-content {
                        padding: 1.25rem 0.35rem 1.5rem;
                    }
                }

                @media (max-width: 520px) {
                    .confirmed-grid {
                        grid-template-columns: 1fr;
                    }

                    .confirmed-pagination-dot {
                        width: 12px;
                        height: 12px;
                    }

                    .confirmed-pagination-dot-container {
                        gap: 8px;
                        flex-wrap: wrap;
                    }
                }

                @container confirmed-artists (max-width: 520px) {
                    .confirmed-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            <div class="confirmed-wrap">
                <div class="header-band">
                    <h2 class="confirmed-headline"></h2>
                    <p class="confirmed-slots" hidden></p>
                </div>
                <div class="confirmed-scroll"></div>
                <div class="confirmed-pagination-wrap" hidden></div>
            </div>
        `;
    }
}

customElements.define('app-confirmed-artists-feed', ConfirmedArtistsFeedComponent);

export { ConfirmedArtistsFeedComponent };
