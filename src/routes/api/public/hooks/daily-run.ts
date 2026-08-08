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
        const apiKey =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";
        if (!expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
              if (res.created) workouts += 1;
            }
          } catch (e) {
            failures.push(`wod:${prof.id}:${e instanceof Error ? e.message : "error"}`);
          }
        }

        return Response.json({
          ok: true,
          scanned: profiles.length,
          motivations,
          workouts,
          failures,
        });
      },
    },
  },
});
