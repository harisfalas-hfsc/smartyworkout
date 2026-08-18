import { createServerFn } from "@tanstack/react-start";

export type WorkoutShareCard = {
  id: string;
  name: string;
  category: string | null;
  focus: string | null;
  difficulty_stars: number;
  difficulty_label: string | null;
  duration_min: number | null;
  duration_label: string | null;
  location: string | null;
  equipment: string[] | null;
} | null;

/**
 * Public, deliberately minimal preview of a workout: title + headline stats
 * only. The workout content itself stays behind the normal access rules.
 */
export const getWorkoutShareCard = createServerFn({ method: "GET" })
  .inputValidator((input: { workoutId: string }) => input)
  .handler(async ({ data }): Promise<WorkoutShareCard> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("workouts")
      .select(
        "id,name,category,focus,difficulty_stars,difficulty_label,duration_min,duration_label,location,equipment",
      )
      .eq("id", data.workoutId)
      .maybeSingle();
    return (row as WorkoutShareCard) ?? null;
  });
