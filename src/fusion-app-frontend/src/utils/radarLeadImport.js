/**
 * Artist-leads sheet → Radar lead mapping, merge, and round-trip CSV.
 */
import { parseCsvRows } from './csvParse.js';
import { RADAR_STATUSES, emptyLead } from './radarModel.js';

export const ARTIST_LEADS_SHEET_COLUMNS = [
    'name',
    'email',
    'instagram',
    'website',
    'medium',
    'location',
    'fit_score',
    'status',
    'discount_code',
    'why_fit',
    'source_url',
    'public_contact',
    'red_flags',
    'date_added',
    'notes',
];

export const ARTIST_LEADS_SOURCE_LABEL = 'Artist leads sheet';

/** @type {Record<string, string>} */
const STATUS_SYNONYMS = {
    new: 'discovered',
    lead: 'discovered',
    open: 'discovered',
    discovered: 'discovered',
    research: 'researching',
    researching: 'researching',
    qualified: 'qualified',
    qualify: 'qualified',
    contacted: 'contacted',
    outreach: 'contacted',
    sent: 'contacted',
    replied: 'replied',
    reply: 'replied',
    connected: 'connected',
    member: 'connected',
    rejected: 'rejected',
    pass: 'rejected',
    no: 'rejected',
    archived: 'archived',
    closed: 'archived',
};

/**
 * @param {unknown} raw
 */
export function normalizeHeaderKey(raw) {
    return String(raw || '')
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
}

/**
 * @param {unknown} raw
 */
export function normalizeEmail(raw) {
    return String(raw || '')
        .trim()
        .toLowerCase();
}

/**
 * @param {unknown} raw
 */
