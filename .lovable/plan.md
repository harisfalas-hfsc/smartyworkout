# Surprise Me rules + full generation-rules audit

## What I checked in the code

**Surprise Me (confirmed as it stands today)**
- Category exclusions are already enforced: Micro-workouts, Pilates, Mobility & Stability and Recovery can never be picked. It also avoids the last 2 categories you trained.
- Difficulty is already forced to 2 stars, and mood no longer downgrades the tier (mood only changes dose).
- Equipment already alternates between an equipped and a bodyweight-only day.
- **Duration is NOT fixed.** Surprise Me currently reuses whatever time chip is selected in the Coach screen (5/10/15/20/30/45/60, default 30). The only rule is "if under 20, use 30". So a 5-minute or 60-minute surprise session is possible today — this does not match what you want.

## Change 1 — Surprise Me duration

Force Surprise Me to a normal full session: **45 minutes**, ignoring the time chip, with the alternation seed allowed to pick between **40, 45 and 50** minutes so it does not feel identical every time. Never below 40, never above 50.

Also add the 40 and 50 minute chips to the Coach time options so those durations exist consistently across the engine (currently the list jumps 30 → 45 → 60).

## Change 2 — Lock the Surprise Me contract in tests

Add engine tests that fail the build if any of these ever regress:
- category never in the excluded set
- requested difficulty always exactly 2 stars
- duration always within 40–50 minutes
- equipment alternates deterministically

## Audit of the three generation paths

I reviewed how the three entry points feed the same engine and found the logic sound, with three real conflicts worth fixing in the same pass.

**Path A — Questionnaire (Coach):** goal → category, level/profile → stars, mood → dose only, minutes → training budget. Consistent.

**Path B — Surprise Me:** same engine with the overrides above. Consistent once duration is fixed.

**Path C — Workout of the Day:** category, difficulty and focus come from the shared 84-day calendar, so it is identical for everyone; equipment, location, mood, limitations and history stay personal. Consistent with the WOD rule.

Conflicts to fix:

1. **WOD duration ignores the recovery/short-format intent for micro-length profiles.** WOD duration is `profile.typical_duration_min` clamped to 10–90. A profile set to 10 minutes gets a 10-minute STRENGTH WOD, which the engine then wants to reclassify. Clamp non-recovery WOD to a minimum of 20 minutes so the calendar's category is always trainable.

2. **The `minutes <= 5` micro override can silently override a WOD-adjacent request.** It is already skipped for WOD, but not for Surprise Me — after change 1 this becomes unreachable, and I will assert that with a test.

3. **The WOD calendar's own `stars: [1..6]` field is unused** — the engine reads the `difficulty` label instead. Keeping two parallel difficulty sources invites future drift, so the plan removes the dead `stars` pairs from the calendar and keeps the label as the single source of truth.

## Technical detail

- `src/lib/coach-options.ts` — extend `TIMES` to include 40 and 50.
- `src/lib/workout/create.server.ts` — in the `data.surprise` branch, replace the `if (minutes < 20) minutes = 30` rule with a hard assignment from `[40, 45, 50]` chosen by the existing daily seed.
- `src/lib/daily.server.ts` — clamp non-recovery WOD minutes to `Math.max(20, ...)`.
- `src/lib/wod-cycle.ts` — drop the unused `stars` tuples from the cycle table and its type.
- `src/lib/workout/__tests__/` — new `surprise.test.ts` covering the four invariants above; keep the existing 133 tests green.

No visual or copy changes to the Coach screen beyond the two extra time chips.
