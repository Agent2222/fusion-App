/**
 * Studio editor for `join-network-flow` — structured journey UI + live preview.
 */
import { getApplicationPaymentGlobal } from '../../../utils/database.js';
import { applyStringPatches } from '../../../utils/studioPlainForms.js';
import {
    JNF_FLOWS,
    JNF_PAYMENT_TIER_FIELDS,
    JNF_PLAN_ANNUAL_FIELDS,
    JNF_PLAN_BIMONTHLY_FIELDS,
    JNF_STAGE_LAYOUT,
    JNF_STAGES,
    JNF_VALUE_LEGACY_FIELDS,
    stagesForFlow,
} from '../../../utils/joinNetworkFlowFieldManifest.js';

/** @typedef {import('./joinNetworkFlowFieldManifest.js').JnfFlowId} JnfFlowId */
/** @typedef {import('./joinNetworkFlowFieldManifest.js').JnfStageId} JnfStageId */

/** @type {WeakMap<HTMLElement, EditorRecord>} */
const editorStore = new WeakMap();

/**
 * @typedef {object} EditorRecord
 * @property {Record<string, unknown>} state
 * @property {{ markDirty: () => void }} hooks
 * @property {JnfFlowId} flow
 * @property {JnfStageId} stage
 * @property {'en' | 'ja'} locale
 * @property {'band' | 'modal'} previewMode
 * @property {'bimonthly' | 'annual'} previewPlan
 * @property {string[]} globalBullets
 * @property {ReturnType<typeof setTimeout> | null} previewTimer
 * @property {boolean} dirtyGuardEnabled
 */

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** @param {unknown} v */
function deepClone(v) {
    try {
        return JSON.parse(JSON.stringify(v));
    } catch {
        return v;
    }
}

/**
 * @param {Record<string, unknown>} target
 * @param {Record<string, unknown>} patch
 */
function deepMergeInto(target, patch) {
    for (const [k, v] of Object.entries(patch)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
            deepMergeInto(/** @type {Record<string, unknown>} */ (target[k]), /** @type {Record<string, unknown>} */ (v));
        } else {
            target[k] = v;
        }
    }
}

/**
 * @param {Record<string, unknown>} state
 * @param {JnfFlowId} flow
 * @param {JnfStageId} stage
 * @param {'en' | 'ja'} locale
 * @returns {Record<string, unknown>}
 */
function localeBlock(state, flow, stage, locale) {
    const f = state[flow];
    if (!f || typeof f !== 'object') return {};
    const st = /** @type {Record<string, unknown>} */ (f)[stage];
    if (!st || typeof st !== 'object') return {};
    const loc = /** @type {Record<string, unknown>} */ (st)[locale];
    return loc && typeof loc === 'object' ? /** @type {Record<string, unknown>} */ (loc) : {};
}

/**
 * @param {Record<string, unknown>} state
 * @param {JnfFlowId} flow
 * @param {JnfStageId} stage
 * @param {'en' | 'ja'} locale
 * @returns {Record<string, unknown>}
 */
function ensureLocaleBlock(state, flow, stage, locale) {
    if (!state[flow] || typeof state[flow] !== 'object') state[flow] = {};
    const f = /** @type {Record<string, unknown>} */ (state[flow]);
    if (!f[stage] || typeof f[stage] !== 'object') f[stage] = {};
    const st = /** @type {Record<string, unknown>} */ (f[stage]);
    if (!st[locale] || typeof st[locale] !== 'object') st[locale] = {};
    return /** @type {Record<string, unknown>} */ (st[locale]);
}

/**
 * @param {Record<string, unknown>} bundle
 * @param {Record<string, unknown>} draft
 */
export function mergeJoinNetworkFlowBundle(bundle, draft) {
    const next = deepClone(bundle && typeof bundle === 'object' ? bundle : {});
    if (!draft || typeof draft !== 'object') return next;
    deepMergeInto(/** @type {Record<string, unknown>} */ (next), draft);
    return next;
}

/** @param {HTMLElement} container */
export function collectJoinNetworkFlowDraft(container) {
    const rec = editorStore.get(container);
    return rec ? deepClone(rec.state) : {};
}

/**
 * @param {HTMLElement} el
 * @param {EditorRecord} rec
 */
function schedulePreview(el, rec) {
    if (rec.previewTimer) clearTimeout(rec.previewTimer);
    rec.previewTimer = setTimeout(() => syncPreview(el, rec), 150);
}

