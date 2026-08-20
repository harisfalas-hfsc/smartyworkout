const APP_WORKER_PATH = "/sw.js";
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
      const registration = await navigator.serviceWorker.register(APP_WORKER_PATH, { scope: "/" });
      await navigator.serviceWorker.ready;
      window.setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000);
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
  const cache = await caches.open("smarty-pages-v1");
  await Promise.allSettled(
    urls.map(async (url) => {
      const response = await fetch(url, { credentials: "same-origin" });
      if (response.ok && !response.redirected) await cache.put(url, response);
    }),
  );
}