/**
 * Studio Programs modal: tabbed EN/JA grid for program card + programPage locales.
 */

import { withSeoImageAlt } from './mediaAltSeo.js';
import { DRAW_SLOT_GOAL_DEFAULT } from './applicantsDrawModel.js';

/** Default Program Draw sidecar when no config is stored yet. */
export const DEFAULT_PROGRAM_DRAW_CONFIG = Object.freeze({
    active: false,
    totalSlots: DRAW_SLOT_GOAL_DEFAULT,
});

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {string} path dot-separated; numeric segments are array indices
 * @param {unknown} root
 */
export function deepGet(root, path) {
    if (root == null || !path) return undefined;
    const parts = path.split('.');
    let cur = root;
    for (const p of parts) {
        if (cur == null) return undefined;
        if (/^\d+$/.test(p)) {
            const i = Number(p);
            cur = Array.isArray(cur) ? cur[i] : undefined;
        } else {
            cur = /** @type {Record<string, unknown>} */ (cur)[p];
        }
    }
    return cur;
}

/**
 * @param {Record<string, unknown>} root
 * @param {string} path
 * @param {unknown} value
 */
export function deepSet(root, path, value) {
    const parts = path.split('.');
    let cur = /** @type {unknown} */ (root);
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const nextPart = parts[i + 1];
        const nextIsIndex = /^\d+$/.test(nextPart);
        if (/^\d+$/.test(key)) {
            const idx = Number(key);
            if (!Array.isArray(cur)) return;
            while (cur.length <= idx) cur.push(null);
            if (cur[idx] == null) cur[idx] = nextIsIndex ? [] : {};
            cur = cur[idx];
        } else {
            const o = /** @type {Record<string, unknown>} */ (cur);
            if (o[key] == null) o[key] = nextIsIndex ? [] : {};
            cur = o[key];
        }
    }
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) {
        const idx = Number(last);
        if (!Array.isArray(cur)) return;
        while (cur.length <= idx) cur.push(undefined);
        cur[idx] = value;
    } else {
        /** @type {Record<string, unknown>} */ (cur)[last] = value;
    }
}

/**
 * @param {string} raw
 * @returns {string[]}
 */
