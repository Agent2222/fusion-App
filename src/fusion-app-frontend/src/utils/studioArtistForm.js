/**
 * Studio Artists modal: tabbed EN/JA form + roster fields (replaces raw JSON editing).
 */

import { deepGet, deepSet } from './studioProgramLocaleForm.js';
import {
    introSlotsFromWorld,
    introSlotsToGallery,
    textareaToWorldArray,
    worldFieldToTextarea,
} from './memberProfileForm.js';
import { normalizeLocalesWorldForStorage } from './worldNormalize.js';

/** Used by Studio “Translate to New World” to map `world.*` → `worldNew.*` via LLM. */
export const STUDIO_WORLD_TO_NEW_PATHS = [
    { path: 'world.practice', kind: 'line' },
    { path: 'world.quote', kind: 'line' },
    { path: 'world.perspective', kind: 'paras' },
    { path: 'world.vision', kind: 'paras' },
    { path: 'world.constructing', kind: 'paras' },
    { path: 'world.context', kind: 'paras' },
];

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {string} s
 */
function esc(escapeHtml, s) {
    return escapeHtml(String(s ?? ''));
}

/**
 * @param {unknown} v
 * @returns {unknown[]}
 */
function asLinkArray(v) {
    return Array.isArray(v) ? v : [];
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {string} label
 * @param {string} path
 * @param {unknown} enRoot
 * @param {unknown} jaRoot
 * @param {'text' | 'textarea' | 'number'} [kind]
 */
function rowArt2(escapeHtml, label, path, enRoot, jaRoot, kind = 'text') {
    const enV = deepGet(enRoot, path);
    const jaV = deepGet(jaRoot, path);
    if (kind === 'textarea') {
        return `<div class="studio-prog-grid-row studio-prog-grid-row--textarea">
      <span class="studio-prog-grid-label">${esc(escapeHtml, label)}</span>
      <textarea class="studio-textarea studio-prog-grid-input" rows="3" data-art-locale="en" data-art-path="${esc(escapeHtml, path)}" spellcheck="true">${esc(escapeHtml, enV ?? '')}</textarea>
      <textarea class="studio-textarea studio-prog-grid-input" rows="3" data-art-locale="ja" data-art-path="${esc(escapeHtml, path)}" spellcheck="true">${esc(escapeHtml, jaV ?? '')}</textarea>
    </div>`;
    }
    const type = kind === 'number' ? 'number' : 'text';
    return `<div class="studio-prog-grid-row">
      <span class="studio-prog-grid-label">${esc(escapeHtml, label)}</span>
      <input type="${type}" class="studio-input studio-prog-grid-input" value="${esc(escapeHtml, enV ?? '')}" data-art-locale="en" data-art-path="${esc(escapeHtml, path)}" />
      <input type="${type}" class="studio-input studio-prog-grid-input" value="${esc(escapeHtml, jaV ?? '')}" data-art-locale="ja" data-art-path="${esc(escapeHtml, path)}" />
    </div>`;
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {string} label
 * @param {string} path
 * @param {unknown} enRoot
 * @param {unknown} jaRoot
 */
function rowWorldParas2(escapeHtml, label, path, enRoot, jaRoot) {
    const enV = deepGet(enRoot, path);
    const jaV = deepGet(jaRoot, path);
    return `<div class="studio-prog-grid-row studio-prog-grid-row--textarea">
      <span class="studio-prog-grid-label">${esc(escapeHtml, label)}</span>
      <textarea class="studio-textarea studio-prog-grid-input" rows="5" data-art-locale="en" data-art-path="${esc(escapeHtml, path)}" data-art-kind="world-paras" spellcheck="true">${esc(escapeHtml, worldFieldToTextarea(enV))}</textarea>
      <textarea class="studio-textarea studio-prog-grid-input" rows="5" data-art-locale="ja" data-art-path="${esc(escapeHtml, path)}" data-art-kind="world-paras" spellcheck="true">${esc(escapeHtml, worldFieldToTextarea(jaV))}</textarea>
    </div>`;
}

const LINK_ROW_COUNT = 8;

/**
 * @param {(s: string) => string} escapeHtml
 * @param {'en' | 'ja'} locale
 * @param {unknown[]} links
 */
function renderLinkRows(escapeHtml, locale, links) {
    const arr = asLinkArray(links);
    let html = `<div class="studio-art-links" data-art-links-locale="${locale}">`;
    for (let i = 0; i < LINK_ROW_COUNT; i++) {
        const L = arr[i] && typeof arr[i] === 'object' && !Array.isArray(arr[i]) ? arr[i] : {};
        const type = String(L.type ?? '');
        const url = String(L.url ?? '');
        const lab = String(L.label ?? '');
        html += `<div class="studio-art-link-row studio-modal-fields-row">
          <label class="studio-field studio-field--grow"><span>type</span>
            <input type="text" class="studio-input" data-art-link-field="type" value="${esc(escapeHtml, type)}" placeholder="website" /></label>
          <label class="studio-field studio-field--grow"><span>url</span>
            <input type="text" class="studio-input" data-art-link-field="url" value="${esc(escapeHtml, url)}" /></label>
          <label class="studio-field studio-field--grow"><span>label</span>
            <input type="text" class="studio-input" data-art-link-field="label" value="${esc(escapeHtml, lab)}" /></label>
        </div>`;
    }
    html += '</div>';
    return html;
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {'en' | 'ja'} loc
 * @param {unknown} world
 * @param {number} slotIndex
 */
function renderIntroSlot(escapeHtml, loc, world, slotIndex) {
    const slots = introSlotsFromWorld(world);
    const s = slots[slotIndex] || { src: '', alt: '', caption: '' };
    const p = `world.introGallery.${slotIndex}`;
    return `<div class="studio-art-intro-slot">
      <p class="studio-prog-subhead">Slot ${slotIndex + 1} (${loc.toUpperCase()})</p>
      <div class="studio-modal-fields-row">
        <label class="studio-field studio-field--grow"><span>src (URL)</span>
          <input type="text" class="studio-input studio-art-intro-src" data-art-locale="${loc}" data-art-path="${p}.src" value="${esc(escapeHtml, s.src)}" /></label>
        <label class="studio-file-label studio-btn-ghost studio-field--shrink">
          <input type="file" accept="image/*" class="studio-file-input studio-art-intro-file" data-art-upload-locale="${loc}" data-art-upload-slot="${slotIndex}" />
          Upload
        </label>
      </div>
      <div class="studio-modal-fields-row">
        <label class="studio-field studio-field--grow"><span>alt</span>
          <input type="text" class="studio-input" data-art-locale="${loc}" data-art-path="${p}.alt" value="${esc(escapeHtml, s.alt)}" /></label>
        <label class="studio-field studio-field--grow"><span>caption</span>
          <input type="text" class="studio-input" data-art-locale="${loc}" data-art-path="${p}.caption" value="${esc(escapeHtml, s.caption)}" /></label>
      </div>
    </div>`;
}

/**
 * @param {object} artist
 * @param {{ isTest?: boolean }} [opts]
 */
export function renderArtistManageModalHtml(escapeHtml, artist, opts = {}) {
    const isTest = Boolean(opts.isTest);
    const a = artist && typeof artist === 'object' ? artist : {};
    const localesRaw = a.locales && typeof a.locales === 'object' ? a.locales : {};
    const en = asObj(localesRaw.en);
    const ja = asObj(localesRaw.ja);
    const filter = a.filter && typeof a.filter === 'object' ? a.filter : {};
    const gf = a.galleryFilter && typeof a.galleryFilter === 'object' ? a.galleryFilter : {};

    const enLinks = asLinkArray(en.links);
    const jaLinks = asLinkArray(ja.links);

    const enW = en.world && typeof en.world === 'object' && !Array.isArray(en.world) ? en.world : {};
    const jaW = ja.world && typeof ja.world === 'object' && !Array.isArray(ja.world) ? ja.world : {};

    const advJson = esc(escapeHtml, JSON.stringify(a, null, 2));

    return `
<form id="studio-art-manage-form" class="studio-modal-form studio-modal-form--artist">
  <p class="studio-muted">Edit roster and locale copy. Unknown locale keys are preserved on save. Slug changes can break URLs — slug is read-only here.</p>
  <div class="studio-tabs" data-studio-tabs="artist-manage">
    <div class="studio-tabs__list" role="tablist" aria-label="Artist sections">
      <button type="button" class="studio-tabs__tab is-active" role="tab" aria-selected="true" aria-controls="studio-art-panel-roster" id="studio-art-tab-roster">Roster</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-identity" id="studio-art-tab-identity">Identity</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-world" id="studio-art-tab-world">World</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-new-world" id="studio-art-tab-new-world">New World</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-media" id="studio-art-tab-media">Media</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-links" id="studio-art-tab-links">Links &amp; SEO</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-advanced" id="studio-art-tab-advanced">Advanced</button>
    </div>
    <div class="studio-tabs__panels">
      <div id="studio-art-panel-roster" class="studio-tabs__panel is-active" role="tabpanel" aria-labelledby="studio-art-tab-roster">
        <div class="studio-modal-fields-row">
          <label class="studio-field"><span>ID</span><input name="art-id" class="studio-input" readonly value="${esc(escapeHtml, String(a.id ?? ''))}" /></label>
          <label class="studio-field"><span>Slug</span><input name="art-slug" class="studio-input" readonly value="${esc(escapeHtml, String(a.slug ?? ''))}" /></label>
        </div>
        <div class="studio-modal-fields-row">
          <label class="studio-field studio-field--grow"><span>Hero image URL</span><input name="art-image" class="studio-input" id="studio-art-hero-image" value="${esc(escapeHtml, String(a.image ?? ''))}" /></label>
          <label class="studio-file-label studio-btn-ghost studio-field--shrink">
            <input type="file" accept="image/*" id="studio-art-hero-file" class="studio-file-input" />
            Upload → URL
          </label>
        </div>
        <div class="studio-modal-fields-row">
          <label class="studio-field"><span>visibility</span><input name="art-visibility" class="studio-input" value="${esc(escapeHtml, String(a.visibility ?? ''))}" /></label>
          <label class="studio-field studio-field--checkbox">
            <input type="checkbox" name="art-featured" ${a.featured === true ? 'checked' : ''} />
            <span>Featured (home strip, max 8)</span>
          </label>
          <label class="studio-field studio-field--checkbox">
            <input type="checkbox" name="art-featurable" ${a.featurable === true ? 'checked' : ''} />
            <span>Featurable (random featured pool)</span>
          </label>
          <label class="studio-field"><span>imported</span><input name="art-imported" class="studio-input" readonly value="${esc(escapeHtml, a.imported ? 'yes' : 'no')}" /></label>
          <label class="studio-field"><span>accessCode</span><input name="art-accessCode" class="studio-input" readonly value="${esc(escapeHtml, String(a.accessCode ?? ''))}" /></label>
        </div>
        <h4 class="studio-prog-subhead">Feed filter defaults</h4>
        <div class="studio-modal-fields-row">
          <label class="studio-field"><span>connection</span><input name="art-filter-connection" class="studio-input" value="${esc(escapeHtml, String(filter.connection ?? ''))}" /></label>
          <label class="studio-field"><span>cohortYear</span><input name="art-filter-cohortYear" type="number" class="studio-input" value="${esc(escapeHtml, String(filter.cohortYear ?? ''))}" /></label>
        </div>
        <div class="studio-modal-fields-row">
          <label class="studio-field"><span>disciplineKey</span><input name="art-filter-disciplineKey" class="studio-input" value="${esc(escapeHtml, String(filter.disciplineKey ?? ''))}" /></label>
          <label class="studio-field"><span>locationKey</span><input name="art-filter-locationKey" class="studio-input" value="${esc(escapeHtml, String(filter.locationKey ?? ''))}" /></label>
        </div>
        <h4 class="studio-prog-subhead">Gallery filter defaults</h4>
        <div class="studio-modal-fields-row">
          <label class="studio-field"><span>accessType</span><input name="art-gf-accessType" class="studio-input" value="${esc(escapeHtml, String(gf.accessType ?? ''))}" /></label>
          <label class="studio-field"><span>season</span><input name="art-gf-season" type="number" class="studio-input" value="${esc(escapeHtml, String(gf.season ?? ''))}" /></label>
          <label class="studio-field"><span>view</span><input name="art-gf-view" class="studio-input" value="${esc(escapeHtml, String(gf.view ?? ''))}" /></label>
        </div>
      </div>

      <div id="studio-art-panel-identity" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-art-tab-identity" hidden>
        <div class="studio-prog-locale-form">
          <div class="studio-prog-col-headers" aria-hidden="true">
            <span class="studio-prog-grid-label"></span>
            <span class="studio-prog-col-title">English</span>
            <span class="studio-prog-col-title">日本語</span>
          </div>
          ${rowArt2(escapeHtml, 'name', 'name', en, ja)}
          ${rowArt2(escapeHtml, 'discipline', 'discipline', en, ja)}
          ${rowArt2(escapeHtml, 'status', 'status', en, ja)}
          ${rowArt2(escapeHtml, 'location.city', 'location.city', en, ja)}
          ${rowArt2(escapeHtml, 'location.state', 'location.state', en, ja)}
          ${rowArt2(escapeHtml, 'location.country', 'location.country', en, ja)}
          ${rowArt2(escapeHtml, 'location.display', 'location.display', en, ja)}
          ${rowArt2(escapeHtml, 'bio', 'bio', en, ja, 'textarea')}
          ${rowArt2(escapeHtml, 'bioLong', 'bioLong', en, ja, 'textarea')}
        </div>
      </div>

      <div id="studio-art-panel-world" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-art-tab-world" hidden>
        <div class="studio-prog-locale-form">
          <div class="studio-prog-col-headers" aria-hidden="true">
            <span class="studio-prog-grid-label"></span>
            <span class="studio-prog-col-title">English</span>
            <span class="studio-prog-col-title">日本語</span>
          </div>
          ${rowArt2(escapeHtml, 'world.practice', 'world.practice', en, ja, 'textarea')}
          ${rowArt2(escapeHtml, 'world.quote', 'world.quote', en, ja, 'textarea')}
          ${rowWorldParas2(escapeHtml, 'Perspective', 'world.perspective', en, ja)}
          ${rowWorldParas2(escapeHtml, 'Vision', 'world.vision', en, ja)}
          ${rowWorldParas2(escapeHtml, 'Constructing', 'world.constructing', en, ja)}
          ${rowWorldParas2(escapeHtml, 'Context', 'world.context', en, ja)}
        </div>
        <h4 class="studio-prog-subhead">Reinterpret to New World</h4>
        <p class="studio-modal-hint">Enter a style prompt, then run <strong>Translate to New World</strong> to fill the <strong>New World</strong> tab using the IC LLM (English and Japanese).</p>
        <label class="studio-field studio-field--stack" style="margin-bottom:0.75rem">
          <span>Prompt</span>
          <textarea id="studio-art-new-world-prompt" class="studio-textarea" rows="3" spellcheck="true" placeholder="e.g. Shorter, more poetic; emphasize craft and place."></textarea>
        </label>
        <button type="button" class="studio-btn-primary" id="studio-art-translate-to-new-world">Translate to New World</button>
      </div>

      <div id="studio-art-panel-new-world" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-art-tab-new-world" hidden>
        <p class="studio-modal-hint">LLM‑refined copy (optional). Not rendered on the public profile until the site uses <code>worldNew</code>.</p>
        <div class="studio-prog-locale-form">
          <div class="studio-prog-col-headers" aria-hidden="true">
            <span class="studio-prog-grid-label"></span>
            <span class="studio-prog-col-title">English</span>
            <span class="studio-prog-col-title">日本語</span>
          </div>
          ${rowArt2(escapeHtml, 'worldNew.practice', 'worldNew.practice', en, ja, 'textarea')}
          ${rowArt2(escapeHtml, 'worldNew.quote', 'worldNew.quote', en, ja, 'textarea')}
          ${rowWorldParas2(escapeHtml, 'Perspective', 'worldNew.perspective', en, ja)}
          ${rowWorldParas2(escapeHtml, 'Vision', 'worldNew.vision', en, ja)}
          ${rowWorldParas2(escapeHtml, 'Constructing', 'worldNew.constructing', en, ja)}
          ${rowWorldParas2(escapeHtml, 'Context', 'worldNew.context', en, ja)}
        </div>
      </div>

      <div id="studio-art-panel-media" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-art-tab-media" hidden>
        <p class="studio-modal-hint">Intro gallery (three slots per locale). Use Upload with Studio → Services → S3 configured.</p>
        <h4 class="studio-prog-subhead">English</h4>
        ${renderIntroSlot(escapeHtml, 'en', enW, 0)}
        ${renderIntroSlot(escapeHtml, 'en', enW, 1)}
        ${renderIntroSlot(escapeHtml, 'en', enW, 2)}
        <h4 class="studio-prog-subhead">日本語</h4>
        ${renderIntroSlot(escapeHtml, 'ja', jaW, 0)}
        ${renderIntroSlot(escapeHtml, 'ja', jaW, 1)}
        ${renderIntroSlot(escapeHtml, 'ja', jaW, 2)}
      </div>

      <div id="studio-art-panel-links" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-art-tab-links" hidden>
        <h4 class="studio-prog-subhead">SEO</h4>
        <div class="studio-prog-locale-form">
          <div class="studio-prog-col-headers" aria-hidden="true">
            <span class="studio-prog-grid-label"></span>
            <span class="studio-prog-col-title">English</span>
            <span class="studio-prog-col-title">日本語</span>
          </div>
          ${rowArt2(escapeHtml, 'seo.title', 'seo.title', en, ja)}
          ${rowArt2(escapeHtml, 'seo.description', 'seo.description', en, ja, 'textarea')}
        </div>
        <h4 class="studio-prog-subhead">Links — English</h4>
        ${renderLinkRows(escapeHtml, 'en', enLinks)}
        <h4 class="studio-prog-subhead">Links — 日本語</h4>
        ${renderLinkRows(escapeHtml, 'ja', jaLinks)}
      </div>

      <div id="studio-art-panel-advanced" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-art-tab-advanced" hidden>
        <details class="studio-prog-details" ${isTest ? 'open' : ''}>
          <summary class="studio-prog-subhead">Full artist JSON ${isTest ? '(test overlay)' : '(read-only preview)'}</summary>
          <p class="studio-modal-hint">${
              isTest
                  ? 'Danger: invalid JSON can break the profile. Use <strong>Save overlay (test)</strong> to write to localStorage only, or use the main form <strong>Save artist</strong>.'
                  : 'Live data: use the structured form above. JSON is a preview; editing here is disabled.'
          }</p>
          <textarea id="studio-art-adv-json" class="studio-textarea studio-textarea-mono" rows="16" spellcheck="false" ${isTest ? '' : 'readonly'}>${advJson}</textarea>
          <button type="button" class="studio-btn-primary" id="studio-art-adv-save" ${isTest ? '' : 'disabled'} style="margin-top:0.5rem">Save overlay (test)</button>
        </details>
      </div>
    </div>
  </div>
  <div class="studio-modal-actions studio-modal-actions--artist">
    <button type="button" class="studio-btn-danger" id="studio-art-delete">Delete artist</button>
    <button type="submit" class="studio-btn-primary" id="studio-art-form-save">Save artist</button>
  </div>
</form>`;
}

/**
 * @param {HTMLElement} root
 * @param {'en' | 'ja'} locale
 */
function collectLinksFromForm(root, locale) {
    const container = root.querySelector(`.studio-art-links[data-art-links-locale="${locale}"]`);
    if (!container) return [];
    /** @type {object[]} */
    const out = [];
    container.querySelectorAll('.studio-art-link-row').forEach((row) => {
        const typeEl = row.querySelector('[data-art-link-field="type"]');
        const urlEl = row.querySelector('[data-art-link-field="url"]');
        const labelEl = row.querySelector('[data-art-link-field="label"]');
        const url = urlEl && 'value' in urlEl ? String(urlEl.value ?? '').trim() : '';
        if (!url) return;
        const type = typeEl && 'value' in typeEl ? String(typeEl.value ?? '').trim() : 'other';
        const label = labelEl && 'value' in labelEl ? String(labelEl.value ?? '').trim() : url;
        out.push({ type: type || 'other', url, label: label || url });
    });
    return out;
}

/**
 * @param {HTMLElement} root
 * @param {object} baseArtist
 * @returns {Record<string, unknown>}
 */
export function collectArtistRecordFromForm(root, baseArtist) {
    const base = baseArtist && typeof baseArtist === 'object' ? baseArtist : {};
    const form = root.querySelector('#studio-art-manage-form');
    if (!(form instanceof HTMLFormElement)) {
        throw new Error('Artist form missing');
    }
    const fd = new FormData(form);

    /** @type {Record<string, unknown>} */
    const locales = JSON.parse(
        JSON.stringify(base.locales && typeof base.locales === 'object' ? base.locales : { en: {}, ja: {} })
    );
    if (!locales.en || typeof locales.en !== 'object') locales.en = {};
    if (!locales.ja || typeof locales.ja !== 'object') locales.ja = {};

    /** @type {Record<string, unknown>} */
    const en = /** @type {Record<string, unknown>} */ (locales.en);
    /** @type {Record<string, unknown>} */
    const ja = /** @type {Record<string, unknown>} */ (locales.ja);

    const applyLocaleFields = (target, locale) => {
        root.querySelectorAll(`[data-art-locale="${locale}"][data-art-path]`).forEach((el) => {
            if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
            const path = el.getAttribute('data-art-path');
            const kind = el.getAttribute('data-art-kind') || '';
            if (!path) return;
            const raw = el.value;
            if (kind === 'world-paras') {
                deepSet(target, path, textareaToWorldArray(raw));
            } else {
                deepSet(target, path, raw);
            }
        });
    };

    applyLocaleFields(en, 'en');
    applyLocaleFields(ja, 'ja');

    en.links = collectLinksFromForm(root, 'en');
    ja.links = collectLinksFromForm(root, 'ja');

    /** Normalize intro gallery from slots (merge into world) */
    for (const loc of ['en', 'ja']) {
        const block = loc === 'en' ? en : ja;
        const w = block.world && typeof block.world === 'object' && !Array.isArray(block.world) ? block.world : {};
        const slots = introSlotsFromWorld(w);
        const gallery = introSlotsToGallery(slots);
        block.world = { ...asObj(w), introGallery: gallery };
    }

    locales.en = en;
    locales.ja = ja;

    const normalized = normalizeLocalesWorldForStorage(/** @type {Record<string, unknown>} */ (locales));

    const id = String(fd.get('art-id') || base.id || '').trim();
    const slug = String(fd.get('art-slug') || base.slug || '').trim();
    const image = String(fd.get('art-image') ?? '');
    const visibility = String(fd.get('art-visibility') ?? 'public');
    const featuredCb = form.querySelector('input[name="art-featured"]');
    const featurableCb = form.querySelector('input[name="art-featurable"]');
    const _featuredFlags = {
        featured: featuredCb instanceof HTMLInputElement && featuredCb.checked,
        featurable: featurableCb instanceof HTMLInputElement && featurableCb.checked,
    };
    const featuredOrder = 0;
    const updatedAt = new Date().toISOString();

    const filter = {
        connection: String(fd.get('art-filter-connection') ?? ''),
        cohortYear: Math.max(0, Math.floor(Number(fd.get('art-filter-cohortYear') || 0))),
        disciplineKey: String(fd.get('art-filter-disciplineKey') ?? ''),
        locationKey: String(fd.get('art-filter-locationKey') ?? ''),
    };

    const galleryFilter = {
        accessType: String(fd.get('art-gf-accessType') ?? ''),
        season: Math.max(0, Math.floor(Number(fd.get('art-gf-season') || 0))),
        view: String(fd.get('art-gf-view') ?? ''),
    };

    return {
        id,
        slug,
        image,
        featuredOrder,
        visibility,
        updatedAt,
        filter,
        galleryFilter,
        locales: normalized,
        imported: Boolean(base.imported),
        accessCode: String(base.accessCode ?? ''),
        _featuredFlags,
    };
}

/**
 * @param {HTMLElement} root — modal root (contains `.studio-tabs[data-studio-tabs="artist-manage"]`)
 */
export function initArtistManageTabs(root) {
    const tabRoot = root.querySelector('[data-studio-tabs="artist-manage"]');
    if (!tabRoot) return;
    const tabs = tabRoot.querySelectorAll('.studio-tabs__tab[role="tab"]');
    const panels = tabRoot.querySelectorAll('.studio-tabs__panel[role="tabpanel"]');
    const activate = (tabEl) => {
        const panelId = tabEl.getAttribute('aria-controls');
        if (!panelId) return;
        tabs.forEach((t) => {
            const on = t === tabEl;
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            t.classList.toggle('is-active', on);
        });
        panels.forEach((p) => {
            const on = p.id === panelId;
            p.hidden = !on;
            p.classList.toggle('is-active', on);
        });
    };
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => activate(tab));
    });
}
