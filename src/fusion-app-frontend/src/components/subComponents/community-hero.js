import { getMembershipAccessForCaller } from '../../utils/database.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class CommunityHero extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Record<string, unknown> | null} */
        this._data = null;
        this._onAuth = () => {
            void this._refreshGate();
        };
    }

    connectedCallback() {
        window.addEventListener('fusion-auth-change', this._onAuth);
        if (this._data) void this._refreshGate();
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-auth-change', this._onAuth);
    }

    /**
     * @param {Record<string, unknown>} data — `communityPage.hero`
     */
    setData(data) {
        this._data = data && typeof data === 'object' ? data : null;
        if (this.isConnected) void this._refreshGate();
    }

    async _refreshGate() {
        if (!this._data) return;
        const gate = await getMembershipAccessForCaller();
        const canWatch = gate === 'ok' || gate === 'exempt';
        this.render(canWatch);
    }

    /**
     * @param {boolean} canWatch
     */
    render(canWatch) {
        const d = this._data && typeof this._data === 'object' ? this._data : {};
        const loc =
            typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const kicker = loc === 'ja' ? String(d.kickerJa ?? d.kickerEn ?? '') : String(d.kickerEn ?? '');
        const headline =
            loc === 'ja' ? String(d.headlineJa ?? d.headlineEn ?? '') : String(d.headlineEn ?? '');
        const body =
            loc === 'ja' ? String(d.bodyJa ?? d.bodyEn ?? '') : String(d.bodyEn ?? '');
        const joinLabel =
            loc === 'ja'
                ? String(d.ctaJoinLabelJa ?? d.ctaJoinLabelEn ?? 'JOIN')
                : String(d.ctaJoinLabelEn ?? 'JOIN');
        const watchLabel =
            loc === 'ja'
                ? String(d.ctaWatchLabelJa ?? d.ctaWatchLabelEn ?? 'WATCH')
                : String(d.ctaWatchLabelEn ?? 'WATCH');
        const videoUrl = String(d.videoUrl ?? '').trim();
        const posterUrl = String(d.posterUrl ?? '').trim();
        const overlayTitle = String(d.overlayTitle ?? '').trim();
        const overlayGuests = String(d.overlayGuests ?? '').trim();
        const overlayDuration = String(d.overlayDuration ?? '').trim();

        const primaryLabel = canWatch ? watchLabel : joinLabel;
        const primaryMode = canWatch ? 'watch' : 'join';

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    font-family: inherit;
                    color: inherit;
                }
                .ch-wrap {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: clamp(1.5rem, 4vw, 3rem);
                    align-items: stretch;
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: clamp(2rem, 5vw, 4rem) 0;
                    box-sizing: border-box;
                }
                .ch-copy { display: flex; flex-direction: column; gap: 1rem; justify-content: center; }
                .ch-kicker {
                    font-size: clamp(0.68rem, 0.9vw, 0.78rem);
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    font-variation-settings: var(--fv-label);
                    color: inherit;
                    opacity: 0.78;
                }
                .ch-headline {
                    font-size: clamp(1.65rem, 3.8vw, 2.65rem);
                    line-height: 1.12;
                    font-variation-settings: var(--fv-headline-wide);
                    color: inherit;
                }
                .ch-body {
                    font-size: clamp(0.95rem, 1.15vw, 1.08rem);
                    line-height: 1.55;
                    max-width: 36rem;
                    font-variation-settings: var(--fv-body);
                    color: inherit;
                    opacity: 0.92;
                }
                .ch-cta {
                    align-self: flex-start;
                    margin-top: 0.5rem;
                    padding: 0.85rem 1.5rem;
                    border: none;
                    background: var(--c2, #000);
                    color: var(--bg, #fff);
                    font-size: clamp(0.72rem, 0.95vw, 0.82rem);
                    letter-spacing: 0.06em;
                    font-variation-settings: var(--fv-cta);
                    cursor: pointer;
                    border-radius: 2px;
                }
                .ch-cta:hover { opacity: 0.92; }
                .ch-media {
                    position: relative;
                    background: #e8e8e4;
                    border-radius: 2px;
                    overflow: hidden;
                    min-height: min(52vw, 420px);
                    max-height: 520px;
                }
                .ch-media video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }
                .ch-overlay {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    padding: 1rem 1.25rem;
                    background: linear-gradient(transparent, rgba(0,0,0,0.65));
                    color: #fff;
                    font-size: clamp(0.78rem, 1vw, 0.88rem);
                    font-variation-settings: var(--fv-caption);
                    display: flex;
                    flex-wrap: wrap;
                    align-items: flex-end;
                    gap: 0.5rem 1rem;
                }
                .ch-overlay strong { font-variation-settings: var(--fv-subtitle); }
                @media (max-width: 900px) {
                    .ch-wrap { grid-template-columns: 1fr; }
                    .ch-media { min-height: 280px; max-height: none; }
                }
            </style>
            <div class="ch-wrap">
                <div class="ch-copy">
                    <div class="ch-kicker">${esc(kicker)}</div>
                    <h1 class="ch-headline">${esc(headline)}</h1>
                    <p class="ch-body">${esc(body)}</p>
                    <button type="button" class="ch-cta" id="chPrimary">${esc(primaryLabel)}</button>
                </div>
                <div class="ch-media">
                    ${videoUrl ? `<video id="chVideo" playsinline controls ${posterUrl ? `poster="${esc(posterUrl)}"` : ''} src="${esc(videoUrl)}"></video>` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:240px;color:#888;font-size:0.9rem;">Video URL (Studio)</div>`}
                    <div class="ch-overlay">
                        ${overlayTitle ? `<span><strong>${esc(overlayTitle)}</strong></span>` : ''}
                        ${overlayGuests ? `<span>${esc(overlayGuests)}</span>` : ''}
                        ${overlayDuration ? `<span>${esc(overlayDuration)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;

        const btn = this.shadow.querySelector('#chPrimary');
        const vid = /** @type {HTMLVideoElement | null} */ (this.shadow.querySelector('#chVideo'));
        if (btn instanceof HTMLButtonElement) {
            btn.addEventListener('click', () => {
                if (primaryMode === 'join') {
                    window.dispatchEvent(new CustomEvent('fusion-open-join-network', { detail: {} }));
                    return;
                }
                if (vid) {
                    try {
                        void vid.play();
                    } catch {
                        /* autoplay policy */
                    }
                    vid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }
    }
}

customElements.define('app-community-hero', CommunityHero);
export { CommunityHero };
