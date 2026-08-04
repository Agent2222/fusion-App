/**
 * Studio **Content** section — CMS table + editor (extracted from `panels.js` per reimagination plan Phase C).
 */
import {
    CONTENT_PAGE_REGISTRY,
    getContentBundleForStudio,
    getContentSummary,
    getContentSummaryForSurface,
    studioTranslateEnToJa,
    upsertContentPageStudio,
} from '../../../utils/database.js';
import {
    applyScalarPatches,
    applyStringPatches,
    flattenScalarFields,
    flattenStringFields,
    syncContextJaMediaFromEn,
} from '../../../utils/studioPlainForms.js';
import { appendContentFieldRow, appendContentLocalePairRow, collectContentStringValues } from '../studioFieldRender.js';
import { groupLocaleContentRows } from '../../../utils/studioContentLocalePairs.js';
import { getFieldKind } from '../../../utils/studioFieldRegistry.js';
import { partitionGroupedContentRowsByChapters } from '../studioContentManifest.js';
import { uploadBlobToS3 } from '../../../utils/studioS3Upload.js';
import { resetStudioWorkspaceTrail, setStudioWorkspaceTrail } from '../studioWorkspaceChrome.js';
import {
    fillJoinNetworkFlowEditor,
    mergeJoinNetworkFlowFromContainer,
} from './joinNetworkFlowStudio.js';
import {
    fillProgramDrawContentEditor,
    mergeProgramDrawContentFromContainer,
} from './programDrawContentStudio.js';

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Shared markup for Content and Home Studio tabs (`prefix` e.g. `studio-content`, `studio-home`).
 *
 * @param {string} prefix
 * @param {string} introHtml
 */
export function renderStudioContentPanelHtml(prefix, introHtml) {
    return `
        <div class="studio-section-stack">
            ${introHtml}
            <div class="studio-content-toolbar">
                <label class="studio-field studio-field--inline"><span class="studio-toolbar-label">Search</span>
                    <input type="search" id="${prefix}-filter" class="studio-input" placeholder="Filter sections…" autocomplete="off" />
                </label>
                <span id="${prefix}-count" class="studio-muted studio-content-count"></span>
            </div>
            <div class="studio-table-wrap studio-table-wrap--rounded">
                <table class="studio-table studio-table--rows">
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Preview</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="${prefix}-tbody"><tr><td colspan="3">Loading…</td></tr></tbody>
                </table>
            </div>
            <div id="${prefix}-editor" class="studio-content-editor" style="display:none">
                <div class="studio-content-editor__header">
                    <h3 class="studio-subheading" id="${prefix}-editor-title">Edit</h3>
                    <p class="studio-muted studio-content-editor-slug" id="${prefix}-editor-slug" hidden></p>
                </div>
                <p class="studio-modal-hint studio-content-hint" id="${prefix}-hint">Fields are labeled by kind (Route, Media, Text, …). Uploads use Services → S3. Save to persist to storage.</p>
                <p id="${prefix}-live-placeholder" class="studio-banner studio-banner--placeholder" style="display:none" role="status">
                    Sample copy only — this section is not stored on the canister yet. Use <strong>Save</strong> or <strong>Adopt sample</strong> to persist (including any edits).
                </p>
                <p id="${prefix}-unsaved" class="studio-banner studio-banner--warn" style="display:none" role="status">You have unsaved changes.</p>
                <div id="${prefix}-fields" class="studio-content-fields studio-content-fields--scroll"></div>
                <div class="studio-content-editor__footer">
                    <div class="studio-toolbar-actions studio-content-editor__actions">
                        <button type="button" class="studio-btn-primary" id="${prefix}-save">Save</button>
                        <button type="button" class="studio-btn-primary" id="${prefix}-adopt" style="display:none">Adopt sample</button>
                        <button type="button" class="studio-btn-ghost" id="${prefix}-cancel">Cancel</button>
                    </div>
                    <p id="${prefix}-saved-at" class="studio-muted studio-content-saved-at" style="display:none" aria-live="polite"></p>
                    <p id="${prefix}-msg" class="studio-banner studio-banner--info" style="display:none"></p>
                </div>
            </div>
        </div>
    `;
}

export function renderContent() {
    return renderStudioContentPanelHtml(
        'studio-content',
        `<p class="studio-muted">Legal pages, application copy, and site sections that are not edited under <strong>Home</strong>, <strong>Programs</strong>, <strong>Products</strong>, or <strong>Journal</strong>. Labels describe where text appears (English and 日本語).</p>`,
    );
}

/** @returns {string} */
export function renderHome() {
    return renderStudioContentPanelHtml(
        'studio-home',
        `<p class="studio-muted">Homepage and global blocks (program hero, objects, events, audio, <strong>site-info</strong> home chapter, …). Same canister storage as before — one content page per slug.</p>`,
    );
}

/**
 * Content editor: flatten → {@link getFieldKind} per path → {@link appendContentFieldRow} (studioFieldRender.js).
 * Chapters from {@link partitionGroupedContentRowsByChapters} when manifest defines slug.
 *
 * @param {HTMLElement} container
 * @param {unknown} bundle
 * @param {string} slug
 * @param {{ markDirty: () => void }} hooks
 * @param {{ chapterId?: string }} [options] When set (e.g. `site-info` + `programs`), only that chapter’s fields render.
 */
export function fillStudioContentPlainFields(container, bundle, slug, hooks, options = {}) {
    const chapterId = options.chapterId;
    container.innerHTML = '';
    let rows = flattenStringFields(bundle);
    if (slug === 'context') {
        rows = rows.filter((r) => {
            if (!r.path.startsWith('ja.')) return true;
            const k = getFieldKind('context', r.path);
            return k !== 'assetUrl' && k !== 'externalUrl';
        });
    }
    rows = rows.sort((a, b) => a.path.localeCompare(b.path));
    const grouped = groupLocaleContentRows(rows);

    /** @type {{ markDirty: () => void, translateEnToJa: (s: string) => Promise<string> }} */
    const hooksPair = {
        markDirty: () => hooks.markDirty(),
        translateEnToJa: (text) => studioTranslateEnToJa(text),
    };

    let partitions = partitionGroupedContentRowsByChapters(grouped, slug);
    if (chapterId) {
        partitions = partitions.filter((part) => part.chapter?.id === chapterId);
    }

    for (const part of partitions) {
        const target =
            part.title && part.items.length
                ? (() => {
                      const region = document.createElement('section');
                      region.className = 'studio-content-chapter';
                      if (part.chapter?.id) region.dataset.chapterId = part.chapter.id;
                      const h = document.createElement('h3');
                      h.className = 'studio-content-chapter-title';
                      h.textContent = part.title || '';
                      region.appendChild(h);
                      const body = document.createElement('div');
                      body.className = 'studio-content-chapter-body';
                      region.appendChild(body);
                      container.appendChild(region);
                      return body;
                  })()
                : container;

        for (const g of part.items) {
            if (g.type === 'pair') {
                appendContentLocalePairRow(target, slug, g.en, g.ja, hooksPair);
            } else {
                appendContentFieldRow(target, slug, g.row, hooks);
            }
        }
    }
    const scalars = flattenScalarFields(bundle).sort((a, b) => a.path.localeCompare(b.path));
    for (const s of scalars) {
        const row = document.createElement('div');
        row.className = 'studio-content-field-row studio-content-field-row--scalar';
        const lab = document.createElement('label');
        lab.className = 'studio-field studio-field--stack studio-content-field-main';
        const span = document.createElement('span');
        span.textContent = `${s.label} (${s.kind})`;
        lab.appendChild(span);
        if (s.kind === 'boolean') {
            const inp = document.createElement('input');
            inp.type = 'checkbox';
            inp.className = 'studio-checkbox';
            inp.dataset.scalarPath = s.path;
            inp.checked = Boolean(s.value);
            inp.addEventListener('change', () => hooks.markDirty());
            lab.appendChild(inp);
        } else {
            const inp = document.createElement('input');
            inp.type = 'number';
            inp.className = 'studio-input';
            inp.dataset.scalarPath = s.path;
            inp.value = String(s.value);
            inp.addEventListener('input', () => hooks.markDirty());
            lab.appendChild(inp);
        }
        row.appendChild(lab);
        container.appendChild(row);
    }
    if (Array.isArray(bundle) && bundle.length > 0) {
        const wrap = document.createElement('div');
        wrap.className = 'studio-content-array-hint';
        const tbl = document.createElement('table');
        tbl.className = 'studio-table studio-content-mini-table';
        tbl.innerHTML =
            '<thead><tr><th>#</th><th>Id / key</th><th>Preview</th></tr></thead><tbody></tbody>';
        const tb = tbl.querySelector('tbody');
        bundle.forEach((row, idx) => {
            const tr = document.createElement('tr');
            const id =
                row && typeof row === 'object'
                    ? String(row.id ?? row.href ?? row.title ?? row.link ?? '—')
                    : '—';
            const prev =
                row && typeof row === 'object' && row.en && typeof row.en === 'object'
                    ? String(row.en.title ?? row.en.category ?? '')
                    : '';
            tr.innerHTML = `<td>${idx}</td><td>${escapeHtml(id.slice(0, 80))}</td><td>${escapeHtml(prev.slice(0, 120))}</td>`;
            tb?.appendChild(tr);
        });
        const cap = document.createElement('p');
        cap.className = 'studio-muted';
        cap.innerHTML = `<strong>${bundle.length}</strong> items — edit fields below (paths like <code>0.en.title</code>).`;
        wrap.appendChild(cap);
        wrap.appendChild(tbl);
        container.insertBefore(wrap, container.firstChild);
    }
    if (!grouped.length && !scalars.length) {
        const p = document.createElement('p');
        p.className = 'studio-muted';
        p.textContent = 'No editable text or numeric fields were found for this section.';
        container.appendChild(p);
    }
}

