import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Dumbbell, Gauge, HeartPulse, Info, Loader2 } from "lucide-react";
import { getPerformanceOverview } from "@/lib/performance.functions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { localPerformanceOverview } from "@/lib/offline/performance-store";

type Overview = Awaited<ReturnType<typeof getPerformanceOverview>>;

function LoadRow({
  label,
  state,
  icon: Icon,
}: {
  label: string;
  state: string;
  icon: typeof Dumbbell;
}) {
  return (
    <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
      <p className="flex items-center gap-2 font-bold text-primary">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-muted-foreground">{state}</p>
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
  const { user } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExample, setShowExample] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) return;
    localPerformanceOverview(user.id)
      .then((local) => {
        if (active && local.loggedSessions > 0) setData(local as Overview);
      })
      .then(() => fetchOverview({ data: {} }))
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
  }, [fetchOverview, user?.id]);

  if (loading) {
    return (
      <div className="mt-3 rounded-2xl border-2 border-blue-400 bg-card p-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }
  if (!data) return null;

  const readinessState = showExample ? "Ready" : data.readiness.state;
  const readinessReason = showExample
    ? "Example view showing how the panel looks after enough comparable workouts have been recorded."
    : data.readiness.reason;
  const load = showExample
    ? { strength: "Moderate", conditioning: "Moderate", overall: "Moderate" }
    : data.load;

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
        <p className="flex items-center gap-2 font-bold text-primary">
          <Gauge className="h-4 w-4 shrink-0" /> Readiness
        </p>
        <p className="mt-2 text-sm font-semibold text-foreground">{readinessState}</p>
        <p className="mt-1 text-sm text-muted-foreground">{readinessReason}</p>
        {showExample ? (
          <p className="mt-2 text-xs font-semibold text-primary">Example only. Your personal data has not changed.</p>
        ) : null}
        <p className="mt-2 text-[11px] text-muted-foreground">
          A training-management indicator based only on what you logged. It is not a health or
          medical assessment.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <LoadRow label="Strength load" state={load.strength} icon={Dumbbell} />
        <LoadRow label="Conditioning load" state={load.conditioning} icon={HeartPulse} />
        <LoadRow label="Overall load" state={load.overall} icon={Activity} />
      </div>

      {!showExample && data.coverage.level !== "complete" ? (
        <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
          <p className="flex items-center gap-2 font-bold text-primary">
            <Info className="h-4 w-4 shrink-0" /> Why data is limited
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{data.coverage.message}</p>
          {data.coverage.nextStep ? (
            <p className="mt-2 text-sm font-semibold">{data.coverage.nextStep}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-11 w-full rounded-xl"
            onClick={() => setShowExample(true)}
          >
            Preview with example data
          </Button>
        </div>
      ) : null}

      {showExample ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-xl"
          onClick={() => setShowExample(false)}
        >
          Return to my data
        </Button>
      ) : null}

    </div>
  );
}
