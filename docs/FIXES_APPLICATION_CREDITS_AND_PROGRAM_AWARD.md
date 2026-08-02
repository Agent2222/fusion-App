# Fixes — Application credits & FUSION Program Award

Tracking doc for work deferred while memberships ship. Covers:

1. Removing the **temporary free-member application submit** waive
2. Completing the **application credit** system
3. Building the **FUSION Program Award** cycle (replacing “program draw” / raffle framing)

Related: [`PAYMENTS.md`](./PAYMENTS.md).

---

## Status snapshot (as of 2026-08)

| Area | Current state |
|------|----------------|
| Member application fees | **TEMP waive:** all active members submit free (`membership_temp`) |
| Guest application fee | **$50** one-time (unchanged) |
| Quarterly app credits | Accrual helpers exist in Motoko + FE; **not consumed** while waive is on |
| Annual / monthly fee rules | Implemented behind waive flag; not live |
| Program draw / award | UI stubs only (Studio Applicants “Draw”, Manage Artist Credits, Explore credits strip) |
| Legal framing | Prefer **juried Program Award**, not chance-based lottery |

---

## Part A — Remove temporary membership application-fee waive

### Why it exists

Until credits + award entry rules are finished, active members (monthly / quarterly / annual / legacy bi-monthly) must be able to submit applications without a hard $35 paywall. Guests still pay $50.

### Flags to flip (both must match)

| Location | Symbol |
|----------|--------|
| Motoko `main.mo` | `TEMP_WAIVE_MEMBER_APPLICATION_FEES` → `false` |
| FE `applicationFeePolicy.js` | `TEMP_WAIVE_MEMBER_APPLICATION_FEES` → `false` |

### Checklist when turning off

1. Confirm credit accrual + consume paths are tested end-to-end (Part B).
2. Set both flags to `false`.
3. Redeploy `fusion-app-backend`, regenerate bindings (`dfx generate`), redeploy frontend.
4. Update [`PAYMENTS.md`](./PAYMENTS.md) application-fees paragraph (remove TEMP wording).
5. Smoke-test:
   - Guest → $50 checkout
   - Monthly → $35 (or intended post-credits rule)
   - Quarterly with balance ≥ 1 → free + credit decrements
   - Quarterly with balance 0 → $35
   - Annual → free while membership active
   - Exempt / staff → free
6. Remove or narrow `membership_temp` handling in `application-form.js` once unused.
7. Keep unit tests in `applicationFeePolicy.test.js` covering both flag states until flag is deleted.

### Intended post-waive fee matrix (applications)

| Caller | Due | Reason |
|--------|-----|--------|
| No / inactive membership | $50 | `application_only` |
| Monthly / legacy bi-monthly | $35 | `member_fee` |
| Quarterly, credit ≥ 1 | $0 | `credit` (consume 1) |
| Quarterly, credit = 0 | $35 | `member_fee` |
| Annual (active) | $0 | `annual` |
| Exempt | $0 | `exempt` |

---

## Part B — Complete application credit system

### Product rules (target)

- **Quarterly ($75):** +1 stackable **application credit** per calendar quarter while membership is active; unused credits roll over.
- **Annual ($260):** applications included while membership is active (no per-submit charge); clarify whether annual also accrues quarterly credits or is unlimited-included only.
- **Monthly ($30):** no included application credit; pay $35 per application (unless product later bundles differently).
- Credits are **not** the same as Program Award entries (Part C).

### Already in codebase (partial)

- Motoko: `quarterlyAppCreditBalanceByPrincipal`, `accrueQuarterlyAppCredits`, `applicationFeeDueForPrincipal` / `applicationFeeDueForCaller`, consume-on-submit (gated by temp waive).
- FE: `applicationFeePolicy.js` (`accrueQuarterlyCreditsState`, `computeApplicationFeeDue`), settings Explore credits strip, Manage Artist → Credits tab placeholder.
- Copy in application form / settings still describes the intended rules.

### Remaining work

- [ ] Decide annual policy precisely: unlimited free apps vs N credits / year.
- [ ] Accrue on membership activation / renewal webhook (not only on fee-due query).
- [ ] Admin tools: view / adjust credits (Manage Artist Credits tab — wire real canister APIs).
- [ ] Member UX: clear balance, next accrual date, “this submit will use 1 credit.”
- [ ] Ledger / audit: credit grant, consume, admin adjust.
- [ ] Integration tests: PayPal quarterly subscribe → credit appears → submit decrements → second submit without credit charges $35.
- [ ] Turn off Part A waive only after the above is green.

### Key files

- `src/fusion-app-backend/main.mo` — accrual, fee-due, submit consume
- `src/fusion-app-frontend/src/utils/applicationFeePolicy.js`
- `src/fusion-app-frontend/src/utils/membershipCreditsDisplay.js` (if present)
- `src/fusion-app-frontend/src/components/subComponents/application-form.js`
- `src/fusion-app-frontend/src/components/settingsProfile.js` (Explore programs credits)
- `src/fusion-app-frontend/src/utils/studioArtistForm.js` (Credits tab stub)

---

## Part C — FUSION Program Award (not a lottery “draw”)

### Naming

Do **not** call the monthly add-on an “upgrade.” Members are not changing tiers; they are purchasing a **Program Award entry** (or “Program Draw Entry” in older stubs — prefer **Program Award** in user-facing copy).

