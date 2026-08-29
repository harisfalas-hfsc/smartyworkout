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

const textOf = (e: ExerciseLike) =>
  `${e.name} ${e.target_muscle ?? ""} ${e.body_part ?? ""} ${e.equipment ?? ""}`.toLowerCase();


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

/**
 * The five clock-driven formats. The machine / rack / bench / high-skill
 * restriction is a property of THESE FORMATS, never of a category: a REPS &
 * SETS session always keeps full gym access, whatever the category.
 */
export const DYNAMIC_FORMATS: Format[] = ["TABATA", "CIRCUIT", "AMRAP", "EMOM", "FOR TIME"];

export function isDynamicFormat(format: Format): boolean {
  return DYNAMIC_FORMATS.includes(format);
}

/** Alias — clock-driven == the five conditioning formats. */
export const isClockFormat = isDynamicFormat;

export function isDynamicCategory(category: Category): boolean {
  return DYNAMIC_CATEGORIES.includes(category);
}

/** Categories locked to REPS & SETS by doctrine. */
export function isRepsAndSetsOnly(category: Category): boolean {
  return (
    category === "STRENGTH" ||
    category === "MUSCLE BUILDING" ||
    category === "PILATES" ||
    category === "MOBILITY & STABILITY" ||
    category === "MICRO-WORKOUTS"
  );
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

/**
 * §4 — the authoritative legal-format table. Nothing else in the engine may
 * decide which formats a category can wear. Controlled categories are REPS &
 * SETS only; dynamic categories carry the conditioning formats; Micro Workout
 * is a movement break, never a shortened conditioning session.
 */
export const LEGAL_FORMATS: Record<Category, Format[]> = {
  STRENGTH: ["REPS & SETS"],
  "MUSCLE BUILDING": ["REPS & SETS"],
  PILATES: ["REPS & SETS"],
  "MOBILITY & STABILITY": ["REPS & SETS"],
  RECOVERY: ["MIX"],
  "MICRO-WORKOUTS": ["REPS & SETS"],

  CARDIO: ["CIRCUIT", "EMOM", "FOR TIME", "AMRAP", "TABATA"],
  METABOLIC: ["CIRCUIT", "AMRAP", "EMOM", "FOR TIME", "TABATA"],
  "CALORIE BURNING": ["CIRCUIT", "TABATA", "AMRAP", "FOR TIME", "EMOM"],
  CHALLENGE: ["CIRCUIT", "TABATA", "AMRAP", "EMOM", "FOR TIME", "MIX"],
};

export function legalFormats(category: Category): Format[] {
  return LEGAL_FORMATS[category];
}

/** STRENGTH + EMOM, PILATES + AMRAP, MUSCLE BUILDING + TABATA … are invalid. */
export function categoryFormatViolation(category: Category, format: Format): string | null {
  if (isRepsAndSetsOnly(category) && format !== "REPS & SETS")
    return `${category} must be programmed as REPS & SETS — ${format} is not a legal format for this category.`;
  if (!LEGAL_FORMATS[category].includes(format))
    return `${format} is not a legal format for ${category}.`;
  return null;
}

// --- 3 / 7 / 8 / 14. Category vocabulary doctrine ---------------------------
// One definition of what each category may never contain. The pool filter, the
// enforcement pass and the validator all read these — no parallel regex lists.

/** Stretching / mobility / yoga vocabulary — banned in CHALLENGE main work. */
export const STRETCH_RE =
  /\b(stretch|stretching|cat-?cow|cobra|sphinx|upward facing dog|downward dog|child'?s pose|pigeon|butterfly|world'?s greatest|skin the cat|inchworm|yoga|mobility|foam roll|myofascial|release)\b/i;

/** Apparatus that does not exist in a home / bodyweight setting. */
export const HOME_APPARATUS_RE =
  /\b(bar|barbell|cage|rack|machine|ring|rings|sled|parallel bars|pull-?up bar|dip bar|gymnastic|lever|smith|cable|bench press|captain'?s chair|roman chair|treadmill|elliptical|ergometer|stationary bike|skierg|stepmill|rope climb)\b/i;

/** Static holds break momentum categories. */
export const STATIC_HOLD_RE =
  /\b(hold|plank|isometric|wall sit|hollow|l-?sit|bridge hold|static)\b/i;

const PILATES_BAN_RE =
  /\b(kettlebell|barbell|machine|cable|smith|sled|jump|jumping|plyo|burpee|sprint|box jump|snatch|clean|jerk|thruster)\b/i;

/** §8 — Mobility & Stability is light: no heavy loading, no conditioning. */
const MOBILITY_BAN_RE =
  /\b(jump|jumping|plyo|burpee|sprint|snatch|clean|jerk|thruster|push-?up|pushup|crunch|sit-?up|leg raise|kettlebell|barbell|smith|leverage|sled|machine|cable|box jump|deadlift|bench press|squat rack|heavy)\b/i;

/**
 * §3 — RECOVERY is controlled recovery work: breathing, gentle mobility,
 * controlled movement, light stretching, relaxation and movement quality.
 * It may never turn into strength, conditioning, HIIT or metabolic work.
 */
const RECOVERY_BAN_RE =
  /\b(jump|jumping|plyo|burpee|sprint|snatch|clean|jerk|thruster|crunch|sit-?up|deadlift|bench press|heavy|barbell|kettlebell|machine|cable|smith|leverage|sled|swing|box jump|mountain climber|high knee|skater|battle rope|jump rope|rower|row erg|skierg|assault bike|air bike|treadmill|push-?up|pushup|pull-?up|chin-?up|dip|squat jump|run|carry)\b/i;

const MICRO_BAN_RE =
  /\b(dumbbell|kettlebell|barbell|band|machine|bike|rower|rope|treadmill|sled|cable|smith|ez|olympic|medicine ball|bosu|stability ball|pull-?up|chin-?up|hang(ing)?|dip bar|parallette|bench press|box jump|doorway|door frame)\b/i;

/**
 * Category-level legality for a single exercise, independent of format.
 * Returns a concrete violation string, never a soft preference.
 */
export function categoryExerciseViolation(e: ExerciseLike, category: Category): string | null {
  const t = textOf(e);
  if (category === "CHALLENGE" && STRETCH_RE.test(t))
    return `"${e.name}" is stretching or mobility work, which is not Challenge main work.`;
  if (category === "PILATES" && PILATES_BAN_RE.test(t))
    return `"${e.name}" is loaded or conditioning work, which Pilates never uses.`;
  if (category === "MOBILITY & STABILITY" && MOBILITY_BAN_RE.test(t))
    return `"${e.name}" is heavy or conditioning work, which Mobility & Stability never uses.`;
  if (category === "RECOVERY" && RECOVERY_BAN_RE.test(t))
    return `"${e.name}" is too intense for a Recovery session.`;
  if (category === "MICRO-WORKOUTS" && (MICRO_BAN_RE.test(t) || HOME_APPARATUS_RE.test(t)))
    return `"${e.name}" needs equipment or a special setup, which a Micro Workout never uses.`;
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
 * High-skill gymnastic and single-limb movements. Nobody hits a handstand
 * push-up or a pistol squat under a running clock in a conditioning session —
 * these are skill work, never calorie-burning vocabulary.
 */
export const HIGH_SKILL_RE =
  /\b(handstand|hand stand|pistol|shrimp squat|archer|planche|front lever|back lever|human flag|muscle-?up|nordic|one-?arm|one arm|single-?arm|single arm|one-?legged squat|iron cross|turkish get-?up|get-?up|windmill|bent press)\b/i;

/**
 * HUMAN REALISM (global).
 *
 * "Would a professional coach realistically give this exercise to an ordinary
 * adult client?" Everything below fails that test in EVERY category and EVERY
 * format: circus gymnastics, levers, exceptional-mobility work and technically
 * demanding Olympic lifting. Smarty Coach trains working adults in their 30s,
 * 40s and 50s — familiar, effective, achievable movements only.
 */
export const IMPRACTICAL_MOVEMENT_RE =
  /\b(turkish get-?up|get-?up|handstand|hand stand|headstand|forearm stand|pike push-?up|pistol squat|pistol|shrimp squat|sissy squat|planche|front lever|back lever|human flag|iron cross|dragon flag|skin the cat|muscle-?up|nordic|crow pose|frog stand|typewriter|aztec|clapping push-?up|superman push-?up|hollow back|windmill|bent press|jefferson|zercher|overhead squat|snatch|jerk|power clean|hang clean|squat clean|split clean|clean and press|clean and jerk|kipping|butterfly pull-?up|behind[- ]the[- ]neck|good morning)\b/i;

/**
 * Global legality: an exercise that a real coach would not hand to a normal
 * adult is rejected before anything else looks at it.
 */
export function humanRealismViolation(e: ExerciseLike): string | null {
  if (IMPRACTICAL_MOVEMENT_RE.test(e.name.toLowerCase()))
    return `"${e.name}" is a high-skill, gymnastic or technically demanding movement that a coach would not program for a normal adult client.`;
  return null;
}

/**
 * §18 — the environment decides what is realistic. Outdoors means portable
 * implements only: no machines, no cables, no racks, no barbells, whatever the
 * athlete ticked in their equipment list.
 */
const OUTDOOR_FAMILIES = new Set([
  "bodyweight",
  "dumbbell",
  "kettlebell",
  "band",
  "ball",
  "suspension",
]);

export function locationEquipmentViolation(
  e: ExerciseLike,
  location: string | null | undefined,
): string | null {
  const l = (location ?? "").toLowerCase();
  if (l !== "outdoors") return null;
  const family = equipmentFamilyOf(e.equipment);
  if (OUTDOOR_FAMILIES.has(family)) return null;
  if (/\b(rope|jump rope|sandbag|sled|box|step|bench|bar)\b/.test((e.equipment ?? "").toLowerCase()))
    return `"${e.name}" needs ${e.equipment} — an outdoor session uses portable equipment only.`;
  return `"${e.name}" needs ${e.equipment ?? "gym apparatus"}, which does not exist outdoors.`;
}

/** High-output conditioning vocabulary — the athlete is breathing hard after it. */
const HIGH_FATIGUE_RE =
  /\b(burpee|sprint|jump squat|jumping lunge|jump lunge|box jump|thruster|mountain climber|high knee|skater|battle rope|jump rope|assault bike|air bike|rower|row erg|skierg|swing|shuttle|run)\b/i;

/** Movements that need control, balance, precision or a loaded bar. */
const TECHNICAL_AFTER_FATIGUE_RE =
  /\b(handstand|pistol|turkish|get-?up|lever|planche|balance|bosu|stability ball|overhead squat|snatch|jerk|clean|barbell|bench press|deadlift|single-?leg (?:deadlift|balance)|pull-?over)\b/i;

/**
 * Sequencing realism: never send an athlete straight from a high-fatigue
 * conditioning movement into a technical, balance- or precision-dependent one
 * inside a clock-driven format.
 */
export function sequenceViolation(
  exercises: ExerciseLike[],
  format: Format,
): string | null {
  if (!isDynamicFormat(format)) return null;
  for (let i = 1; i < exercises.length; i++) {
    const prev = exercises[i - 1]!.name.toLowerCase();
    const next = exercises[i]!.name.toLowerCase();
    if (HIGH_FATIGUE_RE.test(prev) && TECHNICAL_AFTER_FATIGUE_RE.test(next))
      return `"${exercises[i]!.name}" straight after "${exercises[i - 1]!.name}" is not realistic — a technical movement never follows a high-fatigue one under a clock.`;
  }
  return null;
}

/**
 * The clock-driven contract. Whenever the FORMAT is AMRAP, EMOM, CIRCUIT,
 * TABATA or FOR TIME — whatever the category — every movement must start
 * immediately and repeat safely. Machines, racks, benches, cables, spotter- or
 * setup-dependent lifts and high-skill gymnastic / single-limb movements are
 * rejected regardless of the athlete's equipment list. Genuine cardio
 * ergometers stay legal. REPS & SETS is untouched: full gym access, machines
 * included, exactly as a trainer would program it.
 */
export function dynamicExerciseViolation(
  e: ExerciseLike,
  category: Category,
  format: Format,
): string | null {
  if (!isDynamicFormat(format)) return null;
  const equipment = (e.equipment ?? "").toLowerCase();
  const name = e.name.toLowerCase();
  const both = `${name} ${equipment}`;

  if (HIGH_SKILL_RE.test(name))
    return `"${e.name}" is a high-skill or single-limb movement and is never programmed inside a ${format} session.`;

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
  if (!both.includes("body weight") && !/\b(chair|desk|table|wall|sofa|floor|bed|stair|stairs|step)\b/.test(both))
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

// --- 12. Equipment family doctrine ------------------------------------------

/** Canonical equipment family for the transition / family rules. */
export function equipmentFamilyOf(equipment: string | null | undefined): string {
  const e = (equipment ?? "").toLowerCase();
  if (!e || e.includes("body weight")) return "bodyweight";
  if (e.includes("dumbbell")) return "dumbbell";
  if (e.includes("kettlebell")) return "kettlebell";
  if (e.includes("barbell") || e.includes("trap bar") || e.includes("olympic")) return "barbell";
  if (e.includes("band")) return "band";
  if (e.includes("cable")) return "cable";
  if (e.includes("machine") || e.includes("leverage") || e.includes("smith")) return "machine";
  if (e.includes("bike") || e.includes("erg") || e.includes("rower") || e.includes("ski"))
    return "ergometer";
  if (e.includes("ball")) return "ball";
  if (e.includes("assisted")) return "suspension";
  return e.split(" ")[0] ?? "other";
}

/**
 * §12 — a dynamic session must be runnable without assembling a gym. Bodyweight
 * never counts against the budget; two implement families are the hard ceiling
 * for a conditioning format, three for anything else.
 */
export function equipmentFamilyLimit(category: Category, format: Format): number {
  if (isDynamicFormat(format)) return 2;
  if (category === "MICRO-WORKOUTS") return 0;
  return 3;
}

export function equipmentFamilyViolation(
  exercises: ExerciseLike[],
  category: Category,
  format: Format,
): string | null {
  if (!exercises.length) return null;
  const limit = equipmentFamilyLimit(category, format);
  const families = new Set(
    exercises.map((e) => equipmentFamilyOf(e.equipment)).filter((f) => f !== "bodyweight"),
  );
  if (families.size > limit)
    return `The session spans ${families.size} equipment families (${[...families].join(", ")}) — a ${format} ${category} session may use at most ${limit} beyond bodyweight.`;
  return null;
}

// --- 19. Time math ----------------------------------------------------------

/** Hard ceiling: work (Main + Finisher) may never balloon past the request. */
export function durationOverflowViolation(
  estimatedMinutes: number,
  targetMinutes: number,
): string | null {
  const ceiling = Math.round(targetMinutes * 1.35) + 5;
  if (estimatedMinutes > ceiling)
    return `Prescribed work (~${estimatedMinutes} min) materially exceeds the advertised ${targetMinutes} min session.`;
  return null;
}

/**
 * §19 — the advertised duration is TRAINING TIME: Main Workout + Finisher.
 * Activation and cool down sit on top of it as a bounded allowance, so prep
 * can never eat the session and a 30-minute request really trains 30 minutes.
 */
export function activationAllowanceMinutes(targetMinutes: number): number {
  if (targetMinutes <= 15) return 5;
  if (targetMinutes <= 30) return 6;
  return 8;
}

export function cooldownAllowanceMinutes(targetMinutes: number): number {
  return targetMinutes <= 15 ? 4 : 5;
}

/** Activation may never exceed its allowance. */
export function activationOverflowViolation(
  activationMinutes: number,
  targetMinutes: number,
): string | null {
  const ceiling = activationAllowanceMinutes(targetMinutes) + 3;
  if (activationMinutes > ceiling)
    return `Activation (~${activationMinutes} min) is too long — preparation may take at most about ${activationAllowanceMinutes(targetMinutes)} min on top of the ${targetMinutes} min of training.`;
  return null;
}

/** Cool down may never exceed its allowance. */
export function cooldownOverflowViolation(
  cooldownMinutes: number,
  targetMinutes: number,
): string | null {
  const ceiling = cooldownAllowanceMinutes(targetMinutes) + 3;
  if (cooldownMinutes > ceiling)
    return `Cool down (~${cooldownMinutes} min) is too long — it may take at most about ${cooldownAllowanceMinutes(targetMinutes)} min on top of the ${targetMinutes} min of training.`;
  return null;
}

/**
 * Sanity ceiling for the WHOLE session: advertised training time plus the two
 * prep allowances. It exists to catch a runaway session, never to shorten a
 * properly dosed one.
 */
export function sessionOverflowViolation(
  sessionMinutes: number,
  targetMinutes: number,
): string | null {
  const ceiling =
    Math.round(targetMinutes * 1.2) +
    activationAllowanceMinutes(targetMinutes) +
    cooldownAllowanceMinutes(targetMinutes) +
    5;
  if (sessionMinutes > ceiling)
    return `The complete session (~${sessionMinutes} min including activation, main work, rest, finisher and cool down) is far beyond the requested ${targetMinutes} min of training.`;
  return null;
}

/**
 * §19 — the section budgets must actually ADD UP. Soft tissue + activation +
 * main work + rest + transitions + finisher + cool down are summed and checked
 * against the requested training time plus its two prep allowances. This is the
 * shortfall side of the contract (the overflow side is above): a session that
 * only prescribes half the requested work is rejected, not shipped.
 */
export function sessionBudgetViolation(
  sessionMinutes: number,
  workMinutes: number,
  targetMinutes: number,
): string | null {
  if (targetMinutes <= 0) return null;
  if (workMinutes < Math.round(targetMinutes * 0.6))
    return `The prescribed sections only add up to ~${workMinutes} min of training against a requested ${targetMinutes} min — the session is materially short.`;
  const floorTotal = Math.round(targetMinutes * 0.7);
  if (sessionMinutes < floorTotal)
    return `The complete session (~${sessionMinutes} min across all blocks) falls far short of the requested ${targetMinutes} min.`;
  return null;
}



/**
 * The human-realism preamble every session sees, whatever the category.
 */
export const HUMAN_REALISM_PROMPT = `HUMAN REALISM (HARD RULE, EVERY CATEGORY AND FORMAT)
Before choosing any exercise ask: "Would a professional coach realistically give this to an ordinary adult client — a working 35, 45 or 55 year old who wants to get fit, strong and lean — in THIS workout?" If the answer is no, do not use it.
NEVER program: Turkish get-ups, pistol squats, shrimp/sissy squats, handstands or handstand push-ups, headstands, pike push-ups, levers (front/back/human flag), planches, muscle-ups, nordic curls, dragon flags, skin the cat, clapping/aztec push-ups, kipping or butterfly pull-ups, windmills, bent presses, overhead squats, snatches, cleans, jerks, behind-the-neck pressing, or any movement needing exceptional mobility, balance, skill or coordination. Bodyweight does not make an exercise appropriate, and advanced does not make it better.
ALWAYS prefer the common, familiar, effective movements from the library: squats, goblet squats, lunges, reverse lunges, step-ups, hip thrusts, glute bridges, push-ups, presses, rows, pulldowns, TRX rows, dumbbell and kettlebell work, kettlebell swings, medicine-ball work, carries, simple core work, and genuine cardio (bike, rower, jump rope, running) where appropriate.
SEQUENCING: never place a technical, balance or precision movement straight after a high-fatigue one (burpees → handstand push-ups is unacceptable), and never chain movements that need completely different setups or locations inside a timed workout. The athlete must spend the session training, not preparing equipment.
FINAL TEST before you output: would you genuinely give this workout to that client, can they understand it, perform it safely, transition naturally between the exercises, and does it feel achievable rather than complicated? If not, replace the exercise.`;

/** Prompt text so the model sees the same doctrine the validator enforces. */
export function doctrinePrompt(category: Category, format: Format): string {
  if (category === "MICRO-WORKOUTS")
    return `HARD DOCTRINE: Micro Workouts are equipment-free and REPS & SETS only — never Circuit, AMRAP, EMOM, Tabata or For Time, whatever the athlete's level. Bodyweight plus everyday environment only (floor, wall, chair, desk, table, sofa, bed, stairs, a small space). No dumbbells, kettlebells, barbells, bands, TRX, machines, cables, medicine or slam balls, benches or any other gym equipment. No finisher, no separate soft tissue, activation or cool down.`;

  if (category === "RECOVERY")
    return `HARD DOCTRINE: RECOVERY is controlled recovery work written as MIX — and MIX here means ONLY gentle recovery modalities: breathing, gentle mobility and CARs, controlled low-effort movement, light stretching and relaxation. MIX never means a strength portion plus a metabolic portion in this category. FORBIDDEN: strength training, conditioning, HIIT, metabolic work, fatigue-based training, loaded implements (barbell, kettlebell, machine, cable, sled), jumping, sprinting, swings, push-ups, pull-ups, crunches and any finisher.`;

  if (isRepsAndSetsOnly(category))
    return `HARD DOCTRINE: ${category} is REPS & SETS only. Never AMRAP, EMOM, Tabata, For Time, circuit or chipper anywhere in the session.${
      categoryAllowsFinisher(category) ? "" : " This category carries NO finisher of any kind."
    }`;
  if (isDynamicFormat(format))
    return `HARD DOCTRINE: ${format} in ${category} is a continuous time/repetition format. Every movement must start immediately and repeat safely. FORBIDDEN: barbell work of any kind (including barbell complexes), bench press, back/front squat, barbell deadlift, cleans, snatches, jerks, rack- or spotter-dependent movements, Smith machine, cables, selectorized strength machines, and every high-skill or single-limb movement (handstand of any kind, pistol squat, archer push-up/row, planche, muscle-up, nordic curl, one-arm pressing or pulling). ALLOWED: bodyweight, dumbbells, kettlebells, medicine/slam balls, TRX, bands, portable boxes, carries, jump rope, sled push/pull and genuine cardio ergometers (bike, rower, SkiErg). Keep equipment families to a minimum so the athlete never assembles or adjusts equipment mid-workout.`;

  return "";
}
