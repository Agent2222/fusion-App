# fusion-integration-api

Express server for Stripe (subscriptions + legacy Payment Intents), Resend email, and S3/R2 presigned PUT uploads. Used by the Fusion frontend / Studio; Stripe secret keys never ship to the browser.

Upload presigns use **AWS S3** or **Cloudflare R2** depending on `STORAGE_BACKEND` (default `aws`). Both backends can be configured at once; switching is an env change + redeploy. See [MIGRATE_AWS_S3_TO_CLOUDFLARE_R2.md](../docs/MIGRATE_AWS_S3_TO_CLOUDFLARE_R2.md).

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
| `STRIPE_PRICE_ID` | for subscriptions | Legacy Stripe recurring Price id (`price_…`) when Stripe provider is selected |
| `STRIPE_ANNUAL_PRICE_ID` | optional | Legacy Stripe annual Price id |
| `PAYPAL_SUBSCRIPTION_MONTHLY_ID` | PayPal memberships | Monthly plan id ($30) for join / Settings |
| `PAYPAL_SUBSCRIPTION_MONTHLY_APPLICATION_ID` | PayPal application | Monthly + application add-on plan for program apply checkout |
| `PAYPAL_SUBSCRIPTION_QUARTERLY_ID` | PayPal memberships | Quarterly plan id ($75) |
| `PAYPAL_SUBSCRIPTION_ANNUAL_ID` | PayPal memberships | Annual plan id ($260); falls back to `PAYPAL_PLAN_ANNUAL_ID` |
| `PAYPAL_PLAN_BIMONTHLY_ID` | legacy detection | Old bi-monthly plan id (Settings / revise detection only) |
| `PAYPAL_PLAN_ANNUAL_ID` | optional fallback | Annual plan id if `PAYPAL_SUBSCRIPTION_ANNUAL_ID` unset |
| `STRIPE_WEBHOOK_SECRET` | for webhooks | `whsec_…` from Stripe Dashboard or `stripe listen` |
| `FUSION_BACKEND_CANISTER_ID` | to sync on-chain | fusion-app-backend canister id |
| `INTEGRATION_IC_IDENTITY_PEM` | to sync on-chain (preferred) | Full PEM from `dfx identity export <name>` |
| `INTEGRATION_IC_IDENTITY_JSON` | alternative | JSON `["…","…"]` for `fromParsedJson` if you use that format |
| `IC_HOST` | for canister calls | Replica URL (`http://127.0.0.1:4943` or `https://ic0.app`) |
| `RESEND_API_KEY` | for email | Resend API key |
| `RESEND_FROM` | for email | Verified sender, e.g. `Fusion <onboarding@resend.dev>` |
| `RESEND_BROADCAST_SEGMENT_ID` | no | If set, returned by `GET /resend/sender` as `segmentId` for Studio “All subscribers (broadcast)” defaults. |
| `STORAGE_BACKEND` | no | `aws` (default) or `r2` — which backend `/storage/*` presign routes use |
| `AWS_REGION` or `S3_REGION` | for AWS backend | Region |
| `S3_BUCKET` | for AWS backend | Bucket name |
| `AWS_ACCESS_KEY_ID` | for AWS on **Render / most hosts** | IAM user access key (`AKIA…`). Required unless the process can use another [default credential chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html) (e.g. local `~/.aws/credentials`). |
| `AWS_SECRET_ACCESS_KEY` | with access key above | IAM secret key |
| `AWS_SESSION_TOKEN` | optional | Only if using temporary credentials (STS) |
| `S3_PUBLIC_BASE_URL` | no | Public base for object URLs (default: virtual-hosted–style S3 URL). Frontend maps upload URLs to **`https://cdn.fusionart.world/uploads/…`** regardless of this value. |
| `R2_BUCKET` | for R2 backend | Bucket name (default **`fusion-app`**) |
| `R2_ACCESS_KEY_ID` | for R2 on Render | R2 API token access key id |
| `R2_SECRET_ACCESS_KEY` | for R2 on Render | R2 API token secret |
| `R2_ENDPOINT` | for R2 backend | e.g. `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_ACCOUNT_ID` | optional | If `R2_ENDPOINT` unset, endpoint is built from this |
| `R2_PUBLIC_BASE_URL` | no | Public CDN base for presign `publicUrl` (default: `S3_PUBLIC_BASE_URL` or `https://cdn.fusionart.world`) |
| `S3_KEY_PREFIX` | no | Object key prefix prepended by `/storage/presign` (code default **`uploads/`**; production often uses **`fusionMedia/uploads/`**). IAM/R2 token should allow writes on the matching prefix. Public CDN paths always use `/uploads/…` on `cdn.fusionart.world`, even when objects live under `fusionMedia/uploads/…` in the bucket. |
| `S3_FUSION_MEDIA_PUBLIC_PREFIX` | no | Prefix for community public media (default `fusionMedia/uploads/`) |
| `S3_PRIVATE_VIDEO_PREFIX` | no | Prefix for gated private video (default `fusionMedia/private-video/`) |
| `FUSION_SIGNATURE_LOGO_URL` | no | If set, integration server rewrites `https://…/email/Fusion-X-logo-02.png` (and legacy `Fusion-Logo-Sig-1.png`) in HTML email bodies to this URL (e.g. CDN) for test/batch send |
| `LINE_CHANNEL_SECRET` | for LINE webhook | Channel secret — HMAC for `x-line-signature`. Never store on the canister. |
| `LINE_CHANNEL_ACCESS_TOKEN` | for LINE push | Long-lived **channel access token** (Messaging API → Issue), not the numeric Channel ID. |
| `LINE_ADMIN_USER_ID` | for Schedule announce test | LINE user ID of the bot admin (1:1 Flex test send). Engineers only — never show in Studio. |
| `FUSION_PUBLIC_SITE_ORIGIN` | optional | Public site origin for Schedule RSVP links (default `https://www.fusionart.world`). |

