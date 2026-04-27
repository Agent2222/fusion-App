import headerWideLogoUrl from "../assets/Fusion-X-logo-02.png";
import headerSymbolLogoUrl from "../assets/Fusion-X-SymbolLogo.png";

/** Kept in sync with `MOBILE_NAV_MAX_PX` in `header.js` (wordmark vs symbol in bar). */
const MOBILE_NAV_MAX_PX = 1024;

if (typeof document !== "undefined") {
  // Only fetch the bar logo the viewport will show (wide is ~3k px; skip on small screens).
  const add = (href, media) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    link.media = media;
    document.head.appendChild(link);
  };
  add(headerWideLogoUrl, `(min-width: ${MOBILE_NAV_MAX_PX + 1}px)`);
  add(headerSymbolLogoUrl, `(max-width: ${MOBILE_NAV_MAX_PX}px)`);
}
