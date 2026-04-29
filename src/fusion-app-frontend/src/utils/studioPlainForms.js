/**
 * Studio: plain-text editing helpers (no JSON shown to editors).
 */

import { getFieldKind } from './studioFieldRegistry.js';

/**
 * @param {unknown} v
 */
function deepCloneJson(v) {
    try {
        return JSON.parse(JSON.stringify(v));
    } catch {
        return v;
    }
}

/**
 * Collect every string leaf with a dotted path (e.g. en.0.title, joinNetwork.home.en.title).
 * @param {unknown} obj
 * @param {string} prefix
 * @returns {{ path: string, label: string, value: string }[]}
 */
export function flattenStringFields(obj, prefix = '') {
    const rows = [];
    if (obj === null || obj === undefined) return rows;
    if (typeof obj === 'string') {
        if (!prefix) return rows;
        rows.push({ path: prefix, label: humanizeContentPath(prefix), value: obj });
        return rows;
    }
    if (typeof obj !== 'object') return rows;
    if (Array.isArray(obj)) {
        obj.forEach((item, i) => {
            const p = prefix ? `${prefix}.${i}` : String(i);
            rows.push(...flattenStringFields(item, p));
        });
        return rows;
    }
    for (const k of Object.keys(obj)) {
        const p = prefix ? `${prefix}.${k}` : k;
        rows.push(...flattenStringFields(obj[k], p));
    }
    return rows;
}

/**
 * @param {string} path
 */
export function humanizeContentPath(path) {
    const parts = path.split('.');
    return parts
        .map((seg) => {
            if (seg === 'en') return 'English';
            if (seg === 'ja') return '日本語';
            if (/^\d+$/.test(seg)) return `Item ${Number(seg) + 1}`;
            return seg
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());
        })
        .join(' → ');
}

/**
 * @param {unknown} original
 * @param {Record<string, string>} pathValueMap
 */
export function applyStringPatches(original, pathValueMap) {
    const next = deepCloneJson(original);
    if (next === null || typeof next !== 'object') {
        return next;
    }
    for (const [path, value] of Object.entries(pathValueMap)) {
        if (!path) continue;
        setPath(next, path.split('.'), String(value));
    }
    return next;
}

/**
 * Copy Context page English media/link URL fields to Japanese so JA tracks EN (Studio hides duplicate JA media rows).
 * @param {unknown} bundle
 */
export function syncContextJaMediaFromEn(bundle) {
    const rows = flattenStringFields(bundle);
    /** @type {Record<string, string>} */
    const patches = {};
    for (const r of rows) {
        if (!r.path.startsWith('en.')) continue;
        const kind = getFieldKind('context', r.path);
        if (kind !== 'assetUrl' && kind !== 'externalUrl') continue;
        const rest = r.path.slice(3);
        patches[`ja.${rest}`] = r.value;
    }
    return applyStringPatches(bundle, patches);
}

/**
 * @param {unknown} obj
 * @param {string[]} parts
 * @param {string} value
 */
function setPath(obj, parts, value) {
    if (!parts.length || obj === null || typeof obj !== 'object') return;
    const key = parts[0];
    if (parts.length === 1) {
        if (Array.isArray(obj)) {
            const idx = Number(key);
            if (!Number.isNaN(idx)) obj[idx] = value;
        } else {
            /** @type {Record<string, unknown>} */ (obj)[key] = value;
        }
        return;
    }
    const rest = parts.slice(1);
    const isArr = Array.isArray(obj);
    const k = isArr ? Number(key) : key;
    /** @type {unknown} */
    let child = isArr ? obj[k] : /** @type {Record<string, unknown>} */ (obj)[key];
    if (child === undefined || child === null) {
        const nextKey = rest[0];
        const makeArr = /^\d+$/.test(String(nextKey));
        child = makeArr ? [] : {};
        if (isArr) obj[k] = child;
        else /** @type {Record<string, unknown>} */ (obj)[key] = child;
    }
    setPath(child, rest, value);
}

