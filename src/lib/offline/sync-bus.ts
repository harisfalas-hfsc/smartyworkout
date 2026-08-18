/**
 * Tiny in-app bus so the sync manager, the prefetcher and the status pill all
 * share one notion of "we are synchronising" without any global state library.
 */
export type SyncState = "idle" | "syncing" | "error";

type Listener = (state: SyncState) => void;

let state: SyncState = "idle";
const listeners = new Set<Listener>();
const syncRequests = new Set<() => void>();

export function syncState(): SyncState {
  return state;
}

export function setSyncState(next: SyncState): void {
  if (next === state) return;
  state = next;
  listeners.forEach((l) => {
    try {
      l(next);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeSyncState(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/** Registers a worker that should run when a sync is requested. */
export function onSyncRequested(handler: () => void): () => void {
  syncRequests.add(handler);
  return () => syncRequests.delete(handler);
}

/** Manual "Sync now" / reconnect trigger. */
export function requestSync(): void {
  syncRequests.forEach((h) => {
    try {
      h();
    } catch {
      /* ignore */
    }
  });
}
