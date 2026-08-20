/**
 * `/community` landing — CMS from canister (`getCommunityPagePublic`).
 */
import { getCommunityArtistsPublic, getCommunityLandingVideosBundle, getCommunityPagePublic } from '../utils/database.js';
import { featureItemWithoutFlags } from '../utils/communityPageDefaults.js';
import { captureCommunityEvent } from '../utils/communityPosthog.js';

export function render() {
    return `
        <div class="page community-page">
            <main id="communityMain" class="main-cont">
                <div id="communityMainContent" class="feed-container">
                    <h1 class="seo-primary-h1">Community inside Fusion’s curated art network</h1>
                    <p class="seo-support-lead">
                        A community for artists, galleries, curators, and collectors inside Fusion’s
                        <a href="/join-network">curated art network</a>.
                    </p>
                    <app-community-hero id="communityHero" active="true"></app-community-hero>
                    <div class="page-content nav-page-content community-content">
                        <app-exclusive-content-highlight id="communityExclusive" active="true"></app-exclusive-content-highlight>
                        <app-community-connect id="communityConnect" active="true"></app-community-connect>
                        <section id="communityNetworkSection" class="community-network-section" aria-label="Network">
                            <app-community-network-cards id="communityNetwork" active="true"></app-community-network-cards>
                        </section>
                        <section id="communityFootGrid" class="community-foot-grid" aria-label="Sessions and community">
                            <app-community-upcoming-sessions id="communitySessions" active="true"></app-community-upcoming-sessions>
                            <app-community-promo-block id="communityPromo" active="true"></app-community-promo-block>
                        </section>
                        <app-join-network id="joinNetworkCommunity" data-modal-type="membership" context="community" active="true" data-margin-top="48px" data-margin-bottom="80px"></app-join-network>
                    </div>
                </div>
            </main>
        </div>
    `;
}

export function generateCommunityContent() {
    return render();
}

export default async function initCommunity() {
    document.documentElement.setAttribute('data-fusion-page', 'community');
    document.querySelectorAll('app-sound-environment').forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        el.setAttribute('hidden', '');
        if (typeof el.setMasterEnabled === 'function') {
            el.setMasterEnabled(false);
        }
    });

    let data;
    let artists = [];
    let videoBundle = {
        featuredItems: [],
        heroItem: {},
        heroIndex: -1,
    };
    try {
        [data, videoBundle, artists] = await Promise.all([
            getCommunityPagePublic(),
            getCommunityLandingVideosBundle(),
            getCommunityArtistsPublic(),
        ]);
    } catch {
        data = {};
        captureCommunityEvent('community_page_data_load_failed', { source: 'community_page' });
    }
    if (!Array.isArray(artists)) artists = [];

    const hero = document.getElementById('communityHero');
    const exc = document.getElementById('communityExclusive');
    const conn = document.getElementById('communityConnect');
    const net = document.getElementById('communityNetwork');
    const sess = document.getElementById('communitySessions');
    const promo = document.getElementById('communityPromo');
    const netSection = document.getElementById('communityNetworkSection');
    const footGrid = document.getElementById('communityFootGrid');
    const join = document.getElementById('joinNetworkCommunity');

    const sections = data?.sections && typeof data.sections === 'object' ? data.sections : {};
    const active = (key) => /** @type {Record<string, unknown>} */ (sections)[key] !== false;
    const exclusive = videoBundle.featuredItems.length
        ? videoBundle.featuredItems
        : Array.isArray(data?.exclusive) ? data.exclusive : [];
    const heroItem = videoBundle.featuredItems.length
        ? videoBundle.heroItem
        : exclusive[videoBundle.heroIndex >= 0 ? videoBundle.heroIndex : 0] || {};
    const heroIndex = videoBundle.featuredItems.length
        ? (() => {
              const hid = videoBundle.heroItem?.videoId;
              if (!hid) return videoBundle.heroIndex >= 0 ? videoBundle.heroIndex : 0;
              const ix = exclusive.findIndex((it) => String(it?.videoId ?? '') === String(hid));
              return ix >= 0 ? ix : 0;
          })()
        : exclusive.findIndex((item) => item?.isHero === true);
    const resolvedHeroIndex = heroIndex >= 0 ? heroIndex : 0;
    const visibleExclusiveCount = exclusive.filter((item) => item?.visible !== false).length;
    const connect = data?.connect && typeof data.connect === 'object' ? data.connect : {};
    const networkCards = Array.isArray(data?.networkCards) ? data.networkCards : [];
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    const promoData = data?.promo && typeof data.promo === 'object' ? data.promo : {};

    captureCommunityEvent('community_page_data_loaded', {
        hero_active: active('hero'),
        exclusive_active: active('exclusive'),
        connect_active: active('connect'),
        network_active: active('network'),
        sessions_active: active('sessions'),
        promo_active: active('promo'),
        join_active: active('join'),
        exclusive_count: exclusive.length,
        exclusive_visible_count: visibleExclusiveCount,
        hero_exclusive_index: resolvedHeroIndex,
        network_card_count: networkCards.length,
        session_count: sessions.length,
        artist_count: artists.length,
    });

    const setVisible = (el, visible) => {
        if (!(el instanceof HTMLElement)) return;
        el.toggleAttribute('hidden', !visible);
        el.setAttribute('aria-hidden', visible ? 'false' : 'true');
        el.style.display = visible ? '' : 'none';
    };

    const setActiveHero = (item, index = resolvedHeroIndex) => {
        const activeItem = item && typeof item === 'object' ? item : heroItem;
        if (hero && typeof hero.setData === 'function') {
            hero.setData(activeItem, { artists, activeIndex: index });
        }
        if (exc && typeof exc.setActiveIndex === 'function') {
            exc.setActiveIndex(index);
        }
    };

    if (hero && typeof hero.setData === 'function') {
        hero.setData(heroItem, { artists, activeIndex: resolvedHeroIndex });
    }
    if (exc && typeof exc.setData === 'function') {
        exc.setData(exclusive, { activeIndex: resolvedHeroIndex });
    }
    if (conn && typeof conn.setData === 'function') conn.setData(connect);
    if (net && typeof net.setData === 'function') net.setData(networkCards);
    if (sess && typeof sess.setData === 'function') sess.setData(sessions);
    if (promo && typeof promo.setData === 'function') promo.setData(promoData);

    setVisible(hero, active('hero') && resolvedHeroIndex >= 0);
    setVisible(exc, active('exclusive') && visibleExclusiveCount > 0);
    setVisible(conn, active('connect'));
    setVisible(netSection, active('network'));
    setVisible(net, active('network'));
    setVisible(sess, active('sessions'));
    setVisible(promo, active('promo'));
    setVisible(footGrid, active('sessions') || active('promo'));
    setVisible(join, active('join'));

    exc?.addEventListener('fusion-community-feature-select', (event) => {
        const detail = event instanceof CustomEvent ? event.detail : {};
        const index = Number(detail?.index ?? -1);
        const item = Number.isInteger(index) && index >= 0
            ? featureItemWithoutFlags(/** @type {Record<string, unknown>} */ (exclusive[index]))
            : detail?.item;
        setActiveHero(item, index);
        const scrollTargets = [
            document.getElementById('communityMainContent'),
            document.getElementById('communityMain'),
            document.getElementById('mainContent'),
            document.scrollingElement,
            document.documentElement,
            document.body,
        ].filter(Boolean);
        scrollTargets.forEach((target) => {
            if ('scrollTo' in target) {
                target.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            } else {
                target.scrollTop = 0;
            }
        });
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });

}
