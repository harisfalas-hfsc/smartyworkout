# The six-star difficulty scale

Three levels, two stars each.

| Stars | Level | Meaning |
| --- | --- | --- |
| 1 | Beginner, easier | Simple bilateral patterns, generous rest, clearly submaximal, no failure |
| 2 | Beginner, solid | Same movements as 1, a little more volume, slightly shorter rest |
| 3 | Intermediate, easier | Standard variations, solid volume, moderate rest |
| 4 | Intermediate, solid | More volume and density than 3, still standard variations |
| 5 | Advanced, easier | High demand, familiar movements, shorter rest |
| 6 | Advanced, solid | Highest volume and density of the scale |

## The two rules that keep it honest

1. **The pair decides what is legal.** Which exercises may appear, how complex they may
   be, and how much rest is given all come from the level (1-2, 3-4, 5-6), never from
   the single star.
2. **The star inside the pair only moves the dose.** The harder star of a pair adds
   volume, tightens rest and raises density. It never introduces an exercise from a
   higher level.

Advanced means more demand, never more technical. No level, ever, allows Olympic
lifting, levers, handstands, pistol squats, Turkish get-ups or other circus movements.

## Where it lives in the code

- `engine/spec.ts` — `MAX_STARS = 6`, `normalizeStars`, `starsToLevel`, `starsToStep`,
  `levelToStars`, `difficultyLabel`, `intensityNote`.
- `engine/programming.ts` — `resolveDifficulty` (clamped 1-6) and `intensityDirective`
  (band wording plus the easier/harder step wording).
- `engine/create.server.ts` — `requestedStarsFor` accepts "1".."6" from the screen and
  falls back to the member's profile level (beginner 1, intermediate 3, advanced 5).
- `engine/coach-options.ts` — `LEVELS_6`, the seven choices shown on the screen
  (Let Smarty decide, plus the six stars).
- `ui/CreateYourOwnWorkout.reference.tsx` — the picker, drawn as filled and empty stars.

Mood still never changes the level. A tired or sore day reduces volume, complexity,
impact and rest through the mood rules; it does not move the member into an easier
exercise pool.
