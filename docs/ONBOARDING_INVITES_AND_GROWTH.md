# Onboarding, Invite Codes & Growth Strategy

> A critical plan for robust invite systems, discount signup codes, referral mechanics, and new-user acquisition — built on top of Fusion's existing membership, payment, and identity infrastructure.

---

## Table of contents

1. [Honest assessment: where we are](#1-honest-assessment-where-we-are)
2. [What we're competing against](#2-what-were-competing-against)
3. [What the data says](#3-what-the-data-says)
4. [Artist tier system: Foundation → Resident → Fellow](#4-artist-tier-system-foundation--resident--fellow)
5. [Code & discount system design](#5-code--discount-system-design)
6. [Referral program design](#6-referral-program-design)
7. [Onboarding flow improvements](#7-onboarding-flow-improvements)
8. [Implementation plan](#8-implementation-plan)
9. [Metrics & success criteria](#9-metrics--success-criteria)
10. [Anti-fraud & abuse prevention](#10-anti-fraud--abuse-prevention)
11. [Risks & open questions](#11-risks--open-questions)

---

## 1. Honest assessment: where we are

### What exists today

| Capability | Status | Limitation |
|---|---|---|
| 8-digit admin invite codes | Working | Exempt-only (no payment) or trial window; single-use; no discount — it's all-or-nothing |
| Artist roster access codes | Working | One-time linking; not a growth mechanic |
| Team join codes | Working | Staff/collaborator only |
| Veteran exempt | Working | Program-specific; not user-facing |
| Finance "Promotions" | Scaffold | Accounting metadata only — not redeemable at checkout |
| Stripe coupons | Not built | Zero coupon/promotion endpoints in the Integration API |
| PayPal discount | Not built | Subscriptions use bare `plan_id` — no coupon layer |
| Referral program | Not built | Radar has "referral" fields for CRM, but no user-facing referral system |
| Checkout promo code field | Not built | Modal placeholder only |
| Onboarding email sequence | Partial | Welcome email exists; no drip sequence, no Day 3/7/14 nudges |
| In-product referral prompts | Not built | No post-activation sharing prompts |

### The critical gap

Fusion's join flow is **pay-first, all-or-nothing**. You either pay full price ($30/mo minimum) or someone with admin access hand-creates an exempt invite code. There is no middle ground — no discounted first month, no "friend gave me a code for 50% off," no trial period with credit card, no referral reward. This is a hard sell for artists who are comparing against free platforms.

The 8-digit invite system is powerful infrastructure but underutilized — it only creates exempt (free) or trial-window accounts. It doesn't integrate with the payment layer to apply discounts. We need to bridge the gap between "free exempt" and "full price" with graduated incentives.

---

## 2. What we're competing against

### The landscape artists are choosing from

| Platform | Price | Discovery | Custom domain | What pulls artists in |
|---|---|---|---|---|
| **Behance** | Free | Massive built-in network | No | Zero friction; algorithmic discovery; recruiter access |
| **Cargo** | $13/mo | Minimal | Yes | Art-directed layouts; editorial credibility; design-world cachet |
| **Format** | $9/mo | No | Yes | Photography workflows; client proofing |
| **Portfoliobox** | $7.50/mo | No | Yes | "Visual silence" — no algorithm, no distraction |
| **Dribbble** | Free–$15/mo | Inbound leads | No | Hiring pipeline; client discovery |
| **ArtStation** | Free–$10/mo | Yes (3D/concept) | No | Niche community; marketplace |
| **Squarespace** | $16/mo | No | Yes | Templates; reliability; e-commerce |
| **Cara** | Free | Yes (illustrators) | No | Anti-AI stance; human-only feed |
| **Fusion** | $30/mo | Curated network | No (yet) | Japan programs; residencies; AI tools; curated community |

### Critical observations

1. **Price sensitivity is real.** Fusion is the most expensive option at $30/mo. Every competitor is cheaper or free. We need to justify the premium or offer an on-ramp.

2. **Free platforms dominate discovery.** Behance/Cara/Dribbble win on volume. Fusion can't compete on volume — we compete on *curation quality* and *opportunity access* (residencies, programs, network).

3. **Artists are burned out on platforms.** The 2024–2026 wave of AI-generated content flooding Behance/ArtStation has pushed practicing artists toward curated, human-focused spaces. This is Fusion's opening.

4. **The network effect is inverted.** On Behance, more users = more discovery. On Fusion, more users = potentially diluted curation. Our invite system needs to *reinforce* selectivity while still growing. The invite itself is the signal: "someone in the network thinks you belong here."

### Fusion's actual competitive advantages

- **Residency programs** — No other portfolio platform offers a pipeline into curated Japan artist residencies
- **Curated network** — Membership means something; it's not a free-for-all
- **AI tools for practice** — Artwork analysis, statement assistance, translation (see XAI integration plan)
- **Bilingual (EN/JA)** — Built-in Japan art world access
- **Member-to-member discovery** — Not algorithmic; community-curated

**The invite system should leverage these advantages.** An invite from a current member carries the implicit message: "This network is worth paying for, and I think you'd fit."

---

## 3. What the data says

### Referral program benchmarks (2026 studies)

| Metric | Benchmark | Source |
|---|---|---|
| Referred customers LTV | **16% higher** than non-referred | Cello 2026 SaaS benchmark |
| Referred customer churn | **18% lower** than non-referred | Cello 2026 |
| In-product referral widget CTR | **8–15%** (vs 1–3% for email) | Cello/Shopify A/B tests |
| Median SaaS activation rate | **37%** (meaning 63% drop off before value) | Perspective AI 2026 report |
| Footer link referral participation | **0.8%** | Shopify supplement brand A/B |
| Dashboard embed participation | **4.2%** | Same study |
| Floating widget + post-action modal | **11.7%** (14x improvement over footer) | Same study |
| Double-sided rewards vs single | **2–3x higher conversion** | Multiple 2026 studies |
| Optimal referee discount | **10–15% off first 2–3 months** | Cello unit economics analysis |
| Best referral prompt timing | **48–72 hours post-activation** or at first "aha" moment | Cello onboarding guide |

### Key takeaways for Fusion

1. **Don't prompt at signup — prompt at activation.** The moment someone completes their profile, publishes their first work, or gets their first "New World" AI generation is when they're most likely to share.

2. **Double-sided rewards work.** Give the *referrer* credit and the *referee* a discount. Both sides need to win.

3. **Placement matters more than reward size.** A floating referral widget at the right moment beats a generous reward buried in settings by 14x.

4. **Server-side attribution, not cookies.** Track referral codes and invite links on the backend (Motoko + Integration API), not via browser cookies that get blocked by ITP/ad blockers.

5. **Time-limited discounts preserve unit economics.** 50% off the first month ($15 instead of $30) costs $15 in revenue but can generate a customer worth $360+/year. The math works if retention holds.

---

## 4. Artist tier system: Foundation → Resident → Fellow

### 4.1 Why tiers matter

Fusion's current model treats all members identically — a graduating MFA student and a mid-career artist with 15 years of exhibition history occupy the same space with the same profile, the same visibility, and the same price. This creates two problems:

1. **Emerging artists feel priced out.** $30/mo is steep for someone building a practice. They compare against free Behance and leave.
2. **Established artists feel undifferentiated.** Their profile sits alongside someone who just graduated. The curation signal is diluted. They don't see the value over a custom Cargo site.

NJAL solved this in fashion with White/Grey/Black Sheep — a tier system where every designer starts at the same level, the platform's curation team upgrades profiles based on observed quality and activity, and the top tier (Black Sheep) becomes an aspirational badge that can't be purchased or requested. Critically, it's **subjective** — the team makes the call based on holistic assessment, not a point system.

Fusion needs its own version. But our tiers should feel native to the art world and to Fusion's identity as a Japan-rooted residency network — not borrowed from fashion or SaaS gamification.

### 4.2 The three tiers

| Tier | Name | Identity | Who belongs here |
|---|---|---|---|
| **Tier 1** | **Foundation** | Entry. Building a practice. | Emerging artists, recent graduates, early-career practitioners. Working seriously but building exhibition history, refining voice, seeking first residency. |
| **Tier 2** | **Resident** | Established. Active in the field. | Mid-career artists with a body of work, exhibition record, gallery engagement or institutional involvement. Have completed a residency or equivalent sustained project. The working backbone of the network. |
| **Tier 3** | **Fellow** | Recognized. Shaping discourse. | Artists whose practice has reached a point of sustained influence — significant exhibitions, institutional recognition, mentorship capacity, or demonstrated impact on their field. Curated designation, not purchasable. |

**Why these names:**

- **Foundation** — Acknowledges that an early-career artist isn't lesser, they're building something. The word has dignity. It's also a Fusion term — foundational to the network.
- **Resident** — Directly references the residency model at Fusion's core. You don't have to have done a Fusion residency to qualify, but the word signals that you're actively *in* practice, embedded in the work, not just spectating.
- **Fellow** — Borrowed from the academic/institutional world where "fellow" denotes recognition by peers and institutions. It can't be bought or applied for. It's bestowed.

### 4.3 How tiers are assigned

**This is not algorithmic. It is curatorial.**

The Fusion team reviews and assigns tiers based on holistic assessment. There is no point system, no checklist, no automated promotion. This is deliberate — it mirrors how galleries, residencies, and biennials actually evaluate artists: subjectively, based on the work and the practice as a whole.

#### Foundation (default on join)

Every new member starts as Foundation. No exceptions. This is the accessible entry point — anyone with a genuine practice can join and begin building their presence.

**Signals the team watches for Foundation → Resident consideration:**

- Profile is complete and well-presented (images are strong, bio is written with care)
- Active engagement — profile is maintained, not abandoned after month 1
- Evidence of exhibition history, residency participation, or institutional engagement outside Fusion
- Body of work shows sustained practice, not a one-off project
- Recommendations or vouches from existing Resident/Fellow members
- Completion of a Fusion program or residency

**What Foundation members get:**

- Full profile and portfolio
- Access to programs and applications
- AI tools (artwork analysis, statement assistant, translation)
- Network discovery (visible to other members)
- Community features
- Standard pricing ($30/mo, $75/quarter, $260/year — or discounted entry via invite codes)

#### Resident (curated upgrade)

Resident is the working tier — the majority of active, practicing artists in the network should eventually be here. It's not elite; it's *established*. The upgrade is initiated by Fusion staff, triggered by observed quality and activity, or by recommendation from other Residents/Fellows.

**Promotion criteria (guidelines, not checklist):**

- Sustained activity on the platform (3+ months of maintained profile, not just signup)
- Work quality that reflects serious practice
- Exhibition history or equivalent professional activity
- Positive engagement with the network (not just passive)
- Optional: completed a Fusion program, referred other quality members

**What Resident adds over Foundation:**

- **Resident badge** on profile — visible to other members, galleries, curators
- **Enhanced visibility** — Resident profiles surface first in network browse and discovery feeds
- **Invite privileges** — Can generate invite codes (Foundation members cannot, see section 6 update)
- **Program priority** — Tie-breaking preference in competitive program applications
- **Featured eligibility** — Eligible for editorial features, journal spotlights, social media highlights
- **Resident rate** — Unlocks quarterly ($75) and annual ($260) tiers at a modest discount (e.g. $25/mo, $65/quarter, $230/year) — rewarding commitment
- **Mentor access** — Can connect with Fellows for portfolio review or practice conversations (when Fellows opt in)

**How notification works:**

When staff upgrade a member to Resident, they receive a personalized email from Fusion:

> *"Your practice stands out. We've recognized you as a Fusion Resident — a designation for artists whose sustained work and engagement exemplify what this network is about."*

No application, no request, no purchase. It arrives when the team decides the work warrants it.

#### Fellow (curated, rare)

Fellow is the top tier. It can't be bought, applied for, or requested. Like NJAL's Black Sheep, it is awarded by the Fusion team to artists whose practice has reached a point of sustained recognition. This should represent a small fraction of the network — perhaps 5–10% at most.

**Assessment signals:**

- Significant exhibition history (solo shows, biennials, institutional exhibitions)
- Gallery representation or sustained institutional engagement
- Critical recognition (reviews, publications, awards)
- Demonstrated impact on their field or community
- Mentorship capacity — willingness to engage with emerging artists
- Deep Japan connection or cross-cultural practice alignment with Fusion's mission

**What Fellow adds over Resident:**

- **Fellow badge** — Distinct visual treatment on profile
- **Top-tier visibility** — Featured placement in network, priority in curatorial selections
- **Unlimited invites** — No cap on invite code generation (trusted to maintain quality)
- **Program advisory** — Invited to advise on program design, jury panels, or selection committees
- **Complimentary membership** — Fellows are membership-exempt (automatic `#exempt` status)
- **Editorial voice** — Invited to contribute journal entries, exhibition texts, or studio visits
- **Direct outreach channel** — Fusion staff and Radar outreach can reference Fellow endorsement
- **Annual recognition** — Featured in year-end network highlights

**Fellow is not a loyalty reward.** An artist could be a member for 5 years and never become a Fellow if their practice doesn't reach that level. Conversely, a newly-joined artist with an extraordinary body of work could be elevated within months. It's about the practice, not tenure.

### 4.4 Why subjective assessment beats metrics

It would be tempting to automate tier promotion based on measurable criteria — profile completion percentage, login frequency, number of applications submitted. This would be a mistake for three reasons:

1. **Art isn't quantifiable.** An artist who logs in twice a month but has extraordinary work is more valuable to the network than one who logs in daily with mediocre output. A metrics-based system would reward the wrong behavior.

2. **Gamification corrodes trust.** The moment artists see "complete 5 more actions to unlock Resident status," the platform becomes a game to play rather than a space for practice. Fusion should feel like a gallery, not a loyalty app.

3. **Subjectivity is the value proposition.** Fusion's entire brand is *curation* — humans making informed judgment calls about quality and fit. The tier system should embody that, not contradict it. If we can't be trusted to evaluate practice quality, we can't be trusted to run residency programs either.

**The team reviews profiles on a rolling basis.** Staff can flag profiles for tier consideration during normal Studio work (browsing members, reviewing applications, curating content). A lightweight review queue in Studio Finance or a dedicated panel lets staff propose tier changes, with a second staff member confirming. This keeps the process deliberate without making it bureaucratic.

### 4.5 How tiers interact with existing systems

#### Membership & pricing

| Tier | Monthly | Quarterly | Annual | Notes |
|---|---|---|---|---|
| **Foundation** | $30 | $75 | $260 | Current pricing; eligible for invite/promo code discounts |
| **Resident** | $25 | $65 | $230 | Modest loyalty discount unlocked by curation, not purchase |
| **Fellow** | Exempt | Exempt | Exempt | Complimentary membership; auto-exempt in Motoko |

Resident pricing rewards sustained practice. The discount is modest enough that it doesn't undercut the business but meaningful enough that the upgrade feels like genuine recognition.

#### Invite system (updated)

| Tier | Can generate invites? | Invite limit | Invite discount |
|---|---|---|---|
| **Foundation** | No | — | Can *redeem* invites, not create them |
| **Resident** | Yes | 3 active codes | 50% off first month for referee |
| **Fellow** | Yes | Unlimited | 50% off first month for referee |

This is a critical change from the original design: **Foundation members cannot generate invite codes.** Only Residents and Fellows can invite. This does two things:

1. **Quality signal.** Every invite comes from someone the team has already assessed as a serious practitioner. The invite carries weight.
2. **Aspiration.** Reaching Resident unlocks the ability to shape the network. This makes tier promotion meaningful beyond a badge.

Foundation members can still join via promo codes, partner codes, or direct signup — they just can't generate peer invites.

#### Profile display

Tiers should be visible but not aggressive. A small, elegant designation near the artist's name on their profile:

```
Sarah Chen — Ceramics, Brooklyn
Fusion Resident

[portfolio content]
```

Not a colored badge, not a star rating, not a progress bar. Just a word. The art should speak louder than the label.

In network browse/discovery views, Residents and Fellows surface higher by default, but Foundation profiles remain visible and browsable. The ranking is a soft preference, not a hard filter.

#### Programs & applications

- **Foundation** can apply to all programs (they're paying members)
- **Resident** gets tie-breaking preference when applications are competitive
- **Fellow** may be invited directly to programs, bypassing open application
- Program application forms can optionally show the applicant's tier to staff reviewers, alongside the application itself

#### Motoko data model

```motoko
public type ArtistTier = {
    #foundation;
    #resident;
    #fellow;
};

// Added to ArtistRecord or as a separate mapping
public type ArtistTierRecord = {
    artistId : Text;
    tier : ArtistTier;
    promotedAt : Text;          // ISO date of last tier change
    promotedBy : Principal;     // staff who made the call
    promotionNote : ?Text;      // internal note on why
    previousTier : ?ArtistTier;
};
```

Staff methods:
- `staffSetArtistTier(artistId, tier, note)` — promote/demote with audit trail
- `getArtistTier(artistId)` — public query
- `listArtistsByTier(tier)` — for Studio browse and analytics

### 4.6 Tier distribution targets

For a healthy network, the distribution should roughly follow:

| Tier | Target % of network | Rationale |
|---|---|---|
| **Foundation** | 50–60% | Accessible entry; the growth layer |
| **Resident** | 30–40% | The active, established core |
| **Fellow** | 5–10% | Rare, aspirational; curated ceiling |

If Resident falls below 30%, the team isn't reviewing enough — the pipeline is stalling. If Fellow exceeds 10%, the designation is losing meaning through over-assignment.

### 4.7 What this is NOT

- **Not a paywall.** Foundation members have full access to the platform. Tiers don't gate core features. They adjust visibility, pricing, and invite privileges — not access.
- **Not a rating system.** There is no "3.5 out of 5" or skill score. The tiers are qualitative designations about practice stage, not quality rankings.
- **Not permanent.** An artist who stops maintaining their practice, abandons their profile, or becomes inactive could be returned to Foundation. Tiers reflect current standing, not historical achievement. (In practice, demotions should be rare and handled sensitively.)
- **Not a competition.** Foundation artists are not "worse" than Residents. They're at a different stage. The platform should frame tiers as growth stages, not a hierarchy of worth.
- **Not an algorithm.** The moment this becomes automated, it loses the curatorial credibility that makes it meaningful.

### 4.8 Comparison to NJAL model

| Aspect | NJAL (fashion) | Fusion (visual art) |
|---|---|---|
| Tier names | White Sheep → Grey Sheep → Black Sheep | Foundation → Resident → Fellow |
| Entry tier | White Sheep (free Foundation account) | Foundation (paid, but discountable via invite) |
| Mid tier | Grey Sheep (can sell on Shop) | Resident (invite privileges, enhanced visibility, loyalty pricing) |
| Top tier | Black Sheep (curated, can't be requested) | Fellow (curated, can't be requested, membership exempt) |
| Assessment | NJAL team daily tracks brands | Fusion staff rolling review |
| Promotion | Automatic via curation team review | Staff-initiated with second confirmation |
| Top tier percentage | Not published (appears small) | Target 5–10% |
| Commerce gate | Grey Sheep required to sell | No commerce gate (Fusion isn't a marketplace) |
| Membership cost | $0 Foundation / $150/yr Designer | $30/mo Foundation / $25/mo Resident / Free Fellow |

The key difference: NJAL gates commerce behind tiers (you can't sell until Grey Sheep). Fusion doesn't have a marketplace, so tiers gate **invite privileges** and **visibility** instead — things that directly impact network growth quality.

---

## 5. Code & discount system design

### 4.1 Code types

We need **four distinct code types**, each serving a different growth function:

| Code type | Purpose | Discount | Duration | Who creates | Limit |
|---|---|---|---|---|---|
| **Invite code** | Member invites a peer | 50% off (both sides) | Configurable (1–3 months; default 1) | Members (auto-generated) | 3 active invites per member |
| **Promo code** | Marketing campaigns, events, partnerships | Configurable (% or fixed) | Configurable (1–3 months) | Staff/admin via Studio | Configurable (single-use or N-use) |
| **Partner code** | Gallery/institution partnerships | Custom discount + extended trial | Configurable | Admin only | Tied to partner entity |
| **Exempt code** | Existing 8-digit system | Full exempt (no payment) | Indefinite or trial window | Admin only (existing) | Single-use (existing) |

### 4.2 Code format

```
Invite codes:    FUSN-XXXX      (8 chars, member-generated, tied to referrer principal)
Promo codes:     Custom slug     (e.g. "TOKYO2026", "RESIDENCY50", staff-defined)
Partner codes:   Custom slug     (e.g. "GAGOSIAN", "MORI-ART-MUSEUM")
Exempt codes:    8-digit numeric (existing system, unchanged)
```

**Invite codes** use the `FUSN-` prefix to be immediately recognizable and shareable. The 4-char suffix is randomly generated, uppercase alphanumeric (excluding ambiguous characters: 0/O, 1/I/L).

### 4.3 Motoko data model

```motoko
public type PromoCode = {
    code : Text;
    codeType : { #invite; #promo; #partner };
    createdBy : Principal;
    createdAt : Text;

    // Discount
    discountType : { #percentOff : Nat; #fixedCentsOff : Nat; #freeMonths : Nat };
    discountDurationMonths : Nat;

    // Limits
    maxRedemptions : ?Nat;      // null = unlimited
    currentRedemptions : Nat;
    expiresAt : ?Text;          // null = no expiry
    active : Bool;

    // Referral tracking (for invite codes)
    referrerPrincipal : ?Principal;
    referrerArtistId : ?Text;

    // Partner tracking
    partnerLabel : ?Text;

    // Metadata
    campaignTag : ?Text;        // for analytics grouping
};

public type PromoRedemption = {
    code : Text;
    redeemerPrincipal : Principal;
    redeemedAt : Text;
    discountApplied : Text;     // human-readable: "50% off month 1"
    subscriptionId : ?Text;     // PayPal/Stripe sub ID
};
```

### 4.4 Payment integration

The discount needs to work with **PayPal (primary)** and **Stripe (legacy)**. Here's how:

#### PayPal path

PayPal subscriptions don't natively support coupon codes on `plan_id`-based subscriptions. Two options:

**Option A — Discounted plan IDs (implemented):**

Three discounted PayPal plans are created for 50% off the monthly rate at configurable durations:

| Plan | Env var | What it does |
|---|---|---|
| First month 50% off | `PAYPAL_PLAN_MONTHLY_50OFF_1MO_ID` | $15 for month 1, then $30/mo |
| First 2 months 50% off | `PAYPAL_PLAN_MONTHLY_50OFF_2MO_ID` | $15/mo for months 1–2, then $30/mo |
| First 3 months 50% off | `PAYPAL_PLAN_MONTHLY_50OFF_3MO_ID` | $15/mo for months 1–3, then $30/mo |

Set these in the Integration API's `.env`. The `resolveDiscountedPayPalPlanId()` helper in `payments/routes.js` resolves the correct plan based on `discountDurationMonths` from the promo code. If no matching env var is set, it falls back to the standard plan.

The naming convention for future discount plans is:
```
PAYPAL_PLAN_{TIER}_{PERCENT}OFF_{DURATION}MO_ID
```

These are also exposed via `GET /payments/config` under `discountPlans` for frontend reference.

**Option B — Manual credit (more flexible):**
- Create subscription at full price
- Integration API applies a credit/adjustment via PayPal Billing API after first payment
- More complex but supports arbitrary discount amounts

#### Stripe path

Stripe has native coupon support:

```js
// Integration API: new endpoint
// POST /stripe/create-subscription-with-coupon
const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    coupon: stripeCouponId,  // or promotion_code
});
```

New Integration API endpoints needed:

| Endpoint | Purpose |
|---|---|
| `POST /payments/validate-promo-code` | Check code validity, return discount details |
| `POST /payments/create-subscription-with-discount` | Create sub with discount (routes to PayPal or Stripe) |
| `POST /payments/redeem-promo-code` | Record redemption on canister after payment |

### 4.5 Frontend checkout integration

Add a promo code input to the join modal's payment step:

```
┌─────────────────────────────────────────────┐
│  Choose your plan                           │
│                                             │
│  ○ Monthly  — $30/mo                        │
│  ○ Quarterly — $75/quarter                  │
│  ○ Annual  — $260/year                      │
│                                             │
│  ┌───────────────────────────┐  ┌────────┐  │
│  │ Enter invite or promo code│  │ Apply  │  │
│  └───────────────────────────┘  └────────┘  │
│                                             │
│  ✓ FUSN-K7M2 applied — 50% off first month │
│    Monthly: $30/mo → $15 first month        │
│                                             │
│  [Continue to payment]                      │
└─────────────────────────────────────────────┘
```

The "Apply" button calls `POST /payments/validate-promo-code` and updates the displayed pricing. The actual discount is applied server-side when creating the subscription — the frontend never controls the price.

---

## 6. Referral program design

### 6.1 The mechanic: "Give a month, get a month"

| Side | Reward | When |
|---|---|---|
| **Referrer** (existing member) | 1 month free credit (applied to next billing cycle) | When referee completes first paid month |
| **Referee** (new member) | 50% off first month ($15 instead of $30) | At checkout with invite code |

**Why these specific rewards:**

- **50% off first month** — Reduces the entry barrier from $30 to $15 without giving away the product for free. Artists who won't pay $15 for a month of access are unlikely to retain at $30. This filters for genuine interest.
- **Broadcast credit for referrer** — Not cash, not a gift card — a broadcast credit that lets the referrer choose to be featured on a Fusion channel (Featured Artist, Newsletter Blast, or Social Post). This keeps the reward inside the Fusion ecosystem, is valuable to all members (including exempt), and has zero cash-out fraud risk.
- **Delayed referrer reward** — Only triggers after the referee completes their first paid month (not at signup). This prevents invite-and-churn gaming and ensures the referrer is bringing in real members.

### 6.2 Why not a free trial?

A free trial (7 or 14 days) seems obvious but has problems for Fusion specifically:

1. **Profile setup takes time.** Artists need to upload work, write bios, get AI-generated content. A 7-day trial creates pressure that leads to abandoned, half-built profiles that make the platform look empty.
2. **Value realization is slow.** Fusion's value isn't "try and see" like a tool — it's network access, program applications, and community. These unfold over weeks, not days.
3. **Trial-to-paid conversion is low.** Industry data shows pure self-serve free-trial-to-paid at **4.6%** in 2026. A 50% discount with intent signal (someone gave you a code) will convert higher.
4. **Free accounts attract non-artists.** Fusion's curation depends on members being practicing artists. A paywall, even a reduced one, is a quality filter.

If we later decide trials make sense, the existing `membershipTrialWindow` mechanism in Motoko already supports it — we'd just need to wire it into a better UX than the current admin-only flow.

### 6.3 Referral limits and anti-gaming

| Rule | Value | Rationale |
|---|---|---|
| Active invite codes per member | 3 | Prevents mass distribution; refreshed when used |
| Referrer reward cap | 6 months free/year | Prevents gaming; generous enough to motivate |
| Referee discount | First month only | Preserves unit economics |
| Code expiry | 90 days | Creates urgency; clears inactive codes |
| Minimum tier to refer | Resident or Fellow | Ensures referrer has been assessed by Fusion team (see section 4) |
| Referrer reward trigger | Referee completes first paid month | Prevents churn-abuse |

### 6.4 Referral tracking (server-side)

Attribution must be server-side, not cookie-based:

1. **Invite link**: `https://fusionart.world/join-network?ref=FUSN-K7M2`
2. **Router** captures `ref` param → stores in `sessionStorage` (`fusion-referral-code`)
3. **Join modal step 1** pre-fills the promo code field from `sessionStorage`
4. **Payment creation** includes the code → Integration API validates → creates discounted subscription
5. **Post-payment**: `redeemPromoCode()` on canister records the redemption with both principals
6. **After referee's first renewal**: canister auto-credits referrer's next billing cycle

No cookies involved. The code is the attribution — it's tied to the referrer's principal on the canister.

### 6.5 In-product referral prompts

Based on research, place referral prompts at **activation milestones**, not in settings:

| Trigger | Prompt | Placement |
|---|---|---|
| Profile 100% complete | "Your profile is live. Know an artist who should be here?" | Inline card below completion tracker |
| First "New World" AI generation | "Like what Fusion built for your practice? Share your invite." | Success state after generation |
| 30 days active (first renewal) | "You've been here a month. Who else should be?" | Modal on dashboard load (once) |
| After program application | "Applied to [program]. Know someone who'd be a fit?" | Confirmation screen |
| Membership anniversary | "One year in. Your invites: [3 available]" | Email + dashboard card |

Each prompt shows the member's personal invite link and code, with a one-tap copy button.

---

## 7. Onboarding flow improvements

### 7.1 Current gaps vs. best practice

| Best practice | Current state | Fix |
|---|---|---|
| Welcome email sequence (Day 1, 3, 7, 14) | Single welcome email | Build 4-email drip via Resend |
| Progressive profile completion | 5-step tracker exists but passive | Add guided prompts and progress celebrations |
| Time-to-value under 10 minutes | Profile setup is open-ended | Add "Quick start" flow: name → photo → bio → done |
| Personalized onboarding by role | Same flow for Artist/Gallery/Curator/Collector | Fork post-signup experience by role |
| Social proof during signup | None | Show member count, featured profiles, testimonials in join modal |
| Friction reduction | II linking is a mandatory extra step post-payment | Better education; consider II-first for resubscribe (already exists) |

### 7.2 Email drip sequence

| Day | Subject | Content | CTA |
|---|---|---|---|
| 0 (immediate) | "You're in — welcome to Fusion" | Confirm membership, next steps | Complete your profile |
| 3 | "Your profile is waiting" | Profile completion nudge + what members see | Upload your first work |
| 7 | "Artists in the network" | Featured member profiles + programs open | Browse programs |
| 14 | "Your invite codes are ready" | Introduce referral program | Share your invite link |
| 30 | "One month in" | Recap: profile views, network growth, programs | Renew + refer |

Each email should be crafted, not templated-feeling. Short, visual, with a single clear CTA. Use `emailCampaignTemplates.js` pattern with new template IDs (`tpl_onboarding_day0` through `tpl_onboarding_day30`).

**Trigger mechanism**: Integration API cron or scheduled Resend drip keyed on `createdAt` from the canister account record.

### 7.3 Quick-start profile flow

After payment + II linking, instead of dumping the user on the full settings page, show a **focused 3-screen quick start**:

```
Screen 1: "Let's set up your presence"
  → Name (pre-filled from join form)
  → Profile photo upload
  → One-line bio
  [Next →]

Screen 2: "Show your work"
  → Hero artwork upload
  → Discipline selector
  → Location
  [Next →]

Screen 3: "You're live"
  → Preview of their profile card as others will see it
  → "View your profile" / "Browse programs" / "Invite a peer"
  [Done]
```

This gets members to **activation** (visible profile + work) in under 5 minutes. The full settings page remains for detailed editing.

### 7.4 Role-specific post-signup paths

| Role | Immediate priority | Suggested first action |
|---|---|---|
| **Artist** | Profile + portfolio | "Upload your first piece" |
| **Gallery** | Network presence | "Add your gallery details and represented artists" |
| **Curator** | Discovery | "Browse the artist network" |
| **Collector** | Access | "Explore programs and gallery access" |

The role is captured at join step 1. Use it to customize the quick-start flow, email sequence tone, and initial dashboard state.

---

## 8. Implementation plan

### Phase 1 — Promo code infrastructure (1–2 weeks)

| Task | Where | Detail |
|---|---|---|
| Add `PromoCode` and `PromoRedemption` types | `types.mo` | New types as specified in section 4.3 |
| Add stable vars + CRUD methods | `main.mo` | `adminCreatePromoCode`, `validatePromoCode`, `redeemPromoCode`, `listPromoCodes` |
| Add code validation endpoint | Integration API | `POST /payments/validate-promo-code` → calls canister |
| Add discounted subscription creation | Integration API | PayPal: discounted plan IDs or credit; Stripe: coupon param |
| Add promo code input to join modal | `joinNetwork.js` | Input field on payment step; validation on "Apply" |
| Add code redemption to post-payment flow | `joinNetwork.js` | After subscription link, call `redeemPromoCode` |
| Wire `database.js` wrappers | `database.js` | Frontend helpers for promo code operations |

### Phase 2 — Member invite system (1–2 weeks)

| Task | Where | Detail |
|---|---|---|
| Add invite code generation | `main.mo` | `generateMyInviteCode` — auto-creates `FUSN-XXXX` tied to caller principal |
| Add invite code management | `main.mo` | `getMyInviteCodes`, `deactivateInviteCode`; enforce 3-active limit |
| Add referrer credit logic | `main.mo` | After referee's first renewal, credit referrer via `membershipCreditMonths` |
| Add invite section to settings | `settingsProfile.js` | Card showing invite codes, copy button, share link |
| Add "Invites" to Studio Finance | `financeSection.js` | Staff view of all invite redemptions, referral metrics |
| Add referral prompts at milestones | `settingsProfile.js` | Inline cards at profile completion, post-AI-gen, anniversary |
| Route `?ref=` param handling | `router.js` / `joinNetwork.js` | Capture ref param → sessionStorage → pre-fill code field |

### Phase 3 — Onboarding improvements (2–3 weeks)

| Task | Where | Detail |
|---|---|---|
| Build email drip templates | `emailCampaignTemplates.js` | Day 0, 3, 7, 14, 30 templates |
| Build drip trigger system | Integration API | Cron or Resend scheduled sends keyed on `createdAt` |
| Build quick-start flow | `settingsProfile.js` | 3-screen guided setup for new members |
| Add social proof to join modal | `joinNetwork.js` | Member count, featured profiles |
| Add role-specific onboarding | `settingsProfile.js` | Fork quick-start content by role |
| Add "Your invites" card to Day 14 email | `emailCampaignTemplates.js` | Introduce referral in email context |

### Phase 4 — Artist tier system (1–2 weeks)

| Task | Where | Detail |
|---|---|---|
| Add `ArtistTier` and `ArtistTierRecord` types | `types.mo` | New types as specified in section 4.5 |
| Add stable vars + tier CRUD methods | `main.mo` | `staffSetArtistTier`, `getArtistTier`, `listArtistsByTier` |
| Tier-gate invite generation | `main.mo` | `generateMyInviteCode` requires Resident or Fellow tier |
| Auto-exempt Fellows | `main.mo` | Fellow promotion triggers `#exempt` membership status |
| Resident pricing plans | PayPal / Stripe | Create discounted plan IDs for Resident tier ($25/mo, $65/quarter, $230/year) |
| Display tier on profile | `profile.js` / `settingsProfile.js` | Show "Fusion Foundation / Resident / Fellow" designation |
| Tier review queue in Studio | `financeSection.js` or new panel | Staff can browse members, propose tier changes, confirm with second reviewer |
| Tier promotion email | Integration API + Resend | Personalized notification when a member is promoted |
| `database.js` wrappers | `database.js` | Frontend helpers for tier queries |
| PostHog events | Throughout | `artist_tier_promoted`, `artist_tier_demoted` |

### Phase 5 — Staff tools & analytics (1–2 weeks)

| Task | Where | Detail |
|---|---|---|
| Studio promo code management | `financeSection.js` or new panel | Create/edit/deactivate promo codes; view redemptions |
| Partner code management | Same | Partner-specific codes with custom discounts |
| Referral analytics dashboard | Studio Finance | Funnel: codes shared → redeemed → retained; CAC comparison |
| Tier distribution dashboard | Studio Finance | Current tier breakdown, promotion velocity, tier-by-cohort analysis |
| A/B test referral prompt placement | Feature flags | Test inline vs. modal vs. floating widget |
| PostHog events | Throughout | `promo_code_applied`, `invite_shared`, `invite_redeemed`, `referral_credit_earned` |

---

## 9. Metrics & success criteria

### Primary metrics

| Metric | Target (6 months) | How measured |
|---|---|---|
| **Invite share rate** | 15% of active members share at least 1 invite | `invite_shared` events / active members |
| **Invite redemption rate** | 25% of shared invites redeemed | Redeemed codes / total generated |
| **Referred member 90-day retention** | 60%+ (vs baseline) | Cohort analysis: referred vs organic |
| **Promo code checkout conversion** | 40%+ (vs ~25% baseline without discount) | Completed payments with code / code validations |
| **Profile activation rate** | 55%+ (hero image + bio within 7 days) | Profile completion tracker |
| **Day-30 retention** | 70%+ for referred members | Active subscriptions at Day 30 |
| **Tier distribution** | 50–60% Foundation, 30–40% Resident, 5–10% Fellow | `listArtistsByTier` counts / total members |
| **Foundation → Resident promotion rate** | 25%+ of Foundation members promoted within 6 months | Tier change events / Foundation cohort |

### Secondary metrics

| Metric | Purpose |
|---|---|
| Referred member LTV vs. organic | Validate referral quality (expect 15%+ higher) |
| Time from code share to redemption | Optimize code expiry window |
| Referral prompt CTR by placement | Optimize prompt timing and position |
| Promo code revenue impact | Net revenue accounting for discounts |
| Email drip open/click rates | Optimize sequence content and timing |
| Drop-off by join flow step | Identify friction points |
| Resident retention vs. Foundation | Validate tier system impact on engagement (expect 20%+ higher) |
| Fellow referral conversion rate | Track whether Fellow invites convert at higher rates |
| Time from join to Resident promotion | Optimize review cadence and criteria |

### Cohort tracking

Track every member by acquisition source:

- **Organic** — No code, full price
- **Referred** — Member invite code
- **Promo** — Staff-created campaign code
- **Partner** — Institutional partnership code
- **Exempt** — Admin invite (existing system)

Compare 30/60/90-day retention, profile completion rate, program application rate, and LTV across cohorts. This data drives future investment decisions.

---

## 10. Anti-fraud & abuse prevention

| Risk | Mitigation |
|---|---|
| **Self-referral** (create burner to redeem own code) | Require unique email per account; referrer reward only after referee's first *renewal* (30 days); flag same-IP redemptions |
| **Code sharing on discount sites** | Invite codes are member-specific and limited to 3 active; promo codes can be single-use or capped |
| **Mass code generation** | 30-day membership tenure before invite access; 3-active-code cap; rate limit `generateMyInviteCode` |
| **Churn-and-rejoin for discount** | One invite code redemption per email/principal ever; returning members use standard resubscribe (no discount) |
| **Referral reward farming** | 6-month cap on referral credits per year; manual review flag at 4+ referrals/month |
| **Expired code abuse** | Server-side validation with `expiresAt` check; no client-side bypass possible |
| **Code enumeration / brute force** | Rate limit validation endpoint (5 attempts/min/IP); codes are 8-char alphanumeric (36^4 = 1.6M combinations for FUSN-XXXX) |

---

## 11. Risks & open questions

### Strategic risks

1. **Discounting devalues the brand.** Fusion's premium price signals curation quality. Aggressive discounting could attract low-intent signups who don't engage and dilute the network. *Mitigation: Keep discounts time-limited (first month only), maintain the invite-from-member mechanic as quality signal, never offer "free forever" codes.*

2. **Referral rewards create entitlement.** Members may expect ongoing rewards and feel negative when the cap is reached. *Mitigation: Frame invites as "building the network" first, rewards second. The primary value proposition is "bring in peers you want to see here."*

3. **PayPal discount plans add operational complexity.** Managing multiple plan IDs for discounted tiers is brittle. *Resolved: using 3 discounted plan IDs for 50% off at 1/2/3 month durations, resolved dynamically by `resolveDiscountedPayPalPlanId()` based on the promo code's `discountDurationMonths`. Env var pattern: `PAYPAL_PLAN_MONTHLY_50OFF_{N}MO_ID`.*

4. **Email deliverability.** A 5-email drip sequence needs careful Resend domain/reputation management. *Mitigation: Warm up slowly; monitor bounce/spam rates; use plain-text fallbacks.*

5. **Tier system perceived as gatekeeping.** Artists may feel the tier system creates an unwelcome hierarchy, especially if they're stuck at Foundation for months. *Mitigation: Frame tiers as growth stages, not quality rankings. Foundation is "building" — not "lesser." The language and UX must consistently reinforce that every member belongs here; the tiers reflect where they are in their journey, not their worth.*

6. **Tier subjectivity invites accusations of bias.** Without quantifiable criteria, artists may perceive promotions as favoritism. *Mitigation: Two-reviewer confirmation for every tier change. Maintain internal promotion notes (not public) for accountability. Publish general guidelines (not checklists) so members understand what the team values. Be transparent that this is curatorial judgment, the same as any gallery or residency selection.*

7. **Fellow complimentary membership impacts revenue.** If 5–10% of the network is membership-exempt, that's lost subscription revenue. *Mitigation: Fellows are the network's most valuable members for credibility and referral quality. Their presence attracts and retains paying members. The CAC of the members they bring in via unlimited invites far exceeds their foregone subscription revenue. Monitor and cap at 10%.*

### Open questions requiring decision

| Question | Options | Recommendation |
|---|---|---|
| Discount amount for member invites | 25% / 50% / 100% off first month | **50% ($15)** — meaningful enough to convert, but signals the product has value |
| Referrer reward | Billing credit / cash / features | **Broadcast credit** — referrer chooses a Fusion channel feature (Featured Artist, Newsletter Blast, or Social Post); keeps value in-ecosystem, valuable to exempt and paying members alike |
| Should galleries/institutions get special pricing? | Same tiers / custom plans / bulk seats | **Partner codes with custom discounts** — handle case by case initially |
| Should promo codes work on quarterly/annual? | Monthly only / all tiers | **All tiers** — but discount applies to first billing period only |
| When should members get invite access? | Resident tier / immediately / 30 days | **Resident tier** — ensures referrer has been assessed as a serious practitioner (see section 4) |
| PayPal discount mechanism | Discounted plan IDs / post-payment credit | **Discounted plan IDs** — implemented with 3 plans: 1mo/2mo/3mo at 50% off (`PAYPAL_PLAN_MONTHLY_50OFF_{1,2,3}MO_ID`) |
| Should invite codes be shareable as links? | Code only / link only / both | **Both** — link for social sharing, code for DMs and in-person |
| Tier promotion review cadence | Monthly batch / rolling / on-demand | **Rolling with monthly review sweep** — staff flag candidates anytime; monthly sweep catches anyone missed |
| Should tier be visible to other members? | Public / members-only / private | **Members-only** — visible on profiles within the network; not shown on public-facing pages to avoid external hierarchy perception |
| Can members request tier review? | Yes, self-nominate / no, staff only | **No** — staff-initiated only (like NJAL Black Sheep). Self-nomination creates entitlement and floods the queue. Members should focus on practice, not promotion-seeking. |

### What this document does NOT cover

- **Pricing strategy** (whether $30/mo is the right price point overall)
- **Free tier / freemium model** (fundamentally different architecture)
- **Paid advertising** (CAC for paid channels)
- **Content marketing / SEO** (organic growth strategy)
- **Program-specific recruitment** (residency application funnels)

These are adjacent strategic questions that deserve their own analysis.

---

## Appendix A: Competitive positioning for invite messaging

The invite is marketing. The language matters. Here's what the invite should communicate vs. what competitors offer:

| What artists are tired of | What Fusion's invite says |
|---|---|
| "Join our platform" (generic) | "Someone in the network thinks you belong here" |
| Algorithmic feeds burying their work | "A curated space where your work is seen by people who care" |
| AI-generated content flooding their feed | "A network for practicing artists — real work, real people" |
| Paying for a portfolio site with no community | "Portfolio + residency pipeline + curated community in one membership" |
| Platforms that extract value without giving back | "Members get AI tools, Japan program access, and a peer network" |

The invite email (sent by Integration API when a code is shared) should include:
- The referrer's name and a personal note (optional, entered when sharing)
- A featured image from the referrer's profile
- One sentence about what Fusion is
- The discount: "Your first month is $15 instead of $30"
- A direct link: `https://fusionart.world/join-network?ref=FUSN-XXXX`

### Sample invite message (auto-generated, editable by member)

> **[Referrer Name] invited you to Fusion**
>
> Fusion is a curated art network rooted in Japan — residency programs, AI-powered practice tools, and a community of practicing artists, galleries, and curators.
>
> [Referrer Name] thinks you'd be a good fit. Your first month is 50% off.
>
> [Join Fusion — $15 first month →]

---

## Appendix B: Technical reference — existing invite infrastructure

These are the **existing** Motoko methods and types relevant to this plan:

| Method/Type | Location | Current purpose |
|---|---|---|
| `JoinInviteRecord` | `types.mo` | 8-digit exempt/trial invite |
| `adminCreateJoinInviteCode` | `main.mo` | Admin creates exempt invite |
| `adminCreateTrialJoinInviteCode` | `main.mo` | Admin creates trial-window invite |
| `registerWithJoinAccessCode` | `main.mo` | Redeem invite → create exempt account |
| `membershipAccessForPrincipal` | `main.mo` | Returns `#noAccount` / `#exempt` / `#ok` / `#needsSubscription` |
| `MembershipFields` | `types.mo` | Stripe/PayPal subscription IDs, status, exempt flags |
| `FinancePromotion` | `types.mo` | Accounting campaign tracking (not checkout coupons) |
| `joinNetworkFlowFieldManifest.js` | Frontend utils | Join modal stages and field manifest |
| `earlyAccessSubscribe.js` | Frontend utils | Pre-payment early-access canister write |
| `integrationApi.js` | Frontend utils | Payment creation, subscription linking |

The new `PromoCode` system is **additive** — it doesn't replace the existing exempt/trial invite system, which continues to serve staff and admin use cases. The promo code layer adds the missing middle: *discounted paid memberships via invite and campaign codes*.

---

## Build checklist

Track implementation progress here. Check items off as they ship.

### Phase 1 — Promo code infrastructure

- [x] Add `PromoCode` type to `types.mo`
- [x] Add `PromoRedemption` type to `types.mo`
- [x] Add stable vars and HashMaps for promo codes in `main.mo`
- [x] Implement `adminCreatePromoCode` in `main.mo`
- [x] Implement `validatePromoCode` in `main.mo`
- [x] Implement `redeemPromoCode` in `main.mo`
- [x] Implement `listPromoCodes` in `main.mo`
- [x] Add `database.js` wrappers for promo code operations
- [x] Add `POST /payments/validate-promo-code` to Integration API
- [x] Add `POST /payments/create-subscription-with-discount` to Integration API
- [x] ~~Add `POST /payments/redeem-promo-code` to Integration API~~ — N/A: redemption handled directly on the canister via `redeemPromoCodeForCaller()` in `database.js` after II auth, so the Integration API middleman isn't needed
- [x] Create discounted PayPal plan IDs (50% off — 1mo, 2mo, 3mo durations)
- [x] Add Stripe coupon support to subscription creation
- [x] Add promo code input field to join modal payment step
- [x] Wire "Apply" button to validate endpoint with live price update
- [x] Call `redeemPromoCode` in post-payment flow
- [ ] Test full flow: apply code → discounted payment → redemption recorded

### Phase 2 — Member invite system

- [x] Implement `generateMyInviteCode` in `main.mo` (FUSN-XXXX format)
- [x] Implement `getMyInviteCodes` in `main.mo`
- [x] Implement `deactivateMyInviteCode` in `main.mo`
- [x] Enforce 3-active-invite limit per member
- [x] Implement `getMyInviteCountSummary` in `main.mo`
- [x] Add `InviteLineage` type + storage + recording in `redeemPromoCode`
- [x] Add lineage query methods: `getMyInviteLineage`, `getMyInvitees`, `getInviteLineageBatch`, `staffListInviteLineage`
- [x] Implement referrer broadcast credit logic (`creditReferrerForRenewal`, `getMyBroadcastCredits`, `redeemBroadcastCredit`)
- [x] Trigger referrer reward only after referee's first paid renewal (PayPal + Stripe webhooks)
- [x] Add `database.js` wrappers for invite + lineage operations
- [x] Add 4th MEMBER INVITES card to credits strips in `settingsProfile.js`
- [x] Add invite management panel (code list, copy/share, generate, deactivate)
- [x] Add "Invites" tab to Studio Finance in `financeSection.js` (codes + lineage tables)
- [x] Register `financeInvites` in `studioShellState.js` permission system
- [x] Handle `?ref=` query param in `router.js`
- [x] Store referral code in `sessionStorage` on landing
- [x] Pre-fill promo code field from `sessionStorage` in join modal
- [x] Add referral prompt at profile 100% complete
- [ ] Add referral prompt after first "New World" AI generation (deferred — depends on AI feature)
- [x] Add referral prompt at 30-day renewal
- [x] Add referral prompt after program application
- [ ] Add referral prompt at membership anniversary (deferred — depends on anniversary tracking)
- [ ] Test full flow: generate invite → share link → referee joins at discount → referrer credited

### Phase 2b — Broadcast Credits Overhaul

> **Note:** The original "billing credit" (free month) referral reward has been superseded by **broadcast credits**. Broadcast credits let members choose to be featured on a Fusion channel — Featured Artist, Newsletter Blast, or Social Post — when they earn credits through referrals. This change makes the reward equally valuable to exempt and paying members and gives artists tangible visibility instead of a billing discount.

**Backend changes:**
- [x] Replace `BillingCreditRecord` with `BroadcastCreditRecord`, add `BroadcastChannel`, `BroadcastRedemption` types (`types.mo`)
- [x] Update `DatabaseSnapshotV1` — rename `billingCreditsStable` → `broadcastCreditsStable`, add `broadcastRedemptionsStable`
- [x] Rename stable/transient vars and lifecycle hooks in `main.mo`
- [x] Rename `getMyBillingCredits` → `getMyBroadcastCredits`
- [x] Replace `consumeBillingCredit` with `redeemBroadcastCredit(channel)` — member-facing, creates a redemption record
- [x] Add `staffFulfillBroadcastRedemption` — marks a redemption as fulfilled
- [x] Add `staffListBroadcastRedemptions` — returns all redemption requests
- [x] Add `staffListBroadcastCredits` — returns all non-zero balances
- [x] Add `staffSetBroadcastCredits` — admin sets balance for one principal
- [x] Add `staffBatchSetBroadcastCredits` — batch set (limit 100)
- [x] Update `creditReferrerForRenewal` ledger note to say "broadcast credit"

**Frontend database wrappers:**
- [x] Rename `getMyBillingCreditsForCaller` → `getMyBroadcastCreditsForCaller`
- [x] Add `redeemBroadcastCreditForCaller(channel)`
- [x] Add `staffListBroadcastCreditsStudio()`
- [x] Add `staffSetBroadcastCreditsForStudio(principal, balance)`
- [x] Add `staffBatchSetBroadcastCreditsForStudio(entries)`
- [x] Add `staffListBroadcastRedemptionsStudio()`

**Credits strip restructure:**
- [x] Replace "Next credits" column with "Broadcast credits" column (+ info icon) in both strips
- [x] Move "Next credits" to a full-width footer row below the grid
- [x] Add broadcast icon clip-path, info tooltip, and redeem button styles
- [x] Add `paintBroadcastCreditsOnStrip()` + `wireBroadcastInfoAndRedeem()` functions
- [x] Fetch broadcast credits in `hydrateExploreProgramCredits()`
- [x] Add redeem flow (channel radio selector + confirm)

**Prompt language:**
- [x] Update `rewardSuffix` — unified message for all members mentioning broadcast credits
- [x] Update invite panel footer to mention broadcast credits and channels
- [x] Update canister ledger notes (billing → broadcast)

**Studio Manage Invites modal:**
- [x] Build `manageInvitesModal.js` — pill-based UI, color-coded by credit count
- [x] Add "Manage invites" button to Users toolbar in `panels.js`
- [x] Wire click handler to open the modal
- [x] Add color-coded pill styles to `studio.css`

**Broadcast Credits UX — Redemption Flow & Admin Section:**
- [x] Update credits strip button text from "Redeem" to "VIEW OPTIONS", add "credit(s) available" hint
- [x] Build 3-card broadcast claim modal (Social / Newsletter / Featured) with `openStudioModal`
- [x] Add secondary confirmation dialog (`openStudioConfirmDialog`) before redemption
- [x] Send branded confirmation email to member after successful claim (broadcast queued)
- [x] Show success notice after claim and refresh credits strip
- [x] Add 3-card modal CSS (`.mpd-broadcast-modal` grid, cards, CTA buttons, responsive stacking)
- [x] Remove old inline radio redeem styles (`.mpd-broadcast-redeem-channels`)
- [x] Add `staffFulfillBroadcastRedemptionForStudio` wrapper to `database.js`
- [x] Register "Broadcasts" tab in Studio Moderation section sidebar (`panels.js`)
- [x] Add `renderBroadcasts()` — table with Channel, Member, Email, Claimed, Status, Actions columns
- [x] Add `initBroadcasts()` — fetch redemptions + accounts, render filterable table
- [x] Wire Email action — compose modal with pre-filled to/subject and branded send
- [x] Wire Complete action — confirm dialog, call `staffFulfillBroadcastRedemption`, auto-send "broadcast live" notification email
- [x] Add channel badge pills (Social=olive, Newsletter=blue, Featured=amber) and status indicator styles to `studio.css`
- [x] Register `broadcasts` in `defaultStudioFeatureKeys()` in `main.mo` and `studioPermissionFeatures.js`

### Phase 3 — Onboarding improvements

- [ ] Build Day 0 email template (`tpl_onboarding_day0`)
- [ ] Build Day 3 email template (`tpl_onboarding_day3`)
- [ ] Build Day 7 email template (`tpl_onboarding_day7`)
- [ ] Build Day 14 email template (`tpl_onboarding_day14`) — includes invite codes intro
- [ ] Build Day 30 email template (`tpl_onboarding_day30`)
- [ ] Build drip trigger system in Integration API (cron / Resend scheduled)
- [ ] Build quick-start screen 1: name, photo, one-line bio
- [ ] Build quick-start screen 2: hero artwork, discipline, location
- [ ] Build quick-start screen 3: profile preview + next actions
- [ ] Add social proof to join modal (member count, featured profiles)
- [ ] Fork quick-start flow by role (Artist / Gallery / Curator / Collector)
- [ ] Test email deliverability and open rates for drip sequence

### Phase 4 — Artist tier system

- [ ] Add `ArtistTier` variant type to `types.mo`
- [ ] Add `ArtistTierRecord` type to `types.mo`
- [ ] Add stable vars and HashMaps for tier records in `main.mo`
- [ ] Implement `staffSetArtistTier` in `main.mo` (with audit trail)
- [ ] Implement `getArtistTier` in `main.mo`
- [ ] Implement `listArtistsByTier` in `main.mo`
- [ ] Gate `generateMyInviteCode` to Resident and Fellow tiers
- [ ] Auto-set `#exempt` membership status on Fellow promotion
- [ ] Create Resident pricing plans in PayPal ($25/mo, $65/quarter, $230/year)
- [ ] Create Resident pricing plans in Stripe
- [ ] Add `database.js` wrappers for tier queries
- [ ] Display tier designation on member profile (`profile.js`)
- [ ] Display tier on member settings (`settingsProfile.js`)
- [ ] Build tier review queue in Studio (browse, propose, confirm)
- [ ] Require second staff confirmation for tier changes
- [ ] Build tier promotion email template (Integration API + Resend)
- [ ] Add `artist_tier_promoted` PostHog event
- [ ] Add `artist_tier_demoted` PostHog event
- [ ] Assign initial tiers to existing members
- [ ] Test full flow: staff promotes member → email sent → pricing updates → invite access unlocked

### Phase 5 — Staff tools & analytics

- [ ] Build Studio promo code management panel (create, edit, deactivate, view redemptions)
- [ ] Build partner code management (custom discounts tied to partner entity)
- [ ] Build referral analytics dashboard (codes shared → redeemed → retained)
- [ ] Build tier distribution dashboard (breakdown, promotion velocity, tier-by-cohort)
- [ ] Implement A/B test framework for referral prompt placement
- [ ] Add `promo_code_applied` PostHog event
- [ ] Add `invite_shared` PostHog event
- [ ] Add `invite_redeemed` PostHog event
- [ ] Add `broadcast_credit_earned` PostHog event
- [ ] Compare CAC across cohorts (organic vs referred vs promo vs partner)

### Post-launch validation

- [ ] Verify tier distribution is tracking toward targets (50–60% / 30–40% / 5–10%)
- [ ] Verify referred member 90-day retention ≥ 60%
- [ ] Verify invite share rate reaches 15% of active Residents/Fellows
- [ ] Verify promo code checkout conversion ≥ 40%
- [ ] Verify profile activation rate ≥ 55% within 7 days
- [ ] Review Fellow complimentary membership revenue impact (stay under 10%)
- [ ] First monthly tier review sweep completed
- [ ] Email drip open/click rates reviewed and optimized
