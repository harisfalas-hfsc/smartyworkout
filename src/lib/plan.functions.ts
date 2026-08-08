import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

interface PlanResult {
  plan?: any;
  rationale?: string;
  error?: string;
  warnings?: string[];
}

// -------------------- Rules & Validation --------------------

export interface StrictRules {
  mealsPerDay: number;
  calorieTarget: number; // exact target
  calorieTolerance: number; // ±kcal per day
  excludeFoods: string[]; // lower-cased tokens
  dietStyle: string;
  goal: string;
  fastingWindow?: string;
  weeks: number;
}

interface RefinementConstraints {
  mealsPerDay?: number;
  excludeFoods?: string[];
  includeMoreFoods?: string[];
  calorieDelta?: number;
  calorieTarget?: number;
  fastingWindow?: string;
  notes?: string;
}

function normalizeToken(s: string) {
  return s.toLowerCase().trim();
}

function buildBaseRules(q: any, weeks: number): StrictRules {
  const eating = q?.eating ?? {};
  const goal = q?.goal ?? {};
  const basics = q?.basics ?? {};
  const activity = q?.activity ?? {};

  const fasting = eating.fasting ?? {};
  const isOMAD = fasting.window === "OMAD";
  const mealsPerDay: number = isOMAD ? 1 : Math.max(1, Math.min(6, Number(eating.mealsPerDay) || 3));

  // Compute default calorie target if not provided
  let calorieTarget: number | undefined = Number(goal.calorieTarget) || undefined;
  if (!calorieTarget) {
    const weight = Number(basics.weight) || 70;
    const height = Number(basics.height) || 170;
    const age = Number(basics.age) || 30;
    const male = basics.gender === "male";
    // Mifflin-St Jeor
    const bmr = male
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
    const mult =
      activity.activityLevel === "sedentary" ? 1.2 :
      activity.activityLevel === "light" ? 1.375 :
      activity.activityLevel === "active" ? 1.725 :
      activity.activityLevel === "very_active" ? 1.9 : 1.55;
    let tdee = Math.round(bmr * mult);
    if (goal.goal === "weight_loss") tdee -= 500;
    else if (goal.goal === "muscle_gain") tdee += 300;
    else if (goal.goal === "recomposition") tdee -= 200;
    // Fasting approach adjusts deficit
    if (fasting.approach === "aggressive") tdee -= 200;
    if (fasting.approach === "very_aggressive") tdee -= 400;
    calorieTarget = Math.max(1200, Math.round(tdee / 10) * 10);
  }

  const dislike: string[] = [
    ...((eating.dislikedFoods as string[]) ?? []),
    ...(String(eating.dislikedFoodsOther ?? "").split(",")),
  ]
    .map(normalizeToken)
    .filter(Boolean);

  const allergyTags: string[] = ((eating.allergyTags as string[]) ?? [])
    .filter((t) => t && t !== "none");
  const allergyMap: Record<string, string[]> = {
    nuts: ["almond", "walnut", "cashew", "pecan", "hazelnut", "pistachio", "nut"],
    peanuts: ["peanut"],
    "dairy/lactose": ["milk", "yogurt", "cheese", "butter", "cream", "dairy"],
    gluten: ["wheat", "bread", "pasta", "flour", "barley", "rye", "gluten"],
    eggs: ["egg"],
    shellfish: ["shrimp", "prawn", "crab", "lobster", "shellfish"],
    fish: ["fish", "tuna", "salmon", "cod", "sardine", "anchovy"],
    soy: ["soy", "tofu", "edamame"],
    sesame: ["sesame", "tahini"],
  };
  const allergyExcludes = allergyTags.flatMap((t) => allergyMap[t] ?? [t]);
  const allergyFree = String(eating.allergies ?? "").split(",").map(normalizeToken).filter(Boolean);
  const culturalMap: Record<string, string[]> = {
    "no pork": ["pork", "bacon", "ham", "prosciutto"],
    "no beef": ["beef", "steak"],
    "no alcohol": ["wine", "beer", "alcohol"],
  };
  const cultural = ((eating.culturalRestrictions as string[]) ?? []).flatMap(
    (t) => culturalMap[t] ?? [t],
  );

  const excludeFoods = Array.from(
    new Set([...dislike, ...allergyExcludes, ...allergyFree, ...cultural]),
  );

  const dietStyle =
    eating.dietStyle === "other" ? String(eating.dietStyleOther || "custom") : String(eating.dietStyle || "balanced");

  return {
    mealsPerDay,
    calorieTarget,
    calorieTolerance: 25,
    excludeFoods,
    dietStyle,
    goal: String(goal.goal || "maintenance"),
    fastingWindow: fasting.window
      ? fasting.window === "custom"
        ? String(fasting.customWindow || "custom")
        : String(fasting.window)
      : undefined,
    weeks,
  };
}

