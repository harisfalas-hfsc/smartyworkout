// Client-safe Smarty Workout specification constants.

export const CATEGORIES = [
  "STRENGTH",
  "MUSCLE BUILDING",
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
  "PUSH",
  "PULL",
  "CHEST",
  "BACK",
  "SHOULDERS",
  "ARMS",
  "LEGS",
] as const;
export type StrengthFocus = (typeof STRENGTH_FOCUS)[number];

/** Categories where a body-part focus is meaningful and offered to the athlete. */
export const FOCUS_CATEGORIES: Category[] = ["STRENGTH", "MUSCLE BUILDING"];

/**
 * Legal formats per category. Re-exported from the doctrine module so there is
 * exactly ONE authoritative table (doctrine imports only types from here, so
 * this is not a runtime cycle).
 */
export { LEGAL_FORMATS as CATEGORY_FORMATS } from "./doctrine";



export type DifficultyLevel = "all" | "beginner" | "intermediate" | "advanced";

/** One star per level. Legacy 1-6 values are folded into the 3-star scale. */
export const MAX_STARS = 3;

export function normalizeStars(stars: number): number {
  if (!stars || stars <= 0) return 0;
  const n = stars > MAX_STARS ? Math.ceil(stars / 2) : Math.round(stars);
  return Math.max(1, Math.min(MAX_STARS, n));
}

export function starsToLevel(stars: number): DifficultyLevel {
  const n = normalizeStars(stars);
  if (n === 0) return "all";
  if (n === 1) return "beginner";
  if (n === 2) return "intermediate";
  return "advanced";
}

export function levelToStars(level: DifficultyLevel): number {
  if (level === "beginner") return 1;
  if (level === "intermediate") return 2;
  if (level === "advanced") return 3;
  return 0;
}

export function difficultyLabel(stars: number): string {
  const level = starsToLevel(stars);
  if (level === "all") return "All Levels";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/** Three stars, three levels — one star is exactly one level, no half steps. */
export function intensityNote(stars: number): string {
  const level = starsToLevel(stars);
  if (level === "all") return "Mixed intensity.";
  if (level === "beginner")
    return "Beginner: moderate volume, generous rest, the simplest safe variations. Never step up into intermediate work.";
  if (level === "intermediate")
    return "Intermediate: solid volume, moderate rest, standard variations. Never step down to beginner or up to advanced.";
  return "Advanced: greater training demand — higher volume, appropriate loading, shorter rest and more challenging but familiar variations. Advanced never means gymnastic, technical or complicated exercises.";
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
