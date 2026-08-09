export type Units = "metric" | "imperial";
export type Gender = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "fat_loss" | "maintenance" | "muscle_gain" | "strength" | "endurance" | "mobility";
export type TrainingStyle =
  | "full_body"
  | "upper_lower"
  | "push_pull_legs"
  | "bodybuilding"
  | "powerlifting"
  | "calisthenics"
  | "hiit"
  | "functional"
  | "home_minimal"
  | "other";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Sleep = "poor" | "average" | "good";
export type Environment = "gym" | "home" | "outdoor" | "mixed";
export type Intensity = "easy" | "moderate" | "hard";

export interface QuestionnaireData {
  basics: {
    age?: number;
    gender?: Gender;
    height?: number;
    weight?: number;
    units: Units;
    country?: string;
  };
  body: {
    bmr?: number | "auto";
    bmi?: number | "auto";
    bodyFat?: number;
    muscleMass?: number;
    inbodyNotes?: string;
  };
  activity: {
    trains: boolean;
    trainingType?: string;
    trainingDurationMin?: number;
    trainingIntensity?: "low" | "medium" | "high";
    activityLevel: ActivityLevel;
    stepsPerDay?: number;
    tdee?: number | "auto";
    sleep: Sleep;
  };
  goal: {
    goal: Goal;
    targetWeight?: number;
    timelineWeeks?: number;
    focusAreas?: string[];
  };
  training: {
    trainingStyle: TrainingStyle;
    trainingStyleOther?: string;
    daysPerWeek: number;
    sessionMinutes: number;
    preferredTrainingTimes?: string;
    likedExercises: string[];
    likedExercisesOther?: string;
    dislikedExercises: string[];
    dislikedExercisesOther?: string;
    injuryTags: string[];
    injuries: string; // free-text extra
    avoidTags: string[];
    avoidTagsOther?: string;
    cardioPreference?: string;
    stepsGoal?: string;
    restDayActivity?: string;
  };
  constraints: {
    experience: Experience;
    warmupMinutes?: number;
    environment: Environment;
    equipment?: string[];
    travelFrequency?: string;
  };
  health: {
    conditions?: string;
    medications?: string;
    pregnancyPostpartum?: "none" | "pregnant" | "postpartum";
    disclaimerAcknowledged: boolean;
  };
  notes: string;
}

export const DEFAULT_QUESTIONNAIRE: QuestionnaireData = {
  basics: { units: "metric" },
  body: {},
  activity: { trains: false, activityLevel: "moderate", sleep: "average" },
  goal: { goal: "maintenance" },
  training: {
    trainingStyle: "full_body",
    daysPerWeek: 3,
    sessionMinutes: 45,
    likedExercises: [],
    dislikedExercises: [],
    injuryTags: [],
    injuries: "",
    avoidTags: [],
  },
  constraints: { experience: "beginner", environment: "gym" },
  health: { disclaimerAcknowledged: false },
  notes: "",
};

export const STEP_LABELS = [
  "Basics",
  "Body",
  "Activity",
  "Goal",
  "Training",
  "Constraints",
  "Health",
  "Notes",
];

export const EXERCISE_CATEGORIES: Array<{ label: string; exercises: string[] }> = [
  {
    label: "Push",
    exercises: [
      "bench press",
      "push-up",
      "overhead press",
      "dumbbell press",
      "dips",
      "cable fly",
    ],
  },
  {
    label: "Pull",
    exercises: ["pull-up", "lat pulldown", "barbell row", "dumbbell row", "face pull", "curl"],
  },
  {
    label: "Legs",
    exercises: ["squat", "front squat", "deadlift", "lunge", "leg press", "hip thrust", "calf raise"],
  },
  {
    label: "Core",
    exercises: ["plank", "hanging leg raise", "crunch", "dead bug", "cable crunch", "pallof press"],
  },
  {
    label: "Cardio",
    exercises: ["running", "cycling", "rowing", "jump rope", "incline walking", "swimming"],
  },
  {
    label: "Mobility",
    exercises: ["hip mobility", "shoulder mobility", "stretching", "yoga flow", "foam rolling"],
  },
];

export const INJURY_TAGS = [
  "none",
  "lower back",
  "knee",
  "shoulder",
  "neck",
  "wrist",
  "elbow",
  "hip",
  "ankle",
  "hernia",
];

export const AVOID_TAGS = [
  "no jumping",
  "no running",
  "no overhead pressing",
  "no barbell",
  "no floor work",
];

export const EQUIPMENT_OPTIONS = [
  "barbell",
  "dumbbells",
  "kettlebell",
  "machines",
  "cables",
  "resistance bands",
  "pull-up bar",
  "bench",
  "treadmill",
  "bodyweight only",
];

export const FOCUS_AREAS = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "glutes",
  "legs",
  "core",
  "conditioning",
];
