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
  /** When false, the athlete's library likes/dislikes are ignored for this session. */
  useLibraryPreferences?: boolean;
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
  muscle: "MUSCLE BUILDING",

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

/** REQUESTED difficulty only — mood never enters here. */
function requestedStarsFor(
  profile: { experience?: string | null; fitness_level?: string | null } | null,
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
  return LEVEL_STARS[key]!;
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

  const goal = String(data.goal ?? "strength");
  const mood = String(data.mood ?? "normal");
  let minutes = Math.max(5, Math.min(120, Number(data.minutes) || 30));
  let equipmentIds = (Array.isArray(data.equipment) ? data.equipment : ["bodyweight"]).map(String);
  let equipmentMode: EquipmentMode =
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

  const useLibraryPrefs =
    data.useLibraryPreferences ?? (prof?.["use_library_preferences"] as boolean | null) ?? true;
  const favoriteIds = useLibraryPrefs
    ? ((prof?.["favorite_exercise_ids"] as string[] | null) ?? []).slice(0, 25)
    : [];
  const dislikedIds = useLibraryPrefs
    ? ((prof?.["disliked_exercise_ids"] as string[] | null) ?? []).slice(0, 40)
    : [];
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
    const pool = Object.values(GOAL_TO_CATEGORY) as Category[];
    const recentCats = new Set(history.slice(0, 2).map((h) => h.category));
    const fresh = pool.filter((c) => !recentCats.has(c));
    const choices = fresh.length ? fresh : pool;
    category = choices[seed % choices.length]!;
  }
  if (!data.wod && minutes <= 5) category = "MICRO-WORKOUTS";

  const requestedLevel = String(data.level ?? "auto");
  let requestedStars = requestedStarsFor(
    (prof as never) ?? null,
    requestedLevel === "auto" ? undefined : requestedLevel,
  );
  let focus = (data.focus as StrengthFocus | undefined) ?? null;

  if (data.wod) {
    // WOD: the programming (category, difficulty, focus) is identical for
    // everyone; only the EXECUTION is personal (equipment, location, mood,
    // limitations, history).
    category = data.wod.category;
    requestedStars = data.wod.stars;
    focus = data.wod.focus ?? null;
  }

  // Requested difficulty -> athlete state -> effective difficulty. Mood softens
  // by one level, never below beginner, for coach sessions and WOD alike.
  const { effectiveStars } = resolveDifficulty(requestedStars, mood);
  const stars = effectiveStars;

  // MICRO WORKOUT: an equipment-free movement break. The requested duration is
  // honoured (2-10 min) and never inflated; gear choices never apply here.
  if (category === "MICRO-WORKOUTS") {
    minutes = microMinutes(minutes);
    equipmentIds = ["bodyweight"];
    equipmentMode = "BODYWEIGHT";
  }


  const usedNames = history.map((r) => r.name);

  // Variety: exercises already programmed in the last few sessions.
  const { data: recentHtml } = await db
    .from("workouts")
    .select("main_workout")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(4);
  const recentIds = [
    ...new Set(
      ((recentHtml as Array<{ main_workout: string | null }> | null) ?? [])
        .flatMap((r) => [...(r.main_workout ?? "").matchAll(/\{\{exercise:([^:}]+):/g)])
        .map((m) => m[1]!),
    ),
  ].slice(0, 120);

  const requestedFormat = data.format as Format | undefined;
  const format =
    requestedFormat && CATEGORY_FORMATS[category].includes(requestedFormat) ? requestedFormat : null;

  const location = String(data.location ?? "anywhere");

  /**
   * Archive reuse: when another athlete already received a workout built from an
   * identical brief, clone it instead of spending an AI generation. The athlete
   * must never have had that workout before — no repeats, ever.
   */
  type ArchivedWorkout = {
    name: string;
    format: string | null;
    duration_label: string | null;
    description_html: string | null;
    instructions_html: string | null;
    tips_html: string | null;
    main_workout: string | null;
    equipment: string[] | null;
    needs_review: boolean | null;
    review_warnings: string[] | null;
  };

  let reused: ArchivedWorkout | null = null;
  if (!data.note && !equipmentOther && !data.wod) {
    const usedSet = new Set(usedNames);
    const sameEquipment = [...equipmentIds].sort().join("|");
    let candidates = db
      .from("workouts")
      .select(
        "name,format,duration_label,description_html,instructions_html,tips_html,main_workout,equipment,needs_review,review_warnings",
      )
      .eq("category", category)
      .eq("difficulty_stars", stars)
      .eq("duration_min", minutes)
      .eq("location", location)
      .eq("needs_review", false)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);
    candidates = focus ? candidates.eq("focus", focus) : candidates.is("focus", null);
    if (format) candidates = candidates.eq("format", format);
    const { data: pool } = await candidates;
    reused =
      ((pool as ArchivedWorkout[] | null) ?? []).find(
        (w) =>
          !usedSet.has(w.name) &&
          Boolean(w.main_workout) &&
          [...(w.equipment ?? [])].sort().join("|") === sameEquipment,
      ) ?? null;
  }

  const built =
    reused ??
    (await engine.generateWorkoutContent(
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
        recentIds,
        location,
        mood,
        athlete: {
          name: (prof?.["display_name"] as string) ?? null,
          age: (prof?.["age"] as number) ?? null,
          gender: (prof?.["gender"] as string) ?? null,
          height_cm: (prof?.["height_cm"] as number) ?? null,
          weight_kg: (prof?.["weight_kg"] as number) ?? null,
          fitness_level:
            (prof?.["fitness_level"] as string) ?? (prof?.["experience"] as string) ?? null,
          primary_goal: (prof?.["primary_goal"] as string) ?? null,
          secondary_goal: (prof?.["secondary_goal"] as string) ?? null,
          preferred_environment: (prof?.["preferred_environment"] as string) ?? null,
          favorite_library: favoriteLibrary,
          disliked_library: dislikedLibrary,
          recent_performance: performanceLines,
          limitations: (prof?.["limitations"] as string[]) ?? null,
          location,
          mood,
          recent_feedback: feedbackLines,
        },
      },
      usedNames,
    ));

  const anyBuilt = built as Record<string, unknown>;
  const durationLabel = (anyBuilt["duration"] ?? anyBuilt["duration_label"] ?? null) as
    | string
    | null;
  const warnings = (anyBuilt["warnings"] ?? anyBuilt["review_warnings"] ?? []) as string[];

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
      duration_label: durationLabel,
      equipment: equipmentIds,
      location,
      mood,
      description_html: built.description_html,
      instructions_html: built.instructions_html,
      tips_html: built.tips_html,
      main_workout: built.main_workout,
      needs_review: Boolean(anyBuilt["needs_review"]),
      review_warnings: warnings,

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
