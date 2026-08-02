/**
 * Studio Operations → Join Network — manage `/join-network` landing CMS.
 */
import '../../../styles/studioJoinNetworkPage.css';
import { getContentBundleForStudio, upsertContentPageStudio } from '../../../utils/database.js';
import { uploadBlobToS3 } from '../../../utils/studioS3Upload.js';
import { prepareImageFileForUpload } from '../../../utils/imageUploadPrep.js';
import { studioFeatureAccess } from '../../../utils/studioShellState.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** @returns {Record<string, any>} */
function emptyLocale() {
    return {
        seoTitle: '',
        seoDescription: '',
        storyHeadline: '',
        storySubheadline: '',
        storySecondary: '',
        collage: [
            { src: '', alt: '' },
            { src: '', alt: '' },
            { src: '', alt: '' },
        ],
        formTitle: '',
        formSubtitle: '',
        roleLabel: '',
        roles: ['Artist', 'Gallery', 'Curator', 'Collector'],
        firstNamePlaceholder: '',
        lastNamePlaceholder: '',
        emailPlaceholder: '',
        accessCodeLabel: '',
        accessCodePlaceholder: '',
        planGroupLabel: '',
        planBimonthly: { title: '', displayPrice: '', every: '', badge: '', subtext: '' },
        planAnnual: { title: '', displayPrice: '', every: '', badge: '', subtext: '' },
        includesTitle: '',
        includes: [''],
        ctaLabel: '',
        paymentFooter: '',
        proof: [
            { title: '', line: '' },
            { title: '', line: '' },
            { title: '', line: '' },
        ],
    };
}

/**
 * @param {unknown} raw
 * @returns {{ en: Record<string, any>, ja: Record<string, any> }}
 */
function normalizeBundle(raw) {
    const base = emptyLocale();
    const obj = raw && typeof raw === 'object' ? /** @type {any} */ (raw) : {};
    const merge = (loc) => {
        const src = obj[loc] && typeof obj[loc] === 'object' ? obj[loc] : {};
        const out = { ...base, ...src };
        out.collage = [0, 1, 2].map((i) => ({
            src: String(src.collage?.[i]?.src ?? base.collage[i].src ?? ''),
            alt: String(src.collage?.[i]?.alt ?? base.collage[i].alt ?? ''),
        }));
        out.proof = [0, 1, 2].map((i) => ({
            title: String(src.proof?.[i]?.title ?? ''),
            line: String(src.proof?.[i]?.line ?? ''),
        }));
        out.includes = Array.isArray(src.includes) && src.includes.length ? [...src.includes] : [''];
        out.roles = Array.isArray(src.roles) && src.roles.length ? [...src.roles] : [...base.roles];
        out.planBimonthly = { ...base.planBimonthly, ...(src.planBimonthly || {}) };
        out.planAnnual = { ...base.planAnnual, ...(src.planAnnual || {}) };
        return out;
    };
    return { en: merge('en'), ja: merge('ja') };
}

export function renderJoinNetworkPageStudio() {
    return `
        <div class="studio-jnp" id="studio-jnp-root">
            <header class="studio-jnp__header">
                <div>
                    <h1 class="studio-jnp__title">Join Network</h1>
                    <p class="studio-jnp__lede">Edit the public <code>/join-network</code> conversion page — story, plans, benefits, and proof. Preview updates as you type. Modal join copy stays under Content → join-network-flow.</p>
                </div>
                <div class="studio-jnp__header-actions">
                    <a class="studio-jnp__live-link" href="/join-network" target="_blank" rel="noopener">Open live page ↗</a>
                </div>
            </header>
            <p class="studio-jnp__status" id="studio-jnp-status" aria-live="polite"></p>
            <div class="studio-jnp__layout">
                <div class="studio-jnp__editors">
                    <div class="studio-jnp__locale-tabs" role="tablist">
                        <button type="button" class="studio-jnp__locale-tab is-active" data-jnp-locale="en">EN</button>
                        <button type="button" class="studio-jnp__locale-tab" data-jnp-locale="ja">JA</button>
                    </div>
                    <div id="studio-jnp-fields"></div>
                </div>
                <aside class="studio-jnp__preview-wrap" aria-label="Live preview">
                    <div class="studio-jnp__preview-card">
                        <p class="studio-jnp__preview-label">Live preview</p>
                        <div class="studio-jnp__preview" id="studio-jnp-preview"></div>
                    </div>
                </aside>
            </div>
            <div class="studio-jnp__sticky-save">
                <button type="button" class="studio-btn-primary" id="studio-jnp-save">Save</button>
                <span class="studio-muted" id="studio-jnp-dirty" hidden>Unsaved changes</span>
            </div>
        </div>
    `;
}

