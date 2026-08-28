# Workout Generation Doctrine — Single Authoritative Rewrite

Replace the workout-generation rules inside the existing engine. No new engine, no UI, player, questionnaire, library or WOD-schedule changes. The WOD keeps its calendar, rotation and presentation and simply generates through the same rewritten rules (it already calls the same generation path).

## What exists today (verified)

- Pipeline: `create.server.ts` → `generate.server.ts` → `pool.server.ts` (filter) → `programming.ts` (blueprint) → `prompt.server.ts` → `enforce.server.ts` → `validate.server.ts` → quality gate → save. WOD uses the exact same call.
- `doctrine.ts` already holds category/format locking, dynamic-equipment legality, micro rules, focus rules and activation relevance.
- Gaps against the new specification:
  - `CATEGORY_FORMATS` still lets Micro Workout run CIRCUIT/AMRAP/FOR TIME/EMOM, and Challenge run MIX.
  - Body focus is only a hard filter for Strength and Muscle Building; other categories can ignore it.
  - Equipment-family minimisation for dynamic formats is prompt advice only, never validated.
  - Duration validation counts Main + Finisher only; activation, cooldown, rest and transitions are not counted against the requested session length.
  - Mobility & Stability has no explicit heavy-load rule; legacy regex bans overlap and partly contradict the doctrine module.

## What will change

1. **One doctrine module.** `src/lib/workout/doctrine.ts` becomes the only place programming legality is defined: category families, legal formats per category, equipment legality per category+format, micro rules, focus rules, activation relevance, finisher legality, equipment-family limits and full-session duration limits. Legacy regex rules scattered in `pool.server.ts` that duplicate or contradict it are removed and re-expressed there.

2. **Format legality.** Micro Workout is locked to its own movement-break shape (no conditioning formats, no finisher, equipment-free). Challenge loses MIX unless genuinely appropriate. Controlled categories stay Reps & Sets only; dynamic categories keep Circuit/AMRAP/EMOM/For Time/Tabata.

3. **Equipment legality by format, not globally.** Strength and Muscle Building keep full access to barbells, racks, benches, machines and cables under Reps & Sets. Dynamic formats reject setup-dependent strength work (barbell lifts, racks, benches, Smith, selectorized machines, cable strength, spotter- or loading-dependent movements) while keeping genuine cardio ergometers legal. Mobility & Stability rejects heavy loading.

4. **Body focus is a hard filter for every category** that carries a focus — never silently widened to Full Body, never padded with unrelated dominant movements.

5. **Equipment-family rule.** Dynamic sessions get a deterministic cap on distinct equipment families across Main and Finisher; exceeding it is a hard rejection, not a warning.

6. **Activation from the actual Main Workout.** Activation is built after the main block is known, from its dominant region and patterns, and is rejected when it prepares the wrong demand.

7. **Full-session duration.** Duration estimation is extended to activation + main + rest + transitions + finisher + cooldown, validated against the requested time with a hard ceiling; sessions that materially exceed it are rejected before save.

8. **Reject before save.** Any hard violation causes regeneration, then a deterministic compliant fallback; an invalid workout is never saved with a warning.

9. **Inputs and modifiers.** Mood, difficulty and library preferences may only alter dose, complexity and selection priority — they can never change category, format, focus, equipment legality or time. Location stays a hard practicality filter.

## Tests

`src/lib/workout/__tests__/doctrine.test.ts` is extended to cover all 16 required scenarios, including: Metabolic+EMOM rejecting bench press/racks/machines, Strength and Muscle Building keeping machines and barbells, Pilates and Mobility staying Reps & Sets with no conditioning, Micro rejecting all gym equipment, Cardio+EMOM repeatable movements, Lower/Upper focus purity, lower-body activation relevance, portable movements in For Time and Tabata, the exact invalid barbell EMOM sequence being rejected, and a 30-minute request not materially overflowing.

## Files touched

`src/lib/workout/doctrine.ts`, `pool.server.ts`, `programming.ts`, `prompt.server.ts`, `enforce.server.ts`, `validate.server.ts`, `spec.ts` (format tables only), `generate.server.ts` (wiring), and the engine tests. No UI, route, database or WOD-scheduling file is modified.
