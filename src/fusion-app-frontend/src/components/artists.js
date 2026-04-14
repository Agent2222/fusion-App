import { renderHeader } from './shared/header.js';
import { renderFooter } from './shared/footer.js';

import { buildFeedPool } from './subComponents/artistsFeed.js';
import { applyArtistFilters } from '../utils/feedFilterApply.js';
import { getArtists, getFeaturedArtists } from '../utils/database.js';

/** @type {((e: CustomEvent) => void) | null} */
let _artistsFeedFilterHandler = null;

/**
 * IDs of artists currently shown in the Featured strip — omit them from "All Artists" pagination.
 * @param {object[] | null | undefined} featured
 * @returns {Set<string>}
 */
function featuredArtistIdSet(featured) {
    const s = new Set();
    for (const a of featured || []) {
        if (a && typeof a === 'object' && a.id != null) s.add(String(a.id));
    }
    return s;
}

/**
 * @param {object[]} artists
 * @param {Set<string>} featuredIds
 */
function excludeFeaturedFromPool(artists, featuredIds) {
    if (!featuredIds.size || !Array.isArray(artists)) return artists || [];
    return artists.filter((a) => {
        if (!a || typeof a !== 'object') return true;
        if (a.id == null) return true;
        return !featuredIds.has(String(a.id));
    });
}

export function render() {
    return `
        <div class="page artists-page">
            <app-feed-filter state="artists"></app-feed-filter>
            <main id="artistsMain" class="main-cont">
                <div id="artistsMainContent" class="feed-container">
                    <app-featured-artist id="featuredArtist2" active="true"></app-featured-artist>
                    <app-artists-feed id="artistsFeed"></app-artists-feed>
                    <app-join-network id="joinNetwork" data-modal-type="access" context="artists" active="true" data-margin-top="100px" data-margin-bottom="96px"></app-join-network>
                </div>
            </main>
        </div>
    `;
}

export default function initArtists() {
    void (async () => {
        const all = await getArtists();
        const feat = await getFeaturedArtists();
        const featuredIds = featuredArtistIdSet(feat);
        const featuredArtist = document.getElementById('featuredArtist2');
        if (featuredArtist && typeof featuredArtist.setFeaturedArtist === 'function') {
            featuredArtist.setFeaturedArtist({ artists: feat || [] });
            featuredArtist.createArtistCard(feat.length);
            featuredArtist.hideAllArtistsButton();
        }

        const artistsFeed = document.getElementById('artistsFeed');
        if (artistsFeed && typeof artistsFeed.setArtists === 'function') {
            if (_artistsFeedFilterHandler) {
                window.removeEventListener('fusion-feed-filter', _artistsFeedFilterHandler);
            }
            _artistsFeedFilterHandler = (e) => {
                const ev = /** @type {CustomEvent} */ (e);
                if (ev.detail?.state !== 'artists') return;
                const raw = excludeFeaturedFromPool(all || [], featuredIds);
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
                excludeFeaturedFromPool(all || [], featuredIds),
                defaultCriteria
            );
            artistsFeed.setArtists(buildFeedPool(initialPool));
        }
    })();
}

export function generateArtistsContent() {
    return render();
}
