import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
  focus?: string;
  format?: string;
  note?: string;
  surprise?: boolean;
};

const GOAL_TO_CATEGORY: Record<string, Category> = {
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

function starsFor(profile: { experience?: string | null; fitness_level?: string | null } | null, mood: string) {
  const level = (profile?.fitness_level ?? profile?.experience ?? "").toLowerCase();
  let stars = level.includes("adv") ? 5 : level.includes("inter") ? 4 : 2;
  if (mood === "tired" || mood === "low" || mood === "sore") stars = Math.max(1, stars - 1);
  if (mood === "push" || mood === "energized") stars = Math.min(6, stars + 1);
  return stars;
}

export const generateWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CoachRequest) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const engine = await import("@/lib/workout/generate.server");

    const goal = String(data.goal ?? "fullbody");
    const mood = String(data.mood ?? "normal");
    const minutes = Math.max(5, Math.min(120, Number(data.minutes) || 30));
    const equipmentIds = (Array.isArray(data.equipment) ? data.equipment : ["bodyweight"]).map(String);
    const equipmentMode: EquipmentMode =
      equipmentIds.length && equipmentIds.every((e) => BODYWEIGHT_ONLY.has(e))
        ? "BODYWEIGHT"
        : "EQUIPMENT";

    let category: Category = GOAL_TO_CATEGORY[goal] ?? "STRENGTH";

    const [{ data: profile }, { data: recent }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("workouts")
        .select("name,category,created_at")
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

    const prof = (profile ?? null) as Record<string, unknown> | null;
    const history = ((recent as { name: string; category: string }[] | null) ?? []);

    if (data.surprise) {
      // Deterministic per user per day, and never the same category as the last 2 workouts.
      const seedSource = `${userId}:${new Date().toISOString().slice(0, 10)}`;
      let seed = 0;
      for (let i = 0; i < seedSource.length; i++) seed = (seed * 31 + seedSource.charCodeAt(i)) >>> 0;
      const preferred = (prof?.["preferred_categories"] as string[] | null) ?? [];
      const pool = (preferred.length
        ? preferred.map((g) => GOAL_TO_CATEGORY[g]).filter(Boolean)
        : Object.values(GOAL_TO_CATEGORY)) as Category[];
      const recentCats = new Set(history.slice(0, 2).map((h) => h.category));
      const fresh = pool.filter((c) => !recentCats.has(c));
      const choices = fresh.length ? fresh : pool;
      category = choices[seed % choices.length]!;
    }
    if (minutes <= 5) category = "MICRO-WORKOUTS";

    const stars = starsFor((prof as never) ?? null, mood);
    const usedNames = history.map((r) => r.name);

    const requestedFormat = data.format as Format | undefined;
    const format =
      requestedFormat && CATEGORY_FORMATS[category].includes(requestedFormat) ? requestedFormat : null;

    const built = await engine.generateWorkoutContent(
      supabase,
      {
        category,
        format,
        equipmentMode,
        selectedEquipment: equipmentIds,
        stars,
        minutes,
        focus: (data.focus as StrengthFocus | undefined) ?? null,
        ...(data.note ? { note: String(data.note).slice(0, 500) } : {}),
      },
      usedNames,
    );

    const { data: inserted, error } = await supabase
      .from("workouts")
      .insert({
        user_id: userId,
        name: built.name,
        category,
        format: built.format,
        focus: (data.focus as string | undefined) ?? null,
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
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (inserted as { id: string }).id };
  });

export const getExerciseDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => ({
    ids: (input.ids ?? []).map(String).slice(0, 60),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (!data.ids.length) return { exercises: [] };
    const { data: rows, error } = await supabase
      .from("exercises")
      .select(
        "id,name,body_part,target_muscle,secondary_muscles,equipment,difficulty,category,description,instructions,gif_path",
      )
      .in("id", data.ids);
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as Array<Record<string, unknown> & { gif_path: string | null }>;
    const paths = list.map((r) => r.gif_path).filter((p): p is string => Boolean(p));
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await supabase.storage
        .from("exercise-library")
        .createSignedUrls(paths, 60 * 60 * 4);
      for (const u of urls ?? []) {
        if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
      }
    }
    return {
      exercises: list.map((r) => ({
        ...r,
        gif_url: r.gif_path ? (signed.get(r.gif_path) ?? null) : null,
      })),
    };
  });

export const setWorkoutMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      workoutId: string;
      is_favorite?: boolean;
      rating?: number | null;
      user_note?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (typeof data.is_favorite === "boolean") patch["is_favorite"] = data.is_favorite;
    if (data.rating !== undefined) patch["rating"] = data.rating;
    if (data.user_note !== undefined) patch["user_note"] = data.user_note;
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await context.supabase
      .from("workouts")
      .update(patch as never)
      .eq("id", data.workoutId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
