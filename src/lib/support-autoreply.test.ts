import { describe, expect, it } from "vitest";
import { classifySupportMessage } from "./support-autoreply";

describe("support auto-responder", () => {
  it("answers the choice between Workout of the Day and manual generation", () => {
    const answer = classifySupportMessage(
      "Testing support",
      "Can I subscribe to Workout of the Day but also create a workout?",
    );

    expect(answer?.label).toBe("Workout of the Day or manual workouts");
    expect(answer?.body).toContain("cannot be used at the same time");
    expect(answer?.body).toContain("one equipment workout and one bodyweight workout");
    expect(answer?.body).toContain("manual generation is paused");
  });

  it("recognises alternative wording for the same question", () => {
    const answer = classifySupportMessage(
      "WOD subscription",
      "Do I still get 2 workouts I can generate myself?",
    );

    expect(answer?.topic).toBe("subscription");
    expect(answer?.score).toBe(10);
  });

  it("keeps a general WOD question on the WOD explanation", () => {
    const answer = classifySupportMessage("Question", "What is the Workout of the Day?");

    expect(answer?.topic).toBe("wod");
    expect(answer?.body).toContain("same session for every member");
  });
});