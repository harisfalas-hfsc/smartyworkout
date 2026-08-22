const MEDIA_CACHE_NAME = "smarty-media-v1";
import { offlineDb } from "./database";

const MEDIA_REQUEST_TIMEOUT_MS = 20_000;
let exerciseWarmPromise: Promise<{ requested: number; stored: number; failed: number }> | null = null;

/**
 * Exercise pictures live in a private bucket, so every download link is a
 * short-lived signed URL with a one-time token. Storing files under that
 * address made every saved picture unusable on the next start: the new link
 * never matched the old key, nothing was reused and nothing worked offline.
 *
 * Everything is therefore stored under a stable address built from the file
 * path inside the bucket, so a picture downloaded once is found forever.
 */
export function offlineMediaKey(path: string): string {
  const origin = typeof window === "undefined" ? "https://smartyworkout.com" : window.location.origin;
  return `${origin}/offline-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export type MediaItem = { path: string; url: string };

/** True when this device already has a stored copy of the picture. */
export async function hasStoredMedia(path: string): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME);
    return Boolean(await cache.match(offlineMediaKey(path)));
  } catch {
    return false;
  }
}

/** Returns a usable local address for a stored picture, or null. */
export async function readStoredMedia(path: string): Promise<string | null> {
  if (typeof window === "undefined" || !("caches" in window)) return null;
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME);
    const hit = await cache.match(offlineMediaKey(path));
    if (!hit) return null;
    const blob = await hit.blob();
    if (!blob.size) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/** Downloads one picture and stores it under its stable address. */
export async function storeMedia(item: MediaItem): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window) || !item.path || !item.url) return false;
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME);
    const key = offlineMediaKey(item.path);
    if (await cache.match(key)) return true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), MEDIA_REQUEST_TIMEOUT_MS);
    const response = await fetch(item.url, {
      mode: "cors",
      credentials: "omit",
      signal: controller.signal,
    }).finally(() => window.clearTimeout(timer));
    if (!response.ok) return false;
    const blob = await response.blob();
    if (!blob.size) return false;
    await cache.put(
      key,
      new Response(blob, {
        headers: {
          "content-type": response.headers.get("content-type") ?? "image/gif",
          "content-length": String(blob.size),
        },
      }),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Stores a batch of pictures. Already-stored files are skipped, so an
 * interrupted download always resumes where it stopped.
 */
export async function cacheExerciseMedia(
  items: MediaItem[],
  options: { concurrency?: number; isActive?: () => boolean } = {},
): Promise<{ requested: number; stored: number; failed: number }> {
  const unique = new Map<string, MediaItem>();
  for (const item of items) if (item?.path && item?.url) unique.set(item.path, item);
  const list = [...unique.values()];
  if (typeof window === "undefined" || !("caches" in window) || !list.length) {
    return { requested: list.length, stored: 0, failed: 0 };
  }

  const concurrency = Math.max(1, options.concurrency ?? 6);
  const isActive = options.isActive ?? (() => true);
  let cursor = 0;
  let stored = 0;
  let failed = 0;

  const worker = async () => {
    for (;;) {
      if (!isActive()) return;
      const index = cursor;
      cursor += 1;
      if (index >= list.length) return;
      if (await storeMedia(list[index]!)) stored += 1;
      else failed += 1;
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  const bytes = await storedMediaBytes();
  await offlineDb.media_progress.put({
    key: "exercise-library",
    requested: list.length,
    stored,
    failed,
    bytes,
    updated_at: Date.now(),
  });
  return { requested: list.length, stored, failed };
}

/** Starts or joins one resumable media pass without blocking member-data sync. */
export function warmExerciseMedia(
  items: MediaItem[],
  options: { concurrency?: number; isActive?: () => boolean } = {},
) {
  if (!exerciseWarmPromise) {
    exerciseWarmPromise = cacheExerciseMedia(items, options).finally(() => {
      exerciseWarmPromise = null;
    });
  }
  return exerciseWarmPromise;
}

/**
 * Stores plain, stable URLs (avatars, static images) under their real address
 * so the browser finds them without any lookup while offline.
 */
export async function cacheMediaUrls(
  urls: string[],
  options: { concurrency?: number; isActive?: () => boolean } = {},
): Promise<{ requested: number; stored: number; failed: number }> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (typeof window === "undefined" || !("caches" in window) || !unique.length) {
    return { requested: unique.length, stored: 0, failed: 0 };
  }
  const isActive = options.isActive ?? (() => true);
  let stored = 0;
  let failed = 0;
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME);
    for (const url of unique) {
      if (!isActive()) break;
      try {
        if (await cache.match(url)) {
          stored += 1;
          continue;
        }
        const response = await fetch(url, { mode: "cors" }).catch(() => fetch(url, { mode: "no-cors" }));
        if (response && (response.ok || response.type === "opaque")) {
          await cache.put(url, response.clone());
          stored += 1;
        } else failed += 1;
      } catch {
        failed += 1;
      }
    }
  } catch {
    failed = unique.length;
  }
  return { requested: unique.length, stored, failed };
}

/** Number of stored pictures on this device, used by the diagnostics page. */
export async function storedMediaCount(): Promise<number> {
  if (typeof window === "undefined" || !("caches" in window)) return 0;
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME);
    return (await cache.keys()).length;
  } catch {
    return 0;
  }
}

export async function storedMediaBytes(): Promise<number> {
  if (typeof window === "undefined" || !("caches" in window)) return 0;
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME);
    const responses = await Promise.all((await cache.keys()).map((request) => cache.match(request)));
    let bytes = 0;
    for (const response of responses) {
      if (!response) continue;
      const stated = Number(response.headers.get("content-length"));
      bytes += Number.isFinite(stated) && stated > 0 ? stated : (await response.clone().blob()).size;
    }
    return bytes;
  } catch {
    return 0;
  }
}
