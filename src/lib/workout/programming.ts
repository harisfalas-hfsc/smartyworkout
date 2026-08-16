// Deterministic programming intelligence for Smarty Coach.
//
// This module turns the athlete's request (category, duration, difficulty,
// mood, location, equipment) into an explicit SESSION BLUEPRINT: how many
// sections, how many exercises per section, which rep ranges, tempos and rest
// windows are legal, and how the session should flow between pieces of
// equipment. The blueprint is handed to the model as hard instructions AND
// used afterwards to score the finished session, so the rules are enforced
// deterministically instead of being hoped for.

import type { PoolExercise } from "./pool.server";
import type { WorkoutStep } from "./parse-steps";
import type { Category, DifficultyLevel, Format, StrengthFocus } from "./spec";

export type Dose = {
  sets: [number, number];
  reps?: [number, number];
  seconds?: [number, number];
  restSec: [number, number];
  tempo: string;
};

export type SessionPlan = {
  category: Category;
  format: Format;
  level: DifficultyLevel;
  minutes: number;
  /** Total blocks the athlete performs, excluding soft tissue prep. */
  softTissue: boolean;
  activationCount: number;
  mainCount: [number, number];
  /** [0,0] means the session has no Finisher at this duration. */
  finisherCount: [number, number];
  cooldownCount: number;
  main: Dose;
  finisher: Dose | null;
  /** Movement-pattern sequence the Main Workout should follow. */
  sequence: string[];
  /** Max number of distinct equipment families allowed in the work sections. */
  maxEquipmentFamilies: number;
  /** How many times the athlete may switch station across the work sections. */
  maxTransitions: number;
  /** CARDIO only: which aerobic expression today's session must follow. */
  cardioExpression?: CardioExpression;

  moodDirective: string;
  locationDirective: string;
  intensityDirective: string;
};

// ---------------------------------------------------------------------------
// Duration intelligence
// ---------------------------------------------------------------------------

type Shape = {
  softTissue: boolean;
  activationCount: number;
  mainCount: [number, number];
  finisherCount: [number, number];
  cooldownCount: number;
};

/** Micro Workout minutes are honoured as requested (3-10), never inflated. */
export function microMinutes(requested: number): number {
  return Math.max(2, Math.min(10, Math.round(requested)));
}

function durationShape(minutes: number, category: Category): Shape {
  // MICRO WORKOUT: one short coherent block. No soft tissue, no separate
  // activation, no finisher, no cool-down padding — the workout starts at once.
  // The movement count scales with the REQUESTED duration: a 3-minute request
  // stays a 3-minute session, it is never padded up to 10 minutes.
  if (category === "MICRO-WORKOUTS") {
    const m = microMinutes(minutes);
    const mainCount: [number, number] = m <= 3 ? [2, 3] : m <= 5 ? [3, 4] : m <= 7 ? [3, 5] : [4, 5];
    return { softTissue: false, activationCount: 0, mainCount, finisherCount: [0, 0], cooldownCount: 0 };
  }

  if (minutes <= 5)
    return { softTissue: false, activationCount: 2, mainCount: [3, 4], finisherCount: [0, 0], cooldownCount: 2 };
  if (minutes <= 10)
    return { softTissue: false, activationCount: 3, mainCount: [3, 5], finisherCount: [0, 0], cooldownCount: 3 };
  if (minutes <= 15)
    return { softTissue: true, activationCount: 3, mainCount: [4, 5], finisherCount: [0, 0], cooldownCount: 3 };
  if (minutes <= 20)
    return { softTissue: true, activationCount: 4, mainCount: [4, 6], finisherCount: [3, 3], cooldownCount: 3 };
  if (minutes <= 30)
    return { softTissue: true, activationCount: 4, mainCount: [5, 6], finisherCount: [3, 4], cooldownCount: 3 };
  if (minutes <= 45)
    return { softTissue: true, activationCount: 4, mainCount: [6, 7], finisherCount: [3, 4], cooldownCount: 3 };
  return { softTissue: true, activationCount: 4, mainCount: [7, 8], finisherCount: [4, 5], cooldownCount: 4 };
}

// ---------------------------------------------------------------------------
// Goal-specific dosing
// ---------------------------------------------------------------------------

