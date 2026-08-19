// SmartyCoach rules engine — pure TypeScript, deterministic, no AI calls.
//
// Three concepts stay separate at all times:
//   1. Selected difficulty      — what the user chose.
//   2. Recommended difficulty   — produced here, only from demonstrated evidence.
//   3. Demonstrated performance — what the logs actually show.
// A user picking 1, 2 or 3 stars is never evidence of what they can or cannot
// do. With Limited data no star recommendation is made at all.

import { starsToLevel } from "@/lib/workout/spec";
import type { CoachContext, CoachRecommendation } from "./types";

function starWord(stars: number) {
  return `${stars} star${stars === 1 ? "" : "s"} (${starsToLevel(stars)})`;
}

// --- rule families ---------------------------------------------------------

function confidenceRule(ctx: CoachContext): CoachRecommendation | null {
  if (ctx.confidence !== "Limited") return null;
  return {
    id: "confidence.limited",
    message: `Training at your selected ${starWord(ctx.selectedStars)} is a fine starting point.`,
    reason:
      "Not enough logged performance data yet to recommend a different level — log your sets and results and SmartyCoach will start comparing like with like.",
    suggestedStars: null,
    priority: 10,
  };
}

function readinessRule(ctx: CoachContext): CoachRecommendation | null {
  if (ctx.readiness === "Recovery Recommended") {
    return {
      id: "readiness.recovery",
      message: "Consider an easier session or a rest day today.",
      reason: ctx.readinessReason,
      suggestedStars: null,
      priority: 90,
    };
  }
  if (ctx.readiness === "Caution") {
    return {
      id: "readiness.caution",
      message: "Keep today controlled and stop sets with technique intact.",
      reason: ctx.readinessReason,
      suggestedStars: null,
      priority: 70,
    };
  }
  return null;
}

function loadRule(ctx: CoachContext): CoachRecommendation | null {
  if (ctx.overallLoad !== "Very High" && ctx.overallLoad !== "High") return null;
  if (ctx.confidence === "Limited") return null;
  if (ctx.selectedStars < 3) return null;
  return {
    id: "load.high",
    message: `Your recent training load is ${ctx.overallLoad.toLowerCase()} — ${starWord(2)} would fit today better than ${starWord(3)}.`,
    reason: "Based on the volume you actually logged over the last seven days.",
    suggestedStars: 2,
    priority: 80,
  };
}

function progressionRule(ctx: CoachContext): CoachRecommendation | null {
  if (ctx.confidence !== "Established") return null;
  if (!ctx.progressionReady.length) return null;
  if (ctx.recentShortfalls > 0) return null;
  if (ctx.selectedStars >= 3) {
    return {
      id: "progression.hold",
      message: `You have met the prescription three sessions running on ${ctx.progressionReady[0]} — add a little load rather than more stars.`,
      reason: "Demonstrated performance, taken from your logged sets.",
      suggestedStars: null,
      priority: 60,
    };
  }
  const next = Math.min(3, ctx.selectedStars + 1);
  return {
    id: "progression.step-up",
    message: `Your logged sets have met the prescription three sessions running — ${starWord(next)} is within reach when you want it.`,
    reason: `Demonstrated on ${ctx.progressionReady.slice(0, 2).join(" and ")}.`,
    suggestedStars: next,
    priority: 65,
  };
}

function shortfallRule(ctx: CoachContext): CoachRecommendation | null {
  if (ctx.confidence === "Limited") return null;
  if (ctx.recentShortfalls < 2) return null;
  if (ctx.selectedStars <= 1) {
    return {
      id: "shortfall.hold",
      message: `Stay at ${starWord(1)} and finish the prescribed work before adding anything.`,
      reason: "Your last logged sessions fell short of the prescribed reps.",
      suggestedStars: null,
      priority: 75,
    };
  }
  const lower = Math.max(1, ctx.selectedStars - 1);
  return {
    id: "shortfall.step-down",
    message: `${starWord(lower)} would let you complete the prescribed work today.`,
    reason: `Logged reps fell short of the prescription in ${ctx.recentShortfalls} recent sessions.`,
    suggestedStars: lower,
    priority: 72,
  };
}

function steadyRule(ctx: CoachContext): CoachRecommendation {
  return {
    id: "steady.ok",
    message: `Your selected ${starWord(ctx.selectedStars)} matches what you have been demonstrating.`,
    reason: `${ctx.sessionsLast7} session${ctx.sessionsLast7 === 1 ? "" : "s"} logged in the last seven days.`,
    suggestedStars: null,
    priority: 5,
  };
}

const RULES = [readinessRule, loadRule, shortfallRule, progressionRule, confidenceRule];

/** Returns exactly ONE ranked recommendation. Never blocking, never required. */
export function recommend(ctx: CoachContext): CoachRecommendation {
  const hits = RULES.map((rule) => rule(ctx)).filter(
    (r): r is CoachRecommendation => r !== null,
  );
  if (!hits.length) return steadyRule(ctx);
  return hits.sort((a, b) => b.priority - a.priority)[0]!;
}

/**
 * The Workout of the Day is never modified by this layer. It only ever gets a
 * read-only context note; no stars, no programming, no fields are written.
 */
export function wodContextNote(ctx: CoachContext): string | null {
  if (ctx.readiness === "Recovery Recommended")
    return `Today's Workout of the Day is unchanged. ${ctx.readinessReason} Scale your effort, not the programming.`;
  if (ctx.readiness === "Caution")
    return `Today's Workout of the Day is unchanged. ${ctx.readinessReason} Pay attention to recovery around it.`;
  if (ctx.confidence === "Limited") return null;
  if (ctx.overallLoad === "Very High")
    return "Today's Workout of the Day is unchanged. Your recent training load is very high — keep the intensity honest.";
  return null;
}
