// Service worker: lets the app open with no network, and keeps the Firebase SDK cached.
// Bump CACHE when you deploy changes to the app files, so devices pick up the new version.
const CACHE = "stfb-poc-v1";
const SHELL = [
  "./",
  "index.html",
  "app.js",
  "config.js",
  "store-firestore.js",
  "styles.css",
  "manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Firebase sign-in handler lives on the same origin under /__/ and must never be cached.
  if (url.origin === self.location.origin && !url.pathname.startsWith("/__/")) {
    // App files: network first (so updates arrive), cache when offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("index.html")))
    );
    return;
  }

  // Firebase SDK files from Google's CDN: cache first, they are versioned and do not change.
  if (url.hostname === "www.gstatic.com") {
    event.respondWith(
      caches.match(req).then(
        (m) =>
          m ||
          fetch(req).then((res) => {
            caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          })
      )
    );
  }
});
