import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminGetRevenue, type AdminRevenue } from "@/lib/admin.functions";

export function AdminRevenueTab() {
  const getRevenue = useServerFn(adminGetRevenue);
  const [env, setEnv] = useState<"live" | "sandbox">("live");
  const [data, setData] = useState<AdminRevenue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(environment: "live" | "sandbox") {
    setLoading(true);
    setError(null);
    const r = await getRevenue({ data: { environment } });
    if ("error" in r) {
      setError(r.error);
      setData(null);
    } else setData(r.revenue);
    setLoading(false);
  }

  useEffect(() => {
    void load(env);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={env === "live" ? "default" : "outline"}
          onClick={() => setEnv("live")}
        >
          Live
        </Button>
        <Button
          size="sm"
          variant={env === "sandbox" ? "default" : "outline"}
          onClick={() => setEnv("sandbox")}
        >
          Test
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void load(env)}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-blue-400 bg-card p-4 text-sm text-muted-foreground">
          {error}
        </p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={`Total (${data.currency})`} value={data.total.toFixed(2)} />
            <Stat label="Last 30 days" value={data.last30.toFixed(2)} />
          </div>

          <div className="rounded-2xl border border-blue-400 bg-card p-4">
            <p className="mb-3 text-sm font-semibold">By month</p>
            {data.byMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {data.byMonth.map((m) => (
                  <li key={m.month} className="flex justify-between">
                    <span className="text-muted-foreground">{m.month}</span>
                    <span className="font-semibold">
                      {m.amount.toFixed(2)} {data.currency}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-blue-400 bg-card p-4">
            <p className="mb-3 text-sm font-semibold">Latest payments</p>
            {data.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <ul className="divide-y">
                {data.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">
                      {p.email ?? "unknown"} · {new Date(p.created).toLocaleDateString()}
                    </span>
                    <span className="font-semibold">
                      {p.amount.toFixed(2)} {p.currency}
                      {p.refunded ? " (refunded)" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-400 bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
