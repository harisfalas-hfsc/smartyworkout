import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("exercise media private bucket URLs", () => {
  it("uses signed URLs, not public storage URLs, for exercise GIFs", () => {
    const mediaCache = readFileSync("src/lib/offline/media-cache.ts", "utf8");
    const exerciseImage = readFileSync("src/components/ExerciseImage.tsx", "utf8");
    const exerciseDetails = readFileSync("src/lib/coach.functions.ts", "utf8");
    const offlineBootstrap = readFileSync("src/components/offline/OfflineBootstrap.tsx", "utf8");

    expect(mediaCache).toContain("createSignedUrl(path");
    expect(mediaCache).toContain("createSignedUrls(chunk");
    expect(exerciseDetails).toContain("createSignedUrls(paths");
    expect(exerciseImage).toContain("getExerciseMediaUrl(path)");
    expect(offlineBootstrap).toContain("getExerciseMediaItems(");

    expect(exerciseImage).not.toContain("getPublicUrl");
    expect(exerciseDetails).not.toContain("getPublicUrl");
    expect(offlineBootstrap).not.toContain("getPublicUrl");
  });
});