import { artistLocaleBlock } from '../utils/artistSlug.js';
import { getArtistBySlug } from '../utils/database.js';
import { worldTextParts } from '../utils/worldNormalize.js';

/**
 * @param {HTMLElement | null} container
 * @param {unknown} items
 */
/**
 * @param {HTMLElement | null} container
 * @param {unknown} links
 */
function populateArtistLinks(container, links) {
    if (!container) return;
    container.replaceChildren();
    if (!Array.isArray(links) || links.length === 0) {
        container.setAttribute('hidden', '');
        return;
    }
    let count = 0;
    for (const item of links) {
        if (!item || typeof item !== 'object' || !item.url) continue;
        const a = document.createElement('a');
        a.href = String(item.url);
        a.className = 'profile-artist-link';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = item.label != null && item.label !== '' ? String(item.label) : String(item.type || item.url);
        container.appendChild(a);
        count += 1;
    }
    if (count === 0) container.setAttribute('hidden', '');
    else container.removeAttribute('hidden');
}

function populateIntroGallery(container, items) {
    if (!container) return;
    container.replaceChildren();
    if (!Array.isArray(items) || items.length === 0) return;
    for (const item of items) {
        const src =
            typeof item === 'string'
                ? item
                : item && typeof item === 'object' && item.src != null
                  ? String(item.src)
                  : '';
        if (!src) continue;
        const alt =
            item && typeof item === 'object' && item.alt != null ? String(item.alt) : '';
        const caption =
            item && typeof item === 'object' && item.caption != null && item.caption !== ''
                ? String(item.caption)
                : '';
        const figure = document.createElement('figure');
        figure.className = 'profile-intro-gallery-item';
        const wrap = document.createElement('div');
        wrap.className = 'profile-intro-gallery-img-wrap';
        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.loading = 'lazy';
        wrap.appendChild(img);
        figure.appendChild(wrap);
        container.appendChild(figure);
    }
}

function profileSlugFromPathname() {
    const path = window.location.pathname;
    if (!path.startsWith('/profile/')) return null;
    const seg = path.slice('/profile/'.length).split('/')[0];
    if (!seg) return null;
    try {
        return decodeURIComponent(seg);
    } catch {
        return seg;
    }
}

function statusLabel(status) {
    switch (status) {
        case 'studio':
            return 'In studio';
        case 'prep':
            return 'Preparing for exhibition';
        case 'showing':
            return 'Show in progress';
        case 'available':
            return 'Available for commissions';
        default:
            return status || '';
    }
}

export function generateProfileContent() {
    return `
        <div class="page profile-page">
            <main id="profileMain" class="main-cont">
                <div id="profileMainContent" class="feed-container">
                    <div class="page-content profile-content">
                        <article class="artist-profile" id="artistProfile" hidden>
                            <div class="artist-profile-hero">
                                <img id="artistProfileImage" src="" alt=""/>
                            </div>
                            <div class="artist-profile-body">
                                <div id="leftColumn">
                                    <h1 id="artistProfileName" class="artist-profile-name"></h1>
                                    <p id="artistProfilePractice" class="artist-profile-practice"></p>
                                    <p id="artistProfilePerspectiveHeading" class="artist-profile-heading"></p>
                                    <div id="artistProfilePerspective" class="artist-profile-perspective"></div>
                                </div>
                                <div id="rightColumn">
                                    <div class="galleryAccessButton">Gallery Access</div>
                                </div>
                            </div>
                        </article>
                        <div id="profile-sight-words">
                            <p id="profileSightWordsHeading" class="artist-profile-heading">What they see</p>
                            <div id="sight-words-container"></div>
                        </div>
                        <div id="profile-constructing-words">
                            <p id="profileConstructingWordsHeading" class="artist-profile-heading">How they construct</p>
                            <div id="constructing-words-container" class="artist-profile-constructing"></div>
                        </div>
                        <div id="artistProfileNotFound" class="profile-not-found" hidden>
                            <p>We could not find that artist profile.</p>
                            <p><a href="/artists">Browse artists</a></p>
                        </div>
                        <div id="profileImagesContainer" class="profile-images-container"></div>
                        <div id="profileGalleryAccessButtonContainer" class="profile-gallery-access-button-container">
                            <div class="galleryAccessButton">Gallery Access</div>
                        </div>
                        <div id="profileContextContainer" class="profile-context-container">
                            <div id="profileContextHeading" class="artist-profile-heading">Context</div>
                            <div id="profileContextContent" class="artist-profile-context"></div>
                        </div>
                        <div id="profileQuoteContainer" class="profile-quote-container">
                            <p id="profileQuote" class="artist-profile-quote"></p>
                        </div>
                        <nav id="profileArtistLinks" class="profile-artist-links" aria-label="Artist links" hidden></nav>
                        <app-veteran-banner id="profileVeteranBanner" class="profile-veteran-banner" hidden></app-veteran-banner>
                        <div id="artistProfileIndex" class="profile-index-hint" hidden></div>
                        <app-join-network id="joinNetworkProfile" data-modal-type="access" context="profile" active="true" data-margin-top="100px" data-margin-bottom="96px"></app-join-network>
                    </div> 
                </div>
            </main>
        </div>
    `;
}

