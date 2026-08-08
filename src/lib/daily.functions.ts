import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCycleDay, getDayIn84Cycle, localDateISO, starsForCycleDay } from "@/lib/wod-cycle";

export type DailySettings = {
  timezone: string;
  notify_motivation: boolean;
  motivation_hour: number;
  wod_mode: boolean;
  auto_workout_enabled: boolean;
  auto_workout_hour: number;
};

const DEFAULTS: DailySettings = {
  timezone: "Europe/Athens",
  notify_motivation: true,
  motivation_hour: 7,
  wod_mode: false,
  auto_workout_enabled: false,
  auto_workout_hour: 7,
};

function clampHour(h: unknown) {
  const n = Number(h);
  if (!Number.isFinite(n)) return 7;
  return Math.max(0, Math.min(23, Math.round(n)));
}

export const getDailyHub = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "timezone,notify_motivation,motivation_hour,wod_mode,auto_workout_enabled,auto_workout_hour",
      )
      .eq("id", userId)
      .maybeSingle();

    const settings: DailySettings = { ...DEFAULTS, ...((profile as Partial<DailySettings>) ?? {}) };
    const today = localDateISO(new Date(), settings.timezone);
    const cycleDay = getCycleDay(today);

    const { data: wod } = await supabase
      .from("workouts")
      .select("id,name,category,difficulty_stars,duration_min,status,completed_at")
      .eq("user_id", userId)
      .eq("is_wod", true)
      .eq("wod_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      settings,
      today,
      cycle: {
        dayIn84: getDayIn84Cycle(today),
        category: cycleDay.category,
        difficulty: cycleDay.difficulty,
        stars: starsForCycleDay(cycleDay),
        strengthFocus: cycleDay.strengthFocus ?? null,
        isRecovery: cycleDay.category === "RECOVERY",
      },
      workout: (wod as {
        id: string;
        name: string;
        category: string;
        difficulty_stars: number;
        duration_min: number;
        status: string;
      } | null) ?? null,
    };
  });

export const saveDailySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<DailySettings>) => input)
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (typeof data.timezone === "string") patch["timezone"] = data.timezone.slice(0, 64);
    if (typeof data.notify_motivation === "boolean")
      patch["notify_motivation"] = data.notify_motivation;
    if (data.motivation_hour !== undefined) patch["motivation_hour"] = clampHour(data.motivation_hour);
    if (typeof data.wod_mode === "boolean") patch["wod_mode"] = data.wod_mode;
    if (typeof data.auto_workout_enabled === "boolean")
      patch["auto_workout_enabled"] = data.auto_workout_enabled;
    if (data.auto_workout_hour !== undefined)
      patch["auto_workout_hour"] = clampHour(data.auto_workout_hour);
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await context.supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateTodayWod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { runWodForUser } = await import("@/lib/daily.server");
    return runWodForUser(supabase as never, userId);
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications")
      .select("id,kind,title,body,workout_id,read_at,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    const rows =
      (data as Array<{
        id: string;
        kind: string;
        title: string;
        body: string | null;
        workout_id: string | null;
        read_at: string | null;
        created_at: string;
      }> | null) ?? [];
    return { notifications: rows, unread: rows.filter((r) => !r.read_at).length };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() } as never)
      .eq("user_id", context.userId)
      .is("read_at", null);
    return { ok: true };
  });
