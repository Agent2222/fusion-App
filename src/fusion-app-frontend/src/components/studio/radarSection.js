/**
 * Studio → Radar: relationship intelligence (siloed fusion-radar canister).
 * Layout/typography aligned with Finance (MPD tabs, intro, Studio buttons).
 */
import '../../styles/memberProfileDashboard.css';
import '../../styles/studioRadar.css';
import { studioFeatureAccess } from '../../utils/studioShellState.js';
import { studioIconHref } from '../../utils/studioIconRegistry.js';
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
    getRadarAccessState,
    addRadarStaffPrincipal,
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
/** @type {{ isAdmin: boolean, isStaffOrAdmin: boolean, bootstrapped: boolean, error?: string, bootstrapNote?: string }} */
let radarAccess = { isAdmin: false, isStaffOrAdmin: false, bootstrapped: false };

/**
 * @param {string} loadError
 */
function formatRadarLoadHint(loadError) {
    const msg = String(loadError || '');
    if (/canister id missing/i.test(msg)) {
        return `${msg} Restart Vite after dfx deploy fusion-radar, or set VITE_FUSION_RADAR_CANISTER_ID.`;
    }
    if (/staff or admin only/i.test(msg)) {
        return `${msg} Studio “radar” permission is separate from the Radar canister allowlist — ask a Radar admin to add your principal.`;
    }
    return msg;
}

/** @type {{ id: typeof activeTab, label: string, icon: string, blurb: string }[]} */
const TABS = [
    {
        id: 'discover',
        label: 'Discover',
        icon: 'nav-ai',
        blurb: 'Scan your pipeline board. Add leads manually or run discovery, then open a card to qualify and score.',
    },
    {
        id: 'leads',
        label: 'Leads',
        icon: 'nav-subscribers',
        blurb: 'Search and filter your roster of prospects. Export CSV, open a row to edit, or bulk-delete selected leads.',
    },
    {
        id: 'relationships',
        label: 'Relationships',
        icon: 'nav-community',
        blurb: 'Map how leads connect to each other and to Fusion. Compute roster bridges, then sync edges onto Radar.',
    },
    {
        id: 'outreach',
        label: 'Outreach',
        icon: 'nav-email',
        blurb: 'Configure event triggers, queue drafts for approval, and track what has been sent or replied.',
    },
    {
        id: 'sources',
        label: 'Sources',
        icon: 'nav-content',
        blurb: 'Manage discovery feeds (RSS, lists, Places queries). Enable or disable sources before running Discover.',
    },
    {
        id: 'analytics',
        label: 'Analytics',
        icon: 'group-overview',
        blurb: 'Glance at funnel volume, average fit score, outreach response rate, and lead-type mix.',
    },
];

/**
 * @param {string} iconKey
 */
function tabIconStyle(iconKey) {
    const href = studioIconHref(iconKey);
    return href ? ` style="--mpd-icon-url: url('${esc(href)}')"` : '';
}

/**
 * @param {typeof activeTab} id
 */
function tabMeta(id) {
    return TABS.find((t) => t.id === id) || TABS[1];
}

