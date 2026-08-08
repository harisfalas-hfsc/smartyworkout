import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { WorkoutPlan } from "@/lib/coach-options";

export type CoachRequest = {
  goal: string;
  mood: string;
  minutes: number;
  location: string;
  equipment: string[];
  note?: string;
  surprise?: boolean;
};

type PoolExercise = {
  id: string;
  name: string;
  body_part: string | null;
  target_muscle: string | null;
  equipment: string | null;
  difficulty: string | null;
  movement_pattern: string | null;
  body_region: string | null;
  gif_path: string | null;
};

const EQUIPMENT_MAP: Record<string, string[]> = {
  bodyweight: [
    "body weight",
    "assisted",
    "assisted (towel)",
    "body weight (with resistance band)",
  ],
  dumbbells: [
    "dumbbell",
    "dumbbell, exercise ball",
    "dumbbell, exercise ball, tennis ball",
    "dumbbell (used as handles for deeper range)",
    "weighted",
  ],
  kettlebells: ["kettlebell"],
  barbell: ["barbell", "ez barbell", "olympic barbell", "trap bar", "ez barbell, exercise ball"],
  bands: ["band", "resistance band", "body weight (with resistance band)"],
  trx: ["assisted", "body weight", "rope"],
  machines: [
    "leverage machine",
    "smith machine",
    "cable",
    "sled machine",
    "elliptical machine",
    "stationary bike",
    "skierg machine",
    "stepmill machine",
    "upper body ergometer",
    "assisted",
  ],
  other: [
    "stability ball",
    "medicine ball",
    "bosu ball",
    "roller",
    "wheel roller",
    "rope",
    "tire",
    "hammer",
  ],
};

