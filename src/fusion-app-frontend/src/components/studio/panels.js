/**
 * Studio section panels: dashboard + all sidebar tabs (data via database.js).
 */
import { studioFeatureAccess } from '../../utils/studioShellState.js';
import {
    formatSubscriptionPeriodEnd,
    studioMembershipDotClass,
    studioMembershipFilterMatch,
    studioMembershipStatusLabel,
    studioStripeDashboardCustomerUrl,
    studioTrialState,
} from '../../utils/studioMembershipPresentation.js';
import { renderFinance, initFinance } from './financeSection.js';
import { renderPermissions, initPermissions } from './permissionsSection.js';
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
    normalizeArtistRosterVisibility,
    loadArtistForStudioEdit,
    getDashboardMetrics,
    getDataSource,
    getContentBundleForStudio,
    getEditions,
    getJournalEntries,
    getHomeJournalCarouselStudio,
    setHomeJournalCarouselStudio,
    getJournalEntryForStudio,
    getProgramRecordForStudio,
    getPrograms,
    buildNewApplicantStaffNotificationEmail,
    getProgramDisplayNameFromRow,
    getApplicationPaymentGlobal,
    getPlatformUpdateBanner,
    getCurrentProgramSeason,
    setApplicationPaymentGlobal,
    setPlatformUpdateBanner,
    setCurrentProgramSeason,
    setArtistMostRecentProgram,
    applyFeaturedFlagsFromStudioSaveLive,
    applyHeroProfileImageApprovedFromStudioSaveLive,
    applyArtistAudioApprovedFromStudioSaveLive,
    fetchArtistAudioCollectionsMap,
    fetchArtistAudioApprovedUrlsMap,
    applyArtistAudioEntryApprovedFromStudioSaveLive,
    staffSetHeroProfileImageReviewNote,
    staffSetAudioEntryReviewNote,
    fetchHeroProfileImageReviewNotesMap,
    fetchAudioEntryReviewNotesMap,
    approveAllHeroProfileImagesStudio,
    setManualFeaturedForArtistStudio,
    setFeaturableForArtistStudio,
    setRandomFeaturedModeStudio,
    adminCreateJoinInviteCodeStudio,
    adminListJoinInvitesStudio,
    adminCreateTrialJoinInviteCodeStudio,
    adminListAccountContactsForStudio,
    adminSetAccountContactForStudio,
    adminCreateProgramApplicationAccessCodeStudio,
    adminGetJournalLayoutStudio,
    adminSetJournalLayoutStudio,
    adminGetSoundEnvironmentStudio,
    adminSetSoundEnvironmentStudio,
    adminSetArtistMediaForStudio,
    getEventsList,
    getResendSegmentConfigFromCanister,
    getSubscribers as loadSubscribersFromDataSource,
    getSubscribersCsv,
    getApplicantSlotSecuredStudio,
    syncApplicantManualDepositStudio,
    syncApplicantCategoryPaymentStudio,
    setDataSource,
    setResendSegmentConfigOnCanister,
    setSubscriberAudiencesForStudio,
    upsertApplicantStudio,
    deleteApplicantStudio,
    studioReinterpretWithPrompt,
    upsertEditionStudio,
    upsertProgramStudio,
    normalizeProgramVisibility,
    upsertSubscriberRow,
    saveArtistTestOverlayJson,
    studioTranslateEnToJa,
    syncStudioArtistsLegacyHeroImages,
    syncStudioArtistsLegacyIntroGalleries,
    migrateStudioArtistsFirebaseIntroGalleries,
    upsertContentPageStudio,
    generateAndUpsertArtistWorldFromBio,
    adminGenerateAccountRecoveryCodeStudio,
} from '../../utils/database.js';
import { computeMemberProgramTotalDueCents } from '../../utils/programPaymentMoney.js';
import { renderTeamSection, initTeamSection } from './teamSection.js';
import { STUDIO_WORLD_BATCH_MAX, buildMergedLocalesWithGeneratedWorldFromIdentity, hasUsableIdentityLlmSourceInput, translateManageFormWorldToNewWorld } from '../../utils/studioArtistWorldLlm.js';
import { setStudioArtistManageBusy } from '../../utils/studioArtistManageBusy.js';
import { parseSubscriberCsv } from '../../utils/csvParse.js';
import {
    editorTextToObjectLocale,
    localeValueToEditorText,
} from '../../utils/studioLocaleEdit.js';
import {
    applicantPayloadToPlainNotes,
    APPLICANT_CATEGORY_OPTIONS,
    applicantCategoryCellHtml,
    applicantCategoryPillHtml,
    buildApplicantApplicationSectionHtml,
    getApplicantCategory,
    getApplicantFlightCostCents,
    getApplicantLocalTravelCostCents,
    getApplicantIsTester,
    getApplicantManualDepositSubmitted,
    getApplicantSpecialProgramTotalCents,
    getApplicantSponsorshipMode,
    getApplicantSponsoredCreditCents,
    getApplicantSponsoredPercent,
    getApplicantSponsoredCreditInputMode,
    hasSavedApplicantCategory,
    mergeApplicantStaffFields,
    parseApplicantPayload,
    plainNotesToApplicantPayload,
    shortPrincipalDisplay,
    shortRefLabel,
    suggestApplicantCategoryFromArtist,
} from '../../utils/studioPlainForms.js';
import { MAX_MANUAL_FEATURED, readArtistFeaturedMeta } from '../../utils/artistFeaturedExtension.js';
import { LEGACY_PROFILE_BASE } from '../../utils/studioLegacyProfileUrls.js';
import { openStudioModal } from '../../utils/studioModal.js';
import { openSendBlastModal } from './sendBlastModal.js';
import { openIndividualEmailModal } from './individualEmailModal.js';
import { openApplicantEmailModal as openApplicantEmailComposer } from './applicantEmailModal.js';
import { initEmailCampaignStudio, renderEmailCampaignStudio } from './emailCampaignStudio.js';
import {
    initJoinNetworkPageStudio,
    renderJoinNetworkPageStudio,
} from './sections/joinNetworkPageStudio.js';
import { openJournalEntryModal } from './journalEntryModal.js';
import { resolveJournalEntryLink } from '../../utils/journalEntryModalHelpers.js';
import { formatStudioDate, formatStudioDateWithTitle } from '../../utils/studioDateFormat.js';
import {
    createPaymentIntent,
    accountLookupByEmailForStudio,
    accountReconnectPreviewForStudio,
    accountReconnectCompleteForStudio,
    fetchStripeAccountContactsForPrincipals,
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
import { prepareImageFileForUpload } from '../../utils/imageUploadPrep.js';
import {
    renderCommunitySection,
    initCommunitySection,
} from './sections/communityStudio.js';
import { initVideosSection } from './sections/videosStudio.js';
import {
    renderContent,
    initContent,
    renderHome,
    initHome,
    loadStudioContentEditorPayload,
    persistStudioContentPage,
    attachStudioContentFileUpload,
} from './sections/contentSection.js';
import { renderUserStudio, initUserStudio } from './sections/userStudioSection.js';
import { getFieldKind, getFieldKindBadgeLabel } from '../../utils/studioFieldRegistry.js';
import { appendContentLocalePairRow } from './studioFieldRender.js';
import { shoutHtmlToPlain } from '../../utils/shoutHeadlineText.js';
import {
    bindProgramEditorChrome,
    renderProgramEditorFooter,
    renderProgramEditorShell,
} from '../../utils/studioProgramModalShell.js';
import {
    bindProgramKeyDatesRepeater,
    bindProgramLocaleTranslate,
    bindProgramModalTabs,
    bindStudioProgGalleryUrlPreviews,
    collectProgramLocalesFromForm,
    mergeKeyDatesSeed,
    renderProgramLocaleFormHtml,
} from '../../utils/studioProgramLocaleForm.js';
import {
    artistRowForLlmFromManageForm,
    collectArtistRecordFromForm,
    initArtistManageTabs,
    initArtistPreviewTab,
    initArtistBlindspotsTab,
    patchManageFormWorldFields,
    renderArtistManageModalHtml,
    syncStudioPublicWorldSource,
} from '../../utils/studioArtistForm.js';
import {
    collectAccessCodesFromArtists,
    nextUniqueAccessCode,
    normalizeArtistImportRow,
} from '../../utils/studioBatchImport.js';
import { initArtistProgramsTab } from '../../utils/studioArtistPrograms.js';
import {
    LS_APPLICATION_ADMIN_EMAILS,
    getApplicationStaffNotificationEmails,
    LS_INTEGRATION_API_KEY,
    LS_INTEGRATION_API_URL,
    LS_RESEND_FROM_OVERRIDE,
    LS_RESEND_TEST_TO,
    LS_S3_BUCKET,
    LS_S3_PUBLIC_BASE,
    LS_S3_REGION,
    LS_STRIPE_PK_LIVE,
    LS_STRIPE_PK_TEST,
    LS_PAYPAL_CLIENT_ID_LIVE,
    LS_PAYPAL_CLIENT_ID_TEST,
    LS_PAYMENT_PROVIDER,
    getActivePaymentProviderSetting,
    getPayPalClientIdResolved,
    buildServerEnvSnippet,
    getStripeMode,
    getStripePublishableKeyResolved,
    setActivePaymentProvider,
    setStripeMode,
} from '../../utils/studioServicesConfig.js';
import {
    studioPageHeaderHtml,
    studioFilterBarHtml,
    studioDataTabsHtml,
    studioPaginationBarHtml,
} from '../../utils/studioCategoryLayout.js';
import {
    applyArtistReadinessDot,
    artistReadinessDotClass,
    artistReadinessTitle,
    artistRowHasProbeableImages,
    getArtistProfileReadiness,
    probeArtistProfileImages,
} from '../../utils/artistProfileReadiness.js';
import {
    filterPublishedJournalEntries,
    journalEntryOnLayout,
    journalEntryOnPageState,
    journalEntryStatus,
    journalLayoutRowVisibility,
} from '../../utils/journalPublicVisibility.js';

/**
 * Grouped sidebar model (excludes `#dashboard` and admin-only `team` / `permissions`).
 * @type {{ label: string, items: { id: string, label: string }[] }[]}
 */
export const STUDIO_NAV_GROUPS = [
    {
        label: 'Overview',
        items: [
            { id: 'home', label: 'Home' },
            { id: 'subscribers', label: 'Subscribers' },
        ],
    },
    {
        label: 'Management',
        items: [
            { id: 'applicants', label: 'Applicants' },
            { id: 'schedule', label: 'Schedule' },
            { id: 'finance', label: 'Finance' },
            { id: 'travel', label: 'Travel' },
        ],
    },
    {
        label: 'Content',
        items: [
            { id: 'programs', label: 'Programs' },
            { id: 'products', label: 'Products' },
            { id: 'journal', label: 'Journal' },
            { id: 'sound', label: 'Sound' },
            { id: 'community', label: 'Community' },
            { id: 'videos', label: 'Videos' },
            { id: 'content', label: 'Content' },
            { id: 'user-studio', label: 'User Studio' },
            { id: 'email', label: 'Email' },
            { id: 'ai', label: 'Assistance' },
        ],
    },
    {
        label: 'Moderation',
        items: [
            { id: 'pending-approval', label: 'Status' },
            { id: 'profile-images', label: 'Profile Images' },
            { id: 'audio-files', label: 'Audio Files' },
        ],
    },
    {
        label: 'Accounts',
        items: [
            { id: 'artists', label: 'Artists' },
            { id: 'curators', label: 'Curators' },
            { id: 'collectors', label: 'Collectors' },
            { id: 'galleries', label: 'Galleries' },
        ],
    },
    {
        label: 'Operations',
        items: [
            { id: 'gallery-access', label: 'Gallery Access' },
            { id: 'join-network', label: 'Join Network' },
            { id: 'users', label: 'Users' },
            { id: 'services', label: 'Services' },
            { id: 'settings', label: 'Settings' },
        ],
    },
];

/**
 * Flat list for quick links, permission keys, and legacy code paths.
 * @type {{ id: string, label: string }[]}
 */
export const STUDIO_NAV = STUDIO_NAV_GROUPS.flatMap((g) => g.items);

export const STUDIO_DASHBOARD_ID = 'dashboard';

const TITLE_MAP = {
    [STUDIO_DASHBOARD_ID]: 'Dashboard',
    team: 'Team',
    permissions: 'Permissions',
    'pending-approval': 'Status',
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
        case 'schedule':
            return renderManagementPlaceholder(
                'Schedule',
                'Program calendars, artist timelines, and event scheduling tools will live here.',
                'schedule',
            );
        case 'finance':
            return renderFinance();
        case 'travel':
            return renderManagementPlaceholder(
                'Travel',
                'Travel coordination, accommodation notes, and arrival details will live here.',
                'travel',
            );
        case 'artists':
            return renderArtists();
        case 'pending-approval':
            return renderPendingApproval();
        case 'profile-images':
            return renderProfileImages();
        case 'audio-files':
            return renderAudioFiles();
        case 'programs':
            return renderPrograms();
        case 'products':
            return renderProducts();
        case 'gallery-access':
            return renderGalleryAccess();
        case 'join-network':
            return renderJoinNetworkPageStudio();
        case 'journal':
            return renderJournal();
        case 'sound':
            return renderSound();
        case 'community':
            return renderCommunitySection();
        case 'videos':
            return '<div id="studio-videos-root" class="studio-section-root"></div>';
        case 'home':
            return renderHome();
        case 'content':
            return renderContent();
        case 'user-studio':
            return renderUserStudio();
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
        case 'permissions':
            return renderPermissions();
        case 'team':
            return renderTeamSection();
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
            <div id="studio-dashboard-pending-wrap" class="studio-dashboard-pending" hidden>
                <div class="studio-section-title-row">
                    <h2>Pending visibility</h2>
                    <a href="#pending-approval" class="studio-quick-link">View Status queue</a>
                </div>
                <div id="studio-dashboard-pending-list" class="studio-table-wrap"></div>
            </div>
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
                    ${STUDIO_NAV.filter((n) => studioFeatureAccess(n.id).visible)
                        .map(
                            (n) =>
                                `<li><a href="#${n.id}" class="studio-quick-link" data-studio-hash="${n.id}">${escapeHtml(n.label)}</a></li>`
                        )
                        .join('')}
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
                <button type="button" class="studio-btn-ghost" id="studio-subscribers-download-csv">Download CSV</button>
                <button type="button" class="studio-btn-ghost" id="studio-subscribers-refresh">
                    Refresh list
                </button>
                <button type="button" class="studio-btn-secondary" id="studio-subscribers-all-to-general">All To General</button>
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
                            <th>Audiences</th>
                            <th class="studio-td-actions studio-subscribers-col-manage">Manage</th>
                            <th class="studio-td-actions studio-subscribers-col-delete">Delete</th>
                        </tr>
                    </thead>
                    <tbody id="studio-subscribers-tbody">
                        <tr><td colspan="8">Loading…</td></tr>
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
                    { id: 'studio-app-tab-reviewing', label: 'Initial review', value: 'reviewing' },
                    { id: 'studio-app-tab-post-interview', label: 'Post interview review', value: 'postInterviewReview' },
                    { id: 'studio-app-tab-needs', label: 'Needs info', value: 'needsInfo' },
                    { id: 'studio-app-tab-accepted', label: 'Approved', value: 'accepted' },
                    { id: 'studio-app-tab-rejected', label: 'Denied', value: 'rejected' },
                    { id: 'studio-app-tab-pulled-out', label: 'Pulled out', value: 'pulledOut' },
                    { id: 'studio-app-tab-tester', label: 'Tester', value: 'tester' },
                ],
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-applicants-search',
                searchPlaceholder: 'Search email, name, program…',
            })}
            <details class="studio-section-accordion studio-section-accordion--applicants-admin">
                <summary class="studio-section-accordion__summary">Add applicant &amp; admin tools</summary>
                <div class="studio-section-accordion__body">
                    <div id="studio-applicants-banner" class="studio-banner studio-banner--info"></div>
                    <div class="studio-modal-actions" style="margin:0.25rem 0 0.5rem">
                        <button type="button" class="studio-btn-secondary" id="studio-applicants-generate-access-code">Generate access code</button>
                    </div>
                    <div class="studio-applicant-add">
                        <h3 class="studio-subheading">Add applicant</h3>
                        <div class="studio-form-grid">
                            <label class="studio-field studio-field--full"><span>Pick veteran artist</span>
                                <select id="studio-app-new-artist" class="studio-select">
                                    <option value="">Manual applicant</option>
                                </select>
                            </label>
                            <label class="studio-field"><span>Applicant reference</span><input type="text" id="studio-app-new-id" class="studio-input" placeholder="Unique reference for this record" /></label>
                            <label class="studio-field"><span>Program ID</span><input type="text" id="studio-app-new-program" class="studio-input" /></label>
                            <label class="studio-field"><span>Email</span><input type="email" id="studio-app-new-email" class="studio-input" /></label>
                            <label class="studio-field"><span>Name</span><input type="text" id="studio-app-new-name" class="studio-input" /></label>
                            <label class="studio-field"><span>Status</span>
                                <select id="studio-app-new-status" class="studio-select">
                                    <option value="pending">Pending</option>
                                    <option value="reviewing">Initial review</option>
                                    <option value="postInterviewReview">Post interview review</option>
                                    <option value="needsInfo">Needs info</option>
                                    <option value="accepted">Approved</option>
                                    <option value="rejected">Denied</option>
                                </select>
                            </label>
                            <label class="studio-field studio-field--full"><span>Notes</span><textarea id="studio-app-new-payload" class="studio-textarea" rows="4" placeholder="Internal notes (plain text)"></textarea></label>
                        </div>
                        <button type="button" class="studio-btn-primary" id="studio-app-new-save">SAVE APPLICANT</button>
                    </div>
                </div>
            </details>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Program</th>
                            <th>Status</th>
                            <th>Category</th>
                            <th>Slot secured</th>
                            <th>Created</th>
                            <th class="studio-th-actions">View</th>
                            <th class="studio-th-actions">Email</th>
                            <th class="studio-th-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="studio-applicants-tbody"><tr><td colspan="10">Loading…</td></tr></tbody>
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
            <section id="studio-artists-list-surface">
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
                <label class="studio-field" style="margin:0 0 0 0.75rem"><span class="studio-muted">Visibility</span>
                    <select id="studio-artists-filter-visibility" class="studio-select">
                        <option value="">All</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                        <option value="private">Private</option>
                        <option value="public">Public</option>
                    </select>
                </label>
                <label class="studio-muted" style="display:inline-flex;align-items:center;gap:0.35rem;margin-left:0.75rem;cursor:pointer">
                    <input type="checkbox" id="studio-artists-random-featured" />
                    Random featured (pick up to ${MAX_MANUAL_FEATURED} from featurable pool)
                </label>
            </div>
            <details class="studio-section-accordion studio-section-accordion--artists-admin">
                <summary class="studio-section-accordion__summary">Admin tools & guidance</summary>
                <div class="studio-section-accordion__body">
                    <p class="studio-banner studio-banner--info">Admin roster: use <strong>Manage</strong> for structured editing (tabs: roster, identity, world, media, links/SEO). Batch JSON remains for bulk import. <strong>Advanced JSON</strong> in the manage surface applies <strong>test overlay</strong> only (localStorage).</p>
                    <p class="studio-muted">Batch upload: JSON array of artist rows (see <code>ArtistRecord</code> shape), or <code>{ "artists": [ … ] }</code>. Imported rows get an 8-digit access code for future account linking.</p>
                    <p class="studio-muted">Per-artist <strong>access code</strong> in Manage is for claiming an existing roster profile (use <strong>Generate new code</strong> there after a code is used, or save with an empty field to auto-assign). <strong>Generate artist join invite</strong> creates a separate single-use code for new members without a roster row (same 8-digit format).</p>
                    <div class="studio-subscribers-toolbar studio-subscribers-toolbar--artists">
                        <label class="studio-file-label studio-btn-ghost">
                            <input type="file" accept="application/json,.json" id="studio-artists-batch-json" class="studio-file-input" />
                            Batch upload (JSON)
                        </label>
                        <button type="button" class="studio-btn-secondary" id="studio-artists-gen-invite">Generate artist join invite</button>
                        <button type="button" class="studio-btn-ghost" id="studio-artists-sync-hero">Sync Profile Images</button>
                        <button type="button" class="studio-btn-ghost" id="studio-artists-approve-all-profile-images">Approve all profile images</button>
                        <button type="button" class="studio-btn-ghost" id="studio-artists-sync-gallery">Sync Gallery</button>
                        <button type="button" class="studio-btn-ghost" id="studio-artists-migrate-firebase-gallery">Migrate Firebase Gallery</button>
                    </div>
                    <p class="studio-muted">Public <strong>/artists</strong> page — headline above the featured strip (plain text; line breaks preserved). Also listed under <strong>Content</strong>.</p>
                    <div id="studio-artists-shout-fields" class="studio-content-fields"></div>
                    <div class="studio-toolbar-actions" style="margin-top:0.65rem">
                        <button type="button" class="studio-btn-primary" id="studio-artists-shout-save">Save shout headline</button>
                    </div>
                    <p id="studio-artists-shout-msg" class="studio-banner studio-banner--info" style="display:none;margin-top:0.5rem" role="status"></p>
                </div>
            </details>
            <details class="studio-section-accordion studio-section-accordion--artists-world">
                <summary class="studio-section-accordion__summary">World copy generator</summary>
                <div class="studio-section-accordion__body">
                    <p class="studio-muted">
                        Generate <strong>Kamauu-style</strong> <strong>New World</strong> copy (micro-bio, perspective, vision, constructing, context, quote) from English bio/discipline and Story &amp; World fields via the canister LLM. Output is written to <code>locales.*.worldNew</code> (artist-authored Story &amp; World in <code>world</code> stays manual unless they edit it). Japanese locales are filled by translation.
                    </p>
                    <button type="button" class="studio-btn-secondary" id="studio-artists-world-batch-open">Generate New World from bio (batch)…</button>
                </div>
            </details>
            <details class="studio-section-accordion studio-section-accordion--artists-comms">
                <summary class="studio-section-accordion__summary">Comms</summary>
                <div class="studio-section-accordion__body">
                    <button type="button" class="studio-btn-secondary" id="studio-artists-send-blast-open">Send blast…</button>
                </div>
            </details>
            <div id="studio-artists-banner" class="studio-banner studio-banner--info"></div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th scope="col" aria-label="Profile readiness">Ready</th>
                            <th>Slug</th>
                            <th>ID</th>
                            <th>Email</th>
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
                    <tbody id="studio-artists-tbody"><tr><td colspan="12">Loading…</td></tr></tbody>
                </table>
            </div>
            </section>
            <section id="studio-artist-manage-surface" class="studio-artist-manage-surface" hidden></section>
        </div>
    `;
}

function renderPendingApproval() {
    return `
        <div class="studio-section-stack studio-category-page">
            <section id="studio-pending-list-surface">
            ${studioPageHeaderHtml({
                title: 'Status',
                subtitle: 'Artist roster profiles needing review (pending + inactive)',
                countId: 'studio-pending-approval-header-count',
                countLabel: 'pending + inactive',
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-pending-approval-search',
                searchPlaceholder: 'Filter slug, id, email…',
            })}
            <p class="studio-muted">Set visibility to <strong>public</strong> when approved, or use <strong>Manage</strong> to move artists between <strong>pending</strong>, <strong>inactive</strong>, and other states.</p>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Slug</th>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Visibility</th>
                            <th>Public profile</th>
                            <th class="studio-td-actions">Manage</th>
                        </tr>
                    </thead>
                    <tbody id="studio-pending-approval-tbody"><tr><td colspan="6">Loading…</td></tr></tbody>
                </table>
            </div>
            </section>
            <section id="studio-pending-manage-surface" class="studio-artist-manage-surface" hidden></section>
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

function journalStudioStatusPill(status) {
    const s = journalEntryStatus({ entryStatus: status });
    /** @type {Record<string, [string, string]>} */
    const map = {
        draft: ['studio-journal-status--draft', 'Draft'],
        published: ['studio-journal-status--published', 'Published'],
        archived: ['studio-journal-status--archived', 'Archived'],
    };
    const [cls, label] = map[s] || map.draft;
    return `<span class="studio-journal-status ${cls}">${escapeHtml(label)}</span>`;
}

function journalStudioOnPageChip(state) {
    /** @type {Record<string, [string, string]>} */
    const map = {
        yes: ['studio-journal-chip--live', 'Yes'],
        no: ['studio-journal-chip--neutral', 'No'],
        hidden: ['studio-journal-chip--hidden', 'Hidden'],
        broken: ['studio-journal-chip--broken', 'Broken ref'],
    };
    const [cls, label] = map[state] || map.no;
    return `<span class="studio-journal-chip ${cls}">${escapeHtml(label)}</span>`;
}

function journalStudioVisibilityChip(vis) {
    /** @type {Record<string, [string, string]>} */
    const map = {
        live: ['studio-journal-chip--live', 'Live'],
        hidden: ['studio-journal-chip--hidden', 'Hidden'],
        broken: ['studio-journal-chip--broken', 'Broken ref'],
    };
    const [cls, label] = map[vis] || map.live;
    return `<span class="studio-journal-chip ${cls}">${escapeHtml(label)}</span>`;
}

/**
 * @param {Record<string, unknown>} entry
 */
