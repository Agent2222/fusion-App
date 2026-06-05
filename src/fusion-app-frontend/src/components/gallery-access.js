import { buildFeedPool } from './subComponents/artistsFeed.js';
import { applyGalleryAccessFilters } from '../utils/feedFilterApply.js';
import { getArtists, subscribeDataSource } from '../utils/database.js';

/** @type {((e: CustomEvent) => void) | null} */
let _galleryFeedFilterHandler = null;
/** @type {(() => void) | null} */
let _unsubGalleryAccess = null;

export function render() {
    return `
        <div class="page gallery-access-page">
            <app-feed-filter state="gallery-access"></app-feed-filter>
            <main id="galleryAccessMain" class="main-cont">
                <div id="galleryAccessMainContent" class="feed-container">
                    <div class="page-content nav-page-content">
                        <app-artists-ga-feed id="artistsGAFeed"></app-artists-ga-feed>
                        <app-join-network id="joinNetworkGalleryAccess" data-modal-type="access" context="gallery-access" active="true" data-margin-top="48px" data-margin-bottom="96px"></app-join-network>
                    </div>
                </div>
            </main>
        </div>
    `;
}

export default function initGalleryAccess() {
    const feed = document.getElementById('artistsGAFeed');
    if (!feed || typeof feed.setArtists !== 'function') return;

    if (_unsubGalleryAccess) {
        _unsubGalleryAccess();
        _unsubGalleryAccess = null;
    }
    if (_galleryFeedFilterHandler) {
        window.removeEventListener('fusion-feed-filter', _galleryFeedFilterHandler);
        _galleryFeedFilterHandler = null;
    }

    const wire = async () => {
        const raw = await getArtists();
        const artists = Array.isArray(raw) ? raw : [];

        _galleryFeedFilterHandler = (e) => {
            const ev = /** @type {CustomEvent} */ (e);
            if (ev.detail?.state !== 'gallery-access') return;
            const filtered = applyGalleryAccessFilters(artists, ev.detail.criteria || {});
            feed.setArtists(buildFeedPool(filtered));
        };
        window.addEventListener('fusion-feed-filter', _galleryFeedFilterHandler);

        const initial = applyGalleryAccessFilters(artists, {
            locationKey: 'all',
            seasonId: 'allGallerySeason',
            viewId: 'allGalleryView',
        });
        feed.setArtists(buildFeedPool(initial));

        queueMicrotask(() => {
            const ff = document.querySelector('app-feed-filter[state="gallery-access"]');
            if (ff && typeof ff.hydrateFilterData === 'function') {
                ff.hydrateFilterData({ state: 'gallery-access', artists });
            }
        });
    };

    void wire();
    _unsubGalleryAccess = subscribeDataSource(() => {
        if (_galleryFeedFilterHandler) {
            window.removeEventListener('fusion-feed-filter', _galleryFeedFilterHandler);
            _galleryFeedFilterHandler = null;
        }
        void wire();
    });
}

export function generateGalleryAccessContent() {
    return render();
}
