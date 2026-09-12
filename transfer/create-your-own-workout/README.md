# Create Your Own Workout — transfer pack for Smarty Gym (Old)

Everything needed to move the whole workout-building feature out of Smarty Workout
and into Smarty Gym (Old) as a new page called **Create Your Own Workout**.

I cannot write into the other project from here, so this folder is the hand-over:
copy it across (or open this project side by side with the other one and copy the
files), then follow the steps below.

Two changes are already applied inside this folder, so you do not have to make them
by hand:

1. **Six-star difficulty** — 1-2 Beginner, 3-4 Intermediate, 5-6 Advanced, where the
   second star of each pair is only slightly harder.
2. **Library preferences removed** — the like/dislike feature does not exist in the
   old project, so all traces of it are gone from the engine and the screen.

Nothing in this folder is used by Smarty Workout itself. It is outside `src/`, so it
does not affect this app's build or tests.

---

## 1. What is in the pack

### `engine/` — the rules, unchanged except for the two items above

| File | What it holds |
| --- | --- |
| `doctrine.ts` | The complete rule book: the nine categories, which formats each category may use, which equipment is legal where, the banned-movement lists, the human-realism rule, section order, and every hard prohibition. This is the heart of the feature. |
| `programming.ts` | Turns a request into a session blueprint: section counts, work/rest, time budget, intensity wording per star, mood dose rules, location limits, equipment families and transition efficiency. |
| `spec.ts` | The difficulty scale (now six stars), levels, labels, intensity wording, minimum working minutes. |
| `pool.server.ts` | Builds the legal exercise pool from the exercise library and filters out everything the doctrine forbids for that category, format, level, equipment, location and limitations. |
| `prompt.server.ts` | The instruction text sent to the model, assembled from the doctrine so the wording and the code can never drift apart. |
| `generate.server.ts` | The build itself: pool in, structured session out. |
| `enforce.server.ts` | The correction pass — repairs anything that broke a rule instead of shipping it. |
| `validate.server.ts` + `workout-validation.ts` | The final gate: a session that still breaks a rule never reaches the member. |
| `create.server.ts` | Orchestration: reads the profile, resolves difficulty, builds, enforces, validates, saves the workout. |
| `surprise.ts`, `pack.server.ts`, `parse-steps.ts`, `tokens.ts`, `tracking-model.ts`, `prescription-fingerprint.ts` | Surprise-me picking, packaging, step parsing, and the tracking/comparison model. |
| `coach-options.ts` | Every option the questionnaire offers: categories, body focus, moods, times, locations, equipment, and the new six-star `LEVELS_6` set. |
| `coach-rules/` | The read-only recommendation notes ("this level matches what you have been demonstrating", "why this session"). Optional — drop it if the old project has no logged performance history yet. |
| `coach.functions.ts` | The server entry point the page calls. |
| `ai-gateway.server.ts` | The model provider setup. |

### `ui/`

| File | What it is |
| --- | --- |
| `CreateYourOwnWorkout.reference.tsx` | The full questionnaire screen: every step, in order, all choices starting unselected, the six-star picker, surprise-me, the confirm dialog for a hard session on a low-energy day, and the wait handling. |
| `GeneratingDialog.tsx` | The waiting screen with the rotating training tips — identical wording to this app. |
| `WorkoutDisplay.tsx` | The finished-session view: sections, prescriptions, coach notes. |

---

## 2. Steps to port it

1. **Copy `engine/` into the old project** as `src/lib/workout/` (plus
   `src/lib/coach-options.ts`, `src/lib/workout-validation.ts`, `src/lib/coach.functions.ts`,
   `src/lib/coach-rules/`, `src/lib/ai-gateway.server.ts`).
2. **Fix the import paths.** All imports use `@/…`. If the old project has no `@` alias,
   add one in its Vite config and TypeScript config, or run a find-and-replace to relative
   paths. Nothing else needs renaming.
3. **Server calls.** This app uses server functions. In the old project put the same
   `*.server.ts` logic behind whatever backend layer it already uses (a server function,
   an API route, or an edge function) and have the page call that one entry point. Keep the
   whole chain — build, enforce, validate — on the server, never in the browser.
4. **Exercise library.** The engine only ever uses exercises that exist in your library
   table. It reads: `id`, `name`, `body_part`, `target_muscle`, `secondary_muscles`,
   `equipment`, `category`, `difficulty`, `movement_pattern`, `body_region`, `instructions`,
   `gif_path`, `tags`, `is_active`. Map the old project's library columns onto these names,
   or add the missing ones. Any exercise not in the library can never appear in a session.
5. **Saving the session.** `create.server.ts` writes to a `workouts` table. The columns it
   needs are listed in `SCHEMA.md`. Point it at the old project's own table for member-made
   sessions — the place you already call "my own workouts" — so a built session lands there
   and opens from there.
6. **Add the page.** Use `ui/CreateYourOwnWorkout.reference.tsx` as the screen, titled
   **Create Your Own Workout**, and add it to the menu. Adapt only the routing and the
   shared components it imports (buttons, cards, dialogs, page header) to the old project's
   equivalents. Do not change the questions, their order, or the wording.
7. **Add the waiting screen and the result screen** from `ui/`.
8. **Model access.** The build needs a model key on the server side of the old project.
   Set it there as a secret; never in browser code.

---

## 3. The difficulty scale (six stars)

Read `DIFFICULTY-6-STARS.md`. In short: the pair decides the level and therefore which
exercises are legal; the star inside the pair only moves volume, density and rest a little.
The harder star of a pair never unlocks a harder class of exercise.

---

## 4. What must not be edited

The rule book is the feature. If it is trimmed, the sessions stop being trustworthy.
Keep all of it, in particular:

- The nine categories and the formats each one may use.
- Micro Workout: reps and sets only, no equipment.
- Recovery: gentle recovery work only, never strength or conditioning.
- Metabolic: no barbell, rack, machine or cable work.
- Machines and racks only in reps-and-sets work.
- No gymnastics in any fast or continuous format.
- The human-realism rule: no Olympic lifting, levers, handstands, pistol squats,
  Turkish get-ups or other technical or circus movements, in any category, at any level.
- Advanced means more demand, never more technical.
- Activation must prepare the exact patterns the main work uses.
- Never shrink the main work to fit a finisher — cut volume or drop the finisher.
- Every session must fit the time the member selected, warm-up and cool-down included.
