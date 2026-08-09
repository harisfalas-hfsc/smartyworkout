// Smarty Workout — 84-day periodization cycle (Workout of the Day).
// Client-safe: no server imports. Ported from the SmartyGym cycle.

import type { Category, StrengthFocus } from "@/lib/workout/spec";

export const CYCLE_START_DATE = "2025-11-25";
export const CYCLE_TIMEZONE = "Europe/Athens";

export type CycleDay = {
  day: number;
  category: Category;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | null;
  stars: [number, number] | null;
  strengthFocus?: StrengthFocus;
};

export const PERIODIZATION_84DAY: CycleDay[] = [
  // Cycle 1 (days 1-28)
  { day: 1, category: "CARDIO", difficulty: "Beginner", stars: [1, 2] },
  { day: 2, category: "STRENGTH", difficulty: "Advanced", stars: [5, 6], strengthFocus: "LOWER BODY" },
  { day: 3, category: "MOBILITY & STABILITY", difficulty: "Intermediate", stars: [3, 4] },
  { day: 4, category: "CHALLENGE", difficulty: "Advanced", stars: [5, 6] },
  { day: 5, category: "STRENGTH", difficulty: "Intermediate", stars: [3, 4], strengthFocus: "UPPER BODY" },
  { day: 6, category: "PILATES", difficulty: "Advanced", stars: [5, 6] },
  { day: 7, category: "CALORIE BURNING", difficulty: "Intermediate", stars: [3, 4] },
  { day: 8, category: "METABOLIC", difficulty: "Beginner", stars: [1, 2] },
  { day: 9, category: "CHALLENGE", difficulty: "Advanced", stars: [5, 6] },
  { day: 10, category: "RECOVERY", difficulty: null, stars: null },
  { day: 11, category: "CARDIO", difficulty: "Intermediate", stars: [3, 4] },
  { day: 12, category: "STRENGTH", difficulty: "Advanced", stars: [5, 6], strengthFocus: "FULL BODY" },
  { day: 13, category: "MOBILITY & STABILITY", difficulty: "Advanced", stars: [5, 6] },
  { day: 14, category: "CHALLENGE", difficulty: "Intermediate", stars: [3, 4] },
  { day: 15, category: "STRENGTH", difficulty: "Beginner", stars: [1, 2], strengthFocus: "LOW PUSH & UPPER PULL" },
  { day: 16, category: "PILATES", difficulty: "Beginner", stars: [1, 2] },
  { day: 17, category: "CALORIE BURNING", difficulty: "Advanced", stars: [5, 6] },
  { day: 18, category: "METABOLIC", difficulty: "Intermediate", stars: [3, 4] },
  { day: 19, category: "CARDIO", difficulty: "Advanced", stars: [5, 6] },
  { day: 20, category: "STRENGTH", difficulty: "Intermediate", stars: [3, 4], strengthFocus: "LOW PULL & UPPER PUSH" },
  { day: 21, category: "MOBILITY & STABILITY", difficulty: "Beginner", stars: [1, 2] },
  { day: 22, category: "CHALLENGE", difficulty: "Intermediate", stars: [3, 4] },
  { day: 23, category: "STRENGTH", difficulty: "Advanced", stars: [5, 6], strengthFocus: "CORE & GLUTES" },
  { day: 24, category: "PILATES", difficulty: "Intermediate", stars: [3, 4] },
  { day: 25, category: "CALORIE BURNING", difficulty: "Beginner", stars: [1, 2] },
  { day: 26, category: "METABOLIC", difficulty: "Advanced", stars: [5, 6] },
  { day: 27, category: "CHALLENGE", difficulty: "Intermediate", stars: [3, 4] },
  { day: 28, category: "RECOVERY", difficulty: null, stars: null },

  // Cycle 2 (days 29-56)
  { day: 29, category: "CARDIO", difficulty: "Beginner", stars: [1, 2] },
  { day: 30, category: "STRENGTH", difficulty: "Intermediate", stars: [3, 4], strengthFocus: "LOWER BODY" },
  { day: 31, category: "MOBILITY & STABILITY", difficulty: "Intermediate", stars: [3, 4] },
  { day: 32, category: "CHALLENGE", difficulty: "Advanced", stars: [5, 6] },
  { day: 33, category: "STRENGTH", difficulty: "Beginner", stars: [1, 2], strengthFocus: "UPPER BODY" },
  { day: 34, category: "PILATES", difficulty: "Advanced", stars: [5, 6] },
  { day: 35, category: "CALORIE BURNING", difficulty: "Intermediate", stars: [3, 4] },
  { day: 36, category: "METABOLIC", difficulty: "Beginner", stars: [1, 2] },
  { day: 37, category: "CHALLENGE", difficulty: "Advanced", stars: [5, 6] },
  { day: 38, category: "RECOVERY", difficulty: null, stars: null },
  { day: 39, category: "CARDIO", difficulty: "Intermediate", stars: [3, 4] },
  { day: 40, category: "STRENGTH", difficulty: "Beginner", stars: [1, 2], strengthFocus: "FULL BODY" },
  { day: 41, category: "MOBILITY & STABILITY", difficulty: "Advanced", stars: [5, 6] },
  { day: 42, category: "CHALLENGE", difficulty: "Intermediate", stars: [3, 4] },
  { day: 43, category: "STRENGTH", difficulty: "Advanced", stars: [5, 6], strengthFocus: "LOW PUSH & UPPER PULL" },
  { day: 44, category: "PILATES", difficulty: "Beginner", stars: [1, 2] },
  { day: 45, category: "CALORIE BURNING", difficulty: "Advanced", stars: [5, 6] },
  { day: 46, category: "METABOLIC", difficulty: "Intermediate", stars: [3, 4] },
  { day: 47, category: "CARDIO", difficulty: "Advanced", stars: [5, 6] },
  { day: 48, category: "STRENGTH", difficulty: "Beginner", stars: [1, 2], strengthFocus: "LOW PULL & UPPER PUSH" },
  { day: 49, category: "MOBILITY & STABILITY", difficulty: "Beginner", stars: [1, 2] },
  { day: 50, category: "CHALLENGE", difficulty: "Intermediate", stars: [3, 4] },
  { day: 51, category: "STRENGTH", difficulty: "Intermediate", stars: [3, 4], strengthFocus: "CORE & GLUTES" },
  { day: 52, category: "PILATES", difficulty: "Intermediate", stars: [3, 4] },
  { day: 53, category: "CALORIE BURNING", difficulty: "Beginner", stars: [1, 2] },
  { day: 54, category: "METABOLIC", difficulty: "Advanced", stars: [5, 6] },
  { day: 55, category: "CHALLENGE", difficulty: "Intermediate", stars: [3, 4] },
  { day: 56, category: "RECOVERY", difficulty: null, stars: null },

  // Cycle 3 (days 57-84)
  { day: 57, category: "CARDIO", difficulty: "Beginner", stars: [1, 2] },
  { day: 58, category: "STRENGTH", difficulty: "Beginner", stars: [1, 2], strengthFocus: "LOWER BODY" },
  { day: 59, category: "MOBILITY & STABILITY", difficulty: "Intermediate", stars: [3, 4] },
  { day: 60, category: "CHALLENGE", difficulty: "Advanced", stars: [5, 6] },
  { day: 61, category: "STRENGTH", difficulty: "Advanced", stars: [5, 6], strengthFocus: "UPPER BODY" },
  { day: 62, category: "PILATES", difficulty: "Advanced", stars: [5, 6] },
  { day: 63, category: "CALORIE BURNING", difficulty: "Intermediate", stars: [3, 4] },
  { day: 64, category: "METABOLIC", difficulty: "Beginner", stars: [1, 2] },
  { day: 65, category: "CHALLENGE", difficulty: "Advanced", stars: [5, 6] },
  { day: 66, category: "RECOVERY", difficulty: null, stars: null },
  { day: 67, category: "CARDIO", difficulty: "Intermediate", stars: [3, 4] },
  { day: 68, category: "STRENGTH", difficulty: "Intermediate", stars: [3, 4], strengthFocus: "FULL BODY" },
  { day: 69, category: "MOBILITY & STABILITY", difficulty: "Advanced", stars: [5, 6] },
  { day: 70, category: "CHALLENGE", difficulty: "Intermediate", stars: [3, 4] },
  { day: 71, category: "STRENGTH", difficulty: "Intermediate", stars: [3, 4], strengthFocus: "LOW PUSH & UPPER PULL" },
  { day: 72, category: "PILATES", difficulty: "Beginner", stars: [1, 2] },
  { day: 73, category: "CALORIE BURNING", difficulty: "Advanced", stars: [5, 6] },
  { day: 74, category: "METABOLIC", difficulty: "Intermediate", stars: [3, 4] },
  { day: 75, category: "CARDIO", difficulty: "Advanced", stars: [5, 6] },
  { day: 76, category: "STRENGTH", difficulty: "Advanced", stars: [5, 6], strengthFocus: "LOW PULL & UPPER PUSH" },
  { day: 77, category: "MOBILITY & STABILITY", difficulty: "Beginner", stars: [1, 2] },
  { day: 78, category: "CHALLENGE", difficulty: "Intermediate", stars: [3, 4] },
  { day: 79, category: "STRENGTH", difficulty: "Beginner", stars: [1, 2], strengthFocus: "CORE & GLUTES" },
  { day: 80, category: "PILATES", difficulty: "Intermediate", stars: [3, 4] },
  { day: 81, category: "CALORIE BURNING", difficulty: "Beginner", stars: [1, 2] },
  { day: 82, category: "METABOLIC", difficulty: "Advanced", stars: [5, 6] },
  { day: 83, category: "CHALLENGE", difficulty: "Intermediate", stars: [3, 4] },
  { day: 84, category: "RECOVERY", difficulty: null, stars: null },
];

