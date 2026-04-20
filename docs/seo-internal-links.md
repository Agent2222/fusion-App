# Internal linking for SEO and sitelinks

This document lists **canonical hub URLs** and recommended **anchor text** so navigation, footers, and editorial copy reinforce the same structure search engines use for sitelinks and entity understanding.

## Canonical hubs (production)

| URL | Role | Suggested anchor phrases (natural, rotate) |
|-----|------|---------------------------------------------|
| https://fusionart.world/ | Home | “Fusion”, “home” |
| https://fusionart.world/programs | Programs index | “Japan artist residency programs”, “programs”, “residencies in Japan” |
| https://fusionart.world/artists | Artists index | “Artists”, “browse artists” |
| https://fusionart.world/journal | Journal | “Journal”, “editorial”, “field notes” |
| https://fusionart.world/context | Mission / ecosystem | “Context”, “why Fusion”, “mission” |
| https://fusionart.world/contact | Contact | “Contact”, “get in touch” |
| https://fusionart.world/editions | Editions | “Editions”, “objects and prints” |
| https://fusionart.world/gallery-access | Gallery access | “Gallery access” (if publicly linked) |

Use **path-only** links in the app (`/programs`, not full URLs) so staging and local builds stay correct; crawlers resolve them on the deployed host.

## Locale and URLs

The SPA uses a **single URL** per page with client-side locale switching (`document.documentElement.lang` is `en` or `ja`). There is no separate `/ja/...` prefix today. If you add locale-prefixed routes later, add matching `hreflang` pairs and update `documentSeo` / this doc.

## Gated or non-indexed areas

Do not rely on internal links to **Studio**, **Settings**, **Register**, or **Sign in** for SEO equity; those routes use `noindex` where configured. Marketing CTAs should point to public hubs (`/programs`, `/`, Join flows) instead.

## Detail pages

Program, profile, journal entry, edition, and event URLs are **dynamic**. Phase-1 `sitemap.xml` lists hub URLs only; expanding the sitemap with detail URLs is a possible follow-up (build-time or CMS-driven).

## Static HTML templates (`public/templates/`)

The Vite SPA is served from `index.html`, which includes static Open Graph defaults. Files under `public/templates/` (e.g. `home.html`, `context.html`) may be used by gateways or tooling; they are **not** the primary entry for the running app. If a deployment path serves these templates directly, align their `<title>` and meta with `index.html` or add a **phase-2** prerender/build step for critical URLs.

## `lang` and locale

The client sets `document.documentElement.lang` to `en` or `ja` from the Fusion locale preference (`main.js`). There are no separate `/ja/...` URLs yet; a future locale-prefix strategy would pair with `hreflang` in `documentSeo`.
