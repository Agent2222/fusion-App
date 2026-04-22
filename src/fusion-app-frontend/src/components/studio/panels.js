/**
 * Studio section panels: dashboard + all sidebar tabs (data via database.js).
 */
import { DEV_MODE, getPublicSiteOrigin } from '../../config.js';
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
    deleteArtistByIdStudio,
    adminUpsertUserAccountStudio,
    getAccountsForStudio,
    getApplicants,
    getArtists,
    getArtistsForStudio,
    loadArtistForStudioEdit,
    getDashboardMetrics,
    getDataSource,
    getContentBundleForStudio,
    getEditions,
    getJournalEntries,
    getJournalEntryForStudio,
    getProgramRecordForStudio,
    getPrograms,
    getApplicationPaymentGlobal,
    getCurrentProgramSeason,
    setApplicationPaymentGlobal,
    setCurrentProgramSeason,
    setArtistMostRecentProgram,
    applyFeaturedFlagsFromStudioSaveLive,
    setManualFeaturedForArtistStudio,
    setFeaturableForArtistStudio,
    setRandomFeaturedModeStudio,
    getSubscribers as loadSubscribersFromDataSource,
    getSubscribersCsv,
    setDataSource,
    upsertApplicantStudio,
    deleteApplicantStudio,
    studioReinterpretWithPrompt,
    upsertEditionStudio,
    upsertJournalStudio,
    upsertProgramStudio,
    normalizeProgramVisibility,
    upsertSubscriberRow,
    saveArtistTestOverlayJson,
    studioTranslateEnToJa,
    syncStudioArtistsLegacyHeroImages,
    syncStudioArtistsLegacyIntroGalleries,
    upsertContentPageStudio,
    generateAndUpsertArtistWorldFromBio,
} from '../../utils/database.js';
import { STUDIO_WORLD_BATCH_MAX } from '../../utils/studioArtistWorldLlm.js';
import { parseSubscriberCsv } from '../../utils/csvParse.js';
import {
    editorTextToObjectLocale,
    localeValueToEditorText,
} from '../../utils/studioLocaleEdit.js';
import {
    applicantPayloadToPlainNotes,
    applyJournalPlainLocales,
    journalLocalesToPlain,
    plainNotesToApplicantPayload,
    shortPrincipalDisplay,
    shortRefLabel,
} from '../../utils/studioPlainForms.js';
import { MAX_MANUAL_FEATURED, readArtistFeaturedMeta } from '../../utils/artistFeaturedExtension.js';
import { LEGACY_PROFILE_BASE } from '../../utils/studioLegacyProfileUrls.js';
import { openStudioModal } from '../../utils/studioModal.js';
import {
    createPaymentIntent,
    fetchIntegrationHealth,
    fetchStripeSubscriptionStatusByEmail,
    getIntegrationBaseUrl,
    getStoredBillingEmailForPrincipal,
    sendEmail,
    studioStripeCheckEmailStorageKey,
    syncSubscriptionFromStripe,
    syncSubscriptionFromStripeByEmail,
} from '../../utils/integrationApi.js';
import { uploadBlobToS3 } from '../../utils/studioS3Upload.js';
import {
    renderContent,
    initContent,
    renderHome,
    initHome,
    loadStudioContentEditorPayload,
    persistStudioContentPage,
    attachStudioContentFileUpload,
} from './sections/contentSection.js';
import { getFieldKind, getFieldKindBadgeLabel } from '../../utils/studioFieldRegistry.js';
import { appendContentLocalePairRow } from './studioFieldRender.js';
import { shoutHtmlToPlain } from '../../utils/shoutHeadlineText.js';
import {
    bindStudioProgGalleryUrlPreviews,
    collectProgramLocalesFromForm,
    renderProgramLocaleFormHtml,
} from '../../utils/studioProgramLocaleForm.js';
import {
    STUDIO_WORLD_TO_NEW_PATHS,
    collectArtistRecordFromForm,
    initArtistManageTabs,
    renderArtistManageModalHtml,
} from '../../utils/studioArtistForm.js';
import { collectAccessCodesFromArtists, normalizeArtistImportRow } from '../../utils/studioBatchImport.js';
import { initArtistProgramsTab } from '../../utils/studioArtistPrograms.js';
import {
    LS_APPLICATION_ADMIN_EMAILS,
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
 * Sidebar sections (excluding `#dashboard`). Default landing `#dashboard`.
 * @type {{ id: string, label: string }[]}
 */
export const STUDIO_NAV = [
    { id: 'home', label: 'Home' },
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
        case 'home':
            return renderHome();
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
                            <th>Profile</th>
                            <th class="studio-th-actions">View</th>
                            <th class="studio-th-actions">Email</th>
                            <th class="studio-th-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="studio-applicants-tbody"><tr><td colspan="9">Loading…</td></tr></tbody>
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
            <div class="studio-artists-shout-block" style="margin:0.75rem 0 1rem">
                <p class="studio-muted" style="margin:0 0 0.5rem">Public <strong>/artists</strong> page — headline above the featured strip (plain text; line breaks preserved). Also listed under <strong>Content</strong>.</p>
                <div id="studio-artists-shout-fields" class="studio-content-fields"></div>
                <div class="studio-toolbar-actions" style="margin-top:0.65rem">
                    <button type="button" class="studio-btn-primary" id="studio-artists-shout-save">Save shout headline</button>
                </div>
                <p id="studio-artists-shout-msg" class="studio-banner studio-banner--info" style="display:none;margin-top:0.5rem" role="status"></p>
            </div>
            <div class="studio-artists-world-batch" style="margin:0 0 1rem">
                <p class="studio-muted" style="margin:0 0 0.5rem">
                    Generate <strong>Kamauu-style</strong> world copy (micro-bio, perspective, vision, constructing, context, quote) from English bio/discipline via the canister LLM. Japanese locales are filled by translation.
                </p>
                <button type="button" class="studio-btn-secondary" id="studio-artists-world-batch-open">Generate world from bio (batch)…</button>
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
                            <th>Recent program</th>
                            <th>Public profile</th>
                            <th class="studio-td-actions">Manage</th>
                        </tr>
                    </thead>
                    <tbody id="studio-artists-tbody"><tr><td colspan="10">Loading…</td></tr></tbody>
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
                subtitle: 'Program records (Manage) — home block & page headline in the section below',
                countId: 'studio-programs-header-count',
                countLabel: 'programs',
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-programs-search',
                searchPlaceholder: 'Search id, focus, location, route…',
            })}
            <p class="studio-muted">Programs are <code>ProgramRecord</code> — locale fields include card copy and nested <code>programPage</code> (costs, details, FAQ) in the Manage dialog. Test mode uses <code>localStorage</code>.</p>
            <details class="studio-embed-block" open>
                <summary class="studio-subheading">Home block &amp; programs page copy</summary>
                <p class="studio-muted">Edit the all-programs block (card order and fields) and the <strong>/programs</strong> page headline from <code>site-info</code> (same storage as Studio → Home).</p>
                <div class="studio-toolbar-actions" style="margin:0.5rem 0;flex-wrap:wrap;gap:0.5rem">
                    <button type="button" class="studio-btn-primary" id="studio-programs-edit-block">Edit programs block</button>
                    <button type="button" class="studio-btn-ghost" id="studio-programs-edit-siteinfo">Edit programs page headline</button>
                </div>
                <div id="studio-programs-embed-editor" class="studio-content-editor" style="display:none;margin-top:12px">
                    <h3 class="studio-subheading" id="studio-programs-embed-title">Edit</h3>
                    <p id="studio-programs-embed-unsaved" class="studio-banner studio-banner--warn" style="display:none" role="status">You have unsaved changes.</p>
                    <div id="studio-programs-embed-fields" class="studio-content-fields studio-content-fields--scroll" style="max-height:min(50vh,28rem)"></div>
                    <div class="studio-toolbar-actions" style="margin-top:12px">
                        <button type="button" class="studio-btn-primary" id="studio-programs-embed-save">Save</button>
                        <button type="button" class="studio-btn-ghost" id="studio-programs-embed-cancel">Cancel</button>
                    </div>
                    <p id="studio-programs-embed-msg" class="studio-banner studio-banner--info" style="display:none"></p>
                </div>
            </details>
            <div class="studio-subscribers-toolbar">
                <button type="button" class="studio-btn-primary" id="studio-program-add">ADD PROGRAM</button>
                <button type="button" class="studio-btn-ghost" id="studio-programs-refresh">Refresh</button>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" accept="application/json,.json" id="studio-programs-batch-json" class="studio-file-input" />
                    Batch upload (JSON)
                </label>
                <label class="studio-field" style="display:inline-flex;align-items:center;flex-wrap:wrap;gap:0.4rem 0.65rem;margin-left:0.5rem">
                    <span class="studio-muted">Current season (program id)</span>
                    <input type="text" id="studio-programs-current-season" class="studio-input" placeholder="e.g. fusionKaga" autocomplete="off" style="min-width:11rem" />
                    <button type="button" class="studio-btn-ghost" id="studio-programs-current-season-save">Save</button>
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
                subtitle: 'Edition records (Manage) — grid JSON & page headline in the section below',
                countId: 'studio-products-header-count',
                countLabel: 'editions',
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-products-search',
                searchPlaceholder: 'Search id, title, href, status…',
            })}
            <p class="studio-muted studio-banner studio-banner--info">Editions here power the public <code>/editions</code> grid (<code>listEditions</code>). Home “Objects Highlights” uses Studio → <strong>Home</strong> → <strong>Objects highlight</strong> when that JSON includes an <code>objects</code> array; if it is empty or missing, the home block shows up to four of these edition records instead.</p>
            <details class="studio-embed-block" open>
                <summary class="studio-subheading">Editions grid &amp; editions page copy</summary>
                <p class="studio-muted">Structured grid items (often mirror Manage rows) and the <strong>/editions</strong> page headline from <code>site-info</code>.</p>
                <div class="studio-toolbar-actions" style="margin:0.5rem 0;flex-wrap:wrap;gap:0.5rem">
                    <button type="button" class="studio-btn-primary" id="studio-products-edit-grid">Edit editions grid</button>
                    <button type="button" class="studio-btn-ghost" id="studio-products-edit-siteinfo">Edit editions page headline</button>
                </div>
                <div id="studio-products-embed-editor" class="studio-content-editor" style="display:none;margin-top:12px">
                    <h3 class="studio-subheading" id="studio-products-embed-title">Edit</h3>
                    <p id="studio-products-embed-unsaved" class="studio-banner studio-banner--warn" style="display:none" role="status">You have unsaved changes.</p>
                    <div id="studio-products-embed-fields" class="studio-content-fields studio-content-fields--scroll" style="max-height:min(50vh,28rem)"></div>
                    <div class="studio-toolbar-actions" style="margin-top:12px">
                        <button type="button" class="studio-btn-primary" id="studio-products-embed-save">Save</button>
                        <button type="button" class="studio-btn-ghost" id="studio-products-embed-cancel">Cancel</button>
                    </div>
                    <p id="studio-products-embed-msg" class="studio-banner studio-banner--info" style="display:none"></p>
                </div>
            </details>
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
                subtitle: 'Journal entries — structured home list below or Studio → Home',
                countId: 'studio-journal-header-count',
                countLabel: 'entries',
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-journal-search',
                searchPlaceholder: 'Search title, id, link…',
            })}
            <details class="studio-embed-block" open>
                <summary class="studio-subheading">Journal home list &amp; journal page copy</summary>
                <p class="studio-muted">Order and entries on the home journal block plus the <strong>/journal</strong> page headline from <code>site-info</code>.</p>
                <div class="studio-toolbar-actions" style="margin:0.5rem 0;flex-wrap:wrap;gap:0.5rem">
                    <button type="button" class="studio-btn-primary" id="studio-journal-edit-block">Edit journal home list</button>
                    <button type="button" class="studio-btn-ghost" id="studio-journal-edit-siteinfo">Edit journal page headline</button>
                </div>
                <div id="studio-journal-embed-editor" class="studio-content-editor" style="display:none;margin-top:12px">
                    <h3 class="studio-subheading" id="studio-journal-embed-title">Edit</h3>
                    <p id="studio-journal-embed-unsaved" class="studio-banner studio-banner--warn" style="display:none" role="status">You have unsaved changes.</p>
                    <div id="studio-journal-embed-fields" class="studio-content-fields studio-content-fields--scroll" style="max-height:min(50vh,28rem)"></div>
                    <div class="studio-toolbar-actions" style="margin-top:12px">
                        <button type="button" class="studio-btn-primary" id="studio-journal-embed-save">Save</button>
                        <button type="button" class="studio-btn-ghost" id="studio-journal-embed-cancel">Cancel</button>
                    </div>
                    <p id="studio-journal-embed-msg" class="studio-banner studio-banner--info" style="display:none"></p>
                </div>
            </details>
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
            <p class="studio-muted">Internet Identity has <strong>no password</strong>. Use <strong>Manage</strong> on each row to update account status and manual membership exemption. Rich profile copy belongs in the future <strong>user profile</strong> dashboard.</p>
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
            <div class="studio-toolbar-actions studio-users-sync-toolbar" style="margin:0.5rem 0 0.75rem;flex-wrap:wrap;gap:0.5rem;align-items:center">
                <h3 class="studio-subheading" style="margin:0;width:100%">All accounts</h3>
                <button type="button" class="studio-btn-primary" id="studio-users-sync-all" aria-busy="false">
                    Sync subscriptions
                </button>
                <span id="studio-users-sync-msg" class="studio-muted" role="status"></span>
            </div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead><tr><th><span class="studio-sr-only">Health</span></th><th>Identity</th><th>Role</th><th>Status</th><th>Membership</th><th>Renews</th><th>Linked artist</th><th>Org</th><th>Updated</th><th class="studio-td-actions">Actions</th></tr></thead>
                    <tbody id="studio-users-tbody"><tr><td colspan="10">Loading…</td></tr></tbody>
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
                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-svc-tab-subscription" aria-selected="false" aria-controls="studio-svc-panel-subscription">Subscription</button>
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
                    <div id="studio-svc-panel-subscription" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-svc-tab-subscription" hidden>
                        <div class="studio-form-grid studio-services-grid studio-services-grid--panel">
                            <h3 class="studio-subheading studio-field--full">Application form — global “what’s included”</h3>
                            <p class="studio-muted studio-field--full">Stored in the canister as site setting <code>applicationPaymentGlobal</code> (admin write). Shown on every program application form, merged with per-program bullets under Programs → Payment option details.</p>
                            <label class="studio-field studio-field--full">
                                <span>English bullets (one per line)</span>
                                <textarea id="studio-svc-subscription-en" class="studio-input studio-textarea" rows="10" spellcheck="true" autocomplete="off"></textarea>
                            </label>
                            <label class="studio-field studio-field--full">
                                <span>日本語 bullets (1行に1つ)</span>
                                <textarea id="studio-svc-subscription-ja" class="studio-input studio-textarea" rows="10" spellcheck="true" autocomplete="off"></textarea>
                            </label>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-primary" id="studio-svc-subscription-save">Save</button>
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
                            <label class="studio-field studio-field--full">
                                <span>Additional application notification recipients</span>
                                <textarea id="studio-svc-application-admin-emails" class="studio-input studio-textarea-mono" rows="3" placeholder="extra1@example.com, extra2@example.com"></textarea>
                            </label>
                            <p class="studio-muted studio-field--full">
                                <code>info@fusionart.world</code> always receives new program-application notifications. Use the field above to add more staff addresses (comma or newline separated).
                            </p>
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
            <div id="studio-db-admin-tools" class="studio-db-admin-tools" hidden>
                <h3 class="studio-subheading">Admin — full database backup</h3>
                <p class="studio-muted">
                    Download or restore the entire Fusion backend state (subscribers, accounts, artists, programs, settings, etc.).
                    Restore is destructive and replaces the live canister data in one update.
                </p>
                <p class="studio-muted studio-db-admin-tools__warn">
                    <strong>Warning:</strong> Keep backups safe. A bad restore can lock you out if the JSON does not include your admin principal.
                    Internet Computer ingress limits apply — very large datasets may fail; use a dedicated migration if needed.
                </p>
                <div class="studio-field-row studio-db-admin-tools__actions">
                    <button type="button" class="studio-btn-primary" id="studio-db-download">Download full database (JSON)</button>
                    <input type="file" id="studio-db-restore-file" accept="application/json,.json" class="studio-file-input-hidden" aria-label="Choose backup JSON file" />
                    <button type="button" class="studio-btn-ghost" id="studio-db-restore-pick">Choose backup file…</button>
                    <button type="button" class="studio-btn-ghost" id="studio-db-restore-run" disabled>Restore from file</button>
                </div>
                <p id="studio-db-admin-status" class="studio-muted" role="status" aria-live="polite"></p>
            </div>
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

