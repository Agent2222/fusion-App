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

    /// Authenticated user profile (Principal -> account). Admin list in actor still gates destructive ops.
    public type UserAccount = {
        role : UserRole;
        status : AccountStatus;
        linkedArtistId : ?Text;
        linkedOrgId : ?Text;
        updatedAt : Text;
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
};
