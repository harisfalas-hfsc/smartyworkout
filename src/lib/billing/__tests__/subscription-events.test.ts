import { describe, expect, it } from "vitest";
import { billingDedupeKey, shouldApplySubscriptionEvent } from "../subscription-events";

const secs = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe("shouldApplySubscriptionEvent", () => {
  it("applies the first event for an unknown subscription", () => {
    expect(
      shouldApplySubscriptionEvent(null, { createdAt: secs("2026-08-01T10:00:00Z"), status: "active" })
        .apply,
    ).toBe(true);
  });

  it("applies a newer event", () => {
    const decision = shouldApplySubscriptionEvent(
      { status: "active", last_event_at: secs("2026-08-01T10:00:00Z") },
      { createdAt: secs("2026-08-01T11:00:00Z"), status: "canceled" },
    );
    expect(decision.apply).toBe(true);
  });

  it("never lets an older out-of-order event cancel a live membership", () => {
    const decision = shouldApplySubscriptionEvent(
      { status: "active", last_event_at: secs("2026-08-01T12:00:00Z") },
      { createdAt: secs("2026-08-01T10:00:00Z"), status: "canceled" },
    );
    expect(decision.apply).toBe(false);
  });

  it("ignores a duplicate redelivery of the same event", () => {
    const at = secs("2026-08-01T12:00:00Z");
    expect(
      shouldApplySubscriptionEvent({ status: "active", last_event_at: at }, { createdAt: at, status: "active" })
        .apply,
    ).toBe(false);
  });

  it("falls back to the last write when no event timestamp was stored", () => {
    const stored = { status: "active", updated_at: "2026-08-01T12:00:00Z" };
    expect(
      shouldApplySubscriptionEvent(stored, { createdAt: secs("2026-08-01T09:00:00Z"), status: "canceled" })
        .apply,
    ).toBe(false);
    expect(
      shouldApplySubscriptionEvent(stored, { createdAt: secs("2026-08-01T13:00:00Z"), status: "canceled" })
        .apply,
    ).toBe(true);
  });

  it("never freezes access when the provider omits a timestamp", () => {
    expect(
      shouldApplySubscriptionEvent(
        { status: "canceled", last_event_at: secs("2026-08-01T12:00:00Z") },
        { createdAt: null, status: "active" },
      ).apply,
    ).toBe(true);
  });
});

describe("billingDedupeKey", () => {
  it("is stable for the same object and state", () => {
    expect(billingDedupeKey({ kind: "invoice-failed", objectId: "in_1", state: 2 })).toBe(
      billingDedupeKey({ kind: "invoice-failed", objectId: "in_1", state: 2 }),
    );
  });

  it("changes when the state changes", () => {
    expect(billingDedupeKey({ kind: "invoice-failed", objectId: "in_1", state: 1 })).not.toBe(
      billingDedupeKey({ kind: "invoice-failed", objectId: "in_1", state: 2 }),
    );
  });
});
