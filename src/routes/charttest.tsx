import { createFileRoute } from "@tanstack/react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/charttest")({
  component: ChartTest,
  head: () => ({ meta: [{ title: "Chart test" }] }),
});

const data = [
  { label: "15/07/2026", value: 5400 },
  { label: "22/07/2026", value: 6100 },
  { label: "30/07/2026", value: 7300 },
  { label: "06/08/2026", value: 7950 },
  { label: "14/08/2026", value: 6800 },
];

function ChartTest() {
  return (
    <div className="mx-auto max-w-md p-4">
      <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
        <p className="font-bold">Last 10 sessions</p>
        <div className="mt-3 h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                width={40} tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))}
              />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#38bdf8"
                strokeWidth={2}
                connectNulls
                isAnimationActive={false}
                dot={{ r: 3, fill: "#38bdf8", stroke: "#38bdf8" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
