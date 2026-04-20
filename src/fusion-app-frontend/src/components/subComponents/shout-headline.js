import { getContentBundleForStudio, subscribeDataSource } from '../../utils/database.js';
import { mergeLocaleDeep } from '../../utils/localeFallback.js';
import { shoutPlainFromLocaleSlice } from '../../utils/shoutHeadlineText.js';

/**
 * CMS-driven block using `.shoutHeadline` styling (see index.css).
 * Locales use `shoutText` (plain; line breaks preserved). Legacy `shoutHtml` is still supported.
 */
class AppShoutHeadline extends HTMLElement {
    constructor() {
        super();
        /** @type {HTMLDivElement | null} */
        this._root = null;
        /** @type {HTMLDivElement | null} */
        this._plainEl = null;
        this._slug = 'artists-page';
        this._loadBound = () => {
            void this._load();
        };
        /** @param {Event} ev */
        this._onCms = (ev) => {
            const slug = /** @type {CustomEvent<{ slug?: string }>} */ (ev).detail?.slug;
            if (slug && slug !== this._slug) return;
            void this._load();
        };
        /** @type {(() => void) | null} */
        this._unsub = null;
    }

    connectedCallback() {
        this._slug = (this.getAttribute('data-content-slug') || 'artists-page').trim() || 'artists-page';
        if (!this._root) {
            this._root = document.createElement('div');
            this._root.className = 'shoutHeadline';
            const inner = document.createElement('div');
            inner.className = 'shout-headline__plain';
            this._plainEl = inner;
            this._root.appendChild(inner);
            this.appendChild(this._root);
        }
        void this._load();
        window.addEventListener('fusion-content-pages-changed', this._onCms);
        window.addEventListener('fusion-localechange', this._loadBound);
        this._unsub = subscribeDataSource(() => {
            void this._load();
        });
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-content-pages-changed', this._onCms);
        window.removeEventListener('fusion-localechange', this._loadBound);
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }
    }

    /**
     * @param {Record<string, unknown> | null | undefined} bundle
     */
    _localeSlice(bundle) {
        if (!bundle || typeof bundle !== 'object') return null;
        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
        const en = bundle.en && typeof bundle.en === 'object' ? /** @type {Record<string, unknown>} */ (bundle.en) : {};
        const ja = bundle.ja && typeof bundle.ja === 'object' ? /** @type {Record<string, unknown>} */ (bundle.ja) : {};
        if (locale === 'ja') {
            return /** @type {Record<string, unknown>} */ (mergeLocaleDeep(en, ja));
        }
        return en;
    }

    async _load() {
        if (!this._root || !this._plainEl) return;
        const bundle = await getContentBundleForStudio(this._slug, { forStudio: false });
        const slice = this._localeSlice(
            bundle && typeof bundle === 'object' ? /** @type {Record<string, unknown>} */ (bundle) : null
        );
        const text = shoutPlainFromLocaleSlice(slice || {});
        const trimmed = text.trim();
        this._plainEl.textContent = text;
        this.hidden = !trimmed;
    }
}

customElements.define('app-shout-headline', AppShoutHeadline);
