import type { SupabaseClient } from "@supabase/supabase-js";
import { localDateISO } from "@/lib/wod-cycle";
import { scoreFor } from "@/lib/progress-config";

export type BadgeDef = {
  id: string;
  category: string;
  name: string;
  description: string;
  threshold: number;
  icon: string;
  points: number;
  sort_order: number;
  is_active: boolean;
};

export type EarnedBadge = {
  badge_id: string;
  badge_name: string;
  category: string;
  threshold: number;
  points: number;
  earned_at: string;
};

export type ProgressStats = {
  score: number;
  workouts_generated: number;
  workouts_completed: number;
  active_days: number;
  current_streak: number;
  longest_streak: number;
  subscription_months: number;
  badge_points: number;
};

function addDaysISO(iso: string, delta: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Current + longest streak from the set of local calendar days with a completed workout. */
export function streaksFromDays(days: Set<string>, todayISO: string) {
  const sorted = Array.from(days).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDaysISO(prev, 1) === d ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }
  let current = 0;
  let cursor = days.has(todayISO) ? todayISO : addDaysISO(todayISO, -1);
  while (days.has(cursor)) {
    current += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return { current, longest };
}

/** Whole months of active membership derived from subscription records. */
export function subscriptionMonths(
  subs: { created_at: string; current_period_end: string | null; status: string }[],
  now: Date,
) {
  if (!subs.length) return 0;
  const starts = subs.map((s) => new Date(s.created_at).getTime());
  const start = Math.min(...starts);
  const ends = subs
    .map((s) => (s.current_period_end ? new Date(s.current_period_end).getTime() : 0))
    .filter(Boolean);
  const end = Math.min(now.getTime(), ends.length ? Math.max(...ends) : now.getTime());
  if (end <= start) return 0;
  return Math.max(0, Math.floor((end - start) / (30.4375 * 86400000)));
}

/**
 * Recomputes a member's progress from trusted workout/subscription records,
 * awards any newly earned badges and persists the result. Fully idempotent.
 */
export async function recomputeProgress(admin: SupabaseClient, userId: string) {
  const [{ data: profile }, { data: workouts }, { data: subs }, { data: defs }, { data: owned }] =
    await Promise.all([
      admin.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
      admin
        .from("workouts")
        .select("id,status,completed_at,created_at")
        .eq("user_id", userId)
        .limit(20000),
      admin
        .from("subscriptions")
        .select("created_at,current_period_end,status")
        .eq("user_id", userId),
      admin.from("badge_definitions").select("*").eq("is_active", true).order("sort_order"),
      admin.from("user_badges").select("badge_id").eq("user_id", userId),
    ]);

  const tz = ((profile as { timezone?: string | null } | null)?.timezone || "Europe/Athens") as string;
  const rows = (workouts ?? []) as { id: string; status: string; completed_at: string | null; created_at: string }[];
  const now = new Date();
  const todayISO = localDateISO(now, tz);

  const generated = rows.length;
  const completedRows = rows.filter((r) => r.status === "completed");
  const completed = completedRows.length;
  const days = new Set(
    completedRows.map((r) => localDateISO(new Date(r.completed_at ?? r.created_at), tz)),
  );
  const { current, longest: longestNow } = streaksFromDays(days, todayISO);
  const months = subscriptionMonths(
    (subs ?? []) as { created_at: string; current_period_end: string | null; status: string }[],
    now,
  );

  const { data: existing } = await admin
    .from("user_progress")
    .select("longest_streak,score")
    .eq("user_id", userId)
    .maybeSingle();
  const prev = existing as { longest_streak: number; score: number } | null;
  const longest = Math.max(longestNow, prev?.longest_streak ?? 0);

  const definitions = ((defs ?? []) as BadgeDef[]).filter((d) => d.is_active);
  const ownedIds = new Set(((owned ?? []) as { badge_id: string }[]).map((b) => b.badge_id));
  const valueFor = (category: string) =>
    category === "subscription"
      ? months
      : category === "generated"
        ? generated
        : category === "completed"
          ? completed
          : longest;

  const newlyEarned: BadgeDef[] = definitions.filter(
    (d) => !ownedIds.has(d.id) && valueFor(d.category) >= d.threshold,
  );

  if (newlyEarned.length) {
    await admin.from("user_badges").upsert(
      newlyEarned.map((d) => ({
        user_id: userId,
        badge_id: d.id,
        badge_name: d.name,
        category: d.category,
        threshold: d.threshold,
        points: d.points,
      })) as never,
      { onConflict: "user_id,badge_id", ignoreDuplicates: true },
    );
    await admin.from("notifications").upsert(
      newlyEarned.map((d) => ({
        user_id: userId,
        kind: "badge",
        title: `Badge unlocked — ${d.name}`,
        body: "Your Smarty Progress Score has increased.",
        dedupe_key: `badge:${d.id}`,
      })) as never,
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
    );
  }

  const { data: allBadges } = await admin
    .from("user_badges")
    .select("points")
    .eq("user_id", userId);
  const badgePoints = ((allBadges ?? []) as { points: number }[]).reduce(
    (s, b) => s + (b.points || 0),
    0,
  );

  const score = scoreFor({
    completed,
    generated,
    activeDays: days.size,
    subscriptionMonths: months,
    badgePoints,
  });

  const patch: Record<string, unknown> = {
    user_id: userId,
    score,
    workouts_generated: generated,
    workouts_completed: completed,
    active_days: days.size,
    current_streak: current,
    longest_streak: longest,
    subscription_months: months,
    badge_points: badgePoints,
  };
  if (!prev || prev.score !== score) patch["score_reached_at"] = now.toISOString();

  await admin.from("user_progress").upsert(patch as never, { onConflict: "user_id" });

  const stats: ProgressStats = {
    score,
    workouts_generated: generated,
    workouts_completed: completed,
    active_days: days.size,
    current_streak: current,
    longest_streak: longest,
    subscription_months: months,
    badge_points: badgePoints,
  };
  return { stats, definitions, newlyEarned };
}

/** Deterministic rank: score desc, completed desc, longest streak desc, earliest score time. */
export async function rankFor(admin: SupabaseClient, userId: string, stats: ProgressStats) {
  const { data } = await admin
    .from("user_progress")
    .select("user_id,score,workouts_completed,longest_streak,score_reached_at")
    .order("score", { ascending: false })
    .order("workouts_completed", { ascending: false })
    .order("longest_streak", { ascending: false })
    .order("score_reached_at", { ascending: true })
    .limit(10000);
  const rows = (data ?? []) as {
    user_id: string;
    score: number;
    workouts_completed: number;
    longest_streak: number;
  }[];
  const idx = rows.findIndex((r) => r.user_id === userId);
  return { rank: idx >= 0 ? idx + 1 : rows.length + 1, total: rows.length || 1, top: rows.slice(0, 10), stats };
}
