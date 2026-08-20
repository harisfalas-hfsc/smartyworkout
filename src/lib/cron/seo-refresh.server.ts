import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildKeywordIndex,
  mergeIndexes,
  readKeywordIndex,
  saveKeywordIndex,
} from "@/lib/seo/keyword-index.server";
import type { CronJobConfig } from "@/lib/cron/jobs.server";

type DB = SupabaseClient;

export interface SeoRefreshResult {
  changed: boolean;
  status: "ok" | "skipped" | "failed";
  summary: string;
  total: number;
  added: string[];
  failures: string[];
  counts: { exercises: number; workouts: number };
  emailed: boolean;
}

function extraKeywordsFrom(config: CronJobConfig | undefined): string[] {
  const raw = config?.content?.keywords;
  if (Array.isArray(raw)) return raw.map((k) => String(k));
  return [];
}

/**
 * Rebuilds the site keyword index from every public page, training topic,
 * exercise and generated workout. Nothing is ever removed — the stored index is
 * merged and extended. When nothing changed, the job stops and reports "skipped".
 */
export async function runSeoRefresh(
  db: DB,
  options: { config?: CronJobConfig; trigger: "schedule" | "manual"; force?: boolean } = {
    trigger: "schedule",
  },
): Promise<SeoRefreshResult> {
  const failures: string[] = [];
  const startedAt = new Date();

  let built;
  try {
    built = await buildKeywordIndex(db, extraKeywordsFrom(options.config));
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    failures.push(`build:${message}`);
    const result: SeoRefreshResult = {
      changed: false,
      status: "failed",
      summary: `SEO update failed: ${message}`,
      total: 0,
      added: [],
      failures,
      counts: { exercises: 0, workouts: 0 },
      emailed: false,
    };
    result.emailed = await emailReport(result, startedAt, options.trigger);
    return result;
  }

  const previous = await readKeywordIndex();
  const { merged, added } = mergeIndexes(previous, built);

  const unchanged =
    !options.force && previous !== null && added.length === 0 && previous.hash === built.hash;

  if (unchanged) {
    return {
      changed: false,
      status: "skipped",
      summary: `No new keywords, pages or workouts since the last run — nothing to update (${merged.total} keywords indexed).`,
      total: merged.total,
      added: [],
      failures,
      counts: built.counts,
      emailed: false,
    };
  }

  try {
    await saveKeywordIndex(merged);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    failures.push(`save:${message}`);
  }

  const result: SeoRefreshResult = {
    changed: failures.length === 0,
    status: failures.length ? "failed" : "ok",
    summary: failures.length
      ? `SEO update finished with errors: ${failures.join("; ")}`
      : `SEO index updated — ${added.length} new keyword${added.length === 1 ? "" : "s"}, ${merged.total} indexed in total (${built.counts.exercises} exercises, ${built.counts.workouts} workouts).`,
    total: merged.total,
    added,
    failures,
    counts: built.counts,
    emailed: false,
  };

  result.emailed = await emailReport(result, startedAt, options.trigger);
  return result;
}

async function emailReport(
  result: SeoRefreshResult,
  startedAt: Date,
  trigger: "schedule" | "manual",
): Promise<boolean> {
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const finishedAt = new Date();
    await sendTemplateEmail("cron-report", "smartyworkout@outlook.com", {
      templateData: {
        jobLabel: "Automatic SEO update",
        status: result.status,
        trigger,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationSec: Math.max(1, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000)),
        summary: result.summary,
        added: result.added.slice(0, 120),
        addedCount: result.added.length,
        total: result.total,
        exercises: result.counts.exercises,
        workouts: result.counts.workouts,
        failures: result.failures,
      },
      idempotencyKey: `seo-report:${startedAt.toISOString().slice(0, 13)}:${trigger}`,
    });
    return true;
  } catch (e) {
    console.error("[cron/seo] report email failed", e);
    return false;
  }
}
