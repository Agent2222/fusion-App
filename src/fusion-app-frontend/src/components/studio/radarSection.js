/**
 * Studio → Radar: relationship intelligence (siloed fusion-radar canister).
 */
import '../../styles/studioRadar.css';
import { studioFeatureAccess } from '../../utils/studioShellState.js';
import {
    RADAR_LEAD_TYPES,
    RADAR_PIPELINE_STATUSES,
    RADAR_SOURCE_TYPES,
    RADAR_STATUSES,
    RADAR_TRIGGER_TYPES,
    emptyLead,
    filterLeads,
    leadsToCsv,
    scoreTier,
} from '../../utils/radarModel.js';
import {
    getRadarLeadsCached,
    getRadarLoadState,
    getRadarOutreachCached,
    getRadarRelationshipsCached,
    getRadarSourcesCached,
    loadRadarWorkspace,
    removeRadarLead,
    subscribeRadar,
} from '../../utils/radarStore.js';
import {
    deleteRadarSource,
    getRadarTriggerConfig,
    setRadarTriggerConfig,
    upsertRadarOutreach,
    upsertRadarRelationship,
    upsertRadarSource,
    bootstrapRadarAdmin,
} from '../../utils/radarApi.js';
import { radarDiscoverHealth, runRadarDiscoveryBatch } from '../../utils/radarDiscovery.js';
import { computeRadarEntityBridges, syncRadarBridgeRelationships } from '../../utils/radarBridges.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { openRadarLeadModal } from './radarLeadModal.js';
import { openRadarOutreachComposer } from './radarOutreachComposer.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** @type {'discover'|'leads'|'relationships'|'outreach'|'sources'|'analytics'} */
let activeTab = 'leads';
/** @type {{ q: string, type: string, status: string, region: string }} */
let filters = { q: '', type: '', status: '', region: '' };
/** @type {(() => void) | null} */
let unsub = null;

const TABS = [
    { id: 'discover', label: 'Discover' },
    { id: 'leads', label: 'Leads' },
    { id: 'relationships', label: 'Relationships' },
    { id: 'outreach', label: 'Outreach' },
    { id: 'sources', label: 'Sources' },
    { id: 'analytics', label: 'Analytics' },
];

export function renderRadar() {
    const access = studioFeatureAccess('radar');
    if (!access.visible) {
        return `<div class="studio-section"><p class="studio-muted">You do not have access to Radar.</p></div>`;
    }
    return `<div class="studio-radar-page" id="studio-radar-root" data-can-edit="${access.canEdit ? '1' : '0'}"></div>`;
}

/**
 * @param {HTMLElement} mainEl
 */
export async function initRadar(mainEl) {
    const root = mainEl.querySelector('#studio-radar-root');
    if (!(root instanceof HTMLElement)) return;
    const canEdit = root.getAttribute('data-can-edit') === '1';

    if (unsub) {
        unsub();
        unsub = null;
    }

    const paint = () => {
        const { loadState, loadError } = getRadarLoadState();
        const leads = getRadarLeadsCached();
        const sources = getRadarSourcesCached();
        const outreach = getRadarOutreachCached();
        const relationships = getRadarRelationshipsCached();
        const filtered = filterLeads(leads, filters);

        root.innerHTML = `
      <div class="studio-radar-tabs" role="tablist">
        ${TABS.map(
            (t) =>
                `<button type="button" role="tab" data-radar-tab="${t.id}" class="${activeTab === t.id ? 'is-active' : ''}">${esc(t.label)}</button>`,
        ).join('')}
      </div>
      <div class="studio-radar-panel" data-radar-panel>
        ${loadState === 'loading' ? `<p class="studio-radar-muted">Loading Radar…</p>` : ''}
        ${loadState === 'error' ? `<p class="studio-radar-muted">${esc(loadError)}</p>` : ''}
        ${activeTab === 'discover' ? renderDiscover(leads, canEdit) : ''}
        ${activeTab === 'leads' ? renderLeads(filtered, canEdit) : ''}
        ${activeTab === 'relationships' ? renderRelationships(relationships, leads) : ''}
        ${activeTab === 'outreach' ? renderOutreach(outreach, leads, canEdit) : ''}
        ${activeTab === 'sources' ? renderSources(sources, canEdit) : ''}
        ${activeTab === 'analytics' ? renderAnalytics(leads, outreach, sources) : ''}
      </div>
    `;
        bind(root, canEdit, paint);
    };

    unsub = subscribeRadar(paint);
    paint();
    try {
        await bootstrapRadarAdmin().catch(() => false);
        await loadRadarWorkspace();
    } catch {
        paint();
    }
}

