/**
 * Radar lead detail / edit modal.
 */
import { openStudioModal } from '../../utils/studioModal.js';
import { emptyLead, RADAR_CAREER_STAGES, RADAR_LEAD_TYPES, RADAR_STATUSES, scoreTier } from '../../utils/radarModel.js';
import { getRadarOutreachCached, getRadarRelationshipsCached, saveRadarLead } from '../../utils/radarStore.js';
import { isRadarPreviewActive } from '../../utils/radarPreview.js';
import { applyScoreFeedback, scoreLead } from '../../utils/radarScoring.js';
import { enrichRadarFromText } from '../../utils/radarApi.js';
import { parseEnrichJson } from '../../utils/radarScoring.js';
import { listRadarOutreach, listRadarRelationships } from '../../utils/radarApi.js';
import { getLeadSheetExtras } from '../../utils/radarLeadImport.js';
import { openRadarOutreachComposer } from './radarOutreachComposer.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {ReturnType<typeof emptyLead>} lead
 * @param {{ onSaved?: (l: any) => void, canEdit?: boolean }} [opts]
 */
export async function openRadarLeadModal(lead, opts = {}) {
    const canEdit = opts.canEdit !== false;
    let current = emptyLead(lead);
    let outreach = [];
    let rels = [];
    if (current.id) {
        if (isRadarPreviewActive()) {
            outreach = getRadarOutreachCached().filter((o) => o.leadId === current.id);
            rels = getRadarRelationshipsCached().filter(
                (r) => r.fromLeadId === current.id || r.toLeadId === current.id,
            );
        } else {
            const settled = await Promise.allSettled([
                listRadarOutreach(current.id),
                listRadarRelationships(current.id),
            ]);
            outreach = settled[0].status === 'fulfilled' ? settled[0].value : [];
            rels = settled[1].status === 'fulfilled' ? settled[1].value : [];
        }
    }

    const scoreClass = `studio-radar-score--${scoreTier(current.aiScore)}`;
    const sheetExtras = getLeadSheetExtras(current);
    const watchLine = sheetExtras.redFlags || current.aiConcern || '';

    const FIELD_HINTS = {
        name: 'Full name of the person or organization',
        leadType: 'Category: artist, gallery, curator, collector, institution, or other',
        status: 'Pipeline stage — from initial discovery through to connected',
        careerStage: 'Career level helps calibrate outreach tone and opportunity fit',
        location: 'City and country (e.g. "Brooklyn, NY" or "Tokyo, Japan")',
        discipline: 'Primary medium or practice area (e.g. "ceramics", "painting", "mixed media")',
        website: 'Personal site, gallery page, or portfolio URL',
        publicEmail: 'Public-facing email for outreach — required before drafting messages',
        instagram: 'Instagram handle (without the @) for social context',
        representation: 'Gallery or agent currently representing this lead, if known',
        regionKey: 'Geographic tag for filtering (e.g. "NYC", "tokyo", "EU")',
        japanConnection: 'Any existing tie to Japan — exhibitions, residencies, travel, collections',
        fusionFit: 'Why this lead is relevant to Fusion — what makes them a good match',
        discoveryReason: 'How or why this lead was found — source, referral, or context',
        warmConnection: 'Mutual contacts or warm intro paths into this lead',
        nextAction: 'The specific next step to move this lead forward in the pipeline',
        recentActivity: 'Recent exhibitions, publications, or notable events worth referencing',
        notes: 'Internal notes — context, impressions, or follow-up reminders',
    };

    const field = (key, label, type = 'text', { hint = false, full = false } = {}) => {
        const hintText = hint ? FIELD_HINTS[key] || '' : '';
        const hintHtml = hintText ? `<span class="studio-radar-field-hint">${esc(hintText)}</span>` : '';
        const wrapClass = type === 'textarea' || full ? ' class="full"' : '';
        if (type === 'select-type') {
            return `<label${wrapClass}><span class="studio-radar-field-label">${esc(label)}</span>${hintHtml}<select data-f="${esc(key)}" ${canEdit ? '' : 'disabled'}>${RADAR_LEAD_TYPES.map((t) => `<option value="${t}" ${current.leadType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
        }
        if (type === 'select-status') {
            return `<label${wrapClass}><span class="studio-radar-field-label">${esc(label)}</span>${hintHtml}<select data-f="${esc(key)}" ${canEdit ? '' : 'disabled'}>${RADAR_STATUSES.map((t) => `<option value="${t}" ${current.status === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
        }
        if (type === 'select-career') {
            return `<label${wrapClass}><span class="studio-radar-field-label">${esc(label)}</span>${hintHtml}<select data-f="${esc(key)}" ${canEdit ? '' : 'disabled'}>${RADAR_CAREER_STAGES.map((t) => `<option value="${t}" ${current.careerStage === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
        }
        if (type === 'textarea') {
            return `<label class="full"><span class="studio-radar-field-label">${esc(label)}</span>${hintHtml}<textarea data-f="${esc(key)}" rows="3" ${canEdit ? '' : 'disabled'}>${esc(current[key] || '')}</textarea></label>`;
        }
        return `<label${wrapClass}><span class="studio-radar-field-label">${esc(label)}</span>${hintHtml}<input data-f="${esc(key)}" value="${esc(current[key] || '')}" ${canEdit ? '' : 'disabled'} /></label>`;
    };

    const timeline = [
        current.createdAt ? `Discovered / created — ${current.createdAt}` : null,
        current.scoredAt ? `Scored ${current.aiScore} — ${current.scoredAt}` : null,
        ...outreach.map((o) => `Outreach (${o.status}): ${o.subject} — ${o.draftedAt || o.sentAt}`),
        ...rels.map((r) => `Relationship: ${r.kind} — ${r.label || r.evidence}`),
    ]
        .filter(Boolean)
        .map((t) => `<li>${esc(t)}</li>`)
        .join('');

    const html = `
    <div class="studio-radar-lead-modal studio-radar-lead-modal--dossier">
      <div class="studio-radar-lead-header">
        <span class="studio-radar-score ${scoreClass}" title="Fit score">${esc(String(current.aiScore || 0))}</span>
        <div class="studio-radar-lead-header__info">
          <strong>${esc(current.name || 'New lead')}</strong>
          <div class="studio-radar-muted">${esc(current.leadType)}${current.location ? ` · ${esc(current.location)}` : ''}</div>
        </div>
        <label class="studio-radar-lead-header__stage">
          <span class="studio-radar-field-label">Stage</span>
          <select data-f="status" ${canEdit ? '' : 'disabled'}>${RADAR_STATUSES.map((t) => `<option value="${t}" ${current.status === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        </label>
      </div>
      <div class="studio-radar-why-block">
        <h4>Why Fusion, why now</h4>
        <p>${esc(current.aiRationale || 'Not scored yet. Use AI score when you have enough context.')}</p>
        <p class="studio-radar-muted"><strong>Fit:</strong> ${esc(current.aiRecommendedOpportunity || current.fusionFit || '—')} · <strong>Opening:</strong> ${esc(current.aiBestOpeningTopic || '—')}</p>
        ${watchLine ? `<p class="studio-radar-muted studio-radar-watch"><strong>Watch:</strong> ${esc(watchLine)}</p>` : ''}
        ${sheetExtras.redFlags && current.aiConcern && current.aiConcern !== sheetExtras.redFlags ? `<p class="studio-radar-muted"><strong>Concern:</strong> ${esc(current.aiConcern)}</p>` : ''}
      </div>
      <div class="studio-radar-form-grid" id="radarLeadFields">
        ${field('name', 'Name')}
        ${field('leadType', 'Type', 'select-type')}
        ${field('location', 'Place')}
        ${field('publicEmail', 'Email')}
        ${
            sheetExtras.discountCode
                ? `<div class="studio-radar-discount" data-radar-identity-discount>
            <span class="studio-radar-field-label">Discount</span>
            <button type="button" class="studio-radar-discount__code" data-copy-discount="${esc(sheetExtras.discountCode)}" title="Copy discount code">${esc(sheetExtras.discountCode)}</button>
          </div>`
                : ''
        }
        ${field('nextAction', 'Next', 'text', { full: true })}
      </div>
      <details class="studio-radar-more">
        <summary>More fields</summary>
        <div class="studio-radar-form-grid studio-radar-form-grid--descriptive">
          ${field('careerStage', 'Career stage', 'select-career', { hint: true })}
          ${field('discipline', 'Discipline', 'text', { hint: true })}
          ${field('website', 'Website', 'text', { hint: true })}
          ${field('instagram', 'Instagram', 'text', { hint: true })}
          ${field('representation', 'Representation', 'text', { hint: true })}
          ${field('regionKey', 'Region key', 'text', { hint: true })}
          ${field('japanConnection', 'Japan connection', 'text', { hint: true })}
          ${field('fusionFit', 'Fusion fit', 'text', { hint: true })}
          ${field('discoveryReason', 'Discovery reason', 'text', { hint: true })}
          ${field('warmConnection', 'Warm connection', 'text', { hint: true })}
          ${field('recentActivity', 'Recent activity', 'textarea', { hint: true })}
          ${field('notes', 'Notes', 'textarea', { hint: true })}
          <label class="full">
            <span class="studio-radar-field-label">Enrich from text</span>
            <span class="studio-radar-field-hint">Paste a bio or exhibition text. Review before save.</span>
            <textarea id="radarEnrichText" rows="3" placeholder="Paste public bio or excerpt…"></textarea>
          </label>
        </div>
        ${
            canEdit
                ? `<div class="studio-radar-more__score">
            <button type="button" class="studio-btn-ghost" data-radar-act="enrich">Enrich</button>
            <button type="button" class="studio-btn-ghost" data-radar-act="score">AI score</button>
            <button type="button" class="studio-btn-secondary" data-radar-act="accept">Accept score</button>
          </div>`
                : ''
        }
      </details>
      <ul class="studio-radar-timeline">${timeline || '<li class="studio-radar-muted">No timeline yet</li>'}</ul>
      <p id="radarLeadMsg" class="studio-radar-muted" role="status"></p>
    </div>
  `;

    const { root, close } = openStudioModal(html, {
        title: current.name || 'Radar lead',
        subtitle: current.location || current.leadType || 'Dossier',
        wide: true,
        footerHtml: canEdit
            ? `<div class="studio-radar-modal-footer">
      <button type="button" class="studio-btn-ghost" data-radar-act="outreach">Draft outreach</button>
      <button type="button" class="studio-btn-primary" data-radar-act="save">Save</button>
    </div>`
            : '',
    });

    const msg = () => root.querySelector('#radarLeadMsg');

    const readFields = () => {
        const next = { ...current };
        root.querySelectorAll('[data-f]').forEach((el) => {
            const key = el.getAttribute('data-f');
            if (key) next[key] = /** @type {HTMLInputElement} */ (el).value;
        });
        return emptyLead(next);
    };

    root.addEventListener('click', async (ev) => {
        const copyBtn = /** @type {HTMLElement} */ (ev.target)?.closest?.('[data-copy-discount]');
        if (copyBtn instanceof HTMLButtonElement) {
            const code = copyBtn.getAttribute('data-copy-discount') || '';
            try {
                await navigator.clipboard.writeText(code);
                const status = msg();
                if (status) status.textContent = 'Discount code copied.';
            } catch {
                const status = msg();
                if (status) status.textContent = code;
            }
            return;
        }
        const btn = /** @type {HTMLElement} */ (ev.target)?.closest?.('[data-radar-act]');
        if (!(btn instanceof HTMLButtonElement)) return;
        const act = btn.getAttribute('data-radar-act');
        const status = msg();
        try {
            if (act === 'save') {
                if (status) status.textContent = 'Saving…';
                current = await saveRadarLead(readFields());
                if (status) {
                    status.textContent = 'Saved.';
                    status.classList.remove('studio-radar-error');
                }
                opts.onSaved?.(current);
            } else if (act === 'score') {
                if (status) status.textContent = 'Scoring…';
                current = await saveRadarLead(readFields());
                current = await scoreLead(current, '');
                if (status) status.textContent = `Scored ${current.aiScore}.`;
                opts.onSaved?.(current);
                close();
                openRadarLeadModal(current, opts);
            } else if (act === 'accept') {
                current = await applyScoreFeedback(readFields(), { action: 'accept' });
                if (status) status.textContent = 'Score accepted (feedback recorded).';
                opts.onSaved?.(current);
            } else if (act === 'enrich') {
                const text = /** @type {HTMLTextAreaElement} */ (root.querySelector('#radarEnrichText'))
                    ?.value;
                if (!text?.trim()) {
                    if (status) status.textContent = 'Paste text to enrich.';
                    return;
                }
                if (status) status.textContent = 'Enriching…';
                const raw = await enrichRadarFromText(text);
                const parsed = parseEnrichJson(raw);
                current = emptyLead({ ...readFields(), ...parsed, notes: readFields().notes });
                if (status) status.textContent = 'Fields updated from enrich — review and save.';
                root.querySelectorAll('[data-f]').forEach((el) => {
                    const key = el.getAttribute('data-f');
                    if (key && current[key] != null && 'value' in el) {
                        /** @type {HTMLInputElement} */ (el).value = String(current[key]);
                    }
                });
            } else if (act === 'outreach') {
                current = await saveRadarLead(readFields());
                close();
                openRadarOutreachComposer(current, { onSent: () => opts.onSaved?.(current) });
            }
        } catch (err) {
            if (status) {
                status.textContent = err instanceof Error ? err.message : String(err);
                status.classList.add('studio-radar-error');
            }
        }
    });
}
