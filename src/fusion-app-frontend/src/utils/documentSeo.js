/**
 * Central place to update document title, meta description, canonical, Open Graph, Twitter, and JSON-LD.
 * Keep static defaults in index.html aligned with DEFAULT_SITE_DESCRIPTION and DEFAULT_OG_IMAGE_URL.
 */

import { getPublicSiteOrigin } from "../config.js";

const DESC_MAX = 158;

/** Default share / search preview image (homepage + routes without a page image). */
export const DEFAULT_OG_IMAGE_URL =
  "https://cdn.fusionart.world/uploads/platform-assets/program_hero-1.jpg";

/** Homepage meta description — keep index.html meta tags aligned. */
export const DEFAULT_SITE_DESCRIPTION =
  "Fusion is an exclusive art platform running curated artist residency programs in Japan, from Kaga and Ishikawa to Tokyo and beyond, for artists, gallerists, and art enthusiasts worldwide.";

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
 *   personJsonLd?: { name: string, url: string, image?: string, jobTitle?: string, description?: string } | null,
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
      : DEFAULT_OG_IMAGE_URL;
  const absImage = imagePath.startsWith("http")
    ? imagePath
    : `${origin}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;

  upsertOg("og:image").setAttribute("content", absImage);
  const w = opts.imageWidth ?? 1920;
  const h = opts.imageHeight ?? 1080;
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

  removeJsonLdScript("fusion-seo-person");
  if (opts.personJsonLd && typeof opts.personJsonLd === "object") {
    const p = opts.personJsonLd;
    const person = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: String(p.name || "").trim() || "Artist",
      url: String(p.url || normalizedCanonical).trim(),
    };
    if (p.image) person.image = String(p.image).trim();
    if (p.jobTitle) person.jobTitle = String(p.jobTitle).trim();
    if (p.description) person.description = clipDescription(String(p.description));
    setJsonLdScript("fusion-seo-person", person);
  }

  removeJsonLdScript("fusion-seo-organization");
  removeJsonLdScript("fusion-seo-website");
  if (opts.homeOrganizationJsonLd) {
    setJsonLdScript("fusion-seo-organization", {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Fusion",
      url: `${origin}/`,
      logo: DEFAULT_OG_IMAGE_URL,
      image: DEFAULT_OG_IMAGE_URL,
      description: DEFAULT_SITE_DESCRIPTION,
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
