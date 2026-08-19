# One session debrief: simplify RPE, feedback and training load

## What is true today (verified in the code)

- Finishing the player (the "Finish workout" button, through recap and result dialogs) **does** mark the workout completed automatically. Closing the player early does **not** — your logged sets are saved, but the workout stays "planned" and never counts in progress, streaks or badges.
- The numbers you type in the player (reps, weight, seconds, distance, rounds, time, intervals) are the **only** input to Training Load. Load is history-relative: your last 7 days compared to your own 21-day normal, per unit, banded Low / Moderate / High / Very High.
- RPE (asked at the end of the player) is stored and averaged, but it does **not** change Training Load. It is a separate line.
- The questionnaire under the workout ("How was it / How did you feel / Did you enjoy it / Would you do it again / anything to remember") is saved in a different table, is **only** pasted as text into the next AI generation prompt, and touches nothing else — not load, not RPE, not the training profile.
- So today: two places ask overlapping questions, they never talk to each other, and three of the four answers do almost nothing.

## The problem

"Very Hard" in the questionnaire and "RPE 2" in the player can both exist and the system has no rule for which wins. Answers are collected without a defined job.

## The fix: one debrief, one rule per answer

Replace both the player's RPE step and the page's feedback block with a **single card-by-card debrief** (swipe left/right, one question per card), used identically in both places and always writing to the same record.

Cards, in order:

1. **Effort** — Too Easy / Just Right / Hard / Very Hard. This *is* the RPE. Each choice maps to a fixed RPE value (2 / 5 / 7 / 9). No separate RPE question anywhere. One question, one number.
2. **How did you feel after** — Excellent / Good / Normal / Tired / Exhausted. Drives recovery: two "Tired/Exhausted" in a row makes the next generated session lighter, and shows a "recovery first" note on the load panel.
3. **Did you enjoy it** — Yes / Neutral / No. "No" adds the session's main movements to a soft-avoid list for the next generation; "Yes" reinforces them.
4. **Would you do it again** — Yes / Maybe / No. "No" bans that exact format/category combination from the next generation; "Maybe" deprioritises it.
5. **Anything Smarty Coach should remember** — free text, passed to the next generation as-is.

After the last card, the app tells you plainly what it took from your answers, e.g. "Logged as hard effort (RPE 7). You felt tired — your next session will be lighter."

## Parallel, never duplicated

- One saved answer set per attempt. Answer in the player → the block on the workout page shows the same answers already filled in, with an "Edit answers" button. Answer on the page first → the player skips the debrief entirely.
- Editing from either place updates the same record; no second copy, no conflict.
- The debrief stays optional and skippable; skipping never blocks completion.

## Completion rule

- Finishing the player marks the workout completed (already the case).
- If you close the player after logging any set or entering any result, the workout is marked completed too, so your work always counts. Nothing is lost because you exited early.
- The debrief is never required for completion.

## What the athlete finally sees

- **Training Load** — from logged numbers only, relative to your own normal.
- **Effort** — the single RPE derived from the effort card.
- **Recovery** — from the "how did you feel" trend.
- **Coach notes** — enjoyment, repeat and free text, feeding the next generation.

Four clear lines instead of overlapping scores.

## Technical notes

- New shared component `SessionDebriefDialog` (card stepper) replacing the RPE field in `WorkoutResultDialog` and the `Choice` block in `workout.$workoutId.tsx`.
- Store the debrief once per attempt: extend `workout_feedback` with `attempt` and `rpe`, unique on (workout_id, user_id, attempt), upsert on edit. Migration required.
- Effort→RPE map lives in one module (`src/lib/performance/effort.ts`) and is the only RPE source; `saveWorkoutResult` reads it instead of a separate RPE input.
- Feeling/enjoy/repeat become structured signals consumed in `create.server.ts` (avoid list, format ban, load damping) rather than free text.
- Auto-complete on player close when any set log or result exists for the attempt.
