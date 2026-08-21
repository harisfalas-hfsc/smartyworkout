const APP_WORKER_PATH = "/sw.js";
const PAGE_CACHE_NAME = "smarty-pages-v3";
const RELOAD_GUARD = "smarty:sw-controller-reload";
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export const OFFLINE_PUBLIC_ROUTES = [
  "/",
  "/about",
  "/how-it-works",
  "/pricing",
  "/faq",
  "/contact",
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
  "/community",
  "/community/workouts",
  "/wod",
  "/training",
  "/auth",
];

export const OFFLINE_MEMBER_ROUTES = ["/logbook", "/profile", "/account", "/inbox", "/coach"];

function isLovablePreviewHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((registration) => {
        const script = registration.active?.scriptURL ?? registration.waiting?.scriptURL ?? "";
        return script.endsWith(APP_WORKER_PATH) || registration.scope === `${window.location.origin}/`;
      })
      .map((registration) => registration.unregister()),
  );
}

/** Installs the one app-shell worker in production and removes it everywhere else. */
export function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registrationPromise) return registrationPromise;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  const disabled =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isLovablePreviewHost(window.location.hostname) ||
    new URLSearchParams(window.location.search).get("sw") === "off";

  if (disabled) {
    registrationPromise = unregisterAppWorkers().then(() => null).catch(() => null);
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing || sessionStorage.getItem(RELOAD_GUARD) === "1") return;
        refreshing = true;
        sessionStorage.setItem(RELOAD_GUARD, "1");
        window.location.reload();
      });

      const registration = await navigator.serviceWorker.register(APP_WORKER_PATH, {
        scope: "/",
        // Never let the browser HTTP cache answer the worker request, otherwise a
        // phone can keep re-installing yesterday's worker and never see the update.
        updateViaCache: "none",
      });
      await navigator.serviceWorker.ready;

      const checkForUpdate = () => {
        if (!navigator.onLine) return;
        registration.update().catch(() => undefined);
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      };

      await registration.update();
      sessionStorage.removeItem(RELOAD_GUARD);

      // A published update must land on its own: on every return to the app, on
      // every reconnection, and on a short timer while the app stays open.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
      window.addEventListener("focus", checkForUpdate);
      window.addEventListener("online", checkForUpdate);
      window.setInterval(checkForUpdate, 15 * 60 * 1000);
      return registration;
    } catch {
      return null;
    }
  })();
  return registrationPromise;
}

/** Saves rendered route responses so direct navigation also works offline. */
export async function warmOfflineRoutes(urls: string[]): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const cache = await caches.open(PAGE_CACHE_NAME);
  await Promise.allSettled(
    urls.map(async (url) => {
      const response = await fetch(url, { credentials: "same-origin" });
      if (response.ok && !response.redirected) await cache.put(url, response);
    }),
  );
}