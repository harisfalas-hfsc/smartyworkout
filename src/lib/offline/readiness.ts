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

export async function markOfflineReady(value: Omit<OfflineReadiness, "ready" | "preparedAt">) {
  await writeCache(KEY, {
    ...value,
    ready: value.exercises > 0,
    preparedAt: value.exercises > 0 ? Date.now() : null,
  });
}