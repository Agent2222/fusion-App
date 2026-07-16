/**
 * Minimal newsletter email capture for footer + mobile header drawer.
 */
import posthog from 'posthog-js';
import { DEV_MODE } from '../../config.js';
import {
    prefetchFusionBackendActor,
} from '../../utils/earlyAccessSubscribe.js';
import {
    isValidNewsletterEmail,
    normalizeNewsletterEmail,
    submitNewsletterSubscription,
} from '../../utils/newsletterSubscribe.js';
import { syncPosthogConversionPerson } from '../../utils/posthogConversionIdentity.js';

const COPY = {
    en: {
        label: 'Newsletter',
        placeholder: 'Your email',
        submit: 'Subscribe',
        submitting: 'Sending…',
        success: "Thanks — you're on the list.",
        invalid: 'Enter a valid email.',
        error: 'Could not subscribe. Try again.',
    },
    ja: {
        label: 'ニュースレター',
        placeholder: 'メールアドレス',
        submit: '登録',
        submitting: '送信中…',
        success: 'ご登録ありがとうございました。',
        invalid: '有効なメールアドレスを入力してください。',
        error: '登録に失敗しました。もう一度お試しください。',
    },
};

/**
 * @returns {'en' | 'ja'}
 */
function readLocale() {
    if (typeof window.getLocale === 'function' && window.getLocale() === 'ja') return 'ja';
    if (typeof document !== 'undefined' && document.documentElement.lang === 'ja') return 'ja';
    return 'en';
}

class NewsletterSubscribeComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        /** @type {boolean} */
        this._submitting = false;
        /** @type {(() => void) | null} */
        this._onLocaleChange = null;
        /** @type {(e: Event) => void} */
        this._onSubmit = (e) => {
            void this._handleSubmit(e);
        };
    }

    static get observedAttributes() {
        return ['variant'];
    }

    /** @returns {'footer' | 'drawer'} */
    get variant() {
        const v = (this.getAttribute('variant') || 'footer').trim();
        return v === 'drawer' ? 'drawer' : 'footer';
    }

    connectedCallback() {
        this.render();
        this._bindForm();
        prefetchFusionBackendActor();
        this._onLocaleChange = () => this._applyLocaleCopy();
        window.addEventListener('fusion-localechange', this._onLocaleChange);
    }

    disconnectedCallback() {
        if (this._onLocaleChange) {
            window.removeEventListener('fusion-localechange', this._onLocaleChange);
            this._onLocaleChange = null;
        }
        const form = this.shadowRoot?.querySelector('form');
        form?.removeEventListener('submit', this._onSubmit);
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'variant' && oldVal !== newVal && this.isConnected) {
            this.render();
            this._bindForm();
        }
    }

    _bindForm() {
        const form = this.shadowRoot?.querySelector('form');
        if (!form) return;
        form.removeEventListener('submit', this._onSubmit);
        form.addEventListener('submit', this._onSubmit);
    }

    _copy() {
        return COPY[readLocale()];
    }

    _applyLocaleCopy() {
        const root = this.shadowRoot;
        if (!root) return;
        const c = this._copy();
        const label = root.querySelector('.ns-label');
        const input = root.querySelector('.ns-email');
        const btn = root.querySelector('.ns-submit');
        if (label) label.textContent = c.label;
        if (input instanceof HTMLInputElement) {
            input.placeholder = c.placeholder;
            input.setAttribute('aria-label', c.label);
        }
        if (btn instanceof HTMLButtonElement && !this._submitting) {
            btn.textContent = c.submit;
        }
    }

    /**
     * @param {string} message
     * @param {'idle' | 'ok' | 'err'} kind
     */
    _setStatus(message, kind = 'idle') {
        const status = this.shadowRoot?.querySelector('.ns-status');
        if (!status) return;
        status.textContent = message || '';
        status.dataset.kind = kind;
    }

    /**
     * @param {Event} e
     */
    async _handleSubmit(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this._submitting) return;

        const root = this.shadowRoot;
        if (!root) return;
        const c = this._copy();
        const input = root.querySelector('.ns-email');
        const btn = root.querySelector('.ns-submit');
        const email =
            input instanceof HTMLInputElement
                ? normalizeNewsletterEmail(input.value)
                : '';

        this._setStatus('', 'idle');

        if (!isValidNewsletterEmail(email)) {
            this._setStatus(c.invalid, 'err');
            input?.focus();
            return;
        }

        this._submitting = true;
        if (btn instanceof HTMLButtonElement) {
            btn.disabled = true;
            btn.textContent = c.submitting;
        }

        try {
            await submitNewsletterSubscription(email);
            syncPosthogConversionPerson({ email });
            posthog.capture('newsletter_subscribed', {
                source: this.variant,
                category: 'Newsletter',
                ads_conversion: 'Lead',
            });
            if (input instanceof HTMLInputElement) input.value = '';
            this._setStatus(c.success, 'ok');
        } catch (err) {
            if (DEV_MODE) console.error('[Newsletter] subscribe failed', err);
            posthog.capture('newsletter_subscribe_failed', { source: this.variant });
            const msg =
                err instanceof Error && /valid email/i.test(err.message)
                    ? c.invalid
                    : c.error;
            this._setStatus(msg, 'err');
        } finally {
            this._submitting = false;
            if (btn instanceof HTMLButtonElement) {
                btn.disabled = false;
                btn.textContent = this._copy().submit;
            }
        }
    }

    render() {
        const c = this._copy();
        const variant = this.variant;
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    font-family: 'momochidori-variable', sans-serif;
                    color: var(--c2, #000);
                }

                .ns {
                    display: flex;
                    flex-direction: column;
                    gap: 0.45rem;
                    width: 100%;
                    box-sizing: border-box;
                }

                .ns-label {
                    font-variation-settings: var(--fv-nav-active);
                    font-size: clamp(0.78rem, 1vw, 0.95rem);
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }

                .ns-form {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                    width: 100%;
                }

                .ns-email {
                    width: 100%;
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0.45rem 0;
                    border: none;
                    border-bottom: 1.5px solid var(--c2, #000);
                    border-radius: 0;
                    background: transparent;
                    color: var(--c2, #000);
                    font-family: inherit;
                    font-variation-settings: var(--fv-label);
                    font-size: clamp(0.85rem, 1.05vw, 1rem);
                    outline: none;
                    -webkit-appearance: none;
                    appearance: none;
                }

                .ns-email::placeholder {
                    color: var(--c2, #000);
                    opacity: 0.45;
                }

                .ns-email:focus,
                .ns-email:focus-visible {
                    outline: none;
                    border-bottom-color: var(--c2, #000);
                }

                .ns-submit {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0.35rem 0;
                    border: none;
                    border-bottom: 1.5px solid var(--c2, #000);
                    border-radius: 0;
                    background: transparent;
                    color: var(--c2, #000);
                    font-family: inherit;
                    font-variation-settings: var(--fv-nav-active);
                    font-size: clamp(0.78rem, 1vw, 0.95rem);
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    text-align: left;
                    cursor: pointer;
                    -webkit-appearance: none;
                    appearance: none;
                }

                .ns-submit:hover {
                    background: var(--c2, #000);
                    color: var(--bg, #fff);
                }

                .ns-submit:disabled {
                    cursor: not-allowed;
                    opacity: 0.45;
                }

                .ns-submit:disabled:hover {
                    background: transparent;
                    color: var(--c2, #000);
                }

                .ns-status {
                    min-height: 1.1em;
                    margin: 0;
                    font-size: clamp(0.72rem, 0.9vw, 0.85rem);
                    font-variation-settings: var(--fv-label);
                    line-height: 1.35;
                    opacity: 0.85;
                }

                .ns-status[data-kind="ok"] {
                    opacity: 1;
                }

                .ns-status[data-kind="err"] {
                    opacity: 1;
                }

                :host([variant="footer"]) .ns {
                    gap: 0.7rem;
                    align-items: center;
                    text-align: center;
                }

                :host([variant="footer"]) .ns-label {
                    font-size: clamp(0.72rem, 0.9vw, 0.85rem);
                    letter-spacing: 0.14em;
                    opacity: 0.85;
                }

                :host([variant="footer"]) .ns-form {
                    flex-direction: row;
                    align-items: flex-end;
                    justify-content: center;
                    gap: 1rem;
                }

                :host([variant="footer"]) .ns-email {
                    flex: 1 1 auto;
                    min-width: 0;
                    padding-bottom: 0.4rem;
                }

                :host([variant="footer"]) .ns-submit {
                    flex: 0 0 auto;
                    white-space: nowrap;
                    text-align: center;
                    padding: 0.3rem 0.85rem 0.4rem;
                }

                :host([variant="footer"]) .ns-status {
                    text-align: center;
                }

                @media (max-width: 640px) {
                    :host([variant="footer"]) .ns-form {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 0.5rem;
                    }

                    :host([variant="footer"]) .ns-submit {
                        align-self: center;
                    }
                }

                :host([variant="drawer"]) .ns {
                    gap: 0.65rem;
                }

                :host([variant="drawer"]) .ns-label {
                    font-size: clamp(0.85rem, 3vw, 1rem);
                    text-align: right;
                }

                :host([variant="drawer"]) .ns-form {
                    gap: 0.55rem;
                }

                :host([variant="drawer"]) .ns-email {
                    font-size: clamp(0.9rem, 3.2vw, 1.05rem);
                    padding: 0.65rem 0;
                    text-align: right;
                }

                :host([variant="drawer"]) .ns-submit {
                    width: 100%;
                    min-height: 2.25rem;
                    padding: 0.9rem 0.95rem;
                    border: 1.5px solid var(--c2, #000);
                    border-bottom: 1.5px solid var(--c2, #000);
                    text-align: center;
                    font-size: clamp(0.65rem, 0.95vw, 0.8rem);
                    letter-spacing: 0.06em;
                }

                :host([variant="drawer"]) .ns-submit:hover {
                    background: var(--c2, #000);
                    color: var(--bg, #fff);
                }

                :host([variant="drawer"]) .ns-status {
                    text-align: right;
                    font-size: clamp(0.75rem, 2.8vw, 0.88rem);
                }
            </style>
            <div class="ns" data-variant="${variant}">
                <div class="ns-label">${c.label}</div>
                <form class="ns-form" novalidate>
                    <input
                        class="ns-email"
                        type="email"
                        name="email"
                        autocomplete="email"
                        inputmode="email"
                        placeholder="${c.placeholder}"
                        aria-label="${c.label}"
                    />
                    <button type="submit" class="ns-submit">${c.submit}</button>
                </form>
                <p class="ns-status" role="status" aria-live="polite" data-kind="idle"></p>
            </div>
        `;
    }
}

if (!customElements.get('app-newsletter-subscribe')) {
    customElements.define('app-newsletter-subscribe', NewsletterSubscribeComponent);
}

export { NewsletterSubscribeComponent };
