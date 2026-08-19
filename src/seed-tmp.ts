import { readFileSync, writeFileSync } from "node:fs";
import { parseWorkoutSteps } from "@/lib/workout/parse-steps";
import { parsePlanned } from "@/lib/workout/tracking-model";
import { prescriptionHash } from "@/lib/workout/prescription-fingerprint";
import { strengthLoad, conditioningLoad } from "@/lib/performance/load";
import { analysisNote } from "@/lib/performance/analysis";
import type { SetLogRow } from "@/lib/performance/types";

const WORKOUT = "ac5e62ba-1dc3-4f2f-bca0-8fa61b2fc0c3";
const USER = "1f17c7b9-06aa-4c0b-a2ed-fd740e88451d";
const html = readFileSync("/tmp/mw.html", "utf8");
const steps = parseWorkoutSteps(html);
const hash = prescriptionHash({ format: "REPS & SETS", category: "STRENGTH", steps });

const q = (v: unknown) =>
  v === null || v === undefined ? "NULL" : typeof v === "number" || typeof v === "boolean" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

// Five dated sessions, roughly weekly, with a real progression story.
const sessions = [
  { attempt: 1, date: "2026-07-15T07:12:00Z", repFactor: 1.0, loadFactor: 1.0, rpe: 8, feeling: "Tired", difficulty: "Too hard", enjoyed: "Yes", repeat: "Yes", comment: "First run. Front squats felt heavy, last set short." },
  { attempt: 2, date: "2026-07-22T07:05:00Z", repFactor: 1.0, loadFactor: 1.05, rpe: 8, feeling: "OK", difficulty: "Just right", enjoyed: "Yes", repeat: "Yes", comment: "Same weights, cleaner reps." },
  { attempt: 3, date: "2026-07-30T06:58:00Z", repFactor: 1.1, loadFactor: 1.1, rpe: 7, feeling: "Good", difficulty: "Just right", enjoyed: "Yes", repeat: "Yes", comment: "Added a rep on the pulls, bar speed better." },
  { attempt: 4, date: "2026-08-07T07:20:00Z", repFactor: 1.15, loadFactor: 1.15, rpe: 7, feeling: "Strong", difficulty: "Just right", enjoyed: "Yes", repeat: "Yes", comment: "Best session so far, everything moved." },
  { attempt: 5, date: "2026-08-14T07:02:00Z", repFactor: 1.05, loadFactor: 1.18, rpe: 9, feeling: "Tired", difficulty: "Too hard", enjoyed: "Neutral", repeat: "Yes", comment: "Heaviest loads but fewer reps — poor sleep." },
];

const lines: string[] = [
  "begin;",
  `delete from set_logs where user_id=${q(USER)} and workout_id=${q(WORKOUT)};`,
  `delete from workout_results where user_id=${q(USER)} and workout_id=${q(WORKOUT)};`,
  `delete from workout_feedback where user_id=${q(USER)} and workout_id=${q(WORKOUT)};`,
];

for (const s of sessions) {
  const rows: SetLogRow[] = [];
  steps.forEach((step, i) => {
    const p = parsePlanned(step.prescription);
    const setsCount = p.sets ?? 1;
    const plannedReps = p.reps ?? null;
    const baseWeight = step.section === "Main Workout" ? (p.weightKg ?? 60) : (p.weightKg ?? null);
    for (let n = 1; n <= setsCount; n += 1) {
      if (plannedReps === null && p.seconds === null) continue;
      const reps =
        plannedReps === null ? null : Math.max(1, Math.round(plannedReps * s.repFactor - (n === setsCount && s.attempt === 1 ? 1 : 0)));
      const weight =
        step.section === "Main Workout" && baseWeight !== null
          ? Math.round(baseWeight * s.loadFactor * 2) / 2
          : null;
      const completed = new Date(new Date(s.date).getTime() + (i * 4 + n) * 60_000).toISOString();
      rows.push({
        id: crypto.randomUUID(),
        workout_id: WORKOUT,
        attempt: s.attempt,
        step_index: i,
        exercise_id: step.exerciseId || null,
        exercise_name: step.name,
        section: step.section,
        set_number: n,
        reps,
        weight_kg: weight,
        seconds: reps === null ? (p.seconds ?? null) : null,
        planned_reps: plannedReps,
        planned_weight_kg: baseWeight,
        planned_seconds: p.seconds ?? null,
        rpe: s.rpe,
        metric: reps === null ? "duration" : "reps",
        rounds: null,
        interval_index: null,
        distance_m: null,
        partial: plannedReps !== null && reps !== null ? reps < plannedReps : false,
        completed_at: completed,
      });
    }
  });

  for (const r of rows) {
    lines.push(
      `insert into set_logs (id,user_id,workout_id,attempt,step_index,exercise_id,exercise_name,section,set_number,reps,weight_kg,seconds,planned_reps,planned_weight_kg,planned_seconds,rpe,metric,partial,completed_at) values (${[
        q(r.id), q(USER), q(r.workout_id), r.attempt, r.step_index, q(r.exercise_id), q(r.exercise_name), q(r.section), r.set_number,
        q(r.reps), q(r.weight_kg), q(r.seconds), q(r.planned_reps), q(r.planned_weight_kg), q(r.planned_seconds), q(r.rpe), q(r.metric), q(r.partial), q(r.completed_at),
      ].join(",")});`,
    );
  }

  const result = {
    workout_id: WORKOUT,
    attempt: s.attempt,
    prescription_hash: hash,
    performed_at: s.date,
    format: "REPS & SETS",
    category: "STRENGTH",
    metric: "for_time" as const,
    duration_seconds: [2760, 2700, 2640, 2580, 2700][s.attempt - 1]!,
    rounds: null,
    extra_reps: null,
    intervals_done: null,
    intervals_total: null,
    finished: true,
    rpe: s.rpe,
    analysis_note: null,
    strength_load: null,
    conditioning_load: null,
    data_points: 0,
    created_at: s.date,
  };
  const note = analysisNote({ sets: rows, result: result as never, history: [] });
  const sl = strengthLoad(rows);
  const cl = conditioningLoad({ sets: rows, result: result as never });

  lines.push(
    `insert into workout_results (user_id,workout_id,attempt,prescription_hash,performed_at,format,category,metric,duration_seconds,finished,rpe,analysis_note,strength_load,conditioning_load,data_points,created_at) values (${[
      q(USER), q(WORKOUT), s.attempt, q(hash), q(s.date), q("REPS & SETS"), q("STRENGTH"), q("for_time"), result.duration_seconds, "true", s.rpe, q(note), q(sl), q(cl), rows.length + 3, q(s.date),
    ].join(",")});`,
  );

  lines.push(
    `insert into workout_feedback (user_id,workout_id,attempt,rpe,difficulty_rating,feeling,enjoyed,would_repeat,comment,created_at) values (${[
      q(USER), q(WORKOUT), s.attempt, s.rpe, q(s.difficulty), q(s.feeling), q(s.enjoyed), q(s.repeat), q(s.comment), q(s.date),
    ].join(",")});`,
  );
}

lines.push(
  `update workouts set status='completed', completed_at=${q(sessions[sessions.length - 1]!.date)}, scheduled_at=${q(sessions[sessions.length - 1]!.date)} where id=${q(WORKOUT)};`,
  "commit;",
);

writeFileSync("/tmp/seed/seed.sql", lines.join("\n"));
console.log("steps", steps.length, "hash", hash, "statements", lines.length);
