import { describe, expect, it } from "vitest";
import {
  countLabel,
  difficultyLabel,
  durationLabel,
  equipmentBadges,
  equipmentSummary,
} from "../labels";

describe("difficultyLabel", () => {
  it("names each star level the same way everywhere", () => {
    expect(difficultyLabel(1)).toBe("1 star · Foundation");
    expect(difficultyLabel(2)).toBe("2 stars · Developing");
    expect(difficultyLabel(3)).toBe("3 stars · Advanced");
  });

  it("handles missing or out-of-range values", () => {
    expect(difficultyLabel(null)).toBe("Unrated");
    expect(difficultyLabel(0)).toBe("Unrated");
    expect(difficultyLabel(9)).toBe("3 stars · Advanced");
  });
});

describe("durationLabel", () => {
  it("formats minutes and hours", () => {
    expect(durationLabel(45)).toBe("45 min");
    expect(durationLabel(60)).toBe("1 h");
    expect(durationLabel(75)).toBe("1 h 15 min");
  });

  it("shows a dash instead of zero", () => {
    expect(durationLabel(0)).toBe("—");
    expect(durationLabel(null)).toBe("—");
  });
});

describe("equipmentBadges", () => {
  it("caps the list and reports the overflow", () => {
    const { shown, overflow } = equipmentBadges(["A", "B", "C", "D", "E", "F"], 4);
    expect(shown).toEqual(["A", "B", "C", "D"]);
    expect(overflow).toBe(2);
  });

  it("drops blanks", () => {
    expect(equipmentBadges([" ", "Rower"]).shown).toEqual(["Rower"]);
  });
});

describe("equipmentSummary", () => {
  it("says Bodyweight when nothing is needed", () => {
    expect(equipmentSummary([])).toBe("Bodyweight");
    expect(equipmentSummary(null)).toBe("Bodyweight");
    expect(equipmentSummary(["Dumbbell", "Bench"])).toBe("Dumbbell, Bench");
  });
});

describe("countLabel", () => {
  it("never prints session(s)", () => {
    expect(countLabel(1, "session")).toBe("1 session");
    expect(countLabel(3, "session")).toBe("3 sessions");
  });
});
