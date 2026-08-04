/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-6d1fb45c'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-512.png",
    "revision": "fbc5e0fda67c4e6400dc1f9deefc4f4b"
  }, {
    "url": "pwa-512-maskable.png",
    "revision": "fbc5e0fda67c4e6400dc1f9deefc4f4b"
  }, {
    "url": "pwa-192.png",
    "revision": "ddff9a1256175d078892befe89ea06e0"
  }, {
    "url": "og-default.png",
    "revision": "455e46a388e1ed8c9f24039bdf98a318"
  }, {
    "url": "manifest.webmanifest",
    "revision": "268070e17a4a96c98b3f48d35eb4edad"
  }, {
    "url": "index.html",
    "revision": "e4dd1799761943b36d42837999102516"
  }, {
    "url": "favicon.ico",
    "revision": "3020841241212772e5977c8f2ccdc6a6"
  }, {
    "url": "artist-card-placeholder.png",
    "revision": "23996429b5f4a05bb2bdbbcd6a5bc376"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "5eca8e07eb89fab95959ed9d385f5647"
  }, {
    "url": "templates/profile.html",
    "revision": "78148622f9adfb54516cb9bc7af055e4"
  }, {
    "url": "templates/home.html",
    "revision": "b8338fda1869c21a891e451423aa2c08"
  }, {
    "url": "templates/context.html",
    "revision": "bb68e5df3ef0d24eae9f0e38f2c96993"
  }, {
    "url": "templates/contact.html",
    "revision": "3fb60d42c3a27cd0ac6679e3b3fda5f1"
  }, {
    "url": "templates/404.html",
    "revision": "a95a3ce81e290638a89e07d66d27fdb4"
  }, {
    "url": "email/Fusion-X-logo-02.png",
    "revision": "455e46a388e1ed8c9f24039bdf98a318"
  }, {
    "url": "email/Fusion-Logo-Sig-1.png",
    "revision": "d64aa3b2566119f1117362a4d8360eb6"
  }, {
    "url": "assets/warning-d449b082.svg",
    "revision": null
  }, {
    "url": "assets/videos-a78eee6c.js",
    "revision": null
  }, {
    "url": "assets/videoPageModel-3fe9d118.js",
    "revision": null
  }, {
    "url": "assets/studioDateFormat-95bfa1d0.js",
    "revision": null
  }, {
    "url": "assets/studioDateFormat-8b5416ce.css",
    "revision": null
  }, {
    "url": "assets/studio-9288f80d.js",
    "revision": null
  }, {
    "url": "assets/studio-787d33bd.css",
    "revision": null
  }, {
    "url": "assets/sparkle-solid-6d249563.svg",
    "revision": null
  }, {
    "url": "assets/settingsProfile-e2ca53ea.js",
    "revision": null
  }, {
    "url": "assets/secure-lock-9c0d6f85.svg",
    "revision": null
  }, {
    "url": "assets/receipt-download-ee91e1a5.svg",
    "revision": null
  }, {
    "url": "assets/programs-ad9699a0.js",
    "revision": null
  }, {
    "url": "assets/programView-eccbdae0.js",
    "revision": null
  }, {
    "url": "assets/programSidebarRunDates-de5d2f88.js",
    "revision": null
  }, {
    "url": "assets/profileSetupSeedLocales-e7f252ec.js",
    "revision": null
  }, {
    "url": "assets/profile-b0244ec4.js",
    "revision": null
  }, {
    "url": "assets/popular-crown-6dc8d234.svg",
    "revision": null
  }, {
    "url": "assets/payments-08af1cce.svg",
    "revision": null
  }, {
    "url": "assets/payment-plan-d3fd375b.svg",
    "revision": null
  }, {
    "url": "assets/payment-card-cee1840f.svg",
    "revision": null
  }, {
    "url": "assets/oh-4-23fc44cb.webp",
    "revision": null
  }, {
    "url": "assets/oh-3-e7b0839f.webp",
    "revision": null
  }, {
    "url": "assets/oh-2-6ebc2ebe.webp",
    "revision": null
  }, {
    "url": "assets/oh-1-b0d2e0e5.webp",
    "revision": null
  }, {
    "url": "assets/notFound-6a37a1cb.js",
    "revision": null
  }, {
    "url": "assets/navPages-82816772.js",
    "revision": null
  }, {
    "url": "assets/my-programs-83f66ba0.svg",
    "revision": null
  }, {
    "url": "assets/member-user-49ed14c8.svg",
    "revision": null
  }, {
    "url": "assets/manual-payment-417bd749.svg",
    "revision": null
  }, {
    "url": "assets/journalEntry-a04a80ba.js",
    "revision": null
  }, {
    "url": "assets/journal-7481cf85.js",
    "revision": null
  }, {
    "url": "assets/joinNetworkPage-8ce59ca2.js",
    "revision": null
  }, {
    "url": "assets/joinNetworkPage-569f2689.css",
    "revision": null
  }, {
    "url": "assets/joinFusion-951b7ccf.js",
    "revision": null
  }, {
    "url": "assets/joinCollageRotate-5239e0b7.js",
    "revision": null
  }, {
    "url": "assets/index-fae11215.js",
    "revision": null
  }, {
    "url": "assets/index-dcd04e76.css",
    "revision": null
  }, {
    "url": "assets/index-9466438f.js",
    "revision": null
  }, {
    "url": "assets/index-6b4053b2.js",
    "revision": null
  }, {
    "url": "assets/index-3a3133d7.js",
    "revision": null
  }, {
    "url": "assets/imageProbe-68423845.js",
    "revision": null
  }, {
    "url": "assets/ic-nav-users-7aa702f7.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-team-10d45c4d.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-subscribers-93b862be.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-status-975bfc50.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-sound-0d5b34d9.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-settings-0d10a34f.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-services-79ba808e.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-programs-1d79594d.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-products-966ff50c.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-permissions-47f79981.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-journal-bed212cc.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-home-85568cda.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-gallery-access-e53e0171.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-galleries-f1f504e5.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-email-2e3d974b.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-curators-567df97c.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-content-60c689df.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-community-4c1b8191.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-collectors-3cf435cb.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-artists-ea112a00.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-applicants-2c336bee.svg",
    "revision": null
  }, {
    "url": "assets/ic-nav-ai-581406d9.svg",
    "revision": null
  }, {
    "url": "assets/ic-group-overview-73747b84.svg",
    "revision": null
  }, {
    "url": "assets/ic-group-operations-8a164b2e.svg",
    "revision": null
  }, {
    "url": "assets/ic-group-content-4ded26ac.svg",
    "revision": null
  }, {
    "url": "assets/ic-group-admin-0e38307e.svg",
    "revision": null
  }, {
    "url": "assets/ic-group-accounts-c3937b5c.svg",
    "revision": null
  }, {
    "url": "assets/ic-assist-translate-36145168.svg",
    "revision": null
  }, {
    "url": "assets/ic-assist-save-draft-da7faa9f.svg",
    "revision": null
  }, {
    "url": "assets/ic-assist-replace-input-ac30b046.svg",
    "revision": null
  }, {
    "url": "assets/ic-assist-refine-e0d0930a.svg",
    "revision": null
  }, {
    "url": "assets/ic-assist-profile-a4125f68.svg",
    "revision": null
  }, {
    "url": "assets/ic-assist-guide-eb496021.svg",
    "revision": null
  }, {
    "url": "assets/ic-assist-generate-93ba7e3e.svg",
    "revision": null
  }, {
    "url": "assets/ic-assist-copy-3f13eedd.svg",
    "revision": null
  }, {
    "url": "assets/ic-assist-context-acfe2e5a.svg",
    "revision": null
  }, {
    "url": "assets/ic-assist-apply-field-d073475b.svg",
    "revision": null
  }, {
    "url": "assets/ic-artist-visibility-09323cc1.svg",
    "revision": null
  }, {
    "url": "assets/ic-artist-system-info-c3e43081.svg",
    "revision": null
  }, {
    "url": "assets/ic-artist-save-79ba034d.svg",
    "revision": null
  }, {
    "url": "assets/ic-artist-quick-actions-f1d60ed6.svg",
    "revision": null
  }, {
    "url": "assets/ic-artist-profile-link-4675e412.svg",
    "revision": null
  }, {
    "url": "assets/ic-artist-overview-237940df.svg",
    "revision": null
  }, {
    "url": "assets/ic-artist-identity-289bfcde.svg",
    "revision": null
  }, {
    "url": "assets/ic-artist-delete-abf41b51.svg",
    "revision": null
  }, {
    "url": "assets/ic-artist-cancel-1ffacbe9.svg",
    "revision": null
  }, {
    "url": "assets/home-fc1d1e3f.js",
    "revision": null
  }, {
    "url": "assets/gallery-access-d5acaa97.js",
    "revision": null
  }, {
    "url": "assets/fusion-curved-window-mask-3b41b97c.svg",
    "revision": null
  }, {
    "url": "assets/flight-icon-a8cccfa4.png",
    "revision": null
  }, {
    "url": "assets/favicon-0bbb999b.ico",
    "revision": null
  }, {
    "url": "assets/explore-programs-3becc4f9.svg",
    "revision": null
  }, {
    "url": "assets/event-4859bd82.js",
    "revision": null
  }, {
    "url": "assets/editions-86c5d038.js",
    "revision": null
  }, {
    "url": "assets/editionView-7b034a21.js",
    "revision": null
  }, {
    "url": "assets/databaseSnapshotJson-ed5efc5d.js",
    "revision": null
  }, {
    "url": "assets/context-34c1478e.js",
    "revision": null
  }, {
    "url": "assets/contact-b3312608.js",
    "revision": null
  }, {
    "url": "assets/communityPageDefaults-d45ebc76.js",
    "revision": null
  }, {
    "url": "assets/community-8b10b37b.js",
    "revision": null
  }, {
    "url": "assets/calendar-slots-e9ac9b65.svg",
    "revision": null
  }, {
    "url": "assets/benefit-check-1d8548b7.svg",
    "revision": null
  }, {
    "url": "assets/artists-24738b5e.js",
    "revision": null
  }, {
    "url": "assets/annual-diamond-d24a5692.svg",
    "revision": null
  }, {
    "url": "assets/Fusion-X-logo-03-53ecd82a.png",
    "revision": null
  }, {
    "url": "assets/Fusion-X-logo-02-286ef85b.png",
    "revision": null
  }, {
    "url": "assets/Fusion-X-SymbolLogo-a35138a5.png",
    "revision": null
  }, {
    "url": "assets/Fusion-X-SymbolLogo-2-81c5a480.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "5eca8e07eb89fab95959ed9d385f5647"
  }, {
    "url": "favicon.ico",
    "revision": "3020841241212772e5977c8f2ccdc6a6"
  }, {
    "url": "pwa-192.png",
    "revision": "ddff9a1256175d078892befe89ea06e0"
  }, {
    "url": "pwa-512-maskable.png",
    "revision": "fbc5e0fda67c4e6400dc1f9deefc4f4b"
  }, {
    "url": "pwa-512.png",
    "revision": "fbc5e0fda67c4e6400dc1f9deefc4f4b"
  }, {
    "url": "manifest.webmanifest",
    "revision": "268070e17a4a96c98b3f48d35eb4edad"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
