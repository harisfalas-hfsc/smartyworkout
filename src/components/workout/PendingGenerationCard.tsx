import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLatestGeneration } from "@/lib/coach.functions";

type GenerationState = {
  id: string;
  status: string;
  stage: string;
  attempt_count: number;
  created_at: string;
  workout_id: string | null;
};

export function PendingGenerationCard() {
  const readLatest = useServerFn(getLatestGeneration);
  const navigate = useNavigate();
  const [generation, setGeneration] = useState<GenerationState | null>(null);

  useEffect(() => {
    let active = true;
    let previousWorkoutId: string | null = null;

    const refresh = async () => {
      try {
        const result = await readLatest();
        if (!active) return;
        const next = result.generation as GenerationState | null;
        setGeneration(next?.status === "ready" ? null : next);
        if (next?.status === "ready" && next.workout_id && next.workout_id !== previousWorkoutId) {
          previousWorkoutId = next.workout_id;
          void navigate({ to: "/workout/$workoutId", params: { workoutId: next.workout_id } });
        }
      } catch {
        // This status is reassuring, not load-bearing; generation keeps running.
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [navigate, readLatest]);

  if (!generation || !["building", "failed"].includes(generation.status)) return null;

  return (
    <section className="mb-5 rounded-2xl border-2 border-primary bg-primary/5 p-4" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {generation.status === "building" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Clock3 className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Workout in progress</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {generation.status === "building"
              ? "Smarty Coach is building it now. You can safely leave this page."
              : `A temporary problem interrupted it. Automatic recovery is scheduled${generation.attempt_count ? ` (attempt ${generation.attempt_count} of 5)` : ""}.`}
          </p>
          <Button asChild variant="link" className="mt-1 h-auto p-0 font-bold">
            <Link to="/logbook" search={{ filter: "all", view: "list" }}>Check my Logbook</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}