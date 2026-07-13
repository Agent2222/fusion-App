# Admin account reconnect (Phase 1)

Support runbook for members who paid and completed profile setup but now see **“No member account found”** on **Settings → Profile** after signing in with Internet Identity (II).

Self-serve **recovery codes** (Phase 1.5) let members reconnect without admin pasting principals. Admins can still use **Studio → Users → Manage account → Reconnect Internet Identity** directly.

## Self-serve recovery code (Phase 1.5)

### Admin (Studio)

1. Open **Studio → Users** → **Manage account** on the member’s paid row (source principal).
2. In **Reconnect Internet Identity**, click **Generate recovery code**.
3. Copy the **8-digit code** and expiry; share securely with the member (email/DM).
4. **Rules:** one active code per account; **7-day expiry**; **single-use**; generating a new code invalidates the previous one.

Canister: `adminGenerateAccountRecoveryCode(fromPrincipal)` (admin caller).

### Member (Settings → Profile)

When signed in but **no member account** is linked:

1. Tap **Recover account** below the notice.
2. Enter the **8-digit recovery code** from support.
3. Tap **Recover** — account migrates to this Internet Identity; Stripe/PayPal refresh when integration API is configured.
4. Profile loads after reload.

Canister: `redeemAccountRecoveryCode(code)` (authenticated caller, no account row yet).

### When to use code vs admin reconnect

| Situation | Use |
|-----------|-----|
| Member has new II, can sign in, support can share a code | **Generate recovery code** |
| Admin knows both old and new principals | **Reconnect account** (admin) |
| Same principal, missing account row only | Push subscription / create row — **no migration** |

- Fusion member accounts on the canister are keyed by the member’s **Internet Identity principal** (not email).
- Auto-created member artist ids use the format **`m-{principal}`** (for example `m-p33kj-dlbip-…`). That prefix is **not** a separate login — it is derived from the same principal when `ensureMyLinkedArtistProfile` runs.
- Stripe/PayPal subscriptions store `metadata.principal` / `custom_id.principal` pointing at the principal used at checkout.

## Symptoms

Member is **authenticated** but:

- Settings → Profile shows no account / profile form hidden
- `getAccountForCaller()` returns null
- `ensureMyLinkedArtistProfile()` returns `noAccount`

Common causes:

1. **Missing account row** on the current principal (payment synced to email but no on-chain account was created).
2. **Different II principal** than at checkout (new anchor, lost old II, wrong browser profile).

## What to collect from the member

1. **Checkout email** (Stripe/PayPal receipt).
2. **Current Internet Identity ID** — Settings → Profile shows **User ID** above the no-account notice (or in the sidebar above Overview when the profile loads normally).
3. Whether they believe they used a **different** II before (optional but helpful).

## Studio workflow (after Phase 1 deploy)

1. Open **Studio → Users** and search contacts by **checkout email**.
2. Open **Manage account** on the row that matches the paid membership (note **source principal** and **linkedArtistId**).
3. In **Reconnect Internet Identity**:
   - Paste the member’s **new principal** into **New principal**.
   - Use **Lookup by email** (uses Live Stripe email field) to confirm active Stripe/PayPal subscription and compare **Stripe metadata.principal** to the source row.
   - **Preview reconnect** — must show `canProceed: true` (source has account, target has no account).
   - **Reconnect account** — suspends the old principal row, copies membership + contact + `linkedArtistId` to the new principal, then syncs Stripe (and PayPal if sub id is on the row).
4. Ask the member to **sign out**, sign in with the **new** II, and reload **Settings → Profile**.

Integration API routes (require `INTEGRATION_API_KEY`):

| Route | Purpose |
|-------|---------|
| `POST /account/lookup-by-email` | Stripe sub + principal hint; optional PayPal when `paypalSubscriptionId` sent |
| `POST /account/reconnect/preview` | Validate from/to principals before migrate |
| `POST /account/reconnect/complete` | Canister migrate + provider sync |

Canister methods (after backend deploy + `dfx generate`):

- `adminReconnectMemberPrincipal(from, to)` — admin caller
- `integrationReconnectMemberPrincipal(from, to)` — integration service PEM
- `adminGenerateAccountRecoveryCode(fromPrincipal)` — admin; returns 8-digit code + expiry
- `redeemAccountRecoveryCode(code)` — member caller; migrates source account to current II

## Manual fix before / without Studio reconnect UI

### A. Same principal — account row missing

If Stripe metadata.principal and the member’s current II **match**, but there is no account row:

1. Studio → Users → find or create the account on that principal (`adminUpsertUserAccount` path via Manage).
2. **Push subscription to canister** (email sync) with the checkout email.
3. Confirm `linkedArtistId` is set (often `m-{principal}` or an existing roster id).

### B. Different principal — true II change

If the paid account lives on **principal A** and the member now uses **principal B**:

1. Note `linkedArtistId`, membership fields, and contact from row A.
2. After deploy: use **Reconnect Internet Identity** (A → B).
3. Until deploy: manually copy fields to a new row on B via Studio, **Push subscription** with email targeting B, then suspend row A and clear its `linkedArtistId` (avoid double-link).

## Example: reported `p33kj` case

Member current II:

`p33kj-dlbip-oypf3-qwuiv-nj2dp-zsxyt-g6i2a-ogsiz-gkfln-e5x4d-nqe`

Artist id they referenced:

`m-p33kj-dlbip-oypf3-qwuiv-nj2dp-zsxyt-g6i2a-ogsiz-gkfln-e5x4d-nqe`

**Interpretation:** The `m-` id is the auto format for that same principal — not proof of a second II. Diagnose:

| Finding | Action |
|---------|--------|
| Stripe row + canister account on `p33kj-…`, but member sees no account | Likely missing/broken account row or frontend cache — refresh canister row, push subscription, verify `linkedArtistId`. |
| Canister account + artist on **different** principal; Stripe email matches member | **Reconnect** from old principal → `p33kj-…`. |
| No canister row for checkout email; Stripe active | Create account on correct principal, then email sync. |

Always compare **checkout email** in Studio, **Stripe metadata.principal**, and the member’s **current II ID** before migrating.

## Member support script

> You’re signed in, but this Internet Identity isn’t linked to your Fusion member account yet. If we sent you a recovery code, open Settings → Profile, tap **Recover account**, and enter the 8-digit code. Otherwise reply with your **checkout email** and copy **User ID** from Settings → Profile. We’ll reconnect your membership — you do not need to pay again.

## Deploy checklist

1. Deploy **fusion-app-backend** with reconnect + recovery code methods.
2. Run **`dfx generate fusion-app-backend`** (or frontend `prebuild`) so Studio bindings include the new methods.
3. Redeploy **fusion-integration-api** with account reconnect routes and updated IDL.
4. Confirm `adminSetIntegrationServicePrincipal` matches the integration PEM.
5. Rebuild and deploy the frontend asset canister.

## Phase 2 (deferred)

- Email OTP verification (Resend) instead of admin-issued codes
- PayPal sync-by-email without subscription id
