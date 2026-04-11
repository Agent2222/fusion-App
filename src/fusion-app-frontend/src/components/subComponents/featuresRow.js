/**
 * Three feature cards in one row (`1 × 3` grid).
 * Data source: `testData.featureCards.groups` — pick a group with `data-area` matching `group.id`
 * (e.g. `context`, `programs`). Defaults to `context` if unset.
 * Optional per group: `marginTop`, `marginBottom` (CSS lengths for the features row).
 */
import { testData } from '../../testData.js';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class FeaturesRowComponent extends HTMLElement {
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
        return ['active', 'data-area'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active' || prop === 'data-area') {
            if (oldVal === newVal) return;
            this.render();
        }
    }

    /** @returns {string} */
    _getArea() {
        return (
            this.getAttribute('data-area') ||
            this.getAttribute('area') ||
            'context'
        );
    }

    connectedCallback() {
        window.addEventListener('fusion-localechange', this._onLocaleChange);
        this.render();
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-localechange', this._onLocaleChange);
    }

    _getGroup() {
        const area = this._getArea();
        const groups = testData.featureCards?.groups;
        if (!Array.isArray(groups)) return null;
        return groups.find((entry) => entry && entry.id === area) ?? null;
    }

    _getItems() {
        const g = this._getGroup();
        const items = g?.items;
        return Array.isArray(items) ? items : [];
    }

    /** @returns {{ marginTop: string, marginBottom: string }} */
    _getRowMargins() {
        const g = this._getGroup();
        const mt = g?.marginTop;
        const mb = g?.marginBottom;
        return {
            marginTop: mt != null && String(mt).trim() !== '' ? String(mt).trim() : '150px',
            marginBottom: mb != null && String(mb).trim() !== '' ? String(mb).trim() : '0',
        };
    }

    render() {
        const items = this._getItems();
        const locale = typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';

        const cells = items
            .slice(0, 3)
            .map((item) => {
                const loc = item[locale] || item.en || {};
                const title = loc.title ?? '';
                const description = loc.description ?? '';
                const ctaRaw = loc.cta;
                const hasCta = ctaRaw != null && String(ctaRaw).trim() !== '';
                const cta = hasCta ? String(ctaRaw) : '';
                const ctaBlock = hasCta
                    ? `<p class="feature-card-cta">${escapeHtml(cta)}</p>`
                    : '';
                const cardMod = hasCta ? '' : ' feature-card--no-cta';
                return `
                    <article class="feature-card${cardMod}" part="feature-card">
                        <h3 class="feature-card-title">${escapeHtml(title)}</h3>
                        <p class="feature-card-description">${escapeHtml(description)}</p>
                        ${ctaBlock}
                    </article>
                `;
            })
            .join('');

        const empty = items.length === 0;
        const { marginTop, marginBottom } = this._getRowMargins();
        const rowMarginStyle = `margin-top:${escapeHtml(marginTop)};margin-bottom:${escapeHtml(marginBottom)};`;

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }

                .features-row {
                    width: 100%;
                    height: 25vh;
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    grid-template-rows: auto;
                    box-sizing: border-box;
                    border-top: 1px solid var(--c2, #000);
                    border-bottom: 1px solid var(--c2, #000);
                }

                .feature-card {
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0.65rem;
                    padding: 4% 10%;
                    background: var(--bg, #fff);
                    box-sizing: border-box;
                    border-right: 1px solid var(--c2, #000);
                    position: relative;
                }

                .feature-card--no-cta {
                    padding-top: 13%;
                }

                .feature-card-title {
                    margin: 0;
                    font-size: clamp(1rem, 1.4vw, 1.35rem);
                    font-variation-settings: var(--fv-emphasis);
                    letter-spacing: 0.04em;
                    color: var(--c2, #000);
                    line-height: 1.2;
                }

                .feature-card-description {
                    margin: 0;
                    flex: 1;
                    font-size: clamp(0.75rem, 1.2vw, 0.95rem);
                    font-variation-settings: var(--fv-caption);
                    line-height: 1.45;
                    color: var(--c2, #000);
                    margin-top: 1rem;
                }

                .feature-card-cta {
                    width: 180px;
                    margin: 0;
                    font-size: clamp(0.6rem, 0.75vw, 0.75rem);
                    font-variation-settings: var(--fv-subtitle);
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    background-color: var(--c2);
                    color: var(--c3);
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    padding: 0.5rem 1rem;
                    margin-bottom: 1.5rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .feature-card-cta:hover {
                    background-color: var(--c3);
                    color: var(--c2);
                    font-variation-settings: var(--fv-hero);
                }

                .features-row--empty {
                    padding: 1.5rem;
                    text-align: center;
                    color: var(--c2, #000);
                    opacity: 0.8;
                    font-size: 0.9rem;
                }

                @media (max-width: 900px) {
                    .features-row {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            ${
                empty
                    ? `<div class="features-row features-row--empty" part="features-row" style="${rowMarginStyle}">No feature cards for area “${escapeHtml(this._getArea())}” (testData.featureCards.groups)</div>`
                    : `<div class="features-row" part="features-row" style="${rowMarginStyle}">${cells}</div>`
            }
        `;
    }
}

customElements.define('app-features-row', FeaturesRowComponent);

export { FeaturesRowComponent };