function journalEntryPublicPath(entry) {
    const title = String(entry?.en?.title ?? entry?.en?.name ?? '').trim();
    const link = resolveJournalEntryLink(entry?.link, title, entry?.id);
    if (link.startsWith('/')) return link;
    if (/^https?:\/\//i.test(link)) return link;
    const id = String(entry?.id ?? '').trim();
    return id ? `/journal/entry/${encodeURIComponent(id)}` : '/journal';
}

function renderJournal() {
    return `
        <div class="studio-section-stack studio-category-page studio-journal-page">
            ${studioPageHeaderHtml({
                title: 'Journal',
                subtitle: 'Manage journal entries and curate what appears on /journal',
                countId: 'studio-journal-entries-count',
                countLabel: 'entries',
            })}
            <section class="studio-journal-section" aria-labelledby="studio-journal-entries-heading">
                <h3 id="studio-journal-entries-heading" class="studio-subheading">Journal entries</h3>
                <p class="studio-muted studio-journal-lede">All CMS journal records. Only <strong>published</strong> entries appear on the public site.</p>
                ${studioDataTabsHtml({
                    ariaLabel: 'Entry status',
                    tabs: [
                        { id: 'studio-journal-tab-all', label: 'All', value: 'all', active: true },
                        { id: 'studio-journal-tab-draft', label: 'Draft', value: 'draft' },
                        { id: 'studio-journal-tab-published', label: 'Published', value: 'published' },
                        { id: 'studio-journal-tab-archived', label: 'Archived', value: 'archived' },
                    ],
                })}
                ${studioFilterBarHtml({
                    searchId: 'studio-journal-entries-search',
                    searchPlaceholder: 'Search title, id, link…',
                })}
                <div class="studio-subscribers-toolbar studio-journal-toolbar">
                    <button type="button" class="studio-btn-primary" id="studio-journal-new-entry">+ New journal entry</button>
                </div>
                <div class="studio-table-wrap studio-table-wrap--sticky-head">
                    <table class="studio-table studio-table--dense">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Status</th>
                                <th>On /journal</th>
                                <th>URL</th>
                                <th>Updated</th>
                                <th class="studio-td-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="studio-journal-entries-tbody"><tr><td colspan="6">Loading…</td></tr></tbody>
                    </table>
                </div>
            </section>

            <section class="studio-journal-section" aria-labelledby="studio-journal-home-carousel-heading">
                <div class="studio-journal-section__head">
                    <div>
                        <h3 id="studio-journal-home-carousel-heading" class="studio-subheading">Home carousel</h3>
                        <p class="studio-muted studio-journal-lede">Choose up to <strong>3 published</strong> entries for the homepage journal hero. Slide 1 is the first pagination dot (left). Leave all slots empty to use automatic newest-first order.</p>
                    </div>
                </div>
                <div class="studio-journal-home-carousel">
                    <label class="studio-field">
                        <span>Slide 1</span>
                        <select id="studio-journal-home-slot-0" class="studio-select"><option value="">— Automatic —</option></select>
                    </label>
                    <label class="studio-field">
                        <span>Slide 2</span>
                        <select id="studio-journal-home-slot-1" class="studio-select"><option value="">— None —</option></select>
                    </label>
                    <label class="studio-field">
                        <span>Slide 3</span>
                        <select id="studio-journal-home-slot-2" class="studio-select"><option value="">— None —</option></select>
                    </label>
                </div>
                <div class="studio-subscribers-toolbar studio-journal-toolbar" style="flex-wrap:wrap;gap:0.5rem;align-items:center">
                    <button type="button" class="studio-btn-primary" id="studio-journal-home-carousel-save">Save carousel</button>
                    <button type="button" class="studio-btn-ghost" id="studio-journal-home-carousel-clear">Use automatic order</button>
                </div>
                <p id="studio-journal-home-carousel-msg" class="studio-banner studio-banner--info" style="display:none" role="status"></p>
            </section>

            <section class="studio-journal-section" aria-labelledby="studio-journal-layout-heading">
                <div class="studio-journal-section__head">
                    <div>
                        <h3 id="studio-journal-layout-heading" class="studio-subheading">/journal page layout</h3>
                        <p class="studio-muted studio-journal-lede">Controls what visitors see on <a href="/journal" target="_blank" rel="noopener noreferrer">/journal</a> — only <strong>published</strong> entries with valid refs appear.</p>
                    </div>
                    <p class="studio-journal-layout-stat" aria-live="polite"><span id="studio-journal-header-count">—</span> rows</p>
                </div>
                <p id="studio-journal-layout-unsaved" class="studio-banner studio-banner--warn" style="display:none" role="status">You have unsaved layout changes.</p>
                ${studioFilterBarHtml({
                    searchId: 'studio-journal-search',
                    searchPlaceholder: 'Search layout rows…',
                })}
                <div class="studio-subscribers-toolbar studio-journal-toolbar" style="flex-wrap:wrap;gap:0.5rem;align-items:center">
                    <button type="button" class="studio-btn-primary" id="studio-journal-add">+ Add layout row</button>
                    <button type="button" class="studio-btn-primary" id="studio-journal-save-layout">Save layout</button>
                    <a href="/journal" target="_blank" rel="noopener noreferrer" class="studio-btn-ghost">Preview /journal</a>
                    <button type="button" class="studio-btn-ghost" id="studio-journal-refresh">Refresh</button>
                </div>
                <div id="studio-journal-banner" class="studio-banner studio-banner--info" style="display:none"></div>
                <div class="studio-table-wrap studio-table-wrap--sticky-head">
                    <table class="studio-table studio-table--dense">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Feature</th>
                                <th>Type</th>
                                <th>Visibility</th>
                                <th>Ref / details</th>
                                <th class="studio-td-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="studio-journal-tbody"><tr><td colspan="6">Loading…</td></tr></tbody>
                    </table>
                </div>
            </section>

            <details class="studio-embed-block studio-journal-settings">
                <summary class="studio-subheading">Home &amp; page settings</summary>
                <p id="studio-journal-settings-note" class="studio-muted"></p>
                <div class="studio-toolbar-actions" style="margin:0.5rem 0;flex-wrap:wrap;gap:0.5rem">
                    <button type="button" class="studio-btn-primary" id="studio-journal-edit-block">Edit test mode home list</button>
                    <button type="button" class="studio-btn-ghost" id="studio-journal-edit-siteinfo">Edit /journal page headline</button>
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
        </div>
    `;
}

function renderSound() {
    return `
        <div class="studio-section-stack studio-category-page">
            ${studioPageHeaderHtml({
                title: 'Sound',
                subtitle: 'Atmosphere loop + voice overlays in the public site header (after “click to enter”)',
                countId: 'studio-sound-header-count',
                countLabel: '',
            })}
            <p class="studio-muted">Upload atmosphere audio to S3; choose random artist audio bites (from member profiles) or a manual file. Set timing for how often a voice plays over the bed.</p>
            <form id="studio-sound-form" class="studio-section-stack" style="max-width:40rem">
                <label class="studio-field studio-field--row">
                    <input type="checkbox" id="studio-sound-enabled" name="enabled" />
                    <span>Enable sound environment in the header</span>
                </label>
                <label class="studio-field">
                    <span>Category label (header line: “{label} &amp; Artist Voices”)</span>
                    <input type="text" id="studio-sound-category" class="studio-input" maxlength="200" placeholder="e.g. Nature" />
                </label>
                <label class="studio-field">
                    <span>Atmosphere audio URL</span>
                    <input type="text" id="studio-sound-atmo-url" class="studio-input" placeholder="https://…" />
                </label>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" id="studio-sound-atmo-file" accept="audio/*" class="studio-file-input" />
                    Upload atmosphere
                </label>
                <label class="studio-field">
                    <span>Voice selection</span>
                    <select id="studio-sound-voice-mode" class="studio-select">
                        <option value="random">Random (artists with audio)</option>
                        <option value="manual">Manual artist or file</option>
                    </select>
                </label>
                <label class="studio-field" id="studio-sound-artist-wrap">
                    <span>Artist (with audio)</span>
                    <select id="studio-sound-artist" class="studio-select"></select>
                </label>
                <label class="studio-field">
                    <span>Manual voice URL (optional; overrides artist when mode is manual)</span>
                    <input type="text" id="studio-sound-manual-voice-url" class="studio-input" placeholder="https://…" />
                </label>
                <label class="studio-file-label studio-btn-ghost">
                    <input type="file" id="studio-sound-voice-file" accept="audio/*" class="studio-file-input" />
                    Upload voice clip
                </label>
                <div class="studio-modal-fields-row">
                    <label class="studio-field">
                        <span>Min interval (sec)</span>
                        <input type="number" id="studio-sound-min-int" class="studio-input" min="0" step="1" />
                    </label>
                    <label class="studio-field">
                        <span>Max interval (sec)</span>
                        <input type="number" id="studio-sound-max-int" class="studio-input" min="0" step="1" />
                    </label>
                </div>
                <div class="studio-modal-fields-row">
                    <label class="studio-field">
                        <span>Default atmosphere %</span>
                        <input type="number" id="studio-sound-vol-atmo" class="studio-input" min="0" max="100" step="1" />
                    </label>
                    <label class="studio-field">
                        <span>Default voices %</span>
                        <input type="number" id="studio-sound-vol-voice" class="studio-input" min="0" max="100" step="1" />
                    </label>
                </div>
                <label class="studio-field">
                    <span>Learn more — journal entry (internal id)</span>
                    <select id="studio-sound-learn-journal" class="studio-select"></select>
                </label>
                <div class="studio-toolbar-actions" style="margin-top:0.5rem">
                    <button type="submit" class="studio-btn-primary" id="studio-sound-save">Save</button>
                </div>
            </form>
            <p id="studio-sound-msg" class="studio-banner" style="display:none;margin-top:8px" role="status"></p>
        </div>
    `;
}

function renderEmail() {
    return renderEmailCampaignStudio();
}

function renderAi() {
    return `
        <div class="studio-section-stack studio-category-page studio-assistance-page">
            <header class="studio-assistance-header">
                <div class="studio-assistance-header__crumbs">Studio <span>›</span> Assistance</div>
                <div class="studio-assistance-header__row">
                    <div>
                        <h2 class="studio-assistance-header__title">Assistance</h2>
                        <p class="studio-assistance-header__subtitle">Internal tools for writing, translation, and refinement across the platform.</p>
                    </div>
                    <button type="button" class="studio-btn-ghost studio-assistance-guide-btn">Usage guide</button>
                </div>
            </header>
            <div class="studio-assistance-layout">
                <section class="studio-assistance-main">
                    <div class="studio-assistance-grid">
                        <div class="studio-assistance-card studio-assistance-tabs-card">
                            <div class="studio-tabs studio-assistance-tabs" id="studio-assist-tabs">
                                <div class="studio-tabs__list" role="tablist" aria-label="Assistance actions">
                                    <button type="button" class="studio-tabs__tab is-active" role="tab" id="studio-assist-tab-refine" aria-selected="true" aria-controls="studio-assist-panel-refine"><span class="studio-assistance-tab-icon" aria-hidden="true">✧</span>Refine</button>
                                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-assist-tab-generate" aria-selected="false" aria-controls="studio-assist-panel-generate"><span class="studio-assistance-tab-icon" aria-hidden="true">✎</span>Generate</button>
                                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-assist-tab-translate" aria-selected="false" aria-controls="studio-assist-panel-translate"><span class="studio-assistance-tab-icon" aria-hidden="true">◌</span>Translate</button>
                                </div>
                            </div>
                        </div>
                        <div class="studio-assistance-col">
                            <section class="studio-assistance-card">
                                <div class="studio-section-title-row">
                                    <h2>1. Input</h2>
                                    <button type="button" class="studio-btn-ghost" id="studio-assist-clear">Clear</button>
                                </div>
                                <p class="studio-muted">Paste or type the content you want to refine.</p>
                                <textarea id="studio-assist-input" class="studio-textarea studio-assist-textarea" rows="12" placeholder="Paste artist bio, email draft, program copy, or notes…"></textarea>
                                <div class="studio-tabs__panels studio-assistance-panels">
                                        <section id="studio-assist-panel-refine" class="studio-tabs__panel is-active" role="tabpanel" aria-labelledby="studio-assist-tab-refine">
                                            <h3 class="studio-assistance-panel-title">2. Refinement options</h3>
                                            <p class="studio-muted">Adjust tone and length to match your needs.</p>
                                            <div class="studio-assist-two-fields">
                                                <label class="studio-field">
                                                    <span>Tone</span>
                                                    <select id="studio-assist-tone" class="studio-select">
                                                        <option value="Neutral">Neutral</option>
                                                        <option value="Elevated" selected>Elevated</option>
                                                        <option value="Direct">Direct</option>
                                                    </select>
                                                </label>
                                                <label class="studio-field">
                                                    <span>Length</span>
                                                    <select id="studio-assist-length" class="studio-select">
                                                        <option value="Shorten">Shorten</option>
                                                        <option value="Keep" selected>Keep</option>
                                                        <option value="Expand">Expand</option>
                                                    </select>
                                                </label>
                                            </div>
                                            <button type="button" class="studio-btn-primary" id="studio-assist-run-refine">Refine Text</button>
                                        </section>
                                        <section id="studio-assist-panel-generate" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-assist-tab-generate" hidden>
                                            <h3 class="studio-assistance-panel-title">2. Compose from prompt</h3>
                                            <p class="studio-muted">Create new content from a prompt.</p>
                                            <label class="studio-field">
                                                <span>What do you want to create?</span>
                                                <textarea id="studio-assist-generate-prompt" class="studio-textarea" rows="4" placeholder="Describe what to generate and any constraints."></textarea>
                                            </label>
                                            <div class="studio-assistance-presets" role="group" aria-label="Quick presets">
                                                <button type="button" class="studio-btn-ghost studio-assist-preset" data-preset="Artist bio">Artist bio</button>
                                                <button type="button" class="studio-btn-ghost studio-assist-preset" data-preset="Residency description">Residency description</button>
                                                <button type="button" class="studio-btn-ghost studio-assist-preset" data-preset="Email outreach">Email outreach</button>
                                                <button type="button" class="studio-btn-ghost studio-assist-preset" data-preset="Instagram caption">Instagram caption</button>
                                            </div>
                                            <button type="button" class="studio-btn-primary" id="studio-assist-run-generate">Generate</button>
                                        </section>
                                        <section id="studio-assist-panel-translate" class="studio-tabs__panel" role="tabpanel" aria-labelledby="studio-assist-tab-translate" hidden>
                                            <h3 class="studio-assistance-panel-title">2. Translation options</h3>
                                            <p class="studio-muted">Translate and localize content.</p>
                                            <div class="studio-assist-two-fields">
                                                <label class="studio-field">
                                                    <span>From</span>
                                                    <input type="text" class="studio-input" value="Auto-detect" readonly />
                                                </label>
                                                <label class="studio-field">
                                                    <span>To</span>
                                                    <input type="text" class="studio-input" value="Japanese (日本語)" readonly />
                                                </label>
                                            </div>
                                            <fieldset class="studio-assist-translate-style">
                                                <legend class="studio-sr-only">Translation style</legend>
                                                <label><input type="radio" name="studio-assist-translate-style" value="natural" checked /> Natural / localized</label>
                                                <label><input type="radio" name="studio-assist-translate-style" value="literal" /> Literal / direct</label>
                                            </fieldset>
                                            <button type="button" class="studio-btn-primary" id="studio-assist-run-translate">Translate to Japanese</button>
                                        </section>
                                </div>
                            </section>
                        </div>
                        <div class="studio-assistance-col">
                            <section class="studio-assistance-card">
                                <div class="studio-section-title-row">
                                    <h2>3. Output</h2>
                                    <div class="studio-toolbar-actions" style="margin:0">
                                        <button type="button" class="studio-btn-ghost" id="studio-assist-copy-inline">Copy</button>
                                        <button type="button" class="studio-btn-ghost" id="studio-assist-replace-inline">Replace input</button>
                                    </div>
                                </div>
                                <p class="studio-muted">Refined content ready to use.</p>
                                <textarea id="studio-assist-output" class="studio-textarea studio-assist-textarea" rows="18" placeholder="Output appears here…" readonly></textarea>
                            </section>
                        </div>
                    </div>
                </section>
                <aside class="studio-assistance-sidebar">
                    <section class="studio-assistance-card">
                        <h3 class="studio-subheading">Assistant profile</h3>
                        <div class="studio-assistance-profile">
                            <strong>FUSION Assistant v1</strong>
                            <span class="studio-muted">Tone: Elevated / Editorial</span>
                            <span class="studio-muted">Language bias: EN → JP</span>
                        </div>
                    </section>
                    <section class="studio-assistance-card">
                        <h3 class="studio-subheading">Usage context</h3>
                        <p class="studio-muted">Help the assistant understand what you are working on.</p>
                        <label class="studio-field">
                            <span>Context</span>
                            <select id="studio-assist-context" class="studio-select">
                                <option value="Artist profile">Artist profile</option>
                                <option value="Residency program">Residency program</option>
                                <option value="Email">Email</option>
                                <option value="Internal notes">Internal notes</option>
                            </select>
                        </label>
                    </section>
                    <details class="studio-assistance-card studio-assistance-notes" open>
                        <summary class="studio-subheading">Internal context (not public)</summary>
                        <label class="studio-field studio-field--full">
                            <span class="studio-sr-only">Notes</span>
                            <textarea id="studio-assist-notes" class="studio-textarea" rows="5" placeholder="Use this to guide tone and constraints for this draft."></textarea>
                        </label>
                    </details>
                </aside>
            </div>
            <div class="studio-assistance-bottom-bar">
                <button type="button" class="studio-btn-ghost" id="studio-assist-copy-output">Copy output</button>
                <button type="button" class="studio-btn-ghost" id="studio-assist-apply">Apply to field</button>
                <button type="button" class="studio-btn-primary" id="studio-assist-save-draft">Save draft</button>
            </div>
            <p id="studio-assist-msg" class="studio-banner studio-banner--info" style="display:none"></p>
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
                        <option value="collaborator">collaborator</option>
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
                <label class="studio-field"><span>Membership</span>
                    <select id="studio-users-filter-membership" class="studio-select">
                        <option value="">All</option>
                        <option value="exempt">Exempt (manual)</option>
                        <option value="trial_active">Trial active</option>
                        <option value="trial_expired">Trial expired</option>
                        <option value="active">Active (Stripe)</option>
                        <option value="trialing">Trialing</option>
                        <option value="past_due">Past due</option>
                        <option value="canceled">Canceled</option>
                        <option value="none">No subscription</option>
                    </select>
                </label>
                </div>
            </div>
            <div class="studio-toolbar-actions studio-users-sync-toolbar" style="margin:0.5rem 0 0.75rem;flex-wrap:wrap;gap:0.5rem;align-items:center">
                <h3 class="studio-subheading" style="margin:0;width:100%">All accounts</h3>
                <label class="studio-field">
                    <span>Trial role</span>
                    <select id="studio-users-trial-role" class="studio-select">
                        <option value="artist">artist</option>
                        <option value="gallery">gallery</option>
                        <option value="curator">curator</option>
                        <option value="collector">collector</option>
                    </select>
                </label>
                <button type="button" class="studio-btn-ghost" id="studio-users-generate-trial-code">
                    Generate access code
                </button>
                <button type="button" class="studio-btn-secondary" id="studio-users-view-access-codes">
                    View access codes
                </button>
                <button type="button" class="studio-btn-primary" id="studio-users-sync-all" aria-busy="false">
                    Sync subscriptions
                </button>
                <button type="button" class="studio-btn-secondary" id="studio-users-load-contacts" aria-busy="false">
                    Load contacts
                </button>
                <span id="studio-users-sync-msg" class="studio-muted" role="status"></span>
            </div>
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead><tr><th><span class="studio-sr-only">Health</span></th><th>Identity</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Membership</th><th>Trial</th><th>Renews</th><th>Linked artist</th><th>Org</th><th>Updated</th><th class="studio-td-actions">Actions</th></tr></thead>
                    <tbody id="studio-users-tbody"><tr><td colspan="13">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderServices() {
    return `
        <div class="studio-section-stack studio-services">
            <p class="studio-muted">Configure off-chain integrations (Payments, Resend, S3). Publishable keys and URLs can be stored here for dev; <strong>never</strong> ship live secret keys in a public build. Server secrets belong in <code>services/fusion-integration-api/.env</code>.</p>
            <p class="studio-banner studio-banner--info" id="studio-svc-msg" style="display:none"></p>
            <div class="studio-tabs" data-studio-tabs="services">
                <div class="studio-tabs__list" role="tablist" aria-label="Services sections">
                    <button type="button" class="studio-tabs__tab is-active" role="tab" id="studio-svc-tab-connect" aria-selected="true" aria-controls="studio-svc-panel-connect">Connection</button>
                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-svc-tab-subscription" aria-selected="false" aria-controls="studio-svc-panel-subscription">Subscription</button>
                    <button type="button" class="studio-tabs__tab" role="tab" id="studio-svc-tab-stripe" aria-selected="false" aria-controls="studio-svc-panel-stripe">Payments</button>
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
                        <div class="studio-pay">
                            <div class="studio-pay-topbar">
                                <div class="studio-pay-topbar__intro">
                                    <h3 class="studio-pay-topbar__title">Payments</h3>
                                    <p class="studio-muted">Choose the <strong>active provider</strong> for all new checkouts (memberships, application fees, program payments). Use <strong>Environment</strong> to switch Test/Sandbox vs Live keys for the selected provider.</p>
                                </div>
                                <div class="studio-pay-controls">
                                    <div class="studio-pay-env" role="group" aria-label="Active payment provider">
                                        <span class="studio-pay-env__label">Provider</span>
                                        <div class="studio-pay-segmented">
                                            <input type="radio" name="studio-svc-payment-provider" value="paypal" id="studio-svc-provider-paypal" class="studio-pay-segmented__input" checked />
                                            <label for="studio-svc-provider-paypal" class="studio-pay-segmented__btn">PayPal</label>
                                            <input type="radio" name="studio-svc-payment-provider" value="stripe" id="studio-svc-provider-stripe" class="studio-pay-segmented__input" />
                                            <label for="studio-svc-provider-stripe" class="studio-pay-segmented__btn">Stripe</label>
                                        </div>
                                        <span class="studio-pay-env__pill" data-studio-pay-provider-label>PayPal</span>
                                    </div>
                                    <div class="studio-pay-env" role="group" aria-label="Payment environment">
                                        <span class="studio-pay-env__label">Environment</span>
                                        <div class="studio-pay-segmented">
                                            <input type="radio" name="studio-svc-stripe-mode" value="test" id="studio-svc-mode-test" class="studio-pay-segmented__input" checked />
                                            <label for="studio-svc-mode-test" class="studio-pay-segmented__btn">Test / Sandbox</label>
                                            <input type="radio" name="studio-svc-stripe-mode" value="live" id="studio-svc-mode-live" class="studio-pay-segmented__input" />
                                            <label for="studio-svc-mode-live" class="studio-pay-segmented__btn">Live</label>
                                        </div>
                                        <span class="studio-pay-env__pill" data-studio-pay-env-label>Test / Sandbox</span>
                                    </div>
                                </div>
                            </div>

                            <div class="studio-pay-providers">
                                <section class="studio-pay-card studio-pay-card--active" id="studio-svc-paypal-card" data-studio-pay-card="paypal">
                                    <header class="studio-pay-card__head">
                                        <div class="studio-pay-card__ident">
                                            <span class="studio-pay-logo studio-pay-logo--paypal">PayPal</span>
                                            <span class="studio-pay-badge studio-pay-badge--active" data-studio-pay-provider-badge="paypal">Active · new checkouts</span>
                                        </div>
                                        <span class="studio-pay-status" id="studio-svc-paypal-status">—</span>
                                    </header>
                                    <p class="studio-muted studio-pay-card__desc">Embedded PayPal buttons for memberships and application fees. Set the browser <strong>client ID</strong> here; keep the secret on the integration server (<code>PAYPAL_CLIENT_SECRET</code>).</p>
                                    <label class="studio-field">
                                        <span>Client ID — Sandbox</span>
                                        <input type="text" id="studio-svc-paypal-test" class="studio-input" placeholder="AY… (sandbox)" autocomplete="off" />
                                    </label>
                                    <label class="studio-field">
                                        <span>Client ID — Live</span>
                                        <input type="text" id="studio-svc-paypal-live" class="studio-input" placeholder="AY… (live)" autocomplete="off" />
                                    </label>
                                    <p class="studio-pay-resolved">Resolved for <span data-studio-pay-env-label>Test / Sandbox</span>: <code id="studio-svc-paypal-resolved">—</code></p>
                                    <div class="studio-pay-card__actions">
                                        <button type="button" class="studio-btn-ghost" id="studio-svc-help-paypal">How to set up PayPal</button>
                                    </div>
                                </section>

                                <section class="studio-pay-card studio-pay-card--legacy" id="studio-svc-stripe-card" data-studio-pay-card="stripe">
                                    <header class="studio-pay-card__head">
                                        <div class="studio-pay-card__ident">
                                            <span class="studio-pay-logo studio-pay-logo--stripe">Stripe</span>
                                            <span class="studio-pay-badge studio-pay-badge--legacy" data-studio-pay-provider-badge="stripe">Legacy · existing subs</span>
                                        </div>
                                        <span class="studio-pay-status" id="studio-svc-stripe-status">—</span>
                                    </header>
                                    <p class="studio-muted studio-pay-card__desc">When selected as the active provider, new checkouts use embedded Stripe Elements. Existing Stripe subscriptions still sync, cancel, and appear in Finance.</p>
                                    <label class="studio-field">
                                        <span>Publishable key — Test <code>pk_test_…</code></span>
                                        <input type="text" id="studio-svc-pk-test" class="studio-input" placeholder="pk_test_…" autocomplete="off" />
                                    </label>
                                    <label class="studio-field">
                                        <span>Secret key — Test <code>sk_test_…</code> <em>(server only, never saved)</em></span>
                                        <input type="password" id="studio-svc-sk-test" class="studio-input" placeholder="Paste to build .env; cleared on reload" autocomplete="off" />
                                    </label>
                                    <details class="studio-pay-details" id="studio-svc-live-details">
                                        <summary>Live keys (production)</summary>
                                        <div class="studio-pay-details__body">
                                            <label class="studio-field">
                                                <span>Publishable key — Live <code>pk_live_…</code></span>
                                                <input type="text" id="studio-svc-pk-live" class="studio-input" placeholder="pk_live_…" autocomplete="off" />
                                            </label>
                                            <label class="studio-field">
                                                <span>Secret key — Live <code>sk_live_…</code> <em>(server only, never saved)</em></span>
                                                <input type="password" id="studio-svc-sk-live" class="studio-input" placeholder="Never commit" autocomplete="off" />
                                            </label>
                                        </div>
                                    </details>
                                    <p class="studio-pay-resolved">Resolved for <span data-studio-pay-env-label>Test / Sandbox</span>: <code id="studio-svc-pk-resolved">—</code></p>
                                    <div class="studio-pay-card__actions">
                                        <button type="button" class="studio-btn-ghost" id="studio-svc-help-stripe">How to set up Stripe</button>
                                        <button type="button" class="studio-btn-ghost" id="studio-svc-copy-env">Copy .env snippet</button>
                                    </div>
                                </section>
                            </div>

                            <details class="studio-pay-details studio-pay-devtools">
                                <summary>Developer tools — test Stripe PaymentIntent</summary>
                                <div class="studio-pay-details__body">
                                    <p class="studio-muted">Creates a one-off PaymentIntent via <code>POST /stripe/create-payment-intent</code> (min 50 in smallest units). Test card <code>4242 4242 4242 4242</code>.</p>
                                    <div class="studio-pay-devtools__row">
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
                                    </div>
                                    <div class="studio-pay-card__actions">
                                        <button type="button" class="studio-btn-primary" id="studio-svc-pi-create">Create test PaymentIntent</button>
                                        <button type="button" class="studio-btn-ghost" id="studio-svc-pi-copy" disabled>Copy client secret</button>
                                    </div>
                                    <label class="studio-field studio-field--full">
                                        <span>Client secret</span>
                                        <textarea id="studio-svc-pi-secret" class="studio-input studio-textarea-mono" rows="3" readonly placeholder="Create a PaymentIntent to see the secret"></textarea>
                                    </label>
                                </div>
                            </details>

                            <div class="studio-pay-savebar">
                                <span class="studio-muted studio-pay-savebar__hint">Client IDs, publishable keys, and the environment save to this browser. Secret keys are only used to build the <code>.env</code> snippet.</span>
                                <button type="button" class="studio-btn-primary" id="studio-svc-save-payments">Save payment settings</button>
                            </div>
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
                            <h4 class="studio-subheading studio-field--full" style="margin-top:0.5rem">Audience segments (canister)</h4>
                            <p class="studio-muted studio-field--full">Up to five Resend audience segment UUIDs with display names. Used in Email → broadcast segment picker and Subscribers “Audiences”. Saved on-chain (Services edit permission).</p>
                            <label class="studio-field"><span>Segment 1 name</span><input type="text" id="studio-svc-seg-name-1" class="studio-input" placeholder="e.g. Members" /></label>
                            <label class="studio-field"><span>Segment 1 id</span><input type="text" id="studio-svc-seg-id-1" class="studio-input" placeholder="UUID" autocomplete="off" /></label>
                            <label class="studio-field"><span>Segment 2 name</span><input type="text" id="studio-svc-seg-name-2" class="studio-input" /></label>
                            <label class="studio-field"><span>Segment 2 id</span><input type="text" id="studio-svc-seg-id-2" class="studio-input" autocomplete="off" /></label>
                            <label class="studio-field"><span>Segment 3 name</span><input type="text" id="studio-svc-seg-name-3" class="studio-input" /></label>
                            <label class="studio-field"><span>Segment 3 id</span><input type="text" id="studio-svc-seg-id-3" class="studio-input" autocomplete="off" /></label>
                            <label class="studio-field"><span>Segment 4 name</span><input type="text" id="studio-svc-seg-name-4" class="studio-input" /></label>
                            <label class="studio-field"><span>Segment 4 id</span><input type="text" id="studio-svc-seg-id-4" class="studio-input" autocomplete="off" /></label>
                            <label class="studio-field"><span>Segment 5 name</span><input type="text" id="studio-svc-seg-name-5" class="studio-input" /></label>
                            <label class="studio-field"><span>Segment 5 id</span><input type="text" id="studio-svc-seg-id-5" class="studio-input" autocomplete="off" /></label>
                            <div class="studio-field studio-field--full studio-services-actions">
                                <button type="button" class="studio-btn-primary" id="studio-svc-resend-segments-save">Save segments to canister</button>
                            </div>
                            <h4 class="studio-subheading studio-field--full" style="margin-top:0.5rem">New Applicant Notification</h4>
                            <p class="studio-muted studio-field--full">When someone submits a program application, staff receive an email with the subject <strong>New Fusion &lt;program name&gt; Applicant</strong> (name, website, link to Studio → Applicants). <code>info@fusionart.world</code> always receives these; add more addresses below (comma-separated).</p>
                            <div class="studio-field studio-field--full studio-svc-app-notify-row">
                                <label class="studio-svc-app-notify-row__input">
                                    <span>Additional staff emails</span>
                                    <input type="text" id="studio-svc-application-admin-emails" class="studio-input" placeholder="ops@example.com, hiring@example.com" autocomplete="off" />
                                </label>
                                <div class="studio-svc-app-notify-row__test">
                                    <span class="studio-sr-only">Send a test new-applicant email</span>
                                    <button type="button" class="studio-btn-ghost" id="studio-svc-new-applicant-notify-test">Send Test</button>
                                </div>
                            </div>
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
        <div class="studio-section-stack studio-category-page studio-settings-page">
            <section class="studio-settings-card">
            <dl class="studio-dl studio-settings-dl">
                <dt>Data source (<code>database.js</code>)</dt>
                <dd id="studio-set-datasource">—</dd>
                <dt>Network (<code>config.devMode</code>)</dt>
                <dd id="studio-set-network">—</dd>
            </dl>
            <div class="studio-field-row studio-settings-source-row">
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
            </section>
            <section id="studio-platform-banner-tools" class="studio-settings-card" hidden>
                <h3 class="studio-subheading">Platform update banner</h3>
                <p class="studio-muted studio-field--full">
                    Shows a small notice beneath the site header on <strong>public pages only</strong> (hidden on <code>/studio</code>).
                    Stored in the canister as site setting <code>platformUpdateBanner</code> (admin write on live).
                </p>
                <label class="studio-field studio-field--inline studio-field--full">
                    <input type="checkbox" id="studio-platform-banner-enabled" />
                    Show platform update banner
                </label>
                <label class="studio-field studio-field--full">
                    <span>Message (English)</span>
                    <textarea id="studio-platform-banner-en" class="studio-textarea" rows="2" maxlength="512"></textarea>
                </label>
                <label class="studio-field studio-field--full">
                    <span>Message (Japanese)</span>
                    <textarea id="studio-platform-banner-ja" class="studio-textarea" rows="2" maxlength="512"></textarea>
                </label>
                <div class="studio-field-row">
                    <button type="button" class="studio-btn-primary" id="studio-platform-banner-save">Save banner settings</button>
                </div>
                <p id="studio-platform-banner-status" class="studio-muted" role="status" aria-live="polite"></p>
            </section>
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
            <div class="studio-toolbar-actions" style="margin:0 0 0.75rem;flex-wrap:wrap;gap:0.5rem">
                <button type="button" class="studio-btn-secondary" id="studio-audience-gen-${kind}">Generate ${escapeHtml(t)} join invite</button>
            </div>
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

function renderManagementPlaceholder(title, copy, featureId = '') {
    const perm = featureId ? studioFeatureAccess(featureId) : { visible: true, canEdit: true };
    if (!perm.visible) {
        return `
        <div class="studio-section-stack studio-category-page">
            ${studioPageHeaderHtml({
                title,
                subtitle: 'Management workspace',
            })}
            <p class="studio-banner studio-banner--warn">You do not have access to this section.</p>
        </div>
    `;
    }
    return `
        <div class="studio-section-stack studio-category-page">
            ${studioPageHeaderHtml({
                title,
                subtitle: 'Management workspace',
            })}
            <p class="studio-muted">${escapeHtml(copy)}</p>
            <div class="studio-coming-soon">
                <strong>${escapeHtml(title)}</strong>
                Placeholder section. We will complete this workflow later.
            </div>
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
 * @param {unknown} vis
 * @returns {string}
 */
function rosterVisibilityBadgeHtml(vis) {
    const v = normalizeArtistRosterVisibility(vis);
    const mod =
        v === 'public'
            ? 'studio-roster-vis--public'
            : v === 'pending'
              ? 'studio-roster-vis--pending'
              : v === 'private'
                ? 'studio-roster-vis--private'
                : 'studio-roster-vis--inactive';
    return `<span class="studio-roster-vis ${mod}">${escapeHtml(v)}</span>`;
}

/**
 * @param {object} tableRow
 * @param {() => void | Promise<void>} afterSave
 * @param {HTMLElement} hostEl
 * @param {HTMLElement | null} [listSurface]
 */
function openStudioArtistManageFromRow(tableRow, afterSave, hostEl, listSurface = null) {
    const slug = String(tableRow.slug || '');
    hostEl.hidden = false;
    hostEl.innerHTML = `<div class="studio-artist-manage-loading"><p class="studio-muted">Loading artist…</p></div>`;
    if (listSurface) listSurface.hidden = true;

    const close = () => {
        hostEl.innerHTML = '';
        hostEl.hidden = true;
        if (listSurface) listSurface.hidden = false;
    };

    void (async () => {
        /** @type {object | null} */
        let full = null;
        try {
            full = await loadArtistForStudioEdit(slug, tableRow);
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            close();
            return;
        }
        if (!full) {
            alert('Could not load artist.');
            close();
            return;
        }
        const profileLink = `/profile/${encodeURIComponent(String(full.slug || ''))}`;
        const statusText = String(full.locales?.en?.status || full.status || 'Artist');
        const slugLabel = String(full.slug || full.id || '').trim();
        const joinedAt = formatStudioDate(full.createdAt || full.joinedAt);
        const visibility = normalizeArtistRosterVisibility(full.visibility);
        const visibilityBadgeMod =
            visibility === 'public'
                ? 'is-public'
                : visibility === 'pending'
                  ? 'is-pending'
                  : visibility === 'private'
                    ? 'is-private'
                    : 'is-inactive';
        hostEl.innerHTML = `
            <div class="studio-artist-manage-shell" data-studio-artist-manage>
                <div class="studio-artist-manage-top">
                    <div class="studio-artist-manage-crumb">Studio / Artists</div>
                    <div class="studio-artist-manage-top-actions">
                        <button type="button" class="studio-btn-ghost" id="studio-art-more-actions">More actions</button>
                        <button type="button" class="studio-btn-ghost" id="studio-art-exit-manage" aria-label="Exit manage">✕</button>
                    </div>
                </div>
                <h2 class="studio-artist-manage-title">Manage Artist</h2>
                <section class="studio-artist-identity-bar">
                    <div class="studio-artist-identity-main">
                        <div class="studio-artist-identity-avatar">${escapeHtml(
                            String(full.locales?.en?.name || full.slug || 'A').slice(0, 2).toUpperCase()
                        )}</div>
                        <div class="studio-artist-identity-meta">
                            <div class="studio-artist-identity-name">${escapeHtml(
                                String(full.locales?.en?.name || full.slug || full.id || 'Artist')
                            )} <span class="studio-artist-identity-slug">${escapeHtml(slugLabel)}</span></div>
                            <div class="studio-artist-identity-subline">
                                <span>${escapeHtml(statusText)}</span>
                                <span class="studio-artist-status-pill ${visibilityBadgeMod}">${escapeHtml(
                                    visibility
                                )}</span>
                                <span>Joined ${escapeHtml(joinedAt)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="studio-artist-identity-side">
                        <div class="studio-artist-identity-kv">
                            <span>Profile</span>
                            <a class="studio-action-link" href="${escapeHtml(profileLink)}" target="_blank" rel="noopener">Open profile ↗</a>
                        </div>
                        <div class="studio-artist-identity-kv">
                            <span>Visibility</span>
                            <strong>${escapeHtml(visibility)}</strong>
                        </div>
                    </div>
                </section>
                <div class="studio-artist-manage-content">
                    <div class="studio-artist-manage-main">
                        ${renderArtistManageModalHtml(escapeHtml, full, { isTest: getDataSource() === 'test' })}
                    </div>
                    <aside class="studio-artist-context-panel">
                        <section class="studio-artist-context-card">
                            <h3>Artist Overview</h3>
                            <div class="studio-artist-kv"><span>Total programs</span><strong>${escapeHtml(String((full.appliedPrograms || []).length || 0))}</strong></div>
                            <div class="studio-artist-kv"><span>Exclusive content</span><strong>${escapeHtml(String((full.locales?.en?.links || []).length || 0))}</strong></div>
                            <div class="studio-artist-kv"><span>Discussions</span><strong>—</strong></div>
                            <div class="studio-artist-kv"><span>Followers</span><strong>—</strong></div>
                            <div class="studio-artist-kv"><span>Last active</span><strong>${escapeHtml(formatStudioDate(full.updatedAt))}</strong></div>
                        </section>
                        <section class="studio-artist-context-card">
                            <h3>Quick Links</h3>
                            <a class="studio-action-link" href="${escapeHtml(profileLink)}" target="_blank" rel="noopener">View public profile</a>
                            <a class="studio-action-link" href="/artists" target="_blank" rel="noopener">View artist content</a>
                            <a class="studio-action-link" href="mailto:${escapeHtml(String(full.contactEmail || ''))}">Send email</a>
                            <button type="button" class="studio-action-link studio-action-link--btn" disabled title="Impersonation is unavailable in this build">Impersonate</button>
                        </section>
                        <section class="studio-artist-context-card">
                            <h3>System Info</h3>
                            <div class="studio-artist-kv"><span>Created</span><strong>${escapeHtml(formatStudioDate(full.createdAt))}</strong></div>
                            <div class="studio-artist-kv"><span>Updated</span><strong>${escapeHtml(formatStudioDate(full.updatedAt))}</strong></div>
                            <div class="studio-artist-kv"><span>Artist ID</span><strong>${escapeHtml(String(full.id || '—'))}</strong></div>
                        </section>
                    </aside>
                </div>
            </div>
        `;
        const root = hostEl;
        const initAssetPreviews = () => {
            root.querySelectorAll('img[data-preview-input]').forEach((imgEl) => {
                const sel = imgEl.getAttribute('data-preview-input');
                if (!sel) return;
                const input = root.querySelector(sel);
                if (!(input instanceof HTMLInputElement)) return;
                /** @param {{ bust?: boolean }} [opts] */
                const apply = (opts = {}) => {
                    const v = String(input.value || '').trim();
                    if (!v) {
                        imgEl.removeAttribute('src');
                        imgEl.closest('.studio-asset-thumb')?.classList.add('is-empty');
                        return;
                    }
                    let src = v;
                    if (opts.bust) {
                        try {
                            const u = new URL(v, window.location.origin);
                            u.searchParams.set('studioPreview', String(Date.now()));
                            src = u.href;
                        } catch {
                            const sep = v.includes('?') ? '&' : '?';
                            src = `${v}${sep}studioPreview=${Date.now()}`;
                        }
                    }
                    imgEl.setAttribute('src', src);
                    imgEl.closest('.studio-asset-thumb')?.classList.remove('is-empty');
                };
                input.addEventListener('input', () => apply({ bust: false }));
                input.addEventListener('change', () => apply({ bust: true }));
                apply({ bust: true });
            });
        };
        root.querySelector('#studio-art-exit-manage')?.addEventListener('click', () => close());
        root.querySelector('#studio-art-cancel')?.addEventListener('click', () => close());
        initArtistManageTabs(root);
        initArtistPreviewTab(root, full);
        initArtistBlindspotsTab(root, full);
        void initArtistProgramsTab(root, full);
        initAssetPreviews();
        syncStudioPublicWorldSource(
            root,
            full.locales && typeof full.locales === 'object'
                ? /** @type {Record<string, unknown>} */ (full.locales)
                : {},
        );

        root.addEventListener('click', (e) => {
            const worldSourceBtn = e.target?.closest?.('[data-studio-world-source]');
            if (!worldSourceBtn || !root.contains(worldSourceBtn)) return;
            e.preventDefault();
            const source = worldSourceBtn.getAttribute('data-studio-world-source');
            if (source !== 'world' && source !== 'newWorld') return;
            try {
                const row = artistRowForLlmFromManageForm(root, full);
                const loc =
                    row.locales && typeof row.locales === 'object'
                        ? /** @type {Record<string, unknown>} */ (row.locales)
                        : {};
                syncStudioPublicWorldSource(root, loc, source);
            } catch {
                syncStudioPublicWorldSource(root, {}, source);
            }
        });

        root.querySelector('#studio-art-gen-access-code')?.addEventListener('click', async () => {
            if (getDataSource() !== 'live') {
                alert('Generate new code is available in Live data mode only.');
                return;
            }
            const inp = root.querySelector('#studio-art-access-code');
            try {
                const rows = await getArtistsForStudio();
                const pool = collectAccessCodesFromArtists(Array.isArray(rows) ? rows : []);
                const code = nextUniqueAccessCode(pool);
                if (inp instanceof HTMLInputElement) {
                    inp.value = code;
                }
            } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
            }
        });

        root.querySelector('#studio-art-new-world-from-base')?.addEventListener('click', async () => {
            if (getDataSource() !== 'live') {
                alert('New World from base requires Live data source (IC LLM on the backend canister).');
                return;
            }
            const btn = root.querySelector('#studio-art-new-world-from-base');
            const row = artistRowForLlmFromManageForm(root, full);
            if (!hasUsableIdentityLlmSourceInput(row)) {
                alert(
                    'Add bio, discipline, location, or quote on the Identity tab first, then try again.',
                );
                return;
            }
            if (btn instanceof HTMLButtonElement) btn.disabled = true;
            setStudioArtistManageBusy(root, true, 'Generating New World from Identity…');
            try {
                const locales = await buildMergedLocalesWithGeneratedWorldFromIdentity(
                    row,
                    'fillEmpty',
                    studioReinterpretWithPrompt,
                    studioTranslateEnToJa,
                );
                patchManageFormWorldFields(root, locales);
                syncStudioPublicWorldSource(root, locales);
                const newWorldTab = root.querySelector('#studio-art-tab-new-world');
                if (newWorldTab instanceof HTMLButtonElement) newWorldTab.click();
                alert(
                    'New World generated from Identity. Review World and New World tabs, then Save changes.',
                );
            } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
            } finally {
                setStudioArtistManageBusy(root, false);
                if (btn instanceof HTMLButtonElement) btn.disabled = false;
            }
        });

        root.querySelector('#studio-art-translate-to-new-world')?.addEventListener('click', async () => {
            if (getDataSource() !== 'live') {
                alert('Translate to New World requires Live data source (IC LLM on the backend canister).');
                return;
            }
            const promptEl = root.querySelector('#studio-art-new-world-prompt');
            const promptText = promptEl instanceof HTMLTextAreaElement ? promptEl.value.trim() : '';
            const btn = root.querySelector('#studio-art-translate-to-new-world');
            setStudioArtistManageBusy(root, true, 'Generating New World…');
            try {
                const fieldsUpdated = await translateManageFormWorldToNewWorld(root, {
                    prompt: promptText,
                    reinterpret: studioReinterpretWithPrompt,
                    translateEnToJa: studioTranslateEnToJa,
                });
                if (fieldsUpdated === 0) {
                    alert(
                        'No World copy to translate. Fill Story & World fields on the World tab, or use New World from base to generate from Identity.',
                    );
                    return;
                }
                syncStudioPublicWorldSource(
                    root,
                    { en: { worldNew: { practice: 'generated' } } },
                    'newWorld',
                );
                const newWorldTab = root.querySelector('#studio-art-tab-new-world');
                if (newWorldTab instanceof HTMLButtonElement) newWorldTab.click();
                alert(
                    'New World generated (Kamauu-style). Open the New World tab to review, then save the artist.',
                );
            } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
            } finally {
                setStudioArtistManageBusy(root, false);
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
                    const { file: prepared } = await prepareImageFileForUpload(f);
                    await uploadBlobToS3(prepared, targetInput instanceof HTMLInputElement ? targetInput : null, {
                        area: 'studio/artists',
                        entityType: 'artist',
                        entityId: String(full.id || ''),
                        fieldKey: 'hero',
                    });
                } catch (err) {
                    alert(err instanceof Error ? err.message : String(err));
                }
                t.value = '';
            });
        }

        const heroProfileFile = root.querySelector('#studio-art-hero-profile-file');
        if (heroProfileFile instanceof HTMLInputElement) {
            heroProfileFile.addEventListener('change', async (ev) => {
                const t = ev.target;
                const f = t instanceof HTMLInputElement ? t.files?.[0] : null;
                if (!f) return;
                const targetInput = root.querySelector('#studio-art-hero-profile-image');
                try {
                    const { file: prepared } = await prepareImageFileForUpload(f);
                    await uploadBlobToS3(prepared, targetInput instanceof HTMLInputElement ? targetInput : null, {
                        area: 'studio/artists',
                        entityType: 'artist',
                        entityId: String(full.id || ''),
                        fieldKey: 'heroProfile',
                    });
                } catch (err) {
                    alert(err instanceof Error ? err.message : String(err));
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
                    const { file: prepared } = await prepareImageFileForUpload(f);
                    await uploadBlobToS3(prepared, targetInput instanceof HTMLInputElement ? targetInput : null, {
                        area: 'studio/artists',
                        entityType: 'artist',
                        entityId: String(full.id || ''),
                        fieldKey: `${loc}-intro-${slot}`,
                    });
                    // Deterministic S3 overwrite keeps the same URL — force preview refresh.
                    if (targetInput instanceof HTMLInputElement) {
                        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } catch (err) {
                    alert(err instanceof Error ? err.message : String(err));
                }
                t.value = '';
            });
        });

        const audioFile = root.querySelector('#studio-art-audio-file');
        if (audioFile instanceof HTMLInputElement) {
            audioFile.addEventListener('change', async (ev) => {
                const t = ev.target;
                const f = t instanceof HTMLInputElement ? t.files?.[0] : null;
                if (!f) return;
                const targetInput = root.querySelector('#studio-art-audio-url');
                try {
                    await uploadBlobToS3(f, targetInput instanceof HTMLInputElement ? targetInput : null, {
                        area: 'studio/artists',
                        entityType: 'artist',
                        entityId: String(full.id || ''),
                        fieldKey: 'audio',
                    });
                } catch (err) {
                    alert(
                        `${err instanceof Error ? err.message : String(err)}\n\nConfigure S3 presign under Studio → Services.`,
                    );
                }
                t.value = '';
            });
        }

        root.querySelector('#studio-art-manage-form')?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            setStudioArtistManageBusy(root, true, 'Saving artist…');
            try {
                const raw = collectArtistRecordFromForm(root, full);
                const flags = raw._featuredFlags;
                delete raw._featuredFlags;
                try {
                    raw.featuredOrder = await applyFeaturedFlagsFromStudioSaveLive(String(full.id), {
                        featured: Boolean(flags?.featured),
                        featurable: Boolean(flags?.featurable),
                    });
                    await applyHeroProfileImageApprovedFromStudioSaveLive(
                        String(full.id),
                        Boolean(raw.heroProfileImageApproved),
                    );
                    await applyArtistAudioApprovedFromStudioSaveLive(
                        String(full.id),
                        Boolean(raw.audioApproved),
                    );
                } catch (err) {
                    alert(err instanceof Error ? err.message : String(err));
                    return;
                }
                const pool = collectAccessCodesFromArtists(await getArtistsForStudio());
                const rec = normalizeArtistImportRow(raw, pool, { forceImported: false });
                await bulkUpsertArtistsStudio([rec]);
                await adminSetArtistMediaForStudio(String(full.id || rec.profile?.id || ''), {
                    quote: String(raw.quote ?? ''),
                    audioUrl: String(raw.audioUrl ?? ''),
                    audioTitle: String(raw.audioTitle ?? ''),
                });
                close();
                await afterSave();
            } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
            } finally {
                setStudioArtistManageBusy(root, false);
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
                await afterSave();
            } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
            }
        });

        root.querySelector('#studio-art-adv-save')?.addEventListener('click', () => {
            const raw = root.querySelector('#studio-art-adv-json')?.value ?? '';
            try {
                saveArtistTestOverlayJson(String(full.id), raw);
                close();
                void afterSave();
            } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
            }
        });
    })();
}

/**
 * @param {string} code
 * @param {string} audienceNote
 */
async function studioAlertGeneratedJoinInviteCode(code, audienceNote) {
    const parts = [`Generated code: ${code}`];
    const note = String(audienceNote || '').trim();
    if (note) {
        parts.push('');
        parts.push(note);
    }
    parts.push('');
    parts.push(
        'Single-use: deactivates after the first successful registration with Internet Identity.',
    );
    const msg = parts.join('\n');
    try {
        await navigator.clipboard.writeText(code);
        alert(`${msg}\n\n(Copied to clipboard.)`);
    } catch {
        alert(msg);
    }
}

/** Canister row shows paid access (active/trialing) or manual exempt. */
function studioRowCanisterPaid(row) {
    if (!row || typeof row !== 'object') return false;
    if (row.membershipExemptManual) return true;
    if (studioTrialState(row) === 'active') return true;
    const s = String(row.stripeSubscriptionStatus || '').toLowerCase();
    return s === 'active' || s === 'trialing';
}

/**
 * @param {{ trialStartedAtSec?: string | number, trialEndsAtSec?: string | number }} row
 */
function studioTrialStatusLabel(row) {
    const state = studioTrialState(row);
    if (state === 'none') return '—';
    const started = Number(row?.trialStartedAtSec);
    const ends = Number(row?.trialEndsAtSec);
    const startTxt = Number.isFinite(started) ? formatStudioDate(started) : '—';
    const endTxt = Number.isFinite(ends) ? formatStudioDate(ends) : '—';
    return state === 'active' ? `Trial active (${startTxt} -> ${endTxt})` : `Trial expired (${endTxt})`;
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

/**
 * Push Stripe subscription to canister: email lookup first, then principal metadata.
 * @param {string} principal
 * @param {string} [email]
 */
async function pushSubscriptionToCanisterForStudioRow(principal, email) {
    let emailRes =
        /** @type {{ synced?: boolean; reason?: string } | undefined} */ (undefined);
    let principalRes =
        /** @type {{ synced?: boolean; reason?: string } | undefined} */ (undefined);
    let anySynced = false;
    if (!getIntegrationBaseUrl()) {
        return { emailRes, principalRes, anySynced };
    }
    const emailStr = String(email ?? '').trim();
    if (emailStr.includes('@')) {
        emailRes = await syncSubscriptionFromStripeByEmail(emailStr, principal);
        anySynced = emailRes?.synced === true;
    }
    if (!anySynced) {
        principalRes = await syncSubscriptionFromStripe(principal);
        anySynced = principalRes?.synced === true;
    }
    return { emailRes, principalRes, anySynced };
}

/** @param {string | undefined} iso */
function formatStudioAccountUpdatedAt(iso) {
    return formatStudioDateWithTitle(iso);
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

function studioArtistApplicantName(artist) {
    const locales = artist && typeof artist === 'object' ? artist.locales : null;
    const en = locales && typeof locales === 'object' && locales.en && typeof locales.en === 'object' ? locales.en : {};
    return String(artist?.fullName || artist?.name || en.name || artist?.slug || artist?.id || '').trim();
}

function studioArtistApplicantEmail(artist) {
    return String(artist?.contactEmail || artist?.email || '').trim();
}

function buildApplicantArtistOptions(artists) {
    return (Array.isArray(artists) ? artists : [])
        .map((artist) => ({
            id: String(artist?.id || '').trim(),
            name: studioArtistApplicantName(artist),
            email: studioArtistApplicantEmail(artist),
        }))
        .filter((artist) => artist.id && artist.name)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

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
<span>Overwrite existing <strong>New World</strong> fields (otherwise only fill empty <code>worldNew</code> fields)</span>
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
            title: 'Generate New World from bio (batch)',
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

function applicantStatusPillHtml(status) {
    const s = String(status || '');
    const label =
        s === 'postInterviewReview'
            ? 'Post interview review'
            : s === 'needsInfo'
              ? 'Needs info'
              : s === 'accepted'
                ? 'Approved'
                : s === 'rejected'
                  ? 'Denied'
                  : s === 'pulledOut'
                    ? 'Pulled out'
                  : s === 'reviewing'
                    ? 'Initial review'
                    : s === 'pending'
                      ? 'Pending'
                      : s;
    let cls = 'studio-status-pill--neutral';
    if (s === 'pending') cls = 'studio-status-pill--pending';
    else if (s === 'reviewing') cls = 'studio-status-pill--reviewing';
    else if (s === 'postInterviewReview') cls = 'studio-status-pill--reviewing';
    else if (s === 'needsInfo') cls = 'studio-status-pill--needs';
    else if (s === 'accepted') cls = 'studio-status-pill--accepted';
    else if (s === 'rejected') cls = 'studio-status-pill--rejected';
    else if (s === 'pulledOut') cls = 'studio-status-pill--rescinded';
    return `<span class="studio-status-pill ${cls}">${escapeHtml(label)}</span>`;
}

function applicantCategoryPillHtmlLocal(category) {
    return applicantCategoryPillHtml(category, escapeHtml);
}

/** @param {string} payloadJson */
function applicantCategoryCellHtmlLocal(payloadJson) {
    return applicantCategoryCellHtml(payloadJson, escapeHtml);
}

/**
 * @param {object} applicantRow
 * @param {object[]} artists
 * @returns {object | null}
 */
function resolveArtistForApplicant(applicantRow, artists) {
    const row = applicantRow && typeof applicantRow === 'object' ? applicantRow : {};
    const id = String(row.id || '');
    const pipe = id.indexOf('|');
    if (pipe > 0) {
        const artistId = id.slice(0, pipe);
        const found = (Array.isArray(artists) ? artists : []).find((a) => String(a?.id || '') === artistId);
        if (found) return found;
    }
    const em = String(row.email || '')
        .trim()
        .toLowerCase();
    if (!em) return null;
    for (const artist of Array.isArray(artists) ? artists : []) {
        const direct = studioArtistApplicantEmail(artist).trim().toLowerCase();
        if (direct && direct === em) return artist;
        const locales = artist?.locales && typeof artist.locales === 'object' ? artist.locales : null;
        if (!locales) continue;
        for (const code of ['en', 'ja']) {
            const block = locales[code];
            if (!block || typeof block !== 'object') continue;
            const localeEmail = String(
                /** @type {Record<string, unknown>} */ (block).email ??
                    /** @type {Record<string, unknown>} */ (block).contactEmail ??
                    '',
            )
                .trim()
                .toLowerCase();
            if (localeEmail && localeEmail === em) return artist;
        }
    }
    return null;
}

function applicantCategorySelectHtml(selectedCategory) {
    const selected = String(selectedCategory || 'general');
    const options = APPLICANT_CATEGORY_OPTIONS.map(
        (o) =>
            `<option value="${escapeHtml(o.value)}"${o.value === selected ? ' selected' : ''}>${escapeHtml(o.label)}</option>`,
    ).join('');
    return `<label class="studio-field studio-field--full">
      <span>Category</span>
      <select id="studio-app-modal-category" class="studio-select">${options}</select>
    </label>`;
}

function applicantSlotSecuredPillHtml(slotSecured) {
    return slotSecured
        ? '<span class="studio-status-pill studio-status-pill--confirmed">Confirmed</span>'
        : '<span class="studio-muted">—</span>';
}

const APPLICANT_DECISION_STATUSES = new Set(['accepted', 'rejected', 'needsInfo', 'pulledOut']);

function applicantDecisionValue(status) {
    return APPLICANT_DECISION_STATUSES.has(String(status || '')) ? String(status) : 'accepted';
}

function applicantWorkflowState(status, slotSecured = false) {
    const s = String(status || 'pending');
    return {
        submitted: true,
        reviewing: ['reviewing', 'postInterviewReview', 'accepted', 'rejected', 'needsInfo', 'pulledOut'].includes(s),
        postInterviewReview: ['postInterviewReview', 'accepted', 'rejected', 'needsInfo', 'pulledOut'].includes(s),
        decision: APPLICANT_DECISION_STATUSES.has(s),
        decisionValue: applicantDecisionValue(s),
        slotSecured: Boolean(slotSecured),
    };
}

function applicantWorkflowStatusFromRoot(root) {
    const decision = root.querySelector('#studio-app-workflow-decision');
    const post = root.querySelector('#studio-app-step-postInterviewReview');
    const review = root.querySelector('#studio-app-step-reviewing');
    if (decision instanceof HTMLInputElement && decision.checked) {
        const decisionSelect = root.querySelector('#studio-app-decision-status');
        return decisionSelect instanceof HTMLSelectElement ? decisionSelect.value : 'accepted';
    }
    if (post instanceof HTMLInputElement && post.checked) return 'postInterviewReview';
    if (review instanceof HTMLInputElement && review.checked) return 'reviewing';
    return 'pending';
}

function syncApplicantWorkflowControl(root) {
    const review = root.querySelector('#studio-app-step-reviewing');
    const post = root.querySelector('#studio-app-step-postInterviewReview');
    const decision = root.querySelector('#studio-app-workflow-decision');
    if (decision instanceof HTMLInputElement && decision.checked) {
        if (review instanceof HTMLInputElement) review.checked = true;
        if (post instanceof HTMLInputElement) post.checked = true;
    }
    if (post instanceof HTMLInputElement && post.checked && review instanceof HTMLInputElement) {
        review.checked = true;
    }
    if (review instanceof HTMLInputElement && !review.checked) {
        if (post instanceof HTMLInputElement) post.checked = false;
        if (decision instanceof HTMLInputElement) decision.checked = false;
    }
    if (post instanceof HTMLInputElement && !post.checked && decision instanceof HTMLInputElement) {
        decision.checked = false;
    }
    const decisionField = root.querySelector('#studio-app-decision-field');
    if (decisionField instanceof HTMLElement && decision instanceof HTMLInputElement) {
        decisionField.hidden = !decision.checked;
    }
}

function applicantWorkflowControlHtml(
    status,
    slotSecured = false,
    manualDepositSubmitted = false,
    isTester = false,
    depositWaived = false,
) {
    const state = applicantWorkflowState(status, slotSecured);
    const checked = (value) => (value ? 'checked' : '');
    const slotOn = state.slotSecured || manualDepositSubmitted || depositWaived;
    const depositLabel = depositWaived ? 'Deposit waived' : 'Manual deposit submitted';
    const depositHint = depositWaived
        ? 'Fully sponsored — no deposit required'
        : 'Payment received outside the member dashboard';
    const slotHint = depositWaived
        ? 'Secured by full sponsorship (no deposit required)'
        : 'Completed after deposit or full payment';
    return `<fieldset class="studio-app-workflow" aria-label="Applicant workflow">
      <legend>Program status timeline</legend>
      <label class="studio-app-workflow__step">
        <input type="checkbox" id="studio-app-step-submitted" checked disabled />
        <span><strong>Submitted</strong><small>Connected to Pending</small></span>
      </label>
      <label class="studio-app-workflow__step">
        <input type="checkbox" id="studio-app-step-reviewing" ${checked(state.reviewing)} />
        <span><strong>Initial review</strong><small>Connected to Reviewing</small></span>
      </label>
      <label class="studio-app-workflow__step">
        <input type="checkbox" id="studio-app-step-postInterviewReview" ${checked(state.postInterviewReview)} />
        <span><strong>Post interview review</strong><small>Connected to Post interview review</small></span>
      </label>
      <label class="studio-app-workflow__step">
        <input type="checkbox" id="studio-app-workflow-decision" ${checked(state.decision)} />
        <span><strong>Decision</strong><small>Approved, denied, needs info, or pulled out</small></span>
      </label>
      <label class="studio-field studio-app-workflow__decision" id="studio-app-decision-field" ${state.decision ? '' : 'hidden'}>
        <span>Decision result</span>
        <select id="studio-app-decision-status" class="studio-select">
          <option value="accepted" ${state.decisionValue === 'accepted' ? 'selected' : ''}>Approved</option>
          <option value="rejected" ${state.decisionValue === 'rejected' ? 'selected' : ''}>Denied</option>
          <option value="needsInfo" ${state.decisionValue === 'needsInfo' ? 'selected' : ''}>Needs info</option>
          <option value="pulledOut" ${state.decisionValue === 'pulledOut' ? 'selected' : ''}>Pulled out</option>
        </select>
      </label>
      <label class="studio-app-workflow__step" id="studio-app-step-manual-deposit-wrap">
        <input type="checkbox" id="studio-app-step-manual-deposit" ${checked(manualDepositSubmitted && !depositWaived)} ${depositWaived ? 'disabled' : ''} />
        <span><strong id="studio-app-step-manual-deposit-label">${depositLabel}</strong><small id="studio-app-step-manual-deposit-hint">${depositHint}</small></span>
      </label>
      <label class="studio-app-workflow__step">
        <input type="checkbox" id="studio-app-step-is-tester" ${checked(isTester)} />
        <span><strong>Tester</strong><small>Hidden from All and status tabs; visible under Tester filter only</small></span>
      </label>
      <label class="studio-app-workflow__step studio-app-workflow__step--readonly">
        <input type="checkbox" id="studio-app-step-slot-secured" ${checked(slotOn)} disabled />
        <span><strong>Slot secured</strong><small id="studio-app-step-slot-secured-hint">${slotHint}</small></span>
      </label>
    </fieldset>`;
}

/** @type {Record<string, (mainEl: HTMLElement) => Promise<void>>} */
const STUDIO_INIT = {
    [STUDIO_DASHBOARD_ID]: initDashboard,
    home: initHome,
    subscribers: initSubscribers,
    applicants: initApplicants,
    finance: initFinance,
    artists: initArtists,
    'pending-approval': initPendingApproval,
    'profile-images': initProfileImages,
    'audio-files': initAudioFiles,
    programs: initPrograms,
    products: initProducts,
    'gallery-access': initGalleryAccess,
    'join-network': initJoinNetworkPageStudio,
    journal: initJournal,
    sound: initSound,
    community: initCommunitySection,
    videos: initVideosSection,
    content: initContent,
    'user-studio': initUserStudio,
    email: initEmail,
    ai: initAi,
    galleries: (el) => initAudience(el, 'galleries'),
    collectors: (el) => initAudience(el, 'collectors'),
    curators: (el) => initAudience(el, 'curators'),
    users: initUsers,
    services: initServices,
    settings: initSettings,
    permissions: initPermissions,
    team: initTeamSection,
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
        const pendingWrap = mainEl.querySelector('#studio-dashboard-pending-wrap');
        const pendingList = mainEl.querySelector('#studio-dashboard-pending-list');
        if (pendingWrap && pendingList && studioFeatureAccess('pending-approval').visible) {
            try {
                const all = await getArtistsForStudio();
                const pending = all.filter(
                    (a) => normalizeArtistRosterVisibility(/** @type {unknown} */ (a).visibility) === 'pending',
                );
                pendingWrap.hidden = false;
                if (!pending.length) {
                    pendingList.innerHTML =
                        '<p class="studio-muted">No artists awaiting visibility review.</p>';
                } else {
                    pendingList.innerHTML = `
                        <table class="studio-table studio-table--dense">
                            <thead>
                                <tr>
                                    <th>Name / slug</th>
                                    <th>ID</th>
                                    <th>Status</th>
                                    <th class="studio-td-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pending
                                    .map((a) => {
                                        const slugRaw = String(a.slug || '');
                                        const slug = escapeHtml(slugRaw);
                                        const id = escapeHtml(String(a.id || ''));
                                        return `<tr>
                                            <td>${slug}</td>
                                            <td><code class="studio-code-inline">${id}</code></td>
                                            <td>${rosterVisibilityBadgeHtml(a.visibility)}</td>
                                            <td class="studio-td-actions">
                                                <a href="#pending-approval" class="studio-quick-link">Review</a>
                                                ${
                                                    slugRaw
                                                        ? `<a class="studio-action-link" href="/profile/${encodeURIComponent(slugRaw)}" target="_blank" rel="noopener">Profile</a>`
                                                        : ''
                                                }
                                            </td>
                                        </tr>`;
                                    })
                                    .join('')}
                            </tbody>
                        </table>`;
                }
            } catch {
                pendingWrap.hidden = true;
            }
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
    const allToGeneralBtn = mainEl.querySelector('#studio-subscribers-all-to-general');
    const csvInput = mainEl.querySelector('#studio-subscriber-csv');
    const downloadCsvBtn = mainEl.querySelector('#studio-subscribers-download-csv');
    const searchInput = mainEl.querySelector('#studio-subscribers-search');
    const countEl = mainEl.querySelector('#studio-subscribers-header-count');

    const subPerm = studioFeatureAccess('subscribers');
    const subCols = subPerm.canEdit ? 8 : 6;

    /** @type {Array<{ name: string, segmentId: string }>} */
    let resendSegmentList = [];

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

    const segmentIdToLabel = (id) => {
        const t = String(id || '').trim();
        if (!t) return '—';
        const hit = resendSegmentList.find((x) => String(x.segmentId).trim() === t);
        return (hit && String(hit.name || '').trim()) || `${t.slice(0, 8)}…`;
    };

    const formatAudiencesCell = (row) => {
        const a = Array.isArray(row.audiences) ? row.audiences : [];
        if (!a.length) return '—';
        return a.map((id) => escapeHtml(segmentIdToLabel(id))).join(', ');
    };

    const wireSubscriberRowActions = () => {
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
        tbody?.querySelectorAll('.studio-sub-manage').forEach((btn) => {
            btn.addEventListener('click', () => {
                const email = btn.getAttribute('data-email');
                if (!email) return;
                const row = allSubscriberRows.find(
                    (r) => String(r.email).toLowerCase() === email.toLowerCase(),
                );
                const have = new Set(
                    (Array.isArray(row?.audiences) ? row.audiences : []).map((x) => String(x).trim()).filter(Boolean),
                );
                const slots = (resendSegmentList || [])
                    .map((s) => ({ name: String(s?.name || '').trim(), id: String(s?.segmentId || '').trim() }))
                    .filter((s) => s.id);
                const pillHtml = slots.length
                    ? slots
                          .map(
                              (s) => `
            <button type="button" class="studio-pill studio-audience-pill ${have.has(s.id) ? 'studio-pill--active' : ''}" data-seg="${escapeHtml(s.id)}">
              ${escapeHtml(s.name || s.id.slice(0, 8) + '…')}
            </button>`,
                          )
                          .join('')
                    : '<p class="studio-muted">Configure segment names/ids in Studio → Services → Resend, then save to the canister.</p>';
                const body = `<div class="studio-modal-form studio-audience-manage" data-email="${escapeHtml(email)}">
            <p class="studio-muted">Toggle which Resend segments this address is tagged with in Fusion (canister only). Use Email → <strong>SYNC Audience</strong> to push to Resend.</p>
            <div class="studio-audience-pill-wrap">${pillHtml}</div>
            <button type="button" class="studio-btn-primary" id="studio-audience-save">Save</button>
          </div>`;
                const { close, root: modalRoot } = openStudioModal(body, { title: `Audiences — ${escapeHtml(email)}`, wide: true });
                const wrap = modalRoot.querySelector('.studio-audience-manage');
                wrap?.querySelectorAll('.studio-audience-pill').forEach((p) => {
                    p.addEventListener('click', () => p.classList.toggle('studio-pill--active'));
                });
                modalRoot.querySelector('#studio-audience-save')?.addEventListener('click', async () => {
                    const em = wrap?.getAttribute('data-email') || email;
                    const next = /** @type {string[]} */ ([]);
                    wrap?.querySelectorAll('.studio-audience-pill.studio-pill--active').forEach((p) => {
                        const s = p.getAttribute('data-seg');
                        if (s) next.push(s);
                    });
                    try {
                        await setSubscriberAudiencesForStudio(em, next);
                        close();
                        await loadRows();
                        showBanner('ok', 'Audiences updated.');
                    } catch (e) {
                        alert(e instanceof Error ? e.message : String(e));
                    }
                });
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
            tbody.innerHTML = `<tr><td colspan="${subCols}">${allSubscriberRows.length ? 'No rows match search.' : 'No subscribers yet.'}</td></tr>`;
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
                    <td>${formatAudiencesCell(row)}</td>
                    ${
                        subPerm.canEdit
                            ? `<td class="studio-subscribers-col-manage"><button type="button" class="studio-btn-ghost studio-sub-manage" data-email="${escapeHtml(row.email)}">Audiences</button></td>
                    <td class="studio-td-actions studio-subscribers-col-delete"><button type="button" class="studio-btn-ghost studio-sub-delete" data-email="${escapeHtml(row.email)}">DELETE</button></td>`
                            : ''
                    }
                </tr>
            `,
                )
                .join('');
            if (subPerm.canEdit) wireSubscriberRowActions();
        }
        if (countEl) {
            countEl.textContent = q ? String(rows.length) : String(allSubscriberRows.length);
        }
    };

    const loadRows = async () => {
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="${subCols}">Loading…</td></tr>`;
        showBanner('info', '');
        showCsv('info', '');
        try {
            let rows;
            try {
                rows = await loadSubscribersFromDataSource();
            } catch (genErr) {
                tbody.innerHTML = `<tr><td colspan="${subCols}">Bindings out of date — run <code>dfx generate fusion-app-backend</code> after pulling backend changes.</td></tr>`;
                if (DEV_MODE) console.error(genErr);
                return;
            }
            try {
                resendSegmentList = await getResendSegmentConfigFromCanister();
            } catch {
                resendSegmentList = [];
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
            tbody.innerHTML = `<tr><td colspan="${subCols}">Could not load subscribers. ${escapeHtml(msg)}</td></tr>`;
            allSubscriberRows = [];
            if (countEl) countEl.textContent = '0';
            showBanner(
                'error',
                'Listing may be admin-only. Use “Claim first admin” on a fresh canister, or sign in with an admin principal after Internet Identity is wired.'
            );
            if (DEV_MODE) console.error(e);
        }
    };

    if (!subPerm.canEdit) {
        addBtn?.setAttribute('hidden', '');
        allToGeneralBtn?.setAttribute('hidden', '');
        csvInput?.closest('label')?.setAttribute('hidden', '');
        mainEl.querySelectorAll('.studio-subscribers-col-manage, .studio-subscribers-col-delete').forEach((el) => {
            el.setAttribute('hidden', '');
        });
    }

    allToGeneralBtn?.addEventListener('click', () => {
        const slots = (resendSegmentList || [])
            .map((s) => ({ name: String(s?.name || '').trim(), id: String(s?.segmentId || '').trim() }))
            .filter((s) => s.id);
        const pillHtml = slots.length
            ? slots
                  .map(
                      (s) => `
            <button type="button" class="studio-pill studio-audience-pill" data-seg="${escapeHtml(s.id)}">
              ${escapeHtml(s.name || s.id.slice(0, 8) + '…')}
            </button>`,
                  )
                  .join('')
            : '<p class="studio-muted">Configure segment names/ids in Studio → Services → Resend, then save to the canister.</p>';
        const body = `<div class="studio-modal-form studio-audience-manage studio-audience-manage--batch" id="studio-audience-batch-form">
            <p class="studio-muted">Select one or more Resend audience segments. Each will be <strong>added</strong> to every subscriber’s Fusion audiences (existing tags are kept). Use Email → <strong>SYNC Audience</strong> to push to Resend afterward.</p>
            <div class="studio-audience-pill-wrap">${pillHtml}</div>
            <div class="studio-modal-actions" style="gap:0.5rem;flex-wrap:wrap">
              <button type="button" class="studio-btn-primary" id="studio-subscribers-batch-audience-apply">Add to all subscribers</button>
            </div>
          </div>`;
        const { close, root: modalRoot } = openStudioModal(body, { title: 'Add audiences to all subscribers', wide: true });
        modalRoot.querySelectorAll('.studio-audience-pill').forEach((p) => {
            p.addEventListener('click', () => p.classList.toggle('studio-pill--active'));
        });
        modalRoot.querySelector('#studio-subscribers-batch-audience-apply')?.addEventListener('click', async () => {
            const selected = /** @type {string[]} */ ([]);
            modalRoot.querySelectorAll('.studio-audience-pill.studio-pill--active').forEach((p) => {
                const s = p.getAttribute('data-seg');
                if (s) selected.push(s);
            });
            if (!selected.length) {
                alert('Select at least one audience segment.');
                return;
            }
            const n = allSubscriberRows.length;
            if (n === 0) {
                alert('No subscribers to update.');
                return;
            }
            if (
                !confirm(
                    `Add ${selected.length} segment(s) to all ${n} subscriber(s)? This updates the canister only; sync to Resend separately if needed.`,
                )
            ) {
                return;
            }
            try {
                for (const row of allSubscriberRows) {
                    const em = String(row.email || '').trim();
                    if (!em) continue;
                    const have = new Set(
                        (Array.isArray(row.audiences) ? row.audiences : [])
                            .map((x) => String(x).trim())
                            .filter(Boolean),
                    );
                    for (const id of selected) {
                        if (id) have.add(id);
                    }
                    await setSubscriberAudiencesForStudio(em, [...have]);
                }
                close();
                await loadRows();
                showBanner('ok', `Updated audiences for ${n} subscriber(s).`);
            } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
            }
        });
    });

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

    downloadCsvBtn?.addEventListener('click', async () => {
        try {
            const csv = await getSubscribersCsv();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'fusion-subscribers.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            showCsv('error', msg);
        }
    });

    searchInput?.addEventListener('input', () => applySubscriberFilter());

    await loadRows();
}

const APPLICANTS_PAGE_SIZE = 50;

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

    const appPerm = studioFeatureAccess('applicants');
    if (!appPerm.visible) {
        if (banner) {
            banner.className = 'studio-banner studio-banner--warn';
            banner.textContent = 'You do not have access to this section.';
            banner.style.display = 'block';
        }
        mainEl.querySelector('.studio-section-accordion')?.setAttribute('hidden', '');
        mainEl.querySelector('.studio-table-wrap')?.setAttribute('hidden', '');
        pagination?.setAttribute('hidden', '');
        return;
    }
    const canEditApplicants = appPerm.canEdit;

    /** @type {object[]} */
    let allRows = [];
    let page = 0;
    /** @type {'all' | 'pending' | 'reviewing' | 'postInterviewReview' | 'needsInfo' | 'accepted' | 'rejected' | 'pulledOut' | 'tester'} */
    let statusTab = 'all';
    /** @type {Map<string, string>} */
    let applicantEmailToSlug = new Map();
    /** @type {{ id: string, name: string, email: string }[]} */
    let applicantArtistOptions = [];
    /** @type {object[]} */
    let applicantArtistsFull = [];

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
        if (statusTab === 'tester') {
            rows = rows.filter((r) => getApplicantIsTester(r.payloadJson));
        } else {
            rows = rows.filter((r) => !getApplicantIsTester(r.payloadJson));
            if (statusTab !== 'all') {
                rows = rows.filter((r) => String(r.status) === statusTab);
            }
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
            tbody.innerHTML = `<tr><td colspan="10">${allRows.length ? 'No applicants match filters.' : 'No applicants.'}</td></tr>`;
        } else {
            const delBtn = (id) =>
                canEditApplicants && canDeleteApplicants
                    ? `<td class="studio-td-actions"><button type="button" class="studio-btn-danger studio-app-delete" data-id="${escapeHtml(id)}">Delete</button></td>`
                    : '<td class="studio-td-actions">—</td>';
            const emailBtn = (id) =>
                canEditApplicants
                    ? `<td class="studio-td-actions"><button type="button" class="studio-btn-ghost studio-app-email" data-id="${escapeHtml(id)}">Send email</button></td>`
                    : '<td class="studio-td-actions">—</td>';
            tbody.innerHTML = slice
                .map((r) => {
                    return `
        <tr class="studio-app-row" data-id="${escapeHtml(r.id)}" tabindex="0" role="button">
            <td>${escapeHtml(r.email)}</td>
            <td>${escapeHtml(r.fullName || '')}</td>
            <td>${escapeHtml(r.programId)}</td>
            <td>${applicantStatusPillHtml(r.status)}</td>
            <td>${applicantCategoryCellHtmlLocal(r.payloadJson)}</td>
            <td>${applicantSlotSecuredPillHtml(Boolean(r.slotSecured))}</td>
            <td><span class="studio-muted" title="${escapeHtml(r.createdAt || '')}">${escapeHtml(formatStudioDate(r.createdAt))}</span></td>
            <td class="studio-td-actions"><button type="button" class="studio-btn-ghost studio-app-view" data-id="${escapeHtml(r.id)}">View</button></td>
            ${emailBtn(r.id)}
            ${delBtn(r.id)}
        </tr>`;
                })
                .join('');
            tbody.querySelectorAll('.studio-app-row').forEach((tr) => {
                const openRow = () => {
                    const id = tr.getAttribute('data-id');
                    if (!id) return;
                    if (canEditApplicants) openApplicantModal(id);
                    else openApplicantViewModal(id);
                };
                tr.addEventListener('click', (ev) => {
                    const t = ev.target && /** @type {Element} */ (ev.target).closest?.(
                        '.studio-app-delete, .studio-app-view, .studio-app-email',
                    );
                    if (t) {
                        ev.preventDefault();
                        return;
                    }
                    openRow();
                });
                tr.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') openRow();
                });
            });
            if (canEditApplicants) {
                tbody.querySelectorAll('.studio-app-email').forEach((btn) => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const id = btn.getAttribute('data-id');
                        if (id) openApplicantEmailModal(id);
                    });
                });
            }
            tbody.querySelectorAll('.studio-app-view').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    if (id) openApplicantViewModal(id);
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

    const reload = async () => {
        allRows = await getApplicants();
        allRows = await Promise.all(
            allRows.map(async (row) => ({
                ...row,
                slotSecured:
                    (await getApplicantSlotSecuredStudio(row.id, row.programId, row.payloadJson)) ||
                    getApplicantManualDepositSubmitted(row.payloadJson),
            })),
        );
        try {
            const artists = await getArtistsForStudio();
            applicantArtistsFull = Array.isArray(artists) ? artists : [];
            applicantEmailToSlug = buildApplicantEmailToSlugMap(artists);
            applicantArtistOptions = buildApplicantArtistOptions(artists);
            populateApplicantArtistSelect();
        } catch {
            applicantArtistsFull = [];
            applicantEmailToSlug = new Map();
            applicantArtistOptions = [];
            populateApplicantArtistSelect();
        }
        renderPage();
    };

    const populateApplicantArtistSelect = () => {
        const select = mainEl.querySelector('#studio-app-new-artist');
        if (!(select instanceof HTMLSelectElement)) return;
        const current = select.value;
        select.innerHTML = '<option value="">Manual applicant</option>';
        for (const artist of applicantArtistOptions) {
            const option = document.createElement('option');
            option.value = artist.id;
            option.textContent = artist.email ? `${artist.name} (${artist.email})` : artist.name;
            select.appendChild(option);
        }
        if (current && applicantArtistOptions.some((artist) => artist.id === current)) {
            select.value = current;
        }
    };

    const syncApplicantArtistFields = () => {
        const select = mainEl.querySelector('#studio-app-new-artist');
        if (!(select instanceof HTMLSelectElement) || !select.value) return;
        const artist = applicantArtistOptions.find((item) => item.id === select.value);
        if (!artist) return;
        const programInput = mainEl.querySelector('#studio-app-new-program');
        const idInput = mainEl.querySelector('#studio-app-new-id');
        const emailInput = mainEl.querySelector('#studio-app-new-email');
        const nameInput = mainEl.querySelector('#studio-app-new-name');
        const statusInput = mainEl.querySelector('#studio-app-new-status');
        const programId = String(programInput?.value || '').trim();
        if (idInput instanceof HTMLInputElement && programId) idInput.value = `${artist.id}|${programId}`;
        if (emailInput instanceof HTMLInputElement) emailInput.value = artist.email;
        if (nameInput instanceof HTMLInputElement) nameInput.value = artist.name;
        if (statusInput instanceof HTMLSelectElement) statusInput.value = 'accepted';
    };

    const openApplicantViewModal = (id) => {
        const r = allRows.find((x) => x.id === id);
        if (!r) return;
        const em = String(r.email || '')
            .trim()
            .toLowerCase();
        const siteOrigin = getPublicSiteOrigin();
        const profileSlug = em ? applicantEmailToSlug.get(em) || null : null;
        const { internalNotes } = parseApplicantPayload(r.payloadJson);
        const appBlock = buildApplicantApplicationSectionHtml(r.payloadJson, { siteOrigin, profileSlug, escapeHtml });
        const internalBlock =
            internalNotes && internalNotes.trim()
                ? `<div class="studio-app-internal-notes"><strong>Internal notes</strong><div class="studio-app-internal-notes__body">${escapeHtml(internalNotes)}</div></div>`
                : '';
        const body = `
          <div class="studio-modal-form">
            <p><strong>Email:</strong> ${escapeHtml(r.email)}</p>
            <p><strong>Name:</strong> ${escapeHtml(r.fullName || '—')}</p>
            <p><strong>Program:</strong> ${escapeHtml(r.programId)}</p>
            <p><strong>Status:</strong> ${applicantStatusPillHtml(r.status)}</p>
            <p><strong>Created:</strong> ${escapeHtml(formatStudioDate(r.createdAt))}</p>
            <h3 class="studio-subheading">Application</h3>
            ${appBlock}
            ${internalBlock}
          </div>`;
        openStudioModal(body, { title: 'View application', wide: true });
    };

    const openApplicantEmailModal = (id) => {
        const r = allRows.find((x) => x.id === id);
        if (!r) return;
        void openApplicantEmailComposer(r, {
            onSent: reload,
            canClearCorrespondence: canDeleteApplicants,
        });
    };

    const openApplicantModal = (id) => {
        const r = allRows.find((x) => x.id === id);
        if (!r) return;
        const { internalNotes, rawInvalid } = parseApplicantPayload(r.payloadJson);
        const initialNotes = rawInvalid ? applicantPayloadToPlainNotes(r.payloadJson) : internalNotes;
        const initialManualDeposit = getApplicantManualDepositSubmitted(r.payloadJson);
        const initialIsTester = getApplicantIsTester(r.payloadJson);
        const initialCategory = getApplicantCategory(r.payloadJson);
        const initialFlightCostUsd = (getApplicantFlightCostCents(r.payloadJson) / 100).toFixed(2);
        const initialLocalTravelUsd = (getApplicantLocalTravelCostCents(r.payloadJson) / 100).toFixed(2);
        const initialSpecialCents = getApplicantSpecialProgramTotalCents(r.payloadJson);
        const initialSpecialUsd =
            initialSpecialCents > 0 ? (initialSpecialCents / 100).toFixed(2) : '';
        const initialSponsorshipMode = getApplicantSponsorshipMode(r.payloadJson);
        const initialSponsoredCreditCents = getApplicantSponsoredCreditCents(r.payloadJson);
        const initialSponsoredPercent = getApplicantSponsoredPercent(r.payloadJson);
        const initialSponsoredInputMode = getApplicantSponsoredCreditInputMode(r.payloadJson);
        const initialSponsoredUsd =
            initialSponsoredCreditCents > 0 ? (initialSponsoredCreditCents / 100).toFixed(2) : '';
        const em = String(r.email || '')
            .trim()
            .toLowerCase();
        const siteOrigin = getPublicSiteOrigin();
        const profileSlug = em ? applicantEmailToSlug.get(em) || null : null;
        const appBlock = buildApplicantApplicationSectionHtml(r.payloadJson, { siteOrigin, profileSlug, escapeHtml });
        const rawInvalidBanner = rawInvalid
            ? '<p class="studio-banner studio-banner--warn" style="margin-top:0.5rem">Application payload is not valid JSON. Save keeps the stored payload unchanged until it is valid JSON; internal note edits are ignored in that case.</p>'
            : '';
        const deleteBlock = canDeleteApplicants
            ? `<div class="studio-modal-actions studio-modal-actions--applicant-delete">
            <button type="button" class="studio-btn-danger" id="studio-app-modal-delete">Delete applicant</button>
          </div>`
            : '';
        const body = `
          <div class="studio-modal-form">
            <p class="studio-muted">Reference: <code class="studio-code-inline">${escapeHtml(shortRefLabel(r.id))}</code></p>
            <p><strong>${escapeHtml(r.email)}</strong>${r.fullName ? ` — ${escapeHtml(r.fullName)}` : ''}</p>
            ${rawInvalidBanner}
            <h3 class="studio-subheading">Application</h3>
            ${appBlock}
            <div class="studio-app-status-with-email">
              <div class="studio-app-status-with-email__status">${applicantWorkflowControlHtml(r.status, initialSponsorshipMode === 'full', initialManualDeposit, initialIsTester, initialSponsorshipMode === 'full')}</div>
              <div class="studio-app-status-with-email__send">
                <span class="studio-sr-only">Send email to applicant</span>
                <button type="button" class="studio-btn-ghost" id="studio-app-modal-send-email">Send email</button>
              </div>
            </div>
            ${applicantCategorySelectHtml(initialCategory)}
            <h3 class="studio-subheading">Special pricing</h3>
            <p class="studio-muted mpd-field-hint">Overrides list price for Finance remaining balance and expected revenue. Fully sponsored = $0 due and deposit waived (still Confirmed).</p>
            <label class="studio-field studio-field--check"><input type="checkbox" id="studio-app-modal-special-price-on" ${initialSpecialCents > 0 ? 'checked' : ''} /> <span>Custom program price</span></label>
            <label class="studio-field" id="studio-app-modal-special-price-wrap" ${initialSpecialCents > 0 ? '' : 'hidden'}><span>Special total (USD)</span>
              <input type="text" id="studio-app-modal-special-price" class="studio-input" inputmode="decimal" placeholder="0.00" value="${escapeHtml(initialSpecialUsd)}" />
            </label>
            <label class="studio-field"><span>Sponsorship</span>
              <select id="studio-app-modal-sponsorship" class="studio-select">
                <option value="none" ${initialSponsorshipMode === 'none' ? 'selected' : ''}>None</option>
                <option value="partial" ${initialSponsorshipMode === 'partial' ? 'selected' : ''}>Partially sponsored</option>
                <option value="full" ${initialSponsorshipMode === 'full' ? 'selected' : ''}>Fully sponsored ($0 due, deposit waived)</option>
              </select>
            </label>
            <div id="studio-app-modal-sponsorship-partial" ${initialSponsorshipMode === 'partial' ? '' : 'hidden'}>
              <label class="studio-field"><span>Credit type</span>
                <select id="studio-app-modal-sponsorship-input-mode" class="studio-select">
                  <option value="usd" ${initialSponsoredInputMode === 'usd' ? 'selected' : ''}>Fixed USD</option>
                  <option value="percent" ${initialSponsoredInputMode === 'percent' ? 'selected' : ''}>Percent of price</option>
                </select>
              </label>
              <label class="studio-field" id="studio-app-modal-sponsored-usd-wrap" ${initialSponsoredInputMode === 'percent' ? 'hidden' : ''}><span>Sponsored credit (USD)</span>
                <input type="text" id="studio-app-modal-sponsored-usd" class="studio-input" inputmode="decimal" placeholder="0.00" value="${escapeHtml(initialSponsoredUsd)}" />
              </label>
              <label class="studio-field" id="studio-app-modal-sponsored-pct-wrap" ${initialSponsoredInputMode === 'percent' ? '' : 'hidden'}><span>Sponsored percent</span>
                <input type="number" id="studio-app-modal-sponsored-pct" class="studio-input" min="0" max="100" step="1" placeholder="0" value="${escapeHtml(initialSponsoredPercent != null ? String(initialSponsoredPercent) : '')}" />
              </label>
            </div>
            <label class="studio-field"><span>Flight / ticket cost (USD)</span>
              <input type="text" id="studio-app-modal-flight-cost" class="studio-input" inputmode="decimal" placeholder="0.00" value="${escapeHtml(initialFlightCostUsd === '0.00' ? '' : initialFlightCostUsd)}" />
            </label>
            <label class="studio-field"><span>Local travel (USD)</span>
              <input type="text" id="studio-app-modal-local-travel" class="studio-input" inputmode="decimal" placeholder="0.00" value="${escapeHtml(initialLocalTravelUsd === '0.00' ? '' : initialLocalTravelUsd)}" />
            </label>
            <label class="studio-field studio-field--full"><span>Internal notes (staff only)</span>
              <textarea id="studio-app-modal-notes" class="studio-textarea" rows="6" placeholder="Visible in Studio only; not sent to the applicant."></textarea>
            </label>
            <button type="button" class="studio-btn-primary" id="studio-app-modal-save">Save</button>
            ${deleteBlock}
          </div>`;
        const { close, root } = openStudioModal(body, {
            title: `Applicant — ${escapeHtml(r.email)}`,
            wide: true,
        });
        const notesTa = root.querySelector('#studio-app-modal-notes');
        if (notesTa instanceof HTMLTextAreaElement) {
            notesTa.value = initialNotes;
        }
        let statusAtOpen = r.status;

        const syncSpecialPricingUi = () => {
            const specialOn = root.querySelector('#studio-app-modal-special-price-on');
            const specialWrap = root.querySelector('#studio-app-modal-special-price-wrap');
            const sponsorship = root.querySelector('#studio-app-modal-sponsorship');
            const partialWrap = root.querySelector('#studio-app-modal-sponsorship-partial');
            const modeSel = root.querySelector('#studio-app-modal-sponsorship-input-mode');
            const usdWrap = root.querySelector('#studio-app-modal-sponsored-usd-wrap');
            const pctWrap = root.querySelector('#studio-app-modal-sponsored-pct-wrap');
            if (specialWrap instanceof HTMLElement) {
                specialWrap.hidden = !(specialOn instanceof HTMLInputElement && specialOn.checked);
            }
            const mode =
                sponsorship instanceof HTMLSelectElement ? sponsorship.value : 'none';
            if (partialWrap instanceof HTMLElement) {
                partialWrap.hidden = mode !== 'partial';
            }
            const inputMode =
                modeSel instanceof HTMLSelectElement ? modeSel.value : 'usd';
            if (usdWrap instanceof HTMLElement) usdWrap.hidden = inputMode === 'percent';
            if (pctWrap instanceof HTMLElement) pctWrap.hidden = inputMode !== 'percent';
            syncApplicantDepositUi();
        };
        root.querySelector('#studio-app-modal-special-price-on')?.addEventListener('change', syncSpecialPricingUi);
        root.querySelector('#studio-app-modal-sponsorship')?.addEventListener('change', syncSpecialPricingUi);
        root.querySelector('#studio-app-modal-sponsorship-input-mode')?.addEventListener(
            'change',
            syncSpecialPricingUi,
        );
        // Declared below; call after syncApplicantDepositUi exists.
        const runInitialSpecialPricingUi = () => syncSpecialPricingUi();

        const parseUsdToCents = (raw) => {
            const s = String(raw || '').trim();
            if (!s) return 0;
            return Math.max(0, Math.round(Number(s.replace(/[^0-9.]/g, '')) * 100));
        };

        const makePayloadForSave = () => {
            const rawInner = root.querySelector('#studio-app-modal-notes')?.value ?? '';
            const manualDepositInput = root.querySelector('#studio-app-step-manual-deposit');
            const testerInput = root.querySelector('#studio-app-step-is-tester');
            const categoryInput = root.querySelector('#studio-app-modal-category');
            const sponsorshipSel = root.querySelector('#studio-app-modal-sponsorship');
            const sponsorshipMode =
                sponsorshipSel instanceof HTMLSelectElement
                    ? /** @type {'none' | 'partial' | 'full'} */ (sponsorshipSel.value)
                    : 'none';
            // Fully sponsored waives deposit — do not persist a manual deposit flag.
            const manualDepositSubmitted =
                sponsorshipMode !== 'full' &&
                manualDepositInput instanceof HTMLInputElement &&
                manualDepositInput.checked;
            const isTester = testerInput instanceof HTMLInputElement && testerInput.checked;
            const applicantCategory =
                categoryInput instanceof HTMLSelectElement ? categoryInput.value : initialCategory;
            const flightCostInput = root.querySelector('#studio-app-modal-flight-cost');
            const flightCostRaw =
                flightCostInput instanceof HTMLInputElement ? flightCostInput.value.trim() : '';
            const flightCostCents = flightCostRaw ? parseUsdToCents(flightCostRaw) : 0;
            const localTravelInput = root.querySelector('#studio-app-modal-local-travel');
            const localTravelRaw =
                localTravelInput instanceof HTMLInputElement ? localTravelInput.value.trim() : '';
            const localTravelCostCents = localTravelRaw ? parseUsdToCents(localTravelRaw) : 0;
            const specialOn = root.querySelector('#studio-app-modal-special-price-on');
            const specialInput = root.querySelector('#studio-app-modal-special-price');
            const specialProgramTotalCents =
                specialOn instanceof HTMLInputElement && specialOn.checked
                    ? parseUsdToCents(
                          specialInput instanceof HTMLInputElement ? specialInput.value : '',
                      )
                    : 0;
            const inputModeSel = root.querySelector('#studio-app-modal-sponsorship-input-mode');
            const sponsoredCreditInputMode =
                inputModeSel instanceof HTMLSelectElement && inputModeSel.value === 'percent'
                    ? 'percent'
                    : 'usd';
            let sponsoredCreditCents = 0;
            let sponsoredPercent = /** @type {number | null} */ (null);
            if (sponsorshipMode === 'partial') {
                if (sponsoredCreditInputMode === 'percent') {
                    const pctInput = root.querySelector('#studio-app-modal-sponsored-pct');
                    const pct =
                        pctInput instanceof HTMLInputElement
                            ? Number(pctInput.value)
                            : 0;
                    sponsoredPercent = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
                    const base =
                        specialProgramTotalCents > 0
                            ? specialProgramTotalCents
                            : computeMemberProgramTotalDueCents({
                                  category: applicantCategory,
                                  ownFlight: false,
                              });
                    sponsoredCreditCents = Math.round((base * sponsoredPercent) / 100);
                } else {
                    const usdInput = root.querySelector('#studio-app-modal-sponsored-usd');
                    sponsoredCreditCents = parseUsdToCents(
                        usdInput instanceof HTMLInputElement ? usdInput.value : '',
                    );
                }
            }
            if (rawInvalid) return r.payloadJson;
            return mergeApplicantStaffFields(
                {
                    internalNotes: rawInner,
                    manualDepositSubmitted,
                    applicantCategory,
                    isTester,
                    flightCostCents,
                    localTravelCostCents,
                    specialProgramTotalCents,
                    sponsorshipMode,
                    sponsoredCreditCents,
                    sponsoredPercent,
                    sponsoredCreditInputMode,
                },
                r.payloadJson,
            );
        };

        const syncApplicantDepositUi = () => {
            const sponsorship = root.querySelector('#studio-app-modal-sponsorship');
            const depositWaived =
                sponsorship instanceof HTMLSelectElement && sponsorship.value === 'full';
            const manualDepositInput = root.querySelector('#studio-app-step-manual-deposit');
            const slotInput = root.querySelector('#studio-app-step-slot-secured');
            const depositLabel = root.querySelector('#studio-app-step-manual-deposit-label');
            const depositHint = root.querySelector('#studio-app-step-manual-deposit-hint');
            const slotHint = root.querySelector('#studio-app-step-slot-secured-hint');
            if (manualDepositInput instanceof HTMLInputElement) {
                manualDepositInput.disabled = depositWaived;
                if (depositWaived) {
                    manualDepositInput.checked = false;
                }
            }
            if (depositLabel) {
                depositLabel.textContent = depositWaived ? 'Deposit waived' : 'Manual deposit submitted';
            }
            if (depositHint) {
                depositHint.textContent = depositWaived
                    ? 'Fully sponsored — no deposit required'
                    : 'Payment received outside the member dashboard';
            }
            if (slotHint) {
                slotHint.textContent = depositWaived
                    ? 'Secured by full sponsorship (no deposit required)'
                    : 'Completed after deposit or full payment';
            }
            const manual =
                manualDepositInput instanceof HTMLInputElement && manualDepositInput.checked;
            const paymentSecured =
                slotInput instanceof HTMLInputElement && slotInput.dataset.paymentSecured === 'true';
            if (slotInput instanceof HTMLInputElement) {
                slotInput.checked = paymentSecured || manual || depositWaived;
            }
        };
        runInitialSpecialPricingUi();

        root.querySelector('#studio-app-modal-send-email')?.addEventListener('click', () => {
            void openApplicantEmailComposer(r, {
                onSent: reload,
                canClearCorrespondence: canDeleteApplicants,
            });
        });
        root.querySelectorAll('.studio-app-workflow input, #studio-app-decision-status').forEach((el) => {
            el.addEventListener('change', () => {
                syncApplicantWorkflowControl(root);
                syncApplicantDepositUi();
            });
        });
        void (async () => {
            const slotSecured = await getApplicantSlotSecuredStudio(r.id, r.programId, r.payloadJson);
            const slotInput = root.querySelector('#studio-app-step-slot-secured');
            if (slotInput instanceof HTMLInputElement) {
                slotInput.dataset.paymentSecured = slotSecured ? 'true' : 'false';
            }
            syncApplicantDepositUi();
            if (!rawInvalid && !hasSavedApplicantCategory(r.payloadJson)) {
                const artist = resolveArtistForApplicant(r, applicantArtistsFull);
                const suggested = suggestApplicantCategoryFromArtist(artist, r.programId);
                const notesTa = root.querySelector('#studio-app-modal-notes');
                const notesValue = notesTa instanceof HTMLTextAreaElement ? notesTa.value : initialNotes;
                const payloadJson = mergeApplicantStaffFields(
                    {
                        internalNotes: notesValue,
                        manualDepositSubmitted: initialManualDeposit,
                        applicantCategory: suggested,
                        isTester: initialIsTester,
                        flightCostCents: getApplicantFlightCostCents(r.payloadJson),
                        localTravelCostCents: getApplicantLocalTravelCostCents(r.payloadJson),
                    },
                    r.payloadJson,
                );
                try {
                    await upsertApplicantStudio({ ...r, payloadJson });
                    r.payloadJson = payloadJson;
                    const idx = allRows.findIndex((x) => x.id === r.id);
                    if (idx >= 0) allRows[idx] = { ...allRows[idx], payloadJson };
                    const categoryInput = root.querySelector('#studio-app-modal-category');
                    if (categoryInput instanceof HTMLSelectElement) {
                        categoryInput.value = suggested;
                    }
                    await syncApplicantCategoryPaymentStudio(r.id);
                    renderPage();
                } catch {
                    /* auto-set is best-effort; staff can save manually */
                }
            }
        })();
        root.querySelector('#studio-app-modal-save')?.addEventListener('click', async () => {
            const status = applicantWorkflowStatusFromRoot(root);
            const payloadJson = makePayloadForSave();
            const sponsorshipSel = root.querySelector('#studio-app-modal-sponsorship');
            const sponsorshipMode =
                sponsorshipSel instanceof HTMLSelectElement ? sponsorshipSel.value : 'none';
            const manualDepositInput = root.querySelector('#studio-app-step-manual-deposit');
            const categoryInput = root.querySelector('#studio-app-modal-category');
            const manualDepositSubmitted =
                sponsorshipMode !== 'full' &&
                manualDepositInput instanceof HTMLInputElement &&
                manualDepositInput.checked;
            const previousCategory = getApplicantCategory(r.payloadJson);
            const nextCategory =
                categoryInput instanceof HTMLSelectElement ? categoryInput.value : previousCategory;
            try {
                await upsertApplicantStudio({ ...r, status, payloadJson });
                if (manualDepositSubmitted) {
                    await syncApplicantManualDepositStudio(r.id);
                }
                // Recompute Motoko totalDue (category + special price + sponsorship).
                await syncApplicantCategoryPaymentStudio(r.id);
                statusAtOpen = status;
                close();
                await reload();
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
                await reload();
            } catch (e) {
                alert(e instanceof Error ? e.message : String(e));
            }
        });
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

    if (!canEditApplicants) {
        mainEl.querySelector('.studio-section-accordion')?.setAttribute('hidden', '');
    }

    mainEl.querySelector('#studio-applicants-generate-access-code')?.addEventListener('click', async () => {
        try {
            const code = await adminCreateProgramApplicationAccessCodeStudio();
            alert(
                `Generated application payment bypass access code: ${code}\n\nThis code is single-use. Share it with an applicant to skip payment and submit.`
            );
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
        }
    });

    mainEl.querySelector('#studio-app-new-artist')?.addEventListener('change', syncApplicantArtistFields);
    mainEl.querySelector('#studio-app-new-program')?.addEventListener('input', syncApplicantArtistFields);

    mainEl.querySelector('#studio-app-new-save')?.addEventListener('click', async () => {
        syncApplicantArtistFields();
        const selectedArtistId = mainEl.querySelector('#studio-app-new-artist')?.value?.trim();
        const programId = mainEl.querySelector('#studio-app-new-program')?.value?.trim() || '';
        const id = mainEl.querySelector('#studio-app-new-id')?.value?.trim() || (selectedArtistId && programId ? `${selectedArtistId}|${programId}` : '');
        if (!id) {
            alert('ID required');
            return;
        }
        const notesRaw = mainEl.querySelector('#studio-app-new-payload')?.value ?? '';
        const payloadJson = plainNotesToApplicantPayload(notesRaw, '{}');
        try {
            await upsertApplicantStudio({
                id,
                programId,
                email: mainEl.querySelector('#studio-app-new-email')?.value || '',
                fullName: mainEl.querySelector('#studio-app-new-name')?.value || '',
                status: selectedArtistId ? 'accepted' : mainEl.querySelector('#studio-app-new-status')?.value || 'pending',
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

    const roleRec =
        kind === 'galleries'
            ? { gallery: null }
            : kind === 'collectors'
              ? { collector: null }
              : { curator: null };
    mainEl.querySelector(`#studio-audience-gen-${kind}`)?.addEventListener('click', async () => {
        try {
            const code = await adminCreateJoinInviteCodeStudio(roleRec);
            await studioAlertGeneratedJoinInviteCode(
                code,
                `Invite for audience: ${t}. Share with one person; they must pick the same role when joining.`,
            );
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
        }
    });
}

