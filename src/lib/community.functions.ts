import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SharedWorkoutFull } from "@/lib/community";

/** Every community interaction requires an active membership. */
async function requirePremium(context: { supabase: unknown; userId: string }) {
  const { getAccessStateForUser } = await import("@/lib/eligibility.server");
  const access = await getAccessStateForUser(context.supabase as never, context.userId);
  if (!access.premium) {
    throw new Error("An active Smarty Workout membership is required to join the community.");
  }
  return access;
}

export const shareWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workoutId: string; shared: boolean }) => input)
  .handler(async ({ context, data }) => {
    await requirePremium(context as never);
    const { error } = await context.supabase
      .from("workouts")
      .update({
        is_shared: data.shared,
        shared_at: data.shared ? new Date().toISOString() : null,
      } as never)
      .eq("id", data.workoutId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const, shared: data.shared };
  });

export const reactToWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workoutId: string; value: 1 | -1 | 0 }) => input)
  .handler(async ({ context, data }) => {
    await requirePremium(context as never);
    if (data.value === 0) {
      const { error } = await context.supabase
        .from("community_reactions")
        .delete()
        .eq("workout_id", data.workoutId)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
      return { ok: true as const, value: 0 };
    }
    const { error } = await context.supabase.from("community_reactions").upsert(
      {
        workout_id: data.workoutId,
        user_id: context.userId,
        value: data.value,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "workout_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const, value: data.value };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workoutId: string; body: string }) => input)
  .handler(async ({ context, data }) => {
    await requirePremium(context as never);
    const body = data.body.trim().slice(0, 1000);
    if (!body) throw new Error("Write something first.");
    const { error } = await context.supabase.from("community_comments").insert({
      workout_id: data.workoutId,
      user_id: context.userId,
      body,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { commentId: string }) => input)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("community_comments")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", data.commentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const reportContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetType: "workout" | "comment"; targetId: string; reason?: string }) => input)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("community_reports").insert({
      target_type: data.targetType,
      target_id: data.targetId,
      reporter_id: context.userId,
      reason: data.reason?.slice(0, 500) ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const COPY_FIELDS = [
  "name",
  "category",
  "format",
  "focus",
  "difficulty_stars",
  "difficulty_label",
  "duration_min",
  "duration_label",
  "equipment",
  "location",
  "mood",
  "description",
  "instructions",
  "tips",
  "plan",
  "rationale",
  "image_url",
  "soft_tissue",
  "activation",
  "warm_up",
  "main_workout",
  "finisher",
  "cool_down",
  "tips_html",
  "description_html",
  "instructions_html",
] as const;

/** Full read of a shared workout — members only. */
export const getSharedWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workoutId: string }) => input)
  .handler(async ({ context, data }) => {
    await requirePremium(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("workouts")
      .select("*")
      .eq("id", data.workoutId)
      .eq("is_shared", true)
      .eq("community_hidden", false)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("This workout is no longer shared with the community.");
    const [{ data: reaction }, { data: mine }] = await Promise.all([
      supabaseAdmin
        .from("community_reactions")
        .select("value")
        .eq("workout_id", data.workoutId)
        .eq("user_id", context.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("workouts")
        .select("id,status")
        .eq("user_id", context.userId)
        .eq("community_source_id", data.workoutId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      workout: row as unknown as SharedWorkoutFull,
      myReaction: ((reaction as { value?: number } | null)?.value ?? 0) as 1 | -1 | 0,
      myCopy: (mine as { id: string; status: string } | null) ?? null,
    };
  });

/** Copies a shared workout, unchanged, into the member's own logbook. */
export const startSharedWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workoutId: string }) => input)
  .handler(async ({ context, data }) => {
    await requirePremium(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("workouts")
      .select("id,status")
      .eq("user_id", context.userId)
      .eq("community_source_id", data.workoutId)
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return { ok: true as const, workoutId: (existing as { id: string }).id };

    const { data: source, error } = await supabaseAdmin
      .from("workouts")
      .select("*")
      .eq("id", data.workoutId)
      .eq("is_shared", true)
      .eq("community_hidden", false)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!source) throw new Error("This workout is no longer shared with the community.");

    const src = source as Record<string, unknown>;
    const insert: Record<string, unknown> = {
      user_id: context.userId,
      status: "created",
      created_by: "community",
      community_source_id: data.workoutId,
      is_shared: false,
      is_wod: false,
    };
    for (const key of COPY_FIELDS) insert[key] = src[key] ?? null;
    insert["equipment"] = Array.isArray(src["equipment"]) ? src["equipment"] : [];
    insert["tips"] = Array.isArray(src["tips"]) ? src["tips"] : [];
    insert["difficulty_stars"] = Number(src["difficulty_stars"] ?? 3);
    insert["duration_min"] = Number(src["duration_min"] ?? 30);

    const { data: created, error: insertError } = await supabaseAdmin
      .from("workouts")
      .insert(insert as never)
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);
    return { ok: true as const, workoutId: (created as { id: string }).id };
  });
