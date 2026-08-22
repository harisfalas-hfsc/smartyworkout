export type SyncOutcome = "success" | "partial" | "error";

export function resolveSyncOutcome(options: {
  identityDone: boolean;
  personalDone: boolean;
  failedTables: number;
  fatalError?: boolean;
}): SyncOutcome {
  if (options.fatalError) return "error";
  return options.identityDone && options.personalDone && options.failedTables === 0
    ? "success"
    : "partial";
}

export function newestCursor(current: string | null, rows: Array<Record<string, unknown>>, column: string) {
  let latest = current;
  for (const row of rows) {
    const value = row[column];
    if (typeof value === "string" && (!latest || value > latest)) latest = value;
  }
  return latest;
}