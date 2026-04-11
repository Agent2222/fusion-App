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
 * @param {{ title?: string, onClose?: () => void, wide?: boolean }} [opts]
 * @returns {{ close: () => void, root: HTMLElement }}
 */
export function openStudioModal(innerHtml, opts = {}) {
    const title = opts.title ? escapeHtml(opts.title) : '';
    const panelClass = opts.wide
        ? 'studio-modal-panel studio-modal-panel--wide'
        : 'studio-modal-panel';
    const root = document.createElement('div');
    root.className = 'studio-modal-root';
    root.innerHTML = `
        <div class="studio-modal-backdrop" data-studio-modal-close="1" tabindex="-1"></div>
        <div class="${panelClass}" role="dialog" aria-modal="true" aria-labelledby="studio-modal-title-el">
            <div class="studio-modal-header">
                ${title ? `<h2 id="studio-modal-title-el" class="studio-modal-title">${title}</h2>` : '<span id="studio-modal-title-el" class="studio-modal-title studio-sr-only">Dialog</span>'}
                <button type="button" class="studio-modal-x" data-studio-modal-close="1" aria-label="Close">×</button>
            </div>
            <div class="studio-modal-body">${innerHtml}</div>
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
