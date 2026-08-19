// Domain-specific training load.
//
// There is NO universal point scale here. Strength and conditioning are
// measured in their own units and are never mixed into one number. A load
// state describes how the last 7 days compare with the athlete's OWN recent
// baseline — not against an invented threshold table.
//
// Nothing missing is invented: a measure that was never logged contributes
// nothing and is not treated as zero. Without enough comparable history the
// answer is "Limited Data", not a guess.

import type { LoadState, SetLogRow, WorkoutResultRow } from "./types";

// --- per-session raw summaries (stored for history only) -------------------

/**
 * Stored strength summary: total EXTERNAL volume actually logged (reps x kg),
 * counted only for sets that carry a real load. Bodyweight sets are never
 * converted into a fake kilogram equivalent. Returns null when no loaded set
 * was logged.
 */
export function strengthLoad(sets: SetLogRow[]): number | null {
  let total = 0;
  let counted = 0;
  for (const s of sets) {
    if (s.reps === null || s.weight_kg === null || s.weight_kg <= 0) continue;
    total += s.reps * s.weight_kg;
    counted += 1;
  }
  return counted ? Math.round(total) : null;
}

/**
 * Stored conditioning summary: total working seconds actually logged for the
 * session (per-set work plus the workout-level duration when given). Returns
 * null when no duration was logged; rounds, intervals and distance are kept in
 * their own units elsewhere and are never folded into this figure.
 */
export function conditioningLoad(input: {
  sets: SetLogRow[];
  result?: Pick<
    WorkoutResultRow,
    "duration_seconds" | "rounds" | "extra_reps" | "intervals_done"
  > | null;
}): number | null {
  let total = 0;
  let counted = 0;
  for (const s of input.sets) {
    if (s.seconds !== null) {
      total += s.seconds;
      counted += 1;
    }
  }
  if (input.result?.duration_seconds != null) {
    total += input.result.duration_seconds;
    counted += 1;
  }
  return counted ? Math.round(total) : null;
}

// --- measure-based workload summaries --------------------------------------

/** Each field stays in its own unit. null means "never logged". */
export type StrengthWorkload = {
  sessions: number;
  workingSets: number;
  reps: number | null;
  externalVolumeKg: number | null;
  averageRpe: number | null;
};

export type ConditioningWorkload = {
  sessions: number;
  seconds: number | null;
  distanceM: number | null;
  rounds: number | null;
  intervals: number | null;
  averageRpe: number | null;
};

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function summarizeStrength(sets: SetLogRow[]): StrengthWorkload {
  const strengthSets = sets.filter((s) => s.reps !== null);
  let reps = 0;
  let volume = 0;
  let volumeCounted = 0;
  for (const s of strengthSets) {
    reps += s.reps ?? 0;
    if (s.weight_kg !== null && s.weight_kg > 0) {
      volume += (s.reps ?? 0) * s.weight_kg;
      volumeCounted += 1;
    }
  }
  return {
    sessions: new Set(strengthSets.map((s) => s.workout_id)).size,
    workingSets: strengthSets.length,
    reps: strengthSets.length ? reps : null,
    externalVolumeKg: volumeCounted ? Math.round(volume) : null,
    averageRpe: mean(
      strengthSets.map((s) => s.rpe).filter((v): v is number => v !== null),
    ),
  };
}

export function summarizeConditioning(input: {
  sets: SetLogRow[];
  results: WorkoutResultRow[];
}): ConditioningWorkload {
  let seconds = 0;
  let secondsCounted = 0;
  let distance = 0;
  let distanceCounted = 0;
  let rounds = 0;
  let roundsCounted = 0;
  let intervals = 0;
  let intervalsCounted = 0;
  const rpe: number[] = [];

  for (const s of input.sets) {
    if (s.seconds !== null) {
      seconds += s.seconds;
      secondsCounted += 1;
    }
    if (s.distance_m !== null) {
      distance += s.distance_m;
      distanceCounted += 1;
    }
  }
  for (const r of input.results) {
    if (r.duration_seconds !== null) {
      seconds += r.duration_seconds;
      secondsCounted += 1;
    }
    if (r.rounds !== null) {
      rounds += r.rounds;
      roundsCounted += 1;
    }
    if (r.intervals_done !== null) {
      intervals += r.intervals_done;
      intervalsCounted += 1;
    }
    if (r.rpe !== null) rpe.push(r.rpe);
  }

  return {
    sessions:
      new Set([
        ...input.sets.filter((s) => s.seconds !== null || s.distance_m !== null).map((s) => s.workout_id),
        ...input.results.map((r) => r.workout_id),
      ]).size,
    seconds: secondsCounted ? Math.round(seconds) : null,
    distanceM: distanceCounted ? Math.round(distance) : null,
    rounds: roundsCounted ? rounds : null,
    intervals: intervalsCounted ? intervals : null,
    averageRpe: mean(rpe),
  };
}

