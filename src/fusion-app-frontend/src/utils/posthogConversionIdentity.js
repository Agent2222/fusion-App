import posthog from "posthog-js";
import { getStoredBillingEmailForPrincipal } from "./integrationApi.js";
import { getProfileSetupDraft } from "./profileSetupDraft.js";

function posthogConfigured() {
  return Boolean(import.meta.env.VITE_PUBLIC_POSTHOG_KEY);
}

/**
 * @param {unknown} email
 * @returns {string}
 */
export function normalizeConversionEmail(email) {
  const em = String(email ?? "").trim().toLowerCase();
  return em.includes("@") ? em : "";
}

/**
 * @param {unknown} s
 * @returns {string}
 */
function cleanName(s) {
  return String(s ?? "").trim();
}

/**
 * @param {{ email?: unknown, firstName?: unknown, lastName?: unknown, principal?: unknown }} opts
 * @returns {{ email: string, first_name: string, last_name: string }}
 */
function resolvePersonProps(opts) {
  let email = normalizeConversionEmail(opts.email);
  const first_name = cleanName(opts.firstName);
  const last_name = cleanName(opts.lastName);
  const principal = String(opts.principal ?? "").trim();

  if (!email && principal) {
    email = normalizeConversionEmail(getStoredBillingEmailForPrincipal(principal));
  }
  if (!email) {
    const draft = getProfileSetupDraft();
    email = normalizeConversionEmail(draft?.email);
  }

  return { email, first_name, last_name };
}

/**
 * Sync email/name onto the PostHog person profile for Meta CAPI matching.
 * Pre-login pay-first: identifies by normalized email. With principal: identifies by principal.
 * PII stays on the person profile — not in capture() events.
 *
 * @param {{ email?: unknown, firstName?: unknown, lastName?: unknown, principal?: unknown }} opts
 */
export function syncPosthogConversionPerson(opts = {}) {
  if (!posthogConfigured()) return;
  const { email, first_name, last_name } = resolvePersonProps(opts);
  const principal = String(opts.principal ?? "").trim();

  const personProps = /** @type {Record<string, string>} */ ({});
  if (email) personProps.email = email;
  if (first_name) personProps.first_name = first_name;
  if (last_name) personProps.last_name = last_name;

  if (Object.keys(personProps).length === 0) return;

  try {
    if (principal) {
      posthog.identify(principal, personProps);
      return;
    }
    if (email) {
      posthog.identify(email, personProps);
    }
  } catch {
    /* ignore */
  }
}

/**
 * After Internet Identity login: link pay-first email distinct_id to principal and enrich person.
 *
 * @param {string} principalText
 * @param {{ email?: unknown, firstName?: unknown, lastName?: unknown }} [opts]
 */
export function identifyPosthogAfterInternetIdentityLogin(principalText, opts = {}) {
  if (!posthogConfigured()) return;
  const principal = String(principalText || "").trim();
  if (!principal) return;

  const priorDistinctId = (() => {
    try {
      return String(posthog.get_distinct_id() || "").trim();
    } catch {
      return "";
    }
  })();

  const { email, first_name, last_name } = resolvePersonProps({
    ...opts,
    principal,
  });

  const personProps = /** @type {Record<string, string>} */ ({});
  if (email) personProps.email = email;
  if (first_name) personProps.first_name = first_name;
  if (last_name) personProps.last_name = last_name;

  try {
    if (
      priorDistinctId &&
      priorDistinctId !== principal &&
      (priorDistinctId.includes("@") || priorDistinctId.length > 0)
    ) {
      posthog.alias(principal, priorDistinctId);
    }
    posthog.identify(principal, personProps);
  } catch {
    /* ignore */
  }
}

/**
 * Re-identify returning II sessions on app boot (person props + billing email hint).
 *
 * @param {string} principalText
 */
export function identifyPosthogOnSessionRestore(principalText) {
  identifyPosthogAfterInternetIdentityLogin(principalText, {});
}
