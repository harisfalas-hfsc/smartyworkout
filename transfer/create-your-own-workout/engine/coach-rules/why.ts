// "Why this session" — the visible half of the SmartyCoach feedback loop.
//
// The rules engine already adapts to logged evidence. Until the member can SEE
// what it used, the adaptation may as well not exist. These lines are short,
// factual and never claim more than the data supports.

import type { LoadState, ReadinessState } from "@/lib/performance/types";

export type WhyContext = {
  readiness: ReadinessState;
  overallLoad: LoadState;
  averageRpe: number | null;
  /** Most recent feeling answers, newest first. */
  recentFeelings: string[];
  /** Formats the member said they would not repeat. */
  deprioritizedFormats: string[];
  /** Exercises excluded because of dislikes or limitations. */
  avoidedExercises: string[];
  /** Exercises the member marked as favourites and that fit today's plan. */
  favoredExercises: string[];
  /** Sessions with any logged performance data. */
  loggedSessions: number;
};

const TIRED = new Set(["Tired", "Exhausted"]);

/**
 * At most three lines, most important first. Returns an empty list when there
 * is genuinely nothing evidence-based to say — silence beats invention.
 */
export function whyThisSession(ctx: WhyContext): string[] {
  const lines: string[] = [];

  if (ctx.readiness === "Recovery Recommended") {
    lines.push("Kept lighter today — your recent training suggests recovery is due.");
  } else if (ctx.overallLoad === "Very High" || ctx.overallLoad === "High") {
    lines.push(`Volume held back — your last 7 days are ${ctx.overallLoad.toLowerCase()} against your own normal.`);
  }

  const tiredCount = ctx.recentFeelings.slice(0, 3).filter((f) => TIRED.has(f)).length;
  if (lines.length < 3 && tiredCount >= 2) {
    lines.push("You reported feeling tired after your last sessions, so this one is more controlled.");
  }

  if (lines.length < 3 && ctx.averageRpe !== null && ctx.averageRpe >= 8.5) {
    lines.push(`Your recent effort averaged RPE ${ctx.averageRpe.toFixed(1)} — today aims a little below that.`);
  }

  if (lines.length < 3 && ctx.avoidedExercises.length) {
    lines.push(`Avoided ${ctx.avoidedExercises.slice(0, 2).join(" and ")} based on your library and limitations.`);
  }

  if (lines.length < 3 && ctx.deprioritizedFormats.length) {
    lines.push(`Skipped ${ctx.deprioritizedFormats[0]} — you said you would not repeat it.`);
  }

  if (lines.length < 3 && ctx.favoredExercises.length) {
    lines.push(`Included ${ctx.favoredExercises.slice(0, 2).join(" and ")} from your favourites.`);
  }

  if (!lines.length && ctx.loggedSessions < 2) {
    lines.push("Built from your Training Profile — log a couple of sessions and SmartyCoach starts adapting to your own history.");
  }

  return lines.slice(0, 3);
}
