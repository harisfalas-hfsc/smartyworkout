import { createStore, get, set } from "idb-keyval";

import {
  afterFailure,
  mergeIntoQueue,
  orderQueue,
  shouldAttempt,
  type QueueRuleItem,
  type QueueStatus,
} from "./queue-rules";

/**
 * Pending operations queue.
 *
 * Anything the member does offline that can safely be replayed later lands
 * here with full metadata (retry count, last error, status, priority) so the
 * sync manager can retry sensibly, never duplicate and never lose an action.
 *
 * All ordering/dedupe/backoff decisions live in `./queue-rules` so they are
 * unit-tested without a browser; this file is only storage plus replay.
 */

export type { QueueStatus } from "./queue-rules";

export type QueuedAction = QueueRuleItem & {
  kind:
    | "set-log"
    | "workout-result"
    | "attempt-complete"
    | "workout-status"
    | "workout-feedback"
    | "session-debrief"
    | "community-like"
    | "community-rating"
    | "notification-read"
    | "notification-delete"
    | "thread-read"
    | "thread-delete";
};

const QUEUE_KEY = "pending-actions";

const store =
  typeof indexedDB !== "undefined" ? createStore("smarty-offline-queue", "queue") : undefined;

export async function readQueue(): Promise<QueuedAction[]> {
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

/**
 * Stable idempotency key sent with the action. The server stores it, so a
 * request that actually reached the backend before the connection dropped can
 * never be applied a second time on replay.
 */
export function newClientKey(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueAction(
  kind: QueuedAction["kind"],
  payload: Record<string, unknown>,
  userId?: string | null,
  priority = 1,
): Promise<string> {
  const items = await readQueue();
  const clientKey =
    typeof payload["clientKey"] === "string" && payload["clientKey"]
      ? (payload["clientKey"] as string)
      : newClientKey();
  const next: QueuedAction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: userId ?? undefined,
    kind,
    payload: { ...payload, clientKey },
    queuedAt: Date.now(),
    priority,
    retries: 0,
    status: "pending",
  };
  await writeQueue(mergeIntoQueue(items, next));
  return clientKey;
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

  const remaining: QueuedAction[] = [];
  let done = 0;

  for (const action of orderQueue(items)) {
    if (!shouldAttempt(action, { userId })) {
      remaining.push(action);
      continue;
    }

    try {
      await run(action);
      done += 1;
    } catch (error) {
      remaining.push(afterFailure(action, error));
    }
  }

  await writeQueue(remaining);
  return done;
}

