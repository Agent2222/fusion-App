/**
 * Post-capture dialog for Program Draw $50 guest pay-first flow.
 * Shown only after PayPal capture succeeds (or when capture failed).
 */

const COPY = {
    en: {
        titleOk: 'Payment received',
        bodyOk:
            'Your Program Draw payment was received. Next, create or link your Fusion account with Internet Identity so we can complete your entry.',
        titleFail: 'Payment not completed',
        bodyFail:
            'We could not confirm your payment. You were not charged for this attempt. You can try checkout again, or contact the team if you need help.',
        notice: 'Please do not close this window until you finish signing up.',
        contactLead: 'Questions or issues?',
        contactEmail: 'info@fusionart.world',
        continueCta: 'Continue to sign up',
        close: 'Close',
        tryAgain: 'Close',
    },
    ja: {
        titleOk: 'お支払いを確認しました',
        bodyOk:
            'プログラム抽選のお支払いを受け付けました。次に Internet Identity で Fusion アカウントを作成または連携し、エントリーを完了してください。',
        titleFail: 'お支払いが完了しませんでした',
        bodyFail:
            'お支払いを確認できませんでした。この試行では課金されていません。もう一度お試しいただくか、サポートまでご連絡ください。',
        notice: 'サインアップが完了するまで、このウィンドウを閉じないでください。',
        contactLead: 'ご不明点はこちらへ',
        contactEmail: 'info@fusionart.world',
        continueCta: 'サインアップへ進む',
        close: '閉じる',
        tryAgain: '閉じる',
    },
};

function loc() {
    return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
}

