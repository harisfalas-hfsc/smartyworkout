import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BadgeDef, EarnedBadge, ProgressStats } from "@/lib/progress.server";

export type { BadgeDef, EarnedBadge, ProgressStats };

export type ProgressOverview = {
  stats: ProgressStats;
  rank: number;
  totalRanked: number;
  badges: EarnedBadge[];
  definitions: BadgeDef[];
  newlyEarned: { id: string; name: string }[];
};

export const getProgressOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProgressOverview> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recomputeProgress, rankFor } = await import("@/lib/progress.server");
    const userId = context.userId;
    const { stats, definitions, newlyEarned } = await recomputeProgress(supabaseAdmin, userId);
    const [{ rank, total }, { data: badges }] = await Promise.all([
      rankFor(supabaseAdmin, userId, stats),
      supabaseAdmin
        .from("user_badges")
        .select("badge_id,badge_name,category,threshold,points,earned_at")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false }),
    ]);
    return {
      stats,
      rank,
      totalRanked: total,
      badges: (badges ?? []) as EarnedBadge[],
      definitions,
      newlyEarned: newlyEarned.map((d) => ({ id: d.id, name: d.name })),
    };
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

export const adminListBadgeDefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ definitions: BadgeDef[] }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("badge_definitions")
      .select("*")
      .order("sort_order");
    return { definitions: (data ?? []) as BadgeDef[] };
  });

export const adminSaveBadgeDef = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<BadgeDef> & { id: string }) => input)
  .handler(async ({ context, data }): Promise<{ ok: true } | { error: string }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      id: data.id,
      category: data.category ?? "completed",
      name: data.name ?? data.id,
      description: data.description ?? "",
      threshold: Number(data.threshold ?? 0),
      icon: data.icon ?? "trophy",
      points: Number(data.points ?? 25),
      sort_order: Number(data.sort_order ?? 0),
      is_active: data.is_active ?? true,
    };
    const { error } = await supabaseAdmin
      .from("badge_definitions")
      .upsert(row as never, { onConflict: "id" });
    return error ? { error: error.message } : { ok: true };
  });

export type AdminUserProgress = ProgressOverview & { email: string | null };

export const adminGetUserProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ context, data }): Promise<AdminUserProgress | { error: string }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recomputeProgress, rankFor } = await import("@/lib/progress.server");
    try {
      const { stats, definitions } = await recomputeProgress(supabaseAdmin, data.userId);
      const [{ rank, total }, { data: badges }, userRes] = await Promise.all([
        rankFor(supabaseAdmin, data.userId, stats),
        supabaseAdmin
          .from("user_badges")
          .select("badge_id,badge_name,category,threshold,points,earned_at")
          .eq("user_id", data.userId)
          .order("earned_at", { ascending: false }),
        supabaseAdmin.auth.admin.getUserById(data.userId),
      ]);
      return {
        stats,
        rank,
        totalRanked: total,
        badges: (badges ?? []) as EarnedBadge[],
        definitions,
        newlyEarned: [],
        email: userRes.data.user?.email ?? null,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });
