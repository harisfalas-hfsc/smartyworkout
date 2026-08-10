import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly scheduler.
 * - Posts the daily motivational message at each athlete's chosen local hour (default 07:00).
 * - Builds the Workout of the Day at each athlete's chosen local hour when auto-delivery is on.
 * Both are idempotent per local calendar day.
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

        const profiles = ((data as DailyProfile[] | null) ?? []).filter(Boolean);
        let motivations = 0;
        let workouts = 0;
        const failures: string[] = [];

        for (const prof of profiles) {
          const tz = prof.timezone || "Europe/Athens";
          const hour = localHour(new Date(), tz);
          const today = localDateISO(new Date(), tz);

          try {
            if (prof.notify_motivation && hour === (prof.motivation_hour ?? 7)) {
              if (await runMotivationForUser(db, prof)) motivations += 1;
            }
          } catch (e) {
            failures.push(`motivation:${prof.id}:${e instanceof Error ? e.message : "error"}`);
          }

          try {
            if (
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
        try {
          const { runRenewalReminders } = await import("@/lib/billing-notify.server");
          renewalReminders = await runRenewalReminders(db);
        } catch (e) {
          failures.push(`renewals:${e instanceof Error ? e.message : "error"}`);
        }

        return Response.json({
          ok: true,
          scanned: profiles.length,
          motivations,
          workouts,
          renewalReminders,
          failures,
        });

      },
    },
  },
});
