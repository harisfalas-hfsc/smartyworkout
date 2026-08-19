// Domain-specific training load. Strength and conditioning are NEVER mixed
// into one number: they are measured differently and reported separately.
// Users only ever see Low / Moderate / High / Very High — no raw scores.

import type { LoadState, SetLogRow, WorkoutResultRow } from "./types";

/**
 * Strength load = accumulated loaded work.
 *   loaded set  -> reps × kg
 *   bodyweight  -> reps × 1 (a rep still costs something, but is not inflated)
 * Only logged sets contribute. Missing values contribute nothing.
 */
export function strengthLoad(sets: SetLogRow[]): number | null {
  let total = 0;
  let counted = 0;
  for (const s of sets) {
    if (s.reps === null) continue;
    const perRep = s.weight_kg !== null && s.weight_kg > 0 ? s.weight_kg : 1;
    total += s.reps * perRep;
    counted += 1;
  }
  return counted ? Math.round(total) : null;
}

/**
 * Conditioning load = accumulated work under time.
 *   duration seconds / 6            (one point per 6 s of work)
 *   + rounds × 10
 *   + intervals completed × 5
 *   + distance metres / 20
 * Only logged values contribute.
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
      total += s.seconds / 6;
      counted += 1;
    }
    if (s.distance_m !== null) {
      total += s.distance_m / 20;
      counted += 1;
    }
  }

  const r = input.result;
  if (r) {
    if (r.duration_seconds !== null) {
      total += r.duration_seconds / 6;
      counted += 1;
    }
    if (r.rounds !== null) {
      total += r.rounds * 10;
      counted += 1;
    }
    if (r.intervals_done !== null) {
      total += r.intervals_done * 5;
      counted += 1;
    }
  }

  return counted ? Math.round(total) : null;
}

function classify(value: number | null, thresholds: [number, number, number]): LoadState {
  if (value === null) return "None";
  const [low, moderate, high] = thresholds;
  if (value < low) return "Low";
  if (value < moderate) return "Moderate";
  if (value < high) return "High";
  return "Very High";
}

/** Recent (rolling 7-day) strength load state. */
export function strengthLoadState(weeklyTotal: number | null): LoadState {
  return classify(weeklyTotal, [4000, 12000, 25000]);
}

/** Recent (rolling 7-day) conditioning load state. */
export function conditioningLoadState(weeklyTotal: number | null): LoadState {
  return classify(weeklyTotal, [200, 600, 1200]);
}

/**
 * Overall recent load, derived only from the domains that actually have data.
 * If a domain has no data it is left out entirely rather than counted as zero.
 */
export function overallLoadState(input: {
  strength: LoadState;
  conditioning: LoadState;
}): LoadState {
  const order: LoadState[] = ["None", "Low", "Moderate", "High", "Very High"];
  const present = [input.strength, input.conditioning].filter((s) => s !== "None");
  if (!present.length) return "None";
  const max = Math.max(...present.map((s) => order.indexOf(s)));
  const both = present.length === 2;
  // Two loaded domains in the same week is genuinely more than one.
  const bumped = both ? Math.min(order.length - 1, max + 1) : max;
  return order[bumped]!;
}