/**
 * @param {Record<string, any>} loc
 * @param {'en'|'ja'} locale
 */
function fieldsHtml(loc, locale) {
    const includes = (loc.includes || ['']).map(
        (line, i) => `
        <div class="studio-jnp__include-row">
            <input class="studio-input" data-jnp="includes.${i}" value="${esc(line)}" placeholder="Benefit ${i + 1}" />
            <button type="button" class="studio-btn-ghost" data-jnp-remove-include="${i}" title="Remove">×</button>
        </div>`,
    ).join('');
    const collage = (loc.collage || []).map(
        (c, i) => `
        <div class="studio-jnp__collage-row">
            ${
                c.src
                    ? `<img class="studio-jnp__thumb" src="${esc(c.src)}" alt="" />`
                    : `<div class="studio-jnp__thumb studio-jnp__thumb--empty">No image</div>`
            }
            <div>
                <input class="studio-input" data-jnp="collage.${i}.src" value="${esc(c.src)}" placeholder="Image URL" />
                <input class="studio-input" style="margin-top:0.3rem" data-jnp="collage.${i}.alt" value="${esc(c.alt)}" placeholder="Alt text" />
            </div>
            <div>
                <input type="file" accept="image/*" data-jnp-upload="${i}" hidden />
                <button type="button" class="studio-btn-ghost" data-jnp-upload-btn="${i}">Upload</button>
            </div>
        </div>`,
    ).join('');
    const proof = (loc.proof || []).map(
        (p, i) => `
        <div class="studio-jnp__grid-2">
            <label class="studio-jnp__field"><span>Proof ${i + 1} title</span>
                <input class="studio-input" data-jnp="proof.${i}.title" value="${esc(p.title)}" /></label>
            <label class="studio-jnp__field"><span>Line</span>
                <input class="studio-input" data-jnp="proof.${i}.line" value="${esc(p.line)}" /></label>
        </div>`,
    ).join('');

    return `
        <section class="studio-jnp__card">
            <h3>Story (left column)</h3>
            <p class="studio-muted">Headline, Japan positioning, and collage for locale <strong>${locale.toUpperCase()}</strong>.</p>
            <div class="studio-jnp__grid-2">
                <label class="studio-jnp__field studio-jnp__field--full"><span>Headline</span>
                    <textarea class="studio-textarea" rows="2" data-jnp="storyHeadline">${esc(loc.storyHeadline)}</textarea></label>
                <label class="studio-jnp__field studio-jnp__field--full"><span>Subheadline</span>
                    <textarea class="studio-textarea" rows="2" data-jnp="storySubheadline">${esc(loc.storySubheadline)}</textarea></label>
                <label class="studio-jnp__field studio-jnp__field--full"><span>Secondary line</span>
                    <input class="studio-input" data-jnp="storySecondary" value="${esc(loc.storySecondary)}" /></label>
            </div>
            <p class="studio-muted" style="margin-top:0.85rem">Collage images (3)</p>
            <div class="studio-jnp__collage-grid">${collage}</div>
        </section>
        <section class="studio-jnp__card">
            <h3>Form chrome</h3>
            <div class="studio-jnp__grid-2">
                <label class="studio-jnp__field"><span>Form title</span>
                    <input class="studio-input" data-jnp="formTitle" value="${esc(loc.formTitle)}" /></label>
                <label class="studio-jnp__field"><span>Subtitle</span>
                    <input class="studio-input" data-jnp="formSubtitle" value="${esc(loc.formSubtitle)}" /></label>
                <label class="studio-jnp__field"><span>CTA label</span>
                    <input class="studio-input" data-jnp="ctaLabel" value="${esc(loc.ctaLabel)}" /></label>
                <label class="studio-jnp__field studio-jnp__field--full"><span>Payment footer</span>
                    <input class="studio-input" data-jnp="paymentFooter" value="${esc(loc.paymentFooter)}" /></label>
            </div>
        </section>
        <section class="studio-jnp__card">
            <h3>Plans &amp; benefits</h3>
            <p class="studio-muted">General is preselected on the public page. Changing plans here updates the landing only (modal stays under Content).</p>
            <div class="studio-jnp__grid-2">
                <label class="studio-jnp__field"><span>General title</span>
                    <input class="studio-input" data-jnp="planBimonthly.title" value="${esc(loc.planBimonthly?.title)}" /></label>
                <label class="studio-jnp__field"><span>Price</span>
                    <input class="studio-input" data-jnp="planBimonthly.displayPrice" value="${esc(loc.planBimonthly?.displayPrice)}" /></label>
                <label class="studio-jnp__field"><span>Every</span>
                    <input class="studio-input" data-jnp="planBimonthly.every" value="${esc(loc.planBimonthly?.every)}" /></label>
                <label class="studio-jnp__field"><span>Badge</span>
                    <input class="studio-input" data-jnp="planBimonthly.badge" value="${esc(loc.planBimonthly?.badge)}" /></label>
                <label class="studio-jnp__field"><span>Annual title</span>
                    <input class="studio-input" data-jnp="planAnnual.title" value="${esc(loc.planAnnual?.title)}" /></label>
                <label class="studio-jnp__field"><span>Price</span>
                    <input class="studio-input" data-jnp="planAnnual.displayPrice" value="${esc(loc.planAnnual?.displayPrice)}" /></label>
                <label class="studio-jnp__field"><span>Every</span>
                    <input class="studio-input" data-jnp="planAnnual.every" value="${esc(loc.planAnnual?.every)}" /></label>
                <label class="studio-jnp__field"><span>Badge</span>
                    <input class="studio-input" data-jnp="planAnnual.badge" value="${esc(loc.planAnnual?.badge)}" /></label>
            </div>
            <p class="studio-muted" style="margin-top:0.75rem">${esc(loc.includesTitle || 'Includes')}</p>
            <div class="studio-jnp__includes" id="studio-jnp-includes">${includes}</div>
            <button type="button" class="studio-btn-ghost" id="studio-jnp-add-include" style="margin-top:0.45rem">+ Add benefit</button>
        </section>
        <section class="studio-jnp__card">
            <h3>Proof strip</h3>
            <div class="studio-jnp__proof-grid">${proof}</div>
        </section>
        <section class="studio-jnp__card">
            <h3>SEO</h3>
            <div class="studio-jnp__grid-2">
                <label class="studio-jnp__field studio-jnp__field--full"><span>Document title</span>
                    <input class="studio-input" data-jnp="seoTitle" value="${esc(loc.seoTitle)}" /></label>
                <label class="studio-jnp__field studio-jnp__field--full"><span>Meta description</span>
                    <textarea class="studio-textarea" rows="2" data-jnp="seoDescription">${esc(loc.seoDescription)}</textarea></label>
            </div>
        </section>
    `;
}

