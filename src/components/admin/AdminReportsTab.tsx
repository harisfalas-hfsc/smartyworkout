import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminListReports,
  adminResolveReport,
  type AdminReportRow,
} from "@/lib/community.functions";

export function AdminReportsTab() {
  const list = useServerFn(adminListReports);
  const resolve = useServerFn(adminResolveReport);
  const [rows, setRows] = useState<AdminReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await list({ data: undefined as never });
      setRows(res.reports);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function act(reportId: string, action: "dismiss" | "remove") {
    setBusy(reportId);
    try {
      await resolve({ data: { reportId, action } });
      toast.success(action === "remove" ? "Content removed." : "Report dismissed.");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading)
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  const open = rows.filter((r) => r.status === "open");
  const closed = rows.filter((r) => r.status !== "open");

  return (
    <div className="space-y-6">
      <Section title={`Open reports (${open.length})`}>
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to review — the community is clean.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Flag className="h-3.5 w-3.5" /> {r.target_type}
                  <span className="font-normal normal-case text-muted-foreground">
                    · {new Date(r.created_at).toLocaleString()}
                  </span>
                </p>
                <p className="mt-2 break-words text-sm font-semibold">
                  {r.preview ?? "(content unavailable)"}
                </p>
                {r.reason && <p className="mt-1 text-sm text-muted-foreground">Reason: {r.reason}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  Reported by {r.reporter_name || "a member"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-xl"
                    disabled={busy === r.id}
                    onClick={() => act(r.id, "remove")}
                  >
                    Remove content
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-xl"
                    disabled={busy === r.id}
                    onClick={() => act(r.id, "dismiss")}
                  >
                    Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {closed.length > 0 && (
        <Section title={`Handled (${closed.length})`}>
          <ul className="space-y-2">
            {closed.slice(0, 50).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{r.preview ?? r.target_id}</span>
                <span className="shrink-0 text-xs font-semibold uppercase text-muted-foreground">
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border-2 border-blue-400 bg-card p-5">
      <h2 className="mb-3 text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  );
}