/**
 * @param {unknown} obj
 * @param {string[]} parts
 */
function setPathValue(obj, parts, value) {
    if (!parts.length || obj === null || typeof obj !== 'object') return;
    const key = parts[0];
    if (parts.length === 1) {
        if (Array.isArray(obj)) {
            const idx = Number(key);
            if (!Number.isNaN(idx)) obj[idx] = value;
        } else {
            /** @type {Record<string, unknown>} */ (obj)[key] = value;
        }
        return;
    }
    const rest = parts.slice(1);
    const isArr = Array.isArray(obj);
    const k = isArr ? Number(key) : key;
    /** @type {unknown} */
    let child = isArr ? obj[k] : /** @type {Record<string, unknown>} */ (obj)[key];
    if (child === undefined || child === null) {
        const nextKey = rest[0];
        const makeArr = /^\d+$/.test(String(nextKey));
        child = makeArr ? [] : {};
        if (isArr) obj[k] = child;
        else /** @type {Record<string, unknown>} */ (obj)[key] = child;
    }
    setPathValue(child, rest, value);
}

/**
 * @param {unknown} obj
 * @param {string[]} parts
 * @returns {unknown}
 */
export function getValueAtPath(obj, parts) {
    /** @type {unknown} */
    let cur = obj;
    for (const p of parts) {
        if (cur === null || cur === undefined) return undefined;
        if (Array.isArray(cur)) {
            const idx = Number(p);
            if (Number.isNaN(idx)) return undefined;
            cur = cur[idx];
        } else if (typeof cur === 'object') {
            cur = /** @type {Record<string, unknown>} */ (cur)[p];
        } else {
            return undefined;
        }
    }
    return cur;
}

/**
 * Number and boolean leaves only (Studio scalar inputs).
 * @param {unknown} obj
 * @param {string} [prefix]
 * @returns {{ path: string, label: string, value: number | boolean, kind: 'number' | 'boolean' }[]}
 */
export function flattenScalarFields(obj, prefix = '') {
    const rows = [];
    if (obj === null || obj === undefined) return rows;
    if (typeof obj === 'number' || typeof obj === 'boolean') {
        if (!prefix) return rows;
        rows.push({
            path: prefix,
            label: humanizeContentPath(prefix),
            value: obj,
            kind: typeof obj === 'boolean' ? 'boolean' : 'number',
        });
        return rows;
    }
    if (typeof obj !== 'object') return rows;
    if (Array.isArray(obj)) {
        obj.forEach((item, i) => {
            const p = prefix ? `${prefix}.${i}` : String(i);
            rows.push(...flattenScalarFields(item, p));
        });
        return rows;
    }
    for (const k of Object.keys(obj)) {
        const p = prefix ? `${prefix}.${k}` : k;
        rows.push(...flattenScalarFields(obj[k], p));
    }
    return rows;
}

/**
 * Apply scalar edits after string patches; uses **original** bundle to detect number vs boolean.
 * @param {unknown} original
 * @param {unknown} patched
 * @param {Record<string, string>} scalarMap — path → string from inputs (numbers as decimal text; booleans as 'true'/'false')
 */
export function applyScalarPatches(original, patched, scalarMap) {
    const next = deepCloneJson(patched);
    if (next === null || typeof next !== 'object') {
        return next;
    }
    for (const [path, strVal] of Object.entries(scalarMap)) {
        if (!path) continue;
        const parts = path.split('.');
        const origVal = getValueAtPath(original, parts);
        if (typeof origVal === 'number') {
            const n = Number(strVal);
            if (!Number.isNaN(n)) {
                setPathValue(next, parts, n);
            }
        } else if (typeof origVal === 'boolean') {
            const b = strVal === 'true' || strVal === '1' || strVal === 'on';
            setPathValue(next, parts, b);
        }
    }
    return next;
}

/**
 * @param {Record<string, unknown> | undefined} en
 * @param {Record<string, unknown> | undefined} ja
 */