/**
 * @param {Record<string, any>} loc
 */
function previewHtml(loc) {
    const collage = (loc.collage || [])
        .filter((c) => c?.src)
        .map((c) => `<img src="${esc(c.src)}" alt="" />`)
        .join('');
    const roles = (loc.roles || []).map(
        (r, i) => `<span class="${i === 0 ? 'is-on' : ''}">${esc(r)}</span>`,
    ).join('');
    const proof = (loc.proof || [])
        .map(
            (p) =>
                `<div><strong>${esc(p.title)}</strong><span>${esc(p.line)}</span></div>`,
        )
        .join('');
    return `
        <div class="studio-jnp__preview-grid">
            <div>
                <h3 class="studio-jnp__preview-headline">${esc(loc.storyHeadline)}</h3>
                <p class="studio-jnp__preview-sub">${esc(loc.storySubheadline)}</p>
                <p class="studio-jnp__preview-sec">${esc(loc.storySecondary)}</p>
                <div class="studio-jnp__preview-collage">${collage || '<div style="height:4rem;background:#ddd"></div>'}</div>
            </div>
            <div class="studio-jnp__preview-form">
                <h4>${esc(loc.formTitle)}</h4>
                <p>${esc(loc.formSubtitle)}</p>
                <div class="studio-jnp__preview-roles">${roles}</div>
                <div class="studio-jnp__preview-plans">
                    <div class="studio-jnp__preview-plan is-on">
                        <strong>${esc(loc.planBimonthly?.title)}</strong>
                        <div>${esc(loc.planBimonthly?.displayPrice)} ${esc(loc.planBimonthly?.every)}</div>
                        <small>${esc(loc.planBimonthly?.badge)}</small>
                    </div>
                    <div class="studio-jnp__preview-plan">
                        <strong>${esc(loc.planAnnual?.title)}</strong>
                        <div>${esc(loc.planAnnual?.displayPrice)} ${esc(loc.planAnnual?.every)}</div>
                        <small>${esc(loc.planAnnual?.badge)}</small>
                    </div>
                </div>
                <div class="studio-jnp__preview-cta">${esc(loc.ctaLabel)}</div>
            </div>
        </div>
        <div class="studio-jnp__preview-proof">${proof}</div>
        <p class="studio-muted" style="margin:0.75rem 0 0;font-size:0.75rem">Live page uses the site header + footer; this preview is content only.</p>
    `;
}

