import { createStore, get, set } from "idb-keyval";

export type QueuedAction = {
  id: string;
  kind: "workout-status" | "workout-feedback" | "community-like" | "community-rating";
  payload: Record<string, unknown>;
  queuedAt: number;
};

const QUEUE_KEY = "pending-actions";
const store =
  typeof indexedDB !== "undefined" ? createStore("smarty-offline", "queue") : undefined;

async function readQueue(): Promise<QueuedAction[]> {
  if (!store) return [];
  try {
    return (await get<QueuedAction[]>(QUEUE_KEY, store)) ?? [];
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

export async function enqueueAction(
  kind: QueuedAction["kind"],
  payload: Record<string, unknown>,
): Promise<void> {
  const items = await readQueue();
  items.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    payload,
    queuedAt: Date.now(),
  });
  await writeQueue(items);
}

export async function pendingActionCount(): Promise<number> {
  return (await readQueue()).length;
}

/**
 * Replays queued offline actions in order. Successful ones are removed;
 * anything that fails again stays queued for the next reconnect.
 */
export async function flushQueue(
  run: (action: QueuedAction) => Promise<void>,
): Promise<number> {
  const items = await readQueue();
  if (!items.length) return 0;
  const remaining: QueuedAction[] = [];
  let done = 0;
  for (const action of items) {
    try {
      await run(action);
      done += 1;
    } catch {
      remaining.push(action);
    }
  }
  await writeQueue(remaining);
  return done;
}
