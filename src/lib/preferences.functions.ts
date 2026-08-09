import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExercisePreferences = {
  premium: boolean;
  useLibraryPreferences: boolean;
  favoriteIds: string[];
  dislikedIds: string[];
};

/** Reads the signed-in athlete's library likes/dislikes plus their membership state. */
export const getExercisePreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExercisePreferences> => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select("favorite_exercise_ids,disliked_exercise_ids,use_library_preferences")
      .eq("id", userId)
      .maybeSingle();
    const { getAccessStateForUser } = await import("@/lib/eligibility.server");
    const access = await getAccessStateForUser(supabase as never, userId);
    const row = (data ?? {}) as {
      favorite_exercise_ids?: string[] | null;
      disliked_exercise_ids?: string[] | null;
      use_library_preferences?: boolean | null;
    };
    return {
      premium: access.premium,
      useLibraryPreferences: row.use_library_preferences ?? true,
      favoriteIds: row.favorite_exercise_ids ?? [],
      dislikedIds: row.disliked_exercise_ids ?? [],
    };
  });

/**
 * Marks one library exercise as liked, disliked or neutral. Premium only —
 * the membership check runs on the server so the client cannot bypass it.
 */
export const setExercisePreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { exerciseId: string; state: "like" | "dislike" | "none" }) => {
    if (!data?.exerciseId || typeof data.exerciseId !== "string")
      throw new Error("Missing exercise.");
    if (!["like", "dislike", "none"].includes(data.state)) throw new Error("Invalid state.");
    return data;
  })
  .handler(async ({ data, context }): Promise<ExercisePreferences> => {
    const { supabase, userId } = context;
    const { getAccessStateForUser } = await import("@/lib/eligibility.server");
    const access = await getAccessStateForUser(supabase as never, userId);
    if (!access.premium)
      throw new Error("Liking and disliking exercises is part of the premium membership.");

    const { data: current } = await supabase
      .from("profiles")
      .select("favorite_exercise_ids,disliked_exercise_ids,use_library_preferences")
      .eq("id", userId)
      .maybeSingle();
    const row = (current ?? {}) as {
      favorite_exercise_ids?: string[] | null;
      disliked_exercise_ids?: string[] | null;
      use_library_preferences?: boolean | null;
    };

    const favorites = new Set(row.favorite_exercise_ids ?? []);
    const dislikes = new Set(row.disliked_exercise_ids ?? []);
    favorites.delete(data.exerciseId);
    dislikes.delete(data.exerciseId);
    if (data.state === "like") favorites.add(data.exerciseId);
    if (data.state === "dislike") dislikes.add(data.exerciseId);

    const favoriteIds = [...favorites].slice(0, 200);
    const dislikedIds = [...dislikes].slice(0, 200);

    const { error } = await supabase
      .from("profiles")
      .update({ favorite_exercise_ids: favoriteIds, disliked_exercise_ids: dislikedIds } as never)
      .eq("id", userId);
    if (error) throw new Error(error.message);

    return {
      premium: true,
      useLibraryPreferences: row.use_library_preferences ?? true,
      favoriteIds,
      dislikedIds,
    };
  });

/** Turns the "use my library likes and dislikes" setting on or off. */
export const setUseLibraryPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { enabled: boolean }) => ({ enabled: Boolean(data?.enabled) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ use_library_preferences: data.enabled } as never)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { enabled: data.enabled };
  });
