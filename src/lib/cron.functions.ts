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
        listRuns(db, 40),
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
  .inputValidator((data: { key: string; force?: boolean }) => data)
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

        if (data.key !== "seo-refresh") {
          return { error: "Only the SEO update can be run on demand from here." };
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
