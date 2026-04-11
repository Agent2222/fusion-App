/**
 * Large left-aligned quote with a small right-aligned attribution link below.
 * Copy from `testData.quoteRow[context]` — `quote`, `attribution`, `attributionHref` per locale.
 */
import { testData } from '../../testData.js';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class QuoteRowComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
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
        return ['active', 'context'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active' || prop === 'context') {
            if (oldVal === newVal) return;
            this.render();
        }
    }

    connectedCallback() {
        window.addEventListener('fusion-localechange', this._onLocaleChange);
        this.render();
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-localechange', this._onLocaleChange);
    }

    _getSlice() {
        const ctx = this.getAttribute('context') || 'journal';
        const block = testData.quoteRow;
        if (!block || !block[ctx]) return null;
        return block[ctx];
    }

    render() {
        const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const slice = this._getSlice();
        const row = slice ? slice[locale] || slice.en : null;
        const quote = row?.quote ?? '';
        const attribution = row?.attribution ?? '';
        const hrefRaw = row?.attributionHref ?? '#';
        const href = String(hrefRaw).trim() || '#';

        if (!row) {
            this.shadow.innerHTML = `
                <style>:host { display: block; color: var(--c2); padding: 1rem; opacity: 0.85; }</style>
                <div part="empty">No quote copy for this context.</div>
            `;
            return;
        }

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .quote-row {
                    width: 100%;
                    max-width: 56rem;
                    box-sizing: border-box;
                    padding: 2.6rem 0 1.5rem;
                    margin: 10% auto;
                }

                .quote-text {
                    font-size: clamp(1.35rem, 3.4vw, 3rem);
                    font-variation-settings: var(--fv-emphasis);
                    line-height: 1.25;
                    letter-spacing: 0.02em;
                    color: var(--c2);
                    text-align: left;
                    white-space: pre-line;
                    margin: 0;
                    cursor: pointer;
                }

                .quote-attribution {
                    margin-top: 1.25rem;
                    text-align: right;
                }

                .quote-attribution a {
                    font-size: clamp(0.75rem, 1.15vw, 1rem);
                    font-variation-settings: var(--fv-subtitle);
                    color: var(--c2);
                    text-decoration: none;
                    border-bottom: 1px solid transparent;
                    transition: border-color 0.2s ease, opacity 0.2s ease;
                }

                .quote-attribution a:hover {
                    border-bottom-color: var(--c2);
                    opacity: 0.9;
                }

                @media (max-width: 768px) {
                    .quote-row {
                        margin: 6% auto;
                        padding: 2rem 1rem 1.25rem;
                    }
                }

                @media (max-width: 640px) {
                    .quote-text {
                        font-size: clamp(1.1rem, 4.2vw, 1.85rem);
                    }

                    .quote-attribution {
                        text-align: left;
                    }
                }
            </style>
            <blockquote class="quote-row" part="quote-row">
                <p class="quote-text">"${escapeHtml(quote)}"</p>
                <footer class="quote-attribution">
                    <a href="${escapeHtml(href)}">${escapeHtml(attribution)}</a>
                </footer>
            </blockquote>
        `;
    }
}

customElements.define('app-quote-row', QuoteRowComponent);

export { QuoteRowComponent };
