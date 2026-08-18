import { useEffect, useState } from "react";
import {
  connectivityState,
  isOnline,
  subscribeConnectivity,
  subscribeConnectivityState,
  type ConnectivityState,
} from "./connectivity";

/**
 * Live online/offline flag, backed by the shared connectivity source
 * (native Capacitor Network plugin + browser events + backend reachability).
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(isOnline());
    return subscribeConnectivity(setOnline);
  }, []);

  return online;
}

/** The richer state, so messages can tell "no internet" from "backend down". */
export function useConnectivityState(): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>("online");

  useEffect(() => {
    setState(connectivityState());
    return subscribeConnectivityState(setState);
  }, []);

  return state;
}
