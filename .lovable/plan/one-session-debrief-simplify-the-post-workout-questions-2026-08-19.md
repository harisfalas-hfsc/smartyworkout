# One session debrief: simplify the post-workout questions

A UX simplification and integration pass. The performance-tracking and repeat-attempt architecture stays. No changes to the Player's design, the Workout of the Day, the generator, the 3-star system, the training-load methodology, or Progress functionality. No AI calls.

## What is true today (verified in the code)

- Finishing the Player already marks the workout completed, and performance logging is already optional.
- Closing the Player early does **not** mark it completed, so logged sets can end up in a workout that never counts.
- Training Load comes only from the logged numbers, compared against the athlete's own 21-day normal. RPE is stored and averaged but currently does not enter the load calculation.
- The Player asks RPE; the workout page separately asks Too Easy / Just Right / Hard / Very Hard, feeling, enjoyment, repeat and a note — saved to a different table and used only as text in the next generation prompt.
- Result: the same thing is asked twice with no rule for conflicts, and three answers have no defined job.

## 1. Completion

- Finishing the Player marks the attempt completed (unchanged).
- Closing the Player after any set log or result also marks it completed, so work is never lost.
- No performance data is ever required. Completed with nothing logged shows as **Completed — performance not logged** and still counts in Logbook, history and consistency.

## 2. One attempt record

Each session has one attempt holding: completion, objective performance, RPE, feeling, enjoyment, repeat intention, optional note. The Player and the workout-page questionnaire read and write that same record. No second feedback record anywhere.

## 3. The debrief: five simple cards

Card-by-card, one question per card, after the workout is completed.

1. **How hard was this workout?** RPE 1–10. This is the only effort question — the Too Easy / Just Right / Hard / Very Hard scale is removed everywhere.
2. **How did you feel?** Excellent / Good / Normal / Tired / Exhausted.
3. **Did you enjoy the workout?** Yes / Neutral / No.
4. **Would you do it again?** Yes / Maybe / No.
5. **Anything SmartyCoach should remember?** Optional short text, skippable.

The whole debrief is skippable and never blocks completion.

## 4. What each answer is for

- **Performance data** — strength and conditioning analysis.
- **RPE** — the subjective effort input to training load, per the existing methodology.
- **Feeling** — readiness and long-term fatigue context. Never converted into load points.
- **Enjoyment** — preference and personalization. Never changes load.
- **Would do again** — adherence and preference. Never changes load.
- **Note** — qualitative context for SmartyCoach. Never becomes a number.
- **Completion** — history, consistency, streaks, badges.

## 5. Training load

Existing deterministic, history-relative methodology stays. Objective data supplies the measurable workload; RPE acts as the effort qualifier inside that existing model, not as a second independent load term added on top. Feeling, enjoyment, repeat intention and free text never touch it. Any internal number stays internal — the customer keeps seeing the state ("Training Load: High").

## 6. Player and questionnaire synchronized

One source of truth. Answer in the Player and the workout page shows the same answers, read-only, with an Edit button. Answer on the page first and the Player skips the debrief. Editing anywhere updates the same record everywhere. The same question is never asked twice for one attempt.

## 7. The flow

Start → train → optionally log performance → Finish → RPE → Feeling → Enjoyment → Would do again → (optional note) → done.

## 8. Progress

Customer-facing: Strength Progress, Conditioning Progress, Training Load, Readiness, RPE, Recent Feeling, Workout History. Preferences stay internal to SmartyCoach — no new dashboard.

## 9. SmartyCoach

At generation time SmartyCoach combines history, performance, RPE, recent load, readiness, feeling, preferences, repeat intention and profile into one advisory recommendation. Rule-based, no AI credits, never overrides the user, never alters the Workout of the Day.

## Technical notes

- Reuse `workout_feedback` as the single feedback store; add `attempt` and `rpe` columns and a unique key on (workout_id, user_id, attempt), written with upsert. Migration required. No new table.
- New shared `SessionDebriefDialog` (card stepper) used by both the Player and `workout.$workoutId.tsx`; it replaces the RPE field in `WorkoutResultDialog` and the four-choice block on the workout page. The Player's own screens are untouched.
- Remove the `difficulty_rating` question from the UI; keep the column for historical rows and map old values to an approximate RPE only for display of past sessions.
- RPE is read from the feedback record by the load layer as the effort qualifier in the existing formula — no new load term.
- Auto-complete on Player close when any set log or result exists for the attempt.
- Structured feeling / enjoyment / repeat signals replace the free-text paste in `create.server.ts` (avoid-list, deprioritise format, lighter session after repeated Tired/Exhausted).
- Tests: completion with no/partial/full logging; Player↔questionnaire sync and edit in both directions; RPE affects load only via the existing model; feeling, enjoyment and repeat leave load unchanged; WOD and generator behaviour unchanged.
