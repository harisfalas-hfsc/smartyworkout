import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Objective performance for one workout. Never touches workout completion. */
export const getWorkoutPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workoutId: string }) => ({ workoutId: String(input.workoutId) }))
  .handler(async ({ data, context }) => {
    const { loadWorkoutPerformance } = await import("@/lib/performance.server");
    return loadWorkoutPerformance(context.supabase as never, context.userId, data.workoutId);
  });

/** Rolling training load, readiness, confidence and per-exercise history. */
export const getPerformanceOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { loadPerformanceOverview } = await import("@/lib/performance.server");
    return loadPerformanceOverview(context.supabase as never, context.userId);
  });

/** One deterministic SmartyCoach recommendation. No AI, never blocking. */
export const getCoachRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { selectedStars: number; category?: string | null; format?: string | null }) => ({
    selectedStars: Math.max(1, Math.min(3, Number(input.selectedStars) || 1)),
    category: input.category ?? null,
    format: input.format ?? null,
  }))
  .handler(async ({ data, context }) => {
    const { loadPerformanceOverview } = await import("@/lib/performance.server");
    const { recommend, wodContextNote } = await import("@/lib/coach-rules");
    const overview = await loadPerformanceOverview(context.supabase as never, context.userId);
    const ctx = {
      selectedStars: data.selectedStars,
      category: data.category,
      format: data.format,
      confidence: overview.confidence,
      readiness: overview.readiness.state,
      readinessReason: overview.readiness.reason,
      strengthLoad: overview.load.strength,
      conditioningLoad: overview.load.conditioning,
      overallLoad: overview.load.overall,
      sessionsLast7: overview.sessionsLast7,
      consecutiveDays: overview.consecutiveDays,
      loggedSessions: overview.loggedSessions,
      progressionReady: overview.progressionReady,
      recentShortfalls: overview.recentShortfalls,
    };
    return {
      recommendation: recommend(ctx),
      wodNote: wodContextNote(ctx),
      confidence: overview.confidence,
      readiness: overview.readiness,
      load: overview.load,
    };
  });

/**
 * Read-only context for the Workout of the Day. No selected difficulty is
 * involved, no recommendation is produced, and the WOD itself is never
 * changed by this call.
 */
export const getWodContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { category?: string | null; format?: string | null }) => ({
    category: input?.category ?? null,
    format: input?.format ?? null,
  }))
  .handler(async ({ data, context }) => {
    const { loadPerformanceOverview } = await import("@/lib/performance.server");
    const { wodContextNote } = await import("@/lib/coach-rules");
    const overview = await loadPerformanceOverview(context.supabase as never, context.userId);
    return {
      wodNote: wodContextNote({
        selectedStars: null,
        category: data.category,
        format: data.format,
        confidence: overview.confidence,
        readiness: overview.readiness.state,
        readinessReason: overview.readiness.reason,
        strengthLoad: overview.load.strength,
        conditioningLoad: overview.load.conditioning,
        overallLoad: overview.load.overall,
        sessionsLast7: overview.sessionsLast7,
        consecutiveDays: overview.consecutiveDays,
        loggedSessions: overview.loggedSessions,
        progressionReady: overview.progressionReady,
        recentShortfalls: overview.recentShortfalls,
      }),
    };
  });

/** Allocates the attempt number for a NEW session of a workout. */
export const startWorkoutAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workoutId: string }) => ({ workoutId: String(input.workoutId) }))
  .handler(async ({ data, context }) => {
    const { nextAttemptNumber } = await import("@/lib/performance.server");
    const attempt = await nextAttemptNumber(context.supabase as never, context.userId, data.workoutId);
    return { attempt };
  });

