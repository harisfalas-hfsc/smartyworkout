import { describe, expect, it } from "vitest";
import { newestCursor, resolveSyncOutcome } from "../sync-result";

describe("resolveSyncOutcome", () => {
  it("terminates partial passes instead of leaving them syncing", () => {
    expect(resolveSyncOutcome({ identityDone: true, personalDone: true, failedTables: 1 })).toBe("partial");
  });

  it("only reports success when all core work succeeds", () => {
    expect(resolveSyncOutcome({ identityDone: true, personalDone: true, failedTables: 0 })).toBe("success");
  });

  it("reports fatal failures separately", () => {
    expect(resolveSyncOutcome({ identityDone: true, personalDone: true, failedTables: 0, fatalError: true })).toBe("error");
  });
});

describe("newestCursor", () => {
  it("advances monotonically and ignores absent cursor values", () => {
    expect(
      newestCursor("2026-01-01T00:00:00Z", [
        { updated_at: "2026-01-02T00:00:00Z" },
        { id: "without-time" },
        { updated_at: "2025-12-31T00:00:00Z" },
      ], "updated_at"),
    ).toBe("2026-01-02T00:00:00Z");
  });
});