function linesToArray(raw) {
    return String(raw || '')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * @param {unknown} v
 */
function arrayToLines(v) {
    if (!Array.isArray(v)) return '';
    return v.map((x) => String(x ?? '')).join('\n');
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {string} s
 */
function esc(escapeHtml, s) {
    return escapeHtml(String(s ?? ''));
}

/** @type {ReadonlyArray<{ id: string, label: string, subtitle: string, sectionTitle: string, sectionHelper: string }>} */
export const PROGRAM_EDITOR_TABS = [
    {
        id: 'basics',
        label: 'Basics',
        subtitle: 'Program card & media',
        sectionTitle: 'Program Card',
        sectionHelper: 'This information appears on the program card and lists.',
    },
    {
        id: 'page',
        label: 'Program Page',
        subtitle: 'Hero section & overview',
        sectionTitle: 'Program Page',
        sectionHelper: 'Hero, offerings, and gallery content for the public program page.',
    },
    {
        id: 'details',
        label: 'Details',
        subtitle: 'Facilities, schedule & more',
        sectionTitle: 'Program Details',
        sectionHelper: 'Locations, facilities, costs, key dates, and sidebar content.',
    },
    {
        id: 'application',
        label: 'Application',
        subtitle: 'Application info & process',
        sectionTitle: 'Application',
        sectionHelper: 'Application form copy and payment option cards.',
    },
    {
        id: 'faq',
        label: 'FAQ & Legal',
        subtitle: 'Questions, terms & policy',
        sectionTitle: 'FAQ & Legal',
        sectionHelper: 'FAQ entries, program notes, and refund policy.',
    },
    {
        id: 'draw',
        label: 'Program Award',
        subtitle: 'Slots & award settings',
        sectionTitle: 'Program Award',
        sectionHelper:
            'Configure award slots and whether the Program Award is active. Sole editor for active status — Applicants Award mode is read-only.',
    },
];

/** @type {Record<string, string>} */
export const PROGRAM_FIELD_HELPERS = {
    id: 'Short title for the program',
    imageSrc: 'URL for the program card image',
    heroMediaSrc: 'URL for the detail page hero',
    'programPage.lightboxHeroSrc': 'Fullscreen video on hero tap',
    focus: 'CSS object-position for card image',
    imageAlt: 'Accessibility description',
    location: 'Display location on the program card',
    startDate: 'Program start date (display)',
    endDate: 'Program end date (display)',
    year: 'Program year label',
    routeLink: 'Public URL path for this program',
    briefDescription: 'Short summary for cards and lists',
};

/**
 * @param {string} path
 * @param {string} label
 */
function fieldHelper(path, label) {
    return PROGRAM_FIELD_HELPERS[path] || '';
}

/**
 * @param {string} path
 * @param {string} label
 * @returns {'image' | 'video' | null}
 */
function fieldInputIcon(path, label) {
    const s = `${path} ${label}`.toLowerCase();
    if (s.includes('video') || s.includes('lightbox')) return 'video';
    if (
        s.includes('imagesrc') ||
        s.includes('image') ||
        (s.includes('hero') && s.includes('media')) ||
        s.includes('gallery') ||
        (s.includes('url') && !s.includes('video'))
    ) {
        return 'image';
    }
    if (s.includes('href') || s.endsWith('src')) return 'image';
    return null;
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {string} panelId
 * @param {{ localeToggle?: boolean }} [opts]
 */
function panelSectionHeadHtml(escapeHtml, panelId, opts = {}) {
    const meta = PROGRAM_EDITOR_TABS.find((t) => t.id === panelId);
    const title = meta?.sectionTitle || panelId;
    const helper = meta?.sectionHelper || '';
    const localeToggle = opts.localeToggle !== false;
    const langToggle = localeToggle
        ? `<div class="studio-prog-editor-lang-toggle" role="group" aria-label="Editing language">
      <button type="button" class="studio-prog-editor-lang-btn is-active" data-prog-lang="en">ENGLISH</button>
      <button type="button" class="studio-prog-editor-lang-btn" data-prog-lang="ja">日本語</button>
    </div>`
        : '';
    return `<div class="studio-prog-editor-section-head">
    <div class="studio-prog-editor-section-head__copy">
      <h3 class="studio-prog-editor-section-title">${esc(escapeHtml, title)}</h3>
      <p class="studio-prog-editor-section-helper">${esc(escapeHtml, helper)}</p>
    </div>
    ${langToggle}
  </div>`;
}

/**
 * @param {string} id
 * @param {string} content
 * @param {boolean} active
 * @param {(s: string) => string} escapeHtml
 */
function tabPanelHtml(id, content, active, escapeHtml) {
    return `<div class="studio-tabs__panel studio-prog-tab-panel${active ? ' is-active' : ''}" id="studio-prog-panel-${esc(escapeHtml, id)}" role="tabpanel" aria-labelledby="studio-prog-tab-${esc(escapeHtml, id)}" data-prog-panel="${esc(escapeHtml, id)}"${active ? '' : ' hidden'}>${content}</div>`;
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {string} label
 * @param {string} path
 * @param {unknown} enRoot
 * @param {unknown} jaRoot
 * @param {'text' | 'textarea' | 'number' | 'checkbox'} [kind]
 */
function rowLocale(escapeHtml, label, path, enRoot, jaRoot, kind = 'text') {
    const enV = deepGet(enRoot, path);
    const jaV = deepGet(jaRoot, path);
    const translatable = kind === 'text' || kind === 'textarea';
    const transAttr = translatable ? ' data-prog-translatable="1"' : '';
    const pathEsc = esc(escapeHtml, path);
    const helper = fieldHelper(path, label);
    const helperHtml = helper
        ? `<span class="studio-prog-field-row__helper">${esc(escapeHtml, helper)}</span>`
        : '';
    const translateBtn = translatable
        ? `<button type="button" class="studio-prog-field-row__translate" data-prog-translate-path="${pathEsc}">→ JA</button>`
        : '<span class="studio-prog-field-row__translate-spacer" aria-hidden="true"></span>';
    const iconKind = kind === 'text' ? fieldInputIcon(path, label) : null;
    const iconHtml =
        iconKind === 'video'
            ? '<span class="studio-prog-field-row__icon studio-prog-field-row__icon--video" aria-hidden="true"></span>'
            : iconKind === 'image'
              ? '<span class="studio-prog-field-row__icon studio-prog-field-row__icon--image" aria-hidden="true"></span>'
              : '';

    if (kind === 'checkbox') {
        const cEn = enV === true;
        const cJa = jaV === true;
        return `<div class="studio-prog-field-row studio-prog-field-row--check" data-prog-path="${pathEsc}">
      <div class="studio-prog-field-row__meta">
        <span class="studio-prog-field-row__label">${esc(escapeHtml, label)}</span>
        ${helperHtml}
      </div>
      <div class="studio-prog-field-row__control">
        <label class="studio-prog-field-row__check studio-prog-field-row__input--en"><input type="checkbox" data-prog-locale="en" data-prog-path="${pathEsc}" ${cEn ? 'checked' : ''} /> EN</label>
        <label class="studio-prog-field-row__check studio-prog-field-row__input--ja" hidden><input type="checkbox" data-prog-locale="ja" data-prog-path="${pathEsc}" ${cJa ? 'checked' : ''} /> JA</label>
      </div>
      ${translateBtn}
    </div>`;
    }

    if (kind === 'textarea') {
        return `<div class="studio-prog-field-row studio-prog-field-row--textarea" data-prog-path="${pathEsc}">
      <div class="studio-prog-field-row__meta">
        <span class="studio-prog-field-row__label">${esc(escapeHtml, label)}</span>
        ${helperHtml}
      </div>
      <div class="studio-prog-field-row__control">
        <div class="studio-prog-field-row__input-wrap">
          <textarea class="studio-prog-editor-input studio-prog-field-row__input--en" rows="4" data-prog-locale="en" data-prog-path="${pathEsc}"${transAttr} spellcheck="true">${esc(escapeHtml, enV ?? '')}</textarea>
          <textarea class="studio-prog-editor-input studio-prog-field-row__input--ja" rows="4" data-prog-locale="ja" data-prog-path="${pathEsc}" spellcheck="true" hidden>${esc(escapeHtml, jaV ?? '')}</textarea>
        </div>
      </div>
      ${translateBtn}
    </div>`;
    }

    const type = kind === 'number' ? 'number' : 'text';
    const enAttr = esc(escapeHtml, enV ?? '');
    const jaAttr = esc(escapeHtml, jaV ?? '');
    return `<div class="studio-prog-field-row" data-prog-path="${pathEsc}">
      <div class="studio-prog-field-row__meta">
        <span class="studio-prog-field-row__label">${esc(escapeHtml, label)}</span>
        ${helperHtml}
      </div>
      <div class="studio-prog-field-row__control">
        <div class="studio-prog-field-row__input-wrap">
          <input type="${type}" class="studio-prog-editor-input studio-prog-field-row__input--en" value="${enAttr}" data-prog-locale="en" data-prog-path="${pathEsc}"${transAttr} />
          <input type="${type}" class="studio-prog-editor-input studio-prog-field-row__input--ja" value="${jaAttr}" data-prog-locale="ja" data-prog-path="${pathEsc}" hidden />
          ${iconHtml}
        </div>
      </div>
      ${translateBtn}
    </div>`;
}

/**
 * @param {(s: string) => string} escapeHtml
 */
function rowLocaleLines(escapeHtml, label, path, enRoot, jaRoot) {
    const enV = deepGet(enRoot, path);
    const jaV = deepGet(jaRoot, path);
    const pathEsc = esc(escapeHtml, path);
    const helper = fieldHelper(path, label);
    const helperHtml = helper
        ? `<span class="studio-prog-field-row__helper">${esc(escapeHtml, helper)}</span>`
        : '';
    return `<div class="studio-prog-field-row studio-prog-field-row--textarea" data-prog-path="${pathEsc}">
      <div class="studio-prog-field-row__meta">
        <span class="studio-prog-field-row__label">${esc(escapeHtml, label)}</span>
        ${helperHtml}
      </div>
      <div class="studio-prog-field-row__control">
        <div class="studio-prog-field-row__input-wrap">
          <textarea class="studio-prog-editor-input studio-prog-field-row__input--en" rows="3" data-prog-locale="en" data-prog-path="${pathEsc}" data-prog-kind="lines" data-prog-translatable="1" spellcheck="false">${esc(escapeHtml, arrayToLines(enV))}</textarea>
          <textarea class="studio-prog-editor-input studio-prog-field-row__input--ja" rows="3" data-prog-locale="ja" data-prog-path="${pathEsc}" data-prog-kind="lines" spellcheck="false" hidden>${esc(escapeHtml, arrayToLines(jaV))}</textarea>
        </div>
      </div>
      <button type="button" class="studio-prog-field-row__translate" data-prog-translate-path="${pathEsc}">→ JA</button>
    </div>`;
}

const FADE_GALLERY_MAX_IMAGES = 10;
const STRIP_GALLERY_MAX_IMAGES = 20;
const OFFERING_COUNT = 3;
const FACILITY_ROWS = 15;
const LOCATION_ROWS = 3;
const FAQ_ROWS = 16;
const RESIDENCE_ROWS = 5;
const INCLUDED_ROWS = 10;
const NOT_INCLUDED_ROWS = 5;

/**
 * @param {unknown} en
 * @param {unknown} ja
 * @returns {string[]}
 */
function getFadeGallerySeed(en, ja) {
    const ppEn = asObj(asObj(en).programPage);
    const ppJa = asObj(asObj(ja).programPage);
    const raw = ppEn.fadeGalleryImages ?? ppJa.fadeGalleryImages;
    const arr = Array.isArray(raw) ? raw.map((x) => String(x ?? '').trim()) : [];
    const out = [];
    for (let i = 0; i < FADE_GALLERY_MAX_IMAGES; i++) out.push(arr[i] || '');
    return out;
}

/**
 * @param {unknown} en
 * @param {unknown} ja
 */
function getFadeGalleryDurationSeed(en, ja) {
    const ppEn = asObj(asObj(en).programPage);
    const ppJa = asObj(asObj(ja).programPage);
    const raw = ppEn.fadeGalleryDurationSec ?? ppJa.fadeGalleryDurationSec;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return String(n);
    return '3';
}

/**
 * @param {unknown} en
 * @param {unknown} ja
 * @returns {string[]}
 */
function getStripGallerySeed(en, ja) {
    const ppEn = asObj(asObj(en).programPage);
    const ppJa = asObj(asObj(ja).programPage);
    const raw = ppEn.stripGalleryImages ?? ppJa.stripGalleryImages;
    const arr = Array.isArray(raw) ? raw.map((x) => String(x ?? '').trim()) : [];
    const out = [];
    for (let i = 0; i < STRIP_GALLERY_MAX_IMAGES; i++) out.push(arr[i] || '');
    return out;
}

/**
 * @typedef {{
 *   kind: 'date' | 'section',
 *   enDate: string,
 *   enDesc: string,
 *   jaDate: string,
 *   jaDesc: string,
 *   enSectionTitle: string,
 *   jaSectionTitle: string,
 * }} KeyDateRowSeed
 */

/** @returns {KeyDateRowSeed} */
export function emptyKeyDateRow() {
    return {
        kind: 'date',
        enDate: '',
        enDesc: '',
        jaDate: '',
        jaDesc: '',
        enSectionTitle: '',
        jaSectionTitle: '',
    };
}

/** @returns {KeyDateRowSeed} */
export function emptyKeyDateSectionRow() {
    return {
        kind: 'section',
        enDate: '',
        enDesc: '',
        jaDate: '',
        jaDesc: '',
        enSectionTitle: '',
        jaSectionTitle: '',
    };
}

/**
 * @param {unknown} enRaw
 * @param {unknown} jaRaw
 * @returns {KeyDateRowSeed[]}
 */
export function mergeKeyDatesSeed(enRaw, jaRaw) {
    const enDates = deepGet(asObj(enRaw), 'programPage.programDetails.keyDates');
    const jaDates = deepGet(asObj(jaRaw), 'programPage.programDetails.keyDates');
    const enArr = Array.isArray(enDates) ? enDates : [];
    const jaArr = Array.isArray(jaDates) ? jaDates : [];
    const max = Math.max(enArr.length, jaArr.length, 1);
    /** @type {KeyDateRowSeed[]} */
    const rows = [];
    for (let i = 0; i < max; i++) {
        const e = enArr[i] && typeof enArr[i] === 'object' ? /** @type {Record<string, unknown>} */ (enArr[i]) : {};
        const j = jaArr[i] && typeof jaArr[i] === 'object' ? /** @type {Record<string, unknown>} */ (jaArr[i]) : {};
        const enSectionTitle = String(e.sectionTitle ?? '').trim();
        const jaSectionTitle = String(j.sectionTitle ?? '').trim();
        const isSection = Boolean(enSectionTitle || jaSectionTitle);
        rows.push({
            kind: isSection ? 'section' : 'date',
            enDate: String(e.date ?? '').trim(),
            enDesc: String(e.description ?? '').trim(),
            jaDate: String(j.date ?? '').trim(),
            jaDesc: String(j.description ?? '').trim(),
            enSectionTitle,
            jaSectionTitle,
        });
    }
    return rows;
}

/**
 * @param {KeyDateRowSeed} row
 * @param {number} index
 * @param {(s: string) => string} escapeHtml
 */
function keyDateCardHtml(row, index, escapeHtml) {
    const isSection = row.kind === 'section';
    const label = isSection ? `Block title ${index + 1}` : `Key date ${index + 1}`;
    const sectionClass = isSection ? ' studio-prog-key-date-card--section' : '';
    if (isSection) {
        return `<div class="studio-prog-key-date-card${sectionClass}" data-prog-key-date-index="${index}" data-prog-key-date-kind="section">
    <div class="studio-prog-key-date-card__head">
      <span class="studio-prog-key-date-card__label">${label}</span>
      <div class="studio-prog-key-date-card__actions">
        <button type="button" class="studio-btn-ghost studio-btn-ghost--sm studio-prog-translate-btn" data-prog-key-date-translate>→ 日本語</button>
        <button type="button" class="studio-btn-ghost studio-btn-ghost--sm" data-prog-key-date-remove>Remove</button>
      </div>
    </div>
    <div class="studio-prog-key-date-card__grid studio-prog-key-date-card__grid--section">
      <label class="studio-field"><span>Block title (EN)</span><input type="text" class="studio-input" data-prog-key-date-field="en-section" data-prog-translatable="1" value="${esc(escapeHtml, row.enSectionTitle)}" placeholder="e.g. Tokyo" autocomplete="off" /></label>
      <label class="studio-field"><span>Block title (JA)</span><input type="text" class="studio-input" data-prog-key-date-field="ja-section" value="${esc(escapeHtml, row.jaSectionTitle)}" autocomplete="off" /></label>
    </div>
  </div>`;
    }
    return `<div class="studio-prog-key-date-card${sectionClass}" data-prog-key-date-index="${index}" data-prog-key-date-kind="date">
    <div class="studio-prog-key-date-card__head">
      <span class="studio-prog-key-date-card__label">${label}</span>
      <div class="studio-prog-key-date-card__actions">
        <button type="button" class="studio-btn-ghost studio-btn-ghost--sm studio-prog-translate-btn" data-prog-key-date-translate>→ 日本語</button>
        <button type="button" class="studio-btn-ghost studio-btn-ghost--sm" data-prog-key-date-remove>Remove</button>
      </div>
    </div>
    <div class="studio-prog-key-date-card__grid">
      <label class="studio-field"><span>Date (EN)</span><input type="text" class="studio-input" data-prog-key-date-field="en-date" data-prog-translatable="1" value="${esc(escapeHtml, row.enDate)}" autocomplete="off" /></label>
      <label class="studio-field"><span>Date (JA)</span><input type="text" class="studio-input" data-prog-key-date-field="ja-date" value="${esc(escapeHtml, row.jaDate)}" autocomplete="off" /></label>
      <label class="studio-field studio-prog-key-date-card__desc"><span>Description (EN)</span><textarea class="studio-textarea" rows="2" data-prog-key-date-field="en-desc" data-prog-translatable="1">${esc(escapeHtml, row.enDesc)}</textarea></label>
      <label class="studio-field studio-prog-key-date-card__desc"><span>Description (JA)</span><textarea class="studio-textarea" rows="2" data-prog-key-date-field="ja-desc">${esc(escapeHtml, row.jaDesc)}</textarea></label>
    </div>
  </div>`;
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {Record<string, unknown>} en
 * @param {Record<string, unknown>} ja
 */
function renderBasicsTab(escapeHtml, en, ja) {
    return `${panelSectionHeadHtml(escapeHtml, 'basics')}
  <div class="studio-prog-editor-fields">
  ${rowLocale(escapeHtml, 'Card ID', 'id', en, ja)}
  ${rowLocale(escapeHtml, 'Image (Card / List)', 'imageSrc', en, ja)}
  ${rowLocale(escapeHtml, 'Hero / View Media URL', 'heroMediaSrc', en, ja)}
  ${rowLocale(escapeHtml, 'Lightbox Video URL', 'programPage.lightboxHeroSrc', en, ja)}
  ${rowLocale(escapeHtml, 'Focus', 'focus', en, ja)}
  ${rowLocale(escapeHtml, 'Image Alt', 'imageAlt', en, ja)}
  ${rowLocale(escapeHtml, 'location', 'location', en, ja)}
  ${rowLocale(escapeHtml, 'startDate', 'startDate', en, ja)}
  ${rowLocale(escapeHtml, 'endDate', 'endDate', en, ja)}
  ${rowLocale(escapeHtml, 'year', 'year', en, ja)}
  ${rowLocale(escapeHtml, 'totalSlots', 'totalSlots', en, ja, 'number')}
  ${rowLocale(escapeHtml, 'availableSlots', 'availableSlots', en, ja, 'number')}
  ${rowLocale(escapeHtml, 'acceptingApplications', 'acceptingApplications', en, ja, 'checkbox')}
  ${rowLocale(escapeHtml, 'briefDescription', 'briefDescription', en, ja, 'textarea')}
  ${rowLocale(escapeHtml, 'routeLink', 'routeLink', en, ja)}
  </div>`;
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {Record<string, unknown>} en
 * @param {Record<string, unknown>} ja
 */
function renderPageTab(escapeHtml, en, ja) {
    let html = `${panelSectionHeadHtml(escapeHtml, 'page')}
  <div class="studio-prog-editor-fields">
  <h4 class="studio-prog-subhead">Hero &amp; offerings</h4>
  ${rowLocale(escapeHtml, 'Headline', 'programPage.headline', en, ja)}
  ${rowLocale(escapeHtml, 'Subheadline', 'programPage.subheadline', en, ja)}
  ${rowLocale(escapeHtml, 'Description', 'programPage.description', en, ja, 'textarea')}
  ${rowLocale(escapeHtml, 'Offering headline', 'programPage.offeringHeadline', en, ja)}`;

    for (let i = 0; i < OFFERING_COUNT; i++) {
        html += `<p class="studio-prog-card-slot">Offering ${i + 1}</p>`;
        html += rowLocale(escapeHtml, 'Title', `programPage.offeringCards.${i}.title`, en, ja);
        html += rowLocale(escapeHtml, 'Description', `programPage.offeringCards.${i}.description`, en, ja, 'textarea');
        html += rowLocaleLines(escapeHtml, 'Gallery URLs (one per line)', `programPage.offeringCards.${i}.gallery`, en, ja);
    }

    html += `
  ${rowLocale(escapeHtml, 'Confirmed headline', 'programPage.confirmedHeadline', en, ja)}
  ${rowLocaleLines(escapeHtml, 'Confirmed artists (one per line)', 'programPage.confirmedArtists', en, ja)}
  ${rowLocale(escapeHtml, 'Details headline', 'programPage.detailsHeadline', en, ja)}

  <h4 class="studio-prog-subhead">Fade gallery</h4>
  <p class="studio-modal-hint">Up to ten images on the program detail page (5:4 frame). Set how long each image stays, then add URLs (shared for EN/JA).</p>
  <div class="studio-prog-fade-duration-row">
    <label class="studio-field">
      <span class="studio-muted">Seconds each image stays visible</span>
      <input type="number" class="studio-prog-editor-input studio-prog-fade-duration" min="0.5" max="120" step="0.5" value="${esc(escapeHtml, getFadeGalleryDurationSeed(en, ja))}" />
    </label>
  </div>
  <div class="studio-prog-image-grid studio-prog-fade-grid">`;

    const fadeSeed = getFadeGallerySeed(en, ja);
    for (let i = 0; i < FADE_GALLERY_MAX_IMAGES; i++) {
        html += `<div class="studio-prog-image-slot studio-prog-fade-row">
      <span class="studio-prog-image-slot__label">Image ${i + 1}</span>
      <div class="studio-prog-image-slot__row">
        <span class="studio-prog-url-preview-wrap" hidden><img class="studio-prog-url-preview" alt="${esc(escapeHtml, withSeoImageAlt('Fade gallery URL preview'))}" loading="lazy" decoding="async" /></span>
        <input type="text" class="studio-prog-editor-input studio-prog-fade-url" data-fade-slot="${i}" value="${esc(escapeHtml, fadeSeed[i] || '')}" placeholder="Image URL" autocomplete="off" />
        <label class="studio-file-label studio-btn-ghost studio-field--shrink"><input type="file" class="studio-file-input studio-prog-fade-file" data-fade-slot="${i}" accept="image/*" />Upload</label>
      </div>
    </div>`;
    }

    html += `</div>
  <h4 class="studio-prog-subhead">Strip gallery</h4>
  <p class="studio-modal-hint">Up to twenty images: large main image with a vertical thumbnail strip on desktop. URLs are shared for EN/JA.</p>
  <div class="studio-prog-image-grid studio-prog-strip-grid">`;

    const stripSeed = getStripGallerySeed(en, ja);
    for (let i = 0; i < STRIP_GALLERY_MAX_IMAGES; i++) {
        html += `<div class="studio-prog-image-slot studio-prog-strip-row">
      <span class="studio-prog-image-slot__label">Image ${i + 1}</span>
      <div class="studio-prog-image-slot__row">
        <span class="studio-prog-url-preview-wrap" hidden><img class="studio-prog-url-preview" alt="${esc(escapeHtml, withSeoImageAlt('Strip gallery URL preview'))}" loading="lazy" decoding="async" /></span>
        <input type="text" class="studio-prog-editor-input studio-prog-strip-url" data-strip-slot="${i}" value="${esc(escapeHtml, stripSeed[i] || '')}" placeholder="Image URL" autocomplete="off" />
        <label class="studio-file-label studio-btn-ghost studio-field--shrink"><input type="file" class="studio-file-input studio-prog-strip-file" data-strip-slot="${i}" accept="image/*" />Upload</label>
      </div>
    </div>`;
    }

    html += `</div>
  </div>`;
    return html;
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {Record<string, unknown>} en
 * @param {Record<string, unknown>} ja
 */
function renderDetailsTab(escapeHtml, en, ja) {
    let html = `${panelSectionHeadHtml(escapeHtml, 'details')}
  <div class="studio-prog-editor-fields">
  <h4 class="studio-prog-subhead">Locations &amp; facilities</h4>`;

    for (let i = 0; i < LOCATION_ROWS; i++) {
        html += `<p class="studio-prog-card-slot">Location ${i + 1}</p>`;
        html += rowLocale(escapeHtml, 'Label', `programPage.programDetails.locations.${i}`, en, ja);
    }
    for (let i = 0; i < FACILITY_ROWS; i++) {
        html += `<p class="studio-prog-card-slot">Facility ${i + 1}</p>`;
        html += rowLocale(escapeHtml, 'Line', `programPage.programDetails.facilityList.${i}`, en, ja);
    }

    html += `
  <h4 class="studio-prog-subhead">Costs</h4>
  ${rowLocale(escapeHtml, 'Cost — base', 'programPage.programDetails.costs.base', en, ja)}
  ${rowLocale(escapeHtml, 'Cost — additional', 'programPage.programDetails.costs.additional', en, ja)}
  ${rowLocale(escapeHtml, 'Cost — application fee (sidebar)', 'programPage.programDetails.costs.applicationFee', en, ja, 'textarea')}
  ${rowLocale(escapeHtml, 'Cost — remaining balance (display)', 'programPage.programDetails.costs.remainingBalance', en, ja)}
  ${rowLocale(escapeHtml, 'Cost — Japan discount notice (JA locale only)', 'programPage.programDetails.costs.japanResidencyDiscountNotice', en, ja, 'textarea')}
  <p class="studio-modal-hint">Deposit for the public sidebar is edited under <strong>Application</strong> — <code>depositAmountDisplay</code>.</p>

  <h4 class="studio-prog-subhead">Key dates</h4>
  <p class="studio-modal-hint">Timeline on the program page. Use <strong>block titles</strong> to group dates into sections (e.g. &quot;Tokyo&quot;, &quot;Kaga, Ishikawa&quot;). Application deadline can also be inferred from a row labeled &quot;Application Deadline&quot;.</p>
  <div class="studio-prog-key-dates-toolbar">
    <button type="button" class="studio-prog-editor-btn" data-prog-key-dates-add>Add key date</button>
    <button type="button" class="studio-prog-editor-btn studio-prog-editor-btn--secondary" data-prog-key-dates-add-section>Add block title</button>
    <button type="button" class="studio-prog-editor-btn studio-prog-translate-section" data-prog-translate-section="keyDates">Translate dates → 日本語</button>
  </div>
  <div class="studio-prog-key-dates" data-prog-key-dates></div>

  <h4 class="studio-prog-subhead studio-prog-subhead--nested">Sidebar — residence links</h4>
  <p class="studio-modal-hint">Up to 5. Name in sidebar; link opens residence page.</p>`;

    for (let i = 0; i < RESIDENCE_ROWS; i++) {
        html += `<p class="studio-prog-card-slot">Residence ${i + 1}</p>`;
        html += rowLocale(escapeHtml, 'Name', `programPage.programDetails.residences.${i}.name`, en, ja);
        html += rowLocale(escapeHtml, 'Link (href)', `programPage.programDetails.residences.${i}.href`, en, ja);
    }

    html += `<h4 class="studio-prog-subhead studio-prog-subhead--nested">Included / Not included / Platform</h4>`;
    for (let i = 0; i < INCLUDED_ROWS; i++) {
        html += rowLocale(escapeHtml, `Included ${i + 1}`, `programPage.programDetails.included.${i}`, en, ja);
    }
    for (let i = 0; i < NOT_INCLUDED_ROWS; i++) {
        html += rowLocale(escapeHtml, `Not included ${i + 1}`, `programPage.programDetails.notIncluded.${i}`, en, ja);
    }
    html += rowLocale(escapeHtml, 'Platform', 'programPage.programDetails.platform', en, ja, 'textarea');
    html += `</div>`;
    return html;
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {Record<string, unknown>} en
 * @param {Record<string, unknown>} ja
 */
/**
 * Default useGlobalPaymentOptionDetails to true when unset (for checkbox display).
 * @param {Record<string, unknown>} localeRoot
 */
function withUseGlobalPaymentDefault(localeRoot) {
    const root = { ...asObj(localeRoot) };
    const pp = { ...asObj(root.programPage) };
    const af = { ...asObj(pp.applicationForm) };
    if (af.useGlobalPaymentOptionDetails === undefined) {
        af.useGlobalPaymentOptionDetails = true;
    }
    pp.applicationForm = af;
    root.programPage = pp;
    return root;
}

function renderApplicationTab(escapeHtml, en, ja) {
    const enCheck = withUseGlobalPaymentDefault(en);
    const jaCheck = withUseGlobalPaymentDefault(ja);
    let html = `${panelSectionHeadHtml(escapeHtml, 'application')}
  <div class="studio-prog-editor-fields">
  <h4 class="studio-prog-subhead">Application form</h4>
  <p class="studio-modal-hint">One-page apply: deposit, deadline, selection process override. <strong>Application fee (cents)</strong> required for one-time payment.</p>
  ${rowLocale(escapeHtml, 'Deposit amount (display)', 'programPage.applicationForm.depositAmountDisplay', en, ja)}
  ${rowLocale(escapeHtml, 'Application fee amount (cents)', 'programPage.applicationForm.applicationFeeAmountCents', en, ja)}
  ${rowLocale(escapeHtml, 'Application deadline (ISO)', 'programPage.applicationForm.applicationDeadlineIso', en, ja)}
  ${rowLocale(escapeHtml, 'Application deadline (display)', 'programPage.applicationForm.applicationDeadlineDisplay', en, ja)}
  ${rowLocale(escapeHtml, 'Selection process override', 'programPage.applicationForm.selectionProcessOverride', en, ja, 'textarea')}

  <h4 class="studio-prog-subhead">Payment option cards</h4>
  ${rowLocale(escapeHtml, 'Use global payment option details', 'programPage.applicationForm.useGlobalPaymentOptionDetails', enCheck, jaCheck, 'checkbox')}
  <p class="studio-modal-hint">When checked, empty fields inherit Join Network (register modal) plan titles, prices, and bullets. Monthly on this form is the <strong>monthly + application</strong> add-on (different PayPal plan than Join).</p>`;

    const payPlans = /** @type {const} */ (['one_time', 'monthly', 'quarterly', 'annual']);
    const payPlanLabel = {
        one_time: '1. Single application payment',
        monthly: '2. Monthly + application',
        quarterly: '3. Quarterly membership',
        annual: '4. Annual membership',
    };
    for (const pk of payPlans) {
        html += `<p class="studio-prog-card-slot">${payPlanLabel[pk]}</p>`;
        html += rowLocale(escapeHtml, 'Title', `programPage.applicationPaymentOptions.${pk}.title`, en, ja);
        html += rowLocale(escapeHtml, 'Display price', `programPage.applicationPaymentOptions.${pk}.displayPrice`, en, ja);
        html += rowLocale(escapeHtml, 'Subtext line 1', `programPage.applicationPaymentOptions.${pk}.subtext`, en, ja, 'textarea');
        html += rowLocale(escapeHtml, 'Subtext line 2', `programPage.applicationPaymentOptions.${pk}.subtext2`, en, ja, 'textarea');
        html += rowLocaleLines(escapeHtml, 'Included bullets', `programPage.applicationPaymentOptions.${pk}.includedBullets`, en, ja);
    }
    html += `</div>`;
    return html;
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {Record<string, unknown>} en
 * @param {Record<string, unknown>} ja
 */
function renderFaqTab(escapeHtml, en, ja) {
    const aiEn = asObj(en.programPage?.additionalInfo);
    const aiJa = asObj(ja.programPage?.additionalInfo);
    let html = `${panelSectionHeadHtml(escapeHtml, 'faq')}
  <div class="studio-prog-editor-fields">
  <h4 class="studio-prog-subhead">FAQ &amp; notes</h4>
  <p class="studio-prog-card-slot">Application Fee dropdown</p>
  ${rowLocale(escapeHtml, 'Application Fee — body', 'programPage.additionalInfo.applicationFee', en, ja, 'textarea')}
  <p class="studio-prog-card-slot">About Program dropdown</p>
  ${rowLocale(escapeHtml, 'About Program — body', 'programPage.additionalInfo.aboutProgram', en, ja, 'textarea')}`;

    for (let i = 0; i < FAQ_ROWS; i++) {
        html += `<p class="studio-prog-card-slot">FAQ ${i + 1}</p>`;
        html += rowLocale(escapeHtml, 'Question', `programPage.additionalInfo.faq.${i}.question`, en, ja);
        html += rowLocale(escapeHtml, 'Answer', `programPage.additionalInfo.faq.${i}.answer`, en, ja, 'textarea');
    }

    html += `
  <p class="studio-prog-card-slot">Program notes</p>
  ${rowLocale(escapeHtml, 'Title', 'programPage.additionalInfo.programNotes.0.title', en, ja)}
  ${rowLocale(escapeHtml, 'Information', 'programPage.additionalInfo.programNotes.0.information', en, ja, 'textarea')}

  <h4 class="studio-prog-subhead">Refund policy (advanced JSON)</h4>
  <p class="studio-modal-hint">Edit as JSON per locale, or clear to omit.</p>
  <div class="studio-prog-field-row studio-prog-field-row--textarea studio-prog-field-row--json" data-prog-path="programPage.additionalInfo.refundPolicy">
    <div class="studio-prog-field-row__meta">
      <span class="studio-prog-field-row__label">refundPolicy</span>
      <span class="studio-prog-field-row__helper">Advanced JSON per locale</span>
    </div>
    <div class="studio-prog-field-row__control">
      <div class="studio-prog-field-row__input-wrap">
        <textarea class="studio-prog-editor-input studio-prog-json-adv studio-prog-field-row__input--en" rows="12" data-prog-locale="en" data-prog-path="programPage.additionalInfo.refundPolicy" data-prog-kind="json" spellcheck="false">${esc(
            escapeHtml,
            aiEn.refundPolicy != null ? JSON.stringify(aiEn.refundPolicy, null, 2) : '',
        )}</textarea>
        <textarea class="studio-prog-editor-input studio-prog-json-adv studio-prog-field-row__input--ja" rows="12" data-prog-locale="ja" data-prog-path="programPage.additionalInfo.refundPolicy" data-prog-kind="json" spellcheck="false" hidden>${esc(
            escapeHtml,
            aiJa.refundPolicy != null ? JSON.stringify(aiJa.refundPolicy, null, 2) : '',
        )}</textarea>
      </div>
    </div>
    <span class="studio-prog-field-row__translate-spacer" aria-hidden="true"></span>
  </div>
  </div>`;
    return html;
}

/**
 * Program-level Draw tab (not EN/JA localized).
 * @param {(s: string) => string} escapeHtml
 * @param {{ active?: boolean, totalSlots?: number } | null | undefined} drawCfg
 */
function renderDrawTab(escapeHtml, drawCfg) {
    const active = Boolean(drawCfg?.active);
    const slotsRaw = Number(drawCfg?.totalSlots);
    const totalSlots =
        Number.isFinite(slotsRaw) && slotsRaw > 0
            ? Math.floor(slotsRaw)
            : DEFAULT_PROGRAM_DRAW_CONFIG.totalSlots;
    return `${panelSectionHeadHtml(escapeHtml, 'draw', { localeToggle: false })}
  <div class="studio-prog-editor-fields studio-prog-editor-fields--program-level">
  <h4 class="studio-prog-subhead">Award cycle</h4>
  <p class="studio-modal-hint">These settings apply to the whole program (not per language). Formal applications and Program Award entries are mutually exclusive.</p>
  <div class="studio-prog-field-row studio-prog-field-row--check">
    <div class="studio-prog-field-row__meta">
      <span class="studio-prog-field-row__label">Program Award active</span>
      <span class="studio-prog-field-row__helper">When on, the public program page surfaces a Program Award entry control.</span>
    </div>
    <div class="studio-prog-field-row__control">
      <label class="studio-prog-field-row__check">
        <input type="checkbox" data-prog-draw="active" ${active ? 'checked' : ''} />
        <span>Active</span>
      </label>
    </div>
    <span class="studio-prog-field-row__translate-spacer" aria-hidden="true"></span>
  </div>
  <div class="studio-prog-field-row">
    <div class="studio-prog-field-row__meta">
      <span class="studio-prog-field-row__label">Total award slots</span>
      <span class="studio-prog-field-row__helper">Cap for Program Award entries this cycle (default ${DEFAULT_PROGRAM_DRAW_CONFIG.totalSlots}).</span>
    </div>
    <div class="studio-prog-field-row__control">
      <div class="studio-prog-field-row__input-wrap">
        <input
          type="number"
          min="1"
          step="1"
          class="studio-prog-editor-input"
          data-prog-draw="totalSlots"
          value="${esc(escapeHtml, String(totalSlots))}"
        />
      </div>
    </div>
    <span class="studio-prog-field-row__translate-spacer" aria-hidden="true"></span>
  </div>
  </div>`;
}

/**
 * Read program-level draw fields from the editor form.
 * @param {ParentNode} root
 * @returns {{ active: boolean, totalSlots: number }}
 */
export function collectProgramDrawFromForm(root) {
    const activeEl = root.querySelector('[data-prog-draw="active"]');
    const slotsEl = root.querySelector('[data-prog-draw="totalSlots"]');
    const active = activeEl instanceof HTMLInputElement ? activeEl.checked : false;
    const slotsRaw = slotsEl instanceof HTMLInputElement ? Number(slotsEl.value) : NaN;
    const totalSlots =
        Number.isFinite(slotsRaw) && slotsRaw > 0
            ? Math.floor(slotsRaw)
            : DEFAULT_PROGRAM_DRAW_CONFIG.totalSlots;
    return { active, totalSlots };
}

/**
 * @param {(s: string) => string} escapeHtml
 * @param {unknown} enRaw
 * @param {unknown} jaRaw
 * @param {{ active?: boolean, totalSlots?: number } | null} [drawCfg]
 * @returns {string} Tab panels HTML only (shell provides nav chrome)
 */
export function renderProgramLocaleFormHtml(escapeHtml, enRaw, jaRaw, drawCfg = null) {
    const en = asObj(enRaw);
    const ja = asObj(jaRaw);
    const draw = drawCfg && typeof drawCfg === 'object' ? drawCfg : DEFAULT_PROGRAM_DRAW_CONFIG;

    const panels = [
        { id: 'basics', html: renderBasicsTab(escapeHtml, en, ja) },
        { id: 'page', html: renderPageTab(escapeHtml, en, ja) },
        { id: 'details', html: renderDetailsTab(escapeHtml, en, ja) },
        { id: 'application', html: renderApplicationTab(escapeHtml, en, ja) },
        { id: 'faq', html: renderFaqTab(escapeHtml, en, ja) },
        { id: 'draw', html: renderDrawTab(escapeHtml, draw) },
    ];

    return panels.map((p, i) => tabPanelHtml(p.id, p.html, i === 0, escapeHtml)).join('');
}

/**
 * @param {HTMLElement} root Modal root (form or dialog root)
 */
export function bindProgramModalTabs(root) {
    const tabs = root.querySelectorAll('[data-prog-tab]');
    const panels = root.querySelectorAll('[data-prog-panel]');

    const activate = (tabId) => {
        tabs.forEach((btn) => {
            const id = btn.getAttribute('data-prog-tab') || '';
            const on = id === tabId;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
            btn.setAttribute('tabindex', on ? '0' : '-1');
        });
        panels.forEach((panel) => {
            const id = panel.getAttribute('data-prog-panel') || '';
            const on = id === tabId;
            panel.classList.toggle('is-active', on);
            if (on) panel.removeAttribute('hidden');
            else panel.setAttribute('hidden', '');
        });
    };

    tabs.forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-prog-tab');
            if (id) activate(id);
        });
    });
}

/**
 * @param {HTMLElement} scope Panel or form subtree
 * @param {'en' | 'ja'} lang
 */
function applyLangVisibility(scope, lang) {
    scope.querySelectorAll('.studio-prog-field-row__input--en, .studio-prog-field-row__check.studio-prog-field-row__input--en').forEach((el) => {
        if (lang === 'en') el.removeAttribute('hidden');
        else el.setAttribute('hidden', '');
    });
    scope.querySelectorAll('.studio-prog-field-row__input--ja, .studio-prog-field-row__check.studio-prog-field-row__input--ja').forEach((el) => {
        if (lang === 'ja') el.removeAttribute('hidden');
        else el.setAttribute('hidden', '');
    });
    scope.querySelectorAll('[data-prog-translate-path]').forEach((btn) => {
        if (lang === 'en') btn.removeAttribute('hidden');
        else btn.setAttribute('hidden', '');
    });
}

/**
 * @param {HTMLElement} root Modal root
 */
export function bindProgramLangToggle(root) {
    root.querySelectorAll('.studio-prog-editor-lang-toggle').forEach((toggle) => {
        const panel = toggle.closest('[data-prog-panel]');
        if (!(panel instanceof HTMLElement)) return;

        const setLang = (lang) => {
            toggle.querySelectorAll('[data-prog-lang]').forEach((btn) => {
                const on = btn.getAttribute('data-prog-lang') === lang;
                btn.classList.toggle('is-active', on);
            });
            applyLangVisibility(panel, lang);
        };

        toggle.querySelectorAll('[data-prog-lang]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-prog-lang');
                if (lang === 'en' || lang === 'ja') setLang(lang);
            });
        });

        setLang('en');
    });
}

/**
 * @param {HTMLElement} container
 * @param {KeyDateRowSeed[]} rows
 * @param {(s: string) => string} escapeHtml
 */
function renderKeyDatesInto(container, rows, escapeHtml) {
    container.innerHTML = rows.map((row, i) => keyDateCardHtml(row, i, escapeHtml)).join('');
}

/**
 * @param {HTMLElement} root Modal root
 * @param {KeyDateRowSeed[]} seedRows
 * @param {(s: string) => string} escapeHtml
 */
export function bindProgramKeyDatesRepeater(root, seedRows, escapeHtml) {
    const container = root.querySelector('[data-prog-key-dates]');
    if (!(container instanceof HTMLElement)) return;

    /** @type {KeyDateRowSeed[]} */
    let rows = seedRows.length ? [...seedRows] : [emptyKeyDateRow()];

    const reread = () => {
        rows = [];
        container.querySelectorAll('.studio-prog-key-date-card').forEach((card) => {
            const kind = card.getAttribute('data-prog-key-date-kind') === 'section' ? 'section' : 'date';
            const enSectionEl = card.querySelector('[data-prog-key-date-field="en-section"]');
            const jaSectionEl = card.querySelector('[data-prog-key-date-field="ja-section"]');
            const enDateEl = card.querySelector('[data-prog-key-date-field="en-date"]');
            const enDescEl = card.querySelector('[data-prog-key-date-field="en-desc"]');
            const jaDateEl = card.querySelector('[data-prog-key-date-field="ja-date"]');
            const jaDescEl = card.querySelector('[data-prog-key-date-field="ja-desc"]');
            rows.push({
                kind,
                enSectionTitle: enSectionEl instanceof HTMLInputElement ? enSectionEl.value.trim() : '',
                jaSectionTitle: jaSectionEl instanceof HTMLInputElement ? jaSectionEl.value.trim() : '',
                enDate: enDateEl instanceof HTMLInputElement ? enDateEl.value.trim() : '',
                enDesc: enDescEl instanceof HTMLTextAreaElement ? enDescEl.value.trim() : '',
                jaDate: jaDateEl instanceof HTMLInputElement ? jaDateEl.value.trim() : '',
                jaDesc: jaDescEl instanceof HTMLTextAreaElement ? jaDescEl.value.trim() : '',
            });
        });
    };

    const paint = () => {
        renderKeyDatesInto(container, rows, escapeHtml);
        wireCardButtons();
    };

    const wireCardButtons = () => {
        container.querySelectorAll('[data-prog-key-date-remove]').forEach((btn) => {
            btn.addEventListener('click', () => {
                reread();
                const card = btn.closest('.studio-prog-key-date-card');
                const idx = Number(card?.getAttribute('data-prog-key-date-index') ?? -1);
                if (idx >= 0) rows.splice(idx, 1);
                if (!rows.length) rows.push(emptyKeyDateRow());
                paint();
            });
        });
    };

    root.querySelector('[data-prog-key-dates-add]')?.addEventListener('click', () => {
        reread();
        rows.push(emptyKeyDateRow());
        paint();
    });

    root.querySelector('[data-prog-key-dates-add-section]')?.addEventListener('click', () => {
        reread();
        rows.push(emptyKeyDateSectionRow());
        paint();
    });

    paint();
}

/**
 * @param {KeyDateRowSeed | { kind?: string, enDate?: string, enDesc?: string, jaDate?: string, jaDesc?: string, enSectionTitle?: string, jaSectionTitle?: string }} row
 */
export function keyDateRowIsEmpty(row) {
    if (row.kind === 'section') {
        return !row.enSectionTitle && !row.jaSectionTitle;
    }
    return !row.enDate && !row.enDesc && !row.jaDate && !row.jaDesc;
}

/**
 * @param {KeyDateRowSeed[]} rows
 * @returns {{ en: Array<{ date?: string, description?: string, sectionTitle?: string }>, ja: Array<{ date?: string, description?: string, sectionTitle?: string }> }}
 */
export function buildKeyDatesLocalesFromRows(rows) {
    /** @type {Array<{ date?: string, description?: string, sectionTitle?: string }>} */
    const en = [];
    /** @type {Array<{ date?: string, description?: string, sectionTitle?: string }>} */
    const ja = [];
    for (const row of rows) {
        if (keyDateRowIsEmpty(row)) continue;
        if (row.kind === 'section') {
            en.push({ sectionTitle: row.enSectionTitle });
            ja.push({ sectionTitle: row.jaSectionTitle });
        } else {
            en.push({ date: row.enDate, description: row.enDesc });
            ja.push({ date: row.jaDate, description: row.jaDesc });
        }
    }
    return { en, ja };
}

/**
 * @param {HTMLElement} root
 * @returns {{ en: Array<{ date: string, description: string }>, ja: Array<{ date: string, description: string }> }}
 */
export function collectKeyDatesFromRepeater(root) {
    const container = root.querySelector('[data-prog-key-dates]');
    if (!container) return { en: [], ja: [] };

    /** @type {KeyDateRowSeed[]} */
    const rows = [];
    container.querySelectorAll('.studio-prog-key-date-card').forEach((card) => {
        const kind = card.getAttribute('data-prog-key-date-kind') === 'section' ? 'section' : 'date';
        const enSectionEl = card.querySelector('[data-prog-key-date-field="en-section"]');
        const jaSectionEl = card.querySelector('[data-prog-key-date-field="ja-section"]');
        const enDateEl = card.querySelector('[data-prog-key-date-field="en-date"]');
        const enDescEl = card.querySelector('[data-prog-key-date-field="en-desc"]');
        const jaDateEl = card.querySelector('[data-prog-key-date-field="ja-date"]');
        const jaDescEl = card.querySelector('[data-prog-key-date-field="ja-desc"]');
        rows.push({
            kind,
            enSectionTitle: enSectionEl instanceof HTMLInputElement ? enSectionEl.value.trim() : '',
            jaSectionTitle: jaSectionEl instanceof HTMLInputElement ? jaSectionEl.value.trim() : '',
            enDate: enDateEl instanceof HTMLInputElement ? enDateEl.value.trim() : '',
            enDesc: enDescEl instanceof HTMLTextAreaElement ? enDescEl.value.trim() : '',
            jaDate: jaDateEl instanceof HTMLInputElement ? jaDateEl.value.trim() : '',
            jaDesc: jaDescEl instanceof HTMLTextAreaElement ? jaDescEl.value.trim() : '',
        });
    });
    return buildKeyDatesLocalesFromRows(rows);
}

/**
 * @param {HTMLElement} scope
 * @param {(text: string) => Promise<string>} translateFn
 */
async function translateTranslatableInScope(scope, translateFn) {
    const enFields = scope.querySelectorAll('[data-prog-locale="en"][data-prog-translatable="1"]');
    for (const enEl of enFields) {
        if (!(enEl instanceof HTMLInputElement || enEl instanceof HTMLTextAreaElement)) continue;
        const path = enEl.getAttribute('data-prog-path');
        let jaEl = null;
        if (path) {
            jaEl = scope.querySelector(`[data-prog-locale="ja"][data-prog-path="${CSS.escape(path)}"]`);
        }
        if (!(jaEl instanceof HTMLInputElement || jaEl instanceof HTMLTextAreaElement)) continue;
        const src = enEl.value.trim();
        if (!src) continue;
        jaEl.value = String(await translateFn(src)).trim();
    }

    for (const card of scope.querySelectorAll('.studio-prog-key-date-card')) {
        const enSection = card.querySelector('[data-prog-key-date-field="en-section"]');
        const jaSection = card.querySelector('[data-prog-key-date-field="ja-section"]');
        const enDate = card.querySelector('[data-prog-key-date-field="en-date"]');
        const jaDate = card.querySelector('[data-prog-key-date-field="ja-date"]');
        const enDesc = card.querySelector('[data-prog-key-date-field="en-desc"]');
        const jaDesc = card.querySelector('[data-prog-key-date-field="ja-desc"]');
        if (enSection instanceof HTMLInputElement && jaSection instanceof HTMLInputElement) {
            const src = enSection.value.trim();
            if (src) jaSection.value = String(await translateFn(src)).trim();
        }
        if (enDate instanceof HTMLInputElement && jaDate instanceof HTMLInputElement) {
            const src = enDate.value.trim();
            if (src) jaDate.value = String(await translateFn(src)).trim();
        }
        if (enDesc instanceof HTMLTextAreaElement && jaDesc instanceof HTMLTextAreaElement) {
            const src = enDesc.value.trim();
            if (src) jaDesc.value = String(await translateFn(src)).trim();
        }
    }
}

/**
 * @param {HTMLElement} root
 * @param {(text: string) => Promise<string>} translateFn
 * @param {{ setStatus?: (msg: string) => void }} [opts]
 */
export function bindProgramLocaleTranslate(root, translateFn, opts = {}) {
    const setStatus = typeof opts.setStatus === 'function' ? opts.setStatus : () => {};
    const localeForm = root.querySelector('.studio-prog-locale-form');
    if (!localeForm) return;

    /**
     * @param {HTMLElement} scope
     */
    const runTranslate = async (scope) => {
        setStatus('Translating…');
        try {
            await translateTranslatableInScope(scope, translateFn);
            setStatus('Translation complete.');
        } catch (e) {
            setStatus(e instanceof Error ? e.message : String(e));
        }
    };

    root.querySelector('#studio-prog-translate-all')?.addEventListener('click', async () => {
        const btn = root.querySelector('#studio-prog-translate-all');
        if (btn instanceof HTMLButtonElement) btn.disabled = true;
        try {
            await runTranslate(/** @type {HTMLElement} */ (localeForm));
        } finally {
            if (btn instanceof HTMLButtonElement) btn.disabled = false;
        }
    });

    root.querySelector('#studio-prog-translate-tab')?.addEventListener('click', async () => {
        const active = localeForm.querySelector('.studio-prog-tab-panel:not([hidden])');
        if (!(active instanceof HTMLElement)) return;
        const btn = root.querySelector('#studio-prog-translate-tab');
        if (btn instanceof HTMLButtonElement) btn.disabled = true;
        try {
            await runTranslate(active);
        } finally {
            if (btn instanceof HTMLButtonElement) btn.disabled = false;
        }
    });

    localeForm.querySelectorAll('[data-prog-translate-section="keyDates"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const section = btn.closest('[data-prog-panel]') || localeForm;
            const keyDates = section.querySelector('[data-prog-key-dates]');
            if (!(keyDates instanceof HTMLElement)) return;
            if (btn instanceof HTMLButtonElement) btn.disabled = true;
            setStatus('Translating key dates…');
            try {
                await translateTranslatableInScope(keyDates, translateFn);
                setStatus('Key dates translated.');
            } catch (e) {
                setStatus(e instanceof Error ? e.message : String(e));
            } finally {
                if (btn instanceof HTMLButtonElement) btn.disabled = false;
            }
        });
    });

    localeForm.addEventListener('click', async (ev) => {
        const target = ev.target;
        if (!(target instanceof HTMLElement)) return;

        const pathBtn = target.closest('[data-prog-translate-path]');
        if (pathBtn instanceof HTMLButtonElement) {
            const path = pathBtn.getAttribute('data-prog-translate-path');
            if (!path) return;
            const row = pathBtn.closest('.studio-prog-field-row, .studio-prog-key-date-card');
            if (!row) return;
            const enEl = row.querySelector(`[data-prog-locale="en"][data-prog-path="${CSS.escape(path)}"]`);
            const jaEl = row.querySelector(`[data-prog-locale="ja"][data-prog-path="${CSS.escape(path)}"]`);
            if (!(enEl instanceof HTMLInputElement || enEl instanceof HTMLTextAreaElement)) return;
            if (!(jaEl instanceof HTMLInputElement || jaEl instanceof HTMLTextAreaElement)) return;
            const src = enEl.value.trim();
            if (!src) return;
            pathBtn.disabled = true;
            try {
                jaEl.value = String(await translateFn(src)).trim();
                setStatus('Field translated.');
            } catch (e) {
                setStatus(e instanceof Error ? e.message : String(e));
            } finally {
                pathBtn.disabled = false;
            }
            return;
        }

        const keyDateBtn = target.closest('[data-prog-key-date-translate]');
        if (keyDateBtn instanceof HTMLButtonElement) {
            const card = keyDateBtn.closest('.studio-prog-key-date-card');
            if (!(card instanceof HTMLElement)) return;
            keyDateBtn.disabled = true;
            setStatus('Translating…');
            try {
                await translateTranslatableInScope(card, translateFn);
                setStatus('Key date translated.');
            } catch (e) {
                setStatus(e instanceof Error ? e.message : String(e));
            } finally {
                keyDateBtn.disabled = false;
            }
        }
    });
}

