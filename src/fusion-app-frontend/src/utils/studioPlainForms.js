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

/**
 * Applicant payload: show notes only in UI; preserve structured JSON when present.
 * @param {string} payloadJson
 */
export function applicantPayloadToPlainNotes(payloadJson) {
    const raw = String(payloadJson ?? '').trim();
    if (!raw) return '';
    try {
        const o = JSON.parse(raw);
        if (o && typeof o === 'object' && !Array.isArray(o)) {
            if (typeof o.notes === 'string') return o.notes;
            if (typeof o.message === 'string') return o.message;
            if (typeof o.comment === 'string') return o.comment;
            const keys = Object.keys(o);
            if (keys.length === 1 && typeof o[keys[0]] === 'string') return String(o[keys[0]]);
        }
        return JSON.stringify(o, null, 2);
    } catch {
        return raw;
    }
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
