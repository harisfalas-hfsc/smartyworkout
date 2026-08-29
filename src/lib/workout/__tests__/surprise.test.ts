import { describe, expect, it } from "vitest";
import { SURPRISE_EXCLUDED, surprisePlan, surpriseSeed } from "../surprise";
import { CATEGORIES } from "../spec";
import { microExerciseViolation } from "../doctrine";
import { getCycleDay, PERIODIZATION_84DAY, starsForCycleDayWithLevel } from "../../wod-cycle";

const ALL = [...CATEGORIES];

function plansForManyDays() {
  const out = [];
  for (let d = 1; d <= 60; d++) {
    const iso = `2026-01-${String(d).padStart(2, "0")}`.slice(0, 10);
    for (const user of ["user-a", "user-b", "0e14ddda-24a2-40c3-8de4-fe1a7620294f"]) {
      out.push(surprisePlan(surpriseSeed(user, iso), ALL, []));
    }
  }
  return out;
}

describe("surprise me contract", () => {
  it("never picks a break category", () => {
    for (const p of plansForManyDays()) {
      expect(SURPRISE_EXCLUDED).not.toContain(p.category);
    }
  });

  it("is always 2 stars", () => {
    for (const p of plansForManyDays()) expect(p.stars).toBe(2);
  });

  it("is always 40 to 50 training minutes", () => {
    for (const p of plansForManyDays()) {
      expect(p.minutes).toBeGreaterThanOrEqual(40);
      expect(p.minutes).toBeLessThanOrEqual(50);
      expect([40, 45, 50]).toContain(p.minutes);
    }
  });

  it("is deterministic per athlete per day and alternates equipment", () => {
    const a = surprisePlan(surpriseSeed("user-a", "2026-01-05"), ALL, []);
    const b = surprisePlan(surpriseSeed("user-a", "2026-01-05"), ALL, []);
    expect(a).toEqual(b);
    const even = surprisePlan(2, ALL, []);
    const odd = surprisePlan(3, ALL, []);
    expect(even.bodyweightOnly).toBe(false);
    expect(odd.bodyweightOnly).toBe(true);
  });

  it("avoids the last two categories when alternatives exist", () => {
    const seed = surpriseSeed("user-a", "2026-01-05");
    const first = surprisePlan(seed, ALL, []).category;
    const next = surprisePlan(seed, ALL, [first]).category;
    expect(next).not.toBe(first);
  });
});

describe("micro workout environment", () => {
  it("accepts bodyweight and everyday surfaces, including stairs", () => {
    for (const name of ["Chair Squat", "Wall Sit", "Stair Step Up", "Sofa Hip Thrust"]) {
      expect(microExerciseViolation({ name, equipment: "body weight" })).toBeNull();
    }
  });

  it("still rejects training equipment", () => {
    expect(microExerciseViolation({ name: "Dumbbell Curl", equipment: "dumbbell" })).not.toBeNull();
    expect(microExerciseViolation({ name: "Barbell Squat", equipment: "barbell" })).not.toBeNull();
  });
});

describe("workout of the day periodization", () => {
  it("keeps the full 84 day calendar and never programmes micro workouts", () => {
    expect(PERIODIZATION_84DAY.length).toBe(84);
    for (const day of PERIODIZATION_84DAY) expect(day.category).not.toBe("MICRO-WORKOUTS");
  });

  it("gives the same difficulty to every athlete on cycle level", () => {
    const day = getCycleDay("2026-03-01");
    expect(starsForCycleDayWithLevel(day, "cycle")).toBe(starsForCycleDayWithLevel(day, "cycle"));
    expect([1, 2, 3]).toContain(starsForCycleDayWithLevel(day, "cycle"));
  });
});
