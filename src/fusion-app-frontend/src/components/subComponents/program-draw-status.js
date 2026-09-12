/**
 * Program Draw Entry status card for Settings → My programs.
 * Shown only when the member is entered (or tester fixture).
 */

import { exitProgramAward, getProgramDrawProgressPublic, getPrograms } from '../../utils/database.js';
import { resolveDrawClosedFlag } from '../../utils/applicantsDrawModel.js';
import {
    settingsDrawStatusClosedCopy,
    settingsDrawStatusCopy,
} from '../../utils/programDrawStatusModel.js';
import memberUserIcon from '../../assets/icons/fusion_svg_icons_b2/member-user.svg';
import calendarSlotsIcon from '../../assets/icons/fusion_svg_icons_b2/calendar-slots.svg';

const FIXTURE = { claimed: 66, total: 100, cycle: 1, active: true };

function loc() {
    return typeof window.getLocale === 'function' && window.getLocale() === 'ja' ? 'ja' : 'en';
}

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function iconHtml(iconUrl, className) {
    const url = String(iconUrl || '').replace(/"/g, '');
    return `<span class="${className}" style="--pds-icon-url: url(&quot;${url}&quot;)" aria-hidden="true"></span>`;
}

/**
 * SVG ring: progress = claimed/total (filled portion of circle).
 * @param {number} claimed
 * @param {number} total
 */
function ringSvg(claimed, total) {
    const r = 42;
    const c = 2 * Math.PI * r;
    const pct = total > 0 ? Math.min(1, Math.max(0, claimed / total)) : 0;
    const dash = pct * c;
    return `
      <svg class="pds__ring-svg" viewBox="0 0 112 112" aria-hidden="true">
        <circle class="pds__ring-track" cx="56" cy="56" r="${r}" />
        <circle class="pds__ring-progress" cx="56" cy="56" r="${r}"
          stroke-dasharray="${dash.toFixed(2)} ${c.toFixed(2)}" />
      </svg>`;
}

class ProgramDrawStatusComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        /** @type {{ claimed: number, total: number, cycle: number, active: boolean } | null} */
        this._progress = null;
        this._busy = false;
        this._closed = false;
    }

    static get observedAttributes() {
        return ['data-program-id', 'data-fixture', 'data-draw-closed'];
    }

    attributeChangedCallback() {
        void this.render();
    }

    connectedCallback() {
        void this.render();
    }

    _isFixture() {
        return this.getAttribute('data-fixture') === 'true';
    }

    _programId() {
        return String(this.getAttribute('data-program-id') || '').trim();
    }

    /**
     * Closed if the attribute is true **or** `localesJson.draw.closed` on the program row.
     * @returns {Promise<boolean>}
     */
    async _resolveDrawClosed() {
        const attr = this.getAttribute('data-draw-closed');
        if (attr === 'true') return true;
        if (this._isFixture()) return false;
        const id = this._programId();
        if (!id) return false;
        try {
            const rows = await getPrograms();
            const row = Array.isArray(rows)
                ? rows.find((p) => String(p.id) === id || String(p.enCard?.id ?? '') === id)
                : null;
            return resolveDrawClosedFlag(attr, row);
        } catch {
            return false;
        }
    }

    async _loadProgress() {
        if (this._isFixture()) {
            this._progress = { ...FIXTURE };
            return;
        }
        const pid = this._programId();
        if (!pid) {
            this._progress = { claimed: 0, total: 100, cycle: 1, active: true };
            return;
        }
        const row = await getProgramDrawProgressPublic(pid);
        if (row) {
            this._progress = {
                claimed: row.enteredCount,
                total: row.totalSlots,
                cycle: row.cycle,
                active: row.active !== false,
            };
        } else {
            this._progress = { claimed: 0, total: 100, cycle: 1, active: true };
        }
    }

    async render() {
        if (!this.shadowRoot) return;
        await Promise.all([this._loadProgress(), this._resolveDrawClosed().then((c) => {
            this._closed = c;
        })]);
        const p = this._progress || { claimed: 0, total: 100, cycle: 1, active: true };
        const claimed = Math.max(0, Math.floor(p.claimed));
        const total = Math.max(1, Math.floor(p.total));
        const remaining = Math.max(0, total - claimed);
        const cycle = Math.max(1, Math.floor(p.cycle || 1));
        const locale = loc();
        if (this._closed) {
            this._renderClosed(settingsDrawStatusClosedCopy(locale));
            return;
        }
        const L = settingsDrawStatusCopy(locale, { remaining, claimed, total, cycle });

        this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <article class="pds" aria-label="${escapeHtml(L.title)}">
        <header class="pds__header">
          <div class="pds__header-main">
            <span class="pds__badge">${escapeHtml(L.badge)}</span>
            <h3 class="pds__title">${escapeHtml(L.title)}</h3>
            <p class="pds__sub">${escapeHtml(L.sub)}</p>
          </div>
          <div class="pds__header-aside">
            <span class="pds__active"><span class="pds__active-dot" aria-hidden="true"></span>${escapeHtml(L.active)}</span>
            <span class="pds__cycle">${escapeHtml(L.cycle)}</span>
          </div>
        </header>
        <div class="pds__divider" role="presentation"></div>
        <div class="pds__stats">
          <div class="pds__ring" role="img" aria-label="${escapeHtml(String(remaining))} ${escapeHtml(L.remainingLabel)}">
            ${ringSvg(claimed, total)}
            <div class="pds__ring-center">
              <span class="pds__ring-num">${remaining}</span>
              <span class="pds__ring-cap">${escapeHtml(L.remainingLabel)}</span>
            </div>
          </div>
          <div class="pds__mid">
            <p class="pds__eyebrow">${escapeHtml(L.remainingEntries)}</p>
            <p class="pds__mid-primary">${escapeHtml(L.untilWinner)}</p>
            <p class="pds__mid-secondary">${escapeHtml(L.submitted)}</p>
          </div>
          <div class="pds__meta">
            <div class="pds__meta-row">
              ${iconHtml(memberUserIcon, 'pds__meta-icon')}
              <div class="pds__meta-copy">
                <p class="pds__meta-label">${escapeHtml(L.totalEntries)}</p>
                <p class="pds__meta-value">${claimed} / ${total}</p>
              </div>
            </div>
            <div class="pds__meta-row">
              ${iconHtml(calendarSlotsIcon, 'pds__meta-icon')}
              <div class="pds__meta-copy">
                <p class="pds__meta-label">${escapeHtml(L.estimatedDraw)}</p>
                <p class="pds__meta-value pds__meta-value--soft">${escapeHtml(L.estimatedBody)}</p>
              </div>
            </div>
          </div>
        </div>
        <footer class="pds__footer">
          <div class="pds__entry">
            <div class="pds__entry-head">
              <span class="pds__entry-label">${escapeHtml(L.yourEntry)}</span>
              <span class="pds__entry-status"><span class="pds__entry-dot" aria-hidden="true"></span>${escapeHtml(L.entered)}</span>
            </div>
            <p class="pds__entry-help">${escapeHtml(L.help)}</p>
          </div>
          <div class="pds__actions">
            <button type="button" class="pds__withdraw" data-pds-withdraw>${escapeHtml(L.withdraw)}</button>
            <p class="pds__disclaimer">${escapeHtml(L.disclaimer)}</p>
            <p class="pds__msg" data-pds-msg hidden role="status"></p>
          </div>
        </footer>
      </article>
    `;

        this.shadowRoot.querySelector('[data-pds-withdraw]')?.addEventListener('click', () => {
            void this._onWithdraw(L);
        });
    }

    /**
     * @param {ReturnType<typeof settingsDrawStatusClosedCopy>} L
     */
    _renderClosed(L) {
        if (!this.shadowRoot) return;
        this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <article class="pds pds--closed" aria-label="${escapeHtml(L.title)}">
        <header class="pds__header">
          <div class="pds__header-main">
            <span class="pds__badge">${escapeHtml(L.badge)}</span>
            <h3 class="pds__title">${escapeHtml(L.title)}</h3>
            <p class="pds__sub">${escapeHtml(L.sub)}</p>
          </div>
          <div class="pds__header-aside">
            <span class="pds__closed"><span class="pds__closed-dot" aria-hidden="true"></span>${escapeHtml(L.closed)}</span>
          </div>
        </header>
        <div class="pds__divider" role="presentation"></div>
        <footer class="pds__footer">
          <div class="pds__entry">
            <div class="pds__entry-head">
              <span class="pds__entry-label">${escapeHtml(L.yourEntry)}</span>
              <span class="pds__entry-status"><span class="pds__entry-dot" aria-hidden="true"></span>${escapeHtml(L.entered)}</span>
            </div>
            <p class="pds__entry-help">${escapeHtml(L.help)}</p>
          </div>
          <div class="pds__actions">
            <button type="button" class="pds__redeem" data-pds-redeem>${escapeHtml(L.redeem)}</button>
          </div>
        </footer>
      </article>
    `;
        this.shadowRoot.querySelector('[data-pds-redeem]')?.addEventListener('click', () => {
            this.dispatchEvent(
                new CustomEvent('fusion-draw-status-redeem', {
                    bubbles: true,
                    composed: true,
                    detail: { programId: this._programId() },
                }),
            );
        });
    }

    /**
     * @param {ReturnType<typeof settingsDrawStatusCopy>} L
     */
    async _onWithdraw(L) {
        if (this._busy) return;
        const msg = this.shadowRoot?.querySelector('[data-pds-msg]');
        const btn = this.shadowRoot?.querySelector('[data-pds-withdraw]');
        if (this._isFixture()) {
            if (msg instanceof HTMLElement) {
                msg.hidden = false;
                msg.textContent = L.demoToast;
            }
            return;
        }
        const pid = this._programId();
        if (!pid) return;
        if (!window.confirm(L.withdrawConfirm)) return;
        this._busy = true;
        if (btn instanceof HTMLButtonElement) {
            btn.disabled = true;
            btn.textContent = L.withdrawing;
        }
        try {
            await exitProgramAward(pid);
            this.dispatchEvent(
                new CustomEvent('fusion-draw-status-exited', {
                    bubbles: true,
                    composed: true,
                    detail: { programId: pid },
                }),
            );
        } catch (e) {
            if (msg instanceof HTMLElement) {
                msg.hidden = false;
                msg.textContent = e instanceof Error ? e.message : String(e);
            }
            if (btn instanceof HTMLButtonElement) {
                btn.disabled = false;
                btn.textContent = L.withdraw;
            }
        } finally {
            this._busy = false;
        }
    }

    _styles() {
        return `
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        font-family: inherit;
        color: var(--c2, #111);
      }

      .pds {
        box-sizing: border-box;
        width: 100%;
        padding: 24px 28px 22px;
        background: var(--bg, #fff);
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06);
      }

      .pds__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .pds__header-main {
        min-width: 0;
        flex: 1 1 auto;
      }

      .pds__badge {
        display: inline-block;
        margin: 0;
        padding: 5px 8px;
        border-radius: 4px;
        background: var(--c2, #111);
        color: var(--bg, #fff);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-variation-settings: var(--fv-body-wide);
        line-height: 1;
      }

      .pds__title {
        margin: 12px 0 8px;
        font-size: 21px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.2;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
      }

      .pds__sub {
        margin: 0;
        max-width: 42rem;
        font-size: 14px;
        line-height: 1.45;
        color: #6b6b6b;
        font-variation-settings: var(--fv-body);
      }

      .pds__header-aside {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
        flex: 0 0 auto;
      }

      .pds__active {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px 4px 8px;
        border-radius: 999px;
        background: #e8f5e9;
        color: #2e7d32;
        font-size: 12px;
        font-weight: 600;
        font-variation-settings: var(--fv-body-wide);
        line-height: 1.2;
      }

      .pds__active-dot,
      .pds__entry-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #2e7d32;
        flex: 0 0 auto;
      }

      .pds__closed {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px 4px 8px;
        border-radius: 999px;
        background: #f0f0f0;
        color: #5a5a5a;
        font-size: 12px;
        font-weight: 600;
        font-variation-settings: var(--fv-body-wide);
        line-height: 1.2;
      }

      .pds__closed-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #8a8a8a;
        flex: 0 0 auto;
      }

      .pds__cycle {
        font-size: 12px;
        color: #8a8a8a;
        font-variation-settings: var(--fv-body);
        text-align: right;
      }

      .pds__divider {
        height: 1px;
        margin: 18px 0 20px;
        background: #ededed;
      }

      .pds__stats {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) minmax(0, 1.1fr);
        align-items: center;
        gap: 28px;
      }

      .pds__ring {
        position: relative;
        width: 112px;
        height: 112px;
        flex: 0 0 auto;
      }

      .pds__ring-svg {
        display: block;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .pds__ring-track,
      .pds__ring-progress {
        fill: none;
        stroke-width: 9;
      }

      .pds__ring-track {
        stroke: #e8e8e8;
      }

      .pds__ring-progress {
        stroke: #43a047;
        stroke-linecap: round;
      }

      .pds__ring-center {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }

      .pds__ring-num {
        font-size: 28px;
        font-weight: 700;
        line-height: 1;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
      }

      .pds__ring-cap {
        margin-top: 4px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #8a8a8a;
        font-variation-settings: var(--fv-body-wide);
      }

      .pds__mid {
        min-width: 0;
      }

      .pds__eyebrow {
        margin: 0 0 6px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #8a8a8a;
        font-variation-settings: var(--fv-body-wide);
      }

      .pds__mid-primary {
        margin: 0 0 6px;
        font-size: 16px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
      }

      .pds__mid-secondary {
        margin: 0;
        font-size: 13px;
        color: #8a8a8a;
        font-variation-settings: var(--fv-body);
      }

      .pds__meta {
        display: flex;
        flex-direction: column;
        gap: 14px;
        min-width: 0;
      }

      .pds__meta-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }

      .pds__meta-icon {
        display: block;
        width: 18px;
        height: 18px;
        margin-top: 2px;
        flex: 0 0 auto;
        background: currentColor;
        color: #666;
        mask: var(--pds-icon-url) center / contain no-repeat;
        -webkit-mask: var(--pds-icon-url) center / contain no-repeat;
      }

      .pds__meta-copy {
        min-width: 0;
      }

      .pds__meta-label {
        margin: 0 0 2px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #8a8a8a;
        font-variation-settings: var(--fv-body-wide);
      }

      .pds__meta-value {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.35;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
      }

      .pds__meta-value--soft {
        font-size: 13px;
        font-weight: 500;
        color: #444;
        font-variation-settings: var(--fv-body);
      }

      .pds__footer {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
        margin-top: 22px;
      }

      .pds__entry {
        min-width: 0;
        flex: 1 1 14rem;
      }

      .pds__entry-head {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px 12px;
        margin-bottom: 6px;
      }

      .pds__entry-label {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--c2, #111);
        font-variation-settings: var(--fv-body-wide);
      }

      .pds__entry-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: #2e7d32;
        font-variation-settings: var(--fv-body-wide);
      }

      .pds__entry-help {
        margin: 0;
        font-size: 13px;
        line-height: 1.4;
        color: #8a8a8a;
        font-variation-settings: var(--fv-body);
      }

      .pds__actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        flex: 0 1 auto;
        max-width: 100%;
      }

      .pds__withdraw {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        padding: 10px 18px;
        border: 1px solid #d32f2f;
        border-radius: 4px;
        background: transparent;
        color: #d32f2f;
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-variation-settings: var(--fv-cta);
        cursor: pointer;
      }

      .pds__withdraw:hover:not(:disabled) {
        background: color-mix(in srgb, #d32f2f 8%, transparent);
      }

      .pds__withdraw:disabled {
        opacity: 0.55;
        cursor: wait;
      }

      .pds__redeem {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        padding: 10px 18px;
        border: 1px solid var(--c2, #111);
        border-radius: 4px;
        background: var(--c2, #111);
        color: var(--bg, #fff);
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-variation-settings: var(--fv-cta);
        cursor: pointer;
      }

      .pds__redeem:hover {
        background: #333;
        border-color: #333;
      }

      .pds__disclaimer {
        margin: 0;
        max-width: 16rem;
        font-size: 12px;
        line-height: 1.4;
        color: #9a9a9a;
        text-align: right;
        font-variation-settings: var(--fv-body);
      }

      .pds__msg {
        margin: 0;
        max-width: 16rem;
        font-size: 12px;
        line-height: 1.4;
        color: var(--c2, #111);
        text-align: right;
        font-variation-settings: var(--fv-body);
      }

      .pds__msg[hidden] {
        display: none !important;
      }

      @media (max-width: 720px) {
        .pds {
          padding: 20px 18px;
        }
        .pds__stats {
          grid-template-columns: 1fr;
          gap: 20px;
          justify-items: start;
        }
        .pds__ring {
          width: 96px;
          height: 96px;
        }
        .pds__ring-num {
          font-size: 24px;
        }
        .pds__title {
          font-size: 20px;
        }
        .pds__footer {
          flex-direction: column;
        }
        .pds__actions {
          align-items: flex-start;
        }
        .pds__disclaimer,
        .pds__msg {
          text-align: left;
        }
      }
    `;
    }
}

customElements.define('app-program-draw-status', ProgramDrawStatusComponent);

export { ProgramDrawStatusComponent };
