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

    /// Feed row for `deriveArtistFilterRow` / `app-feed-filter` — align with `testData.allArtists.artists[].filter`.
    public type ArtistFilter = {
        connection : Text;
        cohortYear : Nat;
        disciplineKey : Text;
        locationKey : Text;
    };

    /// Gallery access row — align with `testData` / `deriveGalleryAccessRow`.
    public type ArtistGalleryFilter = {
        accessType : Text;
        season : Nat;
        view : Text;
    };

    /// Top-level artist listing / profile metadata — mirror `testData.allArtists.artists[]`.
    /// `image` is HTTPS or S3 key reference, not raw blob. Locales / nested body: extend or version next.
    public type Artist = {
        id : Text;
        slug : Text;
        image : Text;
        featuredOrder : Nat;
        visibility : Text;
        updatedAt : Text;
        filter : ?ArtistFilter;
        galleryFilter : ?ArtistGalleryFilter;
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

    /// Full artist row for canister + Studio: public `profile` + optional JSON blob for locales (versioned).
    /// `imported` / `accessCode` are Studio-only onboarding fields (not in public `Artist` / `listArtists`).
    public type ArtistRecord = {
        profile : Artist;
        localesJson : ?Text;
        notesEncrypted : ?EncryptedBlob;
        imported : Bool;
        accessCode : Text;
    };

    /// Program card + detail page JSON (versioned) — mirrors `testData.allPrograms.programs`.
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
};
