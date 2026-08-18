import { useCallback, useEffect, useRef, useState } from "react";
import { readCache, writeCache, scopedKey, trimCache } from "./store";
import { useOnlineStatus } from "./useOnlineStatus";

type State<T> = {
  data: T | null;
  loading: boolean;
  /** True when the shown data came from the device, not the network. */
  fromCache: boolean;
  /** When the shown cached copy was saved. */
  savedAt: number | null;
  error: Error | null;
  refresh: () => void;
};

/**
 * Wraps an existing loader with a device-local copy.
 * Online: loads fresh data and saves it. Offline / on failure: shows the last
 * saved copy for this user so the page still works without internet.
 */
export function useOfflineData<T>(
  key: string | null,
  loader: () => Promise<T>,
  options: { userId?: string | null; enabled?: boolean } = {},
): State<T> {
  const { userId = null, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [fromCache, setFromCache] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const online = useOnlineStatus();
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled || !key) {
      setLoading(false);
      return;
    }
    let active = true;
    const fullKey = scopedKey(userId, key);
    setLoading(true);

    (async () => {
      // Paint the saved copy first so offline devices never see a blank page.
      const cached = await readCache<T>(fullKey);
      if (active && cached) {
        setData(cached.data);
        setFromCache(true);
        setSavedAt(cached.savedAt);
        setLoading(false);
      }

      try {
        const fresh = await loaderRef.current();
        if (!active) return;
        setData(fresh);
        setFromCache(false);
        setSavedAt(Date.now());
        setError(null);
        void writeCache(fullKey, fresh).then(() => trimCache());
      } catch (e) {
        if (!active) return;
        if (!cached) setError(e as Error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [key, userId, enabled, tick, online]);

  return { data, loading, fromCache, savedAt, error, refresh };
}