/** @param {string | undefined} st */
function studioMembershipStatusLabel(st) {
    const s = String(st || '').toLowerCase();
    if (!s) return 'No subscription';
    const map = {
        active: 'Active',
        trialing: 'Trialing',
        past_due: 'Past due',
        canceled: 'Canceled',
        unpaid: 'Unpaid',
        incomplete: 'Incomplete',
        incomplete_expired: 'Incomplete (expired)',
        paused: 'Paused',
    };
    return map[s] || String(st);
}

/** @param {{ membershipExemptManual?: boolean, stripeSubscriptionStatus?: string }} row */
function studioMembershipDotClass(row) {
    if (row.membershipExemptManual) return 'studio-user-sub-dot--ok';
    const s = String(row.stripeSubscriptionStatus || '').toLowerCase();
    if (s === 'active' || s === 'trialing') return 'studio-user-sub-dot--ok';
    return 'studio-user-sub-dot--err';
}

/** Canister row shows paid access (active/trialing) or manual exempt. */
function studioRowCanisterPaid(row) {
    if (!row || typeof row !== 'object') return false;
    if (row.membershipExemptManual) return true;
    const s = String(row.stripeSubscriptionStatus || '').toLowerCase();
    return s === 'active' || s === 'trialing';
}

/**
 * @param {string | undefined} customerId
 * @param {string | undefined} publishableKey
 */
function studioStripeDashboardCustomerUrl(customerId, publishableKey) {
    const cid = String(customerId || '').trim();
    if (!cid.startsWith('cus_')) return '';
    const pk = String(publishableKey || '');
    const isTest = pk.startsWith('pk_test_');
    const base = isTest ? 'https://dashboard.stripe.com/test' : 'https://dashboard.stripe.com';
    return `${base}/customers/${encodeURIComponent(cid)}`;
}

/** @param {string | undefined} reason */
function studioCanisterIntegrationNotConfiguredHint() {
    return ' On the host running fusion-integration-api, set FUSION_BACKEND_CANISTER_ID, INTEGRATION_IC_IDENTITY_PEM (or _JSON), and IC_HOST (https://ic0.app for mainnet), then restart. GET /health should show fusionCanister: configured. As admin, call adminSetIntegrationServicePrincipal with the principal of that PEM identity. See services/fusion-integration-api/README.md.';
}

/** @param {string | undefined} reason */
function studioSyncFailureExtraHint(reason) {
    const r = String(reason || '');
    if (/canister integration not configured/i.test(r)) {
        return studioCanisterIntegrationNotConfiguredHint();
    }
    if (/\b404\b|not found|cannot post|cannot get/i.test(r)) {
        return ' Redeploy fusion-integration-api with POST /stripe/sync-subscription-by-email (see services/fusion-integration-api/README.md).';
    }
    return '';
}

/**
 * @param {{ synced?: boolean; reason?: string } | undefined} emailRes
 * @param {{ synced?: boolean; reason?: string } | undefined} principalRes
 */
function formatSyncAttempts(emailRes, principalRes) {
    const eOk = emailRes?.synced === true;
    const pOk = principalRes?.synced === true;
    const er = !eOk && emailRes?.reason ? String(emailRes.reason) : '';
    const pr = !pOk && principalRes?.reason ? String(principalRes.reason) : '';

    if (eOk && pOk) return 'Email sync: ok. Principal sync: ok.';

    if (er && pr && er === pr) {
        return `Sync failed (email + principal routes): ${er}.${studioSyncFailureExtraHint(er)}`;
    }

    const parts = [];
    if (eOk) parts.push('Email sync: ok.');
    else if (er) parts.push(`Email sync: ${er}.${studioSyncFailureExtraHint(er)}`);
    else if (getIntegrationBaseUrl()) parts.push('Email sync: no success (see console / integration logs).');

    if (pOk) parts.push('Principal sync: ok.');
    else if (pr) {
        parts.push(`Principal sync: ${pr}${studioSyncFailureExtraHint(pr)}`);
    } else if (eOk) {
        parts.push('Principal sync: not attempted (email sync succeeded first).');
    } else if (getIntegrationBaseUrl()) {
        parts.push('Principal sync: no error detail (see console / integration logs).');
    }

    return parts.join(' ');
}

/** @param {string | undefined} iso */
function formatSubscriptionPeriodEnd(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(String(iso));
        if (Number.isNaN(d.getTime())) return '—';
        return d.toISOString().slice(0, 10);
    } catch {
        return '—';
    }
}

/**
 * @param {object[]} artists
 * @returns {Map<string, string>}
 */
function buildApplicantEmailToSlugMap(artists) {
    const m = new Map();
    for (const a of artists || []) {
        const slug = String(a.slug || '').trim();
        if (!slug) continue;
        const locs = a.locales && typeof a.locales === 'object' ? a.locales : null;
        if (!locs) continue;
        for (const code of ['en', 'ja']) {
            const b = locs[code];
            if (!b || typeof b !== 'object') continue;
            const raw = /** @type {Record<string, unknown>} */ (b);
            const em = String(raw.email ?? raw.contactEmail ?? '')
                .trim()
                .toLowerCase();
            if (em.includes('@')) m.set(em, slug);
        }
    }
    return m;
}

const STUDIO_APPLICANT_EMAIL_PRESETS = {
    schedule: {
        label: 'Schedule meeting',
        /** @param {{ fullName?: string, programId?: string }} r */
        body: (r) =>
            `Hello ${String(r.fullName || 'there').trim()},\n\nWe would like to schedule a meeting to discuss your application for program ${String(r.programId || '').trim()}.\n\nPlease reply with your availability.\n\n— Fusion`,
    },
    confirmation: {
        label: 'Send confirmation',
        /** @param {{ fullName?: string, programId?: string }} r */
        body: (r) =>
            `Hello ${String(r.fullName || 'there').trim()},\n\nThis confirms we have received your application for program ${String(r.programId || '').trim()}.\n\nWe will be in touch with next steps.\n\n— Fusion`,
    },
};

/**
 * @param {object} row
 */
function artistRowDisplayNameForBatch(row) {
    const en = row?.locales?.en;
    if (en && typeof en === 'object' && en.name != null && String(en.name).trim()) {
        return String(en.name).trim();
    }
    return String(row?.slug || row?.id || '').trim() || '—';
}

/**
 * Batch LLM world generator modal (pills + progress).
 * @param {HTMLElement} mainEl
 * @param {() => Promise<void>} reloadArtistsTable
 */
