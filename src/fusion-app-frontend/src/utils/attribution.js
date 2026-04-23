import posthog from "posthog-js";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

/**
 * Persist first-touch UTM and Meta `fbclid` as PostHog super properties so
 * later in-app navigation does not drop query strings from the address bar.
 */
export function registerFusionAttributionFromUrl() {
  if (typeof window === "undefined") return;
  if (!import.meta.env.VITE_PUBLIC_POSTHOG_KEY) return;
  const params = new URLSearchParams(window.location.search);
  const props = /** @type {Record<string, string>} */ ({});
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) props[k] = v;
  }
  const fb = params.get("fbclid");
  if (fb) props.fbclid = fb;
  if (Object.keys(props).length === 0) return;
  try {
    posthog.register_once(props);
  } catch {
    /* ignore */
  }
}
