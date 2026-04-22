// Placeholder — structure, content, and styles TBD
import { navigate } from '../../router.js';
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
import { getCurrentProgramSeason } from '../../utils/database.js';
import { withSeoImageAlt } from '../../utils/mediaAltSeo.js';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class FeaturedArtistComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.data = null;
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }
    

    getFeaturedArtist() {
        return this.data;
    }

    setFeaturedArtist(data) {
        this.data = data;
        this.render();
    }

    static get observedAttributes() {
        return ['active'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active') {
            if (oldVal === newVal) return;
            this.render();
            /* render() replaces shadow DOM — repaint cards without waiting for parent setFeaturedArtist */
            const n = this.data?.artists?.length ?? 0;
            if (n > 0) {
                void this.createArtistCard(n);
            }
        }
    }

    async createArtistCard(length) {
        const content = this.shadowRoot?.querySelector('.content');
        if (content) content.innerHTML = '';

        let currentSeason = '';
        try {
            currentSeason = (await getCurrentProgramSeason()).trim();
        } catch {
            currentSeason = '';
        }
        const useSeasonCompare = currentSeason !== '';

        for (let i = 0; i < length; i++) {
            const artist = this.data.artists[i];
            const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
            const artistName = artistDisplayName(artist, locale);
            const artistDiscipline = artistDisplayDiscipline(artist, locale);

            let card = document.createElement('div');
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
            const faImg = card.querySelector('.artist-card-image img');
            applyArtistCardImage(faImg, artist.image);

            const residencyBadge = card.querySelector('.residency-badge');
            if (residencyBadge instanceof HTMLElement) {
                residencyBadge.classList.remove('residency-badge--past-season');
                const y = artistResidencyCardYear(artist);
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

            this.shadowRoot.querySelector('.content').appendChild(card);
        }
    }

    hideAllArtistsButton() {
        this.shadowRoot.querySelector('.button-cta').style.display = 'none';
    }

    showAllArtistsButton() {
        this.shadowRoot.querySelector('.button-cta').style.display = 'flex';
    }

    connectedCallback() {
        this.render();
        // Event delegation: render() replaces shadow HTML, so per-node listeners would be lost
        // after setFeaturedArtist() / attribute changes. One listener on the root survives.
        if (!this._allArtistsNavBound) {
            this._allArtistsNavBound = true;
            this.shadowRoot.addEventListener('click', (e) => {
                const t = e.target;
                if (t && t.id === 'allArtistsButton') {
                    navigate('/artists');
                }
            });
        }
    }

    render() {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    min-width: 0;
                }

                .featured-artist {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    box-sizing: border-box;
                    padding-bottom: 120px;
                    padding-top: 20px;
                    flex-shrink: 0;
                    min-height: min-content;
                    overflow: visible;
                }

                .header {
                    flex: 0 0 auto;
                    width: 100%;
                    font-size: 1.4rem;
                    font-variation-settings: var(--fv-display);
                    padding-left: 2%;
                    user-select: none;
                }

                /* flex: 1 + min-height: 0 let this shrink to 0 on narrow column layouts — cards vanished on mobile */
                .content {
                    flex: 0 0 auto;
                    width: 100%;
                    min-height: min-content;
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    grid-template-rows: auto;
                    grid-auto-rows: auto;
                }

                .artist-card {
                    width: 100%;
                    min-width: 0;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: auto auto;
                    cursor: pointer;
                    transition: all 0.5s ease;
                }

                .artist-card:hover > .artist-card-image > img:not(.artist-card-img--placeholder) {
                    animation: scaleImage 15s ease forwards;
                }

                @keyframes scaleImage {
                    from {
                        transform: scale(1);
                    }
                    to {
                        transform: scale(1.2);
                    }
                }

                .artist-card-image {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 4 / 5;
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
                
                .artist-card-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform-origin: center top;
                }

                .artist-card-image img.artist-card-img--placeholder {
                    object-fit: contain;
                    object-position: center;
                    background: var(--c3);
                }
                
                .artist-card-content {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: var(--c3);
                }
                
                .artist-card-title {
                    font-size: clamp(1.3rem, 1.8vw, 2rem);
                    font-variation-settings: var(--fv-headline-wide);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                    line-height: 1.2;
                }
                
                .artist-card-discipline {
                    font-size: clamp(1rem, 1vw, 1.4rem);
                    font-variation-settings: var(--fv-body-wide);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                    line-height: 1.2;
                }

                .button-cta {
                    flex: 0 0 auto;
                    width: 23%;
                    min-height: 3rem;
                    display: flex;
                    align-items: end;
                    justify-content: end;
                    margin-top: 4%;
                    margin-left: 75%;
                    margin-right: 2%;
                    border-bottom: 1px solid var(--c2);
                    transition: all 0.3s ease;
                }
                
                #allArtistsButton {
                    max-width: 300px;
                    min-width: 200px;
                    height: 50%;
                    margin-left: 40%;
                    display: flex;
                    justify-self: end;
                    align-items: center;
                    justify-content: end;
                    padding-right: 5%;
                    background-color: var(--c3);
                    font-size: clamp(1rem, 1.2vw, 1.4rem);
                    font-variation-settings: var(--fv-headline);
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                #allArtistsButton:hover {
                    background-color: var(--c5);
                }

                .button-cta:has(#allArtistsButton:hover) {
                    width: 30%;
                    margin-left: 68%;
                }

                @media (max-width: 1024px) {
                    .content {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .button-cta {
                        width: 100%;
                        height: auto;
                        margin-left: 0;
                        margin-right: 0;
                        justify-content: center;
                        align-items: center;
                    }

                    #allArtistsButton {
                        margin-left: 0;
                        width: min(100%, 320px);
                        max-width: 100%;
                    }
                }

                @media (max-width: 768px) {
                    .featured-artist {
                        padding-bottom: 15%;
                        padding-top: 1rem;
                    }

                    .header {
                        height: auto;
                    }

                    .content {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .artist-card {
                        min-height: min-content;
                    }

                    .artist-card-content {
                        height: auto;
                        min-height: 0;
                        padding: 0.65rem 0.45rem 0.75rem;
                        box-sizing: border-box;
                        gap: 0.2rem;
                    }

                    .button-cta {
                        height: 100px;
                        margin-top: 5vh;
                        justify-content: end;
                    }

                    #allArtistsButton {
                        width: 50%;
                        min-width: 0;
                        max-width: none;
                    }

                    .button-cta:has(#allArtistsButton:hover) {
                        width: 100%;
                        margin-left: 0;
                    }
                }
            </style>
            <div class="featured-artist">
                <div class="header">Featured Artist</div>
                <div class="content"></div>
                <div class="button-cta">
                    <div id="allArtistsButton">All Artists</div>
                </div>
            </div>
        `;
    }
}

customElements.define('app-featured-artist', FeaturedArtistComponent);

export { FeaturedArtistComponent };
