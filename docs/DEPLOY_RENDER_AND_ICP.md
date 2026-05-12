# Deploy Fusion: Render (integration API) + Internet Computer (app)

This guide walks you through shipping with **[Render](https://render.com)** hosting the Node **`fusion-integration-api`** and your usual **ICP** deploy for the frontend asset canister + Motoko backend.

---

## What you are deploying

| Piece | Where | Role |
|--------|--------|------|
| **`services/fusion-integration-api`** | Render (Web Service) | Stripe Payment Intents, Resend email, S3 presign URLs |
| **Frontend + assets** | ICP asset canister | Vite app; calls the Render API via `VITE_INTEGRATION_API_URL` |
| **Motoko canister** | ICP | Subscribers, Studio data, etc. (unchanged) |

Secrets (**Stripe secret**, **Resend key**, **AWS keys**) stay **only** on Render as environment variables—never in the repo or the canister.

---

## Prerequisites

- **Git** remote (e.g. GitHub or GitLab): push the **whole `fusion-app` repo**, not only `services/`. Render clones the full repository; **Root Directory** `services/fusion-integration-api` limits the build to that folder. A separate repo containing only the integration API is optional, not required.
- **Stripe** test keys (`pk_test_…`, `sk_test_…`) for a first safe deploy
- **Resend** API key + a verified **from** address (`RESEND_FROM`)
- **AWS** IAM user/role with `s3:PutObject` on your bucket prefix (only if you need uploads today)
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
| `AWS_REGION` | S3 presign | e.g. `us-east-1` |
| `S3_BUCKET` | S3 presign | Bucket name |
| `AWS_ACCESS_KEY_ID` | S3 on Render | IAM user access key — **required** on hosts without an IAM instance role |
| `AWS_SECRET_ACCESS_KEY` | S3 on Render | IAM secret for the same user |
| `S3_PUBLIC_BASE_URL` | Optional | Public URL base for objects (CloudFront or `https://bucket.s3.region.amazonaws.com`) |
| `S3_KEY_PREFIX` | Optional | Object key prefix (default **`fusionMedia/uploads/`**). IAM should allow `s3:PutObject` on `arn:aws:s3:::YOUR_BUCKET/fusionMedia/uploads/*`. |
| `CORS_STRICT` | Optional | Set to `1` only if you want an allowlist (`CORS_ORIGINS` + built-in Fusion origins). **Leave unset** so browsers on `fusionart.world`, `*.icp0.io`, etc. always get valid CORS without redeploying the API. |
| `CORS_ORIGINS` | With `CORS_STRICT` | Extra allowed origins, e.g. `https://<canister>.icp0.io` (no trailing slash) |
| `INTEGRATION_API_KEY` | Optional hardening | Random secret; if set, frontend must send `Authorization: Bearer …` on POST routes |

**CORS (default)**  
The integration API **reflects the request `Origin`** for CORS unless `CORS_STRICT=1`. That avoids “No `Access-Control-Allow-Origin`” when you add a custom domain or new IC URL. Protect sensitive actions with `INTEGRATION_API_KEY` on POST routes, not by hiding CORS from unknown origins on GET `/health`.

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
6. **S3:** Upload from Studio (bucket **CORS** must allow `PUT` from the **exact** browser `Origin` — see below).

If the browser shows CORS errors against **Render**, fix **`CORS_ORIGINS`** on Render to match the **exact** page origin (scheme + host, no path).

### S3 bucket CORS (browser uploads)

S3 compares `AllowedOrigins` to the **`Origin` header** exactly: **no path, no trailing slash** after the port. Wrong: `http://canister.localhost:4943/` — correct: `http://canister.localhost:4943`.

Add every origin you use, for example:

- `https://fusionart.world` and `https://www.fusionart.world` (production)
- `http://<asset-canister-id>.localhost:4943` (local `dfx` — copy from the browser address bar, then **strip any trailing `/`**)
- `http://localhost:3000` (Vite dev, if you test uploads there)

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
| S3 presign 503 / “Could not load credentials” | Set **`AWS_ACCESS_KEY_ID`** and **`AWS_SECRET_ACCESS_KEY`** on Render (IAM user with `s3:PutObject`). Local dev can use `~/.aws` instead. |
| S3 PUT blocked by CORS / preflight | Bucket **CORS** `AllowedOrigins` must match **`Origin` exactly** (no trailing `/`). Include `http://<canister>.localhost:4943` for local dfx. Use `"AllowedHeaders": ["*"]` if preflight still fails. |
| Cold start / timeout | Render free tier sleep—upgrade or retry |

---

## Reference

- Package env reference: [services/fusion-integration-api/README.md](../services/fusion-integration-api/README.md)
- Root README (Vite vars): [README.md](../README.md)
