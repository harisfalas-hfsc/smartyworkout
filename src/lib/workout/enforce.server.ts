import { canonicalSection, minimumWorkMinutes, type Category, type DifficultyLevel, type Format, type SectionName } from "./spec";
import { EXERCISE_TOKEN_RE, findTokens, isLibraryId, stripHtml } from "./tokens";
import { STRETCH_RE, type PoolExercise } from "./pool.server";
import { parseStepTiming, parseWorkoutSteps } from "./parse-steps";

export type EnforceResult = {
  html: string;
  warnings: string[];
  errors: string[];
};

const HEADING_RE = /<p class="tiptap-paragraph">\s*(?:🧽|🔥|💪|⚡|🧘)[\s\S]*?<\/p>/g;

export type Section = { name: SectionName; heading: string; body: string };

/** Splits the generated HTML into its icon-titled sections, in document order. */
export function splitSections(html: string): Section[] {
  const out: Section[] = [];
  const matches = [...html.matchAll(new RegExp(HEADING_RE.source, "g"))];
  matches.forEach((m, i) => {
    const start = m.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1]!.index ?? html.length) : html.length;
    const name = canonicalSection(stripHtml(m[0]));
    if (!name) return;
    out.push({ name, heading: m[0], body: html.slice(start + m[0].length, end) });
  });
  return out;
}

export function joinSections(sections: Section[]): string {
  return sections
    .map((s) => `${s.heading}${s.body}`)
    .join('<p class="tiptap-paragraph"></p>');
}

const LIST_ITEM_RE = /<li class="tiptap-list-item">[\s\S]*?<\/li>/g;

function dropListItems(body: string, predicate: (itemHtml: string) => boolean): string {
  return body
    .replace(new RegExp(LIST_ITEM_RE.source, "g"), (item) => (predicate(item) ? "" : item))
    .replace(/<ul class="tiptap-bullet-list">\s*<\/ul>/g, "");
}

const SOFT_TISSUE_ALLOWED =
  /^(foam[\s-]?roll|foam roller|lacrosse ball|tennis ball|trigger point|self-?massage|myofascial release)/i;

/** Loaded apparatus that must never appear in Activation (movement prep only). */
const ACTIVATION_BANNED_EQUIPMENT_RE =
  /\b(barbell|dumbbell|kettlebell|machine|cable|smith|ez[\s-]?bar|olympic|sled|weighted|leverage|trap bar|hammer)\b/i;

/** Heavy strength / high-impact patterns that are not movement preparation. */
const ACTIVATION_BANNED_PATTERN_RE =
  /\b(deadlift|bench press|back squat|front squat|overhead press|push press|clean|snatch|jerk|thruster|deep push-?up|decline push-?up|weighted|pull-?up|chin-?up|muscle-?up|burpee|box jump|sprint|dip)\b/i;


/**
 * Layer 1-4 of the post-generation pipeline: token repair, section hygiene,
 * category bans and prescription checks. Returns cleaned HTML plus findings.
 */
