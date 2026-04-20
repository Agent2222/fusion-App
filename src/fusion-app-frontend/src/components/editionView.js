import { getPublicSiteOrigin } from '../config.js';
import { getEditions, subscribeDataSource } from '../utils/database.js';
import { applyDocumentSeo } from '../utils/documentSeo.js';
import { firstNonEmptyString, mergeLocaleDeep } from '../utils/localeFallback.js';

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
    const enE = edition.en && typeof edition.en === 'object' ? edition.en : {};
    const jaE = edition.ja && typeof edition.ja === 'object' ? edition.ja : {};
    const loc =
        locale === 'ja'
            ? /** @type {Record<string, unknown>} */ (mergeLocaleDeep(enE, jaE))
            : /** @type {Record<string, unknown>} */ (enE);
    const title = loc?.title || '';
    const alt = loc?.alt || title;

    const imgEl = document.getElementById('editionDetailImage');
    const titleEl = document.getElementById('editionDetailTitle');

    if (imgEl) {
        imgEl.src = firstNonEmptyString(edition.imageSrc, jaE?.imageSrc, enE?.imageSrc);
        imgEl.alt = alt;
    }
    if (titleEl) titleEl.textContent = title;
    const pageTitle = `${title || "Edition"} · Fusion`;
    document.title = pageTitle;
    const pagePath = window.location.pathname;
    let imageSrcForOg = firstNonEmptyString(edition.imageSrc, jaE?.imageSrc, enE?.imageSrc);
    if (imageSrcForOg && !/^https?:\/\//i.test(imageSrcForOg)) {
        const origin = getPublicSiteOrigin();
        imageSrcForOg = `${origin}${imageSrcForOg.startsWith("/") ? imageSrcForOg : `/${imageSrcForOg}`}`;
    }
    applyDocumentSeo({
        title: pageTitle,
        description:
            String(title || "").trim() ||
            "Limited editions and objects from Fusion artists.",
        path: pagePath,
        ogType: "article",
        imageUrl: imageSrcForOg || undefined,
        breadcrumbItems: [
            { name: "Home", path: "/" },
            { name: "Editions", path: "/editions" },
            { name: String(title || "Edition").slice(0, 96), path: pagePath },
        ],
    });
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
            applyDocumentSeo({
                title: "Edition not found · Fusion",
                description: "This edition is not available on Fusion.",
                path: pathname,
                robots: "noindex, nofollow",
            });
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