export function journalLocalesToPlain(en, ja) {
    return {
        titleEn: String(en?.title ?? ''),
        bodyEn: String(en?.description ?? ''),
        titleJa: String(ja?.title ?? ''),
        bodyJa: String(ja?.description ?? ''),
    };
}

/**
 * @param {Record<string, unknown>} prevEn
 * @param {Record<string, unknown>} prevJa
 * @param {{ titleEn: string, bodyEn: string, titleJa: string, bodyJa: string }} plain
 */
export function applyJournalPlainLocales(prevEn, prevJa, plain) {
    return {
        en: { ...prevEn, title: plain.titleEn, description: plain.bodyEn },
        ja: { ...prevJa, title: plain.titleJa, description: plain.bodyJa },
    };
}

/** Keys from program `application-form` `_collectPayload` (plus staff `notes`). */
export const APPLICANT_KNOWN_FORM_KEYS = [
    'firstName',
    'lastName',
    'email',
    'country',
    'stateProvince',
    'city',
    'website',
    'discipline',
    'bioStatement',
    'exploration',
    'residencyGoals',
];

const APPLICANT_FIELD_LABELS = {
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    country: 'Country',
    stateProvince: 'State / province',
    city: 'City',
    website: 'Website',
    discipline: 'Discipline',
    bioStatement: 'Bio / statement',
    exploration: 'Exploration',
    residencyGoals: 'Residency goals',
};

/**
 * @param {string} payloadJson
 * @returns {{ fields: Record<string, string>, internalNotes: string, other: Record<string, unknown> | null, rawInvalid: string | null }}
 */
export function parseApplicantPayload(payloadJson) {
    const raw = String(payloadJson ?? '').trim();
    if (!raw) {
        return { fields: {}, internalNotes: '', other: null, rawInvalid: null };
    }
    try {
        const o = JSON.parse(raw);
        if (!o || typeof o !== 'object' || Array.isArray(o)) {
            return { fields: {}, internalNotes: '', other: null, rawInvalid: raw };
        }
        /** @type {Record<string, string>} */
        const fields = {};
        for (const k of APPLICANT_KNOWN_FORM_KEYS) {
            if (Object.prototype.hasOwnProperty.call(o, k)) {
                fields[k] = String(/** @type {Record<string, unknown>} */ (o)[k] ?? '');
            }
        }
        const internalNotes =
            typeof o.notes === 'string'
                ? o.notes
                : typeof o.message === 'string'
                  ? o.message
                  : typeof o.comment === 'string'
                    ? o.comment
                    : '';
        /** @type {Record<string, unknown>} */
        const other = {};
        for (const k of Object.keys(o)) {
            if (k === 'notes' || k === 'message' || k === 'comment') continue;
            if (APPLICANT_KNOWN_FORM_KEYS.includes(k)) continue;
            other[k] = o[k];
        }
        const otherKeys = Object.keys(other);
        return {
            fields,
            internalNotes,
            other: otherKeys.length ? other : null,
            rawInvalid: null,
        };
    } catch {
        return { fields: {}, internalNotes: '', other: null, rawInvalid: raw };
    }
}

/**
 * @param {string} internalNotes
 * @param {string} previousPayloadJson
 * @returns {string} JSON string for `payloadJson` on applicant record
 */
export function mergeApplicantInternalNotes(internalNotes, previousPayloadJson) {
    const t = String(internalNotes ?? '').trim();
    let prev = {};
    try {
        const p = JSON.parse(String(previousPayloadJson || '{}'));
        if (p && typeof p === 'object' && !Array.isArray(p)) prev = /** @type {Record<string, unknown>} */ (p);
    } catch {
        /* ignore */
    }
    const next = { ...prev, notes: t };
    return JSON.stringify(next);
}

/**
 * @param {string} href
 * @returns {string}
 */