async function initArtists(mainEl) {
    const tbody = mainEl.querySelector('#studio-artists-tbody');
    const banner = mainEl.querySelector('#studio-artists-banner');
    const searchInput = mainEl.querySelector('#studio-artists-search');
    const countEl = mainEl.querySelector('#studio-artists-header-count');

    /** Roster “Send blast…”: gated by **Edit** on the **Artists** row in Studio → Permissions (per role). */
    const artistsPerm = studioFeatureAccess('artists');
    const canSendRosterBlast = artistsPerm.canEdit;
    const sendBlastWrap = mainEl.querySelector('.studio-artists-send-blast');
    if (sendBlastWrap instanceof HTMLElement) {
        if (!canSendRosterBlast) {
            sendBlastWrap.hidden = true;
        }
    }

    /** @type {object[]} */
    let allArtists = [];
    /** @type {'all' | 'featurable' | 'featured'} */
    let quickFilter = 'all';
    let artistReadinessProbeGen = 0;
    const READINESS_PROBE_BATCH = 6;

    const refreshArtistReadinessDots = async (artists) => {
        if (!tbody) return;
        const gen = ++artistReadinessProbeGen;
        const targets = artists.filter((a) => artistRowHasProbeableImages(a));
        for (let i = 0; i < targets.length; i += READINESS_PROBE_BATCH) {
            if (gen !== artistReadinessProbeGen) return;
            const batch = targets.slice(i, i + READINESS_PROBE_BATCH);
            await Promise.all(
                batch.map(async (a) => {
                    const probes = await probeArtistProfileImages(a);
                    if (gen !== artistReadinessProbeGen) return;
                    const id = String(a.id ?? '');
                    const dot = tbody.querySelector(`.studio-artist-ready-dot[data-artist-id="${CSS.escape(id)}"]`);
                    applyArtistReadinessDot(dot, getArtistProfileReadiness(a, probes));
                }),
            );
        }
    };

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
        tbody.querySelectorAll('.studio-artist-email-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (!canSendRosterBlast) return;
                const id = btn.getAttribute('data-id');
                const row = allArtists.find((x) => String(x.id) === String(id));
                if (row) {
                    openIndividualEmailModal(row, { onSent: load });
                }
            });
        });
    };

    const applyArtistFilter = () => {
        if (!tbody) return;
        const q = (searchInput instanceof HTMLInputElement ? searchInput.value : '').trim().toLowerCase();
        const visSel = mainEl.querySelector('#studio-artists-filter-visibility');
        const visF = visSel instanceof HTMLSelectElement ? String(visSel.value || '').trim() : '';
        const artists = allArtists.filter((a) => {
            if (quickFilter === 'featurable' && !a.featurable) return false;
            if (quickFilter === 'featured' && !a.featured) return false;
            if (visF && normalizeArtistRosterVisibility(a.visibility) !== visF) return false;
            if (!q) return true;
            const hay = `${a.slug} ${a.id} ${a.contactEmail ?? ''} ${a.visibility} ${a.featuredOrder} ${a.mostRecentProgram ?? ''}`.toLowerCase();
            return hay.includes(q);
        });
        if (countEl) {
            const visActive = Boolean(visF);
            countEl.textContent = String(
                q || quickFilter !== 'all' || visActive ? artists.length : allArtists.length
            );
        }
        if (!artists.length) {
            tbody.innerHTML = `<tr><td colspan="12">${allArtists.length ? 'No rows match filters.' : 'No artists.'}</td></tr>`;
            return;
        }
        const emailPermTitle = 'Email (requires Edit permission for Artists in Studio → Permissions)';
        const emailBtnDisabled = canSendRosterBlast ? '' : ' disabled';
        tbody.innerHTML = artists
            .map((a) => {
                const slugRaw = String(a.slug || '');
                const slug = escapeHtml(slugRaw);
                const emRaw = String(a.contactEmail ?? '').trim();
                const hasEm = emRaw.toLowerCase().includes('@');
                const emailMod = hasEm ? ' studio-artist-email-btn--has-email' : '';
                const emailTitle = canSendRosterBlast
                    ? emRaw || 'No contact email on file — open to compose a draft'
                    : emailPermTitle;
                const imp = a.imported ? 'Yes' : '—';
                const code = a.accessCode ? escapeHtml(String(a.accessCode)) : '—';
                const idEsc = escapeHtml(String(a.id || ''));
                const mrpVal = escapeHtml(String(a.mostRecentProgram ?? ''));
                const feat = a.featured === true ? 'checked' : '';
                const featur = a.featurable === true ? 'checked' : '';
                const readiness = getArtistProfileReadiness(a);
                const readyDotClass = artistReadinessDotClass(readiness.status);
                const readyTitle = artistReadinessTitle(readiness);
                return `<tr>
                <td class="studio-td-ready"><span class="studio-user-sub-dot ${readyDotClass} studio-artist-ready-dot" data-artist-id="${idEsc}" title="${escapeHtml(
                    readyTitle,
                )}" aria-label="${escapeHtml(readyTitle)}"></span></td>
                <td>${slug}</td>
                <td>${idEsc}</td>
                <td class="studio-td-actions studio-td-email">
                  <button type="button" class="studio-btn-ghost studio-artist-email-btn${emailMod}" data-id="${idEsc}"${emailBtnDisabled} title="${escapeHtml(
                    emailTitle
                )}" aria-label="Email artist">Email</button>
                </td>
                <td>${imp}</td>
                <td><code class="studio-code-inline">${code}</code></td>
                <td>${rosterVisibilityBadgeHtml(a.visibility)}</td>
                <td class="studio-td-cb"><input type="checkbox" class="studio-art-featured-cb" data-id="${idEsc}" ${feat} aria-label="Featured" /></td>
                <td class="studio-td-cb"><input type="checkbox" class="studio-art-featurable-cb" data-id="${idEsc}" ${featur} aria-label="Featurable for random" /></td>
                <td><input type="text" class="studio-input studio-art-mrp" data-id="${idEsc}" value="${mrpVal}" placeholder="Program id" aria-label="Most recent program" /></td>
                <td><a class="studio-action-link" href="/profile/${encodeURIComponent(slugRaw)}" target="_blank" rel="noopener">Open profile</a></td>
                <td class="studio-td-actions"><button type="button" class="studio-btn-ghost studio-art-manage" data-id="${idEsc}">MANAGE</button></td>
            </tr>`;
            })
            .join('');
        wireArtistTableRowActions();
        void refreshArtistReadinessDots(artists);
    };

    const manageHost = mainEl.querySelector('#studio-artist-manage-surface');
    const listSurface = mainEl.querySelector('#studio-artists-list-surface');
    const openArtistManageModal = (tableRow) => {
        if (!(manageHost instanceof HTMLElement)) return;
        openStudioArtistManageFromRow(
            tableRow,
            load,
            manageHost,
            listSurface instanceof HTMLElement ? listSurface : null
        );
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

    /** @param {{ hero?: boolean, firebaseGallery?: boolean }} [opts] */
    const runLegacySync = async (label, fn, opts = {}) => {
        const isHeroSync = opts.hero === true;
        const isFirebaseGallery = opts.firebaseGallery === true;
        if (!banner) return;
        banner.className = 'studio-banner studio-banner--info';
        banner.textContent = `${label}…`;
        try {
            const n = await fn();
            banner.className = 'studio-banner studio-banner--ok';
            if (n > 0) {
                banner.textContent = isHeroSync
                    ? `${label}: cleared all profile hero images and set legacy CDN URLs for ${n} artist(s). Ensure files exist at cdn.fusionart.world/uploads/legacyProfiles/ if needed.`
                    : `${label}: updated ${n} artist(s). Ensure files exist at cdn.fusionart.world/uploads/legacyProfiles/ if needed.`;
            } else {
                banner.textContent = isHeroSync
                    ? `${label}: no artists in roster.`
                    : isFirebaseGallery
                      ? `${label}: no artists had Firebase intro gallery URLs.`
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
        const isFirebaseGallery = kind === 'firebase-gallery';
        const title = isHero
            ? 'Sync Profile Images'
            : isFirebaseGallery
              ? 'Migrate Firebase Gallery'
              : 'Sync Gallery';
        const intro = isHero
            ? 'This clears every artist’s profile hero image, then sets each to the legacy CDN URL below (all roster artists). Matching files should exist on the CDN (or URLs will 404 until uploaded). Temporary tool — see docs/delete-later.md.'
            : isFirebaseGallery
              ? 'One-off migration: for each artist whose English intro gallery has any Firebase Storage URL, replace all three intro slots (EN and JA) with the legacy CDN URLs below. Artists with S3/CDN or empty galleries are unchanged. Run once on live, then remove this button when done — see docs/delete-later.md.'
              : 'This fills English and Japanese intro gallery slots when all three slots have no image URL. Matching files should exist on the CDN (or URLs will 404 until uploaded).';
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
                isHero
                    ? syncStudioArtistsLegacyHeroImages
                    : isFirebaseGallery
                      ? migrateStudioArtistsFirebaseIntroGalleries
                      : syncStudioArtistsLegacyIntroGalleries,
                isHero ? { hero: true } : isFirebaseGallery ? { firebaseGallery: true } : {}
            );
        });
    };

    mainEl.querySelector('#studio-artists-sync-hero')?.addEventListener('click', () => {
        openLegacySyncConfirm('hero');
    });
    mainEl.querySelector('#studio-artists-approve-all-profile-images')?.addEventListener('click', async () => {
        if (
            !confirm(
                'Approve profile images for every artist in the roster?\n\nCards and program pages will show headshots when approved (Profile toggle on /artists feed, or on program confirmed strips). Artists without a headshot URL still show artwork until one is set in Manage.',
            )
        ) {
            return;
        }
        if (!banner) return;
        banner.className = 'studio-banner studio-banner--info';
        banner.textContent = 'Approving profile images…';
        try {
            const n = await approveAllHeroProfileImagesStudio();
            banner.className = 'studio-banner studio-banner--ok';
            banner.textContent =
                n > 0
                    ? `Approved profile images for ${n} artist(s).`
                    : 'No artists in roster.';
            await load();
        } catch (e) {
            banner.className = 'studio-banner studio-banner--error';
            banner.textContent = e instanceof Error ? e.message : String(e);
        }
    });
    mainEl.querySelector('#studio-artists-sync-gallery')?.addEventListener('click', () => {
        openLegacySyncConfirm('gallery');
    });
    mainEl.querySelector('#studio-artists-migrate-firebase-gallery')?.addEventListener('click', () => {
        openLegacySyncConfirm('firebase-gallery');
    });

    mainEl.querySelector('#studio-artists-gen-invite')?.addEventListener('click', async () => {
        try {
            const code = await adminCreateJoinInviteCodeStudio({ artist: null });
            await studioAlertGeneratedJoinInviteCode(
                code,
                'Artist-role invite for new members without a roster row. For claiming an existing imported profile, set the 8-digit code on the artist row in Manage instead.',
            );
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
        }
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
    mainEl.querySelector('#studio-artists-filter-visibility')?.addEventListener('change', () => applyArtistFilter());

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

    const sendBlastOpen = mainEl.querySelector('#studio-artists-send-blast-open');
    if (sendBlastOpen instanceof HTMLButtonElement && canSendRosterBlast) {
        const syncBlast = () => {
            const live = getDataSource() === 'live';
            sendBlastOpen.disabled = !live;
            sendBlastOpen.title = live
                ? ''
                : 'Requires live data and Integration API (set Studio → Services).';
        };
        syncBlast();
        window.addEventListener('fusion-data-source-change', syncBlast);
        sendBlastOpen.addEventListener('click', () => {
            if (!canSendRosterBlast) {
                return;
            }
            if (getDataSource() !== 'live') {
                alert(
                    'Send blast uses the Integration API (Resend) and canister roster data. Switch Studio data source to Live and set Integration API URL + key under Studio → Services, then try again.'
                );
                return;
            }
            openSendBlastModal({
                getArtistsRows: getArtistsForStudio,
                onRefresh: load,
            });
        });
    }

    await load();
}

/**
 * @param {HTMLElement} mainEl
 */
async function initPendingApproval(mainEl) {
    const tbody = mainEl.querySelector('#studio-pending-approval-tbody');
    const searchInput = mainEl.querySelector('#studio-pending-approval-search');
    const countEl = mainEl.querySelector('#studio-pending-approval-header-count');
    const manageHost = mainEl.querySelector('#studio-pending-manage-surface');
    const listSurface = mainEl.querySelector('#studio-pending-list-surface');

    const statusPerm = studioFeatureAccess('pending-approval');
    if (!statusPerm.visible) {
        if (tbody) {
            tbody.innerHTML =
                '<tr><td colspan="6"><p class="studio-banner studio-banner--warn">You do not have access to this section.</p></td></tr>';
        }
        return;
    }

    const canManageStatus = statusPerm.canEdit;
    const canSendRosterBlast = studioFeatureAccess('artists').canEdit;
    const emailPermTitle = 'Email (requires Edit permission for Artists in Studio → Permissions)';
    const emailBtnDisabled = canSendRosterBlast ? '' : ' disabled';
    const manageBtnDisabled = canManageStatus ? '' : ' disabled';
    const manageTitle = canManageStatus ? '' : ' title="Requires Edit permission for Status"';
    /** @type {object[]} */
    let allStatusRows = [];

    const runLoad = async () => {
        const all = await getArtistsForStudio();
        allStatusRows = all.filter((a) => {
            const v = normalizeArtistRosterVisibility(/** @type {unknown} */ (a).visibility);
            return v === 'pending' || v === 'inactive';
        });
        applyPendingFilter();
    };

    const applyPendingFilter = () => {
        if (!tbody) return;
        const q = (searchInput instanceof HTMLInputElement ? searchInput.value : '').trim().toLowerCase();
        const list = allStatusRows.filter((a) => {
            if (!q) return true;
            const hay = `${a.slug} ${a.id} ${a.contactEmail ?? ''}`.toLowerCase();
            return hay.includes(q);
        });
        if (countEl) countEl.textContent = String(list.length);
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="6">${
                allStatusRows.length
                    ? 'No rows match search.'
                    : 'No artists currently in pending or inactive state.'
            }</td></tr>`;
            return;
        }
        tbody.innerHTML = list
            .map((a) => {
                const slugRaw = String(a.slug || '');
                const slug = escapeHtml(slugRaw);
                const emRaw = String(a.contactEmail ?? '').trim();
                const hasEm = emRaw.toLowerCase().includes('@');
                const emailMod = hasEm ? ' studio-artist-email-btn--has-email' : '';
                const emailTitle = canSendRosterBlast
                    ? emRaw || 'No contact email on file — open to compose a draft'
                    : emailPermTitle;
                const idEsc = escapeHtml(String(a.id || ''));
                return `<tr>
                <td>${slug}</td>
                <td>${idEsc}</td>
                <td class="studio-td-actions studio-td-email">
                  <button type="button" class="studio-btn-ghost studio-artist-email-btn${emailMod}" data-id="${idEsc}"${emailBtnDisabled} title="${escapeHtml(
                    emailTitle
                )}" aria-label="Email artist">Email</button>
                </td>
                <td>${rosterVisibilityBadgeHtml(a.visibility)}</td>
                <td><a class="studio-action-link" href="/profile/${encodeURIComponent(
                    slugRaw
                )}" target="_blank" rel="noopener">Open profile</a></td>
                <td class="studio-td-actions"><button type="button" class="studio-btn-ghost studio-art-pending-manage" data-id="${idEsc}"${manageBtnDisabled}${manageTitle}>MANAGE</button></td>
            </tr>`;
            })
            .join('');
        tbody.querySelectorAll('.studio-artist-email-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (!canSendRosterBlast) return;
                const id = btn.getAttribute('data-id');
                const row = allStatusRows.find((x) => String(x.id) === String(id));
                if (row) {
                    openIndividualEmailModal(row, { onSent: runLoad });
                }
            });
        });
        tbody.querySelectorAll('.studio-art-pending-manage').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (!canManageStatus) return;
                const id = btn.getAttribute('data-id');
                const row = allStatusRows.find((x) => String(x.id) === String(id));
                if (row) {
                    if (!(manageHost instanceof HTMLElement)) return;
                    openStudioArtistManageFromRow(
                        row,
                        runLoad,
                        manageHost,
                        listSurface instanceof HTMLElement ? listSurface : null
                    );
                }
            });
        });
    };

    searchInput?.addEventListener('input', () => applyPendingFilter());
    await runLoad();
}

/* ─── Profile Images moderation ─── */

function renderProfileImages() {
    return `
        <div class="studio-section-stack studio-category-page">
            ${studioPageHeaderHtml({
                title: 'Profile Images',
                subtitle: 'Profile images pending staff review',
                countId: 'studio-profile-images-header-count',
                countLabel: 'pending',
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-profile-images-search',
                searchPlaceholder: 'Filter slug or name…',
            })}
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Slug</th>
                            <th>Name</th>
                            <th>Profile Image</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="studio-profile-images-tbody"><tr><td colspan="5">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
}

