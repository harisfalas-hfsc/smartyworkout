import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CATEGORY_FORMATS,
  difficultyLabel,
  type Category,
  type EquipmentMode,
  type Format,
  type StrengthFocus,
} from "@/lib/workout/spec";

export type CoachRequest = {
  goal?: string;
  mood?: string;
  minutes?: number;
  location?: string;
  equipment?: string[];
  equipmentOther?: string;
  focus?: string;
  format?: string;
  note?: string;
  level?: string;
  surprise?: boolean;
  /** Workout of the Day overrides — bypasses goal/level mapping. */
  wod?: {
    category: Category;
    stars: number;
    focus?: StrengthFocus | null;
    date: string;
    cycleDay: number;
    variant?: string;
  };
};

export const GOAL_TO_CATEGORY: Record<string, Category> = {
  strength: "STRENGTH",
  muscle: "STRENGTH",
  fullbody: "STRENGTH",
  calorie: "CALORIE BURNING",
  cardio: "CARDIO",
  metabolic: "METABOLIC",
  challenge: "CHALLENGE",
  mobility: "MOBILITY & STABILITY",
  pilates: "PILATES",
  micro: "MICRO-WORKOUTS",
  recovery: "RECOVERY",
};

const BODYWEIGHT_ONLY = new Set(["bodyweight"]);

/** Three stars, three levels: 1 beginner, 2 intermediate, 3 advanced. */
const LEVEL_STARS: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

function starsFor(
  profile: { experience?: string | null; fitness_level?: string | null } | null,
  mood: string,
  requested?: string,
) {
  const level = (profile?.fitness_level ?? profile?.experience ?? "").toLowerCase();
  const key =
    requested && LEVEL_STARS[requested]
      ? requested
      : level.includes("adv")
        ? "advanced"
        : level.includes("inter")
          ? "intermediate"
          : "beginner";
  const base = LEVEL_STARS[key]!;
  // Mood softens a hard day by one level, never below beginner.
  const tired = mood === "tired" || mood === "low" || mood === "sore";
  return Math.max(1, Math.min(3, tired ? base - 1 || 1 : base));
}



/**
 * Builds and stores a workout for one athlete.
 * Works with both the request-scoped (RLS) client and the service-role client,
 * so the cron scheduler and the interactive coach share one engine.
 */
