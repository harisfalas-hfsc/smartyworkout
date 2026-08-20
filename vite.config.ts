// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Stable pages are installed with the app shell so they open directly without
// a connection. Member data is warmed separately after authentication.
const OFFLINE_PUBLIC_ROUTES = [
  "/",
  "/about",
  "/how-it-works",
  "/pricing",
  "/faq",
  "/founder-note",
  "/haris-falas",
  "/exercise-library",
  "/tools",
  "/tools/1rm-calculator",
  "/tools/rounds-tracker",
  "/tools/workout-timer",
  "/glossary",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/auth",
];

export default defineConfig({
  vite: {
    plugins: [
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
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/api\//, /^\/~oauth(?:\/|$)/, /^\/lovable\//],
          additionalManifestEntries: OFFLINE_PUBLIC_ROUTES.map((url) => ({
            url,
            revision: null,
          })),
          // Keep the install shell lean. Images are cached on demand by the
          // runtime rule below, avoiding failures from oversized media files.
          globPatterns: ["**/*.{js,css,html,svg,ico,woff,woff2}"],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "smarty-pages-v1",
                networkTimeoutSeconds: 5,
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
                expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
