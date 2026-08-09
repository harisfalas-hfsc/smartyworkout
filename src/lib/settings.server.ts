// Admin-editable application settings (server only).
// Stored in the `app_settings` table, read with the service-role client.
import {
  PERIODIZATION_84DAY,
  getDayIn84Cycle,
  type CycleDay,
} from "@/lib/wod-cycle";
import type { Category } from "@/lib/workout/spec";

export type WorkoutRules = {
  /** Manual Smarty Coach generations included per day with a membership. */
  dailyGenerationLimit: number;
  /** Master switch for the Workout of the Day programme. */
  wodEnabled: boolean;
  /** Generate both a bodyweight and an equipment variant each day. */
  wodTwoVariants: boolean;
  /** Extra coaching rules appended to every generation prompt. */
  extraCoachRules: string;
  /** Membership price used for revenue estimates, in euros. */
  membershipPriceEur: number;
};

export const DEFAULT_WORKOUT_RULES: WorkoutRules = {
  dailyGenerationLimit: 2,
  wodEnabled: true,
  wodTwoVariants: true,
  extraCoachRules: "",
  membershipPriceEur: 9.99,
};

export type CycleOverride = {
  category?: Category;
  difficulty?: "Beginner" | "Intermediate" | "Advanced" | null;
};

export type CycleOverrides = Record<string, CycleOverride>;

const RULES_KEY = "workout_rules";
const CYCLE_KEY = "wod_cycle_overrides";

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (!data?.value) return fallback;
    return { ...(fallback as object), ...(data.value as object) } as T;
  } catch {
    return fallback;
  }
}

export async function writeSetting(key: string, value: unknown): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await (supabaseAdmin as any)
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function getWorkoutRules(): Promise<WorkoutRules> {
  const rules = await readSetting<WorkoutRules>(RULES_KEY, DEFAULT_WORKOUT_RULES);
  return {
    ...rules,
    dailyGenerationLimit: Math.max(
      0,
      Math.min(20, Math.round(Number(rules.dailyGenerationLimit) || 0)),
    ),
    membershipPriceEur: Number(rules.membershipPriceEur) || DEFAULT_WORKOUT_RULES.membershipPriceEur,
    extraCoachRules: String(rules.extraCoachRules ?? "").slice(0, 4000),
  };
}

export async function saveWorkoutRules(patch: Partial<WorkoutRules>): Promise<WorkoutRules> {
  const current = await getWorkoutRules();
  const next: WorkoutRules = { ...current, ...patch };
  await writeSetting(RULES_KEY, next);
  return getWorkoutRules();
}

export async function getCycleOverrides(): Promise<CycleOverrides> {
  return readSetting<CycleOverrides>(CYCLE_KEY, {});
}

export async function saveCycleOverride(
  day: number,
  override: CycleOverride | null,
): Promise<CycleOverrides> {
  const overrides = await getCycleOverrides();
  if (!override || (!override.category && override.difficulty === undefined)) {
    delete overrides[String(day)];
  } else {
    overrides[String(day)] = override;
  }
  await writeSetting(CYCLE_KEY, overrides);
  return overrides;
}

const STARS_BY_LEVEL: Record<string, [number, number]> = {
  Beginner: [1, 2],
  Intermediate: [3, 4],
  Advanced: [5, 6],
};

export function applyCycleOverride(base: CycleDay, override?: CycleOverride): CycleDay {
  if (!override) return base;
  const category = override.category ?? base.category;
  const difficulty =
    override.difficulty !== undefined ? override.difficulty : base.difficulty;
  const stars = difficulty ? (STARS_BY_LEVEL[difficulty] ?? base.stars) : null;
  return { ...base, category, difficulty, stars };
}

/** The cycle day for a date, with any admin override applied. */
export async function resolveCycleDay(dateISO: string): Promise<CycleDay> {
  const dayIn84 = getDayIn84Cycle(dateISO);
  const base = PERIODIZATION_84DAY[dayIn84 - 1]!;
  const overrides = await getCycleOverrides();
  return applyCycleOverride(base, overrides[String(dayIn84)]);
}

/** The full 84-day calendar with overrides applied — used by the admin panel. */
export async function resolveFullCycle(): Promise<CycleDay[]> {
  const overrides = await getCycleOverrides();
  return PERIODIZATION_84DAY.map((d) => applyCycleOverride(d, overrides[String(d.day)]));
}
