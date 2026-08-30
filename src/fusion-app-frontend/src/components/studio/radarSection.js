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
    scoreTier,
} from '../../utils/radarModel.js';
import {
    getRadarLeadsCached,
    getRadarLoadState,
    getRadarOutreachCached,
    getRadarRelationshipsCached,
    getRadarSourcesCached,
    loadRadarWorkspace,
    notifyRadar,
    removeRadarLead,
    saveRadarLead,
    saveRadarOutreach,
    saveRadarSource,
    subscribeRadar,
    hydrateRadarWorkspace,
} from '../../utils/radarStore.js';
import {
    deleteRadarSource,
    getRadarTriggerConfig,
    setRadarTriggerConfig,
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
import { isRadarPreviewActive, getRadarPreviewState } from '../../utils/radarPreview.js';
import {
    buildRadarPreviewWorkspace,
    emptyRadarPreviewWorkspace,
} from '../../utils/radarPreviewFixtures.js';
import {
    ARTIST_LEADS_SOURCE_LABEL,
    artistLeadsTemplateCsv,
    classifyArtistLeadsCsv,
    findArtistLeadsSheetSource,
    getLeadSheetExtras,
    leadHasRedFlags,
    leadsToArtistSheetCsv,
} from '../../utils/radarLeadImport.js';
import {
    isRadarOutreachReadyToSend,
    RADAR_OUTREACH_BATCH_CAP,
} from '../../utils/radarOutreachReady.js';
import { sendRadarOutreachBatch, sendRadarOutreachTestEmail } from '../../utils/radarOutreachSend.js';
import { STUDIO_EMAIL_ALWAYS_CC } from '../../utils/studioEmailCc.js';
import { getDataSource } from '../../utils/database.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** @type {'discover'|'relationships'|'outreach'|'invites'|'sources'|'analytics'} */
let activeTab = 'discover';
/** @type {'board'|'list'} */
let viewMode = 'board';
/** @type {{ q: string, type: string, status: string, region: string, hasRedFlag: boolean }} */
let filters = { q: '', type: '', status: '', region: '', hasRedFlag: false };
/** @type {Set<string>} */
let selectedOutreachIds = new Set();
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
        label: 'Pipeline',
        icon: 'nav-ai',
        blurb: '',
    },
    {
        id: 'relationships',
        label: 'Relationships',
        icon: 'nav-community',
        blurb: 'Map warm paths between leads and Fusion, then sync edges onto Radar.',
    },
    {
        id: 'outreach',
        label: 'Outreach',
        icon: 'nav-email',
        blurb: 'Triggers queue drafts. Nothing sends without approval.',
    },
    {
        id: 'invites',
        label: 'Invites',
        icon: 'nav-community',
        blurb: '50% membership codes for Radar outreach — quantity is the send budget.',
    },
    {
        id: 'sources',
        label: 'Sources',
        icon: 'nav-content',
        blurb: 'Feeds and lists that fill the pipeline.',
    },
    {
        id: 'analytics',
        label: 'Analytics',
        icon: 'group-overview',
        blurb: 'Funnel volume, fit, and response.',
    },
];

const LATER_STATUSES = ['replied', 'connected', 'rejected', 'archived'];
const BOARD_COLUMNS = [
    ...RADAR_PIPELINE_STATUSES.map((id) => ({ id, label: id, statuses: [id] })),
    { id: 'later', label: 'later', statuses: LATER_STATUSES },
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
    return TABS.find((t) => t.id === id) || TABS[0];
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
    const preview = isRadarPreviewActive();
    const previewQuery = preview ? getRadarPreviewState() : null;

    if (unsub) {
        unsub();
        unsub = null;
    }

    if (preview && previewQuery) {
        if (previewQuery.tab === 'leads') {
            activeTab = 'discover';
            viewMode = 'list';
        } else if (previewQuery.tab) {
            activeTab = /** @type {typeof activeTab} */ (previewQuery.tab);
            if (previewQuery.tab === 'discover') viewMode = 'board';
        }
        radarAccess = {
            isAdmin: true,
            isStaffOrAdmin: true,
            bootstrapped: true,
        };
        hydrateRadarWorkspace(
            previewQuery.empty ? emptyRadarPreviewWorkspace() : buildRadarPreviewWorkspace(),
            { preview: true },
        );
        const { hydrateRadarPromoPreview } = await import('../../utils/studioPromoCodes.js');
        hydrateRadarPromoPreview(
            previewQuery.empty
                ? []
                : [
                      {
                          code: 'RADAR-KAGA26',
                          codeType: 'promo',
                          discountDurationMonths: 2,
                          maxRedemptions: 40,
                          currentRedemptions: 3,
                          active: true,
                          campaignTag: 'radar-batch',
                          createdAt: '2026-08-01T00:00:00.000Z',
                      },
                      {
                          code: 'RADAR-A7K2',
                          codeType: 'promo',
                          discountDurationMonths: 1,
                          maxRedemptions: 1,
                          currentRedemptions: 0,
                          active: true,
                          campaignTag: 'radar-individual',
                          createdAt: '2026-08-12T00:00:00.000Z',
                      },
                  ],
        );
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
        if (activeTab === 'discover') {
            body = viewMode === 'list' ? renderLeads(filtered, canEdit) : renderDiscover(leads, canEdit);
        } else if (activeTab === 'relationships') body = renderRelationships(relationships, leads, canEdit);
        else if (activeTab === 'outreach') body = renderOutreach(outreach, leads, canEdit);
        else if (activeTab === 'invites') body = `<div id="radar-invites-host"></div>`;
        else if (activeTab === 'sources') body = renderSources(sources, canEdit);
        else body = renderAnalytics(leads, outreach, sources);

        const accessBanner = renderAccessBanner(loadState, loadError);

        root.innerHTML = `
      <p class="studio-muted studio-radar-intro__hint">Find fit, map a warm path, draft with approval.</p>
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
            ${
                meta.blurb
                    ? `<div class="studio-radar-panel-head">
              <h2>${esc(meta.label)}</h2>
              <p>${esc(meta.blurb)}</p>
            </div>`
                    : ''
            }
            ${body}
          </section>
        </div>
      </div>
      <input type="file" id="radarLeadCsvInput" accept=".csv,text/csv" hidden />
      ${accessBanner}
    `;
        bindChildListeners(root, canEdit, paint);
        root.dataset.radarReady = '1';
        if (preview) root.dataset.radarPreview = '1';
        if (activeTab === 'invites') {
            const host = root.querySelector('#radar-invites-host');
            if (host instanceof HTMLElement) {
                void import('./studioPromoCodesPanel.js').then(({ mountStudioPromoCodesPanel }) =>
                    mountStudioPromoCodesPanel(host, { radarOnly: true, canEdit }),
                );
            }
        }
    };

    rootActionsBound = false;
    bindRootActions(root, canEdit, paint);
    unsub = subscribeRadar(paint);
    paint();
    if (preview) {
        const leadId = previewQuery?.leadId || '';
        if (leadId) {
            const lead = getRadarLeadsCached().find((l) => l.id === leadId);
            if (lead) {
                void openRadarLeadModal(lead, { canEdit, onSaved: () => {} }).catch(() => {});
            }
        }
        return;
    }
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
            `<p class="studio-radar-access-ok">Canister allowlist: <strong>${esc(role)}</strong>. Studio permission gates the nav; this list gates reads and writes.</p>`,
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
    parts.push(
        `<p><button type="button" class="studio-btn-ghost" data-radar-act="health">API health</button></p>`,
    );
    if (!parts.length) return '';
    const warn = loadState === 'error' || (!radarAccess.isStaffOrAdmin && loadState !== 'loading');
    const summary = radarAccess.isStaffOrAdmin
        ? `Access · ${radarAccess.isAdmin ? 'admin' : 'staff'}`
        : 'Access';
    return `<details class="studio-radar-access ${warn ? 'studio-radar-banner--warn' : ''}" ${warn ? 'open' : ''}>
      <summary>${esc(summary)}</summary>
      <div class="studio-radar-access__body">${parts.join('')}</div>
    </details>`;
}

