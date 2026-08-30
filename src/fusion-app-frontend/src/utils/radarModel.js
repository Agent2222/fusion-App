/**
 * Radar domain helpers — JS shapes ↔ Candid variants.
 */

/** @typedef {'artist'|'gallery'|'curator'|'collector'|'organization'} RadarLeadType */
/** @typedef {'discovered'|'researching'|'qualified'|'contacted'|'replied'|'connected'|'rejected'|'archived'} RadarLeadStatus */
/** @typedef {'emerging'|'midCareer'|'established'|'institution'} RadarCareerStage */

export const RADAR_LEAD_TYPES = ['artist', 'gallery', 'curator', 'collector', 'organization'];
export const RADAR_STATUSES = [
    'discovered',
    'researching',
    'qualified',
    'contacted',
    'replied',
    'connected',
    'rejected',
    'archived',
];
export const RADAR_PIPELINE_STATUSES = ['discovered', 'researching', 'qualified', 'contacted'];
export const RADAR_CAREER_STAGES = ['emerging', 'midCareer', 'established', 'institution'];
export const RADAR_REL_KINDS = [
    'represents',
    'exhibitedBy',
    'curatedBy',
    'collaboratesWith',
    'referredBy',
    'fusionMember',
    'appliedTo',
    'attendedEvent',
];
export const RADAR_SOURCE_TYPES = [
    'residencyList',
    'grantList',
    'galleryRoster',
    'exhibitionPage',
    'rssFeed',
    'instagramHashtag',
    'manualList',
    'googlePlaces',
];
export const RADAR_OUTREACH_STATUSES = ['drafted', 'approved', 'sent', 'replied', 'bounced'];

export const RADAR_TRIGGER_TYPES = [
    { id: 'new_exhibition', label: 'New exhibition / body of work' },
    { id: 'gallery_roster', label: 'Gallery adds an artist' },
    { id: 'curator_show', label: 'Curator opens an exhibition' },
    { id: 'japan_program', label: 'Japan-related program announced' },
    { id: 'applicant_win', label: 'Previous applicant accomplishment' },
    { id: 'collector_engage', label: 'Collector engages with Fusion' },
    { id: 'manual', label: 'Manual outreach' },
];

/**
 * @param {unknown} v
 * @returns {string}
 */
export function variantKey(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
        const keys = Object.keys(/** @type {object} */ (v));
        return keys[0] || '';
    }
    return '';
}

/**
 * @param {string} key
 * @returns {Record<string, null>}
 */
export function toVariant(key) {
    const k = String(key || '').trim();
    return { [k || 'artist']: null };
}

/**
 * @param {Partial<Record<string, unknown>>} [raw]
 */
export function emptyLead(raw = {}) {
    return {
        id: String(raw.id || ''),
        leadType: variantKey(raw.leadType) || 'artist',
        status: variantKey(raw.status) || 'discovered',
        name: String(raw.name || ''),
        location: String(raw.location || ''),
        discipline: String(raw.discipline || ''),
        careerStage: variantKey(raw.careerStage) || 'emerging',
        website: String(raw.website || ''),
        publicEmail: String(raw.publicEmail || ''),
        instagram: String(raw.instagram || ''),
        representation: String(raw.representation || ''),
        recentActivity: String(raw.recentActivity || ''),
        japanConnection: String(raw.japanConnection || ''),
        fusionFit: String(raw.fusionFit || ''),
        discoveryReason: String(raw.discoveryReason || ''),
        warmConnection: String(raw.warmConnection || ''),
        aiScore: Number(raw.aiScore) || 0,
        aiRationale: String(raw.aiRationale || ''),
        aiRecommendedOpportunity: String(raw.aiRecommendedOpportunity || ''),
        aiConcern: String(raw.aiConcern || ''),
        aiBestOpeningTopic: String(raw.aiBestOpeningTopic || ''),
        nextAction: String(raw.nextAction || ''),
        sourceUrls: Array.isArray(raw.sourceUrls) ? raw.sourceUrls.map(String) : [],
        sourceId: String(raw.sourceId || ''),
        tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
        regionKey: String(raw.regionKey || ''),
        notes: String(raw.notes || ''),
        createdAt: String(raw.createdAt || ''),
        updatedAt: String(raw.updatedAt || ''),
        scoredAt: String(raw.scoredAt || ''),
        contactedAt: String(raw.contactedAt || ''),
        repliedAt: String(raw.repliedAt || ''),
        createdBy: raw.createdBy,
        payloadJson: String(raw.payloadJson || ''),
    };
}

