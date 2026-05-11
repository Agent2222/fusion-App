/**
 * Central place to update document title, meta description, canonical, Open Graph, Twitter, and JSON-LD.
 * Keep static defaults in index.html aligned with the home route (see plan: link unfurl without JS).
 */

import { getPublicSiteOrigin } from "../config.js";

const DESC_MAX = 158;

/** @param {string} s */
function clipDescription(s) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= DESC_MAX) return t;
  return `${t.slice(0, DESC_MAX - 1).trim()}…`;
}

/**
 * @param {string} name
 */
function ensureMetaName(name) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el || el.tagName !== "META") {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  return /** @type {HTMLMetaElement} */ (el);
}

/**
 * @param {string} property
 */
function upsertOg(property) {
  const sel = `meta[property="${property}"]`;
  let el = document.head.querySelector(sel);
  if (!el || el.tagName !== "META") {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  return /** @type {HTMLMetaElement} */ (el);
}

/**
 * @param {string} name
 */
function upsertTwitter(name) {
  const sel = `meta[name="${name}"]`;
  let el = document.head.querySelector(sel);
  if (!el || el.tagName !== "META") {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  return /** @type {HTMLMetaElement} */ (el);
}

/**
 * @param {string} id
 */
function removeJsonLdScript(id) {
  const existing = document.getElementById(id);
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
}

/**
 * @param {string} id
 * @param {unknown} data
 */
function setJsonLdScript(id, data) {
  removeJsonLdScript(id);
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

const DEFAULT_OG_IMAGE_PATH = "/og-default.png";

/**
 * @param {string} path
 */
function normalizeCanonicalPath(path) {
  const raw = String(path || "/").trim() || "/";
  let pathname = raw;
  try {
    pathname = new URL(raw, "https://fusionart.world").pathname;
  } catch {
    pathname = raw.split("?")[0].split("#")[0] || "/";
  }
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");
  return pathname || "/";
}

/**
 * @param {{
 *   title: string,
 *   description: string,
 *   path?: string,
 *   ogType?: 'website' | 'article',
 *   robots?: string,
 *   imageUrl?: string | null,
 *   imageWidth?: number,
 *   imageHeight?: number,
 *   breadcrumbItems?: Array<{ name: string, path: string }>,
 *   articleJsonLd?: Record<string, unknown> | null,
 *   homeOrganizationJsonLd?: boolean,
 * }} opts
 */
export function applyDocumentSeo(opts) {
  if (typeof document === "undefined") return;

  const title = String(opts.title || "").trim() || "Fusion";
  const description = clipDescription(opts.description || "");
  const path =
    opts.path != null
      ? String(opts.path)
      : typeof window !== "undefined"
        ? window.location.pathname
        : "/";
  const origin = getPublicSiteOrigin();
  const pathOnly = normalizeCanonicalPath(path);
  const normalizedCanonical = new URL(pathOnly, origin).href;

  document.title = title;

  ensureMetaName("description").setAttribute("content", description);

  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link || link.tagName !== "LINK") {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", normalizedCanonical);

  if (opts.robots) {
    ensureMetaName("robots").setAttribute("content", opts.robots);
  } else {
    const robotsEl = document.head.querySelector('meta[name="robots"]');
    if (robotsEl) robotsEl.remove();
  }

  const ogType = opts.ogType || "website";
  upsertOg("og:title").setAttribute("content", title);
  upsertOg("og:description").setAttribute("content", description);
  upsertOg("og:url").setAttribute("content", normalizedCanonical);
  upsertOg("og:type").setAttribute("content", ogType);
  upsertOg("og:site_name").setAttribute("content", "Fusion");

  const imagePath =
    opts.imageUrl != null && String(opts.imageUrl).trim()
      ? String(opts.imageUrl).trim()
      : `${origin}${DEFAULT_OG_IMAGE_PATH}`;
  const absImage = imagePath.startsWith("http")
    ? imagePath
    : `${origin}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;

  upsertOg("og:image").setAttribute("content", absImage);
  const w = opts.imageWidth ?? 1200;
  const h = opts.imageHeight ?? 630;
  upsertOg("og:image:width").setAttribute("content", String(w));
  upsertOg("og:image:height").setAttribute("content", String(h));

  upsertTwitter("twitter:card").setAttribute("content", "summary_large_image");
  upsertTwitter("twitter:title").setAttribute("content", title);
  upsertTwitter("twitter:description").setAttribute("content", description);
  upsertTwitter("twitter:image").setAttribute("content", absImage);

  removeJsonLdScript("fusion-seo-breadcrumb");
  if (opts.breadcrumbItems && opts.breadcrumbItems.length > 0) {
    const items = opts.breadcrumbItems.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${origin}${it.path.startsWith("/") ? it.path : `/${it.path}`}`,
    }));
    setJsonLdScript("fusion-seo-breadcrumb", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items,
    });
  }

  removeJsonLdScript("fusion-seo-article");
  if (opts.articleJsonLd && typeof opts.articleJsonLd === "object") {
    setJsonLdScript("fusion-seo-article", opts.articleJsonLd);
  }

  removeJsonLdScript("fusion-seo-organization");
  removeJsonLdScript("fusion-seo-website");
  if (opts.homeOrganizationJsonLd) {
    setJsonLdScript("fusion-seo-organization", {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Fusion",
      url: `${origin}/`,
      logo: `${origin}/favicon.ico`,
      description:
        "Fusion is a premium art platform connecting artists with Japan artist residency programs, editions, and editorial context.",
      sameAs: ["https://www.youtube.com/@fusionartworld"],
    });
    setJsonLdScript("fusion-seo-website", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Fusion",
      url: `${origin}/`,
    });
  }
}
