import { createStore, get, set, del, keys } from "idb-keyval";

type Envelope<T> = { data: T; savedAt: number };

const store =
  typeof indexedDB !== "undefined" ? createStore("smarty-offline", "cache") : undefined;

/** Keys are scoped per signed-in user so nothing leaks between accounts. */
export function scopedKey(userId: string | null | undefined, key: string) {
  return `${userId ?? "anon"}::${key}`;
}

export async function readCache<T>(key: string): Promise<Envelope<T> | null> {
  if (!store) return null;
  try {
    const value = await get<Envelope<T>>(key, store);
    return value ?? null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  if (!store) return;
  try {
    await set(key, { data, savedAt: Date.now() } satisfies Envelope<T>, store);
  } catch {
    /* quota or private mode — offline copy is best-effort */
  }
}

export async function clearCacheForUser(userId: string | null | undefined): Promise<void> {
  if (!store) return;
  try {
    const prefix = `${userId ?? "anon"}::`;
    const all = await keys(store);
    await Promise.allSettled(
      all
        .filter((k) => typeof k === "string" && k.startsWith(prefix))
        .map((k) => del(k as string, store)),
    );
  } catch {
    /* ignore */
  }
}

/** Keys that must never be evicted — they are the offline app itself. */
const PROTECTED = [
  "logbook:list",
  "wod:hub",
  "inbox:notifications",
  "inbox:threads",
  "account:access",
  "library:list",
  "library:filters",
  "community:",
  "progress:overview",
];

function isProtected(key: string) {
  const bare = key.includes("::") ? key.slice(key.indexOf("::") + 2) : key;
  return (
    PROTECTED.some((p) => bare.startsWith(p)) ||
    bare.startsWith("workout:") ||
    bare.startsWith("exercise:")
  );
}

/**
 * Keeps the local copy from growing without bound.
 * Only expendable entries (exercise media details) are ever evicted, so the
 * member's saved workouts, logbook and inbox survive no matter how much of the
 * exercise library was cached.
 */
export async function trimCache(max = 6000): Promise<void> {
  if (!store) return;
  try {
    const all = (await keys(store)).filter((k) => typeof k === "string") as string[];
    const expendable = all.filter((k) => !isProtected(k));
    if (expendable.length <= max) return;
    const entries = await Promise.all(
      expendable.map(async (k) => ({
        k,
        savedAt: (await get<Envelope<unknown>>(k, store))?.savedAt ?? 0,
      })),
    );
    entries.sort((a, b) => a.savedAt - b.savedAt);
    await Promise.allSettled(
      entries.slice(0, entries.length - max).map((e) => del(e.k, store)),
    );
  } catch {
    /* ignore */
  }
}
