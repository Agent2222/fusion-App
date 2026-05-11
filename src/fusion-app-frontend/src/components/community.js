/**
 * `/community` landing — CMS from canister (`getCommunityPagePublic`).
 */
import { getArtists, getCommunityPagePublic } from '../utils/database.js';

export function render() {
    return `
        <div class="page community-page">
            <main id="communityMain" class="main-cont">
                <div id="communityMainContent" class="feed-container">
                    <h1 class="seo-primary-h1">Community — Fusion members and programs</h1>
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
    let data;
    let artists = [];
    try {
        data = await getCommunityPagePublic();
    } catch {
        data = {};
    }
    try {
        artists = await getArtists();
        if (!Array.isArray(artists)) artists = [];
    } catch {
        artists = [];
    }

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
    const h = data?.hero && typeof data.hero === 'object' ? data.hero : {};
    const exclusive = Array.isArray(data?.exclusive) ? data.exclusive : [];
    const connect = data?.connect && typeof data.connect === 'object' ? data.connect : {};
    const networkCards = Array.isArray(data?.networkCards) ? data.networkCards : [];
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    const promoData = data?.promo && typeof data.promo === 'object' ? data.promo : {};

    const setActiveHero = (item, index = -1) => {
        const activeItem = item && typeof item === 'object' ? item : h;
        if (hero && typeof hero.setData === 'function') {
            hero.setData(activeItem, { artists, activeIndex: index });
        }
        if (exc && typeof exc.setActiveIndex === 'function') {
            exc.setActiveIndex(index);
        }
    };

    if (hero && typeof hero.setData === 'function') hero.setData(h, { artists, activeIndex: -1 });
    if (exc && typeof exc.setData === 'function') exc.setData(exclusive, { activeIndex: -1 });
    if (conn && typeof conn.setData === 'function') conn.setData(connect);
    if (net && typeof net.setData === 'function') net.setData(networkCards);
    if (sess && typeof sess.setData === 'function') sess.setData(sessions);
    if (promo && typeof promo.setData === 'function') promo.setData(promoData);

    if (hero) hero.toggleAttribute('hidden', !active('hero'));
    if (exc) exc.toggleAttribute('hidden', !active('exclusive'));
    if (conn) conn.toggleAttribute('hidden', !active('connect'));
    if (netSection) netSection.toggleAttribute('hidden', !active('network'));
    if (net) net.toggleAttribute('hidden', !active('network'));
    if (sess) sess.toggleAttribute('hidden', !active('sessions'));
    if (promo) promo.toggleAttribute('hidden', !active('promo'));
    if (footGrid) footGrid.toggleAttribute('hidden', !active('sessions') && !active('promo'));
    if (join) join.toggleAttribute('hidden', !active('join'));

    exc?.addEventListener('fusion-community-feature-select', (event) => {
        const detail = event instanceof CustomEvent ? event.detail : {};
        const index = Number(detail?.index ?? -1);
        const item = Number.isInteger(index) && index >= 0 ? exclusive[index] : detail?.item;
        setActiveHero(item, index);
        hero?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}
