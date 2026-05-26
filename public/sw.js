/**
 * Meridian Service Worker
 *
 * Minimal SW focused on enabling the PWA update flow.
 * Does NOT aggressively cache — lets Next.js handle its own caching.
 * Primary job: install, activate, and support skipWaiting for update prompts.
 */

const CACHE_NAME = "meridian-v1";

self.addEventListener("install", (event) => {
  console.log("[PWA UPDATE] service worker installed");
  // Don't call skipWaiting here — let the client control when to activate
});

self.addEventListener("activate", (event) => {
  console.log("[PWA UPDATE] service worker activated");
  // Clear any old caches from previous versions
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[PWA UPDATE] clearing old cache:", name);
            return caches.delete(name);
          })
      )
    )
  );
});

// Listen for skip-waiting message from the client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[PWA UPDATE] skip waiting accepted, activating new worker");
    self.skipWaiting();
  }
});

// Network-first fetch: don't serve stale content
self.addEventListener("fetch", (event) => {
  // Let all requests go to the network normally
  // This prevents the SW from caching stale HTML/JS
});
