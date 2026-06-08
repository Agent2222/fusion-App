# Media storage redundancy: AWS S3 + Cloudflare R2

**Purpose:** Living runbook for Fusion media — initial R2 failover **complete**; use this doc for health checks, future outages, and AWS failback.  
**Created:** 2026-06  
**Updated:** 2026-06 — **Live on R2** (reads + writes verified)

---

## Current production state

| Layer | Active now | Notes |
|-------|------------|--------|
| **CDN** | `cdn.fusionart.world` → R2 custom domain | Same hostname as before; no canister URL changes |
| **Object storage** | R2 bucket **`fusion-app`** | Migrated copy of S3 keys |
| **Upload presign** | `STORAGE_BACKEND=r2` on Render | Toggle only — no code deploy needed to switch |
| **AWS S3 + CloudFront** | Standby (keep env vars + bucket) | Fail back when account healthy — [Step 10](#step-10--failback-to-aws-when-account--cloudfront-are-healthy) |
| **Canister URLs** | `https://cdn.fusionart.world/uploads/…` | Unchanged |

**Ops notes**

- New uploads land on **R2 only** until you fail back to AWS.
- Do **not** delete the AWS bucket or CloudFront distribution.
- Record in your team runbook: **R2 became primary ~2026-06** (for sync direction on failback).

---

## Quick health checks (anytime)

```bash
# CDN reads
curl -I "https://cdn.fusionart.world/uploads/studio/editions/edition/ed_1776103056186/image.jpg"
curl -I "https://cdn.fusionart.world/fusionMedia/uploads/Zac-Foster-Preview.mp4"

# Upload backend
curl -s "https://fusion-app-sycs.onrender.com/health" | jq '.storageBackend, .storage'
```

Expect: both CDN URLs **200**; `/health` shows `"storageBackend": "r2"` and `"storage": { "active": "configured", "r2": "configured" }`.

For upload issues: Studio test + DevTools (presign `putUrl` on `*.r2.cloudflarestorage.com`, no CSP/CORS errors). See [DEPLOY_RENDER_AND_ICP.md](DEPLOY_RENDER_AND_ICP.md).

---

## Future use — when to open this doc

| Scenario | Section |
|----------|---------|
| AWS / CloudFront outage again | [Failover to R2](#failover-to-r2-reference) (already done once — repeat DNS + `STORAGE_BACKEND=r2`) |
| AWS restored — return to primary | [Step 10 — Failback to AWS](#step-10--failback-to-aws-when-account--cloudfront-are-healthy) |
| Keep buckets aligned | [Step 9 — Ongoing sync](#step-9--ongoing-sync-after-aws-is-restored) |
| Wrong path / 404 on CDN | [Troubleshooting — 404](#troubleshooting--404-on-test-urls) |
| Env var reference | [Production values](#production-values-fusion), [Integration API](#reference--integration-api-implemented), [Render README](../services/fusion-integration-api/README.md) |

### Failover to R2 (reference)

If AWS breaks again and R2 is already warm:

1. Confirm objects on **`fusion-app`** (or sync S3 → R2 — Step 9).
2. Point **`cdn.fusionart.world`** DNS to R2 custom domain (Cloudflare → R2 → bucket **`fusion-app`** → Custom Domains).
3. Set **`STORAGE_BACKEND=r2`** on Render; redeploy Integration API.
4. Confirm R2 **CORS** includes current site origins.
5. Run [quick health checks](#quick-health-checks-anytime) + one Studio upload.

No frontend/canister deploy required unless CSP or Integration API code changed since last failover.

---

## Initial migration — completed (archive)

<details>
<summary>Full cutover checklist (Steps A–D) — completed 2026-06</summary>

| Step | What | Status |
|------|------|--------|
| A | Integration API dual-backend + Render `STORAGE_BACKEND=r2` | Done |
| B | R2 CORS on **`fusion-app`** | Done |
| C | Frontend CSP + asset canister deploy | Done |
| D | Smoke test (reads + Studio/profile uploads) | Done |

Also completed earlier: R2 bucket creation, S3→R2 object copy, custom domain **`cdn.fusionart.world`**, canonical CDN URL verification.

</details>

<details>
<summary>Step A — Render env (reference copy)</summary>

```bash
STORAGE_BACKEND=r2

R2_BUCKET=fusion-app
R2_ACCESS_KEY_ID=<r2-token-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-token-secret>
R2_ENDPOINT=https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://cdn.fusionart.world
S3_PUBLIC_BASE_URL=https://cdn.fusionart.world

# Keep for failback
AWS_REGION=us-east-2
S3_BUCKET=fusion-media-aws
AWS_ACCESS_KEY_ID=<existing>
AWS_SECRET_ACCESS_KEY=<existing>
```

Code: [`storageBackends.js`](../services/fusion-integration-api/src/storageBackends.js), [`index.js`](../services/fusion-integration-api/src/index.js). CSP: [`.ic-assets.json5`](../src/fusion-app-frontend/public/.ic-assets.json5).

</details>

---

## Code status (deployed)

| Item | Location | Status |
|------|----------|--------|
| Dual-backend presign (`STORAGE_BACKEND=aws\|r2`) | [`storageBackends.js`](../services/fusion-integration-api/src/storageBackends.js), [`index.js`](../services/fusion-integration-api/src/index.js) | **Deployed** (Render) |
| `/health` reports `storageBackend`, `storage.aws`, `storage.r2` | Integration API | **Deployed** |
| CSP `connect-src` for R2 presign PUT | [`.ic-assets.json5`](../src/fusion-app-frontend/public/.ic-assets.json5) | **Deployed** (asset canister) |
| Env docs | README, DEPLOY doc | Done |

Reads and uploads target R2 while `STORAGE_BACKEND=r2`. No Motoko changes.

<details>
<summary>R2 CORS policy (reference — bucket fusion-app)</summary>

Origins must match browser `Origin` exactly (no trailing slash):

```json
[
  {
    "AllowedOrigins": [
      "https://fusionart.world",
      "https://www.fusionart.world",
      "https://YOUR_CANISTER.icp0.io"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

</details>

---

## Production values (Fusion)

| Item | Value |
|------|--------|
| **R2 bucket name** | `fusion-app` |
| **Public CDN hostname** | `cdn.fusionart.world` |
| **Test image (uploads prefix)** | `uploads/studio/editions/edition/ed_1776103056186/image.jpg` — [CDN URL](https://cdn.fusionart.world/uploads/studio/editions/edition/ed_1776103056186/image.jpg) |
| **Test video (fusionMedia prefix)** | [fusionMedia/uploads/Zac-Foster-Preview.mp4](https://cdn.fusionart.world/fusionMedia/uploads/Zac-Foster-Preview.mp4) |

**R2 object keys** (must match URL path after hostname):

| Test asset | Object key in `fusion-app` |
|------------|----------------------------|
| Edition image | `uploads/studio/editions/edition/ed_1776103056186/image.jpg` |
| Community preview video | `fusionMedia/uploads/Zac-Foster-Preview.mp4` |

---

## Goal (long-term)

Keep **AWS S3 + CloudFront** as the **primary when healthy**. Use **R2** as mirrored redundancy — failover is env + DNS, not a canister migration.

Both backends stay configured on Render; switching is **`STORAGE_BACKEND`** + optional DNS flip on `cdn.fusionart.world`.

---

## Where you are now

| Item | Status |
|------|--------|
| Live on R2 (CDN + uploads) | **Done** |
| Dual-backend code deployed | **Done** |
| AWS failback | **When ready** — Step 10 |
| Ongoing S3 ↔ R2 sync | **Optional** — Step 9 after AWS restored |

---

## Reference — verification details (Step 1 expanded)

#### AWS CLI vs npm SDK

| Tool | What it is | Gives you `aws` in terminal? |
|------|------------|------------------------------|
| **`aws` CLI** | Separate install ([AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)) | Yes — `aws s3 ls …` |
| **`npm i @aws-sdk/client-s3`** | JavaScript library (already in integration-api) | **No** |

For Step 1 you do **not** need either if `curl` returns 200.

#### Optional — list bucket via Node

```bash
cd services/fusion-integration-api

export R2_ACCOUNT_ID="your-cloudflare-account-id"
export R2_ACCESS_KEY_ID="your-r2-access-key-id"
export R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"

node --input-type=module -e "
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
const client = new S3Client({
  region: 'auto',
  endpoint: \`https://\${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});
const out = await client.send(new ListObjectsV2Command({
  Bucket: 'fusion-app',
  Prefix: 'uploads/',
  MaxKeys: 10,
}));
console.log(out.Contents?.map((o) => o.Key) ?? []);
"
```

---

## Reference — Integration API (implemented)

Presign routes use the active backend from [`storageBackends.js`](../services/fusion-integration-api/src/storageBackends.js):

| `STORAGE_BACKEND` | Presign target |
|-------------------|----------------|
| `aws` (default) | AWS S3 |
| `r2` | Cloudflare R2 (`forcePathStyle`, `region: auto`) |

Routes: `POST /storage/presign`, `POST /storage/private-video/presign-upload`, `POST /storage/private-video/sign-playback`.

**Large video uploads (Studio → Videos):** multipart routes mirror single PUT on both AWS and R2:

- `POST /storage/multipart/init|presign-part|complete|abort`
- `POST /storage/private-video/multipart/init|presign-part|complete|abort`

Default threshold **100 MB** (`MULTIPART_THRESHOLD_BYTES`); part size **10 MB** (`MULTIPART_PART_SIZE_BYTES`, ≥ R2 5 MiB minimum). See [Integration API README](../services/fusion-integration-api/README.md).

Saved URLs in the canister stay `https://cdn.fusionart.world/…` — frontend rewrite unchanged.

---

## Reference — CSP (implemented)

| CSP directive | Hosts | Used for |
|---------------|-------|----------|
| **`connect-src`** | `https://*.amazonaws.com`, `https://*.r2.cloudflarestorage.com` | Presigned **PUT** uploads (Studio / profile) |
| **`media-src`** | `https://cdn.fusionart.world`, `https://*.amazonaws.com`, `https://*.r2.cloudflarestorage.com` | Public CDN media **and** presigned **GET** for members-only full video (`<video src>`) |

Configured in [`.ic-assets.json5`](../src/fusion-app-frontend/public/.ic-assets.json5).  
**Important:** `connect-src` does **not** cover `<video>` / `<audio>` — those require **`media-src`**.

Public previews (`fusionMedia/uploads/…`) load from `cdn.fusionart.world`.  
Private full videos (`fusionMedia/private-video/…`) are **not** public on the CDN — members get a time-limited presigned URL via `POST /storage/private-video/sign-playback` (works on **AWS or R2** via `STORAGE_BACKEND`).

**Key format (canister / Studio `fullVideoKey`):** flat object key under the prefix, for example:

```text
fusionMedia/private-video/Rodolfo-Full.mp4
```

Do **not** use `https://cdn.fusionart.world/fusionMedia/private-video/…` in `fullVideoKey` — that path is private; playback uses sign-playback, not the public CDN.

After CSP changes: rebuild frontend + redeploy asset canister.

---

## Steady state on R2 (current)

Production is on R2 for reads (DNS) and writes (Integration API). No canister URL migration needed.

**Remember**

- New uploads land on R2 until failback.
- Keep AWS S3 + CloudFront frozen for future primary.
- Before failback: sync **R2 → S3** for objects uploaded while on R2.

---

## Step 9 — Ongoing sync (after AWS is restored)

| Direction | When | Tool |
|-----------|------|------|
| R2 → S3 | After living on R2 (catch up AWS) | `rclone sync r2:fusion-app s3:AWS_BUCKET` |
| S3 → R2 | Steady state with AWS primary | Cron / hourly `rclone sync s3:AWS_BUCKET r2:fusion-app` |
| R2 → S3 | After any future failover on R2 | On failback |

---

## Step 10 — Failback to AWS (when account + CloudFront are healthy)

1. Sync **R2 → S3** (objects uploaded while on R2).
2. Verify CloudFront: `dig YOUR_DISTRIBUTION.cloudfront.net A +short` returns IPs.
3. Set `STORAGE_BACKEND=aws` on Render; redeploy Integration API.
4. Point `cdn.fusionart.world` DNS back to CloudFront (or keep on R2 — document choice).
5. Run [quick health checks](#quick-health-checks-anytime) + Studio upload test.
6. Schedule **S3 → R2** sync so R2 stays a warm mirror.

---

## Summary table

| Layer | AWS (primary when healthy) | R2 (active now / failover) |
|-------|----------------------------|----------------------------|
| Object storage | S3 bucket | R2 bucket **`fusion-app`** (migrated) |
| Public CDN | CloudFront → `cdn.fusionart.world` | R2 custom domain → **same hostname** (live) |
| Upload presign | `STORAGE_BACKEND=aws` | `STORAGE_BACKEND=r2` |
| Canister URLs | `https://cdn.fusionart.world/uploads/…` | **Unchanged** |

---

## Toggle model

### Upload backend — `STORAGE_BACKEND`

| Value | Behavior |
|-------|----------|
| `aws` | Presign → S3 |
| `r2` | Presign → R2 |

### Read / CDN

| Approach | Notes |
|----------|--------|
| **DNS swap** (recommended) | Same `cdn.fusionart.world`; flip CNAME between CloudFront and R2 |
| Dual hostname | `cdn-r2.fusionart.world` for testing; requires frontend origin toggle |
| Client fallback | Extend `assetUrlCandidates()` — future enhancement |

---

## Current architecture (codebase)

### Public URL rewriting

- [`assetDistribution.js`](../src/fusion-app-frontend/src/utils/assetDistribution.js) — `CLOUDFRONT_ASSET_ORIGIN = 'https://cdn.fusionart.world'`
- No change needed for reads if DNS points R2 at the same hostname.

### Upload flow

1. `POST /storage/presign` → Integration API (active backend)
2. Browser `PUT` to presigned URL (S3 or R2 host)
3. Frontend rewrites to `https://cdn.fusionart.world/…` via [`studioS3Upload.js`](../src/fusion-app-frontend/src/utils/studioS3Upload.js)

### Object key prefixes

| Prefix | Used for |
|--------|----------|
| `uploads/` | Default; most Studio + member uploads |
| `fusionMedia/uploads/` | Community media |
| `fusionMedia/private-video/` | Gated video (signed GET); keys like `fusionMedia/private-video/Rodolfo-Full.mp4` |

---

## Path mapping reference

| Field | Edition image | Community video |
|-------|---------------|-----------------|
| R2 bucket | `fusion-app` | `fusion-app` |
| Object key | `uploads/studio/editions/edition/ed_1776103056186/image.jpg` | `fusionMedia/uploads/Zac-Foster-Preview.mp4` |
| Browser URL | `https://cdn.fusionart.world/uploads/studio/editions/edition/ed_1776103056186/image.jpg` | `https://cdn.fusionart.world/fusionMedia/uploads/Zac-Foster-Preview.mp4` |

---

## Troubleshooting — 404 on test URLs

R2 custom domain maps **URL path → object key exactly** (no CloudFront-style rewrites unless you add Transform Rules).

| `curl -I` result | Meaning |
|------------------|---------|
| **curl error 6** / could not resolve | DNS not wired — custom domain or propagation |
| **HTTP 403** | Domain or bucket access policy |
| **HTTP 404** + `server: cloudflare` | **DNS OK** — no object at that key in bucket **`fusion-app`** |
| **HTTP 200** | Object found — reads working |

Your output (`HTTP/2 404`, `server: cloudflare`) means **step 2 (custom domain) succeeded**; the object is not at that key. Wrong paths we confirmed **404**:

- `uploads/studio/editions/ed_1776103056186/image.jpg` — missing **`edition/`** segment
- `fusionMedia/uploads/studio/editions/edition/…` — edition objects are under **`uploads/`**, not `fusionMedia/uploads/`

**Working paths (verified):**

- `uploads/studio/editions/edition/ed_1776103056186/image.jpg` → **200**
- `fusionMedia/uploads/Zac-Foster-Preview.mp4` → **200**

**List keys (Node, from repo)**

```bash
cd services/fusion-integration-api
export R2_ACCOUNT_ID="..."
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."

node --input-type=module -e "
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
const client = new S3Client({
  region: 'auto',
  endpoint: \`https://\${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  forcePathStyle: true,
});
for (const prefix of ['uploads/studio/editions/', 'fusionMedia/uploads/']) {
  const out = await client.send(new ListObjectsV2Command({ Bucket: 'fusion-app', Prefix: prefix, MaxKeys: 20 }));
  console.log(prefix, out.Contents?.map((o) => o.Key) ?? []);
}
"
```

---

## Runbook notes (optional)

- [ ] Cloudflare **account ID** in team secrets/runbook (for `R2_ENDPOINT`)
- [ ] AWS account restoration timeline documented
- [ ] Scheduled **S3 → R2** sync after failback (Step 9), if you want R2 as warm mirror

---

## Related docs

- [DEPLOY_RENDER_AND_ICP.md](DEPLOY_RENDER_AND_ICP.md) — Integration API env, CORS, smoke tests  
- [services/fusion-integration-api/README.md](../services/fusion-integration-api/README.md) — presign routes and `STORAGE_BACKEND`  
- [delete-later.md](delete-later.md) — legacy CDN profile URL tools in Studio  