export function enforceWorkout(
  rawHtml: string,
  pool: PoolExercise[],
  opts: { category: Category; format: Format; level: DifficultyLevel; targetMinutes: number },
): EnforceResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const byId = new Map(pool.map((e) => [e.id, e]));
  const byName = new Map(pool.map((e) => [e.name.toLowerCase().trim(), e]));

  // ---- Layer 1: token repair -------------------------------------------------
  let html = rawHtml.replace(new RegExp(EXERCISE_TOKEN_RE.source, "g"), (raw, id: string, name: string) => {
    const clean = (name ?? "").trim();
    if (isLibraryId(id) && byId.has(id)) {
      return `{{exercise:${id}:${byId.get(id)!.name}}}`;
    }
    const byExact = byName.get(clean.toLowerCase());
    if (byExact) {
      warnings.push(`Repaired exercise id for "${clean}".`);
      return `{{exercise:${byExact.id}:${byExact.name}}}`;
    }
    warnings.push(`Removed unknown exercise "${clean || id}".`);
    return `__DROP__${clean}`;
  });

  // Drop any list item that lost its exercise.
  html = dropListItems(html, (item) => item.includes("__DROP__"));
  html = html.replace(/__DROP__/g, "");

  let sections = splitSections(html);
  if (!sections.length) {
    errors.push("Workout has no recognisable sections.");
    return { html, warnings, errors };
  }

  sections = sections.map((section) => {
    let body = section.body;

    // ---- Layer 2: Soft Tissue hygiene ---------------------------------------
    if (section.name === "Soft Tissue Preparation") {
      body = dropListItems(body, (item) => {
        const text = stripHtml(item.replace(new RegExp(EXERCISE_TOKEN_RE.source, "g"), "$2"));
        return findTokens(item).length > 0 || !SOFT_TISSUE_ALLOWED.test(text);
      });
      if (!/<li/.test(body)) {
        body =
          '<ul class="tiptap-bullet-list"><li class="tiptap-list-item"><p class="tiptap-paragraph">60 sec Foam roll quadriceps — slow controlled passes</p></li><li class="tiptap-list-item"><p class="tiptap-paragraph">60 sec Foam roll thoracic spine — pause on tender spots</p></li><li class="tiptap-list-item"><p class="tiptap-paragraph">45 sec Lacrosse ball glute release — each side</p></li></ul>';
        warnings.push("Rebuilt Soft Tissue Preparation with compliant entries.");
      }
    }

    // ---- Layer 2b: Activation = movement prep only ----------------------------
    if (section.name === "Activation") {
      body = dropListItems(body, (item) => {
        const tokens = findTokens(item);
        if (!tokens.length) return false;
        const text = stripHtml(item.replace(new RegExp(EXERCISE_TOKEN_RE.source, "g"), "$2"));
        if (ACTIVATION_BANNED_PATTERN_RE.test(text)) {
          warnings.push(`Removed "${tokens[0]!.name}" from Activation (strength movement, not prep).`);
          return true;
        }
        const equipment = `${byId.get(tokens[0]!.id)?.equipment ?? ""} ${text}`;
        if (ACTIVATION_BANNED_EQUIPMENT_RE.test(equipment)) {
          warnings.push(`Removed "${tokens[0]!.name}" from Activation (loaded apparatus).`);
          return true;
        }
        const difficulty = (byId.get(tokens[0]!.id)?.difficulty ?? "").toLowerCase();
        if (difficulty.includes("advanced")) {
          warnings.push(`Removed "${tokens[0]!.name}" from Activation (too advanced for prep).`);
          return true;
        }
        return false;
      });
      if (!/<li/.test(body)) {
        warnings.push("Activation was emptied by the movement-prep rules and needs review.");
      }
    }



    // ---- Layer 3: category bans in work sections -----------------------------
    const isWork = section.name === "Main Workout" || section.name === "Finisher";
    if (isWork && opts.category === "CHALLENGE") {
      body = dropListItems(body, (item) => STRETCH_RE.test(stripHtml(item)));
    }

    // ---- Layer 4: prescription checks ---------------------------------------
    if (isWork) {
      body = dropListItems(body, (item) => {
        const text = stripHtml(item);
        const hasToken = findTokens(item).length > 0;
        if (hasToken) return false;
        return /^(tempo|rest)\b/i.test(text) || text.length === 0;
      });
      for (const item of body.match(new RegExp(LIST_ITEM_RE.source, "g")) ?? []) {
        const tokens = findTokens(item);
        if (!tokens.length) continue;
        const before = stripHtml(item.slice(0, item.indexOf(tokens[0]!.raw)));
        if (!/\d/.test(before)) {
          warnings.push(`Missing dose before "${tokens[0]!.name}".`);
        }
      }
      body = body.replace(/\b\d{2}X\d\b/g, "controlled tempo");
    }

    return { ...section, body };
  });

  // ---- Layer 5: structural quality gate --------------------------------------
  const counts = new Map<SectionName, number>();
  for (const s of sections) counts.set(s.name, findTokens(s.body).length);

  const requiresFinisher = opts.category !== "RECOVERY" && opts.category !== "MICRO-WORKOUTS";
  const main = counts.get("Main Workout") ?? 0;
  const finisher = counts.get("Finisher") ?? 0;
  if (main < 3) errors.push(`Main Workout has only ${main} exercises (minimum 4).`);
  else if (main < 4) warnings.push("Main Workout is below the 4-exercise target.");
  if (requiresFinisher && finisher < 3) {
    if (finisher === 0) errors.push("Finisher section is missing.");
    else warnings.push(`Finisher has only ${finisher} exercises (minimum 3).`);
  }

  const finalHtml = joinSections(sections);

  // ---- Layer 6: duration integrity -------------------------------------------
  const workMinutes = estimateWorkMinutes(finalHtml);
  const floor = minimumWorkMinutes(opts.level, opts.category, opts.format);
  if (opts.targetMinutes >= floor && workMinutes + 6 < opts.targetMinutes) {
    warnings.push(
      `Prescribed work (~${workMinutes} min) is short of the advertised ${opts.targetMinutes} min.`,
    );
  }

  return { html: finalHtml, warnings, errors };
}

/** Rough work-volume estimate for Main Workout + Finisher only. */
export function estimateWorkMinutes(html: string): number {
  const steps = parseWorkoutSteps(html).filter(
    (s) => s.section === "Main Workout" || s.section === "Finisher",
  );
  let seconds = 0;
  for (const step of steps) {
    const timing = parseStepTiming(step);
    if (timing.mode === "tabata") seconds += timing.rounds * (timing.work + timing.rest);
    else if (timing.mode === "timed") seconds += timing.seconds + 20;
    else {
      const sets = Number(step.prescription.match(/(\d+)\s*sets?/i)?.[1] ?? 1);
      const reps = Number(step.prescription.match(/(\d+)\s*reps?/i)?.[1] ?? 12);
      seconds += sets * (reps * 4 + 60);
    }
  }
  const rounds = Number(html.match(/(\d+)\s*rounds?/i)?.[1] ?? 0);
  if (rounds > 1) seconds *= Math.min(rounds, 6) / Math.max(1, Math.min(rounds, 6)) || 1;
  return Math.round(seconds / 60);
}
