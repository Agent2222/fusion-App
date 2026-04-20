import { navigate } from '../../router.js';
import { firstNonEmptyString, mergeLocaleDeep } from '../../utils/localeFallback.js';

// Compact program card block, modeled after program-hero.
class ProgramBlockComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.data = null;
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        const next = val === true || val === 'true' ? 'true' : 'false';
        if (this.getAttribute('active') === next) return;
        this.setAttribute('active', next);
    }

    setProgramBlock(data) {
        this.data = data;
        this.render();
    }

    // Alias to match program-hero usage style.
    setProgram(data) {
        this.setProgramBlock(data);
    }

    getProgramBlock() {
        return this.data;
    }

    static get observedAttributes() {
        return ['active', 'layout'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active') {
            if (oldVal === newVal) return;
            this.render();
        }
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
        const layout = this.getAttribute('layout') === 'right' ? 'right' : 'left';
        const enLoc = this.data?.en && typeof this.data.en === 'object' ? this.data.en : {};
        const jaLoc = this.data?.ja && typeof this.data.ja === 'object' ? this.data.ja : {};
        const localized =
            locale === 'ja'
                ? /** @type {Record<string, unknown>} */ (mergeLocaleDeep(enLoc, jaLoc))
                : /** @type {Record<string, unknown>} */ (enLoc);

        const imageSrc = firstNonEmptyString(this.data?.imageSrc, jaLoc?.imageSrc, enLoc?.imageSrc);
        const imageAlt = localized.imageAlt || localized.title || 'Program';
        const focus = localized.focus || localized.imageAlt || '';
        const location = localized.location || '';
        const season = localized.season || '';
        const year = localized.year || '';
        const cta = localized.cta || 'Learn More';
        const route = this.data?.routeLink || '/programs';
        const briefDescription = localized.briefDescription || '';
        const totalSlots = this.data?.totalSlots || localized.totalSlots || 0;
        const availableSlots = this.data?.availableSlots || localized.availableSlots || 0;
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    container-type: inline-size;
                    container-name: program-block;
                }

                .program-block {
                    width: 99%;
                    min-height: 50vh;
                    max-height: 75vh;
                    display: grid;
                    grid-template-rows: 1fr;
                    gap: 1%;
                    padding: 1rem 0;
                    box-sizing: border-box;
                    margin-bottom: 9rem;
                }

                .left {
                    grid-template-columns: 60% 40%;
                }

                .right {
                    grid-template-columns: 40% 60%;
                    text-align: right;
                }

                .right .category {
                    justify-self: end;
                }

                .right .image-wrap {
                    order: 2;
                }

                .right .content {
                    order: 1;
                    padding: 0.5rem 0 0.5rem 0.5rem;
                    text-align: right;
                }

                .right .brief-description {
                    padding-left: 24%;
                }

                .image-wrap {
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    background: var(--c3);
                }

                .image-wrap img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.35s ease;
                }

                .program-block:hover .image-wrap img {
                    transform: scale(1.04);
                }

                .content {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                .content-inner {
                    width: 96%;
                    height: 50%;
                    display: grid;
                    grid-template-rows: auto auto auto;
                    gap: 1rem;
                    align-content: start;
                    padding-left: 2%;
                    padding-right: 2%;
                    box-sizing: border-box;
                    user-select: none;
                }

                .category {
                    width: fit-content;
                    max-width: 100%;
                    padding: 0.35rem 0.75rem;
                    font-size: 0.6rem;
                    font-variation-settings: var(--fv-caption);
                    letter-spacing: 0.07em;
                    background: var(--c2);
                    color: var(--c3);
                    text-transform: uppercase;
                }

                .location-date-year {
                    width: 100%;
                    height: auto;
                    display: flex;
                    flex-direction: column;
                }

                .location {
                    font-size: clamp(1.8rem, 3.4vw, 3.4rem);
                    font-variation-settings: var(--fv-headline);
                    line-height: 1;
                    color: var(--c2);
                }

                .date {
                    font-size: clamp(1.6rem, 1vw, 4rem);
                    font-variation-settings: var(--fv-body);
                    line-height: 1.2;
                    color: var(--c2);
                    margin-top: 0.4rem;
                }

                .year {
                    font-size: clamp(1.6rem, 1vw, 4rem);
                    font-variation-settings: var(--fv-body);
                    line-height: 1;
                    color: var(--c2);
                }

                .brief-description {
                    height: 80%;
                    width: 76%;
                    font-size: clamp(1rem, 1vw, 1.5rem);
                    font-variation-settings: var(--fv-body);
                    line-height: 1.2;
                    color: var(--c2);
                }

                .slots {
                    font-size: 1rem;
                    font-variation-settings: var(--fv-body);
                    line-height: 1.2;
                    color: var(--c2);
                    letter-spacing: 0.04em;
                }

                .slots-number {
                    font-size: clamp(1.2rem, 1vw, 4rem);
                    font-variation-settings: var(--fv-hero-wide);
                    letter-spacing: 0.02em;
                }

                .cta-row {
                    width: 50%;
                    margin-left: 40%;
                    display: flex;
                    justify-content: flex-end;
                    border-bottom: 1px solid var(--c2);
                    transition: all 0.25s ease;
                    margin-top: 2rem;
                }

                .right .cta-row {
                    margin-left: auto;
                    margin-right: 40%;
                    justify-content: flex-start;
                }

                .cta-button {
                    min-width: 180px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    padding: 0 0.75rem;
                    box-sizing: border-box;
                    font-size: 1rem;
                    font-variation-settings: var(--fv-cta);
                    color: var(--c2);
                    background: var(--c3);
                    cursor: pointer;
                    transition: background 0.25s ease;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }

                                    
                .right .cta-row .cta-button {
                    text-align: left;
                    padding: 0;
                    padding-left: 0.75rem;
                    justify-content: flex-start;
                }

                .cta-button:hover {
                    background: var(--c5);
                }

                .cta-row:has(.cta-button:hover) {
                    padding-left: 2rem;
                }

                @media (max-width: 900px) {
                    /* Drop viewport-capped height — it clips text + CTA and makes blocks overlap the next card */
                    .program-block {
                        grid-template-columns: 1fr;
                        grid-template-rows: minmax(220px, 42vh) auto;
                        min-height: 0;
                        max-height: none;
                        margin-bottom: 2.5rem;
                    }

                    .image-wrap {
                        min-height: 0;
                    }

                    .content {
                        height: auto;
                        min-height: 0;
                        padding: 0.75rem 0;
                        justify-content: flex-start;
                    }

                    .content-inner {
                        height: auto;
                        min-height: 0;
                    }

                    .brief-description {
                        height: auto;
                        min-height: 0;
                        max-height: none;
                        width: 100%;
                    }

                    .cta-row {
                        justify-content: flex-start;
                        width: 100%;
                        margin-left: 0;
                    }

                    .right .cta-row {
                        margin-right: 0;
                    }
                }

                @container program-block (max-width: 520px) {
                    .left,
                    .right {
                        grid-template-columns: 1fr;
                        grid-template-rows: minmax(200px, 40vh) auto;
                    }

                    .program-block {
                        min-height: 0;
                        max-height: none;
                        margin-bottom: 2.5rem;
                    }

                    .image-wrap {
                        height: auto;
                        min-height: 0;
                    }

                    .content {
                        height: auto;
                        min-height: 0;
                        justify-content: flex-start;
                    }

                    .content-inner {
                        height: auto;
                        min-height: 0;
                    }

                    .brief-description {
                        height: auto;
                        width: 100%;
                    }

                    .right .image-wrap {
                        order: 1;
                    }

                    .right .content {
                        order: 2;
                        text-align: left;
                        padding: 0.75rem 0 0.5rem 0;
                    }

                    .right .brief-description {
                        padding-left: 0;
                    }

                    .cta-row {
                        width: 100%;
                        margin-left: 0;
                    }

                    .right .cta-row {
                        margin-right: 0;
                        justify-content: flex-end;
                    }
                }
            </style>
            <div class="program-block ${layout}">
                <div class="image-wrap">
                    <img src="${imageSrc}" alt="${imageAlt}">
                </div>
                <div class="content">
                    <div class="content-inner">
                        <div class="category">${focus}</div>
                        <div class="location-date-year">
                            <div class="location">${location}</div>
                            <div class="date">${season}</div>
                            <div class="year">${year}</div>
                        </div>
                        <div class="brief-description">${briefDescription}</div>
                        <div class="slots"><span class="slots-number">${availableSlots} </span> of <span class="slots-number">${totalSlots} </span> slots remaining</div>
                        <div class="cta-row">
                            <div class="cta-button" id="programBlockCTA">${cta}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const ctaEl = this.shadowRoot.getElementById('programBlockCTA');
        if (ctaEl) {
            ctaEl.addEventListener('click', () => {
                navigate(route);
            });
        }
    }
}

customElements.define('app-program-block', ProgramBlockComponent);

export { ProgramBlockComponent };
