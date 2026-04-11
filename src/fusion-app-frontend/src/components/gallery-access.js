import { testData } from '../testData.js';
import { buildFeedPool } from './subComponents/artistsFeed.js';
import { applyGalleryAccessFilters } from '../utils/feedFilterApply.js';

/** @type {((e: CustomEvent) => void) | null} */
let _galleryFeedFilterHandler = null;

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
    if (feed && typeof feed.setArtists === 'function') {
        if (_galleryFeedFilterHandler) {
            window.removeEventListener('fusion-feed-filter', _galleryFeedFilterHandler);
        }
        _galleryFeedFilterHandler = (e) => {
            const ev = /** @type {CustomEvent} */ (e);
            if (ev.detail?.state !== 'gallery-access') return;
            const raw = testData.allArtists?.artists || [];
            const filtered = applyGalleryAccessFilters(raw, ev.detail.criteria || {});
            feed.setArtists(buildFeedPool(filtered));
        };
        window.addEventListener('fusion-feed-filter', _galleryFeedFilterHandler);

        const initial = applyGalleryAccessFilters(testData.allArtists?.artists || [], {
            locationKey: 'all',
            seasonId: 'allGallerySeason',
            viewId: 'allGalleryView',
        });
        feed.setArtists(buildFeedPool(initial));
    }
}

export function generateGalleryAccessContent() {
    return render();
}
