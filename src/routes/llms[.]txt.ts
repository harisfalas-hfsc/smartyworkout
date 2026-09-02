import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { LLMS_STATIC } from "@/lib/seo/llms-static";

/**
 * /llms.txt — served dynamically so the automatic SEO update (Admin → Cron jobs)
 * keeps the coverage section in sync with the live exercise library, workouts and
 * training topics. The static description above it never changes.
 */
/**
 * Removes the pricing block, every paid link and all subscription wording so
 * /llms.txt describes a fully free product while Free Access Mode is ON.
 */
function stripPaidCopy(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let skipSection = false;
  for (const line of lines) {
    if (/^##\s/.test(line)) skipSection = /pricing/i.test(line);
    if (skipSection) continue;
    if (/\/pricing|€9\.99|9\.99 per month|one subscription includes/i.test(line)) continue;
    out.push(
      line
        .replace(/every subscriber/gi, "every member")
        .replace(/Fitness Subscription, Monthly Membership, Cancel Anytime, /gi, "")
        .replace(/subscribers/gi, "members"),
    );
  }
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(
      "## Who SmartyWorkout is for",
      "## Access\n\nEvery feature is available to all registered users at no cost.\n\n## Who SmartyWorkout is for",
    );
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        let extra = "";
        try {
          const { readKeywordIndex } = await import("@/lib/seo/keyword-index.server");
          const index = await readKeywordIndex();
          if (index) {
            const g = index.groups;
            const line = (label: string, values: string[] = [], max = 60) =>
              values.length ? `- ${label}: ${values.slice(0, max).join(", ")}\n` : "";
            extra =
              `\n## Coverage (updated automatically ${index.generated_at.slice(0, 10)})\n` +
              `- Exercises in the library: ${index.counts?.exercises ?? 0}\n` +
              `- Workouts generated to date: ${index.counts?.workouts ?? 0}\n` +
              line("Training topics", g.topics) +
              line("Muscle groups trained", g.muscles) +
              line("Equipment supported", g.equipment) +
              line("Movement patterns", g.patterns) +
              line("Workout formats", g.formats) +
              line("Session focuses", g.focuses) +
              line("Exercise categories", g.categories) +
              line("Also covered", g.custom);
          }
        } catch {
          extra = "";
        }

        let base = LLMS_STATIC;
        try {
          const { isFreeAccessMode } = await import("@/lib/free-access.server");
          if (await isFreeAccessMode()) {
            base = stripPaidCopy(base);
          }
        } catch {
          base = LLMS_STATIC;
        }

        return new Response(`${base}${extra}`, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