export default function initProfile() {
    const slug = profileSlugFromPathname();

    const article = document.getElementById('artistProfile');
    const notFound = document.getElementById('artistProfileNotFound');
    const indexHint = document.getElementById('artistProfileIndex');
    const imagesContainer = document.getElementById('profileImagesContainer');

    const show = (el, on) => {
        if (!el) return;
        if (on) el.removeAttribute('hidden');
        else el.setAttribute('hidden', '');
    };

    const contextContentEl = document.getElementById('profileContextContent');
    const contextHeadingEl = document.getElementById('profileContextHeading');
    const artistLinksEl = document.getElementById('profileArtistLinks');
    const veteranBannerEl = document.getElementById('profileVeteranBanner');

    if (!slug) {
        if (contextContentEl) contextContentEl.replaceChildren();
        populateArtistLinks(artistLinksEl, null);
        if (veteranBannerEl) {
            veteranBannerEl.setAttribute('hidden', '');
            veteranBannerEl.removeAttribute('data-program-id');
        }
        populateIntroGallery(imagesContainer, null);
        show(article, false);
        show(notFound, false);
        show(indexHint, true);
        document.title = 'Artists · Fusion';
        return;
    }

    const applyArtist = (artist) => {
        if (!artist) {
            if (contextContentEl) contextContentEl.replaceChildren();
            populateArtistLinks(artistLinksEl, null);
            if (veteranBannerEl) {
                veteranBannerEl.setAttribute('hidden', '');
                veteranBannerEl.removeAttribute('data-program-id');
            }
            populateIntroGallery(imagesContainer, null);
            show(article, false);
            show(notFound, true);
            show(indexHint, false);
            document.title = 'Artist not found · Fusion';
            return;
        }

        show(article, true);
        show(notFound, false);
        show(indexHint, false);

        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
        let loc = artistLocaleBlock(artist, locale);
        if (!loc && artist && typeof artist === 'object') {
            const fallbackName = String(artist.slug || '')
                .split('-')
                .filter(Boolean)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            loc = {
                name: fallbackName,
                world: {},
            };
        }
        if (!loc) {
            if (contextContentEl) contextContentEl.replaceChildren();
            populateArtistLinks(artistLinksEl, null);
            show(article, false);
            show(notFound, true);
            document.title = 'Artist not found · Fusion';
            return;
        }

        const img = document.getElementById('artistProfileImage');
        const nameEl = document.getElementById('artistProfileName');
        const practiceEl = document.getElementById('artistProfilePractice');
        const perspectiveEl = document.getElementById('artistProfilePerspective');
        const perspectiveHeadingEl = document.getElementById('artistProfilePerspectiveHeading');
        if (img) {
            img.src = artist.image || '';
            img.alt = loc.name || '';
        }
        if (nameEl) nameEl.textContent = loc.name || '';
        if (practiceEl) practiceEl.textContent = loc.world?.practice || '';
        if (perspectiveEl) {
            perspectiveEl.replaceChildren();
            for (const text of worldTextParts(loc.world?.perspective)) {
                const p = document.createElement('p');
                p.textContent = text;
                perspectiveEl.appendChild(p);
            }
        }
        if (perspectiveHeadingEl) perspectiveHeadingEl.textContent = 'Perspective';
        if (contextHeadingEl) contextHeadingEl.textContent = locale === 'ja' ? '文脈' : 'Context';
        if (contextContentEl) {
            contextContentEl.replaceChildren();
            for (const text of worldTextParts(loc.world?.context)) {
                const p = document.createElement('p');
                p.textContent = text;
                contextContentEl.appendChild(p);
            }
        }
        document.title = `${loc.name || 'Artist'} · Fusion`;

        const sightWordsContainerEl = document.getElementById('sight-words-container');
        if (sightWordsContainerEl) {
            sightWordsContainerEl.replaceChildren();
            for (const text of worldTextParts(loc.world?.vision)) {
                if (!text) continue;
                const p = document.createElement('p');
                p.className = 'profile-sight-word-line';
                p.textContent = text;
                const alignRight = Math.random() < 0.5;
                const padPct = 5 + Math.random() * 28;
                const fontRem = 1.2 + Math.random() * 2.5;
                p.style.fontSize = `${fontRem}rem`;
                if (alignRight) {
                    p.style.textAlign = 'right';
                    p.style.paddingRight = `${padPct}%`;
                    p.style.paddingLeft = '0';
                } else {
                    p.style.textAlign = 'left';
                    p.style.paddingLeft = `${padPct}%`;
                    p.style.paddingRight = '0';
                }
                sightWordsContainerEl.appendChild(p);
            }
        }

        const constructingWordsContainerEl = document.getElementById('constructing-words-container');
        if (constructingWordsContainerEl) {
            constructingWordsContainerEl.replaceChildren();
            for (const text of worldTextParts(loc.world?.constructing)) {
                const p = document.createElement('p');
                p.textContent = text;
                constructingWordsContainerEl.appendChild(p);
            }
        }

        const quoteContainerEl = document.getElementById('profileQuoteContainer');
        if (quoteContainerEl) {
            quoteContainerEl.replaceChildren();
            const quote = loc.world?.quote;
            if (quote) {
                const p = document.createElement('p');
                p.textContent = `"${quote}"`;
                quoteContainerEl.appendChild(p);
            }
        }

        populateArtistLinks(artistLinksEl, loc.links);
        populateIntroGallery(imagesContainer, loc.world?.introGallery);

        const programIds = Array.isArray(loc.programs) ? loc.programs : [];
        const mostRecentProgramId = programIds.length ? programIds[programIds.length - 1] : '';
        console.log("mostRecentProgramId", mostRecentProgramId);
        if (veteranBannerEl) {
            if (mostRecentProgramId) {
                veteranBannerEl.setAttribute('data-program-id', mostRecentProgramId);
                veteranBannerEl.removeAttribute('hidden');
            } else {
                veteranBannerEl.setAttribute('hidden', '');
                veteranBannerEl.removeAttribute('data-program-id');
            }
        }
    };

    const run = async () => {
        const artist = await getArtistBySlug(slug);
        applyArtist(artist);
    };

    void run();
    window.addEventListener('fusion-data-source-change', () => void run());
}
