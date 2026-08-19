// Scenario tests: the two flows that used to corrupt data — a retried offline
// action replayed twice, and Stripe events that arrive out of order.
import { describe, expect, it } from "vitest";
import { backoffDelay, mergeIntoQueue, type QueueRuleItem } from "@/lib/offline/queue-rules";
import { shouldApplySubscriptionEvent } from "@/lib/billing/subscription-events";

function action(over: Partial<QueueRuleItem>): QueueRuleItem {
  return {
    id: over.id ?? "1",
    kind: over.kind ?? "log_performance",
    payload: over.payload ?? { clientKey: "k1" },
    queuedAt: over.queuedAt ?? 1000,
    priority: over.priority ?? 1,
    retries: over.retries ?? 0,
    status: over.status ?? "pending",
  };
}

describe("offline replay", () => {
  it("keeps a single entry when the same action is queued twice", () => {
    const first = action({ id: "a", payload: { clientKey: "k1", reps: 8 } });
    const retry = action({ id: "b", payload: { clientKey: "k1", reps: 10 } });
    const queue = mergeIntoQueue(mergeIntoQueue([], first), retry);
    expect(queue).toHaveLength(1);
    expect(queue[0]!.payload["reps"]).toBe(10);
  });

  it("backs off further on each failed attempt", () => {
    expect(backoffDelay(1)).toBeLessThan(backoffDelay(3));
  });
});

describe("stripe event ordering", () => {
  it("ignores an older event that would downgrade an active member", () => {
    const stored = {
      status: "active",
      updated_at: new Date(2_000_000).toISOString(),
      last_event_at: 2_000,
      current_period_end: null,
    };
    const decision = shouldApplySubscriptionEvent(stored, {
      createdAt: 1_000,
      status: "canceled",
    });
    expect(decision.apply).toBe(false);
  });

  it("applies a newer cancellation", () => {
    const stored = {
      status: "active",
      updated_at: new Date(2_000_000).toISOString(),
      last_event_at: 2_000,
      current_period_end: null,
    };
    expect(
      shouldApplySubscriptionEvent(stored, { createdAt: 3_000, status: "canceled" }).apply,
    ).toBe(true);
  });
});
