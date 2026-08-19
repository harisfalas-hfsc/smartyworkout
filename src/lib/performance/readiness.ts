// Readiness is a TRAINING-MANAGEMENT indicator only. It is not a medical,
// physiological or diagnostic statement, and it never claims to know how the
// athlete feels. With insufficient evidence it returns Limited Data.

import type { LoadState, ReadinessState } from "./types";

export function readiness(input: {
  overallLoad: LoadState;
  /** Sessions completed in the last 7 days. */
  sessionsLast7: number;
  /** Consecutive days trained up to today. */
  consecutiveDays: number;
  /** Average logged RPE over the last sessions, when any was given. */
  averageRpe: number | null;
  /** How many sessions carried any logged performance data. */
  loggedSessions: number;
}): { state: ReadinessState; reason: string } {
  if (input.loggedSessions < 2 && input.sessionsLast7 < 2) {
    return {
      state: "Limited Data",
      reason: "Not enough recent training history to judge recovery needs.",
    };
  }

  if (input.overallLoad === "Very High" || input.consecutiveDays >= 6) {
    return {
      state: "Recovery Recommended",
      reason:
        input.consecutiveDays >= 6
          ? `${input.consecutiveDays} consecutive training days.`
          : "Recent training load is very high.",
    };
  }

  if (input.overallLoad === "High" || (input.averageRpe !== null && input.averageRpe >= 8.5)) {
    return {
      state: "Caution",
      reason:
        input.averageRpe !== null && input.averageRpe >= 8.5
          ? "Recent sessions were logged at a high effort."
          : "Recent training load is high.",
    };
  }

  // Without enough comparable history the load cannot be classified, so no
  // readiness claim is made either.
  if (input.overallLoad === "Limited Data") {
    return {
      state: "Limited Data",
      reason: "Not enough comparable training history yet to judge recent workload.",
    };
  }

  if (input.overallLoad === "Moderate" || input.sessionsLast7 >= 4) {
    return { state: "Moderate", reason: "Steady recent workload." };
  }

  return { state: "Ready", reason: "Recent workload leaves room for a full session." };
}
