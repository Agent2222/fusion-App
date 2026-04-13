import { navigate } from '../../router.js';

// Placeholder — structure, content, and styles TBD
class ProgramHeroComponent extends HTMLElement {
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

    setProgram(data) {
        this.data = data;
        this.render();
    }

    getProgram() {
        return this.data;
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
        this.render();
    }

    render() {
        const locale =
            typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const loc = this.data?.[locale] || {};
        const safeTxt = (v) => {
            if (v === undefined || v === null) return '';
            const s = String(v);
            return s === 'NaN' ? '' : s;
        };
        const imageSrc = this.data?.imageSrc;
        const imageAlt = loc.imageAlt;
        const location = safeTxt(loc.location);
        const season = safeTxt(loc.season);
        const year = safeTxt(loc.year);
        const cta = safeTxt(loc.cta);
        const route = loc.routeLink || this.data?.routeLink || '/programs';

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .program-hero {
                    width: 100%;
                    height: calc(100vh - 350px);
                    display: grid;
                    grid-template-columns: 55% 45%;
                    grid-template-rows: 1fr;
                    align-items: center;
                    justify-content: center;
                    gap: 2rem;
                    overflow: hidden;
                    padding-top: 80px;
                    padding-bottom: 120px;
                    user-select: none;
                }

                .program-hero-left {
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    overflow: hidden;
                }

                .program-hero-left img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .program-hero-right {
                    width: 80%;
                    height: 100%;
                    overflow: hidden;
                    padding-right: 20%;
                    user-select: none;
                }
                
                .program-hero-right-content {
                    width: 100%;
                    height: 100%;
                    display: grid   ;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr 1fr;
                    align-items: start;
                    justify-content: start;
                }

                .programCategory {
                    width: 240px;
                    height: 40px;
                    display: flex;
                    justify-self: end;
                    align-items: center;
                    justify-content: center;
                    font-size: .9rem;
                    font-variation-settings: var(--fv-body-wide);
                    letter-spacing: 0.08em;
                    background-color: var(--c2);
                    color: var(--c3);
                    text-align: center;
                }
                    
                .programLocationDate {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: start;
                    justify-content: start;
                }

                .programLocation {
                    font-size: clamp(3rem, 4.4vw, 5rem);
                    font-variation-settings: var(--fv-headline);
                    letter-spacing: 0.02em;
                    color: var(--c2);
                    text-align: start;
                    line-height: 1;
                    margin-top: 4%;
                }

                .programDate {
                    font-size: clamp(5rem, 6.4vw, 7rem);
                    font-variation-settings: var(--fv-display);
                    letter-spacing: 0.02em;
                    line-height: 1;
                    color: var(--c2);
                    text-align: start;
                }

                .programCTA {
                    width: 60%;
                    height: 100%;
                    align-items: end;
                    align-self: end;
                    justify-content: end;
                    margin-top: 1%;
                    border-bottom: 1px solid var(--c2);
                    margin-left: 40%;
                    margin-top: 4%;
                    transition: all 0.3s ease;
                }
                
                .ctaButton {
                    width: 200px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: end;
                    justify-self: end;
                    background-color: var(--c3);
                    color: var(--c2);
                    line-height: 1.3;
                    padding-right: 5%;
                    margin-top: 4%;
                    font-size: 1.2rem;
                    font-variation-settings: var(--fv-hero);
                    cursor: pointer;
                    transition: all 0.3s ease;
                }


                .ctaButton:hover {
                    background-color: var(--c5);
                }

                .programCTA:has(.ctaButton:hover) {
                    width: 80%;
                    margin-left: 20%;
                }

                @media (max-width: 1024px) {
                    .program-hero {
                        grid-template-columns: 1fr;
                        grid-template-rows: auto auto;
                        height: auto;
                        min-height: min(70vh, 720px);
                        padding-top: clamp(2rem, 6vw, 4rem);
                        padding-bottom: clamp(2rem, 8vw, 5rem);
                        gap: 1.25rem;
                        align-items: stretch;
                    }

                    .program-hero-left {
                        min-height: min(42vh, 380px);
                        max-height: 50vh;
                    }

                    .program-hero-right {
                        width: 90%;
                        padding-left: 5%;
                        padding-right: 5%;
                        margin-left: auto;
                        margin-right: auto;
                        height: auto;
                    }

                    .program-hero-right-content {
                        grid-template-rows: auto auto;
                    }

                    .programCategory {
                        justify-self: start;
                    }

                    .programCTA {
                        width: 100%;
                        margin-left: 0;
                    }

                    .programCTA:has(.ctaButton:hover) {
                        width: 100%;
                        margin-left: 0;
                    }

                    .ctaButton {
                        width: min(100%, 280px);
                    }
                }

                @media (max-width: 768px) {
                    .ctaButton {
                        width: min(100%, 180px);
                    }
                }

                @media (max-width: 640px) {
                    .programLocation {
                        font-size: clamp(1.75rem, 8vw, 2.5rem);
                    }

                    .programDate {
                        font-size: clamp(2.25rem, 10vw, 3.25rem);
                    }
                }

            </style>
            <div class="program-hero">
                <div class="program-hero-left">
                    <img src="${imageSrc}" alt="${imageAlt}">
                </div>
                <div class="program-hero-right">
                    <div class="program-hero-right-content">
                        <div class="gSpace"></div>
                        <div id="programDetails">
                            <div class="programCategory">
                                <div class="catButton">
                                    <p>${imageAlt}</p>
                                </div>
                            </div>
                            <div class="programLocationDate">
                                <div class="programLocation">
                                    ${location}
                                </div>
                                <div class="programDate">
                                    ${season} ${year}
                                </div>
                            </div>
                            <div class="programCTA">
                                <div class="ctaButton" role="button" tabindex="0" data-program-href="${route}">
                                    ${cta}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const ctaBtn = this.shadowRoot?.querySelector('.ctaButton[data-program-href]');
        if (ctaBtn) {
            const href = ctaBtn.getAttribute('data-program-href') || '/programs';
            const go = () => navigate(href);
            ctaBtn.addEventListener('click', (e) => {
                e.preventDefault();
                go();
            });
            ctaBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    go();
                }
            });
        }
    }
}

customElements.define('app-program-hero', ProgramHeroComponent);

export { ProgramHeroComponent };
