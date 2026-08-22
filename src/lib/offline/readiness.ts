import { readCache, writeCache } from "./store";

export type OfflineReadiness = {
  ready: boolean;
  userId: string | null;
  preparedAt: number | null;
  workouts: number;
  exercises: number;
  performanceRows: number;
};

const KEY = "offline:readiness";

export async function readOfflineReadiness(): Promise<OfflineReadiness> {
  return (
    (await readCache<OfflineReadiness>(KEY))?.data ?? {
      ready: false,
      userId: null,
      preparedAt: null,
      workouts: 0,
      exercises: 0,
      performanceRows: 0,
    }
  );
}

export async function markOfflineReady(
  value: Omit<OfflineReadiness, "ready" | "preparedAt"> & { complete: boolean },
) {
  const { complete, ...counts } = value;
  await writeCache(KEY, {
    ...counts,
    // A new member may legitimately have no workouts yet. Offline readiness
    // means the complete sync pass and app/library succeeded, not that the
    // account happened to contain at least one workout.
    ready: complete && value.exercises > 0,
    preparedAt: complete && value.exercises > 0 ? Date.now() : null,
  });
}