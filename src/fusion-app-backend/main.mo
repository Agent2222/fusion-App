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
  stable var membershipByPrincipalStable : [(Principal, Types.MembershipFields)] = [];

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
  stable var siteSettingsStable : [(Text, Text)] = [];

  /// Join invite codes (8-digit) — admin-generated; deactivated after first successful redemption.
  stable var joinInvitesStable : [(Text, Types.JoinInviteRecord)] = [];

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

  /// Card “Profile” headshot URLs — **append-only** stable slot; separate from `artistsStable` / `ArtistCore` for safe upgrades.
  stable var artistHeroProfileImageStable : [(Text, Text)] = [];

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
      membershipByPrincipalStable.size(),
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

  transient var applicantsById : _HashMap.HashMap<Text, Types.ApplicantRecord> =
    _HashMap.HashMap<Text, Types.ApplicantRecord>(0, Text.equal, Text.hash);

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

  transient var studioPermissionDefaultsByCategory : _HashMap.HashMap<Text, Types.StudioPermissionMatrix> =
    _HashMap.HashMap<Text, Types.StudioPermissionMatrix>(0, Text.equal, Text.hash);

  transient var studioPermissionOverridesByPrincipal : _HashMap.HashMap<Principal, Types.StudioPermissionMatrix> =
    _HashMap.HashMap<Principal, Types.StudioPermissionMatrix>(0, Principal.equal, Principal.hash);

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

  for (entry in membershipByPrincipalStable.vals()) {
    membershipByPrincipal.put(entry.0, entry.1);
  };

  for (entry in membershipStripePeriodEndStable.vals()) {
    membershipStripePeriodEndByPrincipal.put(entry.0, entry.1);
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
  for (entry in applicantsStable.vals()) {
    applicantsById.put(entry.0, entry.1);
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
  private let studioFeatureKeys : [Text] = [
    "dashboard",
    "home",
    "subscribers",
    "applicants",
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

  private func defaultOpenStudioAccess() : Types.StudioFeatureAccess {
    { visible = true; canEdit = true };
  };

  private func isKnownStudioFeatureKey(k : Text) : Bool {
    for (x in studioFeatureKeys.vals()) {
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

  private func fullOpenPermissionMatrix() : Types.StudioPermissionMatrix {
    Array.map<Text, (Text, Types.StudioFeatureAccess)>(
      studioFeatureKeys,
      func(k : Text) : (Text, Types.StudioFeatureAccess) {
        (k, defaultOpenStudioAccess());
      },
    );
  };

  private func allClosedPermissionMatrix() : Types.StudioPermissionMatrix {
    Array.map<Text, (Text, Types.StudioFeatureAccess)>(
      studioFeatureKeys,
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
      membershipExemptManual = false;
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
          stripeCurrentPeriodEnd = periodEnd;
          membershipExemptManual = m.membershipExemptManual;
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

  private func randomEightDigitCandidate() : Text {
    var rng : Nat = Int.abs(Time.now());
    var s = "";
    var i = 0;
    while (i < 8) {
      rng := Nat.rem(rng * 31 + 17, 1_000_000_000);
      s := s # digitCharSmall(Nat.rem(rng, 10));
      i += 1;
    };
    s;
  };

  private func isJoinInviteCodeTaken(code : Text) : Bool {
    switch (joinInvitesByCode.get(code)) {
      case (?_) { true };
      case null {
        switch (accessCodeToArtistId.get(code)) {
          case (?_) { true };
          case null { false };
        };
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
      membershipExemptManual = u.membershipExemptManual;
    };
    putUserAccountParts(core, m, p);
    putStripePeriodEndForPrincipal(p, u.stripeCurrentPeriodEnd);
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
        let base = switch (studioPermissionDefaultsByCategory.get(cat)) {
          case (?m) { m };
          case null { fullOpenPermissionMatrix() };
        };
        switch (studioPermissionOverridesByPrincipal.get(caller)) {
          case (?o) { ?o };
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
        if (st == "active" or st == "trialing") {
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
    let now = "1970-01-01T00:00:00.000Z";
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

  public shared query (msg) func adminGetStudioPermissionDefaults(category : Text) : async Types.StudioPermissionMatrix {
    assertAdminOrSuperStaffConfigure(msg.caller);
    if (not isKnownPermissionCategory(category)) {
      Debug.trap("Unknown permission category");
    };
    switch (studioPermissionDefaultsByCategory.get(category)) {
      case (?m) { m };
      case null { fullOpenPermissionMatrix() };
    };
  };

  public shared (msg) func adminSetStudioPermissionDefaults(category : Text, matrix : Types.StudioPermissionMatrix) : async () {
    assertAdminOrSuperStaffConfigure(msg.caller);
    if (not isKnownPermissionCategory(category)) {
      Debug.trap("Unknown permission category");
    };
    validateStudioPermissionMatrix(matrix);
    studioPermissionDefaultsByCategory.put(category, matrix);
  };

  public shared query (msg) func adminGetStudioPermissionOverride(p : Principal) : async ?Types.StudioPermissionMatrix {
    assertAdminOrSuperStaffConfigure(msg.caller);
    studioPermissionOverridesByPrincipal.get(p);
  };

  public shared (msg) func adminSetStudioPermissionOverride(p : Principal, matrix : Types.StudioPermissionMatrix) : async () {
    assertAdminOrSuperStaffConfigure(msg.caller);
    validateStudioPermissionMatrix(matrix);
    studioPermissionOverridesByPrincipal.put(p, matrix);
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
    membershipByPrincipalStable := _Iter.toArray(membershipByPrincipal.entries());
    membershipStripePeriodEndStable := _Iter.toArray(membershipStripePeriodEndByPrincipal.entries());
    artistsStable := _Iter.toArray(artistsById.entries());
    programsStable := _Iter.toArray(programsById.entries());
    journalsStable := _Iter.toArray(journalsById.entries());
    editionsStable := _Iter.toArray(editionsById.entries());
    contentPagesStable := _Iter.toArray(contentBySlug.entries());
    applicantsStable := _Iter.toArray(applicantsById.entries());
    siteSettingsStable := _Iter.toArray(siteSettingsByKey.entries());
    applicationByArtistProgramStable := _Iter.toArray(applicationByArtistProgram.entries());
    artistMostRecentProgramStable := _Iter.toArray(mostRecentProgramByArtistId.entries());
    artistFilterCohortYearsStable := _Iter.toArray(artistFilterCohortYearsById.entries());
    artistFeaturedFeaturableIdsStable := featurableIdsSorted();
    artistFeaturedManualIdsStable := Buffer.toArray(manualFeaturedArtistIds);
    joinInvitesStable := _Iter.toArray(joinInvitesByCode.entries());
    artistMediaStable := _Iter.toArray(artistMediaByArtistId.entries());
    studioPermissionDefaultsStable := _Iter.toArray(studioPermissionDefaultsByCategory.entries());
    studioPermissionOverridesStable := _Iter.toArray(studioPermissionOverridesByPrincipal.entries());
    superStaffPrincipalsStable := superStaffPrincipalsAsArray();
    accountContactStable := _Iter.toArray(accountContactByPrincipal.entries());
    artistHeroProfileImageStable := _Iter.toArray(artistHeroProfileImageById.entries());
    emailCampaignsStable := _Iter.toArray(emailCampaignsById.entries());
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
      membershipByPrincipalStable.size(),
      Principal.equal,
      Principal.hash
    );
    for (entry in membershipByPrincipalStable.vals()) {
      membershipByPrincipal.put(entry.0, entry.1);
    };
    membershipByPrincipalStable := [];

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

    applicantsById := _HashMap.HashMap<Text, Types.ApplicantRecord>(0, Text.equal, Text.hash);
    for (entry in applicantsStable.vals()) {
      applicantsById.put(entry.0, entry.1);
    };
    applicantsStable := [];

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
      membershipByPrincipalStable.size(),
      Principal.equal,
      Principal.hash
    );
    for (entry in membershipByPrincipalStable.vals()) {
      membershipByPrincipal.put(entry.0, entry.1);
    };

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

    reloadStudioPermissionTransientFromStable();
    seedStudioPermissionDefaultsIfEmpty();

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
      membershipStripePeriodEndStable = _Iter.toArray(membershipStripePeriodEndByPrincipal.entries());
      artistFilterCohortYearsStable = _Iter.toArray(artistFilterCohortYearsById.entries());
      artistHeroProfileImageStable = ?(_Iter.toArray(artistHeroProfileImageById.entries()));
      artistsStable = _Iter.toArray(artistsById.entries());
      programsStable = _Iter.toArray(programsById.entries());
      journalsStable = _Iter.toArray(journalsById.entries());
      editionsStable = _Iter.toArray(editionsById.entries());
      contentPagesStable = _Iter.toArray(contentBySlug.entries());
      applicantsStable = _Iter.toArray(applicantsById.entries());
      siteSettingsStable = _Iter.toArray(siteSettingsByKey.entries());
      applicationByArtistProgramStable = _Iter.toArray(applicationByArtistProgram.entries());
      artistMostRecentProgramStable = _Iter.toArray(mostRecentProgramByArtistId.entries());
      artistFeaturedFeaturableIdsStable = featurableIdsSorted();
      artistFeaturedManualIdsStable = Buffer.toArray(manualFeaturedArtistIds);
      joinInvitesStable = _Iter.toArray(joinInvitesByCode.entries());
      studioPermissionDefaultsStable = _Iter.toArray(studioPermissionDefaultsByCategory.entries());
      studioPermissionOverridesStable = _Iter.toArray(studioPermissionOverridesByPrincipal.entries());
      superStaffPrincipalsStable = superStaffPrincipalsAsArray();
      accountContactStable = ?_Iter.toArray(accountContactByPrincipal.entries());
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
    membershipByPrincipalStable := snapshot.membershipByPrincipalStable;
    membershipStripePeriodEndStable := snapshot.membershipStripePeriodEndStable;
    artistFilterCohortYearsStable := snapshot.artistFilterCohortYearsStable;
    artistHeroProfileImageStable := switch (snapshot.artistHeroProfileImageStable) {
      case null { [] };
      case (?rows) { rows };
    };
    artistsStable := snapshot.artistsStable;
    programsStable := snapshot.programsStable;
    journalsStable := snapshot.journalsStable;
    editionsStable := snapshot.editionsStable;
    contentPagesStable := snapshot.contentPagesStable;
    applicantsStable := snapshot.applicantsStable;
    siteSettingsStable := snapshot.siteSettingsStable;
    applicationByArtistProgramStable := snapshot.applicationByArtistProgramStable;
    artistMostRecentProgramStable := snapshot.artistMostRecentProgramStable;
    artistFeaturedFeaturableIdsStable := snapshot.artistFeaturedFeaturableIdsStable;
    artistFeaturedManualIdsStable := snapshot.artistFeaturedManualIdsStable;
    joinInvitesStable := snapshot.joinInvitesStable;
    studioPermissionDefaultsStable := snapshot.studioPermissionDefaultsStable;
    studioPermissionOverridesStable := snapshot.studioPermissionOverridesStable;
    superStaffPrincipalsStable := snapshot.superStaffPrincipalsStable;
    accountContactStable := switch (snapshot.accountContactStable) {
      case null { [] };
      case (?rows) { rows };
    };
    rebuildTransientFromImportedStableArrays();
  };

  // ===== Accounts =====

  public shared query (msg) func getAccountForCaller() : async ?Types.UserAccount {
    mergeAccount(msg.caller)
  };

  /// Billing / access for the logged-in principal (join gate + resubscribe).
  public shared query (msg) func getMembershipAccessForCaller() : async Types.MembershipAccessResult {
    membershipAccessForPrincipal(msg.caller);
  };

  /// Admin-only: set full account for any principal (e.g. promote staff).
  public shared (msg) func adminUpsertUserAccount(
    p : Principal,
    account : Types.UserAccount,
  ) : async () {
    assertAdmin(msg.caller);
    putUserAccountFull(p, account);
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
      membershipExemptManual = m0.membershipExemptManual;
    };
    membershipByPrincipal.put(memberPrincipal, m1);
    switch (stripeCurrentPeriodEnd) {
      case null { };
      case (?pe) { putStripePeriodEndForPrincipal(memberPrincipal, ?pe) };
    };
  };

  /// Caller registers or updates a non-privileged role; stored as #pending until admin activates.
  public shared (msg) func registerOrUpdateAccount(role : Types.UserRole) : async () {
    if (roleIsPrivileged(role)) {
      Debug.trap("Cannot self-request staff or admin");
    };
    let now = "1970-01-01T00:00:00.000Z";
    let acc : Types.UserAccountCore = {
      role = role;
      status = #pending;
      linkedArtistId = null;
      linkedOrgId = null;
      updatedAt = now;
    };
    accountsByPrincipal.put(msg.caller, acc);
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
    let now = "1970-01-01T00:00:00.000Z";
    var attempts : Nat = 0;
    while (attempts < 50) {
      let cand = randomEightDigitCandidate();
      if (not isJoinInviteCodeTaken(cand)) {
        let rec : Types.JoinInviteRecord = {
          role = role;
          active = true;
          createdAt = now;
        };
        joinInvitesByCode.put(cand, rec);
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
        let now = "1970-01-01T00:00:00.000Z";
        let core : Types.UserAccountCore = {
          role = inv.role;
          status = #active;
          linkedArtistId = null;
          linkedOrgId = null;
          updatedAt = now;
        };
        let dm = defaultMembership();
        let m : Types.MembershipFields = {
          dm with membershipExemptManual = true;
        };
        putUserAccountParts(core, m, msg.caller);
        accountContactByPrincipal.put(msg.caller, contact);
        let invDone : Types.JoinInviteRecord = {
          inv with active = false;
        };
        joinInvitesByCode.put(code, invDone);
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
            let now = "1970-01-01T00:00:00.000Z";
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
            let cleared : Types.ArtistRecord = {
              rec with accessCode = "";
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
  public shared (msg) func ensureMyLinkedArtistProfile() : async Types.EnsureLinkedProfileResult {
    if (Principal.equal(msg.caller, anonPrincipal)) {
      return #noAccount;
    };
    switch (accountsByPrincipal.get(msg.caller)) {
      case null { return #noAccount };
      case (?acc) {
        switch (acc.linkedArtistId) {
          case (?_) { return #alreadyLinked };
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
        let now = "1970-01-01T00:00:00.000Z";
        switch (artistsById.get(artistId)) {
          case (?_) {
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
          contactEmail = "";
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
    {
      id = core.id;
      slug = core.slug;
      image = core.image;
      heroProfileImage = hero;
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

  /// Staff/admin: mark whether an artist may appear in random featured selection.
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
    };
    applicantsById.put(key, applicant);
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
                let newProfile : Types.ArtistCore = {
                  rec.profile with
                  visibility = visibility;
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
                let m : Types.ArtistMedia = {
                  quote = quote;
                  audioUrl = audioUrl;
                  audioTitle = audioTitle;
                  updatedAt = newUpdated;
                };
                artistMediaByArtistId.put(aid, m);
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
                let now = "1970-01-01T00:00:00.000Z";
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
    let now = "1970-01-01T00:00:00.000Z";
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
    assertStudioFeatureVisible(msg.caller, "artists");
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

  private func buildAppliedJsonForArtist(aid : Text) : ?Text {
    let prefix = aid # "|";
    var inner : Text = "";
    var first : Bool = true;
    for ((k, v) in applicationByArtistProgram.entries()) {
      if (Text.startsWith(k, #text prefix)) {
        switch (Text.stripStart(k, #text prefix)) {
          case (?pid) {
            if (not first) {
              inner := inner # ",";
            };
            first := false;
            inner := inner # "\"" # pid # "\":" # v;
          };
          case null {};
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
    assertStudioFeatureEdit(msg.caller, "artists");
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
    let now = if (updatedAt.size() > 0) updatedAt else "1970-01-01T00:00:00.000Z";
    let m : Types.ArtistMedia = {
      quote = quote;
      audioUrl = audioUrl;
      audioTitle = audioTitle;
      updatedAt = now;
    };
    artistMediaByArtistId.put(artistId, m);
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

  public query func listJournalEntries() : async [Types.JournalRecord] {
    let vals = _Iter.toArray(journalsById.vals());
    Array.sort(
      vals,
      func(a : Types.JournalRecord, b : Types.JournalRecord) : Order.Order {
        Text.compare(a.id, b.id);
      },
    );
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
      case (?_) { true };
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
    let out = Buffer.Buffer<Types.ApplicantRecord>(applicantsById.size());
    for (row in applicantsById.vals()) {
      out.add(row);
    };
    // Backfill older applications that were stored only in applicationByArtistProgram.
    for ((key, entry) in applicationByArtistProgram.entries()) {
      switch (applicantsById.get(key)) {
        case (?_) {};
        case null {
          out.add(applicantRecordFromLegacyApplicationEntry(key, entry));
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

  public shared (msg) func upsertApplicant(rec : Types.ApplicantRecord) : async () {
    assertStaffOrAdmin(msg.caller);
    assertStudioFeatureEdit(msg.caller, "applicants");
    applicantsById.put(rec.id, rec);
  };

  public shared (msg) func deleteApplicant(applicantId : Text) : async Bool {
    assertAdmin(msg.caller);
    switch (applicantsById.remove(applicantId)) {
      case null { false };
      case (?_) { true };
    };
  };

  // ===== Site settings (key/value text) =====

  public query func getSiteSetting(key : Text) : async ?Text {
    siteSettingsByKey.get(key);
  };

  public shared (msg) func setSiteSetting(key : Text, value : Text) : async () {
    assertAdmin(msg.caller);
    siteSettingsByKey.put(key, value);
  };

  /// Admin-only: list all accounts (Studio Users tab).
  public shared query (msg) func listAccounts() : async [(Principal, Types.UserAccount)] {
    assertAdmin(msg.caller);
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

  /// Admin-only: name + email for Team tab (Join Fusion registration).
  public shared query (msg) func adminListAccountContacts() : async [(Principal, Types.AccountContact)] {
    assertAdmin(msg.caller);
    _Iter.toArray(accountContactByPrincipal.entries());
  };

  public shared (msg) func adminSetAccountContact(p : Principal, contact : Types.AccountContact) : async () {
    assertAdmin(msg.caller);
    assertContactFieldLen(contact.firstName);
    assertContactFieldLen(contact.lastName);
    assertContactFieldLen(contact.email);
    accountContactByPrincipal.put(p, contact);
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
