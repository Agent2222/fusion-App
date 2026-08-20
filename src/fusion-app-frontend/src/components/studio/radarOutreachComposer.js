/**
 * Radar outreach composer — AI draft, human approve, send via Integration API.
 */
import { openStudioModal } from '../../utils/studioModal.js';
import { emptyLead } from '../../utils/radarModel.js';
import { RADAR_TRIGGER_TYPES } from '../../utils/radarModel.js';
import { draftRadarOutreachOnCanister, upsertRadarOutreach } from '../../utils/radarApi.js';
import { parseOutreachDraftJson } from '../../utils/radarScoring.js';
import { getEmailTemplateById, wrapEmailHtml } from '../../utils/emailCampaignTemplates.js';
import { sendEmail } from '../../utils/integrationApi.js';
import { getDataSource } from '../../utils/database.js';
import { buildStudioEmailCcList } from '../../utils/studioEmailCc.js';
import { saveRadarLead } from '../../utils/radarStore.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const TEMPLATE_IDS = [
    'tpl_radar_residency_invite',
    'tpl_radar_gallery_intro',
    'tpl_radar_curator_connect',
    'tpl_radar_collector_intro',
];

/**
 * @param {ReturnType<typeof emptyLead>} lead
 * @param {{ onSent?: () => void, triggerEvent?: string }} [opts]
 */
export function openRadarOutreachComposer(lead, opts = {}) {
    const current = emptyLead(lead);
    if (!current.publicEmail) {
        openStudioModal(`<p class="studio-radar-muted">Add a public email on the lead before sending outreach.</p>`, {
            title: 'Outreach',
        });
        return;
    }

    const tplOptions = TEMPLATE_IDS.map((id) => {
        const t = getEmailTemplateById(id);
        return `<option value="${esc(id)}">${esc(t?.name || id)}</option>`;
    }).join('');

    const triggerOptions = RADAR_TRIGGER_TYPES.map(
        (t) =>
            `<option value="${esc(t.id)}" ${opts.triggerEvent === t.id ? 'selected' : ''}>${esc(t.label)}</option>`,
    ).join('');

    const html = `
    <div class="studio-radar-outreach">
      <p class="studio-radar-muted">To: <strong>${esc(current.publicEmail)}</strong> · ${esc(current.name)}</p>
      <div class="studio-radar-form-grid">
        <label>Trigger
          <select id="radarOutTrigger">${triggerOptions}</select>
        </label>
        <label>Template
          <select id="radarOutTpl"><option value="">— Custom / AI —</option>${tplOptions}</select>
        </label>
        <label class="full">Subject
          <input id="radarOutSubject" value="" />
        </label>
        <label class="full">Body (plain text; wrapped in Fusion email layout on send)
          <textarea id="radarOutBody" rows="12"></textarea>
        </label>
        <label class="full">Trigger context for AI
          <textarea id="radarOutCtx" rows="3" placeholder="e.g. Exhibition at ___ closing next month; interest in craft and migration…">${esc(current.aiBestOpeningTopic || current.recentActivity || '')}</textarea>
        </label>
      </div>
      <p id="radarOutMsg" class="studio-radar-muted" role="status"></p>
    </div>
  `;

    const { root } = openStudioModal(html, {
        title: 'Radar outreach',
        subtitle: 'AI drafts — you approve before send',
        wide: true,
        footerHtml: `
      <button type="button" class="studio-btn-ghost" data-out="draft">AI draft</button>
      <button type="button" class="studio-btn-ghost" data-out="regen">Regenerate</button>
      <button type="button" class="studio-btn-secondary" data-out="save-draft">Save draft</button>
      <button type="button" class="studio-btn-primary" data-out="send">Approve &amp; send</button>
    `,
    });

    const subjectEl = /** @type {HTMLInputElement} */ (root.querySelector('#radarOutSubject'));
    const bodyEl = /** @type {HTMLTextAreaElement} */ (root.querySelector('#radarOutBody'));
    const ctxEl = /** @type {HTMLTextAreaElement} */ (root.querySelector('#radarOutCtx'));
    const triggerEl = /** @type {HTMLSelectElement} */ (root.querySelector('#radarOutTrigger'));
    const tplEl = /** @type {HTMLSelectElement} */ (root.querySelector('#radarOutTpl'));
    const msg = () => root.querySelector('#radarOutMsg');

    const applyTemplate = () => {
        const id = tplEl.value;
        if (!id) return;
        const t = getEmailTemplateById(id);
        if (!t) return;
        subjectEl.value = t.defaultSubject || '';
        bodyEl.value = `${current.aiRationale || ''}\n\n${t.defaultPreview || ''}`.trim();
    };
    tplEl.addEventListener('change', applyTemplate);

    const runDraft = async () => {
        const status = msg();
        if (status) status.textContent = 'Drafting…';
        const trigger = triggerEl.value;
        const ctx = `Trigger: ${trigger}\n${ctxEl.value}\nLead fit: ${current.fusionFit}\nRationale: ${current.aiRationale}`;
        const raw = await draftRadarOutreachOnCanister(current.id, ctx);
        const parsed = parseOutreachDraftJson(raw);
        subjectEl.value = parsed.subject;
        bodyEl.value = parsed.body;
        if (status) {
            status.textContent = parsed.recommendedSendTiming
                ? `Draft ready. Suggested timing: ${parsed.recommendedSendTiming}`
                : 'Draft ready.';
        }
    };

    root.addEventListener('click', async (ev) => {
        const btn = /** @type {HTMLElement} */ (ev.target)?.closest?.('[data-out]');
        if (!(btn instanceof HTMLButtonElement)) return;
        const act = btn.getAttribute('data-out');
        const status = msg();
        try {
            if (act === 'draft' || act === 'regen') {
                await runDraft();
            } else if (act === 'save-draft') {
                await upsertRadarOutreach({
                    id: '',
                    leadId: current.id,
                    subject: subjectEl.value,
                    bodyHtml: bodyEl.value,
                    triggerEvent: triggerEl.value,
                    templateId: tplEl.value,
                    status: 'drafted',
                });
                if (status) status.textContent = 'Draft saved on Radar.';
            } else if (act === 'send') {
                if (getDataSource() !== 'live') {
                    throw new Error('Switch to live data source to send email.');
                }
                const subject = subjectEl.value.trim();
                const body = bodyEl.value.trim();
                if (!subject || !body) throw new Error('Subject and body required.');
                const html = wrapEmailHtml(body.replace(/\n/g, '<br/>'), { includeSignature: true });
                const cc = buildStudioEmailCcList('');
                await sendEmail({
                    to: current.publicEmail,
                    subject,
                    html,
                    cc,
                });
                await upsertRadarOutreach({
                    id: '',
                    leadId: current.id,
                    subject,
                    bodyHtml: html,
                    triggerEvent: triggerEl.value,
                    templateId: tplEl.value,
                    status: 'sent',
                    sentAt: new Date().toISOString(),
                });
                await saveRadarLead(
                    emptyLead({
                        ...current,
                        status: 'contacted',
                        contactedAt: new Date().toISOString(),
                    }),
                );
                try {
                    window.posthog?.capture?.('radar_outreach_sent', {
                        leadType: current.leadType,
                        trigger: triggerEl.value,
                    });
                } catch {
                    /* ignore */
                }
                if (status) status.textContent = 'Sent.';
                opts.onSent?.();
            }
        } catch (err) {
            if (status) status.textContent = err instanceof Error ? err.message : String(err);
        }
    });
}