export function normalizeInstagram(raw) {
    let s = String(raw || '').trim();
    if (!s) return '';
    s = s.replace(/^@/, '');
    try {
        if (/^https?:\/\//i.test(s) || s.includes('instagram.com')) {
            const u = new URL(s.startsWith('http') ? s : `https://${s}`);
            const parts = u.pathname.split('/').filter(Boolean);
            s = parts[0] || '';
        }
    } catch {
        /* keep stripped handle */
    }
    return s.replace(/^@/, '').split(/[/?#]/)[0].trim().toLowerCase();
}

/**
 * @param {unknown} raw
 */
export function looksLikeEmail(raw) {
    const s = String(raw || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * @param {unknown} raw
 * @returns {{ status: string, rawStatus: string }}
 */
export function mapSheetStatus(raw) {
    const rawStatus = String(raw || '').trim();
    const key = rawStatus.toLowerCase().replace(/[\s-]+/g, '_');
    if (RADAR_STATUSES.includes(key)) return { status: key, rawStatus };
    const mapped = STATUS_SYNONYMS[key] || STATUS_SYNONYMS[rawStatus.toLowerCase()];
    if (mapped) return { status: mapped, rawStatus };
    return { status: 'discovered', rawStatus };
}

/**
 * @param {unknown} raw
 */
export function parseSheetDate(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    const t = Date.parse(s);
    if (Number.isFinite(t)) return new Date(t).toISOString();
    return s;
}

/**
 * @param {unknown} raw
 */
export function regionKeyFromLocation(raw) {
    const loc = String(raw || '').trim();
    if (!loc) return '';
    const first = loc.split(',')[0].trim().toLowerCase();
    return first.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * @param {unknown} lead
 * @returns {Record<string, unknown>}
 */
export function parseLeadPayload(lead) {
    try {
        const o = JSON.parse(String(lead?.payloadJson || '{}'));
        return o && typeof o === 'object' ? /** @type {Record<string, unknown>} */ (o) : {};
    } catch {
        return {};
    }
}

/**
 * @param {unknown} lead
 */
export function getLeadSheetExtras(lead) {
    const payload = parseLeadPayload(lead);
    const sheet =
        payload.sheet && typeof payload.sheet === 'object'
            ? /** @type {Record<string, unknown>} */ (payload.sheet)
            : {};
    return {
        discountCode: String(sheet.discountCode || ''),
        redFlags: String(sheet.redFlags || ''),
        publicContact: String(sheet.publicContact || ''),
        rawStatus: String(sheet.rawStatus || ''),
    };
}

/**
 * @param {unknown} lead
 */
export function leadHasRedFlags(lead) {
    return Boolean(getLeadSheetExtras(lead).redFlags.trim());
}

/**
 * @param {unknown} existingTs
 * @param {unknown} sheetTs
 */
export function isSheetNewer(existingTs, sheetTs) {
    const a = Date.parse(String(existingTs || ''));
    const b = Date.parse(String(sheetTs || ''));
    if (!Number.isFinite(b)) return false;
    if (!Number.isFinite(a)) return true;
    return b > a;
}

/**
 * @param {Record<string, string>} row
 * @param {number} rowNumber 1-based data row (header is 1)
 */
export function sheetRowToLead(row, rowNumber = 2) {
    const name = String(row.name || '').trim();
    const email = normalizeEmail(row.email);
    const instagram = normalizeInstagram(row.instagram);
    const website = String(row.website || '').trim();
    const publicContact = String(row.public_contact || '').trim();
    const publicEmail = email || (looksLikeEmail(publicContact) ? normalizeEmail(publicContact) : '');
    const { status, rawStatus } = mapSheetStatus(row.status);
    const why = String(row.why_fit || '').trim();
    const sourceUrl = String(row.source_url || '').trim();
    const fitRaw = String(row.fit_score || '').trim();
    const aiScore = fitRaw === '' ? 0 : Math.max(0, Math.min(100, Math.round(Number(fitRaw) || 0)));
    const createdAt = parseSheetDate(row.date_added);
    const location = String(row.location || '').trim();
    const discountCode = String(row.discount_code || '').trim();
    const redFlags = String(row.red_flags || '').trim();

    const reasons = [];
    if (!name) reasons.push('missing name');
    if (!publicEmail && !instagram && !website) {
        reasons.push('need email, instagram, or website');
    }
    if (reasons.length) {
        return { ok: false, rowNumber, name, reasons, lead: null };
    }

    const payload = {
        sheet: {
            discountCode,
            redFlags,
            publicContact,
            rawStatus: rawStatus && !RADAR_STATUSES.includes(normalizeHeaderKey(rawStatus)) ? rawStatus : '',
        },
    };

    const lead = emptyLead({
        leadType: 'artist',
        status,
        name,
        location,
        discipline: String(row.medium || '').trim(),
        website,
        publicEmail,
        instagram,
        fusionFit: why,
        aiRationale: why,
        aiScore,
        scoredAt: aiScore ? createdAt : '',
        sourceUrls: sourceUrl ? [sourceUrl] : [],
        regionKey: regionKeyFromLocation(location),
        notes: String(row.notes || '').trim(),
        createdAt,
        payloadJson: JSON.stringify(payload),
    });

    return { ok: true, rowNumber, name, reasons: [], lead };
}

/**
 * Fill empty Radar fields from the sheet row. Overwrite status/score only when the sheet is newer.
 * Always merge sidecar sheet keys. Preserve lastScore / feedback.
 *
 * @param {ReturnType<typeof emptyLead>} existing
 * @param {ReturnType<typeof emptyLead>} incoming
 * @param {{ sheetNewer?: boolean }} [opts]
 */
export function mergeRadarLeadFromSheet(existing, incoming, opts = {}) {
    const sheetNewer = Boolean(opts.sheetNewer);
    const fill = (cur, next) => {
        if (cur == null || cur === '') return next;
        if (typeof cur === 'number' && !cur && next) return next;
        return cur;
    };

    const mergedUrls = [...(existing.sourceUrls || [])];
    for (const u of incoming.sourceUrls || []) {
        if (u && !mergedUrls.includes(u)) mergedUrls.push(u);
    }

    const existingPayload = parseLeadPayload(existing);
    const incomingPayload = parseLeadPayload(incoming);
    const existingSheet =
        existingPayload.sheet && typeof existingPayload.sheet === 'object'
            ? { .../** @type {object} */ (existingPayload.sheet) }
            : {};
    const incomingSheet =
        incomingPayload.sheet && typeof incomingPayload.sheet === 'object'
            ? /** @type {Record<string, unknown>} */ (incomingPayload.sheet)
            : {};
    for (const [k, v] of Object.entries(incomingSheet)) {
        if (v != null && String(v).trim()) existingSheet[k] = v;
    }
    const payload = {
        ...existingPayload,
        ...incomingPayload,
        lastScore: existingPayload.lastScore ?? incomingPayload.lastScore,
        feedback: existingPayload.feedback ?? incomingPayload.feedback,
        sheet: existingSheet,
    };

    return emptyLead({
        ...existing,
        name: fill(existing.name, incoming.name),
        location: fill(existing.location, incoming.location),
        discipline: fill(existing.discipline, incoming.discipline),
        website: fill(existing.website, incoming.website),
        publicEmail: fill(existing.publicEmail, incoming.publicEmail),
        instagram: fill(existing.instagram, incoming.instagram),
        fusionFit: fill(existing.fusionFit, incoming.fusionFit),
        aiRationale: fill(existing.aiRationale, incoming.aiRationale),
        notes: fill(existing.notes, incoming.notes),
        regionKey: fill(existing.regionKey, incoming.regionKey),
        createdAt: fill(existing.createdAt, incoming.createdAt),
        sourceUrls: mergedUrls,
        sourceId: fill(existing.sourceId, incoming.sourceId),
        status: sheetNewer && incoming.status ? incoming.status : existing.status,
        aiScore: sheetNewer && incoming.aiScore ? incoming.aiScore : fill(existing.aiScore, incoming.aiScore),
        scoredAt:
            sheetNewer && incoming.aiScore
                ? incoming.scoredAt || existing.scoredAt
                : fill(existing.scoredAt, incoming.scoredAt),
        payloadJson: JSON.stringify(payload),
    });
}

/**
 * @param {ReturnType<typeof emptyLead>[]} existing
 * @param {ReturnType<typeof emptyLead>} incoming
 */
export function findMatchingLead(existing, incoming) {
    const email = normalizeEmail(incoming.publicEmail);
    if (email) {
        const byEmail = existing.find((l) => normalizeEmail(l.publicEmail) === email);
        if (byEmail) return byEmail;
    }
    const ig = normalizeInstagram(incoming.instagram);
    if (ig) {
        return existing.find((l) => normalizeInstagram(l.instagram) === ig) || null;
    }
    return null;
}

/**
 * @param {string} text
 * @param {ReturnType<typeof emptyLead>[]} [existingLeads]
 */
export function classifyArtistLeadsCsv(text, existingLeads = []) {
    const rows = parseCsvRows(String(text || '').trim());
    if (rows.length < 2) {
        return { toCreate: [], toMerge: [], invalid: [{ rowNumber: 1, name: '', reasons: ['no data rows'] }] };
    }
    const header = rows[0].map(normalizeHeaderKey);
    const colIndex = (key) => header.indexOf(key);

    /** @type {{ lead: ReturnType<typeof emptyLead>, name: string, rowNumber: number }[]} */
    const toCreate = [];
    /** @type {{ existing: ReturnType<typeof emptyLead>, lead: ReturnType<typeof emptyLead>, name: string, rowNumber: number, sheetNewer: boolean }[]} */
    const toMerge = [];
    /** @type {{ rowNumber: number, name: string, reasons: string[] }[]} */
    const invalid = [];

    const seen = [...existingLeads];

    for (let r = 1; r < rows.length; r++) {
        const line = rows[r];
        /** @type {Record<string, string>} */
        const obj = {};
        for (const col of ARTIST_LEADS_SHEET_COLUMNS) {
            const idx = colIndex(col);
            obj[col] = idx >= 0 ? String(line[idx] ?? '') : '';
        }
        const parsed = sheetRowToLead(obj, r + 1);
        if (!parsed.ok || !parsed.lead) {
            invalid.push({
                rowNumber: parsed.rowNumber,
                name: parsed.name,
                reasons: parsed.reasons,
            });
            continue;
        }
        const match = findMatchingLead(seen, parsed.lead);
        if (match) {
            const sheetNewer = isSheetNewer(match.updatedAt || match.createdAt, parsed.lead.createdAt);
            const merged = mergeRadarLeadFromSheet(match, parsed.lead, { sheetNewer });
            toMerge.push({
                existing: match,
                lead: merged,
                name: parsed.name,
                rowNumber: parsed.rowNumber,
                sheetNewer,
            });
            const idx = seen.findIndex((l) => l.id === match.id);
            if (idx >= 0) seen[idx] = merged;
        } else {
            toCreate.push({ lead: parsed.lead, name: parsed.name, rowNumber: parsed.rowNumber });
            seen.push(parsed.lead);
        }
    }

    return { toCreate, toMerge, invalid };
}

function csvEscape(s) {
    return `"${String(s ?? '').replace(/"/g, '""')}"`;
}

export function artistLeadsTemplateCsv() {
    return `${ARTIST_LEADS_SHEET_COLUMNS.join(',')}\n`;
}

/**
 * @param {Array<{ label?: string, id?: string }>} sources
 */
export function findArtistLeadsSheetSource(sources) {
    const needle = ARTIST_LEADS_SOURCE_LABEL.trim().toLowerCase();
    return (Array.isArray(sources) ? sources : []).find(
        (s) => String(s?.label || '').trim().toLowerCase() === needle,
    ) || null;
}

/**
 * @param {ReturnType<typeof emptyLead>[]} leads
 */
export function leadsToArtistSheetCsv(leads) {
    const lines = [ARTIST_LEADS_SHEET_COLUMNS.join(',')];
    for (const l of Array.isArray(leads) ? leads : []) {
        const extras = getLeadSheetExtras(l);
        const row = {
            name: l.name,
            email: l.publicEmail,
            instagram: l.instagram,
            website: l.website,
            medium: l.discipline,
            location: l.location,
            fit_score: l.aiScore ? String(l.aiScore) : '',
            status: l.status,
            discount_code: extras.discountCode,
            why_fit: l.fusionFit || l.aiRationale,
            source_url: (l.sourceUrls || [])[0] || '',
            public_contact: extras.publicContact,
            red_flags: extras.redFlags,
            date_added: l.createdAt,
            notes: l.notes,
        };
        lines.push(ARTIST_LEADS_SHEET_COLUMNS.map((c) => csvEscape(row[c])).join(','));
    }
    return lines.join('\n');
}
