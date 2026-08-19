import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Info } from "lucide-react";
import { getCoachRecommendation } from "@/lib/performance.functions";

/**
 * Read-only context for the Workout of the Day. SmartyCoach never changes,
 * scales or replaces a WOD — it only tells you how today's workload compares
 * with what you have logged.
 */
export function WodContextNote() {
  const fetchRecommendation = useServerFn(getCoachRecommendation);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchRecommendation({ data: { selectedStars: 2 } })
      .then((res) => {
        if (active) setNote((res as { wodNote: string | null }).wodNote);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [fetchRecommendation]);

  if (!note) return null;

  return (
    <section className="rounded-2xl border-2 border-blue-400 bg-card px-5 py-4">
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          <strong className="text-primary">Context only:</strong> {note} The Workout of the Day
          itself never changes.
        </span>
      </p>
    </section>
  );
}
