import type { SupabaseClient } from "@supabase/supabase-js";
import { TRAINING_TOPICS } from "@/lib/seo/training-topics";
import { PAGE_KEYWORDS } from "@/lib/seo/page-keywords";

type DB = SupabaseClient;

export interface SeoKeywordIndex {
  version: number;
  generated_at: string;
  hash: string;
  total: number;
  keywords: string[];
  groups: {
    pages: string[];
    topics: string[];
    muscles: string[];
    equipment: string[];
    patterns: string[];
    categories: string[];
    formats: string[];
    focuses: string[];
    exercises: string[];
    workouts: string[];
    blog: string[];
    custom: string[];
  };
  counts: { exercises: number; workouts: number; articles: number };
}

export const SEO_INDEX_KEY = "seo_keyword_index";

const clean = (v: unknown): string =>
  String(v ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function collect(values: unknown[], max = 4000): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (Array.isArray(v)) {
      for (const inner of v) {
        const k = clean(inner);
        if (k && k.length <= 70) set.add(k);
      }
      continue;
    }
    const k = clean(v);
    if (k && k.length <= 70) set.add(k);
  }
  return Array.from(set).sort().slice(0, max);
}

async function hashOf(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

async function fetchAll<T>(
  db: DB,
  table: string,
  columns: string,
  filter?: (q: any) => any,
): Promise<T[]> {
  const out: T[] = [];
  const page = 1000;
  for (let from = 0; from < 20000; from += page) {
    let q: any = db.from(table).select(columns).range(from, from + page - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data as T[] | null) ?? [];
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

/** Builds the full keyword index from the live site content and database. */
export async function buildKeywordIndex(
  db: DB,
  extraKeywords: string[] = [],
): Promise<SeoKeywordIndex> {
  const pages = collect(Object.values(PAGE_KEYWORDS).flat());
  const topics = collect(
    TRAINING_TOPICS.flatMap((t) => [t.h1, t.eyebrow, t.slug, ...t.related.map((r) => r.label)]),
  );

  const exercises = await fetchAll<{
    name: string;
    target_muscle: string | null;
    body_part: string | null;
    secondary_muscles: string[] | null;
    equipment: string | null;
    category: string | null;
    movement_pattern: string | null;
    tags: string[] | null;
  }>(db, "exercises", "name,target_muscle,body_part,secondary_muscles,equipment,category,movement_pattern,tags", (q) =>
    q.eq("is_active", true),
  );

  const workouts = await fetchAll<{
    name: string;
    category: string | null;
    format: string | null;
    focus: string | null;
    equipment: string[] | null;
  }>(db, "workouts", "name,category,format,focus,equipment");

  const muscles = collect([
    ...exercises.map((e) => e.target_muscle),
    ...exercises.map((e) => e.body_part),
    ...exercises.map((e) => e.secondary_muscles),
  ]);
  const equipment = collect([
    ...exercises.map((e) => e.equipment),
    ...workouts.map((w) => w.equipment),
  ]);
  const patterns = collect(exercises.map((e) => e.movement_pattern));
  const categories = collect([
    ...exercises.map((e) => e.category),
    ...workouts.map((w) => w.category),
  ]);
  const formats = collect(workouts.map((w) => w.format));
  const focuses = collect(workouts.map((w) => w.focus));
  const exerciseNames = collect(
    [...exercises.map((e) => e.name), ...exercises.map((e) => e.tags)],
    6000,
  );
  const workoutNames = collect(workouts.map((w) => w.name), 6000);
  const custom = collect(extraKeywords);

  const articles = await fetchAll<{
    title: string;
    slug: string;
    excerpt: string | null;
    category: string | null;
  }>(db, "blog_articles", "title,slug,excerpt,category", (q) => q.eq("is_published", true));

  // Full titles first, then the meaningful phrases/terms inside titles and excerpts.
  const blog = collect(
    [
      ...articles.map((a) => a.title),
      ...articles.map((a) => a.slug),
      ...articles.map((a) => a.category),
      ...articles.flatMap((a) => titlePhrases(a.title)),
      ...articles.flatMap((a) => titlePhrases(a.excerpt ?? "")),
    ],
    6000,
  );

  const groups = {
    pages,
    topics,
    muscles,
    equipment,
    patterns,
    categories,
    formats,
    focuses,
    exercises: exerciseNames,
    workouts: workoutNames,
    blog,
    custom,
  };

  const keywords = Array.from(new Set(Object.values(groups).flat())).sort();
  const hash = await hashOf(keywords.join("|"));

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    hash,
    total: keywords.length,
    keywords,
    groups,
    counts: { exercises: exercises.length, workouts: workouts.length },
  };
}

export async function readKeywordIndex(): Promise<SeoKeywordIndex | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("app_settings")
      .select("value")
      .eq("key", SEO_INDEX_KEY)
      .maybeSingle();
    return (data?.value as SeoKeywordIndex | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Merges the freshly built index into the stored one — keywords are only ever
 * added, never removed.
 */
export function mergeIndexes(
  previous: SeoKeywordIndex | null,
  next: SeoKeywordIndex,
): { merged: SeoKeywordIndex; added: string[] } {
  if (!previous) return { merged: next, added: next.keywords };
  const known = new Set(previous.keywords ?? []);
  const added = next.keywords.filter((k) => !known.has(k));
  const keywords = Array.from(new Set([...(previous.keywords ?? []), ...next.keywords])).sort();
  const groups = { ...next.groups };
  for (const key of Object.keys(groups) as (keyof SeoKeywordIndex["groups"])[]) {
    const before = previous.groups?.[key] ?? [];
    groups[key] = Array.from(new Set([...before, ...groups[key]])).sort();
  }
  return {
    merged: { ...next, keywords, groups, total: keywords.length },
    added,
  };
}

export async function saveKeywordIndex(index: SeoKeywordIndex): Promise<void> {
  const { writeSetting } = await import("@/lib/settings.server");
  await writeSetting(SEO_INDEX_KEY, index);
}
