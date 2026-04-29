import Blob "mo:base/Blob";
import Nat "mo:base/Nat";
import Text "mo:base/Text";

module {
    /// Resend audience segment: display name + UUID from Resend dashboard (Studio Services → Resend, max 5 on canister).
    public type ResendSegmentSlot = {
        name : Text;
        segmentId : Text;
    };

    /// Pre–Resend-audiences stable row (same 5 fields as `Subscriber` before 2026). `subscribersStable` stays this shape for IC stable upgrade compatibility.
    public type SubscriberV0 = {
        email : Text;
        category : Text;
        // Comes from the frontend as a string (e.g. ISO date).
        timestamp : Text;
        fullName : Text;
        /// `membership` | `access` | `apply` | empty
        intent : Text;
    };

    public type Subscriber = {
        email : Text;
        category : Text;
        // Comes from the frontend as a string (e.g. ISO date).
        timestamp : Text;
        fullName : Text;
        /// `membership` | `access` | `apply` | empty
        intent : Text;
        /// Resend segment UUIDs (idempotent SYNC Audience, Studio Manage pills). Default `[]` for new rows and legacy.
        audiences : [Text];
    };

    public func subscriberFromV0(s : SubscriberV0) : Subscriber {
        {
            email = s.email;
            category = s.category;
            timestamp = s.timestamp;
            fullName = s.fullName;
            intent = s.intent;
            audiences = [];
        };
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
    /// `contactEmail` is Studio / blast only; cleared in `sanitizeArtistRecordForPublic` (not in public `Artist`).
    /// Roster visibility: `inactive` (default new) | `pending` (submitted for review) | `private` (unlisted) | `public` (directory).
    public type ArtistCore = {
        id : Text;
        slug : Text;
        image : Text;
        featuredOrder : Nat;
        visibility : Text;
        updatedAt : Text;
        /// Roster contact for staff email; empty when unknown. Not exposed on public `Artist` or public profile reads.
        contactEmail : Text;
        filter : ?ArtistFilterStored;
        galleryFilter : ?ArtistGalleryFilter;
    };

    /// Public API (`listArtists`, `getArtistBySlug`): includes `mostRecentProgram` from the canister map.
    public type Artist = {
        id : Text;
        slug : Text;
        image : Text;
        heroProfileImage : Text;
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
        #collaborator;
        #admin;
    };

    /// Optional directory fields for team join and Studio Team tab (separate from `UserAccount` core for upgrade safety).
    public type AccountContact = {
        firstName : Text;
        lastName : Text;
        email : Text;
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
    /// `depositAmountDisplay` is part of the stored row; legacy rows were backfilled on upgrade.
    public type ProgramRecord = {
        id : Text;
        routeLink : Text;
        featuredOrder : Nat;
        visibility : Text;
        studioStatus : Text;
        updatedAt : Text;
        /// Public deposit line (e.g. currency + amount); also mirrored in locale `programPage.applicationForm.depositAmountDisplay` by the Studio app when saving.
        depositAmountDisplay : Text;
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

    /// Legacy 4-field journal layout (pre sortOrder/featured) — used only for stable upgrade migration.
    public type JournalLayoutRowV4 = {
        rowType : Text;
        refId : ?Text;
        selectionMode : ?Text;
        artistId : ?Text;
    };

    /// Ordered row model for `/journal` page composition.
    /// `rowType`: `event` | `journal-entry` | `quote` | `audio`.
    /// `selectionMode`: optional for quote/audio (`random` | `manual`).
    public type JournalLayoutRow = {
        rowType : Text;
        refId : ?Text;
        selectionMode : ?Text;
        artistId : ?Text;
        sortOrder : Nat;
        featured : Bool;
    };

    /// Public site + Studio: immersive header sound (atmosphere + scheduled artist voice overlays).
    public type SoundEnvironmentConfig = {
        categoryLabel : Text;
        atmosphereAudioUrl : Text;
        /// `random` | `manual`
        voiceSelectionMode : Text;
        voiceArtistId : ?Text;
        manualVoiceAudioUrl : Text;
        minIntervalSec : Nat;
        maxIntervalSec : Nat;
        atmosphereVolumePercent : Nat;
        voicesVolumePercent : Nat;
        learnMoreJournalEntryId : ?Text;
        enabled : Bool;
    };

    /// Shared artist media metadata (not localized), stored separately from stable ArtistCore.
    public type ArtistMedia = {
        quote : Text;
        audioUrl : Text;
        audioTitle : Text;
        updatedAt : Text;
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

    /// One Studio sidebar / workspace feature (id aligns with frontend section ids, e.g. `artists`, `settings`).
    public type StudioFeatureAccess = {
        visible : Bool;
        canEdit : Bool;
    };

    /// Matrix: feature id → access (bounded keys enforced in actor).
    public type StudioPermissionMatrix = [(Text, StudioFeatureAccess)];

    /// Tab key: `staff` | `curator` | `collector` | `artist` | `gallery` (lowercase Text).
    public type StudioPermissionDefaultsEntry = (Text, StudioPermissionMatrix);

    // --- Studio Email Campaigns (Studio → Email; staff/admin) ---

    public type EmailCampaignStatusV = {
        #draft;
        #pendingSend;
        #sent;
        #failed;
    };

    public type EmailAudienceKindV = {
        #allBroadcast;
        #category : Text;
    };

    public type EmailCampaignRecord = {
        id : Text;
        title : ?Text;
        subject : Text;
        previewText : Text;
        htmlBody : Text;
        textBody : ?Text;
        templateId : ?Text;
        audience : EmailAudienceKindV;
        internalNotes : Text;
        status : EmailCampaignStatusV;
        createdAt : Text;
        updatedAt : Text;
        sentAt : ?Text;
        resendBroadcastId : ?Text;
        lastError : ?Text;
        createdBy : Principal;
    };

    public type StudioPermissionOverrideEntry = (Principal, StudioPermissionMatrix);

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
        /// Optional: per-artist headshot for card “Profile” view (v1 exports before 2026 omit; parallel map for stable safety).
        artistHeroProfileImageStable : ?[(Text, Text)];
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
        /// Studio → Permissions UI: role-tab defaults (`staff`, …) and per-principal overrides.
        studioPermissionDefaultsStable : [StudioPermissionDefaultsEntry];
        studioPermissionOverridesStable : [StudioPermissionOverrideEntry];
        /// Principals that may open the Permissions section (with admins); managed by admin.
        superStaffPrincipalsStable : [Principal];
        /// Join Fusion / team directory: principal → name + email (`null` in backups from before this field existed).
        accountContactStable : ?[(Principal, AccountContact)];
    };
};
