# Media storage redundancy: AWS S3 + CloudFront with Cloudflare R2 failover

**Status:** R2 **reads** live on CDN — **writes blocked until you ship code + Render**  
**Created:** 2026-06  
**Updated:** 2026-06-05 — CDN verified; dual-backend code **not deployed**; Render env **not updated**

---

## What's done

| Area | Status |
|------|--------|
| R2 bucket **`fusion-app`** + object migration | Done |
| Custom domain **`cdn.fusionart.world`** on R2 | Done |
| Canonical CDN reads (`curl -I` **200**) | Done |
| Dual-backend + CSP changes | Done **in repo only** — not on Render or IC yet |

**Reads work today** — existing media loads from `cdn.fusionart.world` via DNS.  
**Uploads do not** — Integration API on Render still presigns to AWS (old code + env). Studio uploads will fail or land on the wrong backend until you complete the steps below.

---

## Next steps — do in this order

Nothing here requires Motoko / backend canister changes.

### Step A — Push and deploy Integration API code (Render)

The dual-backend module is local only. Render must get the new code before env vars take effect.

1. **Commit and push** to the branch Render deploys from (`main` or your production branch):
   - [`services/fusion-integration-api/src/storageBackends.js`](../services/fusion-integration-api/src/storageBackends.js)
   - [`services/fusion-integration-api/src/index.js`](../services/fusion-integration-api/src/index.js)
   - Doc/README updates (optional but fine to include)

2. **Set Render environment variables** (Dashboard → your integration service → Environment):

```bash
STORAGE_BACKEND=r2

R2_BUCKET=fusion-app
R2_ACCESS_KEY_ID=<your-r2-token-access-key-id>
R2_SECRET_ACCESS_KEY=<your-r2-token-secret>
R2_ENDPOINT=https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://cdn.fusionart.world
S3_PUBLIC_BASE_URL=https://cdn.fusionart.world

# Keep AWS vars for future failback — do not delete
AWS_REGION=us-east-2
S3_BUCKET=fusion-media-aws
AWS_ACCESS_KEY_ID=<existing>
AWS_SECRET_ACCESS_KEY=<existing>
```

3. **Trigger deploy** — Render auto-deploys on push, or use **Manual Deploy** after saving env.

4. **Verify** (no Studio needed yet):

```bash
curl -s "https://fusion-app-sycs.onrender.com/health" | jq .
```

Expect **`storageBackend": "r2"`** and **`storage.r2": "configured"`**.  
If `/health` lacks `storageBackend`, Render is still on **old code** — confirm push landed and redeploy finished.

- [ ] R2 dual-backend code pushed to Render's branch
- [ ] Render env vars saved (`STORAGE_BACKEND=r2` + all `R2_*`)
- [ ] Integration API redeployed
- [ ] `/health` shows `storageBackend: "r2"` and `storage.active: "configured"`

---

### Step B — R2 CORS (Cloudflare dashboard)

Required for browser **PUT** to presigned R2 URLs. Can be done before or right after Step A; must be done before testing uploads.

Cloudflare → **R2** → bucket **`fusion-app`** → **CORS policy**. Origins must match exactly (scheme + host, **no trailing slash**):

- `https://fusionart.world`
- `https://www.fusionart.world`
- Your mainnet asset canister, e.g. `https://<canister-id>.icp0.io`
- Local dev if needed: `http://localhost:3000`, `http://<canister>.localhost:4943`

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

- [ ] CORS saved on R2 bucket **`fusion-app`**

---

### Step C — Push, build, and deploy frontend (asset canister)

CSP must allow `PUT` to `*.r2.cloudflarestorage.com`. That change is in [`.ic-assets.json5`](../src/fusion-app-frontend/public/.ic-assets.json5) but **not live** until you rebuild and deploy assets.

1. **Commit and push** (same branch as your IC deploy):
   - `src/fusion-app-frontend/public/.ic-assets.json5`
   - Any other pending frontend changes on your branch

2. **Build and deploy** (your usual flow):

```bash
cd src/fusion-app-frontend
npm run build
# from repo root, your usual:
# dfx deploy fusion-app-frontend --network ic
```

3. After deploy, hard refresh or incognito when testing uploads.

- [ ] Frontend changes pushed
- [ ] `npm run build` succeeded
- [ ] Asset canister deployed to mainnet

---

### Step D — Smoke test (reads + writes)