/**
 * @param {HTMLElement} root
 * @param {EditorRecord} rec
 */
function syncPreview(root, rec) {
    const previewHost = root.querySelector('app-join-network[data-studio-preview]');
    const frame = root.querySelector('.studio-jnf-preview-frame');
    if (frame instanceof HTMLElement) {
        frame.dataset.previewSurface = rec.previewMode === 'band' ? 'band' : 'modal';
    }
    if (!previewHost || typeof previewHost.setStudioPreviewState !== 'function') return;
    const flowMeta = JNF_FLOWS.find((f) => f.id === rec.flow);
    previewHost.setAttribute('data-modal-type', rec.flow);
    previewHost.setStudioPreviewState({
        modalType: rec.flow,
        stage: rec.stage,
        locale: rec.locale,
        flowDraft: rec.state,
        globalBullets: rec.globalBullets,
        selectedPlan: rec.previewPlan === 'annual' ? 'annual' : 'bi_monthly',
        previewMode: rec.previewMode,
        context: rec.flow === 'access' ? 'artists' : 'home',
    });
}

/**
 * @param {HTMLElement} container
 * @param {EditorRecord} rec
 */
async function loadGlobalBullets(container, rec) {
    const listEl = container.querySelector('[data-jnf-global-list]');
    try {
        const g = await getApplicationPaymentGlobal();
        const pick =
            g && typeof g === 'object'
                ? /** @type {Record<string, unknown>} */ (g)[rec.locale] ||
                  /** @type {Record<string, unknown>} */ (g).en
                : null;
        const bullets =
            pick && Array.isArray(pick.whatsIncludedBullets)
                ? pick.whatsIncludedBullets.map((x) => String(x ?? '').trim()).filter(Boolean)
                : [];
        rec.globalBullets = bullets;
        if (listEl) {
            listEl.innerHTML = bullets.length
                ? bullets.map((t) => `<li>${escapeHtml(t)}</li>`).join('')
                : '<li class="studio-muted">No global items — configure under Studio → Services → Subscription.</li>';
        }
    } catch {
        rec.globalBullets = [];
        if (listEl) listEl.innerHTML = '<li class="studio-muted">Could not load global items.</li>';
    }
    syncPreview(container, rec);
}

/**
 * @param {string} label
 * @param {string} value
 * @param {boolean} multiline
 * @param {(next: string) => void} onChange
 */
function editorialRow(label, value, multiline, onChange) {
    const row = document.createElement('label');
    row.className = 'studio-field';
    const span = document.createElement('span');
    span.textContent = label;
    row.appendChild(span);
    let control;
    if (multiline) {
        const ta = document.createElement('textarea');
        ta.className = 'studio-input';
        ta.rows = 3;
        ta.value = value;
        ta.addEventListener('input', () => onChange(ta.value));
        control = ta;
    } else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'studio-input';
        inp.value = value;
        inp.addEventListener('input', () => onChange(inp.value));
        control = inp;
    }
    row.appendChild(control);
    return row;
}

/**
 * @param {string} title
 * @param {string} [help]
 */
function cardShell(title, help) {
    const card = document.createElement('section');
    card.className = 'studio-jnf-card';
    const h = document.createElement('h4');
    h.className = 'studio-jnf-card-title';
    h.textContent = title;
    card.appendChild(h);
    if (help) {
        const p = document.createElement('p');
        p.className = 'studio-muted studio-jnf-card-help';
        p.textContent = help;
        card.appendChild(p);
    }
    const grid = document.createElement('div');
    grid.className = 'studio-form-grid studio-community__editorial studio-jnf-editorial';
    card.appendChild(grid);
    return { card, grid };
}

/**
 * @param {HTMLElement} editorCol
 * @param {EditorRecord} rec
 * @param {HTMLElement} root
 */
