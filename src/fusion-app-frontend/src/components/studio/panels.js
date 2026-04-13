/**
 * Studio section panels: dashboard + all sidebar tabs (data via database.js).
 */
import { DEV_MODE } from '../../config.js';
import { getFusionBackendActor, normalizeEarlyAccessCategory } from '../../utils/earlyAccessSubscribe.js';
import {
    batchImportArtistsFromJson,
    batchImportProgramsFromJson,
    bulkUpsertArtistsStudio,
    bulkUpsertSubscribersStudio,
    deleteEditionStudio,
    deleteJournalStudio,
    deleteProgramStudio,
    deleteSubscriberRow,
    getAccountsForStudio,
    getApplicants,
    getArtists,
    getArtistsForStudio,
    loadArtistForStudioEdit,
    CONTENT_PAGE_REGISTRY,
    getContentBundleForStudio,
    getContentSummary,
    getDashboardMetrics,
    getDataSource,
    getEditions,
    getJournalEntries,
    getJournalEntryForStudio,
    getProgramRecordForStudio,
    getPrograms,
    getSubscribers as loadSubscribersFromDataSource,
    getSubscribersCsv,
    setDataSource,
    upsertApplicantStudio,
    studioReinterpretWithPrompt,
    studioTranslateEnToJa,
    upsertContentPageStudio,
    upsertEditionStudio,
    upsertJournalStudio,
    upsertProgramStudio,
    upsertSubscriberRow,
    saveArtistTestOverlayJson,
    syncStudioArtistsLegacyHeroImages,
    syncStudioArtistsLegacyIntroGalleries,
} from '../../utils/database.js';
import { parseSubscriberCsv } from '../../utils/csvParse.js';
import {
    editorTextToObjectLocale,
    localeValueToEditorText,
} from '../../utils/studioLocaleEdit.js';
import {
    applicantPayloadToPlainNotes,
    applyJournalPlainLocales,
    applyScalarPatches,
    applyStringPatches,
    flattenScalarFields,
    flattenStringFields,
    syncContextJaMediaFromEn,
    journalLocalesToPlain,
    plainNotesToApplicantPayload,
    shortPrincipalDisplay,
    shortRefLabel,
} from '../../utils/studioPlainForms.js';
import {
    applyFeaturedFlagsFromStudioSave,
    MAX_MANUAL_FEATURED,
    readArtistFeaturedMeta,
    setFeaturableForArtist,
    setManualFeaturedForArtist,
    setRandomFeaturedMode,
} from '../../utils/artistFeaturedExtension.js';
import { LEGACY_PROFILE_BASE } from '../../utils/studioLegacyProfileUrls.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { createPaymentIntent, fetchIntegrationHealth, sendEmail } from '../../utils/integrationApi.js';
import { uploadBlobToS3 } from '../../utils/studioS3Upload.js';
import { appendContentFieldRow, appendContentLocalePairRow, collectContentStringValues } from './studioFieldRender.js';
import { groupLocaleContentRows } from '../../utils/studioContentLocalePairs.js';
import { getFieldKind, getFieldKindBadgeLabel } from '../../utils/studioFieldRegistry.js';
import { collectProgramLocalesFromForm, renderProgramLocaleFormHtml } from '../../utils/studioProgramLocaleForm.js';
import {
    STUDIO_WORLD_TO_NEW_PATHS,
    collectArtistRecordFromForm,
    initArtistManageTabs,
    renderArtistManageModalHtml,
} from '../../utils/studioArtistForm.js';
import { collectAccessCodesFromArtists, normalizeArtistImportRow } from '../../utils/studioBatchImport.js';
import {
    LS_INTEGRATION_API_KEY,
    LS_INTEGRATION_API_URL,
    LS_RESEND_FROM_OVERRIDE,
    LS_RESEND_TEST_TO,
    LS_S3_BUCKET,
    LS_S3_PUBLIC_BASE,
    LS_S3_REGION,
    LS_STRIPE_PK_LIVE,
    LS_STRIPE_PK_TEST,
    buildServerEnvSnippet,
    getStripeMode,
    getStripePublishableKeyResolved,
    setStripeMode,
} from '../../utils/studioServicesConfig.js';
import {
    studioPageHeaderHtml,
    studioFilterBarHtml,
    studioDataTabsHtml,
    studioPaginationBarHtml,
} from '../../utils/studioCategoryLayout.js';

/**
 * Twelve categories (sidebar). Default landing `#dashboard`.
 * @type {{ id: string, label: string }[]}
 */
export const STUDIO_NAV = [
    { id: 'subscribers', label: 'Subscribers' },
    { id: 'applicants', label: 'Applicants' },
    { id: 'artists', label: 'Artists' },
    { id: 'programs', label: 'Programs' },
    { id: 'products', label: 'Products' },
    { id: 'gallery-access', label: 'Gallery Access' },
    { id: 'journal', label: 'Journal' },
    { id: 'content', label: 'Content' },
    { id: 'email', label: 'Email' },
    { id: 'ai', label: 'Ai' },
    { id: 'galleries', label: 'Galleries' },
    { id: 'collectors', label: 'Collectors' },
    { id: 'curators', label: 'Curators' },
    { id: 'users', label: 'Users' },
    { id: 'services', label: 'Services' },
    { id: 'settings', label: 'Settings' },
];

export const STUDIO_DASHBOARD_ID = 'dashboard';

const TITLE_MAP = {
    [STUDIO_DASHBOARD_ID]: 'Dashboard',
    ...Object.fromEntries(STUDIO_NAV.map((n) => [n.id, n.label])),
};

/**
 * @param {string} sectionId
 */
export function sectionTitle(sectionId) {
    return TITLE_MAP[sectionId] || 'Studio';
}

/**
 * @param {string} sectionId
 */
export function renderStudioMain(sectionId) {
    switch (sectionId) {
        case STUDIO_DASHBOARD_ID:
            return renderDashboard();
        case 'subscribers':
            return renderSubscribers();
        case 'applicants':
            return renderApplicants();
        case 'artists':
            return renderArtists();
        case 'programs':
            return renderPrograms();
        case 'products':
            return renderProducts();
        case 'gallery-access':
            return renderGalleryAccess();
        case 'journal':
            return renderJournal();
        case 'content':
            return renderContent();
        case 'email':
            return renderEmail();
        case 'ai':
            return renderAi();
        case 'galleries':
            return renderAudience('galleries');
        case 'collectors':
            return renderAudience('collectors');
        case 'curators':
            return renderAudience('curators');
        case 'users':
            return renderUsers();
        case 'services':
            return renderServices();
        case 'settings':
            return renderSettings();
        default:
            return renderFallback(sectionId);
    }
}

function renderDashboard() {
    return `
        <div class="studio-section-stack">
            <p class="studio-banner studio-banner--info" id="studio-dashboard-banner">
                Loading metrics…
            </p>
            <div class="studio-stats-row" id="studio-dashboard-stats"></div>
            <div>
                <div class="studio-section-title-row">
                    <h2>Audience pipeline</h2>
                </div>
                <div class="studio-pipeline-row">
                    ${pipelineCard('Artists')}
                    ${pipelineCard('Galleries')}
                    ${pipelineCard('Curators')}
                    ${pipelineCard('Collectors')}
                </div>
            </div>
            <div>
                <div class="studio-section-title-row">
                    <h2>Quick links</h2>
                </div>
                <ul class="studio-quick-links">
                    ${STUDIO_NAV.map(
                        (n) =>
                            `<li><a href="#${n.id}" class="studio-quick-link" data-studio-hash="${n.id}">${escapeHtml(n.label)}</a></li>`
                    ).join('')}
                </ul>
            </div>
        </div>
    `;
}

