// Client-safe Smarty Workout specification constants.

export const CATEGORIES = [
  "STRENGTH",
  "CALORIE BURNING",
  "METABOLIC",
  "CARDIO",
  "MOBILITY & STABILITY",
  "CHALLENGE",
  "PILATES",
  "RECOVERY",
  "MICRO-WORKOUTS",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const FORMATS = [
  "TABATA",
  "CIRCUIT",
  "AMRAP",
  "FOR TIME",
  "EMOM",
  "REPS & SETS",
  "MIX",
] as const;
export type Format = (typeof FORMATS)[number];

export const EQUIPMENT_MODES = ["BODYWEIGHT", "EQUIPMENT"] as const;
export type EquipmentMode = (typeof EQUIPMENT_MODES)[number];

export const STRENGTH_FOCUS = [
  "LOWER BODY",
  "UPPER BODY",
  "FULL BODY",
  "LOW PUSH & UPPER PULL",
  "LOW PULL & UPPER PUSH",
  "CORE & GLUTES",
] as const;
export type StrengthFocus = (typeof STRENGTH_FOCUS)[number];

export const CATEGORY_FORMATS: Record<Category, Format[]> = {
  STRENGTH: ["REPS & SETS"],
  "MOBILITY & STABILITY": ["REPS & SETS"],
  PILATES: ["REPS & SETS"],
  RECOVERY: ["MIX"],
  CARDIO: ["CIRCUIT", "EMOM", "FOR TIME", "AMRAP", "TABATA"],
  METABOLIC: ["CIRCUIT", "AMRAP", "EMOM", "FOR TIME", "TABATA"],
  "CALORIE BURNING": ["CIRCUIT", "TABATA", "AMRAP", "FOR TIME", "EMOM"],
  CHALLENGE: ["CIRCUIT", "TABATA", "AMRAP", "EMOM", "FOR TIME", "MIX"],
  "MICRO-WORKOUTS": ["CIRCUIT", "REPS & SETS", "AMRAP", "FOR TIME"],
};

export type DifficultyLevel = "all" | "beginner" | "intermediate" | "advanced";

export function starsToLevel(stars: number): DifficultyLevel {
  if (!stars || stars <= 0) return "all";
  if (stars <= 2) return "beginner";
  if (stars <= 4) return "intermediate";
  return "advanced";
}

export function difficultyLabel(stars: number): string {
  const level = starsToLevel(stars);
  if (level === "all") return "All Levels";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export const SECTION_ORDER = [
  "Soft Tissue Preparation",
  "Activation",
  "Warm-up",
  "Main Workout",
  "Finisher",
  "Cool-down",
] as const;
export type SectionName = (typeof SECTION_ORDER)[number];

export const SECTION_ICONS: Record<SectionName, string> = {
  "Soft Tissue Preparation": "🧽",
  Activation: "🔥",
  "Warm-up": "🔥",
  "Main Workout": "💪",
  Finisher: "⚡",
  "Cool-down": "🧘",
};

/** Canonicalise any heading text to one of the six known sections. */
export function canonicalSection(raw: string): SectionName | null {
  const t = raw.toLowerCase();
  if (t.includes("soft tissue") || t.includes("foam")) return "Soft Tissue Preparation";
  if (t.includes("activation")) return "Activation";
  if (t.includes("warm")) return "Warm-up";
  if (t.includes("main workout") || t.includes("main-workout")) return "Main Workout";
  if (t.includes("finisher")) return "Finisher";
  if (t.includes("cool")) return "Cool-down";
  return null;
}

/** Minimum work minutes (Main + Finisher) required by the quality gate. */
export function minimumWorkMinutes(
  level: DifficultyLevel,
  category: Category,
  format: Format,
): number {
  if (category === "RECOVERY") return 25;
  if (category === "MICRO-WORKOUTS") return 3;
  if (level === "beginner" || level === "all") return 20;
  if (level === "intermediate") return 28;
  return format === "TABATA" ? 35 : 38;
}

export const BANNED_NAME_WORDS = [
  "inferno",
  "blaze",
  "fire",
  "burn",
  "fury",
  "storm",
  "thunder",
  "power",
  "beast",
  "warrior",
  "elite",
  "ultimate",
  "extreme",
  "foundation",
  "torch",
  "melt",
  "engine",
  "drive",
  "catalyst",
  "flow",
  "restore",
  "gauntlet",
  "summit",
  "crucible",
];
