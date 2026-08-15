import { describe, expect, it } from "vitest";
import { buildSessionPlan, countTransitions, equipmentFamily, scoreWorkout } from "../programming";
import type { PoolExercise } from "../pool.server";
import type { WorkoutStep } from "../parse-steps";

const ex = (id: string, equipment: string): PoolExercise =>
  ({ id, name: `ex ${id}`, equipment } as PoolExercise);

const step = (id: string, prescription: string, section = "Main Workout"): WorkoutStep =>
  ({ exerciseId: id, name: `ex ${id}`, prescription, section, subSection: null } as WorkoutStep);

describe("session blueprint", () => {
  it("drops the finisher on short sessions", () => {
    const plan = buildSessionPlan({
      category: "STRENGTH", format: "REPS & SETS", level: "intermediate",
      stars: 2, minutes: 10, equipmentCount: 1,
    });
    expect(plan.finisher).toBeNull();
    expect(plan.mainCount[0]).toBeLessThanOrEqual(3);
  });

  it("uses heavy low reps for strength and moderate reps for hypertrophy", () => {
    const s = buildSessionPlan({ category: "STRENGTH", format: "REPS & SETS", level: "advanced", stars: 3, minutes: 45, equipmentCount: 2 });
    const h = buildSessionPlan({ category: "MUSCLE BUILDING", format: "REPS & SETS", level: "advanced", stars: 3, minutes: 45, equipmentCount: 2 });
    expect(s.main.reps![1]).toBeLessThanOrEqual(6);
    expect(h.main.reps![1]).toBeGreaterThanOrEqual(12);
    expect(s.main.restSec[0]).toBeGreaterThan(h.main.restSec[0]);
  });

  it("tightens the transition budget for circuits", () => {
    const circuit = buildSessionPlan({ category: "METABOLIC", format: "CIRCUIT", level: "intermediate", stars: 2, minutes: 30, equipmentCount: 3 });
    expect(circuit.maxEquipmentFamilies).toBeLessThanOrEqual(2);
  });
});

describe("quality score", () => {
  const library = new Map([
    ["1", ex("1", "dumbbell")],
    ["2", ex("2", "dumbbell")],
    ["3", ex("3", "barbell")],
    ["4", ex("4", "cable")],
    ["5", ex("5", "body weight")],
  ]);

  it("penalises excluded exercises and station hopping", () => {
    const plan = buildSessionPlan({ category: "METABOLIC", format: "CIRCUIT", level: "intermediate", stars: 2, minutes: 30, equipmentCount: 3 });
    const steps = ["1", "3", "4", "5", "2"].map((id) => step(id, "12 reps, rest 30 sec"));
    const clean = scoreWorkout(steps, plan, { library, estimatedMinutes: 30 });
    const dirty = scoreWorkout(steps, plan, { library, dislikedIds: ["3"], estimatedMinutes: 30 });
    expect(dirty.score).toBeLessThan(clean.score);
    expect(clean.issues.join(" ")).toMatch(/station/i);
  });

  it("counts equipment families correctly", () => {
    expect(equipmentFamily("leverage machine")).toBe("machine");
    expect(countTransitions(["a", "a", "b", "b", "a"])).toBe(2);
  });
});
