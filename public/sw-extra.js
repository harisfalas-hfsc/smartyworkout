/* Offline navigation handling for Smarty Workout.
   The app is server-rendered, so there is no single index.html to precache.
   This script warms a cache with the main pages and serves saved pages when
   the device has no connection. */

const PAGE_CACHE = "smarty-pages";
const WARM_PAGES = [
  "/",
  "/how-it-works",
  "/about",
  "/tools",
  "/tools/workout-timer",
  "/tools/rounds-tracker",
  "/tools/1rm-calculator",
  "/exercise-library",
  "/wod",
  "/community",
  "/logbook",
  "/progress",
  "/account",
  "/coach",
];

async function warmPages() {
  try {
    const cache = await caches.open(PAGE_CACHE);
    await Promise.allSettled(
      WARM_PAGES.map(async (url) => {
        const res = await fetch(url, { credentials: "same-origin" });
        if (res && res.ok) await cache.put(url, res.clone());
      }),
    );
  } catch {
    /* best effort */
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(warmPages());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(warmPages());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "WARM_PAGES") event.waitUntil(warmPages());
});

// Network-first page loads with a saved-copy fallback.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/~oauth") || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(url.pathname + url.search, fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        return (
          (await cache.match(url.pathname + url.search)) ||
          (await cache.match(url.pathname)) ||
          (await cache.match("/")) ||
          (await caches.match("/offline.html")) ||
          new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
        );
      }
    })(),
  );
});
