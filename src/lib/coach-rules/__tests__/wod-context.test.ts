import { describe, expect, it } from "vitest";
import { recommend, wodContextNote } from "@/lib/coach-rules";
import type { CoachContext } from "@/lib/coach-rules/types";

function ctx(partial: Partial<CoachContext> = {}): CoachContext {
  return {
    selectedStars: null,
    category: null,
    format: null,
    confidence: "Established",
    readiness: "Ready",
    readinessReason: "Recent workload leaves room for a full session.",
    strengthLoad: "Moderate",
    conditioningLoad: "Moderate",
    overallLoad: "Moderate",
    sessionsLast7: 3,
    consecutiveDays: 2,
    loggedSessions: 8,
    progressionReady: [],
    recentShortfalls: 0,
    ...partial,
  };
}

describe("Workout of the Day context", () => {
  it("produces a note without any selected difficulty", () => {
    const note = wodContextNote(
      ctx({ readiness: "Recovery Recommended", readinessReason: "Six consecutive days." }),
    );
    expect(note).toContain("unchanged");
    expect(note).not.toMatch(/star/i);
  });

  it("never mentions stars when overall load is very high", () => {
    const note = wodContextNote(ctx({ overallLoad: "Very High" }));
    expect(note).toContain("unchanged");
    expect(note).not.toMatch(/star/i);
  });

  it("says nothing when evidence is limited", () => {
    expect(wodContextNote(ctx({ confidence: "Limited", overallLoad: "Limited Data" }))).toBeNull();
  });

  it("never suggests a difficulty on the context-only path", () => {
    const rec = recommend(ctx({ progressionReady: ["squat"], overallLoad: "Very High" }));
    expect(rec.suggestedStars).toBeNull();
    expect(rec.message).not.toMatch(/star/i);
  });

  it("still recommends normally when a real selection is given", () => {
    const rec = recommend(ctx({ selectedStars: 3, overallLoad: "Very High" }));
    expect(rec.suggestedStars).toBe(2);
  });
});
