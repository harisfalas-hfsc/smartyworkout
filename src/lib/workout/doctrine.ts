// ---------------------------------------------------------------------------
// SMARTY WORKOUT — HARD PROGRAMMING DOCTRINE
//
// Deterministic legality rules shared by the pool filter, the blueprint, the
// enforcement pass and the validator. Nothing here is advisory: every function
// returns a concrete violation string that becomes a hard error upstream.
// The AI is never the final authority — this module is.
// ---------------------------------------------------------------------------

import type { Category, Format, StrengthFocus } from "./spec";

export type ExerciseLike = {
  id?: string;
  name: string;
  equipment: string | null;
  body_part?: string | null;
  target_muscle?: string | null;
};

// --- 2. Category doctrine ---------------------------------------------------

/** Quality / controlled categories — REPS & SETS only. */
export const QUALITY_CATEGORIES: Category[] = [
  "STRENGTH",
  "MUSCLE BUILDING",
  "PILATES",
  "MOBILITY & STABILITY",
];

/** Dynamic / conditioning categories. */
export const DYNAMIC_CATEGORIES: Category[] = [
  "CALORIE BURNING",
  "CARDIO",
  "METABOLIC",
  "CHALLENGE",
];

export const DYNAMIC_FORMATS: Format[] = ["TABATA", "CIRCUIT", "AMRAP", "EMOM", "FOR TIME"];

export function isDynamicFormat(format: Format): boolean {
  return DYNAMIC_FORMATS.includes(format);
}

export function isDynamicCategory(category: Category): boolean {
  return DYNAMIC_CATEGORIES.includes(category);
}

/** Categories locked to REPS & SETS by doctrine. */
export function isRepsAndSetsOnly(category: Category): boolean {
  return QUALITY_CATEGORIES.includes(category);
}

/** Pilates, Mobility & Stability, Recovery and Micro Workouts never carry a Finisher. */
export function categoryAllowsFinisher(category: Category): boolean {
  return (
    category !== "PILATES" &&
    category !== "MOBILITY & STABILITY" &&
    category !== "RECOVERY" &&
    category !== "MICRO-WORKOUTS"
  );
}

/** STRENGTH + EMOM, PILATES + AMRAP, MUSCLE BUILDING + TABATA … are invalid. */
export function categoryFormatViolation(category: Category, format: Format): string | null {
  if (isRepsAndSetsOnly(category) && format !== "REPS & SETS")
    return `${category} must be programmed as REPS & SETS — ${format} is not a legal format for this category.`;
  if (isDynamicCategory(category) && format === "MIX" && category !== "CHALLENGE")
    return `${category} cannot use the MIX format.`;
  return null;
}

// --- 11 / 12 / 13. Dynamic-format equipment legality ------------------------

/** Genuine cardio equipment: aerobic, continuous, zero setup once mounted. */
const ERGOMETER_RE =
  /\b(stationary bike|assault bike|air bike|spin bike|bike erg|rower|rowing machine|row erg|skierg|ski erg|ergometer|treadmill|elliptical|stepmill|stair ?climber|jump rope|rope|battle rope)\b/i;

/** Equipment families that require loading, racking, pins, cables or a bench. */
const SETUP_EQUIPMENT_RE =
  /\b(barbell|ez ?barbell|olympic barbell|trap bar|smith machine|cable|leverage machine|selectorized|pec deck|weighted)\b/i;

/** Movement names that are setup-, rack-, bench- or spotter-dependent. */
const SETUP_MOVEMENT_RE =
  /\b(bench press|jm press|jm bench|guillotine|floor press|rack|power rack|squat rack|pin press|back squat|front squat|full squat|hack squat|overhead squat|zercher|good morning|leg press|leg extension|leg curl machine|lying leg curl|seated leg curl|pec deck|lat pulldown|pulldown|crossover|cable fly|cable crossover|machine chest press|machine shoulder press|chest press machine|smith|spotter|clean and press|clean and jerk|power clean|hang clean|muscle snatch|one-?arm snatch|snatch|jerk|preacher curl)\b/i;

/** Machine-strength names that must never be treated as cardio. */
const MACHINE_STRENGTH_RE =
  /\b(leverage|smith|selectorized|pec deck|lat pulldown|leg press|leg extension|leg curl|machine (chest|shoulder|row|press)|cable)\b/i;

/**
 * Rule 11 + 12 + 13. In a dynamic category running a dynamic format, an
 * exercise must start immediately and repeat safely. Barbells, racks, benches,
 * cables, selectorized machines, spotters and technical Olympic lifts destroy
 * the flow and are rejected — regardless of what the athlete's equipment list
 * allows. Genuine cardio ergometers stay legal (rule 8 / 24J).
 */
