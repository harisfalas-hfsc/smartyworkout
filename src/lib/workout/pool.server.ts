import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, DifficultyLevel, EquipmentMode, StrengthFocus } from "./spec";

export type PoolExercise = {
  id: string;
  name: string;
  body_part: string | null;
  target_muscle: string | null;
  secondary_muscles: string[] | null;
  equipment: string | null;
  category: string | null;
  difficulty: string | null;
  movement_pattern: string | null;
  body_region: string | null;
  gif_path: string | null;
};

const SELECT =
  "id,name,body_part,target_muscle,secondary_muscles,equipment,category,difficulty,movement_pattern,body_region,gif_path";

/** Loads the whole exercises table, paginated 1000 rows at a time. */
export async function loadAllExercises(supabase: SupabaseClient): Promise<PoolExercise[]> {
  const rows: PoolExercise[] = [];
  for (let page = 0; page < 10; page++) {
    const from = page * 1000;
    const { data, error } = await supabase
      .from("exercises")
      .select(SELECT)
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as unknown as PoolExercise[];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

const text = (e: PoolExercise) =>
  `${e.name} ${e.target_muscle ?? ""} ${e.body_part ?? ""} ${e.category ?? ""} ${e.equipment ?? ""}`.toLowerCase();

/** Stretching / mobility / yoga vocabulary — banned in CHALLENGE main work. */
export const STRETCH_RE =
  /\b(stretch|stretching|cat-?cow|cobra|sphinx|upward facing dog|downward dog|child'?s pose|pigeon|butterfly|world'?s greatest|skin the cat|inchworm|yoga|mobility|foam roll|myofascial|release)\b/i;

/** Apparatus that is not available in a home-bodyweight setting. */
const HOME_APPARATUS_RE =
  /\b(bar|barbell|cage|rack|machine|ring|rings|sled|parallel bars|pull-?up bar|dip bar|gymnastic|lever|smith|cable|bench press|captain'?s chair|roman chair|treadmill|elliptical|ergometer|stationary bike|skierg|stepmill|rope climb)\b/i;

const STATIC_HOLD_RE = /\b(hold|plank|isometric|wall sit|hollow|l-?sit|bridge hold|static)\b/i;

const PILATES_BAN_RE =
  /\b(kettlebell|barbell|machine|cable|smith|sled|jump|jumping|plyo|burpee|sprint|box jump|snatch|clean|jerk|thruster)\b/i;

const MOBILITY_BAN_RE =
  /\b(jump|jumping|plyo|burpee|sprint|snatch|clean|jerk|thruster|push-?up|pushup|crunch|sit-?up|leg raise|kettlebell swing|box jump|deadlift|bench press|row machine|sled)\b/i;

const MICRO_BAN_RE =
  /\b(dumbbell|kettlebell|barbell|band|machine|bike|rower|rope|treadmill|sled|cable|smith|ez|olympic|medicine ball|bosu|stability ball)\b/i;

const RECOVERY_BAN_RE =
  /\b(jump|jumping|plyo|burpee|sprint|snatch|clean|jerk|thruster|crunch|sit-?up|deadlift|bench press|heavy)\b/i;

const FOCUS_RULES: Record<StrengthFocus, { allow?: RegExp; deny?: RegExp }> = {
  "LOWER BODY": {
    deny: /\b(press|push-?up|pushup|row|pull-?up|pulldown|curl|fly|dip|triceps|biceps|shoulder|chest|lat)\b/i,
  },
  "UPPER BODY": {
    deny: /\b(squat|lunge|leg press|deadlift|hip thrust|leg curl|leg extension|calf|step-?up|glute bridge)\b/i,
  },
  "FULL BODY": {},
  "LOW PUSH & UPPER PULL": {
    deny: /\b(deadlift|romanian|rdl|leg curl|bench press|shoulder press|push-?up|pushup|triceps|dip)\b/i,
  },
  "LOW PULL & UPPER PUSH": {
    deny: /\b(squat|lunge|leg press|step-?up|row|pull-?up|pulldown|curl|chin-?up)\b/i,
  },
  "CORE & GLUTES": {
    allow:
      /\b(plank|dead bug|pallof|bird dog|hip thrust|glute bridge|kickback|clamshell|anti-rotation|abdominal|core|oblique|glute)\b/i,
  },
};

export type PoolFilter = {
  category: Category;
  equipmentMode: EquipmentMode;
  selectedEquipment: string[];
  customEquipment?: string[];
  level: DifficultyLevel;
  focus?: StrengthFocus | null;
  /** Library ids the athlete banned — removed before the model sees anything. */
  dislikedIds?: string[];
  /** Library ids the athlete loves — kept in the sample and surfaced to the model. */
  favoriteIds?: string[];
};


const isBodyweight = (e: PoolExercise) => (e.equipment ?? "").toLowerCase().includes("body weight");

const EQUIPMENT_LABELS: Record<string, string[]> = {
  bodyweight: ["body weight"],
  dumbbells: ["dumbbell"],
  kettlebells: ["kettlebell"],
  barbell: ["barbell", "ez barbell", "olympic barbell", "trap bar"],
  bands: ["band", "resistance band"],
  trx: ["assisted"],
  machines: [
    "cable",
    "leverage machine",
    "smith machine",
    "elliptical machine",
    "skierg machine",
    "sled machine",
    "stationary bike",
    "stepmill machine",
    "upper body ergometer",
  ],
};

/** Requires every apparatus named by the library row to be explicitly selected. */
export function matchesSelectedEquipment(
  e: PoolExercise,
  selected: string[],
  custom: string[] = [],
): boolean {
  if (selected.includes("fullgym")) return true;
  const equipment = (e.equipment ?? "").toLowerCase().trim();
  if (!equipment) return false;
  const known = selected.some((id) =>
    (EQUIPMENT_LABELS[id] ?? []).some(
      (label) => equipment === label || equipment.startsWith(`${label} (`),
    ),
  );
  if (known) return true;
  // "Other" free-text: only honoured when the library actually has that apparatus.
  if (selected.includes("other") && custom.length) {
    return custom.some(
      (term) => term.length > 2 && (equipment.includes(term) || term.includes(equipment)),
    );
  }
  return false;
}

/** Keeps only the free-text apparatus that really exists in the exercise library. */
export function resolveCustomEquipment(all: PoolExercise[], raw: string): string[] {
  const terms = raw
    .toLowerCase()
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
  if (!terms.length) return [];
  const labels = new Set(all.map((e) => (e.equipment ?? "").toLowerCase().trim()).filter(Boolean));
  return terms.filter((t) => [...labels].some((l) => l.includes(t) || t.includes(l)));
}

/**
 * Applies the documented filter order: category ban -> equipment -> difficulty
 * -> guardrails. The result is the only vocabulary the model ever sees.
 */
export function filterPool(all: PoolExercise[], f: PoolFilter): PoolExercise[] {
  let pool = all.slice();

  // 1. Category bans applied before generation.
  if (f.category === "CHALLENGE") pool = pool.filter((e) => !STRETCH_RE.test(text(e)));
  if (f.category === "PILATES") pool = pool.filter((e) => !PILATES_BAN_RE.test(text(e)));
  if (f.category === "MOBILITY & STABILITY")
    pool = pool.filter((e) => !MOBILITY_BAN_RE.test(text(e)));
  if (f.category === "RECOVERY") pool = pool.filter((e) => !RECOVERY_BAN_RE.test(text(e)));
  if (f.category === "MICRO-WORKOUTS")
    pool = pool.filter((e) => isBodyweight(e) && !MICRO_BAN_RE.test(text(e)));

  // 2. Exact equipment allowlist. Never widen a user's choices to all equipment.
  pool = pool.filter((e) =>
    matchesSelectedEquipment(e, f.selectedEquipment, f.customEquipment ?? []),
  );
  if (f.equipmentMode === "BODYWEIGHT")
    pool = pool.filter((e) => isBodyweight(e) && !HOME_APPARATUS_RE.test(text(e)));

  // 3. Strict difficulty match (no level mixing).
  if (f.level !== "all") {
    const strict = pool.filter((e) => (e.difficulty ?? "").toLowerCase() === f.level);
    if (strict.length >= 40) pool = strict;
  }

  // 4. Static-hold guardrail for momentum / conditioning categories.
  const momentum: Category[] = ["CARDIO", "CALORIE BURNING", "METABOLIC", "CHALLENGE"];
  if (momentum.includes(f.category)) pool = pool.filter((e) => !STATIC_HOLD_RE.test(e.name));

  // 5. Strength focus split.
  if (f.category === "STRENGTH" && f.focus) {
    const rule = FOCUS_RULES[f.focus];
    if (rule.deny) pool = pool.filter((e) => !rule.deny!.test(text(e)));
    if (rule.allow) {
      const kept = pool.filter((e) => rule.allow!.test(text(e)));
      if (kept.length >= 15) pool = kept;
    }
  }

  // 6. Hard ban: exercises the athlete picked as dislikes, plus their variations.
  if (f.dislikedIds?.length) {
    const banned = new Set(f.dislikedIds);
    const stems = new Set(
      all.filter((e) => banned.has(e.id)).map((e) => nameStem(e.name)).filter((s) => s.length > 3),
    );
    pool = pool.filter((e) => !banned.has(e.id) && !stems.has(nameStem(e.name)));
  }

  return pool;
}

/** "barbell full squat" -> "squat": the last two words carry the movement. */
export function nameStem(name: string): string {
  const words = name.toLowerCase().replace(/[^a-z\s-]/g, "").split(/\s+/).filter(Boolean);
  return words.slice(-2).join(" ");
}

// ---------------------------------------------------------------------------
// Preparation pools — Activation and Cool Down always come from the library so
// every section is playable (each line carries an {{exercise:}} token).
// ---------------------------------------------------------------------------

/** Movement-prep vocabulary: dynamic mobility, activation and patterning. */
export const ACTIVATION_OK_RE =
  /\b(bridge|bird dog|dead bug|clamshell|circle|circles|leg swing|swing leg|march|walkout|inchworm|cat|scapular|wall slide|pull-?apart|hip opener|ankle|good morning|dynamic|rotation|twist|reach|crawl|glute|abduction|adduction|shoulder|hip|thoracic|lunge|squat|stretch|mobility|activation|band)\b/i;

/** Never movement prep — load, impact, skill or maximal strength. */
export const PREP_BAN_RE =
  /\b(barbell|dumbbell|kettlebell|machine|cable|smith|ez[\s-]?bar|olympic|sled|weighted|leverage|trap bar|hammer|deadlift|bench press|back squat|front squat|overhead press|push press|clean|snatch|jerk|thruster|push-?up|pushup|pull-?up|chin-?up|muscle-?up|burpee|box jump|jump|jumping|sprint|dip|plyo|planche|lever|flag|handstand|sit-?up|crunch)\b/i;

/** Static flexibility and breathing vocabulary for the Cool Down. */
export const COOLDOWN_OK_RE =
  /\b(stretch|stretching|cat-?cow|cobra|sphinx|child'?s pose|pigeon|butterfly|seated|supine|lying|standing|forward bend|split|straddle|twist|breathing|hang)\b/i;

const isBand = (e: PoolExercise) => (e.equipment ?? "").toLowerCase().includes("band");

/** Prep sections may always use bodyweight; bands only when the athlete has them. */
function prepEquipmentOk(e: PoolExercise, selectedEquipment: string[]): boolean {
  if (isBodyweight(e)) return true;
  return isBand(e) && selectedEquipment.includes("bands");
}

function prepFilter(
  all: PoolExercise[],
  selectedEquipment: string[],
  dislikedIds: string[],
  match: RegExp,
  strict: boolean,
): PoolExercise[] {
  const banned = new Set(dislikedIds);
  return all.filter((e) => {
    if (banned.has(e.id)) return false;
    if (!prepEquipmentOk(e, selectedEquipment)) return false;
    if (PREP_BAN_RE.test(text(e))) return false;
    if (HOME_APPARATUS_RE.test(text(e))) return false;
    if ((e.difficulty ?? "").toLowerCase() === "advanced") return false;
    if (strict && !match.test(e.name)) return false;
    return true;
  });
}

/**
 * The only vocabulary allowed in 🔥 Activation. Built from the whole library,
 * independent of the session pool, so the section is never empty.
 */
export function buildActivationPool(
  all: PoolExercise[],
  opts: { selectedEquipment: string[]; dislikedIds?: string[] },
): PoolExercise[] {
  const disliked = opts.dislikedIds ?? [];
  const strict = prepFilter(all, opts.selectedEquipment, disliked, ACTIVATION_OK_RE, true);
  if (strict.length >= 8) return strict;
  return prepFilter(all, opts.selectedEquipment, disliked, ACTIVATION_OK_RE, false);
}

/** The only vocabulary allowed in 🧘 Cool Down: static stretches and breathing. */
export function buildCooldownPool(
  all: PoolExercise[],
  opts: { selectedEquipment: string[]; dislikedIds?: string[] },
): PoolExercise[] {
  const disliked = opts.dislikedIds ?? [];
  const strict = prepFilter(all, opts.selectedEquipment, disliked, COOLDOWN_OK_RE, true).filter(
    (e) => STRETCH_RE.test(e.name) || COOLDOWN_OK_RE.test(e.name),
  );
  if (strict.length >= 6) return strict;
  return prepFilter(all, opts.selectedEquipment, disliked, COOLDOWN_OK_RE, false);
}

/** Deterministic, rotating selection so two sessions rarely open the same way. */
export function pickPrep(pool: PoolExercise[], count: number, seed: number): PoolExercise[] {
  if (!pool.length) return [];
  const byPart = new Map<string, PoolExercise[]>();
  for (const e of pool) {
    const key = e.body_part ?? "other";
    if (!byPart.has(key)) byPart.set(key, []);
    byPart.get(key)!.push(e);
  }
  const parts = [...byPart.keys()];
  const out: PoolExercise[] = [];
  let s = Math.abs(seed) || 7;
  let guard = 0;
  while (out.length < count && guard < count * 20) {
    guard += 1;
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const part = parts[s % parts.length]!;
    const list = byPart.get(part)!;
    if (!list.length) {
      if (parts.every((p) => !byPart.get(p)!.length)) break;
      continue;
    }
    const next = list.splice(s % list.length, 1)[0]!;
    if (!out.some((e) => e.id === next.id)) out.push(next);
  }
  return out;
}


function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Balanced sample so every body part is represented in the prompt vocabulary.
 * Favourite ids are always carried through, whatever the sample size.
 */
export function samplePool(pool: PoolExercise[], max = 260, favoriteIds: string[] = []): PoolExercise[] {
  if (pool.length <= max) return pool;
  const favourites = favoriteIds.length
    ? pool.filter((e) => favoriteIds.includes(e.id))
    : [];
  const rest = pool.filter((e) => !favourites.includes(e));
  const byPart = new Map<string, PoolExercise[]>();
  for (const e of rest) {
    const key = e.body_part ?? "other";
    if (!byPart.has(key)) byPart.set(key, []);
    byPart.get(key)!.push(e);
  }
  const budget = Math.max(0, max - favourites.length);
  const per = Math.max(8, Math.ceil(budget / Math.max(1, byPart.size)));
  const out: PoolExercise[] = [];
  for (const list of byPart.values()) out.push(...shuffle(list).slice(0, per));
  return [...favourites, ...shuffle(out).slice(0, budget)];
}
