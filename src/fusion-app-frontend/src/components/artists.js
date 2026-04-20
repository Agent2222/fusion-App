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

export function render() {
    return `
        <div class="page artists-page">
            <app-feed-filter state="artists"></app-feed-filter>
            <main id="artistsMain" class="main-cont">
                <div id="artistsMainContent" class="feed-container">
                    <app-shout-headline data-content-slug="artists-page"></app-shout-headline>
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
        if (featuredArtist && typeof featuredArtist.setFeaturedArtist === 'function') {
            featuredArtist.setFeaturedArtist({ artists: feat || [] });
            if (typeof featuredArtist.createArtistCard === 'function') {
                await featuredArtist.createArtistCard(feat.length);
            }
            featuredArtist.hideAllArtistsButton();
        }

        const artistsFeed = document.getElementById('artistsFeed');
        if (artistsFeed && typeof artistsFeed.setArtists === 'function') {
            _artistsFeedFilterHandler = (e) => {
                const ev = /** @type {CustomEvent} */ (e);
                if (ev.detail?.state !== 'artists') return;
                const raw = excludeFeaturedFromPool(all || [], featuredKeys);
                const filtered = applyArtistFilters(raw, ev.detail.criteria || {});
                artistsFeed.setArtists(buildFeedPool(filtered));
            };
            window.addEventListener('fusion-feed-filter', _artistsFeedFilterHandler);

            const defaultCriteria = {
                connectionId: 'allConnection',
                disciplineKeys: [],
                locationKey: 'all',
            };
            const initialPool = applyArtistFilters(
                excludeFeaturedFromPool(all || [], featuredKeys),
                defaultCriteria
            );
            artistsFeed.setArtists(buildFeedPool(initialPool));

            queueMicrotask(() => {
                const ff = document.querySelector('app-feed-filter[state="artists"]');
                if (ff && typeof ff._pushFeedFilter === 'function') {
                    ff._pushFeedFilter();
                }
            });
        }
    })();
}

export function generateArtistsContent() {
    return render();
}
