/**
 * Program Draw Entry status card for Settings → My programs.
 * Shown only when the member is entered (or tester fixture).
 */

import { exitProgramAward, getProgramDrawProgressPublic } from '../../utils/database.js';
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
 * @param {'en'|'ja'} locale
 * @param {{ remaining: number, claimed: number, total: number, cycle: number }} n
 */
function copy(locale, n) {
    if (locale === 'ja') {
        return {
            badge: 'プログラム抽選',
            title: 'プログラム抽選エントリー',
            sub: `現在の抽選ラウンドにエントリー済みです。全 ${n.total} 枠が埋まったら、1名がランダムに選ばれます。`,
            active: '開催中',
            cycle: `ラウンド ${n.cycle}`,
            remainingLabel: '残り',
            remainingEntries: '残りエントリー',
            untilWinner: `当選発表まであと ${n.remaining} エントリー`,
            submitted: `${n.claimed} / ${n.total} エントリー提出済み`,
            totalEntries: '合計エントリー',
            estimatedDraw: '抽選予定',
            estimatedBody: `${n.total} 枠が埋まった後、約1週間以内`,
            yourEntry: 'あなたのエントリー',
            entered: 'エントリー済み',
            help: `${n.total} エントリーに達した時点で抽選に含まれます。`,
            withdraw: 'エントリーを取り消す',
            disclaimer: 'エントリーはいつでも取り消せます。返金はありません。',
            withdrawConfirm:
                'プログラム抽選のエントリーを取り消しますか？消費済みのアワードクレジットや支払いの返金はありません。',
            demoToast: 'デモ表示のみです。',
            withdrawing: '取り消し中…',
        };
    }
    return {
        badge: 'Program Draw',
        title: 'Program Draw Entry',
        sub: `You are entered in the current draw cycle. Once all ${n.total} spots are filled, one recipient is randomly selected.`,
        active: 'Active',
        cycle: `Cycle ${n.cycle}`,
        remainingLabel: 'Remaining',
        remainingEntries: 'Remaining entries',
        untilWinner: `${n.remaining} entries until winner announcement`,
        submitted: `${n.claimed} of ${n.total} entries submitted`,
        totalEntries: 'Total entries',
        estimatedDraw: 'Estimated draw',
        estimatedBody: `Within 1 week after ${n.total} entries are filled`,
        yourEntry: 'Your entry',
        entered: 'Entered',
        help: `You will be included in the draw when ${n.total} entries are reached.`,
        withdraw: 'Withdraw entry',
        disclaimer: 'You can withdraw your entry at any time. There is no refund.',
        withdrawConfirm:
            'Withdraw your Program Draw entry? Consumed award credits or payments are not refunded.',
        demoToast: 'Demo only — not a live draw entry.',
        withdrawing: 'Withdrawing…',
    };
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
    }

    static get observedAttributes() {
        return ['data-program-id', 'data-fixture'];
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
        await this._loadProgress();
        const p = this._progress || { claimed: 0, total: 100, cycle: 1, active: true };
        const claimed = Math.max(0, Math.floor(p.claimed));
        const total = Math.max(1, Math.floor(p.total));
        const remaining = Math.max(0, total - claimed);
        const cycle = Math.max(1, Math.floor(p.cycle || 1));
        const L = copy(loc(), { remaining, claimed, total, cycle });

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
     * @param {ReturnType<typeof copy>} L
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
