import { describe, expect, it } from "vitest";
import { parseStepTiming, parseWorkoutSteps } from "@/lib/workout/parse-steps";
import { enforceWorkout } from "@/lib/workout/enforce.server";
import { isValidName } from "@/lib/workout/generate.server";
import type { PoolExercise } from "@/lib/workout/pool.server";

const ex = (id: string, name: string, extra: Partial<PoolExercise> = {}): PoolExercise => ({
  id,
  name,
  body_part: "upper legs",
  target_muscle: "quads",
  secondary_muscles: [],
  equipment: "body weight",
  category: "strength",
  difficulty: "intermediate",
  movement_pattern: null,
  body_region: null,
  gif_path: `gifs/${id}.gif`,
  ...extra,
});

const pool = [
  ex("0043", "barbell full squat"),
  ex("1160", "burpee"),
  ex("0630", "mountain climber"),
  ex("0032", "air bike"),
  ex("0011", "cobra stretch"),
  ex("0777", "standing hamstring stretch"),
];

const li = (inner: string) =>
  `<ul class="tiptap-bullet-list"><li class="tiptap-list-item"><p class="tiptap-paragraph">${inner}</p></li></ul>`;

const heading = (icon: string, title: string) =>
  `<p class="tiptap-paragraph">${icon} <strong><u>${title}</u></strong></p>`;

function build(main: string, finisher: string, soft = "60 sec Foam roll quadriceps") {
  return [
    heading("🧽", "Soft Tissue Preparation"),
    li(soft),
    heading("🔥", "Activation 5'"),
    li("10 reps {{exercise:0032:air bike}}"),
    heading("💪", "Main Workout (CIRCUIT)"),
    main,
    heading("⚡", "Finisher (For Time)"),
    finisher,
    heading("🧘", "Cool Down"),
    li("45 sec {{exercise:0777:standing hamstring stretch}}"),
  ].join("");
}

const fullMain = [
  li("12 reps {{exercise:0043:barbell full squat}} — rest 60 sec"),
  li("15 reps {{exercise:1160:burpee}}"),
  li("40 sec {{exercise:0630:mountain climber}}"),
  li("20 reps {{exercise:0032:air bike}}"),
].join("");

const fullFinisher = [
  li("21 reps {{exercise:1160:burpee}}"),
  li("15 reps {{exercise:0043:barbell full squat}}"),
  li("30 sec {{exercise:0630:mountain climber}}"),
].join("");

const opts = {
  category: "CHALLENGE" as const,
  format: "CIRCUIT" as const,
  level: "intermediate" as const,
  targetMinutes: 30,
};

describe("enforceWorkout", () => {
  it("accepts a compliant workout", () => {
    const res = enforceWorkout(build(fullMain, fullFinisher), pool, opts);
    expect(res.errors).toEqual([]);
    expect(res.html).toContain("{{exercise:0043:barbell full squat}}");
  });

  it("repairs an invalid id by exact name match", () => {
    const res = enforceWorkout(
      build(fullMain.replace("{{exercise:0043:", "{{exercise:squat-slug:"), fullFinisher),
      pool,
      opts,
    );
    expect(res.html).toContain("{{exercise:0043:barbell full squat}}");
    expect(res.warnings.join(" ")).toMatch(/Repaired/);
  });

  it("drops unknown exercises and flags a short Main Workout", () => {
    const broken = fullMain.replace("{{exercise:1160:burpee}}", "{{exercise:9999:moon jump}}");
    const res = enforceWorkout(build(broken, fullFinisher), pool, opts);
    expect(res.html).not.toContain("moon jump");
    expect(res.warnings.join(" ")).toMatch(/Removed unknown/);
  });

  it("rejects a Main Workout with fewer than 3 exercises", () => {
    const res = enforceWorkout(build(li("12 reps {{exercise:1160:burpee}}"), fullFinisher), pool, opts);
    expect(res.errors.join(" ")).toMatch(/Main Workout/);
  });

  it("removes tokens and non-compliant lines from Soft Tissue Preparation", () => {
    const res = enforceWorkout(
      build(fullMain, fullFinisher, "10 reps {{exercise:0011:cobra stretch}}"),
      pool,
      opts,
    );
    const soft = res.html.split("🔥")[0]!;
    expect(soft).not.toContain("{{exercise:");
    expect(soft).toContain("Foam roll");
  });

  it("bans stretching from CHALLENGE work sections", () => {
    const withStretch = fullMain + li("30 sec {{exercise:0011:cobra stretch}}");
    const res = enforceWorkout(build(withStretch, fullFinisher), pool, opts);
    expect(res.html).not.toContain("cobra stretch");
  });

  it("warns when a dose is missing before the token", () => {
    const naked = fullMain.replace("15 reps {{exercise:1160:burpee}}", "{{exercise:1160:burpee}}");
    const res = enforceWorkout(build(naked, fullFinisher), pool, opts);
    expect(res.warnings.join(" ")).toMatch(/Missing dose/);
  });
});

describe("parseWorkoutSteps", () => {
  const steps = parseWorkoutSteps(build(fullMain, fullFinisher));

  it("produces one step per token in document order", () => {
    expect(steps.map((s) => s.exerciseId)).toEqual([
      "0032",
      "0043",
      "1160",
      "0630",
      "0032",
      "1160",
      "0043",
      "0630",
      "0777",
    ]);
  });

  it("assigns the right sections", () => {
    expect(steps[0]!.section).toBe("Activation");
    expect(steps[1]!.section).toBe("Main Workout");
    expect(steps[5]!.section).toBe("Finisher");
    expect(steps.at(-1)!.section).toBe("Cool-down");
  });
});

describe("parseStepTiming", () => {
  it("treats reps as manual", () => {
    expect(parseStepTiming({ prescription: "12 reps" }).mode).toBe("manual");
  });

  it("reads seconds as a timed step", () => {
    expect(parseStepTiming({ prescription: "40 sec" })).toEqual({ mode: "timed", seconds: 40 });
  });

  it("ignores rest fragments when timing work", () => {
    expect(parseStepTiming({ prescription: "12 reps — rest 90 sec" }).mode).toBe("manual");
  });

  it("detects tabata", () => {
    expect(parseStepTiming({ prescription: "20 sec work", subSection: "Tabata" }).mode).toBe(
      "tabata",
    );
  });
});

describe("isValidName", () => {
  it("rejects banned words, codes and duplicates", () => {
    expect(isValidName("Inferno Circuit", [])).toBe(false);
    expect(isValidName("CAL-813 Session", [])).toBe(false);
    expect(isValidName("Quiet Steel", ["quiet steel"])).toBe(false);
    expect(isValidName("Quiet Steel", [])).toBe(true);
  });
});
