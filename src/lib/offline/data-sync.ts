import { supabase } from "@/integrations/supabase/client";
import {
  offlineDb,
  localRow,
  syncMetaKey,
  type OfflineRow,
  type UserTableName,
} from "./database";
import { newestCursor as latestCursor } from "./sync-result";

type SyncSpec = {
  name: UserTableName;
  cursor: "updated_at" | "created_at" | "completed_at" | "achieved_at" | "earned_at" | "last_message_at";
  mode?: "incremental" | "snapshot";
  ownerColumn?: "id" | "user_id";
};

type DynamicQueryResult = { data: unknown[] | null; error: { message: string } | null };
type DynamicRange = PromiseLike<DynamicQueryResult> & {
  gt: (column: string, value: string) => PromiseLike<DynamicQueryResult>;
};
type DynamicClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => {
          range: (from: number, to: number) => DynamicRange;
        };
      };
    };
  };
};

const SYNC_SPECS: SyncSpec[] = [
  { name: "profiles", cursor: "updated_at", ownerColumn: "id" },
  { name: "questionnaires", cursor: "updated_at" },
  { name: "generation_sessions", cursor: "updated_at" },
  { name: "workout_plans", cursor: "created_at" },
  { name: "workouts", cursor: "updated_at" },
  { name: "set_logs", cursor: "completed_at" },
  { name: "workout_results", cursor: "updated_at" },
  { name: "workout_feedback", cursor: "updated_at" },
  { name: "personal_records", cursor: "achieved_at", mode: "snapshot" },
  { name: "notifications", cursor: "created_at", mode: "snapshot" },
  { name: "support_threads", cursor: "updated_at", mode: "snapshot" },
  { name: "user_progress", cursor: "updated_at" },
  { name: "user_badges", cursor: "earned_at" },
  { name: "community_reactions", cursor: "updated_at" },
  { name: "community_ratings", cursor: "updated_at" },
  { name: "community_comments", cursor: "updated_at" },
  { name: "community_completions", cursor: "completed_at" },
];

const PAGE_SIZE = 500;
const REQUEST_TIMEOUT_MS = 15_000;

async function withTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) =>
        controller.signal.addEventListener("abort", () => reject(new Error(`${label} timed out`))),
      ),
    ]);
  } finally {
    window.clearTimeout(timer);
  }
}

async function pullDirectTable(userId: string, spec: SyncSpec): Promise<number> {
  const metaKey = syncMetaKey(userId, spec.name);
  const previous = await offlineDb.sync_meta.get(metaKey);
  const table = offlineDb.table<OfflineRow, string>(spec.name);
  let offset = 0;
  let pulled = 0;
  let newestCursor = previous?.cursor ?? null;
  const snapshotRows: OfflineRow[] = [];

  for (;;) {
    const dynamicClient = supabase as unknown as DynamicClient;
    const range = dynamicClient.from(spec.name)
      .select("*")
      .eq(spec.ownerColumn ?? "user_id", userId)
      .order(spec.cursor, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    const query = spec.mode !== "snapshot" && previous?.cursor
      ? range.gt(spec.cursor, previous.cursor)
      : range;
    const result = await withTimeout(query, spec.name);
    if (result.error) throw new Error(result.error.message);
    const rows = (result.data ?? []) as Record<string, unknown>[];
    const localRows = rows.map((row) => localRow(userId, row)).filter((row): row is OfflineRow => Boolean(row));
    if (spec.mode === "snapshot") snapshotRows.push(...localRows);
    else if (localRows.length) await table.bulkPut(localRows);
    pulled += localRows.length;
    newestCursor = latestCursor(newestCursor, rows, spec.cursor);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (spec.mode === "snapshot") {
    await offlineDb.transaction("rw", table, async () => {
      await table.where("user_id").equals(userId).delete();
      if (snapshotRows.length) await table.bulkPut(snapshotRows);
    });
  }

  const rowCount = await table.where("user_id").equals(userId).count();
  await offlineDb.sync_meta.put({
    key: metaKey,
    user_id: userId,
    table_name: spec.name,
    cursor: newestCursor,
    last_synced_at: Date.now(),
    last_error: null,
    row_count: rowCount,
  });
  return pulled;
}

async function pullSupportMessages(userId: string): Promise<number> {
  const threads = await offlineDb.support_threads.where("user_id").equals(userId).toArray();
  const ids = threads.map((row) => row.id);
  const table = offlineDb.support_messages;
  await table.where("user_id").equals(userId).delete();
  let pulled = 0;
  for (let index = 0; index < ids.length; index += 100) {
    const result = await withTimeout(
      supabase.from("support_messages").select("*").in("thread_id", ids.slice(index, index + 100)).order("created_at"),
      "support_messages",
    );
    if (result.error) throw new Error(result.error.message);
    const rows = ((result.data ?? []) as Record<string, unknown>[])
      .map((row) => localRow(userId, row))
      .filter((row): row is OfflineRow => Boolean(row));
    if (rows.length) await table.bulkPut(rows);
    pulled += rows.length;
  }
  await offlineDb.sync_meta.put({
    key: syncMetaKey(userId, "support_messages"),
    user_id: userId,
    table_name: "support_messages",
    cursor: null,
    last_synced_at: Date.now(),
    last_error: null,
    row_count: pulled,
  });
  return pulled;
}

export type DataSyncResult = { succeeded: number; failed: Array<{ table: string; error: string }> };

export async function syncUserTables(userId: string): Promise<DataSyncResult> {
  const failed: DataSyncResult["failed"] = [];
  let succeeded = 0;
  for (const spec of SYNC_SPECS) {
    try {
      await pullDirectTable(userId, spec);
      succeeded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failed.push({ table: spec.name, error: message });
      const previous = await offlineDb.sync_meta.get(syncMetaKey(userId, spec.name));
      await offlineDb.sync_meta.put({
        key: syncMetaKey(userId, spec.name),
        user_id: userId,
        table_name: spec.name,
        cursor: previous?.cursor ?? null,
        last_synced_at: previous?.last_synced_at ?? null,
        last_error: message,
        row_count: previous?.row_count ?? 0,
      });
    }
  }
  try {
    await pullSupportMessages(userId);
    succeeded += 1;
  } catch (error) {
    failed.push({ table: "support_messages", error: error instanceof Error ? error.message : String(error) });
  }
  return { succeeded, failed };
}