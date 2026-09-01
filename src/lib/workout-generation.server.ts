/**
 * "No workout generation ever gets lost" — the lifecycle orchestrator.
 *
 * Every requested workout gets a tracked row. If the build fails we record
 * the failure, alert three recipients, and schedule an automatic retry with
 * exponential backoff. The moment a previously failed session succeeds the
 * member and both admin addresses are told exactly once. The happy path
 * writes a row and sends nothing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoachRequest } from "@/lib/workout/create.server";
import {
  classifyFailureKind,
  MAX_GENERATION_ATTEMPTS,
  resolveRequestConflicts,
  retryDelayMs,
} from "@/lib/workout-validation";
import {
  sendGenerationFailureAlerts,
  sendGenerationRecoveryAlerts,
  type DeliveryRecord,
} from "@/lib/workout-generation-alert.server";

export type GenerationStage = "initial" | "wod" | "refinement";

type AnyClient = SupabaseClient<any, any, any>;

export type GenerationRequestRow = {
  id: string;
  user_id: string;
  stage: string;
  request: CoachRequest;
  refinement_text: string | null;
  status: string;
  workout_id: string | null;
  attempt_count: number;
  customer_notified_at: string | null;
  recovery_notified_at: string | null;
  notes: string[] | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as AnyClient;
}

async function loadUser(db: AnyClient, userId: string) {
  const { data } = await db
    .from("profiles")
    .select("display_name,email")
    .eq("id", userId)
    .maybeSingle();
  const p = (data ?? null) as { display_name?: string | null; email?: string | null } | null;
  return { id: userId, name: p?.display_name ?? null, email: p?.email ?? null };
}

async function paymentState(db: AnyClient, userId: string): Promise<string> {
  const { data } = await db
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const s = (data ?? null) as { status?: string | null } | null;
  return s?.status ? `subscription ${s.status}` : "no subscription on file";
}

/** Applies the priority rules and returns the request plus plain-language notes. */
export function harmoniseRequest(
  request: CoachRequest,
  limitations: string[] = [],
): { request: CoachRequest; notes: string[] } {
  const resolved = resolveRequestConflicts({
    limitations,
    equipment: request.equipment ?? [],
    ...(request.location ? { location: request.location } : {}),
    ...(request.level ? { level: request.level } : {}),
    ...(request.goal ? { goal: request.goal } : {}),
    ...(typeof request.minutes === "number" ? { minutes: request.minutes } : {}),
  });
  // Workout of the Day is a fixed prescription — never rewrite its goal or level.
  if (request.wod) return { request: { ...request, equipment: resolved.equipment }, notes: resolved.notes };
  return {
    request: {
      ...request,
      equipment: resolved.equipment,
      ...(resolved.goal ? { goal: resolved.goal } : {}),
      ...(resolved.level ? { level: resolved.level } : {}),
      ...(typeof resolved.minutes === "number" ? { minutes: resolved.minutes } : {}),
    },
    notes: resolved.notes,
  };
}

export type TrackedResult =
  | { ok: true; workoutId: string; requestId: string; notes: string[] }
  | { ok: false; requestId: string };

/**
 * Runs one generation attempt inside the tracked lifecycle. `db` is the
 * caller's (RLS-scoped) client used for the actual build; bookkeeping always
 * goes through the service-role client.
 */
export async function runTrackedGeneration(opts: {
  db: AnyClient;
  userId: string;
  stage: GenerationStage;
  request: CoachRequest;
  refinementText?: string | null;
  /** Existing tracked row (a retry) — otherwise a new one is created. */
  requestId?: string;
}): Promise<TrackedResult> {
  const svc = await admin();

  const { data: profileRow } = await opts.db
    .from("profiles")
    .select("limitations")
    .eq("id", opts.userId)
    .maybeSingle();
  const limitations = ((profileRow as { limitations?: string[] } | null)?.limitations ?? []).filter(Boolean);
  const harmonised = harmoniseRequest(opts.request, limitations);

  let requestId = opts.requestId ?? "";
  if (!requestId) {
    const { data: created } = await svc
      .from("workout_generation_requests")
      .insert({
        user_id: opts.userId,
        stage: opts.stage,
        request: harmonised.request as unknown as Record<string, unknown>,
        refinement_text: opts.refinementText ?? null,
        status: "building",
        notes: harmonised.notes,
      } as never)
      .select("id")
      .maybeSingle();
    requestId = (created as { id?: string } | null)?.id ?? "";
  }

  try {
    const { createWorkoutForUser } = await import("@/lib/workout/create.server");
    const built = await createWorkoutForUser(opts.db as never, opts.userId, harmonised.request);
    await markReady(svc, requestId, opts, built);
    return { ok: true, workoutId: built.id, requestId, notes: harmonised.notes };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    await recordFailure(svc, { requestId, reason, ...opts });
    return { ok: false, requestId };
  }
}