function mergeConstraints(base: StrictRules, extra: RefinementConstraints): StrictRules {
  const merged: StrictRules = { ...base };
  if (extra.mealsPerDay && extra.mealsPerDay >= 1 && extra.mealsPerDay <= 6) {
    merged.mealsPerDay = extra.mealsPerDay;
  }
  if (extra.calorieTarget && extra.calorieTarget > 500) {
    merged.calorieTarget = extra.calorieTarget;
  } else if (extra.calorieDelta) {
    merged.calorieTarget = Math.max(1000, merged.calorieTarget + extra.calorieDelta);
  }
  if (extra.fastingWindow) merged.fastingWindow = extra.fastingWindow;
  if (extra.excludeFoods?.length) {
    merged.excludeFoods = Array.from(
      new Set([...merged.excludeFoods, ...extra.excludeFoods.map(normalizeToken)]),
    );
  }
  return merged;
}

export interface ValidationIssue {
  day: number;
  weekNumber: number;
  kind: "calorie" | "meal_count" | "excluded_food";
  detail: string;
}

export function validatePlan(plan: any, rules: StrictRules): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const weeks = plan?.weeks ?? [];
  for (const w of weeks) {
    const wn = Number(w.weekNumber) || 0;
    for (const d of w.days ?? []) {
      const day = Number(d.day) || 0;
      const meals = d.meals ?? [];
      if (meals.length !== rules.mealsPerDay) {
        issues.push({
          day,
          weekNumber: wn,
          kind: "meal_count",
          detail: `Week ${wn} Day ${day} has ${meals.length} meals; required ${rules.mealsPerDay}.`,
        });
      }
      const sum = meals.reduce((a: number, m: any) => a + (Number(m.calories) || 0), 0);
      if (Math.abs(sum - rules.calorieTarget) > rules.calorieTolerance) {
        issues.push({
          day,
          weekNumber: wn,
          kind: "calorie",
          detail: `Week ${wn} Day ${day} totals ${sum} kcal; must be ${rules.calorieTarget}±${rules.calorieTolerance}.`,
        });
      }
      for (const m of meals) {
        const hay = [
          m.title,
          ...(m.ingredients ?? []).map((i: any) => `${i.qty} ${i.item}`),
        ]
          .join(" ")
          .toLowerCase();
        for (const bad of rules.excludeFoods) {
          if (!bad) continue;
          if (hay.includes(bad)) {
            issues.push({
              day,
              weekNumber: wn,
              kind: "excluded_food",
              detail: `Week ${wn} Day ${day} meal "${m.title}" contains banned "${bad}".`,
            });
          }
        }
      }
    }
  }
  return issues;
}

// -------------------- Prompt building --------------------

function buildSystemPrompt(rules: StrictRules) {
  return `You are SmartyWorkout, an evidence-based nutrition assistant. You build safe, practical, personalized diet plans.

ABSOLUTE HARD RULES (non-negotiable — a plan violating any of these is REJECTED):
1. Every day must contain EXACTLY ${rules.mealsPerDay} meal(s). No more, no less. No extra snacks.
2. Every day's total calories must equal ${rules.calorieTarget} kcal within ±${rules.calorieTolerance} kcal. Do the arithmetic; sum of meal calories per day MUST land in that range.
3. The following foods/ingredients are FORBIDDEN and must not appear in any meal title or ingredients (case-insensitive substring): ${rules.excludeFoods.length ? rules.excludeFoods.join(", ") : "(none)"}.
4. Diet style: ${rules.dietStyle}. Goal: ${rules.goal}.${rules.fastingWindow ? ` Fasting window: ${rules.fastingWindow} — all meals must fit inside the eating window; no eating outside it.` : ""}
5. Portion sizes must be numeric and realistic. Include short prep instructions per meal.
6. Weekly variety — avoid repeating identical meals more than twice per week.
7. Provide a consolidated grocery list per week.
8. Include a short rationale explaining WHY this plan fits the user's goal.
9. End with a disclaimer: not medical advice; consult a professional for medical conditions.

MATH DISCIPLINE: Before returning JSON, sum each day's meal calories yourself and adjust portion sizes so the total lands within ±${rules.calorieTolerance} of ${rules.calorieTarget}. Do not approximate.

OUTPUT: Return STRICTLY valid JSON matching:
type Plan = {
  summary: { calorieTarget: number; macros: { protein_g: number; carbs_g: number; fat_g: number }; dietStyle: string; goal: string };
  weeks: Array<{
    weekNumber: number;
    days: Array<{
      day: number;
      totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
      meals: Array<{
        name: string; time?: string; title: string;
        ingredients: Array<{ item: string; qty: string }>;
        calories: number; protein_g: number; carbs_g: number; fat_g: number;
        instructions: string;
      }>;
    }>;
    groceryList: Array<{ item: string; qty: string; category?: string }>;
  }>;
  rationale: string;
  disclaimer: string;
};
No markdown, no code fences, JSON only.`;
}

