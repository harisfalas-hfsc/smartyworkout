# Final generation-rules plan: Surprise Me, Micro, WOD, questionnaire

## What is already true in the code

**Surprise Me**
- Never picks Micro-workouts, Pilates, Mobility & Stability or Recovery. Also avoids the last 2 categories you trained.
- Always requests exactly 2 stars; mood can no longer downgrade the tier (mood only changes dose).
- Alternates deterministically between an equipped day and a bodyweight-only day.
- **Duration is not fixed.** It reuses the time chip on the Coach screen (5/10/15/20/30/45/60, default 30) with only a "below 20 becomes 30" rule. A 5-minute or 60-minute Surprise session is possible today.

**Micro-workouts**
- Already have no activation and no cool-down: one single 10-minute block.
- Already forced to bodyweight, with all training equipment banned, and stairs/doorways explicitly banned today.

**Workout of the Day**
- Category, difficulty and strength focus come from the shared 84-day calendar and are identical for every athlete; only equipment, location, mood, limitations and history are personal.
- The calendar includes Mobility & Stability, Pilates and Recovery days by design, and never Micro-workouts.

## Change 1 — Surprise Me duration (the one real gap)

Surprise Me becomes a normal full session, ignoring the time chip: the daily seed picks **40, 45 or 50 minutes**. Never less, never more.

Add 40 and 50 to the Coach time chips so those durations also exist for the questionnaire path (the list currently jumps 30 → 45 → 60).

## Change 2 — Micro-workout environment

Keep the no-activation / no-cool-down / 10-minute single-block rule exactly as it is, and keep all training equipment banned.

Refine the allowed environment so it matches your description: floor, wall, chair, sofa, desk, table **and stairs**, wherever the athlete already is — office, room or home. Stairs are currently hard-banned; they will be allowed as an optional surface, never as a required setup, so an office worker without stairs is never blocked.

## Change 3 — Periodization stays untouched

No change to the 84-day calendar: its categories, its difficulty labels, its Recovery days, its Mobility & Stability and Pilates days and their order all stay exactly as they are. Nothing in this plan reads, reorders or rewrites that table.

The only WOD adjustment is protective and outside periodization: WOD length comes from the athlete's typical-duration profile clamped to 10–90 minutes, so a profile set to 10 minutes produces a 10-minute STRENGTH day that the engine then has to squeeze. Non-recovery WOD days get a **minimum of 20 minutes** so the calendar's category is always trainable. Recovery days keep their 20-minute shape.

## Change 4 — Lock the contracts in tests

New engine tests that fail the build on regression:
- Surprise: excluded categories never appear, difficulty is always 2 stars, duration is always 40–50, equipment alternation is deterministic.
- Micro: never has an activation or cool-down section, never carries training equipment, stays a single ~10-minute block.
- WOD: category, stars and focus for a given calendar day are identical across two different athlete profiles; only equipment and location differ.

## Audit result for the three paths

All three feed the same engine and the same doctrine gates, and after the above they are non-conflicting:

- **Questionnaire:** goal → category, level/profile → stars, mood → dose only, chosen minutes → training budget.
- **Surprise Me:** same engine, with category pool, 2 stars, 40–50 minutes and equipment alternation overridden.
- **WOD:** calendar sets category/stars/focus for everyone; execution details stay personal.

Advertised duration everywhere means training time (main + finisher); activation and cool-down are bounded allowances on top, and Micro has neither.

## Technical detail

- `src/lib/coach-options.ts` — add 40 and 50 to `TIMES`.
- `src/lib/workout/create.server.ts` — in the `data.surprise` branch, replace `if (minutes < 20) minutes = 30` with a seeded pick from `[40, 45, 50]`.
- `src/lib/workout/programming.ts` and `src/lib/workout/doctrine.ts` — allow stairs in the micro environment wording and remove stairs from the micro ban pattern, keeping the equipment ban intact.
- `src/lib/daily.server.ts` — `Math.max(20, ...)` for non-recovery WOD minutes only.
- `src/lib/workout/__tests__/surprise.test.ts` (new) plus additions to the existing micro and WOD tests; the current 133 tests must stay green.
- `src/lib/wod-cycle.ts` — not modified.

No visual changes beyond the two extra time chips on the Coach screen.
