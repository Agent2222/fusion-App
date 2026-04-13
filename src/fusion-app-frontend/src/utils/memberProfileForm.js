/**
 * Serialize / deserialize member profile settings form ↔ locales JSON + world normalization.
 */
import { normalizeLocalesWorldForStorage } from './worldNormalize.js';

/** @param {unknown} raw */
export function worldFieldToTextarea(raw) {
    if (raw == null) return '';
    if (Array.isArray(raw)) return raw.join('\n\n');
    return String(raw);
}

/** @param {string} text */
export function textareaToWorldArray(text) {
    const t = text.trim();
    if (!t) return [];
    return t
        .split(/\n\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * @param {Record<string, unknown>} locales
 * @param {string} code
 */
export function localeBlock(locales, code) {
    const L = locales && typeof locales === 'object' ? locales : {};
    const b = L[code];
    return b && typeof b === 'object' && !Array.isArray(b) ? b : {};
}

/**
 * @param {unknown} world
 * @returns {{ src: string, alt: string, caption: string }[]}
 */
export function introSlotsFromWorld(world) {
    const w = world && typeof world === 'object' && !Array.isArray(world) ? world : {};
    const raw = w.introGallery;
    const arr = Array.isArray(raw) ? raw : [];
    const slots = [];
    for (let i = 0; i < 3; i++) {
        const item = arr[i];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
            slots.push({
                src: String(item.src ?? ''),
                alt: String(item.alt ?? ''),
                caption: item.caption != null ? String(item.caption) : '',
            });
        } else if (typeof item === 'string') {
            slots.push({ src: item, alt: '', caption: '' });
        } else {
            slots.push({ src: '', alt: '', caption: '' });
        }
    }
    return slots;
}

/**
 * @param {{ src: string, alt: string, caption: string }[]} slots
 * @returns {unknown[]}
 */
export function introSlotsToGallery(slots) {
    const out = [];
    for (const s of slots) {
        const src = String(s.src ?? '').trim();
        if (!src) continue;
        const o = { src };
        const alt = String(s.alt ?? '').trim();
        if (alt) o.alt = alt;
        const cap = String(s.caption ?? '').trim();
        if (cap) o.caption = cap;
        out.push(o);
        if (out.length >= 3) break;
    }
    return out;
}

/**
 * @param {string} containerSel
 * @returns {object[]}
 */
export function readLinksFromContainer(containerSel) {
    const root =
        typeof document !== 'undefined' ? document.querySelector(containerSel) : null;
    if (!root) return [];
    const rows = root.querySelectorAll('.mpd-link-row');
    const out = [];
    for (const row of rows) {
        const typeEl = row.querySelector('.mpd-link-type');
        const urlEl = row.querySelector('.mpd-link-url');
        const labelEl = row.querySelector('.mpd-link-label');
        const url = urlEl && 'value' in urlEl ? String(urlEl.value ?? '').trim() : '';
        if (!url) continue;
        const type = typeEl && 'value' in typeEl ? String(typeEl.value ?? '').trim() : 'other';
        const label = labelEl && 'value' in labelEl ? String(labelEl.value ?? '').trim() : '';
        out.push({
            type: type || 'other',
            url,
            label: label || url,
        });
    }
    return out;
}

/**
 * Merge active locale from DOM into a copy of `prev` (other locale unchanged).
 * @param {Record<string, unknown>} prev
 * @param {'en'|'ja'} active
 * @param {(id: string) => string | undefined} val - getElementById value
 */
export function readLocalesFromDom(prev, active, val) {
    const out = JSON.parse(JSON.stringify(prev && typeof prev === 'object' ? prev : { en: {}, ja: {} }));
    const pb = localeBlock(out, active);
    /** @type {Record<string, unknown>} */
    const nb = { ...pb };
    nb.name = val('mpd_name') ?? '';
    nb.discipline = val('mpd_discipline') ?? '';
    nb.bio = val('mpd_bio') ?? '';
    nb.bioLong = val('mpd_bioLong') ?? '';
    nb.status = val('mpd_status') ?? '';
    nb.location = {
        city: val('mpd_loc_city') ?? '',
        state: val('mpd_loc_state') ?? '',
        country: val('mpd_loc_country') ?? '',
        display: val('mpd_loc_display') ?? '',
    };
    nb.seo = {
        title: val('mpd_seo_title') ?? '',
        description: val('mpd_seo_desc') ?? '',
    };
    const w0 =
        nb.world && typeof nb.world === 'object' && !Array.isArray(nb.world) ? nb.world : {};
    /** @type {Record<string, unknown>} */
    const w = { ...w0 };
    w.practice = val('mpd_w_practice') ?? '';
    w.perspective = textareaToWorldArray(val('mpd_w_perspective') ?? '');
    w.vision = textareaToWorldArray(val('mpd_w_vision') ?? '');
    w.constructing = textareaToWorldArray(val('mpd_w_constructing') ?? '');
    w.context = textareaToWorldArray(val('mpd_w_context') ?? '');
    w.quote = val('mpd_w_quote') ?? '';
    const slots = [];
    for (let i = 0; i < 3; i++) {
        slots.push({
            src: val(`mpd_intro_${i}_src`) ?? '',
            alt: val(`mpd_intro_${i}_alt`) ?? '',
            caption: val(`mpd_intro_${i}_caption`) ?? '',
        });
    }
    w.introGallery = introSlotsToGallery(slots);
    nb.world = w;
    nb.links = readLinksFromContainer('#mpd-links');
    out[active] = nb;
    return normalizeLocalesWorldForStorage(/** @type {Record<string, unknown>} */ (out));
}

/**
 * Copy EN intro gallery to JA in locales object.
 * @param {Record<string, unknown>} locales
 */
export function copyIntroGalleryEnToJa(locales) {
    const out = JSON.parse(JSON.stringify(locales && typeof locales === 'object' ? locales : {}));
    const en = localeBlock(out, 'en');
    const ja = localeBlock(out, 'ja');
    const enW = en.world && typeof en.world === 'object' && !Array.isArray(en.world) ? en.world : {};
    const jaW = ja.world && typeof ja.world === 'object' && !Array.isArray(ja.world) ? ja.world : {};
    const ig = enW.introGallery;
    ja.world = {
        ...jaW,
        introGallery: Array.isArray(ig) ? JSON.parse(JSON.stringify(ig)) : [],
    };
    out.ja = { ...ja, world: ja.world };
    return out;
}

/**
 * @param {unknown} v
 * @returns {string}
 */
export function safeJsonStringify(v) {
    try {
        return JSON.stringify(v, null, 2);
    } catch {
        return '';
    }
}
