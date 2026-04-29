/**
 * `/community` landing — CMS from canister (`getCommunityPagePublic`).
 */
import { getCommunityPagePublic } from '../utils/database.js';

export function render() {
    return `
        <div class="page community-page">
            <main id="communityMain" class="main-cont">
                <div id="communityMainContent" class="feed-container">
                    <h1 class="seo-primary-h1">Community — Fusion members and programs</h1>
                    <div class="page-content nav-page-content community-content">
                        <app-community-hero id="communityHero" active="true"></app-community-hero>
                        <app-exclusive-content-highlight id="communityExclusive" active="true"></app-exclusive-content-highlight>
                        <app-community-connect id="communityConnect" active="true"></app-community-connect>
                        <section class="community-network-section" aria-label="Network">
                            <app-community-network-cards id="communityNetwork" active="true"></app-community-network-cards>
                        </section>
                        <section class="community-foot-grid" aria-label="Sessions and community">
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
    try {
        data = await getCommunityPagePublic();
    } catch {
        data = {};
    }

    const hero = document.getElementById('communityHero');
    const exc = document.getElementById('communityExclusive');
    const conn = document.getElementById('communityConnect');
    const net = document.getElementById('communityNetwork');
    const sess = document.getElementById('communitySessions');
    const promo = document.getElementById('communityPromo');

    const h = data?.hero && typeof data.hero === 'object' ? data.hero : {};
    const exclusive = Array.isArray(data?.exclusive) ? data.exclusive : [];
    const connect = data?.connect && typeof data.connect === 'object' ? data.connect : {};
    const networkCards = Array.isArray(data?.networkCards) ? data.networkCards : [];
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    const promoData = data?.promo && typeof data.promo === 'object' ? data.promo : {};

    if (hero && typeof hero.setData === 'function') hero.setData(h);
    if (exc && typeof exc.setData === 'function') exc.setData(exclusive);
    if (conn && typeof conn.setData === 'function') conn.setData(connect);
    if (net && typeof net.setData === 'function') net.setData(networkCards);
    if (sess && typeof sess.setData === 'function') sess.setData(sessions);
    if (promo && typeof promo.setData === 'function') promo.setData(promoData);
}