/**
 * @param {HTMLElement} root
 * @returns {{ en: Record<string, unknown>, ja: Record<string, unknown> }}
 */
export function collectProgramLocalesFromForm(root) {
    /** @type {Record<string, unknown>} */
    const en = {};
    /** @type {Record<string, unknown>} */
    const ja = {};

    const targets = { en, ja };

    root.querySelectorAll('[data-prog-locale][data-prog-path]').forEach((el) => {
        if (el.closest('[data-prog-key-dates]')) return;
        const loc = el.getAttribute('data-prog-locale');
        const path = el.getAttribute('data-prog-path');
        const kind = el.getAttribute('data-prog-kind') || '';
        if (!loc || !path || !(loc === 'en' || loc === 'ja')) return;
        const t = targets[loc];

        if (el instanceof HTMLInputElement && el.type === 'checkbox') {
            deepSet(t, path, el.checked);
            return;
        }
        const raw = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value : '';
        if (kind === 'lines') {
            deepSet(t, path, linesToArray(raw));
            return;
        }
        if (kind === 'json') {
            const s = String(raw).trim();
            if (!s) {
                deepSet(t, path, []);
                return;
            }
            try {
                deepSet(t, path, JSON.parse(s));
            } catch (e) {
                throw new Error(
                    `Refund policy JSON (${loc}) is invalid: ${e instanceof Error ? e.message : String(e)}`,
                );
            }
            return;
        }
        if (el instanceof HTMLInputElement && el.type === 'number') {
            const n = parseInt(String(raw).trim(), 10);
            deepSet(t, path, Number.isFinite(n) ? n : 0);
            return;
        }
        deepSet(t, path, raw);
    });

    const keyDates = collectKeyDatesFromRepeater(root);
    deepSet(en, 'programPage.programDetails.keyDates', keyDates.en);
    deepSet(ja, 'programPage.programDetails.keyDates', keyDates.ja);

    const fade = [];
    for (let i = 0; i < FADE_GALLERY_MAX_IMAGES; i++) {
        const el = root.querySelector(`.studio-prog-fade-url[data-fade-slot="${i}"]`);
        const v = el instanceof HTMLInputElement ? el.value.trim() : '';
        if (v) fade.push(v);
    }
    deepSet(en, 'programPage.fadeGalleryImages', fade);
    deepSet(ja, 'programPage.fadeGalleryImages', fade);

    const durEl = root.querySelector('.studio-prog-fade-duration');
    let durSec = 3;
    if (durEl instanceof HTMLInputElement) {
        const n = parseFloat(String(durEl.value).trim());
        durSec = Number.isFinite(n) ? Math.min(120, Math.max(0.5, n)) : 3;
    }
    deepSet(en, 'programPage.fadeGalleryDurationSec', durSec);
    deepSet(ja, 'programPage.fadeGalleryDurationSec', durSec);

    const strip = [];
    for (let i = 0; i < STRIP_GALLERY_MAX_IMAGES; i++) {
        const el = root.querySelector(`.studio-prog-strip-url[data-strip-slot="${i}"]`);
        const v = el instanceof HTMLInputElement ? el.value.trim() : '';
        if (v) strip.push(v);
    }
    deepSet(en, 'programPage.stripGalleryImages', strip);
    deepSet(ja, 'programPage.stripGalleryImages', strip);

    return { en, ja };
}

