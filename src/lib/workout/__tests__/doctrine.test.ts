import { describe, expect, it } from "vitest";
import {
  activationRelevanceViolation,
  categoryAllowsFinisher,
  categoryFormatViolation,
  durationOverflowViolation,
  dynamicExerciseViolation,
  focusViolation,
  isRepsAndSetsOnly,
  microExerciseViolation,
  regionOf,
} from "../doctrine";

const ex = (over: Partial<Record<string, string>> = {}) => ({
  id: "0001",
  name: "Barbell Bench Press",
  equipment: "Barbell",
  body_part: "chest",
  target_muscle: "pectorals",
  ...over,
});

describe("category / format legality", () => {
  it("locks quality categories to reps & sets", () => {
    for (const c of ["STRENGTH", "MUSCLE BUILDING", "PILATES", "MOBILITY & STABILITY"] as const) {
      expect(isRepsAndSetsOnly(c)).toBe(true);
      expect(categoryFormatViolation(c, "AMRAP")).toBeTruthy();
      expect(categoryFormatViolation(c, "REPS & SETS")).toBeNull();
    }
  });

  it("never gives a finisher to recovery, pilates, mobility or micro", () => {
    for (const c of ["RECOVERY", "PILATES", "MOBILITY & STABILITY", "MICRO-WORKOUTS"] as const) {
      expect(categoryAllowsFinisher(c)).toBe(false);
    }
    expect(categoryAllowsFinisher("METABOLIC")).toBe(true);
  });
});

describe("dynamic format equipment doctrine", () => {
  it("bans barbell and machine work in a dynamic format", () => {
    expect(dynamicExerciseViolation(ex(), "METABOLIC", "AMRAP")).toBeTruthy();
    expect(
      dynamicExerciseViolation(ex({ name: "Cable Fly", equipment: "Cable" }), "CARDIO", "EMOM"),
    ).toBeTruthy();
  });

  it("allows portable and ergometer work in a dynamic format", () => {
    expect(
      dynamicExerciseViolation(
        ex({ name: "Kettlebell Swing", equipment: "Kettlebell", body_part: "hips" }),
        "METABOLIC",
        "AMRAP",
      ),
    ).toBeNull();
  });

  it("does not apply to reps & sets strength work", () => {
    expect(dynamicExerciseViolation(ex(), "STRENGTH", "REPS & SETS")).toBeNull();
  });
});

describe("micro-workouts", () => {
  it("rejects anything that needs equipment", () => {
    expect(microExerciseViolation(ex())).toBeTruthy();
    expect(
      microExerciseViolation(ex({ name: "Air Squat", equipment: "Body weight" })),
    ).toBeNull();
  });
});

describe("focus legality", () => {
  it("rejects an upper-body lift on a lower-body focus", () => {
    expect(focusViolation(ex(), "LOWER BODY")).toBeTruthy();
    expect(
      focusViolation(
        ex({ name: "Barbell Back Squat", body_part: "upper legs", target_muscle: "quadriceps" }),
        "LOWER BODY",
      ),
    ).toBeNull();
  });
});

describe("activation relevance", () => {
  it("flags upper-body activation before a lower-body main block", () => {
    const upper = [
      ex({ id: "1", name: "Band Pull Apart", body_part: "shoulders", target_muscle: "delts" }),
      ex({ id: "2", name: "Wall Slide", body_part: "shoulders", target_muscle: "delts" }),
    ];
    const lower = [
      ex({ id: "3", name: "Back Squat", body_part: "upper legs", target_muscle: "quadriceps" }),
      ex({ id: "4", name: "Romanian Deadlift", body_part: "upper legs", target_muscle: "hamstrings" }),
    ];
    expect(regionOf(lower[0]!)).toBe("lower");
    expect(activationRelevanceViolation(upper, lower)).toBeTruthy();
    expect(activationRelevanceViolation(lower, lower)).toBeNull();
  });
});

describe("duration ceiling", () => {
  it("rejects material overflow only", () => {
    expect(durationOverflowViolation(46, 45)).toBeNull();
    expect(durationOverflowViolation(90, 45)).toBeTruthy();
  });
});
