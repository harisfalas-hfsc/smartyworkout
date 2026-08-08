import type { PoolExercise } from "./pool.server";
import {
  BANNED_NAME_WORDS,
  type Category,
  type DifficultyLevel,
  type EquipmentMode,
  type Format,
  type StrengthFocus,
} from "./spec";

const CATEGORY_COACHING: Record<Category, string> = {
  STRENGTH:
    "Heavy compound lifts first, then secondary, then accessory. Reps & sets only, long rest 90-180 sec. Bodyweight variant uses bodyweight progressions; equipment variant uses barbell/dumbbell/kettlebell/cable.",
  "CALORIE BURNING":
    "Maximum energy expenditure with large muscle groups. Bodyweight: burpees, jump squats, mountain climbers, plyo push-ups, jumping lunges. Equipment: kettlebell swings, dumbbell thrusters, rowing intervals, sled push, battle ropes.",
  METABOLIC:
    "Strength + conditioning blend, minimal rest. Bodyweight: push/pull/squat/hinge circuits. Equipment: dumbbell/kettlebell/barbell complexes, thrusters, devil press.",
  CARDIO:
    "Sustained cardiovascular output. Bodyweight: jumping jacks, skater jumps, high knees, mountain climbers, burpees. Equipment: rower, assault bike, jump rope, kettlebell swings, ski erg, sled.",
  "MOBILITY & STABILITY":
    "Controlled mobility and stability ONLY: CARs, balance holds, bird dog, side bridge, cat-cow, ankle and wrist circles, slow breathing. Equipment variant: bands, balance board, foam roller, ball, rope-assisted stretches. HARD BAN: jumps, burpees, plyometrics, heavy strength, push-ups, crunches, sit-ups, dynamic leg-raise core, kettlebell power work, conditioning.",
  CHALLENGE:
    "Gamified benchmark work. Bodyweight: test-style AMRAP / For-Time pieces, multiple rounds, varied high-output patterns. Equipment: rounds-for-time, chippers, mixed modality — loaded conditioning, carries, swings, thrusters, rowing/bike/rope, squats, hinges, pushes, pulls, core under fatigue. HARD BAN in Main Workout and Finisher: stretching, mobility, yoga poses, static flexibility, recovery drills. Challenge means intensity, capacity, time pressure, reps, rounds and discomfort tolerance — never stretching.",
  PILATES:
    "Mat, reformer, magic circle, Pilates ball, light dumbbells and bands ONLY. Forbidden: kettlebells, barbells, heavy dumbbells, machines, cables, plyometrics, conditioning. Controlled spinal articulation, deep core, breath-led tempo, reps & sets.",
  RECOVERY:
    "PNF stretching, CARs, nasal and box breathing, gentle mobility. No plyometrics, no conditioning, no heavy lifting, no crunches or sit-ups. Format MIX and NO Finisher section.",
  "MICRO-WORKOUTS":
    "Exactly 5 minutes, bodyweight only plus chair / sofa / desk / stairs / wall. Forbidden: dumbbells, kettlebells, barbells, bands, machines, bike, rower, rope, treadmill, sled. Must be doable in office clothes.",
};

const FORMAT_RULES: Record<Format, string> = {
  AMRAP:
    'Header "Main Workout (AMRAP)". State the time cap in its own paragraph. 4-6 exercises. Reps written BEFORE each token.',
  EMOM:
    'Header "Main Workout (EMOM)". Every minute labelled "Minute N:". Declare total minutes and rounds. Dose written BEFORE each token.',
  CIRCUIT:
    'Header "Main Workout (CIRCUIT)". State rounds and rest in their own paragraph. 5-7 stations.',
  TABATA:
    'Header "Main Workout (TABATA)". 8 rounds of 20 sec work / 10 sec rest. Write "20 sec" before EVERY token.',
  "FOR TIME":
    'Header "Main Workout (For Time)". Chipper or rounds-for-time, reps written BEFORE every token, declare the cap or rounds.',
  "REPS & SETS":
    'Header "Main Workout (REPS & SETS)". Every line looks like: "4 sets × 8 reps {{exercise:ID:Name}} — tempo 3-sec lower, 1-sec pause, explosive lift, 1-sec reset; rest 90 sec". Sets 1-6, reps 1-25.',
  MIX: 'Header "Main Workout (MIX)". A prescribed REPS & SETS strength portion followed by a prescribed metabolic finisher portion.',
};

