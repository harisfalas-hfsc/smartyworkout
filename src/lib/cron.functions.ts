import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CRON_JOBS, type CronJobDefinition } from "@/lib/cron/registry";
import type { CronJobConfig, CronRunRow } from "@/lib/cron/jobs.server";

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

export interface CronOverview {
  definitions: CronJobDefinition[];
  configs: Record<string, CronJobConfig>;
  runs: CronRunRow[];
  index: { total: number; generated_at: string | null; exercises: number; workouts: number } | null;
}

export const adminGetCronJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CronOverview | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as never as import("@supabase/supabase-js").SupabaseClient;
      const { getCronConfigs, listRuns } = await import("@/lib/cron/jobs.server");
      const { readKeywordIndex } = await import("@/lib/seo/keyword-index.server");
      const [configs, runs, index] = await Promise.all([
        getCronConfigs(db),
        listRuns(db, 200),
        readKeywordIndex(),
      ]);
      return {
        definitions: CRON_JOBS,
        configs,
        runs,
        index: index
          ? {
              total: index.total,
              generated_at: index.generated_at,
              exercises: index.counts?.exercises ?? 0,
              workouts: index.counts?.workouts ?? 0,
            }
          : null,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to load cron jobs" };
    }
  });

export const adminSaveCronJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      key: string;
      enabled?: boolean;
      hour?: number;
      minute?: number;
      content?: import('@/lib/cron/jobs.server').CronContent;
    }) => data,
  )
  .handler(async ({ context, data }): Promise<{ config: CronJobConfig } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as never as import("@supabase/supabase-js").SupabaseClient;
      const { saveCronConfig } = await import("@/lib/cron/jobs.server");
      const config = await saveCronConfig(db, data.key, {
        ...(data.enabled === undefined ? {} : { enabled: data.enabled }),
        ...(data.hour === undefined ? {} : { hour: data.hour }),
        ...(data.minute === undefined ? {} : { minute: data.minute }),
        ...(data.content === undefined ? {} : { content: data.content }),
      });
      return { config };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to save job" };
    }
  });

export const adminRunCronJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      key: string;
      force?: boolean;
      brief?: { titleKeywords?: string; topicKeywords?: string };
    }) => data,
  )
  .handler(
    async ({
      context,
      data,
    }): Promise<{ status: string; summary: string; emailed?: boolean } | { error: string }> => {
      try {
        await assertAdmin(context as any);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as never as import("@supabase/supabase-js").SupabaseClient;
        const { getCronConfig, recordRun, markJobRan } = await import("@/lib/cron/jobs.server");

        if (data.key === "health-check") {
          const config = await getCronConfig(db, "health-check");
          const { runHealthCheck } = await import("@/lib/cron/health-check.server");
          const report = await runHealthCheck(db, { config, trigger: "manual" });
          await recordRun(db, {
            jobKey: "health-check",
            status: report.status === "ok" ? "ok" : "failed",
            changed: report.failed > 0,
            summary: report.summary,
            details: {
              failures: report.items
                .filter((i) => i.status !== "pass")
                .map((i) => `${i.label}: ${i.detail}`)
                .slice(0, 50),
            },
            trigger: "manual",
          });
          return { status: report.status, summary: report.summary, emailed: report.emailed };
        }

        if (data.key === "generate-weekly-blog-article") {
          const config = await getCronConfig(db, "generate-weekly-blog-article");
          const { runWeeklyBlogArticle } = await import("@/lib/cron/blog-generator.server");
          const result = await runWeeklyBlogArticle(db, {
            config,
            trigger: "manual",
            force: data.force ?? false,
            ...(data.brief ? { brief: data.brief } : {}),
          });
          await recordRun(db, {
            jobKey: "generate-weekly-blog-article",
            status: result.status,
            changed: result.changed,
            summary: result.summary,
            details: { failures: result.failures },
            trigger: "manual",
          });
          if (result.status === "ok")
            await markJobRan(db, "generate-weekly-blog-article", config);
          return { status: result.status, summary: result.summary };
        }

        if (data.key !== "seo-refresh") {
          return { error: "This job cannot be run on demand." };
        }

        const config = await getCronConfig(db, "seo-refresh");
        const { runSeoRefresh } = await import("@/lib/cron/seo-refresh.server");
        const result = await runSeoRefresh(db, {
          config,
          trigger: "manual",
          force: data.force ?? false,
        });
        await recordRun(db, {
          jobKey: "seo-refresh",
          status: result.status,
          changed: result.changed,
          summary: result.summary,
          details: { added: result.added.slice(0, 200), failures: result.failures },
          trigger: "manual",
        });
        if (result.status !== "failed") await markJobRan(db, "seo-refresh", config);
        return { status: result.status, summary: result.summary, emailed: result.emailed };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to run job" };
      }
    },
  );

export interface ErrorEventRow {
  id: string;
  kind: string;
  severity: string;
  message: string;
  source: string | null;
  route: string | null;
  user_email: string | null;
  occurrences: number;
  created_at: string;
  resolved_at: string | null;
}

export const adminListErrors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ errors: ErrorEventRow[] } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("error_events")
        .select("id,kind,severity,message,source,route,user_email,occurrences,created_at,resolved_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return { error: error.message };
      return { errors: (data as ErrorEventRow[] | null) ?? [] };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to load problems" };
    }
  });

export const adminResolveError = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ context, data }): Promise<{ ok: true } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("error_events")
        .update({ resolved_at: new Date().toISOString() } as never)
        .eq("id", data.id);
      if (error) return { error: error.message };
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to update" };
    }
  });
