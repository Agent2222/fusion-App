import { getPublicSiteOrigin } from '../config.js';
import { getJournalEntries, subscribeDataSource } from '../utils/database.js';
import { applyDocumentSeo } from '../utils/documentSeo.js';
import { journalBodyPlainText, normalizeJournalBodyHtml } from '../utils/journalBodyHtml.js';
import { isJournalEntryPublished } from '../utils/journalPublicVisibility.js';
import { SEO_MEDIA_DEFAULT, withSeoImageAlt } from '../utils/mediaAltSeo.js';
import { firstNonEmptyString, mergeLocaleDeep } from '../utils/localeFallback.js';

/**
 * URL segment after `/journal/entry/` (supports numeric ids, `j_…` studio ids, and slug routes).
 * @returns {string | null}
 */
function journalEntryKeyFromPathname() {
    const path = window.location.pathname;
    if (!path.startsWith('/journal/entry/')) return null;
    const seg = path.slice('/journal/entry/'.length).split('/').filter(Boolean)[0];
    if (!seg) return null;
    try {
        return decodeURIComponent(seg);
    } catch {
        return seg;
    }
}

/**
 * Last path segment of a stored `link` like `/journal/entry/my-slug`.
 * @param {unknown} link
 * @returns {string}
 */
export function journalEntrySegmentFromLink(link) {
    if (!link || typeof link !== 'string') return '';
    const m = link.trim().match(/\/journal\/entry\/([^/?#]+)/);
    return m ? m[1] : '';
}

/**
 * @param {string} key — path segment from the URL
 * @param {Array<Record<string, unknown>>} list
 * @returns {Record<string, unknown> | null}
 */
export function findJournalByPathSegment(key, list) {
    if (!key || !Array.isArray(list)) return null;
    const k = String(key).trim();
    for (const j of list) {
        if (!j || typeof j !== 'object') continue;
        const idRaw = /** @type {Record<string, unknown>} */ (j).id;
        const idStr = idRaw === undefined || idRaw === null ? '' : String(idRaw);
        if (idStr === k) return /** @type {Record<string, unknown>} */ (j);
        if (/^\d+$/.test(k)) {
            const n = Number(k);
            if (Number(idRaw) === n) return /** @type {Record<string, unknown>} */ (j);
        }
        const fromLink = journalEntrySegmentFromLink(/** @type {Record<string, unknown>} */ (j).link);
        if (fromLink && fromLink === k) return /** @type {Record<string, unknown>} */ (j);
    }
    return null;
}

export function generateJournalEntryContent() {
    return `
        <div class="page journal-entry-page">
            <main id="journalEntryMain" class="main-cont">
                <div id="journalEntryMainContent" class="feed-container">
                    <div class="page-content journal-entry-content">
                        <nav class="journal-entry-back" aria-label="Journal">
                            <a href="/journal" class="journal-entry-back-link">← Journal</a>
                        </nav>
                        <article class="journal-entry-detail is-pending" id="journalEntryDetail">
                            <div class="journal-entry-hero">
                                <img id="journalEntryImage" src="" alt="${SEO_MEDIA_DEFAULT}" decoding="async" />
                            </div>
                            <div class="journal-entry-body">
                                <h1 id="journalEntryTitle" class="journal-entry-title"></h1>
                                <div id="journalEntryDescription" class="journal-entry-description"></div>
                            </div>
                        </article>
                        <div id="journalEntryNotFound" class="journal-entry-not-found" hidden>
                            <p>We could not find that journal entry.</p>
                            <p><a href="/journal">Back to journal</a></p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;
}

/** @type {string} */
let _renderedEntryKey = '';
/** @type {string} */
let _renderedBodyHtml = '';
/** @type {string} */
let _renderedLocale = '';
/** @type {string | null} */
let _activePathKey = null;
/** @type {Record<string, unknown> | null} */
let _cachedEntry = null;
/** @type {((ev: Event) => void) | null} */
let _localeListener = null;
/** @type {(() => void) | null} */
let _unsubJournalEntry = null;

/**
 * @param {Record<string, unknown>} entry
 * @param {'en' | 'ja'} locale
 */
function journalEntryLocaleSlice(entry, locale) {
    const enE = entry.en && typeof entry.en === 'object' ? entry.en : {};
    const jaE = entry.ja && typeof entry.ja === 'object' ? entry.ja : {};
    return locale === 'ja'
        ? /** @type {Record<string, unknown>} */ (mergeLocaleDeep(enE, jaE))
        : /** @type {Record<string, unknown>} */ (enE);
}

/**
 * @param {HTMLElement | null} el
 * @param {boolean} on
 */
function setVisible(el, on) {
    if (!el) return;
    if (on) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
}

/**
 * @param {Record<string, unknown>} entry
 */
function applyJournalEntry(entry) {
    const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    const enE = entry.en && typeof entry.en === 'object' ? entry.en : {};
    const jaE = entry.ja && typeof entry.ja === 'object' ? entry.ja : {};
    const loc = journalEntryLocaleSlice(entry, locale);
    const title = String(loc?.title ?? '').trim();
    const description = loc?.description ?? '';
    const imageAlt = loc?.imageAlt ?? title;
    const entryKey = String(entry.id ?? '');

    const article = document.getElementById('journalEntryDetail');
    const imgEl = document.getElementById('journalEntryImage');
    const titleEl = document.getElementById('journalEntryTitle');
    const descEl = document.getElementById('journalEntryDescription');

    const nextImg = firstNonEmptyString(entry.imageSrc, jaE?.imageSrc, enE?.imageSrc);
    if (imgEl instanceof HTMLImageElement && nextImg && imgEl.getAttribute('src') !== nextImg) {
        imgEl.src = nextImg;
    }
    if (imgEl instanceof HTMLImageElement) {
        const nextAlt = withSeoImageAlt(imageAlt);
        if (imgEl.alt !== nextAlt) imgEl.alt = nextAlt;
    }
    if (titleEl) titleEl.textContent = title;

    const nextBody = normalizeJournalBodyHtml(String(description));
    const bodyNeedsUpdate =
        nextBody !== _renderedBodyHtml ||
        entryKey !== _renderedEntryKey ||
        locale !== _renderedLocale ||
        (descEl instanceof HTMLElement && descEl.innerHTML !== nextBody);
    if (descEl instanceof HTMLElement && bodyNeedsUpdate) {
        descEl.innerHTML = nextBody;
        _renderedBodyHtml = nextBody;
    }

    if (article instanceof HTMLElement) article.classList.remove('is-pending');
    _renderedEntryKey = entryKey;
    _renderedLocale = locale;

    const pageTitle = `${title || 'Journal'} · Fusion`;
    if (document.title !== pageTitle) document.title = pageTitle;
    const pagePath = window.location.pathname;
    const descText =
        journalBodyPlainText(description) ||
        'Editorial entry from Fusion’s art platform and Japan artist residency network.';
    let imageSrcForOg = nextImg;
    if (imageSrcForOg && !/^https?:\/\//i.test(imageSrcForOg)) {
        const origin = getPublicSiteOrigin();
        imageSrcForOg = `${origin}${imageSrcForOg.startsWith('/') ? imageSrcForOg : `/${imageSrcForOg}`}`;
    }
    const raw = /** @type {Record<string, unknown>} */ (entry);
    const datePublished =
        raw.datePublished != null
            ? String(raw.datePublished)
            : raw.publishedAt != null
              ? String(raw.publishedAt)
              : raw.date != null
                ? String(raw.date)
                : '';
    /** @type {Record<string, unknown>} */
    const articleLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title || 'Journal',
        description: descText.slice(0, 2000),
        publisher: {
            '@type': 'Organization',
            name: 'Fusion',
            url: `${getPublicSiteOrigin()}/`,
        },
    };
    if (imageSrcForOg) articleLd.image = [imageSrcForOg];
    if (datePublished) articleLd.datePublished = datePublished;

    applyDocumentSeo({
        title: pageTitle,
        description: descText,
        path: pagePath,
        ogType: 'article',
        imageUrl: imageSrcForOg || undefined,
        breadcrumbItems: [
            { name: 'Home', path: '/' },
            { name: 'Journal', path: '/journal' },
            { name: String(title || 'Entry').slice(0, 96), path: pagePath },
        ],
        articleJsonLd: articleLd,
    });
}

function resetJournalEntryRenderCache() {
    _renderedEntryKey = '';
    _renderedBodyHtml = '';
    _renderedLocale = '';
}

export default function initJournalEntry() {
    if (_unsubJournalEntry) {
        _unsubJournalEntry();
        _unsubJournalEntry = null;
    }
    if (_localeListener) {
        window.removeEventListener('fusion-localechange', _localeListener);
        _localeListener = null;
    }

    const pathKey = journalEntryKeyFromPathname();
    const currentLocale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    if (pathKey !== _activePathKey || currentLocale !== _renderedLocale) {
        _activePathKey = pathKey;
        resetJournalEntryRenderCache();
    }

    const run = async () => {
        const list = await getJournalEntries();
        const entry = pathKey != null ? findJournalByPathSegment(pathKey, list) : null;

        const article = document.getElementById('journalEntryDetail');
        const notFound = document.getElementById('journalEntryNotFound');

        if (pathKey == null || !entry || !isJournalEntryPublished(entry)) {
            _cachedEntry = null;
            setVisible(article, false);
            setVisible(notFound, true);
            if (article instanceof HTMLElement) article.classList.add('is-pending');
            resetJournalEntryRenderCache();
            applyDocumentSeo({
                title: 'Journal entry not found · Fusion',
                description: 'This journal entry is not available on Fusion.',
                path: window.location.pathname,
                robots: 'noindex, nofollow',
            });
            return;
        }

        _cachedEntry = /** @type {Record<string, unknown>} */ (entry);
        const entryKey = String(entry.id ?? '');
        const isSameEntry = entryKey && entryKey === _renderedEntryKey;

        setVisible(article, true);
        setVisible(notFound, false);
        if (!isSameEntry && article instanceof HTMLElement) {
            article.classList.add('is-pending');
        }
        applyJournalEntry(entry);
    };

    _localeListener = () => {
        resetJournalEntryRenderCache();
        if (_cachedEntry) {
            applyJournalEntry(_cachedEntry);
            return;
        }
        void run();
    };
    window.addEventListener('fusion-localechange', _localeListener);

    void run();
    _unsubJournalEntry = subscribeDataSource(() => {
        void run();
    });
}
