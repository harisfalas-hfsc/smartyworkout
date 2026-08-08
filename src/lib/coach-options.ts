// Shared, client-safe Smarty Coach option sets.

export const GOALS = [
  { id: "strength", label: "Strength" },
  { id: "muscle", label: "Muscle Building" },
  { id: "calorie", label: "Calorie Burning" },
  { id: "cardio", label: "Cardio" },
  { id: "metabolic", label: "Metabolic" },
  { id: "challenge", label: "Challenge" },
  { id: "mobility", label: "Mobility & Stability" },
  { id: "pilates", label: "Pilates" },
  { id: "micro", label: "Micro Workout" },
  { id: "fullbody", label: "Full Body" },
  { id: "custom", label: "Custom" },
] as const;

export const MOODS = [
  { id: "energized", label: "Energized" },
  { id: "good", label: "Good" },
  { id: "normal", label: "Normal" },
  { id: "tired", label: "Tired" },
  { id: "stressed", label: "Stressed" },
  { id: "low", label: "Low motivation" },
  { id: "sore", label: "Sore" },
  { id: "fun", label: "I want something fun" },
  { id: "push", label: "I want to push myself" },
] as const;

export const TIMES = [5, 10, 15, 20, 30, 45, 60];

export const LOCATIONS = [
  { id: "home", label: "Home" },
  { id: "gym", label: "Gym" },
  { id: "outdoors", label: "Outdoors" },
  { id: "hotel", label: "Hotel" },
  { id: "anywhere", label: "Anywhere" },
] as const;

export const EQUIPMENT = [
  { id: "bodyweight", label: "Bodyweight" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "kettlebells", label: "Kettlebells" },
  { id: "barbell", label: "Barbell" },
  { id: "bands", label: "Resistance Bands" },
  { id: "trx", label: "TRX" },
  { id: "machines", label: "Machines" },
  { id: "fullgym", label: "Full Gym" },
  { id: "other", label: "Other" },
] as const;

export const LEVELS = [
  { id: "auto", label: "Let Smarty decide", hint: "Uses your profile + today's mood" },
  { id: "beginner", label: "Beginner", hint: "Simple movements, longer rest" },
  { id: "intermediate", label: "Intermediate", hint: "Solid volume, moderate complexity" },
  { id: "advanced", label: "Advanced", hint: "High volume, complex work, short rest" },
] as const;

/** Moods where an "Advanced" pick should be double-checked with the athlete. */
export const LOW_ENERGY_MOODS = ["tired", "stressed", "low", "sore"];


export type WorkoutItem = {
  exercise_id?: string | null;
  name: string;
  sets?: string | number | null;
  reps?: string | number | null;
  duration?: string | null;
  tempo?: string | null;
  rest?: string | null;
  notes?: string | null;
  gif_path?: string | null;
};

export type WorkoutBlock = {
  title: string;
  format?: string | null;
  rounds?: string | number | null;
  instructions?: string | null;
  items: WorkoutItem[];
};

export type WorkoutPlan = { blocks: WorkoutBlock[] };

export function goalLabel(id: string) {
  return GOALS.find((g) => g.id === id)?.label ?? id;
}
