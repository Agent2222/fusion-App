# Admin account reconnect (Phase 1)

Support runbook for members who paid and completed profile setup but now see **“No member account found”** on **Settings → Profile** after signing in with Internet Identity (II).

Self-serve email recovery is **not** in Phase 1. Admins use **Studio → Users → Manage account → Reconnect Internet Identity**.

## How accounts are keyed

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
2. **Current Internet Identity ID** — Settings → Profile shows **Copy ID** when no account is linked; or Studio can read the principal from a test sign-in.
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

> You’re signed in, but this Internet Identity isn’t linked to your Fusion member account yet. Please reply with the **email used at checkout** and tap **Copy ID** on Settings → Profile (or paste your Internet Identity ID). We’ll reconnect your membership and artist profile to this login. You do not need to pay again.

## Deploy checklist

1. Deploy **fusion-app-backend** with `adminReconnectMemberPrincipal` / `integrationReconnectMemberPrincipal`.
2. Run **`dfx generate fusion-app-backend`** (or frontend `prebuild`) so Studio bindings include the new methods.
3. Redeploy **fusion-integration-api** with account reconnect routes and updated IDL.
4. Confirm `adminSetIntegrationServicePrincipal` matches the integration PEM.
5. Rebuild and deploy the frontend asset canister.

## Phase 2 (deferred)

- Public reconnect wizard on Settings → Profile
- Email OTP verification (Resend)
- PayPal sync-by-email without subscription id