function wireArtistWorldBatchUI(mainEl, reloadArtistsTable) {
    const openBtn = mainEl.querySelector('#studio-artists-world-batch-open');
    if (!(openBtn instanceof HTMLButtonElement)) return;

    const syncLiveState = () => {
        const live = getDataSource() === 'live';
        openBtn.disabled = !live;
        openBtn.title = live ? '' : 'Requires live data source (IC LLM on canister).';
    };
    syncLiveState();
    window.addEventListener('fusion-data-source-change', syncLiveState);

    openBtn.addEventListener('click', async () => {
        /** @type {object[]} */
        let allArtists = [];
        try {
            allArtists = await getArtistsForStudio();
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            return;
        }
        const max = STUDIO_WORLD_BATCH_MAX;
        const notice =
            allArtists.length > max
                ? `<p class="studio-muted">Up to <strong>${max}</strong> artists per run. <strong>Select all</strong> stages the first ${max} in roster order (${allArtists.length} total).</p>`
                : `<p class="studio-muted">${allArtists.length} artist(s). Maximum <strong>${max}</strong> per run.</p>`;

        const pillsHtml = allArtists
            .map((row) => {
                const id = String(row.id ?? '').trim();
                const label = escapeHtml(artistRowDisplayNameForBatch(row));
                return `<button type="button" class="studio-world-batch-pill studio-world-batch-pill--idle" data-artist-id="${escapeHtml(id)}">${label}</button>`;
            })
            .join('');

        const inner = `
${notice}
<label class="studio-field studio-field--row" style="margin:0.75rem 0;align-items:center;gap:0.5rem">
<input type="checkbox" id="studio-world-batch-overwrite" />
<span>Overwrite existing world fields (otherwise only fill empty fields)</span>
</label>
<div class="studio-world-batch-actions">
<button type="button" class="studio-btn-ghost" id="studio-world-batch-select-all">Select all (up to ${max})</button>
<button type="button" class="studio-btn-ghost" id="studio-world-batch-clear">Clear selection</button>
</div>
<div class="studio-world-batch-pills" id="studio-world-batch-pills">${pillsHtml}</div>
<div class="studio-world-batch-progress" id="studio-world-batch-progress" hidden>
<div class="studio-world-batch-progress-track" aria-hidden="true"><div class="studio-world-batch-progress-bar" id="studio-world-batch-progress-bar"></div></div>
<span class="studio-muted studio-world-batch-progress-label" id="studio-world-batch-progress-label">0 / 0</span>
</div>
<p class="studio-banner studio-banner--error" id="studio-world-batch-run-error" style="display:none;margin-top:0.5rem" role="alert"></p>
<div class="studio-modal-actions" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #e2e8f0">
<button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
<button type="button" class="studio-btn-primary" id="studio-world-batch-run" disabled>Run</button>
</div>`;

        const { root } = openStudioModal(inner, {
            title: 'Generate world from bio (batch)',
            wide: true,
        });

        const byId = new Map(allArtists.map((r) => [String(r.id), r]));
        /** @type {Set<string>} */
        const staged = new Set();
        const maxSel = max;

        const pillsRoot = root.querySelector('#studio-world-batch-pills');
        const runBtn = root.querySelector('#studio-world-batch-run');
        const progressEl = root.querySelector('#studio-world-batch-progress');
        const progressBar = root.querySelector('#studio-world-batch-progress-bar');
        const progressLabel = root.querySelector('#studio-world-batch-progress-label');
        const runErr = root.querySelector('#studio-world-batch-run-error');

        /** @param {string} id */
        function findPill(id) {
            for (const b of pillsRoot?.querySelectorAll('button[data-artist-id]') ?? []) {
                if (b.getAttribute('data-artist-id') === id) return b;
            }
            return null;
        }

        /**
         * @param {string} id
         * @param {'idle' | 'staged' | 'ok' | 'err'} state
         * @param {string} [errMsg]
         */
        function setPillState(id, state, errMsg) {
            const pill = findPill(id);
            if (!(pill instanceof HTMLButtonElement)) return;
            pill.classList.remove(
                'studio-world-batch-pill--idle',
                'studio-world-batch-pill--staged',
                'studio-world-batch-pill--ok',
                'studio-world-batch-pill--err',
            );
            pill.classList.add(`studio-world-batch-pill--${state}`);
            pill.title = state === 'err' ? errMsg || 'Error' : '';
            if (state === 'idle') pill.removeAttribute('title');
        }

        function updateRunEnabled() {
            if (runBtn instanceof HTMLButtonElement) runBtn.disabled = staged.size === 0;
        }

        pillsRoot?.querySelectorAll('.studio-world-batch-pill').forEach((pill) => {
            pill.addEventListener('click', () => {
                const id = pill.getAttribute('data-artist-id');
                if (!id) return;
                if (staged.has(id)) {
                    staged.delete(id);
                    setPillState(id, 'idle');
                } else if (staged.size >= maxSel) {
                    alert(`At most ${maxSel} artists per run.`);
                } else {
                    staged.add(id);
                    setPillState(id, 'staged');
                }
                updateRunEnabled();
            });
        });

        root.querySelector('#studio-world-batch-select-all')?.addEventListener('click', () => {
            staged.clear();
            pillsRoot?.querySelectorAll('.studio-world-batch-pill').forEach((p) => {
                const id = p.getAttribute('data-artist-id');
                if (id) setPillState(id, 'idle');
            });
            let n = 0;
            for (const row of allArtists) {
                const id = String(row.id ?? '').trim();
                if (!id || n >= maxSel) break;
                staged.add(id);
                setPillState(id, 'staged');
                n += 1;
            }
            updateRunEnabled();
        });

        root.querySelector('#studio-world-batch-clear')?.addEventListener('click', () => {
            staged.clear();
            pillsRoot?.querySelectorAll('.studio-world-batch-pill').forEach((p) => {
                const id = p.getAttribute('data-artist-id');
                if (id) setPillState(id, 'idle');
            });
            updateRunEnabled();
        });

        runBtn?.addEventListener('click', async () => {
            const ow = root.querySelector('#studio-world-batch-overwrite');
            const overwrite = ow instanceof HTMLInputElement && ow.checked;
            const mode = overwrite ? 'overwrite' : 'fillEmpty';
            if (runErr instanceof HTMLElement) {
                runErr.style.display = 'none';
                runErr.textContent = '';
            }
            if (progressEl instanceof HTMLElement) progressEl.hidden = false;
            const ids = [...staged];
            let done = 0;
            const total = ids.length;
            if (progressLabel) progressLabel.textContent = `0 / ${total}`;
            if (progressBar instanceof HTMLElement) progressBar.style.width = total ? '0%' : '100%';
            if (runBtn instanceof HTMLButtonElement) runBtn.disabled = true;

            for (const id of ids) {
                const row = byId.get(id);
                if (!row) {
                    setPillState(id, 'err', 'Row missing');
                    done += 1;
                    if (progressLabel) progressLabel.textContent = `${done} / ${total}`;
                    if (progressBar instanceof HTMLElement) {
                        progressBar.style.width = total ? `${(done / total) * 100}%` : '100%';
                    }
                    continue;
                }
                try {
                    await generateAndUpsertArtistWorldFromBio(row, mode);
                    setPillState(id, 'ok');
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    setPillState(id, 'err', msg);
                    if (runErr instanceof HTMLElement) {
                        runErr.style.display = 'block';
                        runErr.textContent = msg;
                    }
                }
                done += 1;
                if (progressLabel) progressLabel.textContent = `${done} / ${total}`;
                if (progressBar instanceof HTMLElement) {
                    progressBar.style.width = total ? `${(done / total) * 100}%` : '100%';
                }
            }
            if (runBtn instanceof HTMLButtonElement) runBtn.disabled = false;
            await reloadArtistsTable();
        });

        updateRunEnabled();
    });
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
    home: initHome,
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
    /** @type {Map<string, string>} */
    let applicantEmailToSlug = new Map();

    let canDeleteApplicants = false;
    if (getDataSource() === 'test') {
        canDeleteApplicants = true;
    } else {
        try {
            const { getStudioAuthenticatedActor } = await import('../../utils/studioAuth.js');
            const actor = await getStudioAuthenticatedActor();
            if (actor && typeof actor.isCallerAdmin === 'function') {
                canDeleteApplicants = await actor.isCallerAdmin();
            }
        } catch {
            /* ignore */
        }
    }

    if (banner) {
        let base =
            getDataSource() === 'test'
                ? 'Test mode uses saved applicants on this browser. Open a row to change status or notes.'
                : 'Live canister — listApplicants (staff/admin). Open a row to edit.';
        if (getDataSource() !== 'test' && !canDeleteApplicants) {
            base += ' Only admins can delete applicant records.';
        }
        banner.textContent = base;
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
            tbody.innerHTML = `<tr><td colspan="9">${allRows.length ? 'No applicants match filters.' : 'No applicants.'}</td></tr>`;
        } else {
            const origin = getPublicSiteOrigin();
            const delBtn = (id) =>
                canDeleteApplicants
                    ? `<td class="studio-td-actions"><button type="button" class="studio-btn-danger studio-app-delete" data-id="${escapeHtml(id)}">Delete</button></td>`
                    : '<td class="studio-td-actions">—</td>';
            tbody.innerHTML = slice
                .map((r) => {
                    const em = String(r.email || '')
                        .trim()
                        .toLowerCase();
                    const slug = em ? applicantEmailToSlug.get(em) : '';
                    const profileCell = slug
                        ? `<a href="${escapeHtml(`${origin}/profile/${encodeURIComponent(slug)}`)}" target="_blank" rel="noopener noreferrer" class="studio-app-profile-link">/${escapeHtml(slug)}</a>`
                        : '<span class="studio-muted">—</span>';
                    return `
        <tr class="studio-app-row" data-id="${escapeHtml(r.id)}" tabindex="0" role="button">
            <td>${escapeHtml(r.email)}</td>
            <td>${escapeHtml(r.fullName || '')}</td>
            <td>${escapeHtml(r.programId)}</td>
            <td>${applicantStatusPillHtml(r.status)}</td>
            <td>${escapeHtml(r.createdAt)}</td>
            <td>${profileCell}</td>
            <td class="studio-td-actions"><button type="button" class="studio-btn-ghost studio-app-view" data-id="${escapeHtml(r.id)}">View</button></td>
            <td class="studio-td-actions"><button type="button" class="studio-btn-ghost studio-app-email" data-id="${escapeHtml(r.id)}">Send email</button></td>
            ${delBtn(r.id)}
        </tr>`;
                })
                .join('');
            tbody.querySelectorAll('.studio-app-row').forEach((tr) => {
                const openEdit = () => openApplicantModal(tr.getAttribute('data-id'));
                tr.addEventListener('click', (ev) => {
                    const t = ev.target && /** @type {Element} */ (ev.target).closest?.(
                        '.studio-app-delete, .studio-app-view, .studio-app-email, .studio-app-profile-link',
                    );
                    if (t) {
                        ev.preventDefault();
                        return;
                    }
                    openEdit();
                });
                tr.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') openEdit();
                });
            });
            tbody.querySelectorAll('.studio-app-view').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    if (id) openApplicantViewModal(id);
                });
            });
            tbody.querySelectorAll('.studio-app-email').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    if (id) openApplicantEmailModal(id);
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

    const openApplicantViewModal = (id) => {
        const r = allRows.find((x) => x.id === id);
        if (!r) return;
        let payloadPretty = String(r.payloadJson || '').trim();
        try {
            const o = JSON.parse(payloadPretty);
            payloadPretty = JSON.stringify(o, null, 2);
        } catch {
            /* raw */
        }
        const body = `
          <div class="studio-modal-form">
            <p><strong>Email:</strong> ${escapeHtml(r.email)}</p>
            <p><strong>Name:</strong> ${escapeHtml(r.fullName || '—')}</p>
            <p><strong>Program:</strong> ${escapeHtml(r.programId)}</p>
            <p><strong>Status:</strong> ${applicantStatusPillHtml(r.status)}</p>
            <p><strong>Created:</strong> ${escapeHtml(r.createdAt)}</p>
            <label class="studio-field studio-field--full"><span>Application payload (read-only)</span>
              <textarea class="studio-textarea studio-textarea-mono" rows="16" readonly spellcheck="false">${escapeHtml(payloadPretty)}</textarea>
            </label>
          </div>`;
        openStudioModal(body, { title: 'View application', wide: true });
    };

    const openApplicantEmailModal = (id) => {
        const r = allRows.find((x) => x.id === id);
        if (!r) return;
        const body = `
          <div class="studio-modal-form">
            <p class="studio-muted">To: <strong>${escapeHtml(r.email)}</strong></p>
            <label class="studio-field studio-field--full"><span>Category</span>
              <select id="studio-app-email-category" class="studio-select">
                <option value="schedule">${escapeHtml(STUDIO_APPLICANT_EMAIL_PRESETS.schedule.label)}</option>
                <option value="confirmation">${escapeHtml(STUDIO_APPLICANT_EMAIL_PRESETS.confirmation.label)}</option>
              </select>
            </label>
            <label class="studio-field studio-field--full"><span>Message</span>
              <textarea id="studio-app-email-body" class="studio-textarea" rows="12" spellcheck="true"></textarea>
            </label>
            <button type="button" class="studio-btn-primary" id="studio-app-email-send">Send</button>
            <p id="studio-app-email-msg" class="studio-banner studio-banner--info" style="display:none;margin-top:0.75rem" role="status"></p>
          </div>`;
        const { close, root } = openStudioModal(body, {
            title: `Send email — ${escapeHtml(r.email)}`,
            wide: true,
        });
        const cat = root.querySelector('#studio-app-email-category');
        const ta = root.querySelector('#studio-app-email-body');
        const msg = root.querySelector('#studio-app-email-msg');
        const applyPreset = () => {
            const k = cat instanceof HTMLSelectElement ? cat.value : 'schedule';
            const preset = STUDIO_APPLICANT_EMAIL_PRESETS[k] || STUDIO_APPLICANT_EMAIL_PRESETS.schedule;
            if (ta instanceof HTMLTextAreaElement) ta.value = preset.body(r);
        };
        applyPreset();
        cat?.addEventListener('change', applyPreset);
        root.querySelector('#studio-app-email-send')?.addEventListener('click', async () => {
            if (!getIntegrationBaseUrl()) {
                if (msg) {
                    msg.style.display = 'block';
                    msg.className = 'studio-banner studio-banner--warn';
                    msg.textContent = 'Integration API URL is not configured.';
                }
                return;
            }
            const text = ta instanceof HTMLTextAreaElement ? ta.value.trim() : '';
            if (!text) {
                if (msg) {
                    msg.style.display = 'block';
                    msg.className = 'studio-banner studio-banner--warn';
                    msg.textContent = 'Message is empty.';
                }
                return;
            }
            const subject = `[Fusion] Program application — ${String(r.programId || '').trim()}`;
            try {
                await sendEmail({ to: r.email, subject, text });
                if (msg) {
                    msg.style.display = 'block';
                    msg.className = 'studio-banner studio-banner--info';
                    msg.textContent = 'Sent.';
                }
                close();
            } catch (e) {
                if (msg) {
                    msg.style.display = 'block';
                    msg.className = 'studio-banner studio-banner--warn';
                    msg.textContent = e instanceof Error ? e.message : String(e);
                }
            }
        });
    };

    const openApplicantModal = (id) => {
        const r = allRows.find((x) => x.id === id);
        if (!r) return;
        const notesPlain = applicantPayloadToPlainNotes(r.payloadJson);
        const deleteBlock = canDeleteApplicants
            ? `<div class="studio-modal-actions studio-modal-actions--applicant-delete">
            <button type="button" class="studio-btn-danger" id="studio-app-modal-delete">Delete applicant</button>
          </div>`
            : '';
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
            ${deleteBlock}
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
        root.querySelector('#studio-app-modal-delete')?.addEventListener('click', async () => {
            if (
                !confirm(
                    `Delete applicant ${r.email} (${shortRefLabel(r.id)})? This cannot be undone.`,
                )
            ) {
                return;
            }
            try {
                const ok = await deleteApplicantStudio(r.id);
                if (!ok) {
                    alert(
                        'Delete failed — the record may be read-only, or your admin session may have expired.',
                    );
                    return;
                }
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
        try {
            const artists = await getArtistsForStudio();
            applicantEmailToSlug = buildApplicantEmailToSlugMap(artists);
        } catch {
            applicantEmailToSlug = new Map();
        }
        renderPage();
    };

    tbody?.addEventListener('click', async (e) => {
        const btn = e.target && /** @type {Element} */ (e.target).closest?.('.studio-app-delete');
        if (!btn || !tbody.contains(btn)) return;
        e.stopPropagation();
        if (!canDeleteApplicants) return;
        const id = btn.getAttribute('data-id');
        if (!id) return;
        const row = allRows.find((x) => x.id === id);
        const label = row ? `${row.email} (${shortRefLabel(id)})` : id;
        if (!confirm(`Delete applicant ${label}? This cannot be undone.`)) return;
        try {
            const ok = await deleteApplicantStudio(id);
            if (!ok) {
                alert(
                    'Delete failed — the record may be read-only, or your admin session may have expired.',
                );
                return;
            }
            await reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
        }
    });

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
                const r = await setManualFeaturedForArtistStudio(id, cb.checked);
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
                await setFeaturableForArtistStudio(id, cb.checked);
                await load();
            });
        });
        tbody.querySelectorAll('.studio-art-mrp').forEach((inp) => {
            inp.addEventListener('blur', async () => {
                if (!(inp instanceof HTMLInputElement)) return;
                const id = inp.getAttribute('data-id');
                if (!id) return;
                const row = allArtists.find((x) => String(x.id) === String(id));
                const prev = row ? String(row.mostRecentProgram ?? '').trim() : '';
                const next = inp.value.trim();
                if (next === prev) return;
                try {
                    await setArtistMostRecentProgram(id, next);
                    if (row) row.mostRecentProgram = next;
                    if (banner) {
                        banner.className = 'studio-banner studio-banner--ok';
                        banner.textContent = `Saved most recent program for ${id}.`;
                    }
                } catch (e) {
                    inp.value = prev;
                    if (banner) {
                        banner.className = 'studio-banner studio-banner--error';
                        banner.textContent = e instanceof Error ? e.message : String(e);
                    }
                }
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
            const hay = `${a.slug} ${a.id} ${a.visibility} ${a.featuredOrder} ${a.mostRecentProgram ?? ''}`.toLowerCase();
            return hay.includes(q);
        });
        if (countEl) countEl.textContent = String(q || quickFilter !== 'all' ? artists.length : allArtists.length);
        if (!artists.length) {
            tbody.innerHTML = `<tr><td colspan="10">${allArtists.length ? 'No rows match filters.' : 'No artists.'}</td></tr>`;
            return;
        }
        tbody.innerHTML = artists
            .map((a) => {
                const slugRaw = String(a.slug || '');
                const slug = escapeHtml(slugRaw);
                const imp = a.imported ? 'Yes' : '—';
                const code = a.accessCode ? escapeHtml(String(a.accessCode)) : '—';
                const idEsc = escapeHtml(String(a.id || ''));
                const mrpVal = escapeHtml(String(a.mostRecentProgram ?? ''));
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
                <td><input type="text" class="studio-input studio-art-mrp" data-id="${idEsc}" value="${mrpVal}" placeholder="Program id" aria-label="Most recent program" /></td>
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
            void initArtistProgramsTab(root, full);

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
                        raw.featuredOrder = await applyFeaturedFlagsFromStudioSaveLive(String(full.id), {
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

            root.querySelector('#studio-art-delete')?.addEventListener('click', async () => {
                const id = String(full.id ?? '').trim();
                if (!id) return;
                const label = String(full.slug ?? id);
                if (
                    !confirm(
                        `Delete artist "${label}" permanently?\n\nLinked member accounts will be unlinked and set to pending. This cannot be undone.`
                    )
                ) {
                    return;
                }
                try {
                    await deleteArtistByIdStudio(id);
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
            banner.textContent = `Data source: ${getDataSource()} — ${getDataSource() === 'test' ? 'testData + Studio overlay (localStorage)' : 'canister (artists + featured strip state)'}`;
        }
        allArtists = await getArtistsForStudio();
        const rnd = mainEl.querySelector('#studio-artists-random-featured');
        if (rnd instanceof HTMLInputElement) {
            if (getDataSource() === 'test') {
                rnd.checked = readArtistFeaturedMeta().randomFeatured;
            } else {
                try {
                    const actor = await getFusionBackendActor();
                    if (typeof actor.getArtistFeaturedGalleryPublic === 'function') {
                        const g = await actor.getArtistFeaturedGalleryPublic();
                        rnd.checked = g?.randomFeatured === true;
                    } else {
                        rnd.checked = readArtistFeaturedMeta().randomFeatured;
                    }
                } catch {
                    rnd.checked = readArtistFeaturedMeta().randomFeatured;
                }
            }
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

    /** @param {{ hero?: boolean }} [opts] */
    const runLegacySync = async (label, fn, opts = {}) => {
        const isHeroSync = opts.hero === true;
        if (!banner) return;
        banner.className = 'studio-banner studio-banner--info';
        banner.textContent = `${label}…`;
        try {
            const n = await fn();
            banner.className = 'studio-banner studio-banner--ok';
            if (n > 0) {
                banner.textContent = isHeroSync
                    ? `${label}: cleared all profile hero images and set legacy URLs for ${n} artist(s). Upload matching files to S3 under uploads/legacyProfiles/ if needed.`
                    : `${label}: updated ${n} artist(s). Upload matching files to S3 under uploads/legacyProfiles/ if needed.`;
            } else {
                banner.textContent = isHeroSync
                    ? `${label}: no artists in roster.`
                    : `${label}: no artists needed updates (already have URLs or gallery).`;
            }
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
            ? 'This clears every artist’s profile hero image, then sets each to the legacy S3 URL below (all roster artists). Matching files should exist on S3 (or URLs will 404 until uploaded). Temporary tool — see docs/delete-later.md.'
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
            void runLegacySync(
                title,
                isHero ? syncStudioArtistsLegacyHeroImages : syncStudioArtistsLegacyIntroGalleries,
                isHero ? { hero: true } : {}
            );
        });
    };

    mainEl.querySelector('#studio-artists-sync-hero')?.addEventListener('click', () => {
        openLegacySyncConfirm('hero');
    });
    mainEl.querySelector('#studio-artists-sync-gallery')?.addEventListener('click', () => {
        openLegacySyncConfirm('gallery');
    });

    const shoutFields = mainEl.querySelector('#studio-artists-shout-fields');
    const shoutSave = mainEl.querySelector('#studio-artists-shout-save');
    const shoutMsg = mainEl.querySelector('#studio-artists-shout-msg');

    const showShoutMsg = (kind, text) => {
        if (!(shoutMsg instanceof HTMLElement)) return;
        if (!text) {
            shoutMsg.style.display = 'none';
            shoutMsg.textContent = '';
            return;
        }
        shoutMsg.style.display = 'block';
        shoutMsg.className = `studio-banner studio-banner--${kind}`;
        shoutMsg.textContent = text;
    };

    const loadArtistsShoutFields = async () => {
        if (!shoutFields) return;
        const bundle = await getContentBundleForStudio('artists-page', { forStudio: true });
        const b =
            bundle && typeof bundle === 'object'
                ? /** @type {Record<string, unknown>} */ (bundle)
                : { en: {}, ja: {} };
        const en = b.en && typeof b.en === 'object' ? /** @type {Record<string, unknown>} */ (b.en) : {};
        const ja = b.ja && typeof b.ja === 'object' ? /** @type {Record<string, unknown>} */ (b.ja) : {};
        const enPlain =
            typeof en.shoutText === 'string'
                ? String(en.shoutText).replace(/\r\n/g, '\n')
                : shoutHtmlToPlain(String(en.shoutHtml ?? ''));
        const jaPlain =
            typeof ja.shoutText === 'string'
                ? String(ja.shoutText).replace(/\r\n/g, '\n')
                : shoutHtmlToPlain(String(ja.shoutHtml ?? ''));
        shoutFields.replaceChildren();
        appendContentLocalePairRow(
            shoutFields,
            'artists-page',
            {
                path: 'en.shoutText',
                label: 'Shout headline',
                value: enPlain,
            },
            {
                path: 'ja.shoutText',
                label: 'Shout headline',
                value: jaPlain,
            },
            {
                markDirty: () => {},
                translateEnToJa: (text) => studioTranslateEnToJa(text),
            }
        );
    };

    shoutSave?.addEventListener('click', async () => {
        if (!(shoutFields instanceof HTMLElement)) return;
        const enTa = shoutFields.querySelector('[data-path="en.shoutText"]');
        const jaTa = shoutFields.querySelector('[data-path="ja.shoutText"]');
        const enVal = enTa instanceof HTMLTextAreaElement ? enTa.value : '';
        const jaVal = jaTa instanceof HTMLTextAreaElement ? jaTa.value : '';
        if (shoutSave instanceof HTMLButtonElement) shoutSave.disabled = true;
        showShoutMsg('info', 'Saving…');
        try {
            await upsertContentPageStudio('artists-page', {
                en: { shoutText: enVal },
                ja: { shoutText: jaVal },
            });
            showShoutMsg('ok', 'Saved. Public /artists page will pick up changes after refresh or navigation.');
        } catch (e) {
            showShoutMsg('error', e instanceof Error ? e.message : String(e));
        } finally {
            if (shoutSave instanceof HTMLButtonElement) shoutSave.disabled = false;
        }
    });

    await loadArtistsShoutFields();

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

    mainEl.querySelector('#studio-artists-random-featured')?.addEventListener('change', async (e) => {
        const t = e.target;
        if (t instanceof HTMLInputElement) {
            try {
                await setRandomFeaturedModeStudio(t.checked);
                if (banner) {
                    banner.className = 'studio-banner studio-banner--ok';
                    banner.textContent = t.checked
                        ? `Random featured: up to ${MAX_MANUAL_FEATURED} featurable artists per home load.`
                        : 'Manual featured list drives the home strip (max 8).';
                }
            } catch (err) {
                t.checked = !t.checked;
                if (banner) {
                    banner.className = 'studio-banner studio-banner--error';
                    banner.textContent = err instanceof Error ? err.message : String(err);
                }
            }
        }
    });

    wireArtistWorldBatchUI(mainEl, load);

    await load();
}

/**
 * Embedded CMS block on Programs / Products / Journal tabs (same slugs as Studio → Home / Content).
 *
 * @param {HTMLElement} mainEl
 * @param {{
 *   embedEditor: string,
 *   embedFields: string,
 *   embedTitle: string,
 *   embedUnsaved: string,
 *   embedMsg: string,
 *   btnSave: string,
 *   btnCancel: string,
 *   btnBlock: string,
 *   btnSiteInfo: string,
 *   slugBlock: string,
 *   siteInfoChapter: 'programs' | 'editions' | 'journal',
 *   titleBlock: string,
 *   titleSiteInfo: string,
 *   uploadArea: string,
 * }} c
 */
function wireStudioEntityContentEmbed(mainEl, c) {
    const embed = mainEl.querySelector(c.embedEditor);
    const fieldsEl = mainEl.querySelector(c.embedFields);
    const titleEl = mainEl.querySelector(c.embedTitle);
    const unsavedEl = mainEl.querySelector(c.embedUnsaved);
    const msgEl = mainEl.querySelector(c.embedMsg);
    /** @type {string | null} */
    let activeSlug = null;
    /** @type {string | undefined} */
    let chapterId = undefined;

    const showMsg = (kind, text) => {
        if (!msgEl) return;
        msgEl.style.display = text ? 'block' : 'none';
        msgEl.className = `studio-banner studio-banner--${kind}`;
        msgEl.textContent = text;
    };

    const setDirty = (dirty) => {
        if (unsavedEl) unsavedEl.style.display = dirty ? 'block' : 'none';
    };

    /**
     * @param {string} slug
     * @param {string | undefined} ch
     * @param {string} titleText
     */
    const open = async (slug, ch, titleText) => {
        activeSlug = slug;
        chapterId = ch;
        if (embed) embed.style.display = 'block';
        if (titleEl) titleEl.textContent = titleText;
        showMsg('info', '');
        setDirty(false);
        if (!fieldsEl) return;
        await loadStudioContentEditorPayload(
            fieldsEl,
            slug,
            { markDirty: () => setDirty(true) },
            { chapterId: ch },
        );
        setDirty(false);
        embed?.scrollIntoView({ behavior: 'smooth' });
    };

    mainEl.querySelector(c.btnBlock)?.addEventListener('click', () => open(c.slugBlock, undefined, c.titleBlock));
    mainEl.querySelector(c.btnSiteInfo)?.addEventListener('click', () =>
        open('site-info', c.siteInfoChapter, c.titleSiteInfo),
    );

    if (fieldsEl) {
        attachStudioContentFileUpload(fieldsEl, {
            markDirty: () => setDirty(true),
            showMsg,
            uploadArea: c.uploadArea,
        });
    }

    mainEl.querySelector(c.btnSave)?.addEventListener('click', async () => {
        if (!activeSlug || !fieldsEl) return;
        try {
            await persistStudioContentPage(activeSlug, fieldsEl);
            showMsg('ok', 'Saved.');
            setDirty(false);
        } catch (e) {
            showMsg('error', e instanceof Error ? e.message : String(e));
        }
    });

    mainEl.querySelector(c.btnCancel)?.addEventListener('click', () => {
        if (embed) embed.style.display = 'none';
        activeSlug = null;
        chapterId = undefined;
        setDirty(false);
        showMsg('info', '');
    });
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
        const seasonInp = mainEl.querySelector('#studio-programs-current-season');
        let season = '';
        try {
            season = await getCurrentProgramSeason();
        } catch {
            season = '';
        }
        if (seasonInp instanceof HTMLInputElement) {
            seasonInp.value = season;
        }
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
                if (!rl) return;
                const vis = normalizeProgramVisibility(row?.visibility);
                if (vis === 'none') {
                    alert('Preview is not available when visibility is "none". Set visibility to public or private.');
                    return;
                }
                let pathname = rl;
                try {
                    pathname = new URL(rl, window.location.origin).pathname;
                } catch {
                    /* keep rl */
                }
                const canonical = pathname.startsWith('/programs/')
                    ? `/program/${pathname.slice('/programs/'.length)}`
                    : pathname;
                const segs = canonical.split('/').filter(Boolean);
                const slug =
                    segs[0] === 'program' && segs[1] && segs[1] !== 'private' ? segs[1] : '';
                if (vis === 'private' && slug) {
                    window.open(
                        `${window.location.origin}/program/private/${encodeURIComponent(slug)}`,
                        '_blank',
                        'noopener',
                    );
                    return;
                }
                window.open(`${window.location.origin}${rl.startsWith('/') ? rl : `/${rl}`}`, '_blank', 'noopener');
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
        const visCur = normalizeProgramVisibility(p.visibility);
        const visOptions = ['public', 'private', 'none']
            .map(
                (opt) =>
                    `<option value="${opt}" ${visCur === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`,
            )
            .join('');
        const body = `
          <form id="studio-prog-form" class="studio-modal-form studio-modal-form--program">
            <div class="studio-modal-fields-row">
            <label class="studio-field"><span>ID</span><input name="id" required class="studio-input" value="${escapeHtml(String(p.id))}" ${existing ? 'readonly' : ''} /></label>
            <label class="studio-field"><span>routeLink (record) <span class="studio-field-kind-badge studio-field-kind-badge--${routeLinkKind}">${escapeHtml(getFieldKindBadgeLabel(routeLinkKind))}</span></span><input name="routeLink" class="studio-input" value="${escapeHtml(String(p.routeLink || ''))}" /></label>
            <label class="studio-field"><span>featuredOrder</span><input name="featuredOrder" type="number" class="studio-input" value="${escapeHtml(String(p.featuredOrder ?? 0))}" /></label>
            <label class="studio-field"><span>visibility</span><select name="visibility" class="studio-select">${visOptions}</select></label>
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
        bindStudioProgGalleryUrlPreviews(localeFormRoot);
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
        root.querySelectorAll('input.studio-prog-fade-file[data-fade-slot]').forEach((fileEl) => {
            fileEl.addEventListener('change', async (ev) => {
                const t = ev.target;
                const f = t && 'files' in t ? t.files?.[0] : null;
                if (!f || !localeFormRoot) return;
                const slot = t.getAttribute('data-fade-slot') || '0';
                const targetInput = localeFormRoot.querySelector(
                    `.studio-prog-fade-url[data-fade-slot="${slot}"]`
                );
                try {
                    await uploadBlobToS3(f, targetInput instanceof HTMLInputElement ? targetInput : null, {
                        area: 'studio/programs',
                    });
                    if (targetInput instanceof HTMLInputElement) {
                        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                } catch (err) {
                    const m = err instanceof Error ? err.message : String(err);
                    alert(`${m}\n\nConfigure S3 presign under Studio → Services.`);
                }
                t.value = '';
            });
        });
        root.querySelectorAll('input.studio-prog-strip-file[data-strip-slot]').forEach((fileEl) => {
            fileEl.addEventListener('change', async (ev) => {
                const t = ev.target;
                const f = t && 'files' in t ? t.files?.[0] : null;
                if (!f || !localeFormRoot) return;
                const slot = t.getAttribute('data-strip-slot') || '0';
                const targetInput = localeFormRoot.querySelector(
                    `.studio-prog-strip-url[data-strip-slot="${slot}"]`
                );
                try {
                    await uploadBlobToS3(f, targetInput instanceof HTMLInputElement ? targetInput : null, {
                        area: 'studio/programs',
                    });
                    if (targetInput instanceof HTMLInputElement) {
                        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
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

    mainEl.querySelector('#studio-programs-current-season-save')?.addEventListener('click', async () => {
        const inp = mainEl.querySelector('#studio-programs-current-season');
        if (!(inp instanceof HTMLInputElement)) return;
        try {
            await setCurrentProgramSeason(inp.value);
            show('ok', 'Current season saved.');
        } catch (e) {
            show('error', e instanceof Error ? e.message : String(e));
        }
    });

    mainEl.querySelector('#studio-program-add')?.addEventListener('click', () => openProgramModal(null, load));
    mainEl.querySelector('#studio-programs-refresh')?.addEventListener('click', () => load());
    mainEl.querySelector('#studio-programs-search')?.addEventListener('input', () => applyProgramFilter());

    wireStudioEntityContentEmbed(mainEl, {
        embedEditor: '#studio-programs-embed-editor',
        embedFields: '#studio-programs-embed-fields',
        embedTitle: '#studio-programs-embed-title',
        embedUnsaved: '#studio-programs-embed-unsaved',
        embedMsg: '#studio-programs-embed-msg',
        btnSave: '#studio-programs-embed-save',
        btnCancel: '#studio-programs-embed-cancel',
        btnBlock: '#studio-programs-edit-block',
        btnSiteInfo: '#studio-programs-edit-siteinfo',
        slugBlock: 'all-programs',
        siteInfoChapter: 'programs',
        titleBlock: 'Edit: Programs block',
        titleSiteInfo: 'Edit: Programs page headline (site-info)',
        uploadArea: 'studio/programs-content',
    });

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

    wireStudioEntityContentEmbed(mainEl, {
        embedEditor: '#studio-products-embed-editor',
        embedFields: '#studio-products-embed-fields',
        embedTitle: '#studio-products-embed-title',
        embedUnsaved: '#studio-products-embed-unsaved',
        embedMsg: '#studio-products-embed-msg',
        btnSave: '#studio-products-embed-save',
        btnCancel: '#studio-products-embed-cancel',
        btnBlock: '#studio-products-edit-grid',
        btnSiteInfo: '#studio-products-edit-siteinfo',
        slugBlock: 'editions-feed',
        siteInfoChapter: 'editions',
        titleBlock: 'Edit: Editions grid',
        titleSiteInfo: 'Edit: Editions page headline (site-info)',
        uploadArea: 'studio/products-content',
    });

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
          <form id="studio-je-form" class="studio-modal-form studio-modal-form--journal">
            <p class="studio-muted">Internal reference: <code class="studio-code-inline">${escapeHtml(shortRefLabel(String(j.id)))}</code></p>
            <div class="studio-modal-fields-row">
            <label class="studio-field studio-field--full"><span>Entry ID</span><input name="id" required class="studio-input" value="${escapeHtml(String(j.id))}" ${existing ? 'readonly' : ''} /></label>
            <label class="studio-field"><span>Public page link <span class="studio-field-kind-badge studio-field-kind-badge--${linkKind}">${escapeHtml(getFieldKindBadgeLabel(linkKind))}</span></span><input name="link" class="studio-input" value="${escapeHtml(String(j.link || ''))}" placeholder="/journal/entry/your-slug-or-id" /></label>
            <p class="studio-muted studio-modal-hint">Use the same path the site will open — e.g. <code class="studio-code-inline">/journal/entry/fusion-is-growing</code>. The last segment must match this URL (Entry ID can stay the internal <code class="studio-code-inline">j_…</code> value).</p>
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
            <div class="studio-prog-col-headers" aria-hidden="true">
              <span class="studio-prog-grid-label"></span>
              <span class="studio-prog-col-title">English</span>
              <span class="studio-prog-col-title">日本語</span>
            </div>
            <div class="studio-prog-grid-row">
              <span class="studio-prog-grid-label">Title</span>
              <input type="text" id="studio-je-title-en" class="studio-input studio-prog-grid-input" value="${escapeHtml(plain.titleEn)}" spellcheck="true" />
              <input type="text" id="studio-je-title-ja" class="studio-input studio-prog-grid-input" value="${escapeHtml(plain.titleJa)}" spellcheck="true" />
            </div>
            <div class="studio-prog-grid-row studio-prog-grid-row--textarea">
              <span class="studio-prog-grid-label">Body</span>
              <textarea id="studio-je-body-en" class="studio-textarea studio-prog-grid-input" rows="10" spellcheck="true">${escapeHtml(plain.bodyEn)}</textarea>
              <textarea id="studio-je-body-ja" class="studio-textarea studio-prog-grid-input" rows="10" spellcheck="true">${escapeHtml(plain.bodyJa)}</textarea>
            </div>
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

    wireStudioEntityContentEmbed(mainEl, {
        embedEditor: '#studio-journal-embed-editor',
        embedFields: '#studio-journal-embed-fields',
        embedTitle: '#studio-journal-embed-title',
        embedUnsaved: '#studio-journal-embed-unsaved',
        embedMsg: '#studio-journal-embed-msg',
        btnSave: '#studio-journal-embed-save',
        btnCancel: '#studio-journal-embed-cancel',
        btnBlock: '#studio-journal-edit-block',
        btnSiteInfo: '#studio-journal-edit-siteinfo',
        slugBlock: 'journals-block',
        siteInfoChapter: 'journal',
        titleBlock: 'Edit: Journal home list',
        titleSiteInfo: 'Edit: Journal page headline (site-info)',
        uploadArea: 'studio/journal-content',
    });

    await load();
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

/**
 * @param {import('../../utils/database.js').StudioAccountRow} row
 * @param {() => void | Promise<void>} onSaved
 * @param {() => void | Promise<void>} [onRefreshUsersList] — reload Users table + `allPairs` (e.g. after Stripe sync)
 */
function openStudioUserManageModal(row, onSaved, onRefreshUsersList) {
    const raw = row.rawAccount;
    if (!raw || typeof raw !== 'object') {
        openStudioModal('<p class="studio-muted">No account payload for this row.</p>', { title: 'Manage account', compact: true });
        return;
    }
    /** Latest canister account payload for Save (updated after Stripe check + sync). */
    let workingRaw = /** @type {Record<string, unknown>} */ (raw);
    const principal = row.principal;
    const curStatus = row.status || 'pending';
    const exempt = !!row.membershipExemptManual;
    const stripeSt = row.stripeSubscriptionStatus || '—';
    const renews = row.stripeCurrentPeriodEnd || '—';
    const canisterMembershipLabel = exempt ? 'Manual exempt' : String(stripeSt);
    const accountUpdatedLabel = row.updatedAt ? escapeHtml(String(row.updatedAt).slice(0, 19)) : '—';
    const billingHintStored = getStoredBillingEmailForPrincipal(principal);
    const billingHintHtml =
        billingHintStored && billingHintStored.includes('@')
            ? `<p class="studio-muted studio-user-manage-billing-hint" id="studio-user-billing-hint">Client billing email (this browser): <code>${escapeHtml(billingHintStored)}</code></p>`
            : '<p class="studio-muted studio-user-manage-billing-hint" id="studio-user-billing-hint" hidden></p>';

    const body = `
      <div class="studio-user-manage-modal">
        <p class="studio-muted studio-user-manage-legend">The Users table <strong>dot</strong> and <strong>Membership</strong> below reflect the <strong>canister</strong>. <strong>Live Stripe</strong> queries Stripe directly — use Push / Check to align the canister.</p>
        <section class="studio-user-manage-section">
          <h3 class="studio-user-manage-section-title">Identity</h3>
          <div class="studio-user-manage-principal-row">
            <p class="studio-user-manage-principal studio-muted" id="studio-user-principal-line">${escapeHtml(principal)}</p>
            <button type="button" class="studio-btn-ghost studio-btn-tiny" id="studio-user-copy-principal">Copy principal</button>
          </div>
          <p class="studio-muted studio-user-manage-meta">Account <code>updatedAt</code> (core): ${accountUpdatedLabel}</p>
          ${billingHintHtml}
        </section>

        <section class="studio-user-manage-section">
          <h3 class="studio-user-manage-section-title">Account status</h3>
          <p class="studio-muted studio-user-manage-hint">Fusion account lifecycle (pending / active / suspended).</p>
          <div class="studio-user-manage-control-row">
            <label class="studio-user-manage-label" for="studio-user-edit-status">Status</label>
            <select id="studio-user-edit-status" class="studio-select studio-user-manage-select" aria-label="Account status">
              <option value="pending" ${curStatus === 'pending' ? 'selected' : ''}>pending</option>
              <option value="active" ${curStatus === 'active' ? 'selected' : ''}>active</option>
              <option value="suspended" ${curStatus === 'suspended' ? 'selected' : ''}>suspended</option>
            </select>
          </div>
        </section>

        <section class="studio-user-manage-section">
          <h3 class="studio-user-manage-section-title">Membership (canister)</h3>
          <p class="studio-muted studio-user-manage-hint">Stored on-chain. Use <strong>Live Stripe</strong> below to verify billing in Stripe.</p>
          <div class="studio-user-manage-sync-actions">
            <button type="button" class="studio-btn-ghost" id="studio-user-refresh-canister">Refresh from canister</button>
            <button type="button" class="studio-btn-ghost" id="studio-user-push-subscription">Push subscription to canister</button>
          </div>
          <p id="studio-user-push-result" class="studio-muted studio-user-manage-push-result" hidden></p>
          <dl class="studio-user-manage-dl" id="studio-user-manage-membership-dl">
            <dt>Cached subscription</dt><dd id="studio-user-cache-sub">${escapeHtml(String(stripeSt))}</dd>
            <dt>Period end</dt><dd id="studio-user-cache-renew">${escapeHtml(String(renews))}</dd>
            <dt>Summary</dt><dd id="studio-user-cache-summary">${escapeHtml(canisterMembershipLabel)}</dd>
          </dl>
          <div class="studio-user-manage-control-row">
            <label class="studio-user-manage-label" for="studio-user-edit-membership">Billing override</label>
            <select id="studio-user-edit-membership" class="studio-select studio-user-manage-select" aria-label="Membership billing override">
              <option value="standard" ${!exempt ? 'selected' : ''}>Standard — follow Stripe</option>
              <option value="manual_exempt" ${exempt ? 'selected' : ''}>Manual exempt (complimentary)</option>
            </select>
          </div>
        </section>

        <section class="studio-user-manage-section studio-user-manage-section--stripe">
          <h3 class="studio-user-manage-section-title">Live Stripe (by email)</h3>
          <p class="studio-muted studio-user-manage-hint">Not from the canister. Requires Studio → Services integration URL + API key.</p>
          <div class="studio-user-manage-stripe-row">
            <label class="studio-user-manage-label studio-sr-only" for="studio-user-stripe-email">Customer email</label>
            <input type="email" id="studio-user-stripe-email" class="studio-input studio-user-manage-email-input" placeholder="customer@email.com" autocomplete="off" />
            <button type="button" class="studio-btn-primary" id="studio-user-stripe-check">Check Stripe</button>
          </div>
          <div id="studio-user-stripe-result" class="studio-user-manage-stripe-result" hidden></div>
          <div id="studio-user-stripe-ids" class="studio-user-manage-stripe-ids" hidden></div>
        </section>

        <p id="studio-user-sync-warn" class="studio-banner studio-banner--warn studio-user-manage-warn" hidden></p>
        <p id="studio-user-edit-err" class="studio-banner studio-banner--error studio-user-manage-err" hidden></p>
        <div class="studio-modal-actions studio-user-manage-actions">
          <button type="button" class="studio-btn-primary" id="studio-user-edit-save">Save changes</button>
          <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
        </div>
      </div>
    `;

    const { close, root } = openStudioModal(body, {
        title: 'Manage account',
        wide: true,
        onClose: () => {
            if (typeof onRefreshUsersList !== 'function') return;
            void (async () => {
                try {
                    await onRefreshUsersList();
                } catch (err) {
                    try {
                        const syncMsg = document.querySelector('#studio-users-sync-msg');
                        if (syncMsg) {
                            syncMsg.textContent =
                                err instanceof Error ? err.message : String(err);
                        }
                    } catch {
                        /* ignore */
                    }
                }
            })();
        },
    });
    const saveBtn = root.querySelector('#studio-user-edit-save');
    const errEl = root.querySelector('#studio-user-edit-err');
    const checkBtn = root.querySelector('#studio-user-stripe-check');
    const emailInput = root.querySelector('#studio-user-stripe-email');
    const stripeResultEl = root.querySelector('#studio-user-stripe-result');
    const syncWarnEl = root.querySelector('#studio-user-sync-warn');
    const pushResultEl = root.querySelector('#studio-user-push-result');
    const stripeIdsEl = root.querySelector('#studio-user-stripe-ids');
    const CHECK_LABEL = 'Check Stripe';
    const stripeCheckEmailLsKey = studioStripeCheckEmailStorageKey(principal);

    const setSyncWarn = (text) => {
        if (!(syncWarnEl instanceof HTMLElement)) return;
        if (!text) {
            syncWarnEl.hidden = true;
            syncWarnEl.textContent = '';
        } else {
            syncWarnEl.hidden = false;
            syncWarnEl.textContent = text;
        }
    };

    const setPushResult = (text, show) => {
        if (!(pushResultEl instanceof HTMLElement)) return;
        pushResultEl.hidden = !show;
        pushResultEl.textContent = show ? text : '';
    };

    /** @param {Record<string, unknown>} liveR */
    const renderLiveStripeIds = (liveR) => {
        if (!(stripeIdsEl instanceof HTMLElement)) return;
        const cid = liveR.customerId != null ? String(liveR.customerId).trim() : '';
        const sid = liveR.subscriptionId != null ? String(liveR.subscriptionId).trim() : '';
        if (!cid && !sid) {
            stripeIdsEl.hidden = true;
            stripeIdsEl.innerHTML = '';
            return;
        }
        const pk = getStripePublishableKeyResolved();
        const dash = studioStripeDashboardCustomerUrl(cid, pk);
        const bits = [];
        if (cid) {
            bits.push(
                `<div class="studio-user-manage-id-row"><span class="studio-muted">Customer</span> <code>${escapeHtml(cid)}</code> <button type="button" class="studio-btn-ghost studio-btn-tiny" data-studio-copy="${escapeHtml(cid)}">Copy</button></div>`
            );
        }
        if (sid) {
            bits.push(
                `<div class="studio-user-manage-id-row"><span class="studio-muted">Subscription</span> <code>${escapeHtml(sid)}</code> <button type="button" class="studio-btn-ghost studio-btn-tiny" data-studio-copy="${escapeHtml(sid)}">Copy</button></div>`
            );
        }
        if (dash) {
            bits.push(
                `<p class="studio-muted studio-user-manage-stripe-dash"><a href="${escapeHtml(dash)}" target="_blank" rel="noopener noreferrer">Open customer in Stripe Dashboard</a></p>`
            );
        }
        stripeIdsEl.innerHTML = bits.join('');
        stripeIdsEl.hidden = false;
    };

    const runPushSubscriptionToCanister = async (emailStr) => {
        let emailRes =
            /** @type {{ synced?: boolean; reason?: string } | undefined} */ (undefined);
        let principalRes =
            /** @type {{ synced?: boolean; reason?: string } | undefined} */ (undefined);
        let anySynced = false;
        if (getIntegrationBaseUrl()) {
            emailRes = await syncSubscriptionFromStripeByEmail(emailStr, principal);
            anySynced = emailRes?.synced === true;
            if (!anySynced) {
                principalRes = await syncSubscriptionFromStripe(principal);
                anySynced = principalRes?.synced === true;
            }
        }
        return { emailRes, principalRes, anySynced };
    };

    const refetchUserRowAndRefreshTable = async () => {
        let refreshErr = '';
        let up = null;
        try {
            const rows = await getAccountsForStudio();
            up = rows.find((x) => x.principal === principal) ?? null;
            applyMembershipFromStudioRow(up);
        } catch (e) {
            refreshErr = e instanceof Error ? e.message : String(e);
        }
        if (typeof onRefreshUsersList === 'function') {
            try {
                await onRefreshUsersList();
            } catch (e2) {
                refreshErr = refreshErr
                    ? `${refreshErr}; ${e2 instanceof Error ? e2.message : String(e2)}`
                    : e2 instanceof Error
                      ? e2.message
                      : String(e2);
            }
        }
        return { up, refreshErr };
    };

    root.querySelector('#studio-user-copy-principal')?.addEventListener('click', () => {
        void copyToClipboard(principal);
    });

    root.addEventListener('click', (ev) => {
        const t = ev.target;
        if (!(t instanceof Element)) return;
        const btn = t.closest('[data-studio-copy]');
        if (!btn || !root.contains(btn)) return;
        const val = btn.getAttribute('data-studio-copy');
        if (val) void copyToClipboard(val);
    });

    root.querySelector('#studio-user-refresh-canister')?.addEventListener('click', async () => {
        setPushResult('Refreshing…', true);
        setSyncWarn('');
        const { refreshErr } = await refetchUserRowAndRefreshTable();
        if (refreshErr) {
            setSyncWarn(`Could not refresh: ${refreshErr}`);
            setPushResult('', false);
        } else {
            setPushResult('Canister data refreshed.', true);
        }
    });

    root.querySelector('#studio-user-push-subscription')?.addEventListener('click', async () => {
        const emailStr = emailInput instanceof HTMLInputElement ? emailInput.value.trim() : '';
        if (!emailStr.includes('@')) {
            setPushResult('Enter a valid customer email in Live Stripe first.', true);
            return;
        }
        setPushResult('Pushing to canister…', true);
        setSyncWarn('');
        if (!getIntegrationBaseUrl()) {
            setPushResult('Set Integration API URL in Studio → Services.', true);
            return;
        }
        const { emailRes, principalRes, anySynced } = await runPushSubscriptionToCanister(emailStr);
        const detail = formatSyncAttempts(emailRes, principalRes);
        const { refreshErr } = await refetchUserRowAndRefreshTable();
        if (refreshErr) {
            setSyncWarn(`${detail} Table refresh failed: ${refreshErr}`);
        } else if (!anySynced) {
            setSyncWarn(
                `Canister may still be stale. ${detail} If Stripe shows active but the table dot stays red, redeploy the integration API (sync-by-email) and verify INTEGRATION_IC_IDENTITY + adminSetIntegrationServicePrincipal.`
            );
        } else {
            setSyncWarn('');
        }
        setPushResult(anySynced ? `Done. ${detail}` : `Not synced. ${detail}`, true);
    });
    if (emailInput instanceof HTMLInputElement) {
        try {
            const saved = localStorage.getItem(stripeCheckEmailLsKey);
            if (saved && saved.includes('@')) emailInput.value = saved.trim();
        } catch {
            /* ignore */
        }
        emailInput.addEventListener('blur', () => {
            const v = emailInput.value.trim();
            if (!v.includes('@')) return;
            try {
                localStorage.setItem(stripeCheckEmailLsKey, v);
            } catch {
                /* ignore */
            }
        });
    }

    const applyMembershipFromStudioRow = (upRow) => {
        if (!upRow) return;
        const stripeStatus = upRow.stripeSubscriptionStatus || '—';
        const renewIso = upRow.stripeCurrentPeriodEnd || '';
        const renewLabel = renewIso ? formatSubscriptionPeriodEnd(renewIso) : '—';
        const ex = !!upRow.membershipExemptManual;
        const summ = ex ? 'Manual exempt' : String(stripeStatus);
        const ddSub = root.querySelector('#studio-user-cache-sub');
        const ddRenew = root.querySelector('#studio-user-cache-renew');
        const ddSumm = root.querySelector('#studio-user-cache-summary');
        if (ddSub) ddSub.textContent = String(stripeStatus);
        if (ddRenew) ddRenew.textContent = renewLabel;
        if (ddSumm) ddSumm.textContent = summ;
        const memSel = root.querySelector('#studio-user-edit-membership');
        if (memSel instanceof HTMLSelectElement) {
            memSel.value = ex ? 'manual_exempt' : 'standard';
        }
        if (upRow.rawAccount && typeof upRow.rawAccount === 'object') {
            workingRaw = /** @type {Record<string, unknown>} */ (upRow.rawAccount);
        }
    };

    const showStripeErr = (msg) => {
        if (!stripeResultEl) return;
        stripeResultEl.hidden = false;
        stripeResultEl.innerHTML = `<p class="studio-muted studio-stripe-live-footnote">${escapeHtml(msg)}</p>`;
    };

    checkBtn?.addEventListener('click', async () => {
        const email = emailInput instanceof HTMLInputElement ? emailInput.value.trim() : '';
        if (!email.includes('@')) {
            showStripeErr('Enter a valid customer email.');
            return;
        }
        if (checkBtn instanceof HTMLButtonElement) {
            checkBtn.disabled = true;
            checkBtn.textContent = 'Checking…';
        }
        if (stripeResultEl) stripeResultEl.hidden = true;
        if (stripeIdsEl instanceof HTMLElement) {
            stripeIdsEl.hidden = true;
            stripeIdsEl.innerHTML = '';
        }
        setSyncWarn('');
        try {
            const r = await fetchStripeSubscriptionStatusByEmail(email);
            try {
                localStorage.setItem(stripeCheckEmailLsKey, email);
            } catch {
                /* ignore */
            }
            if (
                !r ||
                typeof r !== 'object' ||
                r.ok === false ||
                typeof /** @type {{ membershipActive?: unknown }} */ (r).membershipActive !== 'boolean'
            ) {
                const msg =
                    (r && typeof r === 'object' && (r.error || r.reason) && String(r.error || r.reason)) ||
                    'Could not reach the integration API. Set URL + API key under Studio → Services.';
                showStripeErr(msg);
                return;
            }
            const liveRec = /** @type {Record<string, unknown>} */ (r);
            renderLiveStripeIds(liveRec);
            const active = r.membershipActive === true;
            const rawLine =
                r.subscriptionStatus != null && String(r.subscriptionStatus)
                    ? String(r.subscriptionStatus)
                    : r.reason
                      ? String(r.reason)
                      : '—';
            const cancelNote = r.cancelAtPeriodEnd ? ' · cancel at period end' : '';
            if (stripeResultEl) {
                stripeResultEl.hidden = false;
                stripeResultEl.innerHTML = `
                  <div class="studio-stripe-live-status">
                    <span class="studio-stripe-live-badge ${active ? 'is-active' : 'is-inactive'}">${active ? 'Active' : 'Inactive'}</span>
                    <span class="studio-stripe-live-raw studio-muted">${escapeHtml(rawLine)}${escapeHtml(cancelNote)}</span>
                  </div>
                  <p class="studio-muted studio-stripe-live-footnote">Live Stripe — independent of table / canister cache until Push / Check sync succeeds.</p>
                `;
            }

            const { emailRes, principalRes, anySynced } = await runPushSubscriptionToCanister(email);
            const syncDetail = formatSyncAttempts(emailRes, principalRes);
            const { up, refreshErr } = await refetchUserRowAndRefreshTable();

            if (refreshErr) {
                setSyncWarn(
                    `Could not reload canister / table: ${refreshErr}. Live Stripe may still differ from what is stored.`
                );
            } else if (!up) {
                setSyncWarn('No account row returned for this principal after refresh.');
            } else if (active && !studioRowCanisterPaid(up)) {
                setSyncWarn(
                    `Stripe shows active membership for this email, but the canister still shows "${String(up.stripeSubscriptionStatus || 'empty')}". ${anySynced ? '' : `Sync did not report success. ${syncDetail}`} Check integration service logs, integration identity (adminSetIntegrationServicePrincipal), and redeploy API if sync-by-email returns 404.`
                );
            } else {
                setSyncWarn('');
            }
        } catch (e) {
            showStripeErr(e instanceof Error ? e.message : String(e));
        } finally {
            if (checkBtn instanceof HTMLButtonElement) {
                checkBtn.disabled = false;
                checkBtn.textContent = CHECK_LABEL;
            }
        }
    });

    saveBtn?.addEventListener('click', async () => {
        const sel = root.querySelector('#studio-user-edit-status');
        const statusKey = sel instanceof HTMLSelectElement ? sel.value : 'pending';
        const memSel = root.querySelector('#studio-user-edit-membership');
        const mem = memSel instanceof HTMLSelectElement ? memSel.value : 'standard';
        const ex = mem === 'manual_exempt';
        const patched = {
            ...workingRaw,
            status: { [statusKey]: null },
            membershipExemptManual: ex,
            updatedAt: new Date().toISOString(),
        };
        if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;
        if (errEl instanceof HTMLElement) {
            errEl.textContent = '';
            errEl.hidden = true;
        }
        try {
            await adminUpsertUserAccountStudio(principal, patched);
            close();
            await onSaved();
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (errEl instanceof HTMLElement) {
                errEl.textContent = msg;
                errEl.hidden = false;
            }
        } finally {
            if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = false;
        }
    });
}

async function initUsers(mainEl) {
    const selfEl = mainEl.querySelector('#studio-users-self');
    const tbody = mainEl.querySelector('#studio-users-tbody');
    const roleFilter = mainEl.querySelector('#studio-users-filter-role');
    const statusFilter = mainEl.querySelector('#studio-users-filter-status');
    const countHeader = mainEl.querySelector('#studio-users-header-count');
    const syncAllBtn = mainEl.querySelector('#studio-users-sync-all');
    const syncMsg = mainEl.querySelector('#studio-users-sync-msg');

    /** @type {Awaited<ReturnType<typeof getAccountsForStudio>>} */
    let allPairs = [];

    const membershipCellHtml = (r) => {
        if (r.membershipExemptManual) {
            return escapeHtml('Exempt (manual)');
        }
        return escapeHtml(studioMembershipStatusLabel(r.stripeSubscriptionStatus));
    };

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
            tbody.innerHTML = `<tr><td colspan="10">${emptyMsg}</td></tr>`;
            return;
        }
        tbody.innerHTML = rows
            .map(
                (r) => `<tr>
                <td><span class="studio-user-sub-dot ${studioMembershipDotClass(r)}" title="Subscription health" aria-hidden="true"></span></td>
                <td><span class="studio-identity-short" title="${escapeHtml(r.principal)}">${escapeHtml(shortPrincipalDisplay(r.principal))}</span></td>
                <td>${escapeHtml(r.role)}</td>
                <td>${escapeHtml(r.status)}</td>
                <td>${membershipCellHtml(r)}</td>
                <td><span class="studio-muted" title="${escapeHtml(r.stripeCurrentPeriodEnd || '')}">${escapeHtml(formatSubscriptionPeriodEnd(r.stripeCurrentPeriodEnd))}</span></td>
                <td>${r.linkedArtistId ? escapeHtml(String(r.linkedArtistId)) : '—'}</td>
                <td>${r.linkedOrgId ? escapeHtml(String(r.linkedOrgId)) : '—'}</td>
                <td><span class="studio-muted" title="${escapeHtml(r.updatedAt)}">${escapeHtml(r.updatedAt ? r.updatedAt.slice(0, 19) : '—')}</span></td>
                <td><button type="button" class="studio-btn-primary studio-user-manage" data-principal="${escapeHtml(r.principal)}">Manage</button></td>
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
                    '<tr><td colspan="10">listAccounts missing from declarations — run <code>dfx generate fusion-app-backend</code>.</td></tr>';
            }
            return;
        }
        try {
            allPairs = await getAccountsForStudio();
        } catch (listErr) {
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="10">${escapeHtml(listErr instanceof Error ? listErr.message : String(listErr))}</td></tr>`;
            }
            roleFilter?.addEventListener('change', renderTable);
            statusFilter?.addEventListener('change', renderTable);
            return;
        }
        renderTable();
        roleFilter?.addEventListener('change', renderTable);
        statusFilter?.addEventListener('change', renderTable);

        if (tbody && !tbody.dataset.studioUserManageBound) {
            tbody.dataset.studioUserManageBound = '1';
            tbody.addEventListener('click', (e) => {
                const t = e.target;
                if (!(t instanceof Element)) return;
                const btn = t.closest('.studio-user-manage');
                if (!btn || !tbody.contains(btn)) return;
                const p = btn.getAttribute('data-principal');
                if (!p) return;
                const row = allPairs.find((x) => x.principal === p);
                if (!row) return;
                openStudioUserManageModal(
                    row,
                    async () => {
                        try {
                            allPairs = await getAccountsForStudio();
                            renderTable();
                            if (syncMsg) syncMsg.textContent = 'Account updated.';
                        } catch (err) {
                            if (syncMsg) {
                                syncMsg.textContent = err instanceof Error ? err.message : String(err);
                            }
                        }
                    },
                    async () => {
                        try {
                            allPairs = await getAccountsForStudio();
                            renderTable();
                        } catch {
                            /* ignore */
                        }
                    }
                );
            });
        }

        const syncBtn = syncAllBtn instanceof HTMLButtonElement ? syncAllBtn : null;
        if (syncBtn) {
            syncBtn.disabled = !getIntegrationBaseUrl();
            if (!getIntegrationBaseUrl() && syncMsg) {
                syncMsg.textContent = 'Set integration API URL to sync subscriptions.';
            }
            syncBtn.addEventListener('click', async () => {
                if (!getIntegrationBaseUrl()) return;
                syncBtn.disabled = true;
                syncBtn.setAttribute('aria-busy', 'true');
                if (syncMsg) syncMsg.textContent = 'Syncing…';
                let ok = 0;
                let fail = 0;
                for (const row of allPairs) {
                    try {
                        await syncSubscriptionFromStripe(row.principal);
                        ok += 1;
                    } catch {
                        fail += 1;
                    }
                }
                try {
                    allPairs = await getAccountsForStudio();
                    renderTable();
                } catch {
                    /* ignore */
                }
                if (syncMsg) {
                    syncMsg.textContent =
                        fail > 0
                            ? `Done: ${ok} synced, ${fail} failed (check integration logs).`
                            : `Done: ${ok} synced.`;
                }
                syncBtn.disabled = false;
                syncBtn.setAttribute('aria-busy', 'false');
            });
        }
    } catch (e) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10">${escapeHtml(e instanceof Error ? e.message : String(e))}</td></tr>`;
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
        <li>Register <code>/webhooks/stripe</code> in Stripe with <code>STRIPE_WEBHOOK_SECRET</code>; set <code>FUSION_BACKEND_CANISTER_ID</code>, <code>INTEGRATION_IC_IDENTITY_PEM</code> (full PEM from <code>dfx identity export</code> — Ed25519 or secp256k1), <code>IC_HOST</code>; optionally <code>INTEGRATION_IC_IDENTITY_JSON</code> instead of PEM for legacy Ed25519 JSON. Then call the canister <code>adminSetIntegrationServicePrincipal</code> with that identity’s principal (see <code>services/fusion-integration-api/README.md</code>).</li>
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
    const appNotify = mainEl.querySelector('#studio-svc-application-admin-emails');
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
            if (appNotify) appNotify.value = localStorage.getItem(LS_APPLICATION_ADMIN_EMAILS) || '';
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
            if (appNotify) localStorage.setItem(LS_APPLICATION_ADMIN_EMAILS, appNotify.value.trim());
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
    const subEn = mainEl.querySelector('#studio-svc-subscription-en');
    const subJa = mainEl.querySelector('#studio-svc-subscription-ja');
    const loadSubscriptionFields = async () => {
        try {
            const g = await getApplicationPaymentGlobal();
            if (subEn) subEn.value = (g.en?.whatsIncludedBullets || []).join('\n');
            if (subJa) subJa.value = (g.ja?.whatsIncludedBullets || []).join('\n');
        } catch {
            /* ignore */
        }
    };
    void loadSubscriptionFields();

    initServicesTabs(mainEl);

    mainEl.querySelector('#studio-svc-subscription-save')?.addEventListener('click', async () => {
        const linesEn = String(subEn?.value || '')
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
        const linesJa = String(subJa?.value || '')
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
        show('info', 'Saving…');
        try {
            await setApplicationPaymentGlobal({
                en: { whatsIncludedBullets: linesEn },
                ja: { whatsIncludedBullets: linesJa },
            });
            show('ok', 'Saved subscription application copy.');
            await loadSubscriptionFields();
        } catch (e) {
            show('error', e instanceof Error ? e.message : String(e));
        }
    });

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

/**
 * Settings / admin: confirmation dialog (Studio modal). Resolves true only when the primary button is pressed.
 * @param {{ title: string, paragraphs: string[], confirmLabel: string, danger?: boolean }} opts
 * @returns {Promise<boolean>}
 */
function studioSettingsConfirmModal(opts) {
    const body = opts.paragraphs
        .map((p) => `<p class="studio-muted" style="margin:0 0 0.75rem">${escapeHtml(p)}</p>`)
        .join('');
    const btnClass = opts.danger ? 'studio-btn-danger' : 'studio-btn-primary';
    const inner = `${body}
<div class="studio-modal-actions" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid #e2e8f0">
<button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
<button type="button" class="${btnClass}" id="studio-settings-confirm-ok">${escapeHtml(opts.confirmLabel)}</button>
</div>`;
    return new Promise((resolve) => {
        let settled = false;
        const { close, root } = openStudioModal(inner, {
            title: opts.title,
            compact: true,
            onClose: () => {
                if (!settled) {
                    settled = true;
                    resolve(false);
                }
            },
        });
        root.querySelector('#studio-settings-confirm-ok')?.addEventListener('click', () => {
            if (settled) return;
            settled = true;
            resolve(true);
            close();
        });
    });
}

async function initSettings(mainEl) {
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

    const adminWrap = mainEl.querySelector('#studio-db-admin-tools');
    const adminStatus = mainEl.querySelector('#studio-db-admin-status');
    const btnDl = mainEl.querySelector('#studio-db-download');
    const fileInput = mainEl.querySelector('#studio-db-restore-file');
    const btnPick = mainEl.querySelector('#studio-db-restore-pick');
    const btnRestore = mainEl.querySelector('#studio-db-restore-run');

    const setAdminStatus = (t) => {
        if (adminStatus) adminStatus.textContent = t || '';
    };

    /** @type {File | null} */
    let pendingRestoreFile = null;

    if (!adminWrap) return;

    if (getDataSource() !== 'live') {
        adminWrap.hidden = true;
        return;
    }

    const { getAuthenticatedFusionBackendActor } = await import('../../utils/earlyAccessSubscribe.js');
    const actor = await getAuthenticatedFusionBackendActor();
    let isAdmin = false;
    if (actor && typeof actor.isCallerAdmin === 'function') {
        try {
            isAdmin = await actor.isCallerAdmin();
        } catch {
            isAdmin = false;
        }
    }

    if (!isAdmin) {
        adminWrap.hidden = true;
        return;
    }

    adminWrap.hidden = false;

    if (!actor?.adminExportFullDatabase || !actor?.adminImportFullDatabase) {
        setAdminStatus(
            'Database export/import requires an updated backend and fresh declarations. Deploy `fusion-app-backend` with adminExportFullDatabase / adminImportFullDatabase, then run `dfx generate fusion-app-backend` from the project root.',
        );
        if (btnDl) btnDl.disabled = true;
        if (btnPick) btnPick.disabled = true;
        if (btnRestore) btnRestore.disabled = true;
        return;
    }

    btnPick?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', () => {
        const f = fileInput.files?.[0];
        pendingRestoreFile = f || null;
        if (btnRestore) btnRestore.disabled = !pendingRestoreFile;
        setAdminStatus(f ? `Selected: ${f.name}` : '');
    });

    btnDl?.addEventListener('click', async () => {
        const okDl = await studioSettingsConfirmModal({
            title: 'Download full database?',
            paragraphs: [
                'This exports all live canister data (accounts, artists, programs, subscribers, site settings, and more) to a JSON file on your device.',
                'Treat the file as highly sensitive. Store it securely; anyone with the file can inspect your data or use it to overwrite a canister when restoring.',
            ],
            confirmLabel: 'Download JSON',
            danger: false,
        });
        if (!okDl) return;

        setAdminStatus('Exporting…');
        if (btnDl) btnDl.disabled = true;
        try {
            const snapshot = await actor.adminExportFullDatabase();
            const { serializeDatabaseSnapshotToJson } = await import('../../utils/databaseSnapshotJson.js');
            const json = serializeDatabaseSnapshotToJson(snapshot);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            a.href = url;
            a.download = `fusion-database-backup-${stamp}.json`;
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            setAdminStatus('Download started.');
        } catch (e) {
            setAdminStatus(e instanceof Error ? e.message : String(e));
        } finally {
            if (btnDl) btnDl.disabled = false;
        }
    });

    btnRestore?.addEventListener('click', async () => {
        if (!pendingRestoreFile) return;
        const name = pendingRestoreFile.name || 'selected file';
        const okRestore = await studioSettingsConfirmModal({
            title: 'Restore entire database?',
            paragraphs: [
                `This will replace ALL live canister data with the contents of “${name}”. This cannot be undone.`,
                'Use only trusted backups. Ensure the JSON includes your admin principal or you may be locked out of Studio.',
            ],
            confirmLabel: 'Replace database',
            danger: true,
        });
        if (!okRestore) return;

        setAdminStatus('Reading file…');
        if (btnRestore) btnRestore.disabled = true;
        try {
            const text = await pendingRestoreFile.text();
            const { parseDatabaseSnapshotJson, normalizeDatabaseSnapshotV1 } = await import(
                '../../utils/databaseSnapshotJson.js'
            );
            const snapshot = normalizeDatabaseSnapshotV1(parseDatabaseSnapshotJson(text));
            setAdminStatus('Restoring on-chain…');
            await actor.adminImportFullDatabase(snapshot);
            setAdminStatus('Restore complete. Reload the app to refresh Studio data.');
            window.dispatchEvent(new CustomEvent('fusion-data-source-change', { detail: { source: 'live' } }));
        } catch (e) {
            setAdminStatus(e instanceof Error ? e.message : String(e));
        } finally {
            if (btnRestore) btnRestore.disabled = !pendingRestoreFile;
        }
    });
}
