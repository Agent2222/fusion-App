import posthog from "posthog-js";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

/** @param {string} name */
function readCookie(name) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return "";
}

/**
 * @param {string} fbclid
 * @returns {string}
 */
function buildFbcFromFbclid(fbclid) {
  const id = String(fbclid || "").trim();
  if (!id) return "";
  return `fb.1.${Date.now()}.${id}`;
}

function posthogConfigured() {
  return Boolean(import.meta.env.VITE_PUBLIC_POSTHOG_KEY);
}

/**
 * Persist first-touch UTM and Meta `fbclid` as PostHog super properties so
 * later in-app navigation does not drop query strings from the address bar.
 */
export function registerFusionAttributionFromUrl() {
  if (typeof window === "undefined") return;
  if (!posthogConfigured()) return;
  const params = new URLSearchParams(window.location.search);
  const props = /** @type {Record<string, string>} */ ({});
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) props[k] = v;
  }
  const fb = params.get("fbclid");
  if (fb) {
    props.fbclid = fb;
    props.$initial_fbclid = fb;
    const fbc = buildFbcFromFbclid(fb);
    if (fbc) props.fbc = fbc;
  }
  if (Object.keys(props).length === 0) return;
  try {
    posthog.register_once(props);
    const personProps = /** @type {Record<string, string>} */ ({});
    if (fb) {
      personProps.fbclid = fb;
      personProps.$initial_fbclid = fb;
      if (props.fbc) personProps.fbc = props.fbc;
    }
    if (Object.keys(personProps).length > 0) {
      posthog.setPersonProperties(personProps);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Read Meta `_fbp` / `_fbc` cookies (set after pixel loads) into PostHog person properties.
 * Safe to call on every route change — only updates when values are present.
 */
export function registerFusionMetaCookies() {
  if (typeof window === "undefined") return;
  if (!posthogConfigured()) return;
  const fbp = readCookie("_fbp");
  const fbcCookie = readCookie("_fbc");
  const superProps = /** @type {Record<string, string>} */ ({});
  const personProps = /** @type {Record<string, string>} */ ({});
  if (fbp) {
    superProps.fbp = fbp;
    personProps.fbp = fbp;
  }
  if (fbcCookie) {
    superProps.fbc = fbcCookie;
    personProps.fbc = fbcCookie;
  }
  try {
    if (Object.keys(superProps).length > 0) {
      posthog.register(superProps);
    }
    if (Object.keys(personProps).length > 0) {
      posthog.setPersonProperties(personProps);
    }
  } catch {
    /* ignore */
  }
}

/** URL first-touch attribution + latest Meta cookies (for PostHog → Meta CAPI). */
export function registerFusionAttribution() {
  registerFusionAttributionFromUrl();
  registerFusionMetaCookies();
}