/**
 * Load bundle from storage/testData and fill the editor (shared by Content tab and embedded Studio panels).
 *
 * @param {HTMLElement} fieldsEl
 * @param {string} slug
 * @param {{ markDirty: () => void }} hooks
 * @param {{ chapterId?: string }} [options]
 * @returns {Promise<{ isLivePlaceholder: boolean }>}
 */
export async function loadStudioContentEditorPayload(fieldsEl, slug, hooks, options = {}) {
    const loaded = await getContentBundleForStudio(slug, { forStudio: true, returnMeta: true });
    const bundle =
        loaded && typeof loaded === 'object' && 'bundle' in loaded
            ? /** @type {{ bundle: unknown }} */ (loaded).bundle
            : loaded;
    const isLivePlaceholder =
        loaded && typeof loaded === 'object' && 'isLivePlaceholder' in loaded
            ? /** @type {{ isLivePlaceholder: boolean }} */ (loaded).isLivePlaceholder
            : false;
    if (slug === 'join-network-flow') {
        fieldsEl.className = 'studio-content-fields studio-content-fields--join-network-flow';
        await fillJoinNetworkFlowEditor(fieldsEl, bundle, hooks);
        return { isLivePlaceholder };
    }
    if (slug === 'program-draw') {
        fieldsEl.className = 'studio-content-fields studio-content-fields--scroll';
        await fillProgramDrawContentEditor(fieldsEl, bundle, hooks);
        return { isLivePlaceholder };
    }
    fieldsEl.className = 'studio-content-fields studio-content-fields--scroll';
    fillStudioContentPlainFields(fieldsEl, bundle, slug || '', hooks, { chapterId: options.chapterId });
    return { isLivePlaceholder };
}

/**
 * Persist fields from a Studio content editor into the same slug (merges string/scalar patches into the stored bundle).
 *
 * @param {string} slug
 * @param {HTMLElement} fieldsEl
 */
export async function persistStudioContentPage(slug, fieldsEl) {
    if (slug === 'join-network-flow') {
        const bundle = await getContentBundleForStudio(slug, { forStudio: true });
        const next = mergeJoinNetworkFlowFromContainer(fieldsEl, bundle);
        await upsertContentPageStudio(slug, next);
        return;
    }
    if (slug === 'program-draw') {
        const bundle = await getContentBundleForStudio(slug, { forStudio: true });
        const next = mergeProgramDrawContentFromContainer(fieldsEl, bundle);
        await upsertContentPageStudio(slug, next);
        return;
    }
    const map = collectContentStringValues(fieldsEl);
    /** @type {Record<string, string>} */
    const scalarMap = {};
    fieldsEl.querySelectorAll('input[data-scalar-path]').forEach((el) => {
        const p = el.getAttribute('data-scalar-path');
        if (!p) return;
        if (el instanceof HTMLInputElement && el.type === 'checkbox') {
            scalarMap[p] = el.checked ? 'true' : 'false';
        } else if (el instanceof HTMLInputElement) {
            scalarMap[p] = el.value;
        }
    });
    const bundle = await getContentBundleForStudio(slug, { forStudio: true });
    let next = applyStringPatches(bundle, map);
    next = applyScalarPatches(bundle, next, scalarMap);
    if (slug === 'context') {
        next = syncContextJaMediaFromEn(next);
    }
    await upsertContentPageStudio(slug, next);
}

