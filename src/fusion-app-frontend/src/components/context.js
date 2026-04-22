import { getContentBundleForStudio, subscribeDataSource } from '../utils/database.js';
import { SEO_MEDIA_DEFAULT, withSeoImageAlt } from '../utils/mediaAltSeo.js';
import { mergeLocaleDeep } from '../utils/localeFallback.js';

export function render() {
    return `
        <div class="page context-page">
            <main id="contextMain" class="main-cont">
                <div id="contextMainContent" class="feed-container">
                    <h1 class="seo-primary-h1">Context — Fusion mission and ecosystem</h1>
                    <div id="contextHeadline"></div>
                    <div id="contextSubHeadlineSection">
                        <div id="contextSubHeadlineText"></div>
                        <div id="contextSubHeadlineImage">
                            <img id="contextSubImage" src="" alt="${SEO_MEDIA_DEFAULT}">
                        </div>
                    </div>
                    <app-features-row data-area="context" active="true"></app-features-row>
                    <div id="contextHeadline2" class="shoutHeadline"></div>
                    <app-staff-feed id="contextStaffSection" active="true"></app-staff-feed>
                    <app-extended-network-feed id="contextExtendedNetworkSection" active="true"></app-extended-network-feed>
                    <div id="contextEcosystemPartnersSection">
                        <div id="contextEcosystemPartnersHeadline"></div>
                        <div id="contextEcosystemPartnersDescription"></div>
                        <div id="contextEcosystemPartnersGrid"></div>
                    </div>
                    <div id="contextHeadline3" class="shoutHeadline"></div>
                </div>
            </main>
        </div>
    `;
}

/**
 * @param {Record<string, unknown> | null | undefined} bundle
 */
function localeSlice(bundle) {
    if (!bundle || typeof bundle !== 'object') return null;
    const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
    const en = bundle.en && typeof bundle.en === 'object' ? /** @type {Record<string, unknown>} */ (bundle.en) : {};
    const ja = bundle.ja && typeof bundle.ja === 'object' ? /** @type {Record<string, unknown>} */ (bundle.ja) : {};
    if (locale === 'ja') {
        return /** @type {Record<string, unknown>} */ (mergeLocaleDeep(en, ja));
    }
    return en;
}

function clearContextCopy() {
    const ids = [
        'contextHeadline',
        'contextSubHeadlineText',
        'contextHeadline2',
        'contextHeadline3',
    ];
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    }
    const img = document.getElementById('contextSubImage');
    if (img) {
        img.removeAttribute('src');
        img.alt = SEO_MEDIA_DEFAULT;
    }
    setTextEl('contextEcosystemPartnersHeadline', '');
    setTextEl('contextEcosystemPartnersDescription', '');
    const grid = document.getElementById('contextEcosystemPartnersGrid');
    if (grid) grid.replaceChildren();
}

/** @param {string} id @param {string} text */
function setTextEl(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function applyContextFromBundle(bundle) {
    const slice = localeSlice(bundle);
    if (!slice) {
        clearContextCopy();
        return;
    }

    const setHtml = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = String(html ?? '');
    };
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(text ?? '');
    };

    setHtml('contextHeadline', slice.headline);
    setHtml('contextSubHeadlineText', slice.subheadline);
    const img = document.getElementById('contextSubImage');
    if (img && slice.subImage) {
        img.src = typeof slice.subImage === 'string' ? slice.subImage : String(slice.subImage);
    }
    setHtml('contextHeadline2', slice.headline2);
    setText('contextEcosystemPartnersHeadline', /** @type {string} */ (slice.ecosystemPartnersTitle) || '');
    setText('contextEcosystemPartnersDescription', /** @type {string} */ (slice.ecosystemPartnersHeadline) || '');
    setHtml('contextHeadline3', slice.headline3);

    const grid = document.getElementById('contextEcosystemPartnersGrid');
    if (grid) {
        grid.replaceChildren();
        const cards = Array.isArray(slice.ecosystemPartnersCards) ? slice.ecosystemPartnersCards : [];
        for (const raw of cards) {
            if (!raw || typeof raw !== 'object') continue;
            const c = /** @type {Record<string, unknown>} */ (raw);
            const label = String(c.name ?? c.title ?? '').trim();
            const href = c.link != null ? String(c.link) : '';
            const imgSrc = c.image != null ? String(c.image) : '';
            const card = document.createElement('div');
            card.className = 'context-ecosystem-card';
            const wrap = document.createElement(href && /^https?:\/\//i.test(href) ? 'a' : 'div');
            if (wrap instanceof HTMLAnchorElement) {
                wrap.href = href;
                wrap.target = '_blank';
                wrap.rel = 'noopener noreferrer';
                wrap.className = 'context-ecosystem-card__link';
            } else {
                wrap.className = 'context-ecosystem-card__static';
            }
            if (imgSrc) {
                const im = document.createElement('img');
                im.src = imgSrc;
                im.alt = withSeoImageAlt(label);
                im.loading = 'lazy';
                wrap.appendChild(im);
            }
            const span = document.createElement('span');
            span.className = 'context-ecosystem-card__label';
            span.textContent = label;
            wrap.appendChild(span);
            card.appendChild(wrap);
            grid.appendChild(card);
        }
    }
}

/** @type {(() => void) | null} */
let _unsubContext = null;
/** @type {(() => void) | null} */
let _unsubLocaleContext = null;

export default function initContext() {
    if (_unsubContext) {
        _unsubContext();
        _unsubContext = null;
    }
    if (_unsubLocaleContext) {
        _unsubLocaleContext();
        _unsubLocaleContext = null;
    }

    const load = async () => {
        const bundle = await getContentBundleForStudio('context', { forStudio: false });
        applyContextFromBundle(
            bundle && typeof bundle === 'object' ? /** @type {Record<string, unknown>} */ (bundle) : null
        );
    };

    void load();
    _unsubContext = subscribeDataSource(() => {
        void load();
    });
    /** @param {Event} ev */
    const onCmsSaved = (ev) => {
        const slug = /** @type {CustomEvent<{ slug?: string }>} */ (ev).detail?.slug;
        if (slug && slug !== 'context') return;
        void load();
    };
    window.addEventListener('fusion-content-pages-changed', onCmsSaved);
    window.addEventListener('fusion-localechange', load);
    _unsubLocaleContext = () => {
        window.removeEventListener('fusion-localechange', load);
        window.removeEventListener('fusion-content-pages-changed', onCmsSaved);
    };
}

export function generateContextContent() {
    return render();
}