function renderStageBody(editorCol, rec, root) {
    editorCol.innerHTML = '';
    const flowMeta = JNF_FLOWS.find((f) => f.id === rec.flow);
    const stageMeta = JNF_STAGES.find((s) => s.id === rec.stage);
    const pages = flowMeta?.pages || '';

    const callout = document.createElement('div');
    callout.className = 'studio-jnf-callout';
    callout.innerHTML = `<strong>Where this appears</strong><p>${escapeHtml(stageMeta?.callout(pages) || '')}</p>`;
    if (rec.stage === 'band') {
        const link = document.createElement('p');
        link.className = 'studio-muted';
        link.innerHTML =
            'Per-page band overrides live in <strong>Join network blocks</strong> (Home table).';
        callout.appendChild(link);
    }
    editorCol.appendChild(callout);

    const block = localeBlock(rec.state, rec.flow, rec.stage, rec.locale);

    if (rec.stage === 'value') {
        renderValueStage(editorCol, rec, root, block);
        return;
    }

    if (rec.stage === 'payment') {
        renderPaymentStage(editorCol, rec, root, block);
        return;
    }

    if (rec.stage === 'confirmation') {
        renderConfirmationStage(editorCol, rec, root, block);
        return;
    }

    const layout = JNF_STAGE_LAYOUT[rec.stage];
    for (const cardDef of layout?.cards || []) {
        const { card, grid } = cardShell(cardDef.title, cardDef.help);
        for (const field of cardDef.fields || []) {
            grid.appendChild(
                editorialRow(field.label, String(block[field.key] ?? ''), Boolean(field.multiline), (next) => {
                    const lb = ensureLocaleBlock(rec.state, rec.flow, rec.stage, rec.locale);
                    lb[field.key] = next;
                    rec.hooks.markDirty();
                    schedulePreview(root, rec);
                }),
            );
        }
        editorCol.appendChild(card);
    }
}

/**
 * @param {HTMLElement} editorCol
 * @param {EditorRecord} rec
 * @param {HTMLElement} root
 * @param {Record<string, unknown>} block
 */
function renderValueStage(editorCol, rec, root, block) {
    for (const cardDef of JNF_STAGE_LAYOUT.value.cards) {
        const { card, grid } = cardShell(cardDef.title, cardDef.help);
        for (const field of cardDef.fields || []) {
            grid.appendChild(
                editorialRow(field.label, String(block[field.key] ?? ''), Boolean(field.multiline), (next) => {
                    const lb = ensureLocaleBlock(rec.state, rec.flow, 'value', rec.locale);
                    lb[field.key] = next;
                    rec.hooks.markDirty();
                    schedulePreview(root, rec);
                }),
            );
        }
        editorCol.appendChild(card);
    }

    const planGrid = document.createElement('div');
    planGrid.className = 'studio-jnf-plan-grid';
    planGrid.appendChild(renderPlanCard(rec, root, 'planBimonthly', 'Bimonthly', JNF_PLAN_BIMONTHLY_FIELDS, block));
    planGrid.appendChild(renderPlanCard(rec, root, 'planAnnual', 'Annual', JNF_PLAN_ANNUAL_FIELDS, block));
    editorCol.appendChild(planGrid);

    const includesCard = document.createElement('section');
    includesCard.className = 'studio-jnf-card studio-jnf-includes-card';
    includesCard.innerHTML = `
        <h4 class="studio-jnf-card-title">What's included</h4>
        <p class="studio-muted studio-jnf-card-help">Three tiers — global (every plan), shared fallback, or plan-specific bullets.</p>
        <div class="studio-jnf-includes-tier">
            <h5 class="studio-jnf-tier-title">Included on every plan</h5>
            <p class="studio-muted">From Studio → Services → Subscription</p>
            <ul class="studio-jnf-tier-list" data-jnf-global-list></ul>
            <button type="button" class="studio-btn-ghost studio-jnf-refresh-global">Refresh global list</button>
        </div>
        <div class="studio-jnf-includes-tier">
            <h5 class="studio-jnf-tier-title">Shared list (fallback)</h5>
            <p class="studio-muted">Used when a plan has no plan-specific bullets.</p>
            <div data-jnf-shared-includes></div>
            <div class="studio-jnf-copy-actions">
                <button type="button" class="studio-btn-ghost" data-jnf-copy-shared="planBimonthly">Copy shared → Bimonthly</button>
                <button type="button" class="studio-btn-ghost" data-jnf-copy-shared="planAnnual">Copy shared → Annual</button>
            </div>
        </div>
    `;
    const sharedWrap = includesCard.querySelector('[data-jnf-shared-includes]');
    if (sharedWrap) {
        renderStringRepeater(sharedWrap, Array.isArray(block.includes) ? block.includes.map(String) : [], (arr) => {
            const lb = ensureLocaleBlock(rec.state, rec.flow, 'value', rec.locale);
            lb.includes = arr;
            rec.hooks.markDirty();
            schedulePreview(root, rec);
        });
    }
    includesCard.querySelector('.studio-jnf-refresh-global')?.addEventListener('click', () => {
        void loadGlobalBullets(root, rec);
    });
    includesCard.querySelector('[data-jnf-copy-shared="planBimonthly"]')?.addEventListener('click', () => {
        copySharedToPlan(rec, 'planBimonthly');
        rec.hooks.markDirty();
        renderStageBody(root.querySelector('[data-jnf-editor-col]'), rec, root);
    });
    includesCard.querySelector('[data-jnf-copy-shared="planAnnual"]')?.addEventListener('click', () => {
        copySharedToPlan(rec, 'planAnnual');
        rec.hooks.markDirty();
        renderStageBody(root.querySelector('[data-jnf-editor-col]'), rec, root);
    });
    editorCol.appendChild(includesCard);

    const legacy = document.createElement('details');
    legacy.className = 'studio-jnf-legacy';
    legacy.innerHTML = '<summary class="studio-muted">Legacy fallbacks</summary>';
    const { card, grid } = cardShell('Legacy fields', 'Used when newer plan card fields are empty.');
    for (const field of JNF_VALUE_LEGACY_FIELDS) {
        grid.appendChild(
            editorialRow(field.label, String(block[field.key] ?? ''), Boolean(field.multiline), (next) => {
                const lb = ensureLocaleBlock(rec.state, rec.flow, 'value', rec.locale);
                lb[field.key] = next;
                rec.hooks.markDirty();
                schedulePreview(root, rec);
            }),
        );
    }
    legacy.appendChild(card);
    editorCol.appendChild(legacy);
}

