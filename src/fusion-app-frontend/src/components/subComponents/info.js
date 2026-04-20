// Info band: head + sub copy (no header row, no CTA). Styled like gallery-access-cta text.
import { getContentBundleForStudio, subscribeDataSource } from '../../utils/database.js';
import { mergeLocaleDeep } from '../../utils/localeFallback.js';

class InfoComponent extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Record<string, unknown> | null} */
        this._infoBundle = null;
        /** @type {(() => void) | null} */
        this._unsubData = null;
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
        if (this._unsubData) this._unsubData();
        this._unsubData = subscribeDataSource(() => void this._loadInfo());
        void this._loadInfo();
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-localechange', this._onLocaleChange);
        if (this._unsubData) {
            this._unsubData();
            this._unsubData = null;
        }
    }

    async _loadInfo() {
        const raw = await getContentBundleForStudio('site-info');
        this._infoBundle = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : null;
        this.render();
    }

    _getContextSlice() {
        const ctx = this.getAttribute('context') || 'home';
        const block = this._infoBundle;
        if (!block || !block[ctx]) return null;
        return block[ctx];
    }

    render() {
        const locale = typeof window.getLocale === 'function' ? window.getLocale() : 'en';
        const slice = this._getContextSlice();
        const enR = slice?.en && typeof slice.en === 'object' ? slice.en : {};
        const jaR = slice?.ja && typeof slice.ja === 'object' ? slice.ja : {};
        const row = slice
            ? locale === 'ja'
                ? /** @type {Record<string, unknown>} */ (mergeLocaleDeep(enR, jaR))
                : /** @type {Record<string, unknown>} */ (enR)
            : { headText: '', subText: '' };
        const headText = row.headText || '';
        const subText = row.subText || '';

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .info {
                    width: 100%;
                    min-height: 24vh;
                    display: grid;
                    grid-template-columns: 1fr;
                    align-items: center;
                    justify-items: center;
                    padding: 2rem 1rem;
                    box-sizing: border-box;
                }

                .info-inner {
                    width: 100%;
                    max-width: 56rem;
                    display: grid;
                    gap: 1rem;
                    text-align: center;
                }

                .info-head {
                    font-size: clamp(1.2rem, 2.2vw, 3rem);
                    font-variation-settings: var(--fv-headline-wide);
                    letter-spacing: 0.02em;
                    user-select: none;
                }

                .info-sub {
                    font-size: clamp(1rem, 1.5vw, 2rem);
                    font-variation-settings: var(--fv-label);
                    user-select: none;
                    line-height: 1.35;
                }

                @media (max-width: 768px) {
                    .info {
                        padding: 1.5rem 1rem;
                        min-height: 0;
                    }
                }

                @media (max-width: 640px) {
                    .info {
                        padding: 1.25rem 0.75rem;
                    }

                    .info-inner {
                        gap: 0.75rem;
                    }
                }
            </style>
            <div class="info">
                <div class="info-inner">
                    <div class="info-head"></div>
                    <div class="info-sub"></div>
                </div>
            </div>
        `;

        const headEl = this.shadowRoot.querySelector('.info-head');
        const subEl = this.shadowRoot.querySelector('.info-sub');
        if (headEl) headEl.textContent = headText;
        if (subEl) subEl.innerHTML = subText;
    }
}

customElements.define('app-info', InfoComponent);

export { InfoComponent };
