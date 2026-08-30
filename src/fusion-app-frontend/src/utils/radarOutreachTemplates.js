/**
 * Radar outreach template overrides: load/save default drafts and swap site heroes.
 * Persistence uses existing email-campaign rows (marker in internalNotes) because
 * upsertEmailCampaign cannot create a predetermined id.
 */
import { getEmailTemplateById, renderRadarTemplateHtml } from './emailCampaignTemplates.js';
import { extractFusionEmailSlots, renderFusionEmailFromSlots } from './emailFusionLayout.js';

export const RADAR_DEFAULT_TEMPLATE_PREFIX = 'radar-default-';

/**
 * @param {string} [templateId]
 */
export function radarDefaultCampaignId(templateId) {
    return `${RADAR_DEFAULT_TEMPLATE_PREFIX}${String(templateId || 'tpl_radar_artists').trim()}`;
}

/**
 * @param {string} [templateId]
 */
export function radarDefaultCampaignMarker(templateId) {
    return `radar-default:${String(templateId || '').trim()}`;
}

/**
 * @param {string} [templateId]
 * @param {number} [durationMonths]
 */
export function builtinRadarTemplateDraft(templateId, durationMonths) {
    const id = String(templateId || 'tpl_radar_artists');
    const t = getEmailTemplateById(id) || getEmailTemplateById('tpl_radar_artists');
    const html = renderRadarTemplateHtml({ templateId: id, durationMonths });
    const slots = extractFusionEmailSlots(html);
    return {
        templateId: id,
        subject: String(t?.defaultSubject || ''),
        htmlBody: html,
        heroImageUrl: slots?.heroImageUrl || '',
        source: 'builtin',
    };
}

/**
 * Swap the Fusion-layout hero while keeping discount placeholders.
 * @param {string} html
 * @param {{ url?: string, heroImageUrl?: string, alt?: string, heroAlt?: string }} [image]
 */
export function applyRadarHeroToHtml(html, image = {}) {
    const url = String(image.url || image.heroImageUrl || '').trim();
    if (!url) return String(html || '');
    const slots = extractFusionEmailSlots(html);
    if (!slots) return String(html || '');
    return renderFusionEmailFromSlots({
        ...slots,
        heroImageUrl: url,
        heroAlt: String(image.alt || image.heroAlt || slots.heroAlt || ''),
    });
}

/**
 * @param {unknown[]} rows
 * @param {string} templateId
 */
export function pickRadarTemplateOverride(rows, templateId) {
    const id = String(templateId || '').trim();
    const marker = radarDefaultCampaignMarker(id);
    const stableId = radarDefaultCampaignId(id);
    const list = Array.isArray(rows) ? rows : [];
    const titleOf = (r) => {
        const title = Array.isArray(r?.title) ? r.title[0] : r?.title;
        return String(title || '');
    };
    const templateOf = (r) => {
        const tid = Array.isArray(r?.templateId) ? r.templateId[0] : r?.templateId;
        return String(tid || '');
    };
    return (
        list.find((r) => String(r?.id || '') === stableId) ||
        list.find((r) => String(r?.internalNotes || '').includes(marker)) ||
        list.find((r) => templateOf(r) === id && titleOf(r).startsWith('Radar default')) ||
        null
    );
}

/**
 * @param {{ templateId?: string, subject?: string, htmlBody?: string }} draft
 * @param {object | null | undefined} existing
 */
export function radarTemplateOverrideToCampaign(draft, existing) {
    const templateId = String(draft?.templateId || 'tpl_radar_artists');
    return {
        id: String(existing?.id || ''),
        title: [`Radar default — ${templateId}`],
        subject: String(draft?.subject || '').trim() || 'Untitled',
        previewText: '',
        htmlBody: String(draft?.htmlBody || '').trim() || '<p><br></p>',
        textBody: [],
        templateId: [templateId],
        audience: existing?.audience ?? { allBroadcast: null },
        internalNotes: radarDefaultCampaignMarker(templateId),
        status: existing?.status ?? { draft: null },
        createdAt: String(existing?.createdAt || ''),
        updatedAt: '',
        sentAt: [],
        resendBroadcastId: [],
        lastError: [],
        createdBy: existing?.createdBy,
    };
}

function draftFromCampaign(templateId, rec, builtin) {
    const html = String(rec?.htmlBody || '').trim();
    if (!html) return builtin;
    const slots = extractFusionEmailSlots(html);
    return {
        templateId,
        subject: String(rec.subject || builtin.subject),
        htmlBody: html,
        heroImageUrl: slots?.heroImageUrl || String(rec.heroImageUrl || ''),
        source: 'saved',
    };
}

async function defaultFetchOverride(templateId) {
    const { getEmailCampaign, listEmailCampaigns } = await import('./database.js');
    const stableId = radarDefaultCampaignId(templateId);
    try {
        const byId = await getEmailCampaign(stableId);
        if (byId) return byId;
    } catch {
        /* ignore missing generate / not found */
    }
    try {
        const rows = await listEmailCampaigns();
        return pickRadarTemplateOverride(rows, templateId);
    } catch {
        return null;
    }
}

/**
 * Saved override if present, otherwise the JS builtin.
 * @param {string} [templateId]
 * @param {number} [durationMonths]
 * @param {{ fetchOverride?: (id: string) => Promise<object | null> }} [deps]
 */
export async function loadRadarTemplateDraft(templateId, durationMonths, deps = {}) {
    const builtin = builtinRadarTemplateDraft(templateId, durationMonths);
    try {
        const rec = deps.fetchOverride
            ? await deps.fetchOverride(builtin.templateId)
            : await defaultFetchOverride(builtin.templateId);
        if (!rec) return builtin;
        return draftFromCampaign(builtin.templateId, rec, builtin);
    } catch {
        return builtin;
    }
}

/**
 * Persist subject/html/hero as the default for this Radar template.
 * First save creates a campaign (empty id); later saves update that row.
 * @param {{ templateId?: string, subject?: string, htmlBody?: string, heroImageUrl?: string }} draft
 * @param {{
 *   fetchOverride?: (id: string) => Promise<object | null>,
 *   upsert?: (rec: object) => Promise<string>,
 * }} [deps]
 */
export async function saveRadarTemplateDraft(draft, deps = {}) {
    const templateId = String(draft?.templateId || 'tpl_radar_artists');
    const existing = deps.fetchOverride
        ? await deps.fetchOverride(templateId)
        : await defaultFetchOverride(templateId);
    const rec = radarTemplateOverrideToCampaign(draft, existing);
    if (typeof deps.upsert === 'function') {
        return deps.upsert(rec);
    }
    const { upsertEmailCampaign } = await import('./database.js');
    if (!rec.createdBy) {
        try {
            const { Principal } = await import('@dfinity/principal');
            rec.createdBy = Principal.anonymous();
        } catch {
            rec.createdBy = { toText: () => '2vxsx-fae' };
        }
    }
    return upsertEmailCampaign(rec);
}

/**
 * Still images already on the Fusion site (Email Studio catalog).
 * Dynamic-imports content sources so Node unit tests stay off the custom-element graph.
 * @param {object} [caches]
 */
export async function listRadarSiteImages(caches) {
    const { collectStudioSocialMedia } = await import('./emailCampaignContentSources.js');
    return collectStudioSocialMedia(caches || {}).filter((item) => item.kind === 'image');
}
