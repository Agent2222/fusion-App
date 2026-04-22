import Blob "mo:base/Blob";
import Nat "mo:base/Nat";
import Text "mo:base/Text";

module {
    public type Subscriber = {
        email : Text;
        category : Text;
        // Comes from the frontend as a string (e.g. ISO date).
        timestamp : Text;
        fullName : Text;
        /// `membership` | `access` | `apply` | empty
        intent : Text;
    };

    /// Stored on-chain in `ArtistCore.profile.filter` — must keep **all** legacy fields (see stable upgrade M0216).
    /// Single `cohortYear` matches older deployments; multi-year lists use `artistFilterCohortYearsStable` in the actor.
    public type ArtistFilterStored = {
        connection : Text;
        cohortYear : Nat;
        disciplineKey : Text;
        locationKey : Text;
    };

    /// Public API (`listArtists`, `getArtistBySlug`): merged from stored filter + cohort side map.
    public type ArtistFilter = {
        connection : Text;
        disciplineKey : Text;
        locationKey : Text;
        cohortYears : ?[Nat];
    };

    /// Build public filter for queries (multi-year side map overrides / extends `cohortYear`).
    public func mergeArtistFilterForPublic(stored : ?ArtistFilterStored, cohortYearsSide : ?[Nat]) : ?ArtistFilter {
        switch (stored) {
            case null { null };
            case (?f) {
                let cy : ?[Nat] = switch (cohortYearsSide) {
                    case (?ys) {
                        if (ys.size() > 0) {
                            ?ys;
                        } else if (f.cohortYear > 0) {
                            ?[f.cohortYear];
                        } else {
                            null;
                        };
                    };
                    case null {
                        if (f.cohortYear > 0) {
                            ?[f.cohortYear];
                        } else {
                            null;
                        };
                    };
                };
                ?{
                    connection = f.connection;
                    disciplineKey = f.disciplineKey;
                    locationKey = f.locationKey;
                    cohortYears = cy;
                };
            };
        };
    };

    /// Gallery access row — align with `testData` / `deriveGalleryAccessRow`.
    public type ArtistGalleryFilter = {
        accessType : Text;
        season : Nat;
        view : Text;
    };

    /// Stored roster profile (stable `ArtistRecord.profile`) — no derived/joined fields.
    public type ArtistCore = {
        id : Text;
        slug : Text;
        image : Text;
        featuredOrder : Nat;
        visibility : Text;
        updatedAt : Text;
        filter : ?ArtistFilterStored;
        galleryFilter : ?ArtistGalleryFilter;
    };

    /// Public API (`listArtists`, `getArtistBySlug`): includes `mostRecentProgram` from the canister map.
    public type Artist = {
        id : Text;
        slug : Text;
        image : Text;
        featuredOrder : Nat;
        visibility : Text;
        updatedAt : Text;
        filter : ?ArtistFilter;
        galleryFilter : ?ArtistGalleryFilter;
        mostRecentProgram : Text;
    };

    /// VetKD Phase A: store ciphertext only; client derives keys (see VETKD.md). Phase B wires vetkd_* calls.
    public type EncryptedBlob = {
        ciphertext : Blob;
        iv : Blob;
        alg : Text;
    };

    /// Product roles — align with early-access categories + Studio.
    public type UserRole = {
        #artist;
        #gallery;
        #curator;
        #collector;
        #staff;
        #admin;
    };

    public type AccountStatus = {
        #pending;
        #active;
        #suspended;
    };

    /// Stable / legacy row — same layout as the original five-field `UserAccount` (upgrade-safe).
    public type UserAccountCore = {
        role : UserRole;
        status : AccountStatus;
        linkedArtistId : ?Text;
        linkedOrgId : ?Text;
        updatedAt : Text;
    };

    /// Stripe subscription + manual exemption (stored in `membershipByPrincipal` stable map).
    /// Renewal end date is stored separately (`membershipStripePeriodEndStable` in the actor) so this record stays compatible with older canisters.
    public type MembershipFields = {
        stripeCustomerId : ?Text;
        stripeSubscriptionId : ?Text;
        stripeSubscriptionStatus : ?Text;
        membershipExemptManual : Bool;
    };

    /// Authenticated user profile (Principal -> account). Admin list in actor still gates destructive ops.
    /// Merged from `UserAccountCore` + `MembershipFields` for API responses.
    public type UserAccount = {
        role : UserRole;
        status : AccountStatus;
        linkedArtistId : ?Text;
        linkedOrgId : ?Text;
        updatedAt : Text;
        stripeCustomerId : ?Text;
        stripeSubscriptionId : ?Text;
        stripeSubscriptionStatus : ?Text;
        stripeCurrentPeriodEnd : ?Text;
        membershipExemptManual : Bool;
    };

    /// Site access vs billing: used after login to gate paywall / join modal.
    public type MembershipAccessResult = {
        #noAccount;
        #exempt;
        #ok;
        #needsSubscription;
    };

    /// Self-service profile link after membership is active (`ensureMyLinkedArtistProfile`).
    public type EnsureLinkedProfileResult = {
        #ok;
        #alreadyLinked;
        #needsSubscription;
        #noAccount;
    };

    /// Admin-generated join invite (gallery / curator / collector / artist) — single-use while `active`.
    public type JoinInviteRecord = {
        role : UserRole;
        active : Bool;
        createdAt : Text;
    };

    /// Result of `registerWithJoinAccessCode` (Internet Identity required).
    public type RegisterWithJoinAccessCodeResult = {
        #ok;
        #invalidCode;
        #wrongRole;
        #artistAlreadyLinked;
        #accountExists;
        #inviteInactive;
    };

    /// Full artist row for canister + Studio: public `profile` + optional JSON blob for locales (versioned).
    /// `imported` / `accessCode` are Studio-only onboarding fields (not in public `Artist` / `listArtists`).
    public type ArtistRecord = {
        profile : ArtistCore;
        localesJson : ?Text;
        notesEncrypted : ?EncryptedBlob;
        imported : Bool;
        accessCode : Text;
    };

    /// Home / artists featured strip — stored in dedicated stable maps (not embedded in `ArtistCore`).
    public type ArtistFeaturedGalleryPublic = {
        randomFeatured : Bool;
        manualFeaturedIds : [Text];
        featurableIds : [Text];
    };

    /// Program card + detail page JSON (versioned) — mirrors `testData.allPrograms.programs`.
    /// Locale JSON may include `programPage.applicationPaymentOptions` (one_time | bimonthly | annual — application form cards),
    /// `programPage.programDetails.costs.applicationFee` (sidebar),
    /// `programPage.additionalInfo.applicationFee` (Application Fee dropdown),
    /// and `programPage.additionalInfo.aboutProgram` (About Program dropdown).
    /// Site settings key `applicationPaymentGlobal` (opaque Text JSON): global EN/JA bullets for the application form.
    /// `studioStatus`: open | full | active | completed | comingUp (Text for Studio filters).
    public type ProgramRecord = {
        id : Text;
        routeLink : Text;
        featuredOrder : Nat;
        visibility : Text;
        studioStatus : Text;
        updatedAt : Text;
        localesJson : Text;
    };

    public type JournalRecord = {
        id : Text;
        link : Text;
        imageKey : Text;
        entryStatus : Text;
        updatedAt : Text;
        localesJson : Text;
    };

    public type EditionRecord = {
        id : Text;
        href : Text;
        productStatus : Text;
        updatedAt : Text;
        localesJson : Text;
    };

    public type ContentPageRecord = {
        slug : Text;
        updatedAt : Text;
        localesJson : Text;
    };

    public type ApplicantStatus = {
        #pending;
        #reviewing;
        #needsInfo;
        #accepted;
        #rejected;
    };

    public type ApplicantRecord = {
        id : Text;
        programId : Text;
        email : Text;
        fullName : Text;
        status : ApplicantStatus;
        createdAt : Text;
        payloadJson : Text;
    };

    // --- Profile plan: explicit names for JSON blobs (full locale trees stay in `ArtistRecord.localesJson`) ---

    /// Canonical per-locale payload is JSON inside `ArtistRecord.localesJson` (en/ja blocks). Motoko keeps it opaque
    /// so we do not lose polymorphic fields (e.g. `world.*` string vs array) before frontend normalization.
    public type LocalesJsonBlob = Text;

    /// Future owner-only account bucket (bookmarks, inbox, subscription) — not merged into public reads.
    public type AccountPrivateJson = Text;

    /// Non-artist member profile (collectors / future roles). Not stored in actor yet — schema for routing + APIs.
    public type CollectorProfileRecord = {
        id : Text;
        slug : Text;
        displayName : Text;
        updatedAt : Text;
        visibility : Text;
        localesJson : ?Text;
    };

    /// Admin-only full canister backup / restore (`adminExportFullDatabase` / `adminImportFullDatabase`).
    public type DatabaseSnapshotV1 = {
        version : Nat;
        adminPrincipals : [Principal];
        integrationServicePrincipal : ?Principal;
        artistFeaturedRandomMode : Bool;
        subscribersStable : [(Text, Subscriber)];
        accountsStable : [(Principal, UserAccountCore)];
        membershipByPrincipalStable : [(Principal, MembershipFields)];
        membershipStripePeriodEndStable : [(Principal, Text)];
        /// Artist id → cohort years for feed filters (parallel to `artistsStable.profile.filter`).
        artistFilterCohortYearsStable : [(Text, [Nat])];
        artistsStable : [(Text, ArtistRecord)];
        programsStable : [(Text, ProgramRecord)];
        journalsStable : [(Text, JournalRecord)];
        editionsStable : [(Text, EditionRecord)];
        contentPagesStable : [(Text, ContentPageRecord)];
        applicantsStable : [(Text, ApplicantRecord)];
        siteSettingsStable : [(Text, Text)];
        applicationByArtistProgramStable : [(Text, Text)];
        artistMostRecentProgramStable : [(Text, Text)];
        artistFeaturedFeaturableIdsStable : [Text];
        artistFeaturedManualIdsStable : [Text];
        joinInvitesStable : [(Text, JoinInviteRecord)];
    };
};
