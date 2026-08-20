import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { LLMS_BASE } from "@/lib/seo/llms-base";

/**
 * /llms.txt — served dynamically so the automatic SEO update (Admin → Cron jobs)
 * keeps the coverage section in sync with the live exercise library, workouts and
 * training topics. The static description above it never changes.
 */
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

        return new Response(`${LLMS_BASE}${extra}`, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
