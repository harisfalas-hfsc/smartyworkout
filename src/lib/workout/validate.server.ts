// Deterministic post-generation validator.
// Runs AFTER enforceWorkout and re-checks the finished HTML against the hard
// contract: real library ids, the exact equipment allowlist, banned exercises,
// section shape and dose hygiene. Nothing here trusts the model.
import { matchesSelectedEquipment, nameStem, type PoolExercise } from "./pool.server";
import { findTokens, isLibraryId, stripHtml } from "./tokens";
import { parseWorkoutSteps } from "./parse-steps";
import { estimateWorkMinutes } from "./enforce.server";
import {
  activationRelevanceViolation,
  categoryAllowsFinisher,
  categoryFormatViolation,
  durationOverflowViolation,
  dynamicExerciseViolation,
  focusViolation,
  microExerciseViolation,
} from "./doctrine";
import {
  minimumWorkMinutes,
  type Category,
  type DifficultyLevel,
  type EquipmentMode,
  type Format,
  type StrengthFocus,
} from "./spec";


export type ValidationResult = { errors: string[]; warnings: string[] };

export type ValidateOptions = {
  /** Full library, used to resolve ids the pool filter removed. */
  library: PoolExercise[];
  pool: PoolExercise[];
  category: Category;
  format: Format;
  level: DifficultyLevel;
  targetMinutes: number;
  equipmentMode: EquipmentMode;
  selectedEquipment: string[];
  customEquipment?: string[];
  /** Today's body-part focus — a hard legality gate on every work exercise. */
  focus?: StrengthFocus | null;
  dislikedIds?: string[];

  /** Ids allowed in 🔥 Activation / 🧘 Cool Down (prep vocabulary, bodyweight-first). */
  prepIds?: string[];
  /** Blueprint minimum for 💪 Main Workout. */
  mainMin?: number;
  /** Blueprint decision: does this duration / category carry a ⚡ Finisher? */
  requireFinisher?: boolean;
  /** Blueprint minimum for ⚡ Finisher lines. */
  finisherMin?: number;

  /** Blueprint decision: does this session carry 🔥 Activation / 🧘 Cool Down? */
  requireActivation?: boolean;
  requireCooldown?: boolean;
};


export function validateWorkout(html: string, opts: ValidateOptions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const poolIds = new Set(opts.pool.map((e) => e.id));
  const prepIds = new Set(opts.prepIds ?? []);
  const libraryById = new Map(opts.library.map((e) => [e.id, e]));
  const banned = new Set(opts.dislikedIds ?? []);
  const bannedStems = new Set(
    (opts.dislikedIds ?? [])
      .map((id) => libraryById.get(id))
      .filter(Boolean)
      .map((e) => nameStem(e!.name))
      .filter((s) => s.length > 3),
  );

  // 0. Category / format legality — the doctrine decides which formats a
  //    category may ever wear, regardless of what was requested upstream.
  const formatIssue = categoryFormatViolation(opts.category, opts.format);
  if (formatIssue) errors.push(formatIssue);

  const tokens = findTokens(html);
  if (!tokens.length) {
    errors.push("The workout contains no library exercises.");
    return { errors, warnings };
  }



  // 1. Every token must be a real library id that survived the session filter.
  for (const token of tokens) {
    if (!isLibraryId(token.id) || !libraryById.has(token.id)) {
      errors.push(`Exercise "${token.name || token.id}" is not in the library.`);
      continue;
    }
    const row = libraryById.get(token.id)!;
    if (row.name.toLowerCase().trim() !== token.name.toLowerCase().trim()) {
      warnings.push(`Exercise name for ${token.id} did not match the library entry.`);
    }
    // Prep vocabulary (Activation / Cool Down) is bodyweight-first and lives
    // outside the session pool on purpose — it only has to be a legal prep id.
    const isPrep = prepIds.has(token.id);
    if (!isPrep) {
      if (!poolIds.has(token.id)) {
        errors.push(`"${row.name}" is outside the approved pool for this session.`);
      }
      // 2. Equipment allowlist — checked against the library row, not the text.
      if (!matchesSelectedEquipment(row, opts.selectedEquipment, opts.customEquipment ?? [])) {
        errors.push(`"${row.name}" needs ${row.equipment ?? "unlisted"} equipment, which is not available.`);
      }
      if (
        opts.equipmentMode === "BODYWEIGHT" &&
        !(row.equipment ?? "").toLowerCase().includes("body weight")
      ) {
        errors.push(`"${row.name}" is not a bodyweight exercise.`);
      }
    }
    // 3. Disliked exercises and their close variations.
    if (banned.has(row.id) || bannedStems.has(nameStem(row.name))) {
      errors.push(`"${row.name}" is on the athlete's excluded list.`);
    }
  }

  // 4. Section shape and dose hygiene.
  const steps = parseWorkoutSteps(html);
  const main = steps.filter((s) => s.section === "Main Workout");
  const finisher = steps.filter((s) => s.section === "Finisher");
  const activation = steps.filter((s) => s.section === "Activation" || s.section === "Warm-up");
  const cooldown = steps.filter((s) => s.section === "Cool-down");
  const requiresFinisher =
    opts.requireFinisher ??
    (opts.category !== "RECOVERY" &&
      opts.category !== "MICRO-WORKOUTS" &&
      opts.category !== "PILATES");
  const wantsActivation = opts.requireActivation ?? opts.category !== "MICRO-WORKOUTS";
  const wantsCooldown = opts.requireCooldown ?? opts.category !== "MICRO-WORKOUTS";
  const mainMin = opts.mainMin ?? 4;

  if (main.length < mainMin) {
    if (main.length < Math.min(3, mainMin)) errors.push(`Main Workout has only ${main.length} exercises.`);
    else warnings.push(`Main Workout is below the ${mainMin}-exercise target.`);
  }
  if (requiresFinisher && finisher.length < (opts.finisherMin ?? 3)) {
    if (!finisher.length) errors.push("Finisher section is missing.");
    else warnings.push(`Finisher has only ${finisher.length} exercises.`);
  }

  if (wantsActivation && activation.length < 3) {
    warnings.push(`Activation has only ${activation.length} playable drills.`);
  }
  if (wantsCooldown && cooldown.length < 3) {
    warnings.push(`Cool Down has only ${cooldown.length} playable stretches.`);
  }


  for (const step of [...main, ...finisher]) {
    if (!/\d/.test(step.prescription)) {
      errors.push(`"${step.name}" has no prescribed dose.`);
    }
  }

  // 5. Repetition guard — a session should not recycle the same two movements.
  const workIds = [...main, ...finisher].map((s) => s.exerciseId);
  const unique = new Set(workIds).size;
  if (workIds.length >= 6 && unique < Math.ceil(workIds.length * 0.5)) {
    warnings.push("The session repeats the same exercises too often.");
  }

  // 6. Soft tissue section must stay token-free.
  const softTissue = html.split("🔥")[0] ?? "";
  if (findTokens(softTissue).length && stripHtml(softTissue).length) {
    warnings.push("Soft Tissue Preparation contained exercise links.");
  }

  // 7. Duration integrity.
  const workMinutes = estimateWorkMinutes(html);
  const floor = minimumWorkMinutes(opts.level, opts.category, opts.format);
  if (opts.targetMinutes >= floor && workMinutes + 8 < opts.targetMinutes) {
    warnings.push(
      `Prescribed work (~${workMinutes} min) is short of the advertised ${opts.targetMinutes} min.`,
    );
  }

  return { errors, warnings };
}
