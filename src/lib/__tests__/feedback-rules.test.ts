import { describe, expect, it } from "vitest";
import { clampRpe, debriefCoverage, normalizeDebrief, pickOption } from "../feedback-rules";

describe("clampRpe", () => {
  it("keeps a valid answer", () => {
    expect(clampRpe(7)).toBe(7);
    expect(clampRpe("8")).toBe(8);
  });

  it("never invents an answer from nothing", () => {
    expect(clampRpe(null)).toBeNull();
    expect(clampRpe(undefined)).toBeNull();
    expect(clampRpe("")).toBeNull();
    expect(clampRpe("abc")).toBeNull();
  });

  it("clamps to the 1-10 scale", () => {
    expect(clampRpe(0)).toBe(1);
    expect(clampRpe(99)).toBe(10);
    expect(clampRpe(6.6)).toBe(7);
  });
});

describe("pickOption", () => {
  it("only accepts known options", () => {
    expect(pickOption("Good", ["Excellent", "Good"])).toBe("Good");
    expect(pickOption("Terrible", ["Excellent", "Good"])).toBeNull();
    expect(pickOption(42, ["Good"])).toBeNull();
  });
});

describe("normalizeDebrief", () => {
  it("accepts a fully answered debrief", () => {
    expect(
      normalizeDebrief({
        rpe: 9,
        feeling: "Tired",
        enjoyed: "Yes",
        wouldRepeat: "Maybe",
        note: "Shoulder felt tight",
      }),
    ).toEqual({
      rpe: 9,
      feeling: "Tired",
      enjoyed: "Yes",
      wouldRepeat: "Maybe",
      note: "Shoulder felt tight",
    });
  });

  it("keeps unanswered questions as null rather than defaults", () => {
    expect(normalizeDebrief({})).toEqual({
      rpe: null,
      feeling: null,
      enjoyed: null,
      wouldRepeat: null,
      note: null,
    });
  });

  it("truncates a long note instead of rejecting it", () => {
    const note = normalizeDebrief({ note: "x".repeat(900) }).note;
    expect(note).toHaveLength(500);
  });
});

describe("debriefCoverage", () => {
  it("treats a completed workout with no answers as valid", () => {
    const c = debriefCoverage(normalizeDebrief({}));
    expect(c.answered).toBe(0);
    expect(c.usable.load).toBe(false);
    expect(c.label).toBe("Completed — performance not logged");
  });

  it("uses only the half that was answered", () => {
    const c = debriefCoverage(normalizeDebrief({ rpe: 8 }));
    expect(c.usable.load).toBe(true);
    expect(c.usable.preference).toBe(false);
    expect(c.label).toContain("partly answered");
  });

  it("lets feeling drive readiness without touching load", () => {
    const c = debriefCoverage(normalizeDebrief({ feeling: "Exhausted" }));
    expect(c.usable.load).toBe(false);
    expect(c.usable.readiness).toBe(true);
  });

  it("recognises a complete debrief", () => {
    const c = debriefCoverage(
      normalizeDebrief({ rpe: 5, feeling: "Good", enjoyed: "Yes", wouldRepeat: "Yes", note: "ok" }),
    );
    expect(c.label).toBe("Debrief complete");
  });
});