const LEVEL_SHIFT: Record<DifficultyLevel, number> = {
  beginner: -1,
  intermediate: 0,
  advanced: 1,
  all: 0,
};

function strengthDose(level: DifficultyLevel): Dose {
  const shift = LEVEL_SHIFT[level];
  return {
    sets: [shift < 0 ? 3 : 4, shift > 0 ? 6 : 5],
    reps: shift < 0 ? [5, 8] : shift > 0 ? [3, 5] : [4, 6],
    restSec: shift < 0 ? [90, 150] : [150, 180],
    tempo: "2-sec lower, brief pause, explosive lift",
  };
}

function hypertrophyDose(level: DifficultyLevel): Dose {
  const shift = LEVEL_SHIFT[level];
  return {
    sets: [3, shift > 0 ? 5 : 4],
    reps: shift < 0 ? [10, 15] : [8, 12],
    restSec: [60, 90],
    tempo: "3-sec lower, 1-sec squeeze, controlled lift",
  };
}

function conditioningDose(level: DifficultyLevel, hard: boolean): Dose {
  const shift = LEVEL_SHIFT[level];
  return {
    sets: [3, hard ? 5 : 4],
    reps: [10, 20],
    seconds: shift < 0 ? [20, 30] : hard ? [30, 45] : [30, 40],
    restSec: shift < 0 ? [45, 60] : hard ? [15, 30] : [20, 45],
    tempo: "smooth repeatable pace, never sloppy",
  };
}

function controlDose(level: DifficultyLevel): Dose {
  return {
    sets: [2, level === "advanced" ? 4 : 3],
    reps: [8, 12],
    seconds: [30, 60],
    restSec: [20, 45],
    tempo: "slow, breath-led, full control through range",
  };
}

/** Micro Workout: bodyweight density controlled by level, never junk volume. */
function microDose(level: DifficultyLevel): Dose {
  if (level === "beginner")
    return { sets: [2, 3], reps: [8, 12], seconds: [20, 30], restSec: [30, 45], tempo: "controlled, easy breathing, no rush" };
  if (level === "advanced")
    return { sets: [4, 5], reps: [12, 20], seconds: [30, 45], restSec: [10, 20], tempo: "brisk but clean, harder leverage variations" };
  return { sets: [3, 4], reps: [10, 15], seconds: [25, 40], restSec: [20, 30], tempo: "steady and controlled" };
}

function doseFor(category: Category, level: DifficultyLevel): { main: Dose; finisher: Dose | null } {
  switch (category) {
    case "STRENGTH":
      return { main: strengthDose(level), finisher: hypertrophyDose(level) };
    case "MUSCLE BUILDING":
      return { main: hypertrophyDose(level), finisher: hypertrophyDose(level) };
    case "CALORIE BURNING":
    case "METABOLIC":
    case "CHALLENGE":
      return { main: conditioningDose(level, true), finisher: conditioningDose(level, true) };
    case "CARDIO":
      return { main: conditioningDose(level, false), finisher: conditioningDose(level, false) };
    case "MOBILITY & STABILITY":
    case "PILATES":
    case "RECOVERY":
      return { main: controlDose(level), finisher: controlDose(level) };
    case "MICRO-WORKOUTS":
      return { main: microDose(level), finisher: null };
    default:
      return { main: hypertrophyDose(level), finisher: hypertrophyDose(level) };
  }
}

// ---------------------------------------------------------------------------
// Sequencing, mood, location
// ---------------------------------------------------------------------------

const SEQUENCES: Partial<Record<Category, string[]>> = {
  STRENGTH: ["primary compound", "secondary compound", "accessory", "accessory", "core / carry"],
  "MUSCLE BUILDING": ["compound", "compound", "isolation", "isolation", "pump / core"],
  METABOLIC: ["hinge or squat", "push", "pull", "carry or core", "engine"],
  "CALORIE BURNING": ["large lower body", "push", "pull", "full-body power", "engine"],
  CHALLENGE: ["engine", "push", "pull", "lower body", "core under fatigue"],
  CARDIO: ["engine", "engine", "impact-managed pattern", "engine"],
  "MOBILITY & STABILITY": ["spine", "hips", "shoulders", "balance", "breathing"],
  PILATES: ["breath and centring", "deep core", "spinal articulation", "hips", "controlled close"],
  RECOVERY: ["breathing", "spine", "hips", "shoulders"],
  "MICRO-WORKOUTS": ["lower body", "push", "core", "full-body movement"],
};

