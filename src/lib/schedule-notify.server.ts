import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyOnce } from "@/lib/billing-notify.server";

type DB = SupabaseClient;

const MIN = 60_000;

type Row = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  status: string;
  scheduled_at: string;
};

/**
 * Reminders for scheduled workouts:
 *  - 30 minutes before the start
 *  - at the scheduled time
 *  - a follow-up the day after ("did you do it?")
 * Every notification is deduped, so running this often is safe.
 */
export async function runScheduleReminders(db: DB): Promise<number> {
  const now = Date.now();
  const from = new Date(now - 40 * 60 * MIN).toISOString(); // 40 hours back for follow-ups
  const to = new Date(now + 60 * MIN).toISOString();

  const { data } = await db
    .from("workouts")
    .select("id,user_id,name,category,status,scheduled_at")
    .not("scheduled_at", "is", null)
    .gte("scheduled_at", from)
    .lte("scheduled_at", to)
    .limit(2000);

  const rows = ((data as Row[] | null) ?? []).filter((r) => r.scheduled_at);
  let sent = 0;

  for (const row of rows) {
    const at = new Date(row.scheduled_at).getTime();
    const diff = at - now;
    const label = `${row.category} — ${row.name}`;

    try {
      // 30 minutes before (fires inside a 0–35 min window)
      if (row.status !== "completed" && diff > 0 && diff <= 35 * MIN) {
        if (
          await notifyOnce(db, {
            userId: row.user_id,
            kind: "schedule",
            title: "Your workout starts in 30 minutes",
            body: label,
            dedupeKey: `sched-soon:${row.id}:${row.scheduled_at}`,
          })
        )
          sent += 1;
      }

      // At the scheduled time
      if (row.status !== "completed" && diff <= 0 && diff > -30 * MIN) {
        if (
          await notifyOnce(db, {
            userId: row.user_id,
            kind: "schedule",
            title: "It's time — your scheduled workout is now",
            body: label,
            dedupeKey: `sched-now:${row.id}:${row.scheduled_at}`,
          })
        )
          sent += 1;
      }

      // Next-day follow-up
      if (row.status !== "completed" && diff <= -18 * 60 * MIN && diff > -40 * 60 * MIN) {
        if (
          await notifyOnce(db, {
            userId: row.user_id,
            kind: "schedule",
            title: "Did you do your workout?",
            body: `${label} — mark it as completed, add it to your favourites, or share it with the Smarty Community.`,
            dedupeKey: `sched-followup:${row.id}:${row.scheduled_at}`,
          })
        )
          sent += 1;
      }
    } catch {
      // one bad row must never stop the batch
    }
  }

  return sent;
}
