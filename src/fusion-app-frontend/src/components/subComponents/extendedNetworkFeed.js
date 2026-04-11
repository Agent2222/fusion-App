/**
 * Extended network grid — same card rhythm as `artistsFeed` (image + text), no pagination.
 * Data: `testData.context` merged by locale (`extendedNetworkTitle`, `extendedNetworkHeadline`, `extendedNetworkCards`).
 */
import { testData } from '../../testData.js';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getContextCopy() {
    const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
    const base = testData.context?.en || {};
    const loc = testData.context?.[locale] || {};
    return { ...base, ...loc };
}

class ExtendedNetworkFeedElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._shellReady = false;
        this._onLocaleChange = () => this.render();
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
        this.ensureShell();
        this.render();
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-localechange', this._onLocaleChange);
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

                .feed-header {
                    font-size: clamp(1rem, 1.2vw, 1.35rem);
                    font-variation-settings: var(--fv-display);
                    color: var(--c2);
                    padding-bottom: 0.75rem;
                    padding-left: 1%;
                    user-select: none;
                    text-align: center;
                }

                .feed-description {
                    font-size: clamp(0.85rem, 1vw, 1.05rem);
                    font-variation-settings: var(--fv-subtitle);
                    color: var(--c2);
                    line-height: 1.45;
                    max-width: 52rem;
                    padding-bottom: 2rem;
                    margin-bottom: 2rem;
                    text-align: center;
                    padding-left: 38%;
                    padding-right: 38%;
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
                    padding: 0.4rem 0.25rem 0.55rem;
                    background-color: var(--c3);
                    gap: 0.25rem;
                    height: 6rem;
                }

                .network-card-name {
                    font-size: clamp(1rem, 1.5vw, 1.8rem);
                    font-variation-settings: var(--fv-card-title);
                    color: var(--c2);
                    line-height: 1.2;
                    text-align: center;
                }

                .network-card-meta {
                    font-size: clamp(0.62rem, 1.1vw, 1.2rem);
                    font-variation-settings: var(--fv-card-title);
                    color: var(--c2);
                    line-height: 1.25;
                    text-align: center;
                    opacity: 0.9;
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

        const ctx = getContextCopy();
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
            grid.innerHTML = `<div class="feed-empty">No extended network cards in testData.context</div>`;
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
