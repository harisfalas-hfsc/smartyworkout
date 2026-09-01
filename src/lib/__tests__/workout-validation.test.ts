import { describe, expect, it } from "vitest";
import {
  classifyFailureKind,
  classifyIssues,
  isDeliverable,
  MAX_GENERATION_ATTEMPTS,
  generationIdempotencyKey,
  resolveRequestConflicts,
  retryDelayMs,
} from "@/lib/workout-validation";

describe("issue classification", () => {
  it("treats volume drift as soft", () => {
    const split = classifyIssues([
      "Prescribed work (~48 min) materially exceeds the advertised 40 min session.",
      "The prescribed sections only add up to ~18 min of training against a requested 40 min — the session is materially short.",
      "Cool down (~14 min) is too long — it may take at most about 8 min.",
    ]);
    expect(split.structural).toHaveLength(0);
    expect(split.soft).toHaveLength(3);
    expect(isDeliverable(split.soft)).toBe(true);
  });

  it("treats missing structure as blocking", () => {
    const split = classifyIssues([
      "Main Workout has only 2 exercises.",
      "Exercise 'Ring muscle up' is not in the library.",
      "Session quality 72/100.",
    ]);
    expect(split.structural).toEqual([
      "Main Workout has only 2 exercises.",
      "Exercise 'Ring muscle up' is not in the library.",
    ]);
    expect(split.soft).toHaveLength(1);
    expect(isDeliverable(split.structural)).toBe(false);
  });
});

describe("conflict resolution by priority", () => {
  it("medical limits beat the training goal and level", () => {
    const r = resolveRequestConflicts({
      limitations: ["knee pain"],
      goal: "challenge",
      level: "advanced",
      equipment: ["barbell"],
    });
    expect(r.goal).toBe("strength");
    expect(r.level).toBe("intermediate");
    expect(r.notes.length).toBeGreaterThan(0);
  });

  it("outdoor sessions keep only portable equipment", () => {
    const r = resolveRequestConflicts({ location: "outdoor", equipment: ["barbell", "dumbbells"] });
    expect(r.equipment).toEqual(["dumbbells"]);
  });

  it("falls back to bodyweight instead of failing", () => {
    const r = resolveRequestConflicts({ location: "outdoor", equipment: ["machines"] });
    expect(r.equipment).toEqual(["bodyweight"]);
  });

  it("a liked exercise outranks the same exercise disliked", () => {
    const r = resolveRequestConflicts({ favorites: ["a"], dislikes: ["a", "b"] });
    expect(r.dislikes).toEqual(["b"]);
  });
});

describe("retry policy", () => {
  it("backs off exponentially and caps", () => {
    expect(retryDelayMs(1)).toBe(120000);
    expect(retryDelayMs(2)).toBe(240000);
    expect(retryDelayMs(99)).toBe(retryDelayMs(MAX_GENERATION_ATTEMPTS));
  });

  it("classifies failure kinds", () => {
    expect(classifyFailureKind("402 Payment Required — no credits left")).toBe("ai_balance");
    expect(classifyFailureKind("fetch failed")).toBe("outage");
    expect(classifyFailureKind("Main Workout has only 2 exercises")).toBe("technical");
  });

  it("derives stable idempotency keys", () => {
    expect(generationIdempotencyKey("s1", "workout-ready-customer")).toBe("s1:workout-ready-customer");
  });
});