const LOW_ENERGY = new Set(["tired", "stressed", "low", "sore"]);
const HIGH_ENERGY = new Set(["energized", "good", "push"]);

// ---------------------------------------------------------------------------
// Requested vs Effective difficulty
// ---------------------------------------------------------------------------

/** True when the athlete's current state must soften today's dose. */
export function isLowEnergyState(mood: string | null | undefined): boolean {
  return LOW_ENERGY.has((mood ?? "").toLowerCase());
}

export type DifficultyResolution = {
  /** What the profile, the user or the WOD asked for (never shown differently). */
  requestedStars: number;
  /** What the engine actually programmes today. */
  effectiveStars: number;
  softenedBy: string | null;
};

/**
 * Requested difficulty -> current athlete state -> effective difficulty.
 * Tired / low / sore soften by exactly one full star, never below 1.
 * Everything downstream (pool, blueprint, prompt, enforcement) uses the
 * effective value; the user-facing requested value is unchanged.
 */
export function resolveDifficulty(
  requestedStars: number,
  mood: string | null | undefined,
): DifficultyResolution {
  const requested = Math.max(1, Math.min(3, Math.round(requestedStars || 1)));
  if (!isLowEnergyState(mood))
    return { requestedStars: requested, effectiveStars: requested, softenedBy: null };
  return {
    requestedStars: requested,
    effectiveStars: Math.max(1, requested - 1),
    softenedBy: (mood ?? "").toLowerCase(),
  };
}


function moodDirective(mood: string | null | undefined): string {
  const m = (mood ?? "").toLowerCase();
  if (LOW_ENERGY.has(m))
    return `Athlete feels ${m}. Reduce total volume by roughly one working set per exercise, keep complexity low (no technical Olympic or high-skill work), extend rest by 15-30 sec, favour machines, supported and bilateral variations, and avoid heavy spinal loading and high-impact jumping. The session must still be a real workout — reduce volume, never purpose.`;
  if (m === "fun")
    return "Athlete wants a fun session. Use varied, playful patterns, unusual couplets and a game-style finisher, while keeping every prescription measurable.";
  if (HIGH_ENERGY.has(m))
    return "Athlete has good energy. Push toward the upper end of the prescribed sets and reps, allow the harder progression of each movement and keep rest at the shorter end of the window.";
  return "Athlete feels normal. Programme the middle of every prescribed range.";
}

const RESTRICTED_LOCATIONS: Record<string, string> = {
  home: "Training at home: assume a small floor space, no barbell rack, no machines, no heavy loading and no running. Every movement must work in one or two square metres with quiet landings (no repeated loud jumping).",
  hotel:
    "Training in a hotel room: tiny space, hard floor, no equipment beyond what was selected, thin walls. No jumping, no dropping loads, no running, no long travelling movements.",
  outdoors:
    "Training outdoors: no machines, no benches unless bodyweight-improvised, uneven surface. Prefer carries, sprints, hills, steps, bodyweight and portable equipment only.",
  gym: "Training in a full gym: racks, benches, machines and cardio equipment may be used, but only from the athlete's selected equipment list.",
};

function locationDirective(location: string | null | undefined): string {
  const l = (location ?? "").toLowerCase();
  return (
    RESTRICTED_LOCATIONS[l] ??
    "Training location is flexible: keep every movement possible with the selected equipment and a small floor area."
  );
}

function intensityDirective(stars: number, category: Category): string {
  const base =
    stars <= 1
      ? "One star: teach the pattern. Simple bilateral movements, longer rest, clearly submaximal effort, no failure."
      : stars === 2
        ? "Two stars: solid volume, moderate complexity, work close to but not at technical breakdown."
        : "Three stars: dense volume, advanced progressions and short rest — still 1-2 reps in reserve on every set.";
  const guard =
    category === "RECOVERY" || category === "MOBILITY & STABILITY"
      ? " Intensity here means quality of control, never fatigue."
      : "";
  return base + guard;
}

