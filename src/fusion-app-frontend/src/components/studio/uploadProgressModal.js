/**
 * Blocking Studio modal for long video uploads with progress + cancel.
 */

/**
 * @param {number} bytes
 */
function formatBytes(bytes) {
    const n = Math.max(0, Number(bytes) || 0);
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * @param {string} fileName
 * @param {number} fileSize
 * @param {{ onCancel?: () => void }} [opts]
 */
export function openUploadProgressModal(fileName, fileSize, opts = {}) {
    const root = document.createElement('div');
    root.className = 'studio-modal-root studio-upload-progress-root';
    root.innerHTML = `
        <div class="studio-modal-backdrop"></div>
        <div class="studio-modal-panel studio-upload-progress-panel" role="dialog" aria-modal="true" aria-labelledby="studio-upload-progress-title">
            <div class="studio-modal-header">
                <h2 id="studio-upload-progress-title" class="studio-modal-title">Uploading video</h2>
            </div>
            <div class="studio-modal-body studio-upload-progress-body">
                <p class="studio-upload-progress-name"></p>
                <p class="studio-upload-progress-size studio-muted"></p>
                <div class="studio-upload-progress-bar-wrap" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                    <div class="studio-upload-progress-bar"></div>
                </div>
                <p class="studio-upload-progress-pct">0%</p>
                <p class="studio-upload-progress-phase studio-muted">Preparing…</p>
                <button type="button" class="studio-btn-ghost studio-upload-progress-cancel">Cancel upload</button>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    const nameEl = root.querySelector('.studio-upload-progress-name');
    const sizeEl = root.querySelector('.studio-upload-progress-size');
    const bar = root.querySelector('.studio-upload-progress-bar');
    const pctEl = root.querySelector('.studio-upload-progress-pct');
    const phaseEl = root.querySelector('.studio-upload-progress-phase');
    const barWrap = root.querySelector('.studio-upload-progress-bar-wrap');
    const cancelBtn = root.querySelector('.studio-upload-progress-cancel');

    if (nameEl) nameEl.textContent = String(fileName || 'Video');
    if (sizeEl) sizeEl.textContent = formatBytes(fileSize);

    let closed = false;
    const close = () => {
        if (closed) return;
        closed = true;
        root.remove();
    };

    cancelBtn?.addEventListener('click', () => {
        opts.onCancel?.();
        close();
    });

    /**
     * @param {{ loaded?: number, total?: number, phase?: string, percent?: number }} state
     */
    const update = (state = {}) => {
        const total = Math.max(0, Number(state.total) || fileSize || 0);
        const loaded = Math.max(0, Number(state.loaded) || 0);
        const pct = Number.isFinite(state.percent)
            ? Math.max(0, Math.min(100, Math.round(state.percent)))
            : total > 0
              ? Math.max(0, Math.min(100, Math.round((loaded / total) * 100)))
              : 0;
        if (bar instanceof HTMLElement) bar.style.width = `${pct}%`;
        if (pctEl) pctEl.textContent = `${pct}%`;
        if (barWrap instanceof HTMLElement) barWrap.setAttribute('aria-valuenow', String(pct));
        if (phaseEl && state.phase) phaseEl.textContent = state.phase;
    };

    /**
     * @param {string} message
     */
    const fail = (message) => {
        if (phaseEl) {
            phaseEl.textContent = message || 'Upload failed';
            phaseEl.classList.add('studio-upload-progress-phase--error');
        }
        if (cancelBtn instanceof HTMLButtonElement) cancelBtn.textContent = 'Close';
        cancelBtn?.addEventListener('click', close, { once: true });
    };

    const complete = () => {
        update({ percent: 100, phase: 'Complete' });
        window.setTimeout(close, 900);
    };

    return { update, fail, complete, close };
}
