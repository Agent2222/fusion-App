import "./components/subComponents/page-transition.js";
import { router } from "./router.js";
import { DEV_MODE } from "./config.js";
import "./index.css";
import posthog from "posthog-js";

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
});
import faviconUrl from "./assets/favicon.ico";
import "./assets/momochidori VF.js";

const faviconLink =
  typeof document !== "undefined"
    ? document.querySelector('link[rel="icon"]')
    : null;
if (faviconLink) faviconLink.href = faviconUrl;
// Import and register custom elements
import "./components/shared/header.js";
import "./components/shared/footer.js";
import "./components/shared/loadscreen.js";
import "./components/shared/feed-filter.js";

// Subcomponents
import "./components/subComponents/program-hero.js";
import "./components/subComponents/coming-up.js";
import "./components/subComponents/featured-artist.js";
import "./components/subComponents/shout-headline.js";
import "./components/subComponents/objects-highlight.js";
import "./components/subComponents/gallery-access-cta.js";
import "./components/subComponents/info.js";
import "./components/subComponents/eventRow.js";
import "./components/subComponents/featuresRow.js";
import "./components/subComponents/program-offering-cards.js";
import "./components/subComponents/staffFeed.js";
import "./components/subComponents/extendedNetworkFeed.js";
import "./components/subComponents/objects-highlight.js";
import "./components/subComponents/journal-hero.js";
import "./components/subComponents/confirmed-artists-feed.js";
import "./components/subComponents/program-details.js";
import "./components/subComponents/program-fade-gallery.js";
import "./components/subComponents/program-strip-gallery.js";
import "./components/subComponents/application-form.js";
import "./components/subComponents/journalRow.js";
import "./components/subComponents/quoteRow.js";
import "./components/subComponents/audioRow.js";
import "./components/subComponents/joinNetwork.js";
import "./components/subComponents/signInModal.js";
import { initIcAuth } from "./utils/icAuth.js";
/** Warm Stripe.js so the join-network payment step does not wait on first dynamic import. */
void import("@stripe/stripe-js");

void initIcAuth().catch(() => {});
import "./components/subComponents/artistsFeed.js";
import "./components/subComponents/artistsGAFeed.js";
import "./components/subComponents/program-block.js";
import "./components/subComponents/editionsFeed.js";
import "./components/subComponents/veteranBanner.js";

const LOCALE_STORAGE_KEY = "fusion-locale";

const readInitialLocale = () => {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === "ja" || saved === "en") return saved;
  } catch (_) {
    /* ignore */
  }
  return "en";
};

const applyLocaleToDocument = (locale) => {
  document.documentElement.lang = locale;
  document.documentElement.setAttribute("data-locale", locale);
};

window.locale = readInitialLocale();
window.setLocale = (locale) => {
  const next = locale === "ja" ? "ja" : "en";
  const prev = window.locale;
  window.locale = next;
  applyLocaleToDocument(next);
  if (prev !== next) {
    posthog.capture("locale_changed", { locale: next, previous_locale: prev });
  }
};
window.getLocale = () => window.locale;
applyLocaleToDocument(window.locale);

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  if (DEV_MODE) console.log("Application initialized");

  // Fonts: Typekit + document.fonts.ready, then set `fonts-ready` (diagnostics / future use).
  // Capped wait so a hung Typekit never blocks this flag forever; enter is not gated on fonts (loadscreen.js).
  (async () => {
    const FONT_READY_MAX_MS = 4000;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const loadFonts = async () => {
      try {
        if (window.Typekit && window.Typekit.load) {
          if (!window.__typekitPromise)
            window.__typekitPromise = window.Typekit.load();
          await window.__typekitPromise;
        }
      } catch (e) {
        /* ignore */
      }
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      } catch (e) {
        /* ignore */
      }
    };

    await Promise.race([loadFonts(), sleep(FONT_READY_MAX_MS)]);

    const ls = document.querySelector("app-loadscreen");
    if (ls) ls.setAttribute("fonts-ready", "true");
  })();

  // Listen for route changes
  window.addEventListener("routeChange", (event) => {
    if (DEV_MODE) console.log("Route changed to:", event.detail.path);
    // Add any global route change logic here
    posthog.capture("$pageview", { $current_url: window.location.href });
  });

  window.addEventListener("fusion-localechange", () => {
    // Re-run current route so page-level copy reflects the new locale immediately.
    if (router && typeof router.handleRoute === "function") {
      router.handleRoute();
    }
  });
});

// Export for use in other modules
export { router };