/**
 * @param {ReturnType<typeof emptyLead>} lead
 * @param {import('@dfinity/principal').Principal} principal
 */
export function leadToCandid(lead, principal) {
    const e = emptyLead(lead);
    return {
        id: e.id,
        leadType: toVariant(e.leadType),
        status: toVariant(e.status),
        name: e.name,
        location: e.location,
        discipline: e.discipline,
        careerStage: toVariant(e.careerStage),
        website: e.website,
        publicEmail: e.publicEmail,
        instagram: e.instagram,
        representation: e.representation,
        recentActivity: e.recentActivity,
        japanConnection: e.japanConnection,
        fusionFit: e.fusionFit,
        discoveryReason: e.discoveryReason,
        warmConnection: e.warmConnection,
        aiScore: BigInt(Math.max(0, Math.min(100, Math.round(e.aiScore)))),
        aiRationale: e.aiRationale,
        aiRecommendedOpportunity: e.aiRecommendedOpportunity,
        aiConcern: e.aiConcern,
        aiBestOpeningTopic: e.aiBestOpeningTopic,
        nextAction: e.nextAction,
        sourceUrls: e.sourceUrls,
        sourceId: e.sourceId,
        tags: e.tags,
        regionKey: e.regionKey,
        notes: e.notes,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        scoredAt: e.scoredAt,
        contactedAt: e.contactedAt,
        repliedAt: e.repliedAt,
        createdBy: principal,
        payloadJson: e.payloadJson,
    };
}

/**
 * @param {unknown} raw
 */
export function mapLeadFromCandid(raw) {
    const r = raw && typeof raw === 'object' ? /** @type {any} */ (raw) : {};
    const lead = emptyLead({
        ...r,
        aiScore: Number(r.aiScore ?? 0),
    });
    return lead;
}

/**
 * @param {number} score
 */
export function scoreTier(score) {
    const n = Number(score) || 0;
    if (n >= 80) return 'high';
    if (n >= 60) return 'mid';
    return 'low';
}

/**
 * @param {unknown} lead
 */
function payloadHasRedFlags(lead) {
    try {
        const o = JSON.parse(String(lead?.payloadJson || '{}'));
        return Boolean(String(o?.sheet?.redFlags || '').trim());
    } catch {
        return false;
    }
}

/**
 * @param {ReturnType<typeof emptyLead>[]} leads
 * @param {{ q?: string, type?: string, status?: string, region?: string, minScore?: number, hasRedFlag?: boolean }} filters
 */
export function filterLeads(leads, filters = {}) {
    const q = String(filters.q || '')
        .trim()
        .toLowerCase();
    const type = String(filters.type || '').trim();
    const status = String(filters.status || '').trim();
    const region = String(filters.region || '').trim();
    const minScore = Number(filters.minScore) || 0;
    const hasRedFlag = Boolean(filters.hasRedFlag);
    return (Array.isArray(leads) ? leads : []).filter((l) => {
        if (type && l.leadType !== type) return false;
        if (status && l.status !== status) return false;
        if (region) {
            const needle = region.toLowerCase();
            const loc = String(l.location || '').toLowerCase();
            const key = String(l.regionKey || '').toLowerCase();
            if (!key.includes(needle) && !loc.includes(needle)) return false;
        }
        if (minScore && (Number(l.aiScore) || 0) < minScore) return false;
        if (hasRedFlag && !payloadHasRedFlags(l)) return false;
        if (!q) return true;
        const hay = [l.name, l.location, l.discipline, l.fusionFit, l.japanConnection, l.notes]
            .join(' ')
            .toLowerCase();
        return hay.includes(q);
    });
}

/**
 * @param {ReturnType<typeof emptyLead>[]} leads
 */
export function leadsToCsv(leads) {
    const cols = [
        'id',
        'name',
        'leadType',
        'status',
        'location',
        'discipline',
        'aiScore',
        'fusionFit',
        'japanConnection',
        'publicEmail',
        'nextAction',
    ];
    const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const lines = [cols.join(',')];
    for (const l of leads) {
        lines.push(cols.map((c) => esc(/** @type {any} */ (l)[c])).join(','));
    }
    return lines.join('\n');
}