class ProgramDrawPaidModal extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        /** @type {HTMLDialogElement | null} */
        this._dlg = null;
        /** @type {AbortController | null} */
        this._abort = null;
        /** @type {{ orderId: string, programId: string, captured: boolean } | null} */
        this._ctx = null;
        /** @type {((detail: { orderId: string, programId: string }) => void) | null} */
        this._onContinue = null;
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
     *   orderId?: string,
     *   programId?: string,
     *   captured?: boolean,
     *   onContinue?: (detail: { orderId: string, programId: string }) => void,
     * }} [opts]
     */
    open(opts = {}) {
        if (!this.shadowRoot) this._render();
        this._ctx = {
            orderId: String(opts.orderId || '').trim(),
            programId: String(opts.programId || '').trim(),
            captured: opts.captured !== false,
        };
        this._onContinue = typeof opts.onContinue === 'function' ? opts.onContinue : null;
        this._applyContent();
        const dlg = this._dlg || this.shadowRoot?.querySelector('.pdp-dialog');
        if (!(dlg instanceof HTMLDialogElement)) return;
        this._dlg = dlg;
        if (!dlg.open) dlg.showModal();
        const primary = this.shadowRoot?.querySelector('[data-pdp-continue]');
        if (primary instanceof HTMLElement) {
            queueMicrotask(() => primary.focus());
        }
    }

    close() {
        const dlg = this._dlg || this.shadowRoot?.querySelector('.pdp-dialog');
        if (dlg instanceof HTMLDialogElement && dlg.open) dlg.close();
    }

    _applyContent() {
        const L = COPY[loc()];
        const captured = Boolean(this._ctx?.captured);
        const title = this.shadowRoot?.querySelector('#pdp-title');
        const body = this.shadowRoot?.querySelector('#pdp-body');
        const notice = this.shadowRoot?.querySelector('#pdp-notice');
        const continueBtn = this.shadowRoot?.querySelector('[data-pdp-continue]');
        const secondary = this.shadowRoot?.querySelector('[data-pdp-secondary]');
        if (title instanceof HTMLElement) title.textContent = captured ? L.titleOk : L.titleFail;
        if (body instanceof HTMLElement) body.textContent = captured ? L.bodyOk : L.bodyFail;
        if (notice instanceof HTMLElement) {
            notice.hidden = !captured;
            notice.textContent = L.notice;
        }
        if (continueBtn instanceof HTMLElement) {
            continueBtn.hidden = !captured;
            continueBtn.textContent = L.continueCta;
        }
        if (secondary instanceof HTMLElement) {
            secondary.textContent = captured ? L.close : L.tryAgain;
        }
    }

    _render() {
        if (!this.shadowRoot) return;
        const L = COPY[loc()];
        this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <dialog class="pdp-dialog" aria-labelledby="pdp-title">
        <button type="button" class="pdp-close" data-pdp-close aria-label="${L.close}">×</button>
        <div class="pdp-inner">
          <h2 class="pdp-title" id="pdp-title">${L.titleOk}</h2>
          <p class="pdp-body" id="pdp-body">${L.bodyOk}</p>
          <p class="pdp-notice" id="pdp-notice" role="note">${L.notice}</p>
          <p class="pdp-contact">
            <span class="pdp-contact-lead">${L.contactLead}</span>
            <a class="pdp-contact-mail" href="mailto:info@fusionart.world">${L.contactEmail}</a>
          </p>
          <div class="pdp-actions">
            <button type="button" class="pdp-btn pdp-btn--primary" data-pdp-continue>${L.continueCta}</button>
            <button type="button" class="pdp-link" data-pdp-secondary data-pdp-close>${L.close}</button>
          </div>
        </div>
      </dialog>
    `;
        this._dlg = this.shadowRoot.querySelector('.pdp-dialog');
        this._abort?.abort();
        this._abort = new AbortController();
        const signal = this._abort.signal;

        this.shadowRoot.querySelectorAll('[data-pdp-close]').forEach((el) => {
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
        this.shadowRoot.querySelector('[data-pdp-continue]')?.addEventListener(
            'click',
            () => {
                const detail = {
                    orderId: String(this._ctx?.orderId || '').trim(),
                    programId: String(this._ctx?.programId || '').trim(),
                };
                this.close();
                this.dispatchEvent(
                    new CustomEvent('fusion-draw-paid-continue', {
                        bubbles: true,
                        composed: true,
                        detail,
                    }),
                );
                if (this._onContinue) this._onContinue(detail);
            },
            { signal },
        );
    }

    _styles() {
        return `
      :host {
        display: contents;
      }

      .pdp-dialog::backdrop {
        background: color-mix(in srgb, #000 55%, transparent);
      }

      .pdp-dialog:not([open]) {
        display: none;
      }

      .pdp-dialog[open] {
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

      .pdp-inner {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        padding: clamp(1.75rem, 3.5vw, 2.5rem);
        padding-top: clamp(2rem, 4vw, 2.75rem);
      }

      .pdp-close {
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

      .pdp-title {
        margin: 0 0 0.65rem;
        padding-right: 2rem;
        font-size: clamp(1.5rem, 2.4vw, 1.75rem);
        line-height: 1.2;
        letter-spacing: -0.02em;
        font-variation-settings: var(--fv-body-wide);
        font-weight: 600;
        color: var(--c2, #111);
      }

      .pdp-body {
        margin: 0 0 1rem;
        max-width: 28rem;
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdp-notice {
        margin: 0 0 1rem;
        padding: 0.75rem 0.9rem;
        border: 1px solid color-mix(in srgb, var(--c2, #111) 22%, transparent);
        background: color-mix(in srgb, var(--c2, #111) 6%, transparent);
        font-size: 0.88rem;
        line-height: 1.45;
        font-variation-settings: var(--fv-body);
      }

      .pdp-contact {
        margin: 0 0 1.35rem;
        font-size: 0.88rem;
        line-height: 1.45;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body);
      }

      .pdp-contact-lead {
        margin-right: 0.35rem;
      }

      .pdp-contact-mail {
        color: var(--c2, #111);
        text-underline-offset: 0.15em;
      }

      .pdp-contact-mail:hover {
        opacity: 0.8;
      }

      .pdp-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 1rem 1.25rem;
      }

      .pdp-btn {
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

      .pdp-btn:hover {
        opacity: 0.9;
      }

      .pdp-btn:focus-visible {
        outline: 2px solid var(--c2, #111);
        outline-offset: 2px;
      }

      .pdp-link {
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

      .pdp-link:hover {
        opacity: 0.8;
      }
    `;
    }
}

customElements.define('app-program-draw-paid-modal', ProgramDrawPaidModal);
