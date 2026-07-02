/** @type {WeakMap<ParentNode, HTMLElement>} */
const overlayByRoot = new WeakMap();

/**
 * @param {ParentNode} root
 */
function ensureOverlay(root) {
    const cached = overlayByRoot.get(root);
    if (cached && cached.isConnected) return cached;

    const el = document.createElement('div');
    el.className = 'studio-artist-manage-busy';
    el.hidden = true;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="studio-artist-manage-busy__panel">
        <div class="studio-artist-manage-busy__spinner" aria-hidden="true"></div>
        <p class="studio-artist-manage-busy__message">Working…</p>
      </div>`;

    const shell = root.querySelector('.studio-artist-manage-shell');
    if (shell instanceof HTMLElement) {
        if (!shell.style.position) shell.style.position = 'relative';
        shell.appendChild(el);
    } else if (root instanceof HTMLElement) {
        if (!root.style.position) root.style.position = 'relative';
        root.appendChild(el);
    }

    overlayByRoot.set(root, el);
    return el;
}

const BUSY_CONTROL_SELECTORS = [
    '#studio-art-form-save',
    '#studio-art-translate-to-new-world',
    '#studio-art-new-world-from-base',
    '#studio-art-cancel',
    '#studio-art-delete',
    '#studio-art-exit-manage',
];

/**
 * Show or hide the manage-artist busy overlay (generate / save).
 * @param {ParentNode} root
 * @param {boolean} busy
 * @param {string} [message]
 */
export function setStudioArtistManageBusy(root, busy, message = 'Working…') {
    const overlay = ensureOverlay(root);
    const msgEl = overlay.querySelector('.studio-artist-manage-busy__message');
    if (msgEl) msgEl.textContent = message;
    overlay.hidden = !busy;
    overlay.setAttribute('aria-hidden', busy ? 'false' : 'true');
    overlay.classList.toggle('is-active', busy);

    for (const sel of BUSY_CONTROL_SELECTORS) {
        const btn = root.querySelector(sel);
        if (btn instanceof HTMLButtonElement) btn.disabled = busy;
    }
}
