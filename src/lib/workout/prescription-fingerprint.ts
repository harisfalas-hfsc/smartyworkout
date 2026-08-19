// Client-safe fingerprint of the performance-relevant prescription.
//
// Two sessions of "the same workout" are only comparable when the actual test
// is the same. If the workout is later edited from 20 sec intervals to 30 sec
// intervals, the fingerprint changes and the old sessions stop being compared
// against the new ones. Cosmetic fields (name, description, tips, image) are
// deliberately excluded so renaming a workout never breaks history.

import { parseWorkoutSteps, type WorkoutStep } from "./parse-steps";
import { parsePlanned } from "./tracking-model";

export type FingerprintInput = {
  format?: string | null;
  category?: string | null;
  durationMin?: number | null;
  /** Performance-relevant HTML (warm-up / main / finisher), already concatenated. */
  html?: string | null;
  /** Pre-parsed steps, when the caller already has them. */
  steps?: WorkoutStep[] | null;
};

function normalise(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stable, order-sensitive signature of what actually has to be performed. */
export function prescriptionSignature(input: FingerprintInput): string {
  const steps = input.steps ?? parseWorkoutSteps(input.html ?? "");
  const stepParts = steps.map((s) => {
    const p = parsePlanned(s.prescription);
    return [
      normalise(s.section),
      normalise(s.subSection),
      s.exerciseId || normalise(s.name),
      p.sets ?? "",
      p.reps ?? "",
      p.weightKg ?? "",
      p.seconds ?? "",
      p.distanceM ?? "",
    ].join(":");
  });

  return [
    `format=${normalise(input.format)}`,
    `category=${normalise(input.category)}`,
    `duration=${input.durationMin ?? ""}`,
    `steps=${stepParts.join("|")}`,
  ].join(";");
}

/** Short, deterministic, dependency-free hash (FNV-1a, hex). */
export function prescriptionHash(input: FingerprintInput): string {
  const signature = prescriptionSignature(input);
  let h = 0x811c9dc5;
  for (let i = 0; i < signature.length; i += 1) {
    h ^= signature.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Second pass over the reversed string keeps collisions unrealistic.
  let g = 0x811c9dc5;
  for (let i = signature.length - 1; i >= 0; i -= 1) {
    g ^= signature.charCodeAt(i);
    g = Math.imul(g, 0x01000193) >>> 0;
  }
  return `${h.toString(16).padStart(8, "0")}${g.toString(16).padStart(8, "0")}`;
}

/**
 * Two attempts are comparable only when both carry the same known hash.
 * A missing hash (legacy rows) is treated as unknown, never as "same".
 */
export function areComparable(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  return a === b;
}