export function resolveEquipment(selected: string[]): string[] | null {
  if (!selected.length || selected.includes("fullgym")) return null; // null = no filter
  const set = new Set<string>();
  for (const s of selected) for (const e of EQUIPMENT_MAP[s] ?? []) set.add(e);
  if (!set.size) return null;
  return Array.from(set);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export async function loadPool(
  supabase: SupabaseClient,
  equipment: string[] | null,
  disliked: string[],
): Promise<PoolExercise[]> {
  let query = supabase
    .from("exercises")
    .select(
      "id,name,body_part,target_muscle,equipment,difficulty,movement_pattern,body_region,gif_path",
    )
    .eq("is_active", true)
    .limit(1500);
  if (equipment) query = query.in("equipment", equipment);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PoolExercise[];
  const dislikedSet = new Set(disliked.map((d) => d.toLowerCase()));
  const filtered = rows.filter((r) => !dislikedSet.has(r.name.toLowerCase()));

  // Balanced sample across body parts so the model always sees full-body coverage.
  const byPart = new Map<string, PoolExercise[]>();
  for (const r of filtered) {
    const key = r.body_part ?? "other";
    if (!byPart.has(key)) byPart.set(key, []);
    byPart.get(key)!.push(r);
  }
  const perPart = Math.max(12, Math.ceil(200 / Math.max(1, byPart.size)));
  const sample: PoolExercise[] = [];
  for (const list of byPart.values()) sample.push(...shuffle(list).slice(0, perPart));
  return shuffle(sample).slice(0, 240);
}

const CATEGORY_RULES: Record<string, string> = {
  strength:
    "Format SETS & REPS. Compound primary movement first, then secondary, then accessory, then core. 3-5 sets, 3-6 reps for primary, controlled tempo, 90-180s rest. Never a random circuit.",
  muscle:
    "Hypertrophy. Format SETS & REPS. 3-4 sets of 8-15 reps, controlled tempo (e.g. 3-1-1), 60-90s rest, balanced muscle groups, sequenced big to small. It must feel like resistance training, not cardio.",
  cardio:
    "Cardiovascular objective. Choose INTERVALS, EMOM, FOR TIME, CIRCUIT, AMRAP or TABATA. Clear work/rest, sustained heart rate, respect impact level and fitness level.",
  metabolic:
    "Strength + conditioning blend. Choose CIRCUIT, EMOM, AMRAP, FOR TIME, TABATA or INTERVALS. Sequence strength move -> conditioning move -> core/locomotion. Avoid repeating one movement pattern.",
  calorie:
    "High energy expenditure. Choose CIRCUIT, AMRAP, EMOM, FOR TIME, TABATA or INTERVALS. Large muscle groups, multi-joint, continuous movement, sustainable work periods. Never promise a calorie number; if you mention calories, call it an estimate.",
  mobility:
    "Mobility & Stability. Format CONTROLLED BLOCKS / SETS & REPS. Joint mobility, range of motion, balance, core control, breathing. Calm and purposeful — never high intensity conditioning.",
  challenge:
    "Gamified CHALLENGE. Pick one concept: Score, Time, Rep, Ladder, Countdown, Accumulation, Personal Best, Survival, Random, Mission or Streak challenge. Must be measurable with a clear target/score so the user knows if they beat it. Do NOT use plain bodybuilding sets & reps. Be competitive and playful.",
  pilates:
    "Pilates session. Core control, posture, breathing, stability, precision, controlled tempo, deliberate sequencing (warm activation -> core series -> stability -> stretch). Not a generic mobility routine.",
  micro:
    "MICRO WORKOUT. Maximum stimulus in minimal time. No long warm-up. Few, high-value multi-joint movements, dense format, complete mini-session feel.",
  fullbody:
    "Balanced full body: push, pull, squat/hinge, core. Format SETS & REPS or CIRCUIT depending on time.",
  custom: "Follow the user's custom request while staying safe and coherent.",
};

const MOOD_RULES: Record<string, string> = {
  energized: "Higher demand, more volume/intensity.",
  good: "Standard demanding session.",
  normal: "Standard session.",
  tired: "Intelligent lower load: less volume, longer rest, lower complexity, still worthwhile.",
  stressed: "Controlled session: movement quality, breathing, mobility, manageable intensity.",
  low: "Short wins, simple exercises, motivating tone, easy entry.",
  sore: "Avoid heavy loading of likely sore areas, favour blood flow, mobility and low impact.",
  fun: "Make it playful and gamified with a score or game element.",
  push: "Make it genuinely hard but safe and well structured.",
};

function starsFor(level?: string | null) {
  const l = (level ?? "").toLowerCase();
  if (l.includes("begin")) return "1-2";
  if (l.includes("adv")) return "5-6";
  return "3-4";
}

export function buildPrompt(opts: {
  req: CoachRequest;
  profile: Record<string, unknown> | null;
  history: Array<Record<string, unknown>>;
  feedback: Array<Record<string, unknown>>;
  pool: PoolExercise[];
}) {
  const { req, profile, history, feedback, pool } = opts;
  const p = (profile ?? {}) as Record<string, any>;
  const poolText = pool
    .map(
      (e) =>
        `${e.id}|${e.name}|${e.body_part ?? "-"}|${e.target_muscle ?? "-"}|${e.equipment ?? "-"}|${e.movement_pattern ?? "-"}|${e.difficulty ?? "-"}`,
    )
    .join("\n");

  const historyText = history.length
    ? history
        .map(
          (h: any) =>
            `- ${new Date(h.created_at).toISOString().slice(0, 10)} | ${h.category} | ${h.name} | ${h.focus ?? ""} | ${h.duration_min}min | ${h.status}`,
        )
        .join("\n")
    : "No previous workouts yet.";

  const feedbackText = feedback.length
    ? feedback
        .map(
          (f: any) =>
            `- difficulty: ${f.difficulty_rating ?? "-"}, felt: ${f.feeling ?? "-"}, enjoyed: ${f.enjoyed ?? "-"}, repeat: ${f.would_repeat ?? "-"}${f.comment ? `, note: ${f.comment}` : ""}`,
        )
        .join("\n")
    : "No feedback yet.";

  const system = `You are Smarty Coach, an experienced professional strength & conditioning coach inside the Smarty Workout app.
You are intelligent, motivating, concise, confident, friendly, practical and occasionally playful. You coach — you never just dump a list of exercises.

ABSOLUTE RULES
1. You may ONLY use exercises from the APPROVED EXERCISE LIBRARY provided below, referenced by their exact id and name. Never invent an exercise.
2. Every exercise must be possible with the user's available equipment and location.
3. The total workout must realistically fit the requested duration (including any warm-up/finisher you include).
4. The workout must genuinely belong to the requested category and follow that category's programming philosophy.
5. Difficulty must match the user's level, mood and recent training load.
6. Sequence exercises logically and avoid over-repeating a movement pattern unless intentional.
7. Respect stated limitations/injuries and disliked exercises.
8. Give enough detail that the user can train without asking anything else.
Validate your workout against these rules before answering; fix it silently if it fails.

OUTPUT: strict JSON only, no markdown fences, this exact shape:
{
  "name": string,
  "category": string,
  "format": string,
  "focus": string,
  "difficulty_stars": 1-6,
  "duration_min": number,
  "equipment": string[],
  "description": string,
  "instructions": string,
  "tips": string[],
  "rationale": string,
  "plan": { "blocks": [ { "title": string, "format": string, "rounds": string|null, "instructions": string|null,
     "items": [ { "exercise_id": string, "name": string, "sets": string|null, "reps": string|null, "duration": string|null, "tempo": string|null, "rest": string|null, "notes": string|null } ] } ] }
}
"rationale" is a short coach message (2-4 sentences) explaining why THIS workout, today, for THIS person.`;

  const user = `TODAY'S REQUEST
Category: ${req.goal}${req.surprise ? " (chosen by you via Surprise Me — pick the most appropriate category and say why in the rationale)" : ""}
Mood: ${req.mood} — ${MOOD_RULES[req.mood] ?? ""}
Available time: ${req.minutes} minutes
Location: ${req.location}
Equipment: ${req.equipment.join(", ") || "bodyweight"}
${req.note ? `User note: ${req.note}` : ""}

CATEGORY PHILOSOPHY
${CATEGORY_RULES[req.goal] ?? CATEGORY_RULES["fullbody"]}

USER PROFILE
Name: ${p.display_name ?? "-"} | Age: ${p.age ?? "-"} | Gender: ${p.gender ?? "-"} | Height: ${p.height_cm ?? "-"}cm | Weight: ${p.weight_kg ?? "-"}kg
Experience: ${p.experience ?? "-"} | Fitness level: ${p.fitness_level ?? "-"} (target ${starsFor(p.fitness_level)} stars)
Goals: ${p.primary_goal ?? "-"} / ${p.secondary_goal ?? "-"} | Trains ${p.training_frequency ?? "-"}x per week, usually ${p.typical_duration_min ?? "-"} min
Favourite exercises: ${(p.favorite_exercises ?? []).join(", ") || "-"}
Disliked exercises: ${(p.disliked_exercises ?? []).join(", ") || "-"}
Limitations/injuries: ${(p.limitations ?? []).join(", ") || "none"}

RECENT WORKOUTS (most recent first)
${historyText}

RECENT FEEDBACK
${feedbackText}
If the user repeatedly says "too easy", raise difficulty. If "hard"/"very hard" repeatedly, reduce it.

APPROVED EXERCISE LIBRARY (id|name|body part|target|equipment|pattern|difficulty)
${poolText}

Return the JSON now.`;

  return { system, user };
}

function stripFences(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Smarty Coach returned an unreadable workout. Please try again.");
  }
}