| Test | Expected |
|------|----------|
| Edition test image | [CDN URL](https://cdn.fusionart.world/uploads/studio/editions/edition/ed_1776103056186/image.jpg) → **200** |
| Community test video | [CDN URL](https://cdn.fusionart.world/fusionMedia/uploads/Zac-Foster-Preview.mp4) → **200** |
| Public `/profile/:slug`, `/artists`, `/programs` | Images load |
| Studio → artist → hero upload | Presign → PUT to `*.r2.cloudflarestorage.com` → Save → reload shows image |
| Member settings → profile image | Same |
| DevTools Console on upload | No CSP or CORS errors |

Quick upload check after Steps A–C:

- Studio → Services → test connection (Integration API)
- Upload a small image in Studio or member profile settings
- In Network tab: presign response `putUrl` host should be **`….r2.cloudflarestorage.com`**

- [ ] Public site reads OK
- [ ] Studio / profile uploads OK
- [ ] No CSP / CORS errors in DevTools

---

### Step E — Later (when AWS is healthy)

Sync buckets and fail back — see [Step 9](#step-9--ongoing-sync-after-aws-is-restored) and [Step 10](#step-10--failback-to-aws-when-account--cloudfront-are-healthy) below.

---

## Code status (done in repo, not deployed)

| Item | Location | Status |
|------|----------|--------|
| Dual-backend presign (`STORAGE_BACKEND=aws\|r2`) | [`storageBackends.js`](../services/fusion-integration-api/src/storageBackends.js), [`index.js`](../services/fusion-integration-api/src/index.js) | **Done in repo** — deploy Step A |
| `/health` reports `storageBackend`, `storage.aws`, `storage.r2` | Integration API | **Done** |
| CSP `connect-src` for R2 presign PUT | [`.ic-assets.json5`](../src/fusion-app-frontend/public/.ic-assets.json5) | **Done in repo** — deploy Step C |
| Env docs | [`services/fusion-integration-api/README.md`](../services/fusion-integration-api/README.md), [`docs/DEPLOY_RENDER_AND_ICP.md`](DEPLOY_RENDER_AND_ICP.md) | **Done** |

No Motoko changes. Reads use `https://cdn.fusionart.world/…` via DNS (already working). Uploads need Steps A + B + C.

---

## Checklist archive (Cloudflare / CDN — done)

<details>
<summary>§1–2 — CDN reads and custom domain (completed)</summary>

### Verify objects on R2 (reads) ✓

**Verified 2026-06-05** (`curl -I`):

| URL | Result |
|-----|--------|
| `…/uploads/studio/editions/edition/ed_1776103056186/image.jpg` | **200** (`image/jpeg`) |
| `…/fusionMedia/uploads/Zac-Foster-Preview.mp4` | **200** (`video/mp4`) |

- [x] Edition test image **200**
- [x] Community test video **200**
- [ ] Public site images (optional spot-check — Step D)

### R2 custom domain ✓

- [x] **`cdn.fusionart.world`** on bucket **`fusion-app`**
- [x] Dead CloudFront CNAME removed

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

## Goal

Keep **AWS S3 + CloudFront** as the **long-term primary** when healthy. Use **Cloudflare R2** as a **mirrored redundancy option** you can toggle during AWS outages — and as the **active stack now** while CloudFront DNS is broken.

This is **not** a one-way decommission of AWS. Both backends can coexist; switching is a **controlled failover / failback**, not a permanent cutover.

---

## Where you are now

| Step | Status |
|------|--------|
| R2 bucket + migration | Done |
| Custom domain + CDN reads | Done |
| **Push + deploy Integration API (Step A)** | **Not started** |
| **Render `STORAGE_BACKEND=r2` env (Step A)** | **Not started** |
| **R2 CORS (Step B)** | **Not started** |
| **Frontend build + asset canister (Step C)** | **Not started** |
| Full smoke test (Step D) | After A–C |

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

Saved URLs in the canister stay `https://cdn.fusionart.world/…` — frontend rewrite unchanged.

---

## Reference — CSP (implemented)

Browser uploads `PUT` to `https://….r2.cloudflarestorage.com` — allowed in **`connect-src`** in [`.ic-assets.json5`](../src/fusion-app-frontend/public/.ic-assets.json5).

`img-src` / `media-src` stay on `https://cdn.fusionart.world` only (reads use custom domain).

---

## Step 7 — Steady state on R2 (while AWS is down)

You are **live on R2** for reads (DNS) and writes (Integration API). No canister URL migration needed.

**Ops notes**

- New uploads land **only** on R2 until you fail back to AWS.
- Keep AWS S3 bucket and CloudFront distribution **frozen** (do not delete).
- Document the date R2 became primary for later sync direction.

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
5. Run smoke tests (checklist §6).
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
| `fusionMedia/private-video/` | Gated video (signed GET) |

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

## Completed — migration phases (archive)

<details>
<summary>Phase 3: R2 custom domain (done)</summary>

- **`cdn.fusionart.world`** attached to R2 bucket **`fusion-app`**
- Dead CloudFront CNAME removed

</details>

<details>
<summary>Phase 1–2: R2 setup and asset copy (done)</summary>

- R2 bucket **`fusion-app`** + API token created  
- Objects synced from S3 → **`fusion-app`** with **identical keys**  
- Prefixes: `uploads/`, `fusionMedia/uploads/`, `fusionMedia/private-video/`, `uploads/legacyProfiles/`  
- Verified test objects: edition image + `Zac-Foster-Preview.mp4`

</details>

---

## Open questions (for you to confirm)

- [ ] Cloudflare **account ID** recorded in team runbook (for `R2_ENDPOINT`)
- [x] `cdn.fusionart.world` on R2 custom domain
- [x] Canonical test URLs return **200**
- [ ] Integration API deployed with dual-backend code
- [ ] Render `STORAGE_BACKEND=r2` + smoke tests pass
- [ ] AWS account restoration timeline (for failback)

---

## Related docs

- [DEPLOY_RENDER_AND_ICP.md](DEPLOY_RENDER_AND_ICP.md) — Integration API env, CORS, smoke tests  
- [services/fusion-integration-api/README.md](../services/fusion-integration-api/README.md) — presign routes  
- [delete-later.md](delete-later.md) — legacy CDN profile URL tools in Studio  