function renderViewToggle() {
    return `<div class="studio-radar-view-toggle" role="group" aria-label="Pipeline view">
      <button type="button" class="studio-radar-view-toggle__btn${viewMode === 'board' ? ' is-active' : ''}" data-radar-view="board">Board</button>
      <button type="button" class="studio-radar-view-toggle__btn${viewMode === 'list' ? ' is-active' : ''}" data-radar-view="list">List</button>
    </div>`;
}

function statusSelectHtml(lead, canEdit) {
    const opts = RADAR_STATUSES.map(
        (s) => `<option value="${esc(s)}" ${lead.status === s ? 'selected' : ''}>${esc(s)}</option>`,
    ).join('');
    if (!canEdit) {
        return `<span class="studio-radar-chip">${esc(lead.status)}</span>`;
    }
    return `<select class="studio-radar-stage" data-radar-status="${esc(lead.id)}" aria-label="Stage for ${esc(lead.name || 'lead')}" onclick="event.stopPropagation()">${opts}</select>`;
}

function redFlagChipHtml(lead) {
    return leadHasRedFlags(lead)
        ? `<span class="studio-radar-chip studio-radar-chip--flag">Red flag</span>`
        : '';
}

function downloadTextFile(filename, text, type = 'text/csv') {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

function pipelineUploadButton(canEdit) {
    return canEdit
        ? `<button type="button" class="studio-btn-ghost" data-radar-act="upload-leads">Upload leads</button>`
        : '';
}

/**
 * @param {ReturnType<typeof emptyLead>[]} leads
 * @param {boolean} canEdit
 */
function renderDiscover(leads, canEdit) {
    if (!leads.length) {
        return `
    <div class="studio-radar-toolbar">
      ${renderViewToggle()}
      <div class="studio-radar-toolbar-actions">
        ${canEdit ? `<button type="button" class="studio-btn-primary" data-radar-act="add-lead">Add lead</button>` : ''}
        ${pipelineUploadButton(canEdit)}
        ${canEdit ? `<button type="button" class="studio-btn-ghost" data-radar-act="run-discovery">Run discovery</button>` : ''}
      </div>
    </div>
    <p class="studio-radar-status" id="radarDiscoverStatus" role="status"></p>
    <div class="studio-radar-empty-compose" data-radar-empty>
      <p>No one on Radar yet.</p>
      <p>Add a lead or run discovery to fill the board.</p>
    </div>`;
    }

    const cols = BOARD_COLUMNS.map((col) => {
        const cardsLeads = leads.filter((l) => col.statuses.includes(l.status));
        const cards = cardsLeads
            .map(
                (l) => `
        <div class="studio-radar-card" data-open-lead="${esc(l.id)}">
          <div class="studio-radar-card__head">
            <strong>${esc(l.name || 'Untitled')}</strong>
            <span class="studio-radar-score studio-radar-score--${scoreTier(l.aiScore)}">${esc(String(l.aiScore || 0))}</span>
          </div>
          <div class="studio-radar-card__meta">
            <span class="studio-radar-chip">${esc(l.leadType)}</span>
            ${statusSelectHtml(l, canEdit)}
            ${redFlagChipHtml(l)}
          </div>
          <p class="studio-radar-why">${esc(l.aiRationale || l.discoveryReason || 'Awaiting qualification')}</p>
        </div>`,
            )
            .join('');
        return `<div class="studio-radar-col" data-radar-col="${esc(col.id)}">
          <div class="studio-radar-col__header"><h3>${esc(col.label)}</h3><span class="studio-radar-col__count">${cardsLeads.length}</span></div>
          ${cards || '<p class="studio-radar-empty">None</p>'}
        </div>`;
    }).join('');

    return `
    <div class="studio-radar-toolbar">
      ${renderViewToggle()}
      <div class="studio-radar-toolbar-actions">
        ${canEdit ? `<button type="button" class="studio-btn-primary" data-radar-act="add-lead">Add lead</button>` : ''}
        ${pipelineUploadButton(canEdit)}
        ${canEdit ? `<button type="button" class="studio-btn-ghost" data-radar-act="run-discovery">Run discovery</button>` : ''}
      </div>
    </div>
    <p class="studio-radar-status" id="radarDiscoverStatus" role="status"></p>
    <div class="studio-radar-kanban">${cols}</div>
  `;
}

function leadsTableRowsHtml(filtered) {
    return filtered
        .map(
            (l) => `
      <tr data-open-lead="${esc(l.id)}">
        <td><input type="checkbox" data-bulk="${esc(l.id)}" onclick="event.stopPropagation()" /></td>
        <td><strong>${esc(l.name)}</strong> ${redFlagChipHtml(l)}<div class="studio-radar-muted">${esc(l.publicEmail)}</div></td>
        <td><span class="studio-radar-chip">${esc(l.leadType)}</span></td>
        <td>${esc(l.location)}</td>
        <td><span class="studio-radar-score studio-radar-score--${scoreTier(l.aiScore)}">${esc(String(l.aiScore || 0))}</span></td>
        <td>${esc(l.status)}</td>
        <td>${esc(l.nextAction)}</td>
      </tr>`,
        )
        .join('');
}

function leadsFilterSummary(filtered) {
    if (!filtered.length) return '';
    return `Showing ${filtered.length} lead${filtered.length === 1 ? '' : 's'}${filters.q || filters.type || filters.status || filters.region || filters.hasRedFlag ? ' (filtered)' : ''}`;
}

/**
 * Patch list rows without rebuilding search inputs (keeps caret).
 * @param {HTMLElement} root
 */
function updateLeadsTable(root) {
    const filtered = filterLeads(getRadarLeadsCached(), filters);
    const tbody = root.querySelector('[data-radar-tbody]');
    const summary = root.querySelector('.studio-radar-filter-summary');
    if (tbody) {
        tbody.innerHTML =
            leadsTableRowsHtml(filtered) ||
            `<tr><td colspan="7"><p class="studio-radar-empty">No leads match these filters.</p></td></tr>`;
        tbody.querySelectorAll('[data-open-lead]').forEach((el) => {
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-open-lead');
                const lead = getRadarLeadsCached().find((l) => l.id === id);
                if (!lead) return;
                const canEdit = root.getAttribute('data-can-edit') === '1';
                void openRadarLeadModal(lead, {
                    canEdit,
                    onSaved: () => loadRadarWorkspace(),
                }).catch((err) => {
                    openStudioModal(
                        `<p class="studio-radar-error">${esc(err instanceof Error ? err.message : String(err))}</p>`,
                        { title: 'Radar lead' },
                    );
                });
            });
        });
    }
    if (summary) summary.textContent = leadsFilterSummary(filtered);
}

