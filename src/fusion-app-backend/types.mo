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
        /// Staff-approved headshot for public cards; when false, UI uses artwork (`image`) instead.
        heroProfileImageApproved : Bool;
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

    /// Pre-PayPal membership row (as stored on mainnet before the PayPal fields were added).
    /// Read-only migration source; upgrade path is `membershipFieldsFromV0`.
    public type MembershipFieldsV0 = {
        stripeCustomerId : ?Text;
        stripeSubscriptionId : ?Text;
        stripeSubscriptionStatus : ?Text;
        membershipExemptManual : Bool;
    };

    /// Stripe / PayPal subscription + manual exemption (stored in `membershipByPrincipal` stable map).
    /// Renewal end date is stored separately (`membershipStripePeriodEndStable` in the actor) so this record stays compatible with older canisters.
    public type MembershipFields = {
        stripeCustomerId : ?Text;
        stripeSubscriptionId : ?Text;
        stripeSubscriptionStatus : ?Text;
        paypalSubscriptionId : ?Text;
        paypalSubscriptionStatus : ?Text;
        paymentProvider : ?Text;
        membershipExemptManual : Bool;
    };

    /// Migrate a pre-PayPal membership row to the current shape (no PayPal subscription).
    public func membershipFieldsFromV0(row : MembershipFieldsV0) : MembershipFields {
        {
            stripeCustomerId = row.stripeCustomerId;
            stripeSubscriptionId = row.stripeSubscriptionId;
            stripeSubscriptionStatus = row.stripeSubscriptionStatus;
            paypalSubscriptionId = null;
            paypalSubscriptionStatus = null;
            paymentProvider = null;
            membershipExemptManual = row.membershipExemptManual;
        };
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
        paypalSubscriptionId : ?Text;
        paypalSubscriptionStatus : ?Text;
        paymentProvider : ?Text;
        stripeCurrentPeriodEnd : ?Text;
        membershipExemptManual : Bool;
        trialStartedAtSec : ?Nat;
        trialEndsAtSec : ?Nat;
    };

    /// Site access vs billing: used after login to gate paywall / join modal.
    public type MembershipAccessResult = {
        #noAccount;
        #exempt;
        #ok;
        #needsSubscription;
    };

    /// Self-service profile link (`ensureMyLinkedArtistProfile` / `ensureMyLinkedArtistProfileForApplication`).
    public type EnsureLinkedProfileResult = {
        #ok;
        #alreadyLinked;
        #needsSubscription;
        #noAccount;
    };

    /// Successful admin / integration reconnect of a member row to a new Internet Identity principal.
    public type AdminReconnectMemberOk = {
        fromPrincipal : Text;
        toPrincipal : Text;
        linkedArtistId : ?Text;
        paymentProvider : ?Text;
    };

    /// Move membership + artist link from one principal to another (old row suspended).
    public type AdminReconnectMemberResult = {
        #ok : AdminReconnectMemberOk;
        #samePrincipal;
        #noSourceAccount;
        #targetHasAccount;
        #targetLinkedToDifferentArtist;
        #cannotMigratePrivilegedAccount;
    };

    /// Admin-generated join invite (gallery / curator / collector / artist) — single-use while `active`.
    public type JoinInviteRecord = {
        role : UserRole;
        active : Bool;
        createdAt : Text;
    };

    public type TrialMembershipWindow = {
        startedAtSec : Nat;
        endsAtSec : Nat;
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

    /// ---------- Promo / invite / partner code system ----------

    public type PromoCodeType = {
        #invite;
        #promo;
        #partner;
    };

    public type PromoDiscountType = {
        #percentOff : Nat;
        #fixedCentsOff : Nat;
        #freeMonths : Nat;
    };

    public type PromoCode = {
        code : Text;
        codeType : PromoCodeType;
        createdBy : Principal;
        createdAt : Text;
        discountType : PromoDiscountType;
        discountDurationMonths : Nat;
        maxRedemptions : ?Nat;
        currentRedemptions : Nat;
        expiresAt : ?Text;
        active : Bool;
        referrerPrincipal : ?Principal;
        referrerArtistId : ?Text;
        partnerLabel : ?Text;
        campaignTag : ?Text;
    };

    public type PromoRedemption = {
        code : Text;
        redeemerPrincipal : Principal;
        redeemedAt : Text;
        discountApplied : Text;
        subscriptionId : ?Text;
    };

    public type ValidatePromoCodeResult = {
        #ok : PromoCode;
        #invalidCode;
        #expired;
        #maxRedemptionsReached;
        #inactive;
    };

    public type RedeemPromoCodeResult = {
        #ok;
        #invalidCode;
        #expired;
        #maxRedemptionsReached;
        #inactive;
        #alreadyRedeemed;
    };

    /// ---------- Invite lineage ----------

    public type JoinSeason = { #spring; #summer; #autumn; #winter };

    public type InviteLineage = {
        memberPrincipal : Principal;
        invitedByPrincipal : Principal;
        invitedByArtistId : ?Text;
        inviteCode : Text;
        joinedAt : Text;
        joinYear : Nat;
        joinSeason : JoinSeason;
    };

    /// ---------- Broadcast credits (referral rewards) ----------

    public type BroadcastCreditRecord = {
        balance : Nat;
        grantedThisYear : Nat;
        lastGrantYear : Nat;
    };

    public type BroadcastChannel = { #featuredArtist; #newsletterBlast; #socialPost };

    public type BroadcastRedemption = {
        id : Text;
        principal : Principal;
        channel : BroadcastChannel;
        redeemedAt : Text;
        fulfilledAt : ?Text;
        fulfilledBy : ?Principal;
    };

    /// Admin-generated single-use account recovery code (8-digit) — migrates `fromPrincipal` to redeemer.
    public type AccountRecoveryCodeRecord = {
        fromPrincipal : Principal;
        active : Bool;
        createdAt : Text;
        expiresAtSec : Nat;
        redeemedAt : ?Text;
        redeemedToPrincipal : ?Principal;
    };

    public type GenerateAccountRecoveryCodeOk = {
        code : Text;
        expiresAtSec : Nat;
    };

    public type GenerateAccountRecoveryCodeResult = {
        #ok : GenerateAccountRecoveryCodeOk;
        #noSourceAccount;
        #cannotGenerateForPrivilegedAccount;
        #allocationFailed;
    };

    public type RedeemAccountRecoveryCodeResult = {
        #ok : AdminReconnectMemberOk;
        #invalidCode;
        #expiredCode;
        #alreadyUsed;
        #callerHasAccount;
        #samePrincipal;
        #noSourceAccount;
        #targetHasAccount;
        #cannotMigratePrivilegedAccount;
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

    /// Program Draw past recipient — sidecar keyed by artist id (Studio Manage + public Past recipients).
    public type ArtistDrawRecipient = {
        artistId : Text;
        cycle : Nat;
        programId : Text;
        awardLabel : Text;
        updatedAt : Text;
    };

    /// Program card + detail page JSON (versioned) — mirrors `testData.allPrograms.programs`.
    /// Locale JSON may include `programPage.applicationPaymentOptions` (one_time | monthly | quarterly | annual — application form cards),

    /// Result of `applicationFeeDueForCaller` (dueCents is USD cents).
    public type ApplicationFeeDue = {
        dueCents : Nat;
        reason : Text;
        membershipTier : Text;
        appCreditBalance : Nat;
    };

    /// Accrue-then-return snapshot for Settings Explore / Studio Credits.
    public type ApplicationCreditsInfo = {
        balance : Nat;
        membershipTier : Text;
        lastAccruedKey : Text;
        nextAccrualHint : Text;
    };

    /// Program Award entry balance (separate from application credits).
    public type AwardCreditsInfo = {
        balance : Nat;
        membershipTier : Text;
        lastGrantedKey : Text;
        nextGrantHint : Text;
    };

    /// Member path for a program: formal application vs Program Award (mutually exclusive).
    /// Stored as Text: "" | "application" | "award".
    public type ProgramAwardEntry = {
        id : Text;
        programId : Text;
        principalText : Text;
        status : Text;
        enteredAt : Text;
        updatedAt : Text;
        paidEntry : Bool;
    };

    public type CreditLedgerEntry = {
        id : Text;
        principalText : Text;
        kind : Text;
        amount : Nat;
        direction : Text;
        note : Text;
        createdAt : Text;
    };
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

    /// Program Draw / Award operational config (sidecar keyed by program id — keeps `ProgramRecord` upgrade-safe).
    /// Further fields (entry fee, cycle, criteria) will extend this type later via a V1 migrate if needed.
    public type ProgramDrawConfig = {
        programId : Text;
        active : Bool;
        /// Cap for draw / award entries this cycle (default 100 in the Studio UI).
        totalSlots : Nat;
        updatedAt : Text;
    };

    /// Public progress snapshot for Program Draw status UI.
    public type ProgramDrawProgress = {
        active : Bool;
        totalSlots : Nat;
        enteredCount : Nat;
        cycle : Nat;
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

    /// Single audio collection entry for an artist (multi-bite support, max 5 per artist).
    public type ArtistAudioEntry = {
        url : Text;
        title : Text;
        addedAt : Text;
    };

    /// Staff review note attached to an asset (profile image or audio entry) for moderation.
    public type AssetReviewNote = {
        reason : Text;
        imageUrl : Text;
        reviewedAt : Text;
        approved : Bool;
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

    /// Studio-managed community video library (`/videos`, Community featured row).
    public type CommunityVideoRecord = {
        id : Text;
        slug : Text;
        visible : Bool;
        publishedAt : Text;
        sortOrder : Nat;
        updatedAt : Text;
        previewVideoUrl : Text;
        fullVideoKey : Text;
        fullVideoFileName : Text;
        posterUrl : Text;
        imageUrl : Text;
        legacyVideoUrl : Text;
        overlayTitle : Text;
        overlayGuests : Text;
        overlayDuration : Text;
        localesJson : Text;
        previewChaptersJson : Text;
        previewTopicsJson : Text;
        fullChaptersJson : Text;
        fullTopicsJson : Text;
    };

    /// Up to six featured video ids for `/community` + optional hero id.
    public type CommunityFeaturedVideosConfig = {
        featuredVideoIds : [Text];
        heroVideoId : ?Text;
        updatedAt : Text;
    };

    /// Up to three journal entry ids for the home page carousel (slide order = array order).
    public type HomeJournalCarouselConfig = {
        entryIds : [Text];
        updatedAt : Text;
    };

    public type ApplicantStatus = {
        #pending;
        #reviewing;
        #postInterviewReview;
        #needsInfo;
        #accepted;
        #rejected;
        #pulledOut;
        /// Member-initiated withdraw (Settings); no application-credit refund.
        #withdrawn;
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

    /// One staff email logged for an applicant (stored as JSON in `applicantEmailOutreachStable`).
    public type ApplicantEmailOutreachEntry = {
        sentAt : Text;
        subject : Text;
        templateId : Text;
        templateName : Text;
    };

    /// Program payment summary shown in member dashboard and future Studio Finance views.
    /// Amounts are stored in minor units (USD cents for the first implementation).
    public type ProgramPaymentSummary = {
        key : Text;
        principal : Principal;
        programId : Text;
        applicationId : Text;
        depositStatus : Text;
        totalDueCents : Nat;
        depositAmountCents : Nat;
        totalPaidCents : Nat;
        outstandingCents : Nat;
        refundedCents : Nat;
        activePlanId : ?Text;
        updatedAt : Text;
    };

    /// Sidecar preference for travel pricing. Kept outside ProgramPaymentSummary for safer stable upgrades.
    public type ProgramPaymentFlightPreference = {
        key : Text;
        principal : Principal;
        programId : Text;
        applicationId : Text;
        ownFlight : Bool;
        flightCreditCents : Nat;
        totalDueCents : Nat;
        updatedAt : Text;
    };

    /// Ledger row shape before provider-agnostic fields (stable upgrade migration only).
    public type ProgramPaymentLedgerRowV1 = {
        id : Text;
        principal : Principal;
        programId : Text;
        applicationId : Text;
        paymentType : Text;
        amountCents : Nat;
        currency : Text;
        stripePaymentIntentId : Text;
        stripeChargeId : Text;
        stripeReceiptUrl : Text;
        status : Text;
        createdAt : Text;
        dueAt : ?Text;
        feeCents : Nat;
        staffNote : Text;
    };

    /// Immutable-ish ledger row recorded by the integration API after payment verification.
    public type ProgramPaymentLedgerRow = {
        id : Text;
        principal : Principal;
        programId : Text;
        applicationId : Text;
        paymentType : Text;
        amountCents : Nat;
        currency : Text;
        stripePaymentIntentId : Text;
        stripeChargeId : Text;
        stripeReceiptUrl : Text;
        status : Text;
        createdAt : Text;
        dueAt : ?Text;
        feeCents : Nat;
        staffNote : Text;
        paymentProvider : Text;
        externalPaymentId : Text;
        externalChargeId : Text;
        externalReceiptUrl : Text;
    };

    /// Studio Finance → Promotions campaign cost tracking.
    public type FinancePromotion = {
        id : Text;
        name : Text;
        company : Text;
        startIso : Text;
        endIso : Text;
        /// "platform" | "program"
        target : Text;
        programId : Text;
        costCents : Nat;
        status : Text;
        createdAt : Text;
        updatedAt : Text;
        createdBy : Text;
    };

    /// Studio Schedule — assigned staff on a calendar event.
    public type CalendarPersonStored = {
        id : Text;
        name : Text;
        initials : Text;
    };

    /// Studio Schedule — audit trail entry on a calendar event.
    public type CalendarEventActivity = {
        id : Text;
        at : Text;
        text : Text;
    };

    /// Studio Schedule — staff calendar event (conflicts derived client-side).
    public type CalendarEvent = {
        id : Text;
        title : Text;
        date : Text;
        startTime : Text;
        endTime : Text;
        allDay : Bool;
        timezone : Text;
        programId : Text;
        programName : Text;
        team : Text;
        locationId : Text;
        locationName : Text;
        assignedStaff : [CalendarPersonStored];
        participantIds : [Text];
        participantCount : Nat;
        notes : Text;
        /// 0 = none
        reminderMinutes : Nat;
        /// draft | awaiting_confirmation | confirmed | cancelled
        status : Text;
        /// sage | blue | sand | blush
        color : Text;
        createdAt : Text;
        updatedAt : Text;
        version : Nat;
        createdBy : Text;
        activity : [CalendarEventActivity];
    };

    /// Studio Schedule — reusable event location catalog.
    public type CalendarLocation = {
        id : Text;
        name : Text;
        createdAt : Text;
        updatedAt : Text;
        createdBy : Text;
        /// "active" | "archived"
        status : Text;
    };

    /// Studio Finance → Programs team member (expenses + manual disbursements).
    public type ProgramTeamMember = {
        id : Text;
        programId : Text;
        principalText : Text;
        /// "admin" | "staff" | "collaborator"
        kind : Text;
        ticketsCents : Nat;
        localTravelCents : Nat;
        partner1Cents : Nat;
        partner2Cents : Nat;
        partner3Cents : Nat;
        /// Cached sum of active owed ledger entries
        amountOwedCents : Nat;
        /// Cached sum of active paid ledger entries
        amountPaidCents : Nat;
        /// 0–100 share of program profit for projected payout
        payoutPercent : Nat;
        createdAt : Text;
        updatedAt : Text;
        createdBy : Text;
        /// "active" | "removed"
        status : Text;
    };

    /// Manual owed line item for a program team member.
    public type ProgramTeamOwedEntry = {
        id : Text;
        teamMemberId : Text;
        programId : Text;
        name : Text;
        description : Text;
        dateIso : Text;
        amountCents : Nat;
        createdAt : Text;
        updatedAt : Text;
        createdBy : Text;
        /// "active" | "voided"
        status : Text;
    };

    /// Manual paid disbursement line item for a program team member.
    public type ProgramTeamPaidEntry = {
        id : Text;
        teamMemberId : Text;
        programId : Text;
        name : Text;
        description : Text;
        dateIso : Text;
        amountCents : Nat;
        /// "stripe" | "paypal" | "wire" | "cash" | "other"
        paymentService : Text;
        createdAt : Text;
        updatedAt : Text;
        createdBy : Text;
        /// "active" | "voided"
        status : Text;
    };

    /// Legacy ledger row (pre feeCents/staffNote) — stable upgrade migration only.
    public type ProgramPaymentLedgerRowV0 = {
        id : Text;
        principal : Principal;
        programId : Text;
        applicationId : Text;
        paymentType : Text;
        amountCents : Nat;
        currency : Text;
        stripePaymentIntentId : Text;
        stripeChargeId : Text;
        stripeReceiptUrl : Text;
        status : Text;
        createdAt : Text;
        dueAt : ?Text;
    };

    public func programPaymentLedgerFromV0(row : ProgramPaymentLedgerRowV0) : ProgramPaymentLedgerRow {
        programPaymentLedgerFromV1({
            id = row.id;
            principal = row.principal;
            programId = row.programId;
            applicationId = row.applicationId;
            paymentType = row.paymentType;
            amountCents = row.amountCents;
            currency = row.currency;
            stripePaymentIntentId = row.stripePaymentIntentId;
            stripeChargeId = row.stripeChargeId;
            stripeReceiptUrl = row.stripeReceiptUrl;
            status = row.status;
            createdAt = row.createdAt;
            dueAt = row.dueAt;
            feeCents = 0;
            staffNote = "";
        });
    };

    public func programPaymentLedgerFromV1(row : ProgramPaymentLedgerRowV1) : ProgramPaymentLedgerRow {
        {
            id = row.id;
            principal = row.principal;
            programId = row.programId;
            applicationId = row.applicationId;
            paymentType = row.paymentType;
            amountCents = row.amountCents;
            currency = row.currency;
            stripePaymentIntentId = row.stripePaymentIntentId;
            stripeChargeId = row.stripeChargeId;
            stripeReceiptUrl = row.stripeReceiptUrl;
            status = row.status;
            createdAt = row.createdAt;
            dueAt = row.dueAt;
            feeCents = row.feeCents;
            staffNote = row.staffNote;
            paymentProvider = "stripe";
            externalPaymentId = row.stripePaymentIntentId;
            externalChargeId = row.stripeChargeId;
            externalReceiptUrl = row.stripeReceiptUrl;
        };
    };

    /// Program payment plan shape before PayPal fields (stable upgrade migration only).
    public type ProgramPaymentPlanV1 = {
        id : Text;
        principal : Principal;
        programId : Text;
        applicationId : Text;
        stripeSubscriptionId : Text;
        stripeScheduleId : Text;
        installmentCount : Nat;
        installmentAmountCents : Nat;
        currency : Text;
        status : Text;
        startAt : Text;
        endAt : Text;
        createdAt : Text;
        updatedAt : Text;
    };

    /// Active or historical program payment plan (Stripe legacy or PayPal).
    public type ProgramPaymentPlan = {
        id : Text;
        principal : Principal;
        programId : Text;
        applicationId : Text;
        stripeSubscriptionId : Text;
        stripeScheduleId : Text;
        paypalSubscriptionId : ?Text;
        paymentProvider : Text;
        installmentCount : Nat;
        installmentAmountCents : Nat;
        currency : Text;
        status : Text;
        startAt : Text;
        endAt : Text;
        createdAt : Text;
        updatedAt : Text;
    };

    public func programPaymentPlanFromV1(row : ProgramPaymentPlanV1) : ProgramPaymentPlan {
        {
            id = row.id;
            principal = row.principal;
            programId = row.programId;
            applicationId = row.applicationId;
            stripeSubscriptionId = row.stripeSubscriptionId;
            stripeScheduleId = row.stripeScheduleId;
            paypalSubscriptionId = null;
            paymentProvider = "stripe";
            installmentCount = row.installmentCount;
            installmentAmountCents = row.installmentAmountCents;
            currency = row.currency;
            status = row.status;
            startAt = row.startAt;
            endAt = row.endAt;
            createdAt = row.createdAt;
            updatedAt = row.updatedAt;
        };
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

    /// Staff-managed flight booking record for an applicant (Studio Travel + Finance Tickets).
    public type ApplicantFlightBooking = {
        applicantId : Text;
        programId : Text;
        airline : Text;
        airlineWebsite : Text;
        confirmationNumber : Text;
        flightCostCents : Nat;
        ownFlight : Bool;
        estArrivalDate : Text;
        estArrivalTime : Text;
        updatedAt : Text;
        updatedBy : Text;
    };

    /// Pre-image travel prep link (stable / backup V0).
    public type TravelPrepLinkV0 = {
        id : Text;
        programId : Text;
        title : Text;
        url : Text;
        description : Text;
        sortOrder : Nat;
        updatedAt : Text;
    };

    /// Per-program travel preparation link (Studio Travel → staff-curated, member-visible).
    public type TravelPrepLink = {
        id : Text;
        programId : Text;
        title : Text;
        url : Text;
        description : Text;
        imageUrl : Text;
        sortOrder : Nat;
        updatedAt : Text;
    };

    /// First comms config shape (no member-room fields) — stable upgrade source only.
    public type ProgramCommsConfigV0 = {
        programId : Text;
        provider : Text;
        oaName : Text;
        basicId : Text;
        channelId : Text;
        addFriendUrl : Text;
        groupName : Text;
        groupInviteUrl : Text;
        addFriendQrUrl : Text;
        groupQrUrl : Text;
        inviteSentAtByApplicant : [(Text, Text)];
        updatedAt : Text;
    };

    /// Member-room fields, still one group + add-friend (stable / backup V1).
    public type ProgramCommsConfigV1 = {
        programId : Text;
        provider : Text;
        oaName : Text;
        basicId : Text;
        channelId : Text;
        addFriendUrl : Text;
        groupName : Text;
        groupInviteUrl : Text;
        addFriendQrUrl : Text;
        groupQrUrl : Text;
        inviteSentAtByApplicant : [(Text, Text)];
        memberActive : Bool;
        inviteMessage : Text;
        providerThumbUrl : Text;
        updatedAt : Text;
    };

    /// Per-program comms: two rooms + iOS/Android store downloads. No LINE secrets.
    public type ProgramCommsConfig = {
        programId : Text;
        provider : Text;
        oaName : Text;
        basicId : Text;
        channelId : Text;
        iosStoreUrl : Text;
        androidStoreUrl : Text;
        iosThumbUrl : Text;
        androidThumbUrl : Text;
        iosQrUrl : Text;
        androidQrUrl : Text;
        groupGeneralName : Text;
        groupGeneralInviteUrl : Text;
        groupGeneralQrUrl : Text;
        groupAnnounceName : Text;
        groupAnnounceInviteUrl : Text;
        groupAnnounceQrUrl : Text;
        inviteSentAtByApplicant : [(Text, Text)];
        memberActive : Bool;
        inviteMessage : Text;
        providerThumbUrl : Text;
        updatedAt : Text;
    };

    public func programCommsConfigV0ToV1(row : ProgramCommsConfigV0) : ProgramCommsConfigV1 {
        {
            programId = row.programId;
            provider = row.provider;
            oaName = row.oaName;
            basicId = row.basicId;
            channelId = row.channelId;
            addFriendUrl = row.addFriendUrl;
            groupName = row.groupName;
            groupInviteUrl = row.groupInviteUrl;
            addFriendQrUrl = row.addFriendQrUrl;
            groupQrUrl = row.groupQrUrl;
            inviteSentAtByApplicant = row.inviteSentAtByApplicant;
            memberActive = false;
            inviteMessage = "";
            providerThumbUrl = "";
            updatedAt = row.updatedAt;
        };
    };

    public func programCommsConfigFromV1(row : ProgramCommsConfigV1) : ProgramCommsConfig {
        {
            programId = row.programId;
            provider = row.provider;
            oaName = row.oaName;
            basicId = row.basicId;
            channelId = row.channelId;
            iosStoreUrl = "";
            androidStoreUrl = "";
            iosThumbUrl = "";
            androidThumbUrl = "";
            iosQrUrl = "";
            androidQrUrl = "";
            groupGeneralName = row.groupName;
            groupGeneralInviteUrl = row.groupInviteUrl;
            groupGeneralQrUrl = row.groupQrUrl;
            groupAnnounceName = "";
            groupAnnounceInviteUrl = "";
            groupAnnounceQrUrl = "";
            inviteSentAtByApplicant = row.inviteSentAtByApplicant;
            memberActive = row.memberActive;
            inviteMessage = row.inviteMessage;
            providerThumbUrl = row.providerThumbUrl;
            updatedAt = row.updatedAt;
        };
    };

    public func programCommsConfigToV1(row : ProgramCommsConfig) : ProgramCommsConfigV1 {
        {
            programId = row.programId;
            provider = row.provider;
            oaName = row.oaName;
            basicId = row.basicId;
            channelId = row.channelId;
            addFriendUrl = "";
            groupName = row.groupGeneralName;
            groupInviteUrl = row.groupGeneralInviteUrl;
            addFriendQrUrl = "";
            groupQrUrl = row.groupGeneralQrUrl;
            inviteSentAtByApplicant = row.inviteSentAtByApplicant;
            memberActive = row.memberActive;
            inviteMessage = row.inviteMessage;
            providerThumbUrl = row.providerThumbUrl;
            updatedAt = row.updatedAt;
        };
    };

    public func programCommsConfigFromV0(row : ProgramCommsConfigV0) : ProgramCommsConfig {
        programCommsConfigFromV1(programCommsConfigV0ToV1(row));
    };

    public func programCommsConfigToV0(row : ProgramCommsConfig) : ProgramCommsConfigV0 {
        let v1 = programCommsConfigToV1(row);
        {
            programId = v1.programId;
            provider = v1.provider;
            oaName = v1.oaName;
            basicId = v1.basicId;
            channelId = v1.channelId;
            addFriendUrl = v1.addFriendUrl;
            groupName = v1.groupName;
            groupInviteUrl = v1.groupInviteUrl;
            addFriendQrUrl = v1.addFriendQrUrl;
            groupQrUrl = v1.groupQrUrl;
            inviteSentAtByApplicant = v1.inviteSentAtByApplicant;
            updatedAt = v1.updatedAt;
        };
    };

    /// Confirmed-member view of an activated program (two rooms + store downloads).
    public type ProgramCommsMemberRoom = {
        programId : Text;
        provider : Text;
        inviteMessage : Text;
        providerThumbUrl : Text;
        iosStoreUrl : Text;
        androidStoreUrl : Text;
        iosThumbUrl : Text;
        androidThumbUrl : Text;
        iosQrUrl : Text;
        androidQrUrl : Text;
        groupGeneralName : Text;
        groupGeneralInviteUrl : Text;
        groupGeneralQrUrl : Text;
        groupAnnounceName : Text;
        groupAnnounceInviteUrl : Text;
        groupAnnounceQrUrl : Text;
    };

    /// LINE group the webhook has seen (inbox for Studio assign).
    public type ProgramCommsLineSeenGroup = {
        groupId : Text;
        groupName : Text;
        lastSeenAt : Text;
    };

    /// Per-program LINE group ids for API push (sidecar; not on ProgramCommsConfig).
    public type ProgramCommsLineBinding = {
        programId : Text;
        groupGeneralId : Text;
        groupAnnounceId : Text;
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

    /// Studio Email → Records: one row per outbound send (blast = one row).
    public type EmailOutboundKindV = {
        #single;
        #batch;
        #category;
        #all;
    };

    public type EmailOutboundRecord = {
        id : Text;
        kind : EmailOutboundKindV;
        subject : Text;
        htmlBody : Text;
        toSummary : Text;
        recipientCount : Nat;
        ccEmails : Text;
        campaignId : ?Text;
        sentAt : Text;
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
        /// Artist ids whose headshot is approved for public card display (parallel map; default not approved).
        artistHeroProfileImageApprovedIdsStable : ?[Text];
        /// Artist ids whose audio bite is approved for public play (parallel map; default not approved).
        artistAudioApprovedIdsStable : ?[Text];
        /// Artist ids whose audio is approved for full-site play (sound env / site rows); optional for older backups.
        artistAudioFullSiteApprovedIdsStable : ?[Text];
        artistsStable : [(Text, ArtistRecord)];
        programsStable : [(Text, ProgramRecord)];
        /// Program Draw / Award config by program id; optional for backups before this field existed.
        programDrawConfigStable : ?[(Text, ProgramDrawConfig)];
        journalsStable : [(Text, JournalRecord)];
        editionsStable : [(Text, EditionRecord)];
        contentPagesStable : [(Text, ContentPageRecord)];
        applicantsStable : [(Text, ApplicantRecord)];
        /// Pulled-out applicants (rescinded); optional for backups before this field existed.
        archivedApplicantsStable : ?[(Text, ApplicantRecord)];
        siteSettingsStable : [(Text, Text)];
        applicationByArtistProgramStable : [(Text, Text)];
        artistMostRecentProgramStable : [(Text, Text)];
        artistFeaturedFeaturableIdsStable : [Text];
        artistFeaturedManualIdsStable : [Text];
        joinInvitesStable : [(Text, JoinInviteRecord)];
        /// Account recovery codes for II migration; optional for backups before this field existed.
        accountRecoveryCodesStable : ?[(Text, AccountRecoveryCodeRecord)];
        /// Studio → Permissions UI: role-tab defaults (`staff`, …) and per-principal overrides.
        studioPermissionDefaultsStable : [StudioPermissionDefaultsEntry];
        studioPermissionOverridesStable : [StudioPermissionOverrideEntry];
        /// Principals that may open the Permissions section (with admins); managed by admin.
        superStaffPrincipalsStable : [Principal];
        /// Join Fusion / team directory: principal → name + email (`null` in backups from before this field existed).
        accountContactStable : ?[(Principal, AccountContact)];
        membershipTrialWindowStable : ?[(Principal, TrialMembershipWindow)];
        joinInviteTrialMonthsStable : ?[(Text, Nat)];
        programPaymentSummariesStable : ?[(Text, ProgramPaymentSummary)];
        programPaymentLedgerStable : ?[(Text, ProgramPaymentLedgerRow)];
        programPaymentPlansStable : ?[(Text, ProgramPaymentPlan)];
        programPaymentFlightPreferencesStable : ?[(Text, ProgramPaymentFlightPreference)];
        /// Applicant id → JSON array of outreach entries; optional for backups before this field existed.
        applicantEmailOutreachStable : ?[(Text, Text)];
        /// Multi-bite audio collection per artist (max 5 entries each).
        artistAudioCollectionStable : ?[(Text, [ArtistAudioEntry])];
        /// Artist id → highlight audio URL (synced to ArtistMedia.audioUrl for backward compat).
        artistAudioHighlightStable : ?[(Text, Text)];
        /// Artist id → list of staff-approved audio URLs (per-bite approval).
        artistAudioApprovedUrlsStable : ?[(Text, [Text])];
        /// Artist id → list of full-site-approved audio URLs; optional for older backups.
        artistAudioFullSiteApprovedUrlsStable : ?[(Text, [Text])];
        /// Staff review notes for hero profile images (keyed by artist id).
        heroProfileImageReviewNotesStable : ?[(Text, AssetReviewNote)];
        /// Staff review notes for audio entries (keyed by "artistId|audioUrl").
        audioEntryReviewNotesStable : ?[(Text, AssetReviewNote)];
        /// Program Draw past recipients by artist id; optional for backups before this field existed.
        artistDrawRecipientsStable : ?[(Text, ArtistDrawRecipient)];
        /// Artist id → past-recipient story video URL / YouTube embed src; optional for older backups.
        artistDrawStoryVideoStable : ?[(Text, Text)];
        /// Applicant flight bookings (Studio Travel / Finance Tickets); optional for older backups.
        applicantFlightBookingsStable : ?[(Text, ApplicantFlightBooking)];
        /// Per-program travel prep links without images (backups before imageUrl).
        programTravelPrepLinksStable : ?[(Text, [TravelPrepLinkV0])];
        /// Per-program travel prep links including imageUrl; optional for older backups.
        programTravelPrepLinksStableV1 : ?[(Text, [TravelPrepLink])];
        /// Promo / invite / partner codes; optional for older backups.
        promoCodesStable : ?[(Text, PromoCode)];
        /// Promo code redemptions; optional for older backups.
        promoRedemptionsStable : ?[(Text, PromoRedemption)];
        /// Invite lineage records; optional for older backups.
        inviteLineageStable : ?[(Principal, InviteLineage)];
        /// Broadcast credits (referral rewards); optional for older backups.
        broadcastCreditsStable : ?[(Principal, BroadcastCreditRecord)];
        /// Broadcast credit redemptions; optional for older backups.
        broadcastRedemptionsStable : ?[(Text, BroadcastRedemption)];
        /// Per-program comms (V1: one group + add-friend); optional for older backups.
        programCommsConfigStable : ?[(Text, ProgramCommsConfigV1)];
        /// Per-program comms (two rooms + store downloads); optional for older backups.
        programCommsConfigStableV2 : ?[(Text, ProgramCommsConfig)];
        /// LINE groups seen via webhook; optional for older backups.
        programCommsLineSeenStable : ?[(Text, ProgramCommsLineSeenGroup)];
        /// Per-program LINE room bindings; optional for older backups.
        programCommsLineBindingStable : ?[(Text, ProgramCommsLineBinding)];
    };
};
