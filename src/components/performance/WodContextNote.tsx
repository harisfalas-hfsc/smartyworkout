import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Info } from "lucide-react";
import { getWodContext } from "@/lib/performance.functions";

/**
 * Read-only context for the Workout of the Day. SmartyCoach never changes,
 * scales or replaces a WOD — it only tells you how today's workload compares
 * with what you have logged.
 */
export function WodContextNote() {
  const fetchContext = useServerFn(getWodContext);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchContext({ data: {} })
      .then((res) => {
        if (active) setNote((res as { wodNote: string | null }).wodNote);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [fetchContext]);

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
