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

function wireProfileGalleryAccess() {
    const modal = document.getElementById('profileGalleryAccessModal');
    if (modal?.dataset.galleryAccessWired === '1') return;
    if (modal) modal.dataset.galleryAccessWired = '1';
    const scrim = modal?.querySelector('.profile-gallery-access-modal__scrim');
    const closeBtn = modal?.querySelector('.profile-gallery-access-modal__close');
    const openModal = () => {
        if (!modal) return;
        document.body.appendChild(modal);
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
    };
    const closeModal = () => {
        if (!modal) return;
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
    };
    scrim?.addEventListener('click', closeModal);
    closeBtn?.addEventListener('click', closeModal);
    const onKey = (e) => {
        if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
    };
    window.addEventListener('keydown', onKey);

    document.querySelectorAll('.profile-page .galleryAccessButton').forEach((btn) => {
        btn.setAttribute('role', 'button');
        if (!btn.hasAttribute('tabindex')) btn.setAttribute('tabindex', '0');
        btn.addEventListener('click', async () => {
            try {
                const { getAuthSnapshot } = await import('../utils/icAuth.js');
                const snap = await getAuthSnapshot();
                if (snap.authenticated) {
                    openModal();
                } else {
                    document.getElementById('joinNetworkProfile')?.openModal?.();
                }
            } catch {
                document.getElementById('joinNetworkProfile')?.openModal?.();
            }
        });
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                btn.click();
            }
        });
    });
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

/**
 * First name for profile placeholder copy (Perspective, What they see, etc.).
 * @param {Record<string, unknown> | null | undefined} loc
 * @param {string} displayName
 */
function profileFirstNameForPlaceholders(loc, displayName) {
    const fn = String(loc?.firstName ?? '').trim();
    if (fn) return fn;
    const name = String(displayName ?? '').trim();
    if (name) {
        const first = name.split(/\s+/)[0];
        if (first) return first;
    }
    return 'This artist';
}

/**
 * @param {string} firstName
 */
function artistProfileWorldPlaceholders(firstName) {
    const x = firstName;
    return {
        perspective: `What has shaped ${x}'s way of seeing, and what continues to move him to create?`,
        vision: [
            `What quietly draws ${x} in?`,
            'What stays with them over time?',
            `What begins to reveal itself to ${x}?`,
            `What shifts the way ${x} sees the world?`,
        ],
        constructing: `How does ${x} bring his ideas into form, and what unfolds through his process of making?`,
        context: `Who is ${x}, and where did their work begin?`,
        quote: `What words might ${x} offer that reflect how they see, feel, and moves through their work? We'll see.`,
    };
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
                <div
                    id="profileGalleryAccessModal"
                    class="profile-gallery-access-modal"
                    hidden
                    aria-hidden="true"
                >
                    <div class="profile-gallery-access-modal__scrim" aria-hidden="true"></div>
                    <div
                        class="profile-gallery-access-modal__panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profileGalleryAccessModalTitle"
                    >
                        <h2 id="profileGalleryAccessModalTitle" class="profile-gallery-access-modal__title">
                            Coming Soon
                        </h2>
                        <p class="profile-gallery-access-modal__body">
                            This is not for every gallery. It is for those willing to step outside familiar
                            systems, to engage with artists, context, and process in new ways.
                        </p>
                        <button type="button" class="profile-gallery-access-modal__close">Close</button>
                    </div>
                </div>
            </main>
        </div>
    `;
}

export default function initProfile() {
    document.querySelectorAll('#profileGalleryAccessModal').forEach((m) => {
        const pm = document.getElementById('profileMain');
        if (pm && !pm.contains(m)) m.remove();
    });

    const slug = profileSlugFromPathname();
    wireProfileGalleryAccess();

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

        const displayName = (() => {
            const n = String(loc.name ?? '').trim();
            if (n) return n;
            const fn = String(loc.firstName ?? '').trim();
            const ln = String(loc.lastName ?? '').trim();
            return [fn, ln].filter(Boolean).join(' ');
        })();

        const firstName = profileFirstNameForPlaceholders(loc, displayName);
        const worldPh = artistProfileWorldPlaceholders(firstName);

        const img = document.getElementById('artistProfileImage');
        const nameEl = document.getElementById('artistProfileName');
        const practiceEl = document.getElementById('artistProfilePractice');
        const perspectiveEl = document.getElementById('artistProfilePerspective');
        const perspectiveHeadingEl = document.getElementById('artistProfilePerspectiveHeading');
        if (img) {
            img.src = artist.image || '';
            img.alt = displayName || '';
        }
        if (nameEl) nameEl.textContent = displayName || '';
        if (practiceEl) practiceEl.textContent = loc.world?.practice || '';
        if (perspectiveEl) {
            perspectiveEl.replaceChildren();
            const perspectiveParts = worldTextParts(loc.world?.perspective);
            const texts = perspectiveParts.length ? perspectiveParts : [worldPh.perspective];
            for (const text of texts) {
                const p = document.createElement('p');
                p.textContent = text;
                perspectiveEl.appendChild(p);
            }
        }
        if (perspectiveHeadingEl) perspectiveHeadingEl.textContent = 'Perspective';
        if (contextHeadingEl) contextHeadingEl.textContent = locale === 'ja' ? '文脈' : 'Context';
        if (contextContentEl) {
            contextContentEl.replaceChildren();
            const contextParts = worldTextParts(loc.world?.context);
            const ctxTexts = contextParts.length ? contextParts : [worldPh.context];
            for (const text of ctxTexts) {
                const p = document.createElement('p');
                p.textContent = text;
                contextContentEl.appendChild(p);
            }
        }
        document.title = `${displayName || 'Artist'} · Fusion`;

        const sightWordsContainerEl = document.getElementById('sight-words-container');
        if (sightWordsContainerEl) {
            sightWordsContainerEl.replaceChildren();
            const visionParts = worldTextParts(loc.world?.vision);
            const visionLines = visionParts.length ? visionParts : worldPh.vision;
            const narrowSight =
                typeof window !== 'undefined' &&
                typeof window.matchMedia === 'function' &&
                window.matchMedia('(max-width: 768px)').matches;
            for (const text of visionLines) {
                if (!text) continue;
                const p = document.createElement('p');
                p.className = 'profile-sight-word-line';
                p.textContent = text;
                const alignRight = Math.random() < 0.5;
                const padPct = (narrowSight ? 2 : 5) + Math.random() * (narrowSight ? 12 : 28);
                const fontRem = (narrowSight ? 1.05 : 1.2) + Math.random() * (narrowSight ? 1.35 : 2.5);
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
            const constructingParts = worldTextParts(loc.world?.constructing);
            const conTexts = constructingParts.length ? constructingParts : [worldPh.constructing];
            for (const text of conTexts) {
                const p = document.createElement('p');
                p.textContent = text;
                constructingWordsContainerEl.appendChild(p);
            }
        }

        const quoteContainerEl = document.getElementById('profileQuoteContainer');
        if (quoteContainerEl) {
            quoteContainerEl.replaceChildren();
            const quoteRaw = loc.world?.quote;
            const quote = String(quoteRaw ?? '').trim();
            const p = document.createElement('p');
            p.id = 'profileQuote';
            p.className = 'artist-profile-quote';
            p.textContent = quote ? `"${quote}"` : worldPh.quote;
            quoteContainerEl.appendChild(p);
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
