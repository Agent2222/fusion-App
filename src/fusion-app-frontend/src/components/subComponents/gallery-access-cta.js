import { navigate } from '../../router.js';

/** @param {unknown} raw */
function resolveGalleryAccessCtaHref(raw) {
    const s = raw == null || raw === '' ? '' : String(raw).trim();
    if (!s || s === '#' || s === '/request/gallery-access') return '/gallery-access';
    return s;
}

/** @param {string} s */
function escapeAttr(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
}

class GalleryAccessCtaComponent extends HTMLElement {
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

    setGalleryAccessCta(data) {
        this.data = data;
        this.render();
    }

    getGalleryAccessCta() {
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

    createCTA() {
        const root = this.shadowRoot;
        if (!root || !this.data || typeof this.data !== 'object') return;

        const loc =
            typeof window !== 'undefined' && typeof window.getLocale === 'function'
                ? window.getLocale()
                : 'en';
        const slice = this.data[loc] || this.data.en || this.data.ja || {};
        const cta = slice.cta ?? '';
        const ctaHref = resolveGalleryAccessCtaHref(this.data.ctaLink);
        const ctaHeadText = slice.ctaHeadText ?? '';
        const ctaSubText = slice.ctaSubText ?? '';

        const content = root.querySelector('.content');
        if (!content) return;
        content.replaceChildren();

        const ctaEl = document.createElement('div');
        ctaEl.classList.add('gallery-access-cta');

        ctaEl.innerHTML = `
            <div class="gallery-access-cta-content">
                <div class="gallery-access-cta-head-text">${ctaHeadText}</div>
                <div class="gallery-access-cta-sub-text">${ctaSubText}</div>
            </div>
            <div class="gallery-access-cta-button">
                <div class="gallery-access-cta-button-link" id="gallery-access-cta-button-link">
                    <a href="${escapeAttr(ctaHref)}">${cta}</a>
                </div>
            </div>
        `;
        const a = ctaEl.querySelector('.gallery-access-cta-button-link a');
        if (a) {
            a.addEventListener('click', (e) => {
                if (ctaHref.startsWith('/') && !ctaHref.startsWith('//')) {
                    e.preventDefault();
                    navigate(ctaHref);
                }
            });
        }
        content.appendChild(ctaEl);
    }

    openRequestModal() {
        console.log('openRequestModal');
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

                .gallery-access-cta {
                    width: 100%;
                    height: calc(64vh);
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 20% 80%;
                    overflow: hidden;
                    justify-items: center;
                    align-items: center;
                }
                
                .header {
                    width: 98%;
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
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    overflow: hidden;
                    justify-content: center;
                    align-items: center;
                }
                
                .gallery-access-cta-content {
                    width: 100%;
                    height: 100%;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    overflow: hidden;
                    justify-content: center;
                    align-items: center;
                }
                
                .gallery-access-cta-head-text {
                    width: 100%;
                    height: 100%;
                    font-size: clamp(1.2rem, 2.2vw, 3rem);
                    font-variation-settings: var(--fv-headline-wide);
                    letter-spacing: 0.02em;
                    user-select: none;
                    overflow: hidden;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                }
                
                .gallery-access-cta-sub-text {
                    width: 100%;
                    height: 100%;
                    font-size: clamp(1rem, 1.5vw, 2rem);
                    font-variation-settings: var(--fv-label);
                    user-select: none;
                    overflow: hidden;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    line-height: 1.2;
                }
                
                .gallery-access-cta-button {
                    width: 100%;
                    height: 92%;
                    display: flex;
                    justify-content: center;
                    align-items: start;
                    padding-top: 8%;
                }
                
                .gallery-access-cta-button-link {
                    width: 200px;
                    height: 200px;
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    background-color: var(--c2);
                    color: var(--c3);
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                .gallery-access-cta-button-link:hover {
                    transform: scale(1.05);
                    transition: all 0.3s ease;
                }

                .gallery-access-cta-button-link:hover a {
                    text-decoration: underline;
                    font-variation-settings: var(--fv-label-strong);
                }

                .gallery-access-cta-button-link a {
                    color: var(--c3);
                    text-decoration: none;
                    font-size: 1.2rem;
                    font-variation-settings: var(--fv-body);
                    user-select: none;
                    overflow: hidden;
                    justify-content: center;
                    align-items: center;
                    transition: all 0.3s ease;
                }

                @media (max-width: 768px) {
                    .gallery-access-cta {
                        height: auto;
                        min-height: 48vh;
                        grid-template-rows: auto 1fr;
                        padding-bottom: 2rem;
                        margin-top: 10%;
                    }

                    .gallery-access-cta > .header {
                        display: none;
                    }

                    .gallery-access-cta-content {
                        width: 100%;
                        padding-left: 10%;
                        padding-right: 10%;
                        box-sizing: border-box;
                    }

                    .gallery-access-cta-head-text {
                        line-height: 1.2;
                        font-size: clamp(2rem, 4.2vw, 10rem);
                        margin-bottom: 5%;
                    }

                    .gallery-access-cta-button {
                        height: auto;
                        padding-top: 4%;
                    }

                    .gallery-access-cta-button-link {
                        width: min(200px, 58vw);
                        height: min(200px, 58vw);
                    }
                }

                @media (max-width: 480px) {
                    .header {
                        font-size: 1.15rem;
                    }
                }
            </style>
            <div class="gallery-access-cta">
                <div class="header">For Galleries & Curators</div>
                <div class="content"></div>
            </div>
        `;
    }
}

customElements.define('app-gallery-access-cta', GalleryAccessCtaComponent);

export { GalleryAccessCtaComponent };
