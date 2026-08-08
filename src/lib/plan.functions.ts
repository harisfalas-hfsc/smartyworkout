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
  daysPerWeek: number;
  sessionMinutes: number; // exact target
  sessionTolerance: number; // ±minutes per session
  avoidMovements: string[]; // lower-cased tokens
  trainingStyle: string;
  experience: string;
  environment: string;
  equipment: string[];
  focusAreas: string[];
  goal: string;
  weeks: number;
}

interface RefinementConstraints {
  daysPerWeek?: number;
  avoidMovements?: string[];
  includeMoreMovements?: string[];
  sessionMinutesDelta?: number;
  sessionMinutes?: number;
  trainingStyle?: string;
  notes?: string;
}

function normalizeToken(s: string) {
  return s.toLowerCase().trim();
}

function buildBaseRules(q: any, weeks: number): StrictRules {
  const training = q?.training ?? {};
  const goal = q?.goal ?? {};
  const constraints = q?.constraints ?? {};

  const daysPerWeek = Math.max(1, Math.min(7, Number(training.daysPerWeek) || 3));
  const sessionMinutes = Math.max(15, Math.min(150, Number(training.sessionMinutes) || 45));

  const disliked: string[] = [
    ...((training.dislikedExercises as string[]) ?? []),
    ...String(training.dislikedExercisesOther ?? "").split(","),
  ]
    .map(normalizeToken)
    .filter(Boolean);

  const injuryMap: Record<string, string[]> = {
    "lower back": ["deadlift", "good morning", "barbell row", "sit-up"],
    knee: ["deep squat", "jump squat", "box jump", "lunge jump"],
    shoulder: ["overhead press", "upright row", "behind the neck press", "dip"],
    wrist: ["front rack", "handstand", "push-up on floor"],
    hip: ["deep squat", "sumo deadlift"],
    ankle: ["box jump", "sprint"],
    neck: ["behind the neck press", "heavy shrug"],
    elbow: ["skullcrusher", "dip"],
    hernia: ["heavy deadlift", "valsalva heavy lift"],
    "heart condition": ["max effort sprint", "all-out hiit"],
  };
  const injuryTags: string[] = ((training.injuryTags as string[]) ?? []).filter(
    (t) => t && t !== "none",
  );
  const injuryExcludes = injuryTags.flatMap((t) => injuryMap[t] ?? [t]);
  const injuryFree = String(training.injuries ?? "")
    .split(",")
    .map(normalizeToken)
    .filter(Boolean);

  const avoidTags: string[] = [
    ...((training.avoidTags as string[]) ?? []),
    ...String(training.avoidTagsOther ?? "").split(","),
  ]
    .map(normalizeToken)
    .filter(Boolean);

  const avoidMovements = Array.from(
    new Set([...disliked, ...injuryExcludes, ...injuryFree, ...avoidTags].map(normalizeToken)),
  ).filter(Boolean);

  const trainingStyle =
    training.trainingStyle === "other"
      ? String(training.trainingStyleOther || "custom")
      : String(training.trainingStyle || "full_body");

  return {
    daysPerWeek,
    sessionMinutes,
    sessionTolerance: 10,
    avoidMovements,
    trainingStyle,
    experience: String(constraints.experience || "beginner"),
    environment: String(constraints.environment || "gym"),
    equipment: ((constraints.equipment as string[]) ?? []).map(String),
    focusAreas: ((goal.focusAreas as string[]) ?? []).map(String),
    goal: String(goal.goal || "maintenance"),
    weeks,
  };
}

function mergeConstraints(base: StrictRules, extra: RefinementConstraints): StrictRules {
  const merged: StrictRules = { ...base };
  if (extra.daysPerWeek && extra.daysPerWeek >= 1 && extra.daysPerWeek <= 7) {
    merged.daysPerWeek = extra.daysPerWeek;
  }
  if (extra.sessionMinutes && extra.sessionMinutes >= 15) {
    merged.sessionMinutes = extra.sessionMinutes;
  } else if (extra.sessionMinutesDelta) {
    merged.sessionMinutes = Math.max(15, merged.sessionMinutes + extra.sessionMinutesDelta);
  }
  if (extra.trainingStyle) merged.trainingStyle = extra.trainingStyle;
  if (extra.avoidMovements?.length) {
    merged.avoidMovements = Array.from(
      new Set([...merged.avoidMovements, ...extra.avoidMovements.map(normalizeToken)]),
    );
  }
  return merged;
}

export interface ValidationIssue {
  day: number;
  weekNumber: number;
  kind: "duration" | "day_count" | "excluded_movement" | "exercise_count";
  detail: string;
}

