/**
 * Studio Programs modal: structured EN/JA grid for program card + programPage locales
 * (replaces raw JSON textareas).
 */

import { withSeoImageAlt } from './mediaAltSeo.js';

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

/**
 * @param {(s: string) => string} escapeHtml
 * @param {string} label
 * @param {string} path full path from locale root (en/ja)
 * @param {unknown} enRoot
 * @param {unknown} jaRoot
 * @param {'text' | 'textarea' | 'number' | 'checkbox'} [kind]
 */
function row2(escapeHtml, label, path, enRoot, jaRoot, kind = 'text') {
    const enV = deepGet(enRoot, path);
    const jaV = deepGet(jaRoot, path);
    if (kind === 'checkbox') {
        const cEn = enV === true;
        const cJa = jaV === true;
        return `<div class="studio-prog-grid-row studio-prog-grid-row--check">
      <span class="studio-prog-grid-label">${esc(escapeHtml, label)}</span>
      <label class="studio-prog-grid-cell"><input type="checkbox" data-prog-locale="en" data-prog-path="${esc(escapeHtml, path)}" ${cEn ? 'checked' : ''} /></label>
      <label class="studio-prog-grid-cell"><input type="checkbox" data-prog-locale="ja" data-prog-path="${esc(escapeHtml, path)}" ${cJa ? 'checked' : ''} /></label>
    </div>`;
    }
    if (kind === 'textarea') {
        return `<div class="studio-prog-grid-row studio-prog-grid-row--textarea">
      <span class="studio-prog-grid-label">${esc(escapeHtml, label)}</span>
      <textarea class="studio-textarea studio-prog-grid-input" rows="4" data-prog-locale="en" data-prog-path="${esc(escapeHtml, path)}" spellcheck="true">${esc(escapeHtml, enV ?? '')}</textarea>
      <textarea class="studio-textarea studio-prog-grid-input" rows="4" data-prog-locale="ja" data-prog-path="${esc(escapeHtml, path)}" spellcheck="true">${esc(escapeHtml, jaV ?? '')}</textarea>
    </div>`;
    }
    const type = kind === 'number' ? 'number' : 'text';
    const enAttr = esc(escapeHtml, enV ?? '');
    const jaAttr = esc(escapeHtml, jaV ?? '');
    return `<div class="studio-prog-grid-row">
      <span class="studio-prog-grid-label">${esc(escapeHtml, label)}</span>
      <input type="${type}" class="studio-input studio-prog-grid-input" value="${enAttr}" data-prog-locale="en" data-prog-path="${esc(escapeHtml, path)}" />
      <input type="${type}" class="studio-input studio-prog-grid-input" value="${jaAttr}" data-prog-locale="ja" data-prog-path="${esc(escapeHtml, path)}" />
    </div>`;
}

/**
 * Gallery / string list — one textarea per locale (newline-separated URLs).
 * @param {(s: string) => string} escapeHtml
 */
function rowLines2(escapeHtml, label, path, enRoot, jaRoot) {
    const enV = deepGet(enRoot, path);
    const jaV = deepGet(jaRoot, path);
    return `<div class="studio-prog-grid-row studio-prog-grid-row--textarea">
      <span class="studio-prog-grid-label">${esc(escapeHtml, label)}</span>
      <textarea class="studio-textarea studio-prog-grid-input" rows="3" data-prog-locale="en" data-prog-path="${esc(escapeHtml, path)}" data-prog-kind="lines" spellcheck="false">${esc(escapeHtml, arrayToLines(enV))}</textarea>
      <textarea class="studio-textarea studio-prog-grid-input" rows="3" data-prog-locale="ja" data-prog-path="${esc(escapeHtml, path)}" data-prog-kind="lines" spellcheck="false">${esc(escapeHtml, arrayToLines(jaV))}</textarea>
    </div>`;
}

const FADE_GALLERY_MAX_IMAGES = 10;
const STRIP_GALLERY_MAX_IMAGES = 20;

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
 * @returns {string}
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

const OFFERING_COUNT = 3;
const FACILITY_ROWS = 15;
const LOCATION_ROWS = 3;
const KEY_DATE_ROWS = 6;
const FAQ_ROWS = 16;
const RESIDENCE_ROWS = 5;
const INCLUDED_ROWS = 10;
const NOT_INCLUDED_ROWS = 5;

