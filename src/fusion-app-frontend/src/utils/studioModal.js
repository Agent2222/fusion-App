/**
 * Lightweight modal for Studio panels (backdrop + ESC + close buttons).
 */

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {string} innerHtml trusted HTML for modal body
 * @param {{
 *   title?: string,
 *   subtitle?: string,
 *   onClose?: () => void,
 *   wide?: boolean,
 *   compact?: boolean,
 *   panelClass?: string,
 *   bodyClass?: string,
 *   footerHtml?: string,
 *   headerClass?: string,
 * }} [opts]
 * @returns {{ close: () => void, root: HTMLElement }}
 */
export function openStudioModal(innerHtml, opts = {}) {
    const title = opts.title ? escapeHtml(opts.title) : '';
    const subtitle = opts.subtitle ? escapeHtml(opts.subtitle) : '';
    let panelClass = opts.panelClass || 'studio-modal-panel';
    if (!opts.panelClass) {
        if (opts.wide) {
            panelClass = 'studio-modal-panel studio-modal-panel--wide';
        } else if (opts.compact) {
            panelClass = 'studio-modal-panel studio-modal-panel--compact';
        }
    }
    const bodyClass = opts.bodyClass ? ` ${opts.bodyClass}` : '';
    const headerClass = opts.headerClass ? ` ${opts.headerClass}` : '';
    const titleBlock = title
        ? `<div class="studio-modal-header__titles">
                <h2 id="studio-modal-title-el" class="studio-modal-title">${title}</h2>
                ${subtitle ? `<p class="studio-modal-subtitle">${subtitle}</p>` : ''}
           </div>`
        : '<span id="studio-modal-title-el" class="studio-modal-title studio-sr-only">Dialog</span>';
    const root = document.createElement('div');
    root.className = 'studio-modal-root';
    root.innerHTML = `
        <div class="studio-modal-backdrop" data-studio-modal-close="1" tabindex="-1"></div>
        <div class="${panelClass}" role="dialog" aria-modal="true" aria-labelledby="studio-modal-title-el">
            <div class="studio-modal-header${headerClass}">
                ${titleBlock}
                <button type="button" class="studio-modal-x" data-studio-modal-close="1" aria-label="Close">×</button>
            </div>
            <div class="studio-modal-body${bodyClass}">${innerHtml}</div>
            ${opts.footerHtml || ''}
        </div>
    `;
    document.body.appendChild(root);

    const close = () => {
        document.removeEventListener('keydown', onKey);
        root.remove();
        opts.onClose?.();
    };

    const onKey = (e) => {
        if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);

    root.querySelectorAll('[data-studio-modal-close]').forEach((el) => {
        el.addEventListener('click', () => close());
    });

    const panel = root.querySelector('.studio-modal-panel');
    const focusable = panel?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable && focusable instanceof HTMLElement) {
        queueMicrotask(() => focusable.focus());
    }

    return { close, root };
}

/**
 * Confirm dialog (Cancel / primary). Resolves true only when the primary button is pressed.
 * @param {{
 *   title: string,
 *   message?: string,
 *   paragraphs?: string[],
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   danger?: boolean,
 * }} opts
 * @returns {Promise<boolean>}
 */
export function openStudioConfirmDialog(opts) {
    const paragraphs = Array.isArray(opts.paragraphs)
        ? opts.paragraphs
        : [String(opts.message || opts.title || '')].filter(Boolean);
    const body = paragraphs
        .map((p) => `<p class="studio-muted" style="margin:0 0 0.75rem;line-height:1.45">${escapeHtml(p)}</p>`)
        .join('');
    const btnClass = opts.danger ? 'studio-btn-danger' : 'studio-btn-primary';
    const confirmLabel = opts.confirmLabel || 'Confirm';
    const cancelLabel = opts.cancelLabel || 'Cancel';
    const inner = `${body}
<div class="studio-modal-actions" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #e2e8f0;display:flex;gap:0.5rem;justify-content:flex-end;flex-wrap:wrap">
<button type="button" class="studio-btn-ghost" data-studio-modal-close="1">${escapeHtml(cancelLabel)}</button>
<button type="button" class="${btnClass}" data-studio-confirm-ok>${escapeHtml(confirmLabel)}</button>
</div>`;
    return new Promise((resolve) => {
        let settled = false;
        const { close, root } = openStudioModal(inner, {
            title: opts.title,
            compact: true,
            onClose: () => {
                if (!settled) {
                    settled = true;
                    resolve(false);
                }
            },
        });
        root.querySelector('[data-studio-confirm-ok]')?.addEventListener('click', () => {
            if (settled) return;
            settled = true;
            resolve(true);
            close();
        });
    });
}

/**
 * Simple notice / success dialog with a single OK button.
 * @param {{
 *   title: string,
 *   message?: string,
 *   paragraphs?: string[],
 *   okLabel?: string,
 * }} opts
 * @returns {Promise<void>}
 */
export function openStudioNoticeDialog(opts) {
    const paragraphs = Array.isArray(opts.paragraphs)
        ? opts.paragraphs
        : [String(opts.message || '')].filter(Boolean);
    const body = paragraphs
        .map((p) => `<p class="studio-muted" style="margin:0 0 0.75rem;line-height:1.45">${escapeHtml(p)}</p>`)
        .join('');
    const okLabel = opts.okLabel || 'OK';
    const inner = `${body}
<div class="studio-modal-actions" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end">
<button type="button" class="studio-btn-primary" data-studio-notice-ok>${escapeHtml(okLabel)}</button>
</div>`;
    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
        };
        const { close, root } = openStudioModal(inner, {
            title: opts.title,
            compact: true,
            onClose: finish,
        });
        root.querySelector('[data-studio-notice-ok]')?.addEventListener('click', () => {
            finish();
            close();
        });
    });
}
