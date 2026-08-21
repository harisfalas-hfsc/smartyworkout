import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("workout player layout", () => {
  it("keeps the carousel viewport, track, items, and slides at full height", () => {
    const carousel = readFileSync("src/components/ui/carousel.tsx", "utf8");
    const player = readFileSync("src/components/workout/WorkoutPlayerDialog.tsx", "utf8");

    expect(carousel).toContain('className="h-full overflow-hidden"');
    expect(player).toContain('CarouselContent className="ml-0 h-full min-h-0"');
    expect(player).toContain('CarouselItem key={i} className="h-full pl-0"');
    // every slide type renders the exact same fixed-size media frame
    expect(player).toContain("h-[clamp(9rem,26dvh,15rem)]");
    expect(player).toContain("grid-rows-[clamp(9rem,26dvh,15rem)_5rem]");
    expect(player.match(/<SlideShell/g)).toHaveLength(3);

  });

  it("uses one stable footer height and keeps navigation visible on every slide", () => {
    const player = readFileSync("src/components/workout/WorkoutPlayerDialog.tsx", "utf8");

    expect(player).toContain("grid-rows-[auto_4px_auto_clamp(11rem,30dvh,14rem)]");
    expect(player).toContain("h-[calc(clamp(9rem,26dvh,15rem)+5rem)]");
    expect(player.match(/<SlideNavigation/g)).toHaveLength(3);
    expect(player).toContain('aria-label="Close player"');
  });
});