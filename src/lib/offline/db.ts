import { createStore, get, set, del, keys } from "idb-keyval";

/**
 * Local database metadata: schema version, migrations, sync checkpoints and
 * diagnostics. One place, shared by every Smarty surface (browser, PWA, iOS,
 * Android WebView) so the offline copy behaves identically everywhere.
 *
 * Structured member data lives in IndexedDB (`store.ts` / `queue.ts`).
 * Static assets live in the Cache API (service worker). The two are never mixed.
 */

/** Bump when the shape of anything stored in IndexedDB changes. */
export const LOCAL_DB_VERSION = 2;

const metaStore =
  typeof indexedDB !== "undefined" ? createStore("smarty-offline-meta", "meta") : undefined;

type Meta = {
  dbVersion: number;
  appVersion: string;
  lastSyncStartedAt: number | null;
  lastSyncFinishedAt: number | null;
  lastSyncError: string | null;
  /** Phases already completed in the current prefetch pass, so an interrupted
   *  sync resumes instead of restarting from zero. */
  syncCheckpoint: Record<string, number>;
  userId: string | null;
};

const DEFAULT_META: Meta = {
  dbVersion: LOCAL_DB_VERSION,
  appVersion: "",
  lastSyncStartedAt: null,
  lastSyncFinishedAt: null,
  lastSyncError: null,
  syncCheckpoint: {},
  userId: null,
};

const META_KEY = "meta";

export async function readMeta(): Promise<Meta> {
  if (!metaStore) return { ...DEFAULT_META };
  try {
    const value = await get<Partial<Meta>>(META_KEY, metaStore);
    return { ...DEFAULT_META, ...(value ?? {}) };
  } catch {
    return { ...DEFAULT_META };
  }
}

export async function writeMeta(patch: Partial<Meta>): Promise<void> {
  if (!metaStore) return;
  try {
    const current = await readMeta();
    await set(META_KEY, { ...current, ...patch }, metaStore);
  } catch {
    /* metadata is best-effort; never block the app */
  }
}

/**
 * Versioned migration of the local database.
 *
 * Rule: member-generated local data (the pending sync queue) is NEVER destroyed
 * by a migration. Only derived server copies may be dropped, because they are
 * re-synchronised on the next online pass.
 */
export async function migrateLocalDatabase(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const meta = await readMeta();
  if (meta.dbVersion === LOCAL_DB_VERSION) return;

  try {
    if (meta.dbVersion < 2) {
      // v1 -> v2: cached server payloads changed shape. Drop the derived cache
      // store only; the queue (offline-created data) is left untouched.
      const cacheStore = createStore("smarty-offline", "cache");
      const all = await keys(cacheStore);
      await Promise.allSettled(all.map((k) => del(k as string, cacheStore)));
    }
  } catch {
    /* a failed migration must not brick the app — the next sync refills */
  }

  await writeMeta({ dbVersion: LOCAL_DB_VERSION, syncCheckpoint: {} });
}

/** Records that a background sync pass started. */
export async function markSyncStarted(): Promise<void> {
  await writeMeta({ lastSyncStartedAt: Date.now(), lastSyncError: null });
}

/** Records a completed pass (or the error that stopped it). */
export async function markSyncFinished(error?: unknown): Promise<void> {
  await writeMeta({
    lastSyncFinishedAt: Date.now(),
    lastSyncError: error ? String((error as Error)?.message ?? error) : null,
  });
}

export async function isPhaseDone(phase: string, maxAgeMs: number): Promise<boolean> {
  const meta = await readMeta();
  const at = meta.syncCheckpoint[phase];
  return typeof at === "number" && Date.now() - at < maxAgeMs;
}

export async function markPhaseDone(phase: string): Promise<void> {
  const meta = await readMeta();
  await writeMeta({ syncCheckpoint: { ...meta.syncCheckpoint, [phase]: Date.now() } });
}

/** Called on sign-in: a different member invalidates the resume checkpoints. */
export async function bindUser(userId: string | null): Promise<void> {
  const meta = await readMeta();
  if (meta.userId === userId) return;
  await writeMeta({ userId, syncCheckpoint: {} });
}

/** Non-sensitive diagnostics for the debug/admin view. */
export async function localDbDiagnostics() {
  const meta = await readMeta();
  return {
    dbVersion: meta.dbVersion,
    lastSyncStartedAt: meta.lastSyncStartedAt,
    lastSyncFinishedAt: meta.lastSyncFinishedAt,
    lastSyncError: meta.lastSyncError,
    phases: Object.keys(meta.syncCheckpoint).length,
  };
}