/**
 * @param {ReturnType<typeof emptyLead>[]} leads
 * @param {boolean} canEdit
 */
function renderDiscover(leads, canEdit) {
    const cols = RADAR_PIPELINE_STATUSES.map((status) => {
        const cards = leads
            .filter((l) => l.status === status)
            .map(
                (l) => `
        <div class="studio-radar-card" data-open-lead="${esc(l.id)}">
          <strong>${esc(l.name || 'Untitled')}</strong>
          <span class="studio-radar-chip">${esc(l.leadType)}</span>
          <span class="studio-radar-score studio-radar-score--${scoreTier(l.aiScore)}" style="width:1.6rem;height:1.6rem;font-size:0.65rem;margin-left:0.35rem">${esc(String(l.aiScore || 0))}</span>
          <p class="studio-radar-why">${esc(l.aiRationale || l.discoveryReason || 'Awaiting qualification')}</p>
        </div>`,
            )
            .join('');
        return `<div class="studio-radar-col"><h3>${esc(status)}</h3>${cards || '<p class="studio-radar-muted">Empty</p>'}</div>`;
    }).join('');

    return `
    <div class="studio-radar-toolbar">
      ${canEdit ? `<button type="button" class="studio-radar-btn studio-radar-btn--primary" data-radar-act="add-lead">Add lead</button>` : ''}
      ${canEdit ? `<button type="button" class="studio-radar-btn" data-radar-act="run-discovery">Run discovery</button>` : ''}
      <button type="button" class="studio-radar-btn" data-radar-act="health">API health</button>
      <span class="studio-radar-muted" id="radarDiscoverStatus"></span>
    </div>
    <div class="studio-radar-kanban">${cols}</div>
  `;
}

/**
 * @param {ReturnType<typeof emptyLead>[]} filtered
 * @param {boolean} canEdit
 */
