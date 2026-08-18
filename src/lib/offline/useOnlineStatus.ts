import { useEffect, useState } from "react";
import { isOnline, subscribeConnectivity } from "./connectivity";

/**
 * Live online/offline flag, backed by the shared connectivity source
 * (native Capacitor Network plugin when available, browser events otherwise).
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(isOnline());
    return subscribeConnectivity(setOnline);
  }, []);

  return online;
}