export function renderRadar() {
    const access = studioFeatureAccess('radar');
    if (!access.visible) {
        return `<div class="studio-section"><p class="studio-muted">You do not have access to Radar.</p></div>`;
    }
    return `<div class="studio-section-stack studio-category-page studio-radar-page" id="studio-radar-root" data-can-edit="${access.canEdit ? '1' : '0'}"></div>`;
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
        const meta = tabMeta(activeTab);

        const tabsHtml = TABS.map((t) => {
            const active = t.id === activeTab;
            return `<button type="button" class="mpd-program-tab mpd-program-tab--${esc(t.id)}${active ? ' is-active' : ''}" role="tab" id="studio-radar-tab-${esc(t.id)}" aria-selected="${active ? 'true' : 'false'}" tabindex="${active ? '0' : '-1'}" aria-controls="studio-radar-panel" data-radar-tab="${esc(t.id)}">
                <span class="mpd-program-tab__icon"${tabIconStyle(t.icon)} aria-hidden="true"></span>
                <span>${esc(t.label)}</span>
            </button>`;
        }).join('');

        let body = '';
        if (activeTab === 'discover') body = renderDiscover(leads, canEdit);
        else if (activeTab === 'leads') body = renderLeads(filtered, canEdit);
        else if (activeTab === 'relationships') body = renderRelationships(relationships, leads, canEdit);
        else if (activeTab === 'outreach') body = renderOutreach(outreach, leads, canEdit);
        else if (activeTab === 'sources') body = renderSources(sources, canEdit);
        else body = renderAnalytics(leads, outreach, sources);

        const accessBanner = renderAccessBanner(loadState, loadError);

        root.innerHTML = `
      <div class="studio-radar-intro">
        <h2 class="studio-radar-intro__title">Radar</h2>
        <p class="studio-muted studio-radar-intro__hint">Relationship intelligence for Fusion outreach — find fit, map warm paths, and draft messages with human approval before send.</p>
      </div>
      ${accessBanner}
      <p class="member-profile-dashboard__status-line" role="status" aria-live="polite" id="studio-radar-status-line">${
          loadState === 'loading'
              ? 'Loading Radar…'
              : loadState === 'error'
                ? esc(formatRadarLoadHint(loadError) || 'Failed to load Radar')
                : `${leads.length} lead${leads.length === 1 ? '' : 's'} · ${outreach.length} outreach · ${sources.length} source${sources.length === 1 ? '' : 's'}`
      }</p>
      ${
          loadState === 'loading'
              ? `<div class="mpd-initial-loading" role="status"><div class="mpd-initial-loading__spinner" aria-hidden="true"></div><p>Loading Radar workspace…</p></div>`
              : ''
      }
      <div class="studio-radar-workspace" ${loadState === 'loading' ? 'hidden' : ''}>
        <div class="studio-radar-domain-tabs">
          <div class="mpd-program-tabs" role="tablist" aria-label="Radar sections">${tabsHtml}</div>
        </div>
        <div class="mpd-program-tab-panel" id="studio-radar-panel" role="tabpanel" aria-labelledby="studio-radar-tab-${esc(activeTab)}" data-radar-panel>
          <section class="member-profile-dashboard__card">
            <div class="studio-radar-panel-head">
              <h2>${esc(meta.label)}</h2>
              <p>${esc(meta.blurb)}</p>
            </div>
            ${body}
          </section>
        </div>
      </div>
    `;
        bind(root, canEdit, paint);
    };

    unsub = subscribeRadar(paint);
    paint();
    try {
        let bootstrapNote = '';
        try {
            const bootstrapped = await bootstrapRadarAdmin();
            if (bootstrapped) {
                bootstrapNote = 'You are now the first Radar admin on this canister.';
            }
        } catch (bootErr) {
            bootstrapNote =
                bootErr instanceof Error
                    ? `Bootstrap: ${bootErr.message}`
                    : `Bootstrap: ${String(bootErr)}`;
        }
        radarAccess = await getRadarAccessState();
        if (bootstrapNote) radarAccess = { ...radarAccess, bootstrapNote };
        try {
            await loadRadarWorkspace();
        } catch {
            /* loadError already in store; paint via subscribe */
        }
        paint();
    } catch {
        paint();
    }
}

/**
 * @param {'idle'|'loading'|'ready'|'error'} loadState
 * @param {string} loadError
 */
