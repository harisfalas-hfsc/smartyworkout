import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDayIn84Cycle,
  localDateISO,
  starsForCycleDayWithLevel,
  type WodLevel,
} from "@/lib/wod-cycle";
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
  wod_level?: string | null;
};

export const DAILY_PROFILE_COLUMNS =
  "id,timezone,notify_motivation,motivation_hour,wod_mode,auto_workout_enabled,auto_workout_hour,last_motivation_on,last_auto_workout_on,preferred_equipment,preferred_environment,typical_duration_min,wod_level";

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

/** Strips bodyweight-only markers so the equipment version always uses real gear. */
function equipmentListFor(prof: DailyProfile | null): string[] {
  const list = (prof?.preferred_equipment ?? []).filter((e) => e && e !== "bodyweight");
  return list.length ? list : ["dumbbells"];
}

/**
 * Creates today's Workout of the Day for one athlete — two workouts on training days
 * (one bodyweight, one equipment-based) and one workout on recovery days.
 * Idempotent per local day and per variant.
 */
export async function runWodForUser(
  db: DB,
  userId: string,
  profile?: DailyProfile | null,
): Promise<{ id: string; ids: string[]; created: number; recovery: boolean }> {
  const { requireWorkoutAccess } = await import("@/lib/eligibility.server");
  await requireWorkoutAccess(db, userId);
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
  const { getWorkoutRules, resolveCycleDay } = await import("@/lib/settings.server");
  const rules = await getWorkoutRules();
  if (!rules.wodEnabled) {
    throw new Error("The Workout of the Day programme is paused right now.");
  }
  const cycleDay = await resolveCycleDay(today);
  const recovery = cycleDay.category === "RECOVERY";

  const { data: existingRows } = await db
    .from("workouts")
    .select("id,wod_variant")
    .eq("user_id", userId)
    .eq("is_wod", true)
    .eq("wod_date", today);
  const existing = (existingRows as { id: string; wod_variant: string | null }[] | null) ?? [];
  const byVariant = new Map(existing.map((r) => [r.wod_variant ?? "equipment", r.id]));

  const minutes = recovery ? 20 : Math.max(10, Math.min(90, prof?.typical_duration_min ?? 30));
  const stars = starsForCycleDayWithLevel(cycleDay, (prof?.wod_level as WodLevel) ?? "cycle");
  const variants: { key: string; equipment: string[] }[] = recovery
    ? [{ key: "recovery", equipment: ["bodyweight"] }]
    : [
        { key: "bodyweight", equipment: ["bodyweight"] },
        { key: "equipment", equipment: equipmentListFor(prof) },
      ];

  // Both variants are built at the same time — the athlete waits for one workout, not two.
  const results = await Promise.all(
    variants.map(async (variant): Promise<{ id: string; created: boolean }> => {
      const known = byVariant.get(variant.key);
      if (known) return { id: known, created: false };
      let built: { id: string; name: string; category: string };
      try {
        built = await createWorkoutForUser(db as never, userId, {
          minutes,
          mood: "normal",
          location: variant.key === "bodyweight" ? "home" : prof?.preferred_environment ?? "home",
          equipment: variant.equipment,
          wod: {
            category: cycleDay.category,
            stars,
            focus: cycleDay.strengthFocus ?? null,
            date: today,
            cycleDay: getDayIn84Cycle(today),
            variant: variant.key,
          },
        });
      } catch (e) {
        // A parallel request already claimed this variant (unique index) — reuse it.
        const { data: raced } = await db
          .from("workouts")
          .select("id")
          .eq("user_id", userId)
          .eq("is_wod", true)
          .eq("wod_date", today)
          .eq("wod_variant", variant.key)
          .maybeSingle();
        const racedId = (raced as { id: string } | null)?.id;
        if (racedId) return { id: racedId, created: false };
        throw e;
      }
      await db.from("notifications").insert({
        user_id: userId,
        kind: "wod",
        title:
          variant.key === "bodyweight"
            ? "Your bodyweight Workout of the Day is ready"
            : "Your equipment Workout of the Day is ready",
        body: `${built.category} — ${built.name}`,
        workout_id: built.id,
      } as never);
      return { id: built.id, created: true };
    }),
  );

  const ids = results.map((r) => r.id);
  const created = results.filter((r) => r.created).length;



  if (created) {
    await db
      .from("profiles")
      .update({ last_auto_workout_on: today } as never)
      .eq("id", userId);
  }

  return { id: ids[0] as string, ids, created, recovery };
}


/** Posts the daily motivational message for one athlete (idempotent per local day). */
export async function runMotivationForUser(
  db: DB,
  prof: DailyProfile,
  pool?: string[],
): Promise<boolean> {
  const timeZone = prof.timezone || "Europe/Athens";
  const today = localDateISO(new Date(), timeZone);
  if (prof.last_motivation_on === today) return false;
  const streak = await completedStreak(db, prof.id, timeZone);
  const msg = motivationFor(`${prof.id}:${today}`, streak, pool);
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
