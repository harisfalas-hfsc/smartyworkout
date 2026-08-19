// Metric-aware attempt comparison.
//
// Nothing here assumes "higher is better". Every comparable quantity declares
// its own direction, and quantities that are context only (RPE, training load)
// stay neutral for ever — a heavier session is not automatically a better one.

import { areComparable } from "@/lib/workout/prescription-fingerprint";
import { describeResult } from "./conditioning";
import type { WorkoutResultRow } from "./types";

export type MetricDirection = "higher_better" | "lower_better" | "neutral";

/** Direction of improvement per comparable quantity. */
export const METRIC_DIRECTION: Record<string, MetricDirection> = {
  duration_for_time: "lower_better",
  rounds: "higher_better",
  extra_reps: "higher_better",
  intervals_done: "higher_better",
  total_reps: "higher_better",
  total_volume_kg: "higher_better",
  distance_m: "higher_better",
  duration_hold: "higher_better",
  rpe: "neutral",
  strength_load: "neutral",
  conditioning_load: "neutral",
  overall_load: "neutral",
};

export type Verdict = "better" | "worse" | "same" | "neutral" | "unknown" | "not_comparable";

export type MetricDelta = {
  key: string;
  label: string;
  direction: MetricDirection;
  current: number | null;
  previous: number | null;
  delta: number | null;
  verdict: Verdict;
};

export function directionFor(key: string): MetricDirection {
  return METRIC_DIRECTION[key] ?? "neutral";
}

function verdictFor(
  direction: MetricDirection,
  current: number | null,
  previous: number | null,
): Verdict {
  if (current === null || previous === null) return "unknown";
  if (direction === "neutral") return "neutral";
  if (current === previous) return "same";
  const higher = current > previous;
  if (direction === "higher_better") return higher ? "better" : "worse";
  return higher ? "worse" : "better";
}

export function compareMetric(input: {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
  comparable?: boolean;
}): MetricDelta {
  const direction = directionFor(input.key);
  const comparable = input.comparable !== false;
  const delta =
    input.current !== null && input.previous !== null ? input.current - input.previous : null;
  return {
    key: input.key,
    label: input.label,
    direction,
    current: input.current,
    previous: input.previous,
    delta,
    verdict: comparable ? verdictFor(direction, input.current, input.previous) : "not_comparable",
  };
}

/** Result key that actually defines the outcome of this workout format. */
function resultKey(row: WorkoutResultRow): { key: string; label: string; value: number | null } | null {
  switch (row.metric) {
    case "for_time":
      return { key: "duration_for_time", label: "Time", value: row.duration_seconds };
    case "amrap":
      return { key: "rounds", label: "Rounds", value: row.rounds };
    case "intervals":
      return { key: "intervals_done", label: "Intervals", value: row.intervals_done };
    case "challenge":
      return row.duration_seconds !== null
        ? { key: "duration_for_time", label: "Time", value: row.duration_seconds }
        : { key: "rounds", label: "Rounds", value: row.rounds };
    default:
      return null;
  }
}

export type AttemptComparison = {
  comparable: boolean;
  /** Set when the two attempts were performed on different workout versions. */
  reason: "version_changed" | "no_previous" | null;
  resultText: string | null;
  previousResultText: string | null;
  metrics: MetricDelta[];
};

/**
 * Compares one attempt against the previous one. Returns a non-comparable
 * verdict — never a green or red delta — when the workout prescription changed
 * between the two sessions.
 */
export function compareAttempts(input: {
  current: WorkoutResultRow & { total_reps?: number | null; total_volume_kg?: number | null };
  previous:
    | (WorkoutResultRow & { total_reps?: number | null; total_volume_kg?: number | null })
    | null;
}): AttemptComparison {
  const { current, previous } = input;
  const resultText = describeResult(current);

  if (!previous) {
    return { comparable: false, reason: "no_previous", resultText, previousResultText: null, metrics: [] };
  }

  const comparable = areComparable(
    (current as { prescription_hash?: string | null }).prescription_hash,
    (previous as { prescription_hash?: string | null }).prescription_hash,
  );

  const rk = resultKey(current);
  const pk = previous ? resultKey(previous) : null;
  const metrics: MetricDelta[] = [];

  if (rk) {
    metrics.push(
      compareMetric({
        key: rk.key,
        label: rk.label,
        current: rk.value,
        previous: pk && pk.key === rk.key ? pk.value : null,
        comparable,
      }),
    );
  }

  metrics.push(
    compareMetric({
      key: "total_reps",
      label: "Total reps",
      current: current.total_reps ?? null,
      previous: previous.total_reps ?? null,
      comparable,
    }),
    compareMetric({
      key: "total_volume_kg",
      label: "Volume",
      current: current.total_volume_kg ?? null,
      previous: previous.total_volume_kg ?? null,
      comparable,
    }),
    compareMetric({
      key: "strength_load",
      label: "Strength load",
      current: current.strength_load,
      previous: previous.strength_load,
      comparable,
    }),
    compareMetric({
      key: "conditioning_load",
      label: "Conditioning load",
      current: current.conditioning_load,
      previous: previous.conditioning_load,
      comparable,
    }),
    compareMetric({
      key: "rpe",
      label: "RPE",
      current: current.rpe,
      previous: previous.rpe,
      comparable,
    }),
  );

  return {
    comparable,
    reason: comparable ? null : "version_changed",
    resultText,
    previousResultText: describeResult(previous),
    metrics: metrics.filter((m) => m.current !== null || m.previous !== null),
  };
}

/** Overall trend across a comparable series, using the defining result metric only. */
export function seriesTrend(
  attempts: Array<WorkoutResultRow & { prescription_hash?: string | null }>,
): { verdict: Verdict; label: string } {
  const ordered = [...attempts].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const latest = ordered[ordered.length - 1];
  if (!latest) return { verdict: "unknown", label: "No sessions" };
  const previous = [...ordered]
    .slice(0, -1)
    .reverse()
    .find((r) => areComparable(r.prescription_hash, latest.prescription_hash));
  if (!previous) return { verdict: "not_comparable", label: "Not directly comparable" };
  const rk = resultKey(latest);
  const pk = resultKey(previous);
  if (!rk || !pk || rk.key !== pk.key) return { verdict: "unknown", label: "No comparable result" };
  const d = compareMetric({ key: rk.key, label: rk.label, current: rk.value, previous: pk.value });
  const labels: Record<Verdict, string> = {
    better: "Improved",
    worse: "Down on last time",
    same: "Held steady",
    neutral: "Context only",
    unknown: "Not enough data",
    not_comparable: "Not directly comparable",
  };
  return { verdict: d.verdict, label: labels[d.verdict] };
}