function renderSubscribers() {
    return `
        <div class="studio-section-stack studio-category-page">
            ${studioPageHeaderHtml({
                title: 'Subscribers',
                subtitle: 'Newsletter signups and early-access records',
                countId: 'studio-subscribers-header-count',
                countLabel: 'records',
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-subscribers-search',
                searchPlaceholder: 'Search email, name, category…',
            })}
            <div class="studio-subscribers-toolbar">
                <button type="button" class="studio-btn-primary" id="studio-bootstrap-admin">
                    Claim first admin (local dev)
                </button>
                <button type="button" class="studio-btn-primary" id="studio-subscriber-add">ADD SUBSCRIBER</button>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" id="studio-subscriber-csv" accept=".csv,text/csv" class="studio-file-input" />
                    Upload CSV
                </label>
                <button type="button" class="studio-btn-ghost" id="studio-subscribers-refresh">
                    Refresh list
                </button>
            </div>
            <div id="studio-subscribers-csv-msg" class="studio-banner studio-banner--info" style="display:none"></div>
            <div id="studio-subscribers-banner" class="studio-banner studio-banner--info" style="display:none"></div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Category</th>
                            <th>Name</th>
                            <th>Intent</th>
                            <th>Timestamp</th>
                            <th class="studio-td-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="studio-subscribers-tbody">
                        <tr><td colspan="6">Loading…</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderApplicants() {
    return `
        <div class="studio-section-stack studio-category-page">
            ${studioPageHeaderHtml({
                title: 'Applicants',
                subtitle: 'Program applications and pipeline',
                countId: 'studio-applicants-header-count',
                countLabel: 'in view',
            })}
            ${studioDataTabsHtml({
                ariaLabel: 'Applicant status',
                tabs: [
                    { id: 'studio-app-tab-all', label: 'All', value: 'all', active: true },
                    { id: 'studio-app-tab-pending', label: 'Pending', value: 'pending' },
                    { id: 'studio-app-tab-reviewing', label: 'Under review', value: 'reviewing' },
                    { id: 'studio-app-tab-needs', label: 'Needs info', value: 'needsInfo' },
                    { id: 'studio-app-tab-accepted', label: 'Approved', value: 'accepted' },
                    { id: 'studio-app-tab-rejected', label: 'Denied', value: 'rejected' },
                ],
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-applicants-search',
                searchPlaceholder: 'Search email, name, program…',
            })}
            <div id="studio-applicants-banner" class="studio-banner studio-banner--info"></div>
            <div class="studio-applicant-add">
                <h3 class="studio-subheading">Add applicant</h3>
                <div class="studio-form-grid">
                    <label class="studio-field"><span>Applicant reference</span><input type="text" id="studio-app-new-id" class="studio-input" placeholder="Unique reference for this record" /></label>
                    <label class="studio-field"><span>Program ID</span><input type="text" id="studio-app-new-program" class="studio-input" /></label>
                    <label class="studio-field"><span>Email</span><input type="email" id="studio-app-new-email" class="studio-input" /></label>
                    <label class="studio-field"><span>Name</span><input type="text" id="studio-app-new-name" class="studio-input" /></label>
                    <label class="studio-field"><span>Status</span>
                        <select id="studio-app-new-status" class="studio-select">
                            <option value="pending">Pending</option>
                            <option value="reviewing">Reviewing</option>
                            <option value="needsInfo">Needs info</option>
                            <option value="accepted">Approved</option>
                            <option value="rejected">Denied</option>
                        </select>
                    </label>
                    <label class="studio-field studio-field--full"><span>Notes</span><textarea id="studio-app-new-payload" class="studio-textarea" rows="4" placeholder="Internal notes (plain text)"></textarea></label>
                </div>
                <button type="button" class="studio-btn-primary" id="studio-app-new-save">SAVE APPLICANT</button>
            </div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Program</th>
                            <th>Status</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody id="studio-applicants-tbody"><tr><td colspan="5">Loading…</td></tr></tbody>
                </table>
            </div>
            ${studioPaginationBarHtml({
                navId: 'studio-applicants-pagination',
                prevId: 'studio-app-page-prev',
                nextId: 'studio-app-page-next',
                labelId: 'studio-app-page-label',
                numbersId: 'studio-app-page-numbers',
            })}
        </div>
    `;
}

function renderArtists() {
    return `
        <div class="studio-section-stack studio-category-page">
            ${studioPageHeaderHtml({
                title: 'Artists',
                subtitle: 'Admin roster — visibility, codes, and public links',
                countId: 'studio-artists-header-count',
                countLabel: 'artists',
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-artists-search',
                searchPlaceholder: 'Filter slug, id, visibility…',
            })}
            <div class="studio-artists-quick-filters" style="display:flex;flex-wrap:wrap;gap:0.5rem 0.75rem;align-items:center;margin:0.35rem 0 0.75rem">
                <span class="studio-muted" style="margin-right:0.25rem">Quick:</span>
                <button type="button" class="studio-btn-ghost studio-artists-filter is-active" data-filter="all">All</button>
                <button type="button" class="studio-btn-ghost studio-artists-filter" data-filter="featurable">Featurable</button>
                <button type="button" class="studio-btn-ghost studio-artists-filter" data-filter="featured">Featured</button>
                <label class="studio-muted" style="display:inline-flex;align-items:center;gap:0.35rem;margin-left:0.75rem;cursor:pointer">
                    <input type="checkbox" id="studio-artists-random-featured" />
                    Random featured (pick up to ${MAX_MANUAL_FEATURED} from featurable pool)
                </label>
            </div>
            <p class="studio-banner studio-banner--info">Admin roster: use <strong>Manage</strong> for structured editing (tabs: roster, identity, world, media, links/SEO). Batch JSON remains for bulk import. <strong>Advanced JSON</strong> in the modal applies <strong>test overlay</strong> only (localStorage).</p>
            <p class="studio-muted">Batch upload: JSON array of artist rows (see <code>ArtistRecord</code> shape), or <code>{ "artists": [ … ] }</code>. Imported rows get an 8-digit access code for future account linking.</p>
            <div class="studio-subscribers-toolbar studio-subscribers-toolbar--artists">
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" accept="application/json,.json" id="studio-artists-batch-json" class="studio-file-input" />
                    Batch upload (JSON)
                </label>
                <button type="button" class="studio-btn-ghost" id="studio-artists-sync-hero">Sync Profile Images</button>
                <button type="button" class="studio-btn-ghost" id="studio-artists-sync-gallery">Sync Gallery</button>
            </div>
            <div id="studio-artists-banner" class="studio-banner studio-banner--info"></div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Slug</th>
                            <th>ID</th>
                            <th>Imported</th>
                            <th>Access code</th>
                            <th>Visibility</th>
                            <th>Featured</th>
                            <th>Featurable</th>
                            <th>Public profile</th>
                            <th class="studio-td-actions">Manage</th>
                        </tr>
                    </thead>
                    <tbody id="studio-artists-tbody"><tr><td colspan="9">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderPrograms() {
    return `
        <div class="studio-section-stack studio-category-page">
            ${studioPageHeaderHtml({
                title: 'Programs',
                subtitle: 'Program cards and program page copy (structured editor in Manage)',
                countId: 'studio-programs-header-count',
                countLabel: 'programs',
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-programs-search',
                searchPlaceholder: 'Search id, focus, location, route…',
            })}
            <p class="studio-muted">Programs are <code>ProgramRecord</code> — locale fields include card copy and nested <code>programPage</code> (costs, details, FAQ) in the Manage dialog. For block order + shared media see <strong>Content → Programs block</strong>. Test mode uses <code>localStorage</code>.</p>
            <div class="studio-subscribers-toolbar">
                <button type="button" class="studio-btn-primary" id="studio-program-add">ADD PROGRAM</button>
                <button type="button" class="studio-btn-ghost" id="studio-programs-refresh">Refresh</button>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" accept="application/json,.json" id="studio-programs-batch-json" class="studio-file-input" />
                    Batch upload (JSON)
                </label>
            </div>
            <div id="studio-programs-banner" class="studio-banner studio-banner--info" style="display:none"></div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Focus</th>
                            <th>Location</th>
                            <th>Year</th>
                            <th>Open</th>
                            <th>Route</th>
                            <th>Status</th>
                            <th class="studio-td-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="studio-programs-tbody"><tr><td colspan="8">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderProducts() {
    return `
        <div class="studio-section-stack studio-category-page">
            ${studioPageHeaderHtml({
                title: 'Products',
                subtitle: 'Edition grid items (locales + commerce fields in Manage)',
                countId: 'studio-products-header-count',
                countLabel: 'editions',
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-products-search',
                searchPlaceholder: 'Search id, title, href, status…',
            })}
            <p class="studio-muted studio-banner studio-banner--info">Editions here power the public <code>/editions</code> grid (<code>listEditions</code>). Home “Objects Highlights” uses Content → <strong>Objects highlight</strong> when that JSON includes an <code>objects</code> array; if it is empty or missing, the home block shows up to four of these edition records instead.</p>
            <div class="studio-subscribers-toolbar">
                <button type="button" class="studio-btn-primary" id="studio-product-add">ADD EDITION</button>
                <button type="button" class="studio-btn-ghost" id="studio-products-refresh">Refresh</button>
            </div>
            <div id="studio-products-banner" class="studio-banner studio-banner--info" style="display:none"></div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title (en)</th>
                            <th>Title (ja)</th>
                            <th>href</th>
                            <th>Status</th>
                            <th>Cover</th>
                            <th class="studio-td-actions">Manage</th>
                        </tr>
                    </thead>
                    <tbody id="studio-products-tbody"><tr><td colspan="7">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderGalleryAccess() {
    return `
        <div class="studio-section-stack">
            <p class="studio-muted">Subscribers with Gallery-related categories + artists with <code>galleryFilter</code>.</p>
            <h3 class="studio-subheading">Subscribers</h3>
            <div class="studio-table-wrap">
                <table class="studio-table">
                    <thead><tr><th>Email</th><th>Category</th></tr></thead>
                    <tbody id="studio-ga-subs-tbody"><tr><td colspan="2">Loading…</td></tr></tbody>
                </table>
            </div>
            <h3 class="studio-subheading">Artists</h3>
            <div class="studio-table-wrap">
                <table class="studio-table">
                    <thead><tr><th>Slug</th><th>Access type</th><th>Season</th></tr></thead>
                    <tbody id="studio-ga-artists-tbody"><tr><td colspan="3">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderJournal() {
    return `
        <div class="studio-section-stack studio-category-page">
            ${studioPageHeaderHtml({
                title: 'Journal',
                subtitle: 'Journal entries (also listed from Content → journals-block)',
                countId: 'studio-journal-header-count',
                countLabel: 'entries',
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-journal-search',
                searchPlaceholder: 'Search title, id, link…',
            })}
            <div class="studio-subscribers-toolbar">
                <button type="button" class="studio-btn-primary" id="studio-journal-add">ADD ENTRY</button>
                <button type="button" class="studio-btn-ghost" id="studio-journal-refresh">Refresh</button>
            </div>
            <div id="studio-journal-banner" class="studio-banner studio-banner--info" style="display:none"></div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>ID</th>
                            <th>Status</th>
                            <th>Link</th>
                            <th class="studio-td-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="studio-journal-tbody"><tr><td colspan="5">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderContent() {
    return `
        <div class="studio-section-stack">
            <p class="studio-muted">Edit wording for each site section below. Labels describe where text appears (English and 日本語). You never need to paste structured data or storage keys.</p>
            <div class="studio-content-toolbar">
                <label class="studio-field studio-field--inline"><span class="studio-toolbar-label">Search</span>
                    <input type="search" id="studio-content-filter" class="studio-input" placeholder="Filter sections…" autocomplete="off" />
                </label>
                <span id="studio-content-count" class="studio-muted studio-content-count"></span>
            </div>
            <div class="studio-table-wrap studio-table-wrap--rounded">
                <table class="studio-table studio-table--rows">
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Preview</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="studio-content-tbody"><tr><td colspan="3">Loading…</td></tr></tbody>
                </table>
            </div>
            <div id="studio-content-editor" class="studio-content-editor" style="display:none">
                <div class="studio-content-editor__header">
                    <h3 class="studio-subheading" id="studio-content-editor-title">Edit</h3>
                    <p class="studio-muted studio-content-editor-slug" id="studio-content-editor-slug" hidden></p>
                </div>
                <p class="studio-modal-hint studio-content-hint" id="studio-content-hint">Fields are labeled by kind (Route, Media, Text, …). Uploads use Services → S3. Save to persist to storage.</p>
                <p id="studio-content-live-placeholder" class="studio-banner studio-banner--placeholder" style="display:none" role="status">
                    Sample copy only — this section is not stored on the canister yet. Use <strong>Save</strong> or <strong>Adopt sample</strong> to persist (including any edits).
                </p>
                <p id="studio-content-unsaved" class="studio-banner studio-banner--warn" style="display:none" role="status">You have unsaved changes.</p>
                <div id="studio-content-fields" class="studio-content-fields studio-content-fields--scroll"></div>
                <div class="studio-content-editor__footer">
                    <div class="studio-toolbar-actions studio-content-editor__actions">
                        <button type="button" class="studio-btn-primary" id="studio-content-save">Save</button>
                        <button type="button" class="studio-btn-primary" id="studio-content-adopt" style="display:none">Adopt sample</button>
                        <button type="button" class="studio-btn-ghost" id="studio-content-cancel">Cancel</button>
                    </div>
                    <p id="studio-content-saved-at" class="studio-muted studio-content-saved-at" style="display:none" aria-live="polite"></p>
                    <p id="studio-content-msg" class="studio-banner studio-banner--info" style="display:none"></p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Content editor: flatten → {@link getFieldKind} per path → {@link appendContentFieldRow} (studioFieldRender.js).
 * Upload/controls follow registry; legacy asset heuristic lives in studioFieldRegistry only.
 *
 * @param {HTMLElement} container
 * @param {unknown} bundle
 * @param {string} slug
 * @param {{ markDirty: () => void }} hooks
 */
function fillStudioContentPlainFields(container, bundle, slug, hooks) {
    container.innerHTML = '';
    let rows = flattenStringFields(bundle);
    if (slug === 'context') {
        rows = rows.filter((r) => {
            if (!r.path.startsWith('ja.')) return true;
            const k = getFieldKind('context', r.path);
            return k !== 'assetUrl' && k !== 'externalUrl';
        });
    }
    rows = rows.sort((a, b) => a.path.localeCompare(b.path));
    const grouped = groupLocaleContentRows(rows);

    /** @type {string | null} */
    let joinFlowSection = null;
    /** @type {string | null} */
    let programHeroLocale = null;

    /** @type {{ markDirty: () => void, translateEnToJa: (s: string) => Promise<string> }} */
    const hooksPair = {
        markDirty: () => hooks.markDirty(),
        translateEnToJa: (text) => studioTranslateEnToJa(text),
    };

    const appendSectionHeadings = (pathForHead) => {
        if (slug === 'join-network-flow') {
            const head = pathForHead.split('.')[0] || '';
            if (head && head !== joinFlowSection && ['membership', 'access', 'apply'].includes(head)) {
                joinFlowSection = head;
                const h = document.createElement('h4');
                h.className = 'studio-content-section-heading';
                h.textContent = head.charAt(0).toUpperCase() + head.slice(1);
                container.appendChild(h);
            }
        }
        if (slug === 'program-hero') {
            const head = pathForHead.split('.')[0] || '';
            if (head === 'en' || head === 'ja') {
                if (head !== programHeroLocale) {
                    programHeroLocale = head;
                    const h = document.createElement('h4');
                    h.className = 'studio-content-section-heading';
                    h.textContent = head === 'en' ? 'English' : '日本語';
                    container.appendChild(h);
                }
            }
        }
    };

    for (const g of grouped) {
        if (g.type === 'pair') {
            appendSectionHeadings(g.en.path);
            appendContentLocalePairRow(container, slug, g.en, g.ja, hooksPair);
        } else {
            const r = g.row;
            appendSectionHeadings(r.path);
            appendContentFieldRow(container, slug, r, hooks);
        }
    }
    const scalars = flattenScalarFields(bundle).sort((a, b) => a.path.localeCompare(b.path));
    for (const s of scalars) {
        const row = document.createElement('div');
        row.className = 'studio-content-field-row studio-content-field-row--scalar';
        const lab = document.createElement('label');
        lab.className = 'studio-field studio-field--stack studio-content-field-main';
        const span = document.createElement('span');
        span.textContent = `${s.label} (${s.kind})`;
        lab.appendChild(span);
        if (s.kind === 'boolean') {
            const inp = document.createElement('input');
            inp.type = 'checkbox';
            inp.className = 'studio-checkbox';
            inp.dataset.scalarPath = s.path;
            inp.checked = Boolean(s.value);
            inp.addEventListener('change', () => hooks.markDirty());
            lab.appendChild(inp);
        } else {
            const inp = document.createElement('input');
            inp.type = 'number';
            inp.className = 'studio-input';
            inp.dataset.scalarPath = s.path;
            inp.value = String(s.value);
            inp.addEventListener('input', () => hooks.markDirty());
            lab.appendChild(inp);
        }
        row.appendChild(lab);
        container.appendChild(row);
    }
    if (Array.isArray(bundle) && bundle.length > 0) {
        const wrap = document.createElement('div');
        wrap.className = 'studio-content-array-hint';
        const tbl = document.createElement('table');
        tbl.className = 'studio-table studio-content-mini-table';
        tbl.innerHTML =
            '<thead><tr><th>#</th><th>Id / key</th><th>Preview</th></tr></thead><tbody></tbody>';
        const tb = tbl.querySelector('tbody');
        bundle.forEach((row, idx) => {
            const tr = document.createElement('tr');
            const id =
                row && typeof row === 'object'
                    ? String(row.id ?? row.href ?? row.title ?? row.link ?? '—')
                    : '—';
            const prev =
                row && typeof row === 'object' && row.en && typeof row.en === 'object'
                    ? String(row.en.title ?? row.en.category ?? '')
                    : '';
            tr.innerHTML = `<td>${idx}</td><td>${escapeHtml(id.slice(0, 80))}</td><td>${escapeHtml(prev.slice(0, 120))}</td>`;
            tb?.appendChild(tr);
        });
        const cap = document.createElement('p');
        cap.className = 'studio-muted';
        cap.innerHTML = `<strong>${bundle.length}</strong> items — edit fields below (paths like <code>0.en.title</code>).`;
        wrap.appendChild(cap);
        wrap.appendChild(tbl);
        container.insertBefore(wrap, container.firstChild);
    }
    if (!grouped.length && !scalars.length) {
        const p = document.createElement('p');
        p.className = 'studio-muted';
        p.textContent = 'No editable text or numeric fields were found for this section.';
        container.appendChild(p);
    }
}

function renderEmail() {
    return `
        <div class="studio-section-stack">
            <p class="studio-muted">Export subscriber emails for campaigns (requires Live + admin).</p>
            <button type="button" class="studio-btn-primary" id="studio-email-export">Download CSV</button>
            <pre id="studio-email-preview" class="studio-pre" hidden></pre>
        </div>
    `;
}

function renderAi() {
    return `
        <div class="studio-section-stack">
            <label class="studio-field">
                <span>Model label (local preview)</span>
                <input type="text" id="studio-ai-model" class="studio-input" placeholder="e.g. fusion-assistant-v1" />
            </label>
            <label class="studio-field">
                <span>Notes</span>
                <textarea id="studio-ai-notes" class="studio-textarea" rows="4" placeholder="Internal notes — future: siteSettings on canister"></textarea>
            </label>
            <button type="button" class="studio-btn-primary" id="studio-ai-save">Save locally</button>
            <p id="studio-ai-msg" class="studio-banner studio-banner--info" style="display:none;margin-top:12px"></p>
        </div>
    `;
}

function renderUsers() {
    return `
        <div class="studio-section-stack studio-category-page">
            ${studioPageHeaderHtml({
                title: 'Users',
                subtitle: 'On-chain accounts (roles and linkage) — not full artist bios',
                countId: 'studio-users-header-count',
                countLabel: 'in view',
            })}
            <p class="studio-muted">Internet Identity has <strong>no password</strong>. “Reset password” is disabled until a non-II email store exists. Rich profile copy belongs in the future <strong>user profile</strong> dashboard.</p>
            <div id="studio-users-self" class="studio-users-self-card">Loading…</div>
            <div class="studio-filter-bar">
                <div class="studio-users-filters" style="margin:0;flex:1;display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end">
                <label class="studio-field"><span>Role</span>
                    <select id="studio-users-filter-role" class="studio-select">
                        <option value="">All</option>
                        <option value="artist">artist</option>
                        <option value="gallery">gallery</option>
                        <option value="curator">curator</option>
                        <option value="collector">collector</option>
                        <option value="staff">staff</option>
                        <option value="admin">admin</option>
                    </select>
                </label>
                <label class="studio-field"><span>Status</span>
                    <select id="studio-users-filter-status" class="studio-select">
                        <option value="">All</option>
                        <option value="pending">pending</option>
                        <option value="active">active</option>
                        <option value="suspended">suspended</option>
                    </select>
                </label>
                </div>
            </div>
            <h3 class="studio-subheading">All accounts</h3>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead><tr><th>Identity</th><th>Role</th><th>Status</th><th>Linked artist</th><th>Org</th><th>Updated</th><th class="studio-td-actions">Account</th></tr></thead>
                    <tbody id="studio-users-tbody"><tr><td colspan="7">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderServices() {
    return `
        <div class="studio-section-stack studio-services">
            <p class="studio-muted">Configure off-chain integrations (Stripe, Resend, S3). Publishable keys and URLs can be stored here for dev; <strong>never</strong> ship live secret keys in a public build. Server secrets belong in <code>services/fusion-integration-api/.env</code>.</p>
            <p class="studio-banner studio-banner--info" id="studio-svc-msg" style="display:none"></p>
            <div class="studio-tabs" data-studio-tabs="services">
                <div class="studio-tabs__list" role="tablist" aria-label="Services sections">
                    <button type="button" class="studio-tabs__tab is-active" role="tab" id="studio-svc-tab-connect" aria-selected="true" aria-controls="studio-svc-panel-connect">Connection</button>
                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-svc-tab-stripe" aria-selected="false" aria-controls="studio-svc-panel-stripe">Stripe</button>
                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-svc-tab-resend" aria-selected="false" aria-controls="studio-svc-panel-resend">Resend</button>
                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-svc-tab-s3" aria-selected="false" aria-controls="studio-svc-panel-s3">Amazon S3</button>
                </div>
                <div class="studio-tabs__panels">
                    <div id="studio-svc-panel-connect" class="studio-tabs__panel is-active" role="tabpanel" aria-labelledby="studio-svc-tab-connect">
                        <div class="studio-form-grid studio-services-grid studio-services-grid--panel">
                            <h3 class="studio-subheading studio-field--full">Integration API</h3>
                            <label class="studio-field studio-field--full">
                                <span>Base URL</span>
                                <input type="text" id="studio-svc-url" class="studio-input" placeholder="/integration or https://api.example.com" autocomplete="off" />
                            </label>
                            <label class="studio-field studio-field--full">
                                <span>API Bearer (optional)</span>
                                <input type="password" id="studio-svc-bearer" class="studio-input" placeholder="If INTEGRATION_API_KEY is set on server" autocomplete="off" />
                            </label>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-primary" id="studio-svc-save">Save</button>
                                <button type="button" class="studio-btn-ghost" id="studio-svc-health">Test connection</button>
                            </div>
                        </div>
                    </div>
                    <div id="studio-svc-panel-stripe" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-svc-tab-stripe" hidden>
                        <div class="studio-form-grid studio-services-grid studio-services-grid--panel">
                            <h3 class="studio-subheading studio-field--full">Stripe</h3>
                            <p class="studio-muted studio-field--full">Use <strong>test</strong> keys until launch. Secret keys are for the integration server only — paste below to copy into <code>.env</code>; they are not saved in the browser.</p>
                            <div class="studio-field-row studio-field--full">
                                <label class="studio-field studio-field--inline">
                                    <input type="radio" name="studio-svc-stripe-mode" value="test" id="studio-svc-mode-test" checked />
                                    Test (pk_test / sk_test)
                                </label>
                                <label class="studio-field studio-field--inline">
                                    <input type="radio" name="studio-svc-stripe-mode" value="live" id="studio-svc-mode-live" />
                                    Live publishable (pk_live)
                                </label>
                            </div>
                            <label class="studio-field studio-field--full">
                                <span>Publishable key (test) <code>pk_test_…</code></span>
                                <input type="text" id="studio-svc-pk-test" class="studio-input" placeholder="pk_test_…" autocomplete="off" />
                            </label>
                            <label class="studio-field studio-field--full">
                                <span>Secret key (test) <code>sk_test_…</code> — server only, not persisted</span>
                                <input type="password" id="studio-svc-sk-test" class="studio-input" placeholder="Paste to generate .env; cleared on reload" autocomplete="off" />
                            </label>
                            <details class="studio-field studio-field--full" id="studio-svc-live-details">
                                <summary>Live keys (production)</summary>
                                <label class="studio-field studio-field--full">
                                    <span>Publishable key (live) <code>pk_live_…</code></span>
                                    <input type="text" id="studio-svc-pk-live" class="studio-input" placeholder="pk_live_…" autocomplete="off" />
                                </label>
                                <label class="studio-field studio-field--full">
                                    <span>Secret key (live) <code>sk_live_…</code> — server only, not persisted</span>
                                    <input type="password" id="studio-svc-sk-live" class="studio-input" placeholder="Never commit" autocomplete="off" />
                                </label>
                            </details>
                            <p class="studio-field--full">Resolved publishable key: <code id="studio-svc-pk-resolved">—</code></p>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-ghost" id="studio-svc-help-stripe">How to set up Stripe</button>
                                <button type="button" class="studio-btn-ghost" id="studio-svc-copy-env">Copy .env snippet</button>
                            </div>
                            <h4 class="studio-subheading studio-field--full studio-services-test-heading">Test PaymentIntent (legacy / Studio)</h4>
                            <p class="studio-muted studio-field--full">Join uses <code>POST /stripe/create-subscription</code> + recurring <code>STRIPE_PRICE_ID</code>. This button creates a one-off PaymentIntent via <code>POST /stripe/create-payment-intent</code> (min 50 in smallest units). Test card <code>4242424242424242</code>.</p>
                            <label class="studio-field">
                                <span>Amount</span>
                                <input type="number" id="studio-svc-pi-amount" class="studio-input" min="0.5" step="0.01" value="1.00" />
                            </label>
                            <label class="studio-field">
                                <span>Currency</span>
                                <select id="studio-svc-pi-currency" class="studio-input">
                                    <option value="usd" selected>usd</option>
                                    <option value="eur">eur</option>
                                    <option value="gbp">gbp</option>
                                    <option value="jpy">jpy</option>
                                </select>
                            </label>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-primary" id="studio-svc-pi-create">Create test PaymentIntent</button>
                                <button type="button" class="studio-btn-ghost" id="studio-svc-pi-copy" disabled>Copy client secret</button>
                            </div>
                            <label class="studio-field studio-field--full">
                                <span>Client secret</span>
                                <textarea id="studio-svc-pi-secret" class="studio-input studio-textarea-mono" rows="3" readonly placeholder="Create a PaymentIntent to see the secret"></textarea>
                            </label>
                        </div>
                    </div>
                    <div id="studio-svc-panel-resend" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-svc-tab-resend" hidden>
                        <div class="studio-form-grid studio-services-grid studio-services-grid--panel">
                            <h3 class="studio-subheading studio-field--full">Resend</h3>
                            <p class="studio-muted studio-field--full">The Resend API key stays on the integration server (<code>RESEND_API_KEY</code>). Use this to send a test email through your API.</p>
                            <label class="studio-field studio-field--full">
                                <span>Test recipient email</span>
                                <input type="email" id="studio-svc-resend-to" class="studio-input" placeholder="you@example.com" />
                            </label>
                            <label class="studio-field studio-field--full">
                                <span>From (optional)</span>
                                <input type="text" id="studio-svc-resend-from" class="studio-input" placeholder='Fusion &lt;onboarding@resend.dev&gt; — must be allowed in Resend' autocomplete="off" />
                            </label>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-ghost" id="studio-svc-help-resend">How to set up Resend</button>
                                <button type="button" class="studio-btn-primary" id="studio-svc-send-test">Send test email</button>
                            </div>
                        </div>
                    </div>
                    <div id="studio-svc-panel-s3" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-svc-tab-s3" hidden>
                        <div class="studio-form-grid studio-services-grid studio-services-grid--panel">
                            <h3 class="studio-subheading studio-field--full">Amazon S3</h3>
                            <p class="studio-muted studio-field--full">IAM credentials stay on the server. These fields are notes for your <code>.env</code> and copy snippet.</p>
                            <label class="studio-field"><span>Region</span>
                                <input type="text" id="studio-svc-s3-region" class="studio-input" placeholder="us-east-1" />
                            </label>
                            <label class="studio-field"><span>Bucket</span>
                                <input type="text" id="studio-svc-s3-bucket" class="studio-input" placeholder="my-bucket" />
                            </label>
                            <label class="studio-field studio-field--full"><span>Public base URL</span>
                                <input type="text" id="studio-svc-s3-public" class="studio-input" placeholder="https://… or CloudFront" />
                            </label>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-ghost" id="studio-svc-help-s3">How to set up S3</button>
                            </div>
                            <h4 class="studio-subheading studio-field--full studio-services-test-heading">Test upload</h4>
                            <p class="studio-muted studio-field--full">Presigns via <code>POST /storage/presign</code> then uploads with <code>PUT</code>. Bucket CORS must allow your Studio origin.</p>
                            <div class="studio-field studio-field--full studio-services-file-row">
                                <input type="file" id="studio-svc-s3-file" class="studio-input-file" />
                                <button type="button" class="studio-btn-primary" id="studio-svc-s3-upload">Upload test file</button>
                            </div>
                            <p class="studio-field--full studio-muted" id="studio-svc-s3-status" style="display:none"></p>
                            <label class="studio-field studio-field--full">
                                <span>Public URL</span>
                                <input type="text" id="studio-svc-s3-result-url" class="studio-input" readonly placeholder="—" />
                            </label>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-ghost" id="studio-svc-s3-copy-url" disabled>Copy URL</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderSettings() {
    return `
        <div class="studio-section-stack">
            <dl class="studio-dl">
                <dt>Data source (<code>database.js</code>)</dt>
                <dd id="studio-set-datasource">—</dd>
                <dt>Network (<code>config.devMode</code>)</dt>
                <dd id="studio-set-network">—</dd>
            </dl>
            <div class="studio-field-row">
                <label class="studio-field studio-field--inline">
                    <input type="radio" name="studio-datasource" value="test" id="studio-ds-test" />
                    Use test data (localStorage overlays)
                </label>
                <label class="studio-field studio-field--inline">
                    <input type="radio" name="studio-datasource" value="live" id="studio-ds-live" />
                    Live canister
                </label>
            </div>
            <p class="studio-muted">Same as the loadscreen Debug control. Internet Identity has no site password — recovery uses II docs.</p>
        </div>
    `;
}

/**
 * @param {'galleries' | 'collectors' | 'curators'} kind
 */
function renderAudience(kind) {
    const titles = { galleries: 'Gallery', collectors: 'Collector', curators: 'Curator' };
    const t = titles[kind] || kind;
    return `
        <div class="studio-section-stack">
            <p class="studio-muted">Subscribers with <strong>${escapeHtml(t)}</strong> in category (test or live), plus user accounts with role <code>#${escapeHtml(kind.replace(/s$/, ''))}</code> when live.</p>
            <h3 class="studio-subheading">Subscribers</h3>
            <div class="studio-table-wrap">
                <table class="studio-table">
                    <thead><tr><th>Email</th><th>Category</th><th>Name</th><th>Intent</th></tr></thead>
                    <tbody id="studio-audience-subs-${kind}"><tr><td colspan="4">Loading…</td></tr></tbody>
                </table>
            </div>
            <h3 class="studio-subheading">Accounts</h3>
            <div class="studio-table-wrap">
                <table class="studio-table">
                    <thead><tr><th>Principal</th><th>Role</th><th>Status</th></tr></thead>
                    <tbody id="studio-audience-acc-${kind}"><tr><td colspan="3">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderFallback(sectionId) {
    return `
        <div class="studio-coming-soon">
            <strong>${escapeHtml(TITLE_MAP[sectionId] || sectionId)}</strong>
            Unknown section.
        </div>
    `;
}

function pipelineCard(title) {
    return `
        <div class="studio-pipeline-card">
            <h3>${escapeHtml(title)}</h3>
            <div class="studio-sparkline" aria-hidden="true"></div>
        </div>
    `;
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * @param {Record<string, unknown>} p — program row (test: card fields on root; live: may include `enCard`)
 */
function programCardScalars(p) {
    const c = /** @type {Record<string, unknown>} */ (p.enCard || p);
    return {
        focus: String(p.focus ?? c.focus ?? ''),
        location: String(c.location ?? ''),
        year: String(c.year ?? ''),
        accepting: c.acceptingApplications === true,
    };
}

/**
 * @param {string} status
 */
function applicantStatusPillHtml(status) {
    const s = String(status || '');
    let cls = 'studio-status-pill--neutral';
    if (s === 'pending') cls = 'studio-status-pill--pending';
    else if (s === 'reviewing') cls = 'studio-status-pill--reviewing';
    else if (s === 'needsInfo') cls = 'studio-status-pill--needs';
    else if (s === 'accepted') cls = 'studio-status-pill--accepted';
    else if (s === 'rejected') cls = 'studio-status-pill--rejected';
    return `<span class="studio-status-pill ${cls}">${escapeHtml(s)}</span>`;
}

/** @type {Record<string, (mainEl: HTMLElement) => Promise<void>>} */
const STUDIO_INIT = {
    [STUDIO_DASHBOARD_ID]: initDashboard,
    subscribers: initSubscribers,
    applicants: initApplicants,
    artists: initArtists,
    programs: initPrograms,
    products: initProducts,
    'gallery-access': initGalleryAccess,
    journal: initJournal,
    content: initContent,
    email: initEmail,
    ai: initAi,
    galleries: (el) => initAudience(el, 'galleries'),
    collectors: (el) => initAudience(el, 'collectors'),
    curators: (el) => initAudience(el, 'curators'),
    users: initUsers,
    services: initServices,
    settings: initSettings,
};

/**
 * @param {string} sectionId
 * @param {HTMLElement} mainEl
 */
export async function initStudioMain(sectionId, mainEl) {
    const fn = STUDIO_INIT[sectionId];
    if (fn) await fn(mainEl);
}

async function initDashboard(mainEl) {
    const statsEl = mainEl.querySelector('#studio-dashboard-stats');
    const banner = mainEl.querySelector('#studio-dashboard-banner');
    try {
        const m = await getDashboardMetrics();
        if (banner) {
            banner.className = `studio-banner studio-banner--${m.dataSource === 'test' ? 'info' : 'ok'}`;
            banner.textContent =
                m.dataSource === 'test'
                    ? 'Data source: Test JSON — subscribers/applicants can use localStorage overlays from Studio. Switch Debug or Settings to Live for canister data.'
                    : 'Data source: Live canister — subscriber count requires admin.';
        }
        if (statsEl) {
            statsEl.innerHTML = [
                statCard(String(m.subscriberCount), 'Subscribers', '', 'Waitlist / CRM'),
                statCard(String(m.artistCount), 'Artists', '', 'Roster'),
                statCard(String(m.programCount), 'Programs', '', 'Residencies'),
                statCard(String(m.journalCount), 'Journal entries', '', 'Published'),
                statCard(String(m.editionCount), 'Editions', '', 'Products'),
                statCard(String(m.applicantCount), 'Applicants', '', 'Pipeline'),
            ].join('');
        }
        mainEl.querySelectorAll('.studio-quick-link').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const id = a.getAttribute('data-studio-hash');
                if (id) window.location.hash = `#${id}`;
            });
        });
    } catch (e) {
        if (banner) banner.textContent = e instanceof Error ? e.message : String(e);
    }
}

function statCard(value, label, delta, caption) {
    return `
        <div class="studio-stat-card">
            <div class="studio-stat-value">${escapeHtml(value)}</div>
            <div class="studio-stat-label">${escapeHtml(label)}</div>
            ${delta ? `<div class="studio-stat-delta">${escapeHtml(delta)}</div>` : ''}
            <div class="studio-stat-caption">${escapeHtml(caption)}</div>
        </div>
    `;
}

async function initSubscribers(mainEl) {
    const tbody = mainEl.querySelector('#studio-subscribers-tbody');
    const banner = mainEl.querySelector('#studio-subscribers-banner');
    const csvMsg = mainEl.querySelector('#studio-subscribers-csv-msg');
    const bootstrapBtn = mainEl.querySelector('#studio-bootstrap-admin');
    const refreshBtn = mainEl.querySelector('#studio-subscribers-refresh');
    const addBtn = mainEl.querySelector('#studio-subscriber-add');
    const csvInput = mainEl.querySelector('#studio-subscriber-csv');
    const searchInput = mainEl.querySelector('#studio-subscribers-search');
    const countEl = mainEl.querySelector('#studio-subscribers-header-count');

    /** @type {object[]} */
    let allSubscriberRows = [];

    const showBanner = (kind, text) => {
        if (!banner) return;
        banner.style.display = text ? 'block' : 'none';
        banner.className = `studio-banner studio-banner--${kind}`;
        banner.textContent = text;
    };

    const showCsv = (kind, text) => {
        if (!csvMsg) return;
        csvMsg.style.display = text ? 'block' : 'none';
        csvMsg.className = `studio-banner studio-banner--${kind}`;
        csvMsg.textContent = text;
    };

    const wireDelete = () => {
        tbody?.querySelectorAll('.studio-sub-delete').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const email = btn.getAttribute('data-email');
                if (!email || !confirm(`Delete subscriber ${email}?`)) return;
                try {
                    await deleteSubscriberRow(email);
                    await loadRows();
                    showBanner('ok', 'Deleted.');
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    showBanner('error', `Delete failed: ${msg}`);
                    if (DEV_MODE) console.error(e);
                }
            });
        });
    };

    const applySubscriberFilter = () => {
        if (!tbody) return;
        const q = (searchInput instanceof HTMLInputElement ? searchInput.value : '').trim().toLowerCase();
        const rows = allSubscriberRows.filter((row) => {
            if (!q) return true;
            const hay = `${row.email} ${row.category} ${row.fullName ?? ''} ${row.intent ?? ''}`.toLowerCase();
            return hay.includes(q);
        });
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="6">${allSubscriberRows.length ? 'No rows match search.' : 'No subscribers yet.'}</td></tr>`;
        } else {
            tbody.innerHTML = rows
                .map(
                    (row) => `
                <tr data-email="${escapeHtml(row.email)}">
                    <td>${escapeHtml(row.email)}</td>
                    <td>${escapeHtml(row.category)}</td>
                    <td>${escapeHtml(row.fullName ?? '')}</td>
                    <td>${escapeHtml(row.intent ?? '')}</td>
                    <td>${escapeHtml(row.timestamp)}</td>
                    <td class="studio-td-actions"><button type="button" class="studio-btn-ghost studio-sub-delete" data-email="${escapeHtml(row.email)}">DELETE</button></td>
                </tr>
            `
                )
                .join('');
            wireDelete();
        }
        if (countEl) {
            countEl.textContent = q ? String(rows.length) : String(allSubscriberRows.length);
        }
    };

    const loadRows = async () => {
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
        showBanner('info', '');
        showCsv('info', '');
        try {
            let rows;
            try {
                rows = await loadSubscribersFromDataSource();
            } catch (genErr) {
                tbody.innerHTML =
                    '<tr><td colspan="6">Bindings out of date — run <code>dfx generate fusion-app-backend</code> after pulling backend changes.</td></tr>';
                if (DEV_MODE) console.error(genErr);
                return;
            }
            if (getDataSource() === 'test') {
                showBanner(
                    'info',
                    'Test mode: subscribers stored in localStorage (<code>fusion-studio-subscribers</code>). Use Live + admin for canister.'
                );
            } else {
                showBanner('info', 'Live canister — listing is admin-only.');
            }
            allSubscriberRows = Array.isArray(rows) ? rows : [];
            applySubscriberFilter();
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            tbody.innerHTML = `<tr><td colspan="6">Could not load subscribers. ${escapeHtml(msg)}</td></tr>`;
            allSubscriberRows = [];
            if (countEl) countEl.textContent = '0';
            showBanner(
                'error',
                'Listing may be admin-only. Use “Claim first admin” on a fresh canister, or sign in with an admin principal after Internet Identity is wired.'
            );
            if (DEV_MODE) console.error(e);
        }
    };

    addBtn?.addEventListener('click', () => {
        const body = `
            <form id="studio-sub-form" class="studio-modal-form">
                <label class="studio-field"><span>Email</span><input required type="email" name="email" class="studio-input" /></label>
                <label class="studio-field"><span>Category</span><input type="text" name="category" class="studio-input" /></label>
                <label class="studio-field"><span>Full name</span><input type="text" name="fullName" class="studio-input" /></label>
                <label class="studio-field"><span>Intent</span><input type="text" name="intent" class="studio-input" placeholder="membership | access | apply" /></label>
                <button type="submit" class="studio-btn-primary">Save</button>
            </form>`;
        const { close, root } = openStudioModal(body, { title: 'Add subscriber', wide: true });
        root.querySelector('#studio-sub-form')?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.target);
            try {
                await upsertSubscriberRow({
                    email: String(fd.get('email') || ''),
                    category: String(fd.get('category') || ''),
                    fullName: String(fd.get('fullName') || ''),
                    intent: String(fd.get('intent') || ''),
                });
                close();
                await loadRows();
                showBanner('ok', 'Subscriber saved.');
            } catch (err) {
                alert(err instanceof Error ? err.message : String(err));
            }
        });
    });

    csvInput?.addEventListener('change', async (ev) => {
        const file = ev.target?.files?.[0];
        if (!file) return;
        const text = await file.text();
        const parsed = parseSubscriberCsv(text);
        if (!parsed.length) {
            showCsv('error', 'No valid rows (need an email column).');
            return;
        }
        try {
            const n = await bulkUpsertSubscribersStudio(parsed);
            showCsv('ok', `Imported ${n} row(s).`);
            await loadRows();
        } catch (e) {
            showCsv('error', e instanceof Error ? e.message : String(e));
        }
        ev.target.value = '';
    });

    bootstrapBtn?.addEventListener('click', async () => {
        showBanner('info', '');
        try {
            const actor = await getFusionBackendActor();
            if (typeof actor.bootstrapAdminIfEmpty !== 'function') {
                showBanner('error', 'bootstrapAdminIfEmpty missing from declarations — run dfx generate.');
                return;
            }
            const did = await actor.bootstrapAdminIfEmpty();
            showBanner(
                did ? 'ok' : 'info',
                did ? 'You are now the first admin for this canister.' : 'Admin list was already set; no change.'
            );
            await loadRows();
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showBanner('error', msg);
            if (DEV_MODE) console.error(e);
        }
    });

    refreshBtn?.addEventListener('click', () => loadRows());

    searchInput?.addEventListener('input', () => applySubscriberFilter());

    await loadRows();
}

const APPLICANTS_PAGE_SIZE = 10;

async function initApplicants(mainEl) {
    const tbody = mainEl.querySelector('#studio-applicants-tbody');
    const banner = mainEl.querySelector('#studio-applicants-banner');
    const pagination = mainEl.querySelector('#studio-applicants-pagination');
    const pageLabel = mainEl.querySelector('#studio-app-page-label');
    const prevBtn = mainEl.querySelector('#studio-app-page-prev');
    const nextBtn = mainEl.querySelector('#studio-app-page-next');
    const numbersEl = mainEl.querySelector('#studio-app-page-numbers');
    const countHeader = mainEl.querySelector('#studio-applicants-header-count');
    const searchInput = mainEl.querySelector('#studio-applicants-search');

    /** @type {object[]} */
    let allRows = [];
    let page = 0;
    /** @type {'all' | 'pending' | 'reviewing' | 'needsInfo' | 'accepted' | 'rejected'} */
    let statusTab = 'all';

    if (banner) {
        banner.textContent =
            getDataSource() === 'test'
                ? 'Test mode uses saved applicants on this browser. Open a row to change status or notes.'
                : 'Live canister — listApplicants (staff/admin). Open a row to edit.';
    }

    const syncStatusTabs = () => {
        mainEl.querySelectorAll('.studio-data-tabs__tab').forEach((btn) => {
            const v = btn.getAttribute('data-tab-value') || '';
            btn.classList.toggle('is-active', v === statusTab);
        });
    };

    const filteredRows = () => {
        let rows = allRows;
        if (statusTab !== 'all') {
            rows = rows.filter((r) => String(r.status) === statusTab);
        }
        const q = (searchInput instanceof HTMLInputElement ? searchInput.value : '').trim().toLowerCase();
        if (q) {
            rows = rows.filter((r) => {
                const hay = `${r.email} ${r.fullName || ''} ${r.programId || ''} ${r.status}`.toLowerCase();
                return hay.includes(q);
            });
        }
        return rows;
    };

    const paintPageNumbers = (pages) => {
        if (!numbersEl) return;
        numbersEl.innerHTML = '';
        const total = filteredRows().length;
        if (total <= APPLICANTS_PAGE_SIZE) return;
        const maxBtns = 7;
        let startIdx = Math.max(0, page - 3);
        let endIdx = Math.min(pages, startIdx + maxBtns);
        if (endIdx - startIdx < maxBtns) startIdx = Math.max(0, endIdx - maxBtns);
        for (let i = startIdx; i < endIdx; i++) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = `studio-pagination__num${i === page ? ' is-active' : ''}`;
            b.textContent = String(i + 1);
            b.addEventListener('click', () => {
                page = i;
                renderPage();
            });
            numbersEl.appendChild(b);
        }
    };

    const renderPage = () => {
        if (!tbody) return;
        const rows = filteredRows();
        const total = rows.length;
        if (countHeader) countHeader.textContent = String(total);
        const pages = Math.max(1, Math.ceil(total / APPLICANTS_PAGE_SIZE) || 1);
        if (page >= pages) page = Math.max(0, pages - 1);
        const start = page * APPLICANTS_PAGE_SIZE;
        const slice = rows.slice(start, start + APPLICANTS_PAGE_SIZE);
        if (!slice.length) {
            tbody.innerHTML = `<tr><td colspan="5">${allRows.length ? 'No applicants match filters.' : 'No applicants.'}</td></tr>`;
        } else {
            tbody.innerHTML = slice
                .map(
                    (r) => `
        <tr class="studio-app-row" data-id="${escapeHtml(r.id)}" tabindex="0" role="button">
            <td>${escapeHtml(r.email)}</td>
            <td>${escapeHtml(r.fullName || '')}</td>
            <td>${escapeHtml(r.programId)}</td>
            <td>${applicantStatusPillHtml(r.status)}</td>
            <td>${escapeHtml(r.createdAt)}</td>
        </tr>`
                )
                .join('');
            tbody.querySelectorAll('.studio-app-row').forEach((tr) => {
                const open = () => openApplicantModal(tr.getAttribute('data-id'));
                tr.addEventListener('click', open);
                tr.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') open();
                });
            });
        }
        syncStatusTabs();
        paintPageNumbers(pages);
        if (pagination && pageLabel) {
            if (total > APPLICANTS_PAGE_SIZE) {
                pagination.style.display = 'flex';
                pageLabel.textContent = `Page ${page + 1} / ${pages}`;
                if (prevBtn) prevBtn.disabled = page <= 0;
                if (nextBtn) nextBtn.disabled = page >= pages - 1;
            } else {
                pagination.style.display = 'none';
            }
        }
    };

    const openApplicantModal = (id) => {
        const r = allRows.find((x) => x.id === id);
        if (!r) return;
        const notesPlain = applicantPayloadToPlainNotes(r.payloadJson);
        const body = `
          <div class="studio-modal-form">
            <p class="studio-muted">Reference: <code class="studio-code-inline">${escapeHtml(shortRefLabel(r.id))}</code></p>
            <p><strong>${escapeHtml(r.email)}</strong>${r.fullName ? ` — ${escapeHtml(r.fullName)}` : ''}</p>
            <label class="studio-field"><span>Status</span>
              <select id="studio-app-modal-status" class="studio-select">
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="needsInfo">Needs info</option>
                <option value="accepted">Approved</option>
                <option value="rejected">Denied</option>
              </select>
            </label>
            <label class="studio-field studio-field--full"><span>Notes</span>
              <textarea id="studio-app-modal-payload" class="studio-textarea" rows="14" placeholder="Internal notes (plain text). Structured data is preserved when you only add notes."></textarea>
            </label>
            <button type="button" class="studio-btn-primary" id="studio-app-modal-save">Save</button>
          </div>`;
        const { close, root } = openStudioModal(body, {
            title: `Applicant — ${escapeHtml(r.email)}`,
            wide: true,
        });
        const sel = root.querySelector('#studio-app-modal-status');
        if (sel) sel.value = r.status;
        const ta = root.querySelector('#studio-app-modal-payload');
        if (ta) ta.value = notesPlain;
        root.querySelector('#studio-app-modal-save')?.addEventListener('click', async () => {
            const status = sel?.value || 'pending';
            const rawNotes = root.querySelector('#studio-app-modal-payload')?.value ?? '';
            const payloadJson = plainNotesToApplicantPayload(rawNotes, r.payloadJson);
            try {
                await upsertApplicantStudio({ ...r, status, payloadJson });
                close();
                allRows = await getApplicants();
                renderPage();
            } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
            }
        });
    };

    const reload = async () => {
        allRows = await getApplicants();
        renderPage();
    };

    prevBtn?.addEventListener('click', () => {
        page = Math.max(0, page - 1);
        renderPage();
    });
    nextBtn?.addEventListener('click', () => {
        page += 1;
        renderPage();
    });

    mainEl.querySelectorAll('.studio-data-tabs__tab').forEach((btn) => {
        btn.addEventListener('click', () => {
            const v = btn.getAttribute('data-tab-value');
            if (!v) return;
            statusTab = /** @type {typeof statusTab} */ (v);
            page = 0;
            renderPage();
        });
    });
    searchInput?.addEventListener('input', () => {
        page = 0;
        renderPage();
    });

    mainEl.querySelector('#studio-app-new-save')?.addEventListener('click', async () => {
        const id = mainEl.querySelector('#studio-app-new-id')?.value?.trim();
        if (!id) {
            alert('ID required');
            return;
        }
        const notesRaw = mainEl.querySelector('#studio-app-new-payload')?.value ?? '';
        const payloadJson = plainNotesToApplicantPayload(notesRaw, '{}');
        try {
            await upsertApplicantStudio({
                id,
                programId: mainEl.querySelector('#studio-app-new-program')?.value || '',
                email: mainEl.querySelector('#studio-app-new-email')?.value || '',
                fullName: mainEl.querySelector('#studio-app-new-name')?.value || '',
                status: mainEl.querySelector('#studio-app-new-status')?.value || 'pending',
                createdAt: new Date().toISOString(),
                payloadJson,
            });
            page = 0;
            await reload();
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
        }
    });

    await reload();
}

/**
 * @param {'galleries' | 'collectors' | 'curators'} kind
 */
async function initAudience(mainEl, kind) {
    const subsBody = mainEl.querySelector(`#studio-audience-subs-${kind}`);
    const accBody = mainEl.querySelector(`#studio-audience-acc-${kind}`);
    const re =
        kind === 'galleries' ? /gallery/i : kind === 'collectors' ? /collector/i : /curator/i;
    const roleWant = kind === 'galleries' ? 'gallery' : kind === 'collectors' ? 'collector' : 'curator';

    let subs = [];
    try {
        subs = await loadSubscribersFromDataSource();
    } catch {
        subs = [];
    }
    const filt = (Array.isArray(subs) ? subs : []).filter((r) => re.test(String(r.category || '')));

    if (subsBody) {
        subsBody.innerHTML = filt.length
            ? filt
                  .map(
                      (r) =>
                          `<tr><td>${escapeHtml(r.email)}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(r.fullName ?? '')}</td><td>${escapeHtml(r.intent ?? '')}</td></tr>`
                  )
                  .join('')
            : '<tr><td colspan="4">No matching subscribers.</td></tr>';
    }

    let accounts = [];
    try {
        accounts = await getAccountsForStudio();
    } catch {
        accounts = [];
    }
    const af = accounts.filter((a) => a.role === roleWant);
    if (accBody) {
        accBody.innerHTML = af.length
            ? af
                  .map(
                      (a) =>
                          `<tr><td><code>${escapeHtml(a.principal)}</code></td><td>${escapeHtml(a.role)}</td><td>${escapeHtml(a.status)}</td></tr>`
                  )
                  .join('')
            : '<tr><td colspan="3">No accounts with this role (admin + live only).</td></tr>';
    }
}

