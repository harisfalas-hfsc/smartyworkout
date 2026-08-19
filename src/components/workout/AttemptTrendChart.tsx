// Session-over-session graph for one workout.
// Only stored values are plotted — a missing value is a gap, never a zero.

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { formatDate } from "@/lib/date-format";
import { directionFor } from "@/lib/performance/compare";

export type AttemptPoint = {
  attempt: number;
  performedAt: string | null;
  totalReps: number | null;
  totalVolumeKg: number | null;
  strengthLoad: number | null;
  conditioningLoad: number | null;
  rpe: number | null;
  durationSeconds: number | null;
};

type MetricKey =
  | "total_reps"
  | "total_volume_kg"
  | "strength_load"
  | "conditioning_load"
  | "rpe"
  | "duration_for_time";

const METRICS: { key: MetricKey; label: string; pick: (p: AttemptPoint) => number | null; unit: string }[] = [
  { key: "total_reps", label: "Total reps", pick: (p) => p.totalReps, unit: "reps" },
  { key: "total_volume_kg", label: "Volume", pick: (p) => p.totalVolumeKg, unit: "kg" },
  { key: "strength_load", label: "Strength load", pick: (p) => p.strengthLoad, unit: "" },
  { key: "conditioning_load", label: "Conditioning load", pick: (p) => p.conditioningLoad, unit: "" },
  { key: "duration_for_time", label: "Session time", pick: (p) => p.durationSeconds, unit: "sec" },
  { key: "rpe", label: "RPE", pick: (p) => p.rpe, unit: "" },
];

function verdict(key: MetricKey, first: number, last: number) {
  const dir = directionFor(key);
  if (dir === "neutral" || first === last) return "neutral" as const;
  const up = last > first;
  return (dir === "higher_better" ? up : !up) ? ("better" as const) : ("worse" as const);
}

export function AttemptTrendChart({ points }: { points: AttemptPoint[] }) {
  const available = useMemo(
    () => METRICS.filter((m) => points.filter((p) => m.pick(p) !== null).length >= 2),
    [points],
  );
  const [metricKey, setMetricKey] = useState<MetricKey | null>(available[0]?.key ?? null);
  const metric = available.find((m) => m.key === metricKey) ?? available[0] ?? null;

  const data = useMemo(
    () =>
      metric
        ? points.map((p) => ({
            label: p.performedAt ? formatDate(p.performedAt) : `#${p.attempt}`,
            attempt: p.attempt,
            value: metric.pick(p),
          }))
        : [],
    [points, metric],
  );

  if (!metric || data.filter((d) => d.value !== null).length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        A graph appears as soon as two sessions of this workout carry the same measurement.
      </p>
    );
  }

  const values = data.filter((d) => d.value !== null) as { value: number; label: string }[];
  const first = values[0]!.value;
  const last = values[values.length - 1]!.value;
  const v = verdict(metric.key, first, last);
  const tone =
    v === "better" ? "text-emerald-500" : v === "worse" ? "text-red-500" : "text-muted-foreground";
  const stroke =
    v === "better" ? "hsl(142 71% 45%)" : v === "worse" ? "hsl(0 84% 60%)" : "hsl(217 91% 60%)";
  const Icon = v === "better" ? ArrowUp : v === "worse" ? ArrowDown : Minus;
  const dirWord = directionFor(metric.key) === "lower_better" ? "lower is better" : directionFor(metric.key) === "higher_better" ? "higher is better" : "context only, never scored";

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {available.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetricKey(m.key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              m.key === metric.key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={44} />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value: number | string) => [`${value} ${metric.unit}`.trim(), metric.label]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={3}
              dot={{ r: 4, fill: stroke }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${tone}`}>
        <Icon className="h-4 w-4" />
        {metric.label}: {first} → {last} {metric.unit} across {values.length} sessions
      </p>
      <p className="text-xs text-muted-foreground">
        {metric.label} — {dirWord}. Only sessions performed on the same version of this workout are
        scored against each other.
      </p>
    </div>
  );
}
