/**
 * Studio Schedule — manage event locations (add / rename / delete).
 */
import {
    createOrUpdateScheduleLocation,
    getScheduleLocations,
    removeScheduleLocation,
} from '../../utils/scheduleStore.js';
import { openStudioConfirmDialog, openStudioNoticeDialog } from '../../utils/studioModal.js';

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
 *   canEdit?: boolean,
 *   onChanged?: () => void,
 * }} [opts]
 */
export function openScheduleLocationsModal(opts = {}) {
    const canEdit = opts.canEdit !== false;
    let message = '';
    let busy = false;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const root = document.createElement('div');
    root.className = 'event-dialog-backdrop';
    root.setAttribute('data-schedule-locations-modal', '1');
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

    const paint = () => {
        const locations = getScheduleLocations();
        root.innerHTML = `
      <div class="event-dialog schedule-locations-dialog" role="dialog" aria-modal="true" aria-labelledby="sch-loc-title">
        <header class="event-dialog__header">
          <div>
            <h2 id="sch-loc-title" class="event-dialog__title" style="margin:0;font-size:18px">Event locations</h2>
            <p class="event-dialog__meta" style="margin:4px 0 0">Add or remove places used on the Schedule calendar.</p>
          </div>
          <button type="button" class="event-dialog__icon-button" data-loc-close aria-label="Close">×</button>
        </header>
        <div class="event-dialog__body" style="padding:18px 24px;overflow:auto">
          ${message ? `<p class="event-dialog__error" style="margin:0 0 12px">${esc(message)}</p>` : ''}
          <ul class="schedule-locations-list" style="list-style:none;margin:0;padding:0;display:grid;gap:8px">
            ${
                locations
                    .map(
                        (loc) => `<li class="schedule-locations-row" data-loc-id="${esc(loc.id)}" style="display:flex;gap:8px;align-items:center">
              <input type="text" class="event-field__control" data-loc-name value="${esc(loc.name)}" ${canEdit && !busy ? '' : 'disabled'} style="flex:1;min-height:36px" aria-label="Location name" />
              ${
                  canEdit
                      ? `<button type="button" class="event-dialog__button" data-loc-save ${busy ? 'disabled' : ''}>Save</button>
                         <button type="button" class="event-dialog__button event-dialog__button--danger" data-loc-delete ${busy ? 'disabled' : ''} aria-label="Delete ${esc(loc.name)}">Delete</button>`
                      : ''
              }
            </li>`,
                    )
                    .join('') || '<li style="color:var(--event-muted);font-size:12px">No locations yet.</li>'
            }
          </ul>
          ${
              canEdit
                  ? `<div style="display:flex;gap:8px;margin-top:16px;align-items:center">
                <input type="text" class="event-field__control" data-loc-new placeholder="New location name" ${busy ? 'disabled' : ''} style="flex:1;min-height:36px" />
                <button type="button" class="event-dialog__button event-dialog__button--primary" data-loc-add ${busy ? 'disabled' : ''}>Add location</button>
              </div>`
                  : ''
          }
        </div>
        <footer class="event-dialog__footer">
          <button type="button" class="event-dialog__button" data-loc-close>Done</button>
        </footer>
      </div>`;

        root.querySelectorAll('[data-loc-close]').forEach((btn) => {
            btn.addEventListener('click', () => close());
        });
        root.addEventListener('click', (e) => {
            if (e.target === root) close();
        });

        root.querySelectorAll('.schedule-locations-row').forEach((row) => {
            const id = row.getAttribute('data-loc-id') || '';
            row.querySelector('[data-loc-save]')?.addEventListener('click', async () => {
                const input = row.querySelector('[data-loc-name]');
                const name = input instanceof HTMLInputElement ? input.value.trim() : '';
                if (!name) {
                    message = 'Name required';
                    paint();
                    await openStudioNoticeDialog({
                        title: 'Name required',
                        message: 'Enter a location name before saving.',
                        okLabel: 'OK',
                    });
                    return;
                }
                busy = true;
                message = '';
                paint();
                try {
                    await createOrUpdateScheduleLocation(name, id);
                    opts.onChanged?.();
                    message = 'Location saved';
                    await openStudioNoticeDialog({
                        title: 'Location saved',
                        message: `“${name}” was updated.`,
                        okLabel: 'OK',
                    });
                } catch (err) {
                    message = err instanceof Error ? err.message : String(err);
                    await openStudioNoticeDialog({
                        title: 'Save failed',
                        message,
                        okLabel: 'OK',
                    });
                } finally {
                    busy = false;
                    paint();
                }
            });
            row.querySelector('[data-loc-delete]')?.addEventListener('click', async () => {
                const input = row.querySelector('[data-loc-name]');
                const label = input instanceof HTMLInputElement ? input.value.trim() : id;
                const ok = await openStudioConfirmDialog({
                    title: 'Remove location?',
                    message: `Remove “${label}”? Existing events keep their saved place name.`,
                    confirmLabel: 'Remove location',
                    cancelLabel: 'Keep location',
                    danger: true,
                });
                if (!ok) return;
                busy = true;
                message = '';
                paint();
                try {
                    await removeScheduleLocation(id);
                    opts.onChanged?.();
                    message = 'Location removed';
                    await openStudioNoticeDialog({
                        title: 'Location removed',
                        message: `“${label}” was removed from the catalog.`,
                        okLabel: 'OK',
                    });
                } catch (err) {
                    message = err instanceof Error ? err.message : String(err);
                    await openStudioNoticeDialog({
                        title: 'Remove failed',
                        message,
                        okLabel: 'OK',
                    });
                } finally {
                    busy = false;
                    paint();
                }
            });
        });

        root.querySelector('[data-loc-add]')?.addEventListener('click', async () => {
            const input = root.querySelector('[data-loc-new]');
            const name = input instanceof HTMLInputElement ? input.value.trim() : '';
            if (!name) {
                message = 'Enter a location name';
                paint();
                await openStudioNoticeDialog({
                    title: 'Name required',
                    message: 'Enter a location name before adding.',
                    okLabel: 'OK',
                });
                return;
            }
            busy = true;
            message = '';
            paint();
            try {
                await createOrUpdateScheduleLocation(name);
                opts.onChanged?.();
                message = 'Location added';
                await openStudioNoticeDialog({
                    title: 'Location added',
                    message: `“${name}” is available on the schedule.`,
                    okLabel: 'OK',
                });
            } catch (err) {
                message = err instanceof Error ? err.message : String(err);
                await openStudioNoticeDialog({
                    title: 'Add failed',
                    message,
                    okLabel: 'OK',
                });
            } finally {
                busy = false;
                paint();
            }
        });
    };

    paint();
    return { close };
}
