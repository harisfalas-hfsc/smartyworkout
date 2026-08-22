import Dexie, { type EntityTable } from "dexie";

export type OfflineRow = {
  local_key: string;
  user_id: string;
  id: string;
  updated_at?: string;
  created_at?: string;
  [key: string]: unknown;
};

export type CacheRow = {
  key: string;
  user_id: string;
  data: unknown;
  saved_at: number;
};

export type SyncMetaRow = {
  key: string;
  user_id: string;
  table_name: string;
  cursor: string | null;
  last_synced_at: number | null;
  last_error: string | null;
  row_count: number;
};

export type OutboxRow = {
  id: string;
  user_id: string;
  kind: string;
  payload: Record<string, unknown>;
  queued_at: number;
  priority: number;
  retries: number;
  status: "pending" | "failed" | "dead";
  last_error?: string;
  last_tried_at?: number;
};

export type MediaProgressRow = {
  key: string;
  requested: number;
  stored: number;
  failed: number;
  bytes: number;
  updated_at: number;
};

export const USER_TABLE_NAMES = [
  "profiles",
  "questionnaires",
  "generation_sessions",
  "workout_plans",
  "workouts",
  "set_logs",
  "workout_results",
  "workout_feedback",
  "personal_records",
  "notifications",
  "support_threads",
  "support_messages",
  "user_progress",
  "user_badges",
  "community_reactions",
  "community_ratings",
  "community_comments",
  "community_completions",
] as const;

export type UserTableName = (typeof USER_TABLE_NAMES)[number];

class SmartyOfflineDatabase extends Dexie {
  cache!: EntityTable<CacheRow, "key">;
  sync_meta!: EntityTable<SyncMetaRow, "key">;
  outbox!: EntityTable<OutboxRow, "id">;
  media_progress!: EntityTable<MediaProgressRow, "key">;

  profiles!: EntityTable<OfflineRow, "local_key">;
  questionnaires!: EntityTable<OfflineRow, "local_key">;
  generation_sessions!: EntityTable<OfflineRow, "local_key">;
  workout_plans!: EntityTable<OfflineRow, "local_key">;
  workouts!: EntityTable<OfflineRow, "local_key">;
  set_logs!: EntityTable<OfflineRow, "local_key">;
  workout_results!: EntityTable<OfflineRow, "local_key">;
  workout_feedback!: EntityTable<OfflineRow, "local_key">;
  personal_records!: EntityTable<OfflineRow, "local_key">;
  notifications!: EntityTable<OfflineRow, "local_key">;
  support_threads!: EntityTable<OfflineRow, "local_key">;
  support_messages!: EntityTable<OfflineRow, "local_key">;
  user_progress!: EntityTable<OfflineRow, "local_key">;
  user_badges!: EntityTable<OfflineRow, "local_key">;
  community_reactions!: EntityTable<OfflineRow, "local_key">;
  community_ratings!: EntityTable<OfflineRow, "local_key">;
  community_comments!: EntityTable<OfflineRow, "local_key">;
  community_completions!: EntityTable<OfflineRow, "local_key">;

  constructor() {
    super("smarty-workout-offline");
    this.version(1).stores({
      cache: "key, user_id, saved_at",
      sync_meta: "key, user_id, table_name, last_synced_at",
      outbox: "id, user_id, status, queued_at, last_tried_at",
      media_progress: "key, updated_at",
      profiles: "local_key, user_id, id, updated_at",
      questionnaires: "local_key, user_id, id, updated_at, created_at",
      generation_sessions: "local_key, user_id, id, updated_at, created_at",
      workout_plans: "local_key, user_id, id, created_at",
      workouts: "local_key, user_id, id, updated_at, created_at",
      set_logs: "local_key, user_id, id, completed_at, created_at",
      workout_results: "local_key, user_id, id, updated_at, created_at",
      workout_feedback: "local_key, user_id, id, updated_at, created_at",
      personal_records: "local_key, user_id, id, achieved_at, created_at",
      notifications: "local_key, user_id, id, created_at, read_at",
      support_threads: "local_key, user_id, id, updated_at, last_message_at",
      support_messages: "local_key, user_id, id, thread_id, created_at",
      user_progress: "local_key, user_id, updated_at",
      user_badges: "local_key, user_id, id, earned_at",
      community_reactions: "local_key, user_id, id, updated_at, created_at",
      community_ratings: "local_key, user_id, id, updated_at, created_at",
      community_comments: "local_key, user_id, id, updated_at, created_at",
      community_completions: "local_key, user_id, id, completed_at",
    });
  }
}

export const offlineDb = new SmartyOfflineDatabase();

export function localRow(userId: string, row: Record<string, unknown>): OfflineRow | null {
  const id = typeof row.id === "string" ? row.id : userId;
  if (!id) return null;
  return { ...row, id, user_id: userId, local_key: `${userId}:${id}` } as OfflineRow;
}

export function syncMetaKey(userId: string, tableName: string) {
  return `${userId}:${tableName}`;
}

export async function offlineDatabaseDiagnostics(userId?: string | null) {
  const tables = await Promise.all(
    USER_TABLE_NAMES.map(async (name) => ({
      name,
      rows: userId
        ? await offlineDb.table<OfflineRow, string>(name).where("user_id").equals(userId).count()
        : await offlineDb.table(name).count(),
    })),
  );
  const sync = userId
    ? await offlineDb.sync_meta.where("user_id").equals(userId).toArray()
    : await offlineDb.sync_meta.toArray();
  const outbox = userId
    ? await offlineDb.outbox.where("user_id").equals(userId).count()
    : await offlineDb.outbox.count();
  return { name: offlineDb.name, tables, sync, outbox };
}