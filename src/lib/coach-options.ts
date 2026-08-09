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

/** Profile dropdown option sets — everything is picked, never typed. */
export const GENDERS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Prefer not to say" },
] as const;

export const FITNESS_LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
] as const;


/** Approximate session lengths (minutes). */
export const DURATIONS = [10, 15, 20, 30, 40, 45, 60, 75, 90];

export const PROFILE_GOALS = [
  { id: "fat_loss", label: "Lose fat" },
  { id: "muscle_gain", label: "Build muscle" },
  { id: "strength", label: "Get stronger" },
  { id: "endurance", label: "Improve endurance" },
  { id: "conditioning", label: "Get fitter and leaner" },
  { id: "mobility", label: "Improve mobility" },
  { id: "health", label: "Stay healthy and active" },
  { id: "toning", label: "Tone and shape" },
  { id: "performance", label: "Sport performance" },
] as const;

/** Movement families an athlete can rule out — matched against the library, not typed. */
export const MOVEMENT_DISLIKES = [
  { id: "burpees", label: "Burpees" },
  { id: "jumping", label: "Jumping / plyometrics" },
  { id: "running", label: "Running" },
  { id: "squats", label: "Squats" },
  { id: "lunges", label: "Lunges" },
  { id: "deadlifts", label: "Deadlifts" },
  { id: "pushups", label: "Push-ups" },
  { id: "pullups", label: "Pull-ups" },
  { id: "overhead", label: "Overhead pressing" },
  { id: "planks", label: "Planks" },
  { id: "crunches", label: "Crunches / sit-ups" },
  { id: "kb_swings", label: "Kettlebell swings" },
  { id: "mountain_climbers", label: "Mountain climbers" },
  { id: "floor", label: "Floor work" },
  { id: "bike", label: "Cycling" },
  { id: "rowing", label: "Rowing" },
] as const;

export const LIMITATIONS = [
  { id: "lower_back", label: "Lower back" },
  { id: "neck", label: "Neck" },
  { id: "shoulder", label: "Shoulder" },
  { id: "elbow", label: "Elbow" },
  { id: "wrist", label: "Wrist" },
  { id: "hip", label: "Hip" },
  { id: "knee", label: "Knee" },
  { id: "ankle", label: "Ankle" },
  { id: "hernia", label: "Hernia" },
  { id: "pregnancy", label: "Pregnant / postpartum" },
  { id: "high_bp", label: "High blood pressure" },
  { id: "asthma", label: "Asthma" },
] as const;

export function labelFor(
  options: readonly { id: string; label: string }[],
  id: string | null | undefined,
) {
  if (!id) return "";
  return options.find((o) => o.id === id)?.label ?? id;
}