// ---------------------------------------------------------------------------
// Equipment families and transition efficiency
// ---------------------------------------------------------------------------

export function equipmentFamily(equipment: string | null | undefined): string {
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
  return e.split(" ")[0] ?? "other";
}

/** Number of station changes across an ordered list of exercises. */
export function countTransitions(families: string[]): number {
  let switches = 0;
  for (let i = 1; i < families.length; i++) if (families[i] !== families[i - 1]) switches += 1;
  return switches;
}

function transitionBudget(category: Category, format: Format, mainMax: number): number {
  const dense =
    format === "CIRCUIT" ||
    format === "AMRAP" ||
    format === "EMOM" ||
    format === "TABATA" ||
    format === "FOR TIME";
  if (dense) return Math.max(1, Math.round(mainMax * 0.34));
  if (category === "STRENGTH" || category === "MUSCLE BUILDING") return Math.max(2, mainMax - 2);
  return Math.max(2, Math.round(mainMax * 0.5));
}

// ---------------------------------------------------------------------------
// Plan builder
// ---------------------------------------------------------------------------

export function buildSessionPlan(input: {
  category: Category;
  format: Format;
  level: DifficultyLevel;
  stars: number;
  minutes: number;
  mood?: string | null;
  location?: string | null;
  focus?: StrengthFocus | null;
  equipmentCount: number;
}): SessionPlan {
  const shape = durationShape(input.minutes, input.category);
  const { main, finisher } = doseFor(input.category, input.level);

  // STRENGTH PRIORITY: the finisher is optional and must never compete with
  // the primary strength objective. It only appears when the session is long
  // enough to complete the heavy work first, and it is always short and light.
  const isStrength = input.category === "STRENGTH";
  const strengthFinisherAllowed = isStrength ? input.minutes >= 40 : true;

  // HARD RULE: Recovery, Micro Workout and Pilates never carry a finisher.
  const noFinisher =
    input.category === "RECOVERY" ||
    input.category === "MICRO-WORKOUTS" ||
    input.category === "PILATES" ||
    !strengthFinisherAllowed ||
    shape.finisherCount[1] === 0;

  const finisherCount: [number, number] = noFinisher
    ? [0, 0]
    : isStrength
      ? [2, Math.min(3, shape.finisherCount[1])]
      : shape.finisherCount;

  // A strength finisher is accessory volume, not a second workout.
  const finisherDose: Dose | null = noFinisher
    ? null
    : isStrength && finisher
      ? {
          ...finisher,
          sets: [2, 3],
          restSec: [60, 90],
          tempo: `${finisher.tempo} — accessory only, stop 3 reps short of failure`,
        }
      : finisher;

  const dense =
    input.format === "CIRCUIT" ||
    input.format === "AMRAP" ||
    input.format === "EMOM" ||
    input.format === "TABATA" ||
    input.format === "FOR TIME";

  return {
    category: input.category,
    format: input.format,
    level: input.level,
    minutes: input.minutes,
    softTissue: shape.softTissue,
    activationCount: shape.activationCount,
    mainCount: shape.mainCount,
    finisherCount,
    cooldownCount: shape.cooldownCount,
    main,
    finisher: finisherDose,
    sequence: SEQUENCES[input.category] ?? ["compound", "compound", "accessory", "core"],
    maxEquipmentFamilies: dense
      ? Math.min(2, Math.max(1, input.equipmentCount))
      : Math.min(3, Math.max(1, input.equipmentCount)),
    maxTransitions: transitionBudget(input.category, input.format, shape.mainCount[1]),
    moodDirective: moodDirective(input.mood),
    locationDirective: locationDirective(input.location),
    intensityDirective: intensityDirective(input.stars, input.category),
    ...(input.category === "CARDIO"
      ? { cardioExpression: cardioExpression(input.format) }
      : {}),
  };

}

const range = ([a, b]: [number, number], unit: string) =>
  a === b ? `${a} ${unit}` : `${a}-${b} ${unit}`;