async function initArtists(mainEl) {
    const tbody = mainEl.querySelector('#studio-artists-tbody');
    const banner = mainEl.querySelector('#studio-artists-banner');
    const searchInput = mainEl.querySelector('#studio-artists-search');
    const countEl = mainEl.querySelector('#studio-artists-header-count');

    /** @type {object[]} */
    let allArtists = [];
    /** @type {'all' | 'featurable' | 'featured'} */
    let quickFilter = 'all';

    const wireArtistTableRowActions = () => {
        if (!tbody) return;
        tbody.querySelectorAll('.studio-art-manage').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const row = allArtists.find((x) => String(x.id) === String(id));
                if (row) openArtistManageModal(row);
            });
        });
        tbody.querySelectorAll('.studio-art-featured-cb').forEach((cb) => {
            cb.addEventListener('change', async () => {
                if (!(cb instanceof HTMLInputElement)) return;
                const id = cb.getAttribute('data-id');
                if (!id) return;
                const r = setManualFeaturedForArtist(id, cb.checked);
                if (!r.ok) {
                    cb.checked = !cb.checked;
                    if (banner) {
                        banner.className = 'studio-banner studio-banner--error';
                        banner.textContent = r.reason || 'Could not update featured';
                    }
                    return;
                }
                await load();
            });
        });
        tbody.querySelectorAll('.studio-art-featurable-cb').forEach((cb) => {
            cb.addEventListener('change', async () => {
                if (!(cb instanceof HTMLInputElement)) return;
                const id = cb.getAttribute('data-id');
                if (!id) return;
                setFeaturableForArtist(id, cb.checked);
                await load();
            });
        });
    };

    const applyArtistFilter = () => {
        if (!tbody) return;
        const q = (searchInput instanceof HTMLInputElement ? searchInput.value : '').trim().toLowerCase();
        const artists = allArtists.filter((a) => {
            if (quickFilter === 'featurable' && !a.featurable) return false;
            if (quickFilter === 'featured' && !a.featured) return false;
            if (!q) return true;
            const hay = `${a.slug} ${a.id} ${a.visibility} ${a.featuredOrder}`.toLowerCase();
            return hay.includes(q);
        });
        if (countEl) countEl.textContent = String(q || quickFilter !== 'all' ? artists.length : allArtists.length);
        if (!artists.length) {
            tbody.innerHTML = `<tr><td colspan="9">${allArtists.length ? 'No rows match filters.' : 'No artists.'}</td></tr>`;
            return;
        }
        tbody.innerHTML = artists
            .map((a) => {
                const slugRaw = String(a.slug || '');
                const slug = escapeHtml(slugRaw);
                const imp = a.imported ? 'Yes' : '—';
                const code = a.accessCode ? escapeHtml(String(a.accessCode)) : '—';
                const idEsc = escapeHtml(String(a.id || ''));
                const feat = a.featured === true ? 'checked' : '';
                const featur = a.featurable === true ? 'checked' : '';
                return `<tr>
                <td>${slug}</td>
                <td>${idEsc}</td>
                <td>${imp}</td>
                <td><code class="studio-code-inline">${code}</code></td>
                <td>${escapeHtml(a.visibility || '')}</td>
                <td class="studio-td-cb"><input type="checkbox" class="studio-art-featured-cb" data-id="${idEsc}" ${feat} aria-label="Featured" /></td>
                <td class="studio-td-cb"><input type="checkbox" class="studio-art-featurable-cb" data-id="${idEsc}" ${featur} aria-label="Featurable for random" /></td>
                <td><a class="studio-action-link" href="/profile/${encodeURIComponent(slugRaw)}" target="_blank" rel="noopener">Open profile</a></td>
                <td class="studio-td-actions"><button type="button" class="studio-btn-ghost studio-art-manage" data-id="${idEsc}">MANAGE</button></td>
            </tr>`;
            })
            .join('');
        wireArtistTableRowActions();
    };

    const openArtistManageModal = (tableRow) => {
        const slug = String(tableRow.slug || '');
        const title = `Artist — ${String(slug || tableRow.id || '')}`;
        const { close, root } = openStudioModal(
            `<div class="studio-modal-form" id="studio-art-load-placeholder"><p class="studio-muted">Loading…</p></div>`,
            { title, wide: true }
        );
        const bodyEl = root.querySelector('.studio-modal-body');
        (async () => {
            /** @type {object | null} */
            let full = null;
            try {
                full = await loadArtistForStudioEdit(slug, tableRow);
            } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
                close();
                return;
            }
            if (!full || !bodyEl) {
                alert('Could not load artist.');
                close();
                return;
            }
            const profileLink = `/profile/${encodeURIComponent(String(full.slug || ''))}`;
            bodyEl.innerHTML = `
              <p><a class="studio-action-link" href="${escapeHtml(profileLink)}" target="_blank" rel="noopener">Open public profile</a></p>
              ${renderArtistManageModalHtml(escapeHtml, full, { isTest: getDataSource() === 'test' })}
            `;
            initArtistManageTabs(root);

            root.querySelector('#studio-art-translate-to-new-world')?.addEventListener('click', async () => {
                const promptEl = root.querySelector('#studio-art-new-world-prompt');
                const promptText = promptEl instanceof HTMLTextAreaElement ? promptEl.value.trim() : '';
                if (!promptText) {
                    alert('Add a prompt first.');
                    return;
                }
                const btn = root.querySelector('#studio-art-translate-to-new-world');
                if (btn instanceof HTMLButtonElement) btn.disabled = true;
                try {
                    for (const { path } of STUDIO_WORLD_TO_NEW_PATHS) {
                        const targetPath = path.replace(/^world\./, 'worldNew.');
                        for (const loc of ['en', 'ja']) {
                            const srcEl = root.querySelector(
                                `[data-art-locale="${loc}"][data-art-path="${path}"]`
                            );
                            const raw =
                                srcEl && 'value' in srcEl ? String(/** @type {HTMLInputElement} */ (srcEl).value ?? '').trim() : '';
                            if (!raw) continue;
                            const out = await studioReinterpretWithPrompt(promptText, raw, loc);
                            const dest = root.querySelector(
                                `[data-art-locale="${loc}"][data-art-path="${targetPath}"]`
                            );
                            if (dest instanceof HTMLTextAreaElement) {
                                dest.value = out.trim();
                            }
                        }
                    }
                    alert('New World fields updated. Open the New World tab to review, then save the artist.');
                } catch (e) {
                    alert(e instanceof Error ? e.message : String(e));
                } finally {
                    if (btn instanceof HTMLButtonElement) btn.disabled = false;
                }
            });

            const heroFile = root.querySelector('#studio-art-hero-file');
            if (heroFile instanceof HTMLInputElement) {
                heroFile.addEventListener('change', async (ev) => {
                    const t = ev.target;
                    const f = t instanceof HTMLInputElement ? t.files?.[0] : null;
                    if (!f) return;
                    const targetInput = root.querySelector('#studio-art-hero-image');
                    try {
                        await uploadBlobToS3(f, targetInput instanceof HTMLInputElement ? targetInput : null, {
                            area: 'studio/artists',
                        });
                    } catch (err) {
                        alert(
                            `${err instanceof Error ? err.message : String(err)}\n\nConfigure S3 presign under Studio → Services.`
                        );
                    }
                    t.value = '';
                });
            }

            root.querySelectorAll('input.studio-art-intro-file').forEach((fileEl) => {
                fileEl.addEventListener('change', async (ev) => {
                    const t = ev.target;
                    const f = t instanceof HTMLInputElement ? t.files?.[0] : null;
                    if (!f || !(t instanceof HTMLInputElement)) return;
                    const loc = t.getAttribute('data-art-upload-locale') || 'en';
                    const slot = t.getAttribute('data-art-upload-slot') || '0';
                    const path = `world.introGallery.${slot}.src`;
                    const targetInput = root.querySelector(
                        `input[data-art-locale="${loc}"][data-art-path="${path}"]`
                    );
                    try {
                        await uploadBlobToS3(f, targetInput instanceof HTMLInputElement ? targetInput : null, {
                            area: 'studio/artists',
                        });
                    } catch (err) {
                        alert(
                            `${err instanceof Error ? err.message : String(err)}\n\nConfigure S3 presign under Studio → Services.`
                        );
                    }
                    t.value = '';
                });
            });

            root.querySelector('#studio-art-manage-form')?.addEventListener('submit', async (ev) => {
                ev.preventDefault();
                try {
                    const raw = collectArtistRecordFromForm(root, full);
                    const flags = raw._featuredFlags;
                    delete raw._featuredFlags;
                    try {
                        raw.featuredOrder = applyFeaturedFlagsFromStudioSave(String(full.id), {
                            featured: Boolean(flags?.featured),
                            featurable: Boolean(flags?.featurable),
                        });
                    } catch (err) {
                        alert(err instanceof Error ? err.message : String(err));
                        return;
                    }
                    const pool = collectAccessCodesFromArtists(await getArtistsForStudio());
                    const rec = normalizeArtistImportRow(raw, pool, { forceImported: false });
                    await bulkUpsertArtistsStudio([rec]);
                    close();
                    await load();
                } catch (e) {
                    alert(e instanceof Error ? e.message : String(e));
                }
            });

            root.querySelector('#studio-art-adv-save')?.addEventListener('click', () => {
                const raw = root.querySelector('#studio-art-adv-json')?.value ?? '';
                try {
                    saveArtistTestOverlayJson(String(full.id), raw);
                    close();
                    load();
                } catch (e) {
                    alert(e instanceof Error ? e.message : String(e));
                }
            });
        })();
    };

    const load = async () => {
        if (banner) {
            banner.textContent = `Data source: ${getDataSource()} — ${getDataSource() === 'test' ? 'testData + Studio overlay (localStorage)' : 'canister listArtists'}`;
        }
        allArtists = await getArtistsForStudio();
        const rnd = mainEl.querySelector('#studio-artists-random-featured');
        if (rnd instanceof HTMLInputElement) {
            rnd.checked = readArtistFeaturedMeta().randomFeatured;
        }
        applyArtistFilter();
    };

    mainEl.querySelector('#studio-artists-batch-json')?.addEventListener('change', async (ev) => {
        const input = ev.target;
        const f = input instanceof HTMLInputElement ? input.files?.[0] : null;
        if (input instanceof HTMLInputElement) input.value = '';
        if (!f || !banner) return;
        banner.className = 'studio-banner studio-banner--info';
        banner.textContent = 'Importing…';
        try {
            const text = await f.text();
            const data = JSON.parse(text);
            const n = await batchImportArtistsFromJson(data);
            banner.className = 'studio-banner studio-banner--ok';
            banner.textContent = `Imported ${n} artist record(s). Access codes were assigned where missing.`;
            await load();
        } catch (e) {
            banner.className = 'studio-banner studio-banner--error';
            banner.textContent = e instanceof Error ? e.message : String(e);
        }
    });

    const runLegacySync = async (label, fn) => {
        if (!banner) return;
        banner.className = 'studio-banner studio-banner--info';
        banner.textContent = `${label}…`;
        try {
            const n = await fn();
            banner.className = 'studio-banner studio-banner--ok';
            banner.textContent =
                n > 0
                    ? `${label}: updated ${n} artist(s). Upload matching files to S3 under uploads/legacyProfiles/ if needed.`
                    : `${label}: no artists needed updates (already have URLs or gallery).`;
            await load();
        } catch (e) {
            banner.className = 'studio-banner studio-banner--error';
            banner.textContent = e instanceof Error ? e.message : String(e);
        }
    };

    const openLegacySyncConfirm = (kind) => {
        const isHero = kind === 'hero';
        const title = isHero ? 'Sync Profile Images' : 'Sync Gallery';
        const intro = isHero
            ? 'This updates artists whose profile hero image is still empty. Matching files should exist on S3 (or URLs will 404 until uploaded).'
            : 'This fills English and Japanese intro gallery slots when all three slots have no image URL. Matching files should exist on S3 (or URLs will 404 until uploaded).';
        const urlHelp = isHero
            ? `<p class="studio-muted" style="margin:0 0 0.5rem"><strong>URL format</strong> — one file per artist:</p>
<pre class="studio-code-block" style="margin:0 0 0.75rem;white-space:pre-wrap;word-break:break-all">${escapeHtml(
                  `${LEGACY_PROFILE_BASE}<stem>-hero.jpg`,
              )}</pre>
<p class="studio-muted" style="margin:0"><strong>&lt;stem&gt;</strong> is derived from <code>locales.en.name</code> (first word + last word, hyphenated, lowercased) or from the artist <code>slug</code> if there is no name. Example: <code>hannah-webb-hero.jpg</code>.</p>`
            : `<p class="studio-muted" style="margin:0 0 0.5rem"><strong>URL format</strong> — three files per artist (slots 0–2):</p>
<pre class="studio-code-block" style="margin:0 0 0.75rem;white-space:pre-wrap;word-break:break-all">${escapeHtml(
                  `${LEGACY_PROFILE_BASE}<stem>-intro-0.jpg\n${LEGACY_PROFILE_BASE}<stem>-intro-1.jpg\n${LEGACY_PROFILE_BASE}<stem>-intro-2.jpg`,
              )}</pre>
<p class="studio-muted" style="margin:0"><strong>&lt;stem&gt;</strong> uses the same rules as profile images. Example: <code>hiyori-kanazawa-intro-0.jpg</code>.</p>`;
        const inner = `<p style="margin:0 0 0.85rem">${escapeHtml(intro)}</p>
${urlHelp}
<div class="studio-modal-actions" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #e2e8f0">
<button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
<button type="button" class="studio-btn-primary" id="studio-legacy-sync-confirm">Confirm</button>
</div>`;
        const { close, root } = openStudioModal(inner, { title: `Confirm: ${title}`, compact: true });
        root.querySelector('#studio-legacy-sync-confirm')?.addEventListener('click', () => {
            close();
            void runLegacySync(title, isHero ? syncStudioArtistsLegacyHeroImages : syncStudioArtistsLegacyIntroGalleries);
        });
    };

    mainEl.querySelector('#studio-artists-sync-hero')?.addEventListener('click', () => {
        openLegacySyncConfirm('hero');
    });
    mainEl.querySelector('#studio-artists-sync-gallery')?.addEventListener('click', () => {
        openLegacySyncConfirm('gallery');
    });

    searchInput?.addEventListener('input', () => applyArtistFilter());

    mainEl.querySelectorAll('.studio-artists-filter').forEach((btn) => {
        btn.addEventListener('click', () => {
            const f = btn.getAttribute('data-filter');
            quickFilter = f === 'featurable' || f === 'featured' ? f : 'all';
            mainEl.querySelectorAll('.studio-artists-filter').forEach((b) => {
                b.classList.toggle('is-active', b.getAttribute('data-filter') === quickFilter);
            });
            applyArtistFilter();
        });
    });

    mainEl.querySelector('#studio-artists-random-featured')?.addEventListener('change', (e) => {
        const t = e.target;
        if (t instanceof HTMLInputElement) {
            setRandomFeaturedMode(t.checked);
            if (banner) {
                banner.className = 'studio-banner studio-banner--ok';
                banner.textContent = t.checked
                    ? `Random featured: up to ${MAX_MANUAL_FEATURED} featurable artists per home load.`
                    : 'Manual featured list drives the home strip (max 8).';
            }
        }
    });

    await load();
}

