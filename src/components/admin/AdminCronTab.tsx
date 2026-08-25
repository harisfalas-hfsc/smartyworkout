import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MinusCircle,
  Play,
  Save,
  Search,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  adminGetCronJobs,
  adminListErrors,
  adminResolveError,
  adminRunCronJob,
  adminSaveCronJob,
  type ErrorEventRow,
} from "@/lib/cron.functions";
import type { CronJobDefinition } from "@/lib/cron/registry";
import type { CronJobConfig, CronRunRow } from "@/lib/cron/jobs.server";
import { HEALTH_CHECKS, DEFAULT_HEALTH_RECIPIENT } from "@/lib/cron/health-checks";

const pad = (n: number) => String(n).padStart(2, "0");

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "never";
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminCronTab() {
  const getJobs = useServerFn(adminGetCronJobs);
  const saveJob = useServerFn(adminSaveCronJob);
  const runJob = useServerFn(adminRunCronJob);

  const [definitions, setDefinitions] = useState<CronJobDefinition[] | null>(null);
  const [configs, setConfigs] = useState<Record<string, CronJobConfig>>({});
  const [runs, setRuns] = useState<CronRunRow[]>([]);
  const [index, setIndex] = useState<{
    total: number;
    generated_at: string | null;
    exercises: number;
    workouts: number;
  } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const r = await getJobs({ data: {} } as never);
    if ("error" in r) {
      setMessage(r.error);
      setDefinitions([]);
      return;
    }
    setDefinitions(r.definitions);
    setConfigs(r.configs);
    setRuns(r.runs);
    setIndex(r.index);
    const next: Record<string, string> = {};
    for (const def of r.definitions) {
      const c = r.configs[def.key];
      const lines = def.key === "seo-refresh" ? c?.content?.keywords : c?.content?.lines;
      next[def.key] = (lines ?? []).join("\n");
    }
    setDrafts(next);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patch(
    key: string,
    patchData: { enabled?: boolean; hour?: number; minute?: number; content?: object },
  ) {
    setBusy(key);
    setMessage(null);
    const r = await saveJob({ data: { key, ...patchData } as never });
    setBusy(null);
    if ("error" in r) setMessage(r.error);
    else {
      setConfigs((prev) => ({ ...prev, [key]: r.config }));
      setMessage("Saved.");
    }
  }

  async function saveContent(def: CronJobDefinition) {
    const lines = (drafts[def.key] ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    await patch(def.key, {
      content: def.key === "seo-refresh" ? { keywords: lines } : { lines },
    });
  }

  async function runNow(key: string, force: boolean) {
    setBusy(key);
    setMessage(null);
    const r = await runJob({ data: { key, force } });
    setBusy(null);
    if ("error" in r) setMessage(r.error);
    else {
      setMessage(`${r.summary}${r.emailed ? " Report emailed." : ""}`);
      void load();
    }
  }

  if (!definitions) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <CalendarClock className="h-4 w-4 text-primary" /> How the scheduler works
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          One scheduler runs every hour. Each job below decides whether it is due. Member-facing
          jobs follow each member's own local time, so only their on/off switch can be changed here.
          Fixed jobs run once a day at the time you set.
        </p>
        {index ? (
          <p className="mt-2 text-sm">
            <span className="font-semibold">{index.total}</span> keywords indexed ·{" "}
            {index.exercises} exercises · {index.workouts} workouts · last built{" "}
            {formatDateTime(index.generated_at)}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            The keyword index has not been built yet — run the SEO update once.
          </p>
        )}
      </div>

      {message ? (
        <div className="rounded-2xl border-2 border-blue-400 bg-card p-3 text-sm">{message}</div>
      ) : null}

      {definitions.map((def) => {
        const config = configs[def.key];
        const enabled = config?.enabled ?? def.defaults.enabled;
        const hour = config?.hour ?? def.defaults.hour;
        const minute = config?.minute ?? def.defaults.minute;
        const jobRuns = runs.filter((r) => r.job_key === def.key).slice(0, 5);

        return (
          <div key={def.key} className="space-y-4 rounded-2xl border-2 border-blue-400 bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold">{def.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{def.description}</p>
              </div>
              <Switch
                checked={enabled}
                disabled={busy === def.key}
                onCheckedChange={(v) => void patch(def.key, { enabled: v })}
                aria-label={`${def.label} on or off`}
              />
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <Clock className="h-4 w-4 text-primary" /> When it runs
              </div>
              <p className="mt-1 text-muted-foreground">{def.timingNote}</p>
              {def.timeEditable ? (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <Label htmlFor={`${def.key}-h`}>Hour</Label>
                    <Input
                      id={`${def.key}-h`}
                      type="number"
                      min={0}
                      max={23}
                      value={hour}
                      className="w-24"
                      onChange={(e) =>
                        setConfigs((prev) => ({
                          ...prev,
                          [def.key]: {
                            ...(prev[def.key] as CronJobConfig),
                            hour: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${def.key}-m`}>Minute</Label>
                    <Input
                      id={`${def.key}-m`}
                      type="number"
                      min={0}
                      max={59}
                      value={minute}
                      className="w-24"
                      onChange={(e) =>
                        setConfigs((prev) => ({
                          ...prev,
                          [def.key]: {
                            ...(prev[def.key] as CronJobConfig),
                            minute: Number(e.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={busy === def.key}
                    onClick={() => void patch(def.key, { hour, minute })}
                  >
                    <Save className="mr-2 h-4 w-4" /> Save time
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <Mail className="h-4 w-4 text-primary" /> Exactly what is sent
              </div>
              <ul className="mt-2 space-y-2">
                {def.sends.map((s, i) => (
                  <li key={i} className="border-l-2 border-primary pl-3">
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-muted-foreground">{s.body}</p>
                  </li>
                ))}
              </ul>
            </div>

            {def.contentEditable ? (
              <div className="space-y-2">
                <Label htmlFor={`${def.key}-c`}>{def.contentLabel}</Label>
                <Textarea
                  id={`${def.key}-c`}
                  rows={5}
                  value={drafts[def.key] ?? ""}
                  onChange={(e) => setDrafts((p) => ({ ...p, [def.key]: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">{def.contentHelp}</p>
                <Button size="sm" disabled={busy === def.key} onClick={() => void saveContent(def)}>
                  <Save className="mr-2 h-4 w-4" /> Save content
                </Button>
              </div>
            ) : null}

            {def.key === "seo-refresh" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === def.key}
                  onClick={() => void runNow(def.key, false)}
                >
                  {busy === def.key ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Run now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === def.key}
                  onClick={() => void runNow(def.key, true)}
                >
                  <Search className="mr-2 h-4 w-4" /> Force full rebuild
                </Button>
              </div>
            ) : null}

            <div className="text-sm">
              <p className="font-semibold">Recent runs</p>
              {jobRuns.length === 0 ? (
                <p className="text-muted-foreground">No runs recorded yet.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {jobRuns.map((r) => (
                    <li key={r.id} className="flex items-start gap-2 text-muted-foreground">
                      {r.status === "ok" ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : r.status === "skipped" ? (
                        <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      )}
                      <span>
                        {formatDateTime(r.ran_at)} — {r.summary}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
