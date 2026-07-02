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
import { normalizeArtistRosterVisibility } from './database.js';
import {
    getPublicWorldSourceFromLocales,
    localesHaveUsableWorldNew,
} from './worldPublicPick.js';

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
 * Pill toggle for staff: which world block visitors see on `/profile/:slug`.
 * @param {ParentNode} root
 * @param {Record<string, unknown> | null | undefined} locales
 * @param {'world' | 'newWorld'} [requested]
 */
export function syncStudioPublicWorldSource(root, locales, requested) {
    const loc = locales && typeof locales === 'object' ? locales : {};
    const newWorldAvailable = localesHaveUsableWorldNew(loc);
    let source =
        requested === 'world' || requested === 'newWorld'
            ? requested
            : getPublicWorldSourceFromLocales(loc);
    if (source === 'newWorld' && !newWorldAvailable) source = 'world';

    const hidden = root.querySelector('#studio-art-public-world-source');
    if (hidden instanceof HTMLInputElement) hidden.value = source;

    const note = root.querySelector('#studio-art-public-world-source-note');
    if (note) {
        note.textContent =
            source === 'newWorld'
                ? 'New World will display on the public profile.'
                : 'Story & World will display on the public profile.';
    }

    root.querySelectorAll('[data-studio-world-source]').forEach((btn) => {
        if (!(btn instanceof HTMLButtonElement)) return;
        const buttonSource = btn.getAttribute('data-studio-world-source');
        const isNewWorld = buttonSource === 'newWorld';
        const active = buttonSource === source;
        btn.classList.toggle('is-active', active);
        btn.classList.toggle('is-disabled', isNewWorld && !newWorldAvailable);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.disabled = Boolean(isNewWorld && !newWorldAvailable);
        if (isNewWorld && !newWorldAvailable) {
            btn.setAttribute('aria-disabled', 'true');
            btn.title = 'New World unlocks after generated copy is available.';
        } else {
            btn.removeAttribute('aria-disabled');
            btn.removeAttribute('title');
        }
    });
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
 * @param {unknown} filter
 * @returns {string}
 */
function formatCohortYearsForForm(filter) {
    const f = filter && typeof filter === 'object' ? /** @type {Record<string, unknown>} */ (filter) : {};
    const arr = f.cohortYears ?? f.cohort_years;
    if (Array.isArray(arr) && arr.length) {
        return arr.map((x) => String(x)).join(', ');
    }
    const cy = f.cohortYear ?? f.cohort_year;
    if (cy != null && String(cy).trim() !== '') return String(cy);
    return '';
}

/**
 * @param {string} s
 * @returns {number[]}
 */
function parseCohortYearsFromFormField(s) {
    const raw = String(s ?? '').trim();
    if (!raw) return [];
    return raw
        .split(/[\s,]+/)
        .map((x) => Math.floor(Number(x)))
        .filter((n) => Number.isFinite(n) && n > 1900 && n < 2100);
}

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
      <div class="studio-modal-fields-row studio-modal-fields-row--asset">
        <figure class="studio-asset-thumb">
          <img data-preview-input="#studio-art-intro-src-${loc}-${slotIndex}" alt="Intro slot preview" loading="lazy" />
        </figure>
        <label class="studio-field studio-field--grow"><span>src (URL)</span>
          <input type="text" id="studio-art-intro-src-${loc}-${slotIndex}" class="studio-input studio-art-intro-src" data-art-locale="${loc}" data-art-path="${p}.src" value="${esc(escapeHtml, s.src)}" /></label>
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
    const genCodeBtn = isTest
        ? ''
        : `<button type="button" class="studio-btn-secondary" id="studio-art-gen-access-code">Generate new code</button>`;
    const a = artist && typeof artist === 'object' ? artist : {};
    const localesRaw = a.locales && typeof a.locales === 'object' ? a.locales : {};
    /** Studio-controlled audio bites are opt-in per artist. */
    const audioDisplayForArtist = localesRaw.audioDisplayForArtist === true;
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
<form id="studio-art-manage-form" class="studio-modal-form studio-modal-form--artist studio-artist-editor-form">
  <p class="studio-muted studio-artist-editor-intro">Edit roster and locale copy. Unknown locale keys are preserved on save. Slug is read-only.</p>
  <div class="studio-tabs" data-studio-tabs="artist-manage">
    <div class="studio-tabs__list" role="tablist" aria-label="Artist sections">
      <button type="button" class="studio-tabs__tab is-active" role="tab" aria-selected="true" aria-controls="studio-art-panel-roster" id="studio-art-tab-roster">Roster</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-identity" id="studio-art-tab-identity">Identity</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-world" id="studio-art-tab-world">World</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-new-world" id="studio-art-tab-new-world">New World</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-media" id="studio-art-tab-media">Media</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-links" id="studio-art-tab-links">Links &amp; SEO</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-programs" id="studio-art-tab-programs">Programs</button>
      <button type="button" class="studio-tabs__tab" role="tab" aria-selected="false" aria-controls="studio-art-panel-advanced" id="studio-art-tab-advanced">Advanced</button>
    </div>
    <div class="studio-tabs__panels">
      <div id="studio-art-panel-roster" class="studio-tabs__panel is-active" role="tabpanel" aria-labelledby="studio-art-tab-roster">
        <div class="studio-artist-panel-head">
          <h3>Roster &amp; Profile</h3>
          <p>Edit the artist&rsquo;s roster details and profile settings.</p>
        </div>
        <div class="studio-modal-fields-row">
          <label class="studio-field"><span>ID</span><input name="art-id" class="studio-input" readonly value="${esc(escapeHtml, String(a.id ?? ''))}" /></label>
          <label class="studio-field"><span>Slug</span><input name="art-slug" class="studio-input" readonly value="${esc(escapeHtml, String(a.slug ?? ''))}" /></label>
        </div>
        <div class="studio-modal-fields-row studio-modal-fields-row--asset">
          <figure class="studio-asset-thumb">
            <img data-preview-input="#studio-art-hero-image" alt="Hero image preview" loading="lazy" />
          </figure>
          <label class="studio-field studio-field--grow"><span>Hero image URL</span><input name="art-image" class="studio-input" id="studio-art-hero-image" value="${esc(escapeHtml, String(a.image ?? ''))}" /></label>
          <label class="studio-file-label studio-btn-ghost studio-field--shrink">
            <input type="file" accept="image/*" id="studio-art-hero-file" class="studio-file-input" />
            Upload → URL
          </label>
        </div>
        <div class="studio-modal-fields-row studio-modal-fields-row--asset">
          <figure class="studio-asset-thumb">
            <img data-preview-input="#studio-art-hero-profile-image" alt="Hero profile preview" loading="lazy" />
          </figure>
          <label class="studio-field studio-field--grow"><span>Hero profile image (card toggle)</span><input name="art-hero-profile-image" class="studio-input" id="studio-art-hero-profile-image" value="${esc(escapeHtml, String(a.heroProfileImage ?? a.hero_profile_image ?? ''))}" /></label>
          <label class="studio-file-label studio-btn-ghost studio-field--shrink">
            <input type="file" accept="image/*" id="studio-art-hero-profile-file" class="studio-file-input" />
            Upload → URL
          </label>
        </div>
        <label class="studio-field studio-field--checkbox studio-field--grow">
          <input type="checkbox" name="art-hero-profile-image-approved" id="studio-art-hero-profile-image-approved" ${a.heroProfileImageApproved ? 'checked' : ''} />
          <span>Profile image approved (show headshot on cards and program pages; otherwise artwork)</span>
        </label>
        <div class="studio-modal-fields-row">
          <label class="studio-field"><span>Visibility</span>
            <select name="art-visibility" class="studio-input" id="studio-art-visibility">
              <option value="inactive" ${
                  String(a.visibility ?? '').toLowerCase() === 'inactive' ? 'selected' : ''
              }>Inactive</option>
              <option value="pending" ${
                  String(a.visibility ?? '').toLowerCase() === 'pending' ? 'selected' : ''
              }>Pending</option>
              <option value="private" ${
                  String(a.visibility ?? '').toLowerCase() === 'private' ? 'selected' : ''
              }>Private</option>
              <option value="public" ${
                  (() => {
                      const v = String(a.visibility ?? '').toLowerCase();
                      return v === 'public' || !['inactive', 'pending', 'private'].includes(v);
                  })()
                      ? 'selected'
                      : ''
              }>Public</option>
            </select>
          </label>
          <label class="studio-field studio-field--checkbox">
            <input type="checkbox" name="art-featured" ${a.featured === true ? 'checked' : ''} />
            <span>Featured (home strip, max 8)</span>
          </label>
          <label class="studio-field studio-field--checkbox">
            <input type="checkbox" name="art-featurable" ${a.featurable === true ? 'checked' : ''} />
            <span>Featurable (random featured pool)</span>
          </label>
          <label class="studio-field"><span>imported</span><input name="art-imported" class="studio-input" readonly value="${esc(escapeHtml, a.imported ? 'yes' : 'no')}" /></label>
          <label class="studio-field studio-field--grow"><span>Contact email (Studio / email blast)</span><input name="art-contact-email" type="email" class="studio-input" placeholder="artist@example.com" autocomplete="off" value="${esc(escapeHtml, String(a.contactEmail ?? ''))}" title="Roster contact — not shown on the public site" /></label>
        </div>
        <div class="studio-modal-fields-row" style="align-items:flex-end;flex-wrap:wrap;gap:0.5rem">
          <label class="studio-field studio-field--grow"><span>accessCode (8 digits)</span><input name="art-accessCode" id="studio-art-access-code" class="studio-input" inputmode="numeric" autocomplete="off" maxlength="8" value="${esc(escapeHtml, String(a.accessCode ?? ''))}" title="Roster claim code — cleared on the canister after a successful artist link. Generate a new code if empty." /></label>
          ${genCodeBtn}
        </div>
        <p class="studio-muted" style="margin:0 0 0.75rem;font-size:0.85rem">If this screen stayed open while the code was redeemed, close and reopen Manage (or reload the roster) before saving so you do not write back an old code.</p>
        <h4 class="studio-prog-subhead">Public profile display</h4>
        <div class="studio-world-source-control">
          <input type="hidden" id="studio-art-public-world-source" name="art-public-world-source" value="newWorld" />
          <div class="studio-world-source-toggle" role="group" aria-label="Public profile world source">
            <button type="button" class="studio-world-source-toggle__btn" data-studio-world-source="world" aria-pressed="false">World</button>
            <button type="button" class="studio-world-source-toggle__btn is-active" data-studio-world-source="newWorld" aria-pressed="true">New World</button>
          </div>
          <p class="studio-world-source-note" id="studio-art-public-world-source-note">New World will display on the public profile.</p>
        </div>
        <h4 class="studio-prog-subhead">Feed filter defaults</h4>
        <div class="studio-modal-fields-row">
          <label class="studio-field"><span>connection</span><input name="art-filter-connection" class="studio-input" value="${esc(escapeHtml, String(filter.connection ?? ''))}" /></label>
          <label class="studio-field studio-field--grow"><span>cohort years</span><input name="art-filter-cohortYears" class="studio-input" placeholder="e.g. 2024, 2025" value="${esc(escapeHtml, formatCohortYearsForForm(filter))}" title="Comma-separated years — artist can match multiple cohort filters" /></label>
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
        <h4 class="studio-prog-subhead">Shared profile fields (not localized)</h4>
        <div class="studio-modal-fields-row">
          <label class="studio-field studio-field--grow"><span>Quote</span><textarea name="art-profile-quote" class="studio-textarea" rows="3" spellcheck="true">${esc(escapeHtml, String(a.quote ?? ''))}</textarea></label>
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
        <h4 class="studio-prog-subhead">Generate &amp; reinterpret</h4>
        <p class="studio-modal-hint"><strong>New World from base</strong> uses the <strong>Identity</strong> tab (bio, discipline, location, quote) to generate Kamauu-style copy into empty <strong>World</strong> and <strong>New World</strong> fields (live IC LLM). <strong>Translate to New World</strong> sends the full <strong>World</strong> tab through the same Kamauu JSON pipeline as <strong>Generate New World from bio (batch)</strong> — optional style prompt below.</p>
        <label class="studio-field studio-field--stack" style="margin-bottom:0.75rem">
          <span>Style prompt (Translate to New World — optional)</span>
          <textarea id="studio-art-new-world-prompt" class="studio-textarea" rows="3" spellcheck="true" placeholder="Leave empty for default Kamauu-style output (same as batch). e.g. Shorter, more poetic; emphasize craft and place."></textarea>
        </label>
        <div class="studio-art-world-actions">
          <button type="button" class="studio-btn-secondary" id="studio-art-new-world-from-base">New World from base</button>
          <button type="button" class="studio-btn-primary" id="studio-art-translate-to-new-world">Translate to New World</button>
        </div>
      </div>

      <div id="studio-art-panel-new-world" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-art-tab-new-world" hidden>
        <p class="studio-modal-hint">LLM‑refined copy (optional). Public profiles default to <strong>New World</strong> when generated copy exists; staff can override on the Roster tab.</p>
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
        <h4 class="studio-prog-subhead">Shared artist audio bite (not localized)</h4>
        <label class="studio-field studio-field--checkbox studio-field--full" style="margin-bottom:0.5rem">
          <input type="checkbox" name="art-audio-display-for-artist" id="studio-art-audio-display-for-artist" ${audioDisplayForArtist ? 'checked' : ''} />
          <span>Display for artist (show audio bite on the member profile dashboard for this artist to view and edit)</span>
        </label>
        <div class="studio-modal-fields-row">
          <label class="studio-field studio-field--grow"><span>Audio URL</span><input type="text" class="studio-input" name="art-audio-url" id="studio-art-audio-url" value="${esc(escapeHtml, String(a.audioUrl ?? ''))}" /></label>
          <label class="studio-file-label studio-btn-ghost studio-field--shrink">
            <input type="file" accept="audio/*" id="studio-art-audio-file" class="studio-file-input" />
            Upload audio
          </label>
        </div>
        <div class="studio-modal-fields-row">
          <label class="studio-field studio-field--grow"><span>Audio title</span><input type="text" class="studio-input" name="art-audio-title" value="${esc(escapeHtml, String(a.audioTitle ?? ''))}" /></label>
        </div>
        <h4 class="studio-prog-subhead">English</h4>
        ${renderIntroSlot(escapeHtml, 'en', enW, 0)}
        ${renderIntroSlot(escapeHtml, 'en', enW, 1)}
        ${renderIntroSlot(escapeHtml, 'en', enW, 2)}
        <h4 class="studio-prog-subhead">日本語</h4>
        ${renderIntroSlot(escapeHtml, 'ja', jaW, 0)}
        ${renderIntroSlot(escapeHtml, 'ja', jaW, 1)}
        ${renderIntroSlot(escapeHtml, 'ja', jaW, 2)}
      </div>

      <div id="studio-art-panel-programs" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-art-tab-programs" hidden>
        <p class="studio-modal-hint">Application status is read-only. <strong>Reserved</strong> adds or removes this artist from the program&rsquo;s confirmed list (English name) and updates remaining slots.</p>
        <p id="studio-art-programs-status" class="studio-muted studio-art-programs-status" role="status"></p>
        <div class="studio-table-wrap studio-table-wrap--modal-programs">
          <table class="studio-table studio-table--dense studio-table--programs">
            <thead>
              <tr>
                <th>Program</th>
                <th>Total slots</th>
                <th>Remaining</th>
                <th>Applied</th>
                <th>Reserved</th>
              </tr>
            </thead>
            <tbody id="studio-art-programs-tbody">
              <tr><td colspan="5" class="studio-muted">Loading programs…</td></tr>
            </tbody>
          </table>
        </div>
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
  <div class="studio-modal-actions studio-modal-actions--artist studio-artist-editor-actions">
    <button type="button" class="studio-btn-danger studio-btn-danger-quiet" id="studio-art-delete">Delete artist</button>
    <div class="studio-artist-editor-actions-right">
      <button type="button" class="studio-btn-ghost" id="studio-art-cancel">Cancel</button>
      <button type="submit" class="studio-btn-primary" id="studio-art-form-save">Save changes</button>
    </div>
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
    const audioDisplayCb = form.querySelector('#studio-art-audio-display-for-artist');
    normalized.audioDisplayForArtist =
        audioDisplayCb instanceof HTMLInputElement && audioDisplayCb.checked;

    const worldSourceEl = root.querySelector('#studio-art-public-world-source');
    const srcPick =
        worldSourceEl instanceof HTMLInputElement ? String(worldSourceEl.value ?? '').trim() : '';
    if (srcPick === 'world') {
        normalized.publicWorldSource = 'world';
    } else {
        delete normalized.publicWorldSource;
    }

    const id = String(fd.get('art-id') || base.id || '').trim();
    const slug = String(fd.get('art-slug') || base.slug || '').trim();
    const image = String(fd.get('art-image') ?? '');
    const heroProfileImage = String(fd.get('art-hero-profile-image') ?? '');
    const heroProfileApprovedCb = form.querySelector('#studio-art-hero-profile-image-approved');
    const heroProfileImageApproved =
        heroProfileApprovedCb instanceof HTMLInputElement && heroProfileApprovedCb.checked;
    const visibility = normalizeArtistRosterVisibility(
        String(fd.get('art-visibility') != null ? fd.get('art-visibility') : 'public')
    );
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
        cohortYears: parseCohortYearsFromFormField(String(fd.get('art-filter-cohortYears') ?? '')),
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
        heroProfileImage,
        heroProfileImageApproved,
        quote: String(fd.get('art-profile-quote') ?? '').trim(),
        audioUrl: String(fd.get('art-audio-url') ?? '').trim(),
        audioTitle: String(fd.get('art-audio-title') ?? '').trim(),
        featuredOrder,
        visibility,
        updatedAt,
        contactEmail: String(fd.get('art-contact-email') ?? '').trim(),
        filter,
        galleryFilter,
        locales: normalized,
        imported: Boolean(base.imported),
        accessCode: (() => {
            const fromForm = String(fd.get('art-accessCode') ?? '').trim();
            if (/^\d{8}$/.test(fromForm)) return fromForm;
            return String(base.accessCode ?? '');
        })(),
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

const MANAGE_FORM_WORLD_PATHS = [
    'world.practice',
    'world.quote',
    'world.perspective',
    'world.vision',
    'world.constructing',
    'world.context',
    'worldNew.practice',
    'worldNew.quote',
    'worldNew.perspective',
    'worldNew.vision',
    'worldNew.constructing',
    'worldNew.context',
];

/**
 * Current form state merged onto a loaded artist row (includes unsaved Identity edits).
 * @param {ParentNode} root
 * @param {object} baseArtist
 */
export function artistRowForLlmFromManageForm(root, baseArtist) {
    const collected = collectArtistRecordFromForm(root, baseArtist);
    return {
        ...(baseArtist && typeof baseArtist === 'object' ? baseArtist : {}),
        ...collected,
        quote: collected.quote ?? String(baseArtist?.quote ?? ''),
        locales: collected.locales,
    };
}

/**
 * Write `world` and `worldNew` EN/JA fields from merged locales into the manage form.
 * @param {ParentNode} root
 * @param {Record<string, unknown>} locales
 */
export function patchManageFormWorldFields(root, locales) {
    if (!locales || typeof locales !== 'object') return;
    for (const loc of ['en', 'ja']) {
        const block =
            locales[loc] && typeof locales[loc] === 'object'
                ? /** @type {Record<string, unknown>} */ (locales[loc])
                : {};
        for (const path of MANAGE_FORM_WORLD_PATHS) {
            const el = root.querySelector(
                `[data-art-locale="${loc}"][data-art-path="${path}"]`,
            );
            if (!(el instanceof HTMLTextAreaElement)) continue;
            const kind = el.getAttribute('data-art-kind') || '';
            const parts = path.split('.');
            const fieldKey = parts[parts.length - 1];
            const blockKey = parts[0];
            const worldLike =
                block[blockKey] && typeof block[blockKey] === 'object' && !Array.isArray(block[blockKey])
                    ? /** @type {Record<string, unknown>} */ (block[blockKey])
                    : {};
            const raw = worldLike[fieldKey];
            el.value =
                kind === 'world-paras' ? worldFieldToTextarea(raw) : String(raw ?? '');
        }
    }
}
