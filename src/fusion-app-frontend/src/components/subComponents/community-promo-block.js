function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class CommunityPromoBlock extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Record<string, unknown> | null} */
        this._data = null;
    }

    connectedCallback() {
        this.render();
    }

    /**
     * @param {Record<string, unknown>} data — `communityPage.promo`
     */
    setData(data) {
        this._data = data && typeof data === 'object' ? data : null;
        this.render();
    }

    render() {
        const d = this._data && typeof this._data === 'object' ? this._data : {};
        const loc =
            typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const headline =
            loc === 'ja'
                ? String(d.headlineJa ?? d.headlineEn ?? '')
                : String(d.headlineEn ?? '');
        const sub =
            loc === 'ja' ? String(d.sublineJa ?? d.sublineEn ?? '') : String(d.sublineEn ?? '');

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 100%;
                    min-height: 220px;
                    box-sizing: border-box;
                    font-family: inherit;
                }
                .pb {
                    background: var(--c2, #000);
                    color: var(--bg, #fff);
                    padding: clamp(1.5rem, 4vw, 2.5rem);
                    height: 100%;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 1rem;
                    border-radius: 2px;
                }
                .pb-h {
                    font-size: clamp(1.1rem, 2.2vw, 1.45rem);
                    line-height: 1.25;
                    font-variation-settings: var(--fv-headline);
                    margin: 0;
                }
                .pb-rule { height: 1px; background: rgba(255,255,255,0.35); width: 100%; max-width: 12rem; }
                .pb-sub {
                    font-size: clamp(0.7rem, 0.9vw, 0.8rem);
                    letter-spacing: 0.08em;
                    font-variation-settings: var(--fv-caption);
                    opacity: 0.9;
                    margin: 0;
                    line-height: 1.5;
                }
            </style>
            <div class="pb">
                <p class="pb-h">${esc(headline)}</p>
                <div class="pb-rule" aria-hidden="true"></div>
                <p class="pb-sub">${esc(sub)}</p>
            </div>
        `;
    }
}

customElements.define('app-community-promo-block', CommunityPromoBlock);
export { CommunityPromoBlock };
