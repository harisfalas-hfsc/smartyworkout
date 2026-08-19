// Ordering and idempotency rules for incoming payment webhooks.
//
// Webhooks are delivered at-least-once and NOT in order. Applying an older
// event after a newer one is how a paying member loses access, so the decision
// is isolated here and unit-tested.

export type StoredSubscription = {
  status: string;
  /** Last time we wrote this row (ISO). */
  updated_at?: string | null;
  /** The provider event timestamp we last applied, when known (unix seconds). */
  last_event_at?: number | null;
  current_period_end?: string | null;
} | null;

export type IncomingEvent = {
  /** Provider event creation time, unix seconds. */
  createdAt: number | null | undefined;
  status: string;
  currentPeriodEnd?: string | null;
};

export type EventDecision = { apply: boolean; reason: string };

function toMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Apply an incoming subscription event only when it is at least as new as what
 * we already stored. Unknown timestamps fall through to "apply" so a provider
 * that omits them never freezes a member's access.
 */
export function shouldApplySubscriptionEvent(
  stored: StoredSubscription,
  incoming: IncomingEvent,
): EventDecision {
  if (!stored) return { apply: true, reason: "no existing subscription row" };

  const incomingMs = incoming.createdAt ? incoming.createdAt * 1000 : null;
  if (incomingMs === null) return { apply: true, reason: "incoming event has no timestamp" };

  const storedEventMs = stored.last_event_at ? stored.last_event_at * 1000 : null;
  if (storedEventMs !== null && incomingMs < storedEventMs) {
    return { apply: false, reason: "older than the event already applied" };
  }
  if (storedEventMs !== null && incomingMs === storedEventMs) {
    return { apply: false, reason: "duplicate delivery of an event already applied" };
  }

  const storedWriteMs = toMs(stored.updated_at);
  if (storedEventMs === null && storedWriteMs !== null && incomingMs < storedWriteMs - 60_000) {
    return { apply: false, reason: "older than the last write to this subscription" };
  }

  return { apply: true, reason: "newer than what is stored" };
}

/**
 * Notification idempotency: one message per provider object + state, so a
 * redelivered webhook never emails or notifies the member twice.
 */
export function billingDedupeKey(parts: {
  kind: string;
  objectId: string;
  state?: string | number | null;
}): string {
  return [parts.kind, parts.objectId, parts.state ?? ""].filter(Boolean).join(":");
}
