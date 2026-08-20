import { readCache, writeCache, scopedKey, trimCache } from "./store";
import { isOnline } from "./connectivity";

/**
 * Runs a loader and stores the result on the device.
 * If the network call fails (offline), returns the last saved copy instead.
 * Throws only when there is no fresh data and nothing saved.
 */
export async function offlineFirst<T>(
  key: string,
  loader: () => Promise<T>,
  userId?: string | null,
): Promise<T> {
  const fullKey = scopedKey(userId ?? null, key);
  if (!isOnline()) {
    const cached = await readCache<T>(fullKey);
    if (cached) return cached.data;
    throw new Error("No saved offline copy is available on this device yet.");
  }
  try {
    const fresh = await loader();
    void writeCache(fullKey, fresh).then(() => trimCache());
    return fresh;
  } catch (error) {
    const cached = await readCache<T>(fullKey);
    if (cached) return cached.data;
    throw error;
  }
}
