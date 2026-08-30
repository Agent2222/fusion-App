/**
 * Shared Radar outreach send (single + batch).
 */
import { emptyLead } from './radarModel.js';
import { sendEmail, sendEmailBatch } from './integrationApi.js';
import { getDataSource } from './database.js';
import { buildStudioEmailCcList } from './studioEmailCc.js';
import { notifyRadar, saveRadarLead, saveRadarOutreach } from './radarStore.js';
import {
    interpolateRadarDiscountHtml,
    joinUrlForPromoCode,
} from './studioPromoCodes.js';
import {
    buildRadarOutreachTestEmail,
    isRadarOutreachReadyToSend,
    RADAR_OUTREACH_BATCH_CAP,
    RADAR_OUTREACH_TEST_CODE,
    RADAR_OUTREACH_TEST_TO,
    wrapRadarOutreachHtml,
} from './radarOutreachReady.js';

export {
    buildRadarOutreachTestEmail,
    isRadarOutreachReadyToSend,
    RADAR_OUTREACH_BATCH_CAP,
    RADAR_OUTREACH_TEST_CODE,
    RADAR_OUTREACH_TEST_TO,
    wrapRadarOutreachHtml,
};

function assertLiveSend() {
    if (getDataSource() !== 'live') {
        throw new Error('Switch to live data source to send email.');
    }
}

/**
 * @param {{ lead: ReturnType<typeof emptyLead>, outreach?: Record<string, unknown>, subject: string, body: string, triggerEvent?: string, templateId?: string, outreachId?: string }} opts
 */
export async function sendRadarOutreachMessage(opts) {
    assertLiveSend();
    const lead = emptyLead(opts.lead);
    const subject = String(opts.subject || '').trim();
    const body = String(opts.body || '').trim();
    if (!lead.publicEmail) throw new Error('Add a public email on the lead before sending outreach.');
    if (!subject || !body) throw new Error('Subject and body required.');
    const html = wrapRadarOutreachHtml(body);
    const cc = buildStudioEmailCcList('');
    await sendEmail({
        to: lead.publicEmail,
        subject,
        html,
        cc,
    });
    const sentAt = new Date().toISOString();
    await saveRadarOutreach({
        id: String(opts.outreachId || opts.outreach?.id || ''),
        leadId: lead.id,
        subject,
        bodyHtml: html,
        triggerEvent: String(opts.triggerEvent || opts.outreach?.triggerEvent || ''),
        templateId: String(opts.templateId || opts.outreach?.templateId || ''),
        status: 'sent',
        sentAt,
        draftedAt: String(opts.outreach?.draftedAt || ''),
    });
    await saveRadarLead(
        emptyLead({
            ...lead,
            status: 'contacted',
            contactedAt: sentAt,
        }),
    );
    try {
        window.posthog?.capture?.('radar_outreach_sent', {
            leadType: lead.leadType,
            trigger: opts.triggerEvent || opts.outreach?.triggerEvent,
        });
    } catch {
        /* ignore */
    }
    return { ok: true, to: lead.publicEmail };
}

/**
 * Send this draft to info@fusionart.world without contacting the lead or saving a sent record.
 * Caller must resolve/mint the invite code first so the inbox gets a real RADAR-XXXX.
 * @param {{ subject: string, body: string, durationMonths?: number, code?: string }} opts
 */
export async function sendRadarOutreachTestEmail(opts) {
    const payload = buildRadarOutreachTestEmail(opts);
    await sendEmail({
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
    });
    try {
        window.posthog?.capture?.('radar_outreach_test_sent', { to: payload.to });
    } catch {
        /* ignore */
    }
    return { ok: true, to: payload.to, subject: payload.subject };
}

function interpolateCampaignBody(body, campaign) {
    const code = String(campaign?.code || '').trim();
    const html = String(body || '');
    if (!code) return html;
    return interpolateRadarDiscountHtml(html, {
        code,
        durationMonths: campaign?.durationMonths,
        joinUrl: joinUrlForPromoCode(code),
    });
}

/**
 * @param {{ outreach: Record<string, unknown>, lead: ReturnType<typeof emptyLead> }[]} items
 * @param {{ code?: string, durationMonths?: number }} [campaign]
 */
export async function sendRadarOutreachBatch(items, campaign = {}) {
    assertLiveSend();
    const code = String(campaign?.code || '').trim();
    if (!code) {
        throw new Error('Pick a campaign promo code before sending.');
    }
    const capped = (Array.isArray(items) ? items : []).slice(0, RADAR_OUTREACH_BATCH_CAP);
    const ready = [];
    const skipped = [];
    for (const item of capped) {
        if (!isRadarOutreachReadyToSend(item.outreach, item.lead)) {
            skipped.push({
                name: item.lead?.name || item.outreach?.leadId,
                reason: 'not ready (need approved draft, email, subject, and body)',
            });
            continue;
        }
        ready.push(item);
    }
    if (!ready.length) {
        return { sent: 0, failed: [], skipped };
    }
    const cc = buildStudioEmailCcList('');
    const messages = ready.map((item) => ({
        to: item.lead.publicEmail,
        subject: String(item.outreach.subject || '').trim(),
        html: wrapRadarOutreachHtml(
            interpolateCampaignBody(String(item.outreach.bodyHtml || ''), {
                code,
                durationMonths: campaign.durationMonths,
            }),
        ),
    }));
    const batch = await sendEmailBatch(messages, { cc });
    const results = Array.isArray(batch?.results) ? batch.results : [];
    const failed = [];
    let sent = 0;
    const sentAt = new Date().toISOString();
    for (let i = 0; i < ready.length; i++) {
        const item = ready[i];
        const res = results[i];
        const ok =
            res == null
                ? Number(batch?.failCount || 0) === 0
                : res.ok !== false && !res.error;
        if (!ok) {
            failed.push({
                name: item.lead.name,
                email: item.lead.publicEmail,
                error: String(res?.error || 'Send failed'),
            });
            continue;
        }
        await saveRadarOutreach(
            {
                ...item.outreach,
                id: item.outreach.id,
                leadId: item.lead.id,
                status: 'sent',
                sentAt,
                bodyHtml: messages[i].html,
            },
            { silent: true },
        );
        await saveRadarLead(
            emptyLead({
                ...item.lead,
                status: 'contacted',
                contactedAt: sentAt,
            }),
            { silent: true },
        );
        sent += 1;
    }
    notifyRadar();
    try {
        window.posthog?.capture?.('radar_outreach_batch_sent', { sent, failed: failed.length });
    } catch {
        /* ignore */
    }
    return { sent, failed, skipped };
}
