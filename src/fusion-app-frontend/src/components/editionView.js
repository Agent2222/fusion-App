import { getEditions, subscribeDataSource } from '../utils/database.js';

/**
 * @param {string} pathname e.g. `/editions/stone-garden`
 * @param {Array<{ href: string }>} items
 */
function findEditionByPathname(pathname, items) {
    if (!pathname || !Array.isArray(items)) return null;
    for (const it of items) {
        if (it?.href === pathname) return it;
    }
    return null;
}

export function generateEditionViewContent() {
    return `
        <div class="page edition-view-page">
            <main id="editionViewMain" class="main-cont">
                <div id="editionViewMainContent" class="feed-container">
                    <div class="page-content edition-view-content">
                        <nav class="edition-view-back" aria-label="Edition">
                            <a href="/editions" class="edition-view-back-link">← Editions</a>
                        </nav>
                        <article class="edition-detail" id="editionDetail" hidden>
                            <div class="edition-detail-hero">
                                <img id="editionDetailImage" src="" alt="" width="960" height="540" />
                            </div>
                            <div class="edition-detail-body">
                                <h1 id="editionDetailTitle" class="edition-detail-title"></h1>
                            </div>
                        </article>
                        <div id="editionDetailNotFound" class="edition-view-not-found" hidden>
                            <p>We could not find that edition.</p>
                            <p><a href="/editions">Browse editions</a></p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;
}

function applyEdition(edition) {
    const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
    const loc = edition[locale === 'ja' ? 'ja' : 'en'] || edition.en;
    const title = loc?.title || '';
    const alt = loc?.alt || title;

    const img = document.getElementById('editionDetailImage');
    const titleEl = document.getElementById('editionDetailTitle');

    if (img) {
        img.src = edition.imageSrc || '';
        img.alt = alt;
    }
    if (titleEl) titleEl.textContent = title;
    document.title = `${title || 'Edition'} · Fusion`;
}

/** @type {(() => void) | null} */
let _unsubEditionView = null;

export default function initEditionView() {
    if (_unsubEditionView) {
        _unsubEditionView();
        _unsubEditionView = null;
    }

    const pathname = window.location.pathname;

    const run = async () => {
        const items = await getEditions();
        const edition = findEditionByPathname(pathname, items);

        const article = document.getElementById('editionDetail');
        const notFound = document.getElementById('editionDetailNotFound');

        const show = (el, on) => {
            if (!el) return;
            if (on) el.removeAttribute('hidden');
            else el.setAttribute('hidden', '');
        };

        if (!edition) {
            show(article, false);
            show(notFound, true);
            document.title = 'Edition not found · Fusion';
            return;
        }

        show(article, true);
        show(notFound, false);
        applyEdition(edition);
    };

    void run();
    _unsubEditionView = subscribeDataSource(() => {
        void run();
    });
}
