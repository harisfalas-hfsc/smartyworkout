import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, CreditCard, XCircle, Ban, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminGetBillingActivity, type AdminBillingActivity } from "@/lib/admin.functions";
import { formatDate } from "@/lib/date-format";

function money(amount: number | null, currency: string) {
  if (amount === null) return "—";
  return `${amount.toFixed(2)} ${currency}`;
}

function statusLabel(status: string, cancelAtPeriodEnd: boolean) {
  if (status === "active") return cancelAtPeriodEnd ? "Active · stopping" : "Active";
  if (status === "trialing") return "Free trial";
  if (status === "past_due") return "Payment overdue";
  if (status === "canceled") return "Ended";
  if (status === "unpaid") return "Unpaid";
  return status;
}

const PERIODS: { label: string; days: number | null }[] = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 3 months", days: 90 },
  { label: "Last 12 months", days: 365 },
  { label: "Everything", days: null },
];

export function AdminMemberBillingTab() {
  const getActivity = useServerFn(adminGetBillingActivity);
  const [env, setEnv] = useState<"live" | "sandbox">("live");
  const [days, setDays] = useState<number | null>(365);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<AdminBillingActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(environment: "live" | "sandbox", period: number | null) {
    setLoading(true);
    setError(null);
    const r = await getActivity({ data: { environment, days: period } });
    if ("error" in r) {
      setError(r.error);
      setData(null);
    } else setData(r.activity);
    setLoading(false);
  }

  useEffect(() => {
    void load(env, days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, days]);

  const q = search.trim().toLowerCase();
  const matches = (name: string, email: string | null, extra = "") =>
    !q || `${name} ${email ?? ""} ${extra}`.toLowerCase().includes(q);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={env === "live" ? "default" : "outline"} onClick={() => setEnv("live")}>
          Real money
        </Button>
        <Button size="sm" variant={env === "sandbox" ? "default" : "outline"} onClick={() => setEnv("sandbox")}>
          Test mode
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void load(env, days)} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.label}
            size="sm"
            variant={days === p.days ? "secondary" : "outline"}
            onClick={() => setDays(p.days)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by member name or email"
          className="pl-9"
        />
      </div>


      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : data ? (
        <>
          {data.providerError ? (
            <p className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              Memberships below are from your own records. Card history could not be loaded right now:{" "}
              {data.providerError}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Paying members right now" value={String(data.totals.activeMembers)} />
            <SummaryCard label="Memberships that ended" value={String(data.totals.canceledMembers)} />
            <SummaryCard
              label="Money received · last 30 days"
              value={money(data.totals.paidLast30, data.currency)}
            />
            <SummaryCard
              label="Declined payments · last 30 days"
              value={String(data.totals.failedLast30)}
            />
          </div>

          <section className="space-y-3 rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Members and their memberships</h3>
            {data.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No memberships yet.</p>
            ) : (
              <div className="space-y-2">
                {data.members.map((m, i) => (
                  <div key={`${m.userId ?? m.email ?? "member"}-${i}`} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email ?? "No email on file"}</p>
                      </div>
                      <Badge variant={m.status === "active" || m.status === "trialing" ? "default" : "secondary"}>
                        {statusLabel(m.status, m.cancelAtPeriodEnd)}
                      </Badge>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <Row label="How they joined" value={m.provider} />
                      <Row label="Member since" value={m.startedAt ? formatDate(m.startedAt) : "—"} />
                      <Row
                        label={m.cancelAtPeriodEnd || m.status === "canceled" ? "Access until" : "Next renewal"}
                        value={m.renewsOn ? formatDate(m.renewsOn) : "—"}
                      />
                      <Row label="Total paid" value={money(m.totalPaid, m.currency)} />
                      <Row label="Last payment" value={m.lastPaymentAt ? formatDate(m.lastPaymentAt) : "—"} />
                      <Row label="Declined attempts" value={String(m.failedAttempts)} />
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Everything that happened</h3>
            {data.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing has happened yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.events.map((e) => (
                  <li key={`${e.kind}-${e.id}`} className="flex gap-3 rounded-xl border p-3">
                    <span
                      className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                        e.kind === "payment"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : e.kind === "failed"
                            ? "bg-destructive/10 text-destructive"
                            : e.kind === "refund"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {e.kind === "payment" ? (
                        <CreditCard className="h-4 w-4" />
                      ) : e.kind === "failed" ? (
                        <XCircle className="h-4 w-4" />
                      ) : e.kind === "refund" ? (
                        <Undo2 className="h-4 w-4" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {e.name}
                        {e.amount !== null ? ` · ${money(e.amount, e.currency)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{e.note}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(e.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}