/**
 * @param {EditorRecord} rec
 * @param {'planBimonthly' | 'planAnnual'} planKey
 */
function copySharedToPlan(rec, planKey) {
    const block = localeBlock(rec.state, rec.flow, 'value', rec.locale);
    const shared = Array.isArray(block.includes) ? block.includes.map(String).filter(Boolean) : [];
    const lb = ensureLocaleBlock(rec.state, rec.flow, 'value', rec.locale);
    if (!lb[planKey] || typeof lb[planKey] !== 'object') lb[planKey] = {};
    /** @type {Record<string, unknown>} */ (lb[planKey]).includedBullets = [...shared];
}

/**
 * @param {EditorRecord} rec
 * @param {HTMLElement} root
 * @param {'planBimonthly' | 'planAnnual'} planId
 * @param {string} title
 * @param {import('./joinNetworkFlowFieldManifest.js').JnfFieldDef[]} fields
 * @param {Record<string, unknown>} block
 */
function renderPlanCard(rec, root, planId, title, fields, block) {
    const card = document.createElement('section');
    card.className = 'studio-jnf-card studio-jnf-plan-card';
    const h = document.createElement('h4');
    h.className = 'studio-jnf-card-title';
    h.textContent = title;
    card.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'studio-form-grid studio-community__editorial studio-jnf-editorial';
    const planObj =
        block[planId] && typeof block[planId] === 'object'
            ? /** @type {Record<string, unknown>} */ (block[planId])
            : {};
    for (const field of fields) {
        grid.appendChild(
            editorialRow(field.label, String(planObj[field.key] ?? ''), false, (next) => {
                const lb = ensureLocaleBlock(rec.state, rec.flow, 'value', rec.locale);
                if (!lb[planId] || typeof lb[planId] !== 'object') lb[planId] = {};
                /** @type {Record<string, unknown>} */ (lb[planId])[field.key] = next;
                rec.hooks.markDirty();
                schedulePreview(root, rec);
            }),
        );
    }
    card.appendChild(grid);

    const bulletsWrap = document.createElement('div');
    bulletsWrap.className = 'studio-jnf-plan-bullets';
    const bulletsTitle = document.createElement('p');
    bulletsTitle.className = 'studio-jnf-tier-title';
    bulletsTitle.textContent = 'Plan-specific bullets';
    bulletsWrap.appendChild(bulletsTitle);
    const ib = planObj.includedBullets;
    renderStringRepeater(
        bulletsWrap,
        Array.isArray(ib) ? ib.map(String) : [],
        (arr) => {
            const lb = ensureLocaleBlock(rec.state, rec.flow, 'value', rec.locale);
            if (!lb[planId] || typeof lb[planId] !== 'object') lb[planId] = {};
            /** @type {Record<string, unknown>} */ (lb[planId]).includedBullets = arr;
            rec.hooks.markDirty();
            schedulePreview(root, rec);
        },
    );
    card.appendChild(bulletsWrap);
    return card;
}

