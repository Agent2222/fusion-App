# Deploy Fusion: Render (integration API) + Internet Computer (app)

This guide walks you through shipping with **[Render](https://render.com)** hosting the Node **`fusion-integration-api`** and your usual **ICP** deploy for the frontend asset canister + Motoko backend.

---

## What you are deploying

| Piece | Where | Role |
|--------|--------|------|
| **`services/fusion-integration-api`** | Render (Web Service) | Stripe Payment Intents, Resend email, S3/R2 presign URLs |
| **Frontend + assets** | ICP asset canister | Vite app; calls the Render API via `VITE_INTEGRATION_API_URL` |
| **Motoko canister** | ICP | Subscribers, Studio data, etc. (unchanged) |

Secrets (**Stripe secret**, **Resend key**, **AWS keys**) stay **only** on Render as environment variables—never in the repo or the canister.

---

## Prerequisites

- **Git** remote (e.g. GitHub or GitLab): push the **whole `fusion-app` repo**, not only `services/`. Render clones the full repository; **Root Directory** `services/fusion-integration-api` limits the build to that folder. A separate repo containing only the integration API is optional, not required.
- **Stripe** test keys (`pk_test_…`, `sk_test_…`) for a first safe deploy
- **Resend** API key + a verified **from** address (`RESEND_FROM`)
- **AWS** IAM user/role with `s3:PutObject` on your bucket prefix (primary storage when `STORAGE_BACKEND=aws`)
- **Cloudflare R2** API token with write access (failover / active when `STORAGE_BACKEND=r2`) — see [MIGRATE_AWS_S3_TO_CLOUDFLARE_R2.md](MIGRATE_AWS_S3_TO_CLOUDFLARE_R2.md)
- **ICP**: `dfx` identity and wallet cycles for deploy (your normal flow)

---

## Part 1 — Deploy the integration API on Render

### 1.1 Create a Web Service

1. In Render: **New → Web Service**
2. Connect this repository
3. Configure:

| Setting | Value |
|--------|--------|
| **Root Directory** | `services/fusion-integration-api` |
| **Runtime** | Node (use an LTS version, e.g. 20) |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

The app listens on **`process.env.PORT`** (Render sets this automatically). Local default `8787` is not used in production.

### 1.2 Environment variables (Render → Environment)

Set at least the following. Use **your real values**; do not commit them.

| Variable | Required for | Notes |
|----------|----------------|--------|
| `STRIPE_SECRET_KEY` | Payments | `sk_test_…` or `sk_live_…` |
| `RESEND_API_KEY` | Email | From Resend dashboard |
| `RESEND_FROM` | Email | e.g. `Fusion <onboarding@resend.dev>` or your verified domain |
| `AWS_REGION` | AWS presign | e.g. `us-east-2` |
| `S3_BUCKET` | AWS presign | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | AWS on Render | IAM user access key — **required** on hosts without an IAM instance role |
| `AWS_SECRET_ACCESS_KEY` | AWS on Render | IAM secret for the same user |
| `S3_PUBLIC_BASE_URL` | Optional | Public URL base for objects (CloudFront or `https://bucket.s3.region.amazonaws.com`). The frontend rewrites stored media to **`https://cdn.fusionart.world/uploads/…`**. |
| `STORAGE_BACKEND` | Optional | `aws` (default) or `r2` — active upload backend. Set `r2` while CloudFront is down; flip back to `aws` after failback. |
| `R2_BUCKET` | R2 presign | R2 bucket name (default **`fusion-app`**) |
| `R2_ACCESS_KEY_ID` | R2 on Render | R2 API token access key id |
| `R2_SECRET_ACCESS_KEY` | R2 on Render | R2 API token secret |
| `R2_ENDPOINT` | R2 presign | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_ACCOUNT_ID` | Optional | Alternative to full `R2_ENDPOINT` |
| `R2_PUBLIC_BASE_URL` | Optional | Usually `https://cdn.fusionart.world` (same hostname as S3 CDN) |
| `S3_KEY_PREFIX` | Optional | Object key prefix for `/storage/presign` (code default **`uploads/`**; production often **`fusionMedia/uploads/`**). Allow writes on `arn:aws:s3:::YOUR_BUCKET/<prefix>*` (AWS) or equivalent R2 token scope. CDN URLs always use `/uploads/…` on `cdn.fusionart.world`, even when bucket keys include `fusionMedia/uploads/`. |
| `CORS_STRICT` | Optional | Set to `1` only if you want an allowlist (`CORS_ORIGINS` + built-in Fusion origins). **Leave unset** so browsers on `fusionart.world`, `*.icp0.io`, etc. always get valid CORS without redeploying the API. |
| `CORS_ORIGINS` | With `CORS_STRICT` | Extra allowed origins, e.g. `https://<canister>.icp0.io` (no trailing slash) |
| `INTEGRATION_API_KEY` | Optional hardening | Random secret; if set, frontend must send `Authorization: Bearer …` on POST routes |

**CORS (default)**  
The integration API **reflects the request `Origin`** for CORS unless `CORS_STRICT=1`. That avoids “No `Access-Control-Allow-Origin`” when you add a custom domain or new IC URL. Protect sensitive actions with `INTEGRATION_API_KEY` on POST routes, not by hiding CORS from unknown origins on GET `/health`.

**R2 while AWS is down (recommended Render env)**

Keep AWS vars for future failback; set active backend to R2:

```bash
STORAGE_BACKEND=r2
R2_BUCKET=fusion-app
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://cdn.fusionart.world
S3_PUBLIC_BASE_URL=https://cdn.fusionart.world
# AWS_* vars unchanged — used when STORAGE_BACKEND=aws after failback
```

After deploy, `GET /health` should show `"storageBackend": "r2"` and `"storage": { "active": "configured", "r2": "configured", ... }`.

### 1.3 Health check (optional but useful)

Render can ping **`GET /health`**. Path: `/health`  
The service returns JSON with `ok` and which integrations are configured (no secrets).

### 1.4 Deploy and copy the URL

After the first successful deploy, note the **public URL**, e.g.:

`https://fusion-integration-api.onrender.com`

You will use this as **`VITE_INTEGRATION_API_URL`** (no trailing slash).

**Free tier:** Render free web services **spin down** after idle time; the first request can be slow. For production, consider a paid instance so the API stays warm.

---

## Part 2 — Point the frontend at Render

### 2.1 Production environment variables (Vite)

Before building the frontend for ICP, set:

| Variable | Example |
|----------|---------|
| `VITE_INTEGRATION_API_URL` | `https://fusion-integration-api.onrender.com` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` (match test/live with secret on Render) |
| `VITE_INTEGRATION_API_KEY` | Same value as Render’s `INTEGRATION_API_KEY` **only if** you enabled it |

Put these in a **root** `.env` file (or your CI secrets) that Vite loads when you run `npm run build` in `src/fusion-app-frontend`. See [README.md](../README.md) Integration API section.

### 2.2 Build

From the repo root (or frontend workspace), run your normal production build, e.g.:

```bash
cd src/fusion-app-frontend
npm run build
```

Resolve any `dfx generate` / `prebuild` steps your project expects.

### 2.3 Studio Services (optional)

Operators can also set the integration URL in **Studio → Services** (stored in `localStorage`). For production, **prefer build-time `VITE_INTEGRATION_API_URL`** so every user gets the correct API without manual steps.

---

## Part 3 — Deploy to the Internet Computer

Use your existing process, for example:

```bash
dfx deploy --network ic
```

(or your CI pipeline)

Ensure the **asset canister** serves the **new** `dist` output from the build above.

---

## Part 4 — Smoke tests (before you call it “shipped”)

1. **Render:** Open `https://<your-render-host>/health` in a browser—expect JSON with `"ok": true`.
2. **IC site:** Open your live URL (incognito).
3. **Studio → Services:** Set base URL to your Render URL if needed → **Test connection**.
4. **Join flow:** Complete a **test** card payment (Stripe test mode).
5. **Email:** **Send test email** from Services (Resend configured on Render).
6. **Uploads:** Upload from Studio (bucket **CORS** must allow `PUT` from the **exact** browser `Origin` — see below). With R2, presigned PUT goes to `*.r2.cloudflarestorage.com` (allowed in frontend CSP after asset canister redeploy).

If the browser shows CORS errors against **Render**, fix **`CORS_ORIGINS`** on Render to match the **exact** page origin (scheme + host, no path).

### Object storage CORS (browser uploads)

S3 and R2 compare `AllowedOrigins` to the **`Origin` header** exactly: **no path, no trailing slash** after the port. Wrong: `http://canister.localhost:4943/` — correct: `http://canister.localhost:4943`.

Add every origin you use, for example:

- `https://fusionart.world` and `https://www.fusionart.world` (production)
- `https://<asset-canister-id>.icp0.io` (mainnet IC)
- `http://<asset-canister-id>.localhost:4943` (local `dfx` — copy from the browser address bar, then **strip any trailing `/`**)
- `http://localhost:3000` (Vite dev, if you test uploads there)

**AWS S3** — bucket CORS in AWS console. **Cloudflare R2** — bucket **`fusion-app`** → CORS policy in Cloudflare dashboard (same origin list). See [MIGRATE_AWS_S3_TO_CLOUDFLARE_R2.md](MIGRATE_AWS_S3_TO_CLOUDFLARE_R2.md) Step 3.

Example rule (adjust origins):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": [
      "https://fusionart.world",
      "https://www.fusionart.world",
      "http://YOUR_ASSET_CANISTER_ID.localhost:4943",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

After saving the bucket CORS config in AWS, wait a minute and retry (or new presigned URL).

If POSTs return **401**, either remove `INTEGRATION_API_KEY` on Render for testing or set **`VITE_INTEGRATION_API_KEY`** and Studio bearer to the same value.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| CORS error | `CORS_ORIGINS` includes your site’s origin exactly |
| `Integration API URL not configured` | `VITE_INTEGRATION_API_URL` was set at **build** time; rebuild and redeploy assets |
| Stripe “not configured” | `STRIPE_SECRET_KEY` on Render |
| Email “RESEND_FROM” / 503 | `RESEND_FROM` + `RESEND_API_KEY` on Render |
| S3/R2 presign 503 / “Could not load credentials” | With `STORAGE_BACKEND=aws`: set **`AWS_ACCESS_KEY_ID`** + **`AWS_SECRET_ACCESS_KEY`**. With `STORAGE_BACKEND=r2`: set **`R2_ACCESS_KEY_ID`** + **`R2_SECRET_ACCESS_KEY`** + **`R2_ENDPOINT`** (or `R2_ACCOUNT_ID`). |
| S3/R2 PUT blocked by CORS / preflight | Bucket **CORS** `AllowedOrigins` must match **`Origin` exactly** (no trailing `/`). Include IC canister origins. Use `"AllowedHeaders": ["*"]` if preflight still fails. |
| CSP blocks upload PUT | Rebuild + redeploy asset canister so `.ic-assets.json5` includes `https://*.r2.cloudflarestorage.com` in `connect-src`. |
| Cold start / timeout | Render free tier sleep—upgrade or retry |

---

## Videos page rollout (checklist)

After Motoko changes to `CommunityVideoRecord` / featured config:

1. **`dfx generate fusion-app-backend`** (or frontend `npm run build` which runs prebuild generate)
2. **`dfx deploy fusion-app-backend`** (or your CI pipeline)
3. Deploy **Integration API** with multipart routes **before** large Studio uploads in production
4. Rebuild + deploy **asset canister** (`npm run build` in frontend workspace)
5. Smoke test:
   - Nav: Editions → Community → **Videos** → Journal → Context
   - Public **`/videos`**: grid + hero swap; member full-video playback
   - **`/community`**: featured row from canister; **View all** → `/videos`
   - **Studio → Videos**: small preview (single PUT + progress), large full video (>100 MB multipart + cancel)
   - **Frame capture** from local file and CDN preview URL
   - Set featured rail + hero; verify on `/community`

PostHog events: `videos_page_data_loaded`, `studio_video_upload_*`, `studio_featured_updated` (see `videosPosthog.js`).

---

## Reference

- R2 migration / failover: [MIGRATE_AWS_S3_TO_CLOUDFLARE_R2.md](MIGRATE_AWS_S3_TO_CLOUDFLARE_R2.md)
- Package env reference: [services/fusion-integration-api/README.md](../services/fusion-integration-api/README.md)
- Root README (Vite vars): [README.md](../README.md)