function renderLeads(filtered, canEdit) {
    const rows = filtered
        .map(
            (l) => `
      <tr data-open-lead="${esc(l.id)}">
        <td><input type="checkbox" data-bulk="${esc(l.id)}" onclick="event.stopPropagation()" /></td>
        <td><strong>${esc(l.name)}</strong><div class="studio-radar-muted">${esc(l.publicEmail)}</div></td>
        <td><span class="studio-radar-chip">${esc(l.leadType)}</span></td>
        <td>${esc(l.location)}</td>
        <td><span class="studio-radar-score studio-radar-score--${scoreTier(l.aiScore)}">${esc(String(l.aiScore || 0))}</span></td>
        <td>${esc(l.status)}</td>
        <td>${esc(l.fusionFit)}</td>
        <td>${esc(l.japanConnection)}</td>
        <td>${esc(l.nextAction)}</td>
      </tr>`,
        )
        .join('');

    return `
    <div class="studio-radar-toolbar">
      <input type="search" placeholder="Search…" data-filter="q" value="${esc(filters.q)}" />
      <select data-filter="type"><option value="">All types</option>${RADAR_LEAD_TYPES.map((t) => `<option value="${t}" ${filters.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select data-filter="status"><option value="">All statuses</option>${RADAR_STATUSES.map((t) => `<option value="${t}" ${filters.status === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <input type="text" placeholder="Region" data-filter="region" value="${esc(filters.region)}" />
      ${canEdit ? `<button type="button" class="studio-radar-btn studio-radar-btn--primary" data-radar-act="add-lead">Add lead</button>` : ''}
      <button type="button" class="studio-radar-btn" data-radar-act="export-csv">Export CSV</button>
      ${canEdit ? `<button type="button" class="studio-radar-btn" data-radar-act="bulk-delete">Delete selected</button>` : ''}
    </div>
    <div class="studio-radar-table-wrap">
      <table class="studio-radar-table">
        <thead><tr><th></th><th>Name</th><th>Type</th><th>Location</th><th>Score</th><th>Status</th><th>Fit</th><th>Japan</th><th>Next</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="9" class="studio-radar-muted">No leads yet</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

/**
 * @param {any[]} relationships
 * @param {ReturnType<typeof emptyLead>[]} leads
 */
function renderRelationships(relationships, leads) {
    const byLead = new Map();
    for (const r of relationships) {
        const key = r.fromLeadId || 'unknown';
        if (!byLead.has(key)) byLead.set(key, []);
        byLead.get(key).push(r);
    }
    const nameOf = (id) => leads.find((l) => l.id === id)?.name || id;
    const blocks = [...byLead.entries()]
        .map(([id, rels]) => {
            const items = rels
                .map(
                    (r) =>
                        `<li><span class="studio-radar-chip">${esc(r.kind)}</span> ${esc(r.label || nameOf(r.toLeadId))} <span class="studio-radar-muted">${esc(r.evidence)}</span></li>`,
                )
                .join('');
            return `<div class="studio-radar-card"><strong>${esc(nameOf(id))}</strong><ul>${items}</ul></div>`;
        })
        .join('');

    return `
    <div class="studio-radar-toolbar">
      <button type="button" class="studio-radar-btn" data-radar-act="compute-bridges">Compute Fusion bridges</button>
      <button type="button" class="studio-radar-btn studio-radar-btn--primary" data-radar-act="sync-bridges">Sync bridges to Radar</button>
      <button type="button" class="studio-radar-btn" data-radar-act="add-rel">Add relationship</button>
      <span class="studio-radar-muted" id="radarRelStatus"></span>
    </div>
    <p class="studio-radar-muted">Lead↔lead edges live on the Radar canister. Fusion roster/applicant matches are joined in the Studio UI, then optionally persisted as relationships.</p>
    ${blocks || '<p class="studio-radar-muted">No relationships yet</p>'}
  `;
}

/**
 * @param {any[]} outreach
 * @param {ReturnType<typeof emptyLead>[]} leads
 * @param {boolean} canEdit
 */
function renderOutreach(outreach, leads, canEdit) {
    const drafts = outreach.filter((o) => o.status === 'drafted' || o.status === 'approved');
    const sent = outreach.filter((o) => o.status === 'sent' || o.status === 'replied');
    const cfg = getRadarTriggerConfig();
    const triggers = RADAR_TRIGGER_TYPES.map(
        (t) =>
            `<label style="display:inline-flex;gap:0.35rem;align-items:center;margin-right:0.75rem"><input type="checkbox" data-trigger="${esc(t.id)}" ${cfg.enabled?.includes(t.id) ? 'checked' : ''}/> ${esc(t.label)}</label>`,
    ).join('');

    const draftRows = drafts
        .map((o) => {
            const lead = leads.find((l) => l.id === o.leadId);
            return `<tr>
        <td>${esc(lead?.name || o.leadId)}</td>
        <td>${esc(o.subject)}</td>
        <td>${esc(o.triggerEvent)}</td>
        <td>${esc(o.status)}</td>
        <td>${canEdit ? `<button type="button" class="studio-radar-btn" data-open-outreach="${esc(o.leadId)}">Open</button>` : ''}</td>
      </tr>`;
        })
        .join('');

    const sentRows = sent
        .map((o) => {
            const lead = leads.find((l) => l.id === o.leadId);
            return `<tr><td>${esc(lead?.name || o.leadId)}</td><td>${esc(o.subject)}</td><td>${esc(o.status)}</td><td>${esc(o.sentAt)}</td></tr>`;
        })
        .join('');

    return `
    <div class="studio-radar-why-block">
      <h4>Event triggers</h4>
      <p class="studio-radar-muted">When enabled triggers fire (RSS / discovery / manual), Radar can auto-queue drafts for human approval.</p>
      <div>${triggers}</div>
      <label style="display:inline-flex;gap:0.35rem;margin-top:0.5rem"><input type="checkbox" id="radarAutoDraft" ${cfg.autoDraft ? 'checked' : ''}/> Auto-create drafts</label>
      <button type="button" class="studio-radar-btn" data-radar-act="save-triggers" style="margin-left:0.5rem">Save triggers</button>
      ${canEdit ? `<button type="button" class="studio-radar-btn" data-radar-act="queue-manual-drafts">Queue drafts for qualified leads</button>` : ''}
    </div>
    <h3>Draft queue</h3>
    <div class="studio-radar-table-wrap"><table class="studio-radar-table"><thead><tr><th>Lead</th><th>Subject</th><th>Trigger</th><th>Status</th><th></th></tr></thead><tbody>${draftRows || '<tr><td colspan="5" class="studio-radar-muted">No drafts</td></tr>'}</tbody></table></div>
    <h3>Sent</h3>
    <div class="studio-radar-table-wrap"><table class="studio-radar-table"><thead><tr><th>Lead</th><th>Subject</th><th>Status</th><th>Sent</th></tr></thead><tbody>${sentRows || '<tr><td colspan="4" class="studio-radar-muted">None sent</td></tr>'}</tbody></table></div>
  `;
}

/**
 * @param {any[]} sources
 * @param {boolean} canEdit
 */
function renderSources(sources, canEdit) {
    const rows = sources
        .map(
            (s) => `
      <tr>
        <td>${esc(s.label || s.id)}</td>
        <td><span class="studio-radar-chip">${esc(s.sourceType)}</span></td>
        <td>${esc(s.query || s.url)}</td>
        <td>${esc(s.regionKey)}</td>
        <td>${s.enabled ? 'On' : 'Off'}</td>
        <td>${esc(s.lastRunAt || '—')}</td>
        <td>
          ${canEdit ? `<button type="button" class="studio-radar-btn" data-toggle-source="${esc(s.id)}">${s.enabled ? 'Disable' : 'Enable'}</button>` : ''}
          ${canEdit ? `<button type="button" class="studio-radar-btn" data-del-source="${esc(s.id)}">Delete</button>` : ''}
        </td>
      </tr>`,
        )
        .join('');

    return `
    <div class="studio-radar-toolbar">
      ${canEdit ? `<button type="button" class="studio-radar-btn studio-radar-btn--primary" data-radar-act="add-source">Add source</button>` : ''}
      <button type="button" class="studio-radar-btn" data-radar-act="health">API status</button>
      <span class="studio-radar-muted" id="radarSourceStatus"></span>
    </div>
    <div class="studio-radar-table-wrap">
      <table class="studio-radar-table">
        <thead><tr><th>Label</th><th>Type</th><th>URL / query</th><th>Region</th><th>Enabled</th><th>Last run</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7" class="studio-radar-muted">No sources configured</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

/**
 * @param {ReturnType<typeof emptyLead>[]} leads
 * @param {any[]} outreach
 * @param {any[]} sources
 */
function renderAnalytics(leads, outreach, sources) {
    const funnel = {
        discovered: leads.filter((l) => l.status === 'discovered').length,
        qualified: leads.filter((l) => l.status === 'qualified' || l.status === 'researching').length,
        contacted: leads.filter((l) => l.status === 'contacted').length,
        replied: leads.filter((l) => l.status === 'replied' || l.status === 'connected').length,
    };
    const avg =
        leads.length === 0
            ? 0
            : Math.round(leads.reduce((a, l) => a + (Number(l.aiScore) || 0), 0) / leads.length);
    const byType = RADAR_LEAD_TYPES.map((t) => ({
        t,
        n: leads.filter((l) => l.leadType === t).length,
    }));
    const sent = outreach.filter((o) => o.status === 'sent' || o.status === 'replied').length;
    const replied = outreach.filter((o) => o.status === 'replied').length;
    const responseRate = sent ? Math.round((replied / sent) * 100) : 0;

    const typeBars = byType
        .map(
            (x) => `
      <div class="studio-radar-stat">
        <div class="l">${esc(x.t)}</div>
        <div class="n">${x.n}</div>
        <div class="studio-radar-bar"><span style="width:${leads.length ? (x.n / leads.length) * 100 : 0}%"></span></div>
      </div>`,
        )
        .join('');

    return `
    <div class="studio-radar-stats-grid">
      <div class="studio-radar-stat"><div class="l">Total leads</div><div class="n">${leads.length}</div></div>
      <div class="studio-radar-stat"><div class="l">Avg score</div><div class="n">${avg}</div></div>
      <div class="studio-radar-stat"><div class="l">Discovered</div><div class="n">${funnel.discovered}</div></div>
      <div class="studio-radar-stat"><div class="l">Qualified+</div><div class="n">${funnel.qualified}</div></div>
      <div class="studio-radar-stat"><div class="l">Contacted</div><div class="n">${funnel.contacted}</div></div>
      <div class="studio-radar-stat"><div class="l">Replied/connected</div><div class="n">${funnel.replied}</div></div>
      <div class="studio-radar-stat"><div class="l">Outreach sent</div><div class="n">${sent}</div></div>
      <div class="studio-radar-stat"><div class="l">Response rate</div><div class="n">${responseRate}%</div></div>
      <div class="studio-radar-stat"><div class="l">Sources</div><div class="n">${sources.length}</div></div>
    </div>
    <h3>Type mix</h3>
    <div class="studio-radar-stats-grid">${typeBars}</div>
  `;
}

/**
 * @param {HTMLElement} root
 * @param {boolean} canEdit
 * @param {() => void} paint
 */
function bind(root, canEdit, paint) {
    root.querySelectorAll('[data-radar-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
            activeTab = /** @type {any} */ (btn.getAttribute('data-radar-tab') || 'leads');
            paint();
        });
    });

    root.querySelectorAll('[data-filter]').forEach((el) => {
        const apply = () => {
            const key = el.getAttribute('data-filter');
            if (!key) return;
            filters = { ...filters, [key]: /** @type {HTMLInputElement} */ (el).value };
            paint();
        };
        el.addEventListener('change', apply);
        el.addEventListener('input', apply);
    });

    root.querySelectorAll('[data-open-lead]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-open-lead');
            const lead = getRadarLeadsCached().find((l) => l.id === id);
            if (lead) openRadarLeadModal(lead, { canEdit, onSaved: () => loadRadarWorkspace() });
        });
    });

    root.querySelectorAll('[data-open-outreach]').forEach((el) => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-open-outreach');
            const lead = getRadarLeadsCached().find((l) => l.id === id);
            if (lead) openRadarOutreachComposer(lead, { onSent: () => loadRadarWorkspace() });
        });
    });

    root.addEventListener('click', async (ev) => {
        const t = /** @type {HTMLElement} */ (ev.target);
        const actBtn = t.closest?.('[data-radar-act]');
        if (actBtn instanceof HTMLButtonElement) {
            const act = actBtn.getAttribute('data-radar-act');
            try {
                if (act === 'add-lead') {
                    openRadarLeadModal(emptyLead({ status: 'discovered' }), {
                        canEdit,
                        onSaved: () => loadRadarWorkspace(),
                    });
                } else if (act === 'run-discovery') {
                    const st = root.querySelector('#radarDiscoverStatus');
                    if (st) st.textContent = 'Running…';
                    const res = await runRadarDiscoveryBatch();
                    try {
                        window.posthog?.capture?.('radar_discovery_run', { created: res.created });
                    } catch {
                        /* ignore */
                    }
                    await loadRadarWorkspace();
                    if (st) st.textContent = `Ingested ${res.created} · errors ${res.errors.length}`;
                } else if (act === 'health') {
                    const h = await radarDiscoverHealth();
                    openStudioModal(
                        `<pre style="white-space:pre-wrap;font-size:0.85rem">${esc(JSON.stringify(h, null, 2))}</pre>`,
                        { title: 'Radar API health' },
                    );
                } else if (act === 'export-csv') {
                    const csv = leadsToCsv(filterLeads(getRadarLeadsCached(), filters));
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'fusion-radar-leads.csv';
                    a.click();
                } else if (act === 'bulk-delete' && canEdit) {
                    const ids = [...root.querySelectorAll('[data-bulk]:checked')].map((x) =>
                        x.getAttribute('data-bulk'),
                    );
                    for (const id of ids) {
                        if (id) await removeRadarLead(id);
                    }
                    await loadRadarWorkspace();
                } else if (act === 'compute-bridges') {
                    const st = root.querySelector('#radarRelStatus');
                    const { matches } = await computeRadarEntityBridges();
                    if (st) st.textContent = `${matches.length} matches found`;
                    openStudioModal(
                        `<ul>${matches
                            .slice(0, 40)
                            .map(
                                (m) =>
                                    `<li><strong>${esc(m.leadName)}</strong> → ${esc(m.foreignLabel)} (${esc(m.kind)})</li>`,
                            )
                            .join('')}</ul>`,
                        { title: 'Fusion bridges', wide: true },
                    );
                } else if (act === 'sync-bridges') {
                    const st = root.querySelector('#radarRelStatus');
                    const res = await syncRadarBridgeRelationships();
                    if (st) st.textContent = `Synced ${res.created} new edges (${res.matchCount} matches)`;
                    await loadRadarWorkspace();
                } else if (act === 'add-rel') {
                    openAddRelationshipModal(() => loadRadarWorkspace());
                } else if (act === 'add-source') {
                    openAddSourceModal(() => loadRadarWorkspace());
                } else if (act === 'save-triggers') {
                    const enabled = [...root.querySelectorAll('[data-trigger]:checked')].map((x) =>
                        x.getAttribute('data-trigger'),
                    );
                    const autoDraft = Boolean(
                        /** @type {HTMLInputElement} */ (root.querySelector('#radarAutoDraft'))?.checked,
                    );
                    setRadarTriggerConfig({ enabled, autoDraft });
                } else if (act === 'queue-manual-drafts') {
                    const cfg = getRadarTriggerConfig();
                    if (!cfg.autoDraft) return;
                    const leads = getRadarLeadsCached().filter(
                        (l) => l.status === 'qualified' && l.publicEmail,
                    );
                    for (const lead of leads.slice(0, 20)) {
                        await upsertRadarOutreach({
                            id: '',
                            leadId: lead.id,
                            subject: `Fusion — ${lead.name}`,
                            bodyHtml: lead.aiRationale || lead.aiBestOpeningTopic || '',
                            triggerEvent: 'manual',
                            templateId: '',
                            status: 'drafted',
                        });
                    }
                    await loadRadarWorkspace();
                }
            } catch (err) {
                openStudioModal(
                    `<p>${esc(err instanceof Error ? err.message : String(err))}</p>`,
                    { title: 'Radar' },
                );
            }
        }

        const tog = t.closest?.('[data-toggle-source]');
        if (tog instanceof HTMLElement && canEdit) {
            const id = tog.getAttribute('data-toggle-source');
            const src = getRadarSourcesCached().find((s) => s.id === id);
            if (src) {
                await upsertRadarSource({ ...src, enabled: !src.enabled });
                await loadRadarWorkspace();
            }
        }
        const del = t.closest?.('[data-del-source]');
        if (del instanceof HTMLElement && canEdit) {
            const id = del.getAttribute('data-del-source');
            if (id) {
                await deleteRadarSource(id);
                await loadRadarWorkspace();
            }
        }
    });
}

