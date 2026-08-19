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

/** Saves the optional workout-level result. Absent fields stay unavailable. */
export const saveWorkoutResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      workoutId: string;
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
    const { loadWorkoutPerformance } = await import("@/lib/performance.server");
    const { analysisNote } = await import("@/lib/performance/analysis");
    const { strengthLoad, conditioningLoad } = await import("@/lib/performance/load");

    const existing = await loadWorkoutPerformance(supabase as never, userId, data.workoutId);
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
      sets: existing.sets,
      result: draft as never,
      history: [],
    });

    const dataPoints =
      existing.sets.length +
      [
        draft.duration_seconds,
        draft.rounds,
        draft.intervals_done,
        draft.rpe,
      ].filter((v) => v !== null).length;

    const { error } = await (supabase as never as {
      from: (t: string) => any;
    })
      .from("workout_results")
      .upsert(
        {
          user_id: userId,
          workout_id: data.workoutId,
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
          strength_load: strengthLoad(existing.sets),
          conditioning_load: conditioningLoad({ sets: existing.sets, result: draft as never }),
          data_points: dataPoints,
        },
        { onConflict: "workout_id" },
      );
    if (error) throw new Error(error.message);
    return { note };
  });
