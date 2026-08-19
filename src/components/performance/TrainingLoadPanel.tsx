import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Gauge, Loader2 } from "lucide-react";
import { getPerformanceOverview } from "@/lib/performance.functions";
import { CONFIDENCE_NOTE } from "@/lib/performance/confidence";

type Overview = Awaited<ReturnType<typeof getPerformanceOverview>>;

function LoadRow({ label, state }: { label: string; state: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-bold">{state}</p>
    </div>
  );
}

/**
 * Training-management view of the last 7 days. Readiness here is a training
 * indicator, not a medical or diagnostic statement, and defaults to limited
 * data whenever the evidence is thin.
 */
export function TrainingLoadPanel() {
  const fetchOverview = useServerFn(getPerformanceOverview);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchOverview({ data: {} })
      .then((res) => {
        if (active) setData(res as Overview);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchOverview]);

  if (loading) {
    return (
      <div className="mt-3 rounded-2xl border-2 border-blue-400 bg-card p-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
        <p className="flex items-center gap-2 font-bold">
          <Gauge className="h-4 w-4 text-primary" /> Readiness — {data.readiness.state}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{data.readiness.reason}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          A training-management indicator based only on what you logged. It is not a health or
          medical assessment.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <LoadRow label="Strength load" state={data.load.strength} />
        <LoadRow label="Conditioning load" state={data.load.conditioning} />
        <LoadRow label="Overall load" state={data.load.overall} />
      </div>

      {data.strength.length ? (
        <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
          <p className="flex items-center gap-2 font-bold">
            <Activity className="h-4 w-4 text-primary" /> Demonstrated performance
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {data.strength.map((h) => (
              <li key={h.exerciseName} className="flex justify-between gap-3">
                <span className="capitalize">{h.exerciseName}</span>
                <span className="text-muted-foreground">
                  {h.sessions.length} logged session{h.sessions.length === 1 ? "" : "s"} · trend{" "}
                  {h.trend}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {CONFIDENCE_NOTE[data.confidence]}{" "} log sets or workout results to build history. Nothing is
          estimated on your behalf.
        </p>
      )}
    </div>
  );
}
