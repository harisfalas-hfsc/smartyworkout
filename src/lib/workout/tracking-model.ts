// Client-safe adaptive tracking model.
//
// Derives, for every playable step, WHAT is worth recording — never a blanket
// "timed" assumption. Everything here is parsed from the actual prescription
// text, the section it belongs to, the workout category/format and the
// exercise's own equipment field. Nothing is invented: when a value is not
// stated it stays null and the UI simply does not ask for it.

import type { WorkoutStep } from "./parse-steps";

export type PrimaryMetric = "reps" | "duration" | "completion";

export type StepTracking = {
  /** What the athlete is primarily doing on this step. */
  primary: PrimaryMetric;
  /** External load is meaningful (loaded strength / hypertrophy work). */
  load: boolean;
  /** A distance is part of the prescription (run / row / ski / bike). */
  distance: boolean;
  /** Stored on the log row so later analysis knows how to read it. */
  metric: TrackingMetricName;
  /** Whether logging individual sets makes sense for this step. */
  setBased: boolean;
};

export type TrackingMetricName =
  | "reps"
  | "reps_load"
  | "hold"
  | "distance"
  | "completion";

export type PlannedPrescription = {
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  seconds: number | null;
  distanceM: number | null;
};

const BODYWEIGHT_EQUIPMENT = new Set([
  "body weight",
  "bodyweight",
  "assisted",
  "",
]);

const UNLOADED_CATEGORIES = new Set(["PILATES", "MOBILITY & STABILITY", "RECOVERY"]);

const HOLD_WORDS = [
  "plank",
  "hold",
  "hang",
  "dead hang",
  "wall sit",
  "isometric",
  "bridge hold",
  "l-sit",
];

const DISTANCE_WORDS = ["run", "jog", "row", "ski", "bike", "cycle", "sprint", "walk", "swim"];

const REST_FRAGMENT_RE = /rest[^.;]*?\d+\s*(sec|secs|seconds|s|min|minutes|m)\b/gi;

function has(haystack: string, words: string[]) {
  return words.some((w) => haystack.includes(w));
}

/** Parses only what the prescription actually states. Anything absent is null. */
export function parsePlanned(prescription: string): PlannedPrescription {
  const raw = prescription ?? "";
  const text = raw.replace(REST_FRAGMENT_RE, " ");
  const planned: PlannedPrescription = {
    sets: null,
    reps: null,
    weightKg: null,
    seconds: null,
    distanceM: null,
  };

  // "4 x 8", "4 × 8", "4 sets x 8 reps"
  const setsReps = text.match(/\b(\d{1,2})\s*(?:sets?\s*)?[x×]\s*(\d{1,3})\b/i);
  if (setsReps) {
    planned.sets = Number(setsReps[1]);
    planned.reps = Number(setsReps[2]);
  } else {
    const sets = text.match(/\b(\d{1,2})\s*sets?\b/i);
    if (sets) planned.sets = Number(sets[1]);
    const reps = text.match(/\b(\d{1,3})\s*reps?\b/i);
    if (reps) planned.reps = Number(reps[1]);
  }

  const weight = text.match(/\b(\d{1,3}(?:\.\d+)?)\s*(kg|kgs|kilos?)\b/i);
  if (weight) planned.weightKg = Number(weight[1]);

  const clock = text.match(/\b(\d{1,2}):([0-5]\d)\b/);
  const min = text.match(/\b(\d+(?:\.\d+)?)\s*(min|mins|minute|minutes)\b/i);
  const sec = text.match(/\b(\d{1,3})\s*(sec|secs|second|seconds)\b/i);
  if (clock) planned.seconds = Number(clock[1]) * 60 + Number(clock[2]);
  else if (min) planned.seconds = Math.round(Number(min[1]) * 60);
  else if (sec) planned.seconds = Number(sec[1]);

  const km = text.match(/\b(\d+(?:\.\d+)?)\s*km\b/i);
  const metres = text.match(/\b(\d{2,5})\s*(m|meters?|metres?)\b/i);
  if (km) planned.distanceM = Math.round(Number(km[1]) * 1000);
  else if (metres) planned.distanceM = Number(metres[1]);

  return planned;
}

/** Total prescribed reps for a step, when both sets and reps are stated. */
export function plannedTotalReps(planned: PlannedPrescription): number | null {
  if (planned.reps === null) return null;
  return (planned.sets ?? 1) * planned.reps;
}