async function markReady(
  svc: AnyClient,
  requestId: string,
  opts: { userId: string; stage: GenerationStage },
  built: { id: string; name: string },
) {
  if (!requestId) return;
  const { data } = await svc
    .from("workout_generation_requests")
    .select("id,user_id,stage,attempt_count,customer_notified_at,recovery_notified_at")
    .eq("id", requestId)
    .maybeSingle();
  const row = (data ?? null) as GenerationRequestRow | null;

  await svc
    .from("workout_generation_requests")
    .update({
      status: "ready",
      workout_id: built.id,
      workout_name: built.name,
      next_retry_at: null,
      completed_at: new Date().toISOString(),
    } as never)
    .eq("id", requestId);

  // Recovery notification — only when the member was already told about a delay.
  if (row?.customer_notified_at && !row.recovery_notified_at) {
    const user = await loadUser(svc, opts.userId);
    await sendGenerationRecoveryAlerts({
      sessionId: requestId,
      stage: opts.stage,
      attempts: (row.attempt_count ?? 0) + 1,
      workoutId: built.id,
      workoutName: built.name,
      user,
    });
    await svc
      .from("workout_generation_requests")
      .update({ recovery_notified_at: new Date().toISOString() } as never)
      .eq("id", requestId)
      .is("recovery_notified_at", null);
    await svc.from("notifications").insert({
      user_id: opts.userId,
      kind: "workout",
      title: "Your workout is ready",
      body: built.name,
      workout_id: built.id,
      dedupe_key: `recovered:${requestId}`,
    } as never);
  }
}

async function recordFailure(
  svc: AnyClient,
  args: {
    requestId: string;
    reason: string;
    userId: string;
    stage: GenerationStage;
    refinementText?: string | null;
  },
) {
  const failureKind = classifyFailureKind(args.reason);
  const { data } = await svc
    .from("workout_generation_requests")
    .select("id,attempt_count,customer_notified_at,refinement_text")
    .eq("id", args.requestId)
    .maybeSingle();
  const row = (data ?? null) as
    | { attempt_count: number; customer_notified_at: string | null; refinement_text: string | null }
    | null;
  const attempt = (row?.attempt_count ?? 0) + 1;
  const exhausted = attempt >= MAX_GENERATION_ATTEMPTS;
  const nextRetryAt = exhausted ? null : new Date(Date.now() + retryDelayMs(attempt)).toISOString();

  if (args.requestId) {
    await svc
      .from("workout_generation_requests")
      .update({
        status: "failed",
        attempt_count: attempt,
        next_retry_at: nextRetryAt,
        last_error: args.reason.slice(0, 1000),
      } as never)
      .eq("id", args.requestId);
  }

  const notifyCustomer = !row?.customer_notified_at;
  const user = await loadUser(svc, args.userId);
  let delivery: DeliveryRecord | null = null;
  try {
    delivery = await sendGenerationFailureAlerts({
      sessionId: args.requestId,
      stage: args.stage,
      reason: args.reason,
      failureKind,
      refinementText: args.refinementText ?? row?.refinement_text ?? null,
      attempt,
      urgent: exhausted,
      notifyCustomer,
      paymentState: await paymentState(svc, args.userId),
      user,
    });
  } catch {
    delivery = null;
  }

  if (notifyCustomer && args.requestId) {
    await svc
      .from("workout_generation_requests")
      .update({ customer_notified_at: new Date().toISOString() } as never)
      .eq("id", args.requestId)
      .is("customer_notified_at", null);
  }

  await svc.from("workout_generation_failures").insert({
    user_id: args.userId,
    session_id: args.requestId || null,
    stage: args.stage,
    reason: args.reason.slice(0, 2000),
    failure_kind: failureKind,
    refinement_text: args.refinementText ?? row?.refinement_text ?? null,
    email_status: delivery?.email_status ?? "error",
    email_error: delivery?.email_error ?? "alert dispatch failed",
    email_message_id: delivery?.email_message_id ?? null,
    email_recipient: delivery?.email_recipient ?? null,
    email_dispatched_at: delivery?.email_dispatched_at ?? null,
  } as never);
}

// ---------------------------------------------------------------------------
// Background recovery
// ---------------------------------------------------------------------------