export function dynamicExerciseViolation(
  e: ExerciseLike,
  category: Category,
  format: Format,
): string | null {
  if (!isDynamicCategory(category) || !isDynamicFormat(format)) return null;
  const equipment = (e.equipment ?? "").toLowerCase();
  const name = e.name.toLowerCase();
  const both = `${name} ${equipment}`;

  const isErgo = ERGOMETER_RE.test(both) && !MACHINE_STRENGTH_RE.test(name);
  if (isErgo) return null;

  if (SETUP_EQUIPMENT_RE.test(equipment))
    return `"${e.name}" uses ${e.equipment} — setup-dependent strength equipment is not legal in a ${format} ${category} session.`;
  if (SETUP_MOVEMENT_RE.test(name))
    return `"${e.name}" is a setup-, rack-, bench- or spotter-dependent movement and cannot be repeated inside a ${format}.`;
  if (MACHINE_STRENGTH_RE.test(both))
    return `"${e.name}" is machine strength work, which is not legal in a ${format} ${category} session.`;
  return null;
}

// --- 15. Micro Workout ------------------------------------------------------

const MICRO_EQUIPMENT_RE =
  /\b(dumbbell|kettlebell|barbell|band|machine|cable|smith|leverage|bike|rower|erg|treadmill|sled|rope|medicine ball|slam ball|stability ball|bosu|trx|suspension|plate|bench)\b/i;

export function microExerciseViolation(e: ExerciseLike): string | null {
  const both = `${e.name} ${e.equipment ?? ""}`.toLowerCase();
  if (!both.includes("body weight") && !/\b(chair|desk|table|wall|sofa|floor|bed)\b/.test(both))
    return `"${e.name}" is not an equipment-free movement — Micro Workouts are bodyweight and environment only.`;
  if (MICRO_EQUIPMENT_RE.test(both))
    return `"${e.name}" needs training equipment, which Micro Workouts never use.`;
  return null;
}

// --- 16. Body focus hard filter --------------------------------------------

export type FocusRule = { allow?: RegExp; deny?: RegExp; parts?: string[]; targets?: RegExp };