/** Saves the optional workout-level result for ONE attempt. */
export const saveWorkoutResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      workoutId: string;
      attempt?: number | null;
      prescriptionHash?: string | null;
      performedAt?: string | null;
      format?: string | null;
      category?: string | null;
      metric?: string | null;
      durationSeconds?: number | null;
      rounds?: number | null;
      extraReps?: number | null;
      intervalsDone?: number | null;
      intervalsTotal?: number | null;
      finished?: boolean | null;
      rpe?: number | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { loadWorkoutPerformance, nextAttemptNumber } = await import("@/lib/performance.server");
    const { analysisNote } = await import("@/lib/performance/analysis");
    const { strengthLoad, conditioningLoad } = await import("@/lib/performance/load");

    // An explicit attempt always wins: editing must never allocate a new one.
    const attempt =
      data.attempt && data.attempt > 0
        ? Number(data.attempt)
        : await nextAttemptNumber(supabase as never, userId, data.workoutId);

    const existing = await loadWorkoutPerformance(supabase as never, userId, data.workoutId);
    const attemptSets =
      existing.attempts.find((a) => a.attempt === attempt)?.sets ?? [];

    const draft = {
      workout_id: data.workoutId,
      format: data.format ?? null,
      category: data.category ?? null,
      metric: data.metric ?? null,
      duration_seconds: data.durationSeconds ?? null,
      rounds: data.rounds ?? null,
      extra_reps: data.extraReps ?? null,
      intervals_done: data.intervalsDone ?? null,
      intervals_total: data.intervalsTotal ?? null,
      finished: data.finished ?? null,
      rpe: data.rpe ?? null,
      analysis_note: null,
      strength_load: null,
      conditioning_load: null,
      data_points: 0,
      created_at: new Date().toISOString(),
    };

    const note = analysisNote({
      sets: attemptSets,
      result: draft as never,
      history: [],
    });

    const dataPoints =
      attemptSets.length +
      [draft.duration_seconds, draft.rounds, draft.intervals_done, draft.rpe].filter(
        (v) => v !== null,
      ).length;

    const { error } = await (supabase as never as {
      from: (t: string) => any;
    })
      .from("workout_results")
      .upsert(
        {
          user_id: userId,
          workout_id: data.workoutId,
          attempt,
          prescription_hash: data.prescriptionHash ?? null,
          performed_at: data.performedAt ?? new Date().toISOString(),
          format: draft.format,
          category: draft.category,
          metric: draft.metric,
          duration_seconds: draft.duration_seconds,
          rounds: draft.rounds,
          extra_reps: draft.extra_reps,
          intervals_done: draft.intervals_done,
          intervals_total: draft.intervals_total,
          finished: draft.finished,
          rpe: draft.rpe,
          analysis_note: note,
          strength_load: strengthLoad(attemptSets),
          conditioning_load: conditioningLoad({ sets: attemptSets, result: draft as never }),
          data_points: dataPoints,
        },
        { onConflict: "workout_id,attempt" },
      );
    if (error) throw new Error(error.message);
    return { note, attempt };
  });

export type PerformanceEditRow = {
  /** Existing log id — present means UPDATE that row, absent means insert. */
  id?: string | null;
  stepIndex: number;
  exerciseId?: string | null;
  exerciseName: string;
  section?: string | null;
  setNumber: number;
  metric?: string | null;
  reps?: number | null;
  weightKg?: number | null;
  seconds?: number | null;
  distanceM?: number | null;
  plannedReps?: number | null;
  plannedWeightKg?: number | null;
  plannedSeconds?: number | null;
};

/**
 * Writes performance for ONE existing attempt (recap screen, or "Edit
 * performance" any day later). The attempt is always passed in and never
 * re-derived, so editing can never create a new session.
 */
export const savePerformanceEdits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workoutId: string; attempt: number; rows: PerformanceEditRow[] }) => ({
    workoutId: String(input.workoutId),
    attempt: Math.max(1, Number(input.attempt) || 1),
    rows: Array.isArray(input.rows) ? input.rows : [],
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { recalcAttempt } = await import("@/lib/performance.server");
    const db = supabase as never as { from: (t: string) => any };

    const inserts = data.rows.filter((r) => !r.id);
    const updates = data.rows.filter((r) => r.id);

    const shape = (r: PerformanceEditRow) => ({
      reps: r.reps ?? null,
      weight_kg: r.weightKg ?? null,
      seconds: r.seconds ?? null,
      distance_m: r.distanceM ?? null,
      metric: r.metric ?? null,
      planned_reps: r.plannedReps ?? null,
      planned_weight_kg: r.plannedWeightKg ?? null,
      planned_seconds: r.plannedSeconds ?? null,
      partial:
        r.plannedReps != null && r.reps != null ? r.reps < r.plannedReps : false,
    });

    if (inserts.length) {
      const { error } = await db.from("set_logs").insert(
        inserts.map((r) => ({
          user_id: userId,
          workout_id: data.workoutId,
          attempt: data.attempt,
          step_index: r.stepIndex,
          exercise_id: r.exerciseId || null,
          exercise_name: r.exerciseName,
          section: r.section ?? null,
          set_number: r.setNumber,
          ...shape(r),
        })),
      );
      if (error) throw new Error(error.message);
    }

    for (const r of updates) {
      const { error } = await db
        .from("set_logs")
        .update(shape(r))
        .eq("id", r.id)
        .eq("user_id", userId)
        .eq("workout_id", data.workoutId)
        .eq("attempt", data.attempt);
      if (error) throw new Error(error.message);
    }

    const recalc = await recalcAttempt(supabase as never, userId, data.workoutId, data.attempt);
    return { saved: data.rows.length, attempt: data.attempt, note: recalc.note };
  });