/**
 * @param {HTMLElement} editorCol
 * @param {EditorRecord} rec
 * @param {HTMLElement} root
 * @param {Record<string, unknown>} block
 */
function renderPaymentStage(editorCol, rec, root, block) {
    for (const cardDef of JNF_STAGE_LAYOUT.payment.cards) {
        const { card, grid } = cardShell(cardDef.title, cardDef.help);
        for (const field of cardDef.fields || []) {
            grid.appendChild(
                editorialRow(field.label, String(block[field.key] ?? ''), Boolean(field.multiline), (next) => {
                    const lb = ensureLocaleBlock(rec.state, rec.flow, 'payment', rec.locale);
                    lb[field.key] = next;
                    rec.hooks.markDirty();
                    schedulePreview(root, rec);
                }),
            );
        }
        editorCol.appendChild(card);
    }

    const tierGrid = document.createElement('div');
    tierGrid.className = 'studio-jnf-plan-grid';
    tierGrid.appendChild(renderPaymentTierCard(rec, root, 'bimonthly', 'Bimonthly tier', block));
    tierGrid.appendChild(renderPaymentTierCard(rec, root, 'annual', 'Annual tier', block));
    editorCol.appendChild(tierGrid);
}

/**
 * @param {EditorRecord} rec
 * @param {HTMLElement} root
 * @param {'bimonthly' | 'annual'} tier
 * @param {string} title
 * @param {Record<string, unknown>} block
 */
function renderPaymentTierCard(rec, root, tier, title, block) {
    const card = document.createElement('section');
    card.className = 'studio-jnf-card studio-jnf-plan-card';
    const h = document.createElement('h4');
    h.className = 'studio-jnf-card-title';
    h.textContent = title;
    card.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'studio-form-grid studio-community__editorial studio-jnf-editorial';
    const tierObj =
        block[tier] && typeof block[tier] === 'object' ? /** @type {Record<string, unknown>} */ (block[tier]) : {};
    for (const field of JNF_PAYMENT_TIER_FIELDS) {
        grid.appendChild(
            editorialRow(field.label, String(tierObj[field.key] ?? ''), false, (next) => {
                const lb = ensureLocaleBlock(rec.state, rec.flow, 'payment', rec.locale);
                if (!lb[tier] || typeof lb[tier] !== 'object') lb[tier] = {};
                /** @type {Record<string, unknown>} */ (lb[tier])[field.key] = next;
                rec.hooks.markDirty();
                schedulePreview(root, rec);
            }),
        );
    }
    card.appendChild(grid);
    return card;
}

/**
 * @param {HTMLElement} editorCol
 * @param {EditorRecord} rec
 * @param {HTMLElement} root
 * @param {Record<string, unknown>} block
 */
function renderConfirmationStage(editorCol, rec, root, block) {
    for (const cardDef of JNF_STAGE_LAYOUT.confirmation.cards) {
        const { card, grid } = cardShell(cardDef.title, cardDef.help);
        for (const field of cardDef.fields || []) {
            grid.appendChild(
                editorialRow(field.label, String(block[field.key] ?? ''), Boolean(field.multiline), (next) => {
                    const lb = ensureLocaleBlock(rec.state, rec.flow, 'confirmation', rec.locale);
                    lb[field.key] = next;
                    rec.hooks.markDirty();
                    schedulePreview(root, rec);
                }),
            );
        }
        editorCol.appendChild(card);
    }

    const linksCard = document.createElement('section');
    linksCard.className = 'studio-jnf-card';
    linksCard.innerHTML = '<h4 class="studio-jnf-card-title">Navigation links</h4>';
    const links = Array.isArray(block.links) ? block.links : [];
    renderLinksRepeater(linksCard, links, (nextLinks) => {
        const lb = ensureLocaleBlock(rec.state, rec.flow, 'confirmation', rec.locale);
        lb.links = nextLinks;
        rec.hooks.markDirty();
        schedulePreview(root, rec);
    });
    editorCol.appendChild(linksCard);
}

/**
 * @param {HTMLElement} wrap
 * @param {string[]} items
 * @param {(items: string[]) => void} onChange
 */
