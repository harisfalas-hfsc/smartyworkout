// Last 10 recorded sessions, plotted per session. Nothing is accumulated and
// nothing is invented: a session without a value is simply not plotted.

import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { getSessionLoads } from "@/lib/performance.functions";
import { formatDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

type Session = {
  workoutId: string;
  attempt: number;
  performedAt: string;
  rpe: number | null;
  strengthLoad: number | null;
  conditioningLoad: number | null;
  durationSeconds: number | null;
};

type MetricKey = "strength" | "conditioning" | "rpe" | "minutes";

const METRICS: {
  key: MetricKey;
  label: string;
  pick: (s: Session) => number | null;
  unit: string;
}[] = [
  { key: "strength", label: "Strength load", pick: (s) => s.strengthLoad, unit: "" },
  { key: "conditioning", label: "Conditioning load", pick: (s) => s.conditioningLoad, unit: "" },
  { key: "rpe", label: "RPE", pick: (s) => s.rpe, unit: "/10" },
  {
    key: "minutes",
    label: "Session minutes",
    pick: (s) => (s.durationSeconds === null ? null : Math.round(s.durationSeconds / 60)),
    unit: "min",
  },
];

/** Per-session trend for the ten most recent recorded sessions. */
export function RecentLoadTrend() {
  const fetchSessions = useServerFn(getSessionLoads);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [metricKey, setMetricKey] = useState<MetricKey>("strength");

  useEffect(() => {
    let active = true;
    void fetchSessions({ data: {} })
      .then((res) => {
        if (active) setSessions((res.sessions as Session[]) ?? []);
      })
      .catch(() => {
        if (active) setSessions([]);
      });
    return () => {
      active = false;
    };
  }, [fetchSessions]);

  const last10 = useMemo(() => (sessions ?? []).slice(-10), [sessions]);
  const available = useMemo(
    () => METRICS.filter((m) => last10.filter((s) => m.pick(s) !== null).length >= 2),
    [last10],
  );
  const metric = available.find((m) => m.key === metricKey) ?? available[0] ?? null;

  const data = useMemo(
    () =>
      metric
        ? last10.map((s) => ({
            label: formatDate(s.performedAt),
            value: metric.pick(s),
          }))
        : [],
    [last10, metric],
  );

  if (sessions === null) {
    return (
      <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
      <p className="font-bold">Last 10 sessions</p>
      <p className="mt-1 text-xs text-muted-foreground">
        One point per recorded session — never a running total. Each session stands on its own, so
        older work leaves the graph as newer sessions arrive.
      </p>

      {!metric ? (
        <p className="mt-3 text-sm text-muted-foreground">
          A graph appears as soon as two recorded sessions carry the same measurement.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {available.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetricKey(m.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  m.key === metric.key
                    ? "border-blue-400 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mt-3 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number | string) => [`${v}${metric.unit}`, metric.label]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
