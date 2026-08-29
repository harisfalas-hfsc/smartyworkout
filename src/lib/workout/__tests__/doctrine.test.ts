import { describe, expect, it } from "vitest";
import {
  activationOverflowViolation,
  cooldownOverflowViolation,
  activationRelevanceViolation,
  categoryAllowsFinisher,
  categoryExerciseViolation,
  categoryFormatViolation,
  equipmentFamilyViolation,
  sessionOverflowViolation,
  sessionBudgetViolation,

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
    for (const c of ["STRENGTH", "MUSCLE BUILDING", "PILATES"] as const) {
      expect(isRepsAndSetsOnly(c)).toBe(true);
      expect(categoryFormatViolation(c, "AMRAP")).toBeTruthy();
      expect(categoryFormatViolation(c, "REPS & SETS")).toBeNull();
    }
    // Mobility & Stability: Reps & Sets or Mix only — never a clock format.
    expect(categoryFormatViolation("MOBILITY & STABILITY", "REPS & SETS")).toBeNull();
    expect(categoryFormatViolation("MOBILITY & STABILITY", "MIX")).toBeNull();
    for (const f of ["AMRAP", "EMOM", "CIRCUIT", "TABATA", "FOR TIME"] as const)
      expect(categoryFormatViolation("MOBILITY & STABILITY", f)).toBeTruthy();
    // Recovery: MIX only.
    expect(categoryFormatViolation("RECOVERY", "MIX")).toBeNull();
    expect(categoryFormatViolation("RECOVERY", "REPS & SETS")).toBeTruthy();
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
    expect(categoryFormatViolation("MICRO-WORKOUTS", "CIRCUIT")).toBeNull();
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


describe("§33 required scenarios", () => {
  const row = (name: string, equipment: string, body_part = "upper arms") => ({
    id: name.slice(0, 4),
    name,
    equipment,
    body_part,
    target_muscle: body_part,
  });

  it("rejects the invalid barbell EMOM sequence outright", () => {
    const seq = [
      row("Barbell Bench Press", "Barbell", "chest"),
      row("Barbell Back Squat", "Barbell", "upper legs"),
      row("Lat Pulldown", "Cable", "back"),
      row("Leg Press", "Leverage Machine", "upper legs"),
    ];
    for (const e of seq) {
      expect(dynamicExerciseViolation(e, "METABOLIC", "EMOM")).toBeTruthy();
    }
  });

  it("keeps machines, barbells and cables legal for strength and muscle building", () => {
    for (const c of ["STRENGTH", "MUSCLE BUILDING"] as const) {
      for (const e of [
        row("Barbell Back Squat", "Barbell", "upper legs"),
        row("Leverage Chest Press", "Leverage Machine", "chest"),
        row("Cable Triceps Pushdown", "Cable", "upper arms"),
      ]) {
        expect(dynamicExerciseViolation(e, c, "REPS & SETS")).toBeNull();
        expect(categoryExerciseViolation(e, c)).toBeNull();
      }
    }
  });

  it("keeps repeatable portable work legal in cardio EMOM, metabolic For Time and calorie Tabata", () => {
    const portable = [
      row("Kettlebell Swing", "Kettlebell", "upper legs"),
      row("Jump Rope", "Rope", "cardio"),
      row("Burpee", "Body Weight", "cardio"),
      row("Dumbbell Thruster", "Dumbbell", "upper legs"),
    ];
    const cases = [
      ["CARDIO", "EMOM"],
      ["METABOLIC", "FOR TIME"],
      ["CALORIE BURNING", "TABATA"],
    ] as const;
    for (const [c, f] of cases) {
      expect(categoryFormatViolation(c, f)).toBeNull();
      for (const e of portable) expect(dynamicExerciseViolation(e, c, f)).toBeNull();
    }
  });

  it("keeps upper and lower body focus pure", () => {
    expect(focusViolation(row("Barbell Back Squat", "Barbell", "upper legs"), "UPPER BODY")).toBeTruthy();
    expect(focusViolation(row("Dumbbell Bench Press", "Dumbbell", "chest"), "LOWER BODY")).toBeTruthy();
    expect(focusViolation(row("Dumbbell Bench Press", "Dumbbell", "chest"), "UPPER BODY")).toBeNull();
    expect(focusViolation(row("Goblet Squat", "Kettlebell", "upper legs"), "LOWER BODY")).toBeNull();
  });

  it("counts the advertised duration as training time with bounded prep", () => {
    // 30 min of training plus activation and cool down allowances is fine.
    expect(sessionOverflowViolation(41, 30)).toBeNull();
    // A session that balloons far beyond training time + prep is rejected.
    expect(sessionOverflowViolation(60, 30)).toBeTruthy();
    // Prep itself can never balloon.
    expect(activationOverflowViolation(6, 30)).toBeNull();
    expect(activationOverflowViolation(15, 30)).toBeTruthy();
    expect(cooldownOverflowViolation(5, 30)).toBeNull();
    expect(cooldownOverflowViolation(12, 30)).toBeTruthy();
  });
});

describe("clock-driven format contract", () => {
  const ex = (name: string, equipment: string | null = "body weight") => ({ name, equipment });
  const CLOCK = ["AMRAP", "EMOM", "CIRCUIT", "TABATA", "FOR TIME"] as const;

  it("rejects high-skill and single-limb movements in every clock format", () => {
    for (const f of CLOCK) {
      for (const n of [
        "Handstand Push-Up",
        "Pistol Squat",
        "Archer Push-Up",
        "Planche Hold",
        "Muscle-Up",
        "Nordic Hamstring Curl",
        "One-Arm Dumbbell Press",
      ]) {
        expect(dynamicExerciseViolation(ex(n), "CALORIE BURNING", f)).toBeTruthy();
      }
    }
  });

  it("rejects machines, racks and benches in a clock format for any category", () => {
    expect(dynamicExerciseViolation(ex("Barbell Bench Press", "barbell"), "CHALLENGE", "EMOM")).toBeTruthy();
    expect(dynamicExerciseViolation(ex("Leg Press", "leverage machine"), "METABOLIC", "CIRCUIT")).toBeTruthy();
    expect(dynamicExerciseViolation(ex("Lat Pulldown", "cable"), "MICRO-WORKOUTS", "TABATA")).toBeTruthy();
  });

  it("keeps portable conditioning vocabulary legal", () => {
    for (const [n, eq] of [
      ["Kettlebell Swing", "kettlebell"],
      ["Dumbbell Thruster", "dumbbell"],
      ["Box Jump", "body weight"],
      ["Rowing Machine Interval", "rower"],
    ] as const) {
      expect(dynamicExerciseViolation(ex(n, eq), "CARDIO", "AMRAP")).toBeNull();
    }
  });

  it("never restricts equipment in a Reps & Sets session", () => {
    for (const c of ["STRENGTH", "MUSCLE BUILDING"] as const) {
      for (const [n, eq] of [
        ["Barbell Bench Press", "barbell"],
        ["Leg Press", "leverage machine"],
        ["Lat Pulldown", "cable"],
        ["Barbell Back Squat", "barbell"],
      ] as const) {
        expect(dynamicExerciseViolation(ex(n, eq), c, "REPS & SETS")).toBeNull();
      }
    }
  });
});

describe("section budgets add up (§19)", () => {
  it("rejects a session that materially undershoots the requested time", () => {
    expect(sessionBudgetViolation(20, 12, 40)).toBeTruthy();
    expect(sessionBudgetViolation(52, 40, 40)).toBeNull();
  });
});
