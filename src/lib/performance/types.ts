// Shared, storage-shaped types for the deterministic performance layer.
// Every numeric field is nullable: missing means "not logged", never zero.

export type SetLogRow = {
  id: string;
  workout_id: string;
  /** Which session of this workout the log belongs to (1 = first time). */
  attempt: number;
  step_index: number;
  exercise_id: string | null;
  exercise_name: string;
  section: string | null;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  seconds: number | null;
  planned_reps: number | null;
  planned_weight_kg: number | null;
  planned_seconds: number | null;
  rpe: number | null;
  metric: string | null;
  rounds: number | null;
  interval_index: number | null;
  distance_m: number | null;
  partial: boolean | null;
  completed_at: string;
};

export type WorkoutResultRow = {
  workout_id: string;
  /** Which session of this workout the result belongs to (1 = first time). */
  attempt: number;
  /** Fingerprint of the prescription performed, for comparability checks. */
  prescription_hash: string | null;
  /** When the session was actually performed. */
  performed_at: string;
  format: string | null;
  category: string | null;
  metric: string | null;
  duration_seconds: number | null;
  rounds: number | null;
  extra_reps: number | null;
  intervals_done: number | null;
  intervals_total: number | null;
  finished: boolean | null;
  rpe: number | null;
  analysis_note: string | null;
  strength_load: number | null;
  conditioning_load: number | null;
  data_points: number;
  created_at: string;
};

export type LoadState =
  | "None"
  | "Limited Data"
  | "Low"
  | "Moderate"
  | "High"
  | "Very High";
export type ReadinessState =
  | "Limited Data"
  | "Ready"
  | "Moderate"
  | "Caution"
  | "Recovery Recommended";
export type ConfidenceState = "Limited" | "Developing" | "Established";

/**
 * Performance completion is separate from workout completion. It only ever
 * describes what was actually logged.
 */
export type PerformanceCompletion = {
  setsLogged: number;
  setsPlanned: number | null;
  repsLogged: number | null;
  repsPlanned: number | null;
  /** True when there is planned work with no matching log. Never estimated. */
  incomplete: boolean;
};