const FOCUS_RULES: Record<StrengthFocus, string> = {
  "LOWER BODY":
    "ALLOWED: squats, lunges, leg press, hip thrusts, leg curls/extensions, calf raises, step-ups, Bulgarian splits. FORBIDDEN: any upper-body press/pull/arm work.",
  "UPPER BODY":
    "ALLOWED: pressing, pulling, curls, extensions, rows, flys, pulldowns, push-ups, dips. FORBIDDEN: squats, lunges, leg press, deadlifts, hip thrusts, leg curls, calf raises.",
  "FULL BODY": "ALLOWED: upper push, upper pull, lower push, lower pull, core.",
  "LOW PUSH & UPPER PULL":
    "ALLOWED: squats, lunges, leg press, step-ups, hip thrusts, rows, pull-ups, pulldowns, curls, face pulls. FORBIDDEN: deadlifts, RDLs, leg curls, bench/shoulder press, push-ups, triceps.",
  "LOW PULL & UPPER PUSH":
    "ALLOWED: deadlifts, RDLs, leg curls, hinges, glute-ham raises, bench/shoulder press, push-ups, triceps, dips, flys. FORBIDDEN: squats, lunges, leg press, step-ups, rows, pull-ups, curls.",
  "CORE & GLUTES":
    "ALLOWED: anti-rotation, planks, dead bugs, pallof press, bird dogs, hip thrusts, glute bridges, banded work, kickbacks, clamshells. FORBIDDEN: squats, bench, rows, shoulder press, big compounds, arm isolation.",
};

export type AthleteContext = {
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  fitness_level?: string | null;
  primary_goal?: string | null;
  secondary_goal?: string | null;
  training_frequency?: number | null;
  preferred_categories?: string[] | null;
  preferred_environment?: string | null;
  favorite_exercises?: string[] | null;
  disliked_exercises?: string[] | null;
  limitations?: string[] | null;
  location?: string | null;
  mood?: string | null;
};

function athleteBlock(a?: AthleteContext): string {
  if (!a) return "";
  const lines: string[] = [];
  const bio = [
    a.age ? `${a.age} yrs` : "",
    a.gender || "",
    a.height_cm ? `${a.height_cm} cm` : "",
    a.weight_kg ? `${a.weight_kg} kg` : "",
  ].filter(Boolean).join(", ");
  if (bio) lines.push(`Biometrics: ${bio}`);
  if (a.fitness_level) lines.push(`Fitness level: ${a.fitness_level}`);
  if (a.primary_goal) lines.push(`Primary goal: ${a.primary_goal}`);
  if (a.secondary_goal) lines.push(`Secondary goal: ${a.secondary_goal}`);
  if (a.training_frequency) lines.push(`Trains ${a.training_frequency}x per week`);
  if (a.preferred_categories?.length) lines.push(`Preferred workout categories: ${a.preferred_categories.join(", ")}`);
  if (a.preferred_environment) lines.push(`Usual training environment: ${a.preferred_environment}`);
  if (a.location) lines.push(`Training today at: ${a.location}`);
  if (a.mood) lines.push(`Feeling today: ${a.mood}`);
  if (a.favorite_exercises?.length) lines.push(`FAVOURITE exercises (prioritise close library matches): ${a.favorite_exercises.join(", ")}`);
  if (a.disliked_exercises?.length) lines.push(`DISLIKED exercises (never program these or close variations): ${a.disliked_exercises.join(", ")}`);
  if (a.limitations?.length) lines.push(`INJURIES / LIMITATIONS (must be respected, choose safe alternatives): ${a.limitations.join(", ")}`);
  if (!lines.length) return "";
  return `ATHLETE PROFILE — read this before writing a single line. The session must respect every point.\n${lines.map((l) => `- ${l}`).join("\n")}\n`;
}

export type PromptInput = {
  category: Category;
  format: Format;
  equipmentMode: EquipmentMode;
  selectedEquipment: string[];
  customEquipment?: string[];
  level: DifficultyLevel;
  stars: number;
  duration: string;
  focus?: StrengthFocus | null;
  note?: string;
  athlete?: AthleteContext;
  pool: PoolExercise[];
  bannedNames: string[];
};

