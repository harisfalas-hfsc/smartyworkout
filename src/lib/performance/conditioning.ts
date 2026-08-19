import type { WorkoutResultRow } from "./types";

export type ConditioningComparison = {
  metric: string;
  current: string;
  previous: string | null;
  direction: "better" | "worse" | "same" | "unknown";
};

function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function describeResult(row: WorkoutResultRow): string | null {
  switch (row.metric) {
    case "amrap": {
      if (row.rounds === null) return null;
      const extra = row.extra_reps !== null ? ` + ${row.extra_reps} reps` : "";
      return `${row.rounds} rounds${extra}`;
    }
    case "for_time":
      return row.duration_seconds !== null ? fmtDuration(row.duration_seconds) : null;
    case "intervals":
      return row.intervals_done !== null
        ? `${row.intervals_done}${row.intervals_total !== null ? ` / ${row.intervals_total}` : ""} intervals`
        : null;
    case "challenge":
      if (row.duration_seconds !== null) return fmtDuration(row.duration_seconds);
      if (row.rounds !== null) return `${row.rounds} rounds`;
      return null;
    default:
      return null;
  }
}

/** Compares a result against the previous comparable one (same format + metric). */
export function compareConditioning(
  current: WorkoutResultRow,
  history: WorkoutResultRow[],
): ConditioningComparison | null {
  const currentText = describeResult(current);
  if (!currentText) return null;

  const previous = history.find(
    (r) =>
      r.workout_id !== current.workout_id &&
      r.metric === current.metric &&
      r.format === current.format &&
      describeResult(r) !== null,
  );
  if (!previous) {
    return { metric: current.metric ?? "", current: currentText, previous: null, direction: "unknown" };
  }

  let direction: ConditioningComparison["direction"] = "unknown";
  if (current.metric === "for_time" && current.duration_seconds !== null && previous.duration_seconds !== null) {
    direction =
      current.duration_seconds < previous.duration_seconds
        ? "better"
        : current.duration_seconds > previous.duration_seconds
          ? "worse"
          : "same";
  } else if (current.metric === "amrap" && current.rounds !== null && previous.rounds !== null) {
    direction =
      current.rounds > previous.rounds ? "better" : current.rounds < previous.rounds ? "worse" : "same";
  } else if (
    current.metric === "intervals" &&
    current.intervals_done !== null &&
    previous.intervals_done !== null
  ) {
    direction =
      current.intervals_done > previous.intervals_done
        ? "better"
        : current.intervals_done < previous.intervals_done
          ? "worse"
          : "same";
  }

  return {
    metric: current.metric ?? "",
    current: currentText,
    previous: describeResult(previous),
    direction,
  };
}
