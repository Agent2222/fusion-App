# fusion-integration-api

Express server for Stripe (subscriptions + legacy Payment Intents), Resend email, and S3 presigned PUT uploads. Used by the Fusion frontend / Studio; Stripe secret keys never ship to the browser.

## Membership subscriptions (join flow)

1. In **Stripe Dashboard**, create a **Product** and **Price** with recurring billing (e.g. **$50 USD every 2 months**). Copy the Price id (`price_…`).
2. Set `STRIPE_PRICE_ID` to that Price id.
3. Create a **dedicated** `dfx` identity for this server (PEM), fund it with cycles, deploy the backend, then call the canister **`adminSetIntegrationServicePrincipal`** with this identity’s **principal** (admin-only). The integration API uses the same identity to call **`integrationRecordStripeSubscription`**.
4. Set env:
   - `FUSION_BACKEND_CANISTER_ID` — e.g. `dfx canister id fusion-app-backend`
   - **`INTEGRATION_IC_IDENTITY_PEM`** — paste the full output of `dfx identity export integration-api` (PEM text, including `BEGIN`/`END` lines). Easiest for current `dfx`, which prints PEM, not JSON.
   - *Or* **`INTEGRATION_IC_IDENTITY_JSON`** — legacy `["hex","hex"]` array for `Ed25519KeyIdentity.fromParsedJson` — **keep either secret**
   - `IC_HOST` — e.g. `http://127.0.0.1:4943` locally or `https://ic0.app` for mainnet
5. Register the webhook URL in Stripe: `https://<your-api-host>/webhooks/stripe` with signing secret as `STRIPE_WEBHOOK_SECRET`.

Local webhook testing:

```bash
stripe listen --forward-to localhost:8787/webhooks/stripe
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | Default `8787` |
| `CORS_STRICT` | no | If `1` / `true`, use allowlist: `DEFAULT_CORS_ORIGINS` + `CORS_ORIGINS`. **Default (unset):** allow any browser origin (`Access-Control-Allow-Origin` reflects the request) so custom domains and IC URLs work without redeploying this service. POST routes still use `INTEGRATION_API_KEY` when set. |
| `CORS_ORIGINS` | no | With `CORS_STRICT`, comma-separated extra allowed origins (e.g. `https://….icp0.io`). Ignored when `CORS_STRICT` is unset. |
| `INTEGRATION_API_KEY` | no | If set, require `Authorization: Bearer <token>` on POST routes |
| `STRIPE_SECRET_KEY` | for Stripe | `sk_test_…` or `sk_live_…` |
| `STRIPE_PRICE_ID` | for subscriptions | Recurring Price id (`price_…`) for membership (bi-monthly; default tier) |
| `STRIPE_ANNUAL_PRICE_ID` | optional | Recurring Price id for **annual** tier when the client sends `subscriptionTier: "annual"` (e.g. program application). Example: `price_1TOO5UHMfdeKt5zM6b6dPmfr` |
| `STRIPE_WEBHOOK_SECRET` | for webhooks | `whsec_…` from Stripe Dashboard or `stripe listen` |
| `FUSION_BACKEND_CANISTER_ID` | to sync on-chain | fusion-app-backend canister id |
| `INTEGRATION_IC_IDENTITY_PEM` | to sync on-chain (preferred) | Full PEM from `dfx identity export <name>` |
| `INTEGRATION_IC_IDENTITY_JSON` | alternative | JSON `["…","…"]` for `fromParsedJson` if you use that format |
| `IC_HOST` | for canister calls | Replica URL (`http://127.0.0.1:4943` or `https://ic0.app`) |
| `RESEND_API_KEY` | for email | Resend API key |
| `RESEND_FROM` | for email | Verified sender, e.g. `Fusion <onboarding@resend.dev>` |
| `AWS_REGION` or `S3_REGION` | for S3 | Region |
| `S3_BUCKET` | for S3 | Bucket name |
| `AWS_ACCESS_KEY_ID` | for S3 on **Render / most hosts** | IAM user access key (`AKIA…`). Required unless the process can use another [default credential chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html) (e.g. local `~/.aws/credentials`). |
| `AWS_SECRET_ACCESS_KEY` | with access key above | IAM secret key |
| `AWS_SESSION_TOKEN` | optional | Only if using temporary credentials (STS) |
| `S3_PUBLIC_BASE_URL` | no | Public base for object URLs (default: virtual-hosted–style S3 URL) |
| `S3_KEY_PREFIX` | no | Prefix for keys (default `uploads/`) |

## Scripts

- `npm run dev` — run with `--watch`
- `npm start` — production

## Routes

- `GET /health` — status flags (no secrets); includes `stripePrice`, `fusionCanister`, `stripeWebhook`
- `POST /stripe/create-subscription` — body `{ principal?, email, metadata?, payFirst?, subscriptionTier? }` — `subscriptionTier` optional: `bimonthly` (default) or `annual` (uses `STRIPE_ANNUAL_PRICE_ID`). Creates/finds Customer, Subscription, returns `clientSecret` from the first invoice PaymentIntent
- `POST /stripe/subscription-status-by-email` — body `{ email }` — looks up Stripe customer by email, returns best subscription + `membershipActive` (`true` when status is `active` or `trialing`). Studio “Manage user” live check (API key required)
- `POST /stripe/create-payment-intent` — body `{ amount, currency?, metadata? }` (Studio tests / legacy)
- `POST /webhooks/stripe` — **raw** JSON body; Stripe signature via `STRIPE_WEBHOOK_SECRET`
- `POST /email/send` — body `{ to, subject, html | text, replyTo?, from? }` — optional `from` overrides `RESEND_FROM` when set (must be a verified sender in Resend)
- `POST /storage/presign` — body `{ key, contentType }`