export function validatePlan(plan: any, rules: StrictRules): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const weeks = plan?.weeks ?? [];
  for (const w of weeks) {
    const wn = Number(w.weekNumber) || 0;
    const days = w.days ?? [];
    const trainingDays = days.filter((d: any) => !d.rest && (d.exercises ?? []).length > 0);
    if (trainingDays.length !== rules.daysPerWeek) {
      issues.push({
        day: 0,
        weekNumber: wn,
        kind: "day_count",
        detail: `Week ${wn} has ${trainingDays.length} training days; required exactly ${rules.daysPerWeek}.`,
      });
    }
    for (const d of trainingDays) {
      const day = Number(d.day) || 0;
      const exercises = d.exercises ?? [];
      if (exercises.length < 3) {
        issues.push({
          day,
          weekNumber: wn,
          kind: "exercise_count",
          detail: `Week ${wn} Day ${day} has only ${exercises.length} exercises; give at least 3.`,
        });
      }
      const dur = Number(d.durationMin) || 0;
      if (Math.abs(dur - rules.sessionMinutes) > rules.sessionTolerance) {
        issues.push({
          day,
          weekNumber: wn,
          kind: "duration",
          detail: `Week ${wn} Day ${day} lasts ${dur} min; must be ${rules.sessionMinutes}±${rules.sessionTolerance} min.`,
        });
      }
      for (const ex of exercises) {
        const hay = `${ex.name ?? ""} ${ex.notes ?? ""}`.toLowerCase();
        for (const bad of rules.avoidMovements) {
          if (!bad) continue;
          if (hay.includes(bad)) {
            issues.push({
              day,
              weekNumber: wn,
              kind: "excluded_movement",
              detail: `Week ${wn} Day ${day} exercise "${ex.name}" contains banned "${bad}".`,
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
  return `You are SmartyWorkout, an evidence-based training assistant. You build safe, practical, personalized workout plans.

ABSOLUTE HARD RULES (non-negotiable — a plan violating any of these is REJECTED):
1. Every week must contain EXACTLY ${rules.daysPerWeek} training day(s). Remaining days of the week are rest/active-recovery days (rest: true, no exercises).
2. Every training session must last ${rules.sessionMinutes} minutes within ±${rules.sessionTolerance} minutes, including warm-up and cool-down. Estimate honestly from sets × reps × rest.
3. The following movements are FORBIDDEN and must not appear in any exercise name or notes (case-insensitive substring): ${rules.avoidMovements.length ? rules.avoidMovements.join(", ") : "(none)"}.
4. Training style: ${rules.trainingStyle}. Experience: ${rules.experience}. Environment: ${rules.environment}. Available equipment: ${rules.equipment.length ? rules.equipment.join(", ") : "bodyweight only"} — never program an exercise requiring unavailable equipment.
5. Goal: ${rules.goal}.${rules.focusAreas.length ? ` Extra weekly volume on: ${rules.focusAreas.join(", ")} — but keep the whole body trained.` : ""}
6. Sets, reps, rest seconds and RPE must be concrete numbers appropriate for the experience level. Include short form cues per exercise.
7. Progressive overload across weeks — each week should progress load, reps, or density; explain the progression in the week note.
8. At least 3 exercises per session, each with a warm-up and a cool-down block.
9. Include a short rationale explaining WHY this plan fits the user's goal.
10. End with a disclaimer: not medical advice; consult a professional for medical conditions or injuries.

TIME DISCIPLINE: Before returning JSON, estimate each session's duration yourself and adjust sets/rest so it lands within ±${rules.sessionTolerance} of ${rules.sessionMinutes} minutes. Do not approximate.

OUTPUT: Return STRICTLY valid JSON matching:
type Plan = {
  summary: { daysPerWeek: number; sessionMinutes: number; trainingStyle: string; goal: string; weeklyVolume: { pushSets: number; pullSets: number; legSets: number; coreSets: number } };
  weeks: Array<{
    weekNumber: number;
    note: string;
    days: Array<{
      day: number;
      rest?: boolean;
      focus: string;
      durationMin: number;
      warmup: string;
      exercises: Array<{
        name: string; sets: number; reps: string; restSeconds: number;
        rpe?: string; tempo?: string; muscleGroup: string; notes: string;
      }>;
      cooldown: string;
    }>;
    equipmentList: Array<{ item: string; note?: string }>;
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
    `Duration: ${rules.weeks} week(s). Training days/week: ${rules.daysPerWeek}. Session length: ${rules.sessionMinutes} min (±${rules.sessionTolerance}).`,
    `Forbidden movements: ${rules.avoidMovements.length ? rules.avoidMovements.join(", ") : "none"}.`,
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
    system: `Extract explicit, actionable training constraints from a user's refinement request. Return STRICT JSON only:
{
  "daysPerWeek": number | null,
  "avoidMovements": string[] | null,
  "includeMoreMovements": string[] | null,
  "sessionMinutesDelta": number | null,
  "sessionMinutes": number | null,
  "trainingStyle": string | null,
  "notes": string | null
}
Rules:
- "train 4 times a week" => daysPerWeek: 4.
- "no running" / "no deadlifts" => add those to avoidMovements.
- "shorter sessions" => sessionMinutesDelta: -15. "45 minute workouts" => sessionMinutes: 45.
- "more upper body" => notes: "increase upper body volume".
- "push pull legs" => trainingStyle: "push_pull_legs".
- Unknowns => null. JSON only, no prose.`,
    prompt: refinement,
  });
  try {
    const obj = stripFences(text);
    return {
      daysPerWeek: obj.daysPerWeek ?? undefined,
      avoidMovements: Array.isArray(obj.avoidMovements) ? obj.avoidMovements : undefined,
      includeMoreMovements: Array.isArray(obj.includeMoreMovements)
        ? obj.includeMoreMovements
        : undefined,
      sessionMinutesDelta:
        typeof obj.sessionMinutesDelta === "number" ? obj.sessionMinutesDelta : undefined,
      sessionMinutes: typeof obj.sessionMinutes === "number" ? obj.sessionMinutes : undefined,
      trainingStyle: obj.trainingStyle ?? undefined,
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
      .join("\n- ")}\n\nRe-verify training days = ${rules.daysPerWeek} and session length = ${rules.sessionMinutes}±${rules.sessionTolerance} min before responding.\n\nPrior (broken) plan:\n${JSON.stringify(plan)}`;
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

// Plans are free: a session is created directly, no checkout required.
export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { questionnaireId: string; durationWeeks: 1 | 2 | 4 }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("generation_sessions")
      .insert({
        user_id: userId,
        questionnaire_id: data.questionnaireId,
        duration_weeks: data.durationWeeks,
        status: "paid",
        credits_total: 3,
        credits_used: 0,
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
