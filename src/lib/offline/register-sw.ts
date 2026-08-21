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
      const response = await fetch(url, { credentials: "same-origin", cache: "reload" });
      if (response.ok && !response.redirected) await cache.put(url, response);
    }),
  );
}

/** Fingerprint of the app files the page is currently running. */
function runningBuildStamp(): string {
  if (typeof document === "undefined") return "";
  return [...document.querySelectorAll<HTMLScriptElement>("script[src]")]
    .map((script) => script.getAttribute("src") ?? "")
    .filter((src) => src.includes("/assets/") || src.includes("/_build/"))
    .sort()
    .join("|");
}

function buildStampFromHtml(html: string): string {
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
    .map((match) => match[1] ?? "")
    .filter((src) => src.includes("/assets/") || src.includes("/_build/"))
    .sort()
    .join("|");
}

const UPDATE_RELOAD_GUARD = "smarty:build-reload";
let updateCheckRunning = false;

/**
 * Makes a published release land on every device by itself.
 *
 * The app compares the files it is running with the files the server is
 * serving right now. When they differ, saved pages are dropped, the worker is
 * replaced and the app reloads once — which is also what the phone apps do,
 * since they display exactly this web app inside their own window.
 */
export async function checkForAppUpdate(): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.onLine || updateCheckRunning) return false;
  updateCheckRunning = true;
  try {
    const current = runningBuildStamp();
    if (!current) return false;
    const response = await fetch(`/?_=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { "cache-control": "no-cache" },
    });
    if (!response.ok) return false;
    const latest = buildStampFromHtml(await response.text());
    if (!latest || latest === current) {
      sessionStorage.removeItem(UPDATE_RELOAD_GUARD);
      return false;
    }
    if (sessionStorage.getItem(UPDATE_RELOAD_GUARD) === "1") return false;
    sessionStorage.setItem(UPDATE_RELOAD_GUARD, "1");

    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.allSettled(
        names.filter((name) => name.startsWith("smarty-pages")).map((name) => caches.delete(name)),
      );
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(
        registrations.map(async (registration) => {
          await registration.update().catch(() => undefined);
          registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        }),
      );
    }
    window.location.reload();
    return true;
  } catch {
    return false;
  } finally {
    updateCheckRunning = false;
  }
}

/** Runs the release check at start, on every return to the app and hourly. */
export function watchForAppUpdates(): void {
  if (typeof window === "undefined") return;
  const run = () => void checkForAppUpdate();
  run();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") run();
  });
  window.addEventListener("online", run);
  window.setInterval(run, 30 * 60 * 1000);
}
