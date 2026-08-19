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

// Navigation requests are owned by Workbox's NetworkFirst route. Keeping a
// single responder avoids competing fetch handlers while this file focuses on
// warming the same page cache in advance.
