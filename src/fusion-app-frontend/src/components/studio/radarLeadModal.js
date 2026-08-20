/**
 * Radar lead detail / edit modal.
 */
import { openStudioModal } from '../../utils/studioModal.js';
import { emptyLead, RADAR_CAREER_STAGES, RADAR_LEAD_TYPES, RADAR_STATUSES, scoreTier } from '../../utils/radarModel.js';
import { saveRadarLead } from '../../utils/radarStore.js';
import { applyScoreFeedback, scoreLead } from '../../utils/radarScoring.js';
import { enrichRadarFromText } from '../../utils/radarApi.js';
import { parseEnrichJson } from '../../utils/radarScoring.js';
import { listRadarOutreach, listRadarRelationships } from '../../utils/radarApi.js';
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
        const settled = await Promise.allSettled([
            listRadarOutreach(current.id),
            listRadarRelationships(current.id),
        ]);
        outreach = settled[0].status === 'fulfilled' ? settled[0].value : [];
        rels = settled[1].status === 'fulfilled' ? settled[1].value : [];
    }

    const scoreClass = `studio-radar-score--${scoreTier(current.aiScore)}`;
    const field = (key, label, type = 'text') => {
        if (type === 'select-type') {
            return `<label>${esc(label)}<select data-f="${esc(key)}" ${canEdit ? '' : 'disabled'}>${RADAR_LEAD_TYPES.map((t) => `<option value="${t}" ${current.leadType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
        }
        if (type === 'select-status') {
            return `<label>${esc(label)}<select data-f="${esc(key)}" ${canEdit ? '' : 'disabled'}>${RADAR_STATUSES.map((t) => `<option value="${t}" ${current.status === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
        }
        if (type === 'select-career') {
            return `<label>${esc(label)}<select data-f="${esc(key)}" ${canEdit ? '' : 'disabled'}>${RADAR_CAREER_STAGES.map((t) => `<option value="${t}" ${current.careerStage === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
        }
        if (type === 'textarea') {
            return `<label class="full">${esc(label)}<textarea data-f="${esc(key)}" rows="3" ${canEdit ? '' : 'disabled'}>${esc(current[key] || '')}</textarea></label>`;
        }
        return `<label>${esc(label)}<input data-f="${esc(key)}" value="${esc(current[key] || '')}" ${canEdit ? '' : 'disabled'} /></label>`;
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
    <div class="studio-radar-lead-modal">
      <div style="display:flex;gap:1rem;align-items:center;margin-bottom:0.75rem">
        <span class="studio-radar-score ${scoreClass}">${esc(String(current.aiScore || 0))}</span>
        <div>
          <strong>${esc(current.name || 'New lead')}</strong>
          <div class="studio-radar-muted">${esc(current.leadType)} · ${esc(current.status)}</div>
        </div>
      </div>
      <div class="studio-radar-why-block">
        <h4>Why Fusion, why this person, why now?</h4>
        <p>${esc(current.aiRationale || 'Not scored yet — run AI score to generate rationale.')}</p>
        <p class="studio-radar-muted"><strong>Fit:</strong> ${esc(current.aiRecommendedOpportunity || current.fusionFit || '—')} · <strong>Opening:</strong> ${esc(current.aiBestOpeningTopic || '—')}</p>
        ${current.aiConcern ? `<p class="studio-radar-muted"><strong>Concern:</strong> ${esc(current.aiConcern)}</p>` : ''}
      </div>
      <div class="studio-radar-form-grid" id="radarLeadFields">
        ${field('name', 'Name')}
        ${field('leadType', 'Type', 'select-type')}
        ${field('status', 'Status', 'select-status')}
        ${field('careerStage', 'Career stage', 'select-career')}
        ${field('location', 'Location')}
        ${field('discipline', 'Discipline')}
        ${field('website', 'Website')}
        ${field('publicEmail', 'Public email')}
        ${field('instagram', 'Instagram')}
        ${field('representation', 'Representation')}
        ${field('regionKey', 'Region key')}
        ${field('japanConnection', 'Japan connection')}
        ${field('fusionFit', 'Fusion fit')}
        ${field('discoveryReason', 'Discovery reason')}
        ${field('warmConnection', 'Warm connection')}
        ${field('nextAction', 'Next action')}
        ${field('recentActivity', 'Recent activity', 'textarea')}
        ${field('notes', 'Notes', 'textarea')}
        <label class="full">Enrich from pasted text / URL page text
          <textarea id="radarEnrichText" rows="3" placeholder="Paste public bio, exhibition text, or crawl excerpt…"></textarea>
        </label>
      </div>
      <ul class="studio-radar-timeline">${timeline || '<li class="studio-radar-muted">No timeline events yet</li>'}</ul>
      <p id="radarLeadMsg" class="studio-radar-muted" role="status"></p>
    </div>
  `;

    const { root, close } = openStudioModal(html, {
        title: current.name || 'Radar lead',
        subtitle: 'Relationship intelligence record',
        wide: true,
        footerHtml: canEdit
            ? `
      <button type="button" class="studio-btn-ghost" data-radar-act="enrich">Enrich</button>
      <button type="button" class="studio-btn-ghost" data-radar-act="score">AI score</button>
      <button type="button" class="studio-btn-secondary" data-radar-act="accept">Accept score</button>
      <button type="button" class="studio-btn-ghost" data-radar-act="outreach">Draft outreach</button>
      <button type="button" class="studio-btn-primary" data-radar-act="save">Save</button>
    `
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