export const FOCUS_RULES: Record<StrengthFocus, FocusRule> = {
  "LOWER BODY": {
    parts: ["upper legs", "lower legs"],
    deny: /\b(press|push-?up|pushup|row|pull-?up|pulldown|curl|fly|dip|triceps|biceps|shoulder|chest|lat)\b/i,
  },
  "UPPER BODY": {
    parts: ["chest", "back", "shoulders", "upper arms", "lower arms"],
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
  PUSH: {
    parts: ["chest", "shoulders", "upper arms"],
    targets: /\b(pectorals|delts|triceps|serratus)\b/i,
  },
  PULL: {
    parts: ["back", "upper arms", "lower arms"],
    targets: /\b(lats|traps|upper back|biceps|forearms|rhomboids)\b/i,
  },
  CHEST: { parts: ["chest"] },
  BACK: { parts: ["back"] },
  SHOULDERS: { parts: ["shoulders"] },
  ARMS: { parts: ["upper arms", "lower arms"] },
  LEGS: { parts: ["upper legs", "lower legs"] },
};

const focusText = (e: ExerciseLike) =>
  `${e.name} ${e.target_muscle ?? ""} ${e.body_part ?? ""} ${e.equipment ?? ""}`.toLowerCase();

/** Hard focus legality — never widened because a pool ran thin. */
export function focusViolation(e: ExerciseLike, focus: StrengthFocus | null): string | null {
  if (!focus) return null;
  const rule = FOCUS_RULES[focus];
  if (rule.deny && rule.deny.test(focusText(e)))
    return `"${e.name}" is outside the requested ${focus} focus.`;
  if (rule.parts?.length) {
    const part = (e.body_part ?? "").toLowerCase().trim();
    const targetOk = rule.targets ? rule.targets.test(e.target_muscle ?? "") : false;
    if (part && !rule.parts.includes(part) && !targetOk)
      return `"${e.name}" trains ${part}, which is outside the requested ${focus} focus.`;
  }
  if (rule.allow && !rule.allow.test(focusText(e)))
    return `"${e.name}" does not belong to the requested ${focus} focus.`;
  return null;
}

// --- 14. Activation relevance ----------------------------------------------

export type BodyRegion = "lower" | "upper" | "core" | "full";

const LOWER_PARTS = new Set(["upper legs", "lower legs"]);
const UPPER_PARTS = new Set(["chest", "back", "shoulders", "upper arms", "lower arms"]);
const CORE_PARTS = new Set(["waist"]);

export function regionOf(e: ExerciseLike): BodyRegion {
  const part = (e.body_part ?? "").toLowerCase().trim();
  if (LOWER_PARTS.has(part)) return "lower";
  if (UPPER_PARTS.has(part)) return "upper";
  if (CORE_PARTS.has(part)) return "core";
  const name = e.name.toLowerCase();
  if (/\b(squat|lunge|hinge|deadlift|calf|glute|hip|step-?up|leg)\b/.test(name)) return "lower";
  if (/\b(press|row|pull|curl|fly|dip|shoulder|chest|lat)\b/.test(name)) return "upper";
  return "full";
}

/** The region a focus asks activation to prepare. */
export function focusRegion(focus: StrengthFocus | null | undefined): BodyRegion {
  switch (focus) {
    case "LOWER BODY":
    case "LEGS":
      return "lower";
    case "UPPER BODY":
    case "PUSH":
    case "PULL":
    case "CHEST":
    case "BACK":
    case "SHOULDERS":
    case "ARMS":
      return "upper";
    case "CORE & GLUTES":
      return "core";
    default:
      return "full";
  }
}

/** The dominant region actually trained by a list of main-workout exercises. */
export function dominantRegion(main: ExerciseLike[]): BodyRegion {
  const counts: Record<BodyRegion, number> = { lower: 0, upper: 0, core: 0, full: 0 };
  for (const e of main) counts[regionOf(e)] += 1;
  const total = main.length;
  if (!total) return "full";
  const ranked = (Object.keys(counts) as BodyRegion[]).sort((a, b) => counts[b] - counts[a]);
  const top = ranked[0]!;
  if (counts[top] / total < 0.5) return "full";
  return top;
}

/**
 * Activation must prepare the demand of the Main Workout. Returns a violation
 * when the majority of activation work targets a region the main block does
 * not train (for example arm-band drills before a lower-body strength day).
 */
export function activationRelevanceViolation(
  activation: ExerciseLike[],
  main: ExerciseLike[],
): string | null {
  if (activation.length < 2 || main.length < 2) return null;
  const target = dominantRegion(main);
  if (target === "full") return null;
  const relevant = activation.filter((e) => {
    const r = regionOf(e);
    return r === target || r === "full" || (target === "lower" && r === "core") || (target === "core" && r === "lower");
  }).length;
  if (relevant / activation.length < 0.5)
    return `Activation prepares the wrong region: the Main Workout is ${target}-body dominant but most activation drills are not.`;
  return null;
}

// --- 19. Time math ----------------------------------------------------------

/** Hard ceiling: a session may never materially exceed its advertised time. */
export function durationOverflowViolation(
  estimatedMinutes: number,
  targetMinutes: number,
): string | null {
  const ceiling = Math.round(targetMinutes * 1.35) + 5;
  if (estimatedMinutes > ceiling)
    return `Prescribed work (~${estimatedMinutes} min) materially exceeds the advertised ${targetMinutes} min session.`;
  return null;
}

/** Prompt text so the model sees the same doctrine the validator enforces. */
export function doctrinePrompt(category: Category, format: Format): string {
  if (isRepsAndSetsOnly(category))
    return `HARD DOCTRINE: ${category} is REPS & SETS only. Never AMRAP, EMOM, Tabata, For Time, circuit or chipper anywhere in the session.${
      categoryAllowsFinisher(category) ? "" : " This category carries NO finisher of any kind."
    }`;
  if (isDynamicCategory(category) && isDynamicFormat(format))
    return `HARD DOCTRINE: ${format} in ${category} is a continuous time/repetition format. Every movement must start immediately and repeat safely. FORBIDDEN: barbell work of any kind, bench press, back/front squat, barbell deadlift, cleans, snatches, jerks, rack- or spotter-dependent movements, Smith machine, cables and selectorized strength machines. ALLOWED: bodyweight, dumbbells, kettlebells, medicine/slam balls, TRX, bands, portable boxes, carries, jump rope and genuine cardio ergometers (bike, rower, SkiErg). Keep equipment families to a minimum so the athlete never assembles or adjusts equipment mid-workout.`;
  if (category === "MICRO-WORKOUTS")
    return `HARD DOCTRINE: Micro Workouts are equipment-free. Bodyweight plus everyday environment only (floor, wall, chair, desk, sofa). No finisher, no separate soft tissue, activation or cool down.`;
  return "";
}
