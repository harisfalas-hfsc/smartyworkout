// Smarty Workout Training Categories — the public-facing brief for every
// workout category the engine can generate. Each description must match the
// generation doctrine: if a rule changes in src/lib/workout/doctrine.ts,
// the matching brief here must be updated too.

export interface TrainingCategory {
  id: string;
  name: string;
  /** What it is, the formats used, who it suits, when to choose it. */
  brief: string;
  /** Optional link to a full training topic page. */
  topicSlug?: string;
}

export const TRAINING_CATEGORIES: TrainingCategory[] = [
  {
    id: "STRENGTH",
    name: "Strength",
    topicSlug: "strength-training",
    brief:
      "Always programmed as Reps & Sets: controlled sets and repetitions with generous rest, built around the big patterns — squat, hinge, push and pull. Barbells, racks and machines are all in play because there is time to set up properly. For anyone who wants to get measurably stronger. Choose it on fresh days when you can focus on load and technique.",
  },
  {
    id: "MUSCLE BUILDING",
    name: "Muscle Building",
    topicSlug: "strength-training",
    brief:
      "Always programmed as Reps & Sets: moderate loads, higher volume and shorter rest than pure strength work, targeted at the body part you pick. Machines, dumbbells, barbells and cables are all used because they let you fatigue the muscle safely. For anyone chasing visible shape and size. Choose it when you want a focused, methodical session rather than a lung-burner.",
  },
  {
    id: "CALORIE BURNING",
    name: "Calorie Burning",
    brief:
      "High-output sessions in clock-driven formats — Circuits, Tabata, AMRAP, For Time and EMOM — designed to maximise total energy spent by keeping you moving with minimal standing around. Movements are simple and repeatable: no heavy setups, no technical lifts. For anyone whose main goal is energy expenditure and weight management. Choose it when you want to leave the session feeling thoroughly spent.",
  },
  {
    id: "METABOLIC",
    name: "Metabolic",
    topicSlug: "metabolic-conditioning",
    brief:
      "High-density conditioning in clock-driven formats — AMRAP, EMOM, Circuits, For Time and Tabata — where several simple movements are strung together with controlled rest. No barbells, racks or machines: only work you can start instantly and repeat safely under fatigue. For trainees who want fitness and burn in one short window. Choose it when time is tight but intensity is welcome.",
  },
  {
    id: "CARDIO",
    name: "Cardio",
    topicSlug: "cardio-workouts",
    brief:
      "Aerobic engine work delivered as Circuits, EMOM, For Time, AMRAP or Tabata built from rhythmic movements — running, cycling, rowing, or low-impact bodyweight locomotion — that raise your heart rate and keep it there. Cardio stays cardio here: exhausting strength moves are kept out so the aerobic stimulus does the work. For everyone — the base of health and recovery. Choose it on days between hard lifting or whenever you want a cleaner, rhythmic session.",
  },
  {
    id: "MOBILITY & STABILITY",
    name: "Mobility & Stability",
    topicSlug: "mobility-and-stability",
    brief:
      "Always programmed as Reps & Sets: controlled repetitions with slow tempo and full range, building range of motion, joint control and midline strength — the qualities that keep hard training pain-free. No fatigue chasing, no conditioning. For everyone, especially desk workers and anyone returning from a layoff. Choose it the day after something heavy, after travel, or when your body feels stiff rather than tired.",
  },
  {
    id: "CHALLENGE",
    name: "Challenge",
    brief:
      "A single demanding test piece in a scored format — Circuit, Tabata, AMRAP, EMOM, For Time or a Mix — with a clear result (rounds, reps or time) that you repeat over weeks to measure yourself. Tough but always realistic and familiar: no gymnastics or trick movements. For motivated trainees who like a target. Choose it occasionally, when you are fresh and want to see where you stand.",
  },
  {
    id: "PILATES",
    name: "Pilates",
    brief:
      "Always programmed as Reps & Sets: mat-based sequences for core control, posture and precise movement, with deliberate tempo and breathing cues. No equipment beyond a mat, no jumping, no loading. For anyone who wants a stronger midsection and better body awareness without impact. Choose it as a lighter training day, a morning session, or alongside heavier training.",
  },
  {
    id: "RECOVERY",
    name: "Recovery",
    brief:
      "Always programmed as a Mix: a gentle blend of easy movement, breathing work, light mobility and stretching in a relaxed flow. No conditioning, no strength work, nothing near exhaustion. For everyone, especially after hard days or poor sleep. Choose it instead of skipping training entirely — you finish feeling better than you started.",
  },
  {
    id: "MICRO-WORKOUTS",
    name: "Micro Workout",
    brief:
      "Always programmed as Reps & Sets: a short equipment-free movement break of about ten to twenty minutes with easy sets and plenty of rest — simple, low-fatigue movements like sit-to-stands, wall push-ups and marching. No machines, no setup, no gymnastics — just floor space. For busy days, desk breaks and travel. Choose it when a full session will not fit but doing nothing feels wrong.",
  },
  {
    id: "WOD",
    name: "Workout of the Day",
    brief:
      "One shared workout published every day for all members, in an equipment and a bodyweight version. Days follow a planned rotation through strength, conditioning, cardio and recovery categories, so the week periodises itself automatically — hard and easy days alternate by design. No questionnaire: your Training Profile sets the difficulty. For anyone who wants to just show up and train. Choose it any day you would rather not decide.",
  },
];
