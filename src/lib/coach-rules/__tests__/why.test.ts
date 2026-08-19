import { describe, expect, it } from "vitest";
import { whyThisSession, type WhyContext } from "../why";

const base: WhyContext = {
  readiness: "Ready",
  overallLoad: "Moderate",
  averageRpe: 6,
  recentFeelings: ["Good", "Good"],
  deprioritizedFormats: [],
  avoidedExercises: [],
  favoredExercises: [],
  loggedSessions: 8,
};

describe("whyThisSession", () => {
  it("leads with recovery when readiness says so", () => {
    const lines = whyThisSession({ ...base, readiness: "Recovery Recommended" });
    expect(lines[0]).toContain("recovery");
  });

  it("explains a held-back session when load is high", () => {
    expect(whyThisSession({ ...base, overallLoad: "Very High" })[0]).toContain("very high");
  });

  it("reflects repeated tired answers", () => {
    const lines = whyThisSession({ ...base, recentFeelings: ["Tired", "Exhausted", "Good"] });
    expect(lines.join(" ")).toContain("tired");
  });

  it("names avoided and favoured exercises", () => {
    const lines = whyThisSession({
      ...base,
      avoidedExercises: ["Barbell Back Squat"],
      favoredExercises: ["Kettlebell Swing"],
    });
    expect(lines.join(" ")).toContain("Barbell Back Squat");
    expect(lines.join(" ")).toContain("Kettlebell Swing");
  });

  it("never shows more than three lines", () => {
    const lines = whyThisSession({
      ...base,
      readiness: "Recovery Recommended",
      overallLoad: "Very High",
      recentFeelings: ["Tired", "Tired"],
      averageRpe: 9,
      avoidedExercises: ["A"],
      favoredExercises: ["B"],
      deprioritizedFormats: ["AMRAP"],
    });
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  it("tells a brand-new member how adaptation starts", () => {
    const lines = whyThisSession({ ...base, loggedSessions: 0, averageRpe: null });
    expect(lines[0]).toContain("Training Profile");
  });

  it("stays silent rather than inventing a reason", () => {
    expect(whyThisSession({ ...base, averageRpe: null })).toEqual([]);
  });
});
