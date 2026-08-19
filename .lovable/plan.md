# Workout player, logging and repeat comparison — fix pack

## What is true today (verified in the code)

- **Timed steps ask the wrong question.** A step like "20 sec dumbbell clean" has no rep count in its text, so the tracking model treats it as a *hold* and asks "Seconds". It should ask **how many reps you did inside the 20 seconds**. Real holds (V-sit, plank, wall sit) are correct as they are.
- **There is no way to log after the fact.** Set logging exists only inside the player, on the live slide. Nothing in the app lets you fill in or correct numbers once the workout is finished — so on a Tabata or a for-time circuit you either lose the rep count or lose the clock.
- **The timer auto-advances.** When a countdown hits zero the player slides to the next exercise after 0.4 s, which throws away the moment you would use to log.
- **Back exits the player.** The dialog has no history handling, so the phone's back button dismisses the whole player instead of stepping back one slide.
- **The logbook never shows equipment.** Cards show name, category, stars, duration, mood, source — the workout's `equipment` array is not even fetched. Only the workout detail page prints it.
- **Repeats are not tracked at all.** `workout_results` is written with `upsert(..., { onConflict: "workout_id" })`, so a second attempt at the same workout **overwrites the first**. There is one result row per workout, forever. Set logs from a second attempt pile into the same workout with no attempt marker, so "I did 10 cleans last time, 15 this time" cannot be shown, and training load per attempt cannot be compared.

Everything else you asked about does work: what you log does feed Progress — strength load, conditioning load, overall load, readiness and the SmartyCoach recommendation all read your real `set_logs` and `workout_results` rows, compared against your own 21-day baseline.

## What will be built

### 1. Ask the right thing on every step

- New metric: **reps inside a fixed window**. When the prescription gives a time and the movement is countable (dumbbell clean, burpee, swing…), the player asks "Reps in 20 s", shows the window on the card, and stores planned seconds + actual reps.
- Holds and carries keep asking for seconds. Distance work keeps asking metres. Preparation and cool-down keep asking nothing.
- Every input gets a label above it so it is never ambiguous what the box wants.

### 2. Logging that fits inside 10 seconds

- Big **plus / minus stepper** and preset chips instead of a keyboard-only field — one tap per set.
- **Repeat last set** button: logs the same numbers as your previous set on that exercise instantly.
- The **countdown no longer auto-jumps** on a loggable step. It stops on a "Log it" state, you tap once, then swipe. Non-loggable steps keep auto-advancing.
- **Log later is always allowed.** Nothing is lost if you skip it in the moment.

### 3. Fill it in afterwards

- A **recap screen at the end of the player**: every step of the session listed, with the boxes for anything you did not log yet. Fill what you remember, save once.
- On a completed workout page, **Edit performance** opens the same recap so numbers can be corrected or added any day later. Editing recalculates that attempt's loads.

### 4. Back button behaves

- Inside the player, the phone/browser back button goes to the **previous slide**. Only on the first slide (or the X) does it ask to leave, so you never get thrown out of the session by accident.

### 5. Bodyweight vs equipment, visible everywhere

- Logbook cards get an **equipment badge**: "Bodyweight" or the actual kit ("Dumbbells, Bench").
- New **Equipment filter** in the logbook filter menu: Bodyweight only / Needs equipment.
- Same badge on the calendar and scheduled cards, and in the workout header.

### 6. Repeat the same workout and see if you did it better

- Each run of a workout becomes an **attempt**. Set logs and results are stamped with an attempt number instead of overwriting.
- The workout page gains an **Attempts** block. Each row is identified by the **date and time of the session** (DD/MM/YYYY, e.g. "14/08/2026 · 07:12"); the attempt number is shown only as a small secondary marker ("#3"). The history reads as a list of real dated sessions.
- Each row shows the result (rounds / time / intervals), total reps, strength and conditioning load, RPE — and the change versus the previous session, exactly the "5 times, 350 then 428" picture you described.
- **Comparison is metric-aware.** Direction of "better" is defined per metric, never assumed:
  - For time: **lower is better**.
  - AMRAP rounds, reps, distance, intervals completed, load lifted: **higher is better**.
  - RPE and training load: **neutral** — shown as context with a plain up/down arrow, never coloured as an improvement or a regression.
  - Anything without a defined direction stays neutral.
- **Editing an existing session edits that same session.** The recap/editor always writes back to the attempt it opened, then recalculates that attempt's result and loads in place. It never creates a new attempt; a new attempt is only created when the player is started again.
- Progress gains a **Repeated workouts** section listing the sessions you have done more than once and whether the trend is up, using the same metric-aware direction rules.


## Technical notes

- `src/lib/workout/tracking-model.ts`: add `reps_in_time` to `TrackingMetricName`; a countable-movement check so a stated duration plus a countable movement resolves to `primary: "reps"` with `windowSeconds`, while `HOLD_WORDS` still resolve to duration. Unit tests for Tabata/EMOM/AMRAP/hold/distance cases.
- `src/components/workout/WorkoutPlayerDialog.tsx`: labelled inputs, stepper + repeat-last-set, remove auto-advance for loggable steps, `history.pushState` guard for back, and a recap step before `onFinish`.
- New `src/components/workout/PerformanceEditorDialog.tsx` plus a server function to upsert/patch `set_logs` for one workout attempt; reused by the recap and by "Edit performance".
- Database migration: add `attempt integer not null default 1` to `set_logs` and `workout_results`; replace the `workout_id` unique constraint on `workout_results` with `(workout_id, attempt)`; keep existing rows at attempt 1. A helper resolves the next attempt number when a workout is played again.
- `src/lib/performance.server.ts`: `loadWorkoutPerformance` returns all attempts (per-attempt sets, result, loads, deltas) instead of a single `maybeSingle()` result; overview aggregation unchanged.
- `src/routes/_authenticated/logbook.tsx`: add `equipment` (and `location`) to the row query, badge component, equipment filter in the existing dropdown.

## Order of work

1. Metric fix + player logging speed + back button (the things that hurt mid-workout).
2. Recap and post-workout editing.
3. Equipment badges and filter.
4. Attempts migration, attempt-aware storage, comparison UI.