async function initProfileImages(mainEl) {
    const tbody = mainEl.querySelector('#studio-profile-images-tbody');
    const searchInput = mainEl.querySelector('#studio-profile-images-search');
    const countEl = mainEl.querySelector('#studio-profile-images-header-count');

    const perm = studioFeatureAccess('profile-images');
    if (!perm.visible) {
        if (tbody) {
            tbody.innerHTML =
                '<tr><td colspan="5"><p class="studio-banner studio-banner--warn">You do not have access to this section.</p></td></tr>';
        }
        return;
    }

    const canEdit = perm.canEdit;
    /** @type {object[]} */
    let allRows = [];
    /** @type {Map<string, {reason:string, imageUrl:string, reviewedAt:string, approved:boolean}>} */
    let reviewNotesMap = new Map();

    const runLoad = async () => {
        const [all, notes] = await Promise.all([
            getArtistsForStudio(),
            fetchHeroProfileImageReviewNotesMap()
        ]);
        reviewNotesMap = notes;
        allRows = all.filter((a) => {
            const img = a.heroProfileImage ?? a.heroProfileImageUrl ?? '';
            if (typeof img !== 'string' || !img.trim()) return false;
            const approved = Boolean(a.heroProfileImageApproved);
            if (approved) return false;
            const note = reviewNotesMap.get(String(a.id ?? ''));
            if (note && !note.approved && note.reason) return false;
            return true;
        });
        applyFilter();
    };

    const statusBadgeHtml = (artistId, approved) => {
        const note = reviewNotesMap.get(artistId);
        if (approved) {
            return '<span class="studio-mod-status-badge studio-mod-status-badge--approved">Approved</span>';
        }
        if (note && !note.approved && note.reason) {
            return '<span class="studio-mod-status-badge studio-mod-status-badge--rejected">Changes requested</span>';
        }
        return '<span class="studio-mod-status-badge studio-mod-status-badge--pending">Pending review</span>';
    };

    const applyFilter = () => {
        if (!tbody) return;
        const q = (searchInput instanceof HTMLInputElement ? searchInput.value : '').trim().toLowerCase();
        const list = allRows.filter((a) => {
            if (!q) return true;
            const hay = `${a.slug ?? ''} ${a.firstName ?? ''} ${a.lastName ?? ''}`.toLowerCase();
            return hay.includes(q);
        });
        if (countEl) countEl.textContent = String(list.length);
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="5">${
                allRows.length ? 'No rows match search.' : 'No profile images pending review.'
            }</td></tr>`;
            return;
        }
        tbody.innerHTML = list
            .map((a) => {
                const slug = escapeHtml(String(a.slug || ''));
                const name = escapeHtml(`${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || slug);
                const imgUrl = String(a.heroProfileImage ?? a.heroProfileImageUrl ?? '');
                const approved = Boolean(a.heroProfileImageApproved);
                const idEsc = escapeHtml(String(a.id || ''));
                const manageDisabled = canEdit ? '' : ' disabled';
                return `<tr data-artist-id="${idEsc}">
                    <td>${slug}</td>
                    <td>${name}</td>
                    <td>
                        <button type="button" class="studio-mod-thumb-btn" data-img="${escapeHtml(imgUrl)}" data-alt="${name}">
                            <img src="${escapeHtml(imgUrl)}" alt="${name}" class="studio-mod-thumb" loading="lazy" />
                        </button>
                    </td>
                    <td class="studio-mod-status-cell">${statusBadgeHtml(a.id, approved)}</td>
                    <td>
                        <button type="button" class="studio-mod-manage-btn" data-artist-id="${idEsc}" data-img="${escapeHtml(imgUrl)}" data-name="${name}"${manageDisabled}>Manage</button>
                    </td>
                </tr>`;
            })
            .join('');
    };

    const openManagePopup = (artistId, imgUrl, name) => {
        const note = reviewNotesMap.get(artistId) || null;
        const row = allRows.find((a) => a.id === artistId);
        const approved = Boolean(row?.heroProfileImageApproved);

        const body = `
            <div class="studio-mod-manage-modal">
                <div class="studio-mod-manage-preview">
                    <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(name)}" />
                </div>

                <div class="studio-mod-manage-section">
                    <h3 class="studio-mod-manage-heading">Decision</h3>
                    <div class="studio-field studio-field--checkbox">
                        <input type="checkbox" id="studio-mod-manage-approved" ${approved ? 'checked' : ''} />
                        <label for="studio-mod-manage-approved">Approve this image for public display</label>
                    </div>
                </div>

                <div class="studio-mod-manage-section">
                    <h3 class="studio-mod-manage-heading">Feedback for artist</h3>
                    <p class="studio-mod-manage-hint">This message will be visible to the artist if changes are requested.</p>
                    <textarea id="studio-mod-manage-reason" class="studio-input" rows="3" placeholder="e.g. Image is too dark — try a brighter, high-resolution photo…">${escapeHtml(note?.reason || '')}</textarea>
                </div>

                <div class="studio-mod-manage-section">
                    <h3 class="studio-mod-manage-heading">Reference image <span class="studio-mod-manage-optional">(optional)</span></h3>
                    <p class="studio-mod-manage-hint">Upload an example or annotated screenshot the artist can reference.</p>
                    <div class="studio-mod-manage-upload-row">
                        <label class="studio-file-label studio-btn-ghost studio-mod-manage-upload-label">
                            <input type="file" id="studio-mod-manage-image-file" accept="image/*" class="studio-file-input" />
                            Upload image
                        </label>
                        <span class="studio-mod-manage-upload-or">or</span>
                        <input type="text" id="studio-mod-manage-image" class="studio-input" placeholder="Paste image URL" value="${escapeHtml(note?.imageUrl || '')}" />
                    </div>
                    <div id="studio-mod-manage-image-preview" class="studio-mod-manage-image-preview" ${note?.imageUrl ? '' : 'hidden'}>
                        ${note?.imageUrl ? `<img src="${escapeHtml(note.imageUrl)}" alt="Reference" />` : ''}
                        <button type="button" class="studio-mod-manage-image-remove" aria-label="Remove image">&times;</button>
                    </div>
                    <p id="studio-mod-manage-upload-status" class="studio-mod-manage-upload-status" hidden></p>
                </div>

                <div class="studio-modal-actions">
                    <button data-studio-modal-close="1" class="studio-btn-ghost">Cancel</button>
                    <button id="studio-mod-manage-save" class="studio-btn-primary">Save review</button>
                </div>
            </div>
        `;

        const { close, root } = openStudioModal(body, { title: `Review — ${escapeHtml(name)}`, compact: true });

        const imageInput = root.querySelector('#studio-mod-manage-image');
        const imageFileInput = root.querySelector('#studio-mod-manage-image-file');
        const imagePreview = root.querySelector('#studio-mod-manage-image-preview');
        const uploadStatus = root.querySelector('#studio-mod-manage-upload-status');

        const showImagePreview = (url) => {
            if (imagePreview) {
                imagePreview.innerHTML = `<img src="${escapeHtml(url)}" alt="Reference" /><button type="button" class="studio-mod-manage-image-remove" aria-label="Remove image">&times;</button>`;
                imagePreview.hidden = false;
                imagePreview.querySelector('.studio-mod-manage-image-remove')?.addEventListener('click', () => {
                    if (imageInput instanceof HTMLInputElement) imageInput.value = '';
                    imagePreview.hidden = true;
                });
            }
        };

        imageFileInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (uploadStatus instanceof HTMLElement) { uploadStatus.textContent = 'Uploading…'; uploadStatus.hidden = false; }
            try {
                const { prepareImageFileForUpload: prep } = await import('../../utils/imageUploadPrep.js');
                const { file: prepared } = await prep(file);
                const { uploadBlobToS3: upload } = await import('../../utils/studioS3Upload.js');
                const url = await upload(prepared, imageInput instanceof HTMLInputElement ? imageInput : null, { area: 'studio/misc' });
                if (imageInput instanceof HTMLInputElement) imageInput.value = url;
                showImagePreview(url);
                if (uploadStatus instanceof HTMLElement) uploadStatus.hidden = true;
            } catch (err) {
                console.error('Reference image upload failed', err);
                if (uploadStatus instanceof HTMLElement) { uploadStatus.textContent = `Upload failed: ${err.message}`; uploadStatus.hidden = false; }
            }
        });

        if (note?.imageUrl) {
            imagePreview?.querySelector('.studio-mod-manage-image-remove')?.addEventListener('click', () => {
                if (imageInput instanceof HTMLInputElement) imageInput.value = '';
                if (imagePreview) imagePreview.hidden = true;
            });
        }

        root.querySelector('#studio-mod-manage-save')?.addEventListener('click', async () => {
            const cb = root.querySelector('#studio-mod-manage-approved');
            const reasonEl = root.querySelector('#studio-mod-manage-reason');
            const newApproved = cb instanceof HTMLInputElement ? cb.checked : approved;
            const reason = reasonEl instanceof HTMLTextAreaElement ? reasonEl.value.trim() : '';
            const image = imageInput instanceof HTMLInputElement ? imageInput.value.trim() : '';

            const saveBtn = root.querySelector('#studio-mod-manage-save');
            if (saveBtn instanceof HTMLButtonElement) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

            try {
                await staffSetHeroProfileImageReviewNote(artistId, newApproved, reason, image);
                reviewNotesMap.set(artistId, { reason, imageUrl: image, reviewedAt: new Date().toISOString(), approved: newApproved });
                const r = allRows.find((a) => a.id === artistId);
                if (r) r.heroProfileImageApproved = newApproved;
                applyFilter();
                close();
            } catch (err) {
                console.error('Profile image review note save failed', err);
                if (saveBtn instanceof HTMLButtonElement) { saveBtn.disabled = false; saveBtn.textContent = 'Save review'; }
            }
        });
    };

    tbody?.addEventListener('click', (e) => {
        const thumbBtn = /** @type {HTMLElement} */ (e.target)?.closest('.studio-mod-thumb-btn');
        if (thumbBtn) {
            const url = thumbBtn.getAttribute('data-img') || '';
            const alt = thumbBtn.getAttribute('data-alt') || '';
            if (url) openImageLightbox(url, alt);
            return;
        }
        const manageBtn = /** @type {HTMLElement} */ (e.target)?.closest('.studio-mod-manage-btn');
        if (manageBtn) {
            const id = manageBtn.getAttribute('data-artist-id') || '';
            const img = manageBtn.getAttribute('data-img') || '';
            const name = manageBtn.getAttribute('data-name') || '';
            if (id) openManagePopup(id, img, name);
        }
    });

    searchInput?.addEventListener('input', () => applyFilter());
    await runLoad();
}

