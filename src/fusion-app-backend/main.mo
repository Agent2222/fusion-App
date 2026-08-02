import Types "./types";
import Llm "mo:llm";
import _HashMap "mo:base/HashMap";
import _Iter "mo:base/Iter";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Char "mo:base/Char";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Order "mo:base/Order";

// Roster `contactEmail` is on `ArtistRecord` / `ArtistCore`; one-time V0→V1 migration was removed after mainnet backfill.
// `ProgramRecord` includes `depositAmountDisplay`. The old V0→V1 migration file was removed so upgrades from
// canisters that already store full `ProgramRecord` do not expect a 7-field `ProgramRecordV0` in stable memory.
persistent actor {
  /// Internet Identity / admin principals allowed to list/delete subscribers and manage admins.
  /// Initial value is used on **first install only**; upgrades keep stable state. New defaults must also be
  /// listed in `defaultAdminPrincipals()` so `postupgrade` merges them into existing canisters.
  stable var adminPrincipals : [Principal] = [
    Principal.fromText("6pq72-g2xdl-lae4k-3kadu-aksdn-qvebw-s23b6-4yhtg-wngft-3hvqb-xae"),
    Principal.fromText("7dhk2-asv4d-cqgdn-wknwc-hbfpj-yvi6l-zvepa-nn264-eh2io-gudsn-xqe"),
    Principal.fromText("fjqfj-67bb7-lyure-u2naw-63fbm-3xmn6-qluef-pqtd5-thj7z-ythn6-2ae"),
    Principal.fromText("5mnm6-7wh7d-imemq-z22vs-zgudw-szmvi-ake5j-o3q22-eodai-4sj4y-oqe"),
  ];

  /// Legacy 5-field rows (pre–Resend-audiences). Kept empty after first flush to `subscribersV1` so stable upgrade from older canisters still deserializes.
  stable var subscribersStable : [(Text, Types.SubscriberV0)] = [];
  /// Canonical subscriber rows including `audiences` (new stable slot; empty on canisters that have not upgraded yet).
  stable var subscribersV1 : [(Text, Types.Subscriber)] = [];

  /// Studio → Services / Resend: up to five named segment UUIDs (UI + SYNC).
  stable var resendSegmentConfigStable : [Types.ResendSegmentSlot] = [];

  /// Principal -> user account core (roles, links). Flushed in preupgrade.
  stable var accountsStable : [(Principal, Types.UserAccountCore)] = [];

  /// Stripe + membership flags (parallel to `accountsStable`).
  /// V0 slot keeps the pre-PayPal on-disk layout for upgrade compatibility; V2 holds the current shape.
  stable var membershipByPrincipalStable : [(Principal, Types.MembershipFieldsV0)] = [];
  stable var membershipByPrincipalStableV2 : [(Principal, Types.MembershipFields)] = [];
  /// Principal -> trial window seconds (`startedAtSec`, `endsAtSec`) for access-code trials.
  stable var membershipTrialWindowStable : [(Principal, Types.TrialMembershipWindow)] = [];

  /// ISO 8601 renewal end from Stripe (`current_period_end`) — separate map so `MembershipFields` stays upgrade-compatible.
  stable var membershipStripePeriodEndStable : [(Principal, Text)] = [];

  /// Integration API caller (PEM identity) — set via admin. Required for `integrationRecordStripeSubscription`.
  stable var integrationServicePrincipal : ?Principal = null;

  /// Artist id -> full record. Flushed in preupgrade.
  stable var artistsStable : [(Text, Types.ArtistRecord)] = [];

  /// Feed cohort years — separate from `ArtistFilterStored` so `artistsStable` stays upgrade-compatible.
  stable var artistFilterCohortYearsStable : [(Text, [Nat])] = [];

  stable var programsStable : [(Text, Types.ProgramRecord)] = [];
  stable var journalsStable : [(Text, Types.JournalRecord)] = [];
  /// `/journal` row list (4 fields) — stable name matches pre–sortOrder mainnet; `postupgrade` copies into `journalLayoutRows` with sortOrder/featured.
  stable var journalLayoutStable : [Types.JournalLayoutRowV4] = [];
  stable var artistMediaStable : [(Text, Types.ArtistMedia)] = [];
  stable var editionsStable : [(Text, Types.EditionRecord)] = [];
  stable var contentPagesStable : [(Text, Types.ContentPageRecord)] = [];
  stable var applicantsStable : [(Text, Types.ApplicantRecord)] = [];
  stable var archivedApplicantsStable : [(Text, Types.ApplicantRecord)] = [];
  /// Applicant id → JSON array of `ApplicantEmailOutreachEntry` (separate from `ApplicantRecord`).
  stable var applicantEmailOutreachStable : [(Text, Text)] = [];
  stable var programPaymentSummariesStable : [(Text, Types.ProgramPaymentSummary)] = [];
  stable var programPaymentLedgerStable : [(Text, Types.ProgramPaymentLedgerRowV0)] = [];
  stable var programPaymentLedgerStableV1 : [(Text, Types.ProgramPaymentLedgerRowV1)] = [];
  stable var programPaymentLedgerStableV2 : [(Text, Types.ProgramPaymentLedgerRow)] = [];
  stable var programPaymentPlansStable : [(Text, Types.ProgramPaymentPlanV1)] = [];
  stable var programPaymentPlansStableV2 : [(Text, Types.ProgramPaymentPlan)] = [];
  var programPaymentFlightPreferencesStable : [(Text, Types.ProgramPaymentFlightPreference)] = [];
  stable var siteSettingsStable : [(Text, Text)] = [];
  /// Studio Finance → Promotions.
  stable var financePromotionsStable : [(Text, Types.FinancePromotion)] = [];
  /// Studio Finance → Program team members (disbursements / expenses).
  stable var programTeamMembersStable : [(Text, Types.ProgramTeamMember)] = [];
  stable var programTeamOwedEntriesStable : [(Text, Types.ProgramTeamOwedEntry)] = [];
  stable var programTeamPaidEntriesStable : [(Text, Types.ProgramTeamPaidEntry)] = [];
  /// Paid entry id → "admin" | "program" (parallel map keeps ProgramTeamPaidEntry upgrade-safe).
  stable var programTeamPaidFundedByStable : [(Text, Text)] = [];

  /// Membership billing tier: monthly | quarterly | annual | bimonthly (legacy).
  stable var membershipTierStable : [(Principal, Text)] = [];
  /// Stackable quarterly application credits (unused roll over).
  stable var quarterlyAppCreditBalanceStable : [(Principal, Nat)] = [];
  /// Last accrued calendar quarter key (`YYYY-Qn`) per principal.
  stable var quarterlyAppCreditLastAccruedStable : [(Principal, Text)] = [];

  /// Join invite codes (8-digit) — admin-generated; deactivated after first successful redemption.
  stable var joinInvitesStable : [(Text, Types.JoinInviteRecord)] = [];
  /// Join invite code -> trial month duration (only present for trial invites).
  stable var joinInviteTrialMonthsStable : [(Text, Nat)] = [];
  /// Account recovery codes (8-digit) — admin-generated; single-use; 7-day expiry.
  stable var accountRecoveryCodesStable : [(Text, Types.AccountRecoveryCodeRecord)] = [];

  /// Composite key: `artistId|programId` → JSON `{"submittedAt":...,"payload":...}` (one entry per program).
  stable var applicationByArtistProgramStable : [(Text, Text)] = [];

  /// Artist id → canonical program key for “most recent program” (Studio + residency badge).
  stable var artistMostRecentProgramStable : [(Text, Text)] = [];

  /// Featured strip: ids eligible for random rotation (subset flag per artist).
  stable var artistFeaturedFeaturableIdsStable : [Text] = [];
  /// Manual featured order (max 8) — public home/artists strip when not in random mode.
  stable var artistFeaturedManualIdsStable : [Text] = [];
  /// When true, public clients pick up to 8 from the featurable pool (shuffled client-side).
  stable var artistFeaturedRandomModeStable : Bool = false;

  /// Studio → Permissions: role-tab defaults (`staff`, …), per-principal overrides, super-staff principals.
  stable var studioPermissionDefaultsStable : [(Text, Types.StudioPermissionMatrix)] = [];
  stable var studioPermissionOverridesStable : [(Principal, Types.StudioPermissionMatrix)] = [];
  /// Runtime permission matrix feature ids (merged from defaults on upgrade; admins may append).
  stable var studioFeatureKeys : [Text] = [];
  stable var superStaffPrincipalsStable : [Principal] = [];
  /// Join Fusion / Team tab: name + email per principal (exempt from `UserAccount` core layout).
  stable var accountContactStable : [(Principal, Types.AccountContact)] = [];

  /// Studio → Email: saved campaigns.
  stable var emailCampaignsStable : [(Text, Types.EmailCampaignRecord)] = [];
  /// Monotonic id counter for new campaigns (ids are `Nat` as `Text`); reconciled in `postupgrade` when loading from `emailCampaignsStable`.
  stable var nextEmailCampaignId : Nat = 0;

  stable var soundEnvironmentConfigStable : Types.SoundEnvironmentConfig = {
    categoryLabel = "Nature";
    atmosphereAudioUrl = "";
    voiceSelectionMode = "random";
    voiceArtistId = null;
    manualVoiceAudioUrl = "";
    minIntervalSec = 45;
    maxIntervalSec = 120;
    atmosphereVolumePercent = 60;
    voicesVolumePercent = 40;
    learnMoreJournalEntryId = null;
    enabled = false;
  };
  /// `/journal` page layout (sortOrder + featured); written by Studio; populated from `journalLayoutStable` on upgrade.
  stable var journalLayoutRows : [Types.JournalLayoutRow] = [];

  /// `/community` landing JSON (Studio-managed; validated only by size — clients parse).
  stable var communityPageJsonStable : Text = "{}";

  /// Community video library (`/videos`); Studio “community” / Videos section.
  stable var communityVideosStable : [(Text, Types.CommunityVideoRecord)] = [];

  /// Featured video ids (max 6) + hero for `/community` landing.
  stable var communityFeaturedVideosStable : Types.CommunityFeaturedVideosConfig = {
    featuredVideoIds = [];
    heroVideoId = null;
    updatedAt = "";
  };

  /// Home page journal hero carousel (max 3 entry ids, manual order).
  stable var homeJournalCarouselStable : Types.HomeJournalCarouselConfig = {
    entryIds = [];
    updatedAt = "";
  };

  /// Card “Profile” headshot URLs — **append-only** stable slot; separate from `artistsStable` / `ArtistCore` for safe upgrades.
  stable var artistHeroProfileImageStable : [(Text, Text)] = [];
  /// Artist ids with staff-approved headshots for public cards (parallel map; default not approved).
  stable var artistHeroProfileImageApprovedIdsStable : [Text] = [];
  /// Artist ids whose audio bite is approved for public play (sound env / profile / journal).
  stable var artistAudioApprovedIdsStable : [Text] = [];

  /// Multi-bite audio collection per artist (max 5 entries each).
  stable var artistAudioCollectionStable : [(Text, [Types.ArtistAudioEntry])] = [];
  /// Artist id → highlight audio URL (synced to ArtistMedia.audioUrl for backward compat).
  stable var artistAudioHighlightStable : [(Text, Text)] = [];
  /// Artist id → list of staff-approved audio URLs (per-bite approval).
  stable var artistAudioApprovedUrlsStable : [(Text, [Text])] = [];

  /// Staff review notes for hero profile images (keyed by artist id).
  stable var heroProfileImageReviewNotesStable : [(Text, Types.AssetReviewNote)] = [];
  /// Staff review notes for audio entries (keyed by "artistId|audioUrl").
  stable var audioEntryReviewNotesStable : [(Text, Types.AssetReviewNote)] = [];

  // In-memory hashmap for fast lookups/updates.
  transient var subscribersByEmail : _HashMap.HashMap<Text, Types.Subscriber> =
    _HashMap.HashMap<Text, Types.Subscriber>(
      subscribersV1.size() + subscribersStable.size(),
      Text.equal,
      Text.hash
    );

  transient var accountsByPrincipal : _HashMap.HashMap<Principal, Types.UserAccountCore> =
    _HashMap.HashMap<Principal, Types.UserAccountCore>(
      accountsStable.size(),
      Principal.equal,
      Principal.hash
    );

  transient var membershipByPrincipal : _HashMap.HashMap<Principal, Types.MembershipFields> =
    _HashMap.HashMap<Principal, Types.MembershipFields>(
      membershipByPrincipalStable.size() + membershipByPrincipalStableV2.size(),
      Principal.equal,
      Principal.hash
    );
  transient var membershipTrialWindowByPrincipal : _HashMap.HashMap<Principal, Types.TrialMembershipWindow> =
    _HashMap.HashMap<Principal, Types.TrialMembershipWindow>(
      membershipTrialWindowStable.size(),
      Principal.equal,
      Principal.hash
    );

  transient var membershipStripePeriodEndByPrincipal : _HashMap.HashMap<Principal, Text> =
    _HashMap.HashMap<Principal, Text>(
      membershipStripePeriodEndStable.size(),
      Principal.equal,
      Principal.hash
    );

  transient var artistsById : _HashMap.HashMap<Text, Types.ArtistRecord> =
    _HashMap.HashMap<Text, Types.ArtistRecord>(
      artistsStable.size(),
      Text.equal,
      Text.hash
    );

  transient var artistFilterCohortYearsById : _HashMap.HashMap<Text, [Nat]> =
    _HashMap.HashMap<Text, [Nat]>(
      artistFilterCohortYearsStable.size(),
      Text.equal,
      Text.hash
    );

  transient var artistHeroProfileImageById : _HashMap.HashMap<Text, Text> =
    _HashMap.HashMap<Text, Text>(
      artistHeroProfileImageStable.size(),
      Text.equal,
      Text.hash
    );

  transient var artistHeroProfileImageApprovedById : _HashMap.HashMap<Text, Bool> =
    _HashMap.HashMap<Text, Bool>(
      artistHeroProfileImageApprovedIdsStable.size(),
      Text.equal,
      Text.hash
    );

  transient var artistAudioApprovedById : _HashMap.HashMap<Text, Bool> =
    _HashMap.HashMap<Text, Bool>(
      artistAudioApprovedIdsStable.size(),
      Text.equal,
      Text.hash
    );

  transient var artistAudioCollectionById : _HashMap.HashMap<Text, [Types.ArtistAudioEntry]> =
    _HashMap.HashMap<Text, [Types.ArtistAudioEntry]>(0, Text.equal, Text.hash);

  transient var artistAudioHighlightById : _HashMap.HashMap<Text, Text> =
    _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);

  transient var artistAudioApprovedUrlsById : _HashMap.HashMap<Text, [Text]> =
    _HashMap.HashMap<Text, [Text]>(0, Text.equal, Text.hash);

  transient var heroProfileImageReviewNotesById : _HashMap.HashMap<Text, Types.AssetReviewNote> =
    _HashMap.HashMap<Text, Types.AssetReviewNote>(0, Text.equal, Text.hash);

  transient var audioEntryReviewNotesByKey : _HashMap.HashMap<Text, Types.AssetReviewNote> =
    _HashMap.HashMap<Text, Types.AssetReviewNote>(0, Text.equal, Text.hash);

  /// slug -> artist id
  transient var artistSlugToId : _HashMap.HashMap<Text, Text> =
    _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);

  transient var programsById : _HashMap.HashMap<Text, Types.ProgramRecord> =
    _HashMap.HashMap<Text, Types.ProgramRecord>(0, Text.equal, Text.hash);

  transient var journalsById : _HashMap.HashMap<Text, Types.JournalRecord> =
    _HashMap.HashMap<Text, Types.JournalRecord>(0, Text.equal, Text.hash);

  transient var editionsById : _HashMap.HashMap<Text, Types.EditionRecord> =
    _HashMap.HashMap<Text, Types.EditionRecord>(0, Text.equal, Text.hash);

  transient var contentBySlug : _HashMap.HashMap<Text, Types.ContentPageRecord> =
    _HashMap.HashMap<Text, Types.ContentPageRecord>(0, Text.equal, Text.hash);

  transient var communityVideosById : _HashMap.HashMap<Text, Types.CommunityVideoRecord> =
    _HashMap.HashMap<Text, Types.CommunityVideoRecord>(0, Text.equal, Text.hash);

  transient var applicantsById : _HashMap.HashMap<Text, Types.ApplicantRecord> =
    _HashMap.HashMap<Text, Types.ApplicantRecord>(0, Text.equal, Text.hash);

  transient var archivedApplicantsById : _HashMap.HashMap<Text, Types.ApplicantRecord> =
    _HashMap.HashMap<Text, Types.ApplicantRecord>(0, Text.equal, Text.hash);

  transient var applicantEmailOutreachById : _HashMap.HashMap<Text, Text> =
    _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);

  transient var programPaymentSummariesByKey : _HashMap.HashMap<Text, Types.ProgramPaymentSummary> =
    _HashMap.HashMap<Text, Types.ProgramPaymentSummary>(0, Text.equal, Text.hash);

  transient var programPaymentLedgerById : _HashMap.HashMap<Text, Types.ProgramPaymentLedgerRow> =
    _HashMap.HashMap<Text, Types.ProgramPaymentLedgerRow>(0, Text.equal, Text.hash);

  transient var programPaymentPlansById : _HashMap.HashMap<Text, Types.ProgramPaymentPlan> =
    _HashMap.HashMap<Text, Types.ProgramPaymentPlan>(0, Text.equal, Text.hash);

  transient var programPaymentFlightPreferencesByKey : _HashMap.HashMap<Text, Types.ProgramPaymentFlightPreference> =
    _HashMap.HashMap<Text, Types.ProgramPaymentFlightPreference>(0, Text.equal, Text.hash);

  transient var financePromotionsById : _HashMap.HashMap<Text, Types.FinancePromotion> =
    _HashMap.HashMap<Text, Types.FinancePromotion>(0, Text.equal, Text.hash);

  transient var programTeamMembersById : _HashMap.HashMap<Text, Types.ProgramTeamMember> =
    _HashMap.HashMap<Text, Types.ProgramTeamMember>(0, Text.equal, Text.hash);

  transient var programTeamOwedEntriesById : _HashMap.HashMap<Text, Types.ProgramTeamOwedEntry> =
    _HashMap.HashMap<Text, Types.ProgramTeamOwedEntry>(0, Text.equal, Text.hash);

  transient var programTeamPaidEntriesById : _HashMap.HashMap<Text, Types.ProgramTeamPaidEntry> =
    _HashMap.HashMap<Text, Types.ProgramTeamPaidEntry>(0, Text.equal, Text.hash);

  transient var programTeamPaidFundedByById : _HashMap.HashMap<Text, Text> =
    _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);

  transient var membershipTierByPrincipal : _HashMap.HashMap<Principal, Text> =
    _HashMap.HashMap<Principal, Text>(0, Principal.equal, Principal.hash);

  transient var quarterlyAppCreditBalanceByPrincipal : _HashMap.HashMap<Principal, Nat> =
    _HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);

  transient var quarterlyAppCreditLastAccruedByPrincipal : _HashMap.HashMap<Principal, Text> =
    _HashMap.HashMap<Principal, Text>(0, Principal.equal, Principal.hash);

  transient var siteSettingsByKey : _HashMap.HashMap<Text, Text> =
    _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);

  transient var applicationByArtistProgram : _HashMap.HashMap<Text, Text> =
    _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);

  transient var mostRecentProgramByArtistId : _HashMap.HashMap<Text, Text> =
    _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);

  transient var artistFeaturedFeaturableById : _HashMap.HashMap<Text, Bool> =
    _HashMap.HashMap<Text, Bool>(0, Text.equal, Text.hash);

  transient var manualFeaturedArtistIds : Buffer.Buffer<Text> = Buffer.Buffer<Text>(0);

  transient var joinInvitesByCode : _HashMap.HashMap<Text, Types.JoinInviteRecord> =
    _HashMap.HashMap<Text, Types.JoinInviteRecord>(0, Text.equal, Text.hash);
  transient var joinInviteTrialMonthsByCode : _HashMap.HashMap<Text, Nat> =
    _HashMap.HashMap<Text, Nat>(0, Text.equal, Text.hash);

  transient var accountRecoveryCodesByCode : _HashMap.HashMap<Text, Types.AccountRecoveryCodeRecord> =
    _HashMap.HashMap<Text, Types.AccountRecoveryCodeRecord>(0, Text.equal, Text.hash);
  transient var activeRecoveryCodeByFromPrincipal : _HashMap.HashMap<Principal, Text> =
    _HashMap.HashMap<Principal, Text>(0, Principal.equal, Principal.hash);

  transient var studioPermissionDefaultsByCategory : _HashMap.HashMap<Text, Types.StudioPermissionMatrix> =
    _HashMap.HashMap<Text, Types.StudioPermissionMatrix>(0, Text.equal, Text.hash);

  transient var studioPermissionOverridesByPrincipal : _HashMap.HashMap<Principal, Types.StudioPermissionMatrix> =
    _HashMap.HashMap<Principal, Types.StudioPermissionMatrix>(0, Principal.equal, Principal.hash);

  transient var studioFeatureKeysActive : [Text] = [];

  transient var superStaffPrincipals : _HashMap.HashMap<Principal, Bool> =
    _HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);

  transient var accountContactByPrincipal : _HashMap.HashMap<Principal, Types.AccountContact> =
    _HashMap.HashMap<Principal, Types.AccountContact>(0, Principal.equal, Principal.hash);

  transient var artistMediaByArtistId : _HashMap.HashMap<Text, Types.ArtistMedia> =
    _HashMap.HashMap<Text, Types.ArtistMedia>(0, Text.equal, Text.hash);

  /// 8-digit access code → artist id (derived from `ArtistRecord.accessCode`; rebuilt on upgrade).
  transient var accessCodeToArtistId : _HashMap.HashMap<Text, Text> =
    _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);

  transient var emailCampaignsById : _HashMap.HashMap<Text, Types.EmailCampaignRecord> =
    _HashMap.HashMap<Text, Types.EmailCampaignRecord>(0, Text.equal, Text.hash);

  private let maxManualFeaturedStrip : Nat = 8;

  private func isEightDigitAccessCode(t : Text) : Bool {
    if (Text.size(t) != 8) {
      return false;
    };
    for (c in Text.toIter(t)) {
      if (not Char.isDigit(c)) {
        return false;
      };
    };
    true;
  };

  private func rebuildAccessCodeToArtistIdIndex() {
    accessCodeToArtistId := _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);
    for ((id, rec) in artistsById.entries()) {
      if (isEightDigitAccessCode(rec.accessCode)) {
        accessCodeToArtistId.put(rec.accessCode, id);
      };
    };
  };

  private func defaultJournalLayout() : [Types.JournalLayoutRow] {
    [
      { rowType = "event"; refId = ?"1"; selectionMode = null; artistId = null; sortOrder = 0; featured = false },
      { rowType = "journal-entry"; refId = ?"0"; selectionMode = null; artistId = null; sortOrder = 1; featured = false },
      { rowType = "quote"; refId = null; selectionMode = ?"random"; artistId = null; sortOrder = 2; featured = false },
      { rowType = "journal-entry"; refId = ?"1"; selectionMode = null; artistId = null; sortOrder = 3; featured = false },
      { rowType = "event"; refId = ?"2"; selectionMode = null; artistId = null; sortOrder = 4; featured = false },
      { rowType = "journal-entry"; refId = ?"2"; selectionMode = null; artistId = null; sortOrder = 5; featured = false },
      { rowType = "audio"; refId = null; selectionMode = ?"random"; artistId = null; sortOrder = 6; featured = false },
    ];
  };

  /// Load program payment ledger into transient map from stable (V2 preferred, else migrate V1/V0).
  private func reloadProgramPaymentLedgerFromStables() {
    if (programPaymentLedgerStableV2.size() > 0) {
      for (entry in programPaymentLedgerStableV2.vals()) {
        programPaymentLedgerById.put(entry.0, entry.1);
      };
    } else if (programPaymentLedgerStableV1.size() > 0) {
      for (entry in programPaymentLedgerStableV1.vals()) {
        programPaymentLedgerById.put(entry.0, Types.programPaymentLedgerFromV1(entry.1));
      };
    } else {
      for (entry in programPaymentLedgerStable.vals()) {
        programPaymentLedgerById.put(entry.0, Types.programPaymentLedgerFromV0(entry.1));
      };
    };
  };

  private func reloadProgramPaymentPlansFromStables() {
    if (programPaymentPlansStableV2.size() > 0) {
      for (entry in programPaymentPlansStableV2.vals()) {
        programPaymentPlansById.put(entry.0, entry.1);
      };
    } else {
      for (entry in programPaymentPlansStable.vals()) {
        programPaymentPlansById.put(entry.0, Types.programPaymentPlanFromV1(entry.1));
      };
    };
  };

  /// Load membership rows into the transient map (V2 preferred, else migrate pre-PayPal V0).
  private func reloadMembershipFromStables() {
    if (membershipByPrincipalStableV2.size() > 0) {
      for (entry in membershipByPrincipalStableV2.vals()) {
        membershipByPrincipal.put(entry.0, entry.1);
      };
    } else {
      for (entry in membershipByPrincipalStable.vals()) {
        membershipByPrincipal.put(entry.0, Types.membershipFieldsFromV0(entry.1));
      };
    };
  };

  /// Prefer `subscribersV1` (rows with `audiences`); otherwise migrate 5-field `subscribersStable` (legacy).
  private func reloadSubscribersFromStables() {
    subscribersByEmail := _HashMap.HashMap<Text, Types.Subscriber>(
      subscribersV1.size() + subscribersStable.size(),
      Text.equal,
      Text.hash
    );
    if (subscribersV1.size() > 0) {
      for (entry in subscribersV1.vals()) {
        let email = entry.0;
        let sub = entry.1;
        subscribersByEmail.put(email, sub);
      };
    } else {
      for (entry in subscribersStable.vals()) {
        let email = entry.0;
        let v0 = entry.1;
        subscribersByEmail.put(email, Types.subscriberFromV0(v0));
      };
    };
  };

  // Populate hashmaps on install / reload.
  reloadSubscribersFromStables();

  for (entry in accountsStable.vals()) {
    let p = entry.0;
    let acc = entry.1;
    accountsByPrincipal.put(p, acc);
  };

  reloadMembershipFromStables();
  for (entry in membershipTrialWindowStable.vals()) {
    membershipTrialWindowByPrincipal.put(entry.0, entry.1);
  };

  for (entry in membershipStripePeriodEndStable.vals()) {
    membershipStripePeriodEndByPrincipal.put(entry.0, entry.1);
  };

  for (entry in programPaymentSummariesStable.vals()) {
    programPaymentSummariesByKey.put(entry.0, entry.1);
  };
  reloadProgramPaymentLedgerFromStables();
  reloadProgramPaymentPlansFromStables();
  for (entry in programPaymentFlightPreferencesStable.vals()) {
    programPaymentFlightPreferencesByKey.put(entry.0, entry.1);
  };
  for (entry in financePromotionsStable.vals()) {
    financePromotionsById.put(entry.0, entry.1);
  };
  for (entry in programTeamMembersStable.vals()) {
    programTeamMembersById.put(entry.0, entry.1);
  };
  for (entry in programTeamOwedEntriesStable.vals()) {
    programTeamOwedEntriesById.put(entry.0, entry.1);
  };
  for (entry in programTeamPaidEntriesStable.vals()) {
    programTeamPaidEntriesById.put(entry.0, entry.1);
  };
  for (entry in programTeamPaidFundedByStable.vals()) {
    programTeamPaidFundedByById.put(entry.0, entry.1);
  };
  for (entry in membershipTierStable.vals()) {
    membershipTierByPrincipal.put(entry.0, entry.1);
  };
  for (entry in quarterlyAppCreditBalanceStable.vals()) {
    quarterlyAppCreditBalanceByPrincipal.put(entry.0, entry.1);
  };
  for (entry in quarterlyAppCreditLastAccruedStable.vals()) {
    quarterlyAppCreditLastAccruedByPrincipal.put(entry.0, entry.1);
  };

  for (entry in artistsStable.vals()) {
    let id = entry.0;
    let rec = entry.1;
    artistsById.put(id, rec);
    artistSlugToId.put(rec.profile.slug, id);
  };

  for (entry in artistFilterCohortYearsStable.vals()) {
    artistFilterCohortYearsById.put(entry.0, entry.1);
  };

  for (entry in artistHeroProfileImageStable.vals()) {
    artistHeroProfileImageById.put(entry.0, entry.1);
  };

  for (id in artistHeroProfileImageApprovedIdsStable.vals()) {
    artistHeroProfileImageApprovedById.put(id, true);
  };

  for (id in artistAudioApprovedIdsStable.vals()) {
    artistAudioApprovedById.put(id, true);
  };

  for (entry in programsStable.vals()) {
    programsById.put(entry.0, entry.1);
  };
  for (entry in journalsStable.vals()) {
    journalsById.put(entry.0, entry.1);
  };
  for (entry in editionsStable.vals()) {
    editionsById.put(entry.0, entry.1);
  };
  for (entry in contentPagesStable.vals()) {
    contentBySlug.put(entry.0, entry.1);
  };
  for (entry in communityVideosStable.vals()) {
    communityVideosById.put(entry.0, entry.1);
  };
  for (entry in applicantsStable.vals()) {
    applicantsById.put(entry.0, entry.1);
  };
  for (entry in archivedApplicantsStable.vals()) {
    archivedApplicantsById.put(entry.0, entry.1);
  };
  for (entry in applicantEmailOutreachStable.vals()) {
    applicantEmailOutreachById.put(entry.0, entry.1);
  };
  for (entry in siteSettingsStable.vals()) {
    siteSettingsByKey.put(entry.0, entry.1);
  };
  for (entry in applicationByArtistProgramStable.vals()) {
    applicationByArtistProgram.put(entry.0, entry.1);
  };
  for (entry in artistMostRecentProgramStable.vals()) {
    mostRecentProgramByArtistId.put(entry.0, entry.1);
  };

  for (id in artistFeaturedFeaturableIdsStable.vals()) {
    artistFeaturedFeaturableById.put(id, true);
  };
  for (id in artistFeaturedManualIdsStable.vals()) {
    manualFeaturedArtistIds.add(id);
  };

  for (entry in joinInvitesStable.vals()) {
    joinInvitesByCode.put(entry.0, entry.1);
  };
  for (entry in joinInviteTrialMonthsStable.vals()) {
    joinInviteTrialMonthsByCode.put(entry.0, entry.1);
  };
  for (entry in accountRecoveryCodesStable.vals()) {
    accountRecoveryCodesByCode.put(entry.0, entry.1);
    if (entry.1.active) {
      activeRecoveryCodeByFromPrincipal.put(entry.1.fromPrincipal, entry.0);
    };
  };
  for (entry in artistMediaStable.vals()) {
    artistMediaByArtistId.put(entry.0, entry.1);
  };
  for (entry in emailCampaignsStable.vals()) {
    emailCampaignsById.put(entry.0, entry.1);
  };

  /// Keep in sync with `adminPrincipals` defaults above — `postupgrade` appends any of these not already stored.
  private func defaultAdminPrincipals() : [Principal] {
    [
      Principal.fromText("6pq72-g2xdl-lae4k-3kadu-aksdn-qvebw-s23b6-4yhtg-wngft-3hvqb-xae"),
      Principal.fromText("7dhk2-asv4d-cqgdn-wknwc-hbfpj-yvi6l-zvepa-nn264-eh2io-gudsn-xqe"),
      Principal.fromText("fjqfj-67bb7-lyure-u2naw-63fbm-3xmn6-qluef-pqtd5-thj7z-ythn6-2ae"),
      Principal.fromText("5mnm6-7wh7d-imemq-z22vs-zgudw-szmvi-ake5j-o3q22-eodai-4sj4y-oqe"),
    ];
  };

  private func isAdminPrincipal(p : Principal) : Bool {
    for (a in adminPrincipals.vals()) {
      if (Principal.equal(a, p)) {
        return true;
      };
    };
    false;
  };

  private func assertAdmin(caller : Principal) {
    if (not isAdminPrincipal(caller)) {
      Debug.trap("Unauthorized: admin only");
    };
  };

  private func isStaffOrAdminCaller(caller : Principal) : Bool {
    if (isAdminPrincipal(caller)) {
      return true;
    };
    switch (accountsByPrincipal.get(caller)) {
      case (?acc) {
        if (acc.status == #active) {
          switch (acc.role) {
            case (#staff) { return true };
            case (#collaborator) { return true };
            case (#admin) { return true };
            case _ { false };
          };
        } else {
          false;
        };
      };
      case null { false };
    };
  };

  private func assertStaffOrAdmin(caller : Principal) {
    if (not isStaffOrAdminCaller(caller)) {
      Debug.trap("Unauthorized: staff or admin only");
    };
  };

  /// Sidebar / section ids aligned with Studio frontend (`STUDIO_NAV` + `dashboard`).
  private func defaultStudioFeatureKeys() : [Text] {
    [
      "dashboard",
      "home",
      "subscribers",
      "applicants",
      "schedule",
      "finance",
      "financePrograms",
      "financeUsers",
      "financeProducts",
      "financePromotions",
      "travel",
      "pending-approval",
      "artists",
      "programs",
      "products",
      "gallery-access",
      "journal",
      "sound",
      "content",
      "community",
      "email",
      "ai",
      "galleries",
      "collectors",
      "curators",
      "users",
      "services",
      "settings",
      "team",
    ];
  };

  private func isValidStudioFeatureKeyChar(c : Char) : Bool {
    let n = Char.toNat32(c);
    (n >= 97 and n <= 122)
    or (n >= 65 and n <= 90)
    or (n >= 48 and n <= 57)
    or c == '-';
  };

  private func isValidStudioFeatureKeyFormat(k : Text) : Bool {
    if (k.size() == 0) {
      return false;
    };
    for (c in k.chars()) {
      if (not isValidStudioFeatureKeyChar(c)) {
        return false;
      };
    };
    true;
  };

  private func mergeUniqueTextKeysSorted(existing : [Text], additions : [Text]) : [Text] {
    let m = _HashMap.HashMap<Text, Bool>(
      existing.size() + additions.size(),
      Text.equal,
      Text.hash,
    );
    for (k in existing.vals()) {
      m.put(k, true);
    };
    for (k in additions.vals()) {
      m.put(k, true);
    };
    let keys = _Iter.toArray(m.keys());
    Array.sort(keys, Text.compare);
  };

  private func reloadStudioFeatureKeysFromStable() {
    studioFeatureKeysActive := studioFeatureKeys;
  };

  /// Ensure every built-in key exists; preserves admin-added keys beyond defaults.
  private func ensureStudioFeatureKeysMergedWithDefaults() {
    studioFeatureKeysActive := mergeUniqueTextKeysSorted(
      studioFeatureKeysActive,
      defaultStudioFeatureKeys(),
    );
    studioFeatureKeys := studioFeatureKeysActive;
  };

  private func persistStudioFeatureKeysFromActive() {
    studioFeatureKeys := studioFeatureKeysActive;
  };

  private func defaultOpenStudioAccess() : Types.StudioFeatureAccess {
    { visible = true; canEdit = true };
  };

  private func isKnownStudioFeatureKey(k : Text) : Bool {
    for (x in studioFeatureKeysActive.vals()) {
      if (x == k) {
        return true;
      };
    };
    false;
  };

  private func isKnownPermissionCategory(c : Text) : Bool {
    c == "staff" or c == "curator" or c == "collector" or c == "artist" or c == "gallery" or c == "collaborator";
  };

  private func validateStudioPermissionMatrix(m : Types.StudioPermissionMatrix) {
    for (e in m.vals()) {
      if (not isKnownStudioFeatureKey(e.0)) {
        Debug.trap("Unknown studio feature key: " # e.0);
      };
    };
  };

  /// Drop keys the canister build does not recognize (forward-compatible saves from newer Studio UI).
  private func filterKnownStudioPermissionMatrix(m : Types.StudioPermissionMatrix) : Types.StudioPermissionMatrix {
    Array.filter<(Text, Types.StudioFeatureAccess)>(
      m,
      func(e : (Text, Types.StudioFeatureAccess)) : Bool {
        isKnownStudioFeatureKey(e.0);
      },
    );
  };

  /// Return access for `key` when present in `m`, else null (no implicit open default).
  private func accessInMatrixOpt(m : Types.StudioPermissionMatrix, key : Text) : ?Types.StudioFeatureAccess {
    for (e in m.vals()) {
      if (e.0 == key) {
        return ?e.1;
      };
    };
    null;
  };

  /// Apply `patch` entries onto `existing`; keys omitted from `patch` keep prior values.
  private func applyPermissionMatrixPatch(
    existing : Types.StudioPermissionMatrix,
    patch : Types.StudioPermissionMatrix,
  ) : Types.StudioPermissionMatrix {
    Array.map<Text, (Text, Types.StudioFeatureAccess)>(
      studioFeatureKeysActive,
      func(k : Text) : (Text, Types.StudioFeatureAccess) {
        switch (accessInMatrixOpt(patch, k)) {
          case (?acc) { (k, acc) };
          case null {
            switch (accessInMatrixOpt(existing, k)) {
              case (?acc) { (k, acc) };
              case null { (k, defaultOpenStudioAccess()) };
            };
          };
        };
      },
    );
  };

  private func fullOpenPermissionMatrix() : Types.StudioPermissionMatrix {
    Array.map<Text, (Text, Types.StudioFeatureAccess)>(
      studioFeatureKeysActive,
      func(k : Text) : (Text, Types.StudioFeatureAccess) {
        (k, defaultOpenStudioAccess());
      },
    );
  };

  private func allClosedPermissionMatrix() : Types.StudioPermissionMatrix {
    Array.map<Text, (Text, Types.StudioFeatureAccess)>(
      studioFeatureKeysActive,
      func(k : Text) : (Text, Types.StudioFeatureAccess) {
        (k, { visible = false; canEdit = false });
      },
    );
  };

  private func matrixAccess(m : Types.StudioPermissionMatrix, key : Text) : Types.StudioFeatureAccess {
    for (e in m.vals()) {
      if (e.0 == key) {
        return e.1;
      };
    };
    defaultOpenStudioAccess();
  };

  /// Fill every known feature key; missing stored entries use `defaultOpenStudioAccess()`.
  private func mergePermissionMatrixWithKnownKeys(stored : Types.StudioPermissionMatrix) : Types.StudioPermissionMatrix {
    Array.map<Text, (Text, Types.StudioFeatureAccess)>(
      studioFeatureKeysActive,
      func(k : Text) : (Text, Types.StudioFeatureAccess) {
        (k, matrixAccess(stored, k));
      },
    );
  };

  /// Per-principal override: explicit override wins; otherwise inherit merged role default.
  private func mergeOverrideOnRoleBase(
    roleBase : Types.StudioPermissionMatrix,
    overridePartial : Types.StudioPermissionMatrix,
  ) : Types.StudioPermissionMatrix {
    Array.map<Text, (Text, Types.StudioFeatureAccess)>(
      studioFeatureKeysActive,
      func(k : Text) : (Text, Types.StudioFeatureAccess) {
        for (e in overridePartial.vals()) {
          if (e.0 == k) {
            return (k, e.1);
          };
        };
        (k, matrixAccess(roleBase, k));
      },
    );
  };

  /// Upgrade path: ensure stored category defaults and overrides include all current keys.
  private func migrateStudioPermissionMatrices() {
    for ((cat, m) in studioPermissionDefaultsByCategory.entries()) {
      studioPermissionDefaultsByCategory.put(cat, mergePermissionMatrixWithKnownKeys(m));
    };
    for ((p, m) in studioPermissionOverridesByPrincipal.entries()) {
      studioPermissionOverridesByPrincipal.put(p, mergePermissionMatrixWithKnownKeys(m));
    };
  };

  private func roleToPermissionCategory(role : Types.UserRole) : Text {
    switch (role) {
      case (#staff) { "staff" };
      case (#admin) { "staff" };
      case (#curator) { "curator" };
      case (#collector) { "collector" };
      case (#artist) { "artist" };
      case (#gallery) { "gallery" };
      case (#collaborator) { "collaborator" };
    };
  };

  private func seedStudioPermissionDefaultsIfEmpty() {
    if (studioPermissionDefaultsByCategory.size() > 0) {
      return;
    };
    let m = fullOpenPermissionMatrix();
    let tabs = ["staff", "curator", "collector", "artist", "gallery", "collaborator"];
    for (t in tabs.vals()) {
      studioPermissionDefaultsByCategory.put(t, m);
    };
  };

  private func isSuperStaffPrincipal(p : Principal) : Bool {
    switch (superStaffPrincipals.get(p)) {
      case (?true) { true };
      case (_) { false };
    };
  };

  private func superStaffPrincipalsAsArray() : [Principal] {
    let pairs = _Iter.toArray(superStaffPrincipals.entries());
    Array.map<(Principal, Bool), Principal>(
      pairs,
      func((p, _) : (Principal, Bool)) : Principal { p },
    );
  };

  private func assertAdminOrSuperStaffConfigure(caller : Principal) {
    if (isAdminPrincipal(caller)) {
      return;
    };
    if (isSuperStaffPrincipal(caller)) {
      return;
    };
    Debug.trap("Unauthorized: admin or super staff only");
  };

  /// Rebuild permission-related transient maps from their stable snapshots (install / upgrade / import).
  private func reloadStudioPermissionTransientFromStable() {
    reloadStudioFeatureKeysFromStable();
    studioPermissionDefaultsByCategory := _HashMap.HashMap<Text, Types.StudioPermissionMatrix>(
      studioPermissionDefaultsStable.size(),
      Text.equal,
      Text.hash,
    );
    for (e in studioPermissionDefaultsStable.vals()) {
      studioPermissionDefaultsByCategory.put(e.0, e.1);
    };
    studioPermissionOverridesByPrincipal := _HashMap.HashMap<Principal, Types.StudioPermissionMatrix>(
      studioPermissionOverridesStable.size(),
      Principal.equal,
      Principal.hash,
    );
    for (e in studioPermissionOverridesStable.vals()) {
      studioPermissionOverridesByPrincipal.put(e.0, e.1);
    };
    superStaffPrincipals := _HashMap.HashMap<Principal, Bool>(
      superStaffPrincipalsStable.size(),
      Principal.equal,
      Principal.hash,
    );
    for (p in superStaffPrincipalsStable.vals()) {
      superStaffPrincipals.put(p, true);
    };
  };

  private func reloadAccountContactTransientFromStable() {
    accountContactByPrincipal := _HashMap.HashMap<Principal, Types.AccountContact>(
      accountContactStable.size(),
      Principal.equal,
      Principal.hash,
    );
    for (e in accountContactStable.vals()) {
      accountContactByPrincipal.put(e.0, e.1);
    };
  };

  /// On **install** only, after the stable→transient for-loops: reload permission/contact maps, seed defaults, index access codes.
  private func runInstallTransientReloadAndIndex() {
    reloadAccountContactTransientFromStable();
    reloadStudioPermissionTransientFromStable();
    ensureStudioFeatureKeysMergedWithDefaults();
    seedStudioPermissionDefaultsIfEmpty();
    rebuildAccessCodeToArtistIdIndex();
  };

  runInstallTransientReloadAndIndex();

  private func assertIntegrationCaller(caller : Principal) {
    switch (integrationServicePrincipal) {
      case null { Debug.trap("Integration service principal not configured") };
      case (?ip) {
        if (not Principal.equal(caller, ip)) {
          Debug.trap("Unauthorized: integration service only");
        };
      };
    };
  };

  private func featurableIdsSorted() : [Text] {
    let pairs = _Iter.toArray(artistFeaturedFeaturableById.entries());
    let keys = Array.map<(Text, Bool), Text>(pairs, func((k, _) : (Text, Bool)) : Text { k });
    Array.sort(keys, Text.compare);
  };

  private func approvedHeroProfileImageIdsSorted() : [Text] {
    let pairs = _Iter.toArray(artistHeroProfileImageApprovedById.entries());
    let keys = Array.map<(Text, Bool), Text>(pairs, func((k, _) : (Text, Bool)) : Text { k });
    Array.sort(keys, Text.compare);
  };

  private func approvedAudioIdsSorted() : [Text] {
    let pairs = _Iter.toArray(artistAudioApprovedById.entries());
    let keys = Array.map<(Text, Bool), Text>(pairs, func((k, _) : (Text, Bool)) : Text { k });
    Array.sort(keys, Text.compare);
  };

  private func heroProfileImageApprovedForArtist(artistId : Text) : Bool {
    switch (artistHeroProfileImageApprovedById.get(artistId)) {
      case (?true) { true };
      case _ { false };
    };
  };

  private func audioApprovedForArtist(artistId : Text) : Bool {
    switch (artistAudioApprovedById.get(artistId)) {
      case (?true) { true };
      case _ { false };
    };
  };

  private func setAudioApprovedForArtist(artistId : Text, approved : Bool) {
    if (approved) {
      artistAudioApprovedById.put(artistId, true);
    } else {
      ignore artistAudioApprovedById.remove(artistId);
    };
  };

  private let maxAudioEntries : Nat = 5;

  private func getAudioCollection(artistId : Text) : [Types.ArtistAudioEntry] {
    switch (artistAudioCollectionById.get(artistId)) {
      case (?entries) { entries };
      case null { [] };
    };
  };

  private func getAudioHighlight(artistId : Text) : Text {
    switch (artistAudioHighlightById.get(artistId)) {
      case (?url) { url };
      case null { "" };
    };
  };

  private func getApprovedAudioUrls(artistId : Text) : [Text] {
    switch (artistAudioApprovedUrlsById.get(artistId)) {
      case (?urls) { urls };
      case null { [] };
    };
  };

  private func isAudioUrlApproved(artistId : Text, url : Text) : Bool {
    let urls = getApprovedAudioUrls(artistId);
    for (u in urls.vals()) {
      if (u == url) return true;
    };
    false;
  };

  private func setAudioUrlApproved(artistId : Text, url : Text, approved : Bool) {
    let current = getApprovedAudioUrls(artistId);
    if (approved) {
      for (u in current.vals()) {
        if (u == url) return;
      };
      artistAudioApprovedUrlsById.put(artistId, Array.append(current, [url]));
    } else {
      let filtered = Array.filter<Text>(current, func(u : Text) : Bool { u != url });
      if (filtered.size() == 0) {
        ignore artistAudioApprovedUrlsById.remove(artistId);
      } else {
        artistAudioApprovedUrlsById.put(artistId, filtered);
      };
    };
    syncArtistLevelAudioApproval(artistId);
  };

  private func syncArtistLevelAudioApproval(artistId : Text) {
    let hl = getAudioHighlight(artistId);
    if (hl.size() > 0 and isAudioUrlApproved(artistId, hl)) {
      setAudioApprovedForArtist(artistId, true);
    } else {
      setAudioApprovedForArtist(artistId, false);
    };
  };

  private func syncHighlightToArtistMedia(artistId : Text) {
    let hl = getAudioHighlight(artistId);
    switch (artistMediaByArtistId.get(artistId)) {
      case (?media) {
        let updated : Types.ArtistMedia = {
          quote = media.quote;
          audioUrl = hl;
          audioTitle = media.audioTitle;
          updatedAt = media.updatedAt;
        };
        artistMediaByArtistId.put(artistId, updated);
      };
      case null {
        if (hl.size() > 0) {
          artistMediaByArtistId.put(artistId, {
            quote = "";
            audioUrl = hl;
            audioTitle = "";
            updatedAt = "";
          });
        };
      };
    };
    syncArtistLevelAudioApproval(artistId);
  };

  private func manualFeaturedIdsAsArray() : [Text] {
    Buffer.toArray(manualFeaturedArtistIds);
  };

  private func setManualFeaturedFromArray(ids : [Text]) {
    manualFeaturedArtistIds.clear();
    for (id in ids.vals()) {
      manualFeaturedArtistIds.add(id);
    };
  };

  private func removeManualFeaturedId(id : Text) {
    let arr = manualFeaturedIdsAsArray();
    let filtered = Array.filter<Text>(arr, func(x : Text) : Bool { x != id });
    setManualFeaturedFromArray(filtered);
  };

  private func indexOfManualFeatured(id : Text) : ?Nat {
    let arr = manualFeaturedIdsAsArray();
    var i : Nat = 0;
    for (x in arr.vals()) {
      if (x == id) {
        return ?i;
      };
      i += 1;
    };
    null;
  };

  private func cleanupFeaturedForDeletedArtist(artistId : Text) {
    ignore artistFeaturedFeaturableById.remove(artistId);
    removeManualFeaturedId(artistId);
  };

  private func defaultMembership() : Types.MembershipFields {
    {
      stripeCustomerId = null;
      stripeSubscriptionId = null;
      stripeSubscriptionStatus = null;
      paypalSubscriptionId = null;
      paypalSubscriptionStatus = null;
      paymentProvider = null;
      membershipExemptManual = false;
    };
  };

  private func paypalSubscriptionIsActive(status : ?Text) : Bool {
    switch (status) {
      case null { false };
      case (?s) {
        s == "ACTIVE" or s == "APPROVED";
      };
    };
  };

  private func mergeAccount(p : Principal) : ?Types.UserAccount {
    switch (accountsByPrincipal.get(p)) {
      case null { null };
      case (?core) {
        let m = switch (membershipByPrincipal.get(p)) {
          case null { defaultMembership() };
          case (?x) { x };
        };
        let periodEnd = switch (membershipStripePeriodEndByPrincipal.get(p)) {
          case null { null };
          case (?t) { ?t };
        };
        ?{
          role = core.role;
          status = core.status;
          linkedArtistId = core.linkedArtistId;
          linkedOrgId = core.linkedOrgId;
          updatedAt = core.updatedAt;
          stripeCustomerId = m.stripeCustomerId;
          stripeSubscriptionId = m.stripeSubscriptionId;
          stripeSubscriptionStatus = m.stripeSubscriptionStatus;
          paypalSubscriptionId = m.paypalSubscriptionId;
          paypalSubscriptionStatus = m.paypalSubscriptionStatus;
          paymentProvider = m.paymentProvider;
          stripeCurrentPeriodEnd = periodEnd;
          membershipExemptManual = m.membershipExemptManual;
          trialStartedAtSec = switch (membershipTrialWindowByPrincipal.get(p)) { case null { null }; case (?w) { ?w.startedAtSec } };
          trialEndsAtSec = switch (membershipTrialWindowByPrincipal.get(p)) { case null { null }; case (?w) { ?w.endsAtSec } };
        };
      };
    };
  };

  private func putUserAccountParts(core : Types.UserAccountCore, m : Types.MembershipFields, p : Principal) {
    accountsByPrincipal.put(p, core);
    membershipByPrincipal.put(p, m);
  };

  /// Keep digits only (allows pasted codes with spaces or separators).
  private func normalizeJoinAccessCode(t : Text) : Text {
    var out = "";
    for (c in Text.toIter(t)) {
      if (Char.isDigit(c)) {
        out := out # Char.toText(c);
      };
    };
    out;
  };

  private func digitCharSmall(d : Nat) : Text {
    switch (Nat.rem(d, 10)) {
      case 0 { "0" };
      case 1 { "1" };
      case 2 { "2" };
      case 3 { "3" };
      case 4 { "4" };
      case 5 { "5" };
      case 6 { "6" };
      case 7 { "7" };
      case 8 { "8" };
      case _ { "9" };
    };
  };

  private func eightDigitCodeFromNat(seed : Nat) : Text {
    var x = Nat.rem(seed, 100_000_000);
    var s = "";
    var divisor : Nat = 10_000_000;
    var i = 0;
    while (i < 8) {
      let digit = Nat.div(x, divisor);
      s := s # digitCharSmall(digit);
      x := Nat.rem(x, divisor);
      if (divisor > 1) {
        divisor := Nat.div(divisor, 10);
      };
      i += 1;
    };
    s;
  };

  private func randomEightDigitCandidate(salt : Nat) : Text {
    let base : Nat = Int.abs(Time.now());
    eightDigitCodeFromNat(
      base +
      (salt * 104_729) +
      (joinInvitesByCode.size() * 9_973) +
      (accessCodeToArtistId.size() * 7_919)
    );
  };

  private func isJoinInviteCodeTaken(code : Text) : Bool {
    switch (joinInvitesByCode.get(code)) {
      case (?_) { true };
      case null {
        switch (accessCodeToArtistId.get(code)) {
          case (?_) { true };
          case null {
            switch (accountRecoveryCodesByCode.get(code)) {
              case (?_) { true };
              case null { false };
            };
          };
        };
      };
    };
  };

  private let accountRecoveryDurationSec : Nat = 7 * 86_400;

  private func invalidateActiveRecoveryCodeForPrincipal(fromP : Principal) {
    switch (activeRecoveryCodeByFromPrincipal.get(fromP)) {
      case null {};
      case (?code) {
        switch (accountRecoveryCodesByCode.get(code)) {
          case null {};
          case (?rec) {
            accountRecoveryCodesByCode.put(code, { rec with active = false });
          };
        };
        ignore activeRecoveryCodeByFromPrincipal.remove(fromP);
      };
    };
  };

  private func rebuildActiveRecoveryCodeIndex() {
    activeRecoveryCodeByFromPrincipal := _HashMap.HashMap<Principal, Text>(
      0,
      Principal.equal,
      Principal.hash,
    );
    for ((code, rec) in accountRecoveryCodesByCode.entries()) {
      if (rec.active) {
        activeRecoveryCodeByFromPrincipal.put(rec.fromPrincipal, code);
      };
    };
  };

  private func principalAlreadyLinkedToArtist(aid : Text) : Bool {
    for ((_, core) in accountsByPrincipal.entries()) {
      switch (core.linkedArtistId) {
        case (?x) {
          if (x == aid) {
            return true;
          };
        };
        case null {};
      };
    };
    false;
  };

  private func roleAllowedForJoinInvite(r : Types.UserRole) : Bool {
    switch (r) {
      case (#artist) { true };
      case (#gallery) { true };
      case (#curator) { true };
      case (#collector) { true };
      case (#staff) { true };
      case (#collaborator) { true };
      case (#admin) { false };
    };
  };

  private func putStripePeriodEndForPrincipal(p : Principal, t : ?Text) {
    switch (t) {
      case null { ignore membershipStripePeriodEndByPrincipal.remove(p) };
      case (?s) { membershipStripePeriodEndByPrincipal.put(p, s) };
    };
  };

  private func putUserAccountFull(p : Principal, u : Types.UserAccount) {
    let core : Types.UserAccountCore = {
      role = u.role;
      status = u.status;
      linkedArtistId = u.linkedArtistId;
      linkedOrgId = u.linkedOrgId;
      updatedAt = u.updatedAt;
    };
    let m : Types.MembershipFields = {
      stripeCustomerId = u.stripeCustomerId;
      stripeSubscriptionId = u.stripeSubscriptionId;
      stripeSubscriptionStatus = u.stripeSubscriptionStatus;
      paypalSubscriptionId = u.paypalSubscriptionId;
      paypalSubscriptionStatus = u.paypalSubscriptionStatus;
      paymentProvider = u.paymentProvider;
      membershipExemptManual = u.membershipExemptManual;
    };
    putUserAccountParts(core, m, p);
    putStripePeriodEndForPrincipal(p, u.stripeCurrentPeriodEnd);
    switch (u.trialEndsAtSec) {
      case null {
        ignore membershipTrialWindowByPrincipal.remove(p);
      };
      case (?ends) {
        let started = switch (u.trialStartedAtSec) {
          case null { nowSec() };
          case (?s) { s };
        };
        membershipTrialWindowByPrincipal.put(p, { startedAtSec = started; endsAtSec = ends });
      };
    };
  };

  private let trialDurationSecPerMonth : Nat = 30 * 24 * 60 * 60;

  private func nowSec() : Nat {
    Int.abs(Time.now() / 1_000_000_000);
  };

  private func nowText() : Text {
    Int.toText(Time.now());
  };

  private func trialIsActive(p : Principal) : Bool {
    switch (membershipTrialWindowByPrincipal.get(p)) {
      case null { false };
      case (?w) { nowSec() <= w.endsAtSec };
    };
  };

  /// Program application exists for this artist and program `studioStatus` is active or completed.
  private func isAutoVeteranArtist(aid : Text) : Bool {
    let prefix = aid # "|";
    for ((k, _) in applicationByArtistProgram.entries()) {
      if (Text.startsWith(k, #text prefix)) {
        switch (Text.stripStart(k, #text prefix)) {
          case (?pid) {
            switch (programsById.get(pid)) {
              case (?pr) {
                let st = pr.studioStatus;
                if (st == "active" or st == "completed") {
                  return true;
                };
              };
              case null {};
            };
          };
          case null {};
        };
      };
    };
    false;
  };

  private let anonPrincipal : Principal = Principal.fromText("2vxsx-fae");

  /// `null` = unrestricted (canister admin or super staff).
  private func effectiveStudioMatrixForCaller(caller : Principal) : ?Types.StudioPermissionMatrix {
    if (isAdminPrincipal(caller)) {
      return null;
    };
    if (isSuperStaffPrincipal(caller)) {
      return null;
    };
    if (Principal.equal(caller, anonPrincipal)) {
      return ?fullOpenPermissionMatrix();
    };
    switch (accountsByPrincipal.get(caller)) {
      case null { ?fullOpenPermissionMatrix() };
      case (?acc) {
        if (acc.status != #active) {
          return ?allClosedPermissionMatrix();
        };
        if (not isStaffOrAdminCaller(caller)) {
          return ?allClosedPermissionMatrix();
        };
        let cat = roleToPermissionCategory(acc.role);
        let baseRaw = switch (studioPermissionDefaultsByCategory.get(cat)) {
          case (?m) { m };
          case null { fullOpenPermissionMatrix() };
        };
        let base = mergePermissionMatrixWithKnownKeys(baseRaw);
        switch (studioPermissionOverridesByPrincipal.get(caller)) {
          case (?o) { ?mergeOverrideOnRoleBase(base, o) };
          case null { ?base };
        };
      };
    };
  };

  private func assertStudioFeatureVisible(caller : Principal, featureKey : Text) {
    if (isAdminPrincipal(caller) or isSuperStaffPrincipal(caller)) {
      return;
    };
    switch (effectiveStudioMatrixForCaller(caller)) {
      case null { return };
      case (?m) {
        let a = matrixAccess(m, featureKey);
        if (not a.visible) {
          Debug.trap("Studio feature not visible: " # featureKey);
        };
      };
    };
  };

  private func assertStudioFeatureVisibleEither(caller : Principal, k1 : Text, k2 : Text) {
    if (isAdminPrincipal(caller) or isSuperStaffPrincipal(caller)) {
      return;
    };
    switch (effectiveStudioMatrixForCaller(caller)) {
      case null { return };
      case (?m) {
        let a1 = matrixAccess(m, k1);
        let a2 = matrixAccess(m, k2);
        if (not a1.visible and not a2.visible) {
          Debug.trap("Studio feature not visible: " # k1 # " or " # k2);
        };
      };
    };
  };

  private func assertStudioFeatureEdit(caller : Principal, featureKey : Text) {
    if (isAdminPrincipal(caller) or isSuperStaffPrincipal(caller)) {
      return;
    };
    switch (effectiveStudioMatrixForCaller(caller)) {
      case null { return };
      case (?m) {
        let a = matrixAccess(m, featureKey);
        if (not a.canEdit) {
          Debug.trap("Studio feature not editable: " # featureKey);
        };
      };
    };
  };

  private func assertStudioFeatureEditEither(caller : Principal, k1 : Text, k2 : Text) {
    if (isAdminPrincipal(caller) or isSuperStaffPrincipal(caller)) {
      return;
    };
    switch (effectiveStudioMatrixForCaller(caller)) {
      case null { return };
      case (?m) {
        let a1 = matrixAccess(m, k1);
        let a2 = matrixAccess(m, k2);
        if (not a1.canEdit and not a2.canEdit) {
          Debug.trap("Studio feature not editable: " # k1 # " or " # k2);
        };
      };
    };
  };

  /// Same rules as `getMembershipAccessForCaller` (billing gate + veteran exemptions).
  private func membershipAccessForPrincipal(p : Principal) : Types.MembershipAccessResult {
    if (isAdminPrincipal(p)) {
      return #exempt;
    };
    switch (accountsByPrincipal.get(p)) {
      case null { return #noAccount };
      case (?core) {
        switch (core.role) {
          case (#admin) { return #exempt };
          case (#staff) { return #exempt };
          case (#collaborator) { return #exempt };
          case _ {};
        };
        let m = switch (membershipByPrincipal.get(p)) {
          case null { defaultMembership() };
          case (?x) { x };
        };
        if (m.membershipExemptManual) {
          return #exempt;
        };
        switch (core.linkedArtistId) {
          case (?aid) {
            if (isAutoVeteranArtist(aid)) {
              return #exempt;
            };
          };
          case null {};
        };
        let st = switch (m.stripeSubscriptionStatus) {
          case null { "" };
          case (?s) { s };
        };
        if (trialIsActive(p)) {
          return #ok;
        };
        if (st == "active" or st == "trialing") {
          return #ok;
        };
        if (paypalSubscriptionIsActive(m.paypalSubscriptionStatus)) {
          return #ok;
        };
        return #needsSubscription;
      };
    };
  };

  private func roleIsPrivileged(r : Types.UserRole) : Bool {
    switch (r) {
      case (#staff) { true };
      case (#admin) { true };
      case (#collaborator) { true };
      case _ { false };
    };
  };

  /// One-time bootstrap: if no admins exist, the caller becomes the first admin. Returns true if it did.
  public shared (msg) func bootstrapAdminIfEmpty() : async Bool {
    if (adminPrincipals.size() > 0) {
      return false;
    };
    adminPrincipals := [msg.caller];
    let now = nowText();
    let core : Types.UserAccountCore = {
      role = #admin;
      status = #active;
      linkedArtistId = null;
      linkedOrgId = null;
      updatedAt = now;
    };
    putUserAccountParts(core, defaultMembership(), msg.caller);
    return true;
  };

  public query func isAdmin(principal : Principal) : async Bool {
    isAdminPrincipal(principal);
  };

  public shared query (msg) func isCallerAdmin() : async Bool {
    isAdminPrincipal(msg.caller);
  };

  public shared query (msg) func isCallerSuperStaff() : async Bool {
    isSuperStaffPrincipal(msg.caller);
  };

  /// `null` = full access (canister admin or super staff). Otherwise effective matrix for Studio shell + asserts.
  public shared query (msg) func getStudioPermissionsForCaller() : async ?Types.StudioPermissionMatrix {
    effectiveStudioMatrixForCaller(msg.caller);
  };

  /// Studio UI: feature ids this canister accepts in permission matrices.
  public query func listStudioPermissionFeatureKeys() : async [Text] {
    studioFeatureKeysActive;
  };

  /// Admin: append permission feature keys at runtime (lowercase, camelCase, digits, hyphen).
  public shared (msg) func adminAddStudioPermissionFeatureKeys(keys : [Text]) : async [Text] {
    assertAdminOrSuperStaffConfigure(msg.caller);
    for (k in keys.vals()) {
      if (not isValidStudioFeatureKeyFormat(k)) {
        Debug.trap("Invalid studio feature key format: " # k);
      };
    };
    studioFeatureKeysActive := mergeUniqueTextKeysSorted(studioFeatureKeysActive, keys);
    persistStudioFeatureKeysFromActive();
    migrateStudioPermissionMatrices();
    studioFeatureKeysActive;
  };

  /// Admin: merge built-in default keys into the runtime list (safe after wasm upgrades).
  public shared (msg) func adminMergeDefaultStudioPermissionFeatureKeys() : async [Text] {
    assertAdminOrSuperStaffConfigure(msg.caller);
    ensureStudioFeatureKeysMergedWithDefaults();
    migrateStudioPermissionMatrices();
    studioFeatureKeysActive;
  };

  public shared query (msg) func adminGetStudioPermissionDefaults(category : Text) : async Types.StudioPermissionMatrix {
    assertAdminOrSuperStaffConfigure(msg.caller);
    if (not isKnownPermissionCategory(category)) {
      Debug.trap("Unknown permission category");
    };
    switch (studioPermissionDefaultsByCategory.get(category)) {
      case (?m) { mergePermissionMatrixWithKnownKeys(m) };
      case null { fullOpenPermissionMatrix() };
    };
  };

  public shared (msg) func adminSetStudioPermissionDefaults(category : Text, matrix : Types.StudioPermissionMatrix) : async () {
    assertAdminOrSuperStaffConfigure(msg.caller);
    if (not isKnownPermissionCategory(category)) {
      Debug.trap("Unknown permission category");
    };
    validateStudioPermissionMatrix(filterKnownStudioPermissionMatrix(matrix));
    let filtered = filterKnownStudioPermissionMatrix(matrix);
    let existing = switch (studioPermissionDefaultsByCategory.get(category)) {
      case (?m) { m };
      case null { [] };
    };
    studioPermissionDefaultsByCategory.put(
      category,
      mergePermissionMatrixWithKnownKeys(applyPermissionMatrixPatch(existing, filtered)),
    );
  };

  public shared query (msg) func adminGetStudioPermissionOverride(p : Principal) : async ?Types.StudioPermissionMatrix {
    assertAdminOrSuperStaffConfigure(msg.caller);
    studioPermissionOverridesByPrincipal.get(p);
  };

  public shared (msg) func adminSetStudioPermissionOverride(p : Principal, matrix : Types.StudioPermissionMatrix) : async () {
    assertAdminOrSuperStaffConfigure(msg.caller);
    validateStudioPermissionMatrix(filterKnownStudioPermissionMatrix(matrix));
    let filtered = filterKnownStudioPermissionMatrix(matrix);
    let existing = switch (studioPermissionOverridesByPrincipal.get(p)) {
      case (?m) { m };
      case null { [] };
    };
    studioPermissionOverridesByPrincipal.put(
      p,
      mergePermissionMatrixWithKnownKeys(applyPermissionMatrixPatch(existing, filtered)),
    );
  };

  public shared (msg) func adminClearStudioPermissionOverride(p : Principal) : async () {
    assertAdminOrSuperStaffConfigure(msg.caller);
    ignore studioPermissionOverridesByPrincipal.remove(p);
  };

  public shared query (msg) func adminListSuperStaff() : async [Principal] {
    assertAdmin(msg.caller);
    superStaffPrincipalsAsArray();
  };

  public shared (msg) func adminAddSuperStaff(p : Principal) : async () {
    assertAdmin(msg.caller);
    superStaffPrincipals.put(p, true);
  };

  public shared (msg) func adminRemoveSuperStaff(p : Principal) : async () {
    assertAdmin(msg.caller);
    ignore superStaffPrincipals.remove(p);
  };

  public shared (msg) func addAdmin(newAdmin : Principal) : async () {
    assertAdmin(msg.caller);
    if (isAdminPrincipal(newAdmin)) {
      return;
    };
    adminPrincipals := Array.append(adminPrincipals, [newAdmin]);
  };

  /// Admin-only: full allowlist of admin principals (same source as `isCallerAdmin`).
  public shared query (msg) func listAdmins() : async [Principal] {
    assertAdmin(msg.caller);
    adminPrincipals;
  };

  public query func greet(name : Text) : async Text {
    return "Hello, " # name # "!";
  };

  system func preupgrade() {
    subscribersV1 := _Iter.toArray(subscribersByEmail.entries());
    subscribersStable := [];
    accountsStable := _Iter.toArray(accountsByPrincipal.entries());
    membershipByPrincipalStableV2 := _Iter.toArray(membershipByPrincipal.entries());
    membershipByPrincipalStable := [];
    membershipTrialWindowStable := _Iter.toArray(membershipTrialWindowByPrincipal.entries());
    membershipStripePeriodEndStable := _Iter.toArray(membershipStripePeriodEndByPrincipal.entries());
    artistsStable := _Iter.toArray(artistsById.entries());
    programsStable := _Iter.toArray(programsById.entries());
    journalsStable := _Iter.toArray(journalsById.entries());
    editionsStable := _Iter.toArray(editionsById.entries());
    contentPagesStable := _Iter.toArray(contentBySlug.entries());
    communityVideosStable := _Iter.toArray(communityVideosById.entries());
    applicantsStable := _Iter.toArray(applicantsById.entries());
    archivedApplicantsStable := _Iter.toArray(archivedApplicantsById.entries());
    programPaymentSummariesStable := _Iter.toArray(programPaymentSummariesByKey.entries());
    programPaymentLedgerStableV2 := _Iter.toArray(programPaymentLedgerById.entries());
    programPaymentLedgerStableV1 := [];
    financePromotionsStable := _Iter.toArray(financePromotionsById.entries());
    programTeamMembersStable := _Iter.toArray(programTeamMembersById.entries());
    programTeamOwedEntriesStable := _Iter.toArray(programTeamOwedEntriesById.entries());
    programTeamPaidEntriesStable := _Iter.toArray(programTeamPaidEntriesById.entries());
    programTeamPaidFundedByStable := _Iter.toArray(programTeamPaidFundedByById.entries());
    membershipTierStable := _Iter.toArray(membershipTierByPrincipal.entries());
    quarterlyAppCreditBalanceStable := _Iter.toArray(quarterlyAppCreditBalanceByPrincipal.entries());
    quarterlyAppCreditLastAccruedStable := _Iter.toArray(quarterlyAppCreditLastAccruedByPrincipal.entries());
    programPaymentLedgerStable := [];
    programPaymentPlansStableV2 := _Iter.toArray(programPaymentPlansById.entries());
    programPaymentPlansStable := [];
    programPaymentFlightPreferencesStable := _Iter.toArray(programPaymentFlightPreferencesByKey.entries());
    siteSettingsStable := _Iter.toArray(siteSettingsByKey.entries());
    applicationByArtistProgramStable := _Iter.toArray(applicationByArtistProgram.entries());
    artistMostRecentProgramStable := _Iter.toArray(mostRecentProgramByArtistId.entries());
    artistFilterCohortYearsStable := _Iter.toArray(artistFilterCohortYearsById.entries());
    artistFeaturedFeaturableIdsStable := featurableIdsSorted();
    artistFeaturedManualIdsStable := Buffer.toArray(manualFeaturedArtistIds);
    joinInvitesStable := _Iter.toArray(joinInvitesByCode.entries());
    joinInviteTrialMonthsStable := _Iter.toArray(joinInviteTrialMonthsByCode.entries());
    accountRecoveryCodesStable := _Iter.toArray(accountRecoveryCodesByCode.entries());
    artistMediaStable := _Iter.toArray(artistMediaByArtistId.entries());
    studioPermissionDefaultsStable := _Iter.toArray(studioPermissionDefaultsByCategory.entries());
    studioPermissionOverridesStable := _Iter.toArray(studioPermissionOverridesByPrincipal.entries());
    studioFeatureKeys := studioFeatureKeysActive;
    superStaffPrincipalsStable := superStaffPrincipalsAsArray();
    accountContactStable := _Iter.toArray(accountContactByPrincipal.entries());
    artistHeroProfileImageStable := _Iter.toArray(artistHeroProfileImageById.entries());
    artistHeroProfileImageApprovedIdsStable := approvedHeroProfileImageIdsSorted();
    artistAudioApprovedIdsStable := approvedAudioIdsSorted();
    artistAudioCollectionStable := _Iter.toArray(artistAudioCollectionById.entries());
    artistAudioHighlightStable := _Iter.toArray(artistAudioHighlightById.entries());
    artistAudioApprovedUrlsStable := _Iter.toArray(artistAudioApprovedUrlsById.entries());
    heroProfileImageReviewNotesStable := _Iter.toArray(heroProfileImageReviewNotesById.entries());
    audioEntryReviewNotesStable := _Iter.toArray(audioEntryReviewNotesByKey.entries());
    emailCampaignsStable := _Iter.toArray(emailCampaignsById.entries());
    applicantEmailOutreachStable := _Iter.toArray(applicantEmailOutreachById.entries());
  };

  system func postupgrade() {
    reloadSubscribersFromStables();
    subscribersV1 := [];
    subscribersStable := [];

    emailCampaignsById := _HashMap.HashMap<Text, Types.EmailCampaignRecord>(
      emailCampaignsStable.size(),
      Text.equal,
      Text.hash
    );
    for (entry in emailCampaignsStable.vals()) {
      emailCampaignsById.put(entry.0, entry.1);
    };
    emailCampaignsStable := [];
    var maxEmailId : Nat = nextEmailCampaignId;
    for (entry in emailCampaignsById.entries()) {
      let e = entry.0;
      switch (Nat.fromText(e)) {
        case (?(n)) { if (n > maxEmailId) { maxEmailId := n } };
        case null { };
      };
    };
    nextEmailCampaignId := maxEmailId;

    accountsByPrincipal := _HashMap.HashMap<Principal, Types.UserAccountCore>(
      accountsStable.size(),
      Principal.equal,
      Principal.hash
    );
    for (entry in accountsStable.vals()) {
      accountsByPrincipal.put(entry.0, entry.1);
    };
    accountsStable := [];

    membershipByPrincipal := _HashMap.HashMap<Principal, Types.MembershipFields>(
      membershipByPrincipalStable.size() + membershipByPrincipalStableV2.size(),
      Principal.equal,
      Principal.hash
    );
    reloadMembershipFromStables();
    membershipByPrincipalStable := [];
    membershipByPrincipalStableV2 := [];

    membershipTrialWindowByPrincipal := _HashMap.HashMap<Principal, Types.TrialMembershipWindow>(
      membershipTrialWindowStable.size(),
      Principal.equal,
      Principal.hash
    );
    for (entry in membershipTrialWindowStable.vals()) {
      membershipTrialWindowByPrincipal.put(entry.0, entry.1);
    };
    membershipTrialWindowStable := [];

    membershipStripePeriodEndByPrincipal := _HashMap.HashMap<Principal, Text>(
      membershipStripePeriodEndStable.size(),
      Principal.equal,
      Principal.hash
    );
    for (entry in membershipStripePeriodEndStable.vals()) {
      membershipStripePeriodEndByPrincipal.put(entry.0, entry.1);
    };
    membershipStripePeriodEndStable := [];

    artistsById := _HashMap.HashMap<Text, Types.ArtistRecord>(
      artistsStable.size(),
      Text.equal,
      Text.hash
    );
    artistSlugToId := _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);
    for (entry in artistsStable.vals()) {
      let id = entry.0;
      let rec = entry.1;
      artistsById.put(id, rec);
      artistSlugToId.put(rec.profile.slug, id);
    };
    artistsStable := [];

    joinInvitesByCode := _HashMap.HashMap<Text, Types.JoinInviteRecord>(
      joinInvitesStable.size(),
      Text.equal,
      Text.hash,
    );
    for (entry in joinInvitesStable.vals()) {
      joinInvitesByCode.put(entry.0, entry.1);
    };
    joinInvitesStable := [];

    joinInviteTrialMonthsByCode := _HashMap.HashMap<Text, Nat>(
      joinInviteTrialMonthsStable.size(),
      Text.equal,
      Text.hash,
    );
    for (entry in joinInviteTrialMonthsStable.vals()) {
      joinInviteTrialMonthsByCode.put(entry.0, entry.1);
    };
    joinInviteTrialMonthsStable := [];

    accountRecoveryCodesByCode := _HashMap.HashMap<Text, Types.AccountRecoveryCodeRecord>(
      accountRecoveryCodesStable.size(),
      Text.equal,
      Text.hash,
    );
    for (entry in accountRecoveryCodesStable.vals()) {
      accountRecoveryCodesByCode.put(entry.0, entry.1);
    };
    accountRecoveryCodesStable := [];
    rebuildActiveRecoveryCodeIndex();

    artistMediaByArtistId := _HashMap.HashMap<Text, Types.ArtistMedia>(
      artistMediaStable.size(),
      Text.equal,
      Text.hash,
    );
    for (entry in artistMediaStable.vals()) {
      artistMediaByArtistId.put(entry.0, entry.1);
    };
    artistMediaStable := [];

    rebuildAccessCodeToArtistIdIndex();

    artistFilterCohortYearsById := _HashMap.HashMap<Text, [Nat]>(
      artistFilterCohortYearsStable.size(),
      Text.equal,
      Text.hash
    );
    for (entry in artistFilterCohortYearsStable.vals()) {
      artistFilterCohortYearsById.put(entry.0, entry.1);
    };
    artistFilterCohortYearsStable := [];

    artistHeroProfileImageById := _HashMap.HashMap<Text, Text>(
      artistHeroProfileImageStable.size(),
      Text.equal,
      Text.hash
    );
    for (entry in artistHeroProfileImageStable.vals()) {
      artistHeroProfileImageById.put(entry.0, entry.1);
    };
    artistHeroProfileImageStable := [];

    artistHeroProfileImageApprovedById := _HashMap.HashMap<Text, Bool>(0, Text.equal, Text.hash);
    for (id in artistHeroProfileImageApprovedIdsStable.vals()) {
      artistHeroProfileImageApprovedById.put(id, true);
    };
    artistHeroProfileImageApprovedIdsStable := [];

    artistAudioApprovedById := _HashMap.HashMap<Text, Bool>(0, Text.equal, Text.hash);
    for (id in artistAudioApprovedIdsStable.vals()) {
      artistAudioApprovedById.put(id, true);
    };
    artistAudioApprovedIdsStable := [];

    artistAudioCollectionById := _HashMap.HashMap<Text, [Types.ArtistAudioEntry]>(
      artistAudioCollectionStable.size(), Text.equal, Text.hash
    );
    for (entry in artistAudioCollectionStable.vals()) {
      artistAudioCollectionById.put(entry.0, entry.1);
    };
    artistAudioCollectionStable := [];

    artistAudioHighlightById := _HashMap.HashMap<Text, Text>(
      artistAudioHighlightStable.size(), Text.equal, Text.hash
    );
    for (entry in artistAudioHighlightStable.vals()) {
      artistAudioHighlightById.put(entry.0, entry.1);
    };
    artistAudioHighlightStable := [];

    artistAudioApprovedUrlsById := _HashMap.HashMap<Text, [Text]>(
      artistAudioApprovedUrlsStable.size(), Text.equal, Text.hash
    );
    for (entry in artistAudioApprovedUrlsStable.vals()) {
      artistAudioApprovedUrlsById.put(entry.0, entry.1);
    };
    artistAudioApprovedUrlsStable := [];

    heroProfileImageReviewNotesById := _HashMap.HashMap<Text, Types.AssetReviewNote>(
      heroProfileImageReviewNotesStable.size(), Text.equal, Text.hash
    );
    for (entry in heroProfileImageReviewNotesStable.vals()) {
      heroProfileImageReviewNotesById.put(entry.0, entry.1);
    };
    heroProfileImageReviewNotesStable := [];

    audioEntryReviewNotesByKey := _HashMap.HashMap<Text, Types.AssetReviewNote>(
      audioEntryReviewNotesStable.size(), Text.equal, Text.hash
    );
    for (entry in audioEntryReviewNotesStable.vals()) {
      audioEntryReviewNotesByKey.put(entry.0, entry.1);
    };
    audioEntryReviewNotesStable := [];

    programsById := _HashMap.HashMap<Text, Types.ProgramRecord>(0, Text.equal, Text.hash);
    for (entry in programsStable.vals()) {
      programsById.put(entry.0, entry.1);
    };
    programsStable := [];

    journalsById := _HashMap.HashMap<Text, Types.JournalRecord>(0, Text.equal, Text.hash);
    for (entry in journalsStable.vals()) {
      journalsById.put(entry.0, entry.1);
    };
    journalsStable := [];

    editionsById := _HashMap.HashMap<Text, Types.EditionRecord>(0, Text.equal, Text.hash);
    for (entry in editionsStable.vals()) {
      editionsById.put(entry.0, entry.1);
    };
    editionsStable := [];

    contentBySlug := _HashMap.HashMap<Text, Types.ContentPageRecord>(0, Text.equal, Text.hash);
    for (entry in contentPagesStable.vals()) {
      contentBySlug.put(entry.0, entry.1);
    };
    contentPagesStable := [];

    communityVideosById := _HashMap.HashMap<Text, Types.CommunityVideoRecord>(
      communityVideosStable.size(),
      Text.equal,
      Text.hash
    );
    for (entry in communityVideosStable.vals()) {
      communityVideosById.put(entry.0, entry.1);
    };
    communityVideosStable := [];

    applicantsById := _HashMap.HashMap<Text, Types.ApplicantRecord>(0, Text.equal, Text.hash);
    for (entry in applicantsStable.vals()) {
      applicantsById.put(entry.0, entry.1);
    };
    applicantsStable := [];

    archivedApplicantsById := _HashMap.HashMap<Text, Types.ApplicantRecord>(0, Text.equal, Text.hash);
    for (entry in archivedApplicantsStable.vals()) {
      archivedApplicantsById.put(entry.0, entry.1);
    };
    archivedApplicantsStable := [];

    applicantEmailOutreachById := _HashMap.HashMap<Text, Text>(
      applicantEmailOutreachStable.size(),
      Text.equal,
      Text.hash
    );
    for (entry in applicantEmailOutreachStable.vals()) {
      applicantEmailOutreachById.put(entry.0, entry.1);
    };
    applicantEmailOutreachStable := [];

    programPaymentSummariesByKey := _HashMap.HashMap<Text, Types.ProgramPaymentSummary>(0, Text.equal, Text.hash);
    for (entry in programPaymentSummariesStable.vals()) {
      programPaymentSummariesByKey.put(entry.0, entry.1);
    };
    programPaymentSummariesStable := [];

    programPaymentLedgerById := _HashMap.HashMap<Text, Types.ProgramPaymentLedgerRow>(0, Text.equal, Text.hash);
    reloadProgramPaymentLedgerFromStables();
    programPaymentLedgerStable := [];
    programPaymentLedgerStableV1 := [];
    programPaymentLedgerStableV2 := [];

    financePromotionsById := _HashMap.HashMap<Text, Types.FinancePromotion>(
      financePromotionsStable.size(),
      Text.equal,
      Text.hash,
    );
    for (entry in financePromotionsStable.vals()) {
      financePromotionsById.put(entry.0, entry.1);
    };
    financePromotionsStable := [];

    programTeamMembersById := _HashMap.HashMap<Text, Types.ProgramTeamMember>(
      programTeamMembersStable.size(),
      Text.equal,
      Text.hash,
    );
    for (entry in programTeamMembersStable.vals()) {
      programTeamMembersById.put(entry.0, entry.1);
    };
    programTeamMembersStable := [];

    programTeamOwedEntriesById := _HashMap.HashMap<Text, Types.ProgramTeamOwedEntry>(
      programTeamOwedEntriesStable.size(),
      Text.equal,
      Text.hash,
    );
    for (entry in programTeamOwedEntriesStable.vals()) {
      programTeamOwedEntriesById.put(entry.0, entry.1);
    };
    programTeamOwedEntriesStable := [];

    programTeamPaidEntriesById := _HashMap.HashMap<Text, Types.ProgramTeamPaidEntry>(
      programTeamPaidEntriesStable.size(),
      Text.equal,
      Text.hash,
    );
    for (entry in programTeamPaidEntriesStable.vals()) {
      programTeamPaidEntriesById.put(entry.0, entry.1);
    };
    programTeamPaidEntriesStable := [];

    programTeamPaidFundedByById := _HashMap.HashMap<Text, Text>(
      programTeamPaidFundedByStable.size(),
      Text.equal,
      Text.hash,
    );
    for (entry in programTeamPaidFundedByStable.vals()) {
      programTeamPaidFundedByById.put(entry.0, entry.1);
    };
    programTeamPaidFundedByStable := [];

    membershipTierByPrincipal := _HashMap.HashMap<Principal, Text>(
      membershipTierStable.size(),
      Principal.equal,
      Principal.hash,
    );
    for (entry in membershipTierStable.vals()) {
      membershipTierByPrincipal.put(entry.0, entry.1);
    };
    membershipTierStable := [];

    quarterlyAppCreditBalanceByPrincipal := _HashMap.HashMap<Principal, Nat>(
      quarterlyAppCreditBalanceStable.size(),
      Principal.equal,
      Principal.hash,
    );
    for (entry in quarterlyAppCreditBalanceStable.vals()) {
      quarterlyAppCreditBalanceByPrincipal.put(entry.0, entry.1);
    };
    quarterlyAppCreditBalanceStable := [];

    quarterlyAppCreditLastAccruedByPrincipal := _HashMap.HashMap<Principal, Text>(
      quarterlyAppCreditLastAccruedStable.size(),
      Principal.equal,
      Principal.hash,
    );
    for (entry in quarterlyAppCreditLastAccruedStable.vals()) {
      quarterlyAppCreditLastAccruedByPrincipal.put(entry.0, entry.1);
    };
    quarterlyAppCreditLastAccruedStable := [];

    programPaymentPlansById := _HashMap.HashMap<Text, Types.ProgramPaymentPlan>(0, Text.equal, Text.hash);
    reloadProgramPaymentPlansFromStables();
    programPaymentPlansStable := [];
    programPaymentPlansStableV2 := [];

    programPaymentFlightPreferencesByKey := _HashMap.HashMap<Text, Types.ProgramPaymentFlightPreference>(0, Text.equal, Text.hash);
    for (entry in programPaymentFlightPreferencesStable.vals()) {
      programPaymentFlightPreferencesByKey.put(entry.0, entry.1);
    };
    programPaymentFlightPreferencesStable := [];

    siteSettingsByKey := _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);
    for (entry in siteSettingsStable.vals()) {
      siteSettingsByKey.put(entry.0, entry.1);
    };
    siteSettingsStable := [];

    applicationByArtistProgram := _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);
    for (entry in applicationByArtistProgramStable.vals()) {
      applicationByArtistProgram.put(entry.0, entry.1);
    };
    applicationByArtistProgramStable := [];

    mostRecentProgramByArtistId := _HashMap.HashMap<Text, Text>(
      artistMostRecentProgramStable.size(),
      Text.equal,
      Text.hash,
    );
    for (entry in artistMostRecentProgramStable.vals()) {
      mostRecentProgramByArtistId.put(entry.0, entry.1);
    };
    artistMostRecentProgramStable := [];

    artistFeaturedFeaturableById := _HashMap.HashMap<Text, Bool>(0, Text.equal, Text.hash);
    for (id in artistFeaturedFeaturableIdsStable.vals()) {
      artistFeaturedFeaturableById.put(id, true);
    };
    artistFeaturedFeaturableIdsStable := [];

    manualFeaturedArtistIds := Buffer.Buffer<Text>(0);
    for (id in artistFeaturedManualIdsStable.vals()) {
      manualFeaturedArtistIds.add(id);
    };
    artistFeaturedManualIdsStable := [];

    reloadStudioPermissionTransientFromStable();
    ensureStudioFeatureKeysMergedWithDefaults();
    migrateStudioPermissionMatrices();
    studioPermissionDefaultsStable := [];
    studioPermissionOverridesStable := [];
    superStaffPrincipalsStable := [];
    seedStudioPermissionDefaultsIfEmpty();

    reloadAccountContactTransientFromStable();
    accountContactStable := [];

    for (d in defaultAdminPrincipals().vals()) {
      if (not isAdminPrincipal(d)) {
        adminPrincipals := Array.append(adminPrincipals, [d]);
      };
    };

    if (journalLayoutRows.size() == 0 and journalLayoutStable.size() > 0) {
      let out = Buffer.Buffer<Types.JournalLayoutRow>(journalLayoutStable.size());
      var idx : Nat = 0;
      for (r in journalLayoutStable.vals()) {
        out.add({
          rowType = r.rowType;
          refId = r.refId;
          selectionMode = r.selectionMode;
          artistId = r.artistId;
          sortOrder = idx;
          featured = false;
        });
        idx += 1;
      };
      journalLayoutRows := Buffer.toArray(out);
      journalLayoutStable := [];
    };
  };

  /// Rebuild in-memory maps from stable arrays after `adminImportFullDatabase` assigns them (no default-admin merge).
  private func rebuildTransientFromImportedStableArrays() {
    reloadSubscribersFromStables();

    accountsByPrincipal := _HashMap.HashMap<Principal, Types.UserAccountCore>(
      accountsStable.size(),
      Principal.equal,
      Principal.hash
    );
    for (entry in accountsStable.vals()) {
      accountsByPrincipal.put(entry.0, entry.1);
    };

    membershipByPrincipal := _HashMap.HashMap<Principal, Types.MembershipFields>(
      membershipByPrincipalStable.size() + membershipByPrincipalStableV2.size(),
      Principal.equal,
      Principal.hash
    );
    reloadMembershipFromStables();

    membershipStripePeriodEndByPrincipal := _HashMap.HashMap<Principal, Text>(
      membershipStripePeriodEndStable.size(),
      Principal.equal,
      Principal.hash
    );
    for (entry in membershipStripePeriodEndStable.vals()) {
      membershipStripePeriodEndByPrincipal.put(entry.0, entry.1);
    };

    artistsById := _HashMap.HashMap<Text, Types.ArtistRecord>(
      artistsStable.size(),
      Text.equal,
      Text.hash
    );
    artistSlugToId := _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);
    for (entry in artistsStable.vals()) {
      let id = entry.0;
      let rec = entry.1;
      artistsById.put(id, rec);
      artistSlugToId.put(rec.profile.slug, id);
    };

    artistFilterCohortYearsById := _HashMap.HashMap<Text, [Nat]>(
      artistFilterCohortYearsStable.size(),
      Text.equal,
      Text.hash
    );
    for (entry in artistFilterCohortYearsStable.vals()) {
      artistFilterCohortYearsById.put(entry.0, entry.1);
    };

    artistHeroProfileImageById := _HashMap.HashMap<Text, Text>(
      artistHeroProfileImageStable.size(),
      Text.equal,
      Text.hash
    );
    for (entry in artistHeroProfileImageStable.vals()) {
      artistHeroProfileImageById.put(entry.0, entry.1);
    };

    artistHeroProfileImageApprovedById := _HashMap.HashMap<Text, Bool>(
      artistHeroProfileImageApprovedIdsStable.size(),
      Text.equal,
      Text.hash
    );
    for (id in artistHeroProfileImageApprovedIdsStable.vals()) {
      artistHeroProfileImageApprovedById.put(id, true);
    };

    artistAudioApprovedById := _HashMap.HashMap<Text, Bool>(
      artistAudioApprovedIdsStable.size(),
      Text.equal,
      Text.hash
    );
    for (id in artistAudioApprovedIdsStable.vals()) {
      artistAudioApprovedById.put(id, true);
    };

    artistAudioCollectionById := _HashMap.HashMap<Text, [Types.ArtistAudioEntry]>(
      artistAudioCollectionStable.size(), Text.equal, Text.hash
    );
    for (entry in artistAudioCollectionStable.vals()) {
      artistAudioCollectionById.put(entry.0, entry.1);
    };

    artistAudioHighlightById := _HashMap.HashMap<Text, Text>(
      artistAudioHighlightStable.size(), Text.equal, Text.hash
    );
    for (entry in artistAudioHighlightStable.vals()) {
      artistAudioHighlightById.put(entry.0, entry.1);
    };

    artistAudioApprovedUrlsById := _HashMap.HashMap<Text, [Text]>(
      artistAudioApprovedUrlsStable.size(), Text.equal, Text.hash
    );
    for (entry in artistAudioApprovedUrlsStable.vals()) {
      artistAudioApprovedUrlsById.put(entry.0, entry.1);
    };

    heroProfileImageReviewNotesById := _HashMap.HashMap<Text, Types.AssetReviewNote>(
      heroProfileImageReviewNotesStable.size(), Text.equal, Text.hash
    );
    for (entry in heroProfileImageReviewNotesStable.vals()) {
      heroProfileImageReviewNotesById.put(entry.0, entry.1);
    };

    audioEntryReviewNotesByKey := _HashMap.HashMap<Text, Types.AssetReviewNote>(
      audioEntryReviewNotesStable.size(), Text.equal, Text.hash
    );
    for (entry in audioEntryReviewNotesStable.vals()) {
      audioEntryReviewNotesByKey.put(entry.0, entry.1);
    };

    programsById := _HashMap.HashMap<Text, Types.ProgramRecord>(0, Text.equal, Text.hash);
    for (entry in programsStable.vals()) {
      programsById.put(entry.0, entry.1);
    };

    journalsById := _HashMap.HashMap<Text, Types.JournalRecord>(0, Text.equal, Text.hash);
    for (entry in journalsStable.vals()) {
      journalsById.put(entry.0, entry.1);
    };

    editionsById := _HashMap.HashMap<Text, Types.EditionRecord>(0, Text.equal, Text.hash);
    for (entry in editionsStable.vals()) {
      editionsById.put(entry.0, entry.1);
    };

    contentBySlug := _HashMap.HashMap<Text, Types.ContentPageRecord>(0, Text.equal, Text.hash);
    for (entry in contentPagesStable.vals()) {
      contentBySlug.put(entry.0, entry.1);
    };

    applicantsById := _HashMap.HashMap<Text, Types.ApplicantRecord>(0, Text.equal, Text.hash);
    for (entry in applicantsStable.vals()) {
      applicantsById.put(entry.0, entry.1);
    };

    archivedApplicantsById := _HashMap.HashMap<Text, Types.ApplicantRecord>(0, Text.equal, Text.hash);
    for (entry in archivedApplicantsStable.vals()) {
      archivedApplicantsById.put(entry.0, entry.1);
    };

    applicantEmailOutreachById := _HashMap.HashMap<Text, Text>(
      applicantEmailOutreachStable.size(),
      Text.equal,
      Text.hash
    );
    for (entry in applicantEmailOutreachStable.vals()) {
      applicantEmailOutreachById.put(entry.0, entry.1);
    };

    programPaymentSummariesByKey := _HashMap.HashMap<Text, Types.ProgramPaymentSummary>(0, Text.equal, Text.hash);
    for (entry in programPaymentSummariesStable.vals()) {
      programPaymentSummariesByKey.put(entry.0, entry.1);
    };

    programPaymentLedgerById := _HashMap.HashMap<Text, Types.ProgramPaymentLedgerRow>(0, Text.equal, Text.hash);
    reloadProgramPaymentLedgerFromStables();

    programPaymentPlansById := _HashMap.HashMap<Text, Types.ProgramPaymentPlan>(0, Text.equal, Text.hash);
    reloadProgramPaymentPlansFromStables();

    programPaymentFlightPreferencesByKey := _HashMap.HashMap<Text, Types.ProgramPaymentFlightPreference>(0, Text.equal, Text.hash);
    for (entry in programPaymentFlightPreferencesStable.vals()) {
      programPaymentFlightPreferencesByKey.put(entry.0, entry.1);
    };

    siteSettingsByKey := _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);
    for (entry in siteSettingsStable.vals()) {
      siteSettingsByKey.put(entry.0, entry.1);
    };

    applicationByArtistProgram := _HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);
    for (entry in applicationByArtistProgramStable.vals()) {
      applicationByArtistProgram.put(entry.0, entry.1);
    };

    mostRecentProgramByArtistId := _HashMap.HashMap<Text, Text>(
      artistMostRecentProgramStable.size(),
      Text.equal,
      Text.hash
    );
    for (entry in artistMostRecentProgramStable.vals()) {
      mostRecentProgramByArtistId.put(entry.0, entry.1);
    };

    artistFeaturedFeaturableById := _HashMap.HashMap<Text, Bool>(0, Text.equal, Text.hash);
    for (id in artistFeaturedFeaturableIdsStable.vals()) {
      artistFeaturedFeaturableById.put(id, true);
    };

    manualFeaturedArtistIds := Buffer.Buffer<Text>(0);
    for (id in artistFeaturedManualIdsStable.vals()) {
      manualFeaturedArtistIds.add(id);
    };

    joinInvitesByCode := _HashMap.HashMap<Text, Types.JoinInviteRecord>(
      joinInvitesStable.size(),
      Text.equal,
      Text.hash,
    );
    for (entry in joinInvitesStable.vals()) {
      joinInvitesByCode.put(entry.0, entry.1);
    };

    accountRecoveryCodesByCode := _HashMap.HashMap<Text, Types.AccountRecoveryCodeRecord>(
      accountRecoveryCodesStable.size(),
      Text.equal,
      Text.hash,
    );
    for (entry in accountRecoveryCodesStable.vals()) {
      accountRecoveryCodesByCode.put(entry.0, entry.1);
    };
    rebuildActiveRecoveryCodeIndex();

    reloadStudioPermissionTransientFromStable();
    ensureStudioFeatureKeysMergedWithDefaults();
    seedStudioPermissionDefaultsIfEmpty();
    migrateStudioPermissionMatrices();

    reloadAccountContactTransientFromStable();

    rebuildAccessCodeToArtistIdIndex();
  };

  /// Admin-only: full backup of persisted application state (for JSON download in Studio).
  public shared (msg) func adminExportFullDatabase() : async Types.DatabaseSnapshotV1 {
    assertAdmin(msg.caller);
    {
      version = 1;
      adminPrincipals = adminPrincipals;
      integrationServicePrincipal = integrationServicePrincipal;
      artistFeaturedRandomMode = artistFeaturedRandomModeStable;
      subscribersStable = _Iter.toArray(subscribersByEmail.entries());
      accountsStable = _Iter.toArray(accountsByPrincipal.entries());
      membershipByPrincipalStable = _Iter.toArray(membershipByPrincipal.entries());
      membershipTrialWindowStable = ?(_Iter.toArray(membershipTrialWindowByPrincipal.entries()));
      membershipStripePeriodEndStable = _Iter.toArray(membershipStripePeriodEndByPrincipal.entries());
      artistFilterCohortYearsStable = _Iter.toArray(artistFilterCohortYearsById.entries());
      artistHeroProfileImageStable = ?(_Iter.toArray(artistHeroProfileImageById.entries()));
      artistHeroProfileImageApprovedIdsStable = ?approvedHeroProfileImageIdsSorted();
      artistAudioApprovedIdsStable = ?approvedAudioIdsSorted();
      artistsStable = _Iter.toArray(artistsById.entries());
      programsStable = _Iter.toArray(programsById.entries());
      journalsStable = _Iter.toArray(journalsById.entries());
      editionsStable = _Iter.toArray(editionsById.entries());
      contentPagesStable = _Iter.toArray(contentBySlug.entries());
      applicantsStable = _Iter.toArray(applicantsById.entries());
      archivedApplicantsStable = ?(_Iter.toArray(archivedApplicantsById.entries()));
      programPaymentSummariesStable = ?(_Iter.toArray(programPaymentSummariesByKey.entries()));
      programPaymentLedgerStable = ?(_Iter.toArray(programPaymentLedgerById.entries()));
      programPaymentPlansStable = ?(_Iter.toArray(programPaymentPlansById.entries()));
      programPaymentFlightPreferencesStable = ?(_Iter.toArray(programPaymentFlightPreferencesByKey.entries()));
      siteSettingsStable = _Iter.toArray(siteSettingsByKey.entries());
      applicationByArtistProgramStable = _Iter.toArray(applicationByArtistProgram.entries());
      artistMostRecentProgramStable = _Iter.toArray(mostRecentProgramByArtistId.entries());
      artistFeaturedFeaturableIdsStable = featurableIdsSorted();
      artistFeaturedManualIdsStable = Buffer.toArray(manualFeaturedArtistIds);
      joinInvitesStable = _Iter.toArray(joinInvitesByCode.entries());
      joinInviteTrialMonthsStable = ?(_Iter.toArray(joinInviteTrialMonthsByCode.entries()));
      accountRecoveryCodesStable = ?(_Iter.toArray(accountRecoveryCodesByCode.entries()));
      studioPermissionDefaultsStable = _Iter.toArray(studioPermissionDefaultsByCategory.entries());
      studioPermissionOverridesStable = _Iter.toArray(studioPermissionOverridesByPrincipal.entries());
      superStaffPrincipalsStable = superStaffPrincipalsAsArray();
      accountContactStable = ?_Iter.toArray(accountContactByPrincipal.entries());
      applicantEmailOutreachStable = ?(_Iter.toArray(applicantEmailOutreachById.entries()));
      artistAudioCollectionStable = ?(_Iter.toArray(artistAudioCollectionById.entries()));
      artistAudioHighlightStable = ?(_Iter.toArray(artistAudioHighlightById.entries()));
      artistAudioApprovedUrlsStable = ?(_Iter.toArray(artistAudioApprovedUrlsById.entries()));
      heroProfileImageReviewNotesStable = ?(_Iter.toArray(heroProfileImageReviewNotesById.entries()));
      audioEntryReviewNotesStable = ?(_Iter.toArray(audioEntryReviewNotesByKey.entries()));
    };
  };

  /// Admin-only: replace canister state from a snapshot (dangerous; locks out if admins list is wrong).
  public shared (msg) func adminImportFullDatabase(snapshot : Types.DatabaseSnapshotV1) : async () {
    assertAdmin(msg.caller);
    if (snapshot.version != 1) {
      Debug.trap("Unsupported database snapshot version");
    };
    adminPrincipals := snapshot.adminPrincipals;
    integrationServicePrincipal := snapshot.integrationServicePrincipal;
    artistFeaturedRandomModeStable := snapshot.artistFeaturedRandomMode;
    subscribersV1 := snapshot.subscribersStable;
    subscribersStable := [];
    accountsStable := snapshot.accountsStable;
    membershipByPrincipalStableV2 := snapshot.membershipByPrincipalStable;
    membershipByPrincipalStable := [];
    membershipTrialWindowStable := switch (snapshot.membershipTrialWindowStable) {
      case null { [] };
      case (?rows) { rows };
    };
    membershipStripePeriodEndStable := snapshot.membershipStripePeriodEndStable;
    artistFilterCohortYearsStable := snapshot.artistFilterCohortYearsStable;
    artistHeroProfileImageStable := switch (snapshot.artistHeroProfileImageStable) {
      case null { [] };
      case (?rows) { rows };
    };
    artistHeroProfileImageApprovedIdsStable := switch (snapshot.artistHeroProfileImageApprovedIdsStable) {
      case null { [] };
      case (?rows) { rows };
    };
    artistAudioApprovedIdsStable := switch (snapshot.artistAudioApprovedIdsStable) {
      case null { [] };
      case (?rows) { rows };
    };
    artistsStable := snapshot.artistsStable;
    programsStable := snapshot.programsStable;
    journalsStable := snapshot.journalsStable;
    editionsStable := snapshot.editionsStable;
    contentPagesStable := snapshot.contentPagesStable;
    applicantsStable := snapshot.applicantsStable;
    archivedApplicantsStable := switch (snapshot.archivedApplicantsStable) {
      case null { [] };
      case (?rows) { rows };
    };
    programPaymentSummariesStable := switch (snapshot.programPaymentSummariesStable) {
      case null { [] };
      case (?rows) { rows };
    };
    programPaymentLedgerStable := switch (snapshot.programPaymentLedgerStable) {
      case null { [] };
      case (?rows) { [] };
    };
    programPaymentLedgerStableV1 := switch (snapshot.programPaymentLedgerStable) {
      case null { [] };
      case (?rows) { rows };
    };
    programPaymentPlansStable := switch (snapshot.programPaymentPlansStable) {
      case null { [] };
      case (?rows) { rows };
    };
    programPaymentFlightPreferencesStable := switch (snapshot.programPaymentFlightPreferencesStable) {
      case null { [] };
      case (?rows) { rows };
    };
    siteSettingsStable := snapshot.siteSettingsStable;
    applicationByArtistProgramStable := snapshot.applicationByArtistProgramStable;
    artistMostRecentProgramStable := snapshot.artistMostRecentProgramStable;
    artistFeaturedFeaturableIdsStable := snapshot.artistFeaturedFeaturableIdsStable;
    artistFeaturedManualIdsStable := snapshot.artistFeaturedManualIdsStable;
    joinInvitesStable := snapshot.joinInvitesStable;
    joinInviteTrialMonthsStable := switch (snapshot.joinInviteTrialMonthsStable) {
      case null { [] };
      case (?rows) { rows };
    };
    accountRecoveryCodesStable := switch (snapshot.accountRecoveryCodesStable) {
      case null { [] };
      case (?rows) { rows };
    };
    studioPermissionDefaultsStable := snapshot.studioPermissionDefaultsStable;
    studioPermissionOverridesStable := snapshot.studioPermissionOverridesStable;
    superStaffPrincipalsStable := snapshot.superStaffPrincipalsStable;
    accountContactStable := switch (snapshot.accountContactStable) {
      case null { [] };
      case (?rows) { rows };
    };
    applicantEmailOutreachStable := switch (snapshot.applicantEmailOutreachStable) {
      case null { [] };
      case (?rows) { rows };
    };
    artistAudioCollectionStable := switch (snapshot.artistAudioCollectionStable) {
      case null { [] };
      case (?rows) { rows };
    };
    artistAudioHighlightStable := switch (snapshot.artistAudioHighlightStable) {
      case null { [] };
      case (?rows) { rows };
    };
    artistAudioApprovedUrlsStable := switch (snapshot.artistAudioApprovedUrlsStable) {
      case null { [] };
      case (?rows) { rows };
    };
    heroProfileImageReviewNotesStable := switch (snapshot.heroProfileImageReviewNotesStable) {
      case null { [] };
      case (?rows) { rows };
    };
    audioEntryReviewNotesStable := switch (snapshot.audioEntryReviewNotesStable) {
      case null { [] };
      case (?rows) { rows };
    };
    rebuildTransientFromImportedStableArrays();
  };

  // ===== Accounts =====

  public shared query (msg) func getAccountForCaller() : async ?Types.UserAccount {
    mergeAccount(msg.caller)
  };

  public shared query (msg) func getMyAccountContactForCaller() : async ?Types.AccountContact {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      return null;
    };
    accountContactByPrincipal.get(msg.caller);
  };

  /// Billing / access for the logged-in principal (join gate + resubscribe).
  public shared query (msg) func getMembershipAccessForCaller() : async Types.MembershipAccessResult {
    membershipAccessForPrincipal(msg.caller);
  };

  /// Integration API: check the same membership gate for a viewer before signing private media URLs.
  public shared query (msg) func integrationGetMembershipAccessForPrincipal(p : Principal) : async Types.MembershipAccessResult {
    assertIntegrationCaller(msg.caller);
    membershipAccessForPrincipal(p);
  };

  private let APP_FEE_GUEST_CENTS : Nat = 5000;
  private let APP_FEE_MEMBER_CENTS : Nat = 3500;

  private func normalizeMembershipTierText(raw : Text) : Text {
    let t = Text.toLowercase(Text.trim(raw, #char ' '));
    if (t == "monthly" or t == "quarterly" or t == "annual" or t == "bimonthly") { t }
    else if (t == "bi_monthly" or t == "bi-monthly") { "bimonthly" }
    else { "" }
  };

  private func membershipTierOf(p : Principal) : Text {
    switch (membershipTierByPrincipal.get(p)) {
      case (?t) { normalizeMembershipTierText(t) };
      case null { "" };
    }
  };

  private func digChar(c : Char) : ?Nat {
    if (c >= '0' and c <= '9') { Nat.fromText(Char.toText(c)) } else { null }
  };

  /// Parse `YYYY-Qn` → absolute quarter index (year*4 + q-1).
  private func quarterKeyToIndex(key : Text) : ?Nat {
    let chars = Text.toArray(key);
    if (chars.size() != 7) { return null };
    if (chars[4] != '-' or chars[5] != 'Q') { return null };
    let y0 = digChar(chars[0]);
    let y1 = digChar(chars[1]);
    let y2 = digChar(chars[2]);
    let y3 = digChar(chars[3]);
    let qDig = digChar(chars[6]);
    switch (y0, y1, y2, y3, qDig) {
      case (?a, ?b, ?c, ?d, ?q) {
        if (q < 1 or q > 4) { null }
        else {
          let year = a * 1000 + b * 100 + c * 10 + d;
          ?(year * 4 + (q - 1))
        }
      };
      case _ { null };
    }
  };

  private func quarterIndexToKey(index : Nat) : Text {
    let year = index / 4;
    let q = (index % 4) + 1;
    Nat.toText(year) # "-Q" # Nat.toText(q)
  };

  /// Accrue stackable quarterly application credits up through `currentQuarterKey`.
  private func accrueQuarterlyAppCredits(p : Principal, currentQuarterKey : Text) {
    let tier = membershipTierOf(p);
    if (tier != "quarterly") { return };
    switch (membershipAccessForPrincipal(p)) {
      case (#ok) {};
      case _ { return };
    };
    let curKey = Text.trim(currentQuarterKey, #char ' ');
    let curIdx = switch (quarterKeyToIndex(curKey)) {
      case null { return };
      case (?i) { i };
    };
    let bal0 = switch (quarterlyAppCreditBalanceByPrincipal.get(p)) {
      case (?n) { n };
      case null { 0 };
    };
    let lastKey = switch (quarterlyAppCreditLastAccruedByPrincipal.get(p)) {
      case (?k) { k };
      case null { "" };
    };
    if (lastKey.size() == 0) {
      quarterlyAppCreditBalanceByPrincipal.put(p, bal0 + 1);
      quarterlyAppCreditLastAccruedByPrincipal.put(p, curKey);
      return;
    };
    let lastIdx = switch (quarterKeyToIndex(lastKey)) {
      case null {
        quarterlyAppCreditBalanceByPrincipal.put(p, bal0 + 1);
        quarterlyAppCreditLastAccruedByPrincipal.put(p, curKey);
        return;
      };
      case (?i) { i };
    };
    if (lastIdx >= curIdx) { return };
    var gap = curIdx - lastIdx;
    if (gap > 40) { gap := 40 };
    quarterlyAppCreditBalanceByPrincipal.put(p, bal0 + gap);
    quarterlyAppCreditLastAccruedByPrincipal.put(p, curKey);
  };

  private func applicationFeeDueForPrincipal(p : Principal, currentQuarterKey : Text) : Types.ApplicationFeeDue {
    switch (membershipAccessForPrincipal(p)) {
      case (#exempt) {
        {
          dueCents = 0;
          reason = "exempt";
          membershipTier = membershipTierOf(p);
          appCreditBalance = switch (quarterlyAppCreditBalanceByPrincipal.get(p)) {
            case (?n) { n };
            case null { 0 };
          };
        }
      };
      case (#ok) {
        accrueQuarterlyAppCredits(p, currentQuarterKey);
        let tier = membershipTierOf(p);
        let bal = switch (quarterlyAppCreditBalanceByPrincipal.get(p)) {
          case (?n) { n };
          case null { 0 };
        };
        if (tier == "annual") {
          { dueCents = 0; reason = "annual"; membershipTier = "annual"; appCreditBalance = bal }
        } else if (tier == "quarterly") {
          if (bal >= 1) {
            { dueCents = 0; reason = "credit"; membershipTier = "quarterly"; appCreditBalance = bal }
          } else {
            { dueCents = APP_FEE_MEMBER_CENTS; reason = "member_fee"; membershipTier = "quarterly"; appCreditBalance = 0 }
          }
        } else {
          let t = if (tier.size() > 0) { tier } else { "monthly" };
          { dueCents = APP_FEE_MEMBER_CENTS; reason = "member_fee"; membershipTier = t; appCreditBalance = bal }
        }
      };
      case _ {
        {
          dueCents = APP_FEE_GUEST_CENTS;
          reason = "application_only";
          membershipTier = "";
          appCreditBalance = 0;
        }
      };
    }
  };

  /// Caller: application fee due for program apply (`currentQuarterKey` = `YYYY-Qn`, UTC).
  public shared (msg) func applicationFeeDueForCaller(programId : Text, currentQuarterKey : Text) : async Types.ApplicationFeeDue {
    ignore programId;
    if (Principal.equal(msg.caller, anonPrincipal)) {
      return {
        dueCents = APP_FEE_GUEST_CENTS;
        reason = "application_only";
        membershipTier = "";
        appCreditBalance = 0;
      };
    };
    applicationFeeDueForPrincipal(msg.caller, currentQuarterKey)
  };

  public shared query (msg) func getMembershipTierForCaller() : async Text {
    if (Principal.equal(msg.caller, anonPrincipal)) { return "" };
    membershipTierOf(msg.caller)
  };

  public shared query (msg) func getQuarterlyAppCreditBalanceForCaller() : async Nat {
    if (Principal.equal(msg.caller, anonPrincipal)) { return 0 };
    switch (quarterlyAppCreditBalanceByPrincipal.get(msg.caller)) {
      case (?n) { n };
      case null { 0 };
    }
  };

  /// Integration API: set membership billing tier after PayPal sync / revise.
  public shared (msg) func integrationSetMembershipTier(memberPrincipal : Principal, tier : Text) : async () {
    assertIntegrationCaller(msg.caller);
    let t = normalizeMembershipTierText(tier);
    if (t.size() == 0) { Debug.trap("Invalid membership tier") };
    membershipTierByPrincipal.put(memberPrincipal, t);
    if (t == "quarterly") {
      // Grant first credit for current period when first becoming quarterly (key from FE on next fee-due).
      // If lastAccrued empty and balance 0, leave accrual to applicationFeeDue / explicit call.
      ignore t;
    };
  };

  /// Admin-only: set full account for any principal (e.g. promote staff).
  public shared (msg) func adminUpsertUserAccount(
    p : Principal,
    account : Types.UserAccount,
  ) : async () {
    assertAdmin(msg.caller);
    putUserAccountFull(p, account);
  };

  private func roleIsAdminOnly(r : Types.UserRole) : Bool {
    switch (r) {
      case (#admin) { true };
      case _ { false };
    };
  };

  /// Move member account, membership, contact, and artist link to a new Internet Identity principal.
  private func reconnectMemberPrincipalBetween(
    fromP : Principal,
    toP : Principal,
  ) : Types.AdminReconnectMemberResult {
    if (Principal.equal(fromP, toP)) {
      return #samePrincipal;
    };
    let fromCore = switch (accountsByPrincipal.get(fromP)) {
      case null { return #noSourceAccount };
      case (?c) { c };
    };
    if (roleIsAdminOnly(fromCore.role)) {
      return #cannotMigratePrivilegedAccount;
    };
    switch (accountsByPrincipal.get(toP)) {
      case (?_) { return #targetHasAccount };
      case null {};
    };
    let fromM = switch (membershipByPrincipal.get(fromP)) {
      case null { defaultMembership() };
      case (?x) { x };
    };
    let now = nowText();
    let toCore : Types.UserAccountCore = {
      role = fromCore.role;
      status = fromCore.status;
      linkedArtistId = fromCore.linkedArtistId;
      linkedOrgId = fromCore.linkedOrgId;
      updatedAt = now;
    };
    putUserAccountParts(toCore, fromM, toP);
    switch (membershipStripePeriodEndByPrincipal.get(fromP)) {
      case null {};
      case (?end) { membershipStripePeriodEndByPrincipal.put(toP, end) };
    };
    switch (membershipTrialWindowByPrincipal.get(fromP)) {
      case null {
        ignore membershipTrialWindowByPrincipal.remove(toP);
      };
      case (?w) {
        membershipTrialWindowByPrincipal.put(toP, w);
      };
    };
    switch (accountContactByPrincipal.get(fromP)) {
      case null {};
      case (?contact) {
        accountContactByPrincipal.put(toP, contact);
      };
    };
    let suspendedCore : Types.UserAccountCore = {
      fromCore with
      status = #suspended;
      linkedArtistId = null;
      linkedOrgId = null;
      updatedAt = now;
    };
    accountsByPrincipal.put(fromP, suspendedCore);
    ignore membershipTrialWindowByPrincipal.remove(fromP);
    #ok({
      fromPrincipal = Principal.toText(fromP);
      toPrincipal = Principal.toText(toP);
      linkedArtistId = fromCore.linkedArtistId;
      paymentProvider = fromM.paymentProvider;
    });
  };

  /// Admin: reconnect a paid member account to a new Internet Identity principal.
  public shared (msg) func adminReconnectMemberPrincipal(
    fromPrincipal : Principal,
    toPrincipal : Principal,
  ) : async Types.AdminReconnectMemberResult {
    assertAdmin(msg.caller);
    reconnectMemberPrincipalBetween(fromPrincipal, toPrincipal);
  };

  /// Integration API: same reconnect as admin (Studio server orchestration with API key).
  public shared (msg) func integrationReconnectMemberPrincipal(
    fromPrincipal : Principal,
    toPrincipal : Principal,
  ) : async Types.AdminReconnectMemberResult {
    assertIntegrationCaller(msg.caller);
    reconnectMemberPrincipalBetween(fromPrincipal, toPrincipal);
  };

  /// Admin: generate a single-use 8-digit recovery code (7-day expiry) for self-serve II migration.
  public shared (msg) func adminGenerateAccountRecoveryCode(
    fromPrincipal : Principal,
  ) : async Types.GenerateAccountRecoveryCodeResult {
    assertAdmin(msg.caller);
    switch (accountsByPrincipal.get(fromPrincipal)) {
      case null { return #noSourceAccount };
      case (?core) {
        if (roleIsAdminOnly(core.role)) {
          return #cannotGenerateForPrivilegedAccount;
        };
      };
    };
    invalidateActiveRecoveryCodeForPrincipal(fromPrincipal);
    let now = nowText();
    let expiresAtSec = nowSec() + accountRecoveryDurationSec;
    var attempts : Nat = 0;
    while (attempts < 50) {
      let cand = randomEightDigitCandidate(attempts + accountRecoveryCodesByCode.size());
      if (not isJoinInviteCodeTaken(cand)) {
        let rec : Types.AccountRecoveryCodeRecord = {
          fromPrincipal = fromPrincipal;
          active = true;
          createdAt = now;
          expiresAtSec = expiresAtSec;
          redeemedAt = null;
          redeemedToPrincipal = null;
        };
        accountRecoveryCodesByCode.put(cand, rec);
        activeRecoveryCodeByFromPrincipal.put(fromPrincipal, cand);
        return #ok({ code = cand; expiresAtSec = expiresAtSec });
      };
      attempts += 1;
    };
    #allocationFailed;
  };

  /// Authenticated member: redeem recovery code — migrate source account to caller's Internet Identity.
  public shared (msg) func redeemAccountRecoveryCode(codeRaw : Text) : async Types.RedeemAccountRecoveryCodeResult {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      return #invalidCode;
    };
    switch (accountsByPrincipal.get(msg.caller)) {
      case (?_) { return #callerHasAccount };
      case null {};
    };
    let code = normalizeJoinAccessCode(codeRaw);
    if (not isEightDigitAccessCode(code)) {
      return #invalidCode;
    };
    switch (accountRecoveryCodesByCode.get(code)) {
      case null { return #invalidCode };
      case (?rec) {
        if (not rec.active) {
          return #alreadyUsed;
        };
        if (nowSec() > rec.expiresAtSec) {
          accountRecoveryCodesByCode.put(code, { rec with active = false });
          ignore activeRecoveryCodeByFromPrincipal.remove(rec.fromPrincipal);
          return #expiredCode;
        };
        let result = reconnectMemberPrincipalBetween(rec.fromPrincipal, msg.caller);
        switch (result) {
          case (#ok(ok)) {
            let redeemedAt = nowText();
            accountRecoveryCodesByCode.put(
              code,
              {
                rec with
                active = false;
                redeemedAt = ?redeemedAt;
                redeemedToPrincipal = ?msg.caller;
              },
            );
            ignore activeRecoveryCodeByFromPrincipal.remove(rec.fromPrincipal);
            #ok(ok);
          };
          case (#samePrincipal) { #samePrincipal };
          case (#noSourceAccount) { #noSourceAccount };
          case (#targetHasAccount) { #targetHasAccount };
          case (#targetLinkedToDifferentArtist) { #targetHasAccount };
          case (#cannotMigratePrivilegedAccount) { #cannotMigratePrivilegedAccount };
        };
      };
    };
  };

  /// Admin: set whether this member is exempt from subscription (manual veteran / complimentary).
  public shared (msg) func adminSetMembershipExemptManual(memberPrincipal : Principal, exempt : Bool) : async () {
    assertAdmin(msg.caller);
    switch (accountsByPrincipal.get(memberPrincipal)) {
      case null { Debug.trap("No account for principal") };
      case (?_) {};
    };
    let m0 = switch (membershipByPrincipal.get(memberPrincipal)) {
      case null { defaultMembership() };
      case (?x) { x };
    };
    let m1 : Types.MembershipFields = {
      stripeCustomerId = m0.stripeCustomerId;
      stripeSubscriptionId = m0.stripeSubscriptionId;
      stripeSubscriptionStatus = m0.stripeSubscriptionStatus;
      paypalSubscriptionId = m0.paypalSubscriptionId;
      paypalSubscriptionStatus = m0.paypalSubscriptionStatus;
      paymentProvider = m0.paymentProvider;
      membershipExemptManual = exempt;
    };
    membershipByPrincipal.put(memberPrincipal, m1);
  };

  /// Admin: PEM identity used by the integration API to record Stripe subscription updates.
  public shared (msg) func adminSetIntegrationServicePrincipal(p : Principal) : async () {
    assertAdmin(msg.caller);
    integrationServicePrincipal := ?p;
  };

  public shared query (msg) func adminGetIntegrationServicePrincipal() : async ?Principal {
    assertAdmin(msg.caller);
    integrationServicePrincipal;
  };

  /// Integration API only — updates Stripe ids/status for a member principal.
  /// A canceled membership must not keep a public presence: when billing access is lost, take the
  /// linked artist's roster row off public feeds by setting `visibility` to `inactive`. Only touches
  /// rows that are currently `public` or `pending` (submitted for review); `private`/`inactive` and
  /// unlinked accounts are left as-is. The profile data is preserved, so a returning member can
  /// re-enable visibility in Studio. Does not auto-restore on resubscribe.
  private func hideLinkedArtistProfileOnCancel(p : Principal) {
    switch (accountsByPrincipal.get(p)) {
      case null {};
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null {};
          case (?aid) {
            switch (artistsById.get(aid)) {
              case null {};
              case (?rec) {
                if (rec.profile.visibility == "public" or rec.profile.visibility == "pending") {
                  let newProfile : Types.ArtistCore = {
                    rec.profile with
                    visibility = "inactive";
                    updatedAt = nowText();
                  };
                  putArtistRecord({ rec with profile = newProfile });
                };
              };
            };
          };
        };
      };
    };
  };

  /// After a membership record update, hide the public profile if billing access is now lost due to a
  /// canceled/ended subscription (not merely past-due). The `#needsSubscription` gate guarantees the
  /// member is not exempt and has no other active plan before anything is taken down.
  private func hideProfileIfMembershipCanceled(p : Principal, canceledSignal : Bool) {
    if (not canceledSignal) { return };
    switch (membershipAccessForPrincipal(p)) {
      case (#needsSubscription) { hideLinkedArtistProfileOnCancel(p) };
      case (_) {};
    };
  };

  public shared (msg) func integrationRecordStripeSubscription(
    memberPrincipal : Principal,
    stripeCustomerId : ?Text,
    stripeSubscriptionId : ?Text,
    stripeSubscriptionStatus : ?Text,
    stripeCurrentPeriodEnd : ?Text,
  ) : async () {
    assertIntegrationCaller(msg.caller);
    switch (accountsByPrincipal.get(memberPrincipal)) {
      case null { Debug.trap("No account for member principal") };
      case (?_) {};
    };
    let m0 = switch (membershipByPrincipal.get(memberPrincipal)) {
      case null { defaultMembership() };
      case (?x) { x };
    };
    let m1 : Types.MembershipFields = {
      stripeCustomerId = switch (stripeCustomerId) {
        case null { m0.stripeCustomerId };
        case (?x) { ?x };
      };
      stripeSubscriptionId = switch (stripeSubscriptionId) {
        case null { m0.stripeSubscriptionId };
        case (?x) { ?x };
      };
      stripeSubscriptionStatus = switch (stripeSubscriptionStatus) {
        case null { m0.stripeSubscriptionStatus };
        case (?x) { ?x };
      };
      paypalSubscriptionId = m0.paypalSubscriptionId;
      paypalSubscriptionStatus = m0.paypalSubscriptionStatus;
      paymentProvider = switch (stripeSubscriptionId) {
        case null { m0.paymentProvider };
        case (?_) { ?"stripe" };
      };
      membershipExemptManual = m0.membershipExemptManual;
    };
    membershipByPrincipal.put(memberPrincipal, m1);
    switch (stripeCurrentPeriodEnd) {
      case null { };
      case (?pe) { putStripePeriodEndForPrincipal(memberPrincipal, ?pe) };
    };
    let stripeCanceled = switch (m1.stripeSubscriptionStatus) {
      case null { false };
      case (?s) { s == "canceled" or s == "cancelled" };
    };
    hideProfileIfMembershipCanceled(memberPrincipal, stripeCanceled);
  };

  /// Integration API only — updates PayPal subscription ids/status for a member principal.
  public shared (msg) func integrationRecordPayPalSubscription(
    memberPrincipal : Principal,
    paypalSubscriptionId : ?Text,
    paypalSubscriptionStatus : ?Text,
    paypalCurrentPeriodEnd : ?Text,
  ) : async () {
    assertIntegrationCaller(msg.caller);
    switch (accountsByPrincipal.get(memberPrincipal)) {
      case null { Debug.trap("No account for member principal") };
      case (?_) {};
    };
    let m0 = switch (membershipByPrincipal.get(memberPrincipal)) {
      case null { defaultMembership() };
      case (?x) { x };
    };
    let m1 : Types.MembershipFields = {
      stripeCustomerId = m0.stripeCustomerId;
      stripeSubscriptionId = m0.stripeSubscriptionId;
      stripeSubscriptionStatus = m0.stripeSubscriptionStatus;
      paypalSubscriptionId = switch (paypalSubscriptionId) {
        case null { m0.paypalSubscriptionId };
        case (?x) { ?x };
      };
      paypalSubscriptionStatus = switch (paypalSubscriptionStatus) {
        case null { m0.paypalSubscriptionStatus };
        case (?x) { ?x };
      };
      paymentProvider = switch (paypalSubscriptionId) {
        case null { m0.paymentProvider };
        case (?_) { ?"paypal" };
      };
      membershipExemptManual = m0.membershipExemptManual;
    };
    membershipByPrincipal.put(memberPrincipal, m1);
    switch (paypalCurrentPeriodEnd) {
      case null { };
      case (?pe) { putStripePeriodEndForPrincipal(memberPrincipal, ?pe) };
    };
    let paypalCanceled = switch (m1.paypalSubscriptionStatus) {
      case null { false };
      case (?s) { s == "CANCELLED" or s == "EXPIRED" };
    };
    hideProfileIfMembershipCanceled(memberPrincipal, paypalCanceled);
  };

  /// Caller registers or updates a non-privileged role. New principals get `#pending`; existing rows
  /// preserve `linkedArtistId`, `linkedOrgId`, and `status` so later calls cannot unlink (e.g. after
  /// roster access-code registration or admin activation).
  public shared (msg) func registerOrUpdateAccount(role : Types.UserRole) : async () {
    if (roleIsPrivileged(role)) {
      Debug.trap("Cannot self-request staff or admin");
    };
    let now = nowText();
    switch (accountsByPrincipal.get(msg.caller)) {
      case null {
        let acc : Types.UserAccountCore = {
          role = role;
          status = #pending;
          linkedArtistId = null;
          linkedOrgId = null;
          updatedAt = now;
        };
        accountsByPrincipal.put(msg.caller, acc);
      };
      case (?existing) {
        let acc : Types.UserAccountCore = {
          role = role;
          status = existing.status;
          linkedArtistId = existing.linkedArtistId;
          linkedOrgId = existing.linkedOrgId;
          updatedAt = now;
        };
        accountsByPrincipal.put(msg.caller, acc);
      };
    };
    switch (membershipByPrincipal.get(msg.caller)) {
      case null { membershipByPrincipal.put(msg.caller, defaultMembership()) };
      case (?_) {};
    };
  };

  /// Admin: create a single-use 8-digit join invite for gallery / curator / collector / artist (no profile).
  public shared (msg) func adminCreateJoinInviteCode(role : Types.UserRole) : async Text {
    assertAdmin(msg.caller);
    if (not roleAllowedForJoinInvite(role)) {
      Debug.trap("Invalid role for join invite");
    };
    let now = nowText();
    var attempts : Nat = 0;
    while (attempts < 50) {
      let cand = randomEightDigitCandidate(attempts);
      if (not isJoinInviteCodeTaken(cand)) {
        let rec : Types.JoinInviteRecord = {
          role = role;
          active = true;
          createdAt = now;
        };
        joinInvitesByCode.put(cand, rec);
        ignore joinInviteTrialMonthsByCode.remove(cand);
        return cand;
      };
      attempts += 1;
    };
    Debug.trap("Could not allocate join code");
  };

  /// Admin: list all join invite records (active and redeemed). Use `active` to find pending single-use codes.
  public shared query (msg) func adminListJoinInvites() : async [(Text, Types.JoinInviteRecord)] {
    assertAdmin(msg.caller);
    return _Iter.toArray(joinInvitesByCode.entries());
  };

  /// Staff with Studio Users or Finance — Users visibility; admin always.
  private func assertStudioAccountDirectoryVisible(caller : Principal) {
    assertStaffOrAdmin(caller);
    assertStudioFeatureVisibleEither(caller, "users", "financeUsers");
  };

  /// Admin: list trial windows keyed by principal for Studio Users / Finance membership.
  public shared query (msg) func adminListTrialMembershipWindows() : async [(Principal, Types.TrialMembershipWindow)] {
    assertStudioAccountDirectoryVisible(msg.caller);
    _Iter.toArray(membershipTrialWindowByPrincipal.entries());
  };

  /// Admin: create a single-use 8-digit trial invite. Trial starts at redemption and expires after `trialMonths`.
  public shared (msg) func adminCreateTrialJoinInviteCode(role : Types.UserRole, trialMonths : Nat) : async Text {
    assertAdmin(msg.caller);
    if (not roleAllowedForJoinInvite(role)) {
      Debug.trap("Invalid role for join invite");
    };
    if (trialMonths == 0) {
      Debug.trap("trialMonths must be >= 1");
    };
    let now = nowText();
    var attempts : Nat = 0;
    while (attempts < 50) {
      let cand = randomEightDigitCandidate(attempts);
      if (not isJoinInviteCodeTaken(cand)) {
        let rec : Types.JoinInviteRecord = {
          role = role;
          active = true;
          createdAt = now;
        };
        joinInvitesByCode.put(cand, rec);
        joinInviteTrialMonthsByCode.put(cand, trialMonths);
        return cand;
      };
      attempts += 1;
    };
    Debug.trap("Could not allocate trial join code");
  };

  private func assertContactFieldLen(t : Text) {
    if (Text.size(t) > 256) {
      Debug.trap("Contact field too long (max 256 characters)");
    };
  };

  private func emailNowText() : Text {
    Int.toText(Int.abs(Time.now() / 1_000_000_000));
  };

  private func newEmailCampaignId() : Text {
    nextEmailCampaignId := nextEmailCampaignId + 1;
    Nat.toText(nextEmailCampaignId);
  };

  /// Register with an 8-digit invite or artist roster access code — creates an **active** exempt account.
  public shared (msg) func registerWithJoinAccessCode(
    role : Types.UserRole,
    codeRaw : Text,
    firstName : Text,
    lastName : Text,
    email : Text,
  ) : async Types.RegisterWithJoinAccessCodeResult {
    switch (role) {
      case (#admin) { return #wrongRole };
      case (_) {};
    };
    assertContactFieldLen(firstName);
    assertContactFieldLen(lastName);
    assertContactFieldLen(email);
    switch (accountsByPrincipal.get(msg.caller)) {
      case (?_) { return #accountExists };
      case null {};
    };
    let code = normalizeJoinAccessCode(codeRaw);
    if (not isEightDigitAccessCode(code)) {
      return #invalidCode;
    };
    let contact : Types.AccountContact = {
      firstName = firstName;
      lastName = lastName;
      email = email;
    };

    switch (joinInvitesByCode.get(code)) {
      case (?inv) {
        if (not inv.active) {
          return #inviteInactive;
        };
        if (inv.role != role) {
          return #wrongRole;
        };
        let now = nowText();
        let core : Types.UserAccountCore = {
          role = inv.role;
          status = #active;
          linkedArtistId = null;
          linkedOrgId = null;
          updatedAt = now;
        };
        let dm = defaultMembership();
        let m : Types.MembershipFields = switch (joinInviteTrialMonthsByCode.get(code)) {
          case (?months) {
            let startSec = nowSec();
            let endSec = startSec + (months * trialDurationSecPerMonth);
            membershipTrialWindowByPrincipal.put(msg.caller, { startedAtSec = startSec; endsAtSec = endSec });
            {
              dm with
              membershipExemptManual = false;
            };
          };
          case null {
            ignore membershipTrialWindowByPrincipal.remove(msg.caller);
            {
              dm with membershipExemptManual = true;
            };
          };
        };
        putUserAccountParts(core, m, msg.caller);
        accountContactByPrincipal.put(msg.caller, contact);
        let invDone : Types.JoinInviteRecord = {
          inv with active = false;
        };
        joinInvitesByCode.put(code, invDone);
        ignore joinInviteTrialMonthsByCode.remove(code);
        return #ok;
      };
      case null {};
    };

    switch (accessCodeToArtistId.get(code)) {
      case null { return #invalidCode };
      case (?artistId) {
        if (role != #artist) {
          return #wrongRole;
        };
        switch (artistsById.get(artistId)) {
          case null { return #invalidCode };
          case (?rec) {
            if (rec.accessCode != code) {
              return #invalidCode;
            };
            if (principalAlreadyLinkedToArtist(artistId)) {
              return #artistAlreadyLinked;
            };
            let now = nowText();
            let core : Types.UserAccountCore = {
              role = #artist;
              status = #active;
              linkedArtistId = ?artistId;
              linkedOrgId = null;
              updatedAt = now;
            };
            let dm = defaultMembership();
            let m : Types.MembershipFields = {
              dm with membershipExemptManual = true;
            };
            putUserAccountParts(core, m, msg.caller);
            accountContactByPrincipal.put(msg.caller, contact);
            let contactEmail = if (Text.size(rec.profile.contactEmail) == 0) {
              email;
            } else {
              rec.profile.contactEmail;
            };
            let cleared : Types.ArtistRecord = {
              rec with
              accessCode = "";
              profile = { rec.profile with contactEmail = contactEmail };
            };
            putArtistRecord(cleared);
            return #ok;
          };
        };
      };
    };
  };

  /// Self-service: when membership is active (`#ok` or `#exempt`), create a minimal public roster row
  /// and set `linkedArtistId`. Idempotent if already linked. Used by profile settings + post-payment flows.
  private func accountContactEmailForPrincipal(p : Principal) : Text {
    switch (accountContactByPrincipal.get(p)) {
      case null { "" };
      case (?c) { c.email };
    };
  };

  private func backfillArtistContactEmailIfEmpty(artistId : Text, email : Text) {
    if (Text.size(email) == 0) {
      return;
    };
    switch (artistsById.get(artistId)) {
      case null {};
      case (?rec) {
        if (Text.size(rec.profile.contactEmail) == 0) {
          let updated : Types.ArtistRecord = {
            rec with profile = { rec.profile with contactEmail = email };
          };
          putArtistRecord(updated);
        };
      };
    };
  };

  public shared (msg) func ensureMyLinkedArtistProfile() : async Types.EnsureLinkedProfileResult {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      return #noAccount;
    };
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { return #noAccount };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case (?aid) {
            backfillArtistContactEmailIfEmpty(aid, accountContactEmailForPrincipal(msg.caller));
            return #alreadyLinked;
          };
          case null {};
        };
        switch (membershipAccessForPrincipal(msg.caller)) {
          case (#noAccount) { return #noAccount };
          case (#needsSubscription) { return #needsSubscription };
          case (#ok) {};
          case (#exempt) {};
        };
        let pidText = Principal.toText(msg.caller);
        let artistId = "m-" # pidText;
        let now = nowText();
        let contactEmail = accountContactEmailForPrincipal(msg.caller);
        switch (artistsById.get(artistId)) {
          case (?_) {
            backfillArtistContactEmailIfEmpty(artistId, contactEmail);
            let newCore : Types.UserAccountCore = {
              acc with
              linkedArtistId = ?artistId;
              updatedAt = now;
            };
            accountsByPrincipal.put(msg.caller, newCore);
            return #ok;
          };
          case null {};
        };
        let fo : Nat = 999_999;
        let profile : Types.ArtistCore = {
          id = artistId;
          slug = artistId;
          image = "";
          featuredOrder = fo;
          visibility = "inactive";
          updatedAt = now;
          contactEmail = contactEmail;
          filter = null;
          galleryFilter = null;
        };
        let localesJson : Text = "{\"en\":{},\"ja\":{}}";
        let rec : Types.ArtistRecord = {
          profile = profile;
          localesJson = ?localesJson;
          notesEncrypted = null;
          imported = false;
          accessCode = "";
        };
        putArtistRecord(rec);
        let newCore : Types.UserAccountCore = {
          acc with
          linkedArtistId = ?artistId;
          updatedAt = now;
        };
        accountsByPrincipal.put(msg.caller, newCore);
        return #ok;
      };
    };
  };

  // ===== Artists (public reads; writes staff/admin) =====

  private func setHeroProfileImageForArtist(artistId : Text, url : Text) {
    if (Text.size(url) == 0) {
      ignore artistHeroProfileImageById.remove(artistId);
    } else {
      artistHeroProfileImageById.put(artistId, url);
    };
  };

  private func setHeroProfileImageApprovedForArtist(artistId : Text, approved : Bool) {
    if (approved) {
      artistHeroProfileImageApprovedById.put(artistId, true);
    } else {
      ignore artistHeroProfileImageApprovedById.remove(artistId);
    };
  };

  private func artistPublicFromCore(core : Types.ArtistCore, id : Text) : Types.Artist {
    let mrp = switch (mostRecentProgramByArtistId.get(id)) {
      case (?t) { t };
      case null { "" };
    };
    let cohortOpt : ?[Nat] = switch (artistFilterCohortYearsById.get(id)) {
      case null { null };
      case (?ys) { ?ys };
    };
    let hero : Text = switch (artistHeroProfileImageById.get(id)) {
      case null { "" };
      case (?t) { t };
    };
    let heroApproved = heroProfileImageApprovedForArtist(id);
    {
      id = core.id;
      slug = core.slug;
      image = core.image;
      heroProfileImage = hero;
      heroProfileImageApproved = heroApproved;
      featuredOrder = core.featuredOrder;
      visibility = core.visibility;
      updatedAt = core.updatedAt;
      filter = Types.mergeArtistFilterForPublic(core.filter, cohortOpt);
      galleryFilter = core.galleryFilter;
      mostRecentProgram = mrp;
    };
  };

  public query func listArtists() : async [Types.Artist] {
    let vals = _Iter.toArray(artistsById.vals());
    let sorted = Array.sort(
      vals,
      func(a : Types.ArtistRecord, b : Types.ArtistRecord) : Order.Order {
        if (a.profile.featuredOrder < b.profile.featuredOrder) {
          #less;
        } else if (a.profile.featuredOrder > b.profile.featuredOrder) {
          #greater;
        } else {
          #equal;
        };
      },
    );
    let filtered = Array.filter<Types.ArtistRecord>(
      sorted,
      func(r : Types.ArtistRecord) : Bool {
        artistIncludedInPublicFeeds(r.profile);
      },
    );
    Array.map<Types.ArtistRecord, Types.Artist>(
      filtered,
      func(r : Types.ArtistRecord) : Types.Artist {
        artistPublicFromCore(r.profile, r.profile.id);
      },
    );
  };

  public query func getArtistBySlug(slug : Text) : async ?Types.Artist {
    switch (artistSlugToId.get(slug)) {
      case null { null };
      case (?id) {
        switch (artistsById.get(id)) {
          case null { null };
          case (?rec) { ?artistPublicFromCore(rec.profile, rec.profile.id) };
        };
      };
    };
  };

  /// Public: artist id → stored most-recent program key (for merging with `listArtistRecordsPublic` in the client).
  public query func listArtistMostRecentPrograms() : async [(Text, Text)] {
    _Iter.toArray(mostRecentProgramByArtistId.entries());
  };

  private func sanitizeArtistRecordForPublic(rec : Types.ArtistRecord) : Types.ArtistRecord {
    {
      rec with
      accessCode = "";
      profile = { rec.profile with contactEmail = "" };
    };
  };

  /// Private profiles stay out of feed pools; direct `/profile/:slug` reads still use `getArtistRecordBySlug`.
  /// Public marketing feeds / listArtists: only `public` rows (not private, pending, or inactive).
  private func isValidArtistRosterVisibility(visibility : Text) : Bool {
    visibility == "inactive" or visibility == "pending" or visibility == "private" or visibility == "public";
  };

  /// Legacy stored values: map empty/unknown to `public` so existing mainnet rows stay listable until edited in Studio.
  private func normalizeArtistRosterVisibility(visibility : Text) : Text {
    if (isValidArtistRosterVisibility(visibility)) {
      visibility;
    } else {
      "public";
    };
  };

  private func artistIncludedInPublicFeeds(profile : Types.ArtistCore) : Bool {
    profile.visibility == "public";
  };

  /// Public roster with `localesJson` for feeds/cards (name, discipline). Strips `accessCode`.
  public query func listArtistRecordsPublic() : async [Types.ArtistRecord] {
    let vals = _Iter.toArray(artistsById.vals());
    let sorted = Array.sort(
      vals,
      func(a : Types.ArtistRecord, b : Types.ArtistRecord) : Order.Order {
        if (a.profile.featuredOrder < b.profile.featuredOrder) {
          #less;
        } else if (a.profile.featuredOrder > b.profile.featuredOrder) {
          #greater;
        } else {
          #equal;
        };
      },
    );
    let filtered = Array.filter<Types.ArtistRecord>(
      sorted,
      func(r : Types.ArtistRecord) : Bool {
        artistIncludedInPublicFeeds(r.profile);
      },
    );
    Array.map<Types.ArtistRecord, Types.ArtistRecord>(
      filtered,
      sanitizeArtistRecordForPublic,
    );
  };

  /// Public: featured strip curation (featurable pool, manual order, random mode) — separate from `ArtistCore`.
  public query func getArtistFeaturedGalleryPublic() : async Types.ArtistFeaturedGalleryPublic {
    {
      randomFeatured = artistFeaturedRandomModeStable;
      manualFeaturedIds = manualFeaturedIdsAsArray();
      featurableIds = featurableIdsSorted();
    };
  };

  public shared (msg) func staffSetArtistFeaturedFeaturable(artistId : Text, featurable : Bool) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "home");
    switch (artistsById.get(artistId)) {
      case null { Debug.trap("Unknown artist id") };
      case (?_) {
        if (featurable) {
          artistFeaturedFeaturableById.put(artistId, true);
        } else {
          ignore artistFeaturedFeaturableById.remove(artistId);
        };
      };
    };
  };

  /// Staff/admin: add/remove artist from the manual featured list (max 8). Returns 1-based slot or 0 if not featured.
  public shared (msg) func staffSetManualFeaturedForArtist(artistId : Text, featured : Bool) : async Nat {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "home");
    switch (artistsById.get(artistId)) {
      case null { Debug.trap("Unknown artist id") };
      case (?_) {
        if (featured) {
          switch (indexOfManualFeatured(artistId)) {
            case (?idx) { idx + 1 };
            case null {
              let n = manualFeaturedArtistIds.size();
              if (n >= maxManualFeaturedStrip) {
                Debug.trap("At most 8 featured artists");
              };
              manualFeaturedArtistIds.add(artistId);
              manualFeaturedArtistIds.size();
            };
          };
        } else {
          removeManualFeaturedId(artistId);
          0;
        };
      };
    };
  };

  /// Staff/admin: when true, clients pick randomly from the featurable pool for the strip.
  public shared (msg) func staffSetArtistFeaturedRandomMode(on : Bool) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "home");
    artistFeaturedRandomModeStable := on;
  };

  private func artistRecordBySlugPublic(slug : Text) : ?Types.ArtistRecord {
    switch (artistSlugToId.get(slug)) {
      case null { null };
      case (?id) {
        switch (artistsById.get(id)) {
          case null { null };
          case (?rec) { ?sanitizeArtistRecordForPublic(rec) };
        };
      };
    };
  };

  /// Full row including optional `localesJson` for profile parity with testData.
  /// Strips `accessCode` so public callers never receive onboarding codes.
  public query func getArtistRecordBySlug(slug : Text) : async ?Types.ArtistRecord {
    artistRecordBySlugPublic(slug);
  };

  /// Alias for public profile reads (same projection as `getArtistRecordBySlug`).
  public query func getPublicProfileBySlug(slug : Text) : async ?Types.ArtistRecord {
    artistRecordBySlugPublic(slug);
  };

  /// Authenticated: full `ArtistRecord` for the caller when `linkedArtistId` is set (includes access code for the owner).
  public shared query (msg) func getMyArtistRecord() : async ?Types.ArtistRecord {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      return null;
    };
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { null };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { null };
          case (?aid) { artistsById.get(aid) };
        };
      };
    };
  };

  /// Authenticated: merged program applications JSON (object keyed by programId) for the linked artist. Separate from `ArtistRecord` so `artistsStable` stays stable-compatible.
  public shared query (msg) func getMyArtistApplicationsJson() : async ?Text {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      return null;
    };
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { null };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { null };
          case (?aid) { buildAppliedJsonForArtist(aid) };
        };
      };
    };
  };

  private func programPaymentKey(p : Principal, programId : Text) : Text {
    Principal.toText(p) # "|" # programId;
  };

  private func jsonText(v : Text) : Text {
    let slashEscaped = Text.replace(v, #char('\\'), "\\\\");
    "\"" # Text.replace(slashEscaped, #char('\"'), "\\\"") # "\"";
  };

  private func optJsonText(v : ?Text) : Text {
    switch (v) {
      case null { "null" };
      case (?s) { jsonText(s) };
    };
  };

  private func jsonBool(v : Bool) : Text {
    if (v) { "true" } else { "false" };
  };

  private func natSubFloor(a : Nat, b : Nat) : Nat {
    let diff : Int = (a : Int) - (b : Int);
    if (diff > 0) { Int.abs(diff) } else { 0 };
  };

  private func applicantStatusText(status : Types.ApplicantStatus) : Text {
    switch (status) {
      case (#pending) { "pending" };
      case (#reviewing) { "reviewing" };
      case (#postInterviewReview) { "postInterviewReview" };
      case (#needsInfo) { "needsInfo" };
      case (#accepted) { "accepted" };
      case (#rejected) { "rejected" };
      case (#pulledOut) { "pulledOut" };
    };
  };

  private let maxApplicantOutreachFieldChars : Nat = 512;
  private let maxApplicantOutreachJsonChars : Nat = 65536;

  private func assertApplicantOutreachFieldLen(t : Text) {
    if (Text.size(t) > maxApplicantOutreachFieldChars) {
      Debug.trap("Outreach field too long");
    };
  };

  private func applicantOutreachSentAtText() : Text {
    Int.toText(Int.abs(Time.now() / 1_000_000_000));
  };

  private func applicantEmailOutreachEntryJson(
    sentAt : Text,
    subject : Text,
    templateId : Text,
    templateName : Text,
  ) : Text {
    "{"
    # "\"sentAt\":" # jsonText(sentAt)
    # ",\"subject\":" # jsonText(subject)
    # ",\"templateId\":" # jsonText(templateId)
    # ",\"templateName\":" # jsonText(templateName)
    # "}";
  };

  private func textDropLastChar(t : Text) : Text {
    let size = Text.size(t);
    if (size == 0) {
      return t;
    };
    let buf = Buffer.Buffer<Char>(size);
    var i : Nat = 0;
    label drop for (c in Text.toIter(t)) {
      if (i + 1 >= size) {
        break drop;
      };
      buf.add(c);
      i += 1;
    };
    Text.fromIter(buf.vals());
  };

  private func appendOutreachJsonArray(existing : Text, entryJson : Text) : Text {
    let trimmed = Text.trim(existing, #char ' ');
    if (trimmed.size() == 0 or trimmed == "[]") {
      return "[" # entryJson # "]";
    };
    let body = textDropLastChar(trimmed);
    body # "," # entryJson # "]";
  };

  private func applicantExistsForOutreach(applicantId : Text) : Bool {
    switch (applicantsById.get(applicantId)) {
      case (?_) { true };
      case null {
        switch (archivedApplicantsById.get(applicantId)) {
          case (?_) { true };
          case null { false };
        };
      };
    };
  };

  private func accountLinkedArtistId(p : Principal) : ?Text {
    switch (accountsByPrincipal.get(p)) {
      case null { null };
      case (?acc) { acc.linkedArtistId };
    };
  };

  private func trimContactEmail(email : Text) : Text {
    Text.trim(email, #char ' ');
  };

  private func acceptedApplicantRecordsForCaller(p : Principal) : [Types.ApplicantRecord] {
    let aid = switch (accountLinkedArtistId(p)) {
      case null { "" };
      case (?id) { id };
    };
    let prefix = aid # "|";
    let callerEmail = trimContactEmail(accountContactEmailForPrincipal(p));
    let buf = Buffer.Buffer<Types.ApplicantRecord>(4);
    let seen = _HashMap.HashMap<Text, Bool>(0, Text.equal, Text.hash);
    for ((_, rec) in applicantsById.entries()) {
      let include = switch (rec.status) {
        case (#accepted) {
          (aid.size() > 0 and Text.startsWith(rec.id, #text prefix))
          or (callerEmail.size() > 0 and trimContactEmail(rec.email) == callerEmail);
        };
        case _ { false };
      };
      if (include) {
        switch (seen.get(rec.id)) {
          case (?_) {};
          case null {
            seen.put(rec.id, true);
            buf.add(rec);
          };
        };
      };
    };
    Buffer.toArray(buf);
  };

  private func acceptedApplicantJsonForCaller(p : Principal) : Text {
    let recs = acceptedApplicantRecordsForCaller(p);
    var first : Bool = true;
    var out : Text = "[";
    for (rec in recs.vals()) {
      if (not first) { out := out # "," };
      first := false;
      out := out
        # "{\"applicationId\":" # jsonText(rec.id)
        # ",\"programId\":" # jsonText(rec.programId)
        # ",\"status\":" # jsonText(applicantStatusText(rec.status))
        # ",\"email\":" # jsonText(rec.email)
        # ",\"fullName\":" # jsonText(rec.fullName)
        # ",\"createdAt\":" # jsonText(rec.createdAt)
        # ",\"applicantCategory\":" # jsonText(applicantCategoryFromPayloadJson(rec.payloadJson))
        # ",\"manualDepositSubmitted\":" # jsonBool(applicantRecordHasManualDepositSubmitted(rec.id))
        # "}";
    };
    out # "]";
  };

  private func hasAcceptedApplicantForProgram(p : Principal, programId : Text) : Bool {
    for (rec in acceptedApplicantRecordsForCaller(p).vals()) {
      if (rec.programId == programId) {
        return true;
      };
    };
    false;
  };

  private func effectiveProgramPaymentSummary(s : Types.ProgramPaymentSummary) : Types.ProgramPaymentSummary {
    if (applicantRecordHasManualDepositSubmitted(s.applicationId)) {
      return { s with depositStatus = "paid" };
    };
    if (s.depositAmountCents > 0 and s.totalPaidCents >= s.depositAmountCents) {
      if (s.totalDueCents > 0 and s.totalPaidCents >= s.totalDueCents) {
        return { s with depositStatus = "paid_full" };
      };
      if (s.depositStatus != "paid" and s.depositStatus != "paid_full") {
        return { s with depositStatus = "paid" };
      };
    };
    s;
  };

  private func synthesizeManualDepositSummary(
    p : Principal,
    rec : Types.ApplicantRecord,
    updatedAt : Text,
  ) : Types.ProgramPaymentSummary {
    let key = programPaymentKey(p, rec.programId);
    let category = applicantCategoryFromPayloadJson(rec.payloadJson);
    let totalDefault = memberProgramTotalDueCents(category, false);
    let depositDefault : Nat = 100000;
    let outstandingDefault = if (totalDefault > depositDefault) { totalDefault - depositDefault } else { 0 };
    {
      key = key;
      principal = p;
      programId = rec.programId;
      applicationId = rec.id;
      depositStatus = "paid";
      totalDueCents = totalDefault;
      depositAmountCents = depositDefault;
      totalPaidCents = depositDefault;
      outstandingCents = outstandingDefault;
      refundedCents = 0;
      activePlanId = null;
      updatedAt = updatedAt;
    };
  };

  private func programPaymentSummaryJson(s : Types.ProgramPaymentSummary) : Text {
    let flightPreference = programPaymentFlightPreferencesByKey.get(s.key);
    let ownFlight = switch (flightPreference) {
      case null { false };
      case (?pref) { pref.ownFlight };
    };
    let category = applicantCategoryForApplicationId(s.applicationId);
    let categoryDiscountCents = if (category == "veteran") { PROGRAM_VETERAN_DISCOUNT_CENTS } else { 0 };
    let flightCreditCents = if (ownFlight) { PROGRAM_OWN_FLIGHT_CREDIT_CENTS } else { 0 };
    let effectiveTotalDueCents = applicantEffectiveTotalDueFromPayload(
      applicantPayloadJsonForApplicationId(s.applicationId),
      category,
      ownFlight,
    );
    let effectiveOutstandingCents = natSubFloor(effectiveTotalDueCents, s.totalPaidCents);
    "{"
      # "\"key\":" # jsonText(s.key)
      # ",\"principal\":" # jsonText(Principal.toText(s.principal))
      # ",\"programId\":" # jsonText(s.programId)
      # ",\"applicationId\":" # jsonText(s.applicationId)
      # ",\"depositStatus\":" # jsonText(s.depositStatus)
      # ",\"totalDueCents\":" # Nat.toText(effectiveTotalDueCents)
      # ",\"depositAmountCents\":" # Nat.toText(s.depositAmountCents)
      # ",\"totalPaidCents\":" # Nat.toText(s.totalPaidCents)
      # ",\"outstandingCents\":" # Nat.toText(effectiveOutstandingCents)
      # ",\"refundedCents\":" # Nat.toText(s.refundedCents)
      # ",\"ownFlight\":" # jsonBool(ownFlight)
      # ",\"flightCreditCents\":" # Nat.toText(flightCreditCents)
      # ",\"applicantCategory\":" # jsonText(category)
      # ",\"categoryDiscountCents\":" # Nat.toText(categoryDiscountCents)
      # ",\"activePlanId\":" # optJsonText(s.activePlanId)
      # ",\"updatedAt\":" # jsonText(s.updatedAt)
      # "}";
  };

  private func programPaymentLedgerJson(row : Types.ProgramPaymentLedgerRow) : Text {
    "{"
      # "\"id\":" # jsonText(row.id)
      # ",\"principal\":" # jsonText(Principal.toText(row.principal))
      # ",\"programId\":" # jsonText(row.programId)
      # ",\"applicationId\":" # jsonText(row.applicationId)
      # ",\"paymentType\":" # jsonText(row.paymentType)
      # ",\"amountCents\":" # Nat.toText(row.amountCents)
      # ",\"currency\":" # jsonText(row.currency)
      # ",\"stripePaymentIntentId\":" # jsonText(row.stripePaymentIntentId)
      # ",\"stripeChargeId\":" # jsonText(row.stripeChargeId)
      # ",\"stripeReceiptUrl\":" # jsonText(row.stripeReceiptUrl)
      # ",\"status\":" # jsonText(row.status)
      # ",\"createdAt\":" # jsonText(row.createdAt)
      # ",\"dueAt\":" # optJsonText(row.dueAt)
      # ",\"feeCents\":" # Nat.toText(row.feeCents)
      # ",\"staffNote\":" # jsonText(row.staffNote)
      # ",\"paymentProvider\":" # jsonText(row.paymentProvider)
      # ",\"externalPaymentId\":" # jsonText(row.externalPaymentId)
      # ",\"externalChargeId\":" # jsonText(row.externalChargeId)
      # ",\"externalReceiptUrl\":" # jsonText(row.externalReceiptUrl)
      # "}";
  };

  private func programPaymentPlanJson(plan : Types.ProgramPaymentPlan) : Text {
    "{"
      # "\"id\":" # jsonText(plan.id)
      # ",\"principal\":" # jsonText(Principal.toText(plan.principal))
      # ",\"programId\":" # jsonText(plan.programId)
      # ",\"applicationId\":" # jsonText(plan.applicationId)
      # ",\"stripeSubscriptionId\":" # jsonText(plan.stripeSubscriptionId)
      # ",\"stripeScheduleId\":" # jsonText(plan.stripeScheduleId)
      # ",\"installmentCount\":" # Nat.toText(plan.installmentCount)
      # ",\"installmentAmountCents\":" # Nat.toText(plan.installmentAmountCents)
      # ",\"currency\":" # jsonText(plan.currency)
      # ",\"status\":" # jsonText(plan.status)
      # ",\"startAt\":" # jsonText(plan.startAt)
      # ",\"endAt\":" # jsonText(plan.endAt)
      # ",\"createdAt\":" # jsonText(plan.createdAt)
      # ",\"updatedAt\":" # jsonText(plan.updatedAt)
      # "}";
  };

  /// Authenticated: program payment state for payable accepted applications.
  public shared query (msg) func getMyProgramPaymentsJson() : async Text {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      return "{\"approvedPrograms\":[],\"summaries\":[],\"ledger\":[],\"plans\":[]}";
    };
    let principal = msg.caller;
    let includedSummaryKeys = _HashMap.HashMap<Text, Bool>(0, Text.equal, Text.hash);
    var summaries : Text = "[";
    var firstSummary = true;
    for ((_, s) in programPaymentSummariesByKey.entries()) {
      if (Principal.equal(s.principal, principal)) {
        includedSummaryKeys.put(s.key, true);
        if (not firstSummary) { summaries := summaries # "," };
        firstSummary := false;
        summaries := summaries # programPaymentSummaryJson(effectiveProgramPaymentSummary(s));
      };
    };
    for (rec in acceptedApplicantRecordsForCaller(principal).vals()) {
      if (applicantRecordHasManualDepositSubmitted(rec.id)) {
        let key = programPaymentKey(principal, rec.programId);
        switch (includedSummaryKeys.get(key)) {
          case (?_) {};
          case null {
            includedSummaryKeys.put(key, true);
            if (not firstSummary) { summaries := summaries # "," };
            firstSummary := false;
            summaries := summaries # programPaymentSummaryJson(
              synthesizeManualDepositSummary(principal, rec, rec.createdAt),
            );
          };
        };
      };
    };
    summaries := summaries # "]";

    var ledger : Text = "[";
    var firstLedger = true;
    for ((_, row) in programPaymentLedgerById.entries()) {
      if (Principal.equal(row.principal, principal)) {
        if (not firstLedger) { ledger := ledger # "," };
        firstLedger := false;
        ledger := ledger # programPaymentLedgerJson(row);
      };
    };
    ledger := ledger # "]";

    var plans : Text = "[";
    var firstPlan = true;
    for ((_, plan) in programPaymentPlansById.entries()) {
      if (Principal.equal(plan.principal, principal)) {
        if (not firstPlan) { plans := plans # "," };
        firstPlan := false;
        plans := plans # programPaymentPlanJson(plan);
      };
    };
    plans := plans # "]";

    "{\"approvedPrograms\":" # acceptedApplicantJsonForCaller(principal)
      # ",\"summaries\":" # summaries
      # ",\"ledger\":" # ledger
      # ",\"plans\":" # plans
      # "}";
  };

  /// Staff Finance Programs: all program payment summaries, ledger rows, and plans.
  public shared query (msg) func staffGetProgramPaymentsFinanceJson() : async Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "financePrograms");
    var summaries : Text = "[";
    var firstSummary = true;
    for ((_, s) in programPaymentSummariesByKey.entries()) {
      if (not firstSummary) { summaries := summaries # "," };
      firstSummary := false;
      summaries := summaries # programPaymentSummaryJson(s);
    };
    summaries := summaries # "]";

    var ledger : Text = "[";
    var firstLedger = true;
    for ((_, row) in programPaymentLedgerById.entries()) {
      if (not firstLedger) { ledger := ledger # "," };
      firstLedger := false;
      ledger := ledger # programPaymentLedgerJson(row);
    };
    ledger := ledger # "]";

    var plans : Text = "[";
    var firstPlan = true;
    for ((_, plan) in programPaymentPlansById.entries()) {
      if (not firstPlan) { plans := plans # "," };
      firstPlan := false;
      plans := plans # programPaymentPlanJson(plan);
    };
    plans := plans # "]";

    "{\"summaries\":" # summaries # ",\"ledger\":" # ledger # ",\"plans\":" # plans # "}";
  };

  private func extractJsonNatField(json : Text, key : Text) : Nat {
    let marker = "\"" # key # "\":";
    let parts = _Iter.toArray(Text.split(json, #text(marker)));
    if (parts.size() < 2) {
      return 0;
    };
    let tail = parts[1];
    var digits : Text = "";
    for (c in tail.chars()) {
      if (c >= '0' and c <= '9') {
        digits := digits # Text.fromChar(c);
      } else if (digits.size() > 0) {
        // stop after first number token
        // (Motoko has no break — use return after parse)
        return switch (Nat.fromText(digits)) {
          case null { 0 };
          case (?n) { n };
        };
      } else if (c != ' ' and c != '\t' and c != '\n' and c != '\r') {
        return 0;
      };
    };
    switch (Nat.fromText(digits)) {
      case null { 0 };
      case (?n) { n };
    };
  };

  private func applicantEffectiveTotalDueFromPayload(payloadJson : Text, category : Text, ownFlight : Bool) : Nat {
    let sponsorshipMode = extractJsonStringField(payloadJson, "sponsorshipMode");
    if (sponsorshipMode == "full") {
      return 0;
    };
    let special = extractJsonNatField(payloadJson, "specialProgramTotalCents");
    let base =
      if (special > 0) { special } else { memberProgramTotalDueCents(category, ownFlight) };
    if (sponsorshipMode == "partial") {
      var credit = extractJsonNatField(payloadJson, "sponsoredCreditCents");
      if (credit == 0) {
        let pct = extractJsonNatField(payloadJson, "sponsoredPercent");
        if (pct > 0 and pct <= 100) {
          credit := (base * pct) / 100;
        };
      };
      if (base > credit) { base - credit } else { 0 };
    } else {
      base
    };
  };

  private func applicantPayloadJsonForApplicationId(applicationId : Text) : Text {
    let recOpt = switch (applicantsById.get(applicationId)) {
      case (?rec) { ?rec };
      case null { archivedApplicantsById.get(applicationId) };
    };
    switch (recOpt) {
      case null { "{}" };
      case (?rec) { rec.payloadJson };
    };
  };

  private func effectiveTotalDueForStaffLedger(
    principal : Principal,
    programId : Text,
    applicationId : Text,
  ) : Nat {
    let category = applicantCategoryForApplicationId(applicationId);
    let flightPref = programPaymentFlightPreferencesByKey.get(programPaymentKey(principal, programId));
    let ownFlight = switch (flightPref) {
      case null { false };
      case (?pref) { pref.ownFlight };
    };
    let payloadJson = applicantPayloadJsonForApplicationId(applicationId);
    applicantEffectiveTotalDueFromPayload(payloadJson, category, ownFlight);
  };

  public shared (msg) func staffRecordManualProgramLedgerEntry(
    applicantId : Text,
    programId : Text,
    amountCents : Nat,
    feeCents : Nat,
    staffNote : Text,
    recordedAt : Text,
    entryKind : Text,
  ) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePrograms");
    if (applicantId.size() == 0 or programId.size() == 0) {
      Debug.trap("applicantId and programId required");
    };
    if (amountCents == 0 and feeCents == 0) {
      Debug.trap("amountCents or feeCents required");
    };
    let principal = switch (principalForApplicantId(applicantId)) {
      case null { Debug.trap("Linked member account required for manual ledger entry") };
      case (?p) { p };
    };
    let rowIdPrefix =
      if (amountCents > 0) { "staff-manual-" }
      else if (entryKind == "travel") { "staff-travel-" }
      else { "staff-manual-" };
    let rowId = rowIdPrefix # applicantId # "-" # recordedAt;
    switch (programPaymentLedgerById.get(rowId)) {
      case (?_) { return };
      case null {};
    };
    let paymentType =
      if (amountCents > 0) { "staff_manual" }
      else if (entryKind == "travel") { "staff_travel" }
      else { "staff_fee" };
    let row : Types.ProgramPaymentLedgerRow = {
      id = rowId;
      principal = principal;
      programId = programId;
      applicationId = applicantId;
      paymentType = paymentType;
      amountCents = amountCents;
      currency = "usd";
      stripePaymentIntentId = "";
      stripeChargeId = "";
      stripeReceiptUrl = "";
      status = "succeeded";
      createdAt = recordedAt;
      dueAt = null;
      feeCents = feeCents;
      staffNote = staffNote;
      paymentProvider = "staff";
      externalPaymentId = "";
      externalChargeId = "";
      externalReceiptUrl = "";
    };
    let totalDueCents = effectiveTotalDueForStaffLedger(principal, programId, applicantId);
    let depositAmountCents = switch (programPaymentSummariesByKey.get(programPaymentKey(principal, programId))) {
      case (?s) {
        if (s.depositAmountCents > 0) { s.depositAmountCents } else { 100000 };
      };
      case null { 100000 };
    };
    programPaymentLedgerById.put(rowId, row);
    putProgramPaymentSummaryFromLedger(row, totalDueCents, depositAmountCents, 0);
  };

  /// Staff Finance: edit or soft-void a staff-provider ledger row (not PayPal/Stripe).
  public shared (msg) func staffUpdateManualProgramLedgerEntry(
    paymentId : Text,
    amountCents : Nat,
    feeCents : Nat,
    staffNote : Text,
    status : Text,
  ) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePrograms");
    if (paymentId.size() == 0) {
      Debug.trap("paymentId required");
    };
    let existing = switch (programPaymentLedgerById.get(paymentId)) {
      case null { Debug.trap("Ledger row not found") };
      case (?r) { r };
    };
    if (existing.paymentProvider != "staff") {
      Debug.trap("Only staff ledger rows can be edited");
    };
    let nextStatus =
      if (status == "voided" or status == "canceled" or status == "cancelled") { "voided" }
      else if (status == "succeeded" or status == "paid" or status == "") { "succeeded" }
      else { Debug.trap("Invalid status") };
    if (nextStatus == "succeeded" and amountCents == 0 and feeCents == 0) {
      Debug.trap("amountCents or feeCents required");
    };
    let editedNote =
      if (Text.contains(staffNote, #text "[edited ")) { staffNote }
      else if (staffNote.size() > 0) { staffNote # " [edited]" }
      else { "[edited]" };
    let row : Types.ProgramPaymentLedgerRow = {
      id = existing.id;
      principal = existing.principal;
      programId = existing.programId;
      applicationId = existing.applicationId;
      paymentType = existing.paymentType;
      amountCents = amountCents;
      currency = existing.currency;
      stripePaymentIntentId = existing.stripePaymentIntentId;
      stripeChargeId = existing.stripeChargeId;
      stripeReceiptUrl = existing.stripeReceiptUrl;
      status = nextStatus;
      createdAt = existing.createdAt;
      dueAt = existing.dueAt;
      feeCents = feeCents;
      staffNote = editedNote;
      paymentProvider = existing.paymentProvider;
      externalPaymentId = existing.externalPaymentId;
      externalChargeId = existing.externalChargeId;
      externalReceiptUrl = existing.externalReceiptUrl;
    };
    let totalDueCents = effectiveTotalDueForStaffLedger(existing.principal, existing.programId, existing.applicationId);
    let depositAmountCents = switch (programPaymentSummariesByKey.get(programPaymentKey(existing.principal, existing.programId))) {
      case (?s) {
        if (s.depositAmountCents > 0) { s.depositAmountCents } else { 100000 };
      };
      case null { 100000 };
    };
    let oldPaidContribution =
      if ((existing.status == "succeeded" or existing.status == "paid") and existing.paymentType != "refund") {
        existing.amountCents
      } else { 0 };
    let newPaidContribution =
      if ((nextStatus == "succeeded" or nextStatus == "paid") and row.paymentType != "refund") {
        amountCents
      } else { 0 };
    programPaymentLedgerById.put(paymentId, row);
    let key = programPaymentKey(existing.principal, existing.programId);
    let prior = programPaymentSummariesByKey.get(key);
    let priorPaid = switch (prior) {
      case null { 0 };
      case (?s) { s.totalPaidCents };
    };
    let priorPlan = switch (prior) {
      case null { null };
      case (?s) { s.activePlanId };
    };
    let nextPaid = natSubFloor(priorPaid + newPaidContribution, oldPaidContribution);
    let outstanding = natSubFloor(totalDueCents, nextPaid);
    let depositStatus =
      if (nextPaid >= totalDueCents and totalDueCents > 0) {
        "paid_full"
      } else if (nextPaid >= depositAmountCents and depositAmountCents > 0) {
        "paid"
      } else if (nextPaid == 0) {
        "due"
      } else {
        switch (prior) {
          case null { "due" };
          case (?s) { s.depositStatus };
        };
      };
    let summary : Types.ProgramPaymentSummary = {
      key = key;
      principal = existing.principal;
      programId = existing.programId;
      applicationId = existing.applicationId;
      depositStatus = depositStatus;
      totalDueCents = totalDueCents;
      depositAmountCents = depositAmountCents;
      totalPaidCents = nextPaid;
      outstandingCents = outstanding;
      refundedCents = switch (prior) {
        case null { 0 };
        case (?s) { s.refundedCents };
      };
      activePlanId = priorPlan;
      updatedAt = Int.toText(Time.now());
    };
    programPaymentSummariesByKey.put(key, summary);
  };

  private func financePromotionJson(p : Types.FinancePromotion) : Text {
    "{"
      # "\"id\":" # jsonText(p.id)
      # ",\"name\":" # jsonText(p.name)
      # ",\"company\":" # jsonText(p.company)
      # ",\"startIso\":" # jsonText(p.startIso)
      # ",\"endIso\":" # jsonText(p.endIso)
      # ",\"target\":" # jsonText(p.target)
      # ",\"programId\":" # jsonText(p.programId)
      # ",\"costCents\":" # Nat.toText(p.costCents)
      # ",\"status\":" # jsonText(p.status)
      # ",\"createdAt\":" # jsonText(p.createdAt)
      # ",\"updatedAt\":" # jsonText(p.updatedAt)
      # ",\"createdBy\":" # jsonText(p.createdBy)
      # "}"
  };

  public shared query (msg) func staffListPromotionsJson() : async Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisibleEither(msg.caller, "financePrograms", "financePromotions");
    var out : Text = "[";
    var first = true;
    for ((_, p) in financePromotionsById.entries()) {
      if (p.status != "archived") {
        if (not first) { out := out # "," };
        first := false;
        out := out # financePromotionJson(p);
      };
    };
    out # "]"
  };

  public shared (msg) func staffUpsertPromotion(
    id : Text,
    name : Text,
    company : Text,
    startIso : Text,
    endIso : Text,
    target : Text,
    programId : Text,
    costCents : Nat,
  ) : async Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePromotions");
    let trimmedName = Text.trim(name, #char ' ');
    if (trimmedName.size() == 0) {
      Debug.trap("name required");
    };
    let targetNorm =
      if (target == "program") { "program" }
      else { "platform" };
    if (targetNorm == "program" and Text.trim(programId, #char ' ').size() == 0) {
      Debug.trap("programId required for program target");
    };
    let now = Int.toText(Time.now());
    let existingId = Text.trim(id, #char ' ');
    let rowId =
      if (existingId.size() > 0) { existingId }
      else { "promo-" # Principal.toText(msg.caller) # "-" # now };
    let prior = financePromotionsById.get(rowId);
    let createdAt = switch (prior) {
      case (?p) { p.createdAt };
      case null { now };
    };
    let createdBy = switch (prior) {
      case (?p) { p.createdBy };
      case null { Principal.toText(msg.caller) };
    };
    let row : Types.FinancePromotion = {
      id = rowId;
      name = trimmedName;
      company = Text.trim(company, #char ' ');
      startIso = Text.trim(startIso, #char ' ');
      endIso = Text.trim(endIso, #char ' ');
      target = targetNorm;
      programId = if (targetNorm == "program") { Text.trim(programId, #char ' ') } else { "" };
      costCents = costCents;
      status = "active";
      createdAt = createdAt;
      updatedAt = now;
      createdBy = createdBy;
    };
    financePromotionsById.put(rowId, row);
    rowId
  };

  public shared (msg) func staffArchivePromotion(id : Text) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePromotions");
    let rowId = Text.trim(id, #char ' ');
    if (rowId.size() == 0) {
      Debug.trap("id required");
    };
    switch (financePromotionsById.get(rowId)) {
      case null { Debug.trap("Promotion not found") };
      case (?p) {
        financePromotionsById.put(rowId, {
          p with
          status = "archived";
          updatedAt = Int.toText(Time.now());
        });
      };
    };
  };

  private func programTeamOwedEntryJson(e : Types.ProgramTeamOwedEntry) : Text {
    "{"
      # "\"id\":" # jsonText(e.id)
      # ",\"teamMemberId\":" # jsonText(e.teamMemberId)
      # ",\"programId\":" # jsonText(e.programId)
      # ",\"name\":" # jsonText(e.name)
      # ",\"description\":" # jsonText(e.description)
      # ",\"dateIso\":" # jsonText(e.dateIso)
      # ",\"amountCents\":" # Nat.toText(e.amountCents)
      # ",\"createdAt\":" # jsonText(e.createdAt)
      # ",\"updatedAt\":" # jsonText(e.updatedAt)
      # ",\"createdBy\":" # jsonText(e.createdBy)
      # ",\"status\":" # jsonText(e.status)
      # "}"
  };

  private func normalizePaymentService(raw : Text) : Text {
    let t = Text.toLowercase(Text.trim(raw, #char ' '));
    if (t == "stripe" or t == "paypal" or t == "wire" or t == "cash" or t == "other") {
      t
    } else {
      "other"
    }
  };

  /// "admin" (default) | "program"
  private func normalizePaidFundedBy(raw : Text) : Text {
    let t = Text.toLowercase(Text.trim(raw, #char ' '));
    if (t == "program") { "program" } else { "admin" }
  };

  private func paidEntryFundedBy(entryId : Text) : Text {
    switch (programTeamPaidFundedByById.get(entryId)) {
      case (?v) { normalizePaidFundedBy(v) };
      case null { "admin" };
    }
  };

  private func programTeamPaidEntryJson(e : Types.ProgramTeamPaidEntry) : Text {
    "{"
      # "\"id\":" # jsonText(e.id)
      # ",\"teamMemberId\":" # jsonText(e.teamMemberId)
      # ",\"programId\":" # jsonText(e.programId)
      # ",\"name\":" # jsonText(e.name)
      # ",\"description\":" # jsonText(e.description)
      # ",\"dateIso\":" # jsonText(e.dateIso)
      # ",\"amountCents\":" # Nat.toText(e.amountCents)
      # ",\"paymentService\":" # jsonText(e.paymentService)
      # ",\"fundedBy\":" # jsonText(paidEntryFundedBy(e.id))
      # ",\"createdAt\":" # jsonText(e.createdAt)
      # ",\"updatedAt\":" # jsonText(e.updatedAt)
      # ",\"createdBy\":" # jsonText(e.createdBy)
      # ",\"status\":" # jsonText(e.status)
      # "}"
  };

  private func sumActiveOwedCentsForMember(teamMemberId : Text) : Nat {
    var total : Nat = 0;
    for ((_, e) in programTeamOwedEntriesById.entries()) {
      if (e.teamMemberId == teamMemberId and e.status == "active") {
        total += e.amountCents;
      };
    };
    total
  };

  private func sumActivePaidCentsForMember(teamMemberId : Text) : Nat {
    var total : Nat = 0;
    for ((_, e) in programTeamPaidEntriesById.entries()) {
      if (e.teamMemberId == teamMemberId and e.status == "active") {
        total += e.amountCents;
      };
    };
    total
  };

  private func countActiveOwedEntries(teamMemberId : Text) : Nat {
    var n : Nat = 0;
    for ((_, e) in programTeamOwedEntriesById.entries()) {
      if (e.teamMemberId == teamMemberId and e.status == "active") {
        n += 1;
      };
    };
    n
  };

  private func countActivePaidEntries(teamMemberId : Text) : Nat {
    var n : Nat = 0;
    for ((_, e) in programTeamPaidEntriesById.entries()) {
      if (e.teamMemberId == teamMemberId and e.status == "active") {
        n += 1;
      };
    };
    n
  };

  private func recomputeProgramTeamMemberDisbursementTotals(teamMemberId : Text) {
    switch (programTeamMembersById.get(teamMemberId)) {
      case null {};
      case (?m) {
        programTeamMembersById.put(teamMemberId, {
          m with
          amountOwedCents = sumActiveOwedCentsForMember(teamMemberId);
          amountPaidCents = sumActivePaidCentsForMember(teamMemberId);
          updatedAt = Int.toText(Time.now());
        });
      };
    };
  };

  /// Migrate scalar owed/paid caches into ledger rows when no active entries exist.
  private func migrateLegacyDisbursementTotals(m : Types.ProgramTeamMember, createdBy : Text) {
    let now = Int.toText(Time.now());
    if (m.amountOwedCents > 0 and countActiveOwedEntries(m.id) == 0) {
      let oid = "owed-" # m.id # "-legacy";
      programTeamOwedEntriesById.put(oid, {
        id = oid;
        teamMemberId = m.id;
        programId = m.programId;
        name = "Prior balance";
        description = "Migrated from previous amount owed";
        dateIso = "";
        amountCents = m.amountOwedCents;
        createdAt = now;
        updatedAt = now;
        createdBy = createdBy;
        status = "active";
      });
    };
    if (m.amountPaidCents > 0 and countActivePaidEntries(m.id) == 0) {
      let pid = "paid-" # m.id # "-legacy";
      programTeamPaidEntriesById.put(pid, {
        id = pid;
        teamMemberId = m.id;
        programId = m.programId;
        name = "Prior balance";
        description = "Migrated from previous amount paid";
        dateIso = "";
        amountCents = m.amountPaidCents;
        paymentService = "other";
        createdAt = now;
        updatedAt = now;
        createdBy = createdBy;
        status = "active";
      });
    };
    recomputeProgramTeamMemberDisbursementTotals(m.id);
  };

  private func owedEntriesJsonForMember(teamMemberId : Text) : Text {
    var out : Text = "[";
    var first = true;
    for ((_, e) in programTeamOwedEntriesById.entries()) {
      if (e.teamMemberId == teamMemberId and e.status == "active") {
        if (not first) { out := out # "," };
        first := false;
        out := out # programTeamOwedEntryJson(e);
      };
    };
    out # "]"
  };

  private func paidEntriesJsonForMember(teamMemberId : Text) : Text {
    var out : Text = "[";
    var first = true;
    for ((_, e) in programTeamPaidEntriesById.entries()) {
      if (e.teamMemberId == teamMemberId and e.status == "active") {
        if (not first) { out := out # "," };
        first := false;
        out := out # programTeamPaidEntryJson(e);
      };
    };
    out # "]"
  };

  private func programTeamMemberJson(m : Types.ProgramTeamMember) : Text {
    "{"
      # "\"id\":" # jsonText(m.id)
      # ",\"programId\":" # jsonText(m.programId)
      # ",\"principalText\":" # jsonText(m.principalText)
      # ",\"kind\":" # jsonText(m.kind)
      # ",\"ticketsCents\":" # Nat.toText(m.ticketsCents)
      # ",\"localTravelCents\":" # Nat.toText(m.localTravelCents)
      # ",\"partner1Cents\":" # Nat.toText(m.partner1Cents)
      # ",\"partner2Cents\":" # Nat.toText(m.partner2Cents)
      # ",\"partner3Cents\":" # Nat.toText(m.partner3Cents)
      # ",\"amountOwedCents\":" # Nat.toText(m.amountOwedCents)
      # ",\"amountPaidCents\":" # Nat.toText(m.amountPaidCents)
      # ",\"payoutPercent\":" # Nat.toText(m.payoutPercent)
      # ",\"createdAt\":" # jsonText(m.createdAt)
      # ",\"updatedAt\":" # jsonText(m.updatedAt)
      # ",\"createdBy\":" # jsonText(m.createdBy)
      # ",\"status\":" # jsonText(m.status)
      # ",\"owedEntries\":" # owedEntriesJsonForMember(m.id)
      # ",\"paidEntries\":" # paidEntriesJsonForMember(m.id)
      # "}"
  };

  private func programTeamMemberId(programId : Text, principalText : Text) : Text {
    "team-" # programId # "-" # principalText
  };

  private func kindForProgramTeamPrincipal(p : Principal) : Text {
    if (isAdminPrincipal(p)) { return "admin" };
    switch (accountsByPrincipal.get(p)) {
      case (?core) {
        switch (core.role) {
          case (#admin) { "admin" };
          case (#staff) { "staff" };
          case (#collaborator) { "collaborator" };
          case _ { "staff" };
        };
      };
      case null { "staff" };
    };
  };

  /// At most one active admin row per program team (manual assignment; not auto-seeded).
  private func programTeamHasOtherActiveAdmin(programId : Text, excludePrincipalText : Text) : Bool {
    for ((_, m) in programTeamMembersById.entries()) {
      if (
        m.programId == programId
        and m.status == "active"
        and m.kind == "admin"
        and m.principalText != excludePrincipalText
      ) {
        return true;
      };
    };
    false
  };

  /// Clear former auto-seeded admin rows (more than one active admin = seed residue).
  private func cleanupAutoSeededProgramTeamAdmins(programId : Text) {
    var adminIds : [Text] = [];
    for ((id, m) in programTeamMembersById.entries()) {
      if (m.programId == programId and m.status == "active" and m.kind == "admin") {
        adminIds := Array.append<Text>(adminIds, [id]);
      };
    };
    if (adminIds.size() <= 1) { return };
    let now = Int.toText(Time.now());
    for (id in adminIds.vals()) {
      switch (programTeamMembersById.get(id)) {
        case (?m) {
          programTeamMembersById.put(id, {
            m with
            status = "removed";
            updatedAt = now;
          });
        };
        case null {};
      };
    };
  };

  public shared (msg) func staffListProgramTeamJson(programId : Text) : async Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "financePrograms");
    let pid = Text.trim(programId, #char ' ');
    if (pid.size() == 0) {
      Debug.trap("programId required");
    };
    cleanupAutoSeededProgramTeamAdmins(pid);
    let callerText = Principal.toText(msg.caller);
    var out : Text = "[";
    var first = true;
    for ((_, m) in programTeamMembersById.entries()) {
      if (m.programId == pid and m.status == "active") {
        migrateLegacyDisbursementTotals(m, callerText);
        let refreshed = switch (programTeamMembersById.get(m.id)) {
          case (?r) { r };
          case null { m };
        };
        if (not first) { out := out # "," };
        first := false;
        out := out # programTeamMemberJson(refreshed);
      };
    };
    out # "]"
  };

  public shared (msg) func staffAddProgramTeamMember(programId : Text, principalText : Text) : async Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePrograms");
    let pid = Text.trim(programId, #char ' ');
    let pt = Text.trim(principalText, #char ' ');
    if (pid.size() == 0 or pt.size() == 0) {
      Debug.trap("programId and principalText required");
    };
    let p = Principal.fromText(pt);
    let kind = kindForProgramTeamPrincipal(p);
    if (kind != "admin" and kind != "staff" and kind != "collaborator") {
      Debug.trap("Principal must be staff, collaborator, or admin");
    };
    if (not isAdminPrincipal(p)) {
      switch (accountsByPrincipal.get(p)) {
        case null { Debug.trap("No account for principal") };
        case (?core) {
          if (not roleIsPrivileged(core.role)) {
            Debug.trap("Principal must be staff, collaborator, or admin");
          };
        };
      };
    };
    if (kind == "admin" and programTeamHasOtherActiveAdmin(pid, pt)) {
      Debug.trap("Only one admin can be on a program team");
    };
    let now = Int.toText(Time.now());
    let rowId = programTeamMemberId(pid, pt);
    switch (programTeamMembersById.get(rowId)) {
      case (?existing) {
        if (existing.status == "active") {
          return rowId;
        };
        if (kind == "admin" and programTeamHasOtherActiveAdmin(pid, pt)) {
          Debug.trap("Only one admin can be on a program team");
        };
        programTeamMembersById.put(rowId, {
          existing with
          status = "active";
          kind = kind;
          updatedAt = now;
        });
        return rowId;
      };
      case null {
        programTeamMembersById.put(rowId, {
          id = rowId;
          programId = pid;
          principalText = pt;
          kind = kind;
          ticketsCents = 0;
          localTravelCents = 0;
          partner1Cents = 0;
          partner2Cents = 0;
          partner3Cents = 0;
          amountOwedCents = 0;
          amountPaidCents = 0;
          payoutPercent = 0;
          createdAt = now;
          updatedAt = now;
          createdBy = Principal.toText(msg.caller);
          status = "active";
        });
        rowId
      };
    };
  };

  public shared (msg) func staffUpdateProgramTeamMemberExpenses(
    teamMemberId : Text,
    ticketsCents : Nat,
    localTravelCents : Nat,
    partner1Cents : Nat,
    partner2Cents : Nat,
    partner3Cents : Nat,
  ) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePrograms");
    let rowId = Text.trim(teamMemberId, #char ' ');
    switch (programTeamMembersById.get(rowId)) {
      case null { Debug.trap("Team member not found") };
      case (?m) {
        if (m.status != "active") { Debug.trap("Team member not active") };
        programTeamMembersById.put(rowId, {
          m with
          ticketsCents = ticketsCents;
          localTravelCents = localTravelCents;
          partner1Cents = partner1Cents;
          partner2Cents = partner2Cents;
          partner3Cents = partner3Cents;
          updatedAt = Int.toText(Time.now());
        });
      };
    };
  };

  /// Compatibility: set scalar totals by replacing/creating a single "Adjusted total" entry each side.
  public shared (msg) func staffUpdateProgramTeamMemberDisbursement(
    teamMemberId : Text,
    amountOwedCents : Nat,
    amountPaidCents : Nat,
  ) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePrograms");
    let rowId = Text.trim(teamMemberId, #char ' ');
    let m = switch (programTeamMembersById.get(rowId)) {
      case null { Debug.trap("Team member not found") };
      case (?row) {
        if (row.status != "active") { Debug.trap("Team member not active") };
        row
      };
    };
    let now = Int.toText(Time.now());
    let callerText = Principal.toText(msg.caller);
    let owedId = "owed-" # rowId # "-compat";
    programTeamOwedEntriesById.put(owedId, {
      id = owedId;
      teamMemberId = rowId;
      programId = m.programId;
      name = "Adjusted total";
      description = "Set via compatibility disbursement API";
      dateIso = "";
      amountCents = amountOwedCents;
      createdAt = now;
      updatedAt = now;
      createdBy = callerText;
      status = if (amountOwedCents == 0) { "voided" } else { "active" };
    });
    let paidId = "paid-" # rowId # "-compat";
    programTeamPaidEntriesById.put(paidId, {
      id = paidId;
      teamMemberId = rowId;
      programId = m.programId;
      name = "Adjusted total";
      description = "Set via compatibility disbursement API";
      dateIso = "";
      amountCents = amountPaidCents;
      paymentService = "other";
      createdAt = now;
      updatedAt = now;
      createdBy = callerText;
      status = if (amountPaidCents == 0) { "voided" } else { "active" };
    });
    recomputeProgramTeamMemberDisbursementTotals(rowId);
  };

  public shared (msg) func staffUpsertProgramTeamOwedEntry(
    teamMemberId : Text,
    entryId : Text,
    name : Text,
    description : Text,
    dateIso : Text,
    amountCents : Nat,
  ) : async Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePrograms");
    let mid = Text.trim(teamMemberId, #char ' ');
    let m = switch (programTeamMembersById.get(mid)) {
      case null { Debug.trap("Team member not found") };
      case (?row) {
        if (row.status != "active") { Debug.trap("Team member not active") };
        row
      };
    };
    let trimmedName = Text.trim(name, #char ' ');
    if (trimmedName.size() == 0) {
      Debug.trap("name required");
    };
    let now = Int.toText(Time.now());
    let existingId = Text.trim(entryId, #char ' ');
    let rowId =
      if (existingId.size() > 0) { existingId }
      else { "owed-" # mid # "-" # now };
    let prior = programTeamOwedEntriesById.get(rowId);
    let createdAt = switch (prior) {
      case (?e) { e.createdAt };
      case null { now };
    };
    let createdBy = switch (prior) {
      case (?e) { e.createdBy };
      case null { Principal.toText(msg.caller) };
    };
    programTeamOwedEntriesById.put(rowId, {
      id = rowId;
      teamMemberId = mid;
      programId = m.programId;
      name = trimmedName;
      description = Text.trim(description, #char ' ');
      dateIso = Text.trim(dateIso, #char ' ');
      amountCents = amountCents;
      createdAt = createdAt;
      updatedAt = now;
      createdBy = createdBy;
      status = "active";
    });
    recomputeProgramTeamMemberDisbursementTotals(mid);
    rowId
  };

  public shared (msg) func staffVoidProgramTeamOwedEntry(entryId : Text) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePrograms");
    let eid = Text.trim(entryId, #char ' ');
    switch (programTeamOwedEntriesById.get(eid)) {
      case null { Debug.trap("Owed entry not found") };
      case (?e) {
        programTeamOwedEntriesById.put(eid, {
          e with
          status = "voided";
          updatedAt = Int.toText(Time.now());
        });
        recomputeProgramTeamMemberDisbursementTotals(e.teamMemberId);
      };
    };
  };

  public shared (msg) func staffUpsertProgramTeamPaidEntry(
    teamMemberId : Text,
    entryId : Text,
    name : Text,
    description : Text,
    dateIso : Text,
    amountCents : Nat,
    paymentService : Text,
    fundedBy : Text,
  ) : async Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePrograms");
    let mid = Text.trim(teamMemberId, #char ' ');
    let m = switch (programTeamMembersById.get(mid)) {
      case null { Debug.trap("Team member not found") };
      case (?row) {
        if (row.status != "active") { Debug.trap("Team member not active") };
        row
      };
    };
    let trimmedName = Text.trim(name, #char ' ');
    if (trimmedName.size() == 0) {
      Debug.trap("name required");
    };
    let now = Int.toText(Time.now());
    let existingId = Text.trim(entryId, #char ' ');
    let rowId =
      if (existingId.size() > 0) { existingId }
      else { "paid-" # mid # "-" # now };
    let prior = programTeamPaidEntriesById.get(rowId);
    let createdAt = switch (prior) {
      case (?e) { e.createdAt };
      case null { now };
    };
    let createdBy = switch (prior) {
      case (?e) { e.createdBy };
      case null { Principal.toText(msg.caller) };
    };
    programTeamPaidEntriesById.put(rowId, {
      id = rowId;
      teamMemberId = mid;
      programId = m.programId;
      name = trimmedName;
      description = Text.trim(description, #char ' ');
      dateIso = Text.trim(dateIso, #char ' ');
      amountCents = amountCents;
      paymentService = normalizePaymentService(paymentService);
      createdAt = createdAt;
      updatedAt = now;
      createdBy = createdBy;
      status = "active";
    });
    programTeamPaidFundedByById.put(rowId, normalizePaidFundedBy(fundedBy));
    recomputeProgramTeamMemberDisbursementTotals(mid);
    rowId
  };

  public shared (msg) func staffVoidProgramTeamPaidEntry(entryId : Text) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePrograms");
    let eid = Text.trim(entryId, #char ' ');
    switch (programTeamPaidEntriesById.get(eid)) {
      case null { Debug.trap("Paid entry not found") };
      case (?e) {
        programTeamPaidEntriesById.put(eid, {
          e with
          status = "voided";
          updatedAt = Int.toText(Time.now());
        });
        recomputeProgramTeamMemberDisbursementTotals(e.teamMemberId);
      };
    };
  };

  public shared (msg) func staffUpdateProgramTeamMemberPayoutPercent(
    teamMemberId : Text,
    payoutPercent : Nat,
  ) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePrograms");
    let rowId = Text.trim(teamMemberId, #char ' ');
    let pct = if (payoutPercent > 100) { 100 } else { payoutPercent };
    switch (programTeamMembersById.get(rowId)) {
      case null { Debug.trap("Team member not found") };
      case (?m) {
        if (m.status != "active") { Debug.trap("Team member not active") };
        programTeamMembersById.put(rowId, {
          m with
          payoutPercent = pct;
          updatedAt = Int.toText(Time.now());
        });
      };
    };
  };

  public shared (msg) func staffRemoveProgramTeamMember(teamMemberId : Text) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePrograms");
    let rowId = Text.trim(teamMemberId, #char ' ');
    switch (programTeamMembersById.get(rowId)) {
      case null { Debug.trap("Team member not found") };
      case (?m) {
        programTeamMembersById.put(rowId, {
          m with
          status = "removed";
          updatedAt = Int.toText(Time.now());
        });
      };
    };
  };

  /// Staff Finance: re-link an existing ledger row (e.g. an orphaned PayPal payment)
  /// to a specific applicant so it surfaces on their finance + member payment views.
  public shared (msg) func staffReassignProgramLedgerEntry(
    rowId : Text,
    applicantId : Text,
    programId : Text,
  ) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "financePrograms");
    if (rowId.size() == 0 or applicantId.size() == 0 or programId.size() == 0) {
      Debug.trap("rowId, applicantId, and programId required");
    };
    let existing = switch (programPaymentLedgerById.get(rowId)) {
      case null { Debug.trap("Ledger row not found") };
      case (?r) { r };
    };
    let principal = switch (principalForApplicantId(applicantId)) {
      case null { Debug.trap("Linked member account required for applicant") };
      case (?p) { p };
    };
    let row : Types.ProgramPaymentLedgerRow = {
      id = existing.id;
      principal = principal;
      programId = programId;
      applicationId = applicantId;
      paymentType = existing.paymentType;
      amountCents = existing.amountCents;
      currency = existing.currency;
      stripePaymentIntentId = existing.stripePaymentIntentId;
      stripeChargeId = existing.stripeChargeId;
      stripeReceiptUrl = existing.stripeReceiptUrl;
      status = existing.status;
      createdAt = existing.createdAt;
      dueAt = existing.dueAt;
      feeCents = existing.feeCents;
      staffNote = existing.staffNote;
      paymentProvider = existing.paymentProvider;
      externalPaymentId = existing.externalPaymentId;
      externalChargeId = existing.externalChargeId;
      externalReceiptUrl = existing.externalReceiptUrl;
    };
    let totalDueCents = effectiveTotalDueForStaffLedger(principal, programId, applicantId);
    let depositAmountCents = switch (programPaymentSummariesByKey.get(programPaymentKey(principal, programId))) {
      case (?s) {
        if (s.depositAmountCents > 0) { s.depositAmountCents } else { 100000 };
      };
      case null { 100000 };
    };
    programPaymentLedgerById.put(rowId, row);
    putProgramPaymentSummaryFromLedger(row, totalDueCents, depositAmountCents, 0);
  };

  private func setProgramMemberExempt(memberPrincipal : Principal, exempt : Bool) {
    switch (accountsByPrincipal.get(memberPrincipal)) {
      case null { Debug.trap("No account for principal") };
      case (?_) {};
    };
    let m0 = switch (membershipByPrincipal.get(memberPrincipal)) {
      case null { defaultMembership() };
      case (?x) { x };
    };
    let m1 : Types.MembershipFields = {
      stripeCustomerId = m0.stripeCustomerId;
      stripeSubscriptionId = m0.stripeSubscriptionId;
      stripeSubscriptionStatus = m0.stripeSubscriptionStatus;
      paypalSubscriptionId = m0.paypalSubscriptionId;
      paypalSubscriptionStatus = m0.paypalSubscriptionStatus;
      paymentProvider = m0.paymentProvider;
      membershipExemptManual = exempt;
    };
    membershipByPrincipal.put(memberPrincipal, m1);
  };

  private func addUniqueNat(xs : [Nat], value : Nat) : [Nat] {
    if (value == 0) {
      return xs;
    };
    for (x in xs.vals()) {
      if (x == value) {
        return xs;
      };
    };
    let b = Buffer.Buffer<Nat>(xs.size() + 1);
    for (x in xs.vals()) {
      b.add(x);
    };
    b.add(value);
    Buffer.toArray(b);
  };

  private func programCohortYear(programId : Text) : Nat {
    switch (programsById.get(programId)) {
      case null { 0 };
      case (?program) {
        switch (Nat.fromText(extractJsonStringField(program.localesJson, "year"))) {
          case (?n) { n };
          case null { 0 };
        };
      };
    };
  };

  private func markArtistConfirmedForProgram(memberPrincipal : Principal, programId : Text, updatedAt : Text) {
    let artistId = switch (accountLinkedArtistId(memberPrincipal)) {
      case null { return };
      case (?id) { id };
    };
    switch (artistsById.get(artistId)) {
      case null { return };
      case (?rec) {
        mostRecentProgramByArtistId.put(artistId, programId);
        let year = programCohortYear(programId);
        if (year > 0) {
          let currentYears = switch (artistFilterCohortYearsById.get(artistId)) {
            case null { [] };
            case (?ys) { ys };
          };
          artistFilterCohortYearsById.put(artistId, addUniqueNat(currentYears, year));
          let filter = switch (rec.profile.filter) {
            case (?f) { ?f };
            case null {
              ?{
                connection = "";
                cohortYear = year;
                disciplineKey = "";
                locationKey = "";
              };
            };
          };
          let profile = { rec.profile with filter = filter; updatedAt = updatedAt };
          putArtistRecord({ rec with profile = profile });
        } else {
          let profile = { rec.profile with updatedAt = updatedAt };
          putArtistRecord({ rec with profile = profile });
        };
      };
    };
  };

  public shared query (msg) func integrationGetProgram(programId : Text) : async ?Types.ProgramRecord {
    assertIntegrationCaller(msg.caller);
    programsById.get(programId);
  };

  public shared query (msg) func integrationGetArtistConfirmationName(memberPrincipal : Principal) : async ?Text {
    assertIntegrationCaller(msg.caller);
    let artistId = switch (accountLinkedArtistId(memberPrincipal)) {
      case null { return null };
      case (?id) { id };
    };
    switch (artistsById.get(artistId)) {
      case null { null };
      case (?rec) {
        switch (rec.localesJson) {
          case (?json) {
            let name = extractJsonStringField(json, "name");
            if (name.size() > 0) { ?name } else { ?artistId };
          };
          case null { ?artistId };
        };
      };
    };
  };

  public shared (msg) func integrationSetProgramLocalesJson(programId : Text, localesJson : Text, updatedAt : Text) : async () {
    assertIntegrationCaller(msg.caller);
    switch (programsById.get(programId)) {
      case null { Debug.trap("Unknown program id") };
      case (?program) {
        programsById.put(programId, { program with localesJson = localesJson; updatedAt = updatedAt });
      };
    };
  };

  private func putProgramPaymentFlightPreference(
    memberPrincipal : Principal,
    programId : Text,
    applicationId : Text,
    ownFlight : Bool,
    flightCreditCents : Nat,
    totalDueCents : Nat,
    updatedAt : Text,
    allowLocked : Bool,
  ) {
    let key = programPaymentKey(memberPrincipal, programId);
    switch (programPaymentSummariesByKey.get(key)) {
      case (?summary) {
        if (not allowLocked and (summary.totalPaidCents > 0 or summary.activePlanId != null)) {
          Debug.trap("Flight preference is locked after payment activity starts");
        };
      };
      case null {};
    };
    let pref : Types.ProgramPaymentFlightPreference = {
      key = key;
      principal = memberPrincipal;
      programId = programId;
      applicationId = applicationId;
      ownFlight = ownFlight;
      flightCreditCents = flightCreditCents;
      totalDueCents = totalDueCents;
      updatedAt = updatedAt;
    };
    programPaymentFlightPreferencesByKey.put(key, pref);
    switch (programPaymentSummariesByKey.get(key)) {
      case null {
        programPaymentSummariesByKey.put(key, {
          key = key;
          principal = memberPrincipal;
          programId = programId;
          applicationId = applicationId;
          depositStatus = "due";
          totalDueCents = totalDueCents;
          depositAmountCents = 100000;
          totalPaidCents = 0;
          outstandingCents = totalDueCents;
          refundedCents = 0;
          activePlanId = null;
          updatedAt = updatedAt;
        });
      };
      case (?summary) {
        let outstanding = natSubFloor(totalDueCents, summary.totalPaidCents);
        programPaymentSummariesByKey.put(key, {
          summary with
          applicationId = applicationId;
          totalDueCents = totalDueCents;
          outstandingCents = outstanding;
          updatedAt = updatedAt;
        });
      };
    };
  };

  public shared (msg) func setMyProgramPaymentFlightPreference(
    programId : Text,
    applicationId : Text,
    ownFlight : Bool,
    updatedAt : Text,
  ) : async () {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      Debug.trap("Authentication required");
    };
    if (programId.size() == 0) {
      Debug.trap("programId required");
    };
    if (not hasAcceptedApplicantForProgram(msg.caller, programId)) {
      Debug.trap("Accepted program application required");
    };
    let category = applicantCategoryForApplicationId(applicationId);
    let flightCreditCents = if (ownFlight) { PROGRAM_OWN_FLIGHT_CREDIT_CENTS } else { 0 };
    let totalDueCents = applicantEffectiveTotalDueFromPayload(
      applicantPayloadJsonForApplicationId(applicationId),
      category,
      ownFlight,
    );
    putProgramPaymentFlightPreference(msg.caller, programId, applicationId, ownFlight, flightCreditCents, totalDueCents, updatedAt, false);
  };

  private func putProgramPaymentSummaryFromLedger(
    row : Types.ProgramPaymentLedgerRow,
    totalDueCents : Nat,
    depositAmountCents : Nat,
    refundedCents : Nat,
  ) {
    let key = programPaymentKey(row.principal, row.programId);
    let prior = programPaymentSummariesByKey.get(key);
    let priorPaid = switch (prior) {
      case null { 0 };
      case (?s) { s.totalPaidCents };
    };
    let priorPlan = switch (prior) {
      case null { null };
      case (?s) { s.activePlanId };
    };
    let paidDelta =
      if (row.status == "succeeded" or row.status == "paid") {
        if (row.paymentType == "refund") { 0 } else { row.amountCents }
      } else {
        0
      };
    let nextPaid = priorPaid + paidDelta;
    let outstanding = natSubFloor(totalDueCents, nextPaid);
    let depositStatus =
      if (nextPaid >= totalDueCents and totalDueCents > 0) {
        "paid_full"
      } else if (nextPaid >= depositAmountCents and depositAmountCents > 0) {
        "paid"
      } else if ((row.paymentType == "deposit" or row.paymentType == "full_payment") and paidDelta > 0) {
        "paid"
      } else {
        switch (prior) {
          case null { "due" };
          case (?s) { s.depositStatus };
        };
      };
    let summary : Types.ProgramPaymentSummary = {
      key = key;
      principal = row.principal;
      programId = row.programId;
      applicationId = row.applicationId;
      depositStatus = depositStatus;
      totalDueCents = totalDueCents;
      depositAmountCents = depositAmountCents;
      totalPaidCents = nextPaid;
      outstandingCents = outstanding;
      refundedCents = refundedCents;
      activePlanId = priorPlan;
      updatedAt = row.createdAt;
    };
    programPaymentSummariesByKey.put(key, summary);
  };

  public shared (msg) func integrationRecordProgramPayment(
    row : Types.ProgramPaymentLedgerRow,
    totalDueCents : Nat,
    depositAmountCents : Nat,
    refundedCents : Nat,
    ownFlight : Bool,
    flightCreditCents : Nat,
  ) : async () {
    assertIntegrationCaller(msg.caller);
    if (row.id.size() == 0 or row.programId.size() == 0) {
      Debug.trap("Program payment id and programId required");
    };
    switch (programPaymentLedgerById.get(row.id)) {
      case (?_) { return };
      case null {};
    };
    programPaymentLedgerById.put(row.id, row);
    putProgramPaymentFlightPreference(row.principal, row.programId, row.applicationId, ownFlight, flightCreditCents, totalDueCents, row.createdAt, true);
    putProgramPaymentSummaryFromLedger(row, totalDueCents, depositAmountCents, refundedCents);
  };

  public shared (msg) func integrationMarkProgramDepositAccepted(
    memberPrincipal : Principal,
    programId : Text,
    applicationId : Text,
    status : Text,
    updatedAt : Text,
  ) : async () {
    assertIntegrationCaller(msg.caller);
    setProgramMemberExempt(memberPrincipal, true);
    markArtistConfirmedForProgram(memberPrincipal, programId, updatedAt);
    let key = programPaymentKey(memberPrincipal, programId);
    let prior = switch (programPaymentSummariesByKey.get(key)) {
      case null {
        {
          key = key;
          principal = memberPrincipal;
          programId = programId;
          applicationId = applicationId;
          depositStatus = status;
          totalDueCents = 0;
          depositAmountCents = 0;
          totalPaidCents = 0;
          outstandingCents = 0;
          refundedCents = 0;
          activePlanId = null;
          updatedAt = updatedAt;
        };
      };
      case (?s) { s };
    };
    programPaymentSummariesByKey.put(key, { prior with depositStatus = status; updatedAt = updatedAt });
  };

  public shared (msg) func integrationActivateProgramPaymentPlan(
    plan : Types.ProgramPaymentPlan,
    totalDueCents : Nat,
    depositAmountCents : Nat,
  ) : async () {
    assertIntegrationCaller(msg.caller);
    programPaymentPlansById.put(plan.id, plan);
    let key = programPaymentKey(plan.principal, plan.programId);
    let prior = switch (programPaymentSummariesByKey.get(key)) {
      case null {
        {
          key = key;
          principal = plan.principal;
          programId = plan.programId;
          applicationId = plan.applicationId;
          depositStatus = "paid";
          totalDueCents = totalDueCents;
          depositAmountCents = depositAmountCents;
          totalPaidCents = 0;
          outstandingCents = totalDueCents;
          refundedCents = 0;
          activePlanId = ?plan.id;
          updatedAt = plan.updatedAt;
        };
      };
      case (?s) { s };
    };
    programPaymentSummariesByKey.put(key, { prior with activePlanId = ?plan.id; updatedAt = plan.updatedAt });
  };

  public shared (msg) func integrationCancelProgramPaymentPlan(
    planId : Text,
    status : Text,
    updatedAt : Text,
  ) : async () {
    assertIntegrationCaller(msg.caller);
    switch (programPaymentPlansById.get(planId)) {
      case null { return };
      case (?plan) {
        let next = { plan with status = status; updatedAt = updatedAt };
        programPaymentPlansById.put(planId, next);
        let key = programPaymentKey(plan.principal, plan.programId);
        switch (programPaymentSummariesByKey.get(key)) {
          case null {};
          case (?s) {
            let active = switch (s.activePlanId) {
              case (?id) { if (id == planId) { null } else { s.activePlanId } };
              case null { null };
            };
            programPaymentSummariesByKey.put(key, { s with activePlanId = active; updatedAt = updatedAt });
          };
        };
      };
    };
  };

  /// Staff/admin: same JSON shape as `getMyArtistApplicationsJson` for any roster `artistId` (Studio artist modal Programs tab).
  public shared query (msg) func staffGetArtistApplicationsJson(artistId : Text) : async ?Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "artists");
    if (artistId.size() == 0) {
      return null;
    };
    buildAppliedJsonForArtist(artistId);
  };

  private func extractJsonStringField(json : Text, key : Text) : Text {
    let marker = "\"" # key # "\":\"";
    let parts = _Iter.toArray(Text.split(json, #text(marker)));
    if (parts.size() < 2) {
      return "";
    };
    let tail = parts[1];
    let untilQuote = _Iter.toArray(Text.split(tail, #char('\"')));
    if (untilQuote.size() < 1) {
      return "";
    };
    untilQuote[0];
  };

  private func extractPayloadJsonFromEntry(entry : Text) : Text {
    let marker = "\"payload\":";
    let parts = _Iter.toArray(Text.split(entry, #text(marker)));
    if (parts.size() < 2) {
      return "{}";
    };
    let payloadTail = parts[1];
    switch (Text.stripEnd(payloadTail, #char '}')) {
      case (?trimmed) { trimmed };
      case null { payloadTail };
    };
  };

  private func applicantRecordFromLegacyApplicationEntry(key : Text, entry : Text) : Types.ApplicantRecord {
    let parts = _Iter.toArray(Text.split(key, #char '|'));
    let programId = if (parts.size() >= 2) { parts[1] } else { "" };
    let submittedAt = extractJsonStringField(entry, "submittedAt");
    let payloadJson = extractPayloadJsonFromEntry(entry);
    let email = extractJsonStringField(payloadJson, "email");
    let firstName = extractJsonStringField(payloadJson, "firstName");
    let lastName = extractJsonStringField(payloadJson, "lastName");
    let fullName = Text.trim(firstName # " " # lastName, #char ' ');
    {
      id = key;
      programId = programId;
      email = email;
      fullName = fullName;
      status = #pending;
      createdAt = submittedAt;
      payloadJson = payloadJson;
    };
  };

  /// Authenticated: save one program application for the linked artist (`payloadJson` must be a JSON object string).
  public shared (msg) func submitProgramApplication(
    programId : Text,
    payloadJson : Text,
    submittedAt : Text,
  ) : async () {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      Debug.trap("Anonymous caller");
    };
    if (programId.size() == 0) {
      Debug.trap("programId required");
    };
    if (payloadJson.size() == 0) {
      Debug.trap("payload required");
    };
    let aid = switch (accountsByPrincipal.get(msg.caller)) {
      case null { Debug.trap("No account for caller") };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { Debug.trap("No linked artist on account") };
          case (?id) { id };
        };
      };
    };
    let entry = "{\"submittedAt\":\"" # submittedAt # "\",\"payload\":" # payloadJson # "}";
    if (entry.size() > maxApplicationEntryChars) {
      Debug.trap("Application entry too large");
    };
    let key = aid # "|" # programId;
    applicationByArtistProgram.put(key, entry);
    let email = extractJsonStringField(payloadJson, "email");
    let firstName = extractJsonStringField(payloadJson, "firstName");
    let lastName = extractJsonStringField(payloadJson, "lastName");
    let fullName = Text.trim(firstName # " " # lastName, #char ' ');
    let applicant : Types.ApplicantRecord = {
      id = key;
      programId = programId;
      email = email;
      fullName = fullName;
      status = #pending;
      createdAt = submittedAt;
      payloadJson = payloadJson;
      emailOutreachJson = "[]";
    };
    applicantsById.put(key, applicant);
    // Consume one stacked quarterly application credit when available (fee-due path with reason=credit).
    switch (membershipAccessForPrincipal(msg.caller)) {
      case (#ok) {
        if (membershipTierOf(msg.caller) == "quarterly") {
          switch (quarterlyAppCreditBalanceByPrincipal.get(msg.caller)) {
            case (?n) {
              if (n >= 1) {
                quarterlyAppCreditBalanceByPrincipal.put(msg.caller, n - 1);
              };
            };
            case null {};
          };
        };
      };
      case _ {};
    };
  };

  /// Authenticated artist: replace `localesJson` for the linked roster row only (staff upsert still overrides).
  public shared (msg) func updateMyArtistLocalesJson(localesJson : Text, updatedAt : Text) : async () {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      Debug.trap("Anonymous caller");
    };
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { Debug.trap("No account for caller") };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { Debug.trap("No linked artist on account") };
          case (?aid) {
            switch (artistsById.get(aid)) {
              case null { Debug.trap("Linked artist not found") };
              case (?rec) {
                let newUpdated : Text = if (updatedAt.size() > 0) {
                  updatedAt;
                } else {
                  rec.profile.updatedAt;
                };
                let newProfile : Types.ArtistCore = { rec.profile with updatedAt = newUpdated };
                putArtistRecord({
                  rec with
                  profile = newProfile;
                  localesJson = ?localesJson;
                });
              };
            };
          };
        };
      };
    };
  };

  /// Authenticated artist: set `profile.visibility` — `inactive` | `pending` | `private` | `public`.
  public shared (msg) func updateMyArtistVisibility(visibility : Text, updatedAt : Text) : async () {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      Debug.trap("Anonymous caller");
    };
    if (isValidArtistRosterVisibility(visibility) == false) {
      Debug.trap("visibility must be inactive, pending, private, or public");
    };
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { Debug.trap("No account for caller") };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { Debug.trap("No linked artist on account") };
          case (?aid) {
            switch (artistsById.get(aid)) {
              case null { Debug.trap("Linked artist not found") };
              case (?rec) {
                let newUpdated : Text = if (updatedAt.size() > 0) {
                  updatedAt;
                } else {
                  rec.profile.updatedAt;
                };
                let nextVisibility : Text = if (visibility == "public" and rec.profile.visibility != "public") {
                  "pending";
                } else {
                  visibility;
                };
                let newProfile : Types.ArtistCore = {
                  rec.profile with
                  visibility = nextVisibility;
                  updatedAt = newUpdated;
                };
                putArtistRecord({ rec with profile = newProfile });
              };
            };
          };
        };
      };
    };
  };

  /// Max URL length for profile hero image (HTTPS / asset ref).
  private let maxProfileImageUrlLen : Nat = 4096;
  private let maxCommunityPageJsonChars : Nat = 500_000;

  /// Authenticated artist: update `profile.image` (and `updatedAt`) for the linked roster row only.
  public shared (msg) func updateMyArtistProfilePatch(image : Text, updatedAt : Text) : async () {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      Debug.trap("Anonymous caller");
    };
    if (image.size() > maxProfileImageUrlLen) {
      Debug.trap("Image URL too long");
    };
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { Debug.trap("No account for caller") };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { Debug.trap("No linked artist on account") };
          case (?aid) {
            switch (artistsById.get(aid)) {
              case null { Debug.trap("Linked artist not found") };
              case (?rec) {
                let newUpdated : Text = if (updatedAt.size() > 0) {
                  updatedAt;
                } else {
                  rec.profile.updatedAt;
                };
                let newProfile : Types.ArtistCore = {
                  rec.profile with
                  image = image;
                  updatedAt = newUpdated;
                };
                putArtistRecord({ rec with profile = newProfile });
              };
            };
          };
        };
      };
    };
  };

  /// Authenticated artist: set headshot (card “Profile” image) for the linked roster row. Stored in `artistHeroProfileImageById`, not in `ArtistCore`.
  public shared (msg) func updateMyArtistHeroProfileImagePatch(heroProfileImage : Text, updatedAt : Text) : async () {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      Debug.trap("Anonymous caller");
    };
    if (heroProfileImage.size() > maxProfileImageUrlLen) {
      Debug.trap("Profile image URL too long");
    };
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { Debug.trap("No account for caller") };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { Debug.trap("No linked artist on account") };
          case (?aid) {
            switch (artistsById.get(aid)) {
              case null { Debug.trap("Linked artist not found") };
              case (?rec) {
                let newUpdated : Text = if (updatedAt.size() > 0) {
                  updatedAt;
                } else {
                  rec.profile.updatedAt;
                };
                setHeroProfileImageForArtist(aid, heroProfileImage);
                let newProfile : Types.ArtistCore = { rec.profile with updatedAt = newUpdated };
                putArtistRecord({ rec with profile = newProfile });
              };
            };
          };
        };
      };
    };
  };

  /// Authenticated artist: update shared quote/audio fields (EN-only profile-level metadata).
  public shared (msg) func updateMyArtistQuoteAudioPatch(
    quote : Text,
    audioUrl : Text,
    audioTitle : Text,
    updatedAt : Text,
  ) : async () {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      Debug.trap("Anonymous caller");
    };
    if (audioUrl.size() > maxProfileImageUrlLen) {
      Debug.trap("Audio URL too long");
    };
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { Debug.trap("No account for caller") };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { Debug.trap("No linked artist on account") };
          case (?aid) {
            switch (artistsById.get(aid)) {
              case null { Debug.trap("Linked artist not found") };
              case (?rec) {
                let newUpdated : Text = if (updatedAt.size() > 0) {
                  updatedAt;
                } else {
                  rec.profile.updatedAt;
                };
                let prevUrl = switch (artistMediaByArtistId.get(aid)) {
                  case null { "" };
                  case (?prev) { prev.audioUrl };
                };
                let m : Types.ArtistMedia = {
                  quote = quote;
                  audioUrl = audioUrl;
                  audioTitle = audioTitle;
                  updatedAt = newUpdated;
                };
                artistMediaByArtistId.put(aid, m);
                if (audioUrl != prevUrl) {
                  setAudioApprovedForArtist(aid, false);
                };
              };
            };
          };
        };
      };
    };
  };

  /// Slug charset enforced on the client; canister checks non-empty bounded length.
  private func isValidPublicSlug(s : Text) : Bool {
    let n = s.size();
    n > 0 and n <= 128;
  };

  /// Pick `preferred` or `preferred-2`, `preferred-3`, … until free or owned by `artistId`.
  private func uniqueSlugWithSuffix(preferred : Text, artistId : Text, n : Nat) : Text {
    let cand : Text = switch (n) {
      case (0) { preferred };
      case (_) { preferred # "-" # Nat.toText(n) };
    };
    switch (artistSlugToId.get(cand)) {
      case null { cand };
      case (?id) {
        if (id == artistId) {
          cand;
        } else {
          let next = if (n == 0) {
            2;
          } else {
            n + 1;
          };
          uniqueSlugWithSuffix(preferred, artistId, next);
        };
      };
    };
  };

  /// Authenticated member: set public profile slug (URL segment) with uniqueness; keeps `profile.id` stable.
  public shared (msg) func updateMyArtistPublicSlug(preferredSlug : Text) : async Text {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      Debug.trap("Anonymous caller");
    };
    if (not isValidPublicSlug(preferredSlug)) {
      Debug.trap("Invalid slug: use 1–128 lowercase letters, digits, hyphens only");
    };
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { Debug.trap("No account for caller") };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { Debug.trap("No linked artist on account") };
          case (?aid) {
            switch (artistsById.get(aid)) {
              case null { Debug.trap("Linked artist not found") };
              case (?rec) {
                let unique = uniqueSlugWithSuffix(preferredSlug, aid, 0);
                if (unique == rec.profile.slug) {
                  return unique;
                };
                let now = nowText();
                let newProfile : Types.ArtistCore = {
                  rec.profile with
                  slug = unique;
                  updatedAt = now;
                };
                putArtistRecord({ rec with profile = newProfile });
                return unique;
              };
            };
          };
        };
      };
    };
  };

  private func unlinkAccountsAndAppsForArtist(artistId : Text) {
    let prefix = artistId # "|";
    let buf = Buffer.Buffer<Text>(8);
    for ((k, _) in applicationByArtistProgram.entries()) {
      if (Text.startsWith(k, #text prefix)) {
        buf.add(k);
      };
    };
    for (k in buf.vals()) {
      ignore applicationByArtistProgram.remove(k);
    };
    let now = nowText();
    for ((p, core) in accountsByPrincipal.entries()) {
      switch (core.linkedArtistId) {
        case (?aid) {
          if (aid == artistId) {
            let next : Types.UserAccountCore = {
              core with
              status = #pending;
              linkedArtistId = null;
              updatedAt = now;
            };
            accountsByPrincipal.put(p, next);
          };
        };
        case null {};
      };
    };
  };

  /// Staff/admin: full records including `imported` and `accessCode` (for Studio roster).
  public shared (msg) func listArtistRecordsForStudio() : async [Types.ArtistRecord] {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisibleEither(msg.caller, "artists", "pending-approval");
    _Iter.toArray(artistsById.vals());
  };

  private func putArtistRecord(rec : Types.ArtistRecord) {
    let vis = normalizeArtistRosterVisibility(rec.profile.visibility);
    let record = {
      rec with
      profile = { rec.profile with visibility = vis };
    };
    let id = record.profile.id;
    let slug = record.profile.slug;
    switch (artistsById.get(id)) {
      case (?old) {
        if (old.profile.slug != slug) {
          ignore artistSlugToId.remove(old.profile.slug);
        };
        if (isEightDigitAccessCode(old.accessCode)) {
          switch (accessCodeToArtistId.get(old.accessCode)) {
            case (?mappedId) {
              if (mappedId == id) {
                ignore accessCodeToArtistId.remove(old.accessCode);
              };
            };
            case null {};
          };
        };
      };
      case null {};
    };
    artistsById.put(id, record);
    artistSlugToId.put(slug, id);
    if (isEightDigitAccessCode(record.accessCode)) {
      accessCodeToArtistId.put(record.accessCode, id);
    };
  };

  private let maxApplicationEntryChars : Nat = 100_000;

  private func applicantPayloadJsonObject(payloadJson : Text) : Text {
    let trimmed = Text.trim(payloadJson, #char ' ');
    if (Text.startsWith(trimmed, #char('{'))) { trimmed } else { "{}" };
  };

  private func applicantApplicationEntryJson(rec : Types.ApplicantRecord) : Text {
    "{\"submittedAt\":" # jsonText(rec.createdAt)
      # ",\"status\":" # jsonText(applicantStatusText(rec.status))
      # ",\"applicationStatus\":" # jsonText(applicantStatusText(rec.status))
      # ",\"payload\":" # applicantPayloadJsonObject(rec.payloadJson)
      # "}";
  };

  private func buildAppliedJsonForArtist(aid : Text) : ?Text {
    let prefix = aid # "|";
    var inner : Text = "";
    var first : Bool = true;
    for ((k, rec) in applicantsById.entries()) {
      if (Text.startsWith(k, #text prefix)) {
        let pid = if (rec.programId.size() > 0) {
          rec.programId
        } else {
          switch (Text.stripStart(k, #text prefix)) {
            case (?stripped) { stripped };
            case null { "" };
          };
        };
        if (pid.size() > 0) {
          if (not first) {
            inner := inner # ",";
          };
          first := false;
          inner := inner # jsonText(pid) # ":" # applicantApplicationEntryJson(rec);
        };
      };
    };
    for ((k, rec) in archivedApplicantsById.entries()) {
      if (Text.startsWith(k, #text prefix)) {
        switch (applicantsById.get(k)) {
          case (?_) {};
          case null {
            let pid = if (rec.programId.size() > 0) {
              rec.programId
            } else {
              switch (Text.stripStart(k, #text prefix)) {
                case (?stripped) { stripped };
                case null { "" };
              };
            };
            if (pid.size() > 0) {
              if (not first) {
                inner := inner # ",";
              };
              first := false;
              inner := inner # jsonText(pid) # ":" # applicantApplicationEntryJson(rec);
            };
          };
        };
      };
    };
    for ((k, v) in applicationByArtistProgram.entries()) {
      if (Text.startsWith(k, #text prefix)) {
        switch (applicantsById.get(k)) {
          case (?_) {};
          case null {
            switch (archivedApplicantsById.get(k)) {
              case (?_) {};
              case null {
                switch (Text.stripStart(k, #text prefix)) {
                  case (?pid) {
                    if (not first) {
                      inner := inner # ",";
                    };
                    first := false;
                    inner := inner # jsonText(pid) # ":" # v;
                  };
                  case null {};
                };
              };
            };
          };
        };
      };
    };
    if (first) {
      return null;
    };
    ?("{" # inner # "}");
  };

  public shared (msg) func upsertArtist(record : Types.ArtistRecord, heroProfileImage : Text) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEditEither(msg.caller, "artists", "pending-approval");
    putArtistRecord(record);
    setHeroProfileImageForArtist(record.profile.id, heroProfileImage);
  };

  public shared (msg) func bulkUpsertArtists(records : [Types.ArtistRecord], heroProfileImages : [Text]) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "artists");
    if (records.size() != heroProfileImages.size()) {
      Debug.trap("bulkUpsertArtists: heroProfileImages length mismatch");
    };
    var i : Nat = 0;
    for (r in records.vals()) {
      putArtistRecord(r);
      setHeroProfileImageForArtist(r.profile.id, heroProfileImages[i]);
      i += 1;
    };
  };

  /// Staff/admin: cohort years for feed filters — stored separately from `ArtistFilterStored` for stable upgrades.
  public shared (msg) func bulkPutArtistFilterCohortYears(rows : [(Text, [Nat])]) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "artists");
    for (entry in rows.vals()) {
      let id = entry.0;
      let ys = entry.1;
      if (ys.size() == 0) {
        ignore artistFilterCohortYearsById.remove(id);
      } else {
        artistFilterCohortYearsById.put(id, ys);
      };
    };
  };

  public query func listArtistFilterCohortYearsPublic() : async [(Text, [Nat])] {
    _Iter.toArray(artistFilterCohortYearsById.entries());
  };

  public query func listArtistHeroProfileImagePublic() : async [(Text, Text)] {
    _Iter.toArray(artistHeroProfileImageById.entries());
  };

  /// Public: artist ids whose headshot is approved for card display.
  public query func listArtistHeroProfileImageApprovedPublic() : async [Text] {
    approvedHeroProfileImageIdsSorted();
  };

  /// Staff/admin: approve or revoke profile headshot for public cards (program confirmed strip, Profile toggle).
  public shared (msg) func staffSetHeroProfileImageApproved(artistId : Text, approved : Bool) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "artists");
    switch (artistsById.get(artistId)) {
      case null { Debug.trap("Unknown artist id") };
      case (?_) { setHeroProfileImageApprovedForArtist(artistId, approved) };
    };
  };

  /// Public: artist ids whose audio bite is approved for sound env / profile / journal.
  public query func listArtistAudioApprovedPublic() : async [Text] {
    approvedAudioIdsSorted();
  };

  /// Staff/admin: approve or revoke artist audio for public playback surfaces.
  public shared (msg) func staffSetArtistAudioApproved(artistId : Text, approved : Bool) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "artists");
    switch (artistsById.get(artistId)) {
      case null { Debug.trap("Unknown artist id") };
      case (?_) { setAudioApprovedForArtist(artistId, approved) };
    };
  };

  // ── Multi-bite audio collection API ──

  public query func listArtistAudioCollections() : async [(Text, [Types.ArtistAudioEntry])] {
    _Iter.toArray(artistAudioCollectionById.entries());
  };

  public query func listArtistAudioHighlights() : async [(Text, Text)] {
    _Iter.toArray(artistAudioHighlightById.entries());
  };

  public query func listArtistAudioApprovedUrls() : async [(Text, [Text])] {
    _Iter.toArray(artistAudioApprovedUrlsById.entries());
  };

  public shared query (msg) func getMyArtistAudioCollection() : async ?{
    entries : [Types.ArtistAudioEntry];
    highlightUrl : Text;
    approvedUrls : [Text];
  } {
    if (Principal.equal(msg.caller, anonPrincipal)) return null;
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { null };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { null };
          case (?aid) {
            ?{
              entries = getAudioCollection(aid);
              highlightUrl = getAudioHighlight(aid);
              approvedUrls = getApprovedAudioUrls(aid);
            };
          };
        };
      };
    };
  };

  public shared (msg) func addMyArtistAudioEntry(url : Text, title : Text, updatedAt : Text) : async () {
    if (Principal.equal(msg.caller, anonPrincipal)) Debug.trap("Anonymous caller");
    if (url.size() > maxProfileImageUrlLen) Debug.trap("Audio URL too long");
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { Debug.trap("No account for caller") };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { Debug.trap("No linked artist on account") };
          case (?aid) {
            switch (artistsById.get(aid)) {
              case null { Debug.trap("Linked artist not found") };
              case (?_) {
                let existing = getAudioCollection(aid);
                if (existing.size() >= maxAudioEntries) {
                  Debug.trap("Maximum of 5 audio bites reached");
                };
                for (e in existing.vals()) {
                  if (e.url == url) Debug.trap("Audio URL already exists in collection");
                };
                let ts = if (updatedAt.size() > 0) updatedAt else "";
                let entry : Types.ArtistAudioEntry = { url = url; title = title; addedAt = ts };
                artistAudioCollectionById.put(aid, Array.append(existing, [entry]));
                if (getAudioHighlight(aid).size() == 0) {
                  artistAudioHighlightById.put(aid, url);
                  syncHighlightToArtistMedia(aid);
                };
              };
            };
          };
        };
      };
    };
  };

  public shared (msg) func removeMyArtistAudioEntry(url : Text) : async () {
    if (Principal.equal(msg.caller, anonPrincipal)) Debug.trap("Anonymous caller");
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { Debug.trap("No account for caller") };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { Debug.trap("No linked artist on account") };
          case (?aid) {
            let existing = getAudioCollection(aid);
            let filtered = Array.filter<Types.ArtistAudioEntry>(existing, func(e : Types.ArtistAudioEntry) : Bool { e.url != url });
            if (filtered.size() == existing.size()) Debug.trap("Audio URL not found in collection");
            if (filtered.size() == 0) {
              ignore artistAudioCollectionById.remove(aid);
            } else {
              artistAudioCollectionById.put(aid, filtered);
            };
            setAudioUrlApproved(aid, url, false);
            if (getAudioHighlight(aid) == url) {
              if (filtered.size() > 0) {
                artistAudioHighlightById.put(aid, filtered[0].url);
              } else {
                ignore artistAudioHighlightById.remove(aid);
              };
              syncHighlightToArtistMedia(aid);
            };
          };
        };
      };
    };
  };

  public shared (msg) func setMyArtistHighlightAudio(url : Text) : async () {
    if (Principal.equal(msg.caller, anonPrincipal)) Debug.trap("Anonymous caller");
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { Debug.trap("No account for caller") };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { Debug.trap("No linked artist on account") };
          case (?aid) {
            let entries = getAudioCollection(aid);
            var found = false;
            for (e in entries.vals()) {
              if (e.url == url) found := true;
            };
            if (not found) Debug.trap("Audio URL not in collection");
            artistAudioHighlightById.put(aid, url);
            syncHighlightToArtistMedia(aid);
          };
        };
      };
    };
  };

  public shared (msg) func staffSetArtistAudioEntryApproved(artistId : Text, url : Text, approved : Bool) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "artists");
    switch (artistsById.get(artistId)) {
      case null { Debug.trap("Unknown artist id") };
      case (?_) { setAudioUrlApproved(artistId, url, approved) };
    };
  };

  /// Staff/admin: approve profile headshots for every roster artist (bulk).
  public shared (msg) func staffApproveAllHeroProfileImages() : async Nat {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "artists");
    var n : Nat = 0;
    for ((id, _) in artistsById.entries()) {
      setHeroProfileImageApprovedForArtist(id, true);
      n += 1;
    };
    n;
  };

  public shared (msg) func staffSetHeroProfileImageReviewNote(
    artistId : Text, approved : Bool, reason : Text, imageUrl : Text
  ) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "artists");
    switch (artistsById.get(artistId)) {
      case null { Debug.trap("Unknown artist id") };
      case (?_) {
        setHeroProfileImageApprovedForArtist(artistId, approved);
        let note : Types.AssetReviewNote = {
          reason = reason;
          imageUrl = imageUrl;
          reviewedAt = Int.toText(Time.now());
          approved = approved;
        };
        heroProfileImageReviewNotesById.put(artistId, note);
      };
    };
  };

  public shared (msg) func staffSetAudioEntryReviewNote(
    artistId : Text, url : Text, approved : Bool, reason : Text, imageUrl : Text
  ) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "artists");
    switch (artistsById.get(artistId)) {
      case null { Debug.trap("Unknown artist id") };
      case (?_) {
        setAudioUrlApproved(artistId, url, approved);
        let compositeKey = artistId # "|" # url;
        let note : Types.AssetReviewNote = {
          reason = reason;
          imageUrl = imageUrl;
          reviewedAt = Int.toText(Time.now());
          approved = approved;
        };
        audioEntryReviewNotesByKey.put(compositeKey, note);
      };
    };
  };

  public query func listHeroProfileImageReviewNotes() : async [(Text, Types.AssetReviewNote)] {
    _Iter.toArray(heroProfileImageReviewNotesById.entries());
  };

  public query func listAudioEntryReviewNotes() : async [(Text, Types.AssetReviewNote)] {
    _Iter.toArray(audioEntryReviewNotesByKey.entries());
  };

  public shared query (msg) func getMyAssetReviewNotes() : async {
    heroProfileImage : ?Types.AssetReviewNote;
    audioEntries : [(Text, Types.AssetReviewNote)];
  } {
    let artistIdOpt : ?Text = switch (accountsByPrincipal.get(msg.caller)) {
      case null { null };
      case (?acc) { acc.linkedArtistId };
    };
    switch (artistIdOpt) {
      case null {{
        heroProfileImage = null;
        audioEntries = [];
      }};
      case (?artistId) {
        let heroNote = heroProfileImageReviewNotesById.get(artistId);
        let prefix = artistId # "|";
        let buf = Buffer.Buffer<(Text, Types.AssetReviewNote)>(0);
        for ((k, v) in audioEntryReviewNotesByKey.entries()) {
          if (Text.startsWith(k, #text prefix)) {
            buf.add((k, v));
          };
        };
        {
          heroProfileImage = heroNote;
          audioEntries = Buffer.toArray(buf);
        };
      };
    };
  };

  public shared (msg) func deleteArtistById(artistId : Text) : async Bool {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "artists");
    switch (artistsById.get(artistId)) {
      case null { false };
      case (?rec) {
        if (isEightDigitAccessCode(rec.accessCode)) {
          switch (accessCodeToArtistId.get(rec.accessCode)) {
            case (?mappedId) {
              if (mappedId == artistId) {
                ignore accessCodeToArtistId.remove(rec.accessCode);
              };
            };
            case null {};
          };
        };
        unlinkAccountsAndAppsForArtist(artistId);
        cleanupFeaturedForDeletedArtist(artistId);
        ignore artistsById.remove(artistId);
        ignore artistMediaByArtistId.remove(artistId);
        ignore artistSlugToId.remove(rec.profile.slug);
        ignore mostRecentProgramByArtistId.remove(artistId);
        ignore artistFilterCohortYearsById.remove(artistId);
        ignore artistHeroProfileImageById.remove(artistId);
        ignore artistHeroProfileImageApprovedById.remove(artistId);
        ignore artistAudioApprovedById.remove(artistId);
        ignore artistAudioCollectionById.remove(artistId);
        ignore artistAudioHighlightById.remove(artistId);
        ignore artistAudioApprovedUrlsById.remove(artistId);
        ignore heroProfileImageReviewNotesById.remove(artistId);
        let prefix = artistId # "|";
        let keysToRemove = Buffer.Buffer<Text>(0);
        for ((k, _) in audioEntryReviewNotesByKey.entries()) {
          if (Text.startsWith(k, #text prefix)) {
            keysToRemove.add(k);
          };
        };
        for (k in keysToRemove.vals()) {
          ignore audioEntryReviewNotesByKey.remove(k);
        };
        true;
      };
    };
  };

  public shared (msg) func setArtistMostRecentProgram(artistId : Text, programKey : Text) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "artists");
    switch (artistsById.get(artistId)) {
      case null { Debug.trap("Unknown artist id") };
      case (?_) { mostRecentProgramByArtistId.put(artistId, programKey) };
    };
  };

  public shared (msg) func setCurrentProgramSeason(value : Text) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "programs");
    siteSettingsByKey.put("currentProgramSeason", value);
  };

  // ===== Programs (public reads; writes staff/admin) =====

  public query func listPrograms() : async [Types.ProgramRecord] {
    let vals = _Iter.toArray(programsById.vals());
    Array.sort(
      vals,
      func(a : Types.ProgramRecord, b : Types.ProgramRecord) : Order.Order {
        if (a.featuredOrder < b.featuredOrder) { #less } else if (a.featuredOrder > b.featuredOrder) { #greater } else { #equal };
      },
    );
  };

  public query func getProgram(programId : Text) : async ?Types.ProgramRecord {
    programsById.get(programId);
  };

  public shared (msg) func upsertProgram(rec : Types.ProgramRecord) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "programs");
    programsById.put(rec.id, rec);
  };

  public shared (msg) func bulkUpsertPrograms(records : [Types.ProgramRecord]) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "programs");
    for (r in records.vals()) {
      programsById.put(r.id, r);
    };
  };

  public shared (msg) func deleteProgram(programId : Text) : async Bool {
    assertAdmin(msg.caller);
    switch (programsById.remove(programId)) {
      case null { false };
      case (?_) { true };
    };
  };

  // ===== Journal =====

  public query func getJournalLayout() : async [Types.JournalLayoutRow] {
    if (journalLayoutRows.size() == 0) {
      return defaultJournalLayout();
    };
    journalLayoutRows;
  };

  public query func listArtistMedia() : async [(Text, Types.ArtistMedia)] {
    _Iter.toArray(artistMediaByArtistId.entries());
  };

  public shared query (msg) func getMyArtistMedia() : async ?Types.ArtistMedia {
    switch (accountsByPrincipal.get(msg.caller)) {
      case (?acc) {
        switch (acc.linkedArtistId) {
          case (?aid) { artistMediaByArtistId.get(aid) };
          case null { null };
        };
      };
      case null { null };
    };
  };

  public shared query (msg) func adminListArtistMediaForStudio() : async [(Text, Types.ArtistMedia)] {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "artists");
    _Iter.toArray(artistMediaByArtistId.entries());
  };

  public shared (msg) func adminSetArtistMediaForStudio(
    artistId : Text,
    quote : Text,
    audioUrl : Text,
    audioTitle : Text,
    updatedAt : Text,
  ) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "artists");
    if (audioUrl.size() > maxProfileImageUrlLen) {
      Debug.trap("Audio URL too long");
    };
    let now = if (updatedAt.size() > 0) updatedAt else nowText();
    let prevUrl = switch (artistMediaByArtistId.get(artistId)) {
      case null { "" };
      case (?prev) { prev.audioUrl };
    };
    let m : Types.ArtistMedia = {
      quote = quote;
      audioUrl = audioUrl;
      audioTitle = audioTitle;
      updatedAt = now;
    };
    artistMediaByArtistId.put(artistId, m);
    if (audioUrl != prevUrl) {
      setAudioApprovedForArtist(artistId, false);
    };
  };

  public shared query (msg) func adminGetJournalLayout() : async [Types.JournalLayoutRow] {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "journal");
    if (journalLayoutRows.size() == 0) {
      return defaultJournalLayout();
    };
    journalLayoutRows;
  };

  public shared (msg) func adminSetJournalLayout(rows : [Types.JournalLayoutRow]) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "journal");
    journalLayoutRows := rows;
    journalLayoutStable := [];
  };

  // ===== Sound environment (header — public read; Studio “sound” feature for writes) =====

  public query func getSoundEnvironment() : async Types.SoundEnvironmentConfig {
    soundEnvironmentConfigStable;
  };

  public shared query (msg) func adminGetSoundEnvironment() : async Types.SoundEnvironmentConfig {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "sound");
    soundEnvironmentConfigStable;
  };

  public shared (msg) func adminSetSoundEnvironment(c : Types.SoundEnvironmentConfig) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "sound");
    if (c.minIntervalSec > c.maxIntervalSec) {
      Debug.trap("minIntervalSec must be <= maxIntervalSec");
    };
    if (c.atmosphereAudioUrl.size() > maxProfileImageUrlLen) {
      Debug.trap("atmosphere URL too long");
    };
    if (c.manualVoiceAudioUrl.size() > maxProfileImageUrlLen) {
      Debug.trap("manual voice URL too long");
    };
    if (c.atmosphereVolumePercent > 100) {
      Debug.trap("atmosphereVolumePercent out of range");
    };
    if (c.voicesVolumePercent > 100) {
      Debug.trap("voicesVolumePercent out of range");
    };
    if (c.categoryLabel.size() > 200) {
      Debug.trap("categoryLabel too long");
    };
    if (c.voiceSelectionMode != "random" and c.voiceSelectionMode != "manual") {
      Debug.trap("voiceSelectionMode must be random or manual");
    };
    soundEnvironmentConfigStable := c;
  };

  // ===== Community landing (`/community` — JSON blob; Studio “community” feature) =====

  public query func getCommunityPagePublic() : async Text {
    communityPageJsonStable;
  };

  public shared query (msg) func adminGetCommunityPage() : async Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "community");
    communityPageJsonStable;
  };

  public shared (msg) func adminSetCommunityPage(json : Text) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "community");
    if (json.size() > maxCommunityPageJsonChars) {
      Debug.trap("Community page JSON too large");
    };
    communityPageJsonStable := json;
  };

  // ===== Community videos (`/videos` library + featured row) =====

  private let maxCommunityFeaturedVideos : Nat = 6;

  private func compareCommunityVideos(
    a : Types.CommunityVideoRecord,
    b : Types.CommunityVideoRecord,
  ) : Order.Order {
    if (a.sortOrder != b.sortOrder) {
      if (a.sortOrder < b.sortOrder) { #less } else { #greater };
    } else {
      Text.compare(b.publishedAt, a.publishedAt);
    };
  };

  private func sortedVisibleCommunityVideos() : [Types.CommunityVideoRecord] {
    let vals = _Iter.toArray(communityVideosById.vals());
    let visible = Array.filter<Types.CommunityVideoRecord>(
      vals,
      func(v : Types.CommunityVideoRecord) : Bool { v.visible },
    );
    Array.sort(visible, compareCommunityVideos);
  };

  private func sortedAllCommunityVideos() : [Types.CommunityVideoRecord] {
    let vals = _Iter.toArray(communityVideosById.vals());
    Array.sort(vals, compareCommunityVideos);
  };

  private func sliceCommunityVideos(
    rows : [Types.CommunityVideoRecord],
    offset : Nat,
    limit : Nat,
  ) : [Types.CommunityVideoRecord] {
    if (limit == 0) { return [] };
    let total = rows.size();
    if (offset >= total) { return [] };
    let end = Nat.min(total, offset + limit);
    let out = Buffer.Buffer<Types.CommunityVideoRecord>(end - offset);
    var i = offset;
    while (i < end) {
      out.add(rows[i]);
      i += 1;
    };
    Buffer.toArray(out);
  };

  private func validateFeaturedVideoIds(ids : [Text]) {
    if (ids.size() > maxCommunityFeaturedVideos) {
      Debug.trap("At most six featured videos");
    };
    for (id in ids.vals()) {
      switch (communityVideosById.get(id)) {
        case null { Debug.trap("Featured video id not found") };
        case (?_) {};
      };
    };
  };

  public query func listCommunityVideosPublic(offset : Nat, limit : Nat) : async [Types.CommunityVideoRecord] {
    let rows = sortedVisibleCommunityVideos();
    sliceCommunityVideos(rows, offset, limit);
  };

  public query func getCommunityFeaturedVideosPublic() : async Types.CommunityFeaturedVideosConfig {
    communityFeaturedVideosStable;
  };

  public shared query (msg) func listCommunityVideos() : async [Types.CommunityVideoRecord] {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "community");
    sortedAllCommunityVideos();
  };

  public shared query (msg) func getCommunityVideo(videoId : Text) : async ?Types.CommunityVideoRecord {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "community");
    communityVideosById.get(videoId);
  };

  public shared (msg) func upsertCommunityVideo(rec : Types.CommunityVideoRecord) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "community");
    if (rec.id.size() == 0) { Debug.trap("Video id required") };
    communityVideosById.put(rec.id, rec);
  };

  public shared (msg) func deleteCommunityVideo(videoId : Text) : async Bool {
    assertAdmin(msg.caller);
    switch (communityVideosById.remove(videoId)) {
      case null { false };
      case (?_) {
        let cfg = communityFeaturedVideosStable;
        let filtered = Array.filter<Text>(
          cfg.featuredVideoIds,
          func(id : Text) : Bool { id != videoId },
        );
        let hero = switch (cfg.heroVideoId) {
          case (?h) { if (h == videoId) { null } else { ?h } };
          case null { null };
        };
        communityFeaturedVideosStable := {
          featuredVideoIds = filtered;
          heroVideoId = hero;
          updatedAt = cfg.updatedAt;
        };
        true;
      };
    };
  };

  public shared query (msg) func adminGetCommunityFeaturedVideos() : async Types.CommunityFeaturedVideosConfig {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "community");
    communityFeaturedVideosStable;
  };

  public shared (msg) func adminSetCommunityFeaturedVideos(cfg : Types.CommunityFeaturedVideosConfig) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "community");
    validateFeaturedVideoIds(cfg.featuredVideoIds);
    switch (cfg.heroVideoId) {
      case null {};
      case (?heroId) {
        var found = false;
        for (id in cfg.featuredVideoIds.vals()) {
          if (id == heroId) { found := true };
        };
        if (not found) { Debug.trap("Hero video must be in featured set") };
      };
    };
    communityFeaturedVideosStable := cfg;
  };

  public query func listJournalEntries() : async [Types.JournalRecord] {
    let vals = _Iter.toArray(journalsById.vals());
    Array.sort(
      vals,
      func(a : Types.JournalRecord, b : Types.JournalRecord) : Order.Order {
        Text.compare(a.id, b.id);
      },
    );
  };

  private let maxHomeJournalCarouselEntries : Nat = 3;

  private func validateHomeJournalCarouselEntryIds(ids : [Text]) {
    if (ids.size() > maxHomeJournalCarouselEntries) {
      Debug.trap("At most three home carousel entries");
    };
    for (id in ids.vals()) {
      switch (journalsById.get(id)) {
        case null { Debug.trap("Home carousel entry id not found") };
        case (?_) {};
      };
    };
  };

  public query func getHomeJournalCarouselPublic() : async Types.HomeJournalCarouselConfig {
    homeJournalCarouselStable;
  };

  public shared query (msg) func adminGetHomeJournalCarousel() : async Types.HomeJournalCarouselConfig {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "journal");
    homeJournalCarouselStable;
  };

  public shared (msg) func adminSetHomeJournalCarousel(cfg : Types.HomeJournalCarouselConfig) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "journal");
    validateHomeJournalCarouselEntryIds(cfg.entryIds);
    homeJournalCarouselStable := cfg;
  };

  public query func getJournalEntry(entryId : Text) : async ?Types.JournalRecord {
    journalsById.get(entryId);
  };

  public shared (msg) func upsertJournalEntry(rec : Types.JournalRecord) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "journal");
    journalsById.put(rec.id, rec);
  };

  public shared (msg) func deleteJournalEntry(entryId : Text) : async Bool {
    assertAdmin(msg.caller);
    switch (journalsById.remove(entryId)) {
      case null { false };
      case (?_) {
        let cfg = homeJournalCarouselStable;
        let filtered = Array.filter<Text>(
          cfg.entryIds,
          func(id : Text) : Bool { id != entryId },
        );
        if (filtered.size() != cfg.entryIds.size()) {
          homeJournalCarouselStable := {
            entryIds = filtered;
            updatedAt = cfg.updatedAt;
          };
        };
        true;
      };
    };
  };

  // ===== Editions (products) =====

  public query func listEditions() : async [Types.EditionRecord] {
    let vals = _Iter.toArray(editionsById.vals());
    Array.sort(
      vals,
      func(a : Types.EditionRecord, b : Types.EditionRecord) : Order.Order {
        Text.compare(a.id, b.id);
      },
    );
  };

  public shared (msg) func upsertEdition(rec : Types.EditionRecord) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "products");
    editionsById.put(rec.id, rec);
  };

  public shared (msg) func deleteEdition(editionId : Text) : async Bool {
    assertAdmin(msg.caller);
    switch (editionsById.remove(editionId)) {
      case null { false };
      case (?_) { true };
    };
  };

  // ===== Content pages (CMS) =====

  public query func listContentPages() : async [Types.ContentPageRecord] {
    let vals = _Iter.toArray(contentBySlug.vals());
    Array.sort(
      vals,
      func(a : Types.ContentPageRecord, b : Types.ContentPageRecord) : Order.Order {
        Text.compare(a.slug, b.slug);
      },
    );
  };

  public query func getContentPage(slug : Text) : async ?Types.ContentPageRecord {
    contentBySlug.get(slug);
  };

  public shared (msg) func upsertContentPage(rec : Types.ContentPageRecord) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "content");
    contentBySlug.put(rec.slug, rec);
  };

  public shared (msg) func deleteContentPage(slug : Text) : async Bool {
    assertAdmin(msg.caller);
    switch (contentBySlug.remove(slug)) {
      case null { false };
      case (?_) { true };
    };
  };

  /// Max characters per input field for Studio LLM helpers (protect cycles).
  private let STUDIO_LLM_MAX_CHARS : Nat = 12_000;

  private func assertStudioLlmField(s : Text) {
    if (Text.size(s) > STUDIO_LLM_MAX_CHARS) {
      Debug.trap("Text too long for Studio LLM");
    };
  };

  /// Staff/admin: translate English copy to Japanese via IC LLM canister (mops `llm` → `Llm.prompt`).
  public shared (msg) func studioTranslateEnToJa(englishText : Text) : async Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "ai");
    assertStudioLlmField(englishText);
    let instruction = "Translate the following English to Japanese. Output only the Japanese translation, with no surrounding quotes or commentary.\n\n";
    await Llm.prompt(#Llama3_1_8B, instruction # englishText);
  };

  /// Staff/admin: rewrite `sourceText` using `prompt`; `localeTag` is e.g. en or ja for model context.
  public shared (msg) func studioReinterpretWithPrompt(prompt : Text, sourceText : Text, localeTag : Text) : async Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "ai");
    assertStudioLlmField(prompt);
    assertStudioLlmField(sourceText);
    if (Text.size(localeTag) > 32) {
      Debug.trap("localeTag too long");
    };
    let header = "Rewrite the source text according to the user instruction. Output only the rewritten text, with no preamble or quotes.\n\nInstruction:\n";
    let mid = "\n\nLocale: ";
    let tail = "\n\nSource:\n";
    await Llm.prompt(#Llama3_1_8B, header # prompt # mid # localeTag # tail # sourceText);
  };

  /// Linked member with active or exempt membership: same LLM as `studioTranslateEnToJa`.
  private func assertCallerCanUseMemberWorldLlm(caller : Principal) {
    if (Principal.equal(caller, anonPrincipal)) {
      Debug.trap("Anonymous caller");
    };
    switch (membershipAccessForPrincipal(caller)) {
      case (#ok) {};
      case (#exempt) {};
      case (#noAccount) { Debug.trap("No account for caller") };
      case (#needsSubscription) { Debug.trap("Active membership required for world generation") };
    };
    switch (accountsByPrincipal.get(caller)) {
      case null { Debug.trap("No account for caller") };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null { Debug.trap("No linked artist on account") };
          case (?_) {};
        };
      };
    };
  };

  public shared (msg) func memberTranslateEnToJa(englishText : Text) : async Text {
    assertCallerCanUseMemberWorldLlm(msg.caller);
    assertStudioLlmField(englishText);
    let instruction = "Translate the following English to Japanese. Output only the Japanese translation, with no surrounding quotes or commentary.\n\n";
    await Llm.prompt(#Llama3_1_8B, instruction # englishText);
  };

  public shared (msg) func memberTranslateText(sourceText : Text, targetLocale : Text, sourceLocaleHint : Text) : async Text {
    assertCallerCanUseMemberWorldLlm(msg.caller);
    assertStudioLlmField(sourceText);
    if (Text.size(targetLocale) > 32) {
      Debug.trap("targetLocale too long");
    };
    if (Text.size(sourceLocaleHint) > 32) {
      Debug.trap("sourceLocaleHint too long");
    };
    let targetLabel = if (targetLocale == "ja") {
      "Japanese";
    } else {
      "English";
    };
    let sourceLabel = if (sourceLocaleHint == "" or sourceLocaleHint == "auto") {
      "the detected source language";
    } else {
      sourceLocaleHint;
    };
    let instruction = "Translate the following text from " # sourceLabel # " to " # targetLabel # ". Preserve names, URLs, line breaks, and meaning. Output only the translated text, with no surrounding quotes or commentary.\n\n";
    await Llm.prompt(#Llama3_1_8B, instruction # sourceText);
  };

  public shared (msg) func memberReinterpretWithPrompt(prompt : Text, sourceText : Text, localeTag : Text) : async Text {
    assertCallerCanUseMemberWorldLlm(msg.caller);
    assertStudioLlmField(prompt);
    assertStudioLlmField(sourceText);
    if (Text.size(localeTag) > 32) {
      Debug.trap("localeTag too long");
    };
    let header = "Rewrite the source text according to the user instruction. Output only the rewritten text, with no preamble or quotes.\n\nInstruction:\n";
    let mid = "\n\nLocale: ";
    let tail = "\n\nSource:\n";
    await Llm.prompt(#Llama3_1_8B, header # prompt # mid # localeTag # tail # sourceText);
  };

  // ===== Applicants =====

  public shared query (msg) func listApplicants() : async [Types.ApplicantRecord] {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "applicants");
    let out = Buffer.Buffer<Types.ApplicantRecord>(
      applicantsById.size() + archivedApplicantsById.size(),
    );
    for (row in applicantsById.vals()) {
      out.add(row);
    };
    for (row in archivedApplicantsById.vals()) {
      switch (applicantsById.get(row.id)) {
        case (?_) {};
        case null { out.add(row) };
      };
    };
    // Backfill older applications that were stored only in applicationByArtistProgram.
    for ((key, entry) in applicationByArtistProgram.entries()) {
      switch (applicantsById.get(key)) {
        case (?_) {};
        case null {
          switch (archivedApplicantsById.get(key)) {
            case (?_) {};
            case null {
              out.add(applicantRecordFromLegacyApplicationEntry(key, entry));
            };
          };
        };
      };
    };
    let vals = Buffer.toArray(out);
    Array.sort(
      vals,
      func(a : Types.ApplicantRecord, b : Types.ApplicantRecord) : Order.Order {
        Text.compare(a.createdAt, b.createdAt);
      },
    );
  };

  private func principalForArtistId(artistId : Text) : ?Principal {
    for ((principal, account) in accountsByPrincipal.entries()) {
      switch (account.linkedArtistId) {
        case (?linkedId) {
          if (linkedId == artistId) return ?principal;
        };
        case null {};
      };
    };
    null;
  };

  private func applicantRecordOpt(applicantId : Text) : ?Types.ApplicantRecord {
    switch (applicantsById.get(applicantId)) {
      case (?rec) { ?rec };
      case null { archivedApplicantsById.get(applicantId) };
    };
  };

  private func principalForApplicantRecord(rec : Types.ApplicantRecord) : ?Principal {
    let artistId = applicantArtistId(rec.id);
    switch (principalForArtistId(artistId)) {
      case (?p) { ?p };
      case null {
        let targetEmail = trimContactEmail(rec.email);
        if (targetEmail.size() == 0) { return null };
        for ((principal, contact) in accountContactByPrincipal.entries()) {
          if (trimContactEmail(contact.email) == targetEmail) {
            switch (accountsByPrincipal.get(principal)) {
              case (?acc) {
                switch (acc.linkedArtistId) {
                  case (?linkedId) {
                    if (linkedId == artistId or Text.startsWith(rec.id, #text (linkedId # "|"))) {
                      return ?principal;
                    };
                  };
                  case null {};
                };
              };
              case null {};
            };
          };
        };
        null;
      };
    };
  };

  private func principalForApplicantId(applicantId : Text) : ?Principal {
    switch (applicantRecordOpt(applicantId)) {
      case null { null };
      case (?rec) { principalForApplicantRecord(rec) };
    };
  };

  private func applicantArtistId(applicantId : Text) : Text {
    switch (Text.split(applicantId, #char('|')).next()) {
      case (?artistId) { artistId };
      case null { applicantId };
    };
  };

  private let PROGRAM_RESIDENCY_BASE_TOTAL_CENTS : Nat = 500000;
  private let PROGRAM_OWN_FLIGHT_CREDIT_CENTS : Nat = 80000;
  private let PROGRAM_VETERAN_DISCOUNT_CENTS : Nat = 100000;

  private func applicantCategoryFromPayloadJson(payloadJson : Text) : Text {
    let cat = extractJsonStringField(payloadJson, "staffApplicantCategory");
    if (cat == "veteran" or cat == "veteranPlusPlus" or cat == "sponsored" or cat == "extSponsored") {
      cat
    } else {
      "general"
    };
  };

  private func applicantCategoryForApplicationId(applicationId : Text) : Text {
    let recOpt = switch (applicantsById.get(applicationId)) {
      case (?rec) { ?rec };
      case null { archivedApplicantsById.get(applicationId) };
    };
    switch (recOpt) {
      case null { "general" };
      case (?rec) { applicantCategoryFromPayloadJson(rec.payloadJson) };
    };
  };

  private func memberProgramTotalDueCents(category : Text, ownFlight : Bool) : Nat {
    let categoryDiscount : Nat = if (category == "veteran") { PROGRAM_VETERAN_DISCOUNT_CENTS } else { 0 };
    let flightCredit : Nat = if (ownFlight) { PROGRAM_OWN_FLIGHT_CREDIT_CENTS } else { 0 };
    let sum = categoryDiscount + flightCredit;
    if (PROGRAM_RESIDENCY_BASE_TOTAL_CENTS > sum) {
      PROGRAM_RESIDENCY_BASE_TOTAL_CENTS - sum
    } else {
      0
    };
  };

  private func ledgerSucceededPaidCentsForApplication(applicationId : Text) : Nat {
    var paid : Nat = 0;
    for ((_, row) in programPaymentLedgerById.entries()) {
      if (
        row.applicationId == applicationId
        and (row.status == "succeeded" or row.status == "paid")
        and row.paymentType != "refund"
      ) {
        paid += row.amountCents;
      };
    };
    paid
  };

  private func staffRecomputeApplicantCategoryPaymentSummary(
    applicantId : Text,
    programId : Text,
    updatedAt : Text,
  ) {
    let principal = switch (principalForApplicantId(applicantId)) {
      case null { return };
      case (?p) { p };
    };
    let key = programPaymentKey(principal, programId);
    let category = applicantCategoryForApplicationId(applicantId);
    let flightPref = programPaymentFlightPreferencesByKey.get(key);
    let ownFlight = switch (flightPref) {
      case null { false };
      case (?pref) { pref.ownFlight };
    };
    let payloadJson = applicantPayloadJsonForApplicationId(applicantId);
    let totalDueCents = applicantEffectiveTotalDueFromPayload(payloadJson, category, ownFlight);
    let fullySponsored = extractJsonStringField(payloadJson, "sponsorshipMode") == "full";
    let flightCreditCents = if (ownFlight) { PROGRAM_OWN_FLIGHT_CREDIT_CENTS } else { 0 };
    switch (flightPref) {
      case (?pref) {
        programPaymentFlightPreferencesByKey.put(key, {
          pref with
          applicationId = applicantId;
          totalDueCents = totalDueCents;
          flightCreditCents = flightCreditCents;
          updatedAt = updatedAt;
        });
      };
      case null {};
    };
    let ledgerPaid = ledgerSucceededPaidCentsForApplication(applicantId);
    switch (programPaymentSummariesByKey.get(key)) {
      case null {
        if (not fullySponsored) { return };
        // Create a $0-due waived summary so member/staff views stay consistent.
        programPaymentSummariesByKey.put(key, {
          key = key;
          principal = principal;
          programId = programId;
          applicationId = applicantId;
          depositStatus = "waived";
          totalDueCents = 0;
          depositAmountCents = 0;
          totalPaidCents = ledgerPaid;
          outstandingCents = 0;
          refundedCents = 0;
          activePlanId = null;
          updatedAt = updatedAt;
        });
      };
      case (?summary) {
        let nextPaid = if (fullySponsored) { ledgerPaid } else { summary.totalPaidCents };
        let outstanding = natSubFloor(totalDueCents, nextPaid);
        let depositAmount =
          if (fullySponsored) { 0 }
          else if (summary.depositAmountCents > 0) { summary.depositAmountCents }
          else { 100000 };
        let depositStatus =
          if (fullySponsored) { "waived" }
          else if (nextPaid >= totalDueCents and totalDueCents > 0) { "paid_full" }
          else if (nextPaid >= depositAmount and depositAmount > 0) { "paid" }
          else { summary.depositStatus };
        programPaymentSummariesByKey.put(key, {
          summary with
          applicationId = applicantId;
          totalDueCents = totalDueCents;
          depositAmountCents = depositAmount;
          depositStatus = depositStatus;
          totalPaidCents = nextPaid;
          outstandingCents = outstanding;
          updatedAt = updatedAt;
        });
      };
    };
  };

  private func applicantRecordHasManualDepositSubmitted(applicantId : Text) : Bool {
    let recOpt = switch (applicantsById.get(applicantId)) {
      case (?rec) { ?rec };
      case null { archivedApplicantsById.get(applicantId) };
    };
    switch (recOpt) {
      case (?rec) {
        let p = rec.payloadJson;
        Text.contains(p, #text "\"manualDepositSubmitted\":true")
        or Text.contains(p, #text "\"manualDepositSubmitted\": true");
      };
      case null { false };
    };
  };

  private func applicantRecordIsFullySponsored(applicantId : Text) : Bool {
    extractJsonStringField(applicantPayloadJsonForApplicationId(applicantId), "sponsorshipMode") == "full"
  };

  private func staffMarkManualDepositPaymentSummary(
    applicantId : Text,
    programId : Text,
    updatedAt : Text,
  ) {
    let principal = switch (principalForApplicantId(applicantId)) {
      case null { return };
      case (?p) { p };
    };
    let key = programPaymentKey(principal, programId);
    let category = applicantCategoryForApplicationId(applicantId);
    let totalDefault = memberProgramTotalDueCents(category, false);
    let depositDefault : Nat = 100000;
    let outstandingDefault = if (totalDefault > depositDefault) { totalDefault - depositDefault } else { 0 };
    let prior = switch (programPaymentSummariesByKey.get(key)) {
      case null {
        {
          key = key;
          principal = principal;
          programId = programId;
          applicationId = applicantId;
          depositStatus = "paid";
          totalDueCents = totalDefault;
          depositAmountCents = depositDefault;
          totalPaidCents = depositDefault;
          outstandingCents = outstandingDefault;
          refundedCents = 0;
          activePlanId = null;
          updatedAt = updatedAt;
        };
      };
      case (?s) {
        let paid = s.totalPaidCents;
        let deposit = if (s.depositAmountCents > 0) { s.depositAmountCents } else { depositDefault };
        let total = memberProgramTotalDueCents(category, false);
        let outstanding = if (total > paid) { total - paid } else { 0 };
        {
          s with
          depositStatus = "paid";
          depositAmountCents = deposit;
          totalDueCents = total;
          totalPaidCents = if (paid > 0) { paid } else { deposit };
          outstandingCents = outstanding;
          updatedAt = updatedAt;
        };
      };
    };
    programPaymentSummariesByKey.put(key, prior);
  };

  public shared query (msg) func staffIsApplicantSlotSecured(applicantId : Text, programId : Text) : async Bool {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "applicants");
    if (applicantRecordHasManualDepositSubmitted(applicantId)) return true;
    if (applicantRecordIsFullySponsored(applicantId)) return true;
    let artistId = applicantArtistId(applicantId);
    let principal = switch (principalForArtistId(artistId)) {
      case null { return false };
      case (?p) { p };
    };
    let key = programPaymentKey(principal, programId);
    switch (programPaymentSummariesByKey.get(key)) {
      case (?summary) {
        if (summary.depositStatus == "paid" or summary.depositStatus == "paid_full") return true;
        // Fully sponsored / $0 due: no deposit required — treat as secured when outstanding is cleared.
        if (summary.totalDueCents == 0) return true;
      };
      case null {};
    };
    for ((_, row) in programPaymentLedgerById.entries()) {
      if (
        Principal.equal(row.principal, principal)
        and row.programId == programId
        and (row.paymentType == "deposit" or row.paymentType == "full_payment" or row.paymentType == "staff_manual")
        and (row.status == "succeeded" or row.status == "paid")
      ) {
        return true;
      };
    };
    false;
  };

  public shared (msg) func upsertApplicant(rec : Types.ApplicantRecord) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "applicants");
    switch (rec.status) {
      case (#pulledOut) {
        let archived = { rec with status = #pulledOut };
        archivedApplicantsById.put(rec.id, archived);
        ignore applicantsById.remove(rec.id);
        if (rec.id.size() > 0 and rec.programId.size() > 0 and Text.contains(rec.id, #char('|'))) {
          let entry = applicantApplicationEntryJson(archived);
          if (entry.size() <= maxApplicationEntryChars) {
            applicationByArtistProgram.put(rec.id, entry);
          };
        };
      };
      case _ {
        ignore archivedApplicantsById.remove(rec.id);
        applicantsById.put(rec.id, rec);
        if (rec.id.size() > 0 and rec.programId.size() > 0 and Text.contains(rec.id, #char('|'))) {
          let payloadTrimmed = Text.trim(rec.payloadJson, #char ' ');
          if (Text.startsWith(payloadTrimmed, #char('{'))) {
            let entry = "{\"submittedAt\":\"" # rec.createdAt # "\",\"payload\":" # payloadTrimmed # "}";
            if (entry.size() <= maxApplicationEntryChars) {
              applicationByArtistProgram.put(rec.id, entry);
            };
          };
        };
      };
    };
  };

  public shared (msg) func deleteApplicant(applicantId : Text) : async Bool {
    assertAdmin(msg.caller);
    let removedApplicant = switch (applicantsById.remove(applicantId)) {
      case null { false };
      case (?_) { true };
    };
    let removedArchived = switch (archivedApplicantsById.remove(applicantId)) {
      case null { false };
      case (?_) { true };
    };
    let removedApplication = switch (applicationByArtistProgram.remove(applicantId)) {
      case null { false };
      case (?_) { true };
    };
    ignore applicantEmailOutreachById.remove(applicantId);
    removedApplicant or removedArchived or removedApplication;
  };

  public shared (msg) func staffSyncManualDepositPaymentSummary(applicantId : Text, updatedAt : Text) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "applicants");
    if (not applicantRecordHasManualDepositSubmitted(applicantId)) return;
    switch (applicantsById.get(applicantId)) {
      case null { return };
      case (?rec) {
        staffMarkManualDepositPaymentSummary(applicantId, rec.programId, updatedAt);
      };
    };
  };

  public shared (msg) func staffSyncApplicantCategoryPaymentSummary(applicantId : Text, updatedAt : Text) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "applicants");
    switch (applicantsById.get(applicantId)) {
      case null { return };
      case (?rec) {
        staffRecomputeApplicantCategoryPaymentSummary(applicantId, rec.programId, updatedAt);
      };
    };
  };

  public shared query (msg) func listApplicantEmailOutreach() : async [(Text, Text)] {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureVisible(msg.caller, "applicants");
    _Iter.toArray(applicantEmailOutreachById.entries());
  };

  public shared (msg) func appendApplicantEmailOutreach(
    applicantId : Text,
    subject : Text,
    templateId : Text,
    templateName : Text,
  ) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "applicants");
    if (applicantId.size() == 0) {
      Debug.trap("applicantId required");
    };
    if (not applicantExistsForOutreach(applicantId)) {
      Debug.trap("Applicant not found");
    };
    assertApplicantOutreachFieldLen(subject);
    assertApplicantOutreachFieldLen(templateId);
    assertApplicantOutreachFieldLen(templateName);
    let sentAt = applicantOutreachSentAtText();
    let entryJson = applicantEmailOutreachEntryJson(sentAt, subject, templateId, templateName);
    let existing = switch (applicantEmailOutreachById.get(applicantId)) {
      case null { "[]" };
      case (?json) { json };
    };
    let next = appendOutreachJsonArray(existing, entryJson);
    if (Text.size(next) > maxApplicantOutreachJsonChars) {
      Debug.trap("Outreach log too large for this applicant");
    };
    applicantEmailOutreachById.put(applicantId, next);
  };

  public shared (msg) func clearApplicantEmailOutreach(applicantId : Text) : async () {
    assertAdmin(msg.caller);
    if (applicantId.size() == 0) {
      Debug.trap("applicantId required");
    };
    ignore applicantEmailOutreachById.remove(applicantId);
  };

  // ===== Site settings (key/value text) =====

  public query func getSiteSetting(key : Text) : async ?Text {
    siteSettingsByKey.get(key);
  };

  public shared (msg) func setSiteSetting(key : Text, value : Text) : async () {
    assertAdmin(msg.caller);
    siteSettingsByKey.put(key, value);
  };

  /// Staff with Studio Users or Finance — Users visibility; admin always.
  public shared query (msg) func listAccounts() : async [(Principal, Types.UserAccount)] {
    assertStudioAccountDirectoryVisible(msg.caller);
    Array.map<(Principal, Types.UserAccountCore), (Principal, Types.UserAccount)>(
      _Iter.toArray(accountsByPrincipal.entries()),
      func(entry : (Principal, Types.UserAccountCore)) : (Principal, Types.UserAccount) {
        let p = entry.0;
        switch (mergeAccount(p)) {
          case null { Debug.trap("unreachable") };
          case (?u) { (p, u) };
        };
      },
    );
  };

  /// Name + email for Studio Users / Finance — Users (Team tab is admin-gated in the UI).
  public shared query (msg) func adminListAccountContacts() : async [(Principal, Types.AccountContact)] {
    assertStudioAccountDirectoryVisible(msg.caller);
    _Iter.toArray(accountContactByPrincipal.entries());
  };

  public shared (msg) func adminSetAccountContact(p : Principal, contact : Types.AccountContact) : async () {
    assertAdmin(msg.caller);
    assertContactFieldLen(contact.firstName);
    assertContactFieldLen(contact.lastName);
    assertContactFieldLen(contact.email);
    accountContactByPrincipal.put(p, contact);
  };

  public shared (msg) func setMyAccountContact(contact : Types.AccountContact) : async () {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      Debug.trap("Anonymous caller");
    };
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { Debug.trap("No account for caller") };
      case (?_) {};
    };
    assertContactFieldLen(contact.firstName);
    assertContactFieldLen(contact.lastName);
    assertContactFieldLen(contact.email);
    accountContactByPrincipal.put(msg.caller, contact);
    switch (accountsByPrincipal.get(msg.caller)) {
      case null {};
      case (?acc) {
        switch (acc.linkedArtistId) {
          case null {};
          case (?aid) { backfillArtistContactEmailIfEmpty(aid, contact.email) };
        };
      };
    };
  };

  // ===== Queries: subscribers =====

  public shared query (msg) func getSubscribers() : async [Types.Subscriber] {
    assertAdmin(msg.caller);
    return _Iter.toArray(subscribersByEmail.vals());
  };

  public query func getSubscriberByEmail(email : Text) : async ?Types.Subscriber {
    return subscribersByEmail.get(email);
  };

  // ===== Updates: subscribers =====

  // Upsert a subscriber: if email exists, update fields; otherwise add a new entry.
  // Public (any caller) for marketing-site early-access signup.
  // Returns true if an existing subscriber was updated; false if created.
  public shared (_msg) func upsertSubscriber(
    email : Text,
    category : Text,
    timestamp : Text,
    fullName : Text,
    intent : Text,
  ) : async Bool {
    switch (subscribersByEmail.get(email)) {
      case null {
        subscribersByEmail.put(
          email,
          {
            timestamp = timestamp;
            email = email;
            category = category;
            fullName = fullName;
            intent = intent;
            audiences = [];
          },
        );
        return false;
      };
      case (?prev) {
        let keep = prev.audiences;
        subscribersByEmail.put(
          email,
          {
            timestamp = timestamp;
            email = email;
            category = category;
            fullName = fullName;
            intent = intent;
            audiences = keep;
          },
        );
        return true;
      };
    };
  };

  // Delete by email. Admin only.
  public shared (msg) func deleteSubscriberByEmail(email : Text) : async Bool {
    assertAdmin(msg.caller);
    switch (subscribersByEmail.remove(email)) {
      case null { return false };
      case (?_) { return true };
    };
  };

  /// Admin-only: batch import (e.g. CSV upload from Studio).
  public shared (msg) func bulkUpsertSubscribers(rows : [Types.Subscriber]) : async Nat {
    assertAdmin(msg.caller);
    var count : Nat = 0;
    for (sub in rows.vals()) {
      subscribersByEmail.put(sub.email, sub);
      count += 1;
    };
    count;
  };

  // ===== Resend audience segments (Studio Services) + Studio subscriber audiences (subscribers / email) =====

  public shared query (msg) func getResendSegmentConfigForStudio() : async [Types.ResendSegmentSlot] {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "services");
    resendSegmentConfigStable;
  };

  public shared (msg) func setResendSegmentConfigForStudio(slots : [Types.ResendSegmentSlot]) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "services");
    if (slots.size() > 5) {
      Debug.trap("at most 5 Resend segment slots");
    };
    resendSegmentConfigStable := slots;
  };

  public shared (msg) func setSubscriberAudiencesByEmailForStudio(email : Text, audiences : [Text]) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "subscribers");
    switch (subscribersByEmail.get(email)) {
      case null { Debug.trap("subscriber not found") };
      case (?sub) { subscribersByEmail.put(email, { sub with audiences = audiences }) };
    };
  };

  public shared (msg) func appendSubscriberResendAudienceForStudio(email : Text, segmentId : Text) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "email");
    if (Text.size(email) == 0 or Text.size(segmentId) == 0) {
      return;
    };
    switch (subscribersByEmail.get(email)) {
      case null { return };
      case (?sub) {
        for (a in sub.audiences.vals()) {
          if (a == segmentId) { return };
        };
        let next = Array.append(sub.audiences, [segmentId]);
        subscribersByEmail.put(email, { sub with audiences = next });
      };
    };
  };

  // ===== Studio Email Campaigns (staff + email feature) =====

  /// Staff/admin with Email feature edit: same rows as `getSubscribers` (for category counts / batch in Studio).
  public shared query (msg) func getSubscribersForEmailStudio() : async [Types.Subscriber] {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "email");
    return _Iter.toArray(subscribersByEmail.vals());
  };

  public shared query (msg) func listEmailCampaigns() : async [Types.EmailCampaignRecord] {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "email");
    let vals = _Iter.toArray(emailCampaignsById.vals());
    return Array.sort(
      vals,
      func(a : Types.EmailCampaignRecord, b : Types.EmailCampaignRecord) : Order.Order {
        Text.compare(b.updatedAt, a.updatedAt);
      },
    );
  };

  public shared query (msg) func getEmailCampaign(id : Text) : async ?Types.EmailCampaignRecord {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "email");
    emailCampaignsById.get(id);
  };

  public shared (msg) func upsertEmailCampaign(rec : Types.EmailCampaignRecord) : async Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "email");
    let nowT = emailNowText();
    if (Text.size(rec.id) == 0) {
      let newId = newEmailCampaignId();
      let toSave : Types.EmailCampaignRecord = {
        rec with
        id = newId;
        createdBy = msg.caller;
        createdAt = if (Text.size(rec.createdAt) > 0) {
          rec.createdAt;
        } else {
          nowT;
        };
        updatedAt = nowT;
      };
      emailCampaignsById.put(newId, toSave);
      return newId;
    } else {
      switch (emailCampaignsById.get(rec.id)) {
        case null { Debug.trap("Email campaign not found") };
        case (?old) {
          let toSave : Types.EmailCampaignRecord = {
            rec with
            createdBy = old.createdBy;
            createdAt = old.createdAt;
            updatedAt = nowT;
          };
          emailCampaignsById.put(rec.id, toSave);
          return rec.id;
        };
      };
    };
  };

  public shared (msg) func markEmailCampaignSent(
    id : Text,
    resendBroadcastId : Text,
    lastError : ?Text,
  ) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "email");
    let nowT = emailNowText();
    switch (emailCampaignsById.get(id)) {
      case null { Debug.trap("Email campaign not found") };
      case (?rec) {
        let toSave : Types.EmailCampaignRecord = {
          rec with
          status = #sent;
          resendBroadcastId = ?resendBroadcastId;
          lastError = lastError;
          sentAt = ?nowT;
          updatedAt = nowT;
        };
        emailCampaignsById.put(id, toSave);
      };
    };
  };

  public shared (msg) func duplicateEmailCampaign(id : Text) : async Text {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "email");
    switch (emailCampaignsById.get(id)) {
      case null { Debug.trap("Email campaign not found") };
      case (?rec) {
        let newId = newEmailCampaignId();
        let nowT = emailNowText();
        let copy : Types.EmailCampaignRecord = {
          id = newId;
          title = rec.title;
          subject = rec.subject;
          previewText = rec.previewText;
          htmlBody = rec.htmlBody;
          textBody = rec.textBody;
          templateId = rec.templateId;
          audience = rec.audience;
          internalNotes = rec.internalNotes;
          status = #draft;
          createdAt = nowT;
          updatedAt = nowT;
          sentAt = null;
          resendBroadcastId = null;
          lastError = null;
          createdBy = msg.caller;
        };
        emailCampaignsById.put(newId, copy);
        return newId;
      };
    };
  };

  public shared (msg) func deleteEmailCampaign(id : Text) : async Bool {
    assertAdmin(msg.caller);
    switch (emailCampaignsById.remove(id)) {
      case null { false };
      case (?_) { true };
    };
  };
};