function renderStringRepeater(wrap, items, onChange) {
    wrap.querySelectorAll('.studio-jnf-repeater').forEach((el) => el.remove());
    const rep = document.createElement('div');
    rep.className = 'studio-jnf-repeater';

    const render = () => {
        rep.innerHTML = '';
        items.forEach((val, idx) => {
            const row = document.createElement('div');
            row.className = 'studio-jnf-repeater-row';
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'studio-input';
            inp.value = val;
            inp.addEventListener('input', () => {
                items[idx] = inp.value;
                onChange([...items]);
            });
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'studio-btn-ghost';
            del.textContent = 'Remove';
            del.addEventListener('click', () => {
                items.splice(idx, 1);
                onChange([...items]);
                render();
            });
            row.appendChild(inp);
            row.appendChild(del);
            rep.appendChild(row);
        });
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'studio-btn-ghost';
        add.textContent = 'Add item';
        add.addEventListener('click', () => {
            items.push('');
            onChange([...items]);
            render();
        });
        rep.appendChild(add);
    };
    render();
    wrap.appendChild(rep);
}

/**
 * @param {HTMLElement} wrap
 * @param {object[]} links
 * @param {(links: object[]) => void} onChange
 */
function renderLinksRepeater(wrap, links, onChange) {
    const rep = document.createElement('div');
    rep.className = 'studio-jnf-repeater studio-jnf-links-repeater';

    const render = () => {
        rep.innerHTML = '';
        links.forEach((link, idx) => {
            const row = document.createElement('div');
            row.className = 'studio-jnf-link-row';
            const o = link && typeof link === 'object' ? link : {};
            const fields = [
                ['id', 'Id'],
                ['label', 'Label'],
                ['href', 'Route'],
            ];
            for (const [key, lab] of fields) {
                const labEl = document.createElement('label');
                labEl.className = 'studio-field studio-field--stack';
                labEl.innerHTML = `<span>${lab}</span>`;
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.className = 'studio-input';
                inp.value = String(/** @type {Record<string, unknown>} */ (o)[key] ?? '');
                inp.addEventListener('input', () => {
                    if (!links[idx] || typeof links[idx] !== 'object') links[idx] = {};
                    /** @type {Record<string, unknown>} */ (links[idx])[key] = inp.value;
                    onChange([...links]);
                });
                labEl.appendChild(inp);
                row.appendChild(labEl);
            }
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'studio-btn-ghost';
            del.textContent = 'Remove link';
            del.addEventListener('click', () => {
                links.splice(idx, 1);
                onChange([...links]);
                render();
            });
            row.appendChild(del);
            rep.appendChild(row);
        });
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'studio-btn-ghost';
        add.textContent = 'Add link';
        add.addEventListener('click', () => {
            links.push({ id: '', label: '', href: '/' });
            onChange([...links]);
            render();
        });
        rep.appendChild(add);
    };
    render();
    wrap.appendChild(rep);
}

/**
 * @param {HTMLElement} root
 * @param {EditorRecord} rec
 */
function renderChrome(root, rec) {
    const flowMeta = JNF_FLOWS.find((f) => f.id === rec.flow);
    const stageIds = stagesForFlow(rec.flow, rec.state);

    const hintEl = root.querySelector('[data-jnf-flow-hint]');
    if (hintEl) hintEl.textContent = `${flowMeta?.label || rec.flow} · ${flowMeta?.pages || ''}`;

    const flowNav = root.querySelector('[data-jnf-flow-nav]');
    if (flowNav) {
        flowNav.innerHTML = JNF_FLOWS.map(
            (f) =>
                `<button type="button" class="studio-jnf-seg-btn${f.id === rec.flow ? ' is-active' : ''}" data-jnf-flow="${f.id}">${escapeHtml(f.label)}</button>`,
        ).join('');
    }

    const stageNav = root.querySelector('[data-jnf-stage-nav]');
    if (stageNav) {
        stageNav.innerHTML = stageIds
            .map((id) => {
                const meta = JNF_STAGES.find((s) => s.id === id);
                const fork = meta?.fork ? ` (${meta.step})` : '';
                return `<button type="button" class="studio-jnf-step-btn${id === rec.stage ? ' is-active' : ''}" data-jnf-stage="${id}">${escapeHtml(meta?.shortLabel || id)}${fork ? `<span class="studio-jnf-step-fork">${escapeHtml(fork)}</span>` : ''}</button>`;
            })
            .join('');
    }

    root.querySelectorAll('[data-jnf-locale]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.getAttribute('data-jnf-locale') === rec.locale);
    });
    root.querySelectorAll('[data-jnf-preview-mode]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.getAttribute('data-jnf-preview-mode') === rec.previewMode);
    });
    root.querySelectorAll('[data-jnf-preview-plan]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.getAttribute('data-jnf-preview-plan') === rec.previewPlan);
    });

    const planSeg = root.closest('.studio-jnf-shell')?.querySelector('.studio-jnf-preview-plan-seg');
    if (planSeg instanceof HTMLElement) {
        planSeg.hidden = rec.stage !== 'value' && rec.stage !== 'payment';
    }
}

