// Pure decision rules for the offline queue.
//
// These are separated from the IndexedDB layer on purpose: replay ordering,
// deduplication, backoff and the retry ceiling are the parts that cause real
// data bugs, so they must be testable without a browser or a database.

export type QueueStatus = "pending" | "failed" | "dead";

export type QueueRuleItem = {
  id: string;
  userId?: string | undefined;
  kind: string;
  payload: Record<string, unknown>;
  queuedAt: number;
  priority: number;
  retries: number;
  status: QueueStatus;
  lastError?: string | undefined;
  lastTriedAt?: number | undefined;
};

/** Hard ceiling — no infinite retry loops. */
export const MAX_RETRIES = 6;
/** Exponential backoff base between retries of the same action. */
export const BACKOFF_MS = 30_000;

/**
 * Identity of the operation, not of the queue row.
 *
 * A client-supplied `clientKey` always wins: it is the idempotency key the
 * server also stores, so the same logical action can never be applied twice,
 * even if it was queued, partially sent and queued again.
 */
export function dedupeKey(action: Pick<QueueRuleItem, "kind" | "payload">): string {
  const p = action.payload;
  if (typeof p["clientKey"] === "string" && p["clientKey"]) {
    return `${action.kind}:key:${p["clientKey"]}`;
  }
  const id = p["workoutId"] ?? p["threadId"] ?? p["id"] ?? p["ids"] ?? "";
  const attempt = p["attempt"] ?? "";
  return `${action.kind}:${JSON.stringify(id)}:${JSON.stringify(attempt)}`;
}

/** Priority first, then FIFO. Stable for equal keys. */
export function orderQueue<T extends Pick<QueueRuleItem, "priority" | "queuedAt">>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) => a.priority - b.priority || a.queuedAt - b.queuedAt);
}

export function backoffDelay(retries: number): number {
  return BACKOFF_MS * 2 ** Math.min(retries, 5);
}

/** Whether this row may be sent right now. */
export function shouldAttempt(
  action: Pick<QueueRuleItem, "userId" | "status" | "retries" | "lastTriedAt">,
  options: { userId?: string | null; now?: number } = {},
): boolean {
  const now = options.now ?? Date.now();
  if (action.status === "dead") return false;
  if (action.userId && options.userId && action.userId !== options.userId) return false;
  if (action.userId && !options.userId) return false;
  if (action.lastTriedAt !== undefined && now - action.lastTriedAt < backoffDelay(action.retries)) {
    return false;
  }
  return true;
}

/** State of a row after one failed send. Rows are parked, never deleted. */
export function afterFailure<T extends QueueRuleItem>(action: T, error: unknown, now = Date.now()): T {
  const retries = action.retries + 1;
  return {
    ...action,
    retries,
    lastTriedAt: now,
    lastError: String((error as Error)?.message ?? error).slice(0, 300),
    status: retries >= MAX_RETRIES ? ("dead" as const) : ("failed" as const),
  };
}

/**
 * Replaces any live row describing the same logical operation.
 * Dead rows are kept for diagnostics and never collapsed into.
 */
export function mergeIntoQueue<T extends QueueRuleItem>(items: readonly T[], next: T): T[] {
  const key = dedupeKey(next);
  const kept = items.filter(
    (i) => !(i.status !== "dead" && i.userId === next.userId && dedupeKey(i) === key),
  );
  return [...kept, next];
}