## Scripts

- `npm run dev` — run with `--watch`
- `npm start` — production
- `npm test` — LINE webhook signature / event parse, push helpers, Schedule Flex announce, scheduled-task tick

## Routes

- `GET /health` — status flags (no secrets); includes `stripePrice`, `fusionCanister`, `line`, `stripeWebhook`, `storageBackend`, nested `storage: { active, aws, r2 }`, and legacy `s3` (active backend configured)
- `POST /webhooks/line` — LINE Messaging API webhook (raw JSON, `x-line-signature`); records seen group ids on the canister. URL: `https://<your-api-host>/webhooks/line`
- `POST /line/push` — body `{ programId, room: "general" | "announce", text }` — push text to the bound LINE group (API key required)
- `POST /line/announce-schedule` — body `{ programId, test, mode?: "day" | "event", programName?, date?, events: [{ id, title, date, startTime, endTime, allDay, timezone, locationName, imageUrl, acceptRsvp }] }` — push Flex to the Announcements chat (`test: false`) or `LINE_ADMIN_USER_ID` (`test: true`). API key required. Cap 24 events.
- `GET /scheduled-tasks/health` — `{ ok, dueEstimate, enabled }` for Studio (API key required)
- `POST /scheduled-tasks/tick` — process due Studio scheduled tasks (host scheduler; API key required)
- `POST /scheduled-tasks/run` — body `{ taskId }` — send one scheduled task now (API key required)

### Host scheduler (engineers)

Create a Render Cron Job (or equivalent) every 5 minutes:

```
POST https://fusion-app-sycs.onrender.com/scheduled-tasks/tick
Authorization: Bearer <INTEGRATION_API_KEY>
```

