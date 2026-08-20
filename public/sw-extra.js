/* Offline navigation helper for Smarty Workout.
   The app is server-rendered, so there is no single index.html to precache.
   This script warms a cache with the main pages and — critically — purges any
   poisoned page cache left behind by older service worker versions (where the
   offline fallback page had been stored as a normal page). */

const PAGE_CACHE = "smarty-pages";
// Bump this whenever cached pages may be poisoned; the activate handler wipes
// the page cache once per new value.
const PAGE_CACHE_EPOCH = "2026-08-20-a";
const EPOCH_KEY = "/__smarty_page_cache_epoch";

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

async function purgeStalePages() {
  try {
    const cache = await caches.open(PAGE_CACHE);
    const stamp = await cache.match(EPOCH_KEY);
    const current = stamp ? await stamp.text() : "";
    if (current === PAGE_CACHE_EPOCH) return;
    await caches.delete(PAGE_CACHE);
    const fresh = await caches.open(PAGE_CACHE);
    await fresh.put(EPOCH_KEY, new Response(PAGE_CACHE_EPOCH));
  } catch {
    /* best effort */
  }
}

async function warmPages() {
  try {
    const cache = await caches.open(PAGE_CACHE);
    await Promise.allSettled(
      WARM_PAGES.map(async (url) => {
        const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
        if (!res || !res.ok) return;
        const copy = res.clone();
        const body = await copy.text();
        // Never store the offline fallback as if it were a real page.
        if (body.includes("data-smarty-offline-page")) return;
        await cache.put(url, res);
      }),
    );
  } catch {
    /* best effort */
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await purgeStalePages();
      await self.clients.claim();
      await warmPages();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "WARM_PAGES") event.waitUntil(warmPages());
});
