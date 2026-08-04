# Program Draw — Selection & Display (reference)

Status of **FUSION Program Award** (public “Program Draw”) entry, display, Studio ops, payments, and remaining **selection** work.

Related docs: [`FIXES_APPLICATION_CREDITS_AND_PROGRAM_AWARD.md`](./FIXES_APPLICATION_CREDITS_AND_PROGRAM_AWARD.md), [`PAYMENTS.md`](./PAYMENTS.md).

---

## Status snapshot

| Area | Status |
|------|--------|
| Entry API (enter / exit / path mutex / paid vs credit) | **Done** |
| Paid-entry attestation (ledger + order id + webhook/repair enter) | **Done** |
| `ProgramDrawConfig` (active, totalSlots) + Studio Programs → Program Award | **Done** |
| Public progress (`getProgramDrawProgressPublic`) | **Done** (`cycle` still hardcoded `1`) |
| CMS copy slug `program-draw` | **Done** |
| Public display (progress, empty state, past recipients, waitlist) | **Done** |
| Entry form credit-first / member pay-only / guest memberships | **Done** |
| Studio Applicants → Award mode (slots, paid revenue, entry table) | **Done** |
| Award credits accrual + admin clear-all balances | **Done** |
| Settings Explore + Studio Overview credits strips | **Done** |
| Past recipients sidecar + Studio roster checkbox + public list | **Done** (manual ops) |
| Motoko `adminSelectProgramAwardWinner` / `adminGiftAwardWin` | **Done** (API only) |
| Studio “Run draw” / random selection / audit record | **Missing** |
| Auto-sync selection → `ArtistDrawRecipient` | **Missing** |
| PayPal webhook signature verification (`PAYPAL_WEBHOOK_ID`) | **Optional follow-up** |

---

## Related surfaces (shipped)

| Surface | Role |
|---------|------|
| Motoko `enterProgramAward(programId, paypalOrderId, …)` | Empty order id → consume award credit; non-empty → attest ledger row then enter |
| Motoko `integrationEnterProgramAward` | Integration-only enter after PayPal capture (webhook / confirm / repair) |
| Motoko `exitProgramAward` / `withdrawMyProgramApplication` | Exit draw; clear formal-path mutex |
| Programs → Edit → **Program Award** | Write `active` / `totalSlots` |
| Content → **Program Draw** (`program-draw`) | Global display copy |
| [`program-draw-display.js`](../src/fusion-app-frontend/src/components/subComponents/program-draw-display.js) | Public hero / progress / past recipients / CTAs |
| [`program-draw-form.js`](../src/fusion-app-frontend/src/components/subComponents/program-draw-form.js) | Intake: credit callout, $50 PayPal (order id + payload meta), membership explore (guests) |
| Integration `recordVerifiedPayPalOrder` | Award fee → ledger (`program_award_entry`); optional enter from pending `payloadJson` |
| Studio Applicants → **Program Award** mode | Ops list + slots + revenue from **paid** entries only |
| Manage Artist → **Draw recipient** | Manual past-recipient sidecar |
| Manage Artist → Credits → **Zero all Program Award balances** | Admin one-shot (`adminClearAllAwardEntryBalances`; keeps last-granted keys) |
| Settings Explore / Studio Overview credits | App + award balances |

---

## 1. Purpose

- Fairly select one (or N) award recipients from eligible Program Draw entrants for a cycle.
- Surface winners on the public draw display (Past recipients) and any award announcement UX.
- Keep selection auditable for Studio/ops.

Entry, display, paid-entry attestation, and manual past-recipient marking are live. **Automated / Studio-run selection** is the remaining product gap.

---

## 2. Eligibility (pool) — for future selection

Candidates should be entrants for the program who are still in the draw pool:

- Status `entered` (exclude `exited`; treat `selected` / `not_selected` per cycle rules when implemented).
- Path mutex: not on formal `application` path for the same `programId`.
- Paid (`paidEntry === true`) and award-credit entries both eligible unless product says otherwise.
- Authenticated accounts only (anonymous blocked at `enterProgramAward`).
- Win-year gate already on enter (`awardWinPeriodByPrincipal`).
- Paid seats are backed by a verified PayPal ledger row (see §8); `paidEntry` is not a client-trusted flag.

---

## 3. Selection — done vs missing

### Done (Motoko only)

| API | Behavior |
|-----|----------|
| `adminSelectProgramAwardWinner` | Marks given principal `selected`, others `not_selected`; records win period |
| `adminGiftAwardWin` | Transfer win year between principals |

No frontend callers under `src/` yet — ops cannot run these from Studio UI.

### Missing (design + build)

- **Where randomness runs:** on-canister vs integration server + signed write-back.
- **Trigger:** Studio “Run draw” vs scheduled job when cycle hits capacity / deadline.
- **Seed / audit:** store seed, pool size, selected principal(s), timestamp, operator id.
- **Idempotency:** no double-select for the same cycle; rules if re-run is allowed.
- **Studio UI:** preview eligible pool size → confirm → call select API.
- **Sync:** after select, resolve linked roster artist id and call `staffSetArtistDrawRecipient` so Past recipients match entry-path winners.
- Multi-winner cycles.

---

## 4. Data model

### Past recipients (implemented)

Sidecar (not on `ArtistCore`):

```motoko
type ArtistDrawRecipient = {
  artistId : Text;
  cycle : Nat;
  programId : Text;
  awardLabel : Text;
  updatedAt : Text;
};
```