Avoid raffle / lottery / chance-to-win language in product UI.

### Preferred legal / product model

A system with (1) prize of value, (2) winner by chance, (3) payment to participate can legally resemble a lottery. Subscription framing does not automatically remove the “payment” element if membership is required to enter. NY gambling definitions and FTC sweepstakes guidance generally expect a genuine free alternative entry method when selection is random.

**Safer options:**

1. **Juried Program Award** (preferred for FUSION) — selection by published artistic criteria; $50 is an application / entry fee, not a chance ticket.
2. Keep random selection but provide a **genuine free AMOE** with equal odds.
3. Eligible charitable-gaming structure after legal review.

**FUSION preference — option 1:**

> **FUSION Program Award**  
> Up to **100 applications per cycle**. One artist receives a **fully funded $5,000 residency placement**.  
> Selection combines eligibility, application quality, and readiness — professional positioning, not raffle framing.  
> The $50 remains an economically straightforward application / entry fee.

Legal review before launch remains required; this doc is product intent, not legal advice.

### Entry economics (membership + optional entry)

Clear logic (base framing):

| Action | Cost | Notes |
|--------|------|--------|
| Monthly member enters a cycle | $30 membership + **$50** Program Award entry | Not a membership upgrade |
| Quarterly member | $75 includes **one** entry for the cycle covered by that payment | |
| Annual member | Entries per plan (see table below) | |
| Same cycle | **Nobody can buy multiple entries** in one cycle | Cap = 1 entry / member / cycle |

#### Allocation sketch (quarterly)

If one quarterly member pays $75:

- **$50** → program pool  
- **$25** → platform access  

At 100 quarterly members:

- **$5,000** program pool  
- **$2,500** platform revenue  

#### Annual allocation debate

Draw-heavy split ($200 toward four program entries + $60 platform) makes annual feel extremely award-focused and weakens platform value perception.

**Healthier target plan (preferred):**

| Plan | Price | Included Program Award entries |
|------|-------|--------------------------------|
| Monthly | $30 | **0** (buy $50 entry per cycle) |
| Quarterly | $75 | **1** |
| Annual | $260 | **2** |

Annual members may purchase additional **$50** entries for **future** cycles (still max one entry per cycle). That protects perceived value of platform access itself.

> Note: This table is for **Program Award entries**, distinct from **application credits** in Part B. Confirm whether a Program Award entry also covers the program application fee, or whether application fee + award entry are separate charges.

### Cycle rules (implementation targets)

- [ ] Define cycle calendar (aligned with quarterly membership periods or separate award cycles).
- [ ] Cap **100 applications / entries** per cycle (or waitlist after 100).
- [ ] Enforce **one entry per principal (or linked artist) per cycle**.
- [ ] Grant included entries on quarterly/annual activation; sell $50 one-time for monthly / extra annual.
- [ ] Pool accounting: track program-pool vs platform split for Finance (Studio).
- [ ] Studio Applicants: replace Draw stub with **Program Award** rail (eligible / entered / selected / not selected).
- [ ] Member UX: “Program Award entry” purchase CTA — never “upgrade membership.”
- [ ] Publish selection criteria on program / award pages (juried model).
- [ ] Winner outcome: funded $5,000 residency placement workflow (ledger, deposit waive, Studio flags).

### Existing stubs to replace

- Studio Applicants program cards — “Draw” empty state (`applicantsProgramCards.js` / `panels.js`)
- Manage Artist → Credits — “Program draw credits” placeholder (`studioArtistForm.js`)
- Explore programs credits strip — stub draw credits (settings / `membershipCreditsDisplay`)

Rename user-facing strings from “draw” → “Program Award” as the feature ships.

### Key files (expected)

- Motoko: new award-cycle + entry maps (or extend credit maps carefully)
- Integration API: $50 one-time PayPal product for award entry
- FE: application form / settings / Studio Applicants / Finance
- Docs: this file + [`PAYMENTS.md`](./PAYMENTS.md)

---

## Part D — Suggested implementation order

1. **Finish application credits (Part B)** and member UX for balances.  
2. **Turn off temp waive (Part A)** and verify fee matrix.  
3. **Ship Program Award cycles (Part C)** with juried criteria + entry ledger + Studio tools.  
4. Wire Finance allocation reporting ($50 pool / platform splits).  
5. Legal pass on copy, T&Cs, and fee disclosures before public marketing.

---

## Open product decisions

- [ ] Annual: unlimited free **applications** vs credit-capped; and exactly **2** included **award entries** (confirmed above as preferred).
- [ ] Does a Program Award entry include / replace the program **application fee**, or are they stacked?
- [ ] Cycle alignment: calendar quarter vs program-specific award windows.
- [ ] What happens to unused included annual entries at membership end?
- [ ] Staff / exempt behavior for award entries.
- [ ] Whether “application credits” and “award entries” share one Credits UI or two sections.

---

## Quick reference — temp waive removal

```text
# Motoko
TEMP_WAIVE_MEMBER_APPLICATION_FEES : Bool = false;

# Frontend
export const TEMP_WAIVE_MEMBER_APPLICATION_FEES = false;
```

Then: deploy backend → `dfx generate` → build/deploy frontend → run fee smoke tests above.