function openImageLightbox(url, altText) {
    const overlay = document.createElement('div');
    overlay.className = 'studio-lightbox-scrim';
    overlay.innerHTML = `
        <img src="${url}" alt="${escapeHtml(altText)}" class="studio-lightbox-img" />
    `;
    overlay.addEventListener('click', () => overlay.remove());
    document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', onKey);
        }
    });
    document.body.appendChild(overlay);
}

/* ─── Audio Files moderation ─── */

function renderAudioFiles() {
    return `
        <div class="studio-section-stack studio-category-page">
            ${studioPageHeaderHtml({
                title: 'Audio Files',
                subtitle: 'Audio bites pending staff review',
                countId: 'studio-audio-files-header-count',
                countLabel: 'pending',
            })}
            ${studioFilterBarHtml({
                searchId: 'studio-audio-files-search',
                searchPlaceholder: 'Filter slug or name…',
            })}
            <div class="studio-table-wrap studio-table-wrap--sticky-head">
                <table class="studio-table studio-table--dense">
                    <thead>
                        <tr>
                            <th>Slug</th>
                            <th>Name</th>
                            <th>Audio</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="studio-audio-files-tbody"><tr><td colspan="5">Loading…</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
}

async function initAudioFiles(mainEl) {
    const tbody = mainEl.querySelector('#studio-audio-files-tbody');
    const searchInput = mainEl.querySelector('#studio-audio-files-search');
    const countEl = mainEl.querySelector('#studio-audio-files-header-count');

    const perm = studioFeatureAccess('audio-files');
    if (!perm.visible) {
        if (tbody) {
            tbody.innerHTML =
                '<tr><td colspan="5"><p class="studio-banner studio-banner--warn">You do not have access to this section.</p></td></tr>';
        }
        return;
    }

    const canEdit = perm.canEdit;
    /** @type {{ artistId: string, slug: string, name: string, url: string, title: string, approved: boolean }[]} */
    let allRows = [];
    /** @type {Map<string, {reason:string, imageUrl:string, reviewedAt:string, approved:boolean}>} */
    let reviewNotesMap = new Map();

    const runLoad = async () => {
        const [all, collectionsMap, approvedUrlsMap, notes] = await Promise.all([
            getArtistsForStudio(),
            fetchArtistAudioCollectionsMap(),
            fetchArtistAudioApprovedUrlsMap(),
            fetchAudioEntryReviewNotesMap(),
        ]);
        reviewNotesMap = notes;
        allRows = [];
        for (const a of all) {
            const id = String(a.id ?? '');
            const slug = String(a.slug ?? '');
            const name = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || slug;
            const entries = collectionsMap.get(id) || [];
            const approvedUrls = new Set(approvedUrlsMap.get(id) || []);
            if (entries.length > 0) {
                for (const entry of entries) {
                    const isApproved = approvedUrls.has(entry.url);
                    if (isApproved) continue;
                    const compositeKey = `${id}|${entry.url}`;
                    const note = reviewNotesMap.get(compositeKey);
                    if (note && !note.approved && note.reason) continue;
                    allRows.push({
                        artistId: id, slug, name,
                        url: entry.url, title: entry.title || 'Audio bite',
                        approved: false,
                    });
                }
            } else {
                const legacyUrl = String(a.audioUrl ?? '').trim();
                if (legacyUrl) {
                    const isApproved = Boolean(a.audioApproved);
                    if (isApproved) continue;
                    const compositeKey = `${id}|${legacyUrl}`;
                    const note = reviewNotesMap.get(compositeKey);
                    if (note && !note.approved && note.reason) continue;
                    allRows.push({
                        artistId: id, slug, name,
                        url: legacyUrl, title: String(a.audioTitle ?? 'Audio bite'),
                        approved: false,
                    });
                }
            }
        }
        applyFilter();
    };

    const audioStatusBadgeHtml = (artistId, url, approved) => {
        const compositeKey = `${artistId}|${url}`;
        const note = reviewNotesMap.get(compositeKey);
        if (approved) {
            return '<span class="studio-mod-status-badge studio-mod-status-badge--approved">Approved</span>';
        }
        if (note && !note.approved && note.reason) {
            return '<span class="studio-mod-status-badge studio-mod-status-badge--rejected">Changes requested</span>';
        }
        return '<span class="studio-mod-status-badge studio-mod-status-badge--pending">Pending review</span>';
    };

    const applyFilter = () => {
        if (!tbody) return;
        const q = (searchInput instanceof HTMLInputElement ? searchInput.value : '').trim().toLowerCase();
        const list = allRows.filter((r) => {
            if (!q) return true;
            const hay = `${r.slug} ${r.name}`.toLowerCase();
            return hay.includes(q);
        });
        if (countEl) countEl.textContent = String(list.length);
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="5">${
                allRows.length ? 'No rows match search.' : 'No audio files pending review.'
            }</td></tr>`;
            return;
        }
        tbody.innerHTML = list
            .map((r) => {
                const manageDisabled = canEdit ? '' : ' disabled';
                return `<tr>
                    <td>${escapeHtml(r.slug)}</td>
                    <td>${escapeHtml(r.name)}</td>
                    <td>
                        <audio controls preload="none" class="studio-mod-audio" src="${escapeHtml(r.url)}"></audio>
                        <div class="studio-muted" style="font-size:0.75rem;margin-top:2px">${escapeHtml(r.title)}</div>
                    </td>
                    <td class="studio-mod-status-cell">${audioStatusBadgeHtml(r.artistId, r.url, r.approved)}</td>
                    <td>
                        <button type="button" class="studio-mod-manage-btn"
                                data-artist-id="${escapeHtml(r.artistId)}" data-audio-url="${escapeHtml(r.url)}"
                                data-name="${escapeHtml(r.name)}" data-title="${escapeHtml(r.title)}"${manageDisabled}>Manage</button>
                    </td>
                </tr>`;
            })
            .join('');
    };

    const openAudioManagePopup = (artistId, url, name, title) => {
        const compositeKey = `${artistId}|${url}`;
        const note = reviewNotesMap.get(compositeKey) || null;
        const row = allRows.find((r) => r.artistId === artistId && r.url === url);
        const approved = Boolean(row?.approved);

        const body = `
            <div class="studio-mod-manage-modal">
                <div class="studio-mod-manage-preview studio-mod-manage-preview--audio">
                    <audio controls preload="metadata" src="${escapeHtml(url)}"></audio>
                    <span class="studio-mod-manage-audio-title">${escapeHtml(title)}</span>
                </div>

                <div class="studio-mod-manage-section">
                    <h3 class="studio-mod-manage-heading">Decision</h3>
                    <div class="studio-field studio-field--checkbox">
                        <input type="checkbox" id="studio-mod-manage-approved" ${approved ? 'checked' : ''} />
                        <label for="studio-mod-manage-approved">Approve this audio for public playback</label>
                    </div>
                </div>

                <div class="studio-mod-manage-section">
                    <h3 class="studio-mod-manage-heading">Feedback for artist</h3>
                    <p class="studio-mod-manage-hint">This message will be visible to the artist if changes are requested.</p>
                    <textarea id="studio-mod-manage-reason" class="studio-input" rows="3" placeholder="e.g. Audio has background noise — try recording in a quieter space…">${escapeHtml(note?.reason || '')}</textarea>
                </div>

                <div class="studio-mod-manage-section">
                    <h3 class="studio-mod-manage-heading">Reference image <span class="studio-mod-manage-optional">(optional)</span></h3>
                    <p class="studio-mod-manage-hint">Upload an example or annotated screenshot the artist can reference.</p>
                    <div class="studio-mod-manage-upload-row">
                        <label class="studio-file-label studio-btn-ghost studio-mod-manage-upload-label">
                            <input type="file" id="studio-mod-manage-image-file" accept="image/*" class="studio-file-input" />
                            Upload image
                        </label>
                        <span class="studio-mod-manage-upload-or">or</span>
                        <input type="text" id="studio-mod-manage-image" class="studio-input" placeholder="Paste image URL" value="${escapeHtml(note?.imageUrl || '')}" />
                    </div>
                    <div id="studio-mod-manage-image-preview" class="studio-mod-manage-image-preview" ${note?.imageUrl ? '' : 'hidden'}>
                        ${note?.imageUrl ? `<img src="${escapeHtml(note.imageUrl)}" alt="Reference" />` : ''}
                        <button type="button" class="studio-mod-manage-image-remove" aria-label="Remove image">&times;</button>
                    </div>
                    <p id="studio-mod-manage-upload-status" class="studio-mod-manage-upload-status" hidden></p>
                </div>

                <div class="studio-modal-actions">
                    <button data-studio-modal-close="1" class="studio-btn-ghost">Cancel</button>
                    <button id="studio-mod-manage-save" class="studio-btn-primary">Save review</button>
                </div>
            </div>
        `;

        const { close, root } = openStudioModal(body, { title: `Review — ${escapeHtml(name)}`, compact: true });

        const imageInput = root.querySelector('#studio-mod-manage-image');
        const imageFileInput = root.querySelector('#studio-mod-manage-image-file');
        const imagePreview = root.querySelector('#studio-mod-manage-image-preview');
        const uploadStatus = root.querySelector('#studio-mod-manage-upload-status');

        const showImagePreview = (url) => {
            if (imagePreview) {
                imagePreview.innerHTML = `<img src="${escapeHtml(url)}" alt="Reference" /><button type="button" class="studio-mod-manage-image-remove" aria-label="Remove image">&times;</button>`;
                imagePreview.hidden = false;
                imagePreview.querySelector('.studio-mod-manage-image-remove')?.addEventListener('click', () => {
                    if (imageInput instanceof HTMLInputElement) imageInput.value = '';
                    imagePreview.hidden = true;
                });
            }
        };

        imageFileInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (uploadStatus instanceof HTMLElement) { uploadStatus.textContent = 'Uploading…'; uploadStatus.hidden = false; }
            try {
                const { prepareImageFileForUpload: prep } = await import('../../utils/imageUploadPrep.js');
                const { file: prepared } = await prep(file);
                const { uploadBlobToS3: upload } = await import('../../utils/studioS3Upload.js');
                const url = await upload(prepared, imageInput instanceof HTMLInputElement ? imageInput : null, { area: 'studio/misc' });
                if (imageInput instanceof HTMLInputElement) imageInput.value = url;
                showImagePreview(url);
                if (uploadStatus instanceof HTMLElement) uploadStatus.hidden = true;
            } catch (err) {
                console.error('Reference image upload failed', err);
                if (uploadStatus instanceof HTMLElement) { uploadStatus.textContent = `Upload failed: ${err.message}`; uploadStatus.hidden = false; }
            }
        });

        if (note?.imageUrl) {
            imagePreview?.querySelector('.studio-mod-manage-image-remove')?.addEventListener('click', () => {
                if (imageInput instanceof HTMLInputElement) imageInput.value = '';
                if (imagePreview) imagePreview.hidden = true;
            });
        }

        root.querySelector('#studio-mod-manage-save')?.addEventListener('click', async () => {
            const cb = root.querySelector('#studio-mod-manage-approved');
            const reasonEl = root.querySelector('#studio-mod-manage-reason');
            const newApproved = cb instanceof HTMLInputElement ? cb.checked : approved;
            const reason = reasonEl instanceof HTMLTextAreaElement ? reasonEl.value.trim() : '';
            const image = imageInput instanceof HTMLInputElement ? imageInput.value.trim() : '';

            const saveBtn = root.querySelector('#studio-mod-manage-save');
            if (saveBtn instanceof HTMLButtonElement) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

            try {
                await staffSetAudioEntryReviewNote(artistId, url, newApproved, reason, image);
                reviewNotesMap.set(compositeKey, { reason, imageUrl: image, reviewedAt: new Date().toISOString(), approved: newApproved });
                const r = allRows.find((x) => x.artistId === artistId && x.url === url);
                if (r) r.approved = newApproved;
                applyFilter();
                close();
            } catch (err) {
                console.error('Audio entry review note save failed', err);
                if (saveBtn instanceof HTMLButtonElement) { saveBtn.disabled = false; saveBtn.textContent = 'Save review'; }
            }
        });
    };

    tbody?.addEventListener('click', (e) => {
        const manageBtn = /** @type {HTMLElement} */ (e.target)?.closest('.studio-mod-manage-btn');
        if (manageBtn) {
            const id = manageBtn.getAttribute('data-artist-id') || '';
            const url = manageBtn.getAttribute('data-audio-url') || '';
            const name = manageBtn.getAttribute('data-name') || '';
            const title = manageBtn.getAttribute('data-title') || '';
            if (id && url) openAudioManagePopup(id, url, name, title);
        }
    });

    searchInput?.addEventListener('input', () => applyFilter());
    await runLoad();
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
            depositAmountDisplay: '',
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
        const panelsHtml = renderProgramLocaleFormHtml(escapeHtml, enObj, jaObj);
        const visCur = normalizeProgramVisibility(p.visibility);
        const visOptions = ['public', 'private', 'none']
            .map(
                (opt) =>
                    `<option value="${opt}" ${visCur === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`,
            )
            .join('');
        const studioStatusOptions = ['open', 'full', 'active', 'completed', 'comingUp']
            .map(
                (s) =>
                    `<option value="${s}" ${String(p.studioStatus) === s ? 'selected' : ''}>${escapeHtml(s)}</option>`,
            )
            .join('');
        const body = renderProgramEditorShell({
            escapeHtml,
            existing: Boolean(existing),
            p,
            visOptions,
            studioStatusOptions,
            routeLinkKind,
            routeLinkKindLabel: getFieldKindBadgeLabel(routeLinkKind),
            cardImgKind,
            cardImgKindLabel: getFieldKindBadgeLabel(cardImgKind),
            panelsHtml,
        });
        const { close, root } = openStudioModal(body, {
            title: existing ? 'Edit Program' : 'Add Program',
            subtitle: 'Manage program content and settings',
            panelClass: 'studio-modal-panel studio-modal-panel--program-editor',
            bodyClass: 'studio-modal-body--program-editor',
            headerClass: 'studio-modal-header--program-editor',
            footerHtml: renderProgramEditorFooter(Boolean(existing)),
        });
        const localeFormRoot = root.querySelector('.studio-prog-locale-form');
        const setProgModalStatus = (msg) => {
            const el = root.querySelector('#studio-prog-modal-status');
            if (el) {
                el.textContent = msg || '';
                el.classList.toggle('studio-sr-only', !msg);
            }
        };
        const chrome = bindProgramEditorChrome(root, {
            onCancel: close,
            routeLinkSeed: String(p.routeLink || ''),
        });
        bindProgramKeyDatesRepeater(root, mergeKeyDatesSeed(enObj, jaObj), escapeHtml);
        bindProgramLocaleTranslate(root, studioTranslateEnToJa, { setStatus: setProgModalStatus });
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
                        entityType: 'program',
                        entityId: String(p.id || ''),
                        fieldKey: `card-image-${loc}`,
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
                        entityType: 'program',
                        entityId: String(p.id || ''),
                        fieldKey: `fade-gallery-${slot}`,
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
                        entityType: 'program',
                        entityId: String(p.id || ''),
                        fieldKey: `strip-gallery-${slot}`,
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
            const depositAmountDisplay = String(fd.get('depositAmountDisplay') || '').trim();
            let en;
            let ja;
            try {
                ({ en, ja } = collectProgramLocalesFromForm(localeFormRoot));
            } catch (err) {
                alert(err instanceof Error ? err.message : String(err));
                return;
            }
            const setDepositInLocale = (root) => {
                if (!root || typeof root !== 'object' || !depositAmountDisplay) return;
                const o = root;
                if (!o.programPage) o.programPage = {};
                const pp = o.programPage;
                if (typeof pp !== 'object' || !pp) return;
                if (!pp.applicationForm) pp.applicationForm = {};
                /** @type {Record<string, unknown>} */ (pp).applicationForm.depositAmountDisplay = depositAmountDisplay;
            };
            setDepositInLocale(en);
            setDepositInLocale(ja);
            const localesJson = JSON.stringify({ en, ja });
            try {
                await upsertProgramStudio({
                    id: String(fd.get('id') || ''),
                    routeLink: String(fd.get('routeLink') || ''),
                    featuredOrder: Number(fd.get('featuredOrder') || 0),
                    visibility: String(fd.get('visibility') || ''),
                    studioStatus: String(fd.get('studioStatus') || 'open'),
                    depositAmountDisplay,
                    localesJson,
                });
                chrome?.markSaved();
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
                await uploadBlobToS3(f, root.querySelector('#studio-ed-img'), {
                    area: 'studio/editions',
                    entityType: 'edition',
                    entityId: String(e.id || ''),
                    fieldKey: 'image',
                });
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

async function initSound(mainEl) {
    const form = mainEl.querySelector('#studio-sound-form');
    const msg = mainEl.querySelector('#studio-sound-msg');
    const showLocal = (kind, text) => {
        if (!msg) return;
        msg.style.display = text ? 'block' : 'none';
        msg.className = `studio-banner studio-banner--${kind}`;
        msg.textContent = text;
    };

    const fillLearnJournal = async () => {
        const sel = mainEl.querySelector('#studio-sound-learn-journal');
        if (!(sel instanceof HTMLSelectElement)) return;
        const entries = await getJournalEntries().catch(() => []);
        const opts = [
            '<option value="">(none)</option>',
            ...entries.map((j) => {
                const id = String(j?.id ?? '');
                const t = j?.en?.title ?? id;
                return `<option value="${escapeHtml(id)}">${escapeHtml(String(t))} (${escapeHtml(id)})</option>`;
            }),
        ];
        const cur = sel.value;
        sel.innerHTML = opts.join('');
        if (cur) sel.value = cur;
    };

    const applyForm = (c) => {
        const en = mainEl.querySelector('#studio-sound-enabled');
        if (en instanceof HTMLInputElement) en.checked = Boolean(c.enabled);
        const cat = mainEl.querySelector('#studio-sound-category');
        if (cat instanceof HTMLInputElement) cat.value = String(c.categoryLabel || '');
        const aurl = mainEl.querySelector('#studio-sound-atmo-url');
        if (aurl instanceof HTMLInputElement) aurl.value = String(c.atmosphereAudioUrl || '');
        const vm = mainEl.querySelector('#studio-sound-voice-mode');
        if (vm instanceof HTMLSelectElement) vm.value = c.voiceSelectionMode === 'manual' ? 'manual' : 'random';
        const art = mainEl.querySelector('#studio-sound-artist');
        const list = (Array.isArray(/** @type {any} */ (c)._artistsWithAudio) ? /** @type {any} */ (c)._artistsWithAudio : null) || [];
        if (art instanceof HTMLSelectElement) {
            const aid = c.voiceArtistId ? String(c.voiceArtistId) : '';
            art.innerHTML = [
                '<option value="">—</option>',
                ...list.map((a) => {
                    const id = String(a?.id ?? '');
                    return `<option value="${escapeHtml(id)}" ${
                        id === aid ? 'selected' : ''
                    }>${escapeHtml(String(a?.locales?.en?.name ?? a?.slug ?? id))}</option>`;
                }),
            ].join('');
        }
        const mu = mainEl.querySelector('#studio-sound-manual-voice-url');
        if (mu instanceof HTMLInputElement) mu.value = String(c.manualVoiceAudioUrl || '');
        const minI = mainEl.querySelector('#studio-sound-min-int');
        if (minI instanceof HTMLInputElement) minI.value = String(c.minIntervalSec ?? 0);
        const maxI = mainEl.querySelector('#studio-sound-max-int');
        if (maxI instanceof HTMLInputElement) maxI.value = String(c.maxIntervalSec ?? 0);
        const va = mainEl.querySelector('#studio-sound-vol-atmo');
        if (va instanceof HTMLInputElement) va.value = String(c.atmosphereVolumePercent ?? 0);
        const vv = mainEl.querySelector('#studio-sound-vol-voice');
        if (vv instanceof HTMLInputElement) vv.value = String(c.voicesVolumePercent ?? 0);
        const lj = mainEl.querySelector('#studio-sound-learn-journal');
        if (lj instanceof HTMLSelectElement) {
            const lid = c.learnMoreJournalEntryId ? String(c.learnMoreJournalEntryId) : '';
            if (lid) lj.value = lid;
        }
        const vmVal = c.voiceSelectionMode === 'manual' ? 'manual' : 'random';
        const arw = mainEl.querySelector('#studio-sound-artist-wrap');
        if (arw instanceof HTMLElement) {
            arw.style.display = vmVal === 'manual' ? '' : 'none';
        }
    };

    const load = async () => {
        const raw = await adminGetSoundEnvironmentStudio();
        const artistsWithAudio = (await getArtists().catch(() => [])).filter((a) => String(a?.audioUrl ?? '').trim());
        const c = { ...raw, _artistsWithAudio: artistsWithAudio };
        await fillLearnJournal();
        const lj = mainEl.querySelector('#studio-sound-learn-journal');
        if (lj instanceof HTMLSelectElement && raw.learnMoreJournalEntryId) {
            lj.value = String(raw.learnMoreJournalEntryId);
        }
        applyForm(c);
    };

    mainEl.querySelector('#studio-sound-voice-mode')?.addEventListener('change', (ev) => {
        const t = ev.target;
        const v = t instanceof HTMLSelectElement ? t.value : 'random';
        const arw = mainEl.querySelector('#studio-sound-artist-wrap');
        if (arw instanceof HTMLElement) {
            arw.style.display = v === 'manual' ? '' : 'none';
        }
    });

    mainEl.querySelector('#studio-sound-atmo-file')?.addEventListener('change', async (ev) => {
        const t = ev.target;
        const f = t && 'files' in t ? t.files?.[0] : null;
        if (!f) return;
        try {
            await uploadBlobToS3(f, mainEl.querySelector('#studio-sound-atmo-url'), {
                area: 'studio/sound',
                entityType: 'site',
                entityId: 'sound-environment',
                fieldKey: 'atmosphere',
            });
        } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
        }
        t.value = '';
    });
    mainEl.querySelector('#studio-sound-voice-file')?.addEventListener('change', async (ev) => {
        const t = ev.target;
        const f = t && 'files' in t ? t.files?.[0] : null;
        if (!f) return;
        try {
            await uploadBlobToS3(f, mainEl.querySelector('#studio-sound-manual-voice-url'), {
                area: 'studio/sound',
                entityType: 'site',
                entityId: 'sound-environment',
                fieldKey: 'manual-voice',
            });
        } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
        }
        t.value = '';
    });

    form?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const en = mainEl.querySelector('#studio-sound-enabled');
        const cat = mainEl.querySelector('#studio-sound-category');
        const aurl = mainEl.querySelector('#studio-sound-atmo-url');
        const vm = mainEl.querySelector('#studio-sound-voice-mode');
        const ar = mainEl.querySelector('#studio-sound-artist');
        const mu = mainEl.querySelector('#studio-sound-manual-voice-url');
        const minI = mainEl.querySelector('#studio-sound-min-int');
        const maxI = mainEl.querySelector('#studio-sound-max-int');
        const va = mainEl.querySelector('#studio-sound-vol-atmo');
        const vv = mainEl.querySelector('#studio-sound-vol-voice');
        const lj = mainEl.querySelector('#studio-sound-learn-journal');
        const payload = {
            enabled: en instanceof HTMLInputElement && en.checked,
            categoryLabel: cat instanceof HTMLInputElement ? cat.value : '',
            atmosphereAudioUrl: aurl instanceof HTMLInputElement ? aurl.value : '',
            voiceSelectionMode: vm instanceof HTMLSelectElement ? vm.value : 'random',
            voiceArtistId: ar instanceof HTMLSelectElement && ar.value ? ar.value : undefined,
            manualVoiceAudioUrl: mu instanceof HTMLInputElement ? mu.value : '',
            minIntervalSec: minI instanceof HTMLInputElement ? Number(minI.value) : 0,
            maxIntervalSec: maxI instanceof HTMLInputElement ? Number(maxI.value) : 0,
            atmosphereVolumePercent: va instanceof HTMLInputElement ? Number(va.value) : 0,
            voicesVolumePercent: vv instanceof HTMLInputElement ? Number(vv.value) : 0,
            learnMoreJournalEntryId:
                lj instanceof HTMLSelectElement && lj.value ? lj.value : undefined,
        };
        try {
            await adminSetSoundEnvironmentStudio(
                /** @type {Record<string, unknown>} */ (payload)
            );
            showLocal('ok', 'Sound settings saved.');
        } catch (e) {
            showLocal('error', e instanceof Error ? e.message : String(e));
        }
    });

    try {
        await load();
    } catch (e) {
        showLocal('error', e instanceof Error ? e.message : String(e));
    }
}

