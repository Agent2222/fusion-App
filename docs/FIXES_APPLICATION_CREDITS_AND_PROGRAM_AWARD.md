# Fixes — Application credits & FUSION Program Award

Tracking doc for application credits, temp fee-waive removal, and the **FUSION Program Award** cycle.

Related: [`PAYMENTS.md`](./PAYMENTS.md).

---

## Locked product rules (2026-08)

| Tier | Application fees / credits | Program Award entries |
|------|---------------------------|------------------------|
| Guest | $50 per formal application | N/A (buy path membership-gated later if needed) |
| Monthly | $35 per application (no app credits) | 0 included; buy $50 entry per cycle |
| Quarterly | +1 stackable **application credit** / calendar quarter | +1 stackable **award entry** / cycle; **max 1 entry per program** |
| Annual | **4** stackable application credits (not unlimited) | **4** included award entries; win once per membership year (Studio may gift win to another user). Member-to-member **credit transfer** is a later feature. |

**Mutual exclusion (same program):** Formal application and Program Draw entry are separate flows. A principal cannot hold both for the same `programId`. Award entrants exit the draw before formally applying; formal applicants withdraw in Settings (no app-credit refund) before entering the draw.

**Naming:** User-facing **Program Award** (not lottery/raffle). Studio may keep internal ids (`draw`, `ProgramDrawConfig`).

**Studio ownership:**

| Surface | Role |
|---------|------|
| Programs → Edit → Award tab | Sole write for `active` / `totalSlots` |
| Applicants → Award mode | Ops rail only; read-only active/slots |
| Manage Artist → Credits | Admin view/adjust app credits + award entries; **Zero all Program Award balances** (admin one-shot) |
| Settings Explore / Studio Overview credits | Member + exempt available-credits home (balances + next grant / Included) |

### Form UX (credit-first)

| State | Formal application | Program Draw |
|-------|--------------------|--------------|
| Credit available (`reason === credit` / award bal ≥ 1) | Primary credit callout + **Submit** only — no pay, no Explore memberships | Primary credit callout + **Enter with credit** only — no $50 card, no Explore memberships |
| Existing member, 0 credits | $35 one-time only (Explore memberships hidden) | $50 one-time only (Explore memberships hidden) |
| Guest / needs subscription | $50 + Explore memberships | $50 + Explore memberships |
| Exempt / non-credit waive | Soft “no payment required” banner + Submit (not framed as using a credit) | N/A for award (exempt does not accrue award entries) |

### Award balance reset

- Motoko `adminClearAllAwardEntryBalances()` (admin only): clears every `awardEntryBalanceByPrincipal` entry to empty/0.
- **Keeps** `awardEntryLastGrantedByPrincipal` so the current quarter/year does not immediately re-grant.
- Re-earn only on the next quarterly (+1) or annual (+4) accrual for active `#ok` members.
- Studio: Manage Artist → Credits → **Zero all Program Award balances** (confirm dialog). After deploy: `dfx generate` then run once on the target network.

---

## Status snapshot

| Area | Target after this implementation |
|------|----------------------------------|
| Member application fees | Post-waive matrix (credits / $35 / $50) |
| Guest application fee | **$50** one-time |
| App credits | Quarterly +1/q; annual +4/period; consume on submit |
| Program Award | Entry balances, mutex, enter/exit, Studio ops |
| Legal framing | Juried Program Award, not chance-based lottery |

---

## Part A — Remove temporary membership application-fee waive

### Flags (both must match)

| Location | Symbol |
|----------|--------|
| Motoko `main.mo` | `TEMP_WAIVE_MEMBER_APPLICATION_FEES` → `false` |
| FE `applicationFeePolicy.js` | `TEMP_WAIVE_MEMBER_APPLICATION_FEES` → `false` |

### Checklist when turning off

1. Confirm credit accrual + consume paths are tested.
2. Set both flags to `false`.
3. Redeploy `fusion-app-backend`, `dfx generate`, redeploy frontend.
4. Update [`PAYMENTS.md`](./PAYMENTS.md).
5. Smoke-test fee matrix below.
6. Narrow `membership_temp` handling in `application-form.js`.

### Post-waive fee matrix (formal applications)

| Caller | Due | Reason |
|--------|-----|--------|
| No / inactive membership | $50 | `application_only` |
| Monthly / legacy bi-monthly | $35 | `member_fee` |
| Quarterly or annual, credit ≥ 1 | $0 | `credit` (consume 1) |
| Quarterly or annual, credit = 0 | $35 | `member_fee` |
| Exempt | $0 | `exempt` (always shows **1** application credit; submit does not consume it) |

**Exempt credits:** complimentary members always have **1 application credit** (server floor `exempt_floor`). They receive **no included Program Award entries** (not a paid member) but **may still purchase** draw/award entries via the $50 path. Explore `#mpd_program_credits` is visible for exempt and for monthly / quarterly / annual members.

---

## Part B — Application credit system

