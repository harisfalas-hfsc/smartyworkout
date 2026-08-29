# Final Programming Correction Pass

Four targeted corrections to the existing engine. No UI, questionnaire, player, WOD or library changes. No new architecture.

## Decisions confirmed

- Requested duration stays **training time** (Main + Finisher). Activation and cool down remain bounded allowances on top — unchanged.
- The undershoot gate is **relaxed**: a shorter, high-quality session is legal.

## 1. Duration is the container (not a filler)

- `programming.ts` — `fitMainToBudget` may trim the main block down to **2 exercises** (today it stops at 3), then sets, then rest. Strength/Muscle Building rest floors stay physiologically honest (no rest cuts below 90 s for Strength).
- `programming.ts` — `durationShape` counts become an *upper* starting point only; the fitted estimate always wins, and the estimate is never manipulated to appear to fit.
- `enforce.server.ts` — the "prescribed work is short of the advertised duration" rejection becomes a **warning**, not a blocking error.
- `validate.server.ts` — undershoot stays a warning, but a new hard error fires only when work is drastically short (below ~60 % of the requested training time). Overflow gates (`durationOverflowViolation`, session/activation/cooldown ceilings) stay exactly as they are.
- For clock formats (EMOM / AMRAP / TABATA / FOR TIME) the format clock remains the main-block duration — no change needed, just confirmed by test.

Result: a 30-min Strength session may legitimately be short activation + 2–3 quality lifts + short cooldown.

## 2. Micro Workout stays a movement break

- `programming.ts` — `microDose` is re-dosed as a break, not a mini gym session: 2–3 sets, moderate reps, rest 20–40 s, tempo wording without "harder leverage variations", no near-failure at any level (Advanced only adds a little density/range).
- `microMinutes` honours a requested short duration (clamped 10–20 min) instead of always forcing 10, keeping the low-fatigue dose.
- `prompt.server.ts` — the Micro paragraph loses "Advanced means harder leverage" and gains the plain-movement vocabulary you listed (sit-to-stands, wall/desk push-ups, calf raises, marching, trunk and mobility movements). Equipment ban and REPS & SETS lock stay as-is.

## 3. Advanced means demand, not complexity

- Sweep `programming.ts`, `prompt.server.ts` and `spec.ts` for any remaining wording that ties Advanced to leverage/technical variations and replace it with load, volume, density and familiar-variation language. `intensityDirective` already says this; the leftovers are the micro dose tempo and the micro prompt line.
- The existing global human-realism ban (pistols, levers, handstands, TGUs, Olympic lifts) is untouched and remains the deterministic backstop.

## 4. Cardio must remain Cardio

- `doctrine.ts` — add one deterministic rule, `cardioDominanceViolation`: in CARDIO, high-fatigue conditioning movements (burpees, thrusters, kettlebell swings, slams, wall balls, devil press, man-makers, snatch-type work) may be **at most one** of the main-block movements, and never the majority. Cyclical/aerobic and simple repeatable movements must dominate.
- `pool.server.ts` — CARDIO pool is biased toward aerobic/cyclical and simple repeatable movements (existing cardio-equipment vocabulary reused; no new lists duplicated).
- `validate.server.ts` — calls `cardioDominanceViolation` so the AI cannot turn Cardio into Metabolic. Existing `cardioExpression` prompt text is kept.

## 5. Preserved, verified by test

Strength/Muscle Building keep barbells, racks, benches, machines and cables under REPS & SETS. Pilates and Mobility & Stability stay REPS & SETS with no conditioning and no finisher. Recovery stays controlled recovery. Dynamic formats keep rejecting setup-heavy strength equipment. Activation relevance logic untouched.

## Tests (added / updated in `src/lib/workout/__tests__/`)

1. 30-min Strength: fitted plan may hold 2–3 exercises; estimate fits the training budget; no artificial shrink.
2. Micro 20-min: REPS & SETS, no activation/cooldown/finisher, low sets and short rest, equipment-free pool.
3. Advanced dynamic: impractical/technical movements rejected by the realism filter.
4. Cardio: a main block dominated by burpees/thrusters/swings fails `cardioDominanceViolation`; an aerobic block passes.
5. Metabolic EMOM: barbell bench, rack squat, machine work rejected (existing test kept).
6. Strength REPS & SETS: barbell/rack/machine/cable stay legal.
7. Pilates: REPS & SETS, no finisher, no conditioning.
8. Mobility & Stability: REPS & SETS, no conditioning.
9. Duration: drastically short session errors; modestly short session only warns.

## Files expected to change

`src/lib/workout/programming.ts`, `src/lib/workout/doctrine.ts`, `src/lib/workout/pool.server.ts`, `src/lib/workout/prompt.server.ts`, `src/lib/workout/enforce.server.ts`, `src/lib/workout/validate.server.ts`, `src/lib/workout/spec.ts` (wording only), plus the test files. Full suite must pass before reporting.
