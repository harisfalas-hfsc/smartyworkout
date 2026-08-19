import { createStore, get, set } from "idb-keyval";
import type { SessionFeedback } from "@/lib/feedback.functions";
import type { SetLogRow, WorkoutResultRow } from "@/lib/performance/types";
import {
  conditioningLoad,
  conditioningLoadState,
  overallLoadState,
  strengthLoad,
  strengthLoadState,
  summarizeConditioning,
  summarizeStrength,
} from "@/lib/performance/load";
import { dataConfidence } from "@/lib/performance/confidence";
import { loadCoverage } from "@/lib/performance/coverage";
import { readiness } from "@/lib/performance/readiness";

const performanceStore =
  typeof indexedDB !== "undefined"
    ? createStore("smarty-offline", "performance")
    : undefined;

export type LocalSetLog = SetLogRow & { user_id: string; local_status: "pending" | "synced" };
export type LocalWorkoutResult = WorkoutResultRow & {
  id: string;
  user_id: string;
  local_status: "pending" | "synced";
};
export type LocalFeedback = SessionFeedback & {
  id: string;
  user_id: string;
  workout_id: string;
  local_status: "pending" | "synced";
};
export type LocalAttempt = {
  id: string;
  user_id: string;
  workout_id: string;
  attempt: number;
  started_at: string;
  completed_at: string | null;
};

type UserPerformance = {
  sets: LocalSetLog[];
  results: LocalWorkoutResult[];
  feedback: LocalFeedback[];
  attempts: LocalAttempt[];
};

const empty = (): UserPerformance => ({ sets: [], results: [], feedback: [], attempts: [] });
const key = (userId: string) => `user:${userId}`;

export async function readLocalPerformance(userId: string): Promise<UserPerformance> {
  if (!performanceStore) return empty();
  try {
    return { ...empty(), ...((await get<UserPerformance>(key(userId), performanceStore)) ?? {}) };
  } catch {
    return empty();
  }
}

async function writeLocalPerformance(userId: string, value: UserPerformance): Promise<void> {
  if (!performanceStore) return;
  await set(key(userId), value, performanceStore);
}

function mergeBy<T>(local: T[], server: T[], identity: (row: T) => string): T[] {
  const rows = new Map(server.map((row) => [identity(row), row]));
  for (const row of local) rows.set(identity(row), row);
  return [...rows.values()];
}

/** Server reference data refreshes local copies, but pending local mutations always win. */
export async function mergeServerPerformance(
  userId: string,
  input: {
    sets: Omit<LocalSetLog, "user_id" | "local_status">[];
    results: Omit<LocalWorkoutResult, "user_id" | "local_status">[];
    feedback: Array<SessionFeedback & { id: string; workout_id: string }>;
  },
): Promise<void> {
  const current = await readLocalPerformance(userId);
  const pendingSets = current.sets.filter((row) => row.local_status === "pending");
  const pendingResults = current.results.filter((row) => row.local_status === "pending");
  const pendingFeedback = current.feedback.filter((row) => row.local_status === "pending");
  const sets = input.sets.map((row) => ({ ...row, user_id: userId, local_status: "synced" as const }));
  const results = input.results.map((row) => ({ ...row, user_id: userId, local_status: "synced" as const }));
  const feedback = input.feedback.map((row) => ({ ...row, user_id: userId, local_status: "synced" as const }));
  await writeLocalPerformance(userId, {
    ...current,
    sets: mergeBy(sets, pendingSets, (row) => row.id),
    results: mergeBy(results, pendingResults, (row) => row.id),
    feedback: mergeBy(feedback, pendingFeedback, (row) => `${row.workout_id}:${row.attempt}`),
  });
}

export async function createLocalAttempt(userId: string, workoutId: string): Promise<LocalAttempt> {
  const current = await readLocalPerformance(userId);
  const highest = Math.max(
    0,
    ...current.attempts.filter((a) => a.workout_id === workoutId).map((a) => a.attempt),
    ...current.sets.filter((a) => a.workout_id === workoutId).map((a) => a.attempt),
    ...current.results.filter((a) => a.workout_id === workoutId).map((a) => a.attempt),
  );
  const attempt: LocalAttempt = {
    id: crypto.randomUUID(),
    user_id: userId,
    workout_id: workoutId,
    attempt: highest + 1,
    started_at: new Date().toISOString(),
    completed_at: null,
  };
  await writeLocalPerformance(userId, { ...current, attempts: [...current.attempts, attempt] });
  return attempt;
}

export async function saveLocalSet(userId: string, row: Omit<LocalSetLog, "user_id" | "local_status">) {
  const current = await readLocalPerformance(userId);
  await writeLocalPerformance(userId, {
    ...current,
    sets: mergeBy(current.sets, [{ ...row, user_id: userId, local_status: "pending" }], (item) => item.id),
  });
}

