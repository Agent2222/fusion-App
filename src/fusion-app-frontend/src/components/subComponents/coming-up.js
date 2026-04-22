import { navigate } from '../../router.js';
import { firstNonEmptyString, mergeLocaleDeep } from '../../utils/localeFallback.js';
import { escapeHtml } from '../../utils/textPreview.js';
import { withSeoImageAlt } from '../../utils/mediaAltSeo.js';

// Placeholder — structure, content, and styles TBD
class ComingUpComponent extends HTMLElement {
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

    setComingUp(data) {
        this.data = data;
        this.render();
        this.createCards();
    }

    getComingUp() {
        return this.data;
    }

    static get observedAttributes() {
        return ['active'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active') {
            if (oldVal === newVal) return;
            this.render();
            if (this.data) this.createCards();
        }
    }

    createCards() {
        const contentEl = this.shadowRoot?.querySelector('.content');
        if (!contentEl) return;

        const loc =
            typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const enArr = this.data?.programs?.en || [];
        const jaArr = this.data?.programs?.ja || [];
        const maxSlots = 3;
        const count = Math.min(maxSlots, enArr.length, jaArr.length);

        contentEl.replaceChildren();
        contentEl.classList.remove('oneColumn', 'twoColumn', 'threeColumn');
        if (count === 0) {
            contentEl.classList.add('oneColumn');
            return;
        }
        if (count === 1) contentEl.classList.add('oneColumn');
        else if (count === 2) contentEl.classList.add('twoColumn');
        else contentEl.classList.add('threeColumn');

        for (let i = 0; i < count; i++) {
            const enCard = enArr[i] || {};
            const jaCard = jaArr[i] || {};
            const card =
                loc === 'ja'
                    ? /** @type {Record<string, unknown>} */ (mergeLocaleDeep(enCard, jaCard))
                    : /** @type {Record<string, unknown>} */ (enCard);
            const location = card.location ?? '';
            const startDate = card.startDate ?? '';
            const endDate = card.endDate ?? '';
            const year = card.year ?? '';
            const imageSrc = firstNonEmptyString(jaCard?.imageSrc, enCard?.imageSrc) || '';
            const imageAlt = card.imageAlt ?? '';
            const focus = card.focus ?? '';
            const routeLink = card.routeLink ?? '';

            const cardEl = document.createElement('div');
            cardEl.classList.add('program-card');
            cardEl.addEventListener('click', () => {
                if (routeLink) navigate(routeLink);
            });
            cardEl.innerHTML = `
                <div class="program-card-image">
                    <div class="programFocus">${focus}</div>
                    <img src="${imageSrc}" alt="${escapeHtml(withSeoImageAlt(imageAlt))}">
                </div>
                <div class="program-card-content">
                    <div class="program-card-title">${location}</div>
                    <div class="programDates">
                        <div class="program-card-description">${startDate} - ${endDate}</div>
                        <div class="program-card-year">${year}</div>
                    </div>
                </div>
            `;

            contentEl.appendChild(cardEl);
        }
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .coming-up {
                    width: 100%;
                    height: calc(84vh - 100px);
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 8% 92%;
                    overflow: hidden;
                    padding-top: 60px;
                    padding-bottom: 0px;
                }

                .header {
                    width: 100%;
                    height: 100%;
                    font-size: 1.4rem;
                    font-variation-settings: var(--fv-display);
                    padding-left: 2%;
                    user-select: none;
                }

                .content {
                    width: 100%;
                    height: 100%;
                    display: grid;
                    grid-template-rows: 1fr;
                }

                .content.oneColumn {
                    grid-template-columns: 1fr;
                }

                .content.twoColumn {
                    grid-template-columns: 1fr 1fr;
                }

                .content.threeColumn {
                    grid-template-columns: 1fr 1fr 1fr;
                }

                .program-card {
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 60% 40%;
                    position: relative;
                    cursor: pointer;
                    transition: all 0.5s ease;
                }

                .program-card:hover > .program-card-content > .program-card-title {
                    text-decoration: underline;
                    transform: scale(1.05);
                }

                .program-card:hover > .program-card-image > img {
                    animation: scaleImage 15s ease forwards;
                }

                @keyframes scaleImage {
                    from {
                        transform: scale(1);
                    }
                    to {
                        transform: scale(1.2);
                    }
                }

                .program-card-image {
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    user-select: none;
                }
                
                .program-card-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: all 0.5s ease;
                }
                
                .program-card-content {
                    width: 95%;
                    height: 100%;
                    overflow: hidden;
                    padding-left: 5%;
                    display: flex;
                    flex-direction: column;
                    align-items: start;
                    justify-content: start;
                }
                
                .programFocus {
                    width: 40%;
                    height: 33px;
                    font-size: 1rem;
                    font-variation-settings: var(--fv-body-wide);
                    letter-spacing: 0.08em;
                    color: var(--c3);
                    background-color: var(--c2);
                    padding-left: 4%;
                    display: flex;
                    align-items: center;
                    justify-content: start;
                    position: absolute;
                    top: 4%;
                    right: 0;
                    z-index: 5;
                    user-select: none;
                }

                .program-card-title {
                    font-size: clamp(2rem, 2.2vw, 2.6rem);
                    font-variation-settings: var(--fv-emphasis);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                    margin-top: 2%;
                    user-select: auto;
                    transition: all 0.5s ease;
                }

                .programDates {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: start;
                    justify-content: start;
                }

                .program-card-description {
                    font-size: 1.4rem;
                    font-variation-settings: var(--fv-label-strong);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                    line-height: 1.2;
                }

                .program-card-year {
                    font-size: 1.4rem;
                    font-variation-settings: var(--fv-label-strong);
                    color: var(--c2);
                    letter-spacing: 0.02em;
                    line-height: 1.2;
                }

                @media (max-width: 1024px) {
                    .coming-up {
                        height: auto;
                        min-height: 50vh;
                        grid-template-rows: auto 1fr;
                        padding-top: 2rem;
                    }

                    /* Three cards: 2×2-style row wrap; one/two columns unchanged */
                    .content.threeColumn {
                        grid-template-columns: 1fr 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .content.oneColumn,
                    .content.twoColumn,
                    .content.threeColumn {
                        grid-template-columns: 1fr;
                    }

                    .coming-up {
                        padding-top: 1.25rem;
                    }
                }

                @media (max-width: 480px) {
                    .header {
                        font-size: 1.15rem;
                    }
                }

                @media (max-width: 768px) {
                    .header {
                        margin-bottom: 6%;
                    }

                    .programFocus {
                        width: 60%;
                        top: 0;
                    }
                }
            </style>
            <div class="coming-up">
                 <div class="header">Current & Upcoming</div>
                 <div class="content oneColumn"></div>
            </div>
        `;
    }
}

customElements.define('app-coming-up', ComingUpComponent);

export { ComingUpComponent };
