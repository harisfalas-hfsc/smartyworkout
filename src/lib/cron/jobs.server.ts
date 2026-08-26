import type { SupabaseClient } from "@supabase/supabase-js";
import { CRON_JOBS, CRON_JOB_BY_KEY, type CronJobKey } from "@/lib/cron/registry";
import { localDateISO, localHour } from "@/lib/wod-cycle";

type DB = SupabaseClient;

export interface CronContent {
  /** Custom motivation message pool. */
  lines?: string[];
  /** Extra keywords always merged into the SEO index. */
  keywords?: string[];
  /** Where reports / alerts are emailed. */
  recipient?: string;
  /** Health-check keys to include in the nightly report. */
  checks?: string[];
  /** Instant error alerts: minimum severity that triggers an email. */
  minSeverity?: "all" | "important";
  /** Instant error alerts: minutes before the same problem can email again. */
  groupWindowMin?: number;
}

export interface CronJobConfig {
  key: string;
  enabled: boolean;
  hour: number;
  minute: number;
  timezone: string;
  content: CronContent;
  last_run_on: string | null;
  updated_at: string | null;
}

export const SITE_TIMEZONE = "Europe/Athens";

function withDefaults(key: string, row: Partial<CronJobConfig> | null): CronJobConfig {
  const def = CRON_JOB_BY_KEY[key];
  return {
    key,
    enabled: row?.enabled ?? def?.defaults.enabled ?? true,
    hour: row?.hour ?? def?.defaults.hour ?? 0,
    minute: row?.minute ?? def?.defaults.minute ?? 0,
    timezone: row?.timezone || SITE_TIMEZONE,
    content: (row?.content as CronContent) ?? {},
    last_run_on: row?.last_run_on ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

/** Every job's stored configuration, filled in with the registry defaults. */
export async function getCronConfigs(db: DB): Promise<Record<string, CronJobConfig>> {
  const out: Record<string, CronJobConfig> = {};
  let rows: Partial<CronJobConfig>[] = [];
  try {
    const { data } = await db.from("cron_jobs").select("*");
    rows = (data as Partial<CronJobConfig>[] | null) ?? [];
  } catch {
    rows = [];
  }
  const byKey = new Map(rows.map((r) => [String(r.key), r]));
  for (const def of CRON_JOBS) out[def.key] = withDefaults(def.key, byKey.get(def.key) ?? null);
  return out;
}

export async function getCronConfig(db: DB, key: CronJobKey): Promise<CronJobConfig> {
  const { data } = await db.from("cron_jobs").select("*").eq("key", key).maybeSingle();
  return withDefaults(key, (data as Partial<CronJobConfig> | null) ?? null);
}

export async function saveCronConfig(
  db: DB,
  key: string,
  patch: Partial<Pick<CronJobConfig, "enabled" | "hour" | "minute" | "timezone" | "content">>,
): Promise<CronJobConfig> {
  const def = CRON_JOB_BY_KEY[key];
  if (!def) throw new Error("Unknown job");
  const current = await getCronConfig(db, key as CronJobKey);
  const next = {
    key,
    enabled: patch.enabled ?? current.enabled,
    hour: Math.max(0, Math.min(23, Math.round(Number(patch.hour ?? current.hour) || 0))),
    minute: Math.max(0, Math.min(59, Math.round(Number(patch.minute ?? current.minute) || 0))),
    timezone: patch.timezone || current.timezone,
    content: patch.content ?? current.content,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from("cron_jobs").upsert(next as never, { onConflict: "key" });
  if (error) throw new Error(error.message);
  return getCronConfig(db, key as CronJobKey);
}

/** Day of week (0 = Sunday) in the given timezone. */
function localWeekday(now: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return Math.max(0, days.indexOf(name));
}

/**
 * True when a scheduled job should run now and has not already run today.
 * Weekly jobs additionally only run on their registry weekday (Sunday by default).
 */
export function isDueNow(config: CronJobConfig, now = new Date()): boolean {
  if (!config.enabled) return false;
  const tz = config.timezone || SITE_TIMEZONE;
  if (localHour(now, tz) !== config.hour) return false;
  const def = CRON_JOB_BY_KEY[config.key];
  if (def?.timing === "weekly" && localWeekday(now, tz) !== (def.weekday ?? 0)) return false;
  return config.last_run_on !== localDateISO(now, tz);
}


export async function markJobRan(db: DB, key: string, config: CronJobConfig, now = new Date()) {
  await db
    .from("cron_jobs")
    .upsert(
      {
        key,
        enabled: config.enabled,
        hour: config.hour,
        minute: config.minute,
        timezone: config.timezone,
        content: config.content,
        last_run_on: localDateISO(now, config.timezone || SITE_TIMEZONE),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "key" },
    );
}

export interface CronRunRow {
  id: string;
  job_key: string;
  ran_at: string;
  status: string;
  changed: boolean;
  summary: string | null;
  details: { added?: string[]; failures?: string[] };
  trigger: string;
}

export async function recordRun(
  db: DB,
  row: {
    jobKey: string;
    status: "ok" | "skipped" | "failed";
    changed?: boolean;
    summary: string;
    details?: { added?: string[]; failures?: string[] };
    trigger?: "schedule" | "manual";
  },
): Promise<void> {
  try {
    await db.from("cron_runs").insert({
      job_key: row.jobKey,
      status: row.status,
      changed: row.changed ?? false,
      summary: row.summary.slice(0, 1000),
      details: row.details ?? {},
      trigger: row.trigger ?? "schedule",
    } as never);
  } catch (e) {
    console.error("[cron] failed to record run", e);
  }
}

export async function listRuns(db: DB, limit = 40): Promise<CronRunRow[]> {
  const { data } = await db
    .from("cron_runs")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(limit);
  return (data as CronRunRow[] | null) ?? [];
}

/** The custom motivation pool an admin typed in, if any. */
export function motivationPool(config: CronJobConfig | undefined): string[] | undefined {
  const raw = config?.content?.lines;
  if (!Array.isArray(raw)) return undefined;
  const lines = raw.map((l) => String(l).trim()).filter(Boolean);
  return lines.length ? lines : undefined;
}
