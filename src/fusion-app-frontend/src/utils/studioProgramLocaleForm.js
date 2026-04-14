/**
 * Studio Programs modal: structured EN/JA grid for program card + programPage locales
 * (replaces raw JSON textareas).
 */

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

const OFFERING_COUNT = 3;
const FACILITY_ROWS = 15;
const LOCATION_ROWS = 3;
const KEY_DATE_ROWS = 6;
const FAQ_ROWS = 16;

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
    for (let i = 0; i < KEY_DATE_ROWS; i++) {
        html += `<p class="studio-prog-card-slot">Key date ${i + 1}</p>`;
        html += row2(escapeHtml, 'Date', `programPage.programDetails.keyDates.${i}.date`, en, ja);
        html += row2(escapeHtml, 'Description', `programPage.programDetails.keyDates.${i}.description`, en, ja, 'textarea');
    }
    html += `</details>

  <details class="studio-prog-details">
    <summary class="studio-prog-subhead">FAQ &amp; notes</summary>
`;
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

    return { en, ja };
}
