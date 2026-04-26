import {
    getArtistCardImageMode,
    setArtistCardImageMode,
    ARTIST_CARD_IMAGE_MODE_EVENT,
} from '../../utils/artistCardImageMode.js';

const CAPTION = 'View artists by their artwork or profile.';

/**
 * Header control: switch between artwork vs profile/headshot images on feed cards.
 */
class ArtistCardImageToggle extends HTMLElement {
    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: 'open' });
        /** @type {(() => void) | null} */
        this._onRoute = null;
        /** @type {((e: Event) => void) | null} */
        this._onModeEvent = null;
    }

    connectedCallback() {
        this._render();
        this._onRoute = () => this._syncFromDocument();
        window.addEventListener('routeChange', this._onRoute);
        this._onModeEvent = (e) => {
            const d = /** @type {CustomEvent<{ mode?: string }>} */ (e).detail;
            const m = d?.mode === 'profile' ? 'profile' : 'artwork';
            this._setModeVisual(m);
        };
        window.addEventListener(ARTIST_CARD_IMAGE_MODE_EVENT, this._onModeEvent);
        this._syncFromDocument();
    }

    disconnectedCallback() {
        if (this._onRoute) {
            window.removeEventListener('routeChange', this._onRoute);
            this._onRoute = null;
        }
        if (this._onModeEvent) {
            window.removeEventListener(ARTIST_CARD_IMAGE_MODE_EVENT, this._onModeEvent);
            this._onModeEvent = null;
        }
    }

    _syncFromDocument() {
        const on = document.documentElement.getAttribute('data-fusion-artist-card-toggle') === 'on';
        this.toggleAttribute('hidden', !on);
    }

    _render() {
        const mode = getArtistCardImageMode();
        this._shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: relative;
                    z-index: 35;
                    width: max-content;
                    max-width: calc(100% - 4%);
                    min-width: 11.5rem;
                    font-family: 'momochidori-variable', 'Helvetica Neue', sans-serif;
                    color: var(--c2, #000000);
                    --aci-border: 1px solid var(--c2, #000000);
                    --aci-surface: var(--bg, #faf3f4);
                }
                :host([hidden]) { display: none !important; }
                .aci-wrap {
                    display: block;
                    width: 22rem;
                    margin-top: 15px;
                    padding: 0;
                    height: 4rem;
                    border: var(--aci-border);
                    border-radius: 0;
                    background: var(--aci-surface);
                    box-sizing: border-box;
                }
                .aci-seg {
                    display: flex;
                    flex-direction: row;
                    align-items: stretch;
                    height: 2rem;
                    border-bottom: 1px solid #000;
                }
                .aci-btn {
                    flex: 1 1 50%;
                    min-width: 0;
                    margin: 0;
                    padding: 0.4rem 0.55rem;
                    border: 0;
                    background: transparent;
                    color: inherit;
                    font: inherit;
                    font-size: 0.72rem;
                    font-weight: 800;
                    letter-spacing: 0.05em;
                    line-height: 1.1;
                    cursor: pointer;
                    user-select: none;
                }
                .aci-btn[aria-pressed="true"] {
                    background: var(--c2, #000);
                    color: var(--bg, #faf3f4);
                }
                .aci-btn:focus-visible {
                    outline: 1px solid var(--c2, #000);
                    outline-offset: 2px;
                }
                .aci-cap {
                    height: 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 0.65rem;
                    font-size: 0.6rem;
                    font-weight: 700;
                    line-height: 1.2;
                    text-align: center;
                    color: #000 !important;
                    opacity: 1;
                }
            </style>
            <div class="aci-wrap" part="wrap">
                <div class="aci-seg" role="group" aria-label="Artist card image mode">
                    <button type="button" class="aci-btn" part="artwork" data-mode="artwork" aria-pressed="false" id="aci-artwork">ARTWORK</button>
                    <button type="button" class="aci-btn" part="profile" data-mode="profile" aria-pressed="false" id="aci-profile">PROFILE</button>
                </div>
                <div class="aci-cap">${CAPTION}</div>
            </div>
        `;
        this._bind();
        this._setModeVisual(mode);
    }

    _bind() {
        const aw = this._shadow.getElementById('aci-artwork');
        const pr = this._shadow.getElementById('aci-profile');
        const set = (m) => {
            setArtistCardImageMode(m);
            this._setModeVisual(getArtistCardImageMode());
        };
        aw?.addEventListener('click', () => set('artwork'));
        pr?.addEventListener('click', () => set('profile'));
    }

    /**
     * @param {import('../../utils/artistCardImageMode.js').ArtistCardImageMode} mode
     */
    _setModeVisual(mode) {
        const aw = this._shadow.getElementById('aci-artwork');
        const pr = this._shadow.getElementById('aci-profile');
        if (aw instanceof HTMLButtonElement) {
            aw.setAttribute('aria-pressed', mode === 'artwork' ? 'true' : 'false');
        }
        if (pr instanceof HTMLButtonElement) {
            pr.setAttribute('aria-pressed', mode === 'profile' ? 'true' : 'false');
        }
    }
}

customElements.define('app-artist-card-image-toggle', ArtistCardImageToggle);
