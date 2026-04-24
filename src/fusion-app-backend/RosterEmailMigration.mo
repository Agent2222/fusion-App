import Array "mo:base/Array";
import Types "./types";
import Principal "mo:base/Principal";

/// One-time upgrade: `artistsStable` used `ArtistRecordV0` (`ArtistCore` without `contactEmail`).
/// Fills `profile.contactEmail` with `""` for every row.
module {
  func migrateArtistsStableFromV0(rows : [(Text, Types.ArtistRecordV0)]) : [(Text, Types.ArtistRecord)] {
    Array.map<(Text, Types.ArtistRecordV0), (Text, Types.ArtistRecord)>(
      rows,
      func(tup : (Text, Types.ArtistRecordV0)) : (Text, Types.ArtistRecord) {
        let (id, rec) = tup;
        let p = rec.profile;
        let core : Types.ArtistCore = {
          id = p.id;
          slug = p.slug;
          image = p.image;
          featuredOrder = p.featuredOrder;
          visibility = p.visibility;
          updatedAt = p.updatedAt;
          contactEmail = "";
          filter = p.filter;
          galleryFilter = p.galleryFilter;
        };
        (id, { rec with profile = core });
      },
    );
  };

  public func migration(
    old : {
      var adminPrincipals : [Principal];
      var subscribersStable : [(Text, Types.Subscriber)];
      var accountsStable : [(Principal, Types.UserAccountCore)];
      var membershipByPrincipalStable : [(Principal, Types.MembershipFields)];
      var membershipStripePeriodEndStable : [(Principal, Text)];
      var integrationServicePrincipal : ?Principal;
      var artistsStable : [(Text, Types.ArtistRecordV0)];
      var artistFilterCohortYearsStable : [(Text, [Nat])];
      var programsStable : [(Text, Types.ProgramRecord)];
      var journalsStable : [(Text, Types.JournalRecord)];
      var editionsStable : [(Text, Types.EditionRecord)];
      var contentPagesStable : [(Text, Types.ContentPageRecord)];
      var applicantsStable : [(Text, Types.ApplicantRecord)];
      var siteSettingsStable : [(Text, Text)];
      var joinInvitesStable : [(Text, Types.JoinInviteRecord)];
      var applicationByArtistProgramStable : [(Text, Text)];
      var artistMostRecentProgramStable : [(Text, Text)];
      var artistFeaturedFeaturableIdsStable : [Text];
      var artistFeaturedManualIdsStable : [Text];
      var artistFeaturedRandomModeStable : Bool;
      var studioPermissionDefaultsStable : [(Text, Types.StudioPermissionMatrix)];
      var studioPermissionOverridesStable : [(Principal, Types.StudioPermissionMatrix)];
      var superStaffPrincipalsStable : [Principal];
      var accountContactStable : [(Principal, Types.AccountContact)];
    },
  ) : {
    var adminPrincipals : [Principal];
    var subscribersStable : [(Text, Types.Subscriber)];
    var accountsStable : [(Principal, Types.UserAccountCore)];
    var membershipByPrincipalStable : [(Principal, Types.MembershipFields)];
    var membershipStripePeriodEndStable : [(Principal, Text)];
    var integrationServicePrincipal : ?Principal;
    var artistsStable : [(Text, Types.ArtistRecord)];
    var artistFilterCohortYearsStable : [(Text, [Nat])];
    var programsStable : [(Text, Types.ProgramRecord)];
    var journalsStable : [(Text, Types.JournalRecord)];
    var editionsStable : [(Text, Types.EditionRecord)];
    var contentPagesStable : [(Text, Types.ContentPageRecord)];
    var applicantsStable : [(Text, Types.ApplicantRecord)];
    var siteSettingsStable : [(Text, Text)];
    var joinInvitesStable : [(Text, Types.JoinInviteRecord)];
    var applicationByArtistProgramStable : [(Text, Text)];
    var artistMostRecentProgramStable : [(Text, Text)];
    var artistFeaturedFeaturableIdsStable : [Text];
    var artistFeaturedManualIdsStable : [Text];
    var artistFeaturedRandomModeStable : Bool;
    var studioPermissionDefaultsStable : [(Text, Types.StudioPermissionMatrix)];
    var studioPermissionOverridesStable : [(Principal, Types.StudioPermissionMatrix)];
    var superStaffPrincipalsStable : [Principal];
    var accountContactStable : [(Principal, Types.AccountContact)];
  } {
    {
      var adminPrincipals = old.adminPrincipals;
      var subscribersStable = old.subscribersStable;
      var accountsStable = old.accountsStable;
      var membershipByPrincipalStable = old.membershipByPrincipalStable;
      var membershipStripePeriodEndStable = old.membershipStripePeriodEndStable;
      var integrationServicePrincipal = old.integrationServicePrincipal;
      var artistsStable = migrateArtistsStableFromV0(old.artistsStable);
      var artistFilterCohortYearsStable = old.artistFilterCohortYearsStable;
      var programsStable = old.programsStable;
      var journalsStable = old.journalsStable;
      var editionsStable = old.editionsStable;
      var contentPagesStable = old.contentPagesStable;
      var applicantsStable = old.applicantsStable;
      var siteSettingsStable = old.siteSettingsStable;
      var joinInvitesStable = old.joinInvitesStable;
      var applicationByArtistProgramStable = old.applicationByArtistProgramStable;
      var artistMostRecentProgramStable = old.artistMostRecentProgramStable;
      var artistFeaturedFeaturableIdsStable = old.artistFeaturedFeaturableIdsStable;
      var artistFeaturedManualIdsStable = old.artistFeaturedManualIdsStable;
      var artistFeaturedRandomModeStable = old.artistFeaturedRandomModeStable;
      var studioPermissionDefaultsStable = old.studioPermissionDefaultsStable;
      var studioPermissionOverridesStable = old.studioPermissionOverridesStable;
      var superStaffPrincipalsStable = old.superStaffPrincipalsStable;
      var accountContactStable = old.accountContactStable;
    }
  }
}
