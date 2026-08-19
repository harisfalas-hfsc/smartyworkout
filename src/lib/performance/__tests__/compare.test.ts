import { describe, expect, it } from "vitest";
import { compareAttempts, directionFor } from "../compare";

function row(over: Record<string, unknown> = {}) {
  return {
    id: "r",
    workout_id: "w",
    metric: "for_time",
    format: null,
    category: null,
    duration_seconds: 600,
    rounds: null,
    extra_reps: null,
    intervals_done: null,
    intervals_total: null,
    finished: true,
    rpe: 7,
    strength_load: 100,
    conditioning_load: 50,
    analysis_note: null,
    data_points: 4,
    created_at: "2026-01-01T00:00:00.000Z",
    prescription_hash: "abc",
    ...over,
  } as never;
}

describe("metric-aware comparison", () => {
  it("treats a faster FOR TIME as better", () => {
    const c = compareAttempts({
      current: row({ duration_seconds: 540 }),
      previous: row({ duration_seconds: 600 }),
    });
    expect(c.comparable).toBe(true);
    expect(c.metrics.find((m) => m.key === "duration_for_time")?.verdict).toBe("better");
  });

  it("treats more AMRAP rounds as better", () => {
    const c = compareAttempts({
      current: row({ metric: "amrap", duration_seconds: null, rounds: 9 }),
      previous: row({ metric: "amrap", duration_seconds: null, rounds: 7 }),
    });
    expect(c.metrics.find((m) => m.key === "rounds")?.verdict).toBe("better");
  });

  it("never scores RPE or training load as an improvement", () => {
    const c = compareAttempts({
      current: row({ rpe: 9, strength_load: 400 }),
      previous: row({ rpe: 5, strength_load: 100 }),
    });
    expect(c.metrics.find((m) => m.key === "rpe")?.verdict).toBe("neutral");
    expect(c.metrics.find((m) => m.key === "strength_load")?.verdict).toBe("neutral");
    expect(directionFor("conditioning_load")).toBe("neutral");
  });

  it("marks a changed prescription as not directly comparable", () => {
    const c = compareAttempts({
      current: row({ duration_seconds: 400, prescription_hash: "xyz" }),
      previous: row({ duration_seconds: 600, prescription_hash: "abc" }),
    });
    expect(c.comparable).toBe(false);
    expect(c.reason).toBe("version_changed");
    expect(c.metrics.every((m) => m.verdict === "not_comparable")).toBe(true);
  });

  it("has no comparison for a first session", () => {
    const c = compareAttempts({ current: row(), previous: null });
    expect(c.reason).toBe("no_previous");
    expect(c.metrics).toHaveLength(0);
  });
});