export async function createWorkoutForUser(
  supabase: SupabaseClient<never, never, never>,
  userId: string,
  data: CoachRequest,
): Promise<{ id: string; name: string; category: Category }> {
  const db = supabase as unknown as SupabaseClient;
  const engine = await import("@/lib/workout/generate.server");

  const goal = String(data.goal ?? "fullbody");
  const mood = String(data.mood ?? "normal");
  const minutes = Math.max(5, Math.min(120, Number(data.minutes) || 30));
  const equipmentIds = (Array.isArray(data.equipment) ? data.equipment : ["bodyweight"]).map(String);
  const equipmentMode: EquipmentMode =
    equipmentIds.length && equipmentIds.every((e) => BODYWEIGHT_ONLY.has(e))
      ? "BODYWEIGHT"
      : "EQUIPMENT";

  const equipmentOther = String(data.equipmentOther ?? "").slice(0, 200);

  let category: Category = GOAL_TO_CATEGORY[goal] ?? "STRENGTH";

  const [{ data: profile }, { data: recent }, { data: feedback }, { data: setLogs }] =
    await Promise.all([
      db.from("profiles").select("*").eq("id", userId).maybeSingle(),
      db
        .from("workouts")
        .select("name,category,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(120),
      db
        .from("workout_feedback")
        .select("difficulty_rating,feeling,enjoyed,would_repeat,comment,created_at,workouts(name,category)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      db
        .from("set_logs")
        .select("exercise_name,set_number,reps,weight_kg,seconds,completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(60),
    ]);


  const prof = (profile ?? null) as Record<string, unknown> | null;
  const history = (recent as { name: string; category: string }[] | null) ?? [];
  const feedbackLines = (
    (feedback as
      | Array<{
          difficulty_rating: string | null;
          feeling: string | null;
          enjoyed: string | null;
          would_repeat: string | null;
          comment: string | null;
          workouts?: { name?: string | null; category?: string | null } | null;
        }>
      | null) ?? []
  ).map((f) => {
    const w = f.workouts;
    const bits = [
      f.difficulty_rating ? `felt ${f.difficulty_rating}` : null,
      f.feeling ? `energy after: ${f.feeling}` : null,
      f.enjoyed ? `enjoyed: ${f.enjoyed}` : null,
      f.would_repeat ? `would repeat: ${f.would_repeat}` : null,
      f.comment ? `comment: "${f.comment}"` : null,
    ].filter(Boolean);
    return `${w?.category ?? "workout"} — ${w?.name ?? "session"}: ${bits.join(", ")}`;
  });

  // Progressive overload: best logged set per movement, most recent first.
  const perfRows =
    (setLogs as Array<{
      exercise_name: string;
      set_number: number;
      reps: number | null;
      weight_kg: number | null;
      seconds: number | null;
      completed_at: string;
    }> | null) ?? [];
  const bestByExercise = new Map<string, string>();
  for (const row of perfRows) {
    if (bestByExercise.has(row.exercise_name)) continue;
    const bits = [
      row.reps ? `${row.reps} reps` : null,
      row.weight_kg ? `${row.weight_kg} kg` : null,
      row.seconds ? `${row.seconds} sec` : null,
    ].filter(Boolean);
    if (!bits.length) continue;
    bestByExercise.set(
      row.exercise_name,
      `${row.exercise_name}: last logged ${bits.join(" @ ")} (set ${row.set_number}, ${row.completed_at.slice(0, 10)})`,
    );
  }
  const performanceLines = [...bestByExercise.values()].slice(0, 12);

  const favoriteIds = ((prof?.["favorite_exercise_ids"] as string[] | null) ?? []).slice(0, 25);
  const dislikedIds = ((prof?.["disliked_exercise_ids"] as string[] | null) ?? []).slice(0, 40);
  const pickedIds = [...favoriteIds, ...dislikedIds];
  const libraryNames = new Map<string, string>();
  if (pickedIds.length) {
    const { data: picked } = await db.from("exercises").select("id,name").in("id", pickedIds);
    for (const row of (picked as Array<{ id: string; name: string }> | null) ?? [])
      libraryNames.set(row.id, row.name);
  }
  const favoriteLibrary = favoriteIds.map((id) => libraryNames.get(id)).filter(Boolean) as string[];
  const dislikedLibrary = dislikedIds.map((id) => libraryNames.get(id)).filter(Boolean) as string[];


  if (data.surprise) {
    // Deterministic per user per day, and never the same category as the last 2 workouts.
    const seedSource = `${userId}:${new Date().toISOString().slice(0, 10)}`;
    let seed = 0;
    for (let i = 0; i < seedSource.length; i++) seed = (seed * 31 + seedSource.charCodeAt(i)) >>> 0;
    const preferred = (prof?.["preferred_categories"] as string[] | null) ?? [];
    const pool = (
      preferred.length
        ? preferred.map((g) => GOAL_TO_CATEGORY[g]).filter(Boolean)
        : Object.values(GOAL_TO_CATEGORY)
    ) as Category[];
    const recentCats = new Set(history.slice(0, 2).map((h) => h.category));
    const fresh = pool.filter((c) => !recentCats.has(c));
    const choices = fresh.length ? fresh : pool;
    category = choices[seed % choices.length]!;
  }
  if (!data.wod && minutes <= 5) category = "MICRO-WORKOUTS";

  const requestedLevel = String(data.level ?? "auto");
  let stars = starsFor(
    (prof as never) ?? null,
    mood,
    requestedLevel === "auto" ? undefined : requestedLevel,
  );
  let focus = (data.focus as StrengthFocus | undefined) ?? null;

  if (data.wod) {
    category = data.wod.category;
    stars = data.wod.stars;
    focus = data.wod.focus ?? null;
  }

  const usedNames = history.map((r) => r.name);

  const requestedFormat = data.format as Format | undefined;
  const format =
    requestedFormat && CATEGORY_FORMATS[category].includes(requestedFormat) ? requestedFormat : null;

  const built = await engine.generateWorkoutContent(
    db as never,
    {
      category,
      format,
      equipmentMode,
      selectedEquipment: equipmentIds,
      ...(equipmentOther ? { customEquipmentRaw: equipmentOther } : {}),
      stars,
      minutes,
      focus,
      ...(data.note ? { note: String(data.note).slice(0, 500) } : {}),
      favoriteIds,
      dislikedIds,
      athlete: {
        name: (prof?.["display_name"] as string) ?? null,
        age: (prof?.["age"] as number) ?? null,
        gender: (prof?.["gender"] as string) ?? null,
        height_cm: (prof?.["height_cm"] as number) ?? null,
        weight_kg: (prof?.["weight_kg"] as number) ?? null,
        fitness_level: (prof?.["fitness_level"] as string) ?? (prof?.["experience"] as string) ?? null,
        primary_goal: (prof?.["primary_goal"] as string) ?? null,
        secondary_goal: (prof?.["secondary_goal"] as string) ?? null,
        training_frequency: (prof?.["training_frequency"] as number) ?? null,
        preferred_categories: (prof?.["preferred_categories"] as string[]) ?? null,
        preferred_environment: (prof?.["preferred_environment"] as string) ?? null,
        favorite_exercises: (prof?.["favorite_exercises"] as string[]) ?? null,
        disliked_exercises: (prof?.["disliked_exercises"] as string[]) ?? null,
        favorite_library: favoriteLibrary,
        disliked_library: dislikedLibrary,
        recent_performance: performanceLines,
        limitations: (prof?.["limitations"] as string[]) ?? null,
        location: String(data.location ?? "anywhere"),
        mood,
        recent_feedback: feedbackLines,
      },

    },
    usedNames,
  );

  const { data: inserted, error } = await db
    .from("workouts")
    .insert({
      user_id: userId,
      name: built.name,
      category,
      format: built.format,
      focus,
      difficulty_stars: stars,
      difficulty_label: difficultyLabel(stars),
      duration_min: minutes,
      duration_label: built.duration,
      equipment: equipmentIds,
      location: String(data.location ?? "anywhere"),
      mood,
      description_html: built.description_html,
      instructions_html: built.instructions_html,
      tips_html: built.tips_html,
      main_workout: built.main_workout,
      needs_review: built.needs_review,
      review_warnings: built.warnings,
      status: "created",
      is_wod: Boolean(data.wod),
      wod_date: data.wod?.date ?? null,
      wod_cycle_day: data.wod?.cycleDay ?? null,
      wod_variant: data.wod?.variant ?? null,
    } as never)
    .select("id,name")
    .single();
  if (error) throw new Error(error.message);
  const row = inserted as { id: string; name: string };
  return { id: row.id, name: row.name, category };
}