/**
 * @param {(s: string) => string} escapeHtml
 * @param {unknown} enRaw
 * @param {unknown} jaRaw
 * @returns {string}
 */
export function renderProgramLocaleFormHtml(escapeHtml, enRaw, jaRaw) {
    const en = asObj(enRaw);
    const ja = asObj(jaRaw);

    let html = `
<div class="studio-prog-locale-form">
  <div class="studio-prog-col-headers" aria-hidden="true">
    <span class="studio-prog-grid-label"></span>
    <span class="studio-prog-col-title">English</span>
    <span class="studio-prog-col-title">日本語</span>
  </div>
  <h4 class="studio-prog-subhead">Program card</h4>
  ${row2(escapeHtml, 'Card id', 'id', en, ja)}
  ${row2(escapeHtml, 'imageSrc (card / list)', 'imageSrc', en, ja)}
  ${row2(escapeHtml, 'Hero / view media URL (detail page)', 'heroMediaSrc', en, ja)}
  ${row2(escapeHtml, 'Lightbox video URL (fullscreen on hero tap; sound on)', 'programPage.lightboxHeroSrc', en, ja)}
  ${row2(escapeHtml, 'focus', 'focus', en, ja)}
  ${row2(escapeHtml, 'imageAlt', 'imageAlt', en, ja)}
  ${row2(escapeHtml, 'location', 'location', en, ja)}
  ${row2(escapeHtml, 'startDate', 'startDate', en, ja)}
  ${row2(escapeHtml, 'endDate', 'endDate', en, ja)}
  ${row2(escapeHtml, 'year', 'year', en, ja)}
  ${row2(escapeHtml, 'totalSlots', 'totalSlots', en, ja, 'number')}
  ${row2(escapeHtml, 'availableSlots', 'availableSlots', en, ja, 'number')}
  ${row2(escapeHtml, 'acceptingApplications', 'acceptingApplications', en, ja, 'checkbox')}
  ${row2(escapeHtml, 'briefDescription', 'briefDescription', en, ja, 'textarea')}
  ${row2(escapeHtml, 'routeLink', 'routeLink', en, ja)}

  <details class="studio-prog-details" open>
    <summary class="studio-prog-subhead">Program page — hero &amp; offerings</summary>
    ${row2(escapeHtml, 'Headline', 'programPage.headline', en, ja)}
    ${row2(escapeHtml, 'Subheadline', 'programPage.subheadline', en, ja)}
    ${row2(escapeHtml, 'Description', 'programPage.description', en, ja, 'textarea')}
    ${row2(escapeHtml, 'Offering headline', 'programPage.offeringHeadline', en, ja)}
`;

    for (let i = 0; i < OFFERING_COUNT; i++) {
        html += `<p class="studio-prog-card-slot">Offering ${i + 1}</p>`;
        html += row2(escapeHtml, 'Title', `programPage.offeringCards.${i}.title`, en, ja);
        html += row2(escapeHtml, 'Description', `programPage.offeringCards.${i}.description`, en, ja, 'textarea');
        html += rowLines2(escapeHtml, 'Gallery URLs (one per line)', `programPage.offeringCards.${i}.gallery`, en, ja);
    }

    html += `
    ${row2(escapeHtml, 'Confirmed headline', 'programPage.confirmedHeadline', en, ja)}
    ${rowLines2(escapeHtml, 'Confirmed artists (one per line)', 'programPage.confirmedArtists', en, ja)}
    ${row2(escapeHtml, 'Details headline', 'programPage.detailsHeadline', en, ja)}
  </details>

  <details class="studio-prog-details" open>
    <summary class="studio-prog-subhead">Program page — fade gallery</summary>
    <p class="studio-modal-hint">Up to ten images on the program detail page (5:4 frame). Set how long each image stays, then add URLs (shared for EN/JA). Slides fade through the site background; click the gallery to advance and restart the timer.</p>
    <div class="studio-prog-fade-duration-row">
      <label class="studio-field">
        <span class="studio-muted">Seconds each image stays visible</span>
        <input type="number" class="studio-input studio-prog-fade-duration" min="0.5" max="120" step="0.5" value="${esc(escapeHtml, getFadeGalleryDurationSeed(en, ja))}" />
      </label>
    </div>
    <div class="studio-prog-image-grid studio-prog-fade-grid">`;
    const fadeSeed = getFadeGallerySeed(en, ja);
    for (let i = 0; i < FADE_GALLERY_MAX_IMAGES; i++) {
        html += `<div class="studio-prog-image-slot studio-prog-fade-row">
      <span class="studio-prog-image-slot__label">Image ${i + 1}</span>
      <div class="studio-prog-image-slot__row">
        <span class="studio-prog-url-preview-wrap" hidden><img class="studio-prog-url-preview" alt="${esc(escapeHtml, withSeoImageAlt('Fade gallery URL preview'))}" loading="lazy" decoding="async" /></span>
        <input type="text" class="studio-input studio-prog-fade-url" data-fade-slot="${i}" value="${esc(escapeHtml, fadeSeed[i] || '')}" placeholder="Image URL" autocomplete="off" />
        <label class="studio-file-label studio-btn-ghost studio-field--shrink"><input type="file" class="studio-file-input studio-prog-fade-file" data-fade-slot="${i}" accept="image/*" />Upload</label>
      </div>
    </div>`;
    }
    html += `
    </div>
  </details>

  <details class="studio-prog-details" open>
    <summary class="studio-prog-subhead">Program page — strip gallery</summary>
    <p class="studio-modal-hint">Up to twenty images: large main image with a vertical thumbnail strip (~200px) on desktop. URLs are shared for EN/JA. Click a thumbnail on the program page to change the main image.</p>
    <div class="studio-prog-image-grid studio-prog-strip-grid">`;
    const stripSeed = getStripGallerySeed(en, ja);
    for (let i = 0; i < STRIP_GALLERY_MAX_IMAGES; i++) {
        html += `<div class="studio-prog-image-slot studio-prog-strip-row">
      <span class="studio-prog-image-slot__label">Image ${i + 1}</span>
      <div class="studio-prog-image-slot__row">
        <span class="studio-prog-url-preview-wrap" hidden><img class="studio-prog-url-preview" alt="${esc(escapeHtml, withSeoImageAlt('Strip gallery URL preview'))}" loading="lazy" decoding="async" /></span>
        <input type="text" class="studio-input studio-prog-strip-url" data-strip-slot="${i}" value="${esc(escapeHtml, stripSeed[i] || '')}" placeholder="Image URL" autocomplete="off" />
        <label class="studio-file-label studio-btn-ghost studio-field--shrink"><input type="file" class="studio-file-input studio-prog-strip-file" data-strip-slot="${i}" accept="image/*" />Upload</label>
      </div>
    </div>`;
    }
    html += `
    </div>
  </details>

  <details class="studio-prog-details">
    <summary class="studio-prog-subhead">Program details — facilities, costs, dates</summary>
`;
    for (let i = 0; i < LOCATION_ROWS; i++) {
        html += `<p class="studio-prog-card-slot">Location ${i + 1}</p>`;
        html += row2(escapeHtml, 'Label', `programPage.programDetails.locations.${i}`, en, ja);
    }
    for (let i = 0; i < FACILITY_ROWS; i++) {
        html += `<p class="studio-prog-card-slot">Facility ${i + 1}</p>`;
        html += row2(escapeHtml, 'Line', `programPage.programDetails.facilityList.${i}`, en, ja);
    }
    html += row2(escapeHtml, 'Cost — base', 'programPage.programDetails.costs.base', en, ja);
    html += row2(escapeHtml, 'Cost — additional', 'programPage.programDetails.costs.additional', en, ja);
    html += row2(
        escapeHtml,
        'Cost — application fee (sidebar line under cost)',
        'programPage.programDetails.costs.applicationFee',
        en,
        ja,
        'textarea'
    );
    html += row2(escapeHtml, 'Cost — remaining balance (display)', 'programPage.programDetails.costs.remainingBalance', en, ja);
    html += row2(
        escapeHtml,
        'Cost — Japan discount / residency notice (public site: Japanese locale only)',
        'programPage.programDetails.costs.japanResidencyDiscountNotice',
        en,
        ja,
        'textarea'
    );
    html += `<p class="studio-modal-hint">Deposit for the public sidebar is edited under <strong>Application form</strong> below — <code>programPage.applicationForm.depositAmountDisplay</code> (one source of truth). Optional <strong>Application deadline (ISO)</strong> in that section improves payment-plan month options.</p>`;
    for (let i = 0; i < KEY_DATE_ROWS; i++) {
        html += `<p class="studio-prog-card-slot">Key date ${i + 1}</p>`;
        html += row2(escapeHtml, 'Date', `programPage.programDetails.keyDates.${i}.date`, en, ja);
        html += row2(escapeHtml, 'Description', `programPage.programDetails.keyDates.${i}.description`, en, ja, 'textarea');
    }
    html += `<h4 class="studio-prog-subhead studio-prog-subhead--nested">Sidebar — residence (link in program view)</h4>`;
    html += `<p class="studio-modal-hint">Up to 5. Name appears in the sidebar; link opens the residence page (use in-app paths like /profile/slug or full URLs).</p>`;
    for (let i = 0; i < RESIDENCE_ROWS; i++) {
        html += `<p class="studio-prog-card-slot">Residence ${i + 1}</p>`;
        html += row2(escapeHtml, 'Name', `programPage.programDetails.residences.${i}.name`, en, ja);
        html += row2(escapeHtml, 'Link (href)', `programPage.programDetails.residences.${i}.href`, en, ja);
    }
    html += `<h4 class="studio-prog-subhead studio-prog-subhead--nested">Sidebar — Included / Not included / Platform</h4>`;
    for (let i = 0; i < INCLUDED_ROWS; i++) {
        html += row2(escapeHtml, `Included ${i + 1}`, `programPage.programDetails.included.${i}`, en, ja);
    }
    for (let i = 0; i < NOT_INCLUDED_ROWS; i++) {
        html += row2(escapeHtml, `Not included ${i + 1}`, `programPage.programDetails.notIncluded.${i}`, en, ja);
    }
    html += row2(escapeHtml, 'Platform', 'programPage.programDetails.platform', en, ja, 'textarea');
    html += `</details>

  <details class="studio-prog-details">
    <summary class="studio-prog-subhead">Application form (program page)</summary>
    <p class="studio-modal-hint">One-page apply: deposit line, deadline, optional italic notice under the fee, optional full override for the selection-process block at the top. Falls back to key dates (Application Deadline) when deadline is empty. <strong>Application fee amount (cents)</strong> is required for the &quot;Single application payment&quot; Stripe option (e.g. 5000 for $50.00). <strong>Application deadline (ISO)</strong> (YYYY-MM-DD) stabilizes the program-page payment-plan month dropdown.</p>`;
    html += row2(escapeHtml, 'Deposit amount (display)', 'programPage.applicationForm.depositAmountDisplay', en, ja);
    html += row2(escapeHtml, 'Application fee amount (cents, one-time payment)', 'programPage.applicationForm.applicationFeeAmountCents', en, ja);
    html += row2(escapeHtml, 'Application deadline (ISO, YYYY-MM-DD, optional)', 'programPage.applicationForm.applicationDeadlineIso', en, ja);
    html += row2(escapeHtml, 'Application deadline (display)', 'programPage.applicationForm.applicationDeadlineDisplay', en, ja);
    html += row2(
        escapeHtml,
        'Fee notice (italic, under application fee)',
        'programPage.applicationForm.feeNoticeItalic',
        en,
        ja,
        'textarea'
    );
    html += row2(
        escapeHtml,
        'Selection process block (override — optional)',
        'programPage.applicationForm.selectionProcessOverride',
        en,
        ja,
        'textarea'
    );
    html += `</details>

  <details class="studio-prog-details">
    <summary class="studio-prog-subhead">Payment option details (cards)</summary>
    <p class="studio-modal-hint">Copy for the one-page application form payment cards (per locale). The Stripe one-time amount still comes from <strong>Application fee amount (cents)</strong> above; display price can differ for marketing. Included bullets here are merged with global bullets from <strong>Studio → Services → Subscription</strong>.</p>`;
    const payPlans = /** @type {const} */ (['one_time', 'bimonthly', 'annual']);
    const payPlanLabel = { one_time: '1. Single payment', bimonthly: '2. Bimonthly subscription', annual: '3. Annual subscription' };
    for (const pk of payPlans) {
        html += `<p class="studio-prog-card-slot">${payPlanLabel[pk]}</p>`;
        html += row2(escapeHtml, 'Title', `programPage.applicationPaymentOptions.${pk}.title`, en, ja);
        html += row2(escapeHtml, 'Display price (card)', `programPage.applicationPaymentOptions.${pk}.displayPrice`, en, ja);
        html += row2(escapeHtml, 'Subtext line 1', `programPage.applicationPaymentOptions.${pk}.subtext`, en, ja, 'textarea');
        html += row2(escapeHtml, 'Subtext line 2', `programPage.applicationPaymentOptions.${pk}.subtext2`, en, ja, 'textarea');
        html += rowLines2(escapeHtml, 'Included bullets (one per line)', `programPage.applicationPaymentOptions.${pk}.includedBullets`, en, ja);
    }
    html += `</details>

  <details class="studio-prog-details">
    <summary class="studio-prog-subhead">FAQ &amp; notes</summary>
    <p class="studio-prog-card-slot">Application Fee (dropdown — appears before FAQ on program page)</p>
`;
    html += row2(
        escapeHtml,
        'Application Fee — body',
        'programPage.additionalInfo.applicationFee',
        en,
        ja,
        'textarea'
    );
    html += `<p class="studio-prog-card-slot">About Program (dropdown — before FAQ)</p>`;
    html += row2(
        escapeHtml,
        'About Program — body',
        'programPage.additionalInfo.aboutProgram',
        en,
        ja,
        'textarea'
    );
    for (let i = 0; i < FAQ_ROWS; i++) {
        html += `<p class="studio-prog-card-slot">FAQ ${i + 1}</p>`;
        html += row2(escapeHtml, 'Question', `programPage.additionalInfo.faq.${i}.question`, en, ja);
        html += row2(escapeHtml, 'Answer', `programPage.additionalInfo.faq.${i}.answer`, en, ja, 'textarea');
    }
    html += `<p class="studio-prog-card-slot">Program notes</p>`;
    html += row2(escapeHtml, 'Title', 'programPage.additionalInfo.programNotes.0.title', en, ja);
    html += row2(escapeHtml, 'Information', 'programPage.additionalInfo.programNotes.0.information', en, ja, 'textarea');
    const aiEn = asObj(en.programPage?.additionalInfo);
    const aiJa = asObj(ja.programPage?.additionalInfo);
    html += `</details>

  <details class="studio-prog-details">
    <summary class="studio-prog-subhead">Refund policy (advanced JSON)</summary>
    <p class="studio-modal-hint">Nested refund blocks use varied shapes. Edit as JSON per locale, or clear to omit.</p>
    <div class="studio-prog-grid-row studio-prog-grid-row--textarea">
      <span class="studio-prog-grid-label">refundPolicy</span>
      <textarea class="studio-textarea studio-prog-json-adv" rows="12" data-prog-locale="en" data-prog-path="programPage.additionalInfo.refundPolicy" data-prog-kind="json" spellcheck="false">${esc(
          escapeHtml,
          aiEn.refundPolicy != null ? JSON.stringify(aiEn.refundPolicy, null, 2) : ''
      )}</textarea>
      <textarea class="studio-textarea studio-prog-json-adv" rows="12" data-prog-locale="ja" data-prog-path="programPage.additionalInfo.refundPolicy" data-prog-kind="json" spellcheck="false">${esc(
          escapeHtml,
          aiJa.refundPolicy != null ? JSON.stringify(aiJa.refundPolicy, null, 2) : ''
      )}</textarea>
    </div>
  </details>
</div>`;
    return html;
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
                    `Refund policy JSON (${loc}) is invalid: ${e instanceof Error ? e.message : String(e)}`
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

    /** Shared EN/JA: `programPage.fadeGalleryImages` (max 10 URLs). */
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

    /** Shared EN/JA: `programPage.stripGalleryImages` (max 20 URLs). */
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
 * Fade + strip gallery rows: show a small thumbnail next to each URL when the URL loads (or hide on error / empty).
 * Call after the program Manage modal DOM is in the document.
 *
 * @param {HTMLElement | null} formRoot Container with `.studio-prog-fade-url` / `.studio-prog-strip-url` inputs
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
