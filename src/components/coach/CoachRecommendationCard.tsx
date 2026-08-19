import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCoachRecommendation } from "@/lib/performance.functions";
import { starsToLevel } from "@/lib/workout/spec";

type Result = Awaited<ReturnType<typeof getCoachRecommendation>>;

/**
 * One deterministic recommendation. Never blocking, never required, and never
 * treats the user's own star selection as evidence of what they can do.
 */
export function CoachRecommendationCard({
  selectedStars,
  onApplyStars,
}: {
  selectedStars: number;
  onApplyStars?: (stars: number) => void;
}) {
  const fetchRecommendation = useServerFn(getCoachRecommendation);
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchRecommendation({ data: { selectedStars } })
      .then((res) => {
        if (active) setData(res as Result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedStars, fetchRecommendation]);

  if (dismissed) return null;

  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;
  const rec = data.recommendation;

  return (
    <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
        <Lightbulb className="h-4 w-4" /> SmartyCoach recommendation
      </p>
      <p className="mt-2 text-sm font-semibold">{rec.message}</p>
      <p className="mt-1 text-xs text-muted-foreground">{rec.reason}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        You selected {selectedStars} star{selectedStars === 1 ? "" : "s"} (
        {starsToLevel(selectedStars)}). Your selection always stands unless you change it.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="secondary" className="h-9" onClick={() => setDismissed(true)}>
          Continue
        </Button>
        {rec.suggestedStars !== null && onApplyStars ? (
          <Button
            size="sm"
            className="h-9"
            onClick={() => {
              onApplyStars(rec.suggestedStars!);
              setDismissed(true);
            }}
          >
            Change to {rec.suggestedStars} star{rec.suggestedStars === 1 ? "" : "s"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
