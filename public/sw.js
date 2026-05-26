/**
 * Meridian Service Worker — Beta / Development
 *
 * Network-first, no aggressive caching.
 * During active testing, stale caches cause more harm than benefit.
 * This SW exists solely to enable PWA install + minimal lifecycle.
 */

self.addEventListener("install", () => {
  console.log("[PWA] sw installed — skipping waiting");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[PWA] sw activated — clearing all caches");
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => {
        console.log("[PWA] deleting cache:", name);
        return caches.delete(name);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Network-first: never serve cached responses during beta
self.addEventListener("fetch", () => {
  // No-op — let all requests go to network
});