function buildUserPrompt(
  q: any,
  rules: StrictRules,
  refinement?: string,
  previousPlan?: any,
) {
  const parts = [
    `Duration: ${rules.weeks} week(s). Meals/day: ${rules.mealsPerDay}. Calorie target: ${rules.calorieTarget} kcal/day (±${rules.calorieTolerance}).`,
    `Excluded foods: ${rules.excludeFoods.length ? rules.excludeFoods.join(", ") : "none"}.`,
    `Questionnaire:\n${JSON.stringify(q, null, 2)}`,
  ];
  if (previousPlan && refinement) {
    parts.push(
      `REFINEMENT REQUEST (must override earlier answers when they conflict): "${refinement}"`,
      `Prior plan for reference:\n${JSON.stringify(previousPlan)}`,
    );
  }
  return parts.join("\n\n");
}

// -------------------- AI helpers --------------------

function stripFences(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
    throw new Error("AI returned invalid JSON");
  }
}

async function askModel(system: string, user: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const gateway = createLovableAiGatewayProvider(key);
  const { text } = await generateText({
    model: gateway("google/gemini-2.5-flash"),
    system,
    prompt: user,
  });
  return stripFences(text);
}

async function extractRefinementConstraints(refinement: string): Promise<RefinementConstraints> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return {};
  const gateway = createLovableAiGatewayProvider(key);
  const { text } = await generateText({
    model: gateway("google/gemini-2.5-flash"),
    system: `Extract explicit, actionable diet constraints from a user's refinement request. Return STRICT JSON only:
{
  "mealsPerDay": number | null,
  "excludeFoods": string[] | null,
  "includeMoreFoods": string[] | null,
  "calorieDelta": number | null,
  "calorieTarget": number | null,
  "fastingWindow": "16:8"|"18:6"|"20:4"|"OMAD"|null,
  "notes": string | null
}
Rules:
- "one meal a day", "OMAD", "only one meal" => mealsPerDay: 1, fastingWindow: "OMAD".
- "two meals" => mealsPerDay: 2.
- "less dairy", "no dairy" => excludeFoods: ["dairy","milk","yogurt","cheese"].
- "no fish"/"no salmon" => add those to excludeFoods.
- "more protein" => notes: "increase protein macro".
- "1800 kcal" => calorieTarget: 1800.
- "-200 kcal" => calorieDelta: -200.
- Unknowns => null. JSON only, no prose.`,
    prompt: refinement,
  });
  try {
    const obj = stripFences(text);
    return {
      mealsPerDay: obj.mealsPerDay ?? undefined,
      excludeFoods: Array.isArray(obj.excludeFoods) ? obj.excludeFoods : undefined,
      includeMoreFoods: Array.isArray(obj.includeMoreFoods) ? obj.includeMoreFoods : undefined,
      calorieDelta: typeof obj.calorieDelta === "number" ? obj.calorieDelta : undefined,
      calorieTarget: typeof obj.calorieTarget === "number" ? obj.calorieTarget : undefined,
      fastingWindow: obj.fastingWindow ?? undefined,
      notes: obj.notes ?? undefined,
    };
  } catch {
    return {};
  }
}

async function generateWithRepair(
  q: any,
  rules: StrictRules,
  refinement?: string,
  previousPlan?: any,
): Promise<{ plan: any; issues: ValidationIssue[] }> {
  const system = buildSystemPrompt(rules);
  let plan = await askModel(system, buildUserPrompt(q, rules, refinement, previousPlan));
  let issues = validatePlan(plan, rules);
  for (let pass = 0; pass < 2 && issues.length; pass++) {
    const fixMsg = `Your previous plan violated hard rules. Fix ALL of these and return the corrected full JSON plan (same shape). Do not introduce new violations.\n\nViolations:\n- ${issues
      .slice(0, 20)
      .map((i) => i.detail)
      .join("\n- ")}\n\nRe-verify meal count = ${rules.mealsPerDay} and daily calories = ${rules.calorieTarget}±${rules.calorieTolerance} before responding.\n\nPrior (broken) plan:\n${JSON.stringify(plan)}`;
    plan = await askModel(system, fixMsg);
    issues = validatePlan(plan, rules);
  }
  return { plan, issues };
}

