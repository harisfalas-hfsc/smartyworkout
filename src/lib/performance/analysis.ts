// Deterministic post-workout analysis. Pure functions over stored rows only.
//
// Two concepts are kept strictly apart:
//   * Workout completion    -> workouts.status / completed_at (untouched here)
//   * Performance completion -> what was actually logged, below
// Finishing a workout NEVER back-fills sets, reps, kg, rounds, intervals or
// time. Anything not logged stays unavailable.

import { compareConditioning, describeResult } from "./conditioning";
import type { PerformanceCompletion, SetLogRow, WorkoutResultRow } from "./types";

/**
 * Objective performance completion for one workout, derived from logs only.
 * Planned totals come from the prescription that was parsed at logging time.
 */
export function performanceCompletion(
  sets: SetLogRow[],
  plannedSetsTotal: number | null = null,
): PerformanceCompletion {
  const setsLogged = sets.length;

  let repsPlanned: number | null = null;
  for (const s of sets) {
    if (s.planned_reps !== null) repsPlanned = (repsPlanned ?? 0) + s.planned_reps;
  }

  // A planned set count is only known where the prescription stated one.
  const setsPlanned: number | null = plannedSetsTotal;



  const repsLoggedValues = sets.map((s) => s.reps).filter((r): r is number => r !== null);
  const repsLogged = repsLoggedValues.length
    ? repsLoggedValues.reduce((a, b) => a + b, 0)
    : null;

  const incomplete =
    sets.some((s) => s.partial === true) ||
    (setsPlanned !== null && setsLogged < setsPlanned) ||
    (repsPlanned !== null && repsLogged !== null && repsLogged < repsPlanned);


  return { setsLogged, setsPlanned, repsLogged, repsPlanned, incomplete };
}

/**
 * Planned vs actual per step, for display. Missing entries are reported as
 * "not logged" — never zero, never estimated.
 */
export type StepComparison = {
  stepIndex: number;
  exerciseName: string;
  plannedSets: number | null;
  loggedSets: number;
  plannedReps: number | null;
  loggedReps: number | null;
};

export function stepComparisons(
  sets: SetLogRow[],
  plannedSetsByStep: Record<number, number | null> = {},
): StepComparison[] {
  const byStep = new Map<number, SetLogRow[]>();
  for (const s of sets) {
    const list = byStep.get(s.step_index) ?? [];
    list.push(s);
    byStep.set(s.step_index, list);
  }
  return [...byStep.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([stepIndex, rows]) => {
      const loggedRepsValues = rows.map((r) => r.reps).filter((r): r is number => r !== null);
      const plannedPerSet = rows.find((r) => r.planned_reps !== null)?.planned_reps ?? null;
      const plannedSets = plannedSetsByStep[stepIndex] ?? null;
      return {
        stepIndex,
        exerciseName: rows[0]!.exercise_name,
        plannedSets,
        loggedSets: rows.length,
        plannedReps:
          plannedPerSet !== null && plannedSets !== null
            ? plannedPerSet * plannedSets
            : plannedPerSet !== null
              ? plannedPerSet * rows.length
              : null,
        loggedReps: loggedRepsValues.length ? loggedRepsValues.reduce((a, b) => a + b, 0) : null,
      };
    });
}

export const NO_DATA_NOTE = "Not enough logged performance data yet.";

/** One short, factual sentence. Detailed trends live on the Progress page. */
export function analysisNote(input: {
  sets: SetLogRow[];
  result?: WorkoutResultRow | null;
  history?: WorkoutResultRow[];
}): string {
  const { sets, result } = input;

  if (result && describeResult(result)) {
    const comparison = compareConditioning(result, input.history ?? []);
    if (comparison && comparison.previous) {
      if (comparison.direction === "better")
        return `${comparison.current} — better than your previous ${comparison.previous}.`;
      if (comparison.direction === "worse")
        return `${comparison.current} — down from your previous ${comparison.previous}.`;
      if (comparison.direction === "same")
        return `${comparison.current} — same as your previous comparable session.`;
    }
    return `${comparison?.current ?? describeResult(result)} recorded. First comparable result for this format.`;
  }

  if (!sets.length) return NO_DATA_NOTE;

  const completion = performanceCompletion(sets);
  if (completion.repsPlanned !== null && completion.repsLogged !== null) {
    if (completion.repsLogged > completion.repsPlanned)
      return `${completion.repsLogged} reps logged against ${completion.repsPlanned} prescribed — above prescription.`;
    if (completion.repsLogged < completion.repsPlanned)
      return `${completion.repsLogged} of ${completion.repsPlanned} prescribed reps logged.`;
    return `Prescription met: ${completion.repsLogged} reps logged.`;
  }

  const loadReduced = sets.some(
    (s) => s.planned_weight_kg !== null && s.weight_kg !== null && s.weight_kg < s.planned_weight_kg,
  );
  if (loadReduced) return "Load was reduced on at least one set compared with the prescription.";

  return `${completion.setsLogged} set${completion.setsLogged === 1 ? "" : "s"} logged.`;
}
