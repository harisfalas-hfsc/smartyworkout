import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, ServerCrash, X } from "lucide-react";
import { useConnectivityState } from "@/lib/offline/useOnlineStatus";
import { pendingActionCount } from "@/lib/offline/queue";
import { requestSync, subscribeSyncState, type SyncState } from "@/lib/offline/sync-bus";

/**
 * Small, non-blocking connectivity pill.
 *
 * It never covers navigation, never blocks a tap and never opens a modal.
 * It only tells the member what state the app is in and offers "Sync now".
 */
export function OfflineStatus() {
  const state = useConnectivityState();
  const [sync, setSync] = useState<SyncState>("idle");
  const [pending, setPending] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => subscribeSyncState(setSync), []);

  useEffect(() => {
    let active = true;
    const read = () => void pendingActionCount().then((n) => active && setPending(n));
    read();
    const timer = setInterval(read, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [state, sync]);

  useEffect(() => {
    if (state !== "online") setDismissed(false);
  }, [state]);

  const offline = state === "offline";
  const backendDown = state === "backend-unreachable";
  const show = offline || backendDown || sync === "syncing" || pending > 0;
  if (!show || dismissed) return null;

  const label = offline
    ? "Offline — your saved data is available"
    : backendDown
      ? "Can't reach SmartyWorkout right now"
      : sync === "syncing"
        ? "Syncing…"
        : `${pending} change${pending === 1 ? "" : "s"} waiting to sync`;

  const Icon = offline ? CloudOff : backendDown ? ServerCrash : RefreshCw;

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-40 -translate-x-1/2 px-3 md:bottom-6">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-primary bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur">
        <Icon
          className={`h-3.5 w-3.5 shrink-0 text-primary ${sync === "syncing" ? "animate-spin" : ""}`}
        />
        <span className="max-w-[60vw] truncate">{label}</span>
        {state === "online" && sync !== "syncing" && pending > 0 ? (
          <button
            type="button"
            onClick={() => requestSync()}
            className="rounded-full px-2 py-0.5 text-[11px] font-bold text-primary underline underline-offset-2"
          >
            Sync now
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Hide status"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
