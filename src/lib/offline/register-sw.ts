import { registerSW } from "virtual:pwa-register";

const APP_WORKER_PATH = "/sw.js";

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
export async function registerAppServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const disabled =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isLovablePreviewHost(window.location.hostname) ||
    new URLSearchParams(window.location.search).get("sw") === "off";

  if (disabled) {
    await unregisterAppWorkers();
    return;
  }

  const update = registerSW({ immediate: true });
  await navigator.serviceWorker.ready;
  await update(true);
}