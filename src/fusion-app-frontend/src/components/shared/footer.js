// Footer Custom Element Component
import gsap from 'gsap';
import SymbolLogo from '../../assets/Fusion-X-SymbolLogo.png';
import { withSeoImageAlt } from '../../utils/mediaAltSeo.js';
import './newsletterSubscribe.js';

/** Pixels from bottom to treat as "at bottom". */
const BOTTOM_THRESHOLD_PX = 80;
/** Mobile pull-down on the footer to dismiss it. */
const MOBILE_PULL_DISMISS_PX = 48;
const FOOTER_DISMISS_SCROLL_PX = 140;
const MOBILE_FOOTER_MQ = '(max-width: 1024px)';

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
        this._pullStartY = 0;
        this._pullDismissed = false;
        this._onFooterTouchStartBound = null;
        this._onFooterTouchMoveBound = null;
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
        this.style.pointerEvents = 'none';
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
        el.style.pointerEvents = 'none';
        this.style.pointerEvents = 'none';
        gsap.to(el, {
            opacity: 0,
            duration: 0.35,
            y: '100%',
            ease: 'power2.inOut',
            pointerEvents: 'none',
            overwrite: 'auto',
        });
    }

    /** Hand the next scroll back to the page body without requiring a tap. */
    _releaseScrollToPage() {
        const focused = this.shadow.activeElement;
        if (focused && typeof focused.blur === 'function') focused.blur();
        if (document.activeElement === this && typeof this.blur === 'function') this.blur();
        const scroller =
            document.getElementById('mainContent') ||
            this._scrollTargetsAttached[0] ||
            (document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null);
        if (!(scroller instanceof HTMLElement)) return;
        if (!scroller.hasAttribute('tabindex')) scroller.setAttribute('tabindex', '-1');
        try {
            scroller.focus({ preventScroll: true });
        } catch {
            try {
                scroller.focus();
            } catch {
                /* ignore */
            }
        }
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
    _isMobileFooter() {
        return typeof window !== 'undefined' && window.matchMedia(MOBILE_FOOTER_MQ).matches;
    }

    /** @returns {HTMLElement | null} */
    _scrollTargetAtBottom() {
        return this._scrollTargetsAttached.find((el) => this._isScrolledToBottom(el)) || null;
    }

    _nudgeScrollAwayFromBottom() {
        const el =
            this._scrollTargetAtBottom() ||
            this._scrollTargetsAttached[0] ||
            (document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null);
        if (!el) return;
        el.scrollTop = Math.max(0, el.scrollTop - FOOTER_DISMISS_SCROLL_PX);
    }

    _dismissFooterFromPull() {
        this._nudgeScrollAwayFromBottom();
        this._setFooterScrollVisible(false);
        this._releaseScrollToPage();
    }

    _onFooterTouchStart(e) {
        if (!this._isMobileFooter() || !this._footerScrollVisible) return;
        const t = e.changedTouches?.[0];
        if (!t) return;
        this._pullStartY = t.clientY;
        this._pullDismissed = false;
    }

    _onFooterTouchMove(e) {
        if (this._pullDismissed) return;
        if (!this._isMobileFooter() || this.getAttribute('active') !== 'true' || !this._footerScrollVisible) {
            return;
        }
        const t = e.changedTouches?.[0];
        if (!t) return;
        if (t.clientY - this._pullStartY >= MOBILE_PULL_DISMISS_PX) {
            this._pullDismissed = true;
            this._dismissFooterFromPull();
        }
    }

    _ensureFooterPullHandlers() {
        if (this._onFooterTouchStartBound) return;
        this._onFooterTouchStartBound = (e) => this._onFooterTouchStart(e);
        this._onFooterTouchMoveBound = (e) => this._onFooterTouchMove(e);
    }

    _attachFooterPullDismiss() {
        this._ensureFooterPullHandlers();
        const el = this._footerEl || this.shadow?.querySelector('footer');
        if (!(el instanceof HTMLElement)) return;
        el.addEventListener('touchstart', this._onFooterTouchStartBound, { passive: true });
        el.addEventListener('touchmove', this._onFooterTouchMoveBound, { passive: true });
    }

    _detachFooterPullDismiss() {
        const el = this._footerEl || this.shadow?.querySelector('footer');
        if (el instanceof HTMLElement && this._onFooterTouchStartBound) {
            el.removeEventListener('touchstart', this._onFooterTouchStartBound);
            el.removeEventListener('touchmove', this._onFooterTouchMoveBound);
        }
        this._onFooterTouchStartBound = null;
        this._onFooterTouchMoveBound = null;
        this._pullDismissed = false;
    }

    _handleScrollEvent(el) {
        if (this.getAttribute('active') !== 'true') return;
        this._setFooterScrollVisible(this._isScrolledToBottom(el));
    }

    _handleWindowScrollEvent() {
        if (this.getAttribute('active') !== 'true') return;
        const doc = document.scrollingElement || document.documentElement;
        if (!(doc instanceof HTMLElement)) return;
        this._setFooterScrollVisible(this._isScrolledToBottom(doc));
    }

    syncFooterVisibilityFromScroll() {
        if (this.getAttribute('active') !== 'true') return;
        const targets = this._scrollTargetsAttached;
        for (const el of targets) {
            if (this._isScrolledToBottom(el)) {
                this._setFooterScrollVisible(true);
                return;
            }
        }
        if (window.location.pathname.startsWith('/settings')) {
            const doc = document.scrollingElement || document.documentElement;
            if (doc instanceof HTMLElement && this._isScrolledToBottom(doc)) {
                this._setFooterScrollVisible(true);
                return;
            }
        }
        this._setFooterScrollVisible(false);
    }

    attachScrollRevealBehavior() {
        this.detachScrollRevealBehavior();
        this._onScrollBound = (e) => {
            if (e.currentTarget === window) {
                this._handleWindowScrollEvent();
                return;
            }
            this._handleScrollEvent(/** @type {HTMLElement} */ (e.currentTarget));
        };
        this._onRouteChangeBound = () => {
            this.bindScrollTargets();
            this.syncFooterVisibilityFromScroll();
        };
        window.addEventListener('routeChange', this._onRouteChangeBound);
        this._attachFooterPullDismiss();
        this.bindScrollTargets();
    }

    bindScrollTargets() {
        if (this._onScrollBound) {
            for (const el of this._scrollTargetsAttached) {
                el.removeEventListener('scroll', this._onScrollBound);
                if (this._onFooterTouchStartBound) {
                    el.removeEventListener('touchstart', this._onFooterTouchStartBound);
                    el.removeEventListener('touchmove', this._onFooterTouchMoveBound);
                }
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
            document.getElementById('settingsMainContent'),
        ].filter(Boolean);
        for (const el of targets) {
            el.addEventListener('scroll', this._onScrollBound, { passive: true });
            if (this._onFooterTouchStartBound) {
                el.addEventListener('touchstart', this._onFooterTouchStartBound, { passive: true });
                el.addEventListener('touchmove', this._onFooterTouchMoveBound, { passive: true });
            }
            this._scrollTargetsAttached.push(el);
        }
        if (window.location.pathname.startsWith('/settings')) {
            window.addEventListener('scroll', this._onScrollBound, { passive: true });
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
                if (this._onFooterTouchStartBound) {
                    el.removeEventListener('touchstart', this._onFooterTouchStartBound);
                    el.removeEventListener('touchmove', this._onFooterTouchMoveBound);
                }
            }
            window.removeEventListener('scroll', this._onScrollBound);
        }
        this._scrollTargetsAttached = [];
        this._onScrollBound = null;
        this._detachFooterPullDismiss();
    }

    connectedCallback() {
        this.render();
        this._footerEl = this.shadow.querySelector('footer');
        if (this.getAttribute('active') === 'true') {
            this.attachScrollRevealBehavior();
            requestAnimationFrame(() => this.syncFooterVisibilityFromScroll());
        }
    }

    disconnectedCallback() {
        this.detachScrollRevealBehavior();
    }

    render() {
        this.shadow.innerHTML = `
            <style>
            :host {
                display: block;
                pointer-events: none;
                /* Host must set semantic text color — body uses a fixed #333 that would otherwise inherit into the shadow tree. */
                color: var(--c2, #000000);
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
                    color: var(--c2, #000000);
                    opacity: 0;
                    transform: translateY(100%);
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 5;
                    will-change: transform, opacity;
                    background-color: var(--bg);
                    border-top: 1px solid var(--c2, #000000);
                }

                a,
                a:visited {
                    text-decoration: none;
                    color: var(--c2, #000000);
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
                    color: var(--c2, #000000);
                    text-align: right;
                }

                #footerc2 {
                    width: 100%;
                    justify-items: center;
                    text-align: center;
                }

                #footerNewsletter {
                    width: 100%;
                    max-width: 22rem;
                    margin-inline: auto;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 0 1rem;
                    box-sizing: border-box;
                }

                #footerNewsletter app-newsletter-subscribe {
                    width: 100%;
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

                #leadPartner {
                    color: var(--c2, #000000);
                }

                #leadPartner:hover {
                    text-decoration: underline;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                #leadPartnerTba {
                    margin: 0.35rem 0 0;
                    padding: 0;
                    font-size: clamp(0.65rem, 0.85vw, 0.85rem);
                    line-height: 1.35;
                    font-variation-settings: var(--fv-nav);
                    color: var(--c2, #000000);
                    opacity: 0.9;
                }

                #footerCookies,
                #footerPrivacy,
                #footerTerms,
                #footerLocations {
                    color: var(--c2, #000000);
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

                    #footerNewsletter {
                        max-width: min(18rem, 100%);
                        margin-inline: auto;
                    }
                }

                @media (max-width: 768px) {
                    footer {
                        width: 100%;
                        left: 0%;
                        right: auto;
                        padding: 1.25rem 8% 1.75rem;
                        min-height: 280px;
                        box-sizing: border-box;
                    }

                    #footerLogo img {
                        width: min(110px, 42vw);
                        height: auto;
                    }

                    #footerLinks {
                        font-size: clamp(1rem, 3.2vw, 1.2rem);
                    }

                    #footerSocial a {
                        font-size: clamp(0.95rem, 3vw, 1.1rem);
                    }

                    .fcBottom {
                        font-size: clamp(0.92rem, 3vw, 1.05rem);
                    }

                    #footerEmailLocations {
                        font-size: clamp(0.92rem, 3vw, 1.12rem);
                    }

                    #footerEmail {
                        font-size: clamp(0.92rem, 3vw, 1.12rem);
                    }

                    #globalLeadPartnerColumn {
                        font-size: clamp(0.92rem, 3vw, 1.12rem);
                    }

                    #leadPartnerTba {
                        font-size: clamp(0.78rem, 2.6vw, 0.95rem);
                    }
                }

                @media (max-width: 640px) {
                    footer {
                        padding: 1rem 6% 1.5rem;
                        min-height: 260px;
                    }

                    #footerLinks {
                        flex-wrap: wrap;
                        gap: 1rem;
                        font-size: clamp(0.95rem, 3.4vw, 1.15rem);
                    }

                    #footerSocial a {
                        font-size: clamp(0.92rem, 3.2vw, 1.05rem);
                    }
                }
            </style>
            <footer>
                <div id="footerLogo">
                    <img id="footerSymbolLogo" src="${SymbolLogo}" alt="${withSeoImageAlt('Fusion logo')}">
                </div>
                <div id="footerContent">
                    <div id="footerc1" class="fcColumn">
                        <div class="fcTop" id="globalLeadPartnerColumn">
                            <div id="leadPartner">Global Lead<br>Partner</div>
                            <p id="leadPartnerTba">To be announced.</p>
                        </div>
                        <div class="fcBottom">
                            <div id="footerSocialInstagram"><a href="https://www.instagram.com/fusion_intl/" target="_blank">Instagram</a></div>
                            <div id="footerSocialYoutube"><a href="https://www.youtube.com/@fusionartworld" target="_blank">Youtube</a></div>
                        </div>
                    </div>
                    <div id="footerc2" class="fcColumn">
                        <div class="fcTop" id="footerNewsletter">
                            <app-newsletter-subscribe variant="footer"></app-newsletter-subscribe>
                        </div>
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
