/**
 * `/videos` catalog — community video library with in-page hero player.
 */
import { getCommunityArtistsPublic, getCommunityLandingVideosBundle } from '../utils/database.js';
import { captureVideosEvent } from '../utils/videosPosthog.js';

export function render() {
    return `
        <div class="page videos-page">
            <main id="videosMain" class="main-cont">
                <div id="videosMainContent" class="feed-container">
                    <h1 class="seo-primary-h1">Videos — Fusion studio visits and conversations</h1>
                    <app-community-hero id="videosHero" active="true"></app-community-hero>
                    <div class="page-content nav-page-content videos-content">
                        <app-exclusive-content-highlight id="videosRecent" active="true" data-hide-view-all="1"></app-exclusive-content-highlight>
                        <app-videos-feed id="videosFeed" active="true"></app-videos-feed>
                        <app-join-network id="joinNetworkVideos" data-modal-type="membership" context="videos" active="true" data-margin-top="48px" data-margin-bottom="80px"></app-join-network>
                    </div>
                </div>
            </main>
        </div>
    `;
}

export function generateVideosContent() {
    return render();
}

export default async function initVideos() {
    document.documentElement.setAttribute('data-fusion-page', 'videos');
    document.querySelectorAll('app-sound-environment').forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        el.setAttribute('hidden', '');
        if (typeof el.setMasterEnabled === 'function') el.setMasterEnabled(false);
    });

    let artists = [];
    let bundle = {
        allVideos: [],
        featuredItems: [],
        catalogItems: [],
        heroItem: {},
        heroIndex: -1,
    };
    try {
        [bundle, artists] = await Promise.all([
            getCommunityLandingVideosBundle(),
            getCommunityArtistsPublic(),
        ]);
        if (!Array.isArray(artists)) artists = [];
    } catch {
        captureVideosEvent('videos_page_data_load_failed');
    }

    const { featureItemVideoId } = await import('../utils/videoPageModel.js');
    const recentItems = Array.isArray(bundle.featuredItems) ? bundle.featuredItems : [];
    const catalogItems = Array.isArray(bundle.catalogItems) ? bundle.catalogItems : [];

    const heroItem =
        bundle.heroItem && typeof bundle.heroItem === 'object' && Object.keys(bundle.heroItem).length
            ? bundle.heroItem
            : recentItems[0] || catalogItems[0] || {};
    const heroVideoId = featureItemVideoId(heroItem);
    const heroIndexInRecent = recentItems.findIndex((it) => featureItemVideoId(it) === heroVideoId);
    const catalogActiveIndex = catalogItems.findIndex((it) => featureItemVideoId(it) === heroVideoId);

    const hero = document.getElementById('videosHero');
    const recent = document.getElementById('videosRecent');
    const feed = document.getElementById('videosFeed');

    if (hero && typeof hero.setData === 'function') {
        hero.setData(heroItem, {
            artists,
            activeIndex: heroIndexInRecent >= 0 ? heroIndexInRecent : Math.max(0, catalogActiveIndex),
        });
    }
    if (recent && typeof recent.setData === 'function') {
        recent.setData(recentItems, {
            activeIndex: heroIndexInRecent >= 0 ? heroIndexInRecent : -1,
        });
    }
    if (feed && typeof feed.setData === 'function') {
        feed.setData(catalogItems, {
            activeIndex: catalogActiveIndex >= 0 ? catalogActiveIndex : -1,
        });
    }

    captureVideosEvent('videos_page_data_loaded', {
        video_count: recentItems.length + catalogItems.length,
        recent_count: recentItems.length,
        catalog_count: catalogItems.length,
        featured_count: Array.isArray(bundle.featuredVideoIds) ? bundle.featuredVideoIds.length : recentItems.length,
        hero_index: heroIndexInRecent >= 0 ? heroIndexInRecent : catalogActiveIndex,
    });

    const scrollToTop = () => {
        const scrollTargets = [
            document.getElementById('videosMainContent'),
            document.getElementById('videosMain'),
            document.getElementById('mainContent'),
            document.scrollingElement,
            document.documentElement,
            document.body,
        ].filter(Boolean);
        scrollTargets.forEach((target) => {
            if ('scrollTo' in target) target.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            else target.scrollTop = 0;
        });
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    };

    const syncSelection = (item) => {
        if (!item || typeof item !== 'object') return;
        const vid = featureItemVideoId(item);
        const recentIdx = recentItems.findIndex((it) => featureItemVideoId(it) === vid);
        const catalogIdx = catalogItems.findIndex((it) => featureItemVideoId(it) === vid);
        if (hero && typeof hero.setData === 'function') {
            hero.setData(item, {
                artists,
                activeIndex: recentIdx >= 0 ? recentIdx : Math.max(0, catalogIdx),
            });
        }
        if (recent && typeof recent.setActiveIndex === 'function') {
            recent.setActiveIndex(recentIdx);
        }
        if (feed && typeof feed.setActiveIndex === 'function') {
            feed.setActiveIndex(catalogIdx);
        }
        scrollToTop();
    };

    recent?.addEventListener('fusion-community-feature-select', (event) => {
        const detail = event instanceof CustomEvent ? event.detail : {};
        syncSelection(detail?.item);
    });

    feed?.addEventListener('fusion-community-feature-select', (event) => {
        const detail = event instanceof CustomEvent ? event.detail : {};
        syncSelection(detail?.item);
    });
}