function renderAccessBanner(loadState, loadError) {
    const parts = [];
    if (radarAccess.bootstrapNote) {
        parts.push(`<p>${esc(radarAccess.bootstrapNote)}</p>`);
    }
    if (radarAccess.error && loadState === 'error') {
        parts.push(`<p>${esc(formatRadarLoadHint(radarAccess.error))}</p>`);
    } else if (loadState === 'error' && loadError) {
        parts.push(`<p>${esc(formatRadarLoadHint(loadError))}</p>`);
    } else if (!radarAccess.isStaffOrAdmin && loadState !== 'loading') {
        parts.push(
            `<p><strong>Radar canister access:</strong> Studio “radar” permission is separate from the Radar staff/admin allowlist. Ask a Radar admin to add your Internet Identity principal, or bootstrap as the first admin if the canister is empty.</p>`,
        );
    } else if (radarAccess.isStaffOrAdmin) {
        const role = radarAccess.isAdmin ? 'admin' : 'staff';
        parts.push(
            `<p class="studio-radar-access-ok">Radar access: <strong>${esc(role)}</strong>. Studio permission gates the nav; canister allowlist gates reads/writes.</p>`,
        );
    }
    if (radarAccess.isAdmin) {
        parts.push(`
      <div class="studio-radar-staff-add">
        <label class="studio-field studio-field--grow">
          <span>Add Radar staff principal</span>
          <input type="text" class="studio-input" id="radarAddStaffPrincipal" placeholder="aaaaa-aa…" autocomplete="off" />
        </label>
        <button type="button" class="studio-btn-secondary" data-radar-act="add-staff">Add staff</button>
        <span class="studio-radar-status" id="radarStaffStatus" role="status"></span>
      </div>`);
    }
    if (!parts.length) return '';
    return `<div class="studio-radar-banner ${loadState === 'error' || (!radarAccess.isStaffOrAdmin && loadState !== 'loading') ? 'studio-radar-banner--warn' : ''}" role="status">${parts.join('')}</div>`;
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
        return `<div class="studio-radar-col"><h3>${esc(status)}</h3>${cards || '<p class="studio-radar-empty">No cards</p>'}</div>`;
    }).join('');

    return `
    <div class="studio-radar-toolbar">
      <div class="studio-radar-toolbar-actions">
        ${canEdit ? `<button type="button" class="studio-btn-primary" data-radar-act="add-lead">Add lead</button>` : ''}
        ${canEdit ? `<button type="button" class="studio-btn-ghost" data-radar-act="run-discovery">Run discovery</button>` : ''}
        <button type="button" class="studio-btn-ghost" data-radar-act="health">API health</button>
      </div>
    </div>
    <p class="studio-radar-status" id="radarDiscoverStatus" role="status"></p>
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
      <label class="studio-field studio-field--grow">
        <span>Search</span>
        <input type="search" class="studio-input" placeholder="Name, email, notes…" data-filter="q" value="${esc(filters.q)}" autocomplete="off" />
      </label>
      <label class="studio-field">
        <span>Type</span>
        <select class="studio-select" data-filter="type"><option value="">All types</option>${RADAR_LEAD_TYPES.map((t) => `<option value="${t}" ${filters.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </label>
      <label class="studio-field">
        <span>Status</span>
        <select class="studio-select" data-filter="status"><option value="">All statuses</option>${RADAR_STATUSES.map((t) => `<option value="${t}" ${filters.status === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </label>
      <label class="studio-field">
        <span>Region</span>
        <input type="text" class="studio-input" placeholder="Region" data-filter="region" value="${esc(filters.region)}" />
      </label>
      <div class="studio-radar-toolbar-actions">
        ${canEdit ? `<button type="button" class="studio-btn-primary" data-radar-act="add-lead">Add lead</button>` : ''}
        <button type="button" class="studio-btn-ghost" data-radar-act="export-csv">Export CSV</button>
        ${canEdit ? `<button type="button" class="studio-btn-secondary" data-radar-act="bulk-delete">Delete selected</button>` : ''}
      </div>
    </div>
    <div class="studio-table-wrap studio-table-wrap--sticky-head">
      <table class="studio-table studio-table--dense">
        <thead><tr><th></th><th>Name</th><th>Type</th><th>Location</th><th>Score</th><th>Status</th><th>Fit</th><th>Japan</th><th>Next</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="9"><p class="studio-radar-empty">No leads match these filters. Add a lead or clear filters.</p></td></tr>`}</tbody>
      </table>
    </div>
  `;
}

/**
 * @param {any[]} relationships
 * @param {ReturnType<typeof emptyLead>[]} leads
 * @param {boolean} canEdit
 */
function renderRelationships(relationships, leads, canEdit) {
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
            return `<div class="studio-radar-card" style="cursor:default"><strong>${esc(nameOf(id))}</strong><ul class="studio-radar-rel-list">${items}</ul></div>`;
        })
        .join('');

    return `
    <div class="studio-radar-toolbar">
      <div class="studio-radar-toolbar-actions" style="margin-left:0">
        <button type="button" class="studio-btn-ghost" data-radar-act="compute-bridges">Compute Fusion bridges</button>
        ${canEdit ? `<button type="button" class="studio-btn-primary" data-radar-act="sync-bridges">Sync bridges to Radar</button>` : ''}
        ${canEdit ? `<button type="button" class="studio-btn-secondary" data-radar-act="add-rel">Add relationship</button>` : ''}
      </div>
    </div>
    <p class="studio-radar-status" id="radarRelStatus" role="status"></p>
    <div class="studio-radar-stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
      ${blocks || '<p class="studio-radar-empty">No relationships yet. Compute bridges or add an edge manually.</p>'}
    </div>
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
            `<label><input type="checkbox" data-trigger="${esc(t.id)}" ${cfg.enabled?.includes(t.id) ? 'checked' : ''}/> ${esc(t.label)}</label>`,
    ).join('');

    const draftRows = drafts
        .map((o) => {
            const lead = leads.find((l) => l.id === o.leadId);
            return `<tr>
        <td>${esc(lead?.name || o.leadId)}</td>
        <td>${esc(o.subject)}</td>
        <td>${esc(o.triggerEvent)}</td>
        <td>${esc(o.status)}</td>
        <td>${canEdit ? `<button type="button" class="studio-btn-ghost" data-open-outreach="${esc(o.leadId)}">Open</button>` : ''}</td>
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
      <p>When enabled triggers fire (RSS / discovery / manual), Radar can auto-queue drafts for human approval before anything is sent.</p>
      <div class="studio-radar-trigger-grid">${triggers}</div>
      <label class="studio-radar-check"><input type="checkbox" id="radarAutoDraft" ${cfg.autoDraft ? 'checked' : ''}/> Auto-create drafts</label>
      <div class="studio-radar-toolbar" style="margin:0.75rem 0 0">
        <div class="studio-radar-toolbar-actions" style="margin-left:0">
          <button type="button" class="studio-btn-primary" data-radar-act="save-triggers">Save triggers</button>
          ${canEdit ? `<button type="button" class="studio-btn-ghost" data-radar-act="queue-manual-drafts">Queue drafts for qualified leads</button>` : ''}
        </div>
      </div>
    </div>
    <h3 class="studio-radar-section-title">Draft queue</h3>
    <div class="studio-table-wrap studio-table-wrap--sticky-head"><table class="studio-table studio-table--dense"><thead><tr><th>Lead</th><th>Subject</th><th>Trigger</th><th>Status</th><th></th></tr></thead><tbody>${draftRows || '<tr><td colspan="5"><p class="studio-radar-empty">No drafts waiting for approval.</p></td></tr>'}</tbody></table></div>
    <h3 class="studio-radar-section-title">Sent</h3>
    <div class="studio-table-wrap studio-table-wrap--sticky-head"><table class="studio-table studio-table--dense"><thead><tr><th>Lead</th><th>Subject</th><th>Status</th><th>Sent</th></tr></thead><tbody>${sentRows || '<tr><td colspan="4"><p class="studio-radar-empty">Nothing sent yet.</p></td></tr>'}</tbody></table></div>
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
          ${canEdit ? `<button type="button" class="studio-btn-ghost" data-toggle-source="${esc(s.id)}">${s.enabled ? 'Disable' : 'Enable'}</button>` : ''}
          ${canEdit ? `<button type="button" class="studio-btn-secondary" data-del-source="${esc(s.id)}">Delete</button>` : ''}
        </td>
      </tr>`,
        )
        .join('');

    return `
    <div class="studio-radar-toolbar">
      <div class="studio-radar-toolbar-actions" style="margin-left:0">
        ${canEdit ? `<button type="button" class="studio-btn-primary" data-radar-act="add-source">Add source</button>` : ''}
        <button type="button" class="studio-btn-ghost" data-radar-act="health">API status</button>
      </div>
    </div>
    <p class="studio-radar-status" id="radarSourceStatus" role="status"></p>
    <div class="studio-table-wrap studio-table-wrap--sticky-head">
      <table class="studio-table studio-table--dense">
        <thead><tr><th>Label</th><th>Type</th><th>URL / query</th><th>Region</th><th>Enabled</th><th>Last run</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7"><p class="studio-radar-empty">No sources configured. Add an RSS feed or list to power Discover.</p></td></tr>`}</tbody>
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
    <h3 class="studio-radar-section-title">Type mix</h3>
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
            if (!lead) return;
            void openRadarLeadModal(lead, { canEdit, onSaved: () => loadRadarWorkspace() }).catch(
                (err) => {
                    openStudioModal(
                        `<p class="studio-radar-error">${esc(err instanceof Error ? err.message : String(err))}</p>`,
                        { title: 'Radar lead' },
                    );
                },
            );
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
                    try {
                        await openRadarLeadModal(emptyLead({ status: 'discovered' }), {
                            canEdit,
                            onSaved: () => loadRadarWorkspace(),
                        });
                    } catch (err) {
                        openStudioModal(
                            `<p class="studio-radar-error">${esc(err instanceof Error ? err.message : String(err))}</p>`,
                            { title: 'Add lead' },
                        );
                    }
                } else if (act === 'run-discovery') {
                    const st = root.querySelector('#radarDiscoverStatus');
                    if (st) st.textContent = 'Running…';
                    const res = await runRadarDiscoveryBatch();
                    try {
                        window.posthog?.capture?.('radar_discovery_run', { created: res.created });
                    } catch {
                        /* ignore */
                    }
                    await loadRadarWorkspace().catch(() => {});
                    const errParts = (res.errors || []).map((e) => e.error).filter(Boolean);
                    const warnParts = res.warnings || [];
                    if (st) {
                        st.textContent = res.skipped
                            ? res.skipped
                            : `Ingested ${res.created} · errors ${errParts.length}${warnParts.length ? ` · warnings ${warnParts.length}` : ''}`;
                    }
                    if (res.skipped || errParts.length || warnParts.length) {
                        openStudioModal(
                            `<div class="studio-radar-discovery-report">
                ${res.skipped ? `<p><strong>${esc(res.skipped)}</strong></p>` : `<p>Created <strong>${res.created}</strong> lead(s).</p>`}
                ${
                    warnParts.length
                        ? `<h4>Warnings</h4><ul>${warnParts.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`
                        : ''
                }
                ${
                    errParts.length
                        ? `<h4>Errors</h4><ul>${errParts.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`
                        : ''
                }
              </div>`,
                            { title: 'Discovery result', wide: true },
                        );
                    }
                } else if (act === 'add-staff') {
                    const input = /** @type {HTMLInputElement|null} */ (
                        root.querySelector('#radarAddStaffPrincipal')
                    );
                    const st = root.querySelector('#radarStaffStatus');
                    try {
                        await addRadarStaffPrincipal(input?.value || '');
                        if (st) st.textContent = 'Staff added.';
                        if (input) input.value = '';
                        radarAccess = await getRadarAccessState();
                        paint();
                    } catch (err) {
                        if (st) {
                            st.textContent = err instanceof Error ? err.message : String(err);
                        }
                    }
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
                    if (!canEdit) return;
                    const st = root.querySelector('#radarRelStatus');
                    const res = await syncRadarBridgeRelationships();
                    if (st) st.textContent = `Synced ${res.created} new edges (${res.matchCount} matches)`;
                    await loadRadarWorkspace();
                } else if (act === 'add-rel') {
                    if (!canEdit) return;
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
                    openStudioModal(`<p>Triggers saved (stored in this browser — not on the Radar canister yet).</p>`, {
                        title: 'Triggers',
                    });
                } else if (act === 'queue-manual-drafts') {
                    const cfg = getRadarTriggerConfig();
                    if (!cfg.autoDraft) {
                        openStudioModal(
                            `<p>Auto-create drafts is off. Enable <strong>Auto-create drafts</strong> and save triggers, then try again.</p>`,
                            { title: 'Queue drafts' },
                        );
                        return;
                    }
                    const leads = getRadarLeadsCached().filter(
                        (l) => l.status === 'qualified' && l.publicEmail,
                    );
                    if (!leads.length) {
                        openStudioModal(
                            `<p>No qualified leads with a public email to queue.</p>`,
                            { title: 'Queue drafts' },
                        );
                        return;
                    }
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
                    openStudioModal(
                        `<p>Queued drafts for ${Math.min(leads.length, 20)} qualified lead(s).</p>`,
                        { title: 'Queue drafts' },
                    );
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
      <label>Label<input id="rsLabel" class="studio-input" /></label>
      <label>Type<select id="rsType" class="studio-select">${typeOpts}</select></label>
      <label class="full">URL<input id="rsUrl" class="studio-input" /></label>
      <label class="full">Query (Places)<input id="rsQuery" class="studio-input" placeholder="contemporary art gallery in Brooklyn" /></label>
      <label>Region<input id="rsRegion" class="studio-input" /></label>
      <label>Interval hours<input id="rsInterval" class="studio-input" type="number" value="24" /></label>
    </div>`,
        {
            title: 'Add discovery source',
            footerHtml: `<button type="button" class="studio-btn-primary" id="rsSave">Save</button>`,
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
      <label>From<select id="rrFrom" class="studio-select">${opts}</select></label>
      <label>To<select id="rrTo" class="studio-select">${opts}</select></label>
      <label>Kind<select id="rrKind" class="studio-select"><option>collaboratesWith</option><option>represents</option><option>exhibitedBy</option><option>curatedBy</option><option>referredBy</option><option>fusionMember</option><option>appliedTo</option></select></label>
      <label class="full">Label<input id="rrLabel" class="studio-input" /></label>
      <label class="full">Evidence<input id="rrEvidence" class="studio-input" /></label>
    </div>`,
        {
            title: 'Add relationship',
            footerHtml: `<button type="button" class="studio-btn-primary" id="rrSave">Save</button>`,
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
