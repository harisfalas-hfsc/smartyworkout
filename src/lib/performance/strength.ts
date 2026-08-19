import type { SetLogRow } from "./types";

export type ExerciseSession = {
  workoutId: string;
  date: string;
  setsLogged: number;
  topWeightKg: number | null;
  totalReps: number | null;
  volume: number | null;
  /** Every logged set met or beat its planned reps AND planned load. */
  metPrescription: boolean | null;
};

export type ExerciseHistory = {
  exerciseId: string | null;
  exerciseName: string;
  sessions: ExerciseSession[];
  trend: "up" | "flat" | "down" | "unknown";
  /** Only true after three comparable successful sessions. */
  progressionReady: boolean;
};

function sessionFrom(workoutId: string, rows: SetLogRow[]): ExerciseSession {
  const weights = rows.map((r) => r.weight_kg).filter((w): w is number => w !== null);
  const reps = rows.map((r) => r.reps).filter((r): r is number => r !== null);
  const volumeRows = rows.filter((r) => r.reps !== null);
  const volume = volumeRows.length
    ? Math.round(
        volumeRows.reduce((sum, r) => sum + r.reps! * (r.weight_kg && r.weight_kg > 0 ? r.weight_kg : 1), 0),
      )
    : null;

  const comparable = rows.filter((r) => r.planned_reps !== null && r.reps !== null);
  const metPrescription = comparable.length
    ? comparable.every(
        (r) =>
          r.reps! >= r.planned_reps! &&
          (r.planned_weight_kg === null || (r.weight_kg ?? 0) >= r.planned_weight_kg),
      )
    : null;

  return {
    workoutId,
    date: rows[0]?.completed_at ?? "",
    setsLogged: rows.length,
    topWeightKg: weights.length ? Math.max(...weights) : null,
    totalReps: reps.length ? reps.reduce((a, b) => a + b, 0) : null,
    volume,
    metPrescription,
  };
}

/** Groups logged sets per exercise, newest session first. */
export function buildExerciseHistories(rows: SetLogRow[]): ExerciseHistory[] {
  const byExercise = new Map<string, SetLogRow[]>();
  for (const row of rows) {
    const key = row.exercise_id ?? row.exercise_name.toLowerCase();
    const list = byExercise.get(key) ?? [];
    list.push(row);
    byExercise.set(key, list);
  }

  const out: ExerciseHistory[] = [];
  for (const [, list] of byExercise) {
    const byWorkout = new Map<string, SetLogRow[]>();
    for (const row of list) {
      const l = byWorkout.get(row.workout_id) ?? [];
      l.push(row);
      byWorkout.set(row.workout_id, l);
    }
    const sessions = [...byWorkout.entries()]
      .map(([workoutId, sets]) => sessionFrom(workoutId, sets))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    out.push({
      exerciseId: list[0]!.exercise_id,
      exerciseName: list[0]!.exercise_name,
      sessions,
      trend: trendOf(sessions),
      progressionReady: progressionReady(sessions),
    });
  }
  return out.sort((a, b) => b.sessions.length - a.sessions.length);
}

function trendOf(sessions: ExerciseSession[]): ExerciseHistory["trend"] {
  const withVolume = sessions.filter((s) => s.volume !== null).slice(0, 3);
  if (withVolume.length < 2) return "unknown";
  const latest = withVolume[0]!.volume!;
  const previous = withVolume[1]!.volume!;
  if (latest > previous * 1.03) return "up";
  if (latest < previous * 0.97) return "down";
  return "flat";
}

/** Progression is only suggested after three comparable successful sessions. */
function progressionReady(sessions: ExerciseSession[]): boolean {
  const recent = sessions.slice(0, 3);
  if (recent.length < 3) return false;
  return recent.every((s) => s.metPrescription === true);
}
