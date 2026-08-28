import { describe, expect, it } from "vitest";
import {
  activationRelevanceViolation,
  categoryAllowsFinisher,
  categoryExerciseViolation,
  categoryFormatViolation,
  equipmentFamilyViolation,
  sessionOverflowViolation,

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

describe("category format lock (§4)", () => {
  it("locks controlled categories to Reps & Sets and rejects conditioning formats", () => {
    expect(categoryFormatViolation("STRENGTH", "EMOM")).toBeTruthy();
    expect(categoryFormatViolation("PILATES", "AMRAP")).toBeTruthy();
    expect(categoryFormatViolation("MUSCLE BUILDING", "TABATA")).toBeTruthy();
    expect(categoryFormatViolation("MICRO-WORKOUTS", "CIRCUIT")).toBeTruthy();
    expect(categoryFormatViolation("MICRO-WORKOUTS", "REPS & SETS")).toBeNull();
    expect(categoryFormatViolation("METABOLIC", "AMRAP")).toBeNull();
  });
});

describe("category vocabulary (§3/§7/§8/§14)", () => {
  const e = (name: string, equipment: string | null = "body weight") => ({ name, equipment });
  it("keeps stretching out of Challenge and load out of Pilates/Mobility/Recovery", () => {
    expect(categoryExerciseViolation(e("Cat Cow Stretch"), "CHALLENGE")).toBeTruthy();
    expect(categoryExerciseViolation(e("Burpee"), "CHALLENGE")).toBeNull();
    expect(categoryExerciseViolation(e("Kettlebell Swing", "kettlebell"), "PILATES")).toBeTruthy();
    expect(categoryExerciseViolation(e("Box Jump"), "MOBILITY & STABILITY")).toBeTruthy();
    expect(categoryExerciseViolation(e("Sprint"), "RECOVERY")).toBeTruthy();
    expect(categoryExerciseViolation(e("Dumbbell Curl", "dumbbell"), "MICRO-WORKOUTS")).toBeTruthy();
    expect(categoryExerciseViolation(e("Chair Squat"), "MICRO-WORKOUTS")).toBeNull();
  });
});

describe("equipment families (§12)", () => {
  it("caps a dynamic session at two implement families", () => {
    const rows = [
      { name: "Air Squat", equipment: "body weight" },
      { name: "DB Snatch", equipment: "dumbbell" },
      { name: "KB Swing", equipment: "kettlebell" },
      { name: "Band Row", equipment: "band" },
    ];
    expect(equipmentFamilyViolation(rows, "METABOLIC", "AMRAP")).toBeTruthy();
    expect(equipmentFamilyViolation(rows.slice(0, 3), "METABOLIC", "AMRAP")).toBeNull();
    expect(equipmentFamilyViolation(rows, "STRENGTH", "REPS & SETS")).toBeNull();
  });
});

describe("full session duration (§19)", () => {
  it("rejects a session whose total cost blows past the request", () => {
    expect(sessionOverflowViolation(34, 30)).toBeNull();
    expect(sessionOverflowViolation(62, 30)).toBeTruthy();
  });
});
