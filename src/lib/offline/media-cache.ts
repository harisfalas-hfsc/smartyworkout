const MEDIA_CACHE_NAME = "smarty-media-v1";

/**
 * Stores exercise media in a dedicated Cache Storage bucket.
 *
 * Already-stored URLs are skipped, so repeat startups stay cheap while a
 * previously interrupted download always resumes where it stopped.
 */
export async function cacheMediaUrls(
  urls: string[],
  options: { concurrency?: number; isActive?: () => boolean } = {},
): Promise<{ requested: number; stored: number; failed: number }> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (typeof window === "undefined" || !("caches" in window) || unique.length === 0) {
    return { requested: unique.length, stored: 0, failed: 0 };
  }

  let cache: Cache;
  try {
    cache = await caches.open(MEDIA_CACHE_NAME);
  } catch {
    return { requested: unique.length, stored: 0, failed: unique.length };
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
      if (index >= unique.length) return;
      const url = unique[index]!;
      try {
        const existing = await cache.match(url);
        if (existing) {
          stored += 1;
          continue;
        }
        const response = await fetch(url, { mode: "cors" }).catch(() =>
          fetch(url, { mode: "no-cors" }),
        );
        if (response && (response.ok || response.type === "opaque")) {
          await cache.put(url, response.clone());
          stored += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));
  return { requested: unique.length, stored, failed };
}

/** True when every URL already has a stored copy. */
export async function hasAllMedia(urls: string[]): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) return true;
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME);
    for (const url of [...new Set(urls.filter(Boolean))]) {
      if (!(await cache.match(url))) return false;
    }
    return true;
  } catch {
    return true;
  }
}
