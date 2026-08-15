# Step 1 clean-up, Strength vs Muscle Building, and a real body-part choice

## What is wrong today (verified in the code)

- Step 1 offers 11 options. `Full Body` and `Custom` both exist, and in the engine `strength`, `muscle` and `fullbody` all map to the **same** category (`STRENGTH`). `custom` maps to nothing and silently falls back to `STRENGTH`. So today Strength, Muscle Building, Full Body and Custom produce the exact same kind of workout.
- There are **no separate hypertrophy rules**. One coaching line covers strength only: "heavy compound first, reps and sets, rest 90-180 sec". Nothing about hypertrophy reps, tempo, proximity to failure or isolation work.
- A focus split exists internally (`LOWER BODY`, `UPPER BODY`, `FULL BODY`, `LOW PUSH & UPPER PULL`, `LOW PULL & UPPER PUSH`, `CORE & GLUTES`) with real filtering rules, but the Coach questionnaire **never sends it** — only the Workout of the Day does. That is why you never see a body-part question.
- Step 8 (your note) is passed to the AI as a single line: `Athlete note: ...`. It is a soft suggestion. Nothing deterministically removes an exercise you said you dislike, so "no bicep curls" can still slip through.

## What will change

### 1. Step 1 becomes clean
Remove `Full Body` and `Custom`. Remaining options: Strength, Muscle Building, Calorie Burning, Cardio, Metabolic, Challenge, Mobility & Stability, Pilates, Micro Workout. Surprise Me keeps working (it picks a category itself and no longer picks a phantom "custom").

### 2. Strength and Muscle Building become two different workouts
Two separate categories with their own written rules, both Reps & Sets:

| | Strength | Muscle Building |
|---|---|---|
| Main lifts | Heavy compounds first | Compound first, then isolation |
| Sets x reps | 4-6 x 3-6 | 3-4 x 8-12 (isolation up to 15) |
| Tempo | Controlled down, explosive up | 3 sec lower, 1 sec squeeze, controlled lift |
| Rest | 150-180 sec | 60-90 sec |
| Effort | Heavy, 2-3 reps in reserve, never to failure | Close to failure, 1-2 reps in reserve |
| Volume | Fewer exercises, higher load | More total sets, more isolation and single-joint work |

Bodyweight versions get the same intent expressed through harder/easier variations and longer sets.

### 3. A body-part step appears only for Strength and Muscle Building
Picking Strength or Muscle Building immediately opens a second card: **"Which part do you want to train?"** Every other category skips it (it does not apply to cardio, metabolic, Pilates, mobility, challenge or micro).

Options, matched to what the exercise library actually contains (upper arms, upper legs, back, waist, chest, shoulders, lower legs, lower arms, neck, cardio):

- Full Body
- Upper Body
- Lower Body
- Push (chest, shoulders, triceps)
- Pull (back, biceps)
- Chest
- Back
- Shoulders
- Arms
- Legs
- Glutes & Core

Each option becomes a hard filter on the exercise pool for the Main Workout and Finisher, not just a hint to the AI — pick "Arms" and only arm-dominant exercises can be programmed. Activation, Soft Tissue and Cool Down stay full-body as they are now. The existing Workout of the Day splits keep working unchanged.

### 4. Your note in the last step gets real teeth
Today it is only advisory. It will be upgraded to:
- **Exclusions are enforced.** "I don't like bicep curls", "no jumping", "avoid deadlifts" are detected, matched against the library, and those exercises plus their close variations are physically removed from the pool before the AI writes anything — the same mechanism your disliked-library exercises already use.
- **Preferences stay preferences.** "I prefer biceps and triceps" moves those exercises to the front of the pool and instructs the coach to program at least one, but does not turn the session into an arms-only workout.
- The note is shown to the coach as a high-priority instruction rather than a footnote.

## Technical notes

- `src/lib/coach-options.ts`: drop `fullbody` and `custom` from `GOALS`; add a `BODY_FOCUS` option set.
- `src/lib/workout/spec.ts`: add `MUSCLE BUILDING` to `CATEGORIES` (format `REPS & SETS`), extend `STRENGTH_FOCUS` with the new body-part values while keeping the six existing ones for the Workout of the Day.
- `src/lib/workout/prompt.server.ts`: add the `MUSCLE BUILDING` coaching block, rewrite the `STRENGTH` block with explicit set/rep/tempo/rest/effort numbers, add `FOCUS_RULES` entries for the new focuses, and promote the athlete note into the mandatory instruction section.
- `src/lib/workout/pool.server.ts`: apply the focus filter for `MUSCLE BUILDING` as well as `STRENGTH` (currently strength-only), and filter the new focuses using `body_part` / `target_muscle`.
- `src/lib/workout/create.server.ts`: map `muscle` to the new category, remove the `fullbody` mapping, pass `focus` through from the coach request, and parse the note into `dislikedIds` / preferred ids before generation.
- `src/routes/_authenticated/coach.tsx`: conditional focus card inserted as step 2 with automatic renumbering of the following steps; send `focus` with the request.
- `src/lib/workout/pack.server.ts` and `validate.server.ts`: honour the focus filter so the deterministic fallback and the validator agree with the pool.
