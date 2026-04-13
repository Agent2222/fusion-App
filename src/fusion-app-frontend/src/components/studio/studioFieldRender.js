/**
 * Renders Studio Content editor rows from flattenStringFields rows + field kind registry.
 */
import {
    getFieldKind,
    getFieldKindBadgeLabel,
    getFieldKindHelperText,
    getStudioUploadAccept,
    shouldShowUploadButton,
} from '../../utils/studioFieldRegistry.js';

/**
 * @param {HTMLElement} fieldsEl
 * @returns {Record<string, string>}
 */
export function collectContentStringValues(fieldsEl) {
    /** @type {Record<string, string>} */
    const map = {};
    fieldsEl.querySelectorAll('.studio-content-str-value[data-path]').forEach((el) => {
        const p = el.getAttribute('data-path');
        if (p && (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) {
            map[p] = el.value;
        }
    });
    return map;
}

/**
 * @param {HTMLElement} previewEl
 * @param {string} url
 * @param {import('../../utils/studioFieldRegistry.js').StudioFieldKind} kind
 */
function updateMediaPreview(previewEl, url, kind) {
    previewEl.innerHTML = '';
    const u = String(url || '').trim();
    if (!u || !/^https?:\/\//i.test(u)) {
        const p = document.createElement('p');
        p.className = 'studio-muted studio-content-preview-placeholder';
        p.textContent = u ? 'Preview unavailable for this value' : 'No URL yet';
        previewEl.appendChild(p);
        return;
    }
    if (kind === 'audioUrl' || /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(u)) {
        const a = document.createElement('audio');
        a.controls = true;
        a.className = 'studio-content-preview-audio';
        a.src = u;
        a.preload = 'metadata';
        previewEl.appendChild(a);
        return;
    }
    const img = document.createElement('img');
    img.className = 'studio-content-preview-img';
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.loading = 'lazy';
    img.src = u;
    img.addEventListener('error', () => {
        previewEl.innerHTML = `<p class="studio-muted studio-content-preview-placeholder">Could not load image</p>`;
    });
    previewEl.appendChild(img);
}

/**
 * @param {HTMLElement} container
 * @param {string} slug
 * @param {{ path: string, label: string, value: string }} row
 * @param {{ markDirty: () => void }} hooks
 */
export function appendContentFieldRow(container, slug, row, hooks) {
    const kind = getFieldKind(slug, row.path);
    const rowEl = document.createElement('div');
    rowEl.className = `studio-content-field-row studio-content-field-row--kind-${kind}`;
    rowEl.dataset.fieldKind = kind;

    const head = document.createElement('div');
    head.className = 'studio-content-field-head';
    const badge = document.createElement('span');
    badge.className = `studio-field-kind-badge studio-field-kind-badge--${kind}`;
    badge.textContent = getFieldKindBadgeLabel(kind);
    const title = document.createElement('span');
    title.className = 'studio-content-field-title';
    title.textContent = row.label;
    head.appendChild(badge);
    head.appendChild(title);
    rowEl.appendChild(head);

    const helper = document.createElement('p');
    const ht = getFieldKindHelperText(kind);
    helper.className = 'studio-field-kind-helper';
    if (ht) {
        helper.textContent = ht;
        rowEl.appendChild(helper);
    }

    const body = document.createElement('div');
    body.className = 'studio-content-field-body';

    /** @type {HTMLElement | null} */
    let previewEl = null;
    if (kind === 'assetUrl' || kind === 'audioUrl') {
        previewEl = document.createElement('div');
        previewEl.className = 'studio-content-preview';
        updateMediaPreview(previewEl, row.value, kind);
    }

    /** @type {HTMLTextAreaElement | HTMLInputElement} */
    let control;
    if (kind === 'plainText') {
        const ta = document.createElement('textarea');
        ta.className = 'studio-textarea studio-textarea--locale studio-content-str-value';
        ta.dataset.path = row.path;
        ta.rows = Math.max(2, Math.min(14, Math.ceil(row.value.length / 72) + 1));
        ta.value = row.value;
        ta.spellcheck = true;
        ta.addEventListener('input', () => hooks.markDirty());
        control = ta;
    } else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'studio-input studio-content-str-value';
        inp.dataset.path = row.path;
        inp.value = row.value;
        inp.spellcheck = false;
        inp.autocomplete = 'off';
        inp.addEventListener('input', () => {
            hooks.markDirty();
            if (previewEl) updateMediaPreview(previewEl, inp.value, kind);
        });
        control = inp;
    }
    body.appendChild(control);
    if (previewEl) body.appendChild(previewEl);

    const actions = document.createElement('div');
    actions.className = 'studio-content-field-actions';

    if (kind === 'route') {
        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'studio-btn-ghost studio-btn-ghost--sm';
        open.textContent = 'Open on site';
        open.addEventListener('click', () => {
            const v = control instanceof HTMLInputElement ? control.value.trim() : '';
            if (!v.startsWith('/')) return;
            try {
                window.open(`${window.location.origin}${v}`, '_blank', 'noopener');
            } catch {
                /* ignore */
            }
        });
        actions.appendChild(open);
    }

    if (kind === 'externalUrl') {
        const openExt = document.createElement('button');
        openExt.type = 'button';
        openExt.className = 'studio-btn-ghost studio-btn-ghost--sm';
        openExt.textContent = 'Open link';
        openExt.addEventListener('click', () => {
            const v = control instanceof HTMLInputElement ? control.value.trim() : '';
            if (!/^https?:\/\//i.test(v)) return;
            window.open(v, '_blank', 'noopener noreferrer');
        });
        actions.appendChild(openExt);
    }

    if (shouldShowUploadButton(kind)) {
        const uploadLab = document.createElement('label');
        uploadLab.className = 'studio-file-label studio-btn-ghost studio-content-upload';
        const fin = document.createElement('input');
        fin.type = 'file';
        fin.className = 'studio-file-input';
        fin.accept = getStudioUploadAccept(row.path, kind);
        fin.dataset.uploadFor = row.path;
        uploadLab.appendChild(fin);
        const upSpan = document.createElement('span');
        upSpan.textContent = kind === 'externalUrl' ? 'Upload to CDN' : 'Upload to storage';
        uploadLab.appendChild(upSpan);
        actions.appendChild(uploadLab);
    }

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'studio-btn-ghost studio-btn-ghost--sm';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
        if (control instanceof HTMLTextAreaElement || control instanceof HTMLInputElement) {
            control.value = '';
            hooks.markDirty();
            if (previewEl) updateMediaPreview(previewEl, '', kind);
        }
    });
    actions.appendChild(clearBtn);

    body.appendChild(actions);
    rowEl.appendChild(body);
    container.appendChild(rowEl);
}

