/**
 * Body-mounted Program Draw finish dialog: loading → success / error.
 * Mounted on document.body so form `_refresh()` does not destroy it.
 */

import { navigate } from '../../router.js';

const COPY = {
    en: {
        titleFinishing: 'Finishing your entry',
        bodyFinishing: 'Creating your Fusion account and entering the Program Draw…',
        titleOk: "You're entered",
        bodyOk:
            'Your Program Draw entry is confirmed. Open Fusion Studio to track your draw status under My programs.',
        titleFail: 'Could not finish entry',
        bodyFail:
            'Something went wrong while completing your entry. You can try again, or contact the team if you need help.',
        notice: 'Please do not close this window until entry is complete.',
        contactLead: 'Questions or issues?',
        contactEmail: 'info@fusionart.world',
        studioCta: 'Open Fusion Studio',
        close: 'Close',
        retry: 'Try again',
    },
    ja: {
        titleFinishing: 'エントリーを完了しています',
        bodyFinishing: 'Fusionアカウントを作成し、プログラム抽選にエントリーしています…',
        titleOk: 'エントリー完了',
        bodyOk:
            'プログラム抽選へのエントリーが完了しました。Fusion Studio の「マイプログラム」で抽選ステータスを確認できます。',
        titleFail: 'エントリーを完了できませんでした',
        bodyFail:
            'エントリー完了中に問題が発生しました。もう一度お試しいただくか、サポートまでご連絡ください。',
        notice: 'エントリーが完了するまで、このウィンドウを閉じないでください。',
        contactLead: 'ご不明点はこちらへ',
        contactEmail: 'info@fusionart.world',
        studioCta: 'Fusion Studio を開く',
        close: '閉じる',
        retry: 'もう一度試す',
    },
};

function loc() {
    return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
}

/**
 * Ensure a single finish modal exists on document.body.
 * @returns {ProgramDrawFinishModal}
 */
export function ensureProgramDrawFinishModal() {
    const existing = document.querySelector('app-program-draw-finish-modal');
    if (existing instanceof ProgramDrawFinishModal) return existing;
    const el = document.createElement('app-program-draw-finish-modal');
    document.body.appendChild(el);
    return /** @type {ProgramDrawFinishModal} */ (el);
}

class ProgramDrawFinishModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        /** @type {HTMLDialogElement | null} */
        this._dlg = null;
        /** @type {AbortController | null} */
        this._abort = null;
        /** @type {'finishing' | 'success' | 'error'} */
        this._phase = 'finishing';
        /** @type {string} */
        this._errorMessage = '';
        /** @type {(() => void) | null} */
        this._onRetry = null;
    }

    connectedCallback() {
        this._render();
    }

    disconnectedCallback() {
        this._abort?.abort();
        this._abort = null;
    }

    /**
     * @param {{
     *   phase?: 'finishing' | 'success' | 'error',
     *   errorMessage?: string,
     *   onRetry?: () => void,
     * }} [opts]
     */
    open(opts = {}) {
        if (!this.shadowRoot) this._render();
        this._phase = opts.phase === 'success' || opts.phase === 'error' ? opts.phase : 'finishing';
        this._errorMessage = String(opts.errorMessage || '').trim();
        this._onRetry = typeof opts.onRetry === 'function' ? opts.onRetry : null;
        this._applyContent();
        const dlg = this._dlg || this.shadowRoot?.querySelector('.pdf-dialog');
        if (!(dlg instanceof HTMLDialogElement)) return;
        this._dlg = dlg;
        if (!dlg.open) dlg.showModal();
        this._focusPrimary();
    }

    /**
     * @param {'finishing' | 'success' | 'error'} phase
     * @param {{ errorMessage?: string, onRetry?: () => void }} [opts]
     */
    setPhase(phase, opts = {}) {
        this._phase = phase === 'success' || phase === 'error' ? phase : 'finishing';
        if (opts.errorMessage != null) this._errorMessage = String(opts.errorMessage || '').trim();
        if (opts.onRetry !== undefined) {
            this._onRetry = typeof opts.onRetry === 'function' ? opts.onRetry : null;
        }
        this._applyContent();
        const dlg = this._dlg || this.shadowRoot?.querySelector('.pdf-dialog');
        if (dlg instanceof HTMLDialogElement && !dlg.open) dlg.showModal();
        this._focusPrimary();
    }

    close() {
        const dlg = this._dlg || this.shadowRoot?.querySelector('.pdf-dialog');
        if (dlg instanceof HTMLDialogElement && dlg.open) dlg.close();
    }

    _focusPrimary() {
        const sel =
            this._phase === 'success'
                ? '[data-pdf-studio]'
                : this._phase === 'error'
                  ? '[data-pdf-retry]'
                  : null;
        if (!sel) return;
        const primary = this.shadowRoot?.querySelector(sel);
        if (primary instanceof HTMLElement) {
            queueMicrotask(() => primary.focus());
        }
    }

    _applyContent() {
        const L = COPY[loc()];
        const phase = this._phase;
        const title = this.shadowRoot?.querySelector('#pdf-title');
        const body = this.shadowRoot?.querySelector('#pdf-body');
        const notice = this.shadowRoot?.querySelector('#pdf-notice');
        const spinner = this.shadowRoot?.querySelector('[data-pdf-spinner]');
        const studioBtn = this.shadowRoot?.querySelector('[data-pdf-studio]');
        const retryBtn = this.shadowRoot?.querySelector('[data-pdf-retry]');
        const closeBtn = this.shadowRoot?.querySelector('[data-pdf-close-action]');
        const xClose = this.shadowRoot?.querySelector('[data-pdf-close]');

        if (title instanceof HTMLElement) {
            title.textContent =
                phase === 'success' ? L.titleOk : phase === 'error' ? L.titleFail : L.titleFinishing;
        }
        if (body instanceof HTMLElement) {
            body.textContent =
                phase === 'success'
                    ? L.bodyOk
                    : phase === 'error'
                      ? this._errorMessage || L.bodyFail
                      : L.bodyFinishing;
        }
        if (notice instanceof HTMLElement) {
            notice.hidden = phase !== 'finishing';
            notice.textContent = L.notice;
        }
        if (spinner instanceof HTMLElement) {
            spinner.hidden = phase !== 'finishing';
            spinner.setAttribute('aria-hidden', phase === 'finishing' ? 'false' : 'true');
        }
        if (studioBtn instanceof HTMLElement) {
            studioBtn.hidden = phase !== 'success';
            studioBtn.textContent = L.studioCta;
        }
        if (retryBtn instanceof HTMLElement) {
            retryBtn.hidden = phase !== 'error' || !this._onRetry;
            retryBtn.textContent = L.retry;
        }
        if (closeBtn instanceof HTMLElement) {
            closeBtn.hidden = phase === 'finishing';
            closeBtn.textContent = L.close;
        }
        if (xClose instanceof HTMLElement) {
            xClose.hidden = phase === 'finishing';
        }
        const dlg = this.shadowRoot?.querySelector('.pdf-dialog');
        if (dlg instanceof HTMLElement) {
            dlg.setAttribute('data-phase', phase);
            dlg.setAttribute('aria-busy', phase === 'finishing' ? 'true' : 'false');
        }
    }

    _render() {
        if (!this.shadowRoot) return;
        const L = COPY[loc()];
        this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <dialog class="pdf-dialog" data-phase="finishing" aria-labelledby="pdf-title" aria-busy="true">
        <button type="button" class="pdf-close" data-pdf-close aria-label="${L.close}" hidden>×</button>
        <div class="pdf-inner">
          <div class="pdf-spinner" data-pdf-spinner aria-hidden="false">
            <div class="pdf-spinner-ring"></div>
          </div>
          <h2 class="pdf-title" id="pdf-title">${L.titleFinishing}</h2>
          <p class="pdf-body" id="pdf-body">${L.bodyFinishing}</p>
          <p class="pdf-notice" id="pdf-notice" role="note">${L.notice}</p>
          <p class="pdf-contact">
            <span class="pdf-contact-lead">${L.contactLead}</span>
            <a class="pdf-contact-mail" href="mailto:info@fusionart.world">${L.contactEmail}</a>
          </p>
          <div class="pdf-actions">
            <button type="button" class="pdf-btn pdf-btn--primary" data-pdf-studio hidden>${L.studioCta}</button>
            <button type="button" class="pdf-btn pdf-btn--primary" data-pdf-retry hidden>${L.retry}</button>
            <button type="button" class="pdf-link" data-pdf-close-action data-pdf-close hidden>${L.close}</button>
          </div>
        </div>
      </dialog>
    `;
        this._dlg = this.shadowRoot.querySelector('.pdf-dialog');
        this._abort?.abort();
        this._abort = new AbortController();
        const signal = this._abort.signal;

        this.shadowRoot.querySelectorAll('[data-pdf-close]').forEach((el) => {
            el.addEventListener(
                'click',
                () => {
                    if (this._phase === 'finishing') return;
                    this.close();
                },
                { signal },
            );
        });
        this._dlg?.addEventListener(
            'cancel',
            (e) => {
                if (this._phase === 'finishing') {
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                this.close();
            },
            { signal },
        );
        this.shadowRoot.querySelector('[data-pdf-studio]')?.addEventListener(
            'click',
            () => {
                this.close();
                navigate('/settings/profile#programs');
            },
            { signal },
        );
        this.shadowRoot.querySelector('[data-pdf-retry]')?.addEventListener(
            'click',
            () => {
                const retry = this._onRetry;
                this.close();
                if (retry) retry();
            },
            { signal },
        );
    }

    _styles() {
        return `
      :host {
        display: contents;
      }

      .pdf-dialog::backdrop {
        background: color-mix(in srgb, #000 55%, transparent);
      }

      .pdf-dialog:not([open]) {
        display: none;
      }

      .pdf-dialog[open] {
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

      .pdf-inner {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        padding: clamp(1.75rem, 3.5vw, 2.5rem);
        padding-top: clamp(2rem, 4vw, 2.75rem);
      }

      .pdf-close {
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

      .pdf-close[hidden] {
        display: none;
      }

      .pdf-spinner {
        display: flex;
        justify-content: center;
        margin: 0 0 1.25rem;
      }

      .pdf-spinner[hidden] {
        display: none;
      }

      .pdf-spinner-ring {
        width: 2.5rem;
        height: 2.5rem;
        border: 2px solid color-mix(in srgb, var(--c2, #111) 18%, transparent);
        border-top-color: var(--c2, #111);
        border-radius: 50%;
        animation: pdf-spin 0.75s linear infinite;
      }

      @keyframes pdf-spin {
        to { transform: rotate(360deg); }
      }

      .pdf-title {
        margin: 0 0 0.65rem;
        padding-right: 2rem;
        font-size: clamp(1.5rem, 2.4vw, 1.75rem);
        line-height: 1.2;
        letter-spacing: -0.02em;
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
        color: var(--c2, #111);
      }

      .pdf-body {
        margin: 0 0 1rem;
        max-width: 28rem;
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdf-notice {
        margin: 0 0 1rem;
        padding: 0.75rem 0.9rem;
        border: 1px solid color-mix(in srgb, var(--c2, #111) 22%, transparent);
        background: color-mix(in srgb, var(--c2, #111) 6%, transparent);
        font-size: 0.88rem;
        line-height: 1.45;
        font-variation-settings: var(--fv-body);
      }

      .pdf-notice[hidden] {
        display: none;
      }

      .pdf-contact {
        margin: 0 0 1.35rem;
        font-size: 0.88rem;
        line-height: 1.45;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdf-contact-lead {
        margin-right: 0.35rem;
      }

      .pdf-contact-mail {
        color: var(--c2, #111);
        text-underline-offset: 0.15em;
      }

      .pdf-contact-mail:hover {
        opacity: 0.8;
      }

      .pdf-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 1rem 1.25rem;
      }

      .pdf-btn {
        appearance: none;
        border: 1px solid var(--c2, #111);
        background: var(--c2, #111);
        color: var(--bg, #fff);
        padding: 0.75rem 1.25rem;
        font: inherit;
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-variation-settings: var(--fv-cta);
        cursor: pointer;
      }

      .pdf-btn[hidden] {
        display: none;
      }

      .pdf-btn:hover {
        opacity: 0.9;
      }

      .pdf-btn:focus-visible {
        outline: 2px solid var(--c2, #111);
        outline-offset: 2px;
      }

      .pdf-link {
        appearance: none;
        border: 0;
        background: transparent;
        padding: 0;
        color: var(--c2, #111);
        font: inherit;
        font-size: 0.9rem;
        text-decoration: underline;
        text-underline-offset: 0.18em;
        cursor: pointer;
        font-variation-settings: var(--fv-body);
      }

      .pdf-link[hidden] {
        display: none;
      }

      .pdf-link:hover {
        opacity: 0.8;
      }
    `;
    }
}

customElements.define('app-program-draw-finish-modal', ProgramDrawFinishModal);
