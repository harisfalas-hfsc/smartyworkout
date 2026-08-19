import { createStore, get, set } from "idb-keyval";

/**
 * Pending operations queue.
 *
 * Anything the member does offline that can safely be replayed later lands
 * here with full metadata (retry count, last error, status, priority) so the
 * sync manager can retry sensibly, never duplicate and never lose an action.
 */

export type QueueStatus = "pending" | "failed" | "dead";

export type QueuedAction = {
  id: string;
  userId?: string;
  kind:
    | "workout-status"
    | "workout-feedback"
    | "session-debrief"
    | "community-like"
    | "community-rating"
    | "notification-read"
    | "notification-delete"
    | "thread-read"
    | "thread-delete";
  payload: Record<string, unknown>;
  queuedAt: number;
  /** Lower number runs first. */
  priority: number;
  retries: number;
  status: QueueStatus;
  lastError?: string;
  lastTriedAt?: number;
};

const QUEUE_KEY = "pending-actions";
/** Hard ceiling — no infinite retry loops. */
const MAX_RETRIES = 6;
/** Exponential backoff base between retries of the same action. */
const BACKOFF_MS = 30_000;

const store =
  typeof indexedDB !== "undefined" ? createStore("smarty-offline", "queue") : undefined;

async function readQueue(): Promise<QueuedAction[]> {
  if (!store) return [];
  try {
    const rows = (await get<QueuedAction[]>(QUEUE_KEY, store)) ?? [];
    // Tolerate rows written by the previous queue shape.
    return rows.map((r) => ({
      ...r,
      priority: r.priority ?? 1,
      retries: r.retries ?? 0,
      status: r.status ?? ("pending" as QueueStatus),
    }));
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedAction[]) {
  if (!store) return;
  try {
    await set(QUEUE_KEY, items, store);
  } catch {
    /* ignore */
  }
}

/** Same entity + same kind queued twice collapses into one operation. */
function dedupeKey(action: Pick<QueuedAction, "kind" | "payload">) {
  const p = action.payload;
  const id = p["workoutId"] ?? p["threadId"] ?? p["id"] ?? p["ids"] ?? "";
  return `${action.kind}:${JSON.stringify(id)}`;
}

export async function enqueueAction(
  kind: QueuedAction["kind"],
  payload: Record<string, unknown>,
  userId?: string | null,
  priority = 1,
): Promise<void> {
  const items = await readQueue();
  const next: QueuedAction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: userId ?? undefined,
    kind,
    payload,
    queuedAt: Date.now(),
    priority,
    retries: 0,
    status: "pending",
  };
  const key = dedupeKey(next);
  const without = items.filter(
    (i) => !(i.status !== "dead" && i.userId === next.userId && dedupeKey(i) === key),
  );
  without.push(next);
  await writeQueue(without);
}

export async function pendingActionCount(): Promise<number> {
  return (await readQueue()).filter((i) => i.status !== "dead").length;
}

export async function queueDiagnostics() {
  const items = await readQueue();
  return {
    pending: items.filter((i) => i.status === "pending").length,
    failed: items.filter((i) => i.status === "failed").length,
    dead: items.filter((i) => i.status === "dead").length,
    oldestQueuedAt: items.length ? Math.min(...items.map((i) => i.queuedAt)) : null,
  };
}

/**
 * Replays queued offline actions in priority then FIFO order.
 * Successful ones are removed; failures get a bounded, backed-off retry and are
 * parked as `dead` (kept, never silently deleted) once the ceiling is hit.
 */
export async function flushQueue(
  run: (action: QueuedAction) => Promise<void>,
  userId?: string | null,
): Promise<number> {
  const items = await readQueue();
  if (!items.length) return 0;

  const ordered = [...items].sort(
    (a, b) => a.priority - b.priority || a.queuedAt - b.queuedAt,
  );
  const remaining: QueuedAction[] = [];
  let done = 0;

  for (const action of ordered) {
    const otherUser = action.userId && action.userId !== userId;
    const parked = action.status === "dead";
    const backedOff =
      action.lastTriedAt !== undefined &&
      Date.now() - action.lastTriedAt < BACKOFF_MS * 2 ** Math.min(action.retries, 5);

    if (otherUser || parked || backedOff) {
      remaining.push(action);
      continue;
    }

    try {
      await run(action);
      done += 1;
    } catch (error) {
      const retries = action.retries + 1;
      remaining.push({
        ...action,
        retries,
        lastTriedAt: Date.now(),
        lastError: String((error as Error)?.message ?? error).slice(0, 300),
        status: retries >= MAX_RETRIES ? "dead" : "failed",
      });
    }
  }

  await writeQueue(remaining);
  return done;
}
