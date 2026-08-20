/*
 * One-release cleanup worker for the previously cached Smarty Workout PWA.
 * Returning phones request this at the same /sw.js URL, allowing us to remove
 * the poisoned navigation caches before unregistering the old app worker.
 */
const SMARTY_CACHE_PREFIXES = [
  "smarty-pages",
  "smarty-assets",
  "smarty-media",
  "smarty-fonts",
  "workbox-precache",
  "workbox-runtime",
];

function belongsToSmartyWorkout(cacheName) {
  return SMARTY_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix));
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const appCacheNames = cacheNames.filter(belongsToSmartyWorkout);
        await Promise.allSettled(appCacheNames.map((name) => caches.delete(name)));
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(clients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});