/**
 * Small help trigger for Sign in / Register modals.
 * Opens a compact tip: prefer Chrome or Brave; contact info@fusionart.world for issues.
 */
class AuthBrowserHelp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        /** @type {HTMLDialogElement | null} */
        this._dlg = null;
        /** @type {(() => void) | null} */
        this._onLocale = null;
    }

    connectedCallback() {
        this.render();
        this._bind();
        this._onLocale = () => this._syncCopy();
        window.addEventListener('fusion-localechange', this._onLocale);
    }

    disconnectedCallback() {
        if (this._onLocale) {
            window.removeEventListener('fusion-localechange', this._onLocale);
            this._onLocale = null;
        }
    }

    /** @returns {'en' | 'ja'} */
    _loc() {
        try {
            if (typeof window.getLocale === 'function' && window.getLocale() === 'ja') {
                return 'ja';
            }
        } catch (_) {
            /* ignore */
        }
        if (typeof document !== 'undefined' && document.documentElement.lang === 'ja') {
            return 'ja';
        }
        return 'en';
    }

    _copy() {
        const en = this._loc() === 'en';
        return {
            trigger: en ? 'Having trouble?' : 'お困りですか？',
            title: en ? 'Need a hand?' : 'サポート',
            body: en
                ? 'For best results, use Chrome or Brave browser. If you’re experiencing any issues, contact the team at'
                : '安定してご利用いただくには Chrome または Brave ブラウザをご利用ください。問題が続く場合は、以下までご連絡ください：',
            email: 'info@fusionart.world',
            close: en ? 'Close' : '閉じる',
        };
    }

    open() {
        const dlg = this._dlg || this.shadowRoot?.querySelector('.abh-dialog');
        if (dlg && typeof dlg.showModal === 'function' && !dlg.open) {
            dlg.showModal();
            this._syncCopy();
            requestAnimationFrame(() => {
                this.shadowRoot?.querySelector('.abh-close')?.focus?.();
            });
        }
    }

    close() {
        const dlg = this._dlg || this.shadowRoot?.querySelector('.abh-dialog');
        if (dlg && typeof dlg.close === 'function' && dlg.open) dlg.close();
    }

    _syncCopy() {
        const root = this.shadowRoot;
        if (!root) return;
        const c = this._copy();
        const trigger = root.querySelector('.abh-trigger');
        const title = root.querySelector('.abh-title');
        const body = root.querySelector('.abh-body');
        const close = root.querySelector('.abh-close');
        if (trigger) trigger.textContent = c.trigger;
        if (title) title.textContent = c.title;
        if (body) {
            body.innerHTML = `${escapeHtml(c.body)} <a class="abh-email" href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>.`;
        }
        if (close) close.textContent = c.close;
    }

    _bind() {
        const root = this.shadowRoot;
        if (!root) return;
        this._dlg = root.querySelector('.abh-dialog');
        root.querySelector('.abh-trigger')?.addEventListener('click', () => this.open());
        root.querySelector('.abh-close')?.addEventListener('click', () => this.close());
        this._dlg?.addEventListener('click', (e) => {
            if (e.target === this._dlg) this.close();
        });
    }

    render() {
        const c = this._copy();
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    margin-top: 1rem;
                    box-sizing: border-box;
                    font-family: 'momochidori-variable', sans-serif;
                    color: var(--c2, #000);
                }
                .abh-trigger {
                    display: block;
                    margin: 0 auto;
                    padding: 0;
                    border: none;
                    background: none;
                    font-family: inherit;
                    font-size: clamp(0.78rem, 1vw, 0.88rem);
                    font-variation-settings: var(--fv-caption, "wght" 400);
                    color: color-mix(in srgb, var(--c2, #000) 72%, var(--bg, #fff));
                    text-decoration: underline;
                    text-underline-offset: 0.18em;
                    cursor: pointer;
                    -webkit-appearance: none;
                    appearance: none;
                }
                .abh-trigger:hover {
                    color: var(--c2, #000);
                }
                .abh-trigger:focus-visible {
                    outline: 2px solid var(--c2, #000);
                    outline-offset: 3px;
                }
                .abh-dialog {
                    max-width: min(22rem, 92vw);
                    width: 100%;
                    margin: auto;
                    border: 1px solid color-mix(in srgb, var(--c2, #000) 18%, transparent);
                    border-radius: 0;
                    padding: 0;
                    background: var(--bg, #faf3f4);
                    color: var(--c2, #000);
                    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
                }
                .abh-dialog::backdrop {
                    background: rgba(248, 248, 248, 0.45);
                    -webkit-backdrop-filter: blur(8px) saturate(1.1);
                    backdrop-filter: blur(8px) saturate(1.1);
                }
                .abh-panel {
                    padding: 1.15rem 1.2rem 1rem;
                    box-sizing: border-box;
                    text-align: center;
                }
                .abh-title {
                    margin: 0;
                    font-size: clamp(0.95rem, 1.4vw, 1.1rem);
                    font-variation-settings: var(--fv-title, "wght" 600);
                }
                .abh-body {
                    margin: 0.65rem 0 0;
                    font-size: clamp(0.82rem, 1.05vw, 0.92rem);
                    font-variation-settings: var(--fv-body, "wght" 400);
                    line-height: 1.5;
                    color: color-mix(in srgb, var(--c2, #000) 90%, var(--bg, #fff));
                }
                .abh-email {
                    color: inherit;
                    font-variation-settings: var(--fv-nav-active, "wght" 550);
                    text-decoration: underline;
                    text-underline-offset: 0.15em;
                }
                .abh-close {
                    margin-top: 1rem;
                    font-family: inherit;
                    font-variation-settings: var(--fv-nav-active, "wght" 550);
                    font-size: clamp(0.62rem, 0.95vw, 0.75rem);
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    border: 1px solid color-mix(in srgb, var(--c2, #000) 28%, transparent);
                    background: transparent;
                    color: var(--c2, #000);
                    padding: 0.55rem 1rem;
                    cursor: pointer;
                    border-radius: 0;
                    -webkit-appearance: none;
                    appearance: none;
                }
                .abh-close:hover {
                    background: color-mix(in srgb, var(--c2, #000) 6%, transparent);
                }
                .abh-close:focus-visible {
                    outline: 2px solid var(--c2, #000);
                    outline-offset: 2px;
                }
            </style>
            <button type="button" class="abh-trigger">${escapeHtml(c.trigger)}</button>
            <dialog class="abh-dialog" aria-labelledby="abhTitle">
                <div class="abh-panel">
                    <h3 class="abh-title" id="abhTitle">${escapeHtml(c.title)}</h3>
                    <p class="abh-body">${escapeHtml(c.body)} <a class="abh-email" href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>.</p>
                    <button type="button" class="abh-close">${escapeHtml(c.close)}</button>
                </div>
            </dialog>
        `;
    }
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

if (!customElements.get('app-auth-browser-help')) {
    customElements.define('app-auth-browser-help', AuthBrowserHelp);
}

export { AuthBrowserHelp };
