// Server-side aggregation for the deterministic performance layer.
// Everything here reads stored rows only — nothing is estimated or invented.

import { analysisNote, performanceCompletion, stepComparisons } from "@/lib/performance/analysis";
import { buildExerciseHistories } from "@/lib/performance/strength";
import { compareConditioning, describeResult } from "@/lib/performance/conditioning";
import { dataConfidence } from "@/lib/performance/confidence";
import {
  conditioningLoad,
  conditioningLoadState,
  overallLoadState,
  strengthLoad,
  strengthLoadState,
} from "@/lib/performance/load";
import { readiness } from "@/lib/performance/readiness";
import type { SetLogRow, WorkoutResultRow } from "@/lib/performance/types";

type Client = {
  from: (table: string) => any;
};

const SET_COLUMNS =
  "id,workout_id,step_index,exercise_id,exercise_name,section,set_number,reps,weight_kg,seconds,planned_reps,planned_weight_kg,planned_seconds,rpe,metric,rounds,interval_index,distance_m,partial,completed_at";
const RESULT_COLUMNS =
  "workout_id,format,category,metric,duration_seconds,rounds,extra_reps,intervals_done,intervals_total,finished,rpe,analysis_note,strength_load,conditioning_load,data_points,created_at";

function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export async function loadWorkoutPerformance(
  supabase: Client,
  userId: string,
  workoutId: string,
) {
  const [{ data: setRows }, { data: resultRow }, { data: history }] = await Promise.all([
    supabase
      .from("set_logs")
      .select(SET_COLUMNS)
      .eq("user_id", userId)
      .eq("workout_id", workoutId)
      .order("step_index", { ascending: true })
      .order("set_number", { ascending: true }),
    supabase
      .from("workout_results")
      .select(RESULT_COLUMNS)
      .eq("user_id", userId)
      .eq("workout_id", workoutId)
      .maybeSingle(),
    supabase
      .from("workout_results")
      .select(RESULT_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const sets = (setRows ?? []) as SetLogRow[];
  const result = (resultRow ?? null) as WorkoutResultRow | null;
  const past = (history ?? []) as WorkoutResultRow[];

  return {
    sets,
    result,
    resultText: result ? describeResult(result) : null,
    comparison: result ? compareConditioning(result, past) : null,
    completion: performanceCompletion(sets),
    steps: stepComparisons(sets),
    note:
      result?.analysis_note ??
      (sets.length || result ? analysisNote({ sets, result, history: past }) : null),
  };
}

export async function loadPerformanceOverview(supabase: Client, userId: string) {
  const since = daysAgoISO(28);
  const [{ data: setRows }, { data: resultRows }] = await Promise.all([
    supabase
      .from("set_logs")
      .select(SET_COLUMNS)
      .eq("user_id", userId)
      .gte("completed_at", since)
      .order("completed_at", { ascending: false })
      .limit(1000),
    supabase
      .from("workout_results")
      .select(RESULT_COLUMNS)
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const sets = (setRows ?? []) as SetLogRow[];
  const results = (resultRows ?? []) as WorkoutResultRow[];

  const week = daysAgoISO(7);
  const weekSets = sets.filter((s) => s.completed_at >= week);
  const weekResults = results.filter((r) => r.created_at >= week);

  const sLoad = strengthLoad(weekSets.filter((s) => s.reps !== null));
  const cLoad = conditioningLoad({
    sets: weekSets,
    result: weekResults.length
      ? weekResults.reduce(
          (acc, r) => ({
            duration_seconds: sum(acc.duration_seconds, r.duration_seconds),
            rounds: sum(acc.rounds, r.rounds),
            extra_reps: sum(acc.extra_reps, r.extra_reps),
            intervals_done: sum(acc.intervals_done, r.intervals_done),
          }),
          {
            duration_seconds: null as number | null,
            rounds: null as number | null,
            extra_reps: null as number | null,
            intervals_done: null as number | null,
          },
        )
      : null,
  });

  const strengthState = strengthLoadState(sLoad);
  const conditioningState = conditioningLoadState(cLoad);
  const overall = overallLoadState({ strength: strengthState, conditioning: conditioningState });

  const loggedWorkoutIds = new Set([
    ...sets.map((s) => s.workout_id),
    ...results.map((r) => r.workout_id),
  ]);
  const confidence = dataConfidence({
    loggedSessions: loggedWorkoutIds.size,
    loggedSets: sets.length,
  });

  const days = new Set(sets.map((s) => s.completed_at.slice(0, 10)));
  const rpeValues = [
    ...sets.map((s) => s.rpe),
    ...results.map((r) => r.rpe),
  ].filter((v): v is number => v !== null);

  const sessionsLast7 = new Set(weekSets.map((s) => s.workout_id)).size + weekResults.length;
  const readinessResult = readiness({
    overallLoad: overall,
    sessionsLast7,
    consecutiveDays: consecutiveDays(days),
    averageRpe: rpeValues.length ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length : null,
    loggedSessions: loggedWorkoutIds.size,
  });

  const histories = buildExerciseHistories(sets);
  const shortfalls = countShortfalls(sets);

  return {
    confidence,
    readiness: readinessResult,
    load: { strength: strengthState, conditioning: conditioningState, overall },
    sessionsLast7,
    consecutiveDays: consecutiveDays(days),
    loggedSessions: loggedWorkoutIds.size,
    strength: histories.filter((h) => h.sessions.length > 0).slice(0, 8),
    conditioning: results
      .map((r) => ({ ...r, text: describeResult(r) }))
      .filter((r) => r.text !== null)
      .slice(0, 8),
    progressionReady: histories.filter((h) => h.progressionReady).map((h) => h.exerciseName),
    recentShortfalls: shortfalls,
  };
}

function sum(a: number | null, b: number | null) {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

function countShortfalls(sets: SetLogRow[]): number {
  const byWorkout = new Map<string, SetLogRow[]>();
  for (const s of sets) {
    const list = byWorkout.get(s.workout_id) ?? [];
    list.push(s);
    byWorkout.set(s.workout_id, list);
  }
  let count = 0;
  for (const [, rows] of byWorkout) {
    const c = performanceCompletion(rows);
    if (c.incomplete) count += 1;
  }
  return count;
}

function consecutiveDays(days: Set<string>): number {
  if (!days.size) return 0;
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (streak === 0) {
      // Today may simply not have happened yet; check yesterday once.
      cursor.setDate(cursor.getDate() - 1);
      const key2 = cursor.toISOString().slice(0, 10);
      if (days.has(key2)) continue;
    }
    break;
  }
  return streak;
}
