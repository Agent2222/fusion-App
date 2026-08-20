import Types "./types";
import Llm "mo:llm";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Debug "mo:base/Debug";

/// Fusion Radar — siloed relationship intelligence actor.
persistent actor {
  stable var adminPrincipals : [Principal] = [];
  stable var staffPrincipals : [Principal] = [];
  stable var integrationServicePrincipal : ?Principal = null;

  stable var radarLeadsStable : [(Text, Types.RadarLead)] = [];
  stable var radarRelationshipsStable : [(Text, Types.RadarRelationship)] = [];
  stable var radarOutreachStable : [(Text, Types.RadarOutreachRecord)] = [];
  stable var radarSourcesStable : [(Text, Types.RadarSourceConfig)] = [];
  stable var leadIdCounter : Nat = 0;
  stable var relIdCounter : Nat = 0;
  stable var outreachIdCounter : Nat = 0;
  stable var sourceIdCounter : Nat = 0;

  transient var leadsById = HashMap.HashMap<Text, Types.RadarLead>(64, Text.equal, Text.hash);
  transient var relationshipsById = HashMap.HashMap<Text, Types.RadarRelationship>(64, Text.equal, Text.hash);
  transient var outreachById = HashMap.HashMap<Text, Types.RadarOutreachRecord>(64, Text.equal, Text.hash);
  transient var sourcesById = HashMap.HashMap<Text, Types.RadarSourceConfig>(16, Text.equal, Text.hash);

  private func truncateForLlm(s : Text) : Text {
    s;
  };

  private func nowText() : Text {
    Int.toText(Time.now());
  };

  private func isAdmin(p : Principal) : Bool {
    for (a in adminPrincipals.vals()) {
      if (a == p) { return true };
    };
    false;
  };

  private func isStaff(p : Principal) : Bool {
    for (s in staffPrincipals.vals()) {
      if (s == p) { return true };
    };
    false;
  };

  private func assertAdmin(caller : Principal) {
    if (not isAdmin(caller)) {
      Debug.trap("Radar: admin only");
    };
  };

  private func assertStaffOrAdmin(caller : Principal) {
    if (not (isAdmin(caller) or isStaff(caller))) {
      Debug.trap("Radar: staff or admin only");
    };
  };

  private func assertIntegrationCaller(caller : Principal) {
    switch (integrationServicePrincipal) {
      case (?p) {
        if (p != caller) {
          Debug.trap("Radar: integration caller mismatch");
        };
      };
      case null {
        Debug.trap("Radar: integration principal not configured");
      };
    };
  };

  private func nextLeadId() : Text {
    leadIdCounter += 1;
    "rl-" # Nat.toText(leadIdCounter);
  };

  private func nextRelId() : Text {
    relIdCounter += 1;
    "rr-" # Nat.toText(relIdCounter);
  };

  private func nextOutreachId() : Text {
    outreachIdCounter += 1;
    "ro-" # Nat.toText(outreachIdCounter);
  };

  private func nextSourceId() : Text {
    sourceIdCounter += 1;
    "rs-" # Nat.toText(sourceIdCounter);
  };

  private func leadTypeKey(t : Types.RadarLeadType) : Text {
    switch (t) {
      case (#artist) { "artist" };
      case (#gallery) { "gallery" };
      case (#curator) { "curator" };
      case (#collector) { "collector" };
      case (#organization) { "organization" };
    };
  };

  private func statusKey(s : Types.RadarLeadStatus) : Text {
    switch (s) {
      case (#discovered) { "discovered" };
      case (#researching) { "researching" };
      case (#qualified) { "qualified" };
      case (#contacted) { "contacted" };
      case (#replied) { "replied" };
      case (#connected) { "connected" };
      case (#rejected) { "rejected" };
      case (#archived) { "archived" };
    };
  };

  private func serializeLeadBrief(l : Types.RadarLead) : Text {
    "Name: " # l.name # "\n"
    # "Type: " # leadTypeKey(l.leadType) # "\n"
    # "Location: " # l.location # "\n"
    # "Discipline: " # l.discipline # "\n"
    # "Japan connection: " # l.japanConnection # "\n"
    # "Recent activity: " # l.recentActivity # "\n"
    # "Discovery reason: " # l.discoveryReason # "\n"
    # "Warm connection: " # l.warmConnection # "\n"
    # "Fusion fit: " # l.fusionFit # "\n"
    # "Website: " # l.website # "\n"
    # "Notes: " # l.notes;
  };

  system func preupgrade() {
    radarLeadsStable := Iter.toArray(leadsById.entries());
    radarRelationshipsStable := Iter.toArray(relationshipsById.entries());
    radarOutreachStable := Iter.toArray(outreachById.entries());
    radarSourcesStable := Iter.toArray(sourcesById.entries());
  };

  system func postupgrade() {
    leadsById := HashMap.fromIter<Text, Types.RadarLead>(radarLeadsStable.vals(), radarLeadsStable.size(), Text.equal, Text.hash);
    relationshipsById := HashMap.fromIter<Text, Types.RadarRelationship>(
      radarRelationshipsStable.vals(),
      radarRelationshipsStable.size(),
      Text.equal,
      Text.hash,
    );
    outreachById := HashMap.fromIter<Text, Types.RadarOutreachRecord>(
      radarOutreachStable.vals(),
      radarOutreachStable.size(),
      Text.equal,
      Text.hash,
    );
    sourcesById := HashMap.fromIter<Text, Types.RadarSourceConfig>(
      radarSourcesStable.vals(),
      radarSourcesStable.size(),
      Text.equal,
      Text.hash,
    );
    radarLeadsStable := [];
    radarRelationshipsStable := [];
    radarOutreachStable := [];
    radarSourcesStable := [];
  };

  private func putLead(lead : Types.RadarLead, caller : Principal) : Types.RadarLead {
    var id = lead.id;
    var createdAt = lead.createdAt;
    var createdBy = lead.createdBy;
    if (Text.size(id) == 0) {
      id := nextLeadId();
      createdAt := nowText();
      createdBy := caller;
    };
    let stored : Types.RadarLead = {
      lead with
      id = id;
      createdAt = createdAt;
      createdBy = createdBy;
      updatedAt = nowText();
    };
    leadsById.put(id, stored);
    stored;
  };

  // ——— Auth management ———

  public shared (msg) func bootstrapAdminIfEmpty() : async Bool {
    if (adminPrincipals.size() > 0) {
      return false;
    };
    if (Principal.isAnonymous(msg.caller)) {
      Debug.trap("Radar: anonymous cannot bootstrap");
    };
    adminPrincipals := [msg.caller];
    true;
  };

  public shared (msg) func adminAddAdmin(p : Principal) : async () {
    assertAdmin(msg.caller);
    if (isAdmin(p)) { return };
    adminPrincipals := Array.append(adminPrincipals, [p]);
  };

  public shared (msg) func adminAddStaff(p : Principal) : async () {
    assertAdmin(msg.caller);
    if (isStaff(p) or isAdmin(p)) { return };
    staffPrincipals := Array.append(staffPrincipals, [p]);
  };

  public shared (msg) func adminRemoveStaff(p : Principal) : async () {
    assertAdmin(msg.caller);
    staffPrincipals := Array.filter<Principal>(staffPrincipals, func(x) { x != p });
  };

  public shared (msg) func adminSetIntegrationServicePrincipal(p : Principal) : async () {
    assertAdmin(msg.caller);
    integrationServicePrincipal := ?p;
  };

  public query (msg) func isCallerRadarAdmin() : async Bool {
    isAdmin(msg.caller);
  };

  public query (msg) func isCallerRadarStaffOrAdmin() : async Bool {
    isAdmin(msg.caller) or isStaff(msg.caller);
  };

  public query func listRadarAdmins() : async [Principal] {
    adminPrincipals;
  };

  public query func listRadarStaff() : async [Principal] {
    staffPrincipals;
  };

  // ——— Leads ———

  public shared (msg) func staffUpsertRadarLead(lead : Types.RadarLead) : async Types.RadarLead {
    assertStaffOrAdmin(msg.caller);
    putLead(lead, msg.caller);
  };

  public shared (msg) func staffBulkUpsertRadarLeads(leads : [Types.RadarLead]) : async Nat {
    assertStaffOrAdmin(msg.caller);
    var n : Nat = 0;
    for (lead in leads.vals()) {
      ignore putLead(lead, msg.caller);
      n += 1;
    };
    n;
  };

  public shared (msg) func integrationBulkIngestRadarLeads(leads : [Types.RadarLead]) : async Nat {
    assertIntegrationCaller(msg.caller);
    var n : Nat = 0;
    for (lead in leads.vals()) {
      ignore putLead(lead, msg.caller);
      n += 1;
    };
    n;
  };

  public shared (msg) func staffDeleteRadarLead(id : Text) : async Bool {
    assertStaffOrAdmin(msg.caller);
    switch (leadsById.remove(id)) {
      case (?_) { true };
      case null { false };
    };
  };

  public query (msg) func staffGetRadarLead(id : Text) : async ?Types.RadarLead {
    assertStaffOrAdmin(msg.caller);
    leadsById.get(id);
  };

  public query (msg) func staffListRadarLeads() : async [Types.RadarLead] {
    assertStaffOrAdmin(msg.caller);
    Iter.toArray(leadsById.vals());
  };

  // ——— Relationships ———

  public shared (msg) func staffUpsertRadarRelationship(rel : Types.RadarRelationship) : async Types.RadarRelationship {
    assertStaffOrAdmin(msg.caller);
    var id = rel.id;
    var createdAt = rel.createdAt;
    if (Text.size(id) == 0) {
      id := nextRelId();
      createdAt := nowText();
    };
    let stored : Types.RadarRelationship = {
      rel with
      id = id;
      createdAt = createdAt;
    };
    relationshipsById.put(id, stored);
    stored;
  };

  public shared (msg) func staffDeleteRadarRelationship(id : Text) : async Bool {
    assertStaffOrAdmin(msg.caller);
    switch (relationshipsById.remove(id)) {
      case (?_) { true };
      case null { false };
    };
  };

  public query (msg) func staffListRadarRelationships(leadId : Text) : async [Types.RadarRelationship] {
    assertStaffOrAdmin(msg.caller);
    if (Text.size(leadId) == 0) {
      return Iter.toArray(relationshipsById.vals());
    };
    Array.filter<Types.RadarRelationship>(
      Iter.toArray(relationshipsById.vals()),
      func(r) { r.fromLeadId == leadId or r.toLeadId == leadId },
    );
  };

  // ——— Outreach ———

  public shared (msg) func staffUpsertRadarOutreach(rec : Types.RadarOutreachRecord) : async Types.RadarOutreachRecord {
    assertStaffOrAdmin(msg.caller);
    var id = rec.id;
    var draftedAt = rec.draftedAt;
    if (Text.size(id) == 0) {
      id := nextOutreachId();
      draftedAt := nowText();
    };
    let stored : Types.RadarOutreachRecord = {
      rec with
      id = id;
      draftedAt = draftedAt;
    };
    outreachById.put(id, stored);
    stored;
  };

  public shared (msg) func staffDeleteRadarOutreach(id : Text) : async Bool {
    assertStaffOrAdmin(msg.caller);
    switch (outreachById.remove(id)) {
      case (?_) { true };
      case null { false };
    };
  };

  public query (msg) func staffListRadarOutreach(leadId : Text) : async [Types.RadarOutreachRecord] {
    assertStaffOrAdmin(msg.caller);
    if (Text.size(leadId) == 0) {
      return Iter.toArray(outreachById.vals());
    };
    Array.filter<Types.RadarOutreachRecord>(
      Iter.toArray(outreachById.vals()),
      func(r) { r.leadId == leadId },
    );
  };

  // ——— Sources ———

  public shared (msg) func staffUpsertRadarSource(src : Types.RadarSourceConfig) : async Types.RadarSourceConfig {
    assertStaffOrAdmin(msg.caller);
    var id = src.id;
    var createdAt = src.createdAt;
    if (Text.size(id) == 0) {
      id := nextSourceId();
      createdAt := nowText();
    };
    let stored : Types.RadarSourceConfig = {
      src with
      id = id;
      createdAt = createdAt;
    };
    sourcesById.put(id, stored);
    stored;
  };

  public shared (msg) func staffDeleteRadarSource(id : Text) : async Bool {
    assertStaffOrAdmin(msg.caller);
    switch (sourcesById.remove(id)) {
      case (?_) { true };
      case null { false };
    };
  };

  public query (msg) func staffListRadarSources() : async [Types.RadarSourceConfig] {
    assertStaffOrAdmin(msg.caller);
    Iter.toArray(sourcesById.vals());
  };

  // ——— Stats ———

  public query (msg) func staffRadarStats() : async Types.RadarStats {
    assertStaffOrAdmin(msg.caller);
    let leads = Iter.toArray(leadsById.vals());
    var sumScore : Nat = 0;
    for (l in leads.vals()) {
      sumScore += l.aiScore;
    };
    let avg = if (leads.size() == 0) { 0 } else { sumScore / leads.size() };
    var drafted : Nat = 0;
    var sent : Nat = 0;
    var replied : Nat = 0;
    for (o in outreachById.vals()) {
      switch (o.status) {
        case (#drafted) { drafted += 1 };
        case (#approved) { drafted += 1 };
        case (#sent) { sent += 1 };
        case (#replied) { replied += 1; sent += 1 };
        case (#bounced) {};
      };
    };
    {
      totalLeads = leads.size();
      byStatusJson = "";
      byTypeJson = "";
      byRegionJson = "";
      outreachDrafted = drafted;
      outreachSent = sent;
      outreachReplied = replied;
      avgScore = avg;
    };
  };

  // ——— LLM ———

  public shared (msg) func staffScoreRadarLead(leadId : Text, fusionContext : Text) : async Text {
    assertStaffOrAdmin(msg.caller);
    switch (leadsById.get(leadId)) {
      case null { Debug.trap("Radar: lead not found") };
      case (?lead) {
        let prompt =
          "You are an AI evaluator for Fusion, a curated art network rooted in Japan.\n"
          # "Score this lead across six dimensions (0-100 each):\n"
          # "1. Alignment with Fusion's artistic perspective (25% weight)\n"
          # "2. Japan or cross-cultural relevance (20% weight)\n"
          # "3. Appropriate career or organizational stage (15% weight)\n"
          # "4. Evidence of current activity (15% weight)\n"
          # "5. Potential relationship value (15% weight)\n"
          # "6. Reachability or warm connection (10% weight)\n\n"
          # "Lead data:\n"
          # serializeLeadBrief(lead)
          # "\n\nExisting Fusion context:\n"
          # fusionContext
          # "\n\nReturn ONLY valid JSON with keys: dimensions (array of {name,score,reasoning}), "
          # "totalScore, rationale, recommendedOpportunity, concern, bestOpeningTopic, supportingSources.";
        let raw = await Llm.prompt(#Llama3_1_8B, truncateForLlm(prompt));
        let updated : Types.RadarLead = {
          lead with
          scoredAt = nowText();
          updatedAt = nowText();
          payloadJson = raw;
        };
        leadsById.put(leadId, updated);
        raw;
      };
    };
  };

  public shared (msg) func staffDraftRadarOutreach(leadId : Text, triggerContext : Text) : async Text {
    assertStaffOrAdmin(msg.caller);
    switch (leadsById.get(leadId)) {
      case null { Debug.trap("Radar: lead not found") };
      case (?lead) {
        let prompt =
          "You draft personalized outreach for Fusion (curated art network rooted in Japan).\n"
          # "AI drafts; a human will approve. Be specific, warm, and never use generic 'we love your work' openers.\n\n"
          # "Lead:\n"
          # serializeLeadBrief(lead)
          # "\n\nTrigger / context:\n"
          # triggerContext
          # "\n\nReturn ONLY valid JSON: { \"subject\": \"...\", \"body\": \"...\", \"recommendedSendTiming\": \"...\" }";
        await Llm.prompt(#Llama3_1_8B, truncateForLlm(prompt));
      };
    };
  };

  public shared (msg) func staffEnrichFromText(sourceText : Text) : async Text {
    assertStaffOrAdmin(msg.caller);
    let prompt =
      "Extract a Fusion Radar lead from the following public text. "
      # "Return ONLY JSON with keys: name, leadType (artist|gallery|curator|collector|organization), "
      # "location, discipline, careerStage (emerging|midCareer|established|institution), website, "
      # "publicEmail, instagram, representation, recentActivity, japanConnection, discoveryReason, fusionFit.\n\n"
      # sourceText;
    await Llm.prompt(#Llama3_1_8B, truncateForLlm(prompt));
  };

  // ——— Snapshot ———

  public query (msg) func adminExportRadarSnapshot() : async Types.RadarSnapshot {
    assertAdmin(msg.caller);
    {
      leads = Iter.toArray(leadsById.vals());
      relationships = Iter.toArray(relationshipsById.vals());
      outreach = Iter.toArray(outreachById.vals());
      sources = Iter.toArray(sourcesById.vals());
      exportedAt = nowText();
    };
  };

  public shared (msg) func health() : async Text {
    ignore msg;
    "fusion-radar-ok";
  };
};