export function deriveStepTracking(input: {
  step: Pick<WorkoutStep, "prescription" | "section" | "subSection" | "name">;
  category?: string | null;
  format?: string | null;
  equipment?: string | null;
}): StepTracking {
  const { step } = input;
  const category = (input.category ?? "").toUpperCase();
  const section = step.section ?? "Main Workout";
  const text = `${step.name} ${step.prescription}`.toLowerCase();
  const planned = parsePlanned(step.prescription);

  // Preparation, recovery and micro sections: completion is the only honest signal.
  if (
    section === "Soft Tissue Preparation" ||
    section === "Cool-down" ||
    category === "RECOVERY" ||
    category === "MICRO-WORKOUTS"
  ) {
    return { primary: "completion", load: false, distance: false, metric: "completion", setBased: false };
  }

  if (has(text, DISTANCE_WORDS) && (planned.distanceM !== null || planned.seconds !== null)) {
    return { primary: "duration", load: false, distance: true, metric: "distance", setBased: false };
  }

  if (has(text, HOLD_WORDS) || (planned.reps === null && planned.seconds !== null)) {
    return { primary: "duration", load: false, distance: false, metric: "hold", setBased: true };
  }

  const equipment = (input.equipment ?? "").trim().toLowerCase();
  const unloaded =
    BODYWEIGHT_EQUIPMENT.has(equipment) || UNLOADED_CATEGORIES.has(category);

  if (unloaded) {
    return { primary: "reps", load: false, distance: false, metric: "reps", setBased: true };
  }

  return { primary: "reps", load: true, distance: false, metric: "reps_load", setBased: true };
}

// ---------------------------------------------------------------------------
// Workout-level result
// ---------------------------------------------------------------------------

export type WorkoutResultMetric =
  | "amrap"
  | "for_time"
  | "intervals"
  | "challenge"
  | "none";

export type WorkoutResultModel = {
  metric: WorkoutResultMetric;
  /** Programmed intervals for EMOM / TABATA, when the workout states them. */
  intervalsTotal: number | null;
  /** Programmed time cap / window in seconds, when stated. */
  windowSeconds: number | null;
};

/**
 * Only formats that actually define a workout-level result get one. Timed work
 * inside a circuit stays a step-level metric and never becomes the result.
 */
export function deriveWorkoutResultModel(input: {
  category?: string | null;
  format?: string | null;
  html?: string | null;
  steps?: WorkoutStep[];
}): WorkoutResultModel {
  const format = (input.format ?? "").toUpperCase();
  const category = (input.category ?? "").toUpperCase();
  const text = (input.html ?? "").toLowerCase();

  const window = (() => {
    const m = text.match(/\b(\d{1,2})\s*(?:-)?\s*(?:min|minute)s?\s*(?:amrap|emom|cap|window)/i);
    return m ? Number(m[1]) * 60 : null;
  })();

  if (format === "AMRAP") return { metric: "amrap", intervalsTotal: null, windowSeconds: window };
  if (format === "FOR TIME") return { metric: "for_time", intervalsTotal: null, windowSeconds: window };
  if (format === "EMOM" || format === "TABATA") {
    const intervals = countIntervals(input.steps ?? [], text, format);
    return { metric: "intervals", intervalsTotal: intervals, windowSeconds: window };
  }
  if (category === "CHALLENGE") {
    return { metric: "challenge", intervalsTotal: null, windowSeconds: window };
  }
  return { metric: "none", intervalsTotal: null, windowSeconds: null };
}

function countIntervals(steps: WorkoutStep[], text: string, format: string): number | null {
  if (format === "TABATA") {
    const rounds = text.match(/\b(\d{1,2})\s*rounds?\b/i);
    // A Tabata block is 8 intervals per exercise unless the workout states rounds.
    if (rounds) return Number(rounds[1]);
    const tabataSteps = steps.filter((s) => (s.subSection ?? "").toLowerCase() === "tabata");
    return tabataSteps.length ? tabataSteps.length * 8 : null;
  }
  const minutes = text.match(/\bemom\b[^.]*?\b(\d{1,2})\s*(?:min|minute)s?\b/i);
  if (minutes) return Number(minutes[1]);
  const emomSteps = steps.filter((s) => (s.subSection ?? "").toLowerCase() === "emom");
  return emomSteps.length || null;
}

export const RESULT_LABELS: Record<WorkoutResultMetric, string> = {
  amrap: "Rounds completed",
  for_time: "Time to finish",
  intervals: "Intervals completed",
  challenge: "Challenge result",
  none: "",
};
