/**
 * Shared Studio panel: create / list / retire 50% membership promo codes.
 */
import '../../styles/studioPromoCodes.css';
import { openStudioModal } from '../../utils/studioModal.js';
import {
    createStudioPromoCode,
    durationSelectHtml,
    isRadarPromoCode,
    joinUrlForPromoCode,
    listStudioPromoCodes,
    promoDurationLabel,
    remainingPromoQuantity,
    setStudioPromoCodeActive,
} from '../../utils/studioPromoCodes.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function remainingLabel(pc) {
    const rem = remainingPromoQuantity(pc);
    if (!Number.isFinite(rem)) return 'Unlimited';
    const max = Number(pc.maxRedemptions);
    return `${rem} of ${max}`;
}

function statusLabel(pc) {
    if (pc.active === false) return 'Retired';
    const rem = remainingPromoQuantity(pc);
    if (Number.isFinite(rem) && rem <= 0) return 'Exhausted';
    return 'Active';
}

function defaultSlug(radarOnly) {
    const stamp = new Date().toISOString().slice(2, 7).replace('-', '');
    return radarOnly ? `RADAR-${stamp}` : `PROMO-${stamp}`;
}

/**
 * @param {HTMLElement} host
 * @param {{ radarOnly?: boolean, canEdit?: boolean }} [opts]
 */
export async function mountStudioPromoCodesPanel(host, opts = {}) {
    if (!(host instanceof HTMLElement)) return;
    const radarOnly = Boolean(opts.radarOnly);
    const canEdit = opts.canEdit !== false;
    host.classList.add('studio-promo-codes');
    host.dataset.radarPromo = radarOnly ? '1' : '0';

    const paint = async () => {
        let rows = [];
        try {
            rows = await listStudioPromoCodes();
        } catch {
            rows = [];
        }
        if (radarOnly) rows = rows.filter((pc) => isRadarPromoCode(pc));
        rows = [...rows].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

        const table =
            rows.length === 0
                ? `<p class="studio-promo-codes__empty">${
                      radarOnly
                          ? 'No Radar invite codes yet. Create a campaign slug and a quantity — that quantity is the send budget for batch outreach.'
                          : 'No membership promo codes yet. Create a slug, pick 1 / 2 / 3 months at 50% off, and set how many people can redeem it.'
                  }</p>`
                : `<div class="studio-table-wrap studio-table-wrap--sticky-head">
        <table class="studio-table studio-table--dense" aria-label="Promo codes">
          <thead><tr><th>Code</th><th>Offer</th><th>Remaining</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            ${rows
                .map((pc) => {
                    const rem = remainingLabel(pc);
                    return `<tr data-promo-code="${esc(pc.code)}">
              <td><code>${esc(pc.code)}</code></td>
              <td>${esc(promoDurationLabel(pc.discountDurationMonths))}</td>
              <td>${esc(rem)}</td>
              <td><span class="studio-radar-chip">${esc(statusLabel(pc))}</span></td>
              <td>${esc(String(pc.createdAt || '').slice(0, 10) || '—')}</td>
              <td><div class="studio-promo-codes__actions">
                <button type="button" class="studio-btn-ghost" data-promo-act="copy-code" data-code="${esc(pc.code)}">Copy code</button>
                <button type="button" class="studio-btn-ghost" data-promo-act="copy-link" data-code="${esc(pc.code)}">Copy link</button>
                ${
                    canEdit && pc.active !== false
                        ? `<button type="button" class="studio-btn-ghost" data-promo-act="retire" data-code="${esc(pc.code)}">Retire</button>`
                        : ''
                }
              </div></td>
            </tr>`;
                })
                .join('')}
          </tbody>
        </table>
      </div>`;

        host.innerHTML = `
      <p class="studio-promo-codes__intro">50% off monthly membership for the first 1, 2, or 3 months. Recipients join at <code>/join-network?ref=CODE</code>.</p>
      ${
          canEdit
              ? `<form class="studio-promo-codes__create" data-promo-create="1">
        <label>Code
          <input name="code" class="studio-input" maxlength="32" value="${esc(defaultSlug(radarOnly))}" autocomplete="off" required />
        </label>
        <label>Offer
          ${durationSelectHtml(radarOnly ? 2 : 1, 'studioPromoDuration')}
        </label>
        <label>Quantity
          <input name="qty" class="studio-input" type="number" min="1" max="5000" value="${radarOnly ? '40' : '25'}" required />
        </label>
        <button type="submit" class="studio-btn-primary studio-promo-codes__create-go">Create code</button>
      </form>`
              : ''
      }
      <p class="studio-promo-codes__status" role="status" data-promo-status></p>
      ${table}
    `;

        const statusEl = host.querySelector('[data-promo-status]');
        const setStatus = (text) => {
            if (statusEl) statusEl.textContent = text || '';
        };

        host.querySelector('[data-promo-create]')?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const form = /** @type {HTMLFormElement} */ (ev.currentTarget);
            const code = String(form.elements.namedItem('code')?.value || '').trim();
            const qty = Number(form.elements.namedItem('qty')?.value || 0);
            const durationEl = host.querySelector('#studioPromoDuration');
            const durationMonths = Number(
                durationEl instanceof HTMLSelectElement ? durationEl.value : 1,
            );
            try {
                await createStudioPromoCode({
                    code,
                    durationMonths,
                    maxRedemptions: qty,
                    campaignTag: radarOnly ? 'radar-batch' : 'studio',
                });
                setStatus(`Created ${code.toUpperCase()}.`);
                await paint();
            } catch (err) {
                setStatus(err instanceof Error ? err.message : String(err));
            }
        });

        host.querySelectorAll('[data-promo-act]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const act = btn.getAttribute('data-promo-act');
                const code = btn.getAttribute('data-code') || '';
                try {
                    if (act === 'copy-code') {
                        await navigator.clipboard?.writeText(code);
                        setStatus(`Copied ${code}.`);
                    } else if (act === 'copy-link') {
                        await navigator.clipboard?.writeText(joinUrlForPromoCode(code));
                        setStatus('Copied join link.');
                    } else if (act === 'retire') {
                        await setStudioPromoCodeActive(code, false);
                        setStatus(`Retired ${code}.`);
                        await paint();
                    }
                } catch (err) {
                    setStatus(err instanceof Error ? err.message : String(err));
                }
            });
        });
    };

    await paint();
}

/**
 * @param {{ radarOnly?: boolean }} [opts]
 */
export function openManagePromoCodesModal(opts = {}) {
    const { root } = openStudioModal(`<div data-promo-modal-host></div>`, {
        title: opts.radarOnly ? 'Radar invite codes' : 'Membership invite codes',
        subtitle: '50% off first 1 / 2 / 3 months at checkout',
        wide: true,
    });
    const host = root.querySelector('[data-promo-modal-host]');
    if (host instanceof HTMLElement) {
        void mountStudioPromoCodesPanel(host, { radarOnly: Boolean(opts.radarOnly), canEdit: true });
    }
}
