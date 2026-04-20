/**
 * Extended network grid — same card rhythm as `artistsFeed` (image + text), no pagination.
 * Data: CMS `context` bundle merged by locale.
 */
import { getContentBundleForStudio, subscribeDataSource } from '../../utils/database.js';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {Record<string, unknown> | null} bundle
 */
function getContextCopyFromBundle(bundle) {
    if (!bundle || typeof bundle !== 'object') return {};
    const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    const base = /** @type {Record<string, unknown>} */ (bundle).en || {};
    const loc = /** @type {Record<string, unknown>} */ (bundle)[locale] || {};
    return { ...base, ...loc };
}

class ExtendedNetworkFeedElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._shellReady = false;
        /** @type {Record<string, unknown> | null} */
        this._contextBundle = null;
        /** @type {(() => void) | null} */
        this._unsubData = null;
        this._onLocaleChange = () => this.render();
        /** @param {Event} ev */
        this._onFusionCms = (ev) => {
            const slug = /** @type {CustomEvent<{ slug?: string }>} */ (ev).detail?.slug;
            if (slug && slug !== 'context') return;
            void this._loadContext();
        };
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }

    static get observedAttributes() {
        return ['active'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active') {
            if (oldVal === newVal) return;
            this.render();
        }
    }

    connectedCallback() {
        window.addEventListener('fusion-localechange', this._onLocaleChange);
        window.addEventListener('fusion-content-pages-changed', this._onFusionCms);
        if (this._unsubData) this._unsubData();
        this._unsubData = subscribeDataSource(() => void this._loadContext());
        void this._loadContext();
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-localechange', this._onLocaleChange);
        window.removeEventListener('fusion-content-pages-changed', this._onFusionCms);
        if (this._unsubData) {
            this._unsubData();
            this._unsubData = null;
        }
    }

    async _loadContext() {
        this._contextBundle = await getContentBundleForStudio('context', { forStudio: false });
        this.ensureShell();
        this.render();
    }

    ensureShell() {
        if (this._shellReady) return;
        this._shellReady = true;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .extended-network-feed {
                    width: 100%;
                    box-sizing: border-box;
                }

                /* Match staffFeed .staff-feed-headline (People behind FUSION) */
                .feed-header {
                    margin: 0 auto 3rem;
                    font-size: clamp(1.25rem, 1.2vw, 2rem);
                    font-variation-settings: var(--fv-title);
                    letter-spacing: 0.06em;
                    color: var(--c2);
                    user-select: none;
                    text-align: center;
                    width: 100%;
                    max-width: min(100%, 72rem);
                    box-sizing: border-box;
                    padding: 0;
                }

                .feed-description {
                    font-size: clamp(0.85rem, 1vw, 1.05rem);
                    font-variation-settings: var(--fv-subtitle);
                    color: var(--c2);
                    line-height: 1.45;
                    max-width: 52rem;
                    padding-bottom: 2rem;
                    margin: 0 auto 2rem;
                    text-align: center;
                    padding-left: 10%;
                    padding-right: 10%;
                    box-sizing: border-box;
                }

                .feed-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    width: 100%;
                    min-height: 0;
                }

                .network-card {
                    display: grid;
                    grid-template-rows: minmax(0, 1fr) auto;
                    min-width: 0;
                    cursor: default;
                    transition: opacity 0.25s ease;
                }

                .network-card:hover {
                    opacity: 0.92;
                }

                .network-card:hover .network-card-image img {
                    transform: scale(1.05);
                }

                .network-card-image {
                    width: 100%;
                    aspect-ratio: 4 / 5;
                    overflow: hidden;
                    background: var(--c3);
                }

                .network-card-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center;
                    transform-origin: center center;
                    transition: transform 0.35s ease;
                    max-width: none;
                    max-height: none;
                    margin: 0;
                    display: block;
                }

                .network-card-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem 1rem 1.25rem;
                    background-color: var(--c3);
                    gap: 0.35rem;
                    box-sizing: border-box;
                }

                /* Match staffFeed staff-card-name / staff-card-title */
                .network-card-name {
                    margin: 0;
                    font-size: clamp(1rem, 1.5vw, 1.8rem);
                    font-variation-settings: var(--fv-nav);
                    letter-spacing: 0.04em;
                    line-height: 1.2;
                    color: var(--c2);
                    text-align: center;
                }

                .network-card-meta {
                    margin: 0;
                    font-size: clamp(0.8rem, 1.1vw, 1.2rem);
                    font-variation-settings: var(--fv-card-title);
                    line-height: 1;
                    color: var(--c2);
                    text-align: center;
                    opacity: 0.95;
                }

                .feed-empty {
                    padding: 1rem;
                    color: var(--c2);
                    opacity: 0.85;
                }

                @media (max-width: 1024px) {
                    .feed-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }

                @media (max-width: 520px) {
                    .feed-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .feed-description {
                        max-width: none;
                    }
                }
            </style>
            <div class="extended-network-feed" part="extended-network-feed">
                <div id="feedHeader"></div>
                <p id="feedDescription" class="feed-description"></p>
                <div id="feedGrid" class="feed-grid"></div>
            </div>
        `;
    }

    render() {
        if (!this._shellReady) this.ensureShell();

        const ctx = getContextCopyFromBundle(this._contextBundle);
        const title = ctx.extendedNetworkTitle ?? '';
        const description = ctx.extendedNetworkHeadline ?? '';
        const cards = Array.isArray(ctx.extendedNetworkCards) ? ctx.extendedNetworkCards : [];

        const headerEl = this.shadowRoot.getElementById('feedHeader');
        const descEl = this.shadowRoot.getElementById('feedDescription');
        const grid = this.shadowRoot.getElementById('feedGrid');

        if (headerEl) {
            headerEl.className = 'feed-header';
            headerEl.textContent = title;
        }
        if (descEl) {
            descEl.textContent = description;
        }

        if (!grid) return;

        grid.innerHTML = '';

        if (cards.length === 0) {
            grid.innerHTML = `<div class="feed-empty">No extended network cards in context content.</div>`;
            return;
        }

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const name = card.name ?? '';
            const location = card.location ?? '';
            const jobTitle = card.title ?? '';
            const imageSrc = card.image ?? '';
            const metaLine = `${location}\u2014${jobTitle}`;

            const el = document.createElement('div');
            el.className = 'network-card';
            el.innerHTML = `
                <div class="network-card-image">
                    <img src="${imageSrc}" alt="${escapeHtml(name)}">
                </div>
                <div class="network-card-content">
                    <div class="network-card-name">${escapeHtml(name)}</div>
                    <div class="network-card-meta">${escapeHtml(metaLine)}</div>
                </div>
            `;
            grid.appendChild(el);
        }
    }
}

customElements.define('app-extended-network-feed', ExtendedNetworkFeedElement);

export { ExtendedNetworkFeedElement };
