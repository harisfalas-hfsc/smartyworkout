import type { SupabaseClient } from "@supabase/supabase-js";

type DB = SupabaseClient;

/**
 * Inserts a notification, ignoring duplicates via the (user_id, dedupe_key) unique index.
 * Returns true when a new row was created.
 */
export async function notifyOnce(
  db: DB,
  row: { userId: string; kind: string; title: string; body: string; dedupeKey: string },
): Promise<boolean> {
  const { error } = await db.from("notifications").insert({
    user_id: row.userId,
    kind: row.kind,
    title: row.title,
    body: row.body,
    dedupe_key: row.dedupeKey,
  } as never);
  if (!error) return true;
  // 23505 = unique violation (already sent)
  if ((error as { code?: string }).code === "23505") return false;
  throw new Error(error.message);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const DAY_MS = 86_400_000;

/**
 * Sends "renews in 3 days" and "renews tomorrow" reminders for memberships that
 * are set to auto-renew. Idempotent per subscription period.
 */
export async function runRenewalReminders(db: DB): Promise<number> {
  const now = Date.now();
  const horizon = new Date(now + 3 * DAY_MS + 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("subscriptions")
    .select("user_id,current_period_end,status,cancel_at_period_end")
    .in("status", ["active", "trialing"])
    .eq("cancel_at_period_end", false)
    .not("current_period_end", "is", null)
    .lte("current_period_end", horizon)
    .gte("current_period_end", new Date(now).toISOString())
    .limit(2000);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ user_id: string; current_period_end: string }>;
  let sent = 0;

  for (const row of rows) {
    const end = new Date(row.current_period_end).getTime();
    if (Number.isNaN(end)) continue;
    const msLeft = end - now;
    const when = formatDate(row.current_period_end);

    if (msLeft <= DAY_MS) {
      const created = await notifyOnce(db, {
        userId: row.user_id,
        kind: "billing",
        title: "Your membership renews tomorrow",
        body: `Your Smarty Workout membership (€9.99/month) renews on ${when}. Nothing to do — your card on file will be charged automatically. If you'd like to update your card or stop the renewal, you can do it any time from My account.`,
        dedupeKey: `renew-1d:${row.current_period_end}`,
      });
      if (created) sent += 1;
    } else if (msLeft <= 3 * DAY_MS) {
      const created = await notifyOnce(db, {
        userId: row.user_id,
        kind: "billing",
        title: "Your membership renews in 3 days",
        body: `A friendly heads-up: your Smarty Workout membership (€9.99/month) renews on ${when}. No action is needed. If your card has changed, you can update it in My account so the renewal goes through smoothly.`,
        dedupeKey: `renew-3d:${row.current_period_end}`,
      });
      if (created) sent += 1;
    }
  }

  return sent;
}
