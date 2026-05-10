import { getMembershipAccessForCaller } from '../../utils/database.js';
import { getAuthSnapshot } from '../../utils/icAuth.js';
import { signPrivateVideoPlayback } from '../../utils/integrationApi.js';

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
        this._signedFullVideoUrl = '';
        this._unlockError = '';
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
        this._signedFullVideoUrl = '';
        this._unlockError = '';
        const fullVideoKey = String(this._data.fullVideoKey ?? '').trim();
        if (canWatch && fullVideoKey) {
            try {
                const snap = await getAuthSnapshot();
                if (!snap.authenticated) throw new Error('Sign in required');
                const signed = await signPrivateVideoPlayback({
                    key: fullVideoKey,
                    principal: snap.principal.toText(),
                });
                this._signedFullVideoUrl = String(signed.url || '').trim();
            } catch {
                this._unlockError = 'Could not unlock full video. Please try again.';
            }
        }
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
        const legacyVideoUrl = String(d.videoUrl ?? '').trim();
        const previewVideoUrl = String(d.previewVideoUrl ?? '').trim();
        const fullVideoKey = String(d.fullVideoKey ?? '').trim();
        const posterUrl = String(d.posterUrl ?? '').trim();
        const overlayTitle = String(d.overlayTitle ?? '').trim();
        const overlayGuests = String(d.overlayGuests ?? '').trim();
        const overlayDuration = String(d.overlayDuration ?? '').trim();

        const primaryLabel = canWatch ? watchLabel : joinLabel;
        const primaryMode = canWatch ? 'watch' : 'join';
        const isLegacyPublicVideo = Boolean(legacyVideoUrl && !previewVideoUrl && !fullVideoKey);
        const videoUrl =
            canWatch && this._signedFullVideoUrl
                ? this._signedFullVideoUrl
                : previewVideoUrl || (isLegacyPublicVideo ? legacyVideoUrl : '');
        const hasLockedFullVideo = Boolean(fullVideoKey && !this._signedFullVideoUrl);
        const emptyCopy = hasLockedFullVideo
            ? 'Members-only full video'
            : 'Video URL (Studio)';

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
                    max-width: 100%;
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
                .ch-locked {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    min-height: 240px;
                    padding: 1.5rem;
                    color: #444;
                    text-align: center;
                    font-size: 0.9rem;
                    background: rgba(255,255,255,0.42);
                }
                .ch-unlock-note {
                    margin-top: -0.35rem;
                    color: inherit;
                    opacity: 0.72;
                    font-size: 0.82rem;
                    line-height: 1.35;
                    font-variation-settings: var(--fv-caption);
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
                    ${this._unlockError ? `<p class="ch-unlock-note">${esc(this._unlockError)}</p>` : ''}
                    ${fullVideoKey && !canWatch ? `<p class="ch-unlock-note">Preview available. Join the community to unlock the full video.</p>` : ''}
                    <button type="button" class="ch-cta" id="chPrimary">${esc(primaryLabel)}</button>
                </div>
                <div class="ch-media">
                    ${videoUrl ? `<video id="chVideo" playsinline controls ${posterUrl ? `poster="${esc(posterUrl)}"` : ''} src="${esc(videoUrl)}"></video>` : `<div class="ch-locked">${esc(emptyCopy)}</div>`}
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
        if (vid && canWatch && fullVideoKey && this._signedFullVideoUrl) {
            vid.addEventListener('error', () => {
                this._signedFullVideoUrl = '';
                void this._refreshGate();
            }, { once: true });
        }
        if (btn instanceof HTMLButtonElement) {
            btn.addEventListener('click', () => {
                if (primaryMode === 'join') {
                    window.dispatchEvent(new CustomEvent('fusion-open-join-network', { detail: {} }));
                    return;
                }
                if (fullVideoKey && !this._signedFullVideoUrl) {
                    void this._refreshGate();
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
