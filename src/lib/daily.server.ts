import type { SupabaseClient } from "@supabase/supabase-js";
import { getCycleDay, getDayIn84Cycle, localDateISO, starsForCycleDay } from "@/lib/wod-cycle";
import { motivationFor } from "@/lib/motivation";
import { createWorkoutForUser } from "@/lib/workout/create.server";

type DB = SupabaseClient;

export type DailyProfile = {
  id: string;
  timezone: string | null;
  notify_motivation: boolean | null;
  motivation_hour: number | null;
  wod_mode: boolean | null;
  auto_workout_enabled: boolean | null;
  auto_workout_hour: number | null;
  last_motivation_on: string | null;
  last_auto_workout_on: string | null;
  preferred_equipment: string[] | null;
  preferred_environment: string | null;
  typical_duration_min: number | null;
};

export const DAILY_PROFILE_COLUMNS =
  "id,timezone,notify_motivation,motivation_hour,wod_mode,auto_workout_enabled,auto_workout_hour,last_motivation_on,last_auto_workout_on,preferred_equipment,preferred_environment,typical_duration_min";

async function completedStreak(db: DB, userId: string, timeZone: string): Promise<number> {
  const { data } = await db
    .from("workouts")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(90);
  const days = new Set(
    ((data as { completed_at: string }[] | null) ?? []).map((r) =>
      localDateISO(new Date(r.completed_at), timeZone),
    ),
  );
  let streak = 0;
  const cursor = new Date();
  // Allow today to be missing without breaking a streak built up to yesterday.
  if (!days.has(localDateISO(cursor, timeZone))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(localDateISO(cursor, timeZone))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** Creates today's Workout of the Day for one athlete (idempotent per local day). */
export async function runWodForUser(
  db: DB,
  userId: string,
  profile?: DailyProfile | null,
): Promise<{ id: string; created: boolean; recovery?: boolean }> {
  let prof = profile ?? null;
  if (!prof) {
    const { data } = await db
      .from("profiles")
      .select(DAILY_PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    prof = (data as DailyProfile | null) ?? null;
  }
  const timeZone = prof?.timezone || "Europe/Athens";
  const today = localDateISO(new Date(), timeZone);
  const cycleDay = getCycleDay(today);

  const { data: existing } = await db
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .eq("is_wod", true)
    .eq("wod_date", today)
    .limit(1)
    .maybeSingle();
  if (existing) return { id: (existing as { id: string }).id, created: false };

  const minutes =
    cycleDay.category === "RECOVERY" ? 20 : Math.max(10, Math.min(90, prof?.typical_duration_min ?? 30));

  const built = await createWorkoutForUser(db as never, userId, {
    minutes,
    mood: "normal",
    location: prof?.preferred_environment ?? "home",
    equipment: prof?.preferred_equipment?.length ? prof.preferred_equipment : ["bodyweight"],
    wod: {
      category: cycleDay.category,
      stars: starsForCycleDay(cycleDay),
      focus: cycleDay.strengthFocus ?? null,
      date: today,
      cycleDay: getDayIn84Cycle(today),
    },
  });

  await db.from("notifications").insert({
    user_id: userId,
    kind: "wod",
    title: "Your Workout of the Day is ready",
    body: `${built.category} — ${built.name}`,
    workout_id: built.id,
  } as never);

  await db
    .from("profiles")
    .update({ last_auto_workout_on: today } as never)
    .eq("id", userId);

  return { id: built.id, created: true, recovery: cycleDay.category === "RECOVERY" };
}

/** Posts the daily motivational message for one athlete (idempotent per local day). */
export async function runMotivationForUser(db: DB, prof: DailyProfile): Promise<boolean> {
  const timeZone = prof.timezone || "Europe/Athens";
  const today = localDateISO(new Date(), timeZone);
  if (prof.last_motivation_on === today) return false;
  const streak = await completedStreak(db, prof.id, timeZone);
  const msg = motivationFor(`${prof.id}:${today}`, streak);
  await db.from("notifications").insert({
    user_id: prof.id,
    kind: "motivation",
    title: msg.title,
    body: msg.body,
  } as never);
  await db
    .from("profiles")
    .update({ last_motivation_on: today } as never)
    .eq("id", prof.id);
  return true;
}
