import { describe, expect, it } from "vitest";
import { capabilitiesFrom, firstBlock, type AccessLike } from "../access-capabilities";

const base: AccessLike = {
  profileComplete: true,
  healthAcknowledged: true,
  readinessComplete: true,
  premium: true,
  missingProfileFields: [],
  generationsLeftToday: 2,
  generationsLimit: 2,
};

describe("capabilitiesFrom", () => {
  it("opens everything for a complete, paying member", () => {
    const caps = capabilitiesFrom(base);
    expect(caps.generateWorkout.allowed).toBe(true);
    expect(caps.workoutOfTheDay.allowed).toBe(true);
    expect(caps.community.allowed).toBe(true);
  });

  it("sends an incomplete profile to the profile, not to checkout", () => {
    const caps = capabilitiesFrom({ ...base, profileComplete: false, missingProfileFields: ["age"] });
    expect(caps.generateWorkout.action).toBe("profile");
    expect(caps.generateWorkout.reason).toContain("age");
  });

  it("puts health acknowledgement before everything else", () => {
    const caps = capabilitiesFrom({ ...base, healthAcknowledged: false, premium: false });
    expect(caps.generateWorkout.action).toBe("profile");
  });

  it("gates a complete non-member on membership", () => {
    const caps = capabilitiesFrom({ ...base, premium: false });
    expect(caps.generateWorkout.action).toBe("membership");
    expect(caps.workoutOfTheDay.action).toBe("membership");
    expect(caps.community.action).toBe("membership");
  });

  it("never lets the daily quota block the Workout of the Day", () => {
    const caps = capabilitiesFrom({ ...base, generationsLeftToday: 0 });
    expect(caps.generateWorkout.allowed).toBe(false);
    expect(caps.workoutOfTheDay.allowed).toBe(true);
  });

  it("treats free access mode (premium true) exactly like a paid member", () => {
    expect(capabilitiesFrom({ ...base, premium: true }).community.allowed).toBe(true);
  });
});

describe("firstBlock", () => {
  it("returns the first blocking capability for a single banner", () => {
    const caps = capabilitiesFrom({ ...base, premium: false });
    expect(firstBlock(caps, ["community", "generateWorkout"])?.id).toBe("community");
  });

  it("returns null when nothing blocks", () => {
    expect(firstBlock(capabilitiesFrom(base), ["generateWorkout", "community"])).toBeNull();
  });
});
