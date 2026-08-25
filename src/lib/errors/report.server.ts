import { DEFAULT_HEALTH_RECIPIENT } from "@/lib/cron/health-check.server";

export type ErrorSeverity = "error" | "warning";

export interface ReportErrorInput {
  /** Short machine label of where it happened, e.g. "workout-generation". */
  source: string;
  /** Plain-language explanation of what broke for the member. */
  message: string;
  severity?: ErrorSeverity;
  kind?: "server" | "client";
  route?: string;
  userId?: string | null;
  userEmail?: string | null;
  details?: Record<string, unknown>;
}

const DEFAULT_WINDOW_MIN = 30;

function groupKeyOf(input: ReportErrorInput): string {
  return `${input.source}|${input.message.slice(0, 160)}`;
}

/**
 * Records a real failure and — when the alert job is on — emails the admin
 * immediately. Grouped per problem so one broken thing hitting many members
 * sends one email plus a repeat count. Never throws.
 */
export async function reportError(input: ReportErrorInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as never as import("@supabase/supabase-js").SupabaseClient;

    const severity: ErrorSeverity = input.severity ?? "error";
    const groupKey = groupKeyOf(input);

    const { getCronConfig } = await import("@/lib/cron/jobs.server");
    let config;
    try {
      config = await getCronConfig(db, "error-alerts" as never);
    } catch {
      config = undefined;
    }
    const windowMin = Math.max(
      1,
      Math.round(Number(config?.content?.groupWindowMin ?? DEFAULT_WINDOW_MIN) || DEFAULT_WINDOW_MIN),
    );
    const minSeverity = config?.content?.minSeverity ?? "all";
    const recipient = (config?.content?.recipient || "").trim() || DEFAULT_HEALTH_RECIPIENT;
    const alertsOn = config?.enabled ?? true;

    let userEmail = input.userEmail ?? null;
    if (!userEmail && input.userId) {
      const { data } = await db.from("profiles").select("email").eq("id", input.userId).maybeSingle();
      userEmail = (data as { email: string | null } | null)?.email ?? null;
    }

    const windowStart = new Date(Date.now() - windowMin * 60 * 1000).toISOString();
    const { data: recent } = await db
      .from("error_events")
      .select("id,occurrences,alerted_at")
      .eq("group_key", groupKey)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(1);
    const existing = ((recent as { id: string; occurrences: number; alerted_at: string | null }[] | null) ??
      [])[0];

    const shouldEmail =
      alertsOn &&
      !existing?.alerted_at &&
      (minSeverity === "all" || severity === "error");

    if (existing) {
      await db
        .from("error_events")
        .update({
          occurrences: (existing.occurrences ?? 1) + 1,
          last_seen_at: new Date().toISOString(),
        } as never)
        .eq("id", existing.id);
      if (!shouldEmail) return;
    }

    const row = {
      kind: input.kind ?? "server",
      severity,
      message: input.message.slice(0, 500),
      source: input.source,
      route: input.route ?? null,
      user_id: input.userId ?? null,
      user_email: userEmail,
      details: (input.details ?? {}) as never,
      group_key: groupKey,
      alerted_at: shouldEmail ? new Date().toISOString() : null,
    };

    let insertedId: string | null = null;
    if (!existing) {
      const { data: inserted } = await db
        .from("error_events")
        .insert(row as never)
        .select("id")
        .maybeSingle();
      insertedId = (inserted as { id: string } | null)?.id ?? null;
    } else if (shouldEmail) {
      await db
        .from("error_events")
        .update({ alerted_at: new Date().toISOString() } as never)
        .eq("id", existing.id);
      insertedId = existing.id;
    }

    if (!shouldEmail) return;

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("error-alert", recipient, {
      templateData: {
        message: row.message,
        source: row.source,
        route: row.route,
        severity,
        kind: row.kind,
        occurredAt: new Date().toISOString(),
        userEmail: userEmail ?? "not signed in / unknown",
        userId: input.userId ?? null,
        details: JSON.stringify(input.details ?? {}, null, 2).slice(0, 1500),
        groupWindowMin: windowMin,
      },
      idempotencyKey: `error-alert:${insertedId ?? groupKey}`,
    });
  } catch (e) {
    console.error("[errors] failed to record error", e);
  }
}

const EXPECTED_PATTERNS = [
  "training profile",
  "health and safety",
  "membership",
  "daily limit",
  "not found",
  "unauthorized",
  "forbidden",
  "already",
  "premium",
];

/** Normal, expected refusals — these are not system problems, so no alert. */
export function isExpectedUserError(message: string): boolean {
  const m = message.toLowerCase();
  return EXPECTED_PATTERNS.some((p) => m.includes(p));
}

/**
 * Wraps a member-facing server action: real failures are logged and alerted,
 * then rethrown unchanged so nothing about the app's behaviour changes.
 */
export async function withProblemReport<T>(
  meta: { source: string; route?: string; userId?: string | null },
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!isExpectedUserError(message)) {
      await reportError({
        source: meta.source,
        message,
        ...(meta.route ? { route: meta.route } : {}),
        userId: meta.userId ?? null,
        details: { stack: e instanceof Error ? e.stack?.slice(0, 1200) : undefined },
      });
    }
    throw e;
  }
}
