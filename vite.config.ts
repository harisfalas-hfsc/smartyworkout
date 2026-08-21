// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

const APP_BUILD_ID = `${Date.now()}`;

// Routes are real HTML responses, not fingerprinted assets. Giving every
// production build a new revision prevents an installed phone from retaining
// HTML that points at JavaScript or CSS files from an older deployment.
const APP_SHELL_REVISION = new Date().toISOString();

// Stable pages are warmed into the runtime page cache after load
// (see src/lib/offline/register-sw.ts), never precached under their real URL.

export default defineConfig({
  vite: {
    plugins: [
      {
        name: "smarty-build-version",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "build-version.json",
            source: JSON.stringify({ buildId: APP_BUILD_ID }),
          });
        },
      },
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        strategies: "generateSW",
        filename: "sw.js",
        // TanStack Start publishes browser files from dist/client. Without this,
        // an installed phone can have a manifest but no usable /sw.js shell.
        outDir: "dist/client",
        includeAssets: [
          "favicon.ico",
          "favicon.png",
          "apple-touch-icon.png",
          "icon-192.png",
          "icon-512.png",
        ],
        manifest: false,
        devOptions: { enabled: false },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          importScripts: ["/sw-extra.js"],
          // No page URL is precached under its real address: a precached page is
          // served cache-first, which is exactly what made phones keep showing an
          // old published version. Only a hidden shell copy is stored, used as a
          // last resort when the device is offline.
          additionalManifestEntries: [{ url: "/?shell=1", revision: APP_SHELL_REVISION }],
          // Keep the install shell lean. Images are cached on demand by the
          // runtime rule below, avoiding failures from oversized media files.
          globPatterns: ["**/*.{js,css,svg,ico,woff,woff2}"],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "smarty-pages-v3",
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ request, url }) =>
                url.origin === globalThis.location.origin &&
                ["script", "style", "font"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "smarty-assets-v1",
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === "image",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "smarty-media-v1",
                cacheableResponse: { statuses: [0, 200] },
                // Room for the whole exercise library plus icons, so prefetched
                // demonstration images are never evicted before going offline.
                expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 60 },
              },
            },
          ],
        },
      }),
    ],
    define: {
      __APP_BUILD_ID__: JSON.stringify(APP_BUILD_ID),
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
