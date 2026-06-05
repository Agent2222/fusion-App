import { applyEditionFilters } from '../utils/feedFilterApply.js';
import { getEditions, subscribeDataSource } from '../utils/database.js';

/** @type {((e: CustomEvent) => void) | null} */
let _editionsFeedFilterHandler = null;
/** @type {(() => void) | null} */
let _unsubEditions = null;

export function render() {
    return `
        <div class="page editions-page">
            <app-feed-filter state="editions"></app-feed-filter>
            <main id="editionsMain" class="main-cont">
                <div id="editionsMainContent" class="feed-container">
                    <app-info context="editions" active="true" topP="0px"></app-info>
                    <app-editions-feed id="editionsFeed" active="true"></app-editions-feed>
                    <app-join-network id="joinNetworkEditions" data-modal-type="access" context="editions" active="true" data-margin-top="48px" data-margin-bottom="96px"></app-join-network>
                </div>
            </main>
        </div>
    `;
}

export default function initEditions() {
    const feed = document.getElementById('editionsFeed');
    if (!feed || typeof feed.setEditions !== 'function') return;

    if (_unsubEditions) {
        _unsubEditions();
        _unsubEditions = null;
    }

    const wire = async () => {
        const items = await getEditions();
        if (_editionsFeedFilterHandler) {
            window.removeEventListener('fusion-feed-filter', _editionsFeedFilterHandler);
        }
        _editionsFeedFilterHandler = (e) => {
            const ev = /** @type {CustomEvent} */ (e);
            if (ev.detail?.state !== 'editions') return;
            const filtered = applyEditionFilters(items, ev.detail.criteria || {});
            feed.setEditions({ items: filtered });
        };
        window.addEventListener('fusion-feed-filter', _editionsFeedFilterHandler);

        const initial = applyEditionFilters(items, {
            yearId: 'allEditionYears',
            formatId: 'allEditionFormats',
            categoryKeys: [],
        });
        feed.setEditions({ items: initial });

        queueMicrotask(() => {
            const ff = document.querySelector('app-feed-filter[state="editions"]');
            if (ff && typeof ff.hydrateFilterData === 'function') {
                ff.hydrateFilterData({ state: 'editions', editions: items || [] });
            }
        });
    };

    void wire();
    _unsubEditions = subscribeDataSource(() => void wire());
}

export function generateEditionsContent() {
    return render();
}