export function validateWorkout(raw: any, pool: PoolExercise[], req: CoachRequest) {
  const byId = new Map(pool.map((e) => [e.id, e]));
  const byName = new Map(pool.map((e) => [e.name.toLowerCase(), e]));
  const blocks = Array.isArray(raw?.plan?.blocks) ? raw.plan.blocks : [];
  let total = 0;
  const cleanBlocks = blocks
    .map((b: any) => {
      const items = (Array.isArray(b?.items) ? b.items : [])
        .map((it: any) => {
          const match =
            byId.get(String(it?.exercise_id ?? "")) ??
            byName.get(String(it?.name ?? "").toLowerCase());
          if (!match) return null;
          total += 1;
          return {
            exercise_id: match.id,
            name: match.name,
            gif_path: match.gif_path,
            sets: it?.sets ?? null,
            reps: it?.reps ?? null,
            duration: it?.duration ?? null,
            tempo: it?.tempo ?? null,
            rest: it?.rest ?? null,
            notes: it?.notes ?? null,
          };
        })
        .filter(Boolean);
      return items.length ? { ...b, items } : null;
    })
    .filter(Boolean);

  const stars = Math.min(6, Math.max(1, Number(raw?.difficulty_stars) || 3));
  return {
    ok: total >= Math.min(3, req.minutes >= 10 ? 3 : 2) && cleanBlocks.length > 0,
    workout: {
      name: String(raw?.name ?? "Smarty Workout").slice(0, 120),
      category: String(raw?.category ?? req.goal),
      format: raw?.format ?? null,
      focus: raw?.focus ?? null,
      difficulty_stars: stars,
      duration_min: Number(raw?.duration_min) || req.minutes,
      equipment: Array.isArray(raw?.equipment) ? raw.equipment.map(String) : req.equipment,
      description: raw?.description ?? null,
      instructions: raw?.instructions ?? null,
      tips: Array.isArray(raw?.tips) ? raw.tips.map(String) : [],
      rationale: raw?.rationale ?? null,
      plan: { blocks: cleanBlocks } as WorkoutPlan,
    },
  };
}

export async function askCoach(system: string, user: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Smarty Coach is not configured yet.");
  const gateway = createLovableAiGatewayProvider(key);
  const { text } = await generateText({
    model: gateway("google/gemini-3.6-flash"),
    system,
    prompt: user,
  });
  return stripFences(text);
}