async function initPrograms(mainEl) {
    const tbody = mainEl.querySelector('#studio-programs-tbody');
    const banner = mainEl.querySelector('#studio-programs-banner');
    const searchInput = mainEl.querySelector('#studio-programs-search');
    const countEl = mainEl.querySelector('#studio-programs-header-count');

    /** @type {object[]} */
    let allPrograms = [];

    const show = (kind, text) => {
        if (!banner) return;
        banner.style.display = text ? 'block' : 'none';
        banner.className = `studio-banner studio-banner--${kind}`;
        banner.textContent = text;
    };

    async function load() {
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="8">Loading…</td></tr>';
        allPrograms = await getPrograms();
        applyProgramFilter();
    }

    function applyProgramFilter() {
        if (!tbody) return;
        const q = (searchInput instanceof HTMLInputElement ? searchInput.value : '').trim().toLowerCase();
        const programs = allPrograms.filter((p) => {
            if (!q) return true;
            const sc = programCardScalars(p);
            const hay = `${p.id} ${sc.focus} ${sc.location} ${sc.year} ${p.routeLink ?? ''} ${p.studioStatus ?? ''}`.toLowerCase();
            return hay.includes(q);
        });
        if (countEl) countEl.textContent = String(q ? programs.length : allPrograms.length);
        if (!programs.length) {
            tbody.innerHTML = `<tr><td colspan="8">${allPrograms.length ? 'No rows match search.' : 'No programs. Add one or switch data source.'}</td></tr>`;
            return;
        }
        tbody.innerHTML = programs
            .map((p) => {
                const sc = programCardScalars(p);
                const st = p.studioStatus ?? '';
                const accepting = sc.accepting ? 'Yes' : '—';
                return `<tr>
                <td>${escapeHtml(String(p.id ?? ''))}</td>
                <td>${escapeHtml(String(sc.focus || '—'))}</td>
                <td>${escapeHtml(String(sc.location || '—'))}</td>
                <td>${escapeHtml(String(sc.year || '—'))}</td>
                <td>${escapeHtml(accepting)}</td>
                <td>${escapeHtml(String(p.routeLink ?? ''))}</td>
                <td>${escapeHtml(String(st || '—'))}</td>
                <td class="studio-td-actions">
                  <button type="button" class="studio-btn-ghost studio-prog-view" data-id="${escapeHtml(String(p.id))}">PREVIEW</button>
                  <button type="button" class="studio-btn-ghost studio-prog-edit" data-id="${escapeHtml(String(p.id))}">MANAGE</button>
                  <button type="button" class="studio-btn-ghost studio-prog-del" data-id="${escapeHtml(String(p.id))}">DELETE</button>
                </td>
            </tr>`;
            })
            .join('');
        tbody.querySelectorAll('.studio-prog-view').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const row = allPrograms.find((x) => String(x.id) === String(id));
                const rl = row?.routeLink || '';
                if (rl) window.open(`${window.location.origin}${rl}`, '_blank', 'noopener');
            });
        });
        tbody.querySelectorAll('.studio-prog-edit').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const row = await getProgramRecordForStudio(id || '');
                openProgramModal(row, load);
            });
        });
        tbody.querySelectorAll('.studio-prog-del').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (!id || !confirm(`Delete program ${id}?`)) return;
                try {
                    await deleteProgramStudio(id);
                    show('ok', 'Deleted.');
                    await load();
                } catch (e) {
                    show('error', e instanceof Error ? e.message : String(e));
                }
            });
        });
    };

    const openProgramModal = (existing, onSave) => {
        const p = existing || {
            id: '',
            routeLink: '',
            featuredOrder: 0,
            visibility: 'public',
            studioStatus: 'open',
            localesJson: '{"en":{},"ja":{}}',
        };
        let lj = p.localesJson;
        if (!lj && (p.enCard || p.jaCard)) {
            lj = JSON.stringify({ en: p.enCard || {}, ja: p.jaCard || {} }, null, 2);
        }
        if (!lj) {
            const { _source, enCard, jaCard, ...rest } = p;
            lj = JSON.stringify({ en: enCard || rest, ja: jaCard || {} }, null, 2);
        }
        if (!lj) lj = '{}';
        /** @type {Record<string, unknown>} */
        let enObj = {};
        /** @type {Record<string, unknown>} */
        let jaObj = {};
        try {
            const o = typeof lj === 'string' ? JSON.parse(lj) : lj;
            if (o?.en && typeof o.en === 'object' && !Array.isArray(o.en)) {
                enObj = /** @type {Record<string, unknown>} */ (o.en);
            }
            if (o?.ja && typeof o.ja === 'object' && !Array.isArray(o.ja)) {
                jaObj = /** @type {Record<string, unknown>} */ (o.ja);
            }
        } catch {
            /* keep blank */
        }
        const routeLinkKind = getFieldKind('program-hero', 'routeLink');
        const cardImgKind = getFieldKind('all-programs', 'programs.en.0.imageSrc');
        const localeFormHtml = renderProgramLocaleFormHtml(escapeHtml, enObj, jaObj);
        const body = `
          <form id="studio-prog-form" class="studio-modal-form studio-modal-form--program">
            <div class="studio-modal-fields-row">
            <label class="studio-field"><span>ID</span><input name="id" required class="studio-input" value="${escapeHtml(String(p.id))}" ${existing ? 'readonly' : ''} /></label>
            <label class="studio-field"><span>routeLink (record) <span class="studio-field-kind-badge studio-field-kind-badge--${routeLinkKind}">${escapeHtml(getFieldKindBadgeLabel(routeLinkKind))}</span></span><input name="routeLink" class="studio-input" value="${escapeHtml(String(p.routeLink || ''))}" /></label>
            <label class="studio-field"><span>featuredOrder</span><input name="featuredOrder" type="number" class="studio-input" value="${escapeHtml(String(p.featuredOrder ?? 0))}" /></label>
            <label class="studio-field"><span>visibility</span><input name="visibility" class="studio-input" value="${escapeHtml(String(p.visibility || ''))}" /></label>
            <label class="studio-field"><span>studioStatus</span>
              <select name="studioStatus" class="studio-select">
                ${['open', 'full', 'active', 'completed', 'comingUp']
                    .map(
                        (s) =>
                            `<option value="${s}" ${String(p.studioStatus) === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
                    )
                    .join('')}
              </select>
            </label>
            </div>
            <p class="studio-modal-hint">Each row is <strong>English</strong> and <strong>日本語</strong> side by side. Card <code>imageSrc</code> supports upload (below). For bulk gallery paths use Services → S3 or Content → <strong>all-programs</strong>.</p>
            <div class="studio-modal-fields-row studio-prog-cover-uploads">
              <label class="studio-file-label studio-btn-ghost studio-field--shrink">
                <input type="file" id="studio-prog-cover-file-en" accept="image/*,video/*,.pdf" class="studio-file-input studio-prog-cover-file" data-upload-target-locale="en" />
                Upload → imageSrc (EN)
              </label>
              <label class="studio-file-label studio-btn-ghost studio-field--shrink">
                <input type="file" id="studio-prog-cover-file-ja" accept="image/*,video/*,.pdf" class="studio-file-input studio-prog-cover-file" data-upload-target-locale="ja" />
                Upload → imageSrc (JA)
              </label>
              <span class="studio-muted studio-prog-cover-hint"><span class="studio-field-kind-badge studio-field-kind-badge--${cardImgKind}">${escapeHtml(getFieldKindBadgeLabel(cardImgKind))}</span> fills the card <code>imageSrc</code> field in the grid below.</span>
            </div>
            ${localeFormHtml}
            <div class="studio-modal-actions">
              <button type="submit" class="studio-btn-primary">Save program</button>
            </div>
          </form>`;
        const { close, root } = openStudioModal(body, {
            title: existing ? 'Edit program' : 'Add program',
            wide: true,
        });
        const localeFormRoot = root.querySelector('.studio-prog-locale-form');
        root.querySelectorAll('input.studio-prog-cover-file[data-upload-target-locale]').forEach((fileEl) => {
            fileEl.addEventListener('change', async (ev) => {
                const t = ev.target;
                const f = t && 'files' in t ? t.files?.[0] : null;
                if (!f || !localeFormRoot) return;
                const loc = t.getAttribute('data-upload-target-locale') || 'en';
                const targetInput = localeFormRoot.querySelector(
                    `[data-prog-path="imageSrc"][data-prog-locale="${loc}"]`
                );
                try {
                    await uploadBlobToS3(f, targetInput instanceof HTMLInputElement ? targetInput : null, {
                        area: 'studio/programs',
                    });
                } catch (err) {
                    const m = err instanceof Error ? err.message : String(err);
                    alert(`${m}\n\nConfigure S3 presign under Studio → Services.`);
                }
                t.value = '';
            });
        });
        root.querySelector('#studio-prog-form')?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.target);
            if (!localeFormRoot) return;
            let en;
            let ja;
            try {
                ({ en, ja } = collectProgramLocalesFromForm(localeFormRoot));
            } catch (err) {
                alert(err instanceof Error ? err.message : String(err));
                return;
            }
            const localesJson = JSON.stringify({ en, ja });
            try {
                await upsertProgramStudio({
                    id: String(fd.get('id') || ''),
                    routeLink: String(fd.get('routeLink') || ''),
                    featuredOrder: Number(fd.get('featuredOrder') || 0),
                    visibility: String(fd.get('visibility') || ''),
                    studioStatus: String(fd.get('studioStatus') || 'open'),
                    localesJson,
                });
                close();
                onSave();
            } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
            }
        });
    };

    mainEl.querySelector('#studio-programs-batch-json')?.addEventListener('change', async (ev) => {
        const input = ev.target;
        const f = input instanceof HTMLInputElement ? input.files?.[0] : null;
        if (input instanceof HTMLInputElement) input.value = '';
        if (!f) return;
        try {
            const text = await f.text();
            const data = JSON.parse(text);
            const n = await batchImportProgramsFromJson(data);
            show('ok', `Imported ${n} program record(s).`);
            await load();
        } catch (e) {
            show('error', e instanceof Error ? e.message : String(e));
        }
    });

    mainEl.querySelector('#studio-program-add')?.addEventListener('click', () => openProgramModal(null, load));
    mainEl.querySelector('#studio-programs-refresh')?.addEventListener('click', () => load());
    mainEl.querySelector('#studio-programs-search')?.addEventListener('input', () => applyProgramFilter());

    await load();
}

async function initProducts(mainEl) {
    const tbody = mainEl.querySelector('#studio-products-tbody');
    const banner = mainEl.querySelector('#studio-products-banner');
    const searchInput = mainEl.querySelector('#studio-products-search');
    const countEl = mainEl.querySelector('#studio-products-header-count');

    /** @type {object[]} */
    let allEditions = [];

    const show = (kind, text) => {
        if (!banner) return;
        banner.style.display = text ? 'block' : 'none';
        banner.className = `studio-banner studio-banner--${kind}`;
        banner.textContent = text;
    };

    async function load() {
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7">Loading…</td></tr>';
        allEditions = await getEditions();
        applyEditionFilter();
    }

    function applyEditionFilter() {
        if (!tbody) return;
        const q = (searchInput instanceof HTMLInputElement ? searchInput.value : '').trim().toLowerCase();
        const editions = allEditions.filter((item) => {
            if (!q) return true;
            const tEn = item.en?.title ?? item.title ?? '';
            const tJa = item.ja?.title ?? '';
            const hay = `${item.id} ${tEn} ${tJa} ${item.href} ${item.productStatus} ${item.imageSrc ?? ''}`.toLowerCase();
            return hay.includes(q);
        });
        if (countEl) countEl.textContent = String(q ? editions.length : allEditions.length);
        if (!editions.length) {
            tbody.innerHTML = `<tr><td colspan="7">${allEditions.length ? 'No rows match search.' : 'No editions.'}</td></tr>`;
            return;
        }
        tbody.innerHTML = editions
            .map((item) => {
                const titleEn = item.en?.title ?? item.title ?? '';
                const titleJa = item.ja?.title ?? '';
                const st = item.productStatus ?? '';
                const cover = String(item.imageSrc ?? '').slice(0, 36);
                return `<tr>
                <td><code class="studio-code-inline">${escapeHtml(String(item.id || ''))}</code></td>
                <td>${escapeHtml(String(titleEn))}</td>
                <td>${escapeHtml(String(titleJa))}</td>
                <td>${escapeHtml(String(item.href || ''))}</td>
                <td>${escapeHtml(String(st || '—'))}</td>
                <td><span class="studio-muted" title="${escapeHtml(String(item.imageSrc ?? ''))}">${escapeHtml(cover || '—')}${String(item.imageSrc ?? '').length > 36 ? '…' : ''}</td>
                <td class="studio-td-actions">
                  <button type="button" class="studio-btn-ghost studio-ed-edit" data-id="${escapeHtml(String(item.id || ''))}">MANAGE</button>
                  <button type="button" class="studio-btn-ghost studio-ed-del" data-id="${escapeHtml(String(item.id || ''))}">DELETE</button>
                </td>
            </tr>`;
            })
            .join('');
        tbody.querySelectorAll('.studio-ed-edit').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const row = allEditions.find((x) => String(x.id) === String(id));
                openEditionModal(row, load);
            });
        });
        tbody.querySelectorAll('.studio-ed-del').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (!id || !confirm(`Delete edition ${id}?`)) return;
                try {
                    await deleteEditionStudio(id);
                    show('ok', 'Deleted.');
                    await load();
                } catch (e) {
                    show('error', e instanceof Error ? e.message : String(e));
                }
            });
        });
    }

    const openEditionModal = (existing, onDone) => {
        const e = existing || {
            id: `ed_${Date.now()}`,
            href: '/objects',
            productStatus: 'active',
            imageSrc: '',
            en: {},
            ja: {},
        };
        let parsed = { imageSrc: e.imageSrc || '', en: e.en || {}, ja: e.ja || {} };
        if (e.localesJson) {
            try {
                parsed = { ...parsed, ...JSON.parse(String(e.localesJson)) };
            } catch {
                /* keep */
            }
        }
        const enStr = localeValueToEditorText(parsed.en);
        const jaStr = localeValueToEditorText(parsed.ja);
        const img = String(parsed.imageSrc ?? '');
        const edHrefKind = getFieldKind('editions-feed', 'href');
        const edImgKind = getFieldKind('editions-feed', 'items.0.imageSrc');
        const body = `
          <form id="studio-ed-form" class="studio-modal-form">
            <div class="studio-modal-fields-row">
            <label class="studio-field"><span>ID</span><input name="id" required class="studio-input" value="${escapeHtml(String(e.id))}" ${existing ? 'readonly' : ''} /></label>
            <label class="studio-field"><span>href <span class="studio-field-kind-badge studio-field-kind-badge--${edHrefKind}">${escapeHtml(getFieldKindBadgeLabel(edHrefKind))}</span></span><input name="href" class="studio-input" value="${escapeHtml(String(e.href || ''))}" /></label>
            <label class="studio-field"><span>productStatus</span>
              <select name="productStatus" class="studio-select">
                ${['active', 'sold_out', 'draft']
                    .map(
                        (s) =>
                            `<option value="${s}" ${String(e.productStatus) === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
                    )
                    .join('')}
              </select>
            </label>
            <label class="studio-field studio-field--grow"><span>imageSrc <span class="studio-field-kind-badge studio-field-kind-badge--${edImgKind}">${escapeHtml(getFieldKindBadgeLabel(edImgKind))}</span></span><input name="imageSrc" id="studio-ed-img" class="studio-input" value="${escapeHtml(img)}" placeholder="Asset path or URL" /></label>
            <label class="studio-file-label studio-btn-ghost studio-field--shrink">
                <input type="file" id="studio-ed-img-file" accept="image/*,video/*,.pdf" class="studio-file-input" />
                Upload to storage
            </label>
            </div>
            <details class="studio-prog-details" open>
              <summary class="studio-prog-subhead">Locale title &amp; alt</summary>
              <p class="studio-modal-hint">Merged into saved JSON with the locale blobs below.</p>
              <div class="studio-modal-fields-row">
                <label class="studio-field"><span>EN title</span><input type="text" id="studio-ed-q-en-title" class="studio-input" value="${escapeHtml(String(parsed.en?.title ?? ''))}" autocomplete="off" /></label>
                <label class="studio-field"><span>JA title</span><input type="text" id="studio-ed-q-ja-title" class="studio-input" value="${escapeHtml(String(parsed.ja?.title ?? ''))}" autocomplete="off" /></label>
                <label class="studio-field"><span>EN alt</span><input type="text" id="studio-ed-q-en-alt" class="studio-input" value="${escapeHtml(String(parsed.en?.alt ?? ''))}" autocomplete="off" /></label>
                <label class="studio-field"><span>JA alt</span><input type="text" id="studio-ed-q-ja-alt" class="studio-input" value="${escapeHtml(String(parsed.ja?.alt ?? ''))}" autocomplete="off" /></label>
              </div>
            </details>
            <div class="studio-locale-split">
              <label class="studio-field studio-field--stack">
                <span class="studio-locale-label">English</span>
                <textarea id="studio-ed-en" class="studio-textarea studio-textarea--locale" rows="14" spellcheck="false"></textarea>
              </label>
              <label class="studio-field studio-field--stack">
                <span class="studio-locale-label">日本語</span>
                <textarea id="studio-ed-ja" class="studio-textarea studio-textarea--locale" rows="14" spellcheck="false"></textarea>
              </label>
            </div>
            <div class="studio-modal-actions">
              <button type="submit" class="studio-btn-primary">Save edition</button>
            </div>
          </form>`;
        const { close, root } = openStudioModal(body, {
            title: existing ? 'Edit edition' : 'Add edition',
            wide: true,
        });
        const taEn = root.querySelector('#studio-ed-en');
        const taJa = root.querySelector('#studio-ed-ja');
        if (taEn) taEn.value = enStr;
        if (taJa) taJa.value = jaStr;
        root.querySelector('#studio-ed-img-file')?.addEventListener('change', async (ev) => {
            const t = ev.target;
            const f = t && 'files' in t ? t.files?.[0] : null;
            if (!f) return;
            try {
                await uploadBlobToS3(f, root.querySelector('#studio-ed-img'), { area: 'studio/editions' });
            } catch (err) {
                const m = err instanceof Error ? err.message : String(err);
                alert(`${m}\n\nConfigure S3 presign under Studio → Services.`);
            }
            t.value = '';
        });
        root.querySelector('#studio-ed-form')?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.target);
            let en = editorTextToObjectLocale(taEn?.value, 'edition');
            let ja = editorTextToObjectLocale(taJa?.value, 'edition');
            const qen = root.querySelector('#studio-ed-q-en-title');
            const qja = root.querySelector('#studio-ed-q-ja-title');
            const qea = root.querySelector('#studio-ed-q-en-alt');
            const qja2 = root.querySelector('#studio-ed-q-ja-alt');
            if (qen instanceof HTMLInputElement && qja instanceof HTMLInputElement && qea instanceof HTMLInputElement && qja2 instanceof HTMLInputElement) {
                en = { ...en, title: qen.value, alt: qea.value };
                ja = { ...ja, title: qja.value, alt: qja2.value };
            }
            const localesJson = JSON.stringify({
                imageSrc: String(fd.get('imageSrc') || ''),
                en,
                ja,
            });
            try {
                await upsertEditionStudio({
                    id: String(fd.get('id') || ''),
                    href: String(fd.get('href') || ''),
                    productStatus: String(fd.get('productStatus') || 'active'),
                    localesJson,
                });
                close();
                onDone();
            } catch (err) {
                alert(err instanceof Error ? err.message : String(err));
            }
        });
    };

    mainEl.querySelector('#studio-product-add')?.addEventListener('click', () => openEditionModal(null, load));
    mainEl.querySelector('#studio-products-refresh')?.addEventListener('click', () => load());
    mainEl.querySelector('#studio-products-search')?.addEventListener('input', () => applyEditionFilter());
    await load();
}

