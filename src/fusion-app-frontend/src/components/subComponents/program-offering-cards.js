/**
 * Program detail page: three offering cards from `programPage.offeringCards` (Studio / canister locales).
 * Same layout as `app-features-row` (CMS) but data comes from the program record, not `feature-cards` content.
 */

import {
    PH_LOADER_BASE_STYLES,
    PROGRAM_OFFERING_PENDING_WRAPPER_STYLES,
    programHeroLoaderHtml,
} from '../../utils/programHeroLoader.js';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class ProgramOfferingCardsComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Array<{ title: string, description: string }>} */
        this._cards = [];
        /** First `setOfferingCards` from `programView` not yet applied. */
        this._settled = false;
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

    attributeChangedCallback() {
        this.render();
    }

    /**
     * @param {Array<{ title?: string, description?: string }>} cards — max 3
     */
    setOfferingCards(cards) {
        this._settled = true;
        this._cards = Array.isArray(cards)
            ? cards
                  .slice(0, 3)
                  .map((c) => ({
                      title: typeof c?.title === 'string' ? c.title.trim() : '',
                      description: typeof c?.description === 'string' ? c.description.trim() : '',
                  }))
                  .filter((c) => c.title || c.description)
            : [];
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        if (!this._settled) {
            this.shadow.innerHTML = `
            <style>
                ${PH_LOADER_BASE_STYLES}
                ${PROGRAM_OFFERING_PENDING_WRAPPER_STYLES}
            </style>
            ${programHeroLoaderHtml({ wrapperClass: 'program-offering-pending-loader', ariaLabel: 'Loading' })}
        `;
            return;
        }

        const cards = this._cards;
        const cells = cards
            .map((c) => {
                return `
                    <article class="feature-card feature-card--no-cta" part="feature-card">
                        <h3 class="feature-card-title">${escapeHtml(c.title)}</h3>
                        <p class="feature-card-description">${escapeHtml(c.description)}</p>
                    </article>
                `;
            })
            .join('');

        const empty = cards.length === 0;
        // const rowMarginStyle =
        //     'margin-top:150px;';

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }

                .features-row {
                    width: 100%;
                    height: max-content;
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
                    padding-bottom: 13%;
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

                .features-row--empty {
                    display: none;
                }

                @media (max-width: 900px) {
                    .features-row {
                        grid-template-columns: 1fr;
                    }
                    .feature-card {
                        border-right: none;
                        border-bottom: 1px solid var(--c2, #000);
                    }
                    .feature-card:last-child {
                        border-bottom: none;
                    }
                }

                @media (max-width: 768px) {
                    .features-row {
                        margin-top: 40px;
                        height: auto;
                        min-height: 0;
                    }

                    .feature-card-title {
                        font-size: clamp(1.3rem, 1.4vw, 1.35rem);
                        border-bottom: 1px solid var(--c2, #000);
                        padding-bottom: 0.35rem;
                    }

                    .feature-card-description {
                        font-size: clamp(0.95rem, 1.2vw, 1.2rem);
                    }
                }
            </style>
            ${
                empty
                    ? `<div class="features-row features-row--empty" part="features-row"></div>`
                    : `<div class="features-row" part="features-row">${cells}</div>`
            }
        `;
    }
}

customElements.define('app-program-offering-cards', ProgramOfferingCardsComponent);

export { ProgramOfferingCardsComponent };
