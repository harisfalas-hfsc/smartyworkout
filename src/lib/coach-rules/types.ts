import type {
  ConfidenceState,
  LoadState,
  ReadinessState,
} from "@/lib/performance/types";

/** Everything the rules engine is allowed to look at. No network, no AI. */
export type CoachContext = {
  /** The difficulty the USER selected (1-3 stars). Never treated as evidence. */
  selectedStars: number;
  category: string | null;
  format: string | null;
  confidence: ConfidenceState;
  readiness: ReadinessState;
  readinessReason: string;
  strengthLoad: LoadState;
  conditioningLoad: LoadState;
  overallLoad: LoadState;
  sessionsLast7: number;
  consecutiveDays: number;
  loggedSessions: number;
  /** Exercises that met their prescription in 3 comparable sessions. */
  progressionReady: string[];
  /** Sessions where logged reps fell short of the prescription. */
  recentShortfalls: number;
};

export type CoachRecommendation = {
  id: string;
  /** One sentence, always in 1 / 2 / 3 stars when it mentions difficulty. */
  message: string;
  reason: string;
  /**
   * A star suggestion is only ever produced from demonstrated performance.
   * null means "no star recommendation" — the user's selection stands.
   */
  suggestedStars: number | null;
  priority: number;
};