export function buildWorkoutPrompt(input: PromptInput): { system: string; user: string } {
  const isRecovery = input.category === "RECOVERY";
  const isMicro = input.category === "MICRO-WORKOUTS";

  const sections = isMicro
    ? `MICRO-WORKOUT STRUCTURE (exactly 5 minutes, 3 sections):
1. 🔥 Activation 1'
2. 💪 Main Workout 3'
3. 🧘 Cool Down 1'`
    : isRecovery
      ? `RECOVERY STRUCTURE (4 sections, NO Finisher):
1. 🧽 Soft Tissue Preparation
2. 🔥 Activation
3. 💪 Main Workout
4. 🧘 Cool Down`
      : `MANDATORY STRUCTURE (5 sections, exact icons and order):
1. 🧽 Soft Tissue Preparation — foam rolling only, NO {{exercise:}} tokens at all
2. 🔥 Activation — library exercises with markup
3. 💪 Main Workout — library exercises, minimum 4
4. ⚡ Finisher — library exercises, minimum 3
5. 🧘 Cool Down — library stretches and breathing`;

  const poolText = input.pool
    .map(
      (e) =>
        `${e.id}|${e.name}|${e.body_part ?? "-"}|${e.target_muscle ?? "-"}|${e.equipment ?? "-"}|${e.difficulty ?? "-"}`,
    )
    .join("\n");

  const system = `You are a Sports Scientist (CSCS). You write precise, safe, professional training sessions.

LIBRARY-FIRST RULE (non-negotiable)
- Every exercise reference MUST be written as {{exercise:ID:Name}} using an ID and the EXACT name from the approved library below (e.g. {{exercise:0043:barbell full squat}}).
- Never invent an exercise. Never write a plain exercise name without markup. Slug ids such as {{exercise:bird-dog:...}} are forbidden.
- Exception: the 🧽 Soft Tissue Preparation section contains NO tokens at all.

${sections}

SECTION TITLE HTML (one icon per section):
<p class="tiptap-paragraph">🔥 <strong><u>Activation 5'</u></strong></p>
Between sections output exactly one empty paragraph: <p class="tiptap-paragraph"></p>

EXERCISE LINE HTML (bullet lists only):
<ul class="tiptap-bullet-list"><li class="tiptap-list-item"><p class="tiptap-paragraph">12 reps {{exercise:ID:Name}}</p></li></ul>

SOFT TISSUE RULES — lines may only start with: Foam roll, Foam-roll, Foam roller, Lacrosse ball, Tennis ball, Trigger point, Self-massage, Myofascial release, or "... release". Forbidden there: tokens, stretch, circle, raise, swing, lunge, pose, march, bridge, squat, press, row, curl, twist, hydrant, cobra, cat-cow, sun salutation. Dynamic stretches belong in Activation, static stretches in Cool Down.

PRESCRIPTION RULES
- The measurable dose ALWAYS comes BEFORE the token: "15 reps {{exercise:1160:burpee}}", "40 sec {{exercise:0630:mountain climber}}", "200m {{exercise:0685:run}}".
- Forbidden: naked tokens, dose after the token, compact tempo codes such as 20X0 or 31X1 (write readable coaching language instead).
- Tempo and rest stay inline on the SAME list item as the token. Never create a bullet that only contains a tempo or "rest 90 sec".
- Accepted units: reps, sec, min, m, km, cal, rounds, "N sets × N", "EMOM Minute N:".
- Protocol headers look like "Main Workout (FORMAT)" and NEVER contain a duration.
- Finisher header: "Finisher (REPS & SETS)" for STRENGTH / MOBILITY & STABILITY / PILATES, otherwise "Finisher (For Time)" or "Finisher (AMRAP)" with the cap or rounds in the paragraph below.

NAMING
2-4 word creative name hinting at the category${input.focus ? " and focus" : ""}. Avoid these words: ${BANNED_NAME_WORDS.join(", ")}. Strictly forbidden: internal codes (CAL-813, BW1230, V2, #3), roman numerals, any digits, and 3-letter uppercase abbreviations with numbers.

OUTPUT — pure JSON, no markdown fences, exactly:
{"name":"...","description":"<p class=\\"tiptap-paragraph\\">2-3 sentences tied to the category.</p>","main_workout":"full structured HTML with library-first markup","instructions":"<p class=\\"tiptap-paragraph\\">How to perform this workout</p>","tips":"<p class=\\"tiptap-paragraph\\">Tip 1</p><p class=\\"tiptap-paragraph\\">Tip 2</p><p class=\\"tiptap-paragraph\\">Tip 3</p>"}
The "main_workout" field contains ALL sections joined in order.`;

  const user = `WORKOUT REQUEST
Category: ${input.category}
Available equipment (strict allowlist): ${[...input.selectedEquipment.filter((x) => x !== "other"), ...(input.customEquipment ?? [])].join(", ")}
Never use any apparatus outside this list, even during Activation or Cool Down.
Difficulty: ${input.stars} stars (${input.level.toUpperCase()}) — do not mix levels
Format: ${input.format}
Duration: ${input.duration}${input.focus ? `\nFocus: ${input.focus}` : ""}
${input.note ? `Athlete note: ${input.note}` : ""}

${athleteBlock(input.athlete)}

CATEGORY COACHING RULES
${CATEGORY_COACHING[input.category]}

FORMAT WRITING RULES
${FORMAT_RULES[input.format]}
${input.focus ? `\nFOCUS SPLIT RULES\n${FOCUS_RULES[input.focus]}` : ""}

QUALITY GATE (your workout is rejected if it fails)
- Main Workout at least 4 exercises (hard floor 3); Finisher at least 3.
- Every token line in 💪 and ⚡ carries a dose BEFORE the token.
- The protocol structure (minutes, rounds, cap, ladder, 20/10 x 8) must be declared in writing.
- Advertised duration counts 💪 Main + ⚡ Finisher only and must reach the requested "${input.duration}".

NAMES ALREADY USED (never reuse):
${input.bannedNames.slice(0, 120).join(", ") || "none"}

APPROVED EXERCISE LIBRARY — the ONLY allowed vocabulary (id|name|body part|target|equipment|difficulty)
${poolText}

Return the JSON now.`;

  return { system, user };
}