// --- baseline-relative classification --------------------------------------

/**
 * Turns "current week vs the athlete's own typical week" into a band.
 *   < 0.70  -> Low        (meaningfully below their normal)
 *   < 1.30  -> Moderate   (in line with their normal)
 *   < 1.80  -> High       (meaningfully above)
 *   >= 1.80 -> Very High  (far above)
 */
function bandFromRatio(ratio: number): LoadState {
  if (ratio < 0.7) return "Low";
  if (ratio < 1.3) return "Moderate";
  if (ratio < 1.8) return "High";
  return "Very High";
}

function ratios(current: Record<string, number | null>, baseline: Record<string, number | null>) {
  const out: number[] = [];
  for (const key of Object.keys(current)) {
    const c = current[key];
    const b = baseline[key];
    if (c === null || c === undefined) continue;
    if (b === null || b === undefined || b <= 0) continue;
    out.push(c / b);
  }
  return out;
}

/** Median keeps one unusual measure from dominating the whole picture. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export type BaselineWindow = {
  /** Weeks of history the baseline figures were averaged over (>= 1). */
  weeks: number;
  /** Sessions with comparable logged data inside that history. */
  sessions: number;
};

function classifyRelative(
  currentMeasures: Record<string, number | null>,
  baselineMeasures: Record<string, number | null>,
  currentSessions: number,
  baseline: BaselineWindow,
  effortAdjust: { current: number | null; baseline: number | null },
): LoadState {
  const hasCurrent = Object.values(currentMeasures).some((v) => v !== null && v !== undefined);
  if (!hasCurrent && currentSessions === 0) return "None";

  // A baseline needs real history: at least two prior weeks and two comparable
  // sessions. Anything thinner cannot say "high" or "low" honestly.
  if (baseline.weeks < 2 || baseline.sessions < 2) return "Limited Data";

  const perWeekBaseline: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(baselineMeasures)) {
    perWeekBaseline[key] = value === null || value === undefined ? null : value / baseline.weeks;
  }

  const r = ratios(currentMeasures, perWeekBaseline);
  if (!r.length) return "Limited Data";

  let ratio = median(r);
  // Logged effort, when the athlete gave it, nudges the same week up or down.
  if (effortAdjust.current !== null && effortAdjust.baseline !== null && effortAdjust.baseline > 0) {
    ratio *= effortAdjust.current / effortAdjust.baseline;
  }
  return bandFromRatio(ratio);
}

/** Recent strength load, judged against the athlete's own baseline. */
export function strengthLoadState(input: {
  current: StrengthWorkload;
  baseline: StrengthWorkload;
  baselineWeeks: number;
}): LoadState {
  return classifyRelative(
    {
      workingSets: input.current.workingSets || null,
      reps: input.current.reps,
      externalVolumeKg: input.current.externalVolumeKg,
    },
    {
      workingSets: input.baseline.workingSets || null,
      reps: input.baseline.reps,
      externalVolumeKg: input.baseline.externalVolumeKg,
    },
    input.current.sessions,
    { weeks: input.baselineWeeks, sessions: input.baseline.sessions },
    { current: input.current.averageRpe, baseline: input.baseline.averageRpe },
  );
}

/** Recent conditioning load, judged against the athlete's own baseline. */
export function conditioningLoadState(input: {
  current: ConditioningWorkload;
  baseline: ConditioningWorkload;
  baselineWeeks: number;
}): LoadState {
  return classifyRelative(
    {
      seconds: input.current.seconds,
      distanceM: input.current.distanceM,
      rounds: input.current.rounds,
      intervals: input.current.intervals,
    },
    {
      seconds: input.baseline.seconds,
      distanceM: input.baseline.distanceM,
      rounds: input.baseline.rounds,
      intervals: input.baseline.intervals,
    },
    input.current.sessions,
    { weeks: input.baselineWeeks, sessions: input.baseline.sessions },
    { current: input.current.averageRpe, baseline: input.baseline.averageRpe },
  );
}

/**
 * Overall recent load, derived only from the domains that actually produced a
 * band. Domains with no data, or without enough history, are left out.
 */
export function overallLoadState(input: {
  strength: LoadState;
  conditioning: LoadState;
}): LoadState {
  const order: LoadState[] = ["Low", "Moderate", "High", "Very High"];
  const present = [input.strength, input.conditioning].filter((s) => order.includes(s));
  if (!present.length) {
    if (input.strength === "Limited Data" || input.conditioning === "Limited Data")
      return "Limited Data";
    return "None";
  }
  const max = Math.max(...present.map((s) => order.indexOf(s)));
  const both = present.length === 2;
  // Two loaded domains in the same week is genuinely more than one.
  const bumped = both ? Math.min(order.length - 1, max + 1) : max;
  return order[bumped]!;
}
