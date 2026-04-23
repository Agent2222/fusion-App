/**
 * Meta (Facebook) Pixel — fbevents.js and `fbq('init', …)` are loaded from index.html.
 * This module fires standard events; safe no-ops if the script is blocked.
 */

/**
 * @param {string} eventName
 * @param {Record<string, string | number | string[] | boolean | null | undefined>} [params]
 */
export function metaTrack(eventName, params) {
  if (typeof window === "undefined") return;
  const fbq = window.fbq;
  if (typeof fbq !== "function") return;
  if (params && Object.keys(params).length > 0) {
    const cleaned = /** @type {Record<string, unknown>} */ ({});
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      cleaned[k] = v;
    }
    if (Object.keys(cleaned).length > 0) {
      fbq("track", eventName, cleaned);
      return;
    }
  }
  fbq("track", eventName);
}

export function metaTrackPageView() {
  metaTrack("PageView");
}