/**
 * @param {ReturnType<typeof emptyLead>[]} filtered
 * @param {boolean} canEdit
 */
function renderLeads(filtered, canEdit) {
    const rows = leadsTableRowsHtml(filtered);
    const summary = leadsFilterSummary(filtered);

    return `
    <div class="studio-radar-toolbar">
      ${renderViewToggle()}
      <div class="studio-radar-toolbar-actions">
        ${canEdit ? `<button type="button" class="studio-btn-primary" data-radar-act="add-lead">Add lead</button>` : ''}
        ${pipelineUploadButton(canEdit)}
        <button type="button" class="studio-btn-ghost" data-radar-act="export-csv">Export CSV</button>
        ${canEdit ? `<button type="button" class="studio-btn-secondary" data-radar-act="bulk-delete">Delete selected</button>` : ''}
      </div>
    </div>
    <p class="studio-radar-status" id="radarDiscoverStatus" role="status"></p>
    <div class="studio-radar-toolbar studio-radar-toolbar--filters">
      <label class="studio-field studio-field--grow">
        <span>Search</span>
        <input type="search" class="studio-input" placeholder="Name, place, notes…" data-filter="q" value="${esc(filters.q)}" autocomplete="off" />
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
        <input type="text" class="studio-input" placeholder="Tokyo, NYC…" data-filter="region" value="${esc(filters.region)}" />
      </label>
      <label class="studio-radar-check studio-radar-check--filter">
        <input type="checkbox" data-filter-flag="hasRedFlag" ${filters.hasRedFlag ? 'checked' : ''} />
        Has red flag
      </label>
    </div>
    <p class="studio-radar-filter-summary">${esc(summary)}</p>
    <div class="studio-table-wrap studio-table-wrap--sticky-head" data-radar-list>
      <table class="studio-table studio-table--dense">
        <thead><tr><th></th><th>Name</th><th>Type</th><th>Place</th><th>Score</th><th>Status</th><th>Next</th></tr></thead>
        <tbody data-radar-tbody>${rows || `<tr><td colspan="7"><p class="studio-radar-empty">No leads match these filters.</p></td></tr>`}</tbody>
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
      ${blocks || '<p class="studio-radar-empty">No relationships mapped yet. Compute bridges from the Fusion roster, or add one by hand.</p>'}
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
            const ready = isRadarOutreachReadyToSend(o, lead);
            const flagged = leadHasRedFlags(lead);
            const checked = selectedOutreachIds.has(o.id);
            return `<tr>
        <td><input type="checkbox" data-outreach-select="${esc(o.id)}" ${checked ? 'checked' : ''} ${canEdit ? '' : 'disabled'} onclick="event.stopPropagation()" aria-label="Select ${esc(lead?.name || o.subject || 'outreach')}" /></td>
        <td>${esc(lead?.name || o.leadId)}${flagged ? ` ${redFlagChipHtml(lead)}` : ''}${ready ? ' <span class="studio-radar-muted">ready</span>' : ''}</td>
        <td>${esc(o.subject)}</td>
        <td>${esc(o.triggerEvent)}</td>
        <td>${esc(o.status)}</td>
        <td>
          ${canEdit && o.status === 'drafted' ? `<button type="button" class="studio-btn-ghost" data-approve-outreach="${esc(o.id)}">Approve</button>` : ''}
          ${canEdit ? `<button type="button" class="studio-btn-ghost" data-open-outreach="${esc(o.leadId)}">Open</button>` : ''}
        </td>
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
      <p>Checked events queue a draft. Radar never sends on its own.</p>
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
    ${
        canEdit
            ? `<div class="studio-radar-toolbar">
      <div class="studio-radar-toolbar-actions" style="margin-left:0">
        <button type="button" class="studio-btn-ghost" data-radar-act="select-ready">Select ready</button>
        <button type="button" class="studio-btn-primary" data-radar-act="send-selected" ${selectedOutreachIds.size ? '' : 'disabled'}>Send selected (${selectedOutreachIds.size})</button>
      </div>
    </div>`
            : ''
    }
    <p class="studio-radar-status" id="radarOutreachStatus" role="status"></p>
    <div class="studio-table-wrap studio-table-wrap--sticky-head"><table class="studio-table studio-table--dense"><thead><tr><th></th><th>Lead</th><th>Subject</th><th>Trigger</th><th>Status</th><th></th></tr></thead><tbody>${draftRows || '<tr><td colspan="6"><p class="studio-radar-empty">No drafts waiting for approval.</p></td></tr>'}</tbody></table></div>
    <h3 class="studio-radar-section-title">Sent</h3>
    <div class="studio-table-wrap studio-table-wrap--sticky-head"><table class="studio-table studio-table--dense"><thead><tr><th>Lead</th><th>Subject</th><th>Status</th><th>Sent</th></tr></thead><tbody>${sentRows || '<tr><td colspan="4"><p class="studio-radar-empty">Nothing sent yet.</p></td></tr>'}</tbody></table></div>
  `;
}

/**
 * @param {any[]} sources
 * @param {boolean} canEdit
 */
function renderSources(sources, canEdit) {
    const enabledCount = sources.filter((s) => s.enabled).length;
    const rows = sources
        .map(
            (s) => `
      <tr>
        <td>${esc(s.label || s.id)}</td>
        <td><span class="studio-radar-chip">${esc(s.sourceType)}</span></td>
        <td class="studio-radar-cell-url">${esc(s.query || s.url)}</td>
        <td>${esc(s.regionKey)}</td>
        <td><span class="studio-radar-chip studio-radar-chip--${s.enabled ? 'on' : 'off'}">${s.enabled ? 'Active' : 'Off'}</span></td>
        <td>${esc(s.lastRunAt || 'Never')}</td>
        <td>
          ${canEdit ? `<button type="button" class="studio-btn-ghost" data-toggle-source="${esc(s.id)}">${s.enabled ? 'Disable' : 'Enable'}</button>` : ''}
          ${canEdit ? `<button type="button" class="studio-btn-secondary" data-del-source="${esc(s.id)}">Delete</button>` : ''}
        </td>
      </tr>`,
        )
        .join('');

    return `
    <div class="studio-radar-stats-row">
      <span>${sources.length} source${sources.length === 1 ? '' : 's'}</span>
      <span class="studio-radar-stats-sep">·</span>
      <span>${enabledCount} active</span>
    </div>
    <div class="studio-radar-toolbar">
      <div class="studio-radar-toolbar-actions" style="margin-left:0">
        ${canEdit ? `<button type="button" class="studio-btn-primary" data-radar-act="add-source">Add source</button>` : ''}
      </div>
    </div>
    <p class="studio-radar-status" id="radarSourceStatus" role="status"></p>
    <div class="studio-table-wrap studio-table-wrap--sticky-head">
      <table class="studio-table studio-table--dense">
        <thead><tr><th>Label</th><th>Type</th><th>URL / query</th><th>Region</th><th>Status</th><th>Last run</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7"><p class="studio-radar-empty">No sources configured yet. Add an RSS feed, curated list, or Places query to start pulling in leads.</p></td></tr>`}</tbody>
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
    <h3 class="studio-radar-section-title">Pipeline funnel</h3>
    <div class="studio-radar-stats-grid">
      <div class="studio-radar-stat"><div class="l">Total leads</div><div class="n">${leads.length}</div></div>
      <div class="studio-radar-stat"><div class="l">Avg fit score</div><div class="n">${avg}</div></div>
      <div class="studio-radar-stat"><div class="l">Discovered</div><div class="n">${funnel.discovered}</div></div>
      <div class="studio-radar-stat"><div class="l">Qualified</div><div class="n">${funnel.qualified}</div></div>
      <div class="studio-radar-stat"><div class="l">Contacted</div><div class="n">${funnel.contacted}</div></div>
      <div class="studio-radar-stat"><div class="l">Replied / connected</div><div class="n">${funnel.replied}</div></div>
    </div>
    <h3 class="studio-radar-section-title">Outreach performance</h3>
    <div class="studio-radar-stats-grid">
      <div class="studio-radar-stat"><div class="l">Emails sent</div><div class="n">${sent}</div></div>
      <div class="studio-radar-stat"><div class="l">Response rate</div><div class="n">${responseRate}%</div></div>
      <div class="studio-radar-stat"><div class="l">Active sources</div><div class="n">${sources.length}</div></div>
    </div>
    <h3 class="studio-radar-section-title">Lead type mix</h3>
    <div class="studio-radar-stats-grid">${typeBars}</div>
  `;
}

/**
 * Attach child-element listeners that are recreated on every paint().
 * Delegated root-level handler is attached once via bindRootActions().
 * @param {HTMLElement} root
 * @param {boolean} canEdit
 * @param {() => void} paint
 */
function bindChildListeners(root, canEdit, paint) {
    root.querySelectorAll('[data-radar-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
            activeTab = /** @type {any} */ (btn.getAttribute('data-radar-tab') || 'discover');
            paint();
        });
    });

    root.querySelectorAll('button[data-radar-view]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const next = btn.getAttribute('data-radar-view');
            if (next !== 'board' && next !== 'list') return;
            viewMode = next;
            activeTab = 'discover';
            paint();
        });
    });

    root.querySelectorAll('[data-filter]').forEach((el) => {
        const apply = () => {
            const key = el.getAttribute('data-filter');
            if (!key) return;
            filters = { ...filters, [key]: /** @type {HTMLInputElement} */ (el).value };
            if (activeTab === 'discover' && viewMode === 'list' && root.querySelector('[data-radar-tbody]')) {
                updateLeadsTable(root);
                return;
            }
            paint();
        };
        el.addEventListener('change', apply);
        el.addEventListener('input', apply);
    });

    root.querySelectorAll('[data-filter-flag]').forEach((el) => {
        el.addEventListener('change', () => {
            const key = el.getAttribute('data-filter-flag');
            if (!key) return;
            filters = { ...filters, [key]: /** @type {HTMLInputElement} */ (el).checked };
            if (activeTab === 'discover' && viewMode === 'list' && root.querySelector('[data-radar-tbody]')) {
                updateLeadsTable(root);
                return;
            }
            paint();
        });
    });

    const csvInput = /** @type {HTMLInputElement | null} */ (root.querySelector('#radarLeadCsvInput'));
    csvInput?.addEventListener('change', async () => {
        const file = csvInput.files?.[0];
        csvInput.value = '';
        if (!file) return;
        try {
            const text = await file.text();
            openArtistLeadsImportModal(text, root);
        } catch (err) {
            openStudioModal(
                `<p class="studio-radar-error">${esc(err instanceof Error ? err.message : String(err))}</p>`,
                { title: 'Upload leads' },
            );
        }
    });

    root.querySelectorAll('[data-outreach-select]').forEach((el) => {
        el.addEventListener('change', () => {
            const id = el.getAttribute('data-outreach-select');
            if (!id) return;
            const checked = /** @type {HTMLInputElement} */ (el).checked;
            if (checked) {
                if (selectedOutreachIds.size >= RADAR_OUTREACH_BATCH_CAP) {
                    /** @type {HTMLInputElement} */ (el).checked = false;
                    return;
                }
                selectedOutreachIds.add(id);
            } else {
                selectedOutreachIds.delete(id);
            }
            const sendBtn = root.querySelector('[data-radar-act="send-selected"]');
            if (sendBtn instanceof HTMLButtonElement) {
                sendBtn.disabled = selectedOutreachIds.size === 0;
                sendBtn.textContent = `Send selected (${selectedOutreachIds.size})`;
            }
        });
    });

    root.querySelectorAll('[data-radar-status]').forEach((el) => {
        el.addEventListener('click', (ev) => ev.stopPropagation());
        el.addEventListener('change', async (ev) => {
            ev.stopPropagation();
            const id = el.getAttribute('data-radar-status');
            const lead = getRadarLeadsCached().find((l) => l.id === id);
            if (!lead || !canEdit) return;
            const status = /** @type {HTMLSelectElement} */ (el).value;
            await saveRadarLead({ ...lead, status });
        });
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
}

/** @type {boolean} */
let rootActionsBound = false;

/**
 * Attach the single delegated click handler on root — called once per initRadar().
 * @param {HTMLElement} root
 * @param {boolean} canEdit
 * @param {() => void} paint
 */
function bindRootActions(root, canEdit, paint) {
    if (rootActionsBound) return;
    rootActionsBound = true;

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
                } else if (act === 'upload-leads') {
                    const input = /** @type {HTMLInputElement | null} */ (
                        root.querySelector('#radarLeadCsvInput')
                    );
                    if (input) {
                        input.value = '';
                        input.click();
                    }
                } else if (act === 'export-csv') {
                    const csv = leadsToArtistSheetCsv(filterLeads(getRadarLeadsCached(), filters));
                    downloadTextFile('fusion-artist-leads.csv', csv);
                } else if (act === 'select-ready') {
                    const leads = getRadarLeadsCached();
                    const ready = getRadarOutreachCached()
                        .filter((o) => {
                            const lead = leads.find((l) => l.id === o.leadId);
                            return isRadarOutreachReadyToSend(o, lead);
                        })
                        .slice(0, RADAR_OUTREACH_BATCH_CAP);
                    selectedOutreachIds = new Set(ready.map((o) => String(o.id)));
                    paint();
                } else if (act === 'send-selected') {
                    if (!canEdit) return;
                    await openOutreachBatchConfirm(root);
                } else if (act === 'health') {
                    const h = await radarDiscoverHealth();
                    openStudioModal(
                        `<pre style="white-space:pre-wrap;font-size:0.85rem">${esc(JSON.stringify(h, null, 2))}</pre>`,
                        { title: 'Radar API health' },
                    );
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
                    const { loadRadarTemplateDraft } = await import('../../utils/radarOutreachTemplates.js');
                    const draft = await loadRadarTemplateDraft('tpl_radar_artists', 1);
                    for (const lead of leads.slice(0, 20)) {
                        await saveRadarOutreach({
                            id: '',
                            leadId: lead.id,
                            subject: draft.subject,
                            bodyHtml: draft.htmlBody,
                            triggerEvent: 'manual',
                            templateId: draft.templateId,
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

        const approve = t.closest?.('[data-approve-outreach]');
        if (approve instanceof HTMLElement && canEdit) {
            const id = approve.getAttribute('data-approve-outreach');
            const rec = getRadarOutreachCached().find((o) => o.id === id);
            if (rec) {
                await saveRadarOutreach({ ...rec, status: 'approved' });
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
        `<div class="studio-radar-modal-intro">
      <p>A source tells Radar where to look for potential leads. Choose a type, provide the URL or search terms, and set how often Radar should check for new entries.</p>
    </div>
    <div class="studio-radar-form-grid studio-radar-form-grid--descriptive">
      <label>
        <span class="studio-radar-field-label">Source name</span>
        <span class="studio-radar-field-hint">A short name to identify this source in your list (e.g. "Brooklyn galleries RSS" or "Tokyo residency programs")</span>
        <input id="rsLabel" class="studio-input" placeholder="e.g. Brooklyn galleries RSS" />
      </label>
      <label>
        <span class="studio-radar-field-label">Source type</span>
        <span class="studio-radar-field-hint">How Radar fetches data: RSS pulls from a feed URL, List is a curated set, Places queries Google Maps</span>
        <select id="rsType" class="studio-select">${typeOpts}</select>
      </label>
      <label class="full">
        <span class="studio-radar-field-label">Feed URL</span>
        <span class="studio-radar-field-hint">The RSS feed URL, webpage, or API endpoint Radar should pull leads from. Leave blank for Places queries.</span>
        <input id="rsUrl" class="studio-input" placeholder="https://example.com/feed.xml" />
      </label>
      <label class="full">
        <span class="studio-radar-field-label">Search query (for Places type)</span>
        <span class="studio-radar-field-hint">A natural-language search term for Google Places lookups — ignored for RSS and List types</span>
        <input id="rsQuery" class="studio-input" placeholder="e.g. contemporary art gallery in Brooklyn" />
      </label>
      <label>
        <span class="studio-radar-field-label">Region tag</span>
        <span class="studio-radar-field-hint">An optional geographic tag to group and filter leads from this source (e.g. "NYC", "Tokyo", "EU")</span>
        <input id="rsRegion" class="studio-input" placeholder="e.g. NYC" />
      </label>
      <label>
        <span class="studio-radar-field-label">Check interval (hours)</span>
        <span class="studio-radar-field-hint">How often Radar should re-scan this source for new entries when discovery runs</span>
        <input id="rsInterval" class="studio-input" type="number" value="24" min="1" />
      </label>
    </div>`,
        {
            title: 'Add discovery source',
            subtitle: 'Configure where Radar looks for new leads',
            wide: true,
            footerHtml: `<button type="button" class="studio-btn-primary" id="rsSave">Save source</button>`,
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
    const leadOpts = leads
        .map((l) => `<option value="${esc(l.id)}">${esc(l.name || l.id)}</option>`)
        .join('');
    const { root, close } = openStudioModal(
        `<div class="studio-radar-modal-intro">
      <p>Map a connection between two leads, or between a lead and a Fusion entity. Relationships help surface warm paths for outreach and track how the network connects.</p>
    </div>
    <div class="studio-radar-form-grid studio-radar-form-grid--descriptive">
      <label>
        <span class="studio-radar-field-label">From (source lead)</span>
        <span class="studio-radar-field-hint">The lead this relationship originates from — e.g. the person who knows the other party</span>
        <select id="rrFrom" class="studio-select">${leadOpts}</select>
      </label>
      <label>
        <span class="studio-radar-field-label">To (connected lead)</span>
        <span class="studio-radar-field-hint">The lead on the other end of this connection</span>
        <select id="rrTo" class="studio-select">${leadOpts}</select>
      </label>
      <label>
        <span class="studio-radar-field-label">Relationship type</span>
        <span class="studio-radar-field-hint">How these two leads relate — collaboration, representation, curation, referral, etc.</span>
        <select id="rrKind" class="studio-select">
          <option value="collaboratesWith">Collaborates with</option>
          <option value="represents">Represents</option>
          <option value="exhibitedBy">Exhibited by</option>
          <option value="curatedBy">Curated by</option>
          <option value="referredBy">Referred by</option>
          <option value="fusionMember">Fusion member</option>
          <option value="appliedTo">Applied to</option>
        </select>
      </label>
      <label class="full">
        <span class="studio-radar-field-label">Label</span>
        <span class="studio-radar-field-hint">A short description of this specific connection (e.g. "Gallery representation since 2022")</span>
        <input id="rrLabel" class="studio-input" placeholder="e.g. Gallery representation since 2022" />
      </label>
      <label class="full">
        <span class="studio-radar-field-label">Evidence</span>
        <span class="studio-radar-field-hint">How you know this connection exists — a URL, exhibition listing, mutual contact, or other proof</span>
        <input id="rrEvidence" class="studio-input" placeholder="e.g. Listed on gallery roster page" />
      </label>
    </div>`,
        {
            title: 'Add relationship',
            subtitle: 'Map a connection between leads',
            wide: true,
            footerHtml: `<button type="button" class="studio-btn-primary" id="rrSave">Save relationship</button>`,
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

/**
 * @param {string} text
 * @param {HTMLElement} radarRoot
 */
function openArtistLeadsImportModal(text, radarRoot) {
    const classified = classifyArtistLeadsCsv(text, getRadarLeadsCached());
    const sampleNames = [...classified.toCreate, ...classified.toMerge]
        .slice(0, 6)
        .map((x) => x.name)
        .filter(Boolean);
    const invalidPreview = classified.invalid.slice(0, 8);
    const canImport = classified.toCreate.length + classified.toMerge.length > 0;
    const { root, close } = openStudioModal(
        `<div class="studio-radar-import">
      <p>New <strong>${classified.toCreate.length}</strong> · merge <strong>${classified.toMerge.length}</strong> · skip <strong>${classified.invalid.length}</strong></p>
      ${
          sampleNames.length
              ? `<p class="studio-radar-muted">Sample: ${esc(sampleNames.join(', '))}${classified.toCreate.length + classified.toMerge.length > sampleNames.length ? '…' : ''}</p>`
              : '<p class="studio-radar-muted">No valid rows to import.</p>'
      }
      ${
          invalidPreview.length
              ? `<ul class="studio-radar-import__invalid">${invalidPreview
                    .map(
                        (x) =>
                            `<li>Row ${esc(String(x.rowNumber))}${x.name ? ` (${esc(x.name)})` : ''}: ${esc(x.reasons.join('; '))}</li>`,
                    )
                    .join('')}</ul>`
              : ''
      }
      <p class="studio-radar-muted">Existing leads match by email, then Instagram. Empty Radar fields fill from the sheet; status and score overwrite only when the sheet date is newer.</p>
      <div class="studio-radar-import__progress" data-imp-progress hidden>
        <div class="studio-radar-import__progress-row">
          <span class="studio-radar-import__spinner" aria-hidden="true"></span>
          <p class="studio-radar-import__progress-label" data-imp-progress-label role="status">Preparing…</p>
        </div>
        <div class="studio-radar-import__progress-track" role="progressbar" data-imp-progress-bar aria-valuemin="0" aria-valuemax="${classified.toCreate.length + classified.toMerge.length}" aria-valuenow="0">
          <span class="studio-radar-import__progress-fill" data-imp-progress-fill></span>
        </div>
      </div>
    </div>`,
        {
            title: 'Import leads',
            subtitle: 'Artist leads sheet',
            wide: true,
            footerHtml: `<div class="studio-radar-modal-footer">
        <button type="button" class="studio-btn-ghost" data-imp="template">Download template</button>
        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
        <button type="button" class="studio-btn-primary" data-imp="import" ${canImport ? '' : 'disabled'}>Import</button>
      </div>`,
        },
    );

    const progressWrap = root.querySelector('[data-imp-progress]');
    const progressLabel = root.querySelector('[data-imp-progress-label]');
    const progressBar = root.querySelector('[data-imp-progress-bar]');
    const progressFill = root.querySelector('[data-imp-progress-fill]');
    let importing = false;
    const setImportBusy = (busy) => {
        importing = busy;
        root.querySelectorAll('[data-imp="template"], [data-imp="import"]').forEach((el) => {
            if (el instanceof HTMLButtonElement) el.disabled = busy;
        });
        root.querySelectorAll('[data-studio-modal-close]').forEach((el) => {
            if (el instanceof HTMLButtonElement) el.disabled = busy;
            else if (el instanceof HTMLElement) el.style.pointerEvents = busy ? 'none' : '';
        });
        if (progressWrap instanceof HTMLElement) progressWrap.hidden = !busy;
        root.querySelector('.studio-modal-panel')?.setAttribute('aria-busy', busy ? 'true' : 'false');
    };
    root.addEventListener(
        'keydown',
        (e) => {
            if (importing && e.key === 'Escape') {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        },
        true,
    );
    const paintProgress = ({ done, total, label }) => {
        const n = Math.max(0, Number(total) || 0);
        const d = Math.min(n, Math.max(0, Number(done) || 0));
        const pct = n ? Math.round((d / n) * 100) : 0;
        if (progressLabel) progressLabel.textContent = label || `Saving ${d} of ${n}…`;
        if (progressFill instanceof HTMLElement) progressFill.style.width = `${pct}%`;
        if (progressBar instanceof HTMLElement) {
            progressBar.setAttribute('aria-valuenow', String(d));
            progressBar.setAttribute('aria-valuemax', String(n));
        }
        const st = radarRoot.querySelector('#radarDiscoverStatus');
        if (st) st.textContent = label || `Importing ${d} of ${n}…`;
    };

    root.addEventListener('click', async (ev) => {
        const btn = /** @type {HTMLElement} */ (ev.target)?.closest?.('[data-imp]');
        if (!(btn instanceof HTMLButtonElement)) return;
        const act = btn.getAttribute('data-imp');
        if (act === 'template') {
            downloadTextFile('fusion-artist-leads-template.csv', artistLeadsTemplateCsv());
            return;
        }
        if (act !== 'import' || !canImport) return;
        const total = classified.toCreate.length + classified.toMerge.length;
        setImportBusy(true);
        paintProgress({ done: 0, total, label: 'Preparing Radar source…' });
        try {
            const result = await importArtistLeadsSheet(classified, {
                onProgress: paintProgress,
            });
            close();
            const st = radarRoot.querySelector('#radarDiscoverStatus');
            const line = `Imported ${result.imported} · merged ${result.merged} · skipped ${result.skipped}`;
            if (st) st.textContent = line;
            else {
                openStudioModal(`<p>${esc(line)}</p>`, { title: 'Import leads' });
            }
        } catch (err) {
            setImportBusy(false);
            openStudioModal(
                `<p class="studio-radar-error">${esc(err instanceof Error ? err.message : String(err))}</p>`,
                { title: 'Import leads' },
            );
        }
    });
}

/**
 * @param {ReturnType<typeof classifyArtistLeadsCsv>} classified
 * @param {{ onProgress?: (p: { done: number, total: number, label: string }) => void }} [opts]
 */
async function importArtistLeadsSheet(classified, opts = {}) {
    const jobs = [...classified.toCreate, ...classified.toMerge];
    const total = jobs.length;
    const report = (done, label) => {
        opts.onProgress?.({ done, total, label });
    };
    const yieldUi = () =>
        new Promise((resolve) => {
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
            else setTimeout(resolve, 0);
        });

    report(0, total ? 'Preparing Radar source…' : 'Nothing to import.');
    let source = findArtistLeadsSheetSource(getRadarSourcesCached());
    if (!source) {
        source = await saveRadarSource(
            {
                id: '',
                label: ARTIST_LEADS_SOURCE_LABEL,
                sourceType: 'manualList',
                url: '',
                query: '',
                regionKey: '',
                enabled: true,
                runIntervalHours: 24,
                lastRunAt: '',
                createdAt: '',
            },
            { silent: true },
        );
    }
    const sourceId = String(source?.id || '');
    let imported = 0;
    let merged = 0;
    let skipped = classified.invalid.length;
    let done = 0;
    for (const row of classified.toCreate) {
        const name = String(row.lead?.name || row.name || 'lead').trim() || 'lead';
        report(done, `Saving new ${done + 1} of ${total} — ${name}`);
        await yieldUi();
        try {
            await saveRadarLead(
                emptyLead({
                    ...row.lead,
                    sourceId: row.lead.sourceId || sourceId,
                    createdAt: row.lead.createdAt || new Date().toISOString(),
                }),
                { silent: true },
            );
            imported += 1;
        } catch {
            skipped += 1;
        }
        done += 1;
    }
    for (const row of classified.toMerge) {
        const name = String(row.lead?.name || row.name || 'lead').trim() || 'lead';
        report(done, `Merging ${done + 1} of ${total} — ${name}`);
        await yieldUi();
        try {
            await saveRadarLead(
                emptyLead({
                    ...row.lead,
                    sourceId: row.lead.sourceId || sourceId,
                }),
                { silent: true },
            );
            merged += 1;
        } catch {
            skipped += 1;
        }
        done += 1;
    }
    report(done, 'Finishing…');
    notifyRadar();
    return { imported, merged, skipped };
}

/**
 * @param {HTMLElement} radarRoot
 */
async function openOutreachBatchConfirm(radarRoot) {
    const leads = getRadarLeadsCached();
    const selected = getRadarOutreachCached()
        .filter((o) => selectedOutreachIds.has(o.id))
        .slice(0, RADAR_OUTREACH_BATCH_CAP)
        .map((o) => ({
            outreach: o,
            lead: leads.find((l) => l.id === o.leadId) || emptyLead({ id: o.leadId }),
        }));
    const ready = selected.filter((item) => isRadarOutreachReadyToSend(item.outreach, item.lead));
    const flagged = ready.filter((item) => leadHasRedFlags(item.lead));
    const others = ready.filter((item) => !leadHasRedFlags(item.lead));
    const ordered = [...flagged, ...others];
    if (!ordered.length) {
        openStudioModal(
            `<p>No selected rows are ready. Approve a draft and add a public email, subject, and body first.</p>`,
            { title: 'Send selected' },
        );
        return;
    }

    const {
        campaignSendBlockedReason,
        createStudioPromoCode,
        durationSelectHtml,
        isRadarPromoCode,
        listStudioPromoCodes,
        remainingPromoQuantity,
    } = await import('../../utils/studioPromoCodes.js');
    let codes = (await listStudioPromoCodes()).filter((pc) => isRadarPromoCode(pc) && pc.active !== false);
    const n = ordered.length;
    const codeOpts = codes
        .map((pc) => {
            const rem = remainingPromoQuantity(pc);
            const remLabel = Number.isFinite(rem) ? `${rem} left` : 'unlimited';
            return `<option value="${esc(pc.code)}">${esc(pc.code)} · ${esc(remLabel)}</option>`;
        })
        .join('');

    const flagList = flagged.length
        ? `<p><strong>Red flags (listed first):</strong></p><ul>${flagged
              .map((i) => `<li>${esc(i.lead.name)} — ${esc(getLeadSheetExtras(i.lead).redFlags)}</li>`)
              .join('')}</ul>`
        : '';
    const toList = ordered
        .map((i) => `<li>${esc(i.lead.name)} &lt;${esc(i.lead.publicEmail)}&gt;</li>`)
        .join('');

    const { root, close } = openStudioModal(
        `<div class="studio-radar-import studio-radar-batch-confirm">
      <p>Send <strong>${n}</strong> approved message${n === 1 ? '' : 's'} (cap ${RADAR_OUTREACH_BATCH_CAP} per click). Every email gets the same campaign code.</p>
      ${flagList}
      <div class="studio-radar-form-grid">
        <label class="full">Campaign code
          <select id="radarBatchCode" class="studio-select">
            <option value="">— Select a code —</option>
            ${codeOpts}
            <option value="__new__">Create campaign code…</option>
          </select>
        </label>
      </div>
      <div id="radarBatchNew" class="studio-radar-batch-new" hidden>
        <div class="studio-radar-form-grid">
        <label>Slug
          <input id="radarBatchNewCode" class="studio-input" value="RADAR-BATCH" maxlength="32" />
        </label>
        <label>Offer
          ${durationSelectHtml(2, 'radarBatchDuration')}
        </label>
        <label>Quantity
          <input id="radarBatchQty" class="studio-input" type="number" min="${n}" value="${Math.max(n, 25)}" />
        </label>
        </div>
      </div>
      <p class="studio-radar-batch-budget" id="radarBatchBudget" role="status"></p>
      <p><strong>To</strong></p>
      <ul>${toList}</ul>
      <p class="studio-radar-muted">${esc(STUDIO_EMAIL_ALWAYS_CC)} is CC’d on every message. Send test email delivers the first selected draft to that address only.</p>
    </div>`,
        {
            title: 'Send selected outreach',
            wide: true,
            footerHtml: `<div class="studio-radar-modal-footer">
        <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
        <button type="button" class="studio-btn-secondary" data-batch-test="1">Send test email</button>
        <button type="button" class="studio-btn-primary" data-batch-send="1" disabled>Send</button>
      </div>`,
        },
    );

    const codeEl = /** @type {HTMLSelectElement} */ (root.querySelector('#radarBatchCode'));
    const newWrap = root.querySelector('#radarBatchNew');
    const budgetEl = root.querySelector('#radarBatchBudget');
    const sendBtn = /** @type {HTMLButtonElement} */ (root.querySelector('[data-batch-send]'));
    const testBtn = /** @type {HTMLButtonElement | null} */ (root.querySelector('[data-batch-test]'));

    const selectedCampaign = () => {
        const val = codeEl?.value || '';
        if (!val || val === '__new__') return null;
        return codes.find((pc) => pc.code === val) || null;
    };

    const refreshBudget = () => {
        const creating = codeEl?.value === '__new__';
        if (newWrap instanceof HTMLElement) newWrap.hidden = !creating;
        let pc = selectedCampaign();
        if (creating) {
            const qty = Number(/** @type {HTMLInputElement} */ (root.querySelector('#radarBatchQty'))?.value || 0);
            pc = {
                code: String(/** @type {HTMLInputElement} */ (root.querySelector('#radarBatchNewCode'))?.value || '')
                    .trim()
                    .toUpperCase(),
                active: true,
                maxRedemptions: qty,
                currentRedemptions: 0,
            };
        }
        const reason = campaignSendBlockedReason(pc, n);
        const rem = pc ? remainingPromoQuantity(pc) : 0;
        const remLabel = pc && Number.isFinite(rem) ? `${rem} remaining` : pc ? 'unlimited' : 'no code';
        if (budgetEl) {
            budgetEl.textContent = reason
                ? reason
                : `${pc.code} · ${remLabel} · sending ${n}`;
        }
        if (sendBtn) sendBtn.disabled = Boolean(reason);
    };

    codeEl?.addEventListener('change', refreshBudget);
    root.querySelector('#radarBatchQty')?.addEventListener('input', refreshBudget);
    root.querySelector('#radarBatchNewCode')?.addEventListener('input', refreshBudget);
    if (codes.length) {
        const preferred =
            codes.find((pc) => remainingPromoQuantity(pc) >= n && String(pc.campaignTag).includes('batch')) ||
            codes.find((pc) => remainingPromoQuantity(pc) >= n) ||
            codes[0];
        if (preferred) codeEl.value = preferred.code;
    }
    refreshBudget();

    testBtn?.addEventListener('click', async () => {
        const sample = ordered[0];
        if (!sample) return;
        testBtn.disabled = true;
        try {
            const pc = selectedCampaign();
            await sendRadarOutreachTestEmail({
                subject: String(sample.outreach?.subject || ''),
                body: String(sample.outreach?.bodyHtml || ''),
                durationMonths: pc?.discountDurationMonths,
                code: pc?.code,
            });
            if (budgetEl) {
                budgetEl.textContent = `Test sent to ${STUDIO_EMAIL_ALWAYS_CC}. Leads were not contacted.`;
            }
        } catch (err) {
            openStudioModal(
                `<p class="studio-radar-error">${esc(err instanceof Error ? err.message : String(err))}</p>`,
                { title: 'Send test email' },
            );
        } finally {
            testBtn.disabled = false;
        }
    });

    sendBtn?.addEventListener('click', async () => {
        if (getDataSource() !== 'live') {
            openStudioModal(`<p>Switch to live data source to send email.</p>`, {
                title: 'Send selected outreach',
            });
            return;
        }
        sendBtn.disabled = true;
        try {
            let pc = selectedCampaign();
            if (codeEl?.value === '__new__') {
                pc = await createStudioPromoCode({
                    code: String(
                        /** @type {HTMLInputElement} */ (root.querySelector('#radarBatchNewCode'))?.value || '',
                    ),
                    durationMonths: Number(
                        /** @type {HTMLSelectElement} */ (root.querySelector('#radarBatchDuration'))?.value || 2,
                    ),
                    maxRedemptions: Number(
                        /** @type {HTMLInputElement} */ (root.querySelector('#radarBatchQty'))?.value || n,
                    ),
                    campaignTag: 'radar-batch',
                });
                codes = [...codes, pc];
            }
            const reason = campaignSendBlockedReason(pc, n);
            if (reason) throw new Error(reason);
            const result = await sendRadarOutreachBatch(ordered, {
                code: pc.code,
                durationMonths: pc.discountDurationMonths,
            });
            selectedOutreachIds = new Set();
            close();
            const failList = (result.failed || [])
                .map((f) => `<li>${esc(f.name || f.email)} — ${esc(f.error)}</li>`)
                .join('');
            openStudioModal(
                `<p>Sent <strong>${result.sent}</strong> · failed <strong>${(result.failed || []).length}</strong> with code <strong>${esc(pc.code)}</strong></p>
        ${failList ? `<ul>${failList}</ul>` : ''}`,
                { title: 'Outreach send result' },
            );
            const st = radarRoot.querySelector('#radarOutreachStatus');
            if (st) {
                st.textContent = `Sent ${result.sent} · failed ${(result.failed || []).length}`;
            }
        } catch (err) {
            sendBtn.disabled = false;
            openStudioModal(
                `<p class="studio-radar-error">${esc(err instanceof Error ? err.message : String(err))}</p>`,
                { title: 'Send selected outreach' },
            );
        }
    });
}

