import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  difficultyLabelWithLevel,
  getDayIn84Cycle,
  localDateISO,
  starsForCycleDayWithLevel,
  type WodLevel,
} from "@/lib/wod-cycle";

export type DailySettings = {
  timezone: string;
  notify_motivation: boolean;
  motivation_hour: number;
  wod_mode: boolean;
  auto_workout_enabled: boolean;
  auto_workout_hour: number;
  wod_level: WodLevel;
};

const DEFAULTS: DailySettings = {
  timezone: "Europe/Athens",
  notify_motivation: true,
  motivation_hour: 7,
  wod_mode: false,
  auto_workout_enabled: false,
  auto_workout_hour: 7,
  wod_level: "cycle",
};

function clampHour(h: unknown) {
  const n = Number(h);
  if (!Number.isFinite(n)) return 7;
  return Math.max(0, Math.min(23, Math.round(n)));
}

/** Public 3-day cycle preview (yesterday / today / tomorrow) with admin overrides applied. */
export const getPublicWodDays = createServerFn({ method: "GET" }).handler(async () => {
  const { resolveCycleDay } = await import("@/lib/settings.server");
  const today = localDateISO(new Date());
  const shift = (days: number) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const info = async (iso: string) => {
    const c = await resolveCycleDay(iso);
    return {
      date: iso,
      category: c.category as string,
      difficulty: (c.difficulty ?? "Recovery") as string,
      stars: starsForCycleDayWithLevel(c, "cycle"),
      focus: (c.strengthFocus ?? null) as string | null,
      isRecovery: c.category === "RECOVERY",
    };
  };
  const [yesterday, todayInfo, tomorrow] = await Promise.all([
    info(shift(-1)),
    info(today),
    info(shift(1)),
  ]);
  return { yesterday, today: todayInfo, tomorrow };
});

export const getDailyHub = createServerFn({ method: "GET" })

  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, accessModule] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "timezone,notify_motivation,motivation_hour,wod_mode,auto_workout_enabled,auto_workout_hour,wod_level,wod_renews_at",
        )
        .eq("id", userId)
        .maybeSingle(),
      import("@/lib/eligibility.server"),
    ]);
    const access = await accessModule.getAccessStateForUser(supabase as never, userId);

    const row = (profile as (Partial<DailySettings> & { wod_renews_at?: string | null }) | null) ?? null;
    const settings: DailySettings = { ...DEFAULTS, ...(row ?? {}) };
    settings.wod_level = (settings.wod_level ?? "cycle") as WodLevel;
    const today = localDateISO(new Date(), settings.timezone);
    const { resolveCycleDay } = await import("@/lib/settings.server");
    const cycleDay = await resolveCycleDay(today);

    const shift = (days: number) => {
      const d = new Date(`${today}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    const dayInfo = async (iso: string) => {
      const c = await resolveCycleDay(iso);
      return {
        date: iso,
        category: c.category,
        difficulty: difficultyLabelWithLevel(c, settings.wod_level),
        stars: starsForCycleDayWithLevel(c, settings.wod_level),
        focus: c.strengthFocus ?? null,
        isRecovery: c.category === "RECOVERY",
      };
    };

    const { data: wods } = await supabase
      .from("workouts")
      .select("id,name,category,difficulty_stars,duration_min,status,completed_at,wod_variant")
      .eq("user_id", userId)
      .eq("is_wod", true)
      .eq("wod_date", today)
      .order("created_at", { ascending: true });

    const workouts =
      (wods as Array<{
        id: string;
        name: string;
        category: string;
        difficulty_stars: number;
        duration_min: number;
        status: string;
        wod_variant: string | null;
      }> | null) ?? [];

    return {
      settings,
      access,
      today,
      renewsAt: row?.wod_renews_at ?? null,
      cycle: {
        dayIn84: getDayIn84Cycle(today),
        category: cycleDay.category,
        difficulty: difficultyLabelWithLevel(cycleDay, settings.wod_level),
        stars: starsForCycleDayWithLevel(cycleDay, settings.wod_level),
        strengthFocus: cycleDay.strengthFocus ?? null,
        isRecovery: cycleDay.category === "RECOVERY",
      },
      days: {
        yesterday: await dayInfo(shift(-1)),
        today: await dayInfo(today),
        tomorrow: await dayInfo(shift(1)),
      },
      workouts,
      workout: workouts[0] ?? null,
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
    // WOD membership can only change through setWodSubscription, where eligibility is enforced.
    if (typeof data.auto_workout_enabled === "boolean")
      patch["auto_workout_enabled"] = data.auto_workout_enabled;
    if (data.auto_workout_hour !== undefined)
      patch["auto_workout_hour"] = clampHour(data.auto_workout_hour);
    if (typeof data.wod_level === "string" &&
      ["cycle", "beginner", "intermediate", "advanced"].includes(data.wod_level))
      patch["wod_level"] = data.wod_level;
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
      // Admin-only alerts (reports, inbound support) belong in the Admin panel,
      // never in the member's personal inbox — even when the member is an admin.
      .not("kind", "in", "(admin,support)")
      .order("created_at", { ascending: false })
      .limit(100);
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
      .not("kind", "in", "(admin,support)")
      .is("read_at", null);
    return { ok: true };
  });

/** Marks a specific set of notifications read or unread. */
export const setNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[]; read: boolean }) => input)
  .handler(async ({ data, context }) => {
    if (!data.ids.length) return { ok: true };
    await context.supabase
      .from("notifications")
      .update({ read_at: data.read ? new Date().toISOString() : null } as never)
      .eq("user_id", context.userId)
      .in("id", data.ids);
    return { ok: true };
  });

/** Permanently deletes the given notifications. */
export const deleteNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => input)
  .handler(async ({ data, context }) => {
    if (!data.ids.length) return { ok: true };
    await context.supabase
      .from("notifications")
      .delete()
      .eq("user_id", context.userId)
      .in("id", data.ids);
    return { ok: true };
  });


/** Joins or leaves the Workout of the Day programme. Joining builds today's workouts at once. */
export const setWodSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subscribe: boolean; level?: WodLevel }) => input)
  .handler(async ({ data, context }) => {
    if (data.subscribe) {
      const { requireWorkoutAccess } = await import("@/lib/eligibility.server");
      await requireWorkoutAccess(context.supabase as never, context.userId);
    }
    const now = new Date();
    const renews = new Date(now);
    renews.setUTCMonth(renews.getUTCMonth() + 1);
    const patch: Record<string, unknown> = data.subscribe
      ? {
          wod_mode: true,
          auto_workout_enabled: true,
          auto_workout_hour: 0,
          wod_subscribed_at: now.toISOString(),
          wod_renews_at: renews.toISOString(),
          wod_level: "cycle",
        }
      : { wod_mode: false, auto_workout_enabled: false, wod_renews_at: null };
    const { error } = await context.supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    // Subscribing returns immediately; today's pair is built by a follow-up
    // call (generateTodayWod) so the athlete never waits on the AI here.
    return { ok: true, subscribed: data.subscribe, created: 0 };
  });


