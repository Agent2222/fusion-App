/**
 * Staff grid for the Context page — CMS `context` bundle, EN merged with active locale.
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

class StaffFeedComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
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
        this.render();
    }

    render() {
        const ctx = getContextCopyFromBundle(this._contextBundle);
        const headline = ctx.staffHeadline ?? '';
        const cards = Array.isArray(ctx.staffCards) ? ctx.staffCards : [];

        const cardsHtml = cards
            .map((card) => {
                const name = card.name ?? '';
                const title = card.title ?? '';
                const location = card.location ?? '';
                const languages = card.languages ?? '';
                const focus = card.focus ?? '';
                const brief = card.brief ?? '';
                const quote = card.quote ?? '';
                const imageSrc = card.image ?? '';
                return `
                    <article class="staff-card" part="staff-card">
                        <div class="staff-card-image">
                            <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(name)}" width="400" height="480" />
                        </div>
                        <div class="staff-card-body">
                            <h3 class="staff-card-name">${escapeHtml(name)}</h3>
                            <p class="staff-card-title">${escapeHtml(title)}</p>
                        </div>
                    </article>
                `;
            })
            .join('');

        const empty = cards.length === 0;
        const first = cards[0];

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }

                .staff-feed {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 2rem 5% 3rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .staff-feed-headline {
                    margin: 0 0 1.5rem;
                    font-size: clamp(1.25rem, 1.2vw, 2rem);
                    font-variation-settings: var(--fv-title);
                    letter-spacing: 0.06em;
                    color: var(--c2, #000);
                    text-align: center;
                    margin-bottom: 3rem;
                    width: 100%;
                    max-width: min(100%, 72rem);
                    box-sizing: border-box;
                }

                .staff-feed-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 1.5rem 2rem;
                    align-items: start;
                    justify-items: stretch;
                    width: 100%;
                    max-width: min(100%, 80rem);
                    margin-inline: auto;
                    box-sizing: border-box;
                }

                .staff-card {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    box-sizing: border-box;
                    overflow: hidden;
                }

                .staff-card-image {
                    width: 100%;
                    aspect-ratio: 4 / 5;
                    overflow: hidden;
                    background: var(--c3, #e8e8e8);
                }

                .staff-card-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center;
                    display: block;
                    max-width: none;
                    max-height: none;
                    margin: 0;
                }

                .staff-card-body {
                    padding: 0 1rem 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }

                .staff-card-name {
                    margin: 0;
                    font-size: clamp(1rem, 1.5vw, 1.8rem);
                    font-variation-settings: var(--fv-nav);
                    letter-spacing: 0.04em;
                    line-height: 1.2;
                    color: var(--c2, #000);
                }

                .staff-card-title {
                    margin: 0;
                    font-size: clamp(0.8rem, 1.1vw, 1.2rem);
                    font-variation-settings: var(--fv-card-title);
                    line-height: 1;
                    color: var(--c2, #000);
                }

                #staffDetailsExpanded {
                    width: 81%;
                    height: 20vh;
                    padding: 2rem;
                    margin-bottom: 2rem;
                    margin-left: 9.5%;
                    margin-right: 9.5%;
                }

                .staff-card-content {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .staff-card-meta-container {
                    width: 100%;
                    height: 50%;
                    display: flex;
                    flex-direction: row;
                    gap: 0.5rem;
                    font-variation-settings: var(--fv-headline);
                    line-height: 1.2;
                }

                #metacontLeft {
                    width: 35%;
                    height: 50%;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .staff-card-meta,
                .staff-card-focus {
                    margin: 0;
                    font-size: clamp(0.72rem, 0.95vw, 0.95rem);
                    color: var(--c2, #000);
                    opacity: 0.95;
                }

                .staff-card-focus {
                    font-variation-settings: var(--fv-title);
                }

                .staff-card-brief {
                    margin: 0.25rem 0 0;
                    font-size: clamp(0.7rem, 1vw, 1.1rem);
                    font-variation-settings: var(--fv-label);
                    line-height: 1.45;
                    color: var(--c2, #000);
                    width: 74%;
                    padding-left: 12%;
                    padding-right: 20%;
                }

                .staff-card-quote {
                    padding-left: 12%;
                    padding-right: 12%;
                    font-size: clamp(0.7rem, 3.5vw, 2rem);
                    font-variation-settings: var(--fv-label);
                    line-height: 1.4;
                    color: var(--c2, #000);
                    margin-top: 3rem;
                }

                .staff-feed--empty {
                    padding: 1rem;
                    color: var(--c2, #000);
                    opacity: 0.8;
                }

                @media (max-width: 1024px) {
                    .staff-feed-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }

                @media (max-width: 640px) {
                    .staff-feed-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            ${
                empty
                    ? `<div class="staff-feed staff-feed--empty" part="staff-feed">No staff cards in context content.</div>`
                    : `<section class="staff-feed" part="staff-feed">
                        <h2 class="staff-feed-headline">${escapeHtml(headline)}</h2>
                        <div class="staff-feed-grid">${cardsHtml}</div>
                        <div id="staffDetailsExpanded">
                            <div class="staff-card-content">
                                <div class="staff-card-meta-container">
                                    <div id="metacontLeft">
                                        <p class="staff-card-meta">Location:${escapeHtml(first?.location)}</p>
                                        <p class="staff-card-meta">Languages:${escapeHtml(first?.languages)}</p>
                                        <p class="staff-card-focus">Focus:${escapeHtml(first?.focus)}</p>
                                    </div>
                                    <p class="staff-card-brief">${escapeHtml(first?.brief)}</p>
                                </div>
                                <blockquote class="staff-card-quote">"${escapeHtml(first?.quote)}"</blockquote>
                            </div>
                        </div>
                    </section>`
            }
        `;
    }
}

customElements.define('app-staff-feed', StaffFeedComponent);

export { StaffFeedComponent };