/**
 * @param {HTMLElement | null} formRoot
 */
export function bindStudioProgGalleryUrlPreviews(formRoot) {
    if (!formRoot) return;

    /** @param {HTMLInputElement} input */
    const syncInput = (input) => {
        const row = input.closest('.studio-prog-fade-row, .studio-prog-strip-row');
        const wrap = row?.querySelector('.studio-prog-url-preview-wrap');
        const img = row?.querySelector('.studio-prog-url-preview');
        if (!(wrap instanceof HTMLElement) || !(img instanceof HTMLImageElement)) return;
        const v = input.value.trim();
        if (!v) {
            wrap.hidden = true;
            img.removeAttribute('src');
            return;
        }
        const cleanup = () => {
            img.onload = null;
            img.onerror = null;
        };
        img.onload = () => {
            cleanup();
            wrap.hidden = false;
        };
        img.onerror = () => {
            cleanup();
            wrap.hidden = true;
            img.removeAttribute('src');
        };
        img.src = v;
        if (img.complete) {
            if (img.naturalWidth > 0) {
                cleanup();
                wrap.hidden = false;
            } else {
                cleanup();
                wrap.hidden = true;
                img.removeAttribute('src');
            }
        }
    };

    formRoot.querySelectorAll('.studio-prog-fade-url, .studio-prog-strip-url').forEach((el) => {
        if (!(el instanceof HTMLInputElement)) return;
        syncInput(el);
        el.addEventListener('input', () => syncInput(el));
    });
}