/** Local calendar date (YYYY-MM-DD) in a given IANA timezone. */
export function localDateISO(date: Date = new Date(), timeZone: string = CYCLE_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Local hour (0-23) in a given IANA timezone. */
export function localHour(date: Date = new Date(), timeZone: string = CYCLE_TIMEZONE): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hour12: false }).format(date),
  );
}

export function getDayIn84Cycle(dateISO: string): number {
  const start = new Date(`${CYCLE_START_DATE}T00:00:00Z`).getTime();
  const target = new Date(`${dateISO}T00:00:00Z`).getTime();
  const diff = Math.floor((target - start) / 86_400_000);
  return (((diff % 84) + 84) % 84) + 1;
}

export function getCycleDay(dateISO: string): CycleDay {
  return PERIODIZATION_84DAY[getDayIn84Cycle(dateISO) - 1]!;
}

/** Three-star scale: 1 beginner, 2 intermediate, 3 advanced. */
export function starsForCycleDay(day: CycleDay): number {
  if (day.difficulty === "Advanced") return 3;
  if (day.difficulty === "Intermediate") return 2;
  return 1;
}

export function cycleBlock(dayIn84: number): number {
  return Math.ceil(dayIn84 / 28);
}

export type WodLevel = "cycle" | "beginner" | "intermediate" | "advanced";

const LEVEL_STARS: Record<Exclude<WodLevel, "cycle">, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};


/** Stars for a cycle day, honouring a fixed level preference when set. */
export function starsForCycleDayWithLevel(day: CycleDay, level: WodLevel = "cycle"): number {
  if (day.category === "RECOVERY") return 1;
  if (level === "cycle") return starsForCycleDay(day);
  return LEVEL_STARS[level];
}

export function difficultyLabelWithLevel(day: CycleDay, level: WodLevel = "cycle"): string {
  if (day.category === "RECOVERY") return "Recovery";
  if (level === "cycle") return day.difficulty ?? "Recovery";
  return level.charAt(0).toUpperCase() + level.slice(1);
}
