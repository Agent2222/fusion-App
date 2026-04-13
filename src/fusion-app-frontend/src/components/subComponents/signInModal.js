/**
 * Internet Identity sign-in modal (opens from header / `fusion-open-sign-in`).
 * Visual parity with `app-join-network` dialog (backdrop blur, panel bg, top-right dismiss).
 */
import { ERROR_USER_INTERRUPT } from '@dfinity/auth-client';
import { loginInternetIdentity } from '../../utils/icAuth.js';

class SignInModal extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        /** @type {HTMLDialogElement | null} */
        this._dlg = null;
        this._onOpen = () => this.open();
        this._onLocale = () => this._syncCopy();
    }

    connectedCallback() {
        this.render();
        window.addEventListener('fusion-open-sign-in', this._onOpen);
        window.addEventListener('fusion-localechange', this._onLocale);
    }

    disconnectedCallback() {
        window.removeEventListener('fusion-open-sign-in', this._onOpen);
        window.removeEventListener('fusion-localechange', this._onLocale);
    }

    /** @returns {'en' | 'ja'} */
    _loc() {
        try {
            if (typeof window.getLocale === 'function') {
                const v = window.getLocale();
                if (v === 'ja') return 'ja';
            }
        } catch (_) {
            /* ignore */
        }
        return 'en';
    }

    _syncCopy() {
        const en = this._loc() === 'en';
        const t = this.shadowRoot;
        if (!t) return;
        const title = t.querySelector('#siTitle');
        const body = t.querySelector('#siBody');
        const primary = t.querySelector('#siPrimary');
        const cancel = t.querySelector('#siCancel');
        if (title) title.textContent = en ? 'Sign in' : 'サインイン';
        if (body) {
            body.textContent = en
                ? 'Continue with Internet Identity to access your account.'
                : 'Internet Identityで続行し、アカウントにアクセスします。';
        }
        if (primary) {
            primary.textContent = en ? 'Continue with Internet Identity' : 'Internet Identityで続行';
        }
        if (cancel) {
            cancel.setAttribute('aria-label', en ? 'Cancel' : 'キャンセル');
        }
    }

    open() {
        const dlg = this._dlg || this.shadowRoot?.querySelector('.si-dialog');
        if (dlg && typeof dlg.showModal === 'function') {
            dlg.showModal();
            this._syncCopy();
            const err = this.shadowRoot?.querySelector('#siErr');
            if (err) err.textContent = '';
            requestAnimationFrame(() => {
                this.shadowRoot?.querySelector('#siPrimary')?.focus?.();
            });
        }
    }

    close() {
        const dlg = this._dlg || this.shadowRoot?.querySelector('.si-dialog');
        if (dlg && typeof dlg.close === 'function') dlg.close();
    }

    render() {
        const en = this._loc() === 'en';
        this.shadow.innerHTML = `
            <style>
                :host {
                    --si-c2: var(--c2, #000000);
                    --si-c3: var(--c3, #ffffff);
                    --si-c4: var(--c4, #a2b792);
                    --si-c5: var(--c5, #d9ceb8);
                    --si-bg: var(--bg, #faf3f4);
                }
                .si-dialog {
                    --si-pad: 1.35rem;
                    max-width: min(520px, 96vw);
                    width: 100%;
                    border: 1px solid color-mix(in srgb, var(--si-c2) 18%, transparent);
                    border-radius: 0;
                    padding: 0;
                    background: var(--si-bg);
                    color: var(--si-c2);
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
                }
                .si-dialog::backdrop {
                    /* Match join-network modal: light scrim + blur */
                    background: rgba(248, 248, 248, 0.4);
                    -webkit-backdrop-filter: blur(20px) saturate(1.15);
                    backdrop-filter: blur(10px) saturate(1.15);
                }
                .si-texture {
                    position: absolute;
                    inset: 0;
                    border-radius: 0;
                    pointer-events: none;
                    opacity: 0.35;
                    background:
                        radial-gradient(ellipse 80% 60% at 15% 10%, color-mix(in srgb, var(--si-c5) 50%, transparent), transparent 55%),
                        radial-gradient(ellipse 70% 50% at 90% 0%, color-mix(in srgb, var(--si-c4) 35%, transparent), transparent 50%),
                        radial-gradient(ellipse 60% 45% at 50% 100%, color-mix(in srgb, var(--si-c5) 40%, transparent), transparent 50%);
                }
                .si-dialog-inner {
                    position: relative;
                    padding: var(--si-pad);
                    max-height: min(90vh, 880px);
                    overflow-y: auto;
                    box-sizing: border-box;
                }
                .si-close {
                    position: absolute;
                    top: 0.65rem;
                    right: 0.65rem;
                    z-index: 2;
                    width: 2.5rem;
                    height: 2.5rem;
                    border: 1px solid transparent;
                    background: transparent;
                    font-size: 1.5rem;
                    line-height: 1;
                    cursor: pointer;
                    color: var(--si-c2);
                    border-radius: 0;
                    font-variation-settings: var(--fv-body, "wght" 400);
                    padding: 0;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .si-close:hover {
                    background: color-mix(in srgb, var(--si-c2) 6%, transparent);
                }
                .si-close:focus-visible {
                    outline: 2px solid var(--si-c2);
                    outline-offset: 2px;
                }
                .si-panel-head {
                    text-align: center;
                    margin-bottom: 1rem;
                    padding-right: 2rem;
                    padding-left: 2rem;
                    box-sizing: border-box;
                }
                .si-title {
                    font-family: 'momochidori-variable', sans-serif;
                    font-variation-settings: var(--fv-title, "wght" 600);
                    font-size: clamp(1.2rem, 2.4vw, 1.55rem);
                    margin: 0;
                    color: var(--si-c2);
                }
                .si-body {
                    margin: 0.35rem 0 0;
                    font-size: clamp(0.88rem, 1.15vw, 1rem);
                    font-variation-settings: var(--fv-body, "wght" 400);
                    color: color-mix(in srgb, var(--si-c2) 92%, var(--si-bg));
                    line-height: 1.45;
                }
                .si-live {
                    min-height: 1.25rem;
                    margin: 0.75rem 0 0;
                    font-size: 0.88rem;
                    color: #a01818;
                }
                .si-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                    justify-content: center;
                    margin-top: 1.25rem;
                }
                .si-btn {
                    font-family: inherit;
                    font-variation-settings: var(--fv-nav-active, "wght" 550);
                    font-size: clamp(0.65rem, 1vw, 0.8rem);
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    border: 1px solid color-mix(in srgb, var(--si-c2) 28%, transparent);
                    padding: 0.65rem 1.25rem;
                    cursor: pointer;
                    -webkit-appearance: none;
                    appearance: none;
                    border-radius: 0;
                }
                .si-btn--primary {
                    background: var(--si-c5);
                    color: var(--si-c2);
                    margin-top: 0.75rem;
                }
                .si-btn--primary:hover:not(:disabled) {
                    opacity: 0.88;
                }
                .si-btn--primary:focus-visible {
                    outline: 2px solid var(--si-c2);
                    outline-offset: 2px;
                }
            </style>
            <dialog class="si-dialog" aria-labelledby="siTitle">
                <div class="si-texture" aria-hidden="true"></div>
                <div class="si-dialog-inner">
                    <button type="button" class="si-close" id="siCancel" aria-label="${en ? 'Cancel' : 'キャンセル'}">×</button>
                    <div class="si-panel-head">
                        <h2 class="si-title" id="siTitle">${en ? 'Sign in' : 'サインイン'}</h2>
                        <p class="si-body" id="siBody">${en ? 'Continue with Internet Identity to access your account.' : 'Internet Identityで続行し、アカウントにアクセスします。'}</p>
                    </div>
                    <p id="siErr" class="si-live" aria-live="polite"></p>
                    <div class="si-actions">
                        <button type="button" class="si-btn si-btn--primary" id="siPrimary">${en ? 'Continue with Internet Identity' : 'Internet Identityで続行'}</button>
                    </div>
                </div>
            </dialog>
        `;
        this._dlg = this.shadow.querySelector('.si-dialog');
        const cancel = this.shadow.querySelector('#siCancel');
        const primary = this.shadow.querySelector('#siPrimary');
        cancel?.addEventListener('click', () => this.close());
        primary?.addEventListener('click', async () => {
            const errEl = this.shadow.querySelector('#siErr');
            if (errEl) errEl.textContent = '';
            try {
                await loginInternetIdentity();
                this.close();
            } catch (e) {
                if (e === ERROR_USER_INTERRUPT) {
                    return;
                }
                const msg = e instanceof Error ? e.message : String(e);
                const el = this.shadow.querySelector('#siErr');
                if (el) el.textContent = msg || 'Sign-in failed.';
            }
        });
    }
}

customElements.define('app-sign-in-modal', SignInModal);

export { SignInModal };
