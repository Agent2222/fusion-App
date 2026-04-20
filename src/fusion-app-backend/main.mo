import Types "./types";
import Llm "mo:llm";
import _HashMap "mo:base/HashMap";
import _Iter "mo:base/Iter";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Order "mo:base/Order";

// One-time mainnet migration from minimal subscriber-only wasm used `Migration.mo` (removed after upgrade).
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

  // Stable snapshot of the HashMap entries (email -> subscriber).
  stable var subscribersStable : [(Text, Types.Subscriber)] = [];

  /// Principal -> user account core (roles, links). Flushed in preupgrade.
  stable var accountsStable : [(Principal, Types.UserAccountCore)] = [];

  /// Stripe + membership flags (parallel to `accountsStable`).
  stable var membershipByPrincipalStable : [(Principal, Types.MembershipFields)] = [];

  /// Integration API caller (PEM identity) — set via admin. Required for `integrationRecordStripeSubscription`.
  stable var integrationServicePrincipal : ?Principal = null;

  /// Artist id -> full record. Flushed in preupgrade.
  stable var artistsStable : [(Text, Types.ArtistRecord)] = [];

  stable var programsStable : [(Text, Types.ProgramRecord)] = [];
  stable var journalsStable : [(Text, Types.JournalRecord)] = [];
  stable var editionsStable : [(Text, Types.EditionRecord)] = [];
  stable var contentPagesStable : [(Text, Types.ContentPageRecord)] = [];
  stable var applicantsStable : [(Text, Types.ApplicantRecord)] = [];
  stable var siteSettingsStable : [(Text, Text)] = [];

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

  // In-memory hashmap for fast lookups/updates.
  transient var subscribersByEmail : _HashMap.HashMap<Text, Types.Subscriber> =
    _HashMap.HashMap<Text, Types.Subscriber>(
      subscribersStable.size(),
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

  transient var artistsById : _HashMap.HashMap<Text, Types.ArtistRecord> =
    _HashMap.HashMap<Text, Types.ArtistRecord>(
      artistsStable.size(),
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

  private let maxManualFeaturedStrip : Nat = 8;

  // Populate hashmaps on install / reload.
  for (entry in subscribersStable.vals()) {
    let email = entry.0;
    let sub = entry.1;
    subscribersByEmail.put(email, sub);
  };

  for (entry in accountsStable.vals()) {
    let p = entry.0;
    let acc = entry.1;
    accountsByPrincipal.put(p, acc);
  };

  for (entry in membershipByPrincipalStable.vals()) {
    membershipByPrincipal.put(entry.0, entry.1);
  };

  for (entry in artistsStable.vals()) {
    let id = entry.0;
    let rec = entry.1;
    artistsById.put(id, rec);
    artistSlugToId.put(rec.profile.slug, id);
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
        ?{
          role = core.role;
          status = core.status;
          linkedArtistId = core.linkedArtistId;
          linkedOrgId = core.linkedOrgId;
          updatedAt = core.updatedAt;
          stripeCustomerId = m.stripeCustomerId;
          stripeSubscriptionId = m.stripeSubscriptionId;
          stripeSubscriptionStatus = m.stripeSubscriptionStatus;
          membershipExemptManual = m.membershipExemptManual;
        };
      };
    };
  };

  private func putUserAccountParts(core : Types.UserAccountCore, m : Types.MembershipFields, p : Principal) {
    accountsByPrincipal.put(p, core);
    membershipByPrincipal.put(p, m);
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
    subscribersStable := _Iter.toArray(subscribersByEmail.entries());
    accountsStable := _Iter.toArray(accountsByPrincipal.entries());
    membershipByPrincipalStable := _Iter.toArray(membershipByPrincipal.entries());
    artistsStable := _Iter.toArray(artistsById.entries());
    programsStable := _Iter.toArray(programsById.entries());
    journalsStable := _Iter.toArray(journalsById.entries());
    editionsStable := _Iter.toArray(editionsById.entries());
    contentPagesStable := _Iter.toArray(contentBySlug.entries());
    applicantsStable := _Iter.toArray(applicantsById.entries());
    siteSettingsStable := _Iter.toArray(siteSettingsByKey.entries());
    applicationByArtistProgramStable := _Iter.toArray(applicationByArtistProgram.entries());
    artistMostRecentProgramStable := _Iter.toArray(mostRecentProgramByArtistId.entries());
    artistFeaturedFeaturableIdsStable := featurableIdsSorted();
    artistFeaturedManualIdsStable := Buffer.toArray(manualFeaturedArtistIds);
  };

  system func postupgrade() {
    subscribersByEmail := _HashMap.HashMap<Text, Types.Subscriber>(
      subscribersStable.size(),
      Text.equal,
      Text.hash
    );
    for (entry in subscribersStable.vals()) {
      let email = entry.0;
      let sub = entry.1;
      subscribersByEmail.put(email, sub);
    };
    subscribersStable := [];

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

    for (d in defaultAdminPrincipals().vals()) {
      if (not isAdminPrincipal(d)) {
        adminPrincipals := Array.append(adminPrincipals, [d]);
      };
    };
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
          visibility = "public";
          updatedAt = now;
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

  private func artistPublicFromCore(core : Types.ArtistCore, id : Text) : Types.Artist {
    let mrp = switch (mostRecentProgramByArtistId.get(id)) {
      case (?t) { t };
      case null { "" };
    };
    {
      id = core.id;
      slug = core.slug;
      image = core.image;
      featuredOrder = core.featuredOrder;
      visibility = core.visibility;
      updatedAt = core.updatedAt;
      filter = core.filter;
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
    Array.map<Types.ArtistRecord, Types.Artist>(
      sorted,
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
    { rec with accessCode = "" };
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
    Array.map<Types.ArtistRecord, Types.ArtistRecord>(
      sorted,
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

  /// Max URL length for profile hero image (HTTPS / asset ref).
  private let maxProfileImageUrlLen : Nat = 4096;

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
    _Iter.toArray(artistsById.vals());
  };

  private func putArtistRecord(record : Types.ArtistRecord) {
    let id = record.profile.id;
    let slug = record.profile.slug;
    switch (artistsById.get(id)) {
      case (?old) {
        if (old.profile.slug != slug) {
          ignore artistSlugToId.remove(old.profile.slug);
        };
      };
      case null {};
    };
    artistsById.put(id, record);
    artistSlugToId.put(slug, id);
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

  public shared (msg) func upsertArtist(record : Types.ArtistRecord) : async () {
    assertStaffOrAdmin(msg.caller);
    putArtistRecord(record);
  };

  public shared (msg) func bulkUpsertArtists(records : [Types.ArtistRecord]) : async () {
    assertStaffOrAdmin(msg.caller);
    for (r in records.vals()) {
      putArtistRecord(r);
    };
  };

  public shared (msg) func deleteArtistById(artistId : Text) : async Bool {
    assertStaffOrAdmin(msg.caller);
    switch (artistsById.get(artistId)) {
      case null { false };
      case (?rec) {
        unlinkAccountsAndAppsForArtist(artistId);
        cleanupFeaturedForDeletedArtist(artistId);
        ignore artistsById.remove(artistId);
        ignore artistSlugToId.remove(rec.profile.slug);
        ignore mostRecentProgramByArtistId.remove(artistId);
        true;
      };
    };
  };

  public shared (msg) func setArtistMostRecentProgram(artistId : Text, programKey : Text) : async () {
    assertStaffOrAdmin(msg.caller);
    switch (artistsById.get(artistId)) {
      case null { Debug.trap("Unknown artist id") };
      case (?_) { mostRecentProgramByArtistId.put(artistId, programKey) };
    };
  };

  public shared (msg) func setCurrentProgramSeason(value : Text) : async () {
    assertStaffOrAdmin(msg.caller);
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
    programsById.put(rec.id, rec);
  };

  public shared (msg) func bulkUpsertPrograms(records : [Types.ProgramRecord]) : async () {
    assertStaffOrAdmin(msg.caller);
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
    assertStudioLlmField(englishText);
    let instruction = "Translate the following English to Japanese. Output only the Japanese translation, with no surrounding quotes or commentary.\n\n";
    await Llm.prompt(#Llama3_1_8B, instruction # englishText);
  };

  /// Staff/admin: rewrite `sourceText` using `prompt`; `localeTag` is e.g. en or ja for model context.
  public shared (msg) func studioReinterpretWithPrompt(prompt : Text, sourceText : Text, localeTag : Text) : async Text {
    assertStaffOrAdmin(msg.caller);
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
        subscribersByEmail.put(email, {
          timestamp = timestamp;
          email = email;
          category = category;
          fullName = fullName;
          intent = intent;
        });
        return false;
      };
      case (?_) {
        subscribersByEmail.put(email, {
          timestamp = timestamp;
          email = email;
          category = category;
          fullName = fullName;
          intent = intent;
        });
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
};