/**
 * @param {object} obj
 * @param {string} path
 * @param {string} value
 */
function setPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        const next = parts[i + 1];
        const idx = /^\d+$/.test(next) ? Number(next) : null;
        if (idx != null) {
            if (!Array.isArray(cur[p])) cur[p] = [];
            if (!cur[p][idx] || typeof cur[p][idx] !== 'object') {
                cur[p][idx] = {};
            }
            cur = cur[p][idx];
            i++;
            continue;
        }
        if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
        cur = cur[p];
    }
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last) && Array.isArray(cur)) {
        /* handled above for nested objects */
    }
    const parentParts = path.split('.');
    if (parentParts.length >= 2 && parentParts[0] === 'includes') {
        const idx = Number(parentParts[1]);
        if (!Array.isArray(obj.includes)) obj.includes = [];
        obj.includes[idx] = value;
        return;
    }
    if (parentParts.length === 3 && (parentParts[0] === 'collage' || parentParts[0] === 'proof')) {
        const key = parentParts[0];
        const idx = Number(parentParts[1]);
        const field = parentParts[2];
        if (!Array.isArray(obj[key])) obj[key] = [];
        if (!obj[key][idx]) obj[key][idx] = {};
        obj[key][idx][field] = value;
        return;
    }
    if (parentParts.length === 2 && (parentParts[0] === 'planBimonthly' || parentParts[0] === 'planAnnual')) {
        if (!obj[parentParts[0]]) obj[parentParts[0]] = {};
        obj[parentParts[0]][parentParts[1]] = value;
        return;
    }
    obj[last] = value;
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initJoinNetworkPageStudio(mainEl) {
    const root = mainEl.querySelector('#studio-jnp-root') || mainEl;
    const canEdit = studioFeatureAccess('join-network').canEdit !== false;
    let locale = /** @type {'en'|'ja'} */ ('en');
    let data = normalizeBundle(null);
    let dirty = false;

    try {
        const raw = await getContentBundleForStudio('join-network-page', { forStudio: true });
        data = normalizeBundle(raw);
    } catch {
        /* defaults */
    }

    const fieldsEl = root.querySelector('#studio-jnp-fields');
    const previewEl = root.querySelector('#studio-jnp-preview');
    const statusEl = root.querySelector('#studio-jnp-status');
    const dirtyEl = root.querySelector('#studio-jnp-dirty');
    const saveBtn = /** @type {HTMLButtonElement | null} */ (root.querySelector('#studio-jnp-save'));

    const setStatus = (msg, kind = '') => {
        if (!(statusEl instanceof HTMLElement)) return;
        statusEl.textContent = msg || '';
        statusEl.classList.toggle('is-ok', kind === 'ok');
        statusEl.classList.toggle('is-error', kind === 'error');
    };

    const setDirty = (v) => {
        dirty = v;
        if (dirtyEl instanceof HTMLElement) dirtyEl.hidden = !v;
    };

    const renderPreview = () => {
        if (previewEl instanceof HTMLElement) previewEl.innerHTML = previewHtml(data[locale]);
    };

    const wireFields = () => {
        fieldsEl?.querySelectorAll('[data-jnp]').forEach((el) => {
            const path = el.getAttribute('data-jnp');
            if (!path) return;
            const handler = () => {
                const value =
                    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
                        ? el.value
                        : '';
                setPath(data[locale], path, value);
                setDirty(true);
                renderPreview();
            };
            el.addEventListener('input', handler);
            el.addEventListener('change', handler);
        });

        fieldsEl?.querySelectorAll('[data-jnp-upload-btn]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const i = btn.getAttribute('data-jnp-upload-btn');
                const input = fieldsEl.querySelector(`[data-jnp-upload="${i}"]`);
                if (input instanceof HTMLInputElement) input.click();
            });
        });

        fieldsEl?.querySelectorAll('[data-jnp-upload]').forEach((input) => {
            if (!(input instanceof HTMLInputElement)) return;
            input.addEventListener('change', async () => {
                const file = input.files?.[0];
                if (!file) return;
                const idx = Number(input.getAttribute('data-jnp-upload'));
                setStatus('Uploading image…');
                try {
                    const prepared = await prepareImageFileForUpload(file);
                    const url = await uploadBlobToS3(prepared, null, {
                        area: 'platform-assets',
                        entityType: 'join-network-page',
                        entityId: 'collage',
                        fieldKey: `slot-${idx}`,
                    });
                    if (!Array.isArray(data[locale].collage)) data[locale].collage = [];
                    if (!data[locale].collage[idx]) data[locale].collage[idx] = { src: '', alt: '' };
                    data[locale].collage[idx].src = url;
                    setDirty(true);
                    renderFields();
                    setStatus('Image uploaded.', 'ok');
                } catch (e) {
                    setStatus(e instanceof Error ? e.message : String(e), 'error');
                }
            });
        });

        fieldsEl?.querySelector('#studio-jnp-add-include')?.addEventListener('click', () => {
            if (!Array.isArray(data[locale].includes)) data[locale].includes = [];
            data[locale].includes.push('');
            setDirty(true);
            renderFields();
        });

        fieldsEl?.querySelectorAll('[data-jnp-remove-include]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const i = Number(btn.getAttribute('data-jnp-remove-include'));
                if (!Array.isArray(data[locale].includes)) return;
                data[locale].includes.splice(i, 1);
                if (!data[locale].includes.length) data[locale].includes = [''];
                setDirty(true);
                renderFields();
            });
        });
    };

    const renderFields = () => {
        if (!(fieldsEl instanceof HTMLElement)) return;
        fieldsEl.innerHTML = fieldsHtml(data[locale], locale);
        if (!canEdit) {
            fieldsEl.querySelectorAll('input, textarea, button').forEach((el) => {
                if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                    el.disabled = true;
                }
            });
        }
        wireFields();
        renderPreview();
    };

    root.querySelectorAll('[data-jnp-locale]').forEach((tab) => {
        tab.addEventListener('click', () => {
            const loc = tab.getAttribute('data-jnp-locale');
            if (loc !== 'en' && loc !== 'ja') return;
            locale = loc;
            root.querySelectorAll('[data-jnp-locale]').forEach((t) => {
                t.classList.toggle('is-active', t.getAttribute('data-jnp-locale') === locale);
            });
            renderFields();
        });
    });

    saveBtn?.addEventListener('click', async () => {
        if (!canEdit) {
            setStatus('You do not have edit access.', 'error');
            return;
        }
        saveBtn.disabled = true;
        setStatus('Saving…');
        try {
            await upsertContentPageStudio('join-network-page', {
                en: data.en,
                ja: data.ja,
            });
            setDirty(false);
            setStatus('Saved.', 'ok');
        } catch (e) {
            setStatus(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            saveBtn.disabled = false;
        }
    });

    if (saveBtn) saveBtn.disabled = !canEdit;
    renderFields();
}
