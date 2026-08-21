/* eslint-disable no-undef */
/**
 * Extra service-worker behaviour imported by the generated worker.
 *
 * The generated worker is network-first for page loads, so an online device
 * always receives the freshly published version. This file only supplies the
 * last-resort offline shell when neither the network nor a saved page exists
 * (for example a dynamic /workout/:id URL opened in airplane mode).
 */
const SHELL_URL = "/?shell=1";
const PAGE_CACHE = "smarty-pages-v3";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

if (self.workbox && self.workbox.routing && self.workbox.precaching) {
  self.workbox.routing.setCatchHandler(async ({ request }) => {
    if (request.mode !== "navigate") return Response.error();
    const pages = await caches.open(PAGE_CACHE);
    const saved = (await pages.match(request, { ignoreSearch: true })) || (await pages.match("/"));
    if (saved) return saved;
    const shell = await self.workbox.precaching.matchPrecache(SHELL_URL);
    return shell || Response.error();
  });
}
