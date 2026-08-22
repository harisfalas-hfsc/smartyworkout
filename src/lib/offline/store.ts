import { createStore, get, set, del, keys } from "idb-keyval";
import { offlineDb } from "./database";

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
    const modern = await offlineDb.cache.get(key);
    if (modern) return { data: modern.data as T, savedAt: modern.saved_at };
    const value = await get<Envelope<T>>(key, store);
    if (value) {
      const separator = key.indexOf("::");
      await offlineDb.cache.put({
        key,
        user_id: separator >= 0 ? key.slice(0, separator) : "anon",
        data: value.data,
        saved_at: value.savedAt,
      });
    }
    return value ?? null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  if (!store) return;
  try {
    const savedAt = Date.now();
    const separator = key.indexOf("::");
    await Promise.all([
      offlineDb.cache.put({
        key,
        user_id: separator >= 0 ? key.slice(0, separator) : "anon",
        data,
        saved_at: savedAt,
      }),
      set(key, { data, savedAt } satisfies Envelope<T>, store),
    ]);
  } catch {
    /* quota or private mode — offline copy is best-effort */
  }
}

export async function clearCacheForUser(userId: string | null | undefined): Promise<void> {
  if (!store) return;
  try {
    const prefix = `${userId ?? "anon"}::`;
    await offlineDb.cache.where("user_id").equals(userId ?? "anon").delete();
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
    const modern = await offlineDb.cache.orderBy("saved_at").toArray();
    const modernExpendable = modern.filter((row) => !isProtected(row.key));
    if (modernExpendable.length > max) {
      await offlineDb.cache.bulkDelete(
        modernExpendable.slice(0, modernExpendable.length - max).map((row) => row.key),
      );
    }
  } catch {
    /* ignore */
  }
}
