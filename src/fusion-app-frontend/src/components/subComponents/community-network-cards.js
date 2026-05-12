import { navigate } from '../../router.js';
import { PH_LOADER_BASE_STYLES, programHeroLoaderHtml } from '../../utils/programHeroLoader.js';
import { captureCommunityEvent, communityDestinationProps } from '../../utils/communityPosthog.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function firstText(...values) {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) return text;
    }
    return '';
}

function localized(obj, key, loc) {
    if (!obj || typeof obj !== 'object') return '';
    const source = /** @type {Record<string, unknown>} */ (obj);
    return loc === 'ja'
        ? firstText(source[`${key}Ja`], source[`${key}En`], source[key])
        : firstText(source[`${key}En`], source[`${key}Ja`], source[key]);
}

class CommunityNetworkCards extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Array<Record<string, unknown>>} */
        this._cards = [];
        this._loaded = false;
    }

    connectedCallback() {
        this.render();
    }

    /**
     * @param {Array<Record<string, unknown>>} cards
     */
    setData(cards) {
        this._loaded = true;
        this._cards = Array.isArray(cards) ? cards : [];
        this.render();
    }

    render() {
        if (!this._loaded) {
            this.shadow.innerHTML = `
                <style>
                    :host { display: block; width: 100%; }
                    ${PH_LOADER_BASE_STYLES}
                    .community-network-pending-loader {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: clamp(11rem, 22vw, 16rem);
                        background: var(--bg, #f8f4f0);
                    }
                </style>
                ${programHeroLoaderHtml({ wrapperClass: 'community-network-pending-loader', ariaLabel: 'Loading community network' })}
            `;
            return;
        }
        const loc =
            typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const rows = this._cards
            .map((c, i) => {
                const avatarUrl = String(c?.avatarUrl ?? '').trim();
                const name = localized(c, 'name', loc);
                const role = localized(c, 'role', loc);
                const location = localized(c, 'location', loc);
                const href = String(c?.connectHref ?? '').trim();
                return `
                    <article class="nc-card">
                        <div class="nc-avatar" style="${avatarUrl ? `background-image:url(${esc(avatarUrl)})` : ''}">${avatarUrl ? '' : '·'}</div>
                        <div class="nc-name">${esc(name)}</div>
                        <div class="nc-role">${esc(role)}</div>
                        <div class="nc-loc">${esc(location)}</div>
                        <button type="button" class="nc-btn" data-card-index="${i}" data-href="${esc(href)}">CONNECT</button>
                    </article>`;
            })
            .join('');

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    overflow: hidden;
                    box-sizing: border-box;
                    font-family: inherit;
                    color: inherit;
                }
                .nc-sc {
                    display: flex;
                    gap: 1rem;
                    overflow-x: auto;
                    scroll-snap-type: x mandatory;
                    padding: 1rem 0 2rem;
                    max-width: 100%;
                    margin: 0 auto;
                    box-sizing: border-box;
                    -webkit-overflow-scrolling: touch;
                }
                .nc-card {
                    flex: 0 0 min(260px, 85vw);
                    scroll-snap-align: start;
                    border: 1px solid rgba(0,0,0,0.12);
                    padding: 1.25rem;
                    border-radius: 2px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 0.35rem;
                    background: var(--bg, #fff);
                }
                .nc-avatar {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    background: #ddd center/cover no-repeat #eee;
                    margin-bottom: 0.25rem;
                }
                .nc-name { font-size: clamp(0.92rem, 1.1vw, 1.02rem); font-variation-settings: var(--fv-subtitle); }
                .nc-role { font-size: clamp(0.8rem, 1vw, 0.9rem); font-variation-settings: var(--fv-body); opacity: 0.88; }
                .nc-loc { font-size: clamp(0.72rem, 0.9vw, 0.82rem); font-variation-settings: var(--fv-caption); opacity: 0.8; margin-bottom: 0.5rem; }
                .nc-btn {
                    margin-top: auto;
                    padding: 0.45rem 1rem;
                    border: none;
                    background: var(--c2, #000);
                    color: var(--bg, #fff);
                    font-size: clamp(0.65rem, 0.85vw, 0.74rem);
                    letter-spacing: 0.06em;
                    font-variation-settings: var(--fv-cta);
                    cursor: pointer;
                    border-radius: 2px;
                }
            </style>
            <div class="nc-sc">${rows || '<p style="padding:1rem;opacity:0.6;">No profiles (Studio → Community).</p>'}</div>
        `;

        this.shadow.querySelectorAll('.nc-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const h = btn.getAttribute('data-href') || '';
                if (!h) return;
                captureCommunityEvent('community_network_connect_clicked', {
                    card_index: Number(btn.getAttribute('data-card-index') ?? -1),
                    ...communityDestinationProps(h),
                });
                if (h.startsWith('/') && !h.startsWith('//')) navigate(h);
                else window.open(h, '_blank', 'noopener,noreferrer');
            });
        });
    }
}

customElements.define('app-community-network-cards', CommunityNetworkCards);
export { CommunityNetworkCards };
