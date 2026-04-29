import { navigate } from '../../router.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class CommunityConnect extends HTMLElement {
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
     * @param {Record<string, unknown>} data — `communityPage.connect`
     */
    setData(data) {
        this._data = data && typeof data === 'object' ? data : null;
        this.render();
    }

    render() {
        const d = this._data && typeof this._data === 'object' ? this._data : {};
        const loc =
            typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const title = loc === 'ja' ? String(d.titleJa ?? d.titleEn ?? '') : String(d.titleEn ?? '');
        const hiHref = String(d.howItWorksHref ?? '').trim();
        const hiLab =
            loc === 'ja'
                ? String(d.howItWorksLabelJa ?? d.howItWorksLabelEn ?? 'How it works')
                : String(d.howItWorksLabelEn ?? 'How it works');
        const browseHref = String(d.browseHref ?? '/community').trim() || '/community';
        const browseLab =
            loc === 'ja'
                ? String(d.browseLabelJa ?? d.browseLabelEn ?? 'BROWSE')
                : String(d.browseLabelEn ?? 'BROWSE');
        const bites = Array.isArray(d.bites) ? d.bites : [];

        const biteCols = [0, 1, 2].map((i) => {
            const b = bites[i] && typeof bites[i] === 'object' ? bites[i] : {};
            const t =
                loc === 'ja'
                    ? String(b.titleJa ?? b.titleEn ?? '')
                    : String(b.titleEn ?? '');
            const body =
                loc === 'ja' ? String(b.bodyJa ?? b.bodyEn ?? '') : String(b.bodyEn ?? '');
            const icon = ['○', '◎', '◉'][i] ?? '·';
            return `
                <div class="cc-bite">
                    <div class="cc-ic" aria-hidden="true">${icon}</div>
                    <h3 class="cc-bite-t">${esc(t)}</h3>
                    <p class="cc-bite-p">${esc(body)}</p>
                </div>`;
        });

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    font-family: inherit;
                    color: inherit;
                }
                .cc-head {
                    display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between;
                    gap: 1rem;
                    max-width: 1400px; margin: 0 auto; padding: 2rem 0 1rem;
                    box-sizing: border-box;
                }
                .cc-title {
                    font-size: clamp(0.68rem, 0.85vw, 0.78rem);
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    font-variation-settings: var(--fv-label);
                }
                .cc-hiw {
                    font-size: clamp(0.82rem, 1.05vw, 0.92rem);
                    font-variation-settings: var(--fv-body);
                    text-decoration: underline; cursor: pointer; border: none; background: none; color: inherit;
                }
                .cc-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0;
                    align-items: start;
                }
                .cc-bite { text-align: left; }
                .cc-ic { font-size: 1.25rem; margin-bottom: 0.5rem; opacity: 0.65; }
                .cc-bite-t {
                    font-size: clamp(1rem, 1.2vw, 1.12rem);
                    font-variation-settings: var(--fv-subtitle);
                    margin: 0 0 0.5rem;
                }
                .cc-bite-p {
                    font-size: clamp(0.88rem, 1.05vw, 0.98rem);
                    line-height: 1.5;
                    font-variation-settings: var(--fv-body);
                    margin: 0;
                    opacity: 0.92;
                }
                .cc-actions { max-width: 1400px; margin: 0 auto; padding: 1.5rem 0 2.5rem; display: flex; justify-content: flex-end; }
                .cc-browse {
                    padding: 0.75rem 1.35rem;
                    border: 1.5px solid var(--c2, #000);
                    background: transparent;
                    cursor: pointer;
                    font-size: clamp(0.72rem, 0.95vw, 0.82rem);
                    letter-spacing: 0.08em;
                    font-variation-settings: var(--fv-cta);
                }
                @media (max-width: 768px) {
                    .cc-grid { grid-template-columns: 1fr; }
                }
            </style>
            <div class="cc-head">
                <span class="cc-title">${esc(title)}</span>
                <button type="button" class="cc-hiw" id="ccHiw">${esc(hiLab)} ↗</button>
            </div>
            <div class="cc-grid">${biteCols.join('')}</div>
            <div class="cc-actions">
                <button type="button" class="cc-browse" id="ccBrowse">${esc(browseLab)}</button>
            </div>
        `;

        this.shadow.querySelector('#ccHiw')?.addEventListener('click', () => {
            if (!hiHref) return;
            if (hiHref.startsWith('/') && !hiHref.startsWith('//')) navigate(hiHref);
            else window.open(hiHref, '_blank', 'noopener,noreferrer');
        });
        this.shadow.querySelector('#ccBrowse')?.addEventListener('click', () => {
            if (browseHref.startsWith('/')) navigate(browseHref);
            else window.open(browseHref, '_blank', 'noopener,noreferrer');
        });
    }
}

customElements.define('app-community-connect', CommunityConnect);
export { CommunityConnect };
