/**
 * Radar AI scoring — parse LLM JSON + apply human feedback to lead.
 */
import { scoreRadarLeadOnCanister, upsertRadarLead } from './radarApi.js';
import { emptyLead } from './radarModel.js';

/**
 * @param {string} raw
 */
export function parseScoreJson(raw) {
    const text = String(raw || '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) {
        throw new Error('Score response was not JSON');
    }
    const obj = JSON.parse(text.slice(start, end + 1));
    const total = Math.round(Number(obj.totalScore) || 0);
    return {
        dimensions: Array.isArray(obj.dimensions) ? obj.dimensions : [],
        totalScore: Math.max(0, Math.min(100, total)),
        rationale: String(obj.rationale || ''),
        recommendedOpportunity: String(obj.recommendedOpportunity || ''),
        concern: String(obj.concern || ''),
        bestOpeningTopic: String(obj.bestOpeningTopic || ''),
        supportingSources: Array.isArray(obj.supportingSources)
            ? obj.supportingSources.map(String)
            : [],
        raw: text,
    };
}

/**
 * @param {ReturnType<typeof emptyLead>} lead
 * @param {string} [fusionContext]
 */
export async function scoreLead(lead, fusionContext = '') {
    if (!lead?.id) throw new Error('Lead must be saved before scoring');
    const raw = await scoreRadarLeadOnCanister(lead.id, fusionContext);
    const parsed = parseScoreJson(raw);
    const next = emptyLead({
        ...lead,
        aiScore: parsed.totalScore,
        aiRationale: parsed.rationale,
        aiRecommendedOpportunity: parsed.recommendedOpportunity,
        aiConcern: parsed.concern,
        aiBestOpeningTopic: parsed.bestOpeningTopic,
        scoredAt: new Date().toISOString(),
        payloadJson: JSON.stringify({
            lastScore: parsed,
            feedback: [],
        }),
    });
    return upsertRadarLead(next);
}

/**
 * @param {ReturnType<typeof emptyLead>} lead
 * @param {{ action: 'accept'|'reject'|'adjust', adjustedScore?: number, note?: string }} feedback
 */
export async function applyScoreFeedback(lead, feedback) {
    let payload = {};
    try {
        payload = JSON.parse(String(lead.payloadJson || '{}')) || {};
    } catch {
        payload = {};
    }
    const list = Array.isArray(payload.feedback) ? payload.feedback : [];
    list.push({
        ...feedback,
        at: new Date().toISOString(),
    });
    payload.feedback = list;
    let aiScore = Number(lead.aiScore) || 0;
    if (feedback.action === 'adjust' && feedback.adjustedScore != null) {
        aiScore = Math.max(0, Math.min(100, Math.round(Number(feedback.adjustedScore))));
    }
    if (feedback.action === 'reject') {
        aiScore = 0;
    }
    return upsertRadarLead(
        emptyLead({
            ...lead,
            aiScore,
            payloadJson: JSON.stringify(payload),
            notes:
                feedback.note && feedback.action !== 'accept'
                    ? `${lead.notes || ''}\n[Score feedback] ${feedback.note}`.trim()
                    : lead.notes,
        }),
    );
}

/**
 * @param {string} raw
 */
export function parseOutreachDraftJson(raw) {
    const text = String(raw || '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) {
        return { subject: 'A note from Fusion', body: text, recommendedSendTiming: '' };
    }
    const obj = JSON.parse(text.slice(start, end + 1));
    return {
        subject: String(obj.subject || 'A note from Fusion'),
        body: String(obj.body || ''),
        recommendedSendTiming: String(obj.recommendedSendTiming || ''),
    };
}

/**
 * @param {string} raw
 */
export function parseEnrichJson(raw) {
    const text = String(raw || '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('Enrich response was not JSON');
    return JSON.parse(text.slice(start, end + 1));
}
