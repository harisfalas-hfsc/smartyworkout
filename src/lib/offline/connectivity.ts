/**
 * Single source of truth for connectivity, for BOTH the website/PWA and the
 * native (Capacitor) app.
 *
 * Why this exists: inside a native WebView `navigator.onLine` is unreliable —
 * it can report `true` while the device has no route to the internet, which is
 * exactly how a native build ends up showing a blank "ERR_INTERNET_DISCONNECTED"
 * page. When the app runs inside Capacitor we use the native Network plugin
 * (exposed on `window.Capacitor.Plugins.Network`) and fall back to the browser
 * events everywhere else.
 *
 * No npm dependency is required: the plugin is read off the injected global, so
 * the same bundle works in the browser, the PWA and the native shell.
 */

type Listener = (online: boolean) => void;

type NetworkStatus = { connected: boolean };
type NetworkPlugin = {
  getStatus: () => Promise<NetworkStatus>;
  addListener: (
    event: "networkStatusChange",
    cb: (status: NetworkStatus) => void,
  ) => Promise<{ remove: () => void }> | { remove: () => void };
};

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: { Network?: NetworkPlugin };
};

function cap(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True when running inside the iOS/Android native shell. */
export function isNativeApp(): boolean {
  const c = cap();
  return Boolean(c?.isNativePlatform?.());
}

export function nativePlatform(): "ios" | "android" | "web" {
  const p = cap()?.getPlatform?.();
  return p === "ios" || p === "android" ? p : "web";
}

let current = true;
const listeners = new Set<Listener>();
let started = false;

function emit(next: boolean) {
  if (next === current) return;
  current = next;
  listeners.forEach((l) => {
    try {
      l(next);
    } catch {
      /* a broken listener must never break connectivity */
    }
  });
}

/** Last known connectivity. Safe to call during render. */
export function isOnline(): boolean {
  if (!started && typeof window !== "undefined") initConnectivity();
  return current;
}

/** Starts the listeners once (idempotent). Called from the app root. */
export function initConnectivity(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  current = typeof navigator === "undefined" ? true : navigator.onLine !== false;

  window.addEventListener("online", () => emit(true));
  window.addEventListener("offline", () => emit(false));

  const network = cap()?.Plugins?.Network;
  if (network) {
    void Promise.resolve(network.getStatus())
      .then((s) => emit(Boolean(s?.connected)))
      .catch(() => {
        /* keep browser value */
      });
    try {
      void network.addListener("networkStatusChange", (s) => emit(Boolean(s?.connected)));
    } catch {
      /* keep browser value */
    }
  }
}

/** Subscribes to connectivity changes; returns an unsubscribe function. */
export function subscribeConnectivity(listener: Listener): () => void {
  initConnectivity();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
