# Fix training-load methodology and WOD context

Two corrections only. No changes to the player, tracking model, set logging, workout_results, Logbook, Progress UI, WOD programming, or the 1/2/3-star system. No AI calls. No schema changes.

## 1. Training load: baseline-relative instead of invented scales

Keep the three domains exactly as they are today (Strength Load, Conditioning Load, Overall Recent Training Load) and the exact user-facing states (Low / Moderate / High / Very High, plus the existing None/Limited handling). Replace only how they are computed.

New methodology, in `src/lib/performance/load.ts`:

- Strength workload per session is summarised from what was actually logged: number of working sets, reps, external load (volume = reps x kg only where kg exists), and RPE where present. Bodyweight sets are counted as sets/reps work and are never converted into a fake kilogram equivalent, so they are never compared against loaded volume on the same scale.
- Conditioning workload per session is summarised from what was actually logged: duration, distance, rounds, reps, intervals completed vs prescribed, completion status, and RPE where present. Each measure stays in its own unit.
- Nothing missing is invented. A measure absent from the logs contributes nothing and does not count as zero.
- Classification is relative to the user's own recent comparable history: the last 7 days are compared against the user's typical week from the preceding trailing window (roughly 28 days) using the same measures. Low / Moderate / High / Very High then mean "meaningfully below", "in line with", "meaningfully above", and "far above" the athlete's own baseline. No universal thresholds, no exposed point totals.
- When there is not enough comparable history to form a baseline, the domain returns Limited Data rather than guessing a band.
- Overall Recent Training Load stays derived only from the domains that actually have data, using the same relative bands.

Ripple effects, kept minimal:

- `src/lib/performance/types.ts`: add a `"Limited Data"` member to `LoadState` (the existing `"None"` stays for "nothing logged at all"). No database columns change.
- `src/lib/performance.server.ts`: pass the baseline window (already loaded, 28 days) into the new classifiers instead of the old weekly totals.
- `src/lib/performance/readiness.ts` and `src/lib/coach-rules/index.ts`: treat Limited Data the same way they already treat thin evidence — no readiness escalation, no star recommendation. Wording and UI stay as they are.
- `src/components/performance/TrainingLoadPanel.tsx`: unchanged code path; it just renders the new state string.
- `workout_results.strength_load` / `conditioning_load` stay as raw stored per-session summaries for history; they are no longer used to produce user-facing bands.

## 2. Workout of the Day context

- `WodContextNote` currently calls the coach endpoint with a hard-coded `selectedStars: 2`. Remove that.
- Make `selectedStars` optional on the coach input and on `CoachContext`. When absent, no star language and no star suggestion can be produced.
- Add a dedicated context-only path: the WOD note is derived from readiness, confidence and overall load only, and it never returns a recommendation object. The WOD's own difficulty is used only if it is already available on the page; otherwise selected difficulty is simply omitted.
- The existing coach recommendation card (which does pass real selected stars) keeps behaving exactly as today.
- WOD category, difficulty, exercises, format, duration, programming and periodization remain untouched.

## Tests

Existing suites (`src/lib/workout/__tests__/`) are run unchanged. New focused tests:

- `src/lib/performance/__tests__/load.test.ts` — baseline-relative classification: below/in-line/above/far-above baseline, Limited Data with thin history, bodyweight work never inflated into loaded volume, missing measures never treated as zero.
- `src/lib/coach-rules/__tests__/wod-context.test.ts` — the WOD path produces a note with no selected stars, never returns a star suggestion, and returns nothing when evidence is limited.
