import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MailCheck, MailWarning, RefreshCw, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  adminListGenerationFailures,
  adminMarkGenerationFailureRead,
  adminRunGenerationRecovery,
  adminRetryGeneration,
  adminSendTestFailureEmail,
  type GenerationFailureRow,
} from "@/lib/generation-admin.functions";

const STAGE_LABEL: Record<string, string> = {
  initial: "Initial generation",
  wod: "Workout of the Day",
  refinement: "Refinement",
};

const KIND_STYLE: Record<string, string> = {
  ai_balance: "bg-amber-500/15 text-amber-600",
  outage: "bg-red-500/15 text-red-600",
  technical: "bg-blue-500/15 text-blue-600",
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function AdminGenerationFailuresTab() {
  const list = useServerFn(adminListGenerationFailures);
  const markRead = useServerFn(adminMarkGenerationFailureRead);
  const runRecovery = useServerFn(adminRunGenerationRecovery);
  const sendTest = useServerFn(adminSendTestFailureEmail);
  const retryOne = useServerFn(adminRetryGeneration);

  const [rows, setRows] = useState<GenerationFailureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await list({ data: { limit: 100 } });
    if ("error" in res) toast.error(res.error);
    else setRows(res.failures);
    setLoading(false);
  }, [list]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRecover() {
    setBusy(true);
    const res = await runRecovery({});
    setBusy(false);
    if ("error" in res && res.error) toast.error(res.error);
    else toast.success(`Recovery run complete — ${(res as any).recovered ?? 0} delivered.`);
    void load();
  }

  async function onTest() {
    setBusy(true);
    const res = await sendTest({});
    setBusy(false);
    if ("error" in res && res.error) toast.error(res.error);
    else toast.success(`Test alert sent to ${(res as any).recipients}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={onRecover} disabled={busy} className="rounded-2xl font-extrabold">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Run recovery now
        </Button>
        <Button onClick={onTest} disabled={busy} variant="outline" className="rounded-2xl font-extrabold">
          <MailCheck className="mr-2 h-4 w-4" />
          Send test failure email
        </Button>
        <Button onClick={() => void load()} variant="ghost" className="rounded-2xl">
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading generation failures…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-primary bg-card p-5 text-sm text-muted-foreground">
          No generation failures recorded. Every requested workout has been delivered.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border-2 p-4 ${r.read_at ? "border-border bg-card" : "border-primary bg-primary/5"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${KIND_STYLE[r.failure_kind] ?? KIND_STYLE["technical"]}`}>
                  {r.failure_kind}
                </span>
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {STAGE_LABEL[r.stage] ?? r.stage}
                </span>
                <span className="text-xs text-muted-foreground">{fmt(r.occurred_at)}</span>
                {r.workout_id ? (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600">
                    delivered
                  </span>
                ) : r.next_retry_at ? (
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-bold text-blue-600">
                    retry {fmt(r.next_retry_at)}
                  </span>
                ) : (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-600">
                    stuck
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm font-semibold">
                {r.user_name || "Unknown member"}{" "}
                <span className="font-normal text-muted-foreground">{r.user_email}</span>
              </p>
              <p className="mt-1 break-words text-sm text-muted-foreground">{r.reason}</p>
              {r.refinement_text ? (
                <p className="mt-1 text-xs text-muted-foreground">Refinement: {r.refinement_text}</p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {r.email_status === "sent" ? (
                  <MailCheck className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <MailWarning className="h-3.5 w-3.5 text-amber-600" />
                )}
                <span>
                  {r.email_status ?? "unknown"} → {r.email_recipient ?? "—"}
                </span>
                {r.email_message_id ? <span>id {r.email_message_id}</span> : null}
                {r.email_error ? <span className="text-red-600">{r.email_error}</span> : null}
                <span>attempts {r.attempt_count ?? 1}</span>
                <span>session {r.session_id ?? "—"}</span>
              </div>

              {!r.read_at ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 rounded-xl"
                  onClick={async () => {
                    await markRead({ data: { id: r.id } });
                    setRows((prev) =>
                      prev.map((x) => (x.id === r.id ? { ...x, read_at: new Date().toISOString() } : x)),
                    );
                  }}
                >
                  <CheckCheck className="mr-2 h-4 w-4" /> Mark as read
                </Button>
              ) : null}
              {!r.workout_id && r.session_id && (r.attempt_count ?? 0) < 5 ? (
                <Button
                  size="sm"
                  className="mt-3 ml-2 rounded-xl"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const result = await retryOne({ data: { sessionId: r.session_id as string } });
                    setBusy(false);
                    if ("error" in result) toast.error(result.error);
                    else toast.success(result.recovered ? "Workout delivered." : "Recovery attempt completed.");
                    void load();
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Retry now
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminGenerationFailuresTab;
