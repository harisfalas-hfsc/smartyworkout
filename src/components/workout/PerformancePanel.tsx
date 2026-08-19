import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Loader2 } from "lucide-react";
import { getWorkoutPerformance } from "@/lib/performance.functions";

type Perf = Awaited<ReturnType<typeof getWorkoutPerformance>>;

/**
 * Objective performance only. This block never states whether the workout was
 * completed — that is a separate concept shown by the workout status itself.
 */
export function PerformancePanel({ workoutId }: { workoutId: string }) {
  const fetchPerformance = useServerFn(getWorkoutPerformance);
  const [data, setData] = useState<Perf | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPerformance({ data: { workoutId } })
      .then((res) => {
        if (active) setData(res as Perf);
      })
      .catch(() => {
        /* offline or unavailable — the block simply stays empty */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workoutId, fetchPerformance]);

  if (loading) {
    return (
      <section className="mt-5 rounded-2xl border-2 border-blue-400 bg-card p-5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </section>
    );
  }

  if (!data || (!data.sets.length && !data.result)) {
    return (
      <section className="mt-5 rounded-2xl border-2 border-blue-400 bg-card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <Activity className="h-5 w-5 text-primary" /> Performance
        </h2>
        <p className="text-sm text-muted-foreground">
          No performance data logged for this workout. Logging is always optional and never changes
          whether the workout counts as completed.
        </p>
      </section>
    );
  }

  const c = data.completion;

  return (
    <section className="mt-5 rounded-2xl border-2 border-blue-400 bg-card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <Activity className="h-5 w-5 text-primary" /> Performance
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        What was actually recorded. Separate from workout completion — anything not logged stays
        unavailable and is never estimated.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Sets logged</p>
          <p className="text-lg font-bold">
            {c.setsLogged}
            {c.setsPlanned !== null ? ` of ${c.setsPlanned} prescribed` : ""}
          </p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Reps logged</p>
          <p className="text-lg font-bold">
            {c.repsLogged === null
              ? "Not logged"
              : `${c.repsLogged}${c.repsPlanned !== null ? ` of ${c.repsPlanned} prescribed` : ""}`}
          </p>
        </div>
      </div>

      {data.resultText ? (
        <p className="mt-3 text-sm">
          <span className="font-semibold text-primary">Result:</span> {data.resultText}
        </p>
      ) : null}

      {data.note ? <p className="mt-3 text-sm text-muted-foreground">{data.note}</p> : null}

      {data.steps.length ? (
        <ul className="mt-3 space-y-1 text-sm">
          {data.steps.map((s) => (
            <li key={s.stepIndex} className="flex justify-between gap-3 border-t border-border pt-1">
              <span className="capitalize">{s.exerciseName}</span>
              <span className="shrink-0 text-muted-foreground">
                {s.loggedSets} set{s.loggedSets === 1 ? "" : "s"}
                {s.loggedReps !== null
                  ? ` · ${s.loggedReps}${s.plannedReps !== null ? `/${s.plannedReps}` : ""} reps`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
