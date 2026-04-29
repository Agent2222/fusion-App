import { navigate } from '../../router.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class CommunityNetworkCards extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Array<Record<string, unknown>>} */
        this._cards = [];
    }

    connectedCallback() {
        this.render();
    }

    /**
     * @param {Array<Record<string, unknown>>} cards
     */
    setData(cards) {
        this._cards = Array.isArray(cards) ? cards : [];
        this.render();
    }

    render() {
        const rows = this._cards
            .map((c) => {
                const avatarUrl = String(c?.avatarUrl ?? '').trim();
                const name = String(c?.name ?? '').trim();
                const role = String(c?.role ?? '').trim();
                const location = String(c?.location ?? '').trim();
                const href = String(c?.connectHref ?? '').trim();
                return `
                    <article class="nc-card">
                        <div class="nc-avatar" style="${avatarUrl ? `background-image:url(${esc(avatarUrl)})` : ''}">${avatarUrl ? '' : '·'}</div>
                        <div class="nc-name">${esc(name)}</div>
                        <div class="nc-role">${esc(role)}</div>
                        <div class="nc-loc">${esc(location)}</div>
                        <button type="button" class="nc-btn" data-href="${esc(href)}">CONNECT</button>
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
                    max-width: 1400px;
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
                if (h.startsWith('/') && !h.startsWith('//')) navigate(h);
                else window.open(h, '_blank', 'noopener,noreferrer');
            });
        });
    }
}

customElements.define('app-community-network-cards', CommunityNetworkCards);
export { CommunityNetworkCards };