/**
 * @param {() => void} onDone
 */
function openAddSourceModal(onDone) {
    const typeOpts = RADAR_SOURCE_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('');
    const { root, close } = openStudioModal(
        `<div class="studio-radar-form-grid">
      <label>Label<input id="rsLabel" /></label>
      <label>Type<select id="rsType">${typeOpts}</select></label>
      <label class="full">URL<input id="rsUrl" /></label>
      <label class="full">Query (Places)<input id="rsQuery" placeholder="contemporary art gallery in Brooklyn" /></label>
      <label>Region<input id="rsRegion" /></label>
      <label>Interval hours<input id="rsInterval" type="number" value="24" /></label>
    </div>`,
        {
            title: 'Add discovery source',
            footerHtml: `<button type="button" class="studio-radar-btn studio-radar-btn--primary" id="rsSave">Save</button>`,
        },
    );
    root.querySelector('#rsSave')?.addEventListener('click', async () => {
        await upsertRadarSource({
            id: '',
            label: /** @type {HTMLInputElement} */ (root.querySelector('#rsLabel')).value,
            sourceType: /** @type {HTMLSelectElement} */ (root.querySelector('#rsType')).value,
            url: /** @type {HTMLInputElement} */ (root.querySelector('#rsUrl')).value,
            query: /** @type {HTMLInputElement} */ (root.querySelector('#rsQuery')).value,
            regionKey: /** @type {HTMLInputElement} */ (root.querySelector('#rsRegion')).value,
            enabled: true,
            runIntervalHours: Number(
                /** @type {HTMLInputElement} */ (root.querySelector('#rsInterval')).value,
            ),
            lastRunAt: '',
            createdAt: '',
        });
        close();
        onDone();
    });
}