async function initJournal(mainEl) {
    const tbody = mainEl.querySelector('#studio-journal-tbody');
    const entriesTbody = mainEl.querySelector('#studio-journal-entries-tbody');
    const banner = mainEl.querySelector('#studio-journal-banner');
    const searchInput = mainEl.querySelector('#studio-journal-search');
    const entriesSearchInput = mainEl.querySelector('#studio-journal-entries-search');
    const countEl = mainEl.querySelector('#studio-journal-header-count');
    const entriesCountEl = mainEl.querySelector('#studio-journal-entries-count');
    const layoutUnsavedEl = mainEl.querySelector('#studio-journal-layout-unsaved');
    const settingsNoteEl = mainEl.querySelector('#studio-journal-settings-note');

    const show = (kind, text) => {
        if (!banner) return;
        banner.style.display = text ? 'block' : 'none';
        banner.className = `studio-banner studio-banner--${kind}`;
        banner.textContent = text;
    };

    if (settingsNoteEl) {
        const live = getDataSource() === 'live';
        settingsNoteEl.innerHTML = live
            ? 'Use <strong>Home carousel</strong> above to choose homepage slides. The test-mode home list editor below does not affect the live site.'
            : 'Use <strong>Home carousel</strong> above for homepage slides. The <strong>/journal</strong> page headline comes from <code>site-info</code> → journal.';
        const blockBtn = mainEl.querySelector('#studio-journal-edit-block');
        if (blockBtn instanceof HTMLButtonElement) {
            blockBtn.disabled = live;
            if (live) blockBtn.title = 'Test mode home list only — not used on the live site';
        }
    }

    const carouselMsg = mainEl.querySelector('#studio-journal-home-carousel-msg');
    const carouselSlotEls = [0, 1, 2].map((i) => mainEl.querySelector(`#studio-journal-home-slot-${i}`));
    const journalPerm = studioFeatureAccess('journal');
    const canEditCarousel = journalPerm.canEdit;
    /** @type {string[]} */
    let carouselEntryIds = [];

    const showCarouselMsg = (kind, text) => {
        if (!(carouselMsg instanceof HTMLElement)) return;
        carouselMsg.style.display = text ? 'block' : 'none';
        carouselMsg.className = `studio-banner studio-banner--${kind}`;
        carouselMsg.textContent = text;
    };

    const publishedEntriesForCarousel = () =>
        filterPublishedJournalEntries(Array.isArray(allEntries) ? allEntries : []);

    const buildCarouselEntryOptions = (selectedId) => {
        const opts = publishedEntriesForCarousel()
            .map((entry) => {
                const id = String(entry?.id ?? '');
                const title = String(entry?.en?.title ?? entry?.en?.name ?? (id || 'Untitled'));
                return `<option value="${escapeHtml(id)}" ${id === selectedId ? 'selected' : ''}>${escapeHtml(title)}</option>`;
            })
            .join('');
        return `<option value="">—</option>${opts}`;
    };

    const renderHomeCarouselSlots = () => {
        carouselSlotEls.forEach((sel, i) => {
            if (!(sel instanceof HTMLSelectElement)) return;
            const selected = String(carouselEntryIds[i] ?? '');
            sel.innerHTML = buildCarouselEntryOptions(selected);
            sel.value = selected;
            sel.disabled = !canEditCarousel;
        });
        const saveBtn = mainEl.querySelector('#studio-journal-home-carousel-save');
        const clearBtn = mainEl.querySelector('#studio-journal-home-carousel-clear');
        if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = !canEditCarousel;
        if (clearBtn instanceof HTMLButtonElement) clearBtn.disabled = !canEditCarousel;
    };

    const readCarouselSlotsFromDom = () => {
        /** @type {string[]} */
        const ids = [];
        for (const sel of carouselSlotEls) {
            if (!(sel instanceof HTMLSelectElement)) continue;
            const id = sel.value.trim();
            if (!id) continue;
            if (!ids.includes(id)) ids.push(id);
        }
        return ids.slice(0, 3);
    };

    const normalizeLayoutRowsForSave = (rows) =>
        (Array.isArray(rows) ? rows : [])
            .map((r) => ({
                rowType: String(r?.rowType || '').trim(),
                refId: String(r?.refId || '').trim() || undefined,
                selectionMode: String(r?.selectionMode || '').trim() || undefined,
                artistId: String(r?.artistId || '').trim() || undefined,
                sortOrder: Math.max(0, Math.floor(Number(r?.sortOrder ?? 0))),
                featured: Boolean(r?.featured),
            }))
            .filter((r) => r.rowType);

    /** @type {Array<Record<string, unknown>>} */
    let layoutRows = [];
    /** @type {Array<Record<string, unknown>>} */
    let allEntries = [];
    /** @type {Array<Record<string, unknown>>} */
    let eventsList = [];
    /** @type {Array<Record<string, unknown>>} */
    let artists = [];
    /** @type {'all' | 'draft' | 'published' | 'archived'} */
    let entryStatusFilter = 'all';
    let savedLayoutJson = '';

    const snapshotLayoutJson = () =>
        JSON.stringify(
            normalizeLayoutRowsForSave(
                layoutRows.map((r) => /** @type {Record<string, unknown>} */ (r))
            )
        );

    const syncLayoutUnsavedBanner = () => {
        if (!(layoutUnsavedEl instanceof HTMLElement)) return;
        readRowsFromTableDom();
        const dirty = snapshotLayoutJson() !== savedLayoutJson;
        layoutUnsavedEl.style.display = dirty ? 'block' : 'none';
    };

    const markLayoutSaved = () => {
        savedLayoutJson = snapshotLayoutJson();
        if (layoutUnsavedEl instanceof HTMLElement) layoutUnsavedEl.style.display = 'none';
    };

    const nextSortOrder = () => {
        const n = layoutRows.length;
        let max = 0;
        for (const r of layoutRows) {
            const so = Math.floor(Number(/** @type {Record<string, unknown>} */ (r).sortOrder ?? 0));
            if (so > max) max = so;
        }
        return max + 1;
    };

    const buildArtistOptions = (rowType, selected) => {
        const pool = rowType === 'audio' ? artists.filter((a) => String(a?.audioUrl ?? '').trim()) : artists.filter((a) => String(a?.quote ?? '').trim());
        const opts = pool
            .map((a) => {
                const id = String(a?.id ?? '');
                const label = String(a?.locales?.en?.name ?? a?.slug ?? id);
                return `<option value="${escapeHtml(id)}" ${id === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
            })
            .join('');
        return `<option value="">—</option>${opts}`;
    };

    const rowSummaryCell = (row) => {
        const t = String(row.rowType || '');
        if (t === 'journal-entry') {
            const id = String(row.refId || '');
            const j = allEntries.find((e) => String(e?.id ?? '') === id);
            const title = j?.en?.title ?? j?.en?.name ?? id;
            return `entry: <code class="studio-code-inline">${escapeHtml(id)}</code> — ${escapeHtml(String(title || ''))}`;
        }
        if (t === 'event') {
            const eid = String(row.refId || '');
            const ev = eventsList.find((e) => String(e?.id ?? '') === eid);
            const t2 = ev?.en?.title ?? ev?.title ?? eid;
            return `event: <code class="studio-code-inline">${escapeHtml(eid)}</code> — ${escapeHtml(String(t2 || ''))}`;
        }
        if (t === 'quote' || t === 'audio') {
            return `${String(row.selectionMode || 'random')} · artist <code class="studio-code-inline">${escapeHtml(String(row.artistId || '—'))}</code>`;
        }
        return '—';
    };

    async function saveLayoutFromState() {
        const rows = normalizeLayoutRowsForSave(
            layoutRows.map((r) => /** @type {Record<string, unknown>} */ (r))
        );
        await adminSetJournalLayoutStudio(rows);
        markLayoutSaved();
        show('ok', 'Layout saved.');
        await load();
    }

    async function addEntryToLayout(entry) {
        const id = String(entry?.id ?? '').trim();
        if (!id) return;
        const { onLayout } = journalEntryOnLayout(id, layoutRows);
        if (onLayout) {
            show('info', 'Entry is already on the /journal layout.');
            return;
        }
        if (journalEntryStatus(entry) === 'draft') {
            if (
                !confirm(
                    'This entry is still a draft. Add to the layout anyway? Visitors will not see it until you publish.'
                )
            ) {
                return;
            }
        }
        readRowsFromTableDom();
        layoutRows.push({
            rowType: 'journal-entry',
            refId: id,
            sortOrder: nextSortOrder(),
            featured: false,
        });
        try {
            await saveLayoutFromState();
        } catch (e) {
            show('error', e instanceof Error ? e.message : String(e));
        }
    }

    async function deleteEntryById(id) {
        if (!confirm(`Delete journal entry ${id}? This cannot be undone.`)) return;
        readRowsFromTableDom();
        const beforeLen = layoutRows.length;
        layoutRows = layoutRows.filter(
            (r) =>
                !(
                    String(r?.rowType || '')
                        .trim()
                        .toLowerCase() === 'journal-entry' && String(r?.refId ?? '') === id
                )
        );
        try {
            await deleteJournalStudio(id);
            if (layoutRows.length !== beforeLen) {
                await adminSetJournalLayoutStudio(
                    normalizeLayoutRowsForSave(
                        layoutRows.map((r) => /** @type {Record<string, unknown>} */ (r))
                    )
                );
            }
            show('ok', 'Journal entry deleted.');
            await load();
        } catch (e) {
            show('error', e instanceof Error ? e.message : String(e));
        }
    }

    const openEventPickModal = (onPicked) => {
        const opts = eventsList
            .map((e) => {
                const id = String(e?.id ?? '');
                const lab = String(e?.en?.title ?? e?.title ?? id);
                return `<option value="${escapeHtml(id)}">${escapeHtml(lab)} (${escapeHtml(id)})</option>`;
            })
            .join('');
        const body = `<div class="studio-section-stack">
          <p class="studio-muted">Add an event row to the <code>/journal</code> layout. Manage event content in Studio → Content (events) if needed.</p>
          <label class="studio-field">
            <span>Event</span>
            <select id="studio-jp-ev-sel" class="studio-select">${opts || '<option value="">(no events)</option>'}</select>
          </label>
          <div class="studio-modal-actions">
            <button type="button" class="studio-btn-primary" id="studio-jp-ev-ok">Add row</button>
            <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
          </div>
        </div>`;
        const { root, close } = openStudioModal(body, { title: 'Add event to layout' });
        root.querySelector('#studio-jp-ev-ok')?.addEventListener('click', () => {
            const se = root.querySelector('#studio-jp-ev-sel');
            const id = se instanceof HTMLSelectElement ? se.value : '';
            if (!id) {
                return;
            }
            close();
            onPicked(id);
        });
    };

    const openQuoteAudioAddModal = (rowType) => {
        const artistsPool = rowType === 'audio' ? artists.filter((a) => String(a?.audioUrl ?? '').trim()) : artists.filter((a) => String(a?.quote ?? '').trim());
        const body = `<div class="studio-section-stack">
          <label class="studio-field">
            <span>Mode</span>
            <select id="studio-jp-qa-mode" class="studio-select">
              <option value="random">random</option>
              <option value="manual">manual</option>
            </select>
          </label>
          <label class="studio-field" id="studio-jp-qa-artist-wrap">
            <span>Artist (manual)</span>
            <select id="studio-jp-qa-artist" class="studio-select" disabled>
              ${artistsPool
                  .map((a) => {
                      const id = String(a?.id ?? '');
                      return `<option value="${escapeHtml(id)}">${escapeHtml(
                          String(a?.locales?.en?.name ?? a?.slug ?? id)
                      )}</option>`;
                  })
                  .join('')}
            </select>
          </label>
          <div class="studio-modal-actions">
            <button type="button" class="studio-btn-primary" id="studio-jp-qa-ok">Add row</button>
            <button type="button" class="studio-btn-ghost" data-studio-modal-close="1">Cancel</button>
          </div>
        </div>`;
        const { root, close } = openStudioModal(body, { title: `Add ${rowType} row` });
        const modeEl = root.querySelector('#studio-jp-qa-mode');
        const artistEl = root.querySelector('#studio-jp-qa-artist');
        const sync = () => {
            const m = modeEl instanceof HTMLSelectElement ? modeEl.value : 'random';
            if (artistEl instanceof HTMLSelectElement) {
                artistEl.disabled = m !== 'manual';
            }
        };
        modeEl?.addEventListener('change', sync);
        sync();
        root.querySelector('#studio-jp-qa-ok')?.addEventListener('click', () => {
            const mode = modeEl instanceof HTMLSelectElement ? modeEl.value : 'random';
            const aid = artistEl instanceof HTMLSelectElement ? artistEl.value : '';
            close();
            layoutRows.push({
                rowType,
                refId: undefined,
                selectionMode: mode,
                artistId: mode === 'manual' && aid ? aid : undefined,
                sortOrder: nextSortOrder(),
                featured: false,
            });
            void (async () => {
                try {
                    await saveLayoutFromState();
                } catch (e) {
                    show('error', e instanceof Error ? e.message : String(e));
                }
            })();
        });
    };

    const openComposeMenuModal = () => {
        const { root, close } = openStudioModal(
            `<div class="studio-section-stack" style="gap:10px;max-width:24rem">
              <p class="studio-muted">What are you adding?</p>
              <button type="button" class="studio-btn-primary" id="jc-je">Journal entry (CMS) — new or edit, then add to layout</button>
              <button type="button" class="studio-btn-ghost" id="jc-ev">Event (pick existing)</button>
              <button type="button" class="studio-btn-ghost" id="jc-qu">Quote row</button>
              <button type="button" class="studio-btn-ghost" id="jc-au">Audio row</button>
            </div>`,
            { title: 'Add layout row' }
        );
        root.querySelector('#jc-je')?.addEventListener('click', () => {
            close();
            openJournalEntryModal(null, () => {}, {
                afterJournalSave: (savedId) => {
                    if (!savedId) return;
                    layoutRows.push({
                        rowType: 'journal-entry',
                        refId: String(savedId),
                        sortOrder: nextSortOrder(),
                        featured: false,
                    });
                    void saveLayoutFromState();
                },
            });
        });
        root.querySelector('#jc-ev')?.addEventListener('click', () => {
            close();
            if (!eventsList.length) {
                show('error', 'No events in the events content bundle. Add events via Studio → Content or test data.');
                return;
            }
            openEventPickModal((eid) => {
                layoutRows.push({
                    rowType: 'event',
                    refId: eid,
                    sortOrder: nextSortOrder(),
                    featured: false,
                });
                void saveLayoutFromState();
            });
        });
        root.querySelector('#jc-qu')?.addEventListener('click', () => {
            close();
            openQuoteAudioAddModal('quote');
        });
        root.querySelector('#jc-au')?.addEventListener('click', () => {
            close();
            openQuoteAudioAddModal('audio');
        });
    };

    async function load() {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
        if (entriesTbody) entriesTbody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
        const [layout, entries, events, roster, carouselCfg] = await Promise.all([
            adminGetJournalLayoutStudio().catch(() => []),
            getJournalEntries().catch(() => []),
            getEventsList().catch(() => []),
            getArtists().catch(() => []),
            getHomeJournalCarouselStudio().catch(() => ({ entryIds: [], updatedAt: '' })),
        ]);
        layoutRows = (Array.isArray(layout) ? layout : []).map((r) => ({ ...r }));
        allEntries = entries;
        eventsList = events;
        artists = roster;
        carouselEntryIds = Array.isArray(carouselCfg?.entryIds)
            ? carouselCfg.entryIds.map(String).filter(Boolean)
            : [];
        markLayoutSaved();
        applyEntriesFilter();
        applyLayoutFilter();
        renderHomeCarouselSlots();
    }

    function readRowsFromTableDom() {
        if (!tbody) return;
        tbody.querySelectorAll('tr[data-jl-idx]').forEach((tr) => {
            const idx = Number(tr.getAttribute('data-jl-idx'));
            if (!Number.isFinite(idx) || !layoutRows[idx]) return;
            const tEl = tr.querySelector('[data-jl-type]');
            const rEl = tr.querySelector('[data-jl-ref]');
            const mEl = tr.querySelector('[data-jl-mode]');
            const aEl = tr.querySelector('[data-jl-artist]');
            const oi = tr.querySelector('[data-jl-order]');
            const fe = tr.querySelector('[data-jl-featured]');
            const o = { .../** @type {Record<string, unknown>} */ (layoutRows[idx]) };
            if (tEl instanceof HTMLSelectElement) o.rowType = tEl.value;
            if (oi instanceof HTMLInputElement) o.sortOrder = Math.max(0, Math.floor(Number(oi.value || 0)));
            if (fe instanceof HTMLInputElement) o.featured = fe.checked;
            if (rEl instanceof HTMLInputElement) o.refId = rEl.value || undefined;
            if (mEl instanceof HTMLSelectElement) o.selectionMode = mEl.value || undefined;
            if (aEl instanceof HTMLSelectElement) o.artistId = aEl.value || undefined;
            layoutRows[idx] = o;
        });
    }

    function applyEntriesFilter() {
        if (!entriesTbody) return;
        const q = (entriesSearchInput instanceof HTMLInputElement ? entriesSearchInput.value : '')
            .trim()
            .toLowerCase();
        const list = (Array.isArray(allEntries) ? allEntries : []).filter((entry) => {
            const status = journalEntryStatus(entry);
            if (entryStatusFilter !== 'all' && status !== entryStatusFilter) return false;
            if (!q) return true;
            const title = String(entry?.en?.title ?? entry?.en?.name ?? '');
            const id = String(entry?.id ?? '');
            const link = String(entry?.link ?? '');
            return `${title} ${id} ${link} ${status}`.toLowerCase().includes(q);
        });
        if (entriesCountEl) entriesCountEl.textContent = String(allEntries.length);
        if (!list.length) {
            entriesTbody.innerHTML = `<tr><td colspan="6">${
                allEntries.length
                    ? 'No entries match this filter.'
                    : 'No journal entries yet. Use <strong>+ New journal entry</strong> to create one.'
            }</td></tr>`;
            return;
        }
        const origin = getPublicSiteOrigin();
        entriesTbody.innerHTML = list
            .map((entry) => {
                const id = String(entry?.id ?? '');
                const title = String(entry?.en?.title ?? entry?.en?.name ?? (id || 'Untitled'));
                const status = journalEntryStatus(entry);
                const onPage = journalEntryOnPageState(id, layoutRows, allEntries);
                const path = journalEntryPublicPath(/** @type {Record<string, unknown>} */ (entry));
                const previewUrl = path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? path : `/${path}`}`;
                const updated = formatStudioDate(entry?.updatedAt);
                return `<tr data-je-id="${escapeHtml(id)}">
                <td>${escapeHtml(title)}</td>
                <td>${journalStudioStatusPill(status)}</td>
                <td>${journalStudioOnPageChip(onPage)}</td>
                <td>
                  <code class="studio-code-inline">${escapeHtml(path)}</code>
                  <button type="button" class="studio-btn-ghost studio-je-copy" data-path="${escapeHtml(path)}" title="Copy URL">Copy</button>
                </td>
                <td>${escapeHtml(updated || '—')}</td>
                <td class="studio-td-actions">
                  <button type="button" class="studio-btn-ghost studio-je-edit-entry" data-id="${escapeHtml(id)}">Edit</button>
                  <button type="button" class="studio-btn-ghost studio-je-add-page" data-id="${escapeHtml(id)}">Add to page</button>
                  <a href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener noreferrer" class="studio-btn-ghost">Preview</a>
                  <button type="button" class="studio-btn-ghost studio-je-delete" data-id="${escapeHtml(id)}">Delete</button>
                </td>
            </tr>`;
            })
            .join('');

        entriesTbody.querySelectorAll('.studio-je-edit-entry').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const row = await getJournalEntryForStudio(id || '');
                openJournalEntryModal(row, load, {});
            });
        });
        entriesTbody.querySelectorAll('.studio-je-add-page').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const entry = allEntries.find((e) => String(e?.id ?? '') === String(id ?? ''));
                if (entry) await addEntryToLayout(entry);
            });
        });
        entriesTbody.querySelectorAll('.studio-je-delete').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (id) await deleteEntryById(id);
            });
        });
        entriesTbody.querySelectorAll('.studio-je-copy').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const path = btn.getAttribute('data-path') || '';
                const full = path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? path : `/${path}`}`;
                try {
                    await navigator.clipboard.writeText(full);
                    show('ok', 'URL copied.');
                } catch {
                    show('error', 'Could not copy URL.');
                }
            });
        });
    }

    function applyLayoutFilter() {
        if (!tbody) return;
        const q = (searchInput instanceof HTMLInputElement ? searchInput.value : '').trim().toLowerCase();
        const displayRows = (Array.isArray(layoutRows) ? layoutRows : []).map((r, i) => ({ r, i })).filter(({ r }) => {
            if (!q) return true;
            const t = String(r?.rowType || '');
            const hay = `${t} ${r?.refId || ''} ${r?.selectionMode || ''} ${r?.artistId || ''}`.toLowerCase();
            if (hay.includes(q)) return true;
            if (t === 'journal-entry' && r?.refId) {
                const j = allEntries.find((e) => String(e?.id ?? '') === String(r.refId));
                if (j) {
                    const title = j.en?.title ?? '';
                    const st = j.entryStatus ?? '';
                    if (`${title} ${j.link ?? ''} ${st}`.toLowerCase().includes(q)) return true;
                }
            }
            return false;
        });
        if (countEl) countEl.textContent = String(q ? displayRows.length : layoutRows.length);
        if (!displayRows.length) {
            tbody.innerHTML = `<tr><td colspan="6">${layoutRows.length ? 'No layout rows match search.' : 'No layout rows. Use + Add layout row.'}</td></tr>`;
            return;
        }
        tbody.innerHTML = displayRows
            .map(({ r, i }) => {
                const t = String(r?.rowType || 'journal-entry');
                const so = Math.floor(Number(r?.sortOrder ?? 0));
                const fe = Boolean(r?.featured);
                const visChip =
                    t === 'journal-entry'
                        ? journalStudioVisibilityChip(
                              journalLayoutRowVisibility(r, allEntries)
                          )
                        : '<span class="studio-muted">—</span>';
                const typeOpts = ['journal-entry', 'event', 'quote', 'audio']
                    .map(
                        (x) =>
                            `<option value="${escapeHtml(x)}" ${x === t ? 'selected' : ''}>${escapeHtml(x)}</option>`
                    )
                    .join('');
                const needRef = t === 'journal-entry' || t === 'event';
                const needSel = t === 'quote' || t === 'audio';
                const mode = String(r?.selectionMode || (needSel ? 'random' : ''));
                return `<tr data-jl-idx="${i}">
                <td><input type="number" class="studio-input" style="width:4rem" data-jl-order value="${so}" min="0" step="1" /></td>
                <td><input type="checkbox" data-jl-featured ${fe ? 'checked' : ''} /></td>
                <td><label class="studio-field"><span class="studio-muted">Type</span><select class="studio-select" data-jl-type>${typeOpts}</select></label></td>
                <td>${visChip}</td>
                <td>
                  <div class="studio-modal-fields-row" style="flex-wrap:wrap;gap:6px;align-items:flex-end">
                    ${needRef ? `<label class="studio-field"><span class="studio-muted">Ref</span><input class="studio-input" data-jl-ref value="${escapeHtml(String(r?.refId || ''))}" style="min-width:8rem" placeholder="id or index" /></label>` : ''}
                    ${
                        needSel
                            ? `<label class="studio-field"><span class="studio-muted">Mode</span>
                        <select class="studio-select" data-jl-mode>
                          <option value="random" ${mode === 'random' ? 'selected' : ''}>random</option>
                          <option value="manual" ${mode === 'manual' ? 'selected' : ''}>manual</option>
                        </select></label>
                        <label class="studio-field"><span class="studio-muted">Artist</span>
                        <select class="studio-select" data-jl-artist ${mode === 'manual' ? '' : 'disabled'}>
                          ${buildArtistOptions(t, String(r?.artistId || ''))}
                        </select></label>`
                            : ''
                    }
                    <p class="studio-muted" style="margin:0;font-size:0.8rem;flex:1 1 200px">${rowSummaryCell(r)}</p>
                  </div>
                </td>
                <td class="studio-td-actions">
                  <button type="button" class="studio-btn-ghost studio-jl-apply" data-idx="${i}">Apply row</button>
                  <button type="button" class="studio-btn-ghost studio-jl-rm" data-idx="${i}">Remove</button>
              ${
                  t === 'journal-entry' && r?.refId
                      ? `<a href="${escapeHtml(`${getPublicSiteOrigin()}${journalEntryPublicPath(allEntries.find((e) => String(e?.id ?? '') === String(r.refId)) || { id: r.refId })}`)}" target="_blank" rel="noopener noreferrer" class="studio-btn-ghost">Preview</a>
                  <button type="button" class="studio-btn-ghost studio-je-edit" data-id="${escapeHtml(String(r.refId))}">Edit entry</button>`
                      : ''
              }
                </td>
            </tr>`;
            })
            .join('');

        tbody.querySelectorAll('.studio-jl-apply').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const ix = Number(btn.getAttribute('data-idx'));
                if (!Number.isFinite(ix) || !layoutRows[ix]) return;
                readRowsFromTableDom();
                try {
                    await saveLayoutFromState();
                } catch (e) {
                    show('error', e instanceof Error ? e.message : String(e));
                }
            });
        });
        tbody.querySelectorAll('.studio-jl-rm').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const ix = Number(btn.getAttribute('data-idx'));
                if (!Number.isFinite(ix) || !layoutRows[ix] || !confirm('Remove this row from the /journal layout?')) return;
                readRowsFromTableDom();
                layoutRows.splice(ix, 1);
                try {
                    await saveLayoutFromState();
                } catch (e) {
                    show('error', e instanceof Error ? e.message : String(e));
                }
            });
        });
        tbody.querySelectorAll('[data-jl-type], [data-jl-mode], [data-jl-order], [data-jl-ref], [data-jl-featured], [data-jl-artist]').forEach((el) => {
            const evt = el.matches('[data-jl-featured]') ? 'change' : 'input';
            el.addEventListener(evt, () => syncLayoutUnsavedBanner());
        });
        tbody.querySelectorAll('[data-jl-type], [data-jl-mode]').forEach((el) => {
            el.addEventListener('change', (ev) => {
                const tr = ev.target && /** @type {Element} */ (ev.target).closest('tr[data-jl-idx]');
                if (!tr) return;
                const tEl = tr.querySelector('[data-jl-type]');
                const mEl = tr.querySelector('[data-jl-mode]');
                const rEl = tr.querySelector('[data-jl-ref]');
                const aEl = tr.querySelector('[data-jl-artist]');
                const typ = tEl instanceof HTMLSelectElement ? tEl.value : 'journal-entry';
                if (rEl instanceof HTMLInputElement) {
                    rEl.disabled = !(typ === 'event' || typ === 'journal-entry');
                }
                if (mEl instanceof HTMLSelectElement) {
                    mEl.disabled = !(typ === 'quote' || typ === 'audio');
                }
                if (aEl instanceof HTMLSelectElement) {
                    const m = mEl instanceof HTMLSelectElement ? mEl.value : 'random';
                    aEl.disabled = !(typ === 'quote' || typ === 'audio') || m !== 'manual';
                    aEl.innerHTML = buildArtistOptions(typ, aEl.value);
                }
                syncLayoutUnsavedBanner();
            });
        });
        tbody.querySelectorAll('.studio-je-edit').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const row = await getJournalEntryForStudio(id || '');
                openJournalEntryModal(row, load, {});
            });
        });
    }

    mainEl.querySelector('#studio-journal-add')?.addEventListener('click', () => {
        openComposeMenuModal();
    });
    mainEl.querySelector('#studio-journal-new-entry')?.addEventListener('click', () => {
        openJournalEntryModal(null, load, {});
    });
    mainEl.querySelector('#studio-journal-save-layout')?.addEventListener('click', async () => {
        readRowsFromTableDom();
        try {
            await saveLayoutFromState();
        } catch (e) {
            show('error', e instanceof Error ? e.message : String(e));
        }
    });
    mainEl.querySelector('#studio-journal-refresh')?.addEventListener('click', () => load());
    mainEl.querySelector('#studio-journal-home-carousel-save')?.addEventListener('click', async () => {
        const entryIds = readCarouselSlotsFromDom();
        const saveBtn = mainEl.querySelector('#studio-journal-home-carousel-save');
        if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;
        showCarouselMsg('info', 'Saving…');
        try {
            await setHomeJournalCarouselStudio({ entryIds });
            carouselEntryIds = entryIds;
            renderHomeCarouselSlots();
            showCarouselMsg(
                'ok',
                entryIds.length
                    ? 'Home carousel saved. Refresh the homepage to preview.'
                    : 'Using automatic newest-first order.'
            );
        } catch (e) {
            showCarouselMsg('error', e instanceof Error ? e.message : String(e));
        } finally {
            if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = !canEditCarousel;
        }
    });
    mainEl.querySelector('#studio-journal-home-carousel-clear')?.addEventListener('click', async () => {
        carouselSlotEls.forEach((sel) => {
            if (sel instanceof HTMLSelectElement) sel.value = '';
        });
        const clearBtn = mainEl.querySelector('#studio-journal-home-carousel-clear');
        if (clearBtn instanceof HTMLButtonElement) clearBtn.disabled = true;
        showCarouselMsg('info', 'Saving…');
        try {
            await setHomeJournalCarouselStudio({ entryIds: [] });
            carouselEntryIds = [];
            renderHomeCarouselSlots();
            showCarouselMsg('ok', 'Automatic newest-first order restored.');
        } catch (e) {
            showCarouselMsg('error', e instanceof Error ? e.message : String(e));
        } finally {
            if (clearBtn instanceof HTMLButtonElement) clearBtn.disabled = !canEditCarousel;
        }
    });
    mainEl.querySelector('#studio-journal-search')?.addEventListener('input', () => applyLayoutFilter());
    mainEl.querySelector('#studio-journal-entries-search')?.addEventListener('input', () =>
        applyEntriesFilter()
    );
    const entryTabsRoot = mainEl.querySelector('#studio-journal-tab-all')?.closest('.studio-data-tabs');
    entryTabsRoot?.querySelectorAll('.studio-data-tabs__tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            const val = tab.getAttribute('data-tab-value');
            if (val === 'all' || val === 'draft' || val === 'published' || val === 'archived') {
                entryStatusFilter = val;
                entryTabsRoot.querySelectorAll('.studio-data-tabs__tab').forEach((t) => {
                    const on = t.getAttribute('data-tab-value') === val;
                    t.classList.toggle('is-active', on);
                    t.setAttribute('aria-selected', on ? 'true' : 'false');
                    t.setAttribute('tabindex', on ? '0' : '-1');
                });
                applyEntriesFilter();
            }
        });
    });

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
        titleBlock: 'Edit: Test mode home list (journals-block)',
        titleSiteInfo: 'Edit: /journal page headline (site-info)',
        uploadArea: 'studio/journal-content',
    });

    await load();
}

async function initEmail(mainEl) {
    await initEmailCampaignStudio(mainEl);
}

function initAi(mainEl) {
    const key = 'fusion-studio-assistance-draft-v1';
    const msg = mainEl.querySelector('#studio-assist-msg');
    const inputEl = mainEl.querySelector('#studio-assist-input');
    const outputEl = mainEl.querySelector('#studio-assist-output');
    const notesEl = mainEl.querySelector('#studio-assist-notes');
    const contextEl = mainEl.querySelector('#studio-assist-context');
    const toneEl = mainEl.querySelector('#studio-assist-tone');
    const lengthEl = mainEl.querySelector('#studio-assist-length');
    const genPromptEl = mainEl.querySelector('#studio-assist-generate-prompt');
    const setMsg = (kind, text) => {
        if (!(msg instanceof HTMLElement)) return;
        if (!text) {
            msg.style.display = 'none';
            msg.textContent = '';
            return;
        }
        msg.style.display = 'block';
        msg.className = `studio-banner studio-banner--${kind}`;
        msg.textContent = text;
    };
    const setBusy = (btn, on, busyText) => {
        if (!(btn instanceof HTMLButtonElement)) return;
        if (!btn.dataset.label) btn.dataset.label = btn.textContent || '';
        btn.disabled = on;
        btn.textContent = on ? busyText : btn.dataset.label;
    };
    const activeTranslateStyle = () => {
        const selected = mainEl.querySelector('input[name="studio-assist-translate-style"]:checked');
        return selected instanceof HTMLInputElement ? selected.value : 'natural';
    };
    const switchTab = (tabId) => {
        const tabs = ['refine', 'generate', 'translate'];
        tabs.forEach((id) => {
            const t = mainEl.querySelector(`#studio-assist-tab-${id}`);
            const p = mainEl.querySelector(`#studio-assist-panel-${id}`);
            const active = id === tabId;
            if (t instanceof HTMLButtonElement) {
                t.classList.toggle('is-active', active);
                t.setAttribute('aria-selected', active ? 'true' : 'false');
            }
            if (p instanceof HTMLElement) {
                p.classList.toggle('is-active', active);
                p.hidden = !active;
            }
        });
    };
    const readInput = () => (inputEl instanceof HTMLTextAreaElement ? inputEl.value.trim() : '');
    const setOutput = (text) => {
        if (!(outputEl instanceof HTMLTextAreaElement)) return;
        outputEl.value = text || '';
    };
    mainEl.querySelectorAll('#studio-assist-tabs .studio-tabs__tab').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.id.endsWith('generate')
                ? 'generate'
                : btn.id.endsWith('translate')
                  ? 'translate'
                  : 'refine';
            switchTab(id);
        });
    });
    mainEl.querySelectorAll('.studio-assist-quick').forEach((btn) => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            if (tab === 'generate' || tab === 'translate' || tab === 'refine') switchTab(tab);
            const preset = btn.getAttribute('data-preset');
            if (preset && genPromptEl instanceof HTMLTextAreaElement) {
                genPromptEl.value = `${preset} for FUSION`;
            }
        });
    });
    mainEl.querySelectorAll('.studio-assist-preset').forEach((btn) => {
        btn.addEventListener('click', () => {
            const p = btn.getAttribute('data-preset') || '';
            if (genPromptEl instanceof HTMLTextAreaElement) {
                genPromptEl.value = p;
                genPromptEl.focus();
            }
        });
    });
    mainEl.querySelector('#studio-assist-clear')?.addEventListener('click', () => {
        if (inputEl instanceof HTMLTextAreaElement) inputEl.value = '';
    });
    mainEl.querySelector('#studio-assist-run-refine')?.addEventListener('click', async (e) => {
        const source = readInput();
        if (!source) {
            setMsg('warn', 'Add input text first.');
            return;
        }
        const tone = toneEl instanceof HTMLSelectElement ? toneEl.value : 'Elevated';
        const len = lengthEl instanceof HTMLSelectElement ? lengthEl.value : 'Keep';
        const context = contextEl instanceof HTMLSelectElement ? contextEl.value : 'Artist profile';
        const notes = notesEl instanceof HTMLTextAreaElement ? notesEl.value.trim() : '';
        const prompt = [
            'Refine this text for FUSION internal editorial use.',
            `Context: ${context}.`,
            `Tone: ${tone}.`,
            `Length instruction: ${len}.`,
            notes ? `Internal context: ${notes}.` : '',
            'Keep factual meaning, improve clarity and structure.',
        ]
            .filter(Boolean)
            .join(' ');
        const btn = e.currentTarget;
        setBusy(btn, true, 'Refining…');
        setMsg('info', 'Running refinement…');
        try {
            const out = await studioReinterpretWithPrompt(prompt, source, 'en');
            setOutput(String(out || ''));
            setMsg('ok', 'Refinement complete.');
        } catch (err) {
            setMsg('error', err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(btn, false, 'Refine Text');
        }
    });
    mainEl.querySelector('#studio-assist-run-generate')?.addEventListener('click', async (e) => {
        const request = genPromptEl instanceof HTMLTextAreaElement ? genPromptEl.value.trim() : '';
        if (!request) {
            setMsg('warn', 'Add a generation prompt first.');
            return;
        }
        const context = contextEl instanceof HTMLSelectElement ? contextEl.value : 'Artist profile';
        const notes = notesEl instanceof HTMLTextAreaElement ? notesEl.value.trim() : '';
        const prompt = [
            'Compose new original copy for FUSION.',
            `Context: ${context}.`,
            notes ? `Internal context: ${notes}.` : '',
            'Output should be publication-ready and concise.',
        ]
            .filter(Boolean)
            .join(' ');
        const btn = e.currentTarget;
        setBusy(btn, true, 'Generating…');
        setMsg('info', 'Generating draft…');
        try {
            const out = await studioReinterpretWithPrompt(prompt, request, 'en');
            setOutput(String(out || ''));
            setMsg('ok', 'Generation complete.');
        } catch (err) {
            setMsg('error', err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(btn, false, 'Generate');
        }
    });
    mainEl.querySelector('#studio-assist-run-translate')?.addEventListener('click', async (e) => {
        const source = readInput();
        if (!source) {
            setMsg('warn', 'Add English text first.');
            return;
        }
        const style = activeTranslateStyle();
        const btn = e.currentTarget;
        setBusy(btn, true, 'Translating…');
        setMsg('info', 'Translating…');
        try {
            let out = await studioTranslateEnToJa(source);
            if (style === 'literal') {
                out = await studioReinterpretWithPrompt(
                    'Rewrite this Japanese translation in a literal/direct style while keeping original meaning.',
                    out,
                    'ja'
                );
            }
            setOutput(String(out || ''));
            setMsg('ok', 'Translation complete.');
        } catch (err) {
            setMsg('error', err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(btn, false, 'Translate to Japanese');
        }
    });
    const copyOutput = async () => {
        const text = outputEl instanceof HTMLTextAreaElement ? outputEl.value : '';
        if (!text.trim()) {
            setMsg('warn', 'No output to copy yet.');
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            setMsg('ok', 'Output copied.');
        } catch {
            setMsg('error', 'Clipboard unavailable in this browser context.');
        }
    };
    mainEl.querySelector('#studio-assist-copy-inline')?.addEventListener('click', () => void copyOutput());
    mainEl.querySelector('#studio-assist-copy-output')?.addEventListener('click', () => void copyOutput());
    mainEl.querySelector('#studio-assist-replace-inline')?.addEventListener('click', () => {
        const out = outputEl instanceof HTMLTextAreaElement ? outputEl.value : '';
        if (inputEl instanceof HTMLTextAreaElement) inputEl.value = out;
    });
    mainEl.querySelector('#studio-assist-apply')?.addEventListener('click', () => {
        const out = outputEl instanceof HTMLTextAreaElement ? outputEl.value : '';
        const target = document.activeElement;
        if (!out.trim()) {
            setMsg('warn', 'No output available.');
            return;
        }
        if (
            target instanceof HTMLTextAreaElement ||
            (target instanceof HTMLInputElement && /^(text|search|url|email)$/i.test(target.type))
        ) {
            target.value = out;
            target.dispatchEvent(new Event('input', { bubbles: true }));
            setMsg('ok', 'Applied to active field.');
            return;
        }
        setMsg('info', 'Focus a text field first, then click Apply to field.');
    });
    mainEl.querySelector('#studio-assist-save-draft')?.addEventListener('click', () => {
        const payload = {
            input: inputEl instanceof HTMLTextAreaElement ? inputEl.value : '',
            output: outputEl instanceof HTMLTextAreaElement ? outputEl.value : '',
            notes: notesEl instanceof HTMLTextAreaElement ? notesEl.value : '',
            context: contextEl instanceof HTMLSelectElement ? contextEl.value : 'Artist profile',
            tone: toneEl instanceof HTMLSelectElement ? toneEl.value : 'Elevated',
            length: lengthEl instanceof HTMLSelectElement ? lengthEl.value : 'Keep',
            prompt: genPromptEl instanceof HTMLTextAreaElement ? genPromptEl.value : '',
            translateStyle: activeTranslateStyle(),
        };
        try {
            localStorage.setItem(key, JSON.stringify(payload));
            setMsg('ok', 'Draft saved.');
        } catch (err) {
            setMsg('error', err instanceof Error ? err.message : String(err));
        }
    });
    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            const o = JSON.parse(raw);
            if (inputEl instanceof HTMLTextAreaElement) inputEl.value = String(o.input || '');
            if (outputEl instanceof HTMLTextAreaElement) outputEl.value = String(o.output || '');
            if (notesEl instanceof HTMLTextAreaElement) notesEl.value = String(o.notes || '');
            if (contextEl instanceof HTMLSelectElement && o.context) contextEl.value = String(o.context);
            if (toneEl instanceof HTMLSelectElement && o.tone) toneEl.value = String(o.tone);
            if (lengthEl instanceof HTMLSelectElement && o.length) lengthEl.value = String(o.length);
            if (genPromptEl instanceof HTMLTextAreaElement) genPromptEl.value = String(o.prompt || '');
            if (o.translateStyle === 'literal' || o.translateStyle === 'natural') {
                const radio = mainEl.querySelector(
                    `input[name="studio-assist-translate-style"][value="${o.translateStyle}"]`
                );
                if (radio instanceof HTMLInputElement) radio.checked = true;
            }
        }
    } catch {
        /* ignore */
    }
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
 * @param {{ firstName?: string, lastName?: string, email?: string } | null} [contact]
 */
function openStudioUserManageModal(row, onSaved, onRefreshUsersList, contact = null) {
    const raw = row.rawAccount;
    if (!raw || typeof raw !== 'object') {
        openStudioModal('<p class="studio-muted">No account payload for this row.</p>', { title: 'Manage account', compact: true });
        return;
    }
    /** Latest canister account payload for Save (updated after Stripe check + sync). */
    let workingRaw = /** @type {Record<string, unknown>} */ (raw);
    const principal = row.principal;
    const curRole = row.role || 'artist';
    const curStatus = row.status || 'pending';
    const exempt = !!row.membershipExemptManual;
    const stripeSt = row.stripeSubscriptionStatus || '—';
    const renews = formatSubscriptionPeriodEnd(row.stripeCurrentPeriodEnd);
    const canisterMembershipLabel = exempt ? 'Manual exempt' : String(stripeSt);
    const accountUpdated = formatStudioAccountUpdatedAt(row.updatedAt);
    const accountUpdatedLabel = escapeHtml(accountUpdated.label);
    const contactFirst = String(contact?.firstName || '').trim();
    const contactLast = String(contact?.lastName || '').trim();
    const contactEmail = String(contact?.email || '').trim();
    const billingHintStored = getStoredBillingEmailForPrincipal(principal);
    const billingHintHtml =
        billingHintStored && billingHintStored.includes('@')
            ? `<p class="studio-muted studio-user-manage-billing-hint" id="studio-user-billing-hint">Client billing email (this browser): <code>${escapeHtml(billingHintStored)}</code></p>`
            : '<p class="studio-muted studio-user-manage-billing-hint" id="studio-user-billing-hint" hidden></p>';

    const paypalSubId = String(
        workingRaw.paypalSubscriptionId ?? workingRaw.paypal_subscription_id ?? '',
    ).trim();

    const body = `
      <div class="studio-user-manage-modal">
        <p class="studio-muted studio-user-manage-legend">The Users table <strong>dot</strong> and <strong>Membership</strong> below reflect the <strong>canister</strong>. <strong>Live Stripe</strong> queries Stripe directly — use Push / Check to align the canister.</p>
        <section class="studio-user-manage-section">
          <h3 class="studio-user-manage-section-title">Identity</h3>
          <div class="studio-user-manage-principal-row">
            <p class="studio-user-manage-principal studio-muted" id="studio-user-principal-line">${escapeHtml(principal)}</p>
            <button type="button" class="studio-btn-ghost studio-btn-tiny" id="studio-user-copy-principal">Copy principal</button>
          </div>
          <p class="studio-muted studio-user-manage-hint">Name and email are stored on the account contact directory (used for staff, team, and Users table).</p>
          <div class="studio-user-manage-control-row">
            <label class="studio-user-manage-label" for="studio-user-edit-first-name">First name</label>
            <input type="text" id="studio-user-edit-first-name" class="studio-input studio-user-manage-contact-input" maxlength="256" autocomplete="off" value="${escapeHtml(contactFirst)}" />
          </div>
          <div class="studio-user-manage-control-row">
            <label class="studio-user-manage-label" for="studio-user-edit-last-name">Last name</label>
            <input type="text" id="studio-user-edit-last-name" class="studio-input studio-user-manage-contact-input" maxlength="256" autocomplete="off" value="${escapeHtml(contactLast)}" />
          </div>
          <div class="studio-user-manage-control-row">
            <label class="studio-user-manage-label" for="studio-user-edit-contact-email">Email</label>
            <input type="email" id="studio-user-edit-contact-email" class="studio-input studio-user-manage-contact-input" maxlength="256" autocomplete="off" value="${escapeHtml(contactEmail)}" />
          </div>
          <p class="studio-muted studio-user-manage-meta">Account <code>updatedAt</code> (core): ${accountUpdatedLabel}</p>
          ${billingHintHtml}
        </section>

        <section class="studio-user-manage-section">
          <h3 class="studio-user-manage-section-title">Account status</h3>
          <p class="studio-muted studio-user-manage-hint">Update role assignment and lifecycle (pending / active / suspended).</p>
          <div class="studio-user-manage-control-row">
            <label class="studio-user-manage-label" for="studio-user-edit-role">Role</label>
            <select id="studio-user-edit-role" class="studio-select studio-user-manage-select" aria-label="Account role">
              <option value="artist" ${curRole === 'artist' ? 'selected' : ''}>artist</option>
              <option value="gallery" ${curRole === 'gallery' ? 'selected' : ''}>gallery</option>
              <option value="curator" ${curRole === 'curator' ? 'selected' : ''}>curator</option>
              <option value="collector" ${curRole === 'collector' ? 'selected' : ''}>collector</option>
              <option value="staff" ${curRole === 'staff' ? 'selected' : ''}>staff</option>
              <option value="collaborator" ${curRole === 'collaborator' ? 'selected' : ''}>collaborator</option>
              <option value="admin" ${curRole === 'admin' ? 'selected' : ''}>admin</option>
            </select>
          </div>
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

        <section class="studio-user-manage-section studio-user-manage-section--reconnect">
          <h3 class="studio-user-manage-section-title">Reconnect Internet Identity</h3>
          <p class="studio-muted studio-user-manage-hint">Move this member account (subscription + artist profile link) to a <strong>new</strong> Internet Identity principal when the member lost access to their original login. Source principal is this row above.</p>
          <div class="studio-user-manage-stripe-row">
            <label class="studio-user-manage-label" for="studio-user-reconnect-to">New principal</label>
            <input type="text" id="studio-user-reconnect-to" class="studio-input studio-user-manage-email-input" placeholder="Paste new II principal from member" autocomplete="off" spellcheck="false" />
          </div>
          <div class="studio-user-manage-sync-actions">
            <button type="button" class="studio-btn-ghost" id="studio-user-reconnect-lookup">Lookup by email</button>
            <button type="button" class="studio-btn-ghost" id="studio-user-reconnect-preview">Preview reconnect</button>
            <button type="button" class="studio-btn-primary" id="studio-user-reconnect-complete">Reconnect account</button>
            <button type="button" class="studio-btn-ghost" id="studio-user-generate-recovery-code">Generate recovery code</button>
          </div>
          <p id="studio-user-reconnect-result" class="studio-muted studio-user-manage-push-result" hidden></p>
          <div id="studio-user-recovery-code-result" class="studio-user-manage-recovery-code" hidden></div>
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
    const reconnectResultEl = root.querySelector('#studio-user-reconnect-result');
    const reconnectToInput = root.querySelector('#studio-user-reconnect-to');
    const recoveryCodeResultEl = root.querySelector('#studio-user-recovery-code-result');
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

    const setReconnectResult = (text, show) => {
        if (!(reconnectResultEl instanceof HTMLElement)) return;
        reconnectResultEl.hidden = !show;
        reconnectResultEl.textContent = show ? text : '';
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

    const runPushSubscriptionToCanister = async (emailStr) =>
        pushSubscriptionToCanisterForStudioRow(principal, emailStr);

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

    const getReconnectEmail = () =>
        emailInput instanceof HTMLInputElement ? emailInput.value.trim() : '';

    const getReconnectToPrincipal = () =>
        reconnectToInput instanceof HTMLInputElement ? reconnectToInput.value.trim() : '';

    root.querySelector('#studio-user-reconnect-lookup')?.addEventListener('click', async () => {
        const emailStr = getReconnectEmail();
        if (!emailStr.includes('@')) {
            setReconnectResult('Enter the member checkout email in Live Stripe first.', true);
            return;
        }
        if (!getIntegrationBaseUrl()) {
            setReconnectResult('Set Integration API URL in Studio → Services.', true);
            return;
        }
        setReconnectResult('Looking up…', true);
        try {
            const data = await accountLookupByEmailForStudio(emailStr, paypalSubId);
            const stripe = data?.stripe && typeof data.stripe === 'object' ? data.stripe : null;
            const paypal = data?.paypal && typeof data.paypal === 'object' ? data.paypal : null;
            const lines = [];
            if (stripe) {
                if (stripe.membershipActive) {
                    lines.push(
                        `Stripe: active (${String(stripe.subscriptionStatus || '')}), sub ${String(stripe.subscriptionId || '')}`,
                    );
                } else {
                    lines.push(`Stripe: ${String(stripe.reason || 'no active subscription')}`);
                }
                if (stripe.principalHint) {
                    lines.push(`Stripe metadata.principal: ${String(stripe.principalHint)}`);
                }
            }
            if (paypal) {
                if (paypal.subscriptionId) {
                    lines.push(`PayPal: ${String(paypal.status || '')} (${String(paypal.subscriptionId)})`);
                    if (paypal.principalHint) {
                        lines.push(`PayPal custom_id.principal: ${String(paypal.principalHint)}`);
                    }
                } else if (paypal.note) {
                    lines.push(String(paypal.note));
                }
            }
            lines.push(`Canister source (this row): ${principal}`);
            if (row.linkedArtistId) {
                lines.push(`linkedArtistId: ${row.linkedArtistId}`);
            }
            setReconnectResult(lines.join(' · '), true);
        } catch (e) {
            setReconnectResult(e instanceof Error ? e.message : String(e), true);
        }
    });

    root.querySelector('#studio-user-reconnect-preview')?.addEventListener('click', async () => {
        const toPr = getReconnectToPrincipal();
        const emailStr = getReconnectEmail();
        if (!toPr) {
            setReconnectResult('Enter the new Internet Identity principal.', true);
            return;
        }
        if (!getIntegrationBaseUrl()) {
            setReconnectResult('Set Integration API URL in Studio → Services.', true);
            return;
        }
        setReconnectResult('Previewing…', true);
        try {
            const preview = await accountReconnectPreviewForStudio({
                email: emailStr,
                fromPrincipal: principal,
                toPrincipal: toPr,
            });
            const warnings = Array.isArray(preview.warnings) ? preview.warnings : [];
            const warnText = warnings.length ? ` Warnings: ${warnings.join(' ')}` : '';
            setReconnectResult(
                `${preview.canProceed ? 'Ready to reconnect.' : 'Cannot reconnect yet.'}${warnText} from=${principal} → to=${toPr}`,
                true,
            );
        } catch (e) {
            setReconnectResult(e instanceof Error ? e.message : String(e), true);
        }
    });

    root.querySelector('#studio-user-reconnect-complete')?.addEventListener('click', async () => {
        const toPr = getReconnectToPrincipal();
        const emailStr = getReconnectEmail();
        if (!toPr) {
            setReconnectResult('Enter the new Internet Identity principal.', true);
            return;
        }
        if (toPr === principal) {
            setReconnectResult('New principal must differ from the source row principal.', true);
            return;
        }
        if (
            !window.confirm(
                `Move this member account from\n${principal}\nto\n${toPr}\n\nThe old principal will be suspended. Continue?`,
            )
        ) {
            return;
        }
        if (!getIntegrationBaseUrl()) {
            setReconnectResult('Set Integration API URL in Studio → Services.', true);
            return;
        }
        setReconnectResult('Reconnecting…', true);
        setSyncWarn('');
        try {
            const result = await accountReconnectCompleteForStudio({
                fromPrincipal: principal,
                toPrincipal: toPr,
                email: emailStr,
                paypalSubscriptionId: paypalSubId,
            });
            const linked = result?.migrated?.linkedArtistId
                ? String(result.migrated.linkedArtistId)
                : row.linkedArtistId || '—';
            setReconnectResult(
                `Reconnected. Artist link: ${linked}. Ask the member to sign in with the new Internet Identity and reload Settings → Profile.`,
                true,
            );
            const { refreshErr } = await refetchUserRowAndRefreshTable();
            if (refreshErr) {
                setSyncWarn(`Reconnect succeeded but table refresh failed: ${refreshErr}`);
            }
        } catch (e) {
            setReconnectResult(e instanceof Error ? e.message : String(e), true);
        }
    });

    root.querySelector('#studio-user-generate-recovery-code')?.addEventListener('click', async () => {
        setReconnectResult('Generating recovery code…', true);
        if (recoveryCodeResultEl instanceof HTMLElement) {
            recoveryCodeResultEl.hidden = true;
            recoveryCodeResultEl.innerHTML = '';
        }
        try {
            const { code, expiresAtSec } = await adminGenerateAccountRecoveryCodeStudio(principal);
            const expiryLabel =
                Number.isFinite(expiresAtSec) && expiresAtSec > 0
                    ? formatStudioDateWithTitle(new Date(expiresAtSec * 1000).toISOString())
                    : '—';
            setReconnectResult('Recovery code generated. Share it with the member.', true);
            if (recoveryCodeResultEl instanceof HTMLElement) {
                recoveryCodeResultEl.hidden = false;
                recoveryCodeResultEl.innerHTML = `<p class="studio-muted">Valid until <strong>${escapeHtml(expiryLabel)}</strong>. Single-use — member enters this on Settings → Profile → Recover account.</p>
                    <div class="studio-user-manage-id-row"><span class="studio-muted">Code</span> <code>${escapeHtml(code)}</code> <button type="button" class="studio-btn-ghost studio-btn-tiny" data-studio-copy="${escapeHtml(code)}">Copy</button></div>`;
            }
        } catch (e) {
            setReconnectResult(e instanceof Error ? e.message : String(e), true);
        }
    });

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
        const roleSel = root.querySelector('#studio-user-edit-role');
        const roleKey = roleSel instanceof HTMLSelectElement ? roleSel.value : 'artist';
        const sel = root.querySelector('#studio-user-edit-status');
        const statusKey = sel instanceof HTMLSelectElement ? sel.value : 'pending';
        const memSel = root.querySelector('#studio-user-edit-membership');
        const mem = memSel instanceof HTMLSelectElement ? memSel.value : 'standard';
        const ex = mem === 'manual_exempt';
        const firstName =
            /** @type {HTMLInputElement|null} */ (root.querySelector('#studio-user-edit-first-name'))
                ?.value?.trim() || '';
        const lastName =
            /** @type {HTMLInputElement|null} */ (root.querySelector('#studio-user-edit-last-name'))
                ?.value?.trim() || '';
        const directoryEmail =
            /** @type {HTMLInputElement|null} */ (root.querySelector('#studio-user-edit-contact-email'))
                ?.value?.trim() || '';
        const patched = {
            ...workingRaw,
            role: { [roleKey]: null },
            status: { [statusKey]: null },
            membershipExemptManual: ex,
            trialStartedAtSec:
                workingRaw.trialStartedAtSec ?? workingRaw.trial_started_at_sec ?? [],
            trialEndsAtSec:
                workingRaw.trialEndsAtSec ?? workingRaw.trial_ends_at_sec ?? [],
            updatedAt: new Date().toISOString(),
        };
        if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;
        if (errEl instanceof HTMLElement) {
            errEl.textContent = '';
            errEl.hidden = true;
        }
        try {
            await adminUpsertUserAccountStudio(principal, patched);
            await adminSetAccountContactForStudio(principal, {
                firstName,
                lastName,
                email: directoryEmail,
            });
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
    const membershipFilter = mainEl.querySelector('#studio-users-filter-membership');
    const countHeader = mainEl.querySelector('#studio-users-header-count');
    const syncAllBtn = mainEl.querySelector('#studio-users-sync-all');
    const loadContactsBtn = mainEl.querySelector('#studio-users-load-contacts');
    const generateTrialBtn = mainEl.querySelector('#studio-users-generate-trial-code');
    const viewCodesBtn = mainEl.querySelector('#studio-users-view-access-codes');
    const trialRoleSel = mainEl.querySelector('#studio-users-trial-role');
    const syncMsg = mainEl.querySelector('#studio-users-sync-msg');

    /** @type {Awaited<ReturnType<typeof getAccountsForStudio>>} */
    let allPairs = [];
    /** @type {Map<string, string>} */
    let linkedArtistLabelById = new Map();
    /** @type {Map<string, { firstName: string, lastName: string, fullName: string, email: string }>} */
    let contactByPrincipal = new Map();

    const membershipCellHtml = (r) => {
        if (r.membershipExemptManual) {
            return escapeHtml('Exempt (manual)');
        }
        return escapeHtml(studioMembershipStatusLabel(r.stripeSubscriptionStatus));
    };

    const mapAccountContactRows = (contacts) =>
        new Map(
            (Array.isArray(contacts) ? contacts : []).map((row) => {
                const p =
                    row && row[0] && typeof row[0] === 'object' && typeof row[0].toText === 'function'
                        ? row[0].toText()
                        : String(row?.[0] || '');
                const c = row?.[1] || {};
                const firstName = String(c.firstName || '').trim();
                const lastName = String(c.lastName || '').trim();
                const email = String(c.email || '').trim();
                const fullName = String(`${firstName} ${lastName}`).trim();
                return [p, { firstName, lastName, fullName, email }];
            })
        );

    const refreshAccountContacts = async () => {
        const contacts = await adminListAccountContactsForStudio();
        contactByPrincipal = mapAccountContactRows(contacts);
    };

    const renderTable = () => {
        if (!tbody) return;
        const wantRole = roleFilter?.value || '';
        const wantSt = statusFilter?.value || '';
        const wantMembership = membershipFilter?.value || '';
        const rows = allPairs.filter((r) => {
            if (wantRole && r.role !== wantRole) return false;
            if (wantSt && r.status !== wantSt) return false;
            if (!studioMembershipFilterMatch(r, wantMembership)) return false;
            return true;
        });
        if (countHeader) countHeader.textContent = String(rows.length);
        if (!rows.length) {
            const emptyMsg =
                allPairs.length === 0 && !wantRole && !wantSt && !wantMembership
                    ? 'No accounts on this canister yet.'
                    : 'No accounts match filters.';
            tbody.innerHTML = `<tr><td colspan="13">${emptyMsg}</td></tr>`;
            return;
        }
        tbody.innerHTML = rows
            .map(
                (r) => {
                    const aid = r.linkedArtistId ? String(r.linkedArtistId) : '';
                    const linkedArtistLabel = aid ? linkedArtistLabelById.get(aid) || aid : '';
                    const contact = contactByPrincipal.get(String(r.principal || '')) || null;
                    const contactName = contact?.fullName || [contact?.firstName, contact?.lastName].filter(Boolean).join(' ');
                    const contactEmail = contact?.email || '';
                    const updated = formatStudioAccountUpdatedAt(r.updatedAt);
                    return `<tr>
                <td><span class="studio-user-sub-dot ${studioMembershipDotClass(r)}" title="Subscription health" aria-hidden="true"></span></td>
                <td><span class="studio-identity-short" title="${escapeHtml(r.principal)}">${escapeHtml(shortPrincipalDisplay(r.principal))}</span></td>
                <td>${contactName ? escapeHtml(contactName) : '—'}</td>
                <td>${contactEmail ? escapeHtml(contactEmail) : '—'}</td>
                <td>${escapeHtml(r.role)}</td>
                <td>${escapeHtml(r.status)}</td>
                <td>${membershipCellHtml(r)}</td>
                <td>${escapeHtml(studioTrialStatusLabel(r))}</td>
                <td><span class="studio-muted" title="${escapeHtml(r.stripeCurrentPeriodEnd || '')}">${escapeHtml(formatSubscriptionPeriodEnd(r.stripeCurrentPeriodEnd))}</span></td>
                <td>${linkedArtistLabel ? escapeHtml(linkedArtistLabel) : '—'}</td>
                <td>${r.linkedOrgId ? escapeHtml(String(r.linkedOrgId)) : '—'}</td>
                <td><span class="studio-muted" title="${escapeHtml(updated.title)}">${escapeHtml(updated.label)}</span></td>
                <td><button type="button" class="studio-btn-primary studio-user-manage" data-principal="${escapeHtml(r.principal)}">Manage</button></td>
            </tr>`;
                }
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
                    '<tr><td colspan="13">listAccounts missing from declarations — run <code>dfx generate fusion-app-backend</code>.</td></tr>';
            }
            return;
        }
        try {
            allPairs = await getAccountsForStudio();
            try {
                const artists = await getArtistsForStudio();
                linkedArtistLabelById = new Map(
                    (artists || []).map((a) => {
                        const id = String(a?.id || '');
                        const name = String(a?.name || '').trim();
                        const email = String(a?.contactEmail || '').trim();
                        const label = [name, email].filter(Boolean).join(' · ');
                        return [id, label || id];
                    })
                );
            } catch {
                linkedArtistLabelById = new Map();
            }
            try {
                await refreshAccountContacts();
            } catch {
                contactByPrincipal = new Map();
            }
        } catch (listErr) {
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="13">${escapeHtml(listErr instanceof Error ? listErr.message : String(listErr))}</td></tr>`;
            }
            roleFilter?.addEventListener('change', renderTable);
            statusFilter?.addEventListener('change', renderTable);
            membershipFilter?.addEventListener('change', renderTable);
            return;
        }
        renderTable();
        roleFilter?.addEventListener('change', renderTable);
        statusFilter?.addEventListener('change', renderTable);
        membershipFilter?.addEventListener('change', renderTable);

        const trialBtn = generateTrialBtn instanceof HTMLButtonElement ? generateTrialBtn : null;
        if (trialBtn) {
            trialBtn.addEventListener('click', async () => {
                const sel = trialRoleSel instanceof HTMLSelectElement ? trialRoleSel.value : 'artist';
                const roleRec = { [sel]: null };
                trialBtn.disabled = true;
                try {
                    const code = await adminCreateTrialJoinInviteCodeStudio(roleRec, 2);
                    await studioAlertGeneratedJoinInviteCode(
                        code,
                        `Role: ${sel}\nTrial: 2 months from redemption\nUse in Join flow to create trial account.`
                    );
                    if (syncMsg) syncMsg.textContent = 'Trial access code generated.';
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    if (syncMsg) {
                        syncMsg.textContent = /Could not allocate trial join code/i.test(msg)
                            ? 'Could not generate a trial access code. Redeploy the backend with the latest access-code generator fix, then try again.'
                            : msg;
                    }
                } finally {
                    trialBtn.disabled = false;
                }
            });
        }
        const codesBtn = viewCodesBtn instanceof HTMLButtonElement ? viewCodesBtn : null;
        if (codesBtn) {
            codesBtn.addEventListener('click', async () => {
                codesBtn.disabled = true;
                try {
                    const rows = await adminListJoinInvitesStudio();
                    /** @type {Array<{ code: string, role: string, active: boolean, createdAt: string }>} */
                    const mapped = (Array.isArray(rows) ? rows : [])
                        .map((r) => {
                            const code = String(r?.[0] ?? '');
                            const rec = r?.[1] || {};
                            const roleObj = rec && typeof rec === 'object' ? rec.role : null;
                            const role =
                                roleObj && typeof roleObj === 'object' ? String(Object.keys(roleObj)[0] || '') : '';
                            const active = Boolean(rec && typeof rec === 'object' ? rec.active : false);
                            const createdAt = String(
                                (rec && typeof rec === 'object' ? rec.createdAt ?? rec.created_at : '') || ''
                            );
                            return { code, role, active, createdAt };
                        })
                        .filter((x) => x.code);
                    const pending = mapped.filter((x) => x.active);
                    const redeemed = mapped.filter((x) => !x.active);
                    const tableHtml = (list, emptyLabel) => {
                        if (!list.length) return `<p class="studio-muted">${escapeHtml(emptyLabel)}</p>`;
                        return `<div class="studio-table-wrap"><table class="studio-table studio-table--dense"><thead><tr><th>Code</th><th>Role</th><th>Created</th></tr></thead><tbody>${list
                            .map(
                                (x) =>
                                    `<tr><td><code>${escapeHtml(x.code)}</code></td><td>${escapeHtml(x.role || '—')}</td><td><span class="studio-muted" title="${escapeHtml(x.createdAt || '')}">${escapeHtml(formatStudioDate(x.createdAt))}</span></td></tr>`
                            )
                            .join('')}</tbody></table></div>`;
                    };
                    openStudioModal(
                        `<div class="studio-section-stack"><h3 class="studio-subheading" style="margin:0">Pending (generated, not redeemed)</h3>${tableHtml(
                            pending,
                            'No pending access codes.'
                        )}<h3 class="studio-subheading" style="margin:0.5rem 0 0">Redeemed</h3>${tableHtml(
                            redeemed,
                            'No redeemed access codes.'
                        )}</div>`,
                        { title: 'Access Codes', compact: true }
                    );
                } catch (e) {
                    if (syncMsg) syncMsg.textContent = e instanceof Error ? e.message : String(e);
                } finally {
                    codesBtn.disabled = false;
                }
            });
        }

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
                            try {
                                await refreshAccountContacts();
                            } catch {
                                /* keep prior contacts */
                            }
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
                            try {
                                await refreshAccountContacts();
                            } catch {
                                /* keep prior contacts */
                            }
                            renderTable();
                        } catch {
                            /* ignore */
                        }
                    },
                    contactByPrincipal.get(String(row.principal || '')) || null,
                );
            });
        }

        const contactsBtn = loadContactsBtn instanceof HTMLButtonElement ? loadContactsBtn : null;
        if (contactsBtn) {
            contactsBtn.addEventListener('click', async () => {
                contactsBtn.disabled = true;
                contactsBtn.setAttribute('aria-busy', 'true');
                if (syncMsg) syncMsg.textContent = 'Loading contacts…';
                let loaded = 0;
                let skipped = 0;
                let failed = 0;
                try {
                    if (getIntegrationBaseUrl()) {
                        const principalList = allPairs.map((row) => row.principal).filter(Boolean);
                        const result = await fetchStripeAccountContactsForPrincipals(principalList);
                        const stripeContacts = Array.isArray(result.contacts) ? result.contacts : [];
                        const stripeContactByPrincipal = new Map(
                            stripeContacts.map((contact) => [String(contact.principal || ''), contact])
                        );
                        for (const row of allPairs) {
                            const principal = String(row.principal || '').trim();
                            if (!principal) {
                                skipped += 1;
                                continue;
                            }
                            const current = contactByPrincipal.get(principal) || {
                                firstName: '',
                                lastName: '',
                                fullName: '',
                                email: '',
                            };
                            const stripeContact = stripeContactByPrincipal.get(principal) || {};
                            const stripeFullName = String(stripeContact.fullName || '').trim();
                            const nameParts = stripeFullName.split(/\s+/).filter(Boolean);
                            const stripeFirst = String(stripeContact.firstName || '').trim() ||
                                (nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : stripeFullName);
                            const stripeLast = String(stripeContact.lastName || '').trim() ||
                                (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
                            const next = {
                                firstName: current.firstName || stripeFirst,
                                lastName: current.lastName || stripeLast,
                                email: current.email || String(stripeContact.email || '').trim(),
                            };
                            if (!next.firstName && !next.lastName && !next.email) {
                                skipped += 1;
                                continue;
                            }
                            if (
                                next.firstName === current.firstName &&
                                next.lastName === current.lastName &&
                                next.email === current.email
                            ) {
                                skipped += 1;
                                continue;
                            }
                            try {
                                await adminSetAccountContactForStudio(principal, next);
                                loaded += 1;
                            } catch {
                                failed += 1;
                            }
                        }
                        failed += Array.isArray(result.failures) ? result.failures.length : 0;
                    } else {
                        skipped = allPairs.length;
                    }
                    try {
                        await refreshAccountContacts();
                    } catch {
                        failed += 1;
                    }
                    renderTable();
                    if (syncMsg) {
                        const noIntegration = getIntegrationBaseUrl() ? '' : ' Integration API URL is not set; refreshed saved canister contacts only.';
                        syncMsg.textContent = `Contacts loaded: ${loaded} saved, ${skipped} skipped, ${failed} failed.${noIntegration}`;
                    }
                } catch (e) {
                    if (syncMsg) syncMsg.textContent = e instanceof Error ? e.message : String(e);
                } finally {
                    contactsBtn.disabled = false;
                    contactsBtn.setAttribute('aria-busy', 'false');
                }
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
                let synced = 0;
                let skipped = 0;
                let failed = 0;
                for (const row of allPairs) {
                    const principal = String(row.principal || '').trim();
                    if (!principal) {
                        skipped += 1;
                        continue;
                    }
                    const email = contactByPrincipal.get(principal)?.email || '';
                    try {
                        const { anySynced, emailRes, principalRes } =
                            await pushSubscriptionToCanisterForStudioRow(principal, email);
                        if (anySynced) {
                            synced += 1;
                        } else {
                            const reason = String(
                                emailRes?.reason || principalRes?.reason || 'no_stripe_match',
                            );
                            if (/no_stripe_customer|no_customer|no_subscription|invalid_email/i.test(reason)) {
                                skipped += 1;
                            } else {
                                failed += 1;
                            }
                        }
                    } catch {
                        failed += 1;
                    }
                }
                try {
                    allPairs = await getAccountsForStudio();
                    renderTable();
                } catch {
                    /* ignore */
                }
                if (syncMsg) {
                    const parts = [`${synced} synced`];
                    if (skipped > 0) parts.push(`${skipped} skipped (no Stripe match)`);
                    if (failed > 0) parts.push(`${failed} failed`);
                    syncMsg.textContent = `Done: ${parts.join(', ')}.`;
                }
                syncBtn.disabled = false;
                syncBtn.setAttribute('aria-busy', 'false');
            });
        }
    } catch (e) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="13">${escapeHtml(e instanceof Error ? e.message : String(e))}</td></tr>`;
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

function openServicesHelpPayPal() {
    const body = `
      <p class="studio-muted">PayPal is the active provider for every new payment. You only need the <strong>client ID</strong> in the browser; the secret and plan IDs live on the integration server.</p>
      <ol class="studio-help-list">
        <li>Open the <a href="https://developer.paypal.com/dashboard/applications/sandbox" target="_blank" rel="noopener">PayPal Developer Dashboard → Apps &amp; Credentials</a>. Use <strong>Sandbox</strong> while testing, then repeat in <strong>Live</strong>.</li>
        <li>Create (or open) an app and copy the <strong>Client ID</strong> into the matching field above (Sandbox → Sandbox, Live → Live).</li>
        <li>Copy the <strong>Secret</strong> into <code>services/fusion-integration-api/.env</code> as <code>PAYPAL_CLIENT_SECRET</code>, with <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_MODE=sandbox</code> (or <code>live</code>).</li>
        <li>Under <strong>Billing → Products &amp; plans</strong> (or via API), create a product, then subscription plans: monthly (<code>MONTH</code> ×1, $30), quarterly (<code>MONTH</code> ×3, $75), and annual (<code>YEAR</code> ×1, $260). Put the plan IDs on the server as <code>PAYPAL_SUBSCRIPTION_MONTHLY_ID</code>, <code>PAYPAL_SUBSCRIPTION_QUARTERLY_ID</code>, and <code>PAYPAL_SUBSCRIPTION_ANNUAL_ID</code>. Keep <code>PAYPAL_PLAN_BIMONTHLY_ID</code> for legacy bi-monthly detection only. Plan changes use <code>POST /payments/subscription/revise</code>.</li>
        <li>Add a webhook pointing at <code>&lt;integration-api&gt;/webhooks/paypal</code> and set <code>PAYPAL_WEBHOOK_ID</code>.</li>
        <li>Set the environment toggle above to <strong>Test / Sandbox</strong> for testing. Use the sandbox buyer account to complete a checkout.</li>
      </ol>
      <p class="studio-muted">Program installment plans are currently disabled for PayPal — members use manual payments until variable-length plans ship.</p>`;
    openStudioModal(body, { title: 'Set up PayPal (primary payments)', wide: true });
}

function openServicesHelpStripe() {
    const body = `
      <ol class="studio-help-list">
        <li>Open <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener">Stripe Dashboard → Developers → API keys</a> (test mode).</li>
        <li>Copy <strong>Publishable key</strong> (<code>pk_test_…</code>) into Studio above — used by Stripe.js in the browser.</li>
        <li>Copy <strong>Secret key</strong> (<code>sk_test_…</code>) into <code>services/fusion-integration-api/.env</code> as <code>STRIPE_SECRET_KEY</code> (never expose in client bundles).</li>
        <li>Legacy Stripe memberships may still use an older bi-monthly price (<code>STRIPE_PRICE_ID</code>). New membership tiers (monthly / quarterly / annual) are PayPal-first; Stripe plan changes are not wired yet.</li>
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
    const providerPaypal = mainEl.querySelector('#studio-svc-provider-paypal');
    const providerStripe = mainEl.querySelector('#studio-svc-provider-stripe');
    const pkTest = mainEl.querySelector('#studio-svc-pk-test');
    const pkLive = mainEl.querySelector('#studio-svc-pk-live');
    const paypalTest = mainEl.querySelector('#studio-svc-paypal-test');
    const paypalLive = mainEl.querySelector('#studio-svc-paypal-live');
    const skTest = mainEl.querySelector('#studio-svc-sk-test');
    const skLive = mainEl.querySelector('#studio-svc-sk-live');
    const resendTo = mainEl.querySelector('#studio-svc-resend-to');
    const resendFrom = mainEl.querySelector('#studio-svc-resend-from');
    const appNotify = mainEl.querySelector('#studio-svc-application-admin-emails');
    const s3r = mainEl.querySelector('#studio-svc-s3-region');
    const s3b = mainEl.querySelector('#studio-svc-s3-bucket');
    const s3p = mainEl.querySelector('#studio-svc-s3-public');
    const resolvedEl = mainEl.querySelector('#studio-svc-pk-resolved');
    const paypalResolvedEl = mainEl.querySelector('#studio-svc-paypal-resolved');
    const paypalStatusEl = mainEl.querySelector('#studio-svc-paypal-status');
    const stripeStatusEl = mainEl.querySelector('#studio-svc-stripe-status');
    const envLabelEls = mainEl.querySelectorAll('[data-studio-pay-env-label]');
    const providerLabelEls = mainEl.querySelectorAll('[data-studio-pay-provider-label]');
    const providerBadgeEls = mainEl.querySelectorAll('[data-studio-pay-provider-badge]');
    const providerCardEls = mainEl.querySelectorAll('[data-studio-pay-card]');

    /**
     * Reflect the selected environment and whether each provider is configured.
     * Reads current input values so typing gives immediate feedback (before Save).
     */
    const refreshPaymentStatus = () => {
        const mode = modeLive?.checked ? 'live' : 'test';
        const envLabel = mode === 'live' ? 'Live' : 'Test / Sandbox';
        envLabelEls.forEach((el) => {
            el.textContent = envLabel;
        });
        const activeProvider = providerStripe?.checked ? 'stripe' : 'paypal';
        const providerLabel = activeProvider === 'stripe' ? 'Stripe' : 'PayPal';
        providerLabelEls.forEach((el) => {
            el.textContent = providerLabel;
        });
        providerCardEls.forEach((card) => {
            if (!(card instanceof HTMLElement)) return;
            const cardProvider = card.getAttribute('data-studio-pay-card');
            const isActive = cardProvider === activeProvider;
            card.classList.toggle('studio-pay-card--active', isActive);
            card.classList.toggle('studio-pay-card--legacy', !isActive);
        });
        providerBadgeEls.forEach((badge) => {
            if (!(badge instanceof HTMLElement)) return;
            const badgeProvider = badge.getAttribute('data-studio-pay-provider-badge');
            const isActive = badgeProvider === activeProvider;
            badge.textContent = isActive ? 'Active · new checkouts' : 'Inactive';
            badge.classList.toggle('studio-pay-badge--active', isActive);
            badge.classList.toggle('studio-pay-badge--legacy', !isActive);
        });
        const ppInput = (mode === 'live' ? paypalLive?.value : paypalTest?.value)?.trim() || '';
        const ppResolved = ppInput || getPayPalClientIdResolved();
        if (paypalResolvedEl) {
            paypalResolvedEl.textContent = ppResolved ? `${ppResolved.slice(0, 14)}…` : '(none)';
        }
        if (paypalStatusEl) {
            const ok = Boolean(ppResolved);
            paypalStatusEl.textContent = ok ? `${envLabel} · client ID set` : `${envLabel} · not configured`;
            paypalStatusEl.classList.toggle('is-ok', ok);
            paypalStatusEl.classList.toggle('is-warn', !ok);
        }
        const stInput = (mode === 'live' ? pkLive?.value : pkTest?.value)?.trim() || '';
        const stResolved = stInput || getStripePublishableKeyResolved();
        if (resolvedEl) {
            resolvedEl.textContent = stResolved ? `${stResolved.slice(0, 14)}…` : '(none)';
        }
        if (stripeStatusEl) {
            const ok = Boolean(stResolved);
            stripeStatusEl.textContent = ok ? `${envLabel} · key set` : `${envLabel} · not configured`;
            stripeStatusEl.classList.toggle('is-ok', ok);
            stripeStatusEl.classList.toggle('is-warn', !ok);
        }
    };

    const load = () => {
        try {
            if (urlEl) urlEl.value = localStorage.getItem(LS_INTEGRATION_API_URL) || '';
            if (bearerEl) bearerEl.value = localStorage.getItem(LS_INTEGRATION_API_KEY) || '';
            const m = getStripeMode();
            if (modeTest) modeTest.checked = m !== 'live';
            if (modeLive) modeLive.checked = m === 'live';
            const p = getActivePaymentProviderSetting();
            if (providerPaypal) providerPaypal.checked = p !== 'stripe';
            if (providerStripe) providerStripe.checked = p === 'stripe';
            if (pkTest) pkTest.value = localStorage.getItem(LS_STRIPE_PK_TEST) || '';
            if (pkLive) pkLive.value = localStorage.getItem(LS_STRIPE_PK_LIVE) || '';
            if (paypalTest) paypalTest.value = localStorage.getItem(LS_PAYPAL_CLIENT_ID_TEST) || '';
            if (paypalLive) paypalLive.value = localStorage.getItem(LS_PAYPAL_CLIENT_ID_LIVE) || '';
            if (resendTo) resendTo.value = localStorage.getItem(LS_RESEND_TEST_TO) || '';
            if (resendFrom) resendFrom.value = localStorage.getItem(LS_RESEND_FROM_OVERRIDE) || '';
            if (appNotify) appNotify.value = localStorage.getItem(LS_APPLICATION_ADMIN_EMAILS) || '';
            if (s3r) s3r.value = localStorage.getItem(LS_S3_REGION) || '';
            if (s3b) s3b.value = localStorage.getItem(LS_S3_BUCKET) || '';
            if (s3p) s3p.value = localStorage.getItem(LS_S3_PUBLIC_BASE) || '';
        } catch {
            /* ignore */
        }
        refreshPaymentStatus();
    };

    const save = () => {
        try {
            if (urlEl) localStorage.setItem(LS_INTEGRATION_API_URL, urlEl.value.trim());
            if (bearerEl) localStorage.setItem(LS_INTEGRATION_API_KEY, bearerEl.value.trim());
            if (modeLive?.checked) setStripeMode('live');
            else setStripeMode('test');
            setActivePaymentProvider(providerStripe?.checked ? 'stripe' : 'paypal');
            if (pkTest) localStorage.setItem(LS_STRIPE_PK_TEST, pkTest.value.trim());
            if (pkLive) localStorage.setItem(LS_STRIPE_PK_LIVE, pkLive.value.trim());
            if (paypalTest) localStorage.setItem(LS_PAYPAL_CLIENT_ID_TEST, paypalTest.value.trim());
            if (paypalLive) localStorage.setItem(LS_PAYPAL_CLIENT_ID_LIVE, paypalLive.value.trim());
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
    const loadResendSegmentFields = async () => {
        for (let i = 1; i <= 5; i += 1) {
            const ni = mainEl.querySelector(`#studio-svc-seg-name-${i}`);
            const ii = mainEl.querySelector(`#studio-svc-seg-id-${i}`);
            if (ni instanceof HTMLInputElement) ni.value = '';
            if (ii instanceof HTMLInputElement) ii.value = '';
        }
        try {
            const slots = await getResendSegmentConfigFromCanister();
            if (!Array.isArray(slots)) return;
            slots.slice(0, 5).forEach((s, idx) => {
                const i = idx + 1;
                const ni = mainEl.querySelector(`#studio-svc-seg-name-${i}`);
                const ii = mainEl.querySelector(`#studio-svc-seg-id-${i}`);
                if (ni instanceof HTMLInputElement) ni.value = String(s?.name || '');
                if (ii instanceof HTMLInputElement) ii.value = String(s?.segmentId || '');
            });
        } catch {
            /* ignore */
        }
    };
    void loadResendSegmentFields();
    mainEl.querySelector('#studio-svc-resend-segments-save')?.addEventListener('click', async () => {
        const slots = [];
        for (let i = 1; i <= 5; i += 1) {
            const ni = mainEl.querySelector(`#studio-svc-seg-name-${i}`);
            const ii = mainEl.querySelector(`#studio-svc-seg-id-${i}`);
            const name = ni instanceof HTMLInputElement ? ni.value.trim() : '';
            const segmentId = ii instanceof HTMLInputElement ? ii.value.trim() : '';
            if (name || segmentId) slots.push({ name, segmentId });
        }
        if (slots.length > 5) {
            show('error', 'At most 5 segments.');
            return;
        }
        show('info', 'Saving…');
        try {
            await setResendSegmentConfigOnCanister(slots);
            show('ok', 'Segment config saved to canister.');
            await loadResendSegmentFields();
        } catch (e) {
            show('error', e instanceof Error ? e.message : String(e));
        }
    });
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

    // Provider + environment toggles apply immediately (persisted) so status updates live.
    [providerPaypal, providerStripe].forEach((el) => {
        el?.addEventListener('change', () => {
            setActivePaymentProvider(providerStripe?.checked ? 'stripe' : 'paypal');
            refreshPaymentStatus();
        });
    });
    [modeTest, modeLive].forEach((el) => {
        el?.addEventListener('change', () => {
            setStripeMode(modeLive?.checked ? 'live' : 'test');
            refreshPaymentStatus();
        });
    });
    [paypalTest, paypalLive, pkTest, pkLive].forEach((el) => {
        el?.addEventListener('input', refreshPaymentStatus);
    });

    mainEl.querySelector('#studio-svc-save-payments')?.addEventListener('click', () => save());
    mainEl.querySelector('#studio-svc-help-paypal')?.addEventListener('click', () => openServicesHelpPayPal());

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
                subject: 'Fusion | Studio test email',
                text: 'If you received this, Resend + integration API are configured.',
                ...(fromOpt && fromOpt.includes('@') ? { from: fromOpt } : {}),
            });
            show('ok', 'Test email sent.');
        } catch (e) {
            show('error', e instanceof Error ? e.message : String(e));
        }
    });

    mainEl.querySelector('#studio-svc-new-applicant-notify-test')?.addEventListener('click', async () => {
        if (!getIntegrationBaseUrl()) {
            show('error', 'Integration API URL is not configured (Services → URL).');
            return;
        }
        if (appNotify) {
            try {
                localStorage.setItem(LS_APPLICATION_ADMIN_EMAILS, String(appNotify.value || '').trim());
            } catch {
                /* ignore */
            }
        }
        const staffRecipients = getApplicationStaffNotificationEmails();
        if (!staffRecipients.length) {
            show('error', 'No staff notification recipients (unexpected).');
            return;
        }
        show('info', 'Sending new applicant test…');
        try {
            const programs = await getPrograms();
            const programName = programs[0] ? getProgramDisplayNameFromRow(programs[0]) : 'Sample program';
            const { subject, text } = buildNewApplicantStaffNotificationEmail({
                programName,
                payloadFields: {
                    firstName: 'Test',
                    lastName: 'Applicant',
                    website: 'https://example.org',
                },
                submittedAt: new Date().toISOString(),
            });
            const fromOpt = (resendFrom?.value || '').trim();
            for (const to of staffRecipients) {
                await sendEmail({
                    to,
                    subject,
                    text,
                    ...(fromOpt && fromOpt.includes('@') ? { from: fromOpt } : {}),
                });
            }
            show('ok', 'New applicant notification test sent to all staff recipients.');
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

async function initPlatformUpdateBannerTools(mainEl) {
    const wrap = mainEl.querySelector('#studio-platform-banner-tools');
    const enabledEl = mainEl.querySelector('#studio-platform-banner-enabled');
    const enEl = mainEl.querySelector('#studio-platform-banner-en');
    const jaEl = mainEl.querySelector('#studio-platform-banner-ja');
    const saveBtn = mainEl.querySelector('#studio-platform-banner-save');
    const statusEl = mainEl.querySelector('#studio-platform-banner-status');

    const setStatus = (t) => {
        if (statusEl) statusEl.textContent = t || '';
    };

    if (!wrap) return;

    if (!studioFeatureAccess('settings').canEdit) {
        wrap.hidden = true;
        return;
    }

    if (getDataSource() === 'live') {
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
            wrap.hidden = true;
            return;
        }
    }

    wrap.hidden = false;

    try {
        const cfg = await getPlatformUpdateBanner();
        if (enabledEl instanceof HTMLInputElement) enabledEl.checked = Boolean(cfg.enabled);
        if (enEl instanceof HTMLTextAreaElement) enEl.value = cfg.messageEn;
        if (jaEl instanceof HTMLTextAreaElement) jaEl.value = cfg.messageJa;
    } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
    }

    saveBtn?.addEventListener('click', async () => {
        setStatus('Saving…');
        if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;
        try {
            await setPlatformUpdateBanner({
                enabled: enabledEl instanceof HTMLInputElement ? enabledEl.checked : false,
                messageEn: enEl instanceof HTMLTextAreaElement ? enEl.value.trim() : '',
                messageJa: jaEl instanceof HTMLTextAreaElement ? jaEl.value.trim() : '',
            });
            setStatus('Banner settings saved.');
        } catch (e) {
            setStatus(e instanceof Error ? e.message : String(e));
        } finally {
            if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = false;
        }
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

    await initPlatformUpdateBannerTools(mainEl);

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

    if (!studioFeatureAccess('settings').canEdit) {
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
