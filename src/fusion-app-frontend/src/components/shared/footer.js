// Footer Custom Element Component
import gsap from 'gsap';
import SymbolLogo from '../../../assets/Fusion-X-SymbolLogo.png';

/** Pixels from bottom to treat as "at bottom" (matches small rounding / subpixel). */
const BOTTOM_THRESHOLD_PX = 200;

class FooterComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {HTMLElement | null} */
        this._footerEl = null;
        /** Visible when scrolled to bottom while active; avoids redundant gsap. */
        this._footerScrollVisible = false;
        this._onScrollBound = null;
        this._onRouteChangeBound = null;
        /** @type {HTMLElement[]} */
        this._scrollTargetsAttached = [];
    }

    get active() {
        return this.getAttribute('active') || false;
    }

    set active(val) {
        this.setAttribute('active', val);
    }

    static get observedAttributes() {
        return ['active'];
    }

    attributeChangedCallback(prop, oldVal, newVal) {
        if (prop === 'active') {
            if (newVal === 'true') {
                this.attachScrollRevealBehavior();
                this.syncFooterVisibilityFromScroll();
            } else {
                this.detachScrollRevealBehavior();
                this._footerScrollVisible = false;
                this.hideFooter();
            }
        }
    }

    /** @param {HTMLElement} el */
    _isScrolledToBottom(el) {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const maxScrollTop = scrollHeight - clientHeight;
        // Don't auto-show on route switch when content doesn't overflow
        // (or when the user is still at the very top).
        if (maxScrollTop <= 0 || scrollTop <= 0) return false;
        const remaining = scrollHeight - scrollTop - clientHeight;
        return remaining <= BOTTOM_THRESHOLD_PX;
    }

    showFooter() {
        const el = this._footerEl || this.shadow.querySelector('footer');
        if (!el) return;
        gsap.to(el, {
            opacity: 1,
            duration: 0.35,
            y: 0,
            ease: 'power2.inOut',
            pointerEvents: 'auto',
            overwrite: 'auto',
        });

        let headerEl = document.getElementById('header').shadow.querySelector('#logoHeader');
        if (headerEl) {
            gsap.to(headerEl, {
                delay: 0.15,
                opacity: 0,
                pointerEvents: 'none',
                duration: 0.35,
                ease: 'power2.inOut',
                overwrite: 'auto',
            });
        }
    }

    hideFooter() {
        const el = this._footerEl || this.shadow.querySelector('footer');
        if (!el) return;
        gsap.to(el, {
            opacity: 0,
            duration: 0.35,
            y: '100%',
            ease: 'power2.inOut',
            pointerEvents: 'none',
            overwrite: 'auto',
        });
        
    }

    _setFooterScrollVisible(visible) {
        if (visible === this._footerScrollVisible) return;
        this._footerScrollVisible = visible;
        if (visible) {
            this.showFooter();
        } else {
            this.hideFooter();
        }
    }

    /** @param {HTMLElement} el */
    _handleScrollEvent(el) {
        if (this.getAttribute('active') !== 'true') return;
        this._setFooterScrollVisible(this._isScrolledToBottom(el));
    }

    syncFooterVisibilityFromScroll() {
        if (this.getAttribute('active') !== 'true') return;
        const targets = this._scrollTargetsAttached;
        if (!targets.length) {
            this._setFooterScrollVisible(false);
            return;
        }
        for (const el of targets) {
            if (this._isScrolledToBottom(el)) {
                this._setFooterScrollVisible(true);
                return;
            }
        }
        this._setFooterScrollVisible(false);
    }

    attachScrollRevealBehavior() {
        this.detachScrollRevealBehavior();
        this._onScrollBound = (e) => this._handleScrollEvent(/** @type {HTMLElement} */ (e.currentTarget));
        this._onRouteChangeBound = () => {
            this.bindScrollTargets();
            this.syncFooterVisibilityFromScroll();
        };
        window.addEventListener('routeChange', this._onRouteChangeBound);
        this.bindScrollTargets();
    }

    bindScrollTargets() {
        if (this._onScrollBound) {
            for (const el of this._scrollTargetsAttached) {
                el.removeEventListener('scroll', this._onScrollBound);
            }
        }
        this._scrollTargetsAttached = [];
        const targets = [
            document.getElementById('homeMainContent'),
            document.getElementById('mainContent'),
            document.getElementById('artistsMainContent'),
            document.getElementById('programsMainContent'),
            document.getElementById('editionsMainContent'),
            document.getElementById('galleryAccessMainContent'),
            document.getElementById('journalMainContent'),
        ].filter(Boolean);
        for (const el of targets) {
            el.addEventListener('scroll', this._onScrollBound, { passive: true });
            this._scrollTargetsAttached.push(el);
        }
    }

    detachScrollRevealBehavior() {
        if (this._onRouteChangeBound) {
            window.removeEventListener('routeChange', this._onRouteChangeBound);
            this._onRouteChangeBound = null;
        }
        if (this._onScrollBound) {
            for (const el of this._scrollTargetsAttached) {
                el.removeEventListener('scroll', this._onScrollBound);
            }
        }
        this._scrollTargetsAttached = [];
        this._onScrollBound = null;
    }

    connectedCallback() {
        this.render();
        this._footerEl = this.shadow.querySelector('footer');
        this.attachEventListeners();
        if (this.getAttribute('active') === 'true') {
            this.attachScrollRevealBehavior();
            requestAnimationFrame(() => this.syncFooterVisibilityFromScroll());
        }
    }

    disconnectedCallback() {
        this.detachScrollRevealBehavior();
    }

    attachEventListeners() {
        // Attach event listeners to elements within shadow DOM if needed
        // Example: social media links, newsletter signup, etc.
    }

    render() {
        this.shadow.innerHTML = `
            <style>
            :host {
                display: block;
            }
                
                footer {
                    height: 250px;
                    width: 98%;
                    padding-right: 2%;
                    padding-top: 2%;
                    padding-bottom: 2%;
                    overflow: hidden; 
                    display: grid;
                    grid-template-columns: 20% 80%;
                    grid-template-rows: 1fr;
                    align-items: center;
                    justify-content: center;
                    font-family: 'momochidori-variable', sans-serif;
                    font-variation-settings: var(--fv-body-wide);
                    opacity: 0;
                    transform: translateY(100%);
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 5;
                    will-change: transform, opacity;
                    background-color: var(--bg);
                    border-top: 1px solid var(--c2, #000);
                }

                a {
                    text-decoration: none;
                    color: var(--c2, #000);
                    transition: opacity 0.3s;
                }

                a:hover {
                    text-decoration: underline;
                }

                #footerLogo {
                    height: 100%;
                    width: auto;
                    display: flex;
                    align-items: center;
                    justify-content: start;
                }

                #footerLogo img {
                    width: 200px;
                    height: auto;
                    object-fit: contain;
                    scale: 1.2;
                }

                #footerContent {
                    display: grid;
                    height: 100%;
                    grid-template-columns: 1fr 1fr 1fr;
                    grid-template-rows: 1fr;
                    align-items: center;
                    justify-content: center;
                }

                .fcColumn {
                    height: 100%;
                    display: grid;
                    grid-template-rows: 80% 20%;
                    grid-template-columns: 1fr;
                    align-items: center;
                    justify-content: center;
                }

                .fcTop {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }

                .fcBottom {
                    height: 100%;
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 2rem;
                    font-size: clamp(0.85rem, 1vw, 1rem);
                    font-variation-settings: var(--fv-nav);
                }
                
                #footerLinks {
                    display: flex;
                    gap: 2rem;
                    justify-content: center;
                    font-size: 1.1rem;
                }

                #footerSocial {
                    display: flex;
                    gap: 1rem;
                    margin-left: auto;
                    justify-content: end;
                }

                #footerSocial a {
                    font-size: 0.9rem;
                }

                #footerCopyright {
                    width: 100%;
                    display: flex;
                    justify-content: end;
                    color: var(--c2, #000);
                    text-align: right;
                }

                #footerc2 {
                    width: 100%;
                    justify-items: center;
                    text-align: center;
                }

                #footerEmailLocations {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: start;
                    align-items: end;
                    text-align: right;
                    font-size: clamp(0.85rem, 1vw, 1.1rem);
                    font-variation-settings: var(--fv-nav);
                }

                #footerEmail {
                    font-size: clamp(0.85rem, 1vw, 1.1rem);
                    font-variation-settings: var(--fv-nav-active);
                }

                #globalLeadPartnerColumn {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: start;
                    align-items: start;
                    text-align: left;
                    font-size: clamp(0.85rem, 1vw, 1.1rem);
                    font-variation-settings: var(--fv-nav-active);
                    line-height: 1;
                }

                #leadPartner:hover {
                    text-decoration: underline;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                @media (max-width: 900px) {
                    footer {
                        height: auto;
                        min-height: 0;
                        width: 100%;
                        padding: 1.25rem 4% 1.75rem;
                        grid-template-columns: 1fr;
                        grid-template-rows: auto auto;
                        row-gap: 1.25rem;
                        align-items: start;
                    }

                    #footerLogo {
                        justify-content: center;
                        height: auto;
                    }

                    #footerLogo img {
                        scale: 1;
                        width: min(180px, 55vw);
                    }

                    #footerContent {
                        grid-template-columns: 1fr;
                        grid-template-rows: auto;
                        row-gap: 1.25rem;
                        height: auto;
                    }

                    .fcColumn {
                        height: auto;
                        grid-template-rows: auto auto;
                        row-gap: 0.75rem;
                    }

                    .fcBottom {
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 1rem 1.5rem;
                    }

                    #footerEmailLocations {
                        align-items: center;
                        text-align: center;
                    }

                    #footerCopyright {
                        justify-content: center;
                        text-align: center;
                    }

                    #globalLeadPartnerColumn {
                        align-items: center;
                        text-align: center;
                    }
                }

                @media (max-width: 768px) {
                    footer {
                        padding: 1rem 5% 1.5rem;
                    }

                    #footerLogo img {
                        width: min(160px, 50vw);
                    }

                    .fcBottom {
                        font-size: clamp(0.8rem, 2.8vw, 0.95rem);
                    }

                    #footerEmailLocations {
                        font-size: clamp(0.8rem, 2.8vw, 1rem);
                    }

                    #footerEmail {
                        font-size: clamp(0.8rem, 2.8vw, 1rem);
                    }

                    #globalLeadPartnerColumn {
                        font-size: clamp(0.8rem, 2.8vw, 1rem);
                    }
                }

                @media (max-width: 640px) {
                    footer {
                        padding: 0.875rem 5% 1.25rem;
                    }

                    #footerLinks {
                        flex-wrap: wrap;
                        gap: 1rem;
                    }
                }
            </style>
            <footer>
                <div id="footerLogo">
                    <img id="footerSymbolLogo" src="${SymbolLogo}" alt="Logo">
                </div>
                <div id="footerContent">
                    <div id="footerc1" class="fcColumn">
                        <div class="fcTop" id="globalLeadPartnerColumn">
                            <div id="leadPartner">Global Lead<br>Partner</div>
                        </div>
                        <div class="fcBottom">
                            <div id="footerSocialInstagram"><a href="#" target="_blank">Instagram</a></div>
                            <div id="footerSocialYoutube"><a href="#" target="_blank">Youtube</a></div>
                        </div>
                    </div>
                    <div id="footerc2" class="fcColumn">
                        <div class="fcTop"></div>
                        <div class="fcBottom">
                            <div id="footerCookies">Cookies</div>
                            <div id="footerPrivacy">Privacy</div>
                            <div id="footerTerms">Terms</div>
                        </div>
                    </div>
                    <div id="footerc3" class="fcColumn">
                        <div class="fcTop" id="footerEmailLocations">
                            <div id="footerEmail"><a href="mailto:info@fusionart.world">info@fusionart.world</a></div>
                            <div id="footerLocations">New York City / Tokyo / Ishikawa</div>
                        </div>
                        <div class="fcBottom">
                            <div id="footerCopyright">
                            © ${new Date().getFullYear()} Fusion Intl.
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }
}

customElements.define('app-footer', FooterComponent);

export { FooterComponent };

// Legacy function export for backward compatibility with existing code
export function renderFooter(active = false) {
    return `<app-footer id="footer" active="${active}"></app-footer>`;
}

export function initFooter() {
    // Component initializes automatically via connectedCallback
    // This function kept for backward compatibility
}