/**
 * @param {HTMLElement} root
 * @param {EditorRecord} rec
 */
function wireChromeEvents(root, rec) {
    root.addEventListener('click', (ev) => {
        const t = ev.target;
        if (!(t instanceof Element)) return;

        const flowBtn = t.closest('[data-jnf-flow]');
        if (flowBtn) {
            const next = /** @type {JnfFlowId} */ (flowBtn.getAttribute('data-jnf-flow') || 'membership');
            if (next === rec.flow) return;
            if (rec.dirtyGuardEnabled && !window.confirm('Switch flow? Unsaved edits apply to the whole page when you Save.')) {
                return;
            }
            rec.flow = next;
            const stages = stagesForFlow(rec.flow, rec.state);
            rec.stage = stages[0] || 'band';
            rec.previewMode = rec.stage === 'band' ? 'band' : 'modal';
            renderChrome(root, rec);
            renderStageBody(root.querySelector('[data-jnf-editor-col]'), rec, root);
            syncPreview(root, rec);
            return;
        }

        const stageBtn = t.closest('[data-jnf-stage]');
        if (stageBtn) {
            rec.stage = /** @type {JnfStageId} */ (stageBtn.getAttribute('data-jnf-stage') || 'band');
            rec.previewMode = rec.stage === 'band' ? 'band' : 'modal';
            renderChrome(root, rec);
            renderStageBody(root.querySelector('[data-jnf-editor-col]'), rec, root);
            syncPreview(root, rec);
            return;
        }

        const localeBtn = t.closest('[data-jnf-locale]');
        if (localeBtn) {
            rec.locale = /** @type {'en' | 'ja'} */ (localeBtn.getAttribute('data-jnf-locale') || 'en');
            renderChrome(root, rec);
            renderStageBody(root.querySelector('[data-jnf-editor-col]'), rec, root);
            void loadGlobalBullets(root, rec);
            return;
        }

        const modeBtn = t.closest('[data-jnf-preview-mode]');
        if (modeBtn) {
            rec.previewMode = /** @type {'band' | 'modal'} */ (modeBtn.getAttribute('data-jnf-preview-mode') || 'modal');
            renderChrome(root, rec);
            syncPreview(root, rec);
            return;
        }

        const planBtn = t.closest('[data-jnf-preview-plan]');
        if (planBtn) {
            rec.previewPlan = /** @type {'bimonthly' | 'annual'} */ (planBtn.getAttribute('data-jnf-preview-plan') || 'bimonthly');
            renderChrome(root, rec);
            syncPreview(root, rec);
        }
    });
}

/**
 * @param {HTMLElement} container
 * @param {unknown} bundle
 * @param {{ markDirty: () => void }} hooks
 */
