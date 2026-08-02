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
function emptyPlanCard() {
    return {
        title: '',
        displayPrice: '',
        every: '',
        badge: '',
        subtext: '',
        subtext2: '',
        includedBullets: [''],
    };
}

/**
 * @param {unknown} raw
 * @param {string[]} [fallbackBullets]
 * @returns {string[]}
 */
function normalizePlanBullets(raw, fallbackBullets = []) {
    const fromPlan = Array.isArray(raw)
        ? raw.map((x) => String(x ?? '').trim()).filter(Boolean)
        : [];
    if (fromPlan.length) return fromPlan;
    const fromFallback = Array.isArray(fallbackBullets)
        ? fallbackBullets.map((x) => String(x ?? '').trim()).filter(Boolean)
        : [];
    return fromFallback.length ? fromFallback : [''];
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
        planMonthly: emptyPlanCard(),
        planQuarterly: emptyPlanCard(),
        planAnnual: emptyPlanCard(),
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
 * @param {Record<string, any>} src
 * @param {Record<string, any>} basePlan
 */
function mergePlanCard(src, basePlan) {
    const legacyShared = Array.isArray(src.includes)
        ? src.includes.map((x) => String(x ?? '').trim()).filter(Boolean)
        : [];
    const legacyMonthly = src.planBimonthly && typeof src.planBimonthly === 'object' ? src.planBimonthly : null;
    const monthlySrc =
        src.planMonthly && typeof src.planMonthly === 'object'
            ? src.planMonthly
            : legacyMonthly || {};
    /**
     * @param {Record<string, any>} planSrc
     * @param {boolean} seedFromShared
     */
    const mergeOne = (planSrc, seedFromShared) => {
        const merged = { ...basePlan, ...planSrc };
        merged.includedBullets = normalizePlanBullets(
            planSrc.includedBullets,
            seedFromShared ? legacyShared : [],
        );
        return merged;
    };
    return {
        planMonthly: mergeOne(monthlySrc, true),
        planQuarterly: mergeOne(
            src.planQuarterly && typeof src.planQuarterly === 'object' ? src.planQuarterly : {},
            true,
        ),
        planAnnual: mergeOne(
            src.planAnnual && typeof src.planAnnual === 'object' ? src.planAnnual : {},
            true,
        ),
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
        out.roles = Array.isArray(src.roles) && src.roles.length ? [...src.roles] : [...base.roles];
        Object.assign(out, mergePlanCard(src, emptyPlanCard()));
        // Keep legacy `includes` in sync with monthly for older readers; edit per-plan bullets in Studio.
        out.includes = normalizePlanBullets(out.planMonthly?.includedBullets).filter(Boolean);
        if (!out.includes.length) out.includes = [''];
        delete out.planBimonthly;
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
 * @param {string} planKey
 * @param {string} subhead
 */
function planCardFieldsHtml(loc, planKey, subhead) {
    const plan = loc[planKey] || {};
    const bullets = normalizePlanBullets(plan.includedBullets);
    const benefitsHtml = bullets
        .map(
            (line, i) => `
        <div class="studio-jnp__include-row">
            <input class="studio-input" data-jnp="${planKey}.includedBullets.${i}" value="${esc(line)}" placeholder="Benefit ${i + 1}" />
            <button type="button" class="studio-btn-ghost" data-jnp-remove-benefit="${planKey}:${i}" title="Remove">×</button>
        </div>`,
        )
        .join('');
    return `
        <div class="studio-jnp__plan-slot">
            <p class="studio-prog-card-slot">${esc(subhead)}</p>
            <div class="studio-jnp__grid-2">
                <label class="studio-jnp__field"><span>Title</span>
                    <input class="studio-input" data-jnp="${planKey}.title" value="${esc(plan.title)}" /></label>
                <label class="studio-jnp__field"><span>Display price</span>
                    <input class="studio-input" data-jnp="${planKey}.displayPrice" value="${esc(plan.displayPrice)}" /></label>
                <label class="studio-jnp__field"><span>Every</span>
                    <input class="studio-input" data-jnp="${planKey}.every" value="${esc(plan.every)}" /></label>
                <label class="studio-jnp__field"><span>Badge</span>
                    <input class="studio-input" data-jnp="${planKey}.badge" value="${esc(plan.badge)}" /></label>
                <label class="studio-jnp__field studio-jnp__field--full"><span>Subtext</span>
                    <input class="studio-input" data-jnp="${planKey}.subtext" value="${esc(plan.subtext)}" /></label>
                <label class="studio-jnp__field studio-jnp__field--full"><span>Subtext line 2</span>
                    <input class="studio-input" data-jnp="${planKey}.subtext2" value="${esc(plan.subtext2)}" /></label>
            </div>
            <p class="studio-muted" style="margin-top:0.75rem">Benefits for this plan</p>
            <div class="studio-jnp__includes" data-jnp-benefits="${planKey}">${benefitsHtml}</div>
            <button type="button" class="studio-btn-ghost" data-jnp-add-benefit="${planKey}" style="margin-top:0.45rem">+ Add benefit</button>
        </div>`;
}

/**
 * @param {Record<string, any>} loc
 * @param {'en'|'ja'} locale
 */
function fieldsHtml(loc, locale) {
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
            <p class="studio-muted">Monthly is preselected on the public page. Add benefits under each plan — the live page swaps the list when a visitor selects a plan. Modal join copy stays under Content → join-network-flow.</p>
            <label class="studio-jnp__field studio-jnp__field--full" style="margin-bottom:0.75rem"><span>Benefits list title</span>
                <input class="studio-input" data-jnp="includesTitle" value="${esc(loc.includesTitle)}" placeholder="Your membership includes" /></label>
            ${planCardFieldsHtml(loc, 'planMonthly', '1. Monthly')}
            ${planCardFieldsHtml(loc, 'planQuarterly', '2. Quarterly')}
            ${planCardFieldsHtml(loc, 'planAnnual', '3. Annual')}
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
    const mo = loc.planMonthly || {};
    const qu = loc.planQuarterly || {};
    const an = loc.planAnnual || {};
    const planPreview = (plan, active) => `
                    <div class="studio-jnp__preview-plan${active ? ' is-on' : ''}">
                        <strong>${esc(plan.title)}</strong>
                        <div>${esc(plan.displayPrice)} ${esc(plan.every)}</div>
                        <small>${esc(plan.badge)}</small>
                    </div>`;
    const monthlyBenefits = normalizePlanBullets(mo.includedBullets)
        .filter(Boolean)
        .map((line) => `<li>${esc(line)}</li>`)
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
                    ${planPreview(mo, true)}
                    ${planPreview(qu, false)}
                    ${planPreview(an, false)}
                </div>
                <p class="studio-muted" style="margin:0.55rem 0 0.2rem;font-size:0.72rem">${esc(loc.includesTitle || 'Includes')} (monthly)</p>
                <ul class="studio-jnp__preview-includes">${monthlyBenefits || '<li class="studio-muted">No benefits yet</li>'}</ul>
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
    if (parentParts.length === 3 && (parentParts[0] === 'collage' || parentParts[0] === 'proof')) {
        const key = parentParts[0];
        const idx = Number(parentParts[1]);
        const field = parentParts[2];
        if (!Array.isArray(obj[key])) obj[key] = [];
        if (!obj[key][idx]) obj[key][idx] = {};
        obj[key][idx][field] = value;
        return;
    }
    if (
        parentParts.length === 3 &&
        (parentParts[0] === 'planMonthly' ||
            parentParts[0] === 'planQuarterly' ||
            parentParts[0] === 'planAnnual') &&
        parentParts[1] === 'includedBullets'
    ) {
        const planKey = parentParts[0];
        const idx = Number(parentParts[2]);
        if (!obj[planKey] || typeof obj[planKey] !== 'object') obj[planKey] = {};
        if (!Array.isArray(obj[planKey].includedBullets)) obj[planKey].includedBullets = [];
        obj[planKey].includedBullets[idx] = value;
        if (planKey === 'planMonthly') {
            obj.includes = normalizePlanBullets(obj[planKey].includedBullets).filter(Boolean);
            if (!obj.includes.length) obj.includes = [''];
        }
        delete obj.planBimonthly;
        return;
    }
    if (
        parentParts.length === 2 &&
        (parentParts[0] === 'planMonthly' ||
            parentParts[0] === 'planQuarterly' ||
            parentParts[0] === 'planAnnual')
    ) {
        if (!obj[parentParts[0]]) obj[parentParts[0]] = {};
        obj[parentParts[0]][parentParts[1]] = value;
        delete obj.planBimonthly;
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

        fieldsEl?.querySelectorAll('[data-jnp-add-benefit]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const planKey = btn.getAttribute('data-jnp-add-benefit');
                if (
                    planKey !== 'planMonthly' &&
                    planKey !== 'planQuarterly' &&
                    planKey !== 'planAnnual'
                ) {
                    return;
                }
                if (!data[locale][planKey] || typeof data[locale][planKey] !== 'object') {
                    data[locale][planKey] = emptyPlanCard();
                }
                if (!Array.isArray(data[locale][planKey].includedBullets)) {
                    data[locale][planKey].includedBullets = [''];
                }
                data[locale][planKey].includedBullets.push('');
                if (planKey === 'planMonthly') {
                    data[locale].includes = [...data[locale][planKey].includedBullets];
                }
                setDirty(true);
                renderFields();
            });
        });

        fieldsEl?.querySelectorAll('[data-jnp-remove-benefit]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const raw = btn.getAttribute('data-jnp-remove-benefit') || '';
                const [planKey, idxStr] = raw.split(':');
                const i = Number(idxStr);
                if (
                    (planKey !== 'planMonthly' &&
                        planKey !== 'planQuarterly' &&
                        planKey !== 'planAnnual') ||
                    !Number.isFinite(i)
                ) {
                    return;
                }
                const plan = data[locale][planKey];
                if (!plan || !Array.isArray(plan.includedBullets)) return;
                plan.includedBullets.splice(i, 1);
                if (!plan.includedBullets.length) plan.includedBullets = [''];
                if (planKey === 'planMonthly') {
                    data[locale].includes = [...plan.includedBullets];
                }
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
            const payload = normalizeBundle({ en: data.en, ja: data.ja });
            await upsertContentPageStudio('join-network-page', payload);
            data = payload;
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
