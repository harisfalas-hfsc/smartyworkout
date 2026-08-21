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
    ready: complete && value.workouts > 0 && value.exercises > 0,
    preparedAt: complete && value.workouts > 0 && value.exercises > 0 ? Date.now() : null,
  });
}