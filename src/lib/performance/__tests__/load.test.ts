import { describe, expect, it } from "vitest";
import {
  conditioningLoadState,
  overallLoadState,
  strengthLoad,
  strengthLoadState,
  summarizeConditioning,
  summarizeStrength,
} from "@/lib/performance/load";
import type { SetLogRow, WorkoutResultRow } from "@/lib/performance/types";

function set(partial: Partial<SetLogRow> & { workout_id: string }): SetLogRow {
  return {
    id: Math.random().toString(36).slice(2),
    step_index: 0,
    exercise_id: null,
    exercise_name: "squat",
    section: null,
    set_number: 1,
    reps: null,
    weight_kg: null,
    seconds: null,
    planned_reps: null,
    planned_weight_kg: null,
    planned_seconds: null,
    rpe: null,
    metric: null,
    rounds: null,
    interval_index: null,
    distance_m: null,
    partial: null,
    completed_at: new Date().toISOString(),
    ...partial,
  } as SetLogRow;
}

function result(partial: Partial<WorkoutResultRow> & { workout_id: string }): WorkoutResultRow {
  return {
    format: null,
    category: null,
    metric: null,
    duration_seconds: null,
    rounds: null,
    extra_reps: null,
    intervals_done: null,
    intervals_total: null,
    finished: null,
    rpe: null,
    analysis_note: null,
    strength_load: null,
    conditioning_load: null,
    data_points: null,
    created_at: new Date().toISOString(),
    ...partial,
  } as WorkoutResultRow;
}

function strengthWeek(id: string, sets: number, reps: number, kg: number | null) {
  return Array.from({ length: sets }, (_, i) =>
    set({ workout_id: `${id}-${i % 3}`, set_number: i + 1, reps, weight_kg: kg }),
  );
}

describe("strength load is relative to the athlete's own baseline", () => {
  const baseline = summarizeStrength(strengthWeek("b", 30, 10, 100)); // 3 weeks
  const baselineWeeks = 3;

  it("is Moderate when the week matches the athlete's typical week", () => {
    const current = summarizeStrength(strengthWeek("c", 10, 10, 100));
    expect(strengthLoadState({ current, baseline, baselineWeeks })).toBe("Moderate");
  });

  it("is Low when meaningfully below the baseline", () => {
    const current = summarizeStrength(strengthWeek("c", 4, 10, 100));
    expect(strengthLoadState({ current, baseline, baselineWeeks })).toBe("Low");
  });

  it("is High when meaningfully above the baseline", () => {
    const current = summarizeStrength(strengthWeek("c", 15, 10, 100));
    expect(strengthLoadState({ current, baseline, baselineWeeks })).toBe("High");
  });

  it("is Very High when far above the baseline", () => {
    const current = summarizeStrength(strengthWeek("c", 25, 10, 100));
    expect(strengthLoadState({ current, baseline, baselineWeeks })).toBe("Very High");
  });

  it("returns Limited Data without enough comparable history", () => {
    const thin = summarizeStrength(strengthWeek("b", 2, 10, 100).slice(0, 1));
    const current = summarizeStrength(strengthWeek("c", 10, 10, 100));
    expect(strengthLoadState({ current, baseline: thin, baselineWeeks: 3 })).toBe("Limited Data");
  });

  it("returns None when nothing at all was logged this week", () => {
    expect(
      strengthLoadState({
        current: summarizeStrength([]),
        baseline,
        baselineWeeks,
      }),
    ).toBe("None");
  });
});

describe("no invented values", () => {
  it("never turns bodyweight reps into external volume", () => {
    const bodyweight = summarizeStrength(strengthWeek("c", 5, 20, null));
    expect(bodyweight.externalVolumeKg).toBeNull();
    expect(bodyweight.reps).toBe(100);
    expect(strengthLoad(strengthWeek("c", 5, 20, null))).toBeNull();
  });

  it("leaves measures that were never logged as null rather than zero", () => {
    const c = summarizeConditioning({
      sets: [set({ workout_id: "w", seconds: 120 })],
      results: [],
    });
    expect(c.seconds).toBe(120);
    expect(c.distanceM).toBeNull();
    expect(c.rounds).toBeNull();
    expect(c.intervals).toBeNull();
  });

  it("ignores a measure the baseline never contained", () => {
    const current = summarizeConditioning({
      sets: [],
      results: [result({ workout_id: "c", duration_seconds: 1200, rounds: 12 })],
    });
    const baseline = summarizeConditioning({
      sets: [],
      results: [
        result({ workout_id: "b1", duration_seconds: 1200 }),
        result({ workout_id: "b2", duration_seconds: 1200 }),
        result({ workout_id: "b3", duration_seconds: 1200 }),
      ],
    });
    // Rounds have no baseline, so only duration is compared: 1200 vs 1200/week.
    expect(conditioningLoadState({ current, baseline, baselineWeeks: 3 })).toBe("Moderate");
  });
});

describe("overall load", () => {
  it("uses only the domains that produced a band", () => {
    expect(overallLoadState({ strength: "Moderate", conditioning: "None" })).toBe("Moderate");
  });

  it("bumps one band when both domains were loaded in the same week", () => {
    expect(overallLoadState({ strength: "Moderate", conditioning: "Moderate" })).toBe("High");
  });

  it("stays Limited Data when no domain could be classified", () => {
    expect(overallLoadState({ strength: "Limited Data", conditioning: "None" })).toBe(
      "Limited Data",
    );
  });
});
