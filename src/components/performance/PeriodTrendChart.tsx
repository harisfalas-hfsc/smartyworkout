// Day-by-day graph for a selected calendar period. Same look as the last-10
// sessions graph: one full-width metric picker, one coloured line.

import { useMemo, useState } from "react";
import { MetricLineChart, MetricPicker } from "@/components/performance/MetricLineChart";
import { formatDate } from "@/lib/date-format";

export type PeriodSession = {
  performedAt: string;
  rpe: number | null;
  strengthLoad: number | null;
  conditioningLoad: number | null;
  durationSeconds: number | null;
};

type MetricKey = "strength" | "conditioning" | "rpe" | "sessions" | "minutes";

const METRICS: { key: MetricKey; label: string; unit: string; color: string }[] = [
  { key: "strength", label: "Strength volume", unit: " kg", color: "#38bdf8" },
  { key: "conditioning", label: "Conditioning work", unit: " sec", color: "#34d399" },
  { key: "rpe", label: "Average RPE", unit: " / 10", color: "#f59e0b" },
  { key: "sessions", label: "Sessions logged", unit: "", color: "#f472b6" },
  { key: "minutes", label: "Recorded minutes", unit: " min", color: "#a78bfa" },
];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (d <= last && out.length < 366) {
    out.push(dayKey(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function PeriodTrendChart({
  sessions,
  start,
  end,
}: {
  sessions: PeriodSession[];
  start: string;
  end: string;
}) {
  const [metricKey, setMetricKey] = useState<MetricKey>("strength");
  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];

  const data = useMemo(() => {
    const days = daysBetween(start, end);
    const byDay = new Map<string, PeriodSession[]>();
    for (const s of sessions) {
      const key = dayKey(new Date(s.performedAt));
      byDay.set(key, [...(byDay.get(key) ?? []), s]);
    }
    return days.map((key) => {
      const list = byDay.get(key) ?? [];
      const sum = (pick: (s: PeriodSession) => number | null) => {
        const vals = list.map(pick).filter((v): v is number => v !== null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
      };
      let value: number | null = null;
      if (metric.key === "strength") value = sum((s) => s.strengthLoad);
      else if (metric.key === "conditioning") value = sum((s) => s.conditioningLoad);
      else if (metric.key === "sessions") value = list.length;
      else if (metric.key === "minutes") {
        const secs = sum((s) => s.durationSeconds);
        value = secs === null ? null : Math.round(secs / 60);
      } else {
        const rpes = list.map((s) => s.rpe).filter((v): v is number => v !== null);
        value = rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null;
      }
      return { label: formatDate(`${key}T00:00:00`), value };
    });
  }, [sessions, start, end, metric]);

  return (
    <div className="space-y-3">
      <MetricPicker
        value={metric.key}
        onChange={(v) => setMetricKey(v as MetricKey)}
        options={METRICS.map((m) => ({ key: m.key, label: m.label, color: m.color }))}
      />
      <MetricLineChart data={data} color={metric.color} label={metric.label} unit={metric.unit} />
      <p className="text-[11px] text-muted-foreground">
        One point per day in the selected period. Days without a recorded session stay empty.
      </p>
    </div>
  );
}
