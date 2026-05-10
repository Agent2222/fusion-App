import { navigate } from '../../router.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class ExclusiveContentHighlight extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Array<Record<string, unknown>>} */
        this._items = [];
    }

    connectedCallback() {
        this.render();
    }

    /**
     * @param {Array<Record<string, unknown>>} items — max 3
     */
    setData(items) {
        this._items = Array.isArray(items) ? items.slice(0, 3) : [];
        this.render();
    }

    render() {
        const loc =
            typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
        const cards = (this._items.length ? this._items : [{}, {}, {}]).slice(0, 3);

        const blocks = cards
            .map((raw, i) => {
                const imageUrl = String(raw?.imageUrl ?? '').trim();
                const line =
                    loc === 'ja'
                        ? String(raw?.lineJa ?? raw?.lineEn ?? '')
                        : String(raw?.lineEn ?? '');
                const href = String(raw?.href ?? '#').trim() || '#';
                return `
                    <article class="ech-card" data-index="${i}">
                        <div class="ech-media" style="${imageUrl ? `background-image:url(${esc(imageUrl)})` : ''}">
                            ${imageUrl ? '' : '<span class="ech-ph">Image</span>'}
                            <div class="ech-cap">${esc(line)}</div>
                            <button type="button" class="ech-play" aria-label="Open" data-href="${esc(href)}">▶</button>
                        </div>
                    </article>
                `;
            })
            .join('');

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    font-family: inherit;
                    color: inherit;
                }
                .ech-head {
                    display: flex; align-items: baseline; justify-content: space-between;
                    max-width: 100%; margin: 0 auto; padding: 0 0 1rem;
                    box-sizing: border-box;
                }
                .ech-title {
                    font-size: clamp(0.68rem, 0.85vw, 0.78rem);
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    font-variation-settings: var(--fv-label);
                }
                .ech-view {
                    font-size: clamp(0.78rem, 1vw, 0.88rem);
                    font-variation-settings: var(--fv-body);
                    text-decoration: underline; cursor: pointer; border: none; background: none; color: inherit;
                }
                .ech-row {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                    max-width: 100%;
                    margin: 0 auto;
                    padding: 0 0 3rem;
                    box-sizing: border-box;
                }
                .ech-card { min-width: 0; }
                .ech-media {
                    position: relative;
                    aspect-ratio: 4 / 5;
                    background: #ddd center/cover no-repeat #e8e8e4;
                    border-radius: 2px;
                    overflow: hidden;
                }
                .ech-ph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #999; font-size: clamp(0.78rem, 1vw, 0.88rem); font-variation-settings: var(--fv-caption); }
                .ech-cap {
                    position: absolute; left: 0; right: 0; bottom: 0;
                    padding: 0.75rem 0.85rem;
                    font-size: clamp(0.65rem, 0.8vw, 0.74rem);
                    letter-spacing: 0.04em;
                    font-variation-settings: var(--fv-caption);
                    background: linear-gradient(transparent, rgba(0,0,0,0.75));
                    color: #fff;
                }
                .ech-play {
                    position: absolute; bottom: 2.5rem; right: 0.75rem;
                    width: 2rem; height: 2rem;
                    border-radius: 50%;
                    border: 1px solid #fff;
                    background: rgba(0,0,0,0.35);
                    color: #fff;
                    cursor: pointer;
                    font-size: 0.65rem;
                    font-variation-settings: var(--fv-label);
                }
                @media (max-width: 768px) {
                    .ech-row { grid-template-columns: 1fr; }
                }
            </style>
            <div class="ech-head">
                <span class="ech-title">EXCLUSIVE CONTENT</span>
                <button type="button" class="ech-view" id="echViewAll">View all</button>
            </div>
            <div class="ech-row">${blocks}</div>
        `;

        const open = (href) => {
            if (!href || href === '#') return;
            if (href.startsWith('/') && !href.startsWith('//')) {
                navigate(href);
            } else {
                window.open(href, '_blank', 'noopener,noreferrer');
            }
        };

        this.shadow.querySelectorAll('.ech-play').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const h = btn.getAttribute('data-href') || '';
                open(h);
            });
        });

        const row = this.shadow.querySelector('.ech-row');
        if (row) {
            row.querySelectorAll('.ech-card').forEach((card, idx) => {
                card.addEventListener('click', () => {
                    const b = card.querySelector('.ech-play');
                    const h = b?.getAttribute('data-href') || '';
                    open(h);
                });
            });
        }

        const va = this.shadow.querySelector('#echViewAll');
        if (va instanceof HTMLButtonElement) {
            va.addEventListener('click', () => navigate('/journal'));
        }
    }
}

customElements.define('app-exclusive-content-highlight', ExclusiveContentHighlight);
export { ExclusiveContentHighlight };
