import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly scheduler (pg_cron → every hour at :05).
 * Runs every automated job in `src/lib/cron/registry.ts`:
 *  - the daily motivational message, at each athlete's chosen local hour
 *  - the Workout of the Day, at each athlete's chosen local hour
 *  - scheduled-workout and renewal reminders
 *  - the automatic SEO update, at the fixed time set in the Admin panel
 * Every job is idempotent and can be switched off in Admin → Cron jobs.
 */
export const Route = createFileRoute("/api/public/hooks/daily-run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Shared-secret auth. The publishable key is public, so it is NOT accepted here.
        const presented =
          request.headers.get("x-daily-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        let authorized = false;
        const envSecret = process.env["DAILY_RUN_SECRET"] ?? "";
        if (envSecret && presented === envSecret) authorized = true;
        if (!authorized && presented) {
          const { data: row } = await supabaseAdmin
            .from("app_settings")
            .select("value")
            .eq("key", "daily_run_token")
            .maybeSingle();
          const token = (row as { value?: { token?: string } } | null)?.value?.token ?? "";
          if (token && presented === token) authorized = true;
        }
        if (!authorized) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { localHour, localDateISO } = await import("@/lib/wod-cycle");
        const { DAILY_PROFILE_COLUMNS, runMotivationForUser, runWodForUser } = await import(
          "@/lib/daily.server"
        );
        type DailyProfile = import("@/lib/daily.server").DailyProfile;

        const db = supabaseAdmin as never as import("@supabase/supabase-js").SupabaseClient;

        const { getCronConfigs, isDueNow, markJobRan, motivationPool, recordRun } = await import(
          "@/lib/cron/jobs.server"
        );
        const jobs = await getCronConfigs(db);
        const motivationOn = jobs["daily-motivation"]?.enabled ?? true;
        const wodOn = jobs["wod-auto-delivery"]?.enabled ?? true;
        const scheduleOn = jobs["schedule-reminders"]?.enabled ?? true;
        const renewalsOn = jobs["renewal-reminders"]?.enabled ?? true;
        const pool = motivationPool(jobs["daily-motivation"]);

        const failures: string[] = [];
        let motivations = 0;
        let workouts = 0;
        let profiles: DailyProfile[] = [];

        if (motivationOn || wodOn) {
          const { data, error } = await db
            .from("profiles")
            .select(DAILY_PROFILE_COLUMNS)
            .or("notify_motivation.eq.true,auto_workout_enabled.eq.true")
            .limit(2000);
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          profiles = ((data as DailyProfile[] | null) ?? []).filter(Boolean);
        }

        for (const prof of profiles) {
          const tz = prof.timezone || "Europe/Athens";
          const hour = localHour(new Date(), tz);
          const today = localDateISO(new Date(), tz);

          try {
            if (motivationOn && prof.notify_motivation && hour === (prof.motivation_hour ?? 7)) {
              if (await runMotivationForUser(db, prof, pool)) motivations += 1;
            }
          } catch (e) {
            failures.push(`motivation:${prof.id}:${e instanceof Error ? e.message : "error"}`);
          }

          try {
            if (
              wodOn &&
              prof.auto_workout_enabled &&
              hour === (prof.auto_workout_hour ?? 7) &&
              prof.last_auto_workout_on !== today
            ) {
              const res = await runWodForUser(db, prof.id, prof);
              workouts += res.created;
            }
          } catch (e) {
            const message = e instanceof Error ? e.message : "error";
            failures.push(`wod:${prof.id}:${message}`);
            if (
              message.includes("Training Profile") ||
              message.includes("health and safety") ||
              message.includes("membership")
            ) {
              await db
                .from("profiles")
                .update({ wod_mode: false, auto_workout_enabled: false } as never)
                .eq("id", prof.id);
            }
          }
        }

        let renewalReminders = 0;
        if (renewalsOn) {
          try {
            const { runRenewalReminders } = await import("@/lib/billing-notify.server");
            renewalReminders = await runRenewalReminders(db);
          } catch (e) {
            failures.push(`renewals:${e instanceof Error ? e.message : "error"}`);
          }
        }

        let scheduleReminders = 0;
        if (scheduleOn) {
          try {
            const { runScheduleReminders } = await import("@/lib/schedule-notify.server");
            scheduleReminders = await runScheduleReminders(db);
          } catch (e) {
            failures.push(`schedule:${e instanceof Error ? e.message : "error"}`);
          }
        }

        // Automatic SEO update — fixed time, once a day, only when something changed.
        let seo: { status: string; summary: string } | null = null;
        const seoConfig = jobs["seo-refresh"];
        if (seoConfig && isDueNow(seoConfig)) {
          try {
            const { runSeoRefresh } = await import("@/lib/cron/seo-refresh.server");
            const result = await runSeoRefresh(db, { config: seoConfig, trigger: "schedule" });
            seo = { status: result.status, summary: result.summary };
            await recordRun(db, {
              jobKey: "seo-refresh",
              status: result.status,
              changed: result.changed,
              summary: result.summary,
              details: { added: result.added.slice(0, 200), failures: result.failures },
              trigger: "schedule",
            });
            if (result.status !== "failed") await markJobRan(db, "seo-refresh", seoConfig);
          } catch (e) {
            const message = e instanceof Error ? e.message : "error";
            failures.push(`seo:${message}`);
            await recordRun(db, {
              jobKey: "seo-refresh",
              status: "failed",
              summary: `SEO update crashed: ${message}`,
              trigger: "schedule",
            });
          }
        }

        // Nightly system health check — fixed time, once a day, always emailed.
        let health: { status: string; summary: string } | null = null;
        const healthConfig = jobs["health-check"];
        if (healthConfig && isDueNow(healthConfig)) {
          try {
            const { runHealthCheck } = await import("@/lib/cron/health-check.server");
            const report = await runHealthCheck(db, {
              config: healthConfig,
              trigger: "schedule",
            });
            health = { status: report.status, summary: report.summary };
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
              trigger: "schedule",
            });
            await markJobRan(db, "health-check", healthConfig);
          } catch (e) {
            const message = e instanceof Error ? e.message : "error";
            failures.push(`health:${message}`);
            await recordRun(db, {
              jobKey: "health-check",
              status: "failed",
              summary: `Health check crashed: ${message}`,
              trigger: "schedule",
            });
          }
        }

        // Any failure inside an automated job is a real problem — alert the admin.
        if (failures.length) {
          const { reportError } = await import("@/lib/errors/report.server");
          for (const f of failures.slice(0, 10)) {
            const [source, maybeUser, ...rest] = f.split(":");
            const looksLikeUser = /^[0-9a-f-]{36}$/i.test(maybeUser ?? "");
            await reportError({
              source: `job-${source}`,
              message: (looksLikeUser ? rest.join(":") : [maybeUser, ...rest].join(":")) || f,
              route: "/api/public/hooks/daily-run",
              userId: looksLikeUser ? (maybeUser as string) : null,
            });
          }
        }

        // One history row per hourly tick for the member-facing jobs.
        if (motivations || workouts || renewalReminders || scheduleReminders || failures.length) {
          await recordRun(db, {
            jobKey: "daily-motivation",
            status: failures.length ? "failed" : "ok",
            changed: motivations > 0,
            summary: `${motivations} motivation message(s), ${workouts} workout(s) built, ${scheduleReminders} schedule reminder(s), ${renewalReminders} renewal reminder(s).`,
            details: { failures: failures.slice(0, 50) },
          });
        }

        return Response.json({
          ok: true,
          scanned: profiles.length,
          motivations,
          workouts,
          renewalReminders,
          scheduleReminders,
          seo,
          health,
          failures,
        });
      },
    },
  },
});
