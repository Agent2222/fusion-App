/**
 * Get Notified waitlist dialog for inactive Program Draw.
 * Writes subscribers via submitEarlyAccessToCanister (category Program Draw).
 */

import { submitEarlyAccessToCanister } from '../../utils/earlyAccessSubscribe.js';
import {
    isValidNewsletterEmail,
    normalizeNewsletterEmail,
} from '../../utils/newsletterSubscribe.js';
import { syncPosthogConversionPerson } from '../../utils/posthogConversionIdentity.js';
import posthog from 'posthog-js';

const COPY = {
    en: {
        title: 'Get notified',
        body: "Join the mailing list and we'll notify you as soon as the Program Draw opens.",
        emailLabel: 'Email address *',
        placeholder: 'you@example.com',
        join: 'Join waitlist',
        noThanks: 'No thanks',
        privacy: 'We respect your privacy. Unsubscribe anytime.',
        close: 'Close',
        invalid: 'Enter a valid email.',
        thanks: "Thanks — you're on the waitlist. We'll email you when the Program Draw opens.",
        error: 'Something went wrong. Please try again.',
    },
    ja: {
        title: '通知を受け取る',
        body: 'メーリングリストに登録すると、プログラム抽選が始まったときにお知らせします。',
        emailLabel: 'メールアドレス *',
        placeholder: 'you@example.com',
        join: 'ウェイトリストに登録',
        noThanks: 'いいえ',
        privacy: 'プライバシーを尊重します。いつでも解除できます。',
        close: '閉じる',
        invalid: '有効なメールアドレスを入力してください。',
        thanks: 'ご登録ありがとうございます。プログラム抽選が始まったらメールでお知らせします。',
        error: 'エラーが発生しました。もう一度お試しください。',
    },
};

function loc() {
    return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
}

class ProgramDrawNotifyModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        /** @type {HTMLDialogElement | null} */
        this._dlg = null;
        /** @type {AbortController | null} */
        this._abort = null;
    }

    connectedCallback() {
        this._render();
    }

    disconnectedCallback() {
        this._abort?.abort();
        this._abort = null;
    }

    open() {
        if (!this.shadowRoot) this._render();
        const dlg = this._dlg || this.shadowRoot?.querySelector('.pdn-dialog');
        if (!(dlg instanceof HTMLDialogElement)) return;
        this._dlg = dlg;
        this._resetForm();
        if (!dlg.open) dlg.showModal();
        const input = this.shadowRoot?.querySelector('#pdn-email');
        if (input instanceof HTMLInputElement) {
            queueMicrotask(() => input.focus());
        }
    }

    close() {
        const dlg = this._dlg || this.shadowRoot?.querySelector('.pdn-dialog');
        if (dlg instanceof HTMLDialogElement && dlg.open) dlg.close();
    }

    _resetForm() {
        const L = COPY[loc()];
        const form = this.shadowRoot?.querySelector('#pdn-form');
        const status = this.shadowRoot?.querySelector('#pdn-status');
        const actions = this.shadowRoot?.querySelector('.pdn-actions');
        const input = this.shadowRoot?.querySelector('#pdn-email');
        if (form instanceof HTMLFormElement) form.hidden = false;
        if (actions instanceof HTMLElement) actions.hidden = false;
        if (status instanceof HTMLElement) {
            status.hidden = true;
            status.textContent = '';
            status.classList.remove('pdn-status--ok', 'pdn-status--error');
        }
        if (input instanceof HTMLInputElement) {
            input.value = '';
            input.disabled = false;
        }
        const submit = this.shadowRoot?.querySelector('[data-pdn-submit]');
        if (submit instanceof HTMLButtonElement) {
            submit.disabled = false;
            submit.textContent = L.join;
        }
    }

    _render() {
        if (!this.shadowRoot) return;
        const L = COPY[loc()];
        this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <dialog class="pdn-dialog" aria-labelledby="pdn-title">
        <button type="button" class="pdn-close" data-pdn-close aria-label="${L.close}">×</button>
        <div class="pdn-inner">
          <h2 class="pdn-title" id="pdn-title">${L.title}</h2>
          <p class="pdn-body">${L.body}</p>
          <form id="pdn-form" novalidate>
            <label class="pdn-label" for="pdn-email">${L.emailLabel}</label>
            <input class="pdn-input" id="pdn-email" name="email" type="email" autocomplete="email" required placeholder="${L.placeholder}" />
            <p id="pdn-status" class="pdn-status" role="status" aria-live="polite" hidden></p>
            <div class="pdn-actions">
              <button type="submit" class="pdn-btn pdn-btn--primary" data-pdn-submit>${L.join}</button>
              <button type="button" class="pdn-link" data-pdn-close>${L.noThanks}</button>
            </div>
          </form>
          <p class="pdn-privacy">${L.privacy}</p>
        </div>
      </dialog>
    `;
        this._dlg = this.shadowRoot.querySelector('.pdn-dialog');
        this._abort?.abort();
        this._abort = new AbortController();
        const signal = this._abort.signal;

        this.shadowRoot.querySelectorAll('[data-pdn-close]').forEach((el) => {
            el.addEventListener('click', () => this.close(), { signal });
        });
        this._dlg?.addEventListener(
            'cancel',
            (e) => {
                e.preventDefault();
                this.close();
            },
            { signal },
        );
        this.shadowRoot.querySelector('#pdn-form')?.addEventListener(
            'submit',
            (e) => {
                e.preventDefault();
                void this._submit();
            },
            { signal },
        );
    }

    async _submit() {
        const L = COPY[loc()];
        const input = this.shadowRoot?.querySelector('#pdn-email');
        const status = this.shadowRoot?.querySelector('#pdn-status');
        const submit = this.shadowRoot?.querySelector('[data-pdn-submit]');
        const email =
            input instanceof HTMLInputElement ? normalizeNewsletterEmail(input.value) : '';
        if (!isValidNewsletterEmail(email)) {
            if (status instanceof HTMLElement) {
                status.hidden = false;
                status.textContent = L.invalid;
                status.classList.add('pdn-status--error');
                status.classList.remove('pdn-status--ok');
            }
            input?.focus();
            return;
        }
        if (submit instanceof HTMLButtonElement) submit.disabled = true;
        try {
            await submitEarlyAccessToCanister(email, 'Program Draw', '', 'program-draw');
            try {
                syncPosthogConversionPerson({ email });
                posthog.capture('newsletter_subscribed', {
                    source: 'program_draw_waitlist',
                    category: 'Program Draw',
                    ads_conversion: 'Lead',
                });
            } catch {
                /* ignore */
            }
            if (status instanceof HTMLElement) {
                status.hidden = false;
                status.textContent = L.thanks;
                status.classList.add('pdn-status--ok');
                status.classList.remove('pdn-status--error');
            }
            const actions = this.shadowRoot?.querySelector('.pdn-actions');
            if (actions instanceof HTMLElement) actions.hidden = true;
            if (input instanceof HTMLInputElement) input.disabled = true;
        } catch {
            try {
                posthog.capture('newsletter_subscribe_failed', { source: 'program_draw_waitlist' });
            } catch {
                /* ignore */
            }
            if (status instanceof HTMLElement) {
                status.hidden = false;
                status.textContent = L.error;
                status.classList.add('pdn-status--error');
                status.classList.remove('pdn-status--ok');
            }
            if (submit instanceof HTMLButtonElement) submit.disabled = false;
        }
    }

    _styles() {
        return `
      :host {
        display: contents;
      }

      .pdn-dialog::backdrop {
        background: color-mix(in srgb, #000 55%, transparent);
      }

      /* Closed dialogs must stay hidden — do not set display on the base rule. */
      .pdn-dialog:not([open]) {
        display: none;
      }

      .pdn-dialog[open] {
        position: relative;
        width: min(36rem, calc(100vw - 2.5rem));
        height: fit-content;
        max-height: none;
        margin: auto;
        padding: 0;
        border: none;
        border-radius: 12px;
        background: var(--bg, #fff);
        color: var(--c2, #111);
        box-shadow: 0 18px 48px color-mix(in srgb, #000 28%, transparent);
        box-sizing: border-box;
        font-family: inherit;
        overflow: hidden;
      }

      .pdn-inner {
        display: flex;
        flex-direction: column;
        gap: 0;
        box-sizing: border-box;
        padding: clamp(1.75rem, 3.5vw, 2.5rem);
        padding-top: clamp(2rem, 4vw, 2.75rem);
      }

      #pdn-form {
        display: flex;
        flex-direction: column;
        flex: 0 0 auto;
        min-width: 0;
      }

      .pdn-close {
        position: absolute;
        top: 0.85rem;
        right: 0.85rem;
        z-index: 2;
        width: 2rem;
        height: 2rem;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--c2, #111);
        font-size: 1.35rem;
        line-height: 1;
        cursor: pointer;
      }

      .pdn-title {
        margin: 0 0 0.65rem;
        padding-right: 2rem;
        font-size: clamp(1.5rem, 2.4vw, 1.75rem);
        line-height: 1.2;
        letter-spacing: -0.02em;
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
        color: var(--c2, #111);
      }

      .pdn-body {
        margin: 0 0 1.35rem;
        max-width: 28rem;
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdn-label {
        display: block;
        margin: 0 0 0.4rem;
        font-size: 0.82rem;
        line-height: 1.3;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
      }

      .pdn-input {
        display: block;
        width: 100%;
        min-height: 2.75rem;
        margin: 0 0 1.15rem;
        padding: 0.65rem 0.85rem;
        box-sizing: border-box;
        border: 1px solid color-mix(in srgb, var(--c2, #111) 28%, transparent);
        border-radius: 2px;
        background: var(--bg, #fff);
        color: var(--c2, #111);
        font: inherit;
        font-size: 0.95rem;
        font-variation-settings: var(--fv-body);
      }

      .pdn-input::placeholder {
        color: color-mix(in srgb, var(--c2, #111) 45%, transparent);
        font-variation-settings: var(--fv-body);
      }

      .pdn-input:focus-visible {
        outline: 2px solid var(--c2, #111);
        outline-offset: 2px;
      }

      .pdn-status {
        margin: -0.35rem 0 1rem;
        font-size: 0.86rem;
        line-height: 1.45;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdn-status--ok {
        color: var(--c2, #111);
      }

      .pdn-status--error {
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
      }

      .pdn-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.85rem 1.35rem;
        margin: 0;
        position: relative;
        z-index: 1;
      }

      .pdn-actions[hidden] {
        display: none !important;
      }

      .pdn-btn--primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.75rem;
        padding: 0.7rem 1.35rem;
        border: 1px solid var(--c2, #111);
        border-radius: 2px;
        background: var(--c2, #111);
        color: var(--bg, #fff);
        font: inherit;
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-variation-settings: var(--fv-cta);
        font-weight: 600;
        cursor: pointer;
        flex: 0 0 auto;
      }

      .pdn-btn--primary:hover:not(:disabled) {
        background: transparent;
        color: var(--c2, #111);
      }

      .pdn-btn--primary:disabled {
        opacity: 0.55;
        cursor: wait;
      }

      .pdn-link {
        margin: 0;
        padding: 0.35rem 0;
        border: 0;
        background: none;
        color: var(--c2, #111);
        font: inherit;
        font-size: 0.95rem;
        line-height: 1.3;
        text-decoration: underline;
        text-underline-offset: 0.18em;
        cursor: pointer;
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
        flex: 0 0 auto;
      }

      .pdn-link:hover {
        opacity: 0.7;
      }

      .pdn-privacy {
        margin: 1.25rem 0 0;
        padding-top: 0.15rem;
        font-size: 0.78rem;
        line-height: 1.45;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
        flex: 0 0 auto;
        position: relative;
        z-index: 0;
      }

      @media (max-width: 480px) {
        .pdn-dialog[open] {
          width: min(100vw - 1.5rem, 36rem);
        }
        .pdn-inner {
          padding: 1.5rem 1.25rem 1.35rem;
          padding-top: 2rem;
        }
        .pdn-actions { flex-direction: column; align-items: flex-start; }
      }
    `;
    }
}

customElements.define('app-program-draw-notify-modal', ProgramDrawNotifyModal);

export { ProgramDrawNotifyModal };
