# Format-aware performance tracking + rule-based SmartyCoach

Adds an adaptive tracking layer to the existing Workout Player, real performance storage, deterministic analysis, training load / readiness, and one contextual SmartyCoach recommendation before generating a workout. No AI calls, no new player, no change to the Workout of the Day, the generator, or the 1/2/3-star system.

## What exists today (verified)

- Player: `WorkoutPlayerDialog.tsx` — swipeable slides from `parseWorkoutSteps`, a timer from `parseStepTiming`, and a fixed `Reps + kg + Log set` row shown on every exercise slide. It refuses to log unless reps or kg are entered.
- Storage: `set_logs` already holds user, workout, step index, exercise, section, set number, reps, weight_kg, seconds. No planned values, no rounds/intervals/time result, no RPE.
- Subjective feedback lives separately in `workout_feedback` (kept untouched).
- Progress page shows score, badges, streaks, personal records via `progress.server.ts`.
- Coach page (`coach.tsx`) collects goal/focus/mood/minutes/equipment/level and calls `generateWorkout`.

## Phase 1 — Adaptive tracking in the existing player

New client module `src/lib/workout/tracking-model.ts`: given the workout (category, format) plus the parsed step (prescription text, section, exercise equipment from the library media/details cache), it returns a **tracking descriptor**:

- `strength-load` → set #, reps, kg (Strength, Muscle Building, loaded exercises)
- `reps-only` → set #, reps (bodyweight, Pilates, Mobility & Stability, unloaded circuit moves)
- `timed` → duration captured from the existing timer, no inputs
- `rounds` → AMRAP: rounds + extra reps (workout-level result)
- `intervals` → EMOM/TABATA: intervals completed / programmed, reps per interval
- `for-time` → completion time + finished / partial
- `completion-only` → Micro Workouts, Recovery, warm-up/cool-down steps
- Challenge maps to reps / time / duration by prescription shape.

It also parses the **planned** values out of the prescription (sets × reps @ kg, minutes, rounds) so planned vs actual can be compared.

The player keeps its exact layout and dark visual language; only the input row becomes conditional — kg never appears where it is irrelevant, and the "Log set" button is never required. Every slide keeps a plain `Done — next`, and a final workout-result step appears only for AMRAP / EMOM / FOR TIME / Challenge formats.

## Phase 2 — Storage

Database migration (backward compatible, no data destroyed):

- `set_logs`: add `planned_reps`, `planned_weight_kg`, `planned_seconds`, `rpe`, `metric` (text), `rounds`, `interval_index`, `distance_m`, `partial` (bool). All nullable — existing rows keep working.
- New `workout_results` table (one row per workout): `user_id`, `workout_id`, `format`, `category`, `metric`, `duration_seconds`, `rounds`, `extra_reps`, `intervals_done`, `intervals_total`, `finished` (bool), `rpe`, `analysis_note`, `training_load` (numeric), `data_points` (int). RLS scoped to `auth.uid()`, with the required GRANTs.

Logging stays optional everywhere: pressing Done through a workout stores completion plus whatever objective data the player already knows (timers run, slides completed) and nothing invented.

## Phase 3 — Deterministic analysis

`src/lib/performance/analysis.ts` — pure functions producing the short post-workout note from stored rows only: prescription met / exceeded / load reduced / reps missed / partial, conditioning comparison vs the previous comparable result, and the explicit "not enough logged performance data yet" fallback. Written on completion into `workout_results.analysis_note`.

## Phase 4-6 — History, training load, data confidence

- `src/lib/performance/strength.ts`: per-exercise history, load/rep/volume trends, repeated-success detection (needs 3 comparable sessions before suggesting progression).
- `src/lib/performance/conditioning.ts`: AMRAP total work, FOR TIME deltas, EMOM interval completion.
- `src/lib/performance/load.ts`: deterministic session load from volume, duration, difficulty stars, format and RPE when present; accumulates into recent-window states Low / Moderate / High / Very High. No fake numeric scores exposed.
- `src/lib/performance/readiness.ts`: Ready / Moderate / Caution / Recovery Recommended from recent load, load trend and RPE.
- `src/lib/performance/confidence.ts`: Limited / Developing / Established data.

All computed server-side in a new `src/lib/performance.functions.ts` (auth middleware) and reused by Progress, Logbook and Coach.

## Phase 7-8 — SmartyCoach rules engine

`src/lib/coach-rules/` with one file per rule family (confidence, strength, conditioning, load, progression, readiness, difficulty) and a small resolver that returns exactly **one** ranked recommendation. Pure TypeScript, no network, unit-testable.

On the Coach page, after the user picks goal/difficulty, a single compact card appears: "SmartyCoach recommendation" + one sentence + short reason, with `Continue` and `Change selection`. Never blocking. Limited-data users get the honest limited-information message.

On the WOD page and the WOD workout view, the same engine renders only a read-only **context note** (e.g. recovery attention) — it cannot alter category, difficulty or content. This is enforced by the WOD page never calling the recommendation-for-generation path.

## Phase 9 — Logbook & Progress

- Workout page / Logbook detail: a "Performance" block listing logged sets (planned vs actual), workout result, RPE if given, and the automatic analysis note. Existing subjective feedback block stays as-is.
- Progress page gains four sections below the existing content: Strength progress (per-exercise previous → current → trend), Conditioning progress, Training load (state + trend), Readiness, plus the consistency figures already shown. Nothing removed.

## Phase 10 — Tests

Vitest suites for the tracking-descriptor mapping across every category/format, planned-vs-actual comparison, analysis note generation, load/readiness/confidence classification, and the recommendation resolver (limited data, established data, high load → lower stars, repeated success → progression). Plus a browser pass through Strength, bodyweight, AMRAP, EMOM, FOR TIME, no-logging and partial-completion runs.

## Technical notes

- Everything deterministic and local; no AI gateway usage on any of these paths.
- New reads/writes go through `createServerFn` with `requireSupabaseAuth`; nothing bypasses RLS.
- Player tracking actions are exposed as plain named functions (`logSet`, `logResult`, `finish`) so a future voice layer can drive the same API.
- Existing `set_logs` rows without the new columns are treated as partial data and simply contribute less confidence.