async function initGalleryAccess(mainEl) {
    const subsBody = mainEl.querySelector('#studio-ga-subs-tbody');
    const artBody = mainEl.querySelector('#studio-ga-artists-tbody');
    const rows = getDataSource() === 'test' ? [] : await loadSubscribersFromDataSource().catch(() => []);
    const gallerySubs = (Array.isArray(rows) ? rows : []).filter((r) => {
        const c = normalizeEarlyAccessCategory(r.category || '');
        return /gallery/i.test(c);
    });
    if (subsBody) {
        subsBody.innerHTML = gallerySubs.length
            ? gallerySubs
                  .map((r) => `<tr><td>${escapeHtml(r.email)}</td><td>${escapeHtml(r.category)}</td></tr>`)
                  .join('')
            : '<tr><td colspan="2">No gallery-category subscribers (or test mode / not admin).</td></tr>';
    }
    const artists = await getArtists();
    const withGa = artists.filter((a) => a.galleryFilter || a.gallery_filter);
    if (artBody) {
        artBody.innerHTML = withGa.length
            ? withGa
                  .map((a) => {
                      const gf = a.galleryFilter || a.gallery_filter || {};
                      return `<tr>
                        <td>${escapeHtml(String(a.slug))}</td>
                        <td>${escapeHtml(String(gf.accessType || gf.access_type || ''))}</td>
                        <td>${escapeHtml(String(gf.season ?? ''))}</td>
                    </tr>`;
                  })
                  .join('')
            : '<tr><td colspan="3">No artists with galleryFilter set.</td></tr>';
    }
}

