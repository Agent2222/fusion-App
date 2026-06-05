import { renderHeader } from './shared/header.js';
import { renderFooter } from './shared/footer.js';

import { buildFeedPool } from './subComponents/artistsFeed.js';
import { applyArtistFilters } from '../utils/feedFilterApply.js';
import { getArtists, getFeaturedArtists } from '../utils/database.js';

/** @type {((e: CustomEvent) => void) | null} */
let _artistsFeedFilterHandler = null;

/**
 * IDs + slugs for artists in the Featured strip — omit them from "All Artists" pagination.
 * (Id-only matching missed rows when ids were empty or differed from manual featured picks.)
 * @param {object[] | null | undefined} featured
 * @returns {{ ids: Set<string>, slugs: Set<string> }}
 */
function featuredArtistExclusionKeys(featured) {
    const ids = new Set();
    const slugs = new Set();
    for (const a of featured || []) {
        if (!a || typeof a !== 'object') continue;
        const id = a.id != null && String(a.id).trim() !== '' ? String(a.id) : '';
        if (id) ids.add(id);
        const slug =
            a.slug != null && String(a.slug).trim() !== ''
                ? String(a.slug).trim().toLowerCase()
                : '';
        if (slug) slugs.add(slug);
    }
    return { ids, slugs };
}

/**
 * @param {object[]} artists
 * @param {{ ids: Set<string>, slugs: Set<string> }} keys
 */
function excludeFeaturedFromPool(artists, keys) {
    if (!Array.isArray(artists)) return [];
    const { ids, slugs } = keys;
    if (!ids.size && !slugs.size) return artists;
    return artists.filter((a) => {
        if (!a || typeof a !== 'object') return true;
        const id = a.id != null && String(a.id).trim() !== '' ? String(a.id) : '';
        if (id && ids.has(id)) return false;
        const slug =
            a.slug != null && String(a.slug).trim() !== ''
                ? String(a.slug).trim().toLowerCase()
                : '';
        if (slug && slugs.has(slug)) return false;
        return true;
    });
}

const FEATURED_SEARCH_SCROLL_TOP_OFFSET_PX = 200;

/** @returns {HTMLElement | null} */
function getArtistsPageScrollRoot() {
    const featured = document.getElementById('featuredArtist2');
    if (!(featured instanceof HTMLElement)) return null;

    /** @type {(HTMLElement | null)[]} */
    const candidates = [
        document.getElementById('mainContent'),
        document.getElementById('artistsMainContent'),
    ];

    for (const el of candidates) {
        if (!(el instanceof HTMLElement) || !el.contains(featured)) continue;
        const { overflowY } = getComputedStyle(el);
        if (overflowY === 'auto' || overflowY === 'scroll' || el.scrollHeight > el.clientHeight + 1) {
            return el;
        }
    }

    const main = document.getElementById('mainContent');
    return main instanceof HTMLElement ? main : null;
}

/** Scroll featured strip into view (~200px from top) after name search. */
function scrollToFeaturedArtistSection() {
    const el = document.getElementById('featuredArtist2');
    if (!(el instanceof HTMLElement)) return;

    const offset = FEATURED_SEARCH_SCROLL_TOP_OFFSET_PX;
    const scrollRoot = getArtistsPageScrollRoot();

    if (scrollRoot instanceof HTMLElement) {
        const rootRect = scrollRoot.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const nextTop = scrollRoot.scrollTop + (elRect.top - rootRect.top) - offset;
        scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
        return;
    }

    const nextTop = window.pageYOffset + el.getBoundingClientRect().top - offset;
    window.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
}

export function render() {
    return `
        <div class="page artists-page">
            <app-feed-filter state="artists"></app-feed-filter>
            <main id="artistsMain" class="main-cont">
                <div id="artistsMainContent" class="feed-container">
                    <app-shout-headline data-content-slug="artists-page"></app-shout-headline>
                    <div class="artist-card-toggle-row"><app-artist-card-image-toggle id="artistsArtistCardImageToggle" aria-label="Artist card image mode"></app-artist-card-image-toggle></div>
                    <app-featured-artist id="featuredArtist2" active="true"></app-featured-artist>
                    <app-artists-feed id="artistsFeed"></app-artists-feed>
                    <app-join-network id="joinNetwork" data-modal-type="access" context="artists" active="true" data-margin-top="100px" data-margin-bottom="96px"></app-join-network>
                </div>
            </main>
        </div>
    `;
}

export default function initArtists() {
    if (_artistsFeedFilterHandler) {
        window.removeEventListener('fusion-feed-filter', _artistsFeedFilterHandler);
        _artistsFeedFilterHandler = null;
    }
    void (async () => {
        const all = await getArtists();
        const feat = await getFeaturedArtists();
        const featuredKeys = featuredArtistExclusionKeys(feat);
        const featuredArtist = document.getElementById('featuredArtist2');
        const defaultCriteria = {
            connectionId: 'allConnection',
            disciplineKeys: [],
            locationKey: 'all',
            nameQuery: '',
        };
        let skipSearchScroll = true;

        const applyArtistsPageFilters = async (criteria) => {
            const nameSearching = Boolean(String(criteria.nameQuery || '').trim());
            const filteredFeatured = buildFeedPool(applyArtistFilters(feat || [], criteria));

            if (featuredArtist && typeof featuredArtist.setFeaturedArtist === 'function') {
                featuredArtist.setFeaturedArtist({ artists: filteredFeatured });
                if (typeof featuredArtist.createArtistCard === 'function') {
                    await featuredArtist.createArtistCard(filteredFeatured.length);
                }
                featuredArtist.hideAllArtistsButton();
            }

            const artistsFeed = document.getElementById('artistsFeed');
            if (artistsFeed && typeof artistsFeed.setArtists === 'function') {
                const pool = nameSearching
                    ? all || []
                    : excludeFeaturedFromPool(all || [], featuredKeys);
                artistsFeed.setArtists(buildFeedPool(applyArtistFilters(pool, criteria)));
            }

            if (nameSearching && !skipSearchScroll) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        scrollToFeaturedArtistSection();
                    });
                });
            }
            skipSearchScroll = false;
        };

        const artistsFeed = document.getElementById('artistsFeed');
        if (artistsFeed && typeof artistsFeed.setArtists === 'function') {
            _artistsFeedFilterHandler = (e) => {
                const ev = /** @type {CustomEvent} */ (e);
                if (ev.detail?.state !== 'artists') return;
                void applyArtistsPageFilters(ev.detail.criteria || defaultCriteria);
            };
            window.addEventListener('fusion-feed-filter', _artistsFeedFilterHandler);

            queueMicrotask(() => {
                const ff = document.querySelector('app-feed-filter[state="artists"]');
                if (ff && typeof ff.hydrateFilterData === 'function') {
                    ff.hydrateFilterData({ state: 'artists', artists: all || [] });
                } else {
                    void applyArtistsPageFilters(defaultCriteria);
                }
            });
        } else {
            void applyArtistsPageFilters(defaultCriteria);
        }
    })();
}

export function generateArtistsContent() {
    return render();
}
