import type { ConfidenceState } from "./types";

/**
 * How much logged evidence exists. Drives whether SmartyCoach is allowed to
 * make a recommendation at all.
 */
export function dataConfidence(input: {
  loggedSessions: number;
  loggedSets: number;
}): ConfidenceState {
  const { loggedSessions, loggedSets } = input;
  if (loggedSessions >= 6 && loggedSets >= 30) return "Established";
  if (loggedSessions >= 3 && loggedSets >= 10) return "Developing";
  return "Limited";
}

export const CONFIDENCE_NOTE: Record<ConfidenceState, string> = {
  Limited:
    "Not enough logged performance data yet. Log a few sessions and SmartyCoach can start comparing like with like.",
  Developing: "Some logged history — early signals only.",
  Established: "Enough logged history for reliable comparisons.",
};