function doseText(label: string, d: Dose): string {
  const bits = [
    `${label}: ${range(d.sets, "sets")}`,
    d.reps ? `${range(d.reps, "reps")}` : "",
    d.seconds ? `or ${range(d.seconds, "sec")} of work` : "",
    `rest ${range(d.restSec, "sec")} written on every line`,
    `tempo — ${d.tempo}`,
  ].filter(Boolean);
  return bits.join(", ");
}

/** The blueprint text injected into the model prompt. */
export function planPrompt(plan: SessionPlan): string {
  const micro = plan.category === "MICRO-WORKOUTS";
  const pilates = plan.category === "PILATES";
  const lines = [
    `SESSION BLUEPRINT (hard numbers — a session outside these ranges is rejected)`,
    micro
      ? `- NO 🧽 Soft Tissue, NO 🔥 Activation, NO ⚡ Finisher, NO 🧘 Cool Down. Output ONE 💪 Main Workout section only — the first movement is the preparation.`
      : plan.activationCount === 0
        ? `- NO separate 🔥 Activation section.`
        : `- 🔥 Activation: exactly ${plan.activationCount} token lines${pilates ? " that directly prepare the patterns used in the main work (breath, spine, hips or trunk control) — skip it entirely if it adds nothing" : ""}.`,
    `- 💪 Main Workout: ${range(plan.mainCount, "exercises")}.`,
    plan.finisher
      ? `- ⚡ Finisher: ${range(plan.finisherCount, "exercises")}.`
      : `- NO Finisher section at this duration and category.`,
    plan.cooldownCount === 0
      ? ``
      : `- 🧘 Cool Down: ${plan.cooldownCount} token lines plus one breathing line.`,
    micro
      ? `- MICRO WORKOUT CONCEPT: a 10-minute equipment-free movement break someone can do right now in office clothes, at a desk, in a small room or on the stairs. Bodyweight and environment only (floor, wall, chair, desk, sofa, table, stairs). Zero training equipment. Keep the athlete in roughly one spot — no wandering between rooms. Reps must be intelligent for the level, never junk volume. Golden test: could someone realistically do this in a 10-minute break without changing clothes or setting anything up? If not, rewrite it.`
      : ``,
    pilates
      ? `- PILATES CONCEPT: a controlled Pilates session in SETS & REPS only — never Tabata, AMRAP, EMOM, For Time, circuit, HIIT or metabolic work, and never a conditioning finisher. Emphasise control, precision, breathing, spinal articulation, deep core, stability and full controlled range. Sequence movements so positions flow (supine work together, side-lying together, quadruped together) and keep equipment changes to a minimum. Quality over speed and fatigue.`
      : ``,
    doseText("- Main Workout dosing", plan.main),
    plan.finisher ? doseText("- Finisher dosing", plan.finisher) : "",
    `- MOVEMENT ORDER in 💪: ${plan.sequence.join(" → ")}. Technical and heaviest work first, isolation and conditioning last, core never before the movements that need bracing.`,
    `- POSITIONAL FLOW: group standing work together, floor work together. Never alternate floor → standing → floor line after line.`,
    `- TRANSITION EFFICIENCY: use at most ${plan.maxEquipmentFamilies} equipment family/families across 💪 and ⚡, and at most ${plan.maxTransitions} station changes in 💪. Consecutive lines should share the same implement wherever the pattern allows; a circuit must be runnable without walking across a gym.`,
    `- MOOD: ${plan.moodDirective}`,
    `- LOCATION: ${plan.locationDirective}`,
    `- DIFFICULTY: ${plan.intensityDirective}`,
    `- TIME MATH: ${plan.minutes} min of advertised work counts 💪 + ⚡ only. Sets × (work + rest) must land within ±5 min of that.`,
  ];
  return lines.filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// Post-generation quality score
// ---------------------------------------------------------------------------

export type QualityReport = {
  score: number;
  issues: string[];
};

/**
 * Scores a finished session against its blueprint: structure, dosing,
 * transition efficiency, variety and preference fit. 100 is perfect.
 */
export function scoreWorkout(
  steps: WorkoutStep[],
  plan: SessionPlan,
  opts: {
    library: Map<string, PoolExercise>;
    favoriteIds?: string[];
    dislikedIds?: string[];
    recentIds?: string[];
    estimatedMinutes: number;
  },
): QualityReport {
  const issues: string[] = [];
  let score = 100;
  const penalise = (points: number, issue: string) => {
    score -= points;
    issues.push(issue);
  };

  const main = steps.filter((s) => s.section === "Main Workout");
  const finisher = steps.filter((s) => s.section === "Finisher");
  const activation = steps.filter((s) => s.section === "Activation" || s.section === "Warm-up");
  const cooldown = steps.filter((s) => s.section === "Cool-down");

  // 1. Structure.
  if (main.length < plan.mainCount[0])
    penalise(12, `Main Workout has ${main.length} exercises, blueprint asks for ${plan.mainCount[0]}+.`);
  if (main.length > plan.mainCount[1] + 1)
    penalise(6, `Main Workout has ${main.length} exercises, above the ${plan.mainCount[1]} target.`);
  if (plan.finisher) {
    if (finisher.length < plan.finisherCount[0])
      penalise(10, `Finisher has ${finisher.length} exercises, blueprint asks for ${plan.finisherCount[0]}+.`);
  } else if (finisher.length) {
    penalise(6, "A Finisher was added to a session that should not have one.");
  }
  if (activation.length < Math.min(3, plan.activationCount))
    penalise(8, `Activation has only ${activation.length} playable drills.`);
  if (cooldown.length < Math.min(3, plan.cooldownCount))
    penalise(8, `Cool Down has only ${cooldown.length} playable stretches.`);

  // 2. Dosing against the goal.
  const work = [...main, ...finisher];
  let offRange = 0;
  for (const step of work) {
    const reps = Number(step.prescription.match(/(\d+)\s*reps?/i)?.[1] ?? 0);
    if (!reps || !plan.main.reps) continue;
    const [lo, hi] = plan.main.reps;
    if (reps < lo - 2 || reps > hi + 4) offRange += 1;
  }
  if (offRange) penalise(Math.min(15, offRange * 4), `${offRange} prescriptions sit outside the goal rep range.`);

  const restLines = work.filter((s) => /rest/i.test(s.prescription)).length;
  if (work.length && restLines < Math.ceil(work.length * 0.5))
    penalise(6, "Rest is missing from most working lines.");

  // 3. Transition efficiency.
  const familyOf = (id: string) => equipmentFamily(opts.library.get(id)?.equipment ?? null);
  const mainFamilies = main.map((s) => familyOf(s.exerciseId));
  const transitions = countTransitions(mainFamilies);
  if (transitions > plan.maxTransitions)
    penalise(
      Math.min(12, (transitions - plan.maxTransitions) * 4),
      `Main Workout changes station ${transitions} times (budget ${plan.maxTransitions}).`,
    );
  const families = new Set([...mainFamilies, ...finisher.map((s) => familyOf(s.exerciseId))]);
  if (families.size > plan.maxEquipmentFamilies + 1)
    penalise(6, `Session spans ${families.size} equipment families.`);

  // 4. Variety and repetition.
  const workIds = work.map((s) => s.exerciseId);
  const unique = new Set(workIds).size;
  if (workIds.length >= 5 && unique < Math.ceil(workIds.length * 0.7))
    penalise(8, "The session repeats the same exercises too often.");
  const recent = new Set(opts.recentIds ?? []);
  if (recent.size) {
    const repeats = workIds.filter((id) => recent.has(id)).length;
    if (repeats > Math.ceil(workIds.length * 0.5))
      penalise(6, "Most of the session repeats the athlete's previous workouts.");
  }

  // 5. Preferences.
  const disliked = new Set(opts.dislikedIds ?? []);
  const hits = workIds.filter((id) => disliked.has(id)).length;
  if (hits) penalise(20, `${hits} excluded exercises made it into the session.`);
  const favourites = opts.favoriteIds ?? [];
  if (favourites.length && !workIds.some((id) => favourites.includes(id)))
    penalise(3, "None of the athlete's favourite exercises were programmed.");

  // 6. Duration accuracy.
  const drift = Math.abs(opts.estimatedMinutes - plan.minutes);
  if (drift > 8) penalise(Math.min(12, Math.round(drift / 2)), `Prescribed work drifts ${drift} min from the request.`);

  return { score: Math.max(0, Math.round(score)), issues };
}
