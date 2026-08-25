import type { SupabaseClient } from "@supabase/supabase-js";
import type { CronJobConfig } from "@/lib/cron/jobs.server";
import { localDateISO } from "@/lib/wod-cycle";

type DB = SupabaseClient;

export type CheckStatus = "pass" | "warn" | "fail";

export interface HealthCheckItem {
  number: number;
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface HealthReport {
  startedAt: string;
  finishedAt: string;
  durationSec: number;
  trigger: "schedule" | "manual";
  items: HealthCheckItem[];
  passed: number;
  warned: number;
  failed: number;
  status: "ok" | "failed";
  summary: string;
  emailed: boolean;
  recipient: string;
}

export { HEALTH_CHECKS, DEFAULT_HEALTH_RECIPIENT } from "@/lib/cron/health-checks";
import { HEALTH_CHECKS, DEFAULT_HEALTH_RECIPIENT } from "@/lib/cron/health-checks";

const SITE_BASE_URL = "https://smartyworkout.com";

function enabledKeys(config?: CronJobConfig): Set<string> {
  const raw = config?.content?.checks;
  if (!Array.isArray(raw) || raw.length === 0) return new Set(HEALTH_CHECKS.map((c) => c.key));
  return new Set(raw.map((k) => String(k)));
}

export function healthRecipient(config?: CronJobConfig): string {
  const raw = config?.content?.recipient;
  const email = typeof raw === "string" ? raw.trim() : "";
  return email || DEFAULT_HEALTH_RECIPIENT;
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function countRows(db: DB, table: string): Promise<number> {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function since24h(db: DB, table: string, column = "created_at"): Promise<number> {
  const from = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte(column, from);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Runs the full nightly system check. Never throws — a failing check becomes a
 * "fail" line in the report so the email always goes out.
 */
export async function runHealthCheck(
  db: DB,
  options: { config?: CronJobConfig; trigger: "schedule" | "manual" },
): Promise<HealthReport> {
  const startedAt = new Date();
  const on = enabledKeys(options.config);
  const items: HealthCheckItem[] = [];
  let n = 0;

  const add = (key: string, status: CheckStatus, detail: string) => {
    const def = HEALTH_CHECKS.find((c) => c.key === key);
    n += 1;
    items.push({ number: n, key, label: def?.label ?? key, status, detail });
  };

  const run = async (key: string, fn: () => Promise<[CheckStatus, string]>) => {
    if (!on.has(key)) return;
    try {
      const [status, detail] = await fn();
      add(key, status, detail);
    } catch (e) {
      add(key, "fail", msg(e));
    }
  };

  await run("database", async () => {
    const { error } = await db.from("app_settings").select("key").limit(1);
    if (error) return ["fail", `Database read failed: ${error.message}`];
    return ["pass", "Database answered a read request normally."];
  });

  await run("tables", async () => {
    const tables = [
      "profiles",
      "workouts",
      "exercises",
      "subscriptions",
      "notifications",
      "community_comments",
      "community_ratings",
      "support_threads",
      "workout_results",
      "user_progress",
      "set_logs",
    ];
    const bad: string[] = [];
    for (const t of tables) {
      const { error } = await db.from(t).select("*", { count: "exact", head: true });
      if (error) bad.push(`${t} (${error.message})`);
    }
    if (bad.length) return ["fail", `Unreadable: ${bad.join(", ")}`];
    return ["pass", `All ${tables.length} key tables readable.`];
  });

  await run("library", async () => {
    const total = await countRows(db, "exercises");
    const { count: missing } = await db
      .from("exercises")
      .select("*", { count: "exact", head: true })
      .is("gif_path", null)
      .eq("is_active", true);
    if (total === 0) return ["fail", "The exercise library is empty."];
    const withoutMedia = missing ?? 0;
    if (withoutMedia > 0)
      return ["warn", `${total} exercises, ${withoutMedia} active exercise(s) without media.`];
    return ["pass", `${total} exercises, every active exercise has media.`];
  });

  await run("media", async () => {
    const { data } = await db
      .from("exercises")
      .select("id,gif_path")
      .not("gif_path", "is", null)
      .eq("is_active", true)
      .limit(1);
    const row = ((data as { id: string; gif_path: string }[] | null) ?? [])[0];
    if (!row) return ["warn", "No exercise with media to test."];
    const { data: signed, error } = await db.storage
      .from("exercise-library")
      .createSignedUrl(row.gif_path, 120);
    if (error || !signed?.signedUrl)
      return ["fail", `Could not create a media link: ${error?.message ?? "no URL returned"}`];
    const res = await fetch(signed.signedUrl, { method: "GET" });
    if (!res.ok) return ["fail", `Media file did not load (HTTP ${res.status}) — player images would be blank.`];
    const size = Number(res.headers.get("content-length") ?? 0);
    return ["pass", `Media link works (HTTP 200${size ? `, ${Math.round(size / 1024)} KB` : ""}).`];
  });

  await run("ai", async () => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return ["fail", "AI key is not configured — no member can generate a workout."];
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
    });
    if (res.ok) return ["pass", "Workout generation is available (AI answered normally)."];
    if (res.status === 402)
      return ["fail", "OUT OF AI CREDITS — members cannot generate workouts until credits are topped up."];
    if (res.status === 403)
      return ["fail", "AI is blocked for this workspace (limit reached or AI disabled)."];
    if (res.status === 429) return ["warn", "AI is rate limited right now (temporary)."];
    return ["fail", `AI request failed with HTTP ${res.status}.`];
  });

  await run("wod", async () => {
    const today = localDateISO(new Date());
    const { count } = await db
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("is_wod", true)
      .eq("wod_date", today);
    const { count: subscribers } = await db
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("auto_workout_enabled", true);
    const built = count ?? 0;
    const detail = `${built} Workout of the Day session(s) for ${today} · ${subscribers ?? 0} member(s) on auto-delivery.`;
    if ((subscribers ?? 0) > 0 && built === 0) return ["warn", `${detail} None built yet today.`];
    return ["pass", detail];
  });

  await run("email", async () => {
    if (!process.env["LOVABLE_API_KEY"])
      return ["fail", "Email cannot be sent — the mail key is missing."];
    return ["pass", "Email sender configured (this report itself proves delivery)."];
  });

  await run("payments", async () => {
    const notes: string[] = [];
    let status: CheckStatus = "pass";
    const live = process.env["STRIPE_LIVE_API_KEY"];
    const sandbox = process.env["STRIPE_SANDBOX_API_KEY"];
    if (live) notes.push("live payments key present");
    else {
      notes.push("NO live payments key");
      status = "fail";
    }
    if (sandbox) notes.push("sandbox key present");
    try {
      const { isFreeAccessMode } = await import("@/lib/free-access.server");
      if (await isFreeAccessMode()) {
        notes.push("GLOBAL FREE ACCESS MODE IS ON — no revenue is being collected");
        status = status === "fail" ? "fail" : "warn";
      } else {
        notes.push("free access mode off (members are charged normally)");
      }
    } catch (e) {
      notes.push(`could not read access mode: ${msg(e)}`);
      status = status === "fail" ? "fail" : "warn";
    }
    const { count: active } = await db
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .in("status", ["active", "trialing"]);
    notes.push(`${active ?? 0} active membership(s)`);
    return [status, notes.join(" · ")];
  });

  await run("jobs", async () => {
    const { getCronConfigs } = await import("@/lib/cron/jobs.server");
    const configs = await getCronConfigs(db);
    const off = Object.values(configs)
      .filter((c) => !c.enabled)
      .map((c) => c.key);
    const { data: runs } = await db
      .from("cron_runs")
      .select("job_key,status,ran_at")
      .gte("ran_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .limit(200);
    const rows = (runs as { job_key: string; status: string }[] | null) ?? [];
    const failed = rows.filter((r) => r.status === "failed");
    const parts = [`${rows.length} job run(s) in the last 24h`];
    if (off.length) parts.push(`switched off: ${off.join(", ")}`);
    if (failed.length) {
      parts.push(`${failed.length} failed run(s): ${failed.map((f) => f.job_key).join(", ")}`);
      return ["fail", parts.join(" · ")];
    }
    return [off.length ? "warn" : "pass", parts.join(" · ")];
  });

  await run("pages", async () => {
    const paths = [
      "/",
      "/how-it-works",
      "/pricing",
      "/faq",
      "/about",
      "/exercise-library",
      "/tools",
      "/training",
      "/community",
      "/contact",
      "/sitemap.xml",
      "/llms.txt",
      "/api/public/health",
    ];
    const bad: string[] = [];
    for (const p of paths) {
      try {
        const res = await fetch(`${SITE_BASE_URL}${p}`, { method: "GET" });
        if (!res.ok) bad.push(`${p} → HTTP ${res.status}`);
      } catch (e) {
        bad.push(`${p} → ${msg(e)}`);
      }
    }
    if (bad.length) return ["fail", `Not loading: ${bad.join(", ")}`];
    return ["pass", `All ${paths.length} public pages returned HTTP 200.`];
  });

  await run("sharing", async () => {
    const { data } = await db
      .from("workouts")
      .select("id")
      .eq("is_shared", true)
      .order("shared_at", { ascending: false })
      .limit(1);
    const row = ((data as { id: string }[] | null) ?? [])[0];
    if (!row) return ["warn", "No shared workout to test yet."];
    const res = await fetch(`${SITE_BASE_URL}/w/${row.id}`, { method: "GET" });
    if (!res.ok) return ["fail", `Share link /w/${row.id} returned HTTP ${res.status}.`];
    return ["pass", "Share links open correctly."];
  });

  await run("memberdata", async () => {
    const bad: string[] = [];
    const checks: [string, () => PromiseLike<{ error: { message: string } | null }>][] = [
      ["logbook", () => db.from("workouts").select("id,scheduled_at,completed_at").limit(1)],
      ["progress", () => db.from("user_progress").select("user_id,score").limit(1)],
      ["player", () => db.from("set_logs").select("id,workout_id,metric").limit(1)],
      ["performance", () => db.from("workout_results").select("id,rpe,attempt").limit(1)],
      ["awards", () => db.from("user_badges").select("id,badge_id").limit(1)],
      ["messages", () => db.from("support_messages").select("id,thread_id").limit(1)],
      ["notifications", () => db.from("notifications").select("id,kind").limit(1)],
    ];
    for (const [name, q] of checks) {
      const { error } = await q();
      if (error) bad.push(`${name} (${error.message})`);
    }
    if (bad.length) return ["fail", `Broken data paths: ${bad.join(", ")}`];
    return ["pass", "Logbook, progress, player, performance, awards, messages all readable."];
  });

  await run("support", async () => {
    const { count } = await db
      .from("support_threads")
      .select("*", { count: "exact", head: true })
      .eq("admin_unread", true)
      .lt("last_message_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
    const waiting = count ?? 0;
    if (waiting > 0) return ["warn", `${waiting} member message(s) waiting more than 24 hours.`];
    return ["pass", "No member message waiting longer than 24 hours."];
  });

  await run("errors", async () => {
    const from = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data, count } = await db
      .from("error_events")
      .select("message,route,occurrences", { count: "exact" })
      .gte("created_at", from)
      .order("occurrences", { ascending: false })
      .limit(5);
    const rows = (data as { message: string; route: string | null }[] | null) ?? [];
    const total = count ?? 0;
    if (total === 0) return ["pass", "No errors recorded in the last 24 hours."];
    const top = rows.map((r) => `${r.message}${r.route ? ` (${r.route})` : ""}`).join(" | ");
    return [total > 20 ? "fail" : "warn", `${total} error(s) in 24h. Most frequent: ${top}`];
  });

  await run("activity", async () => {
    const [signups, generated, completed, sessions] = await Promise.all([
      since24h(db, "profiles"),
      since24h(db, "workouts"),
      since24h(db, "workout_results", "performed_at"),
      since24h(db, "generation_sessions"),
    ]);
    return [
      "pass",
      `${signups} new member(s) · ${generated} workout(s) created · ${completed} session(s) logged · ${sessions} generation session(s).`,
    ];
  });

  const finishedAt = new Date();
  const passed = items.filter((i) => i.status === "pass").length;
  const warned = items.filter((i) => i.status === "warn").length;
  const failed = items.filter((i) => i.status === "fail").length;
  const summary = `${passed} of ${items.length} checks passed${warned ? `, ${warned} warning${warned === 1 ? "" : "s"}` : ""}${failed ? `, ${failed} failure${failed === 1 ? "" : "s"}` : ""}.`;

  const report: HealthReport = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationSec: Math.max(1, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000)),
    trigger: options.trigger,
    items,
    passed,
    warned,
    failed,
    status: failed ? "failed" : "ok",
    summary,
    emailed: false,
    recipient: healthRecipient(options.config),
  };

  report.emailed = await emailReport(report);
  return report;
}

async function emailReport(report: HealthReport): Promise<boolean> {
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("health-report", report.recipient, {
      templateData: {
        startedAt: report.startedAt,
        finishedAt: report.finishedAt,
        durationSec: report.durationSec,
        trigger: report.trigger,
        summary: report.summary,
        passed: report.passed,
        warned: report.warned,
        failed: report.failed,
        total: report.items.length,
        items: report.items,
      },
      idempotencyKey: `health-report:${report.startedAt.slice(0, 13)}:${report.trigger}`,
    });
    return true;
  } catch (e) {
    console.error("[cron/health] report email failed", e);
    return false;
  }
}
