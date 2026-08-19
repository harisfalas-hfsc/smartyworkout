import { describe, expect, it } from "vitest";
import {
  BACKOFF_MS,
  MAX_RETRIES,
  afterFailure,
  backoffDelay,
  dedupeKey,
  mergeIntoQueue,
  orderQueue,
  shouldAttempt,
  type QueueRuleItem,
} from "../queue-rules";

function item(partial: Partial<QueueRuleItem> = {}): QueueRuleItem {
  return {
    id: "1",
    kind: "session-debrief",
    payload: { workoutId: "w1" },
    queuedAt: 1000,
    priority: 1,
    retries: 0,
    status: "pending",
    ...partial,
  };
}

describe("dedupeKey", () => {
  it("uses the client idempotency key when present", () => {
    expect(dedupeKey({ kind: "session-debrief", payload: { clientKey: "abc", workoutId: "w1" } })).toBe(
      "session-debrief:key:abc",
    );
  });

  it("separates different attempts of the same workout", () => {
    const a = dedupeKey({ kind: "workout-feedback", payload: { workoutId: "w1", attempt: 1 } });
    const b = dedupeKey({ kind: "workout-feedback", payload: { workoutId: "w1", attempt: 2 } });
    expect(a).not.toBe(b);
  });

  it("collapses the same operation queued twice", () => {
    const a = dedupeKey({ kind: "workout-status", payload: { workoutId: "w1" } });
    const b = dedupeKey({ kind: "workout-status", payload: { workoutId: "w1" } });
    expect(a).toBe(b);
  });
});

describe("mergeIntoQueue", () => {
  it("replaces a live duplicate instead of queuing it twice", () => {
    const existing = [item({ id: "old" })];
    const merged = mergeIntoQueue(existing, item({ id: "new" }));
    expect(merged).toHaveLength(1);
    expect(merged[0]!.id).toBe("new");
  });

  it("keeps dead rows for diagnostics", () => {
    const existing = [item({ id: "dead", status: "dead" })];
    const merged = mergeIntoQueue(existing, item({ id: "new" }));
    expect(merged.map((i) => i.id)).toEqual(["dead", "new"]);
  });

  it("never merges across users", () => {
    const existing = [item({ id: "a", userId: "u1" })];
    const merged = mergeIntoQueue(existing, item({ id: "b", userId: "u2" }));
    expect(merged).toHaveLength(2);
  });
});

describe("orderQueue", () => {
  it("runs higher priority first, then FIFO", () => {
    const rows = [
      item({ id: "c", priority: 2, queuedAt: 5 }),
      item({ id: "a", priority: 1, queuedAt: 9 }),
      item({ id: "b", priority: 1, queuedAt: 3 }),
    ];
    expect(orderQueue(rows).map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
});

describe("shouldAttempt", () => {
  it("skips dead rows", () => {
    expect(shouldAttempt(item({ status: "dead" }), { userId: undefined })).toBe(false);
  });

  it("skips rows belonging to another signed-in member", () => {
    expect(shouldAttempt(item({ userId: "u1" }), { userId: "u2" })).toBe(false);
  });

  it("honours exponential backoff", () => {
    const now = 1_000_000;
    const row = item({ retries: 2, lastTriedAt: now - 1000, status: "failed" });
    expect(shouldAttempt(row, { userId: undefined, now })).toBe(false);
    expect(shouldAttempt(row, { userId: undefined, now: now + backoffDelay(2) + 2000 })).toBe(true);
  });

  it("grows the delay with each retry", () => {
    expect(backoffDelay(0)).toBe(BACKOFF_MS);
    expect(backoffDelay(3)).toBe(BACKOFF_MS * 8);
    expect(backoffDelay(99)).toBe(BACKOFF_MS * 32);
  });
});

describe("afterFailure", () => {
  it("parks a row as dead at the retry ceiling and never deletes it", () => {
    let row = item();
    for (let i = 0; i < MAX_RETRIES; i += 1) row = afterFailure(row, new Error("boom"), 1);
    expect(row.status).toBe("dead");
    expect(row.retries).toBe(MAX_RETRIES);
    expect(row.lastError).toContain("boom");
  });

  it("stays retryable below the ceiling", () => {
    expect(afterFailure(item(), new Error("x"), 1).status).toBe("failed");
  });
});