/**
 * S3 upload for content field file inputs (same behavior as Content tab).
 *
 * @param {HTMLElement} fieldsEl
 * @param {{ markDirty: () => void, showMsg: (kind: string, text: string) => void, uploadArea?: string }} opts
 */
export function attachStudioContentFileUpload(fieldsEl, opts) {
    const area = opts.uploadArea || 'studio/content';
    fieldsEl.addEventListener('change', async (ev) => {
        const t = ev.target;
        if (!(t instanceof HTMLInputElement) || t.type !== 'file') return;
        const path = t.dataset.uploadFor;
        if (!path) return;
        const f = t.files?.[0];
        if (!f) return;
        const el = fieldsEl.querySelector(`.studio-content-str-value[data-path="${CSS.escape(path)}"]`);
        if (!(el instanceof HTMLTextAreaElement) && !(el instanceof HTMLInputElement)) return;
        try {
            await uploadBlobToS3(f, el, {
                area,
                entityType: 'content',
                entityId: 'page',
                fieldKey: path.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase(),
            });
            opts.markDirty();
            opts.showMsg('ok', 'Uploaded — URL inserted. Save to persist.');
            el.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (err) {
            const m = err instanceof Error ? err.message : String(err);
            const hint =
                /presign|fetch|network|failed/i.test(m) && !/S3 upload failed/.test(m)
                    ? `${m} — configure Services (integration API + S3) via the Services tab.`
                    : m;
            opts.showMsg('error', hint);
        }
        t.value = '';
    });
}

/**
 * @param {HTMLElement} mainEl
 * @param {{ prefix: string, getSummary: () => Promise<Awaited<ReturnType<typeof getContentSummary>>>, uploadArea: string }} cfg
 */
async function initContentPanel(mainEl, cfg) {
    const p = cfg.prefix;
    const tbody = mainEl.querySelector(`#${p}-tbody`);
    const editor = mainEl.querySelector(`#${p}-editor`);
    const titleEl = mainEl.querySelector(`#${p}-editor-title`);
    const slugEl = mainEl.querySelector(`#${p}-editor-slug`);
    const fieldsEl = mainEl.querySelector(`#${p}-fields`);
    const msg = mainEl.querySelector(`#${p}-msg`);
    const unsavedEl = mainEl.querySelector(`#${p}-unsaved`);
    const savedAtEl = mainEl.querySelector(`#${p}-saved-at`);
    const placeholderEl = mainEl.querySelector(`#${p}-live-placeholder`);
    const adoptBtn = mainEl.querySelector(`#${p}-adopt`);
    const hintEl = mainEl.querySelector(`#${p}-hint`);
    const defaultHint =
        'Fields are labeled by kind (Route, Media, Text, …). Uploads use Services → S3. Save to persist to storage.';
    const joinNetworkFlowHint =
        'Edit each flow in journey order — band teaser, modal steps, and confirmation. Live preview updates as you type. Save to persist the same JSON the public site uses.';
    /** @type {string | null} */
    let activeSlug = null;
    /** @type {boolean} */
    let contentDirty = false;

    const showMsg = (kind, text) => {
        if (!msg) return;
        msg.style.display = text ? 'block' : 'none';
        msg.className = `studio-banner studio-banner--${kind}`;
        msg.textContent = text;
    };

    const setPlaceholderUi = (on) => {
        if (placeholderEl) placeholderEl.style.display = on ? 'block' : 'none';
        if (adoptBtn instanceof HTMLElement) adoptBtn.style.display = on ? '' : 'none';
    };

    const setDirty = (dirty) => {
        contentDirty = dirty;
        if (unsavedEl) {
            unsavedEl.style.display = dirty ? 'block' : 'none';
        }
        const saveBtn = mainEl.querySelector(`#${p}-save`);
        if (saveBtn instanceof HTMLButtonElement) {
            saveBtn.setAttribute('aria-busy', 'false');
        }
    };

    /** @param {string} slug */
    const registryEntry = (slug) => CONTENT_PAGE_REGISTRY.find((e) => e.slug === slug);

    const onBeforeUnload = (ev) => {
        if (contentDirty && editor?.style.display !== 'none') {
            ev.preventDefault();
            ev.returnValue = '';
        }
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    const summary = await cfg.getSummary();
    if (!tbody) return;
    const previewText = (s) => {
        const t = [s.title, s.snippet].filter(Boolean).join(' — ');
        return t.length > 160 ? `${t.slice(0, 157)}…` : t;
    };
    tbody.innerHTML = summary
        .map(
            (s) => `
        <tr>
            <td>${escapeHtml(s.label)}</td>
            <td>${escapeHtml(previewText(s))}</td>
            <td><button type="button" class="studio-btn-ghost studio-content-edit" data-slug="${escapeHtml(s.slug)}">Edit</button></td>
        </tr>`
        )
        .join('');

    const openEditor = async (slug) => {
        activeSlug = slug;
        if (editor) editor.style.display = 'block';
        const entry = registryEntry(slug);
        if (titleEl) titleEl.textContent = entry?.label ? `Edit: ${entry.label}` : 'Edit section';
        if (slugEl) {
            slugEl.textContent = slug ? `Slug: ${slug}` : '';
            slugEl.hidden = !slug;
        }
        showMsg('info', '');
        setDirty(false);
        if (savedAtEl) savedAtEl.style.display = 'none';
        if (hintEl) {
            hintEl.innerHTML =
                slug === 'join-network-flow'
                    ? joinNetworkFlowHint
                    : slug === 'program-draw'
                      ? 'Edit global Program Draw display labels and the About Program Draw section (EN/JA). Saved to the canister content page <code>program-draw</code>.'
                      : defaultHint;
        }
        const { isLivePlaceholder } = fieldsEl
            ? await loadStudioContentEditorPayload(fieldsEl, slug, { markDirty: () => setDirty(true) }, {})
            : { isLivePlaceholder: false };
        setPlaceholderUi(isLivePlaceholder);
        setStudioWorkspaceTrail(entry?.label || slug || '');
        titleEl?.focus();
        editor?.scrollIntoView({ behavior: 'smooth' });
    };

    tbody.querySelectorAll('.studio-content-edit').forEach((btn) => {
        btn.addEventListener('click', () => openEditor(btn.getAttribute('data-slug') || ''));
    });

    if (fieldsEl) {
        attachStudioContentFileUpload(fieldsEl, {
            markDirty: () => setDirty(true),
            showMsg,
            uploadArea: cfg.uploadArea,
        });
    }

    mainEl.querySelector(`#${p}-cancel`)?.addEventListener('click', () => {
        if (editor) editor.style.display = 'none';
        activeSlug = null;
        setDirty(false);
        setPlaceholderUi(false);
        if (savedAtEl) savedAtEl.style.display = 'none';
        resetStudioWorkspaceTrail();
    });

    const persistContent = async () => {
        if (!activeSlug || !fieldsEl) return;
        await persistStudioContentPage(activeSlug, fieldsEl);
        const ts = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        if (savedAtEl) {
            savedAtEl.textContent = `Last saved ${ts}`;
            savedAtEl.style.display = 'block';
        }
        setDirty(false);
        setPlaceholderUi(false);
        showMsg('ok', 'Saved.');
    };

    mainEl.querySelector(`#${p}-save`)?.addEventListener('click', async () => {
        try {
            await persistContent();
        } catch (e) {
            showMsg('error', e instanceof Error ? e.message : String(e));
        }
    });

    adoptBtn?.addEventListener('click', async () => {
        try {
            await persistContent();
        } catch (e) {
            showMsg('error', e instanceof Error ? e.message : String(e));
        }
    });

    const filterInput = mainEl.querySelector(`#${p}-filter`);
    const countEl = mainEl.querySelector(`#${p}-count`);
    const total = summary.length;
    const applyContentFilter = () => {
        const q = (filterInput instanceof HTMLInputElement ? filterInput.value : '').trim().toLowerCase();
        let n = 0;
        tbody?.querySelectorAll('tr').forEach((tr) => {
            const t = tr.textContent?.toLowerCase() ?? '';
            const show = !q || t.includes(q);
            tr.style.display = show ? '' : 'none';
            if (show) n += 1;
        });
        if (countEl) countEl.textContent = q ? `${n} of ${total} section(s) match` : `${total} sections`;
    };
    applyContentFilter();
    filterInput?.addEventListener('input', applyContentFilter);
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initContent(mainEl) {
    await initContentPanel(mainEl, {
        prefix: 'studio-content',
        getSummary: () => getContentSummary(),
        uploadArea: 'studio/content',
    });
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initHome(mainEl) {
    await initContentPanel(mainEl, {
        prefix: 'studio-home',
        getSummary: () => getContentSummaryForSurface('home'),
        uploadArea: 'studio/home-content',
    });
}
