# Smarty Workout — Complete Workout Generation Doctrine Rewrite

Scope: generation logic only. No changes to UI, questionnaire layout, workout cards, player, display, navigation, exercise library, database, or the WOD schedule/rotation/presentation. WOD keeps its calendar and category rotation and simply generates through the new doctrine (it already calls the same generation path).

## Current implementation (inspected)

Pipeline: `create.server.ts` → `generate.server.ts` → `pool.server.ts` (pool filter) → `programming.ts` (blueprint + quality score) → `prompt.server.ts` → `enforce.server.ts` → `validate.server.ts` → retry loop → `pack.server.ts` deterministic fallback → save. WOD calls `generateWorkoutContent` exactly like Coach.

Legacy rules found that will be replaced or absorbed:
- `spec.ts` `CATEGORY_FORMATS` lets Micro Workout run CIRCUIT/AMRAP/FOR TIME/EMOM, and Challenge run MIX.
- `pool.server.ts` holds overlapping ad-hoc regex bans (`PILATES_BAN_RE`, `MOBILITY_BAN_RE`, `MICRO_BAN_RE`, `RECOVERY_BAN_RE`, `STATIC_HOLD_RE`, `HOME_APPARATUS_RE`) that partly duplicate and partly contradict `doctrine.ts`.
- Body focus is a hard filter only for Strength and Muscle Building.
- Difficulty filter widens to the adjacent level when a level is thin.
- Equipment-family limit exists only as prompt advice (`maxEquipmentFamilies`), never validated.
- `estimateWorkMinutes` counts Main + Finisher only; activation, cooldown, rest and transitions are not counted against the requested duration.
- Retry loop keeps the best-scoring candidate; legality is enforced, quality is soft.

## New doctrine — what gets implemented

**1. Single source of truth (§32, §35).** `doctrine.ts` becomes the only place programming legality is defined. The ad-hoc regex rules above are deleted from `pool.server.ts` and re-expressed as doctrine functions, so pool filter, blueprint, prompt, enforcement, validation and tests all read the same rules. No second engine.

**2. Inputs (§2).** Category, format, focus, difficulty, time, location, equipment, library preferences, likes, dislikes, history/recent usage, mood and stored limitations are normalised in one place before filtering. No input may override a hard rule.

**3. Category families (§3).** Quality/controlled = Strength, Muscle Building, Pilates, Mobility & Stability. Dynamic = Calorie Burning, Cardio, Metabolic, Challenge. Special = Micro Workout (Recovery keeps its existing controlled treatment).

**4. Format legality (§4, §29).** Controlled categories are Reps & Sets only — never AMRAP, EMOM, Tabata, Circuit, For Time or HIIT anywhere in the session including the finisher. Dynamic categories may use Circuit, AMRAP, EMOM, For Time, Tabata; MIX only where genuinely appropriate. Micro Workout is locked to its own movement-break shape and is never a shortened normal workout.

**5. Strength (§5, §26).** Reps & Sets, compound → secondary → accessory hierarchy, adequate rest, progressive loading. Barbells, racks, benches, machines, cables, dumbbells, kettlebells, TRX and bodyweight all remain legal. Strength is never converted into conditioning to fill time.

**6. Muscle Building (§6, §26).** Reps & Sets, compound → secondary → accessory → isolation, compounds ~6-12 reps and isolation ~8-15, controlled execution, appropriate rest. Machines, cables, barbells and benches remain legal.

**7. Pilates (§7).** Reps & Sets, control/breath/precision/spinal and core control, no conditioning of any kind, no finisher.

**8. Mobility & Stability (§8).** Reps & Sets, mobility/stability/ROM/balance/joint prep. Bodyweight, light bands, mobility tools, foam roller and light stability equipment only — heavy loading and conditioning are rejected. No finisher.

**9. Dynamic categories (§9-§13, §24, §25).** Dynamic format means fast transition, low setup, continuous execution. Hard rejection of setup-dependent strength work: barbell lifts, rack- or bench-dependent movements, Smith machine, selectorized machines, leg press/extension/curl, machine chest and shoulder press, cable strength work and crossovers, spotter-dependent lifts, and technical Olympic lifting. Preferred vocabulary: bodyweight, dumbbells, kettlebells, medicine/slam balls, TRX, bands, portable boxes, jump rope, carries, running, rowing, bike. Genuine cardio ergometers (bike, rower, SkiErg, treadmill) stay legal; strength machines never count as cardio. Per-format checks for EMOM (work completable inside the minute, immediate start), AMRAP, Tabata, For Time and Circuit station flow. The listed invalid barbell EMOM sequence is rejected outright.

