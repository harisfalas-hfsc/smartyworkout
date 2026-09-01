import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { userId: string; claims: any }) {
  const { isAdminEmail } = await import("@/lib/admin.server");
  const email = ctx.claims?.email as string | undefined;
  if (isAdminEmail(email)) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Error("Forbidden: admin access required");
}

export type GenerationFailureRow = {
  id: string;
  user_id: string | null;
  user_email: string;
  user_name: string;
  session_id: string | null;
  stage: string;
  reason: string;
  failure_kind: string;
  refinement_text: string | null;
  email_status: string | null;
  email_error: string | null;
  email_message_id: string | null;
  email_recipient: string | null;
  email_dispatched_at: string | null;
  occurred_at: string;
  read_at: string | null;
  session_status: string | null;
  attempt_count: number | null;
  next_retry_at: string | null;
  workout_id: string | null;
};

export const adminListGenerationFailures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { limit?: number }) => ({ limit: Math.min(200, data?.limit ?? 100) }))
  .handler(async ({ context, data }): Promise<{ failures: GenerationFailureRow[] } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("workout_generation_failures")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(data.limit);
      if (error) return { error: error.message };
      const list = (rows ?? []) as any[];

      const userIds = [...new Set(list.map((r) => r.user_id).filter(Boolean))] as string[];
      const sessionIds = [...new Set(list.map((r) => r.session_id).filter(Boolean))] as string[];

      const profiles = new Map<string, { email: string; name: string }>();
      if (userIds.length) {
        const { data: ps } = await supabaseAdmin
          .from("profiles")
          .select("id,email,display_name")
          .in("id", userIds);
        for (const p of (ps ?? []) as any[]) {
          profiles.set(p.id, { email: p.email ?? "", name: p.display_name ?? "" });
        }
      }
      const sessions = new Map<string, any>();
      if (sessionIds.length) {
        const { data: ss } = await supabaseAdmin
          .from("workout_generation_requests")
          .select("id,status,attempt_count,next_retry_at,workout_id")
          .in("id", sessionIds);
        for (const s of (ss ?? []) as any[]) sessions.set(s.id, s);
      }

      return {
        failures: list.map((r) => {
          const p = r.user_id ? profiles.get(r.user_id) : undefined;
          const s = r.session_id ? sessions.get(r.session_id) : undefined;
          return {
            ...r,
            user_email: p?.email ?? "",
            user_name: p?.name ?? "",
            session_status: s?.status ?? null,
            attempt_count: s?.attempt_count ?? null,
            next_retry_at: s?.next_retry_at ?? null,
            workout_id: s?.workout_id ?? null,
          } as GenerationFailureRow;
        }),
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to load generation failures" };
    }
  });

export const adminMarkGenerationFailureRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ context, data }) => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("workout_generation_failures")
        .update({ read_at: new Date().toISOString() } as never)
        .eq("id", data.id);
      if (error) return { error: error.message };
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const adminSendTestFailureEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      await assertAdmin(context as any);
      const { sendTestFailureAlert } = await import("@/lib/workout-generation.server");
      const res = await sendTestFailureAlert(context.userId);
      return { ok: true, recipients: res.email_recipient, status: res.email_status };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const adminRunGenerationRecovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      await assertAdmin(context as any);
      const { retryPendingGenerations, sweepAbandonedGenerations } = await import(
        "@/lib/workout-generation.server"
      );
      const retried = await retryPendingGenerations(10);
      const swept = await sweepAbandonedGenerations(25);
      return { ok: true, ...retried, ...swept };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });
