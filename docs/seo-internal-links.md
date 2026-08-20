# Internal linking for SEO and sitelinks

This document lists **canonical hub URLs** and recommended **anchor text** so navigation, footers, and editorial copy reinforce the same structure search engines use for sitelinks and entity understanding.

## Keyword hierarchy (do not cannibalize)

| Role | Keyword | Primary URL | Title / H1 rule |
|------|---------|-------------|-----------------|
| Primary | japan artist residency | `/programs`, `/program/kaga-ishikawa` | Residency-first titles and H1s only |
| Secondary | curated art network | `/join-network` | Network + four personas (artists, galleries, curators, collectors) |
| Support | curated art network (modifiers) | `/context`, `/community`, `/artists`, `/gallery-access` | Support the join hub; link to `/join-network`; do not outrank it |

**Rule:** Residency pages keep residency-led copy and only *link* to the network. Join / network pages lead with network + personas and *link* to residencies as proof of programs rooted in Japan.

## Phrase lock (join surfaces)

Prefer the exact phrase **curated art network**. Name all **four personas** (artists, galleries, curators, collectors) in join meta, bands, and money-page copy. Avoid “curated platform” / “global platform” on join SEO surfaces. Membership checkout CTAs may stay “Join FUSION”.

### Studio CMS defaults (do not erase SEO)

When editing Studio → Join Network / join-network-page / join-network bands:

| Field | Target (EN) |
|-------|-------------|
| `/join-network` title | `Curated Art Network \| Join FUSION` |
| Meta description | Join a curated art network connecting artists, galleries, curators, and collectors through programs rooted in Japan. |
| Visible H1 (`storyHeadline`) | Include **curated art network** once (e.g. `A curated art network for practice across borders.`) |
| Band teasers | Include collectors; use curated art network wording |

JA should mirror meaning (キュレーション型アートネットワーク + four personas).

## Canonical hubs (production)

| URL | Role | Suggested anchor phrases (natural, rotate) |
|-----|------|---------------------------------------------|
| https://fusionart.world/ | Home | “Fusion”, “home” |
| https://fusionart.world/programs | Programs index (primary for “japan artist residency”) | “Japan artist residency programs”, “programs”, “residencies in Japan” |
| https://fusionart.world/program/kaga-ishikawa | Flagship Kaga residency detail | “Kaga, Ishikawa Japan artist residency”, “Kaga residency” |
| https://fusionart.world/join-network | Membership / curated art network (secondary money page) | “curated art network”, “join the network”, “Join FUSION” |
| https://fusionart.world/artists | Artists index | “Artists”, “artists in the curated art network” |
| https://fusionart.world/journal | Journal | “Journal”, “editorial”, “field notes” |
| https://fusionart.world/context | Mission / ecosystem → join | “Context”, “why Fusion”, “mission”, “curated art network” |
| https://fusionart.world/contact | Contact | “Contact”, “get in touch” |
| https://fusionart.world/editions | Editions | “Editions”, “objects and prints” |
| https://fusionart.world/gallery-access | Gallery access | “Gallery access”, “gallery access through Fusion’s curated art network” |
| https://fusionart.world/community | Community | “Community”, “community inside Fusion’s curated art network” |
| https://fusionart.world/videos | Videos | “Videos”, “studio visits” |

Use **path-only** links in the app (`/programs`, `/join-network`, not full URLs) so staging and local builds stay correct; crawlers resolve them on the deployed host.

## Cross-links (residency ↔ network)

Implemented in product copy:

1. **`/programs` intro** — residency is part of a curated art network → anchors “curated art network” / “join the network” → `/join-network`.
2. **Program detail** (e.g. Kaga) — soft hub link to `/join-network` for galleries / curators / collectors (does not replace apply CTA).
3. **`/join-network`** — links to `/programs` and `/program/kaga-ishikawa` as programs rooted in Japan.
4. **Header** — Register / join path navigates to `/join-network` (public entry). Prefer path-only `/join-network` in any new nav/footer links.

Do **not** retarget `/programs` title or H1 to “curated art network.”

## Legacy URL

| URL | Behavior |
|-----|----------|
| https://fusionart.world/residency | Redirects / canonicalizes to `/programs` (directories still link here; update listings when possible) |

## Locale and URLs

The SPA uses a **single URL** per page with client-side locale switching (`document.documentElement.lang` is `en` or `ja`). There is no separate `/ja/...` prefix today. If you add locale-prefixed routes later, add matching `hreflang` pairs and update `documentSeo` / this doc.

## Gated or non-indexed areas

Do not rely on internal links to **Studio**, **Settings**, **Register**, **Sign in**, or **Join Fusion** (`/join-fusion`) for SEO equity; those routes use `noindex` where configured. Private program URLs (`/program/private/...`) are also `noindex`. Marketing CTAs should point to public hubs (`/programs`, `/`, `/join-network`) instead.

## Program detail URLs

Always prefer **`/program/{slug}`** (not `/programs/{slug}`). The app forces that canonical and `replaceState`s the plural path when needed.

## Sitemap

[`public/sitemap.xml`](../src/fusion-app-frontend/public/sitemap.xml) lists hubs plus live program detail (`/program/kaga-ishikawa`), `/join-network`, `/community`, and `/videos`. Add new **public** program slugs when they go live. Keep Studio/Settings/auth out.

## Build-time SEO shells

Vite build runs `seoMoneyPagePrerenderPlugin`, which writes SPA shells with route-specific meta and `<noscript>` copy for `/`, `/programs`, `/program/kaga-ishikawa`, and `/join-network` under `dist/`. Redeploy the frontend after build so the asset canister serves those paths.

## Static HTML templates (`public/templates/`)

The Vite SPA is served from `index.html`, which includes static Open Graph defaults. Files under `public/templates/` (e.g. `home.html`, `context.html`) may be used by gateways or tooling; they are **not** the primary entry for the running app. If a deployment path serves these templates directly, align their `<title>` and meta with `index.html` or rely on the money-page prerender shells above.

## `lang` and locale

The client sets `document.documentElement.lang` to `en` or `ja` from the Fusion locale preference (`main.js`). There are no separate `/ja/...` URLs yet; a future locale-prefix strategy would pair with `hreflang` in `documentSeo`.

## Post-deploy checklist (GSC + directories)

### Primary (japan artist residency)

1. Search Console → URL Inspection → **Request indexing** for `/programs`, `/program/kaga-ishikawa`, `/`, `/residency`.
2. Submit updated `sitemap.xml`.
3. Start **Validate fix** on: Alternate page with proper canonical, Excluded by noindex, Crawled – currently not indexed.
4. Update external directories that still cite `/residency` (BNE ART, India Art Fair, Reviewed by Artists, social bios) to `https://fusionart.world/programs` or the Kaga URL.
5. Track 4–8 weeks: impressions for “japan artist residency”, “japan artist residency programs”, “kaga artist residency”. DuckDuckGo typically follows Google indexing recovery.

### Secondary (curated art network)

1. Request indexing for `/join-network`, `/context`, `/community` (and `/artists`, `/gallery-access` if titles/H1s changed).
2. Track queries: `curated art network`, `curated art network Japan`, `artist network Japan`, plus branded join terms.
3. Track conversions: `/join-network` sessions → membership checkout / role select (PostHog or existing funnels).
4. **Guardrail:** `/programs` impressions for “japan artist residency” must not drop from network retargeting — if they do, pull network phrasing back off residency H1/title (keep residency-led; links only).