export async function saveLocalResult(
  userId: string,
  row: Omit<LocalWorkoutResult, "user_id" | "local_status" | "strength_load" | "conditioning_load">,
) {
  const current = await readLocalPerformance(userId);
  const sets = current.sets.filter(
    (setRow) => setRow.workout_id === row.workout_id && setRow.attempt === row.attempt,
  );
  const result: LocalWorkoutResult = {
    ...row,
    user_id: userId,
    strength_load: strengthLoad(sets),
    conditioning_load: conditioningLoad({ sets, result: row }),
    local_status: "pending",
  };
  await writeLocalPerformance(userId, {
    ...current,
    results: mergeBy(current.results, [result], (item) => item.id),
  });
  return result;
}

export async function saveLocalFeedback(
  userId: string,
  workoutId: string,
  feedback: SessionFeedback,
) {
  const current = await readLocalPerformance(userId);
  const row: LocalFeedback = {
    ...feedback,
    id: `${workoutId}:${feedback.attempt}`,
    user_id: userId,
    workout_id: workoutId,
    local_status: "pending",
  };
  const results = current.results.map((result) =>
    result.workout_id === workoutId && result.attempt === feedback.attempt
      ? { ...result, rpe: feedback.rpe, local_status: "pending" as const }
      : result,
  );
  await writeLocalPerformance(userId, {
    ...current,
    results,
    feedback: mergeBy(current.feedback, [row], (item) => `${item.workout_id}:${item.attempt}`),
  });
}

export async function completeLocalAttempt(userId: string, workoutId: string, attempt: number) {
  const current = await readLocalPerformance(userId);
  const completedAt = new Date().toISOString();
  await writeLocalPerformance(userId, {
    ...current,
    attempts: current.attempts.map((row) =>
      row.workout_id === workoutId && row.attempt === attempt
        ? { ...row, completed_at: completedAt }
        : row,
    ),
  });
}

export async function localSessionLoads(userId: string) {
  const current = await readLocalPerformance(userId);
  return current.results
    .map((r) => ({
      workoutId: r.workout_id,
      attempt: r.attempt,
      performedAt: r.performed_at,
      rpe: r.rpe,
      strengthLoad: r.strength_load,
      conditioningLoad: r.conditioning_load,
      durationSeconds: r.duration_seconds,
    }))
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
}

function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export async function localPerformanceOverview(userId: string) {
  const current = await readLocalPerformance(userId);
  const since = daysAgoISO(28);
  const sets = current.sets.filter((r) => r.completed_at >= since);
  const results = current.results.filter((r) => r.created_at >= since);
  const week = daysAgoISO(7);
  const weekSets = sets.filter((r) => r.completed_at >= week);
  const weekResults = results.filter((r) => r.created_at >= week);
  const baselineSets = sets.filter((r) => r.completed_at < week);
  const baselineResults = results.filter((r) => r.created_at < week);
  const strength = strengthLoadState({ current: summarizeStrength(weekSets), baseline: summarizeStrength(baselineSets), baselineWeeks: 3 });
  const conditioning = conditioningLoadState({ current: summarizeConditioning({ sets: weekSets, results: weekResults }), baseline: summarizeConditioning({ sets: baselineSets, results: baselineResults }), baselineWeeks: 3 });
  const overall = overallLoadState({ strength, conditioning });
  const loggedIds = new Set([...sets.map((r) => r.workout_id), ...results.map((r) => r.workout_id)]);
  const baselineIds = new Set([...baselineSets.map((r) => r.workout_id), ...baselineResults.map((r) => r.workout_id)]);
  const rpe = results.map((r) => r.rpe).filter((v): v is number => v !== null);
  const sessionsLast7 = new Set([...weekSets.map((r) => r.workout_id), ...weekResults.map((r) => r.workout_id)]).size;
  return {
    confidence: dataConfidence({ loggedSessions: loggedIds.size, loggedSets: sets.length }),
    coverage: loadCoverage({ completedSessions: loggedIds.size, loggedSessions: loggedIds.size, sessionsWithRpe: rpe.length, baselineWeeks: 3, baselineSessions: baselineIds.size }),
    readiness: readiness({ overallLoad: overall, sessionsLast7, consecutiveDays: 0, averageRpe: rpe.length ? rpe.reduce((a, b) => a + b, 0) / rpe.length : null, loggedSessions: loggedIds.size }),
    load: { strength, conditioning, overall },
    sessionsLast7,
    consecutiveDays: 0,
    loggedSessions: loggedIds.size,
    sessionsWithRpe: rpe.length,
    strength: [],
    conditioning: [],
    progressionReady: [],
    recentShortfalls: 0,
  };
}