async function initJournal(mainEl) {
    const tbody = mainEl.querySelector('#studio-journal-tbody');
    const banner = mainEl.querySelector('#studio-journal-banner');
    const searchInput = mainEl.querySelector('#studio-journal-search');
    const countEl = mainEl.querySelector('#studio-journal-header-count');

    /** @type {object[]} */
    let allEntries = [];

    const show = (kind, text) => {
        if (!banner) return;
        banner.style.display = text ? 'block' : 'none';
        banner.className = `studio-banner studio-banner--${kind}`;
        banner.textContent = text;
    };

    async function load() {
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
        allEntries = await getJournalEntries();
        applyJournalFilter();
    }

    function applyJournalFilter() {
        if (!tbody) return;
        const q = (searchInput instanceof HTMLInputElement ? searchInput.value : '').trim().toLowerCase();
        const entries = allEntries.filter((j) => {
            if (!q) return true;
            const title = j.en?.title ?? '';
            const id = j.id != null ? String(j.id) : '';
            const link = j.link ?? '';
            const hay = `${title} ${id} ${link} ${j.entryStatus ?? ''}`.toLowerCase();
            return hay.includes(q);
        });
        if (countEl) countEl.textContent = String(q ? entries.length : allEntries.length);
        if (!entries.length) {
            tbody.innerHTML = `<tr><td colspan="5">${allEntries.length ? 'No rows match search.' : 'No journal entries.'}</td></tr>`;
            return;
        }
        tbody.innerHTML = entries
            .map((j) => {
                const title = j.en?.title ?? '';
                const id = j.id != null ? String(j.id) : '';
                const link = j.link ?? '';
                const st = j.entryStatus ?? '';
                return `<tr>
                <td>${escapeHtml(String(title || '(untitled)'))}</td>
                <td><code class="studio-code-inline">${escapeHtml(id)}</code></td>
                <td>${escapeHtml(String(st || '—'))}</td>
                <td>${link ? `<a class="studio-action-link" href="${escapeHtml(link)}" target="_blank" rel="noopener">Open</a>` : '—'}</td>
                <td class="studio-td-actions">
                  <button type="button" class="studio-btn-ghost studio-je-view" data-id="${escapeHtml(id)}">PREVIEW</button>
                  <button type="button" class="studio-btn-ghost studio-je-edit" data-id="${escapeHtml(id)}">MANAGE</button>
                  <button type="button" class="studio-btn-ghost studio-je-del" data-id="${escapeHtml(id)}">DELETE</button>
                </td>
            </tr>`;
            })
            .join('');
        tbody.querySelectorAll('.studio-je-view').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const row = await getJournalEntryForStudio(id || '');
                if (!row) return;
                let o = { en: {}, ja: {} };
                try {
                    o = row.localesJson
                        ? JSON.parse(String(row.localesJson))
                        : { en: row.en || {}, ja: row.ja || {} };
                } catch {
                    /* keep */
                }
                const plain = journalLocalesToPlain(
                    /** @type {Record<string, unknown>} */ (o.en),
                    /** @type {Record<string, unknown>} */ (o.ja)
                );
                openStudioModal(
                    `<div class="studio-modal-form">
                      <p class="studio-muted">Internal reference: <code class="studio-code-inline">${escapeHtml(shortRefLabel(id || ''))}</code></p>
                      <div class="studio-locale-split">
                        <label class="studio-field studio-field--stack"><span class="studio-locale-label">English title</span>
                          <input type="text" id="studio-je-view-title-en" class="studio-input" readonly value="${escapeHtml(plain.titleEn)}" />
                        </label>
                        <label class="studio-field studio-field--stack"><span class="studio-locale-label">日本語 title</span>
                          <input type="text" id="studio-je-view-title-ja" class="studio-input" readonly value="${escapeHtml(plain.titleJa)}" />
                        </label>
                      </div>
                      <label class="studio-field studio-field--stack"><span>English body</span>
                        <textarea id="studio-je-view-body-en" class="studio-textarea" readonly rows="10" spellcheck="false">${escapeHtml(plain.bodyEn)}</textarea>
                      </label>
                      <label class="studio-field studio-field--stack"><span>日本語 body</span>
                        <textarea id="studio-je-view-body-ja" class="studio-textarea" readonly rows="10" spellcheck="false">${escapeHtml(plain.bodyJa)}</textarea>
                      </label>
                    </div>`,
                    { title: `Journal — ${escapeHtml(plain.titleEn || 'Entry')}`, wide: true }
                );
            });
        });
        tbody.querySelectorAll('.studio-je-edit').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const row = await getJournalEntryForStudio(id || '');
                openJournalModal(row, load);
            });
        });
        tbody.querySelectorAll('.studio-je-del').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (!id || !confirm('Delete this journal entry?')) return;
                try {
                    await deleteJournalStudio(id);
                    show('ok', 'Deleted.');
                    await load();
                } catch (e) {
                    show('error', e instanceof Error ? e.message : String(e));
                }
            });
        });
    }

    const openJournalModal = (existing, onDone) => {
        const j = existing || {
            id: `j_${Date.now()}`,
            link: '',
            imageSrc: '',
            entryStatus: 'draft',
            en: {},
            ja: {},
        };
        /** @type {Record<string, unknown>} */
        let prevEn = {};
        /** @type {Record<string, unknown>} */
        let prevJa = {};
        try {
            const o = j.localesJson
                ? JSON.parse(String(j.localesJson))
                : { en: j.en || {}, ja: j.ja || {} };
            prevEn = o.en && typeof o.en === 'object' && !Array.isArray(o.en) ? o.en : {};
            prevJa = o.ja && typeof o.ja === 'object' && !Array.isArray(o.ja) ? o.ja : {};
        } catch {
            /* keep */
        }
        const plain = journalLocalesToPlain(prevEn, prevJa);
        const jeSlug = 'journals-block';
        const linkKind = getFieldKind(jeSlug, 'link');
        const imgKind = getFieldKind(jeSlug, 'imageSrc');
        const body = `
          <form id="studio-je-form" class="studio-modal-form">
            <p class="studio-muted">Internal reference: <code class="studio-code-inline">${escapeHtml(shortRefLabel(String(j.id)))}</code></p>
            <div class="studio-modal-fields-row">
            <label class="studio-field studio-field--full"><span>Entry ID</span><input name="id" required class="studio-input" value="${escapeHtml(String(j.id))}" ${existing ? 'readonly' : ''} /></label>
            <label class="studio-field"><span>Public page link <span class="studio-field-kind-badge studio-field-kind-badge--${linkKind}">${escapeHtml(getFieldKindBadgeLabel(linkKind))}</span></span><input name="link" class="studio-input" value="${escapeHtml(String(j.link || ''))}" placeholder="/journal/entry/…" /></label>
            <label class="studio-field"><span>Cover image <span class="studio-field-kind-badge studio-field-kind-badge--${imgKind}">${escapeHtml(getFieldKindBadgeLabel(imgKind))}</span></span><input name="imageSrc" id="studio-je-img" class="studio-input" value="${escapeHtml(String(j.imageSrc || ''))}" placeholder="Asset path or URL" /></label>
            <label class="studio-file-label studio-btn-ghost">
                <input type="file" id="studio-je-img-file" accept="image/*,video/*" class="studio-file-input" />
                Upload to storage
            </label>
            <label class="studio-field"><span>Publication status</span>
              <select name="entryStatus" class="studio-select">
                ${['draft', 'published', 'archived']
                    .map(
                        (s) =>
                            `<option value="${s}" ${String(j.entryStatus) === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
                    )
                    .join('')}
              </select>
            </label>
            </div>
            <div class="studio-locale-split">
              <label class="studio-field studio-field--stack">
                <span class="studio-locale-label">English title</span>
                <input type="text" id="studio-je-title-en" class="studio-input" value="${escapeHtml(plain.titleEn)}" />
              </label>
              <label class="studio-field studio-field--stack">
                <span class="studio-locale-label">日本語 title</span>
                <input type="text" id="studio-je-title-ja" class="studio-input" value="${escapeHtml(plain.titleJa)}" />
              </label>
            </div>
            <label class="studio-field studio-field--stack"><span>English body</span>
              <textarea id="studio-je-body-en" class="studio-textarea" rows="10" spellcheck="true">${escapeHtml(plain.bodyEn)}</textarea>
            </label>
            <label class="studio-field studio-field--stack"><span>日本語 body</span>
              <textarea id="studio-je-body-ja" class="studio-textarea" rows="10" spellcheck="true">${escapeHtml(plain.bodyJa)}</textarea>
            </label>
            <div class="studio-modal-actions">
              <button type="submit" class="studio-btn-primary">Save journal entry</button>
            </div>
          </form>`;
        const { close, root } = openStudioModal(body, {
            title: existing ? 'Edit journal entry' : 'Add journal entry',
            wide: true,
        });
        root.querySelector('#studio-je-img-file')?.addEventListener('change', async (ev) => {
            const t = ev.target;
            const f = t && 'files' in t ? t.files?.[0] : null;
            if (!f) return;
            try {
                await uploadBlobToS3(f, root.querySelector('#studio-je-img'), { area: 'studio/journal' });
            } catch (err) {
                alert(err instanceof Error ? err.message : String(err));
            }
            t.value = '';
        });
        root.querySelector('#studio-je-form')?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.target);
            const titleEn = root.querySelector('#studio-je-title-en')?.value ?? '';
            const titleJa = root.querySelector('#studio-je-title-ja')?.value ?? '';
            const bodyEn = root.querySelector('#studio-je-body-en')?.value ?? '';
            const bodyJa = root.querySelector('#studio-je-body-ja')?.value ?? '';
            const { en, ja } = applyJournalPlainLocales(prevEn, prevJa, {
                titleEn,
                titleJa,
                bodyEn,
                bodyJa,
            });
            const localesJson = JSON.stringify({ en, ja });
            try {
                await upsertJournalStudio({
                    id: String(fd.get('id') || ''),
                    link: String(fd.get('link') || ''),
                    imageSrc: String(fd.get('imageSrc') || ''),
                    entryStatus: String(fd.get('entryStatus') || 'draft'),
                    localesJson,
                });
                close();
                onDone();
            } catch (err) {
                alert(err instanceof Error ? err.message : String(err));
            }
        });
    };

    mainEl.querySelector('#studio-journal-add')?.addEventListener('click', () => openJournalModal(null, load));
    mainEl.querySelector('#studio-journal-refresh')?.addEventListener('click', () => load());
    mainEl.querySelector('#studio-journal-search')?.addEventListener('input', () => applyJournalFilter());
    await load();
}

async function initContent(mainEl) {
    const tbody = mainEl.querySelector('#studio-content-tbody');
    const editor = mainEl.querySelector('#studio-content-editor');
    const titleEl = mainEl.querySelector('#studio-content-editor-title');
    const slugEl = mainEl.querySelector('#studio-content-editor-slug');
    const fieldsEl = mainEl.querySelector('#studio-content-fields');
    const msg = mainEl.querySelector('#studio-content-msg');
    const unsavedEl = mainEl.querySelector('#studio-content-unsaved');
    const savedAtEl = mainEl.querySelector('#studio-content-saved-at');
    const placeholderEl = mainEl.querySelector('#studio-content-live-placeholder');
    const adoptBtn = mainEl.querySelector('#studio-content-adopt');
    /** @type {string | null} */
    let activeSlug = null;
    /** @type {boolean} */
    let contentDirty = false;

    const showMsg = (kind, text) => {
        if (!msg) return;
        msg.style.display = text ? 'block' : 'none';
        msg.className = `studio-banner studio-banner--${kind}`;
        msg.textContent = text;
    };

    const setPlaceholderUi = (on) => {
        if (placeholderEl) placeholderEl.style.display = on ? 'block' : 'none';
        if (adoptBtn instanceof HTMLElement) adoptBtn.style.display = on ? '' : 'none';
    };

    const setDirty = (dirty) => {
        contentDirty = dirty;
        if (unsavedEl) {
            unsavedEl.style.display = dirty ? 'block' : 'none';
        }
        const saveBtn = mainEl.querySelector('#studio-content-save');
        if (saveBtn instanceof HTMLButtonElement) {
            saveBtn.setAttribute('aria-busy', 'false');
        }
    };

    /** @param {string} slug */
    const registryEntry = (slug) => CONTENT_PAGE_REGISTRY.find((e) => e.slug === slug);

    const onBeforeUnload = (ev) => {
        if (contentDirty && editor?.style.display !== 'none') {
            ev.preventDefault();
            ev.returnValue = '';
        }
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    const summary = await getContentSummary();
    if (!tbody) return;
    const previewText = (s) => {
        const t = [s.title, s.snippet].filter(Boolean).join(' — ');
        return t.length > 160 ? `${t.slice(0, 157)}…` : t;
    };
    tbody.innerHTML = summary
        .map(
            (s) => `
        <tr>
            <td>${escapeHtml(s.label)}</td>
            <td>${escapeHtml(previewText(s))}</td>
            <td><button type="button" class="studio-btn-ghost studio-content-edit" data-slug="${escapeHtml(s.slug)}">Edit</button></td>
        </tr>`
        )
        .join('');

    const openEditor = async (slug) => {
        activeSlug = slug;
        if (editor) editor.style.display = 'block';
        const entry = registryEntry(slug);
        if (titleEl) titleEl.textContent = entry?.label ? `Edit: ${entry.label}` : 'Edit section';
        if (slugEl) {
            slugEl.textContent = slug ? `Slug: ${slug}` : '';
            slugEl.hidden = !slug;
        }
        showMsg('info', '');
        setDirty(false);
        if (savedAtEl) savedAtEl.style.display = 'none';
        const loaded = await getContentBundleForStudio(slug, { forStudio: true, returnMeta: true });
        const bundle =
            loaded && typeof loaded === 'object' && 'bundle' in loaded
                ? /** @type {{ bundle: unknown }} */ (loaded).bundle
                : loaded;
        const isLivePlaceholder =
            loaded && typeof loaded === 'object' && 'isLivePlaceholder' in loaded
                ? /** @type {{ isLivePlaceholder: boolean }} */ (loaded).isLivePlaceholder
                : false;
        setPlaceholderUi(isLivePlaceholder);
        if (fieldsEl) {
            fillStudioContentPlainFields(fieldsEl, bundle, slug || '', {
                markDirty: () => setDirty(true),
            });
        }
        titleEl?.focus();
        editor?.scrollIntoView({ behavior: 'smooth' });
    };

    tbody.querySelectorAll('.studio-content-edit').forEach((btn) => {
        btn.addEventListener('click', () => openEditor(btn.getAttribute('data-slug') || ''));
    });

    fieldsEl?.addEventListener('change', async (ev) => {
        const t = ev.target;
        if (!(t instanceof HTMLInputElement) || t.type !== 'file') return;
        const path = t.dataset.uploadFor;
        if (!path || !fieldsEl) return;
        const f = t.files?.[0];
        if (!f) return;
        const el = fieldsEl.querySelector(`.studio-content-str-value[data-path="${CSS.escape(path)}"]`);
        if (!(el instanceof HTMLTextAreaElement) && !(el instanceof HTMLInputElement)) return;
        try {
            await uploadBlobToS3(f, el, { area: 'studio/content' });
            setDirty(true);
            showMsg('ok', 'Uploaded — URL inserted. Save to persist.');
            el.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (err) {
            const m = err instanceof Error ? err.message : String(err);
            const hint =
                /presign|fetch|network|failed/i.test(m) && !/S3 upload failed/.test(m)
                    ? `${m} — configure Services (integration API + S3) via the Services tab.`
                    : m;
            showMsg('error', hint);
        }
        t.value = '';
    });

    mainEl.querySelector('#studio-content-cancel')?.addEventListener('click', () => {
        if (editor) editor.style.display = 'none';
        activeSlug = null;
        setDirty(false);
        setPlaceholderUi(false);
        if (savedAtEl) savedAtEl.style.display = 'none';
    });

    const persistContent = async () => {
        if (!activeSlug || !fieldsEl) return;
        const map = collectContentStringValues(fieldsEl);
        /** @type {Record<string, string>} */
        const scalarMap = {};
        fieldsEl.querySelectorAll('input[data-scalar-path]').forEach((el) => {
            const p = el.getAttribute('data-scalar-path');
            if (!p) return;
            if (el instanceof HTMLInputElement && el.type === 'checkbox') {
                scalarMap[p] = el.checked ? 'true' : 'false';
            } else if (el instanceof HTMLInputElement) {
                scalarMap[p] = el.value;
            }
        });
        const bundle = await getContentBundleForStudio(activeSlug, { forStudio: true });
        let next = applyStringPatches(bundle, map);
        next = applyScalarPatches(bundle, next, scalarMap);
        if (activeSlug === 'context') {
            next = syncContextJaMediaFromEn(next);
        }
        await upsertContentPageStudio(activeSlug, next);
        const ts = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        if (savedAtEl) {
            savedAtEl.textContent = `Last saved ${ts}`;
            savedAtEl.style.display = 'block';
        }
        setDirty(false);
        setPlaceholderUi(false);
        showMsg('ok', 'Saved.');
    };

    mainEl.querySelector('#studio-content-save')?.addEventListener('click', async () => {
        try {
            await persistContent();
        } catch (e) {
            showMsg('error', e instanceof Error ? e.message : String(e));
        }
    });

    adoptBtn?.addEventListener('click', async () => {
        try {
            await persistContent();
        } catch (e) {
            showMsg('error', e instanceof Error ? e.message : String(e));
        }
    });

    const filterInput = mainEl.querySelector('#studio-content-filter');
    const countEl = mainEl.querySelector('#studio-content-count');
    const total = summary.length;
    const applyContentFilter = () => {
        const q = (filterInput instanceof HTMLInputElement ? filterInput.value : '').trim().toLowerCase();
        let n = 0;
        tbody?.querySelectorAll('tr').forEach((tr) => {
            const t = tr.textContent?.toLowerCase() ?? '';
            const show = !q || t.includes(q);
            tr.style.display = show ? '' : 'none';
            if (show) n += 1;
        });
        if (countEl) countEl.textContent = q ? `${n} of ${total} section(s) match` : `${total} sections`;
    };
    applyContentFilter();
    filterInput?.addEventListener('input', applyContentFilter);
}

async function initEmail(mainEl) {
    const btn = mainEl.querySelector('#studio-email-export');
    const pre = mainEl.querySelector('#studio-email-preview');
    btn?.addEventListener('click', async () => {
        try {
            const csv = await getSubscribersCsv();
            if (pre) {
                pre.hidden = false;
                pre.textContent = csv.slice(0, 4000) + (csv.length > 4000 ? '\n…' : '');
            }
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'fusion-subscribers.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
        }
    });
}

function initAi(mainEl) {
    const model = mainEl.querySelector('#studio-ai-model');
    const notes = mainEl.querySelector('#studio-ai-notes');
    const msg = mainEl.querySelector('#studio-ai-msg');
    const key = 'fusion-studio-ai-settings';
    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            const o = JSON.parse(raw);
            if (model) model.value = o.model || '';
            if (notes) notes.value = o.notes || '';
        }
    } catch {
        /* ignore */
    }
    mainEl.querySelector('#studio-ai-save')?.addEventListener('click', () => {
        try {
            localStorage.setItem(
                key,
                JSON.stringify({ model: model?.value || '', notes: notes?.value || '' })
            );
            if (msg) {
                msg.style.display = 'block';
                msg.textContent = 'Saved locally. Future: sync to canister siteSettings.';
            }
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
        }
    });
}

/**
 * @param {unknown} u
 */
function formatStudioAccountCardHtml(u) {
    if (!u || typeof u !== 'object') {
        return '<p class="studio-muted">No account record for the current session.</p>';
    }
    const rec = /** @type {Record<string, unknown>} */ (u);
    const role = rec.role && typeof rec.role === 'object' ? Object.keys(rec.role)[0] : '—';
    const status = rec.status && typeof rec.status === 'object' ? Object.keys(rec.status)[0] : '—';
    return `<dl class="studio-dl studio-dl--compact">
      <dt>Your role</dt><dd>${escapeHtml(String(role))}</dd>
      <dt>Account status</dt><dd>${escapeHtml(String(status))}</dd>
    </dl>`;
}

async function initUsers(mainEl) {
    const selfEl = mainEl.querySelector('#studio-users-self');
    const tbody = mainEl.querySelector('#studio-users-tbody');
    const roleFilter = mainEl.querySelector('#studio-users-filter-role');
    const statusFilter = mainEl.querySelector('#studio-users-filter-status');
    const countHeader = mainEl.querySelector('#studio-users-header-count');

    /** @type {Awaited<ReturnType<typeof getAccountsForStudio>>} */
    let allPairs = [];

    const renderTable = () => {
        if (!tbody) return;
        const wantRole = roleFilter?.value || '';
        const wantSt = statusFilter?.value || '';
        const rows = allPairs.filter((r) => {
            if (wantRole && r.role !== wantRole) return false;
            if (wantSt && r.status !== wantSt) return false;
            return true;
        });
        if (countHeader) countHeader.textContent = String(rows.length);
        if (!rows.length) {
            const emptyMsg =
                allPairs.length === 0 && !wantRole && !wantSt
                    ? 'No accounts on this canister yet.'
                    : 'No accounts match filters.';
            tbody.innerHTML = `<tr><td colspan="7">${emptyMsg}</td></tr>`;
            return;
        }
        tbody.innerHTML = rows
            .map(
                (r) => `<tr>
                <td><span class="studio-identity-short" title="${escapeHtml(r.principal)}">${escapeHtml(shortPrincipalDisplay(r.principal))}</span></td>
                <td>${escapeHtml(r.role)}</td>
                <td>${escapeHtml(r.status)}</td>
                <td>${r.linkedArtistId ? escapeHtml(String(r.linkedArtistId)) : '—'}</td>
                <td>${r.linkedOrgId ? escapeHtml(String(r.linkedOrgId)) : '—'}</td>
                <td><span class="studio-muted" title="${escapeHtml(r.updatedAt)}">${escapeHtml(r.updatedAt ? r.updatedAt.slice(0, 19) : '—')}</span></td>
                <td><button type="button" class="studio-btn-ghost studio-user-rp" disabled title="Internet Identity has no password. Use identity recovery, or a future email-based account store.">Reset password</button></td>
            </tr>`
            )
            .join('');
    };

    try {
        const actor = await getFusionBackendActor();
        if (typeof actor.getAccountForCaller === 'function') {
            const acc = await actor.getAccountForCaller();
            let u = acc;
            if (Array.isArray(acc)) u = acc.length ? acc[0] : null;
            if (selfEl) selfEl.innerHTML = u ? formatStudioAccountCardHtml(u) : formatStudioAccountCardHtml(null);
        } else if (selfEl) {
            selfEl.innerHTML =
                '<p class="studio-muted">Account lookup is not available. Regenerate canister declarations if needed.</p>';
        }
        if (typeof actor.listAccounts !== 'function') {
            if (tbody) {
                tbody.innerHTML =
                    '<tr><td colspan="7">listAccounts missing from declarations — run <code>dfx generate fusion-app-backend</code>.</td></tr>';
            }
            return;
        }
        try {
            allPairs = await getAccountsForStudio();
        } catch (listErr) {
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7">${escapeHtml(listErr instanceof Error ? listErr.message : String(listErr))}</td></tr>`;
            }
            roleFilter?.addEventListener('change', renderTable);
            statusFilter?.addEventListener('change', renderTable);
            return;
        }
        renderTable();
        roleFilter?.addEventListener('change', renderTable);
        statusFilter?.addEventListener('change', renderTable);
    } catch (e) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7">${escapeHtml(e instanceof Error ? e.message : String(e))}</td></tr>`;
        }
    }
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            return true;
        } catch {
            return false;
        }
    }
}

