# Doctrine alignment check — Smarty Workout engine

Short answer: yes, the engine already follows this philosophy. The doctrine rewrite landed as `src/lib/workout/doctrine.ts` and is the single source of truth used by the pool filter, blueprint, prompt and validator. Seven items are still out of line with the spec. This plan closes exactly those, nothing else.

## Already matching the spec (verified in code)

- §3/§4 category families and the legal-format table (`LEGAL_FORMATS`); `spec.ts` re-exports it, so no second table exists.
- §5/§6/§26 Strength and Muscle Building keep barbells, racks, benches, machines and cables under Reps & Sets.
- §7/§8 Pilates and Mobility & Stability: Reps & Sets, banned load/conditioning vocabulary, no finisher.
- §9-§13/§24 dynamic categories reject barbell, rack, bench, spotter, Smith, cable and selectorized work; ergometers stay legal; machine strength never counts as cardio.
- §12 equipment-family cap enforced as a hard error (2 implement families in a dynamic format).
- §14 Micro Workout is bodyweight + environment only.
- §15 body focus is a hard gate for every category, applied in the pool filter and re-checked in the validator.
- §19 whole-session duration (activation + main + rest + finisher + cooldown) is a hard rejection.
- §21 activation relevance vs the main block is a hard error.
- §28-§30 pipeline order, retry loop, deterministic fallback, and no save on hard violations.
- §31 WOD schedule/rotation/presentation untouched; WOD generates through the same path.

## Gaps to fix

1. **Micro Workout prompt contradicts the doctrine (§4, §14, §32).** The Micro category brief still offers "CIRCUIT, AMRAP, EMOM, FOR TIME" while `LEGAL_FORMATS` locks Micro to Reps & Sets. Rewrite that brief to the movement-break shape only.
2. **Difficulty still widens to the adjacent level (§16).** The pool filter falls back to the neighbouring difficulty tier when a level is thin. Replace with level-appropriate selection: keep the strict tier, and when it is genuinely too small, fill from simpler variations only for Beginner and never hand Beginner Advanced movements; Advanced never drops into Beginner vocabulary.
3. **Two equipment-family definitions (§32).** `programming.ts` keeps its own `equipmentFamily`; delete it and use `equipmentFamilyOf` from the doctrine everywhere.
4. **Activation is not derived from the finished main block (§21).** Today the whole session is written in one AI pass and activation is only checked afterwards. Change: the activation vocabulary list handed to the model (and used by the deterministic fallback) is filtered by the dominant region and movement patterns of the built main block, so irrelevant prep can no longer be offered in the first place.
5. **Duration slack is too generous (§19/§29).** The session ceiling is 1.25× + 6 min, so a 30-minute request can pass at ~43 min. Tighten to a realistic material-overflow band (about 1.1× + 4 min) for the full session, keeping the work-only ceiling as the secondary check.
6. **Mood currently drops the effective difficulty star (§27).** Mood should change volume, complexity, rest and impact — not the difficulty tier used to filter the pool. Remove the star softening and keep the mood directive that reduces dose.
7. **Test coverage is short of the required 16 scenarios (§33).** Missing: Cardio + EMOM repeatable cardio, Metabolic For Time and Calorie Burning Tabata portability, Strength/Muscle Building with machines staying valid, Upper Body focus purity, the exact invalid barbell EMOM sequence, and the 30-minute total-session case.

## Technical notes

Files touched: `doctrine.ts` (duration bands), `pool.server.ts` (difficulty), `programming.ts` (family helper, activation pool derivation), `prompt.server.ts` (Micro brief, activation list), `pack.server.ts` (activation from main in the fallback), `create.server.ts` (mood/star), and `__tests__/doctrine.test.ts` + `engine.test.ts`.

Untouched: all UI, routes, player, display, database, WOD schedule/rotation/presentation.

## Report after implementation

The 13 required confirmations, including the rejected EMOM sequence, retained heavy equipment for Strength and Muscle Building, main-derived activation, hard duration validation, and unchanged WOD and customer-facing presentation.
