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

export const rateWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workoutId: string; value: number }) => input)
  .handler(async ({ context, data }) => {
    await requirePremium(context as never);
    const value = Math.round(data.value);
    if (value === 0) {
      const { error } = await context.supabase
        .from("community_ratings")
        .delete()
        .eq("workout_id", data.workoutId)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
      return { ok: true as const, value: 0 };
    }
    if (value < 1 || value > 5) throw new Error("Rate between 1 and 5 stars.");
    const { error } = await context.supabase.from("community_ratings").upsert(
      {
        workout_id: data.workoutId,
        user_id: context.userId,
        value,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "workout_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const, value };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workoutId: string; body: string }) => input)
  .handler(async ({ context, data }) => {
    await requirePremium(context as never);
    const { COMMENT_MAX } = await import("@/lib/community");
    const body = data.body.trim().slice(0, COMMENT_MAX);

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
    const { notifyAdmins } = await import("@/lib/admin-alert.server");
    await notifyAdmins({
      kind: "Community report",
      title: `New ${data.targetType} report`,
      details: `Reported ${data.targetType} ${data.targetId}\nReason: ${data.reason?.slice(0, 500) || "(none given)"}`,
      link: "https://smartyworkout.com/admin",
      dedupeKey: `report-${data.targetType}-${data.targetId}-${context.userId}`,
    });
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
    const [{ data: reaction }, { data: mine }, { data: rating }, { data: creator }] = await Promise.all([
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
      supabaseAdmin
        .from("community_ratings")
        .select("value")
        .eq("workout_id", data.workoutId)
        .eq("user_id", context.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("id,display_name,avatar_url")
        .eq("id", (row as { user_id: string }).user_id)
        .maybeSingle(),
    ]);
    return {
      workout: row as unknown as SharedWorkoutFull,
      myReaction: ((reaction as { value?: number } | null)?.value ?? 0) as 1 | -1 | 0,
      myCopy: (mine as { id: string; status: string } | null) ?? null,
      myRating: Number((rating as { value?: number } | null)?.value ?? 0),
      creator: (creator as { id: string; display_name: string | null; avatar_url: string | null } | null) ?? null,
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

async function assertAdmin(ctx: { userId: string; claims: any }) {
  const { isAdminEmail } = await import("@/lib/admin.server");
  if (isAdminEmail(ctx.claims?.email as string | undefined)) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin access required");
}

export type AdminReportRow = {
  id: string;
  target_type: "workout" | "comment";
  target_id: string;
  reason: string | null;
  status: string;
  created_at: string;
  reporter_name: string | null;
  preview: string | null;
};

export const adminListReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ reports: AdminReportRow[] }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("community_reports")
      .select("id,target_type,target_id,reason,status,created_at,reporter_id")
      .order("created_at", { ascending: false })
      .limit(300);
    const rows = (data ?? []) as {
      id: string;
      target_type: "workout" | "comment";
      target_id: string;
      reason: string | null;
      status: string;
      created_at: string;
      reporter_id: string;
    }[];
    const reporterIds = Array.from(new Set(rows.map((r) => r.reporter_id)));
    const workoutIds = rows.filter((r) => r.target_type === "workout").map((r) => r.target_id);
    const commentIds = rows.filter((r) => r.target_type === "comment").map((r) => r.target_id);
    const [{ data: profiles }, { data: workouts }, { data: comments }] = await Promise.all([
      reporterIds.length
        ? supabaseAdmin.from("profiles").select("id,display_name").in("id", reporterIds)
        : Promise.resolve({ data: [] as never[] }),
      workoutIds.length
        ? supabaseAdmin.from("workouts").select("id,name").in("id", workoutIds)
        : Promise.resolve({ data: [] as never[] }),
      commentIds.length
        ? supabaseAdmin.from("community_comments").select("id,body").in("id", commentIds)
        : Promise.resolve({ data: [] as never[] }),
    ]);
    const nameById = new Map(
      ((profiles ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name]),
    );
    const previewById = new Map<string, string>();
    for (const w of (workouts ?? []) as { id: string; name: string }[]) previewById.set(w.id, w.name);
    for (const c of (comments ?? []) as { id: string; body: string }[]) previewById.set(c.id, c.body);
    return {
      reports: rows.map((r) => ({
        id: r.id,
        target_type: r.target_type,
        target_id: r.target_id,
        reason: r.reason,
        status: r.status,
        created_at: r.created_at,
        reporter_name: nameById.get(r.reporter_id) ?? null,
        preview: previewById.get(r.target_id) ?? null,
      })),
    };
  });

export const adminResolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string; action: "dismiss" | "remove" }) => input)
  .handler(async ({ context, data }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: report } = await supabaseAdmin
      .from("community_reports")
      .select("target_type,target_id")
      .eq("id", data.reportId)
      .maybeSingle();
    const target = report as { target_type: "workout" | "comment"; target_id: string } | null;
    if (data.action === "remove" && target) {
      if (target.target_type === "comment") {
        await supabaseAdmin
          .from("community_comments")
          .update({ deleted_at: new Date().toISOString() } as never)
          .eq("id", target.target_id);
      } else {
        await supabaseAdmin
          .from("workouts")
          .update({ is_shared: false, shared_at: null } as never)
          .eq("id", target.target_id);
      }
    }
    await supabaseAdmin
      .from("community_reports")
      .update({ status: data.action === "remove" ? "removed" : "dismissed" } as never)
      .eq("id", data.reportId);
    return { ok: true as const };
  });