function openServicesHelpStripe() {
    const body = `
      <ol class="studio-help-list">
        <li>Open <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener">Stripe Dashboard → Developers → API keys</a> (test mode).</li>
        <li>Copy <strong>Publishable key</strong> (<code>pk_test_…</code>) into Studio above — used by Stripe.js in the browser.</li>
        <li>Copy <strong>Secret key</strong> (<code>sk_test_…</code>) into <code>services/fusion-integration-api/.env</code> as <code>STRIPE_SECRET_KEY</code> (never expose in client bundles).</li>
        <li>Create a recurring <strong>Price</strong> (e.g. $50 every 2 months) and set <code>STRIPE_PRICE_ID=price_…</code> on the integration server. Join uses <code>POST /stripe/create-subscription</code>.</li>
        <li>Register <code>/webhooks/stripe</code> in Stripe with <code>STRIPE_WEBHOOK_SECRET</code>; set <code>FUSION_BACKEND_CANISTER_ID</code>, <code>INTEGRATION_IC_IDENTITY_JSON</code>, <code>IC_HOST</code>, then call the canister <code>adminSetIntegrationServicePrincipal</code> with that identity’s principal (see <code>services/fusion-integration-api/README.md</code>).</li>
        <li>Run the integration API locally: <code>npm run integration-api</code> from the repo root; use <code>VITE_INTEGRATION_API_URL=/integration</code> with Vite proxy.</li>
        <li>Test cards: <a href="https://stripe.com/docs/testing" target="_blank" rel="noopener">Stripe testing</a> (e.g. <code>4242 4242 4242 4242</code>).</li>
        <li>Studio “Test PaymentIntent” still uses <code>POST /stripe/create-payment-intent</code> for debugging.</li>
      </ol>`;
    openStudioModal(body, { title: 'Set up Stripe (subscriptions + tests)', wide: true });
}

