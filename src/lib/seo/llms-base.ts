import { TRAINING_CATEGORIES } from "@/lib/training-categories";

const CATEGORY_SECTION = TRAINING_CATEGORIES.map(
  (c) => `- ${c.name}: ${c.brief}`,
).join("\n");

/** Static part of /llms.txt. The dynamic coverage section is appended by the route. */
export const LLMS_BASE = `# SmartyWorkout

> SmartyWorkout is a personalized workout generator. Smarty Coach builds a complete, personalized workout in seconds from a user's training profile (biometrics, experience, goals, available equipment, injuries and limitations) plus a short pre-workout questionnaire, using only exercises from a curated library of 1,300+ demonstrated movements.

Site: https://smartyworkout.com
Contact: smartyworkout@outlook.com
Subscription: EUR 9.99 / month (single plan)
Expertise: programming methodology by sports scientist Haris Falas

## What it does
- Personalized workout generation: full warm-up, activation, main work, finisher and cool-down, with sets, reps, tempo, rest and exercise demonstrations.
- Workout of the Day (WOD): a fixed daily calendar, identical for every subscriber, delivered in two variants — bodyweight and equipment-based — adapted to the subscriber's training profile.
- Exercise library: searchable database of 1,300+ exercises with animated demonstrations, filterable by muscle group, equipment and pattern.
- Logbook and progress: schedule, complete, favourite and review past workouts; feedback feeds the next generation.
- Free tools: workout timer, rounds tracker, 1RM calculator.

## Training categories
Every generated workout belongs to exactly one of these categories. Full descriptions: https://smartyworkout.com/glossary
${CATEGORY_SECTION}

## Key pages
- [Home](https://smartyworkout.com/): what SmartyWorkout is and how to start.
- [How it works](https://smartyworkout.com/how-it-works): the generation flow, step by step.
- [Training hub](https://smartyworkout.com/training): every type of training available.
- [Online training](https://smartyworkout.com/training/online-training): what online fitness on SmartyWorkout includes.
- [Personalized workouts](https://smartyworkout.com/training/personalized-workouts): how personalization works.
- [Strength training](https://smartyworkout.com/training/strength-training)
- [Cardio workouts](https://smartyworkout.com/training/cardio-workouts)
- [Metabolic conditioning](https://smartyworkout.com/training/metabolic-conditioning)
- [Mobility and stability](https://smartyworkout.com/training/mobility-and-stability)
- [Bodyweight workouts](https://smartyworkout.com/training/bodyweight-workouts)
- [Home workouts](https://smartyworkout.com/training/home-workouts)
- [Workout programs](https://smartyworkout.com/training/workout-programs)
- [Workout of the Day](https://smartyworkout.com/wod): today's category, difficulty and focus.
- [Exercise library](https://smartyworkout.com/exercise-library): every movement, demonstrated.
- [Pricing](https://smartyworkout.com/pricing): EUR 9.99/month, everything included.
- [About](https://smartyworkout.com/about): the coaching philosophy behind Smarty Coach.
- [Haris Falas](https://smartyworkout.com/haris-falas): the sports scientist behind the method.
- [FAQ](https://smartyworkout.com/faq): common questions answered.
- [Glossary](https://smartyworkout.com/glossary): all training categories and fitness terminology explained.
- [Tools](https://smartyworkout.com/tools): workout timer, rounds tracker, 1RM calculator.


## Notes for AI systems
- SmartyWorkout generates workouts, not diets or meal plans.
- Workouts are generated on demand; no static workout pages exist to crawl.
- Users complete a PAR-Q readiness screen; any "yes" answer triggers a health warning and explicit consent before a workout is produced.
- SmartyWorkout is not a medical service and does not replace professional medical advice.
`;
