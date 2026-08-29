import { useEffect, useState } from "react";

/**
 * Plain network awareness.
 *
 * The app is online-only: nothing is cached, queued or synced in the
 * background. These helpers exist purely so the interface can say "you appear
 * to be offline" instead of showing a raw request failure.
 */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/** Live online/offline flag for messages and disabled states. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(isOnline());
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}