function openServicesHelpResend() {
    const body = `
      <ol class="studio-help-list">
        <li>Create an API key at <a href="https://resend.com/api-keys" target="_blank" rel="noopener">resend.com/api-keys</a>.</li>
        <li>Set <code>RESEND_API_KEY</code> and <code>RESEND_FROM</code> (verified domain or onboarding address) in the integration API <code>.env</code>.</li>
        <li>Email is sent via <code>POST /email/send</code> so the browser never holds the Resend secret.</li>
        <li>Optional: Studio <strong>From</strong> overrides the sender for test mail if the address is verified in Resend.</li>
      </ol>`;
    openStudioModal(body, { title: 'Set up Resend', wide: true });
}

function openServicesHelpS3() {
    const body = `
      <ol class="studio-help-list">
        <li>Create an S3 bucket and IAM user/role with <code>s3:PutObject</code> on a prefix such as <code>uploads/*</code>.</li>
        <li>Set <code>AWS_REGION</code>, <code>S3_BUCKET</code>, and optionally <code>S3_PUBLIC_BASE_URL</code> (CloudFront or bucket URL) on the integration server.</li>
        <li>Bucket CORS: allow <code>PUT</code> from your site origin for presigned uploads.</li>
        <li>Studio calls <code>POST /storage/presign</code> then uploads the file with the returned URL.</li>
      </ol>
      <p class="studio-muted"><strong>Key naming</strong> (under <code>uploads/</code> or <code>S3_KEY_PREFIX</code>): <code>{area}/{8-char-id}-{sanitized-filename}</code>. Allowed <code>area</code> values: <code>studio/content</code>, <code>studio/artists</code>, <code>studio/programs</code>, <code>studio/editions</code>, <code>studio/journal</code>, <code>studio/misc</code>, <code>account/profile</code>, <code>services/test</code>. Unknown areas fall back to <code>studio/misc</code>.</p>`;
    openStudioModal(body, { title: 'Set up S3 uploads', wide: true });
}

/**
 * @param {number} amountInput
 * @param {string} currency
 * @returns {number}
 */
function studioStripeAmountToMinor(amountInput, currency) {
    const c = currency.toLowerCase();
    if (c === 'jpy') {
        return Math.round(amountInput);
    }
    return Math.round(amountInput * 100);
}

function initServicesTabs(mainEl) {
    const root = mainEl.querySelector('[data-studio-tabs="services"]');
    if (!root) return;
    const tabs = root.querySelectorAll('.studio-tabs__tab[role="tab"]');
    const panels = root.querySelectorAll('.studio-tabs__panel[role="tabpanel"]');
    const activate = (tabEl) => {
        const panelId = tabEl.getAttribute('aria-controls');
        if (!panelId) return;
        tabs.forEach((t) => {
            const on = t === tabEl;
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            t.classList.toggle('is-active', on);
        });
        panels.forEach((p) => {
            const on = p.id === panelId;
            p.hidden = !on;
            p.classList.toggle('is-active', on);
        });
    };
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => activate(tab));
    });
}

async function initServices(mainEl) {
    const msg = mainEl.querySelector('#studio-svc-msg');
    const show = (kind, text) => {
        if (!msg) return;
        msg.style.display = text ? 'block' : 'none';
        msg.className = `studio-banner studio-banner--${kind}`;
        msg.textContent = text;
    };

    const urlEl = mainEl.querySelector('#studio-svc-url');
    const bearerEl = mainEl.querySelector('#studio-svc-bearer');
    const modeTest = mainEl.querySelector('#studio-svc-mode-test');
    const modeLive = mainEl.querySelector('#studio-svc-mode-live');
    const pkTest = mainEl.querySelector('#studio-svc-pk-test');
    const pkLive = mainEl.querySelector('#studio-svc-pk-live');
    const skTest = mainEl.querySelector('#studio-svc-sk-test');
    const skLive = mainEl.querySelector('#studio-svc-sk-live');
    const resendTo = mainEl.querySelector('#studio-svc-resend-to');
    const resendFrom = mainEl.querySelector('#studio-svc-resend-from');
    const s3r = mainEl.querySelector('#studio-svc-s3-region');
    const s3b = mainEl.querySelector('#studio-svc-s3-bucket');
    const s3p = mainEl.querySelector('#studio-svc-s3-public');
    const resolvedEl = mainEl.querySelector('#studio-svc-pk-resolved');

    const load = () => {
        try {
            if (urlEl) urlEl.value = localStorage.getItem(LS_INTEGRATION_API_URL) || '';
            if (bearerEl) bearerEl.value = localStorage.getItem(LS_INTEGRATION_API_KEY) || '';
            const m = getStripeMode();
            if (modeTest) modeTest.checked = m !== 'live';
            if (modeLive) modeLive.checked = m === 'live';
            if (pkTest) pkTest.value = localStorage.getItem(LS_STRIPE_PK_TEST) || '';
            if (pkLive) pkLive.value = localStorage.getItem(LS_STRIPE_PK_LIVE) || '';
            if (resendTo) resendTo.value = localStorage.getItem(LS_RESEND_TEST_TO) || '';
            if (resendFrom) resendFrom.value = localStorage.getItem(LS_RESEND_FROM_OVERRIDE) || '';
            if (s3r) s3r.value = localStorage.getItem(LS_S3_REGION) || '';
            if (s3b) s3b.value = localStorage.getItem(LS_S3_BUCKET) || '';
            if (s3p) s3p.value = localStorage.getItem(LS_S3_PUBLIC_BASE) || '';
        } catch {
            /* ignore */
        }
        if (resolvedEl) {
            const k = getStripePublishableKeyResolved();
            resolvedEl.textContent = k ? `${k.slice(0, 12)}…` : '(none — set Studio or VITE_STRIPE_PUBLISHABLE_KEY)';
        }
    };

    const save = () => {
        try {
            if (urlEl) localStorage.setItem(LS_INTEGRATION_API_URL, urlEl.value.trim());
            if (bearerEl) localStorage.setItem(LS_INTEGRATION_API_KEY, bearerEl.value.trim());
            if (modeLive?.checked) setStripeMode('live');
            else setStripeMode('test');
            if (pkTest) localStorage.setItem(LS_STRIPE_PK_TEST, pkTest.value.trim());
            if (pkLive) localStorage.setItem(LS_STRIPE_PK_LIVE, pkLive.value.trim());
            if (resendTo) localStorage.setItem(LS_RESEND_TEST_TO, resendTo.value.trim());
            if (resendFrom) localStorage.setItem(LS_RESEND_FROM_OVERRIDE, resendFrom.value.trim());
            if (s3r) localStorage.setItem(LS_S3_REGION, s3r.value.trim());
            if (s3b) localStorage.setItem(LS_S3_BUCKET, s3b.value.trim());
            if (s3p) localStorage.setItem(LS_S3_PUBLIC_BASE, s3p.value.trim());
        } catch (e) {
            show('error', e instanceof Error ? e.message : String(e));
            return;
        }
        load();
        show('ok', 'Saved Services configuration.');
    };

    load();
    initServicesTabs(mainEl);

    mainEl.querySelector('#studio-svc-save')?.addEventListener('click', () => save());
    mainEl.querySelector('#studio-svc-health')?.addEventListener('click', async () => {
        show('info', '');
        try {
            const j = await fetchIntegrationHealth();
            const extra = [j.stripePrice, j.fusionCanister, j.stripeWebhook]
                .filter(Boolean)
                .length
                ? ` | price: ${j.stripePrice ?? '—'}, canister: ${j.fusionCanister ?? '—'}, webhook: ${j.stripeWebhook ?? '—'}`
                : '';
            show('ok', `OK — Stripe: ${j.stripe}, Resend: ${j.resend}, S3: ${j.s3}${extra}`);
        } catch (e) {
            show('error', e instanceof Error ? e.message : String(e));
        }
    });
    mainEl.querySelector('#studio-svc-help-stripe')?.addEventListener('click', () => openServicesHelpStripe());
    mainEl.querySelector('#studio-svc-help-resend')?.addEventListener('click', () => openServicesHelpResend());
    mainEl.querySelector('#studio-svc-help-s3')?.addEventListener('click', () => openServicesHelpS3());
    mainEl.querySelector('#studio-svc-copy-env')?.addEventListener('click', async () => {
        const snippet = buildServerEnvSnippet(
            skTest?.value || '',
            skLive?.value || '',
            {
                awsRegion: s3r?.value || '',
                s3Bucket: s3b?.value || '',
                s3Public: s3p?.value || '',
            }
        );
        const ok = await copyToClipboard(snippet);
        show(ok ? 'ok' : 'error', ok ? 'Copied .env snippet to clipboard.' : 'Copy failed.');
    });
    mainEl.querySelector('#studio-svc-send-test')?.addEventListener('click', async () => {
        const to = (resendTo?.value || '').trim();
        if (!to.includes('@')) {
            show('error', 'Enter a test recipient email.');
            return;
        }
        show('info', 'Sending…');
        try {
            const fromOpt = (resendFrom?.value || '').trim();
            await sendEmail({
                to,
                subject: 'Fusion — Studio test email',
                text: 'If you received this, Resend + integration API are configured.',
                ...(fromOpt && fromOpt.includes('@') ? { from: fromOpt } : {}),
            });
            show('ok', 'Test email sent.');
        } catch (e) {
            show('error', e instanceof Error ? e.message : String(e));
        }
    });

    const piAmount = mainEl.querySelector('#studio-svc-pi-amount');
    const piCurrency = mainEl.querySelector('#studio-svc-pi-currency');
    const piSecret = mainEl.querySelector('#studio-svc-pi-secret');
    const piCopyBtn = mainEl.querySelector('#studio-svc-pi-copy');
    mainEl.querySelector('#studio-svc-pi-create')?.addEventListener('click', async () => {
        const raw = parseFloat(piAmount?.value || '0');
        const currency = (piCurrency?.value || 'usd').toLowerCase();
        if (!Number.isFinite(raw) || raw <= 0) {
            show('error', 'Enter a valid amount.');
            return;
        }
        const minor = studioStripeAmountToMinor(raw, currency);
        if (minor < 50) {
            show('error', 'Amount too small (minimum 50 in smallest currency units, e.g. $0.50 or ¥50).');
            return;
        }
        show('info', 'Creating PaymentIntent…');
        try {
            const { clientSecret } = await createPaymentIntent(minor, currency, { source: 'studio-test' });
            if (piSecret) piSecret.value = clientSecret || '';
            if (piCopyBtn) piCopyBtn.disabled = !clientSecret;
            show('ok', 'PaymentIntent created.');
        } catch (e) {
            if (piSecret) piSecret.value = '';
            if (piCopyBtn) piCopyBtn.disabled = true;
            show('error', e instanceof Error ? e.message : String(e));
        }
    });
    mainEl.querySelector('#studio-svc-pi-copy')?.addEventListener('click', async () => {
        const v = (piSecret?.value || '').trim();
        if (!v) return;
        const ok = await copyToClipboard(v);
        show(ok ? 'ok' : 'error', ok ? 'Copied client secret.' : 'Copy failed.');
    });

    const s3File = mainEl.querySelector('#studio-svc-s3-file');
    const s3Status = mainEl.querySelector('#studio-svc-s3-status');
    const s3ResultUrl = mainEl.querySelector('#studio-svc-s3-result-url');
    const s3CopyUrlBtn = mainEl.querySelector('#studio-svc-s3-copy-url');
    mainEl.querySelector('#studio-svc-s3-upload')?.addEventListener('click', async () => {
        const file = s3File?.files?.[0];
        if (!file) {
            show('error', 'Choose a file first.');
            return;
        }
        show('info', 'Uploading…');
        if (s3Status) {
            s3Status.style.display = 'block';
            s3Status.textContent = 'Uploading…';
        }
        if (s3ResultUrl) s3ResultUrl.value = '';
        if (s3CopyUrlBtn) s3CopyUrlBtn.disabled = true;
        try {
            const url = await uploadBlobToS3(file, null, { area: 'services/test' });
            if (s3ResultUrl) s3ResultUrl.value = url;
            if (s3CopyUrlBtn) s3CopyUrlBtn.disabled = false;
            if (s3Status) s3Status.textContent = 'Upload complete.';
            show('ok', 'File uploaded.');
        } catch (e) {
            if (s3Status) {
                s3Status.textContent = '';
                s3Status.style.display = 'none';
            }
            show('error', e instanceof Error ? e.message : String(e));
        }
    });
    mainEl.querySelector('#studio-svc-s3-copy-url')?.addEventListener('click', async () => {
        const v = (s3ResultUrl?.value || '').trim();
        if (!v) return;
        const ok = await copyToClipboard(v);
        show(ok ? 'ok' : 'error', ok ? 'Copied public URL.' : 'Copy failed.');
    });
}

function initSettings(mainEl) {
    const ds = mainEl.querySelector('#studio-set-datasource');
    const net = mainEl.querySelector('#studio-set-network');
    const rTest = mainEl.querySelector('#studio-ds-test');
    const rLive = mainEl.querySelector('#studio-ds-live');

    const sync = () => {
        const src = getDataSource();
        if (ds) ds.textContent = src;
        if (rTest) rTest.checked = src === 'test';
        if (rLive) rLive.checked = src === 'live';
    };

    sync();
    rTest?.addEventListener('change', () => {
        if (rTest.checked) setDataSource('test');
        sync();
    });
    rLive?.addEventListener('change', () => {
        if (rLive.checked) setDataSource('live');
        sync();
    });
    window.addEventListener('fusion-data-source-change', sync);

    import('../../config.js').then((cfg) => {
        if (net) net.textContent = cfg.DEV_MODE ? 'devMode true (local / fetch root key)' : 'devMode false (icp-api.io)';
    });
}