/**
 * @param {string} slug
 * @param {{ path: string, label: string, value: string }} row
 * @param {{ markDirty: () => void }} hooks
 * @param {string} colLabel
 */
function buildLocaleColumn(slug, row, hooks, colLabel) {
    const kind = getFieldKind(slug, row.path);
    const wrap = document.createElement('div');
    wrap.className = 'studio-content-locale-col';

    const lab = document.createElement('span');
    lab.className = 'studio-content-locale-col-title';
    lab.textContent = colLabel;
    wrap.appendChild(lab);

    /** @type {HTMLElement | null} */
    let previewEl = null;
    if (kind === 'assetUrl' || kind === 'audioUrl') {
        previewEl = document.createElement('div');
        previewEl.className = 'studio-content-preview';
        updateMediaPreview(previewEl, row.value, kind);
    }

    /** @type {HTMLTextAreaElement | HTMLInputElement} */
    let control;
    if (kind === 'plainText') {
        const ta = document.createElement('textarea');
        ta.className = 'studio-textarea studio-textarea--locale studio-content-str-value';
        ta.dataset.path = row.path;
        ta.rows = Math.max(2, Math.min(14, Math.ceil(row.value.length / 72) + 1));
        ta.value = row.value;
        ta.spellcheck = true;
        ta.addEventListener('input', () => hooks.markDirty());
        control = ta;
    } else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'studio-input studio-content-str-value';
        inp.dataset.path = row.path;
        inp.value = row.value;
        inp.spellcheck = false;
        inp.autocomplete = 'off';
        inp.addEventListener('input', () => {
            hooks.markDirty();
            if (previewEl) updateMediaPreview(previewEl, inp.value, kind);
        });
        control = inp;
    }
    wrap.appendChild(control);
    if (previewEl) wrap.appendChild(previewEl);

    const actions = document.createElement('div');
    actions.className = 'studio-content-field-actions studio-content-field-actions--locale-col';

    if (kind === 'route') {
        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'studio-btn-ghost studio-btn-ghost--sm';
        open.textContent = 'Open on site';
        open.addEventListener('click', () => {
            const v = control instanceof HTMLInputElement ? control.value.trim() : '';
            if (!v.startsWith('/')) return;
            try {
                window.open(`${window.location.origin}${v}`, '_blank', 'noopener');
            } catch {
                /* ignore */
            }
        });
        actions.appendChild(open);
    }

    if (kind === 'externalUrl') {
        const openExt = document.createElement('button');
        openExt.type = 'button';
        openExt.className = 'studio-btn-ghost studio-btn-ghost--sm';
        openExt.textContent = 'Open link';
        openExt.addEventListener('click', () => {
            const v = control instanceof HTMLInputElement ? control.value.trim() : '';
            if (!/^https?:\/\//i.test(v)) return;
            window.open(v, '_blank', 'noopener noreferrer');
        });
        actions.appendChild(openExt);
    }

    if (shouldShowUploadButton(kind)) {
        const uploadLab = document.createElement('label');
        uploadLab.className = 'studio-file-label studio-btn-ghost studio-content-upload';
        const fin = document.createElement('input');
        fin.type = 'file';
        fin.className = 'studio-file-input';
        fin.accept = getStudioUploadAccept(row.path, kind);
        fin.dataset.uploadFor = row.path;
        uploadLab.appendChild(fin);
        const upSpan = document.createElement('span');
        upSpan.textContent = kind === 'externalUrl' ? 'Upload to CDN' : 'Upload to storage';
        uploadLab.appendChild(upSpan);
        actions.appendChild(uploadLab);
    }

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'studio-btn-ghost studio-btn-ghost--sm';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
        if (control instanceof HTMLTextAreaElement || control instanceof HTMLInputElement) {
            control.value = '';
            hooks.markDirty();
            if (previewEl) updateMediaPreview(previewEl, '', kind);
        }
    });
    actions.appendChild(clearBtn);

    wrap.appendChild(actions);
    return { wrap, control, previewEl, kind };
}