/**
 * @param {() => void} onDone
 */
function openAddRelationshipModal(onDone) {
    const leads = getRadarLeadsCached();
    const opts = leads
        .map((l) => `<option value="${esc(l.id)}">${esc(l.name || l.id)}</option>`)
        .join('');
    const { root, close } = openStudioModal(
        `<div class="studio-radar-form-grid">
      <label>From<select id="rrFrom">${opts}</select></label>
      <label>To<select id="rrTo">${opts}</select></label>
      <label>Kind<select id="rrKind"><option>collaboratesWith</option><option>represents</option><option>exhibitedBy</option><option>curatedBy</option><option>referredBy</option><option>fusionMember</option><option>appliedTo</option></select></label>
      <label class="full">Label<input id="rrLabel" /></label>
      <label class="full">Evidence<input id="rrEvidence" /></label>
    </div>`,
        {
            title: 'Add relationship',
            footerHtml: `<button type="button" class="studio-radar-btn studio-radar-btn--primary" id="rrSave">Save</button>`,
        },
    );
    root.querySelector('#rrSave')?.addEventListener('click', async () => {
        await upsertRadarRelationship({
            id: '',
            fromLeadId: /** @type {HTMLSelectElement} */ (root.querySelector('#rrFrom')).value,
            toLeadId: /** @type {HTMLSelectElement} */ (root.querySelector('#rrTo')).value,
            kind: /** @type {HTMLSelectElement} */ (root.querySelector('#rrKind')).value,
            label: /** @type {HTMLInputElement} */ (root.querySelector('#rrLabel')).value,
            evidence: /** @type {HTMLInputElement} */ (root.querySelector('#rrEvidence')).value,
            createdAt: '',
        });
        close();
        onDone();
    });
}