**10. Human realism + equipment family (§11, §12).** Each dynamic candidate is checked for immediate start, fast transition, ready equipment, no machine change, no bar loading, no spotter, no bench move, no unsafe fatigued transition. A deterministic cap on distinct equipment families across Main and Finisher becomes a hard rejection instead of prompt advice, favouring bodyweight-plus-one-implement combinations.

**11. Micro Workout (§14).** Equipment-free, immediately executable, office/home friendly, ~10 minutes, low setup, one small area. Chair, desk, table, wall, sofa, floor and small space allowed. All training equipment rejected. No finisher, no separate soft tissue block.

**12. Body focus (§15).** Hard filter for every category that carries a focus, not just the two strength categories. A smaller valid pool is preferred to a widened one; Lower Body is never silently replaced by Full Body, and unrelated dominant movements are never added for variety.

**13. Difficulty (§16).** Difficulty changes movement complexity, variation difficulty, volume, loading and recovery — not equipment class, not Olympic lifting, not machine count. The current silent widening to the adjacent level is replaced with level-appropriate variation selection so Beginner never inherits Advanced movements. Difficulty never overrides category or format rules.

**14. Library preferences (§17).** With preferences ON, liked exercises are prioritised and disliked exercises (plus close variations) are excluded. Preferences never override legality: a liked exercise illegal for the format stays illegal.

**15. Location (§18).** Home, Gym, Outdoors, Hotel, Anywhere remain hard practicality filters — no rack-dependent hotel work, no gym apparatus in a micro break, full equipment in a gym strength session.

**16. Time (§19, §23).** Duration estimation is extended to the whole session: activation + main work + rest + transitions + finisher + cooldown. The full session must fit the requested duration; material overflow is a hard rejection before save. Cooldown is sized to fit inside the session, never padded.

**17. Structure, activation, finisher, cooldown (§20-§23).** Main Workout is built first; activation is then generated from the analysed main block — dominant focus, movement patterns, joints, muscles and technical demands (upper → shoulders/scapula/thoracic, lower → hips/knees/ankles/glutes, push, pull, core & glutes, full body). Activation must be short, low-fatigue, relevant and immediately executable, and is rejected when it prepares the wrong demand. Finishers are optional and category-specific: Strength and Muscle Building keep Reps & Sets goal-matched finishers, Pilates / Mobility & Stability / Micro Workout never carry one, dynamic categories only when time allows. Nothing is added just to fill minutes.

**18. Mood (§27).** Mood may adjust volume, intensity, complexity, impact and recovery only. It never changes category, format, focus, equipment legality, safety or time; tired reduces complexity and volume rather than switching to machines.

**19. Pipeline (§28).** Enforced order: normalise inputs → category → legal formats → focus → location → equipment → category/format equipment restrictions → focus filter → difficulty → library preferences → history → Main Workout → analyse main → activation → finisher decision → cooldown → realistic total duration → deterministic validation → quality gate → reject/regenerate on hard failure → save only a compliant workout. The AI is never the final authority.

**20. Deterministic validation and save gate (§29, §30).** Code-level validation of category, format, focus, difficulty, location, equipment, equipment family, exercise legality, dynamic transition practicality, activation relevance, finisher legality, duration and setup/safety constraints. All mandatory invalid combinations listed in the spec return hard errors. A hard violation means reject → regenerate → deterministic valid fallback; invalid workouts are never saved with a warning. Warnings stay reserved for soft quality issues.

**21. WOD (§31).** Schedule, category rotation, periodization, daily sequence, presentation and player untouched; only the programming rules its generation uses are replaced.

## Tests (§33)

`src/lib/workout/__tests__/doctrine.test.ts` (plus the existing engine tests) is extended to cover all 16 required scenarios: Metabolic+EMOM rejecting bench press/rack/machines; Strength and Muscle Building Reps & Sets + Full Gym allowing barbells, racks, benches, machines and cables; Pilates and Mobility & Stability staying Reps & Sets with no conditioning; Micro rejecting all gym equipment; Cardio+EMOM repeatable cardio movements; Lower Body and Upper Body focus purity; lower-body activation relevance; Metabolic For Time and Calorie Burning Tabata portability; Strength and Muscle Building with machines staying valid; the exact invalid barbell EMOM sequence rejected; and a 30-minute request not materially overflowing across all four blocks.

## Files touched

`doctrine.ts`, `pool.server.ts`, `programming.ts`, `prompt.server.ts`, `enforce.server.ts`, `validate.server.ts`, `spec.ts` (format tables only), `generate.server.ts` (wiring), `pack.server.ts` (fallback must obey the same doctrine), and the engine tests. No UI, route, player, database or WOD-scheduling file is modified.

## Final report

After implementation I'll report all 13 required confirmations, including the rejected EMOM example, retained heavy equipment for Strength and Muscle Building, dynamic rejection of setup-heavy equipment, main-derived activation, hard duration validation, unchanged WOD rotation and unchanged customer-facing presentation.