// -------------------- Server functions --------------------

export const saveQuestionnaire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id?: string; data: any; durationWeeks?: 1 | 2 | 4; status?: "draft" | "submitted" }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { error } = await supabase
        .from("questionnaires")
        .update({
          data: data.data,
          duration_weeks: data.durationWeeks ?? null,
          status: data.status ?? "draft",
        })
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("questionnaires")
      .insert({
        user_id: userId,
        data: data.data,
        duration_weeks: data.durationWeeks ?? null,
        status: data.status ?? "draft",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; refinement?: string }) => input)
  .handler(async ({ data, context }): Promise<PlanResult> => {
    const { supabase, userId } = context;
    const { data: session, error: sErr } = await supabase
      .from("generation_sessions")
      .select("id,questionnaire_id,duration_weeks,status,credits_total,credits_used")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .single();
    if (sErr || !session) return { error: "Session not found" };
    if (session.status !== "paid") return { error: "Session not paid yet" };

    if (!data.refinement) {
      const { data: existingPlan } = await supabase
        .from("workout_plans")
        .select("plan,rationale")
        .eq("session_id", session.id)
        .eq("user_id", userId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingPlan?.plan) {
        const savedPlan = existingPlan.plan as any;
        return {
          plan: savedPlan,
          rationale: existingPlan.rationale ?? savedPlan?.rationale,
          warnings: savedPlan?._warnings ?? [],
        };
      }
    }

    if ((session.credits_used ?? 0) >= (session.credits_total ?? 3))
      return { error: "No credits remaining" };

    const { data: q, error: qErr } = await supabase
      .from("questionnaires")
      .select("data")
      .eq("id", session.questionnaire_id)
      .eq("user_id", userId)
      .single();
    if (qErr || !q) return { error: "Questionnaire not found" };

    let rules = buildBaseRules(q.data, session.duration_weeks);

    let previousPlan: any | undefined;
    if (data.refinement) {
      const { data: prev } = await supabase
        .from("workout_plans")
        .select("plan,version")
        .eq("session_id", session.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      previousPlan = prev?.plan;
      const extra = await extractRefinementConstraints(data.refinement);
      rules = mergeConstraints(rules, extra);
    }

    try {
      const { plan, issues } = await generateWithRepair(q.data, rules, data.refinement, previousPlan);

      const { data: existing } = await supabase
        .from("workout_plans")
        .select("id")
        .eq("session_id", session.id);
      const version = (existing?.length ?? 0) + 1;

      const newCreditsUsed = (session.credits_used ?? 0) + 1;
      const isFinal = newCreditsUsed >= (session.credits_total ?? 3);

      await supabase.from("workout_plans").update({ is_final: false }).eq("session_id", session.id);

      const warnings = issues.slice(0, 10).map((i) => i.detail);
      const planToSave = { ...plan, _warnings: warnings };

      const { error: insErr } = await supabase.from("workout_plans").insert({
        user_id: userId,
        session_id: session.id,
        version,
        plan: planToSave,
        rationale: plan?.rationale ?? null,
        refinement_note: data.refinement ?? null,
        is_final: isFinal,
      });
      if (insErr) return { error: insErr.message };

      await supabase
        .from("generation_sessions")
        .update({ credits_used: newCreditsUsed })
        .eq("id", session.id);

      return { plan: planToSave, rationale: plan?.rationale, warnings };
    } catch (err: any) {
      return { error: err?.message ?? "AI generation failed" };
    }
  });

// Fetch all versions for a session
export const listPlanVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("workout_plans")
      .select("id,version,plan,rationale,refinement_note,is_final,created_at")
      .eq("session_id", data.sessionId)
      .eq("user_id", userId)
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Restore a previous version as the active (is_final) — does NOT consume a credit
export const restorePlanVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; version: number }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify ownership
    const { data: target } = await supabase
      .from("workout_plans")
      .select("id")
      .eq("session_id", data.sessionId)
      .eq("user_id", userId)
      .eq("version", data.version)
      .maybeSingle();
    if (!target) throw new Error("Version not found");
    await supabase
      .from("workout_plans")
      .update({ is_final: false })
      .eq("session_id", data.sessionId)
      .eq("user_id", userId);
    const { error } = await supabase
      .from("workout_plans")
      .update({ is_final: true })
      .eq("id", target.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
