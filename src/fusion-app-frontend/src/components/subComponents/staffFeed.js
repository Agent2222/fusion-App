/**
 * Staff grid for the Context page — CMS `context` bundle, EN merged with active locale.
 */
import { getContentBundleForStudio, subscribeDataSource } from '../../utils/database.js';
import { withSeoImageAlt } from '../../utils/mediaAltSeo.js';

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

/** Viewport width at which staff detail panel moves under the selected card (see `_placeStaffDetailsPanel`). */
const STAFF_DETAIL_MOBILE_MAX_PX = 768;

class StaffFeedComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Record<string, unknown> | null} */
        this._contextBundle = null;
        /** @type {(() => void) | null} */
        this._unsubData = null;
        /** @type {(() => void) | null} */
        this._unsubStaffDetailMql = null;
        /** Selected staff index for detail panel (desktop + mobile placement). */
        this._selectedStaffIndex = 0;
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
        if (this._unsubStaffDetailMql) {
            this._unsubStaffDetailMql();
            this._unsubStaffDetailMql = null;
        }
        if (this._unsubData) {
            this._unsubData();
            this._unsubData = null;
        }
    }

    async _loadContext() {
        this._contextBundle = await getContentBundleForStudio('context', { forStudio: false });
        this.render();
    }

    /**
     * Move `#staffDetailsExpanded` after the grid (desktop) or into the selected card’s
     * `.staff-card-mobile-detail` (narrow viewports) so mobile users see copy without scrolling past the grid.
     */
    _placeStaffDetailsPanel() {
        const root = this.shadowRoot;
        if (!root) return;
        const details = root.getElementById('staffDetailsExpanded');
        const grid = root.querySelector('.staff-feed-grid');
        const feed = root.querySelector('.staff-feed');
        if (!details || !grid || !feed) return;

        const mobile =
            typeof window !== 'undefined' &&
            window.matchMedia(`(max-width: ${STAFF_DETAIL_MOBILE_MAX_PX}px)`).matches;
        const idx = Math.min(Math.max(0, this._selectedStaffIndex), root.querySelectorAll('.staff-card').length - 1);
        const articles = root.querySelectorAll('.staff-card');

        if (mobile && articles[idx]) {
            const slot = articles[idx].querySelector('.staff-card-mobile-detail');
            if (slot) {
                slot.appendChild(details);
                return;
            }
        }
        grid.insertAdjacentElement('afterend', details);
    }

    /**
     * @param {Array<Record<string, unknown>>} cards
     */
    _wireStaffCardInteractions(cards) {
        const root = this.shadowRoot;
        if (!root || !cards.length) return;

        const articles = root.querySelectorAll('.staff-card');
        const names = root.querySelectorAll('.staff-card-name');
        const metacont = root.getElementById('metacontLeft');
        const briefEl = root.querySelector('.staff-card-brief');
        const quoteEl = root.querySelector('.staff-card-quote');
        if (!metacont || !briefEl || !quoteEl) return;

        const locEl = metacont.querySelector('[data-staff-field="location"]');
        const langEl = metacont.querySelector('[data-staff-field="languages"]');
        const focusEl = metacont.querySelector('[data-staff-field="focus"]');

        if (this._unsubStaffDetailMql) {
            this._unsubStaffDetailMql();
            this._unsubStaffDetailMql = null;
        }
        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
            const mql = window.matchMedia(`(max-width: ${STAFF_DETAIL_MOBILE_MAX_PX}px)`);
            const onMq = () => this._placeStaffDetailsPanel();
            if (typeof mql.addEventListener === 'function') {
                mql.addEventListener('change', onMq);
                this._unsubStaffDetailMql = () => mql.removeEventListener('change', onMq);
            } else {
                mql.addListener(onMq);
                this._unsubStaffDetailMql = () => mql.removeListener(onMq);
            }
        }

        const apply = (index) => {
            const c = cards[index];
            if (!c) return;

            this._selectedStaffIndex = index;

            if (locEl) locEl.textContent = `Location:${String(c.location ?? '')}`;
            if (langEl) langEl.textContent = `Languages:${String(c.languages ?? '')}`;
            if (focusEl) focusEl.textContent = `Focus:${String(c.focus ?? '')}`;
            briefEl.textContent = String(c.brief ?? '');
            const q = String(c.quote ?? '');
            quoteEl.textContent = q ? `"${q}"` : '';

            names.forEach((el, i) => {
                el.classList.toggle('staff-card-name--selected', i === index);
            });
            articles.forEach((el, i) => {
                el.setAttribute('aria-pressed', i === index ? 'true' : 'false');
            });

            this._placeStaffDetailsPanel();
        };

        articles.forEach((article, index) => {
            const open = () => apply(index);
            article.addEventListener('click', open);
            article.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open();
                }
            });
        });

        apply(0);
    }

    render() {
        const ctx = getContextCopyFromBundle(this._contextBundle);
        const headline = ctx.staffHeadline ?? '';
        const cards = Array.isArray(ctx.staffCards) ? ctx.staffCards : [];

        const cardsHtml = cards
            .map((card, index) => {
                const name = card.name ?? '';
                const title = card.title ?? '';
                const imageSrc = card.image ?? '';
                return `
                    <article class="staff-card" part="staff-card" data-staff-index="${index}" tabindex="0" role="button" aria-pressed="${index === 0 ? 'true' : 'false'}">
                        <div class="staff-card-image">
                            <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(withSeoImageAlt(name))}" width="400" height="480" />
                        </div>
                        <div class="staff-card-body">
                            <h3 class="staff-card-name${index === 0 ? ' staff-card-name--selected' : ''}">${escapeHtml(name)}</h3>
                            <p class="staff-card-title">${escapeHtml(title)}</p>
                            <div class="staff-card-mobile-detail" aria-live="polite"></div>
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
                    cursor: pointer;
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
                    transform-origin: center top;
                }

                .staff-card:hover > .staff-card-image > img {
                    animation: staffScaleImage 15s ease forwards;
                }

                @keyframes staffScaleImage {
                    from {
                        transform: scale(1);
                    }
                    to {
                        transform: scale(1.2);
                    }
                }

                .staff-card-body {
                    padding: 0 1rem 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }

                /* Filled on narrow viewports only — holds the shared #staffDetailsExpanded under the active card */
                .staff-card-mobile-detail {
                    display: none;
                }

                @media (min-width: 769px) {
                    .staff-card-mobile-detail {
                        display: none !important;
                    }
                }

                .staff-card-name {
                    margin: 0;
                    font-size: clamp(1rem, 1.5vw, 1.8rem);
                    font-variation-settings: var(--fv-nav);
                    letter-spacing: 0.04em;
                    line-height: 1.2;
                    color: var(--c2, #000);
                }

                .staff-card-name--selected {
                    text-decoration: underline;
                    text-underline-offset: 0.15em;
                }

                .staff-card:hover .staff-card-name {
                    text-decoration: underline;
                    text-underline-offset: 0.15em;
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

                @media (max-width: 768px) {
                    .staff-card-mobile-detail:not(:empty) {
                        display: block;
                        width: 100%;
                        margin-top: 0.5rem;
                    }

                    .staff-card-mobile-detail #staffDetailsExpanded {
                        width: 100%;
                        margin-left: 0;
                        margin-right: 0;
                        min-height: 0;
                    }

                    .staff-card-name {
                        text-align: center;
                        font-size: clamp(1.4rem, 1.5vw, 1.8rem);
                    }

                    .staff-card-title {
                        text-align: center;
                        font-size: clamp(0.9rem, 1.1vw, 1.2rem);
                    }

                    #staffDetailsExpanded {
                        width: 94%;
                        margin-left: 3%;
                        margin-right: 3%;
                        min-height: 28vh;
                        height: auto;
                        padding: 1.5rem 1.25rem;
                    }

                    .staff-card-meta,
                    .staff-card-focus {
                        font-size: clamp(0.85rem, 1.05vw, 1.05rem);
                    }

                    .staff-card-brief {
                        font-size: clamp(0.85rem, 1.1vw, 1.15rem);
                        width: 100%;
                        padding-left: 0;
                        padding-right: 0;
                    }

                    .staff-card-quote {
                        font-size: clamp(1rem, 3.2vw, 1.85rem);
                        padding-left: 4%;
                        padding-right: 4%;
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
                                        <p class="staff-card-meta" data-staff-field="location">Location:${escapeHtml(first?.location)}</p>
                                        <p class="staff-card-meta" data-staff-field="languages">Languages:${escapeHtml(first?.languages)}</p>
                                        <p class="staff-card-focus" data-staff-field="focus">Focus:${escapeHtml(first?.focus)}</p>
                                    </div>
                                    <p class="staff-card-brief">${escapeHtml(first?.brief)}</p>
                                </div>
                                <blockquote class="staff-card-quote"></blockquote>
                            </div>
                        </div>
                    </section>`
            }
        `;

        if (!empty) {
            this._wireStaffCardInteractions(cards);
        }
    }
}

customElements.define('app-staff-feed', StaffFeedComponent);

export { StaffFeedComponent };
