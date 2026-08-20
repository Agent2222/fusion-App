/**
 * Studio Schedule — Review all (needs-attention queue).
 */
import { openScheduleEventModal } from './scheduleEventModal.js';

/**
 * @param {string} s
 */
function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {{
 *   items: { id: string, kind: string, title: string, detail: string, eventId: string }[],
 *   canEdit?: boolean,
 *   onChanged?: () => void,
 * }} opts
 */
export function openScheduleAttentionReview(opts) {
    const items = Array.isArray(opts.items) ? opts.items.slice() : [];
    let index = 0;
    const canEdit = Boolean(opts.canEdit);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const root = document.createElement('div');
    root.className = 'event-dialog-backdrop';
    root.setAttribute('data-schedule-attention-modal', '1');
    document.body.appendChild(root);

    const close = () => {
        document.removeEventListener('keydown', onKey);
        root.remove();
        document.body.style.overflow = previousOverflow;
    };

    const onKey = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
        }
    };
    document.addEventListener('keydown', onKey);

    const openAt = (i) => {
        if (!items.length) return;
        index = Math.max(0, Math.min(i, items.length - 1));
        const item = items[index];
        close();
        openScheduleEventModal({
            eventId: item.eventId,
            mode: 'view',
            canEdit,
            onChanged: opts.onChanged,
        });
    };

    const paint = () => {
        root.innerHTML = `
      <div class="event-dialog" role="dialog" aria-modal="true" aria-labelledby="sch-att-title" style="width:min(520px,100%)">
        <header class="event-dialog__header">
          <div>
            <h2 id="sch-att-title" class="event-dialog__title" style="margin:0;font-size:18px">Needs attention</h2>
            <p class="event-dialog__meta" style="margin:4px 0 0">${items.length} item${items.length === 1 ? '' : 's'} to review</p>
          </div>
          <button type="button" class="event-dialog__icon-button" data-att-close aria-label="Close">×</button>
        </header>
        <div class="event-dialog__body" style="padding:8px 0;max-height:min(60vh,420px);overflow:auto">
          ${
              items.length
                  ? `<ul style="list-style:none;margin:0;padding:0">
              ${items
                  .map(
                      (a, i) => `<li>
                  <button type="button" data-att-open="${i}" style="display:grid;grid-template-columns:1fr auto;gap:8px;width:100%;padding:12px 24px;border:0;border-bottom:1px solid var(--event-border,#e9e5e4);background:#fff;color:var(--event-ink,#111827);text-align:left;cursor:pointer">
                    <span>
                      <strong style="display:block;font-size:12px">${esc(a.title)}</strong>
                      <span style="display:block;margin-top:3px;font-size:11px;color:var(--event-muted,#706d69)">${esc(a.detail)}</span>
                    </span>
                    <span style="align-self:center;font-size:11px;font-weight:650;color:var(--event-ink,#111827)">Open</span>
                  </button>
                </li>`,
                  )
                  .join('')}
            </ul>`
                  : `<p style="padding:24px;font-size:13px;color:var(--event-muted,#706d69)">All clear — nothing needs attention.</p>`
          }
        </div>
        <footer class="event-dialog__footer" style="justify-content:space-between">
          <button type="button" class="event-dialog__button" data-att-close>Close</button>
          ${
              items.length
                  ? `<button type="button" class="event-dialog__button event-dialog__button--primary" data-att-start>Review first</button>`
                  : ''
          }
        </footer>
      </div>`;

        root.querySelectorAll('[data-att-close]').forEach((btn) => {
            btn.addEventListener('click', () => close());
        });
        root.addEventListener('click', (e) => {
            if (e.target === root) close();
        });
        root.querySelectorAll('[data-att-open]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const i = Number(btn.getAttribute('data-att-open'));
                openAt(i);
            });
        });
        root.querySelector('[data-att-start]')?.addEventListener('click', () => openAt(0));
    };

    paint();
    return { close };
}
