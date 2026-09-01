import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CoachRequest } from "@/lib/workout/create.server";

export type { CoachRequest };

/** The only failure wording an athlete ever sees. */
const GENERIC_APOLOGY =
  "We hit a temporary snag building your workout. Your answers are safe, we are already on it, and it will arrive shortly — nothing for you to do.";

export const generateWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CoachRequest & { refinementText?: string }) => input)
  .handler(async ({ data, context }) => {
    const { withProblemReport } = await import("@/lib/errors/report.server");
    return withProblemReport(
      { source: "workout-generation", route: "/coach", userId: context.userId },
      async () => {
        const { requireWorkoutAccess } = await import("@/lib/eligibility.server");
        await requireWorkoutAccess(context.supabase as never, context.userId, {
          countsAgainstDailyQuota: true,
        });
        const { runTrackedGeneration } = await import("@/lib/workout-generation.server");
        const { refinementText, ...request } = data;
        const res = await runTrackedGeneration({
          db: context.supabase as never,
          userId: context.userId,
          stage: refinementText ? "refinement" : "initial",
          request,
          refinementText: refinementText ?? null,
        });
        if (!res.ok) {
          // Never expose the internal cause — the retry cron takes it from here.
          throw new Error(GENERIC_APOLOGY);
        }
        return { id: res.workoutId, notes: res.notes, requestId: res.requestId };
      },
    );
  });

/** Any session still being recovered for this member — drives the "we are on it" card. */
export const getPendingGeneration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("workout_generation_requests")
      .select("id,status,stage,attempt_count,created_at,workout_id")
      .eq("user_id", context.userId)
      .in("status", ["failed", "building"])
      .is("workout_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = (data ?? null) as
      | { id: string; status: string; stage: string; attempt_count: number; created_at: string }
      | null;
    if (!row) return { pending: null };
    return { pending: row };
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
    const paths = list.map((row) => row.gif_path).filter((path): path is string => Boolean(path));
    const signedUrls = new Map<string, string>();
    if (paths.length) {
      const { data: signed, error: signedError } = await supabase.storage
        .from("exercise-library")
        .createSignedUrls(paths, 60 * 60 * 24);
      if (signedError) throw new Error(signedError.message);
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl);
      }
    }
    return {
      exercises: list.map((r) => ({
        ...r,
        gif_url: r.gif_path ? (signedUrls.get(r.gif_path) ?? null) : null,
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

export const setWorkoutStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { workoutId: string; status?: string; scheduled_at?: string | null }) => input,
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.status) {
      patch["status"] = data.status;
      patch["completed_at"] = data.status === "completed" ? new Date().toISOString() : null;
    }
    if (data.scheduled_at !== undefined) patch["scheduled_at"] = data.scheduled_at;
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await context.supabase
      .from("workouts")
      .update(patch as never)
      .eq("id", data.workoutId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
