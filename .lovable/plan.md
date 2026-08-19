# Format-aware performance tracking + rule-based SmartyCoach

Adds an adaptive tracking layer to the existing Workout Player, real performance storage, deterministic analysis, training load / readiness, and one contextual SmartyCoach recommendation before generating a workout. No AI calls, no new player, no change to the Workout of the Day, the generator, or the 1/2/3-star system.

## What exists today (verified)

- Player: `WorkoutPlayerDialog.tsx` — swipeable slides from `parseWorkoutSteps`, a timer from `parseStepTiming`, and a fixed `Reps + kg + Log set` row shown on every exercise slide. It refuses to log unless reps or kg are entered.
- Storage: `set_logs` already holds user, workout, step index, exercise, section, set number, reps, weight_kg, seconds. No planned values, no rounds/intervals/time result, no RPE.
- Subjective feedback lives separately in `workout_feedback` (kept untouched).
- Progress page shows score, badges, streaks, personal records via `progress.server.ts`.
- Coach page (`coach.tsx`) collects goal/focus/mood/minutes/equipment/level and calls `generateWorkout`.

## Phase 1 — Adaptive tracking in the existing player

New client module `src/lib/workout/tracking-model.ts`. For each step it reads the actual prescription text, the step's section/sub-section, the workout `category`/`format`, and the exercise's `equipment` field from the library (`"body weight"` marks unloaded movements, same test the generator already uses in `pool.server.ts`). From that it derives a **primary metric plus optional secondary metrics** — never a blanket "timed":

- Loaded strength/hypertrophy step → primary reps, secondary load (kg), set number.
- Bodyweight / Pilates / Mobility step → primary reps, no kg field at all.
- Hold (plank, dead hang) → primary duration.
- Distance movement (run, row, ski, bike) → primary duration, secondary distance when the prescription states one.
- Per-step timed work inside a larger workout stays a **step-level** metric; it never becomes the workout result.
- Workout-level result metrics apply only where the format defines one: AMRAP → duration + rounds + extra reps; FOR TIME → completion time + finished/partial; EMOM/TABATA → intervals completed vs programmed, with the actual per-interval prescription preserved.
- Micro Workouts / Recovery / prep sections → completion only.
- Challenge → reps, time or duration, chosen from the prescription shape.

EMOM and TABATA stay prescription-aware: the parser keeps each interval's own exercise and rep target when the prescription varies per interval, so actual work is compared against the actual prescription rather than a uniform assumption.

Planned values (sets × reps @ kg, minutes, rounds, intervals) are parsed from the same prescription so planned vs actual is possible without inventing anything.

The player keeps its exact layout, dark visual language and navigation. Only the input row becomes conditional; kg disappears where irrelevant, logging is never required, and the flow stays DO → optionally log → DONE → NEXT. No analytical messages are shown while training. A single workout-result step appears only for AMRAP / EMOM / TABATA / FOR TIME / Challenge, and an optional 1-10 RPE prompt appears once at the end.

## Phase 2 — Storage

Database migration (backward compatible, no data destroyed):

- `set_logs`: add `planned_reps`, `planned_weight_kg`, `planned_seconds`, `rpe`, `metric` (text), `rounds`, `interval_index`, `distance_m`, `partial` (bool). All nullable — existing rows keep working and missing fields stay NULL (= unavailable, never estimated).
- New `workout_results` table (one row per workout): `user_id`, `workout_id`, `format`, `category`, `metric`, `duration_seconds`, `rounds`, `extra_reps`, `intervals_done`, `intervals_total`, `finished` (bool), `rpe`, `analysis_note`, `strength_load`, `conditioning_load`, `data_points`. RLS scoped to `auth.uid()`, with the required GRANTs.

Only objective facts are stored: what the user typed, plus durations the timer actually measured. Anything not provided is stored as unavailable. A workout completed with zero logging still records completion normally.

## Phase 3 — Deterministic analysis

`src/lib/performance/analysis.ts` — pure functions producing **one short note** from stored rows only: prescription met / exceeded / load reduced / reps missed / partial, or a conditioning comparison against the previous comparable result, or the explicit "not enough logged performance data yet" fallback. Detailed trends live in Progress, not in this note. Written on completion into `workout_results.analysis_note`.

## Phase 4-6 — History, training load, data confidence

- `src/lib/performance/strength.ts`: per-exercise history and load/rep/volume trends; progression is only suggested after three comparable successful sessions.
- `src/lib/performance/conditioning.ts`: AMRAP total work, FOR TIME deltas, EMOM/TABATA interval completion, distance/pace where logged.
- `src/lib/performance/load.ts`: **three separate, domain-specific measures** — Strength Load (sets, reps, load, volume), Conditioning Load (duration, rounds, reps, intervals, distance, completion), and an Overall Recent Training Load derived from whichever domains actually have data. Each is a documented, conservative formula in code, surfaced to the user only as Low / Moderate / High / Very High — no raw numbers, no pseudo-precision.
- `src/lib/performance/readiness.ts`: a training-management indicator only. Returns **Limited Data** when evidence is insufficient; Ready / Moderate / Caution / Recovery Recommended otherwise. No medical or physiological claims.
- `src/lib/performance/confidence.ts`: Limited / Developing / Established data.

All computed server-side in a new `src/lib/performance.functions.ts` (auth middleware) and reused by Progress, Logbook and Coach.


## Phase 7-8 — SmartyCoach rules engine

`src/lib/coach-rules/` with one file per rule family (confidence, strength, conditioning, load, progression, readiness, difficulty) and a small resolver that returns exactly **one** ranked recommendation. Pure TypeScript, no network, unit-testable.

On the Coach page, after the user picks goal/difficulty, a single compact card appears: "SmartyCoach recommendation" + one sentence + short reason, with `Continue` and `Change selection`. Never blocking. Limited-data users get the honest limited-information message.

On the WOD page and the WOD workout view, the same engine renders only a read-only **context note** (e.g. pay attention to recovery today). It cannot change the WOD's category, difficulty, exercise selection, format, duration, programming or periodization — the WOD never calls the recommendation-for-generation path, and no WOD field is ever written by this layer. Recommendations always speak in 1 / 2 / 3 stars.

## Phase 9 — Logbook & Progress

- Workout page / Logbook detail: three clearly separate blocks — workout completion, objective performance (logged sets planned vs actual, workout result, RPE if given, the short analysis note), and the existing subjective feedback block, unchanged.
- Progress page gains new sections below the existing content: Strength progress (per-exercise previous → current → trend), Conditioning progress, Strength Load / Conditioning Load / Overall Recent Load states, Readiness (including Limited Data), plus the consistency figures already shown. Nothing removed. This is where detailed trends live.


## Phase 10 — Tests

Vitest suites for the tracking-descriptor mapping across every category/format, planned-vs-actual comparison, analysis note generation, load/readiness/confidence classification, and the recommendation resolver (limited data, established data, high load → lower stars, repeated success → progression). Plus a browser pass through Strength, bodyweight, AMRAP, EMOM, FOR TIME, no-logging and partial-completion runs.

## Technical notes

- Everything deterministic and local; no AI gateway usage on any of these paths.
- New reads/writes go through `createServerFn` with `requireSupabaseAuth`; nothing bypasses RLS.
- Player tracking actions are exposed as plain named functions (`logSet`, `logResult`, `finish`) so a future voice layer can drive the same API.
- Existing `set_logs` rows without the new columns are treated as partial data and simply contribute less confidence.
