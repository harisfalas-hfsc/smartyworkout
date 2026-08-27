import type { ExerciseSchemaItem } from "./exercise-schema.functions";

let cache: { at: number; rows: ExerciseSchemaItem[] } | null = null;
const TTL_MS = 60 * 60 * 1000;

function short(text: string | null, max = 110): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export async function readExerciseSchemaList(): Promise<ExerciseSchemaItem[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows: ExerciseSchemaItem[] = [];
    const pageSize = 1000;
    for (let page = 0; page < 5; page++) {
      const { data, error } = await (supabaseAdmin as any)
        .from("exercises")
        .select("name,equipment,target_muscle,body_part,description,instructions")
        .order("name", { ascending: true })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error) break;
      const batch = (data as any[]) ?? [];
      for (const r of batch) {
        if (!r?.name) continue;
        const fallback = Array.isArray(r.instructions) ? r.instructions[0] : null;
        rows.push({
          n: String(r.name),
          e: r.equipment ?? null,
          t: r.target_muscle ?? r.body_part ?? null,
          d: short(r.description ?? fallback ?? null),
        });
      }
      if (batch.length < pageSize) break;
    }
    cache = { at: Date.now(), rows };
    return rows;
  } catch {
    return cache?.rows ?? [];
  }
}
