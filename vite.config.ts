// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  plugins: [
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      devOptions: { enabled: false },
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // The app is server-rendered: there is no index.html to fall back to.
        // Navigations are handled by public/sw-extra.js instead.
        importScripts: ["/sw-extra.js"],
        // NOTE: no navigateFallback here. A global navigation fallback route
        // hijacks every navigation (even online) and renders the offline page.
        // The offline page is served only when the network actually fails,
        // via the handlerDidError plugin on the navigation route below.

        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // The client build is output to dist/client, but the public site serves
        // those files from root (/assets/...). Strip the private "client/" prefix
        // so the precache URLs match the URLs the browser actually requests.
        manifestTransforms: [
          async (manifest) => {
            for (const entry of manifest) {
              if (entry.url.startsWith("client/")) {
                entry.url = entry.url.slice("client/".length);
              }
              if (!entry.url.startsWith("/")) entry.url = `/${entry.url}`;
            }
            return { manifest, warnings: [] };
          },
        ],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.mode === "navigate" &&
              !url.pathname.startsWith("/~oauth") &&
              !url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "smarty-pages",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // JS/CSS chunks: cache first so the app shell works offline.
            urlPattern: ({ url }) => /\.(?:js|css)$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "smarty-assets",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          {
            // Exercise demo images / GIFs (signed storage URLs).
            urlPattern: ({ request, url }) =>
              request.destination === "image" || /\/storage\/v1\/object\//.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "smarty-media",
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => /\.(?:woff2?|ttf|otf)$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "smarty-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});
