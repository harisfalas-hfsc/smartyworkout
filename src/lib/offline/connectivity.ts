/**
 * Single source of truth for connectivity, for the website, the PWA and the
 * native (Capacitor) app.
 *
 * Why this exists: `navigator.onLine` only reports whether the device thinks it
 * has a network interface. Inside a native WebView it can report `true` with no
 * route to the internet, and on a flaky network it reports `true` while the
 * backend is unreachable. This module combines three signals:
 *
 *   1. browser `online` / `offline` events
 *   2. the native Capacitor Network plugin (read off the injected global, so no
 *      npm dependency and the same bundle works everywhere)
 *   3. a real reachability probe against our own backend (`/api/public/health`)
 *
 * and exposes ONE derived state that the whole app reads.
 */

export type ConnectivityState =
  /** Device reports no network at all. */
  | "offline"
  /** Device has a network, but our backend did not answer. */
  | "backend-unreachable"
  /** Everything reachable. */
  | "online";

type Listener = (online: boolean) => void;
type StateListener = (state: ConnectivityState) => void;

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

const HEALTH_URL = "/api/public/health";
const PROBE_TIMEOUT_MS = 6000;
/** How often we re-probe while we believe we are cut off. */
const RECOVERY_INTERVAL_MS = 15000;

function cap(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True when running inside the iOS/Android native shell. */
export function isNativeApp(): boolean {
  return Boolean(cap()?.isNativePlatform?.());
}

export function nativePlatform(): "ios" | "android" | "web" {
  const p = cap()?.getPlatform?.();
  return p === "ios" || p === "android" ? p : "web";
}

let deviceOnline = true;
let state: ConnectivityState = "online";
let lastProbeAt = 0;
let lastProbeOk: boolean | null = null;
let probing: Promise<boolean> | null = null;
let recoveryTimer: ReturnType<typeof setInterval> | undefined;

const listeners = new Set<Listener>();
const stateListeners = new Set<StateListener>();
let started = false;

function publish(next: ConnectivityState) {
  if (next === state) return;
  const wasOnline = state === "online";
  state = next;
  const nowOnline = next === "online";
  stateListeners.forEach((l) => {
    try {
      l(next);
    } catch {
      /* a broken listener must never break connectivity */
    }
  });
  if (wasOnline !== nowOnline) {
    listeners.forEach((l) => {
      try {
        l(nowOnline);
      } catch {
        /* ignore */
      }
    });
  }
  manageRecoveryTimer();
}

function derive() {
  if (!deviceOnline) {
    publish("offline");
    return;
  }
  publish(lastProbeOk === false ? "backend-unreachable" : "online");
}

function manageRecoveryTimer() {
  if (typeof window === "undefined") return;
  const needed = state !== "online";
  if (needed && !recoveryTimer) {
    recoveryTimer = setInterval(() => void probeBackend(true), RECOVERY_INTERVAL_MS);
  } else if (!needed && recoveryTimer) {
    clearInterval(recoveryTimer);
    recoveryTimer = undefined;
  }
}

/**
 * Asks the backend whether it is actually reachable. Deduplicated and cheap:
 * repeated calls inside 5s reuse the previous answer unless `force` is set.
 */
export async function probeBackend(force = false): Promise<boolean> {
  if (typeof window === "undefined") return true;
  if (!deviceOnline) {
    lastProbeOk = false;
    derive();
    return false;
  }
  if (!force && Date.now() - lastProbeAt < 5000 && lastProbeOk !== null) return lastProbeOk;
  if (probing) return probing;

  probing = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const res = await fetch(`${HEALTH_URL}?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      lastProbeOk = res.ok;
    } catch {
      lastProbeOk = false;
    } finally {
      clearTimeout(timer);
      lastProbeAt = Date.now();
      probing = null;
    }
    derive();
    return lastProbeOk === true;
  })();

  return probing;
}

/** Last known connectivity as a boolean. Safe to call during render. */
export function isOnline(): boolean {
  if (!started && typeof window !== "undefined") initConnectivity();
  return state === "online";
}

/** Full connectivity state, for messages that must not lie to the member. */
export function connectivityState(): ConnectivityState {
  if (!started && typeof window !== "undefined") initConnectivity();
  return state;
}

/** Starts the listeners once (idempotent). Called from the app root. */
export function initConnectivity(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  deviceOnline = typeof navigator === "undefined" ? true : navigator.onLine !== false;
  state = deviceOnline ? "online" : "offline";

  window.addEventListener("online", () => {
    deviceOnline = true;
    lastProbeOk = null;
    derive();
    void probeBackend(true);
  });
  window.addEventListener("offline", () => {
    deviceOnline = false;
    derive();
  });
  window.addEventListener("focus", () => void probeBackend());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void probeBackend();
  });

  const network = cap()?.Plugins?.Network;
  if (network) {
    void Promise.resolve(network.getStatus())
      .then((s) => {
        deviceOnline = Boolean(s?.connected);
        derive();
      })
      .catch(() => {
        /* keep browser value */
      });
    try {
      void network.addListener("networkStatusChange", (s) => {
        deviceOnline = Boolean(s?.connected);
        lastProbeOk = null;
        derive();
        if (deviceOnline) void probeBackend(true);
      });
    } catch {
      /* keep browser value */
    }
  }

  void probeBackend(true);
  manageRecoveryTimer();
}

/** Subscribes to online/offline changes; returns an unsubscribe function. */
export function subscribeConnectivity(listener: Listener): () => void {
  initConnectivity();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribes to the richer connectivity state. */
export function subscribeConnectivityState(listener: StateListener): () => void {
  initConnectivity();
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

/** Diagnostics for the admin/debug panel — no personal data. */
export function connectivityDiagnostics() {
  return { state, deviceOnline, lastProbeAt, lastProbeOk };
}