export async function fillJoinNetworkFlowEditor(container, bundle, hooks) {
    container.innerHTML = '';
    container.className = 'studio-content-fields studio-content-fields--join-network-flow';

    const state =
        bundle && typeof bundle === 'object' ? /** @type {Record<string, unknown>} */ (deepClone(bundle)) : {};

    /** @type {EditorRecord} */
    const rec = {
        state,
        hooks,
        flow: 'membership',
        stage: 'band',
        locale: 'en',
        previewMode: 'band',
        previewPlan: 'bimonthly',
        globalBullets: [],
        previewTimer: null,
        dirtyGuardEnabled: false,
    };
    editorStore.set(container, rec);

    container.innerHTML = `
        <div class="studio-jnf-shell" data-jnf-root>
            <div class="studio-jnf-toolbar">
                <div class="studio-jnf-flow-row">
                    <div class="studio-jnf-seg" data-jnf-flow-nav role="tablist"></div>
                    <p class="studio-muted studio-jnf-flow-hint" data-jnf-flow-hint></p>
                </div>
                <div class="studio-jnf-toolbar-row">
                    <div class="studio-jnf-seg studio-jnf-locale-seg" role="tablist">
                        <button type="button" class="studio-jnf-seg-btn is-active" data-jnf-locale="en">English</button>
                        <button type="button" class="studio-jnf-seg-btn" data-jnf-locale="ja">日本語</button>
                    </div>
                </div>
                <div class="studio-jnf-stepper" data-jnf-stage-nav role="tablist"></div>
            </div>
            <div class="studio-jnf-split">
                <div class="studio-jnf-editor-col" data-jnf-editor-col></div>
                <aside class="studio-jnf-preview-pane">
                    <div class="studio-jnf-preview-toolbar">
                        <span class="studio-jnf-preview-label">Live preview</span>
                        <div class="studio-jnf-seg studio-jnf-seg--compact">
                            <button type="button" class="studio-jnf-seg-btn" data-jnf-preview-mode="band">Band</button>
                            <button type="button" class="studio-jnf-seg-btn is-active" data-jnf-preview-mode="modal">Modal</button>
                        </div>
                        <div class="studio-jnf-seg studio-jnf-seg--compact studio-jnf-preview-plan-seg">
                            <button type="button" class="studio-jnf-seg-btn is-active" data-jnf-preview-plan="bimonthly">Bi-monthly</button>
                            <button type="button" class="studio-jnf-seg-btn" data-jnf-preview-plan="annual">Annual</button>
                        </div>
                    </div>
                    <div class="studio-jnf-preview-frame">
                        <app-join-network data-studio-preview="true" data-modal-type="membership" context="home" active="true"></app-join-network>
                    </div>
                </aside>
            </div>
            <details class="studio-jnf-advanced">
                <summary>Advanced: all fields by path</summary>
                <div class="studio-jnf-advanced-body" data-jnf-advanced-fields></div>
            </details>
        </div>
    `;

    const root = container.querySelector('[data-jnf-root]');
    const advancedBody = container.querySelector('[data-jnf-advanced-fields]');
    if (!(root instanceof HTMLElement)) return;

    wireChromeEvents(root, rec);
    renderChrome(root, rec);
    renderStageBody(root.querySelector('[data-jnf-editor-col]'), rec, root);

    if (advancedBody instanceof HTMLElement) {
        const { fillStudioContentPlainFields } = await import('./contentSection.js');
        fillStudioContentPlainFields(advancedBody, state, 'join-network-flow', {
            markDirty: () => {
                rec.dirtyGuardEnabled = true;
                hooks.markDirty();
            },
        });
        advancedBody.addEventListener('input', () => {
            const map = collectAdvancedPatches(advancedBody);
            const patched = applyStringPatches(rec.state, map);
            if (patched && typeof patched === 'object') {
                rec.state = /** @type {Record<string, unknown>} */ (patched);
                schedulePreview(root, rec);
            }
        });
    }

    await loadGlobalBullets(root, rec);
    queueMicrotask(() => syncPreview(root, rec));
    setTimeout(() => {
        rec.dirtyGuardEnabled = true;
    }, 0);
}

/**
 * @param {HTMLElement} advancedBody
 * @returns {Record<string, string>}
 */
function collectAdvancedPatches(advancedBody) {
    /** @type {Record<string, string>} */
    const map = {};
    advancedBody.querySelectorAll('.studio-content-str-value[data-path]').forEach((el) => {
        const p = el.getAttribute('data-path');
        if (p && (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) {
            map[p] = el.value;
        }
    });
    return map;
}

/**
 * @param {HTMLElement} container
 * @param {unknown} bundle
 */
export function mergeJoinNetworkFlowFromContainer(container, bundle) {
    const draft = collectJoinNetworkFlowDraft(container);
    const advancedBody = container.querySelector('[data-jnf-advanced-fields]');
    let merged = mergeJoinNetworkFlowBundle(
        bundle && typeof bundle === 'object' ? /** @type {Record<string, unknown>} */ (bundle) : {},
        draft && typeof draft === 'object' ? /** @type {Record<string, unknown>} */ (draft) : {},
    );
    if (advancedBody instanceof HTMLElement) {
        merged = applyStringPatches(merged, collectAdvancedPatches(advancedBody));
    }
    return merged;
}