/** Retries every failed session that is due. Bounded per run, single-flight per row. */
export async function retryPendingGenerations(limit = 5, force = false) {
  const svc = await admin();
  let query = svc
    .from("workout_generation_requests")
    .select("id,user_id,stage,request,refinement_text,attempt_count")
    .eq("status", "failed")
    .lt("attempt_count", MAX_GENERATION_ATTEMPTS);
  if (!force) {
    query = query
      .not("next_retry_at", "is", null)
      .lte("next_retry_at", new Date().toISOString());
  }
  const { data } = await query.order("created_at", { ascending: true }).limit(limit);
  const rows = (data ?? []) as GenerationRequestRow[];

  let retried = 0;
  let recovered = 0;
  for (const row of rows) {
    // Single flight — only one worker may claim a row.
    const { data: claimed } = await svc
      .from("workout_generation_requests")
      .update({ status: "building" } as never)
      .eq("id", row.id)
      .eq("status", "failed")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    retried += 1;
    // A failed refinement must be retried AS a refinement.
    const request: CoachRequest = row.refinement_text
      ? { ...(row.request ?? {}), note: row.refinement_text }
      : (row.request ?? {});
    const res = await runTrackedGeneration({
      db: svc,
      userId: row.user_id,
      stage: (row.stage as GenerationStage) ?? "initial",
      request,
      refinementText: row.refinement_text,
      requestId: row.id,
    });
    if (res.ok) recovered += 1;
  }
  return { scanned: rows.length, retried, recovered };
}

/** Retries one specific failed request from the administrator panel. */
export async function retryGenerationById(requestId: string) {
  const svc = await admin();
  const { data } = await svc
    .from("workout_generation_requests")
    .select("id,user_id,stage,request,refinement_text,attempt_count,status")
    .eq("id", requestId)
    .eq("status", "failed")
    .lt("attempt_count", MAX_GENERATION_ATTEMPTS)
    .maybeSingle();
  const row = (data ?? null) as GenerationRequestRow | null;
  if (!row) return { retried: 0, recovered: 0 };
  const { data: claimed } = await svc
    .from("workout_generation_requests")
    .update({ status: "building" } as never)
    .eq("id", row.id)
    .eq("status", "failed")
    .select("id")
    .maybeSingle();
  if (!claimed) return { retried: 0, recovered: 0 };
  const request: CoachRequest = row.refinement_text
    ? { ...(row.request ?? {}), note: row.refinement_text }
    : (row.request ?? {});
  const result = await runTrackedGeneration({
    db: svc,
    userId: row.user_id,
    stage: (row.stage as GenerationStage) ?? "initial",
    request,
    refinementText: row.refinement_text,
    requestId: row.id,
  });
  return { retried: 1, recovered: result.ok ? 1 : 0 };
}

/** Daily sweep — re-alerts (URGENT) any member still stuck with no workout. */
export async function sweepAbandonedGenerations(limit = 25) {
  const svc = await admin();
  const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  const { data } = await svc
    .from("workout_generation_requests")
    .select("id,user_id,stage,attempt_count,last_error,refinement_text,abandoned_alert_at")
    .eq("status", "failed")
    .is("workout_id", null)
    .is("next_retry_at", null)
    .or(`abandoned_alert_at.is.null,abandoned_alert_at.lt.${cutoff}`)
    .limit(limit);
  const rows = (data ?? []) as (GenerationRequestRow & {
    last_error: string | null;
    abandoned_alert_at: string | null;
  })[];

  for (const row of rows) {
    const user = await loadUser(svc, row.user_id);
    await sendGenerationFailureAlerts({
      sessionId: row.id,
      stage: row.stage,
      reason: row.last_error ?? "Session is still without a workout after the final retry.",
      failureKind: classifyFailureKind(row.last_error ?? ""),
      refinementText: row.refinement_text,
      attempt: row.attempt_count ?? MAX_GENERATION_ATTEMPTS,
      urgent: true,
      notifyCustomer: false,
      paymentState: await paymentState(svc, row.user_id),
      user,
    });
    await svc
      .from("workout_generation_requests")
      .update({ abandoned_alert_at: new Date().toISOString() } as never)
      .eq("id", row.id);
  }
  return { alerted: rows.length };
}

/**
 * Records a failure for work built outside `runTrackedGeneration` (the
 * Workout of the Day builder) so it joins the same retry + alert lifecycle.
 */
export async function recordGenerationFailure(opts: {
  userId: string;
  stage: GenerationStage;
  request: CoachRequest;
  reason: string;
  refinementText?: string | null;
}) {
  const svc = await admin();
  const { data: created } = await svc
    .from("workout_generation_requests")
    .insert({
      user_id: opts.userId,
      stage: opts.stage,
      request: opts.request as unknown as Record<string, unknown>,
      refinement_text: opts.refinementText ?? null,
      status: "building",
    } as never)
    .select("id")
    .maybeSingle();
  const requestId = (created as { id?: string } | null)?.id ?? "";
  await recordFailure(svc, {
    requestId,
    reason: opts.reason,
    userId: opts.userId,
    stage: opts.stage,
    refinementText: opts.refinementText ?? null,
  });
  return { requestId };
}

/** Admin "send test failure email" action. */
export async function sendTestFailureAlert(userId: string) {
  const svc = await admin();
  const user = await loadUser(svc, userId);
  return sendGenerationFailureAlerts({
    sessionId: "test-session",
    stage: "initial",
    reason: "Test alert triggered from the admin panel — no real failure occurred.",
    failureKind: "technical",
    attempt: 1,
    notifyCustomer: false,
    paymentState: "test",
    user,
  });
}
