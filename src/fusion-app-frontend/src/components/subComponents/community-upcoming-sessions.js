import { navigate } from '../../router.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class CommunityUpcomingSessions extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {Array<Record<string, unknown>>} */
        this._sessions = [];
    }

    connectedCallback() {
        this.render();
    }

    /**
     * @param {Array<Record<string, unknown>>} sessions
     */
    setData(sessions) {
        this._sessions = Array.isArray(sessions) ? sessions : [];
        this.render();
    }

    render() {
        const rows = this._sessions
            .map((s) => {
                const thumb = String(s?.thumbUrl ?? '').trim();
                const kind = String(s?.kindLabel ?? '').trim();
                const title = String(s?.title ?? '').trim();
                const dt = String(s?.datetimeLine ?? '').trim();
                const regLabel = String(s?.registerLabel ?? 'REGISTER').trim();
                const regHref = String(s?.registerHref ?? '').trim();
                return `
                    <li class="us-row">
                        <div class="us-thumb" style="${thumb ? `background-image:url(${esc(thumb)})` : ''}">${thumb ? '<span class="us-play">▶</span>' : ''}</div>
                        <div class="us-body">
                            <div class="us-kind">${esc(kind)}</div>
                            <div class="us-title">${esc(title)}</div>
                            <div class="us-dt">${esc(dt)}</div>
                            <button type="button" class="us-reg" data-href="${esc(regHref)}">${esc(regLabel)}</button>
                        </div>
                    </li>`;
            })
            .join('');

        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    box-sizing: border-box;
                    font-family: inherit;
                    color: inherit;
                }
                .us-head {
                    display: flex; justify-content: space-between; align-items: baseline;
                    margin-bottom: 1rem;
                }
                .us-h {
                    font-size: clamp(0.68rem, 0.85vw, 0.78rem);
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    font-variation-settings: var(--fv-label);
                }
                .us-view {
                    font-size: clamp(0.8rem, 1vw, 0.9rem);
                    font-variation-settings: var(--fv-body);
                    text-decoration: underline; cursor: pointer; border: none; background: none; color: inherit;
                }
                ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1.25rem; }
                .us-row { display: grid; grid-template-columns: 120px 1fr; gap: 1rem; align-items: start; }
                .us-thumb {
                    aspect-ratio: 16/10;
                    background: #ddd center/cover no-repeat #eee;
                    border-radius: 2px;
                    position: relative;
                    display: flex; align-items: center; justify-content: center;
                }
                .us-play { color: #fff; font-size: 0.75rem; text-shadow: 0 0 4px #000; }
                .us-kind {
                    font-size: clamp(0.68rem, 0.85vw, 0.76rem);
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    font-variation-settings: var(--fv-label);
                    opacity: 0.78;
                }
                .us-title { font-size: clamp(0.95rem, 1.1vw, 1.08rem); font-variation-settings: var(--fv-subtitle); margin: 0.2rem 0; }
                .us-dt { font-size: clamp(0.84rem, 1vw, 0.95rem); font-variation-settings: var(--fv-body); opacity: 0.88; margin-bottom: 0.5rem; }
                .us-reg {
                    padding: 0.4rem 0.9rem;
                    border: 1.5px solid var(--c2, #000);
                    background: transparent;
                    font-size: clamp(0.65rem, 0.85vw, 0.74rem);
                    letter-spacing: 0.06em;
                    font-variation-settings: var(--fv-cta);
                    cursor: pointer;
                }
                @media (max-width: 520px) {
                    .us-row { grid-template-columns: 1fr; }
                }
            </style>
            <div class="us-head">
                <span class="us-h">UPCOMING SESSIONS</span>
                <button type="button" class="us-view" id="usView">View all</button>
            </div>
            <ul>${rows || '<li class="studio-muted">No sessions yet.</li>'}</ul>
        `;

        this.shadow.querySelector('#usView')?.addEventListener('click', () => navigate('/programs'));
        this.shadow.querySelectorAll('.us-reg').forEach((btn) => {
            btn.addEventListener('click', () => {
                const h = btn.getAttribute('data-href') || '';
                if (!h) return;
                if (h.startsWith('/') && !h.startsWith('//')) navigate(h);
                else window.open(h, '_blank', 'noopener,noreferrer');
            });
        });
    }
}

customElements.define('app-community-upcoming-sessions', CommunityUpcomingSessions);
export { CommunityUpcomingSessions };
