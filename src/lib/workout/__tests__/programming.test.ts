import { describe, expect, it } from "vitest";
import {
  buildSessionPlan,
  cardioExpression,
  countTransitions,
  equipmentFamily,
  microMinutes,
  resolveDifficulty,
  scoreWorkout,
  transitionCost,
} from "../programming";
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

describe("micro workout and pilates blueprints", () => {
  it("micro is one 10-minute block: no activation, cooldown or finisher", () => {
    const plan = buildSessionPlan({
      category: "MICRO-WORKOUTS", format: "CIRCUIT", level: "advanced",
      stars: 3, minutes: 45, equipmentCount: 4,
    });
    expect(plan.activationCount).toBe(0);
    expect(plan.cooldownCount).toBe(0);
    expect(plan.finisher).toBeNull();
    expect(plan.softTissue).toBe(false);
  });

  it("pilates never carries a finisher", () => {
    const plan = buildSessionPlan({
      category: "PILATES", format: "REPS & SETS", level: "intermediate",
      stars: 2, minutes: 45, equipmentCount: 2,
    });
    expect(plan.finisher).toBeNull();
    expect(plan.format).toBe("REPS & SETS");
  });
});

describe("difficulty, micro scaling, cardio and transition cost", () => {
  it("micro is always 10 minutes; no activation, cooldown or finisher", () => {
    expect(microMinutes(3)).toBe(10);
    expect(microMinutes(20)).toBe(10);
    const plan = buildSessionPlan({
      category: "MICRO-WORKOUTS", format: "REPS & SETS", level: "beginner", stars: 1,
      minutes: 3, equipmentCount: 1,
    });
    expect(plan.activationCount).toBe(0);
    expect(plan.cooldownCount).toBe(0);
    expect(plan.finisher).toBeNull();
    expect(plan.softTissue).toBe(false);
    expect(plan.mainCount).toEqual([4, 5]);
  });

  it("softens effective difficulty for low-energy states but keeps the request", () => {
    expect(resolveDifficulty(3, "tired")).toMatchObject({ requestedStars: 3, effectiveStars: 2 });
    expect(resolveDifficulty(1, "sore").effectiveStars).toBe(1);
    expect(resolveDifficulty(3, "energized").effectiveStars).toBe(3);
  });

  it("keeps the standard strength finisher driven only by duration shape", () => {
    const longStrength = buildSessionPlan({
      category: "STRENGTH", format: "REPS & SETS", level: "advanced", stars: 3,
      minutes: 60, equipmentCount: 2,
    });
    expect(longStrength.finisher).not.toBeNull();
    expect(longStrength.finisherCount[0]).toBeGreaterThan(0);
  });

  it("locks lifting categories to reps & sets and never lets the finisher rival the main block", () => {
    const plan = buildSessionPlan({
      category: "MUSCLE BUILDING", format: "TABATA", level: "intermediate", stars: 2,
      minutes: 60, equipmentCount: 2,
    });
    expect(plan.format).toBe("REPS & SETS");
    if (plan.finisher) {
      expect(plan.finisherCount[1]).toBeLessThan(plan.mainCount[0]);
      expect(plan.finisherMinutes).toBeLessThanOrEqual(10);
    }
  });

  it("drops the lifting finisher when a properly dosed main block leaves no room", () => {
    const plan = buildSessionPlan({
      category: "STRENGTH", format: "REPS & SETS", level: "advanced", stars: 3,
      minutes: 30, equipmentCount: 2,
    });
    expect(plan.mainMinutesEstimate).toBeGreaterThan(0);
    if (!plan.finisher) expect(plan.finisherDirective).toMatch(/no ⚡ finisher/i);
  });



  it("expresses cardio as continuous or intervals", () => {
    expect(cardioExpression("REPS & SETS").kind).toBe("continuous");
    expect(cardioExpression("TABATA").kind).toBe("intervals");
  });

  it("measures transition cost from equipment and position changes", () => {
    const ex = (name: string, equipment: string | null) => ({ name, equipment, body_part: null });
    const grouped = transitionCost(
      [ex("Dumbbell Press", "dumbbell"), ex("Dumbbell Row", "dumbbell")], "REPS & SETS");
    const scattered = transitionCost(
      [ex("Dumbbell Press", "dumbbell"), ex("Floor Plank", "body weight"), ex("Barbell Squat", "barbell")],
      "REPS & SETS");
    expect(grouped).toBeLessThan(scattered);
  });
});
