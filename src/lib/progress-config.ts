/** Centralized, configurable scoring for the Smarty Progress Score. */
export const SCORE_RULES = {
  perCompletedWorkout: 10,
  perGeneratedWorkout: 1,
  perStreakDay: 5,
  perSubscriptionMonth: 1,
} as const;

export type BadgeCategory = "subscription" | "generated" | "completed" | "streak";

export const CATEGORY_LABEL: Record<string, string> = {
  subscription: "Membership",
  generated: "Generated workouts",
  completed: "Completed workouts",
  streak: "Streaks",
};

export const CATEGORY_UNIT: Record<string, string> = {
  subscription: "months",
  generated: "workouts",
  completed: "workouts",
  streak: "days",
};

export function scoreFor(input: {
  completed: number;
  generated: number;
  activeDays: number;
  subscriptionMonths: number;
  badgePoints: number;
}) {
  return (
    input.completed * SCORE_RULES.perCompletedWorkout +
    input.generated * SCORE_RULES.perGeneratedWorkout +
    input.activeDays * SCORE_RULES.perStreakDay +
    input.subscriptionMonths * SCORE_RULES.perSubscriptionMonth +
    input.badgePoints
  );
}
