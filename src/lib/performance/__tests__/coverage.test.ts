import { describe, expect, it } from "vitest";
import { loadCoverage } from "../coverage";

const base = {
  completedSessions: 6,
  loggedSessions: 6,
  sessionsWithRpe: 6,
  baselineWeeks: 3,
  baselineSessions: 5,
};

describe("loadCoverage", () => {
  it("says nothing is comparable before the first session", () => {
    const c = loadCoverage({ ...base, completedSessions: 0, loggedSessions: 0, sessionsWithRpe: 0, baselineSessions: 0 });
    expect(c.level).toBe("none");
    expect(c.nextStep).toContain("Complete a workout");
  });

  it("explains a completed-but-unlogged history instead of staying silent", () => {
    const c = loadCoverage({ ...base, loggedSessions: 0, sessionsWithRpe: 0, baselineSessions: 0 });
    expect(c.level).toBe("none");
    expect(c.message).toContain("completed");
    expect(c.nextStep).toContain("Log your sets");
  });

  it("asks for more history when the baseline is too thin", () => {
    const c = loadCoverage({ ...base, baselineSessions: 1 });
    expect(c.level).toBe("partial");
    expect(c.baselineSessionsNeeded).toBe(1);
    expect(c.nextStep).toContain("1 more comparable session");
  });

  it("asks for effort answers when only numbers were logged", () => {
    const c = loadCoverage({ ...base, sessionsWithRpe: 0 });
    expect(c.level).toBe("partial");
    expect(c.rpeSessionsNeeded).toBe(2);
    expect(c.nextStep).toContain("effort (RPE)");
  });

  it("is complete when history and effort are both present", () => {
    const c = loadCoverage(base);
    expect(c.level).toBe("complete");
    expect(c.nextStep).toBeNull();
  });
});
