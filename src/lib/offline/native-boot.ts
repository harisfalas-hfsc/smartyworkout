import { initConnectivity, isNativeApp } from "./connectivity";
import { findSupabaseAuthEntry } from "./device-auth";

/**
 * Native app startup.
 *
 * 1. Starts native-aware connectivity detection.
 * 2. Restores the last signed-in session for this device when the WebView
 *    starts with empty storage (fresh install / storage migration), so a member
 *    who has signed in once stays signed in even with airplane mode on.
 * 3. Hides the splash screen once the shell is alive, so a failed network call
 *    can never leave the user on a frozen native splash.
 */
const LAST_SESSION_KEY = "smarty:native:last-session";

type CapPlugins = { SplashScreen?: { hide?: () => Promise<void> | void } };

function plugins(): CapPlugins | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: { Plugins?: CapPlugins } }).Capacitor?.Plugins;
}

/** Keeps a copy of the live Supabase session so a cold native start can restore it. */
export function rememberNativeSession(): void {
  try {
    const entry = findSupabaseAuthEntry();
    if (!entry) return;
    localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(entry));
  } catch {
    /* best effort */
  }
}

export function restoreNativeSession(): void {
  try {
    if (findSupabaseAuthEntry()) return;
    const raw = localStorage.getItem(LAST_SESSION_KEY);
    if (!raw) return;
    const entry = JSON.parse(raw) as { storageKey?: string; value?: string };
    if (entry?.storageKey && entry?.value) localStorage.setItem(entry.storageKey, entry.value);
  } catch {
    /* best effort */
  }
}

/** Removes the native cold-start identity snapshot after an explicit sign-out. */
export function forgetNativeSession(): void {
  try {
    localStorage.removeItem(LAST_SESSION_KEY);
  } catch {
    /* best effort */
  }
}

export function bootNativeShell(): void {
  if (typeof window === "undefined") return;
  initConnectivity();
  if (!isNativeApp()) return;

  restoreNativeSession();
  rememberNativeSession();
  window.addEventListener("focus", rememberNativeSession);

  try {
    void plugins()?.SplashScreen?.hide?.();
  } catch {
    /* splash auto-hides anyway */
  }
}
