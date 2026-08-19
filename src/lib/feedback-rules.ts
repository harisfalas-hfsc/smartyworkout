// Validation and interpretation rules for the single post-workout debrief.
//
// One record per attempt. Every field is optional: a member may complete a
// workout and answer nothing, or answer half. Nothing missing is invented and
// nothing missing is treated as a low value.

export const FEELING_OPTIONS = ["Excellent", "Good", "Normal", "Tired", "Exhausted"] as const;
export const ENJOY_OPTIONS = ["Yes", "Neutral", "No"] as const;
export const REPEAT_OPTIONS = ["Yes", "Maybe", "No"] as const;

export type DebriefInput = {
  rpe?: number | null;
  feeling?: string | null;
  enjoyed?: string | null;
  wouldRepeat?: string | null;
  note?: string | null;
};

export type DebriefValues = {
  rpe: number | null;
  feeling: string | null;
  enjoyed: string | null;
  wouldRepeat: string | null;
  note: string | null;
};

export function pickOption(value: unknown, allowed: readonly string[]): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return allowed.includes(v) ? v : null;
}

/** RPE is 1–10 or nothing at all. Never rounded up from an empty answer. */
export function clampRpe(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(10, Math.round(n)));
}

export function normalizeDebrief(input: DebriefInput): DebriefValues {
  return {
    rpe: clampRpe(input.rpe),
    feeling: pickOption(input.feeling, FEELING_OPTIONS),
    enjoyed: pickOption(input.enjoyed, ENJOY_OPTIONS),
    wouldRepeat: pickOption(input.wouldRepeat, REPEAT_OPTIONS),
    note: input.note ? String(input.note).slice(0, 500) : null,
  };
}

export type DebriefCoverage = {
  answered: number;
  total: number;
  /** Only these answers can take part in any calculation. */
  usable: { load: boolean; readiness: boolean; preference: boolean };
  label: string;
};

/**
 * What a partially answered debrief is allowed to influence. Skipping RPE does
 * not weaken the objective numbers; skipping the numbers does not invalidate
 * RPE. Each answer only ever powers its own job.
 */
export function debriefCoverage(values: DebriefValues): DebriefCoverage {
  const fields = [values.rpe, values.feeling, values.enjoyed, values.wouldRepeat, values.note];
  const answered = fields.filter((v) => v !== null && v !== "").length;
  return {
    answered,
    total: fields.length,
    usable: {
      load: values.rpe !== null,
      readiness: values.rpe !== null || values.feeling !== null,
      preference: values.enjoyed !== null || values.wouldRepeat !== null || values.note !== null,
    },
    label:
      answered === 0
        ? "Completed — performance not logged"
        : answered === fields.length
          ? "Debrief complete"
          : `Debrief partly answered (${answered} of ${fields.length})`,
  };
}