function normalizeWebsiteHref(href) {
    const s = String(href ?? '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('//')) return `https:${s}`;
    return `https://${s}`;
}

/**
 * Read-only HTML for application fields + profile link (Studio applicant modals).
 * @param {string} payloadJson
 * @param {{ siteOrigin: string, profileSlug?: string | null, escapeHtml: (s: string) => string }} opts
 * @returns {string}
 */
export function buildApplicantApplicationSectionHtml(payloadJson, opts) {
    const { siteOrigin, profileSlug, escapeHtml } = opts;
    const { fields, other, rawInvalid } = parseApplicantPayload(payloadJson);
    if (rawInvalid) {
        return `<p class="studio-muted">Could not parse payload as JSON. Showing raw text.</p><pre class="studio-textarea-mono studio-app-payload-raw" style="max-height:12rem;overflow:auto;font-size:0.75rem">${escapeHtml(rawInvalid)}</pre>`;
    }
    const rows = [];
    for (const k of APPLICANT_KNOWN_FORM_KEYS) {
        const label = APPLICANT_FIELD_LABELS[k] || k;
        let v = fields[k] ?? '';
        if (k === 'website' && v) {
            const h = normalizeWebsiteHref(v);
            const safe = escapeHtml(h);
            v = `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="studio-app-payload-link">${safe}</a>`;
        } else {
            v = v ? escapeHtml(v) : '—';
        }
        rows.push(`<div class="studio-app-payload-dl__row"><dt>${escapeHtml(label)}</dt><dd>${v}</dd></div>`);
    }
    const em = String(fields.email || '').trim().toLowerCase();
    const profile = profileSlug
        ? `${String(siteOrigin || '').replace(/\/$/, '')}/profile/${encodeURIComponent(profileSlug)}`
        : '';
    const profileCell = profile
        ? `<a href="${escapeHtml(profile)}" target="_blank" rel="noopener noreferrer" class="studio-app-payload-link">/${escapeHtml(profileSlug || '')}</a>`
        : '—';
    rows.push(
        `<div class="studio-app-payload-dl__row"><dt>Artist profile</dt><dd>${profileCell}</dd></div>`,
    );
    let otherBlock = '';
    if (other && Object.keys(other).length) {
        otherBlock = `<p class="studio-muted studio-app-payload-other-label">Other data</p><pre class="studio-textarea-mono studio-app-payload-raw" style="max-height:8rem;overflow:auto;font-size:0.75rem">${escapeHtml(JSON.stringify(other, null, 2))}</pre>`;
    }
    return `<div class="studio-app-payload-dl">${rows.join('')}</div>${otherBlock}`;
}

/**
 * Applicant payload: show notes only in UI; preserve structured JSON when present.
 * Prefer {@link parseApplicantPayload} for Studio UI; this remains for legacy callers.
 * @param {string} payloadJson
 */
export function applicantPayloadToPlainNotes(payloadJson) {
    const { internalNotes, rawInvalid } = parseApplicantPayload(payloadJson);
    if (rawInvalid) return rawInvalid;
    if (internalNotes) return internalNotes;
    return '';
}

/**
 * @param {string} plainNotes
 * @param {string} previousPayloadJson
 */
export function plainNotesToApplicantPayload(plainNotes, previousPayloadJson) {
    const t = String(plainNotes ?? '').trim();
    if (!t) return '{}';
    try {
        const parsed = JSON.parse(t);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return JSON.stringify(parsed);
        }
    } catch {
        /* treat as plain text notes */
    }
    let prev = {};
    try {
        const p = JSON.parse(String(previousPayloadJson || '{}'));
        if (p && typeof p === 'object' && !Array.isArray(p)) prev = p;
    } catch {
        /* ignore */
    }
    return JSON.stringify({ ...prev, notes: t });
}

/**
 * Short label for journal table (avoid exposing long internal ids).
 * @param {string} id
 */
export function shortRefLabel(id) {
    const s = String(id || '');
    if (s.length <= 10) return s;
    return `…${s.slice(-8)}`;
}

/**
 * Short II-style principal for tables (full value in tooltip).
 * @param {string} principal
 */
export function shortPrincipalDisplay(principal) {
    const s = String(principal || '');
    if (s.length <= 16) return s;
    return `${s.slice(0, 6)}…${s.slice(-6)}`;
}
