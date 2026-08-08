import { useEffect, useRef } from "react";

export function useKeepScreenAwake(enabled: boolean) {
  const sentinelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined") return;
    let cancelled = false;

    const request = async () => {
      try {
        const wl = (navigator as any).wakeLock;
        if (!wl?.request) return;
        const s = await wl.request("screen");
        if (cancelled) {
          s.release?.();
          return;
        }
        sentinelRef.current = s;
      } catch {
        /* ignore */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        sentinelRef.current?.release?.();
      } catch {
        /* ignore */
      }
      sentinelRef.current = null;
    };
  }, [enabled]);
}
