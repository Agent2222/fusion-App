/// Fusion Radar — siloed relationship-intelligence types (not shared with fusion-app-backend).

module {
  public type RadarLeadType = {
    #artist;
    #gallery;
    #curator;
    #collector;
    #organization;
  };

  public type RadarLeadStatus = {
    #discovered;
    #researching;
    #qualified;
    #contacted;
    #replied;
    #connected;
    #rejected;
    #archived;
  };

  public type RadarCareerStage = {
    #emerging;
    #midCareer;
    #established;
    #institution;
  };

  public type RadarLead = {
    id : Text;
    leadType : RadarLeadType;
    status : RadarLeadStatus;
    name : Text;
    location : Text;
    discipline : Text;
    careerStage : RadarCareerStage;
    website : Text;
    publicEmail : Text;
    instagram : Text;
    representation : Text;
    recentActivity : Text;
    japanConnection : Text;
    fusionFit : Text;
    discoveryReason : Text;
    warmConnection : Text;
    aiScore : Nat;
    aiRationale : Text;
    aiRecommendedOpportunity : Text;
    aiConcern : Text;
    aiBestOpeningTopic : Text;
    nextAction : Text;
    sourceUrls : [Text];
    sourceId : Text;
    tags : [Text];
    regionKey : Text;
    notes : Text;
    createdAt : Text;
    updatedAt : Text;
    scoredAt : Text;
    contactedAt : Text;
    repliedAt : Text;
    createdBy : Principal;
    payloadJson : Text;
  };

  public type RadarRelationshipKind = {
    #represents;
    #exhibitedBy;
    #curatedBy;
    #collaboratesWith;
    #referredBy;
    #fusionMember;
    #appliedTo;
    #attendedEvent;
  };

  public type RadarRelationship = {
    id : Text;
    fromLeadId : Text;
    toLeadId : Text;
    kind : RadarRelationshipKind;
    edgeLabel : Text;
    evidence : Text;
    createdAt : Text;
  };

  public type RadarOutreachStatus = {
    #drafted;
    #approved;
    #sent;
    #replied;
    #bounced;
  };

  public type RadarOutreachRecord = {
    id : Text;
    leadId : Text;
    subject : Text;
    bodyHtml : Text;
    triggerEvent : Text;
    templateId : Text;
    status : RadarOutreachStatus;
    draftedAt : Text;
    approvedBy : ?Principal;
    sentAt : Text;
    repliedAt : Text;
  };

  public type RadarSourceType = {
    #residencyList;
    #grantList;
    #galleryRoster;
    #exhibitionPage;
    #rssFeed;
    #instagramHashtag;
    #manualList;
    #googlePlaces;
  };

  public type RadarSourceConfig = {
    id : Text;
    sourceType : RadarSourceType;
    sourceLabel : Text;
    url : Text;
    searchQuery : Text;
    regionKey : Text;
    enabled : Bool;
    lastRunAt : Text;
    runIntervalHours : Nat;
    createdAt : Text;
  };

  public type RadarStats = {
    totalLeads : Nat;
    byStatusJson : Text;
    byTypeJson : Text;
    byRegionJson : Text;
    outreachDrafted : Nat;
    outreachSent : Nat;
    outreachReplied : Nat;
    avgScore : Nat;
  };

  public type RadarSnapshot = {
    leads : [RadarLead];
    relationships : [RadarRelationship];
    outreach : [RadarOutreachRecord];
    sources : [RadarSourceConfig];
    exportedAt : Text;
  };
};
