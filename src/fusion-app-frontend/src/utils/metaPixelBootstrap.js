/**
 * Meta Pixel bootstrap (bundled in main entry — CSP + no separate asset).
 * Use `window.fbq` for init: bare `fbq` is not valid in ESM.
 * @see https://developers.facebook.com/docs/meta-pixel
 */
if (typeof window === "undefined") {
  // noop (tests / SSR)
} else {
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js"
  );
  if (typeof window.fbq === "function") {
    window.fbq("init", "1281327974121956");
  }
}