Staff manage tasks in Studio → Operations → Scheduled Tasks. Do not expose this URL in the Studio UI.
- `GET /payments/config` — PayPal mode + `planMonthly` / `planQuarterly` / `planAnnual` / `planBimonthlyLegacy`
- `POST /payments/subscription` — PayPal membership create (`subscriptionTier`: `monthly` | `quarterly` | `annual`)
- `POST /payments/subscription/link` — bind pay-first subscription to principal after II
- `POST /payments/subscription/sync` — push PayPal subscription + inferred tier to canister (body `{ principal, subscriptionId }`)
- `POST /payments/subscription/status` — Studio Live PayPal check (body `{ subscriptionId }`) — returns `status`, `tier` (`monthly`|`quarterly`|`annual`), `planId`, `subscriberEmail`; **no canister write**. Tier inference needs `PAYPAL_SUBSCRIPTION_MONTHLY_ID` / `_QUARTERLY_ID` / `_ANNUAL_ID` (or `PAYPAL_PLAN_ANNUAL_ID`) on the integration host. There is no PayPal list-by-email — staff paste `I-…` from the Business dashboard.
- `POST /payments/subscription/revise` — PayPal plan change (returns `approveUrl` for buyer re-consent)
- `POST /payments/member-billing-summary` — PayPal tier labels for Settings Membership
- `POST /payments/one-time/confirm` — capture PayPal order; for `program_award_entry`, sends applicant Program Draw payment receipt (CC `info@fusionart.world`) once per pending ref (`awardPaymentEmailSent`); guest may return `awaitingPrincipal: true` before ledger
- `POST /payments/paypal/repair` — re-resolve completed order + record; same award email dedupe when first capture is repaired
- `POST /webhooks/paypal` — PayPal events; `PAYMENT.CAPTURE.COMPLETED` for award entries emails on first capture (same dedupe) even when ledger awaits principal
- `POST /stripe/create-subscription` — body `{ principal?, email, metadata?, payFirst?, subscriptionTier? }` — legacy Stripe path when provider is Stripe
- `POST /stripe/subscription-status-by-email` — body `{ email }` — looks up Stripe customer by email, returns best subscription + `membershipActive` (`true` when status is `active` or `trialing`). Studio “Manage user” live Stripe check (API key required)
- `POST /stripe/membership-revenue-summary` — no body — aggregates active/trialing Fusion membership subscriptions from Stripe into `mrrCents`, per-cadence cycle totals (`monthlyCents`, `bimonthlyCents`, `annualCents`), and subscriber counts. Studio Finance → Users (API key required)
- `POST /stripe/sync-subscription-by-email` — body `{ email, principal }` — finds customer by email, pushes best subscription to the canister with `metadata.principal` (Studio after email check; API key required)
- `POST /account/lookup-by-email` — body `{ email, paypalSubscriptionId? }` — Stripe subscription + principal hint from metadata; optional PayPal sub when id provided (Studio reconnect lookup; API key required)
- `POST /account/reconnect/preview` — body `{ email?, fromPrincipal, toPrincipal }` — validates source/target canister rows + Stripe membership before migrate (API key required)
- `POST /account/reconnect/complete` — body `{ fromPrincipal, toPrincipal, email?, paypalSubscriptionId? }` — calls canister `integrationReconnectMemberPrincipal`, then Stripe sync-by-email + optional PayPal sync to new principal (API key required)
- `POST /stripe/create-payment-intent` — body `{ amount, currency?, metadata? }` (Studio tests / legacy)
- `POST /webhooks/stripe` — **raw** JSON body; Stripe signature via `STRIPE_WEBHOOK_SECRET`
- `POST /email/send` — body `{ to, subject, html | text, replyTo?, from?, cc? }` — optional `from` overrides `RESEND_FROM` when set (must be a verified sender in Resend). `cc` is a string or string[]; server always merges `info@fusionart.world`.
- `POST /email/batch` — body `{ messages: [{ to, subject, html? | text? }], from?, replyTo?, cc? }` — Resend batch send, chunked to ≤100 per call with a short delay between chunks. Same `cc` rules as `/email/send`. Returns `{ ok, okCount, failCount, results, cc }`.
- `GET /resend/sender` — `from` (same as `RESEND_FROM`) and optional `segmentId` (from `RESEND_BROADCAST_SEGMENT_ID`) for Studio email campaigns
- `GET /resend/templates` — list templates (Resend REST, API key on server)
- `POST /resend/templates` — create template
- `GET /resend/templates/:id` — get template
- `GET /resend/segments` — list segments
- `POST /resend/segments` — create segment
- `POST /resend/contacts` — create contact
- `POST /resend/contacts/segment` — add contact to segment (body must include `segmentId` or `segment_id`, forwarded to `POST /segments/{id}/contacts` on Resend; path may require adjustment for your Resend API version)
- `POST /resend/broadcasts` — body `{ segmentId, subject, html, name?, text?, from?, send? }` — uses Node Resend SDK `broadcasts.create` when available
- `POST /resend/broadcasts/:id/send` — send a draft broadcast
- `POST /storage/presign` — body `{ key, contentType }` — single presigned PUT (files ≤ ~100 MB recommended)
- `POST /storage/multipart/init` — body `{ key, contentType, fileSize, rootPrefix? }` → `{ uploadId, key, partSize, partCount }`
- `POST /storage/multipart/presign-part` — body `{ key, uploadId, partNumber }` → `{ putUrl }`
- `POST /storage/multipart/complete` — body `{ key, uploadId, parts: [{ partNumber, etag }] }` → `{ key, publicUrl }`
- `POST /storage/multipart/abort` — body `{ key, uploadId }` — cancel in-flight multipart upload
- `POST /storage/private-video/presign-upload` — body `{ contentId, fileName, contentType }` — single PUT for small private full videos
- `POST /storage/private-video/multipart/init` — same shape as public multipart init (private key prefix)
- `POST /storage/private-video/multipart/presign-part` / `complete` / `abort` — mirror public multipart routes for gated full videos

**Multipart env (optional):**

| Variable | Default | Description |
|----------|---------|-------------|
| `MULTIPART_THRESHOLD_BYTES` | `104857600` (100 MB) | Frontend uses multipart above this size |
| `MULTIPART_PART_SIZE_BYTES` | `10485760` (10 MB) | Part size (≥ 5 MiB for R2/S3) |

Works on both **AWS S3** and **Cloudflare R2** via the same `@aws-sdk/client-s3` backend selected by `STORAGE_BACKEND`.
