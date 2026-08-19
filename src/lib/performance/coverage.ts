// Explains WHY a progress figure says "Limited Data" and what one action
// would unlock it. The system is honest about gaps; it must not be silent
// about them.

export type CoverageInput = {
  /** Completed sessions in the recent window (whether or not anything was logged). */
  completedSessions: number;
  /** Sessions that carried any objective performance data. */
  loggedSessions: number;
  /** Sessions that carried an effort (RPE) answer. */
  sessionsWithRpe: number;
  /** Weeks of history behind the baseline. */
  baselineWeeks: number;
  /** Comparable sessions inside that baseline. */
  baselineSessions: number;
};

export type Coverage = {
  level: "none" | "partial" | "complete";
  message: string;
  /** Single concrete next step, or null when nothing is missing. */
  nextStep: string | null;
  /** How many more effort answers unlock the effort qualifier. */
  rpeSessionsNeeded: number;
  /** How many more comparable sessions unlock baseline comparison. */
  baselineSessionsNeeded: number;
};

const MIN_RPE_SESSIONS = 2;
const MIN_BASELINE_SESSIONS = 2;
const MIN_BASELINE_WEEKS = 2;

export function loadCoverage(input: CoverageInput): Coverage {
  const rpeSessionsNeeded = Math.max(0, MIN_RPE_SESSIONS - input.sessionsWithRpe);
  const baselineSessionsNeeded = Math.max(0, MIN_BASELINE_SESSIONS - input.baselineSessions);

  if (input.completedSessions === 0 && input.loggedSessions === 0) {
    return {
      level: "none",
      message: "No sessions yet in this window, so there is nothing to compare.",
      nextStep: "Complete a workout to start your history.",
      rpeSessionsNeeded,
      baselineSessionsNeeded,
    };
  }

  if (input.loggedSessions === 0) {
    return {
      level: "none",
      message:
        "Your sessions are counted as completed, but nothing measurable was logged, so training load cannot be calculated.",
      nextStep: "Log your sets, reps, weights or times in the player to unlock training load.",
      rpeSessionsNeeded,
      baselineSessionsNeeded,
    };
  }

  if (baselineSessionsNeeded > 0 || input.baselineWeeks < MIN_BASELINE_WEEKS) {
    return {
      level: "partial",
      message:
        "Training load compares this week against your own typical week, and there is not enough history behind you yet.",
      nextStep:
        baselineSessionsNeeded > 0
          ? `Log ${baselineSessionsNeeded} more comparable session${baselineSessionsNeeded === 1 ? "" : "s"} to unlock baseline comparison.`
          : "Keep logging for another week to unlock baseline comparison.",
      rpeSessionsNeeded,
      baselineSessionsNeeded,
    };
  }

  if (rpeSessionsNeeded > 0) {
    return {
      level: "partial",
      message:
        "Training load is running on your logged numbers only — no effort answers yet, so nothing is adjusting for how hard the work felt.",
      nextStep: `Add effort (RPE) to ${rpeSessionsNeeded} more session${rpeSessionsNeeded === 1 ? "" : "s"} to include effort in your load.`,
      rpeSessionsNeeded,
      baselineSessionsNeeded,
    };
  }

  return {
    level: "complete",
    message: "Enough logged history to compare this week against your own normal.",
    nextStep: null,
    rpeSessionsNeeded: 0,
    baselineSessionsNeeded: 0,
  };
}
