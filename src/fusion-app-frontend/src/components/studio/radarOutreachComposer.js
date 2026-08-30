/**
 * Radar outreach composer — AI draft, human approve, send via Integration API.
 */
import { openStudioModal } from '../../utils/studioModal.js';
import { emptyLead } from '../../utils/radarModel.js';
import { RADAR_TRIGGER_TYPES } from '../../utils/radarModel.js';
import { draftRadarOutreachOnCanister } from '../../utils/radarApi.js';
import { parseOutreachDraftJson } from '../../utils/radarScoring.js';
import { getEmailTemplateById, RADAR_EMAIL_TEMPLATE_IDS } from '../../utils/emailCampaignTemplates.js';
import { loadEmailStudioContentCaches } from '../../utils/emailCampaignContentSources.js';
import { extractFusionEmailSlots } from '../../utils/emailFusionLayout.js';
import { saveRadarLead, saveRadarOutreach } from '../../utils/radarStore.js';
import { sendRadarOutreachMessage, sendRadarOutreachTestEmail } from '../../utils/radarOutreachSend.js';
import { getLeadSheetExtras, parseLeadPayload } from '../../utils/radarLeadImport.js';
import {
    applyRadarHeroToHtml,
    listRadarSiteImages,
    loadRadarTemplateDraft,
    saveRadarTemplateDraft,
} from '../../utils/radarOutreachTemplates.js';
import {
    durationSelectHtml,
    interpolateRadarDiscountHtml,
    joinUrlForPromoCode,
    promoDurationLabel,
    resolveRadarOutreachInviteCode,
} from '../../utils/studioPromoCodes.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

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

    let liveCode = getLeadSheetExtras(current).discountCode;
    const tplOptions = RADAR_EMAIL_TEMPLATE_IDS.map((id) => {
        const t = getEmailTemplateById(id);
        return `<option value="${esc(id)}" ${id === 'tpl_radar_artists' ? 'selected' : ''}>${esc(t?.name || id)}</option>`;
    }).join('');

    const triggerOptions = RADAR_TRIGGER_TYPES.map(
        (t) =>
            `<option value="${esc(t.id)}" ${opts.triggerEvent === t.id ? 'selected' : ''}>${esc(t.label)}</option>`,
    ).join('');

    const html = `
    <div class="studio-radar-outreach">
      <p class="studio-radar-muted">To: <strong>${esc(current.publicEmail)}</strong> · ${esc(current.name)}</p>
      <p class="studio-radar-muted">Send test email delivers this draft to <strong>info@fusionart.world</strong> only. It does not contact the lead. The same invite code is used for the test and for Approve &amp; send.</p>
      <div class="studio-radar-form-grid">
        <label>Trigger
          <select id="radarOutTrigger">${triggerOptions}</select>
        </label>
        <label>Template
          <select id="radarOutTpl">${tplOptions}</select>
        </label>
        <label>Membership discount
          ${durationSelectHtml(1, 'radarOutDuration')}
        </label>
        <label>Invite code
          <select id="radarOutCodeMode">
            ${liveCode ? `<option value="reuse">Reuse ${esc(liveCode)}</option>` : ''}
            <option value="mint" ${liveCode ? '' : 'selected'}>Mint a new single-use code</option>
          </select>
        </label>
        <label class="full">Subject
          <input id="radarOutSubject" value="" />
        </label>
        <label class="full">Hero image (from the Fusion site)
          <div class="studio-radar-hero-pick">
            <select id="radarOutHero">
              <option value="">Keep current hero</option>
            </select>
            <img id="radarOutHeroThumb" alt="" hidden />
          </div>
        </label>
        <label class="full">Body (Fusion HTML; discount code is filled on send)
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
        subtitle: '50% off membership · you approve before send',
        wide: true,
        footerHtml: `
      <div class="studio-radar-modal-footer">
      <button type="button" class="studio-btn-ghost" data-out="draft">AI draft</button>
      <button type="button" class="studio-btn-ghost" data-out="regen">Regenerate</button>
      <button type="button" class="studio-btn-secondary" data-out="save-draft">Save draft</button>
      <button type="button" class="studio-btn-secondary" data-out="save-default">Save as default</button>
      <button type="button" class="studio-btn-secondary" data-out="test">Send test email</button>
      <button type="button" class="studio-btn-primary" data-out="send">Approve &amp; send</button>
      </div>
    `,
    });

    const subjectEl = /** @type {HTMLInputElement} */ (root.querySelector('#radarOutSubject'));
    const bodyEl = /** @type {HTMLTextAreaElement} */ (root.querySelector('#radarOutBody'));
    const ctxEl = /** @type {HTMLTextAreaElement} */ (root.querySelector('#radarOutCtx'));
    const triggerEl = /** @type {HTMLSelectElement} */ (root.querySelector('#radarOutTrigger'));
    const tplEl = /** @type {HTMLSelectElement} */ (root.querySelector('#radarOutTpl'));
    const durationEl = /** @type {HTMLSelectElement} */ (root.querySelector('#radarOutDuration'));
    const codeModeEl = /** @type {HTMLSelectElement} */ (root.querySelector('#radarOutCodeMode'));
    const heroEl = /** @type {HTMLSelectElement} */ (root.querySelector('#radarOutHero'));
    const heroThumb = /** @type {HTMLImageElement | null} */ (root.querySelector('#radarOutHeroThumb'));
    const msg = () => root.querySelector('#radarOutMsg');

    /** @type {Array<{ url: string, label: string, group: string }>} */
    let siteImages = [];

    const currentHeroUrl = () => extractFusionEmailSlots(bodyEl.value)?.heroImageUrl || '';

    const updateHeroThumb = (url) => {
        if (!heroThumb) return;
        const src = String(url || '').trim();
        if (!src) {
            heroThumb.hidden = true;
            heroThumb.removeAttribute('src');
            return;
        }
        heroThumb.src = src;
        heroThumb.hidden = false;
    };

    const syncHeroSelect = (url) => {
        if (!heroEl) return;
        const src = String(url || currentHeroUrl()).trim();
        const match = siteImages.find((img) => img.url === src);
        heroEl.value = match ? match.url : '';
        updateHeroThumb(src);
    };

    const applyTemplate = async () => {
        const id = tplEl.value || 'tpl_radar_artists';
        const draft = await loadRadarTemplateDraft(id, Number(durationEl?.value || 1));
        subjectEl.value = draft.subject;
        bodyEl.value = draft.htmlBody;
        syncHeroSelect(draft.heroImageUrl);
    };
    tplEl.addEventListener('change', () => {
        applyTemplate().catch((err) => {
            const status = msg();
            if (status) status.textContent = err instanceof Error ? err.message : String(err);
        });
    });

    heroEl?.addEventListener('change', () => {
        const url = String(heroEl.value || '').trim();
        if (!url) return;
        const picked = siteImages.find((img) => img.url === url);
        bodyEl.value = applyRadarHeroToHtml(bodyEl.value, {
            url,
            alt: picked?.label || '',
        });
        updateHeroThumb(url);
    });

    const fillHeroPicker = async () => {
        if (!heroEl) return;
        try {
            const caches = await loadEmailStudioContentCaches();
            siteImages = await listRadarSiteImages(caches);
            const current = currentHeroUrl();
            const options = [
                `<option value="">Keep current hero</option>`,
                ...siteImages.map(
                    (img) =>
                        `<option value="${esc(img.url)}"${img.url === current ? ' selected' : ''}>${esc(img.group)} — ${esc(img.label)}</option>`,
                ),
            ];
            heroEl.innerHTML = options.join('');
            syncHeroSelect(current);
        } catch {
            heroEl.innerHTML = '<option value="">Site images unavailable</option>';
        }
    };
    void (async () => {
        await applyTemplate().catch(() => {});
        await fillHeroPicker().catch(() => {});
    })();

    const runDraft = async () => {
        const status = msg();
        if (status) status.textContent = 'Drafting…';
        const trigger = triggerEl.value;
        const ctx = `Trigger: ${trigger}\n${ctxEl.value}\nLead fit: ${current.fusionFit}\nRationale: ${current.aiRationale}\nOffer: ${promoDurationLabel(Number(durationEl?.value || 1))}`;
        const raw = await draftRadarOutreachOnCanister(current.id, ctx);
        const parsed = parseOutreachDraftJson(raw);
        subjectEl.value = parsed.subject;
        if (status) {
            status.textContent = parsed.recommendedSendTiming
                ? `Draft ready. Suggested timing: ${parsed.recommendedSendTiming}`
                : 'Draft ready. Template body kept — edit if needed.';
        }
    };

    const persistDiscountOnLead = async (code) => {
        const payload = parseLeadPayload(current);
        const sheet = payload.sheet && typeof payload.sheet === 'object' ? { ...payload.sheet } : {};
        sheet.discountCode = code;
        const next = emptyLead({
            ...current,
            payloadJson: JSON.stringify({ ...payload, sheet }),
        });
        Object.assign(current, next);
        await saveRadarLead(next, { silent: true });
        return next;
    };

    const refreshCodeMode = (code) => {
        liveCode = String(code || '').trim();
        if (!codeModeEl || !liveCode) return;
        const reuseOpt = codeModeEl.querySelector('option[value="reuse"]');
        if (reuseOpt) {
            reuseOpt.textContent = `Reuse ${liveCode}`;
        } else {
            const opt = document.createElement('option');
            opt.value = 'reuse';
            opt.textContent = `Reuse ${liveCode}`;
            codeModeEl.insertBefore(opt, codeModeEl.firstChild);
        }
        codeModeEl.value = 'reuse';
    };

    const resolveAndPersistCode = async () => {
        const durationMonths = Number(durationEl?.value || 1);
        const resolved = await resolveRadarOutreachInviteCode({
            existingCode: liveCode,
            codeMode: codeModeEl?.value,
            durationMonths,
        });
        await persistDiscountOnLead(resolved.code);
        refreshCodeMode(resolved.code);
        return { ...resolved, durationMonths };
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
                await saveRadarOutreach({
                    id: '',
                    leadId: current.id,
                    subject: subjectEl.value,
                    bodyHtml: bodyEl.value,
                    triggerEvent: triggerEl.value,
                    templateId: tplEl.value,
                    status: 'drafted',
                });
                if (status) status.textContent = 'Draft saved on Radar.';
            } else if (act === 'save-default') {
                btn.disabled = true;
                if (status) status.textContent = 'Saving default template…';
                try {
                    await saveRadarTemplateDraft({
                        templateId: tplEl.value,
                        subject: subjectEl.value,
                        htmlBody: bodyEl.value,
                        heroImageUrl: currentHeroUrl(),
                    });
                    if (status) status.textContent = 'Saved as the default for this template.';
                } finally {
                    btn.disabled = false;
                }
            } else if (act === 'test') {
                btn.disabled = true;
                if (status) status.textContent = 'Sending test to info@fusionart.world…';
                try {
                    const resolved = await resolveAndPersistCode();
                    await sendRadarOutreachTestEmail({
                        subject: subjectEl.value,
                        body: bodyEl.value,
                        durationMonths: resolved.durationMonths,
                        code: resolved.code,
                    });
                    if (status) {
                        status.textContent = `Test sent to info@fusionart.world with code ${resolved.code}.`;
                    }
                } finally {
                    btn.disabled = false;
                }
            } else if (act === 'send') {
                const durationMonths = Number(durationEl?.value || 0);
                if (![1, 2, 3].includes(durationMonths)) {
                    throw new Error('Pick 50% off for the first 1, 2, or 3 months before sending.');
                }
                const resolved = await resolveAndPersistCode();
                const body = interpolateRadarDiscountHtml(bodyEl.value, {
                    code: resolved.code,
                    durationMonths,
                    joinUrl: joinUrlForPromoCode(resolved.code),
                });
                await sendRadarOutreachMessage({
                    lead: current,
                    subject: subjectEl.value,
                    body,
                    triggerEvent: triggerEl.value,
                    templateId: tplEl.value,
                });
                if (status) status.textContent = `Sent with code ${resolved.code}.`;
                opts.onSent?.();
            }
        } catch (err) {
            if (status) status.textContent = err instanceof Error ? err.message : String(err);
        }
    });
}
