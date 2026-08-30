/**
 * Pick an existing travel-prep image (or confirm none are available).
 */
import { openStudioModal } from '../../utils/studioModal.js';
import { escapeHtml } from '../../utils/textPreview.js';

/**
 * @param {{
 *   images?: Array<{ url: string, label?: string }>,
 *   selectedUrl?: string,
 * }} opts
 * @returns {Promise<string | null>} selected URL, or null if cancelled
 */
export function openTravelPrepImagePicker(opts = {}) {
    const images = Array.isArray(opts.images) ? opts.images.filter((i) => String(i?.url || '').trim()) : [];
    const selectedStart = String(opts.selectedUrl || '').trim();

    return new Promise((resolve) => {
        let settled = false;
        const finish = (url) => {
            if (settled) return;
            settled = true;
            close();
            resolve(url);
        };

        const items = images.length
            ? images
                  .map((img, i) => {
                      const url = String(img.url || '').trim();
                      const active = url === selectedStart ? ' is-selected' : '';
                      return `<button type="button" class="studio-travel-prep-picker__item${active}" data-prep-pick-url="${escapeHtml(url)}" role="option" aria-selected="${url === selectedStart ? 'true' : 'false'}">
            <span class="studio-travel-prep-picker__thumb" style="background-image:url('${escapeHtml(url)}')"></span>
            <span class="studio-travel-prep-picker__label">${escapeHtml(img.label || `Image ${i + 1}`)}</span>
          </button>`;
                  })
                  .join('')
            : '';

        const { close, root } = openStudioModal(
            `<div class="studio-travel-prep-picker">
        ${
            items
                ? `<div class="studio-travel-prep-picker__grid" role="listbox">${items}</div>`
                : `<p class="studio-muted">No travel prep images yet. Upload one on a link to start this library.</p>`
        }
      </div>`,
            {
                title: 'Travel prep images',
                subtitle: 'Images already used on travel prep links',
                wide: true,
                footerHtml: `<button type="button" class="studio-btn-ghost" data-prep-pick-cancel>Cancel</button>`,
                onClose: () => finish(null),
            },
        );

        root.querySelector('[data-prep-pick-cancel]')?.addEventListener('click', () => finish(null));
        root.addEventListener('click', (ev) => {
            const btn = ev.target instanceof Element ? ev.target.closest('[data-prep-pick-url]') : null;
            if (!btn) return;
            finish(btn.getAttribute('data-prep-pick-url') || '');
        });
    });
}
