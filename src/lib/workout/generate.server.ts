import { streamText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { buildWorkoutPrompt, type AthleteContext } from "./prompt.server";
import { enforceWorkout, estimateWorkMinutes } from "./enforce.server";
import { filterPool, loadAllExercises, samplePool, type PoolExercise } from "./pool.server";
import {
  BANNED_NAME_WORDS,
  CATEGORY_FORMATS,
  starsToLevel,
  type Category,
  type EquipmentMode,
  type Format,
  type StrengthFocus,
} from "./spec";

const MODEL = "google/gemini-3.6-flash";

export type GenerateInput = {
  category: Category;
  format?: Format | null;
  equipmentMode: EquipmentMode;
  selectedEquipment: string[];
  stars: number;
  minutes: number;
  focus?: StrengthFocus | null;
  note?: string;
  location?: string;
  mood?: string;
  athlete?: AthleteContext;
};

export type GeneratedWorkout = {
  name: string;
  description_html: string;
  main_workout: string;
  instructions_html: string;
  tips_html: string;
  warnings: string[];
  needs_review: boolean;
};

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function pickFormat(category: Category, requested?: Format | null): Format {
  const allowed = CATEGORY_FORMATS[category];
  if (requested && allowed.includes(requested)) return requested;
  return allowed[Math.floor(Math.random() * allowed.length)]!;
}

const ROMAN_RE = /^(?:i{1,3}|iv|vi{0,3}|ix|xi{0,2})$/i;
const CODE_RE = /\b[A-Z]{2,4}[-\s]?\d+\b/;

export function isValidName(name: string, used: string[]): boolean {
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  if (/\d/.test(trimmed)) return false;
  if (CODE_RE.test(trimmed)) return false;
  if (words.some((w) => ROMAN_RE.test(w))) return false;
  const lower = trimmed.toLowerCase();
  if (BANNED_NAME_WORDS.some((w) => lower.includes(w))) return false;
  if (used.some((u) => u.toLowerCase() === lower)) return false;
  return true;
}

function extractJson(text: string): Record<string, unknown> {
  let raw = text.trim();
  raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Smarty Coach returned an unreadable workout.");
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

async function askModel(system: string, user: string): Promise<Record<string, unknown>> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  const gateway = createLovableAiGatewayProvider(apiKey);
  const result = streamText({
    model: gateway(MODEL),
    system,
    messages: [{ role: "user", content: user }],
    temperature: 0.85,
  });
  return extractJson(await result.text);
}

export async function generateWorkoutContent(
  supabase: Parameters<typeof loadAllExercises>[0],
  input: GenerateInput,
  usedNames: string[],
): Promise<GeneratedWorkout & { format: Format; pool: PoolExercise[]; duration: string }> {
  const level = starsToLevel(input.stars);
  const format = pickFormat(input.category, input.format ?? null);
  const all = await loadAllExercises(supabase);
  const pool = filterPool(all, {
    category: input.category,
    equipmentMode: input.equipmentMode,
    selectedEquipment: input.selectedEquipment,
    level,
    focus: input.focus ?? null,
  });
  if (pool.length < 12) {
    throw new Error("Not enough exercises match those settings. Try different equipment.");
  }

  const duration = durationLabel(input.minutes);
  const promptPool = samplePool(pool);

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const { system, user } = buildWorkoutPrompt({
      category: input.category,
      format,
      equipmentMode: input.equipmentMode,
      selectedEquipment: input.selectedEquipment,
      level,
      stars: input.stars,
      duration,
      focus: input.focus ?? null,
      ...(input.note ? { note: input.note } : {}),
      ...(input.athlete ? { athlete: input.athlete } : {}),
      pool: promptPool,
      bannedNames: usedNames,
    });

    const payload = await askModel(
      system,
      attempt === 0
        ? user
        : `${user}\n\nPREVIOUS ATTEMPT REJECTED: ${lastError}\nFix it and return valid JSON.`,
    );

    const html = String(payload["main_workout"] ?? "");
    const enforced = enforceWorkout(html, pool, {
      category: input.category,
      format,
      level,
      targetMinutes: input.minutes,
    });

    if (enforced.errors.length) {
      lastError = enforced.errors.join(" ");
      continue;
    }

    let name = String(payload["name"] ?? "").trim();
    if (!isValidName(name, usedNames)) {
      name = `${input.category.split(" ")[0]!.toLowerCase()} ${level} session`
        .replace(/\b\w/g, (c) => c.toUpperCase());
      enforced.warnings.push("Workout name was replaced by a compliant fallback.");
    }

    return {
      name,
      description_html: String(payload["description"] ?? ""),
      main_workout: enforced.html,
      instructions_html: String(payload["instructions"] ?? ""),
      tips_html: String(payload["tips"] ?? ""),
      warnings: enforced.warnings,
      needs_review: enforced.warnings.length > 0,
      format,
      pool,
      duration,
    };
  }

  throw new Error(
    `Smarty Coach could not build a compliant workout (${lastError}). Please try again.`,
  );
}

export { estimateWorkMinutes };
