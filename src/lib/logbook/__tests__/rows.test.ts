import { describe, expect, it } from "vitest";
import {
  anchorDate,
  dayKey,
  equipmentOptions,
  filterMenuLabel,
  filterRows,
  parseFilters,
  sourceLabel,
  type LogbookRow,
} from "../rows";

function row(partial: Partial<LogbookRow> = {}): LogbookRow {
  return {
    id: "1",
    name: "Session",
    status: "planned",
    is_favorite: false,
    is_wod: false,
    created_by: "coach",
    equipment: [],
    scheduled_at: null,
    completed_at: null,
    created_at: "2026-08-01T10:00:00Z",
    ...partial,
  };
}

describe("parseFilters", () => {
  it("keeps known filters and drops junk", () => {
    expect(parseFilters("completed,nonsense,favorites")).toEqual(["completed", "favorites"]);
    expect(parseFilters(null)).toEqual([]);
  });
});

describe("filterRows", () => {
  const rows = [
    row({ id: "done", status: "completed", equipment: ["Dumbbell"] }),
    row({ id: "fav", is_favorite: true, equipment: ["Kettlebell"] }),
    row({ id: "sched", scheduled_at: "2026-08-10T10:00:00Z" }),
  ];

  it("returns everything when no filter is chosen", () => {
    expect(filterRows(rows, { filters: [] })).toHaveLength(3);
  });

  it("combines multiple filters as any-of", () => {
    const out = filterRows(rows, { filters: ["completed", "favorites"] });
    expect(out.map((r) => r.id).sort()).toEqual(["done", "fav"]);
  });

  it("treats anything not completed as planned", () => {
    expect(filterRows(rows, { filters: ["planned"] }).map((r) => r.id)).toEqual(["fav", "sched"]);
  });

  it("narrows by equipment on top of the status filters", () => {
    expect(filterRows(rows, { filters: [], equipment: "Kettlebell" }).map((r) => r.id)).toEqual(["fav"]);
  });
});

describe("equipmentOptions", () => {
  it("lists each piece once, sorted", () => {
    expect(
      equipmentOptions([row({ equipment: ["Rower", "Dumbbell"] }), row({ equipment: ["Dumbbell"] })]),
    ).toEqual(["Dumbbell", "Rower"]);
  });
});

describe("anchorDate", () => {
  it("prefers the scheduled day", () => {
    const d = anchorDate(row({ scheduled_at: "2026-08-10T08:00:00Z", completed_at: "2026-08-02T08:00:00Z" }));
    expect(d.toISOString()).toContain("2026-08-10");
  });

  it("falls back to completion, then creation", () => {
    expect(anchorDate(row({ completed_at: "2026-08-02T08:00:00Z" })).toISOString()).toContain("2026-08-02");
    expect(anchorDate(row()).toISOString()).toContain("2026-08-01");
  });
});

describe("sourceLabel", () => {
  it("distinguishes WOD, community copies and coach sessions", () => {
    expect(sourceLabel(row({ is_wod: true }))).toBe("Workout of the Day");
    expect(sourceLabel(row({ created_by: "community" }))).toBe("Community copy");
    expect(sourceLabel(row())).toBe("Smarty Coach");
  });
});

describe("dayKey", () => {
  it("is local-date based and zero padded", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("filterMenuLabel", () => {
  it("summarises the active filters", () => {
    expect(filterMenuLabel([], "all")).toBe("All workouts");
    expect(filterMenuLabel(["completed"], "all")).toBe("Completed");
    expect(filterMenuLabel(["planned"], "all")).toBe("Not done");
    expect(filterMenuLabel(["completed", "favorites"], "all")).toBe("2 filters");
    expect(filterMenuLabel([], "Rower")).toBe("All workouts · Rower");
  });
});