/**
 * Side-by-side English / 日本語 fields (shared heading).
 * @param {HTMLElement} container
 * @param {string} slug
 * @param {{ path: string, label: string, value: string }} enRow
 * @param {{ path: string, label: string, value: string }} jaRow
 * @param {{ markDirty: () => void, translateEnToJa?: (s: string) => Promise<string> }} hooks
 */
export function appendContentLocalePairRow(container, slug, enRow, jaRow, hooks) {
    const enKind = getFieldKind(slug, enRow.path);
    const rowEl = document.createElement('div');
    rowEl.className = `studio-content-field-row studio-content-field-row--locale-pair studio-content-field-row--kind-${enKind}`;
    rowEl.dataset.fieldKind = enKind;

    const head = document.createElement('div');
    head.className = 'studio-content-field-head';
    const badge = document.createElement('span');
    badge.className = `studio-field-kind-badge studio-field-kind-badge--${enKind}`;
    badge.textContent = getFieldKindBadgeLabel(enKind);
    const title = document.createElement('span');
    title.className = 'studio-content-field-title';
    title.textContent = `${enRow.label} · ${jaRow.label}`;
    head.appendChild(badge);
    head.appendChild(title);
    rowEl.appendChild(head);

    const ht = getFieldKindHelperText(enKind);
    if (ht) {
        const helper = document.createElement('p');
        helper.className = 'studio-field-kind-helper';
        helper.textContent = ht;
        rowEl.appendChild(helper);
    }

    const grid = document.createElement('div');
    grid.className = 'studio-content-locale-pair-grid';

    const enCol = buildLocaleColumn(slug, enRow, hooks, 'English');
    const jaCol = buildLocaleColumn(slug, jaRow, hooks, '日本語');

    grid.appendChild(enCol.wrap);
    grid.appendChild(jaCol.wrap);
    rowEl.appendChild(grid);

    if (enKind === 'plainText' && typeof hooks.translateEnToJa === 'function') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'studio-btn-ghost studio-btn-ghost--sm studio-content-translate-btn';
        btn.textContent = 'Translate to Japanese';
        btn.addEventListener('click', async () => {
            const src =
                enCol.control instanceof HTMLTextAreaElement || enCol.control instanceof HTMLInputElement
                    ? enCol.control.value.trim()
                    : '';
            if (!src) return;
            btn.disabled = true;
            try {
                const out = await hooks.translateEnToJa(src);
                if (jaCol.control instanceof HTMLTextAreaElement || jaCol.control instanceof HTMLInputElement) {
                    jaCol.control.value = out;
                    hooks.markDirty();
                }
            } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
            } finally {
                btn.disabled = false;
            }
        });
        const act = enCol.wrap.querySelector('.studio-content-field-actions--locale-col');
        if (act) {
            enCol.wrap.insertBefore(btn, act);
        } else {
            enCol.wrap.appendChild(btn);
        }
    }

    container.appendChild(rowEl);
}