| API | Role |
|-----|------|
| `staffSetArtistDrawRecipient` | Studio Manage save (enable/disable + meta) |
| `getArtistDrawRecipient` | Studio load |
| `listArtistDrawRecipientsPublic` | Public Past recipients list |

Portrait / name / place come from the public artist roster at read time.

Entry-path selection (`adminSelectProgramAwardWinner`, `awardWinPeriodByPrincipal`, entry `status = "selected"`) remains **separate** until a selection pass writes the sidecar.

### Entry / config / payments (implemented)

- `ProgramAwardEntry` + `programAwardPayloadById` sidecar (draw-form contact / website / bio).
- `ProgramDrawConfig` (`active`, `totalSlots`).
- `getProgramDrawProgressPublic` → `{ active, totalSlots, enteredCount, cycle }` — **`cycle` is currently always `1`**.
- Program payment ledger rows with `paymentType = "program_award_entry"` (id = PayPal order id); do **not** update residency deposit `totalPaid`.
- Consume map `awardPaidOrderConsumedByOrderId` (order id → entry id) after successful paid enter.

---

## 5. Frontend display (shipped)

[`app-program-draw-display`](../src/fusion-app-frontend/src/components/subComponents/program-draw-display.js):

| Feature | Status |
|---------|--------|
| CMS labels from `program-draw` | Done |
| Live progress: entered vs `totalSlots` | Done (`getProgramDrawProgressPublic`) |
| Empty Past recipients / cycle #1 empty-state | Done |
| Past recipients list joined to `getArtists()` | Done |
| Inactive → Get notified waitlist | Done (`program-draw-notify-modal.js`) |
| “View all recipients” | Thin: navigates to `/artists` (not a dedicated recipients page) |

### Entry form UX (shipped)

| State | UI |
|-------|-----|
| Award credit balance ≥ 1 | Credit callout + enter only (no pay / membership) |
| Member (`ok` / `exempt`), 0 credits | $50 one-time only |
| Guest / needs subscription | $50 + Explore memberships |
| Already entered | Applied panel + exit (no refund) |
| Formal application path | Blocked until Settings withdraw |

Paid path: create PayPal order (pending meta includes `payloadJson`) → confirm → `enterProgramAward` with that **order id** (Retry reuses `_lastPaidOrderId`). Credit path: empty order id.

---

## 6. Studio / ops

### Done

- Programs → Edit → Program Award (active / slots).
- Applicants → Award mode: entries table, Entered/Exited/Selected/Not status tabs, available/total slots, revenue = **paid entries × $50** (aligned with attested `paidEntry`).
- Manage Artist → Draw recipient checkbox (+ cycle #, award label).
- Manage Artist → Credits adjust + **Zero all Program Award balances**.
- Ops repair: `POST /payments/paypal/repair` with principal / programId / `payloadJson` when pending meta was lost.

### Still future

- Preview eligible pool size before run.
- Run / confirm draw → write entry statuses **and** `ArtistDrawRecipient`.
- Notifications (email) to winner and optionally entrants.
- Dedicated permissions for who can run draws.
- Real cycle counter (not hardcoded `1`).

---

## 7. Open questions

- Timing relative to “100 members” / cycle complete vs fixed calendar date.
- Public reveal animation or quiet list update.
- Multi-winner cycles.
- Interaction with refunds / paid entry if someone exits after payment (exit does not refund today).
- Whether Past recipients UI filters global vs per-program (`programId` on sidecar supports filtering).

---

## 8. Payment attestation (shipped)

Closes the old hole where Motoko trusted a client `paidEntryReceipt` boolean.

```
PayPal capture → confirm / webhook
  → integrationRecordProgramPayment (program_award_entry; ledger id = order id)
  → integrationEnterProgramAward when payloadJson is available
FE happy path → enterProgramAward(programId, paypalOrderId, …)
  → require unused succeeded ledger row (principal + program, amount ≥ $50)
  → mark order consumed; paidEntry = true
```

| Path | Behavior |
|------|----------|
| Credit | Empty `paypalOrderId` → consume 1 award credit; `paidEntry = false` |
| Paid (FE) | After confirm, enter with order id; Retry uses same id (idempotent) |
| Paid (safety net) | Confirm / webhook / repair enter via `integrationEnterProgramAward` if browser dies after capture |
| Ledger | Award rows skip deposit summary / confirmed-artist / payment-confirmation email side effects |

Still optional: PayPal webhook **signature** verification (`PAYPAL_WEBHOOK_ID`). Details also in [`PAYMENTS.md`](./PAYMENTS.md).

**Deploy note:** after Motoko changes, run `dfx generate` (or frontend `prebuild`) so client bindings match `enterProgramAward(…, paypalOrderId, …)`. Redeploy the integration API for the hand IDL + record/enter path.

---

## 9. Suggested next implementation order

1. Studio “Run draw” (or gift) UI wired to existing Motoko admin select/gift APIs.
2. After select: write `ArtistDrawRecipient` from linked artist id.
3. Cycle / audit record (seed, pool size, operator, timestamp); stop hardcoding `cycle: 1`.
4. Optional: PayPal webhook signature verification; dedicated Past recipients page; email notifications.

---

*Last updated: Paid-entry attestation shipped (ledger + order-id enter + webhook/repair). Remaining: Studio selection UI, sidecar auto-sync, real cycle counter.*