- **Quarterly ($75):** +1 stackable application credit when membership renews each calendar quarter; unused roll over.
- **Annual ($260):** **4** stackable application credits when membership renews each year (not unlimited free apps).
- **Monthly ($30):** no included application credit; $35 per application.
- **Exempt:** always 1 application credit shown; free apps via `reason: exempt` (no consume); no included award grants.
- Credits are **not** Program Award entries (Part C).
- Accrue on membership activation / tier sync as well as fee-due / credits query (`#ok` only for included grants).
- Admin: Manage Artist → Credits (view / adjust).
- Member UX: Explore `#mpd_program_credits`, application form “this submit uses 1 credit.”

### Key files

- `src/fusion-app-backend/main.mo` — accrual, fee-due, submit consume
- `src/fusion-app-frontend/src/utils/applicationFeePolicy.js`
- `src/fusion-app-frontend/src/utils/membershipCreditsDisplay.js`
- `src/fusion-app-frontend/src/components/subComponents/application-form.js`
- `src/fusion-app-frontend/src/components/settingsProfile.js`
- `src/fusion-app-frontend/src/utils/studioArtistForm.js`

---

## Part C — FUSION Program Award / Program Draw

Award / draw entry is **only for award consideration**. Application fee/credit rules are separate. A principal cannot hold both a formal application and a draw entry for the same `programId` (mutex).

| Plan | Price | Included Program Award entries |
|------|-------|--------------------------------|
| Monthly | $30 | **0** (buy $50 entry per cycle) |
| Quarterly | $75 | **1** (stackable; max 1 use per program) |
| Annual | $260 | **4** |

**Public UX:** `#programApplicationWrap` hosts sibling forms — `<app-application-form>` (formal) and `<app-program-draw-form>` (draw). Draw fields: contact & location, website (“Where can we experience your world?”), bio (“Tell us about yourself…”). Complete section: **credit-first callout + enter** when award balance ≥ 1; else **$50** PayPal (`purpose: program_award_entry`, `DRAW_ENTRY_FEE_CENTS`) with Explore memberships only for non-members.

**Path switching (manual only):**
- Formal application → draw: **Withdraw application** in Settings → My programs (`withdrawMyProgramApplication`). **No application-credit refund.**
- Draw → formal: **Exit Program Draw** (`exitProgramAward`). **No award-credit refund.**

There is no automatic form switching when the other path is active — the blocked path shows a message instead.

### Cycle / Studio

- Cap via `ProgramDrawConfig.totalSlots` (default 100).
- One entry per principal per program; payload JSON stored in sidecar `programAwardPayloadById`.
- Studio Applicants **Award** mode lists `listProgramAwardEntriesDetailed` (name/email/status/enteredAt/paid + website/bio), not formal applicants with draw flags.
- Winner: once per membership year; admin may gift win to another user.

### Key files

- Motoko: award entry maps + payload sidecar + mutex + `enterProgramAward` / `exitProgramAward` / `withdrawMyProgramApplication` / `listProgramAwardEntriesDetailed`
- Integration API: $50 one-time PayPal for award entry
- FE: `program-draw-form.js`, program page CTAs, Settings withdraw, Studio Applicants Award mode

---

## Part D — Implementation order

1. Finish application credits (Part B) and member UX.
2. Turn off temp waive (Part A).
3. Ship Program Award (Part C) with mutex + Studio tools.
4. Finance pool split reporting (follow-up).
5. Legal pass on copy / T&Cs before public marketing.
6. Member-to-member credit transfer (follow-up).

---

## Quick reference — temp waive removal

```text
# Motoko
TEMP_WAIVE_MEMBER_APPLICATION_FEES : Bool = false;

# Frontend
export const TEMP_WAIVE_MEMBER_APPLICATION_FEES = false;
```

Then: deploy backend → `dfx generate` → build/deploy frontend → run fee smoke tests.

---

## Manual E2E checklist (post-deploy)

1. Deploy `fusion-app-backend`, run `dfx generate fusion-app-backend`, build/deploy frontend.
2. Confirm `TEMP_WAIVE_MEMBER_APPLICATION_FEES` is `false` in Motoko + `applicationFeePolicy.js`.
3. Guest apply → $50 checkout.
4. Monthly member apply → $35 checkout; Explore strip shows 0 app credits / 0 award entries (or monthly hint).
5. Quarterly subscribe → Explore shows ≥1 application credit and ≥1 Program Award entry after accrue.
6. Quarterly apply with credit → credit callout + Submit (no pay/membership UI); balance decrements; second apply without credit → $35 only (no Explore memberships).
7. Annual subscribe → 4 app credits + 4 award entries; apply consumes 1 app credit.
8. Programs → Edit → Program Award: set active + slots; Applicants Award mode is read-only for active.
9. Public program page (award active): draw form — credit callout when bal ≥ 1; member with 0 credits sees $50 only; guest sees $50 + memberships.
10. Formal applicant blocked on draw until Settings withdraw (no credit refund); then draw entry works.
11. Draw entrant exits draw (no award refund) then formal apply works.
12. After deploy: admin runs **Zero all Program Award balances** once; balances stay 0 until next accrual period.
12. Monthly / exhausted award entries → $50 PayPal one-time enter path on draw form.
13. Studio Applicants → Award mode lists draw entries with payload (website/bio).
14. Manage Artist → Credits: view/adjust app + award for linked principal.
