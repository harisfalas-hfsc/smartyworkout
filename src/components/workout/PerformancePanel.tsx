import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  LineChart,
  Loader2,
  Minus,
  Pencil,
} from "lucide-react";
import { getWorkoutPerformance } from "@/lib/performance.functions";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/date-format";
import { parseWorkoutSteps, type WorkoutStep } from "@/lib/workout/parse-steps";
import { PerformanceEditorDialog } from "./PerformanceEditorDialog";
import { AttemptTrendChart, type AttemptPoint } from "./AttemptTrendChart";

type Perf = Awaited<ReturnType<typeof getWorkoutPerformance>>;
type Attempt = Perf["attempts"][number];
type Delta = NonNullable<Attempt["comparison"]>["metrics"][number];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function fmtTime(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "Not logged";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}


/** Overall verdict of a session versus the previous one, from its own metric deltas. */
function attemptVerdict(a: Attempt): "better" | "worse" | "same" | null {
  const metrics = a.comparison && a.comparison.reason !== "version_changed" ? a.comparison.metrics : [];
  if (!metrics.length) return null;
  const better = metrics.filter((m) => m.verdict === "better").length;
  const worse = metrics.filter((m) => m.verdict === "worse").length;
  if (better > worse) return "better";
  if (worse > better) return "worse";
  return "same";
}

const VERDICT_STYLE = {
  better: { text: "text-emerald-500", border: "border-emerald-500/60", label: "Better" },
  worse: { text: "text-red-500", border: "border-red-500/60", label: "Harder" },
  same: { text: "text-muted-foreground", border: "border-border", label: "Same" },
} as const;

function DeltaRow({ m }: { m: Delta }) {
  const tone =
    m.verdict === "better"
      ? "text-emerald-500"
      : m.verdict === "worse"
        ? "text-red-500"
        : "text-muted-foreground";
  const Icon = m.verdict === "better" ? ArrowUp : m.verdict === "worse" ? ArrowDown : Minus;
  return (
    <li className="flex items-center justify-between gap-3 border-t border-border py-1 text-sm">
      <span>{m.label}</span>
      <span className={`flex shrink-0 items-center gap-1.5 ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
        {m.current ?? "—"}
        {m.previous !== null ? (
          <span className="text-xs text-muted-foreground">(was {m.previous})</span>
        ) : null}
      </span>
    </li>
  );
}

/**
 * Objective performance only. This block never states whether the workout was
 * completed — that is a separate concept shown by the workout status itself.
 * Repeats of the same workout are kept as separate dated sessions.
 */
export function PerformancePanel({
  workoutId,
  html,
  category = null,
  format = null,
}: {
  workoutId: string;
  html?: string | null;
  category?: string | null;
  format?: string | null;
}) {
  const fetchPerformance = useServerFn(getWorkoutPerformance);
  const [data, setData] = useState<Perf | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  // Only one session is expanded at a time, so a long history stays one screen tall.
  const [openAttempt, setOpenAttempt] = useState<number | null>(null);

  const steps: WorkoutStep[] = useMemo(
    () => (html ? parseWorkoutSteps(html) : []),
    [html],
  );

  const load = useCallback(() => {
    setLoading(true);
    return fetchPerformance({ data: { workoutId } })
      .then((res) => setData(res as Perf))
      .catch(() => {
        /* offline or unavailable — the block simply stays empty */
      })
      .finally(() => setLoading(false));
  }, [workoutId, fetchPerformance]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <section className="mt-5 rounded-2xl border-2 border-blue-400 bg-card p-5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </section>
    );
  }

  const attempts = data?.attempts ?? [];
  const chartPoints: AttemptPoint[] = attempts.map((a) => ({
    attempt: a.attempt,
    performedAt: a.performedAt,
    totalReps: a.totalReps,
    totalVolumeKg: a.totalVolumeKg,
    strengthLoad: a.strengthLoad,
    conditioningLoad: a.conditioningLoad,
    rpe: a.rpe,
    durationSeconds: a.result?.duration_seconds ?? null,
  }));


  return (
    <section className="mt-5 rounded-2xl border-2 border-blue-400 bg-card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <Activity className="h-5 w-5 text-primary" /> Performance
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        What was actually recorded, session by session. Separate from workout completion — anything
        not logged stays unavailable and is never estimated.
      </p>

      {!attempts.length ? (
        <>
          <p className="text-sm text-muted-foreground">
            No performance data logged for this workout yet. Logging is always optional and never
            changes whether the workout counts as completed.
          </p>
          {steps.length ? (
            <Button variant="secondary" className="mt-3" onClick={() => setEditing(1)}>
              <Pencil className="mr-1.5 h-4 w-4" /> Log performance
            </Button>
          ) : null}
        </>
      ) : (
        <div className="space-y-3">
          {attempts.length >= 2 ? (
            <div className="rounded-xl border-2 border-primary/60 bg-primary/5 p-3">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                <LineChart className="h-4 w-4 text-primary" /> Session comparison
              </h3>
              <AttemptTrendChart points={chartPoints} />
            </div>
          ) : null}

          {[...attempts].reverse().map((a, i) => {
            const c = a.completion;
            const verdict = attemptVerdict(a);
            const style = verdict ? VERDICT_STYLE[verdict] : null;
            const open = (openAttempt ?? attempts[attempts.length - 1]?.attempt) === a.attempt;
            return (
              <article
                key={a.attempt}
                className={`overflow-hidden rounded-xl border ${style ? style.border : "border-border"}`}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenAttempt(open ? -1 : a.attempt)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {a.performedAt ? formatDateTime(a.performedAt) : "Undated session"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Session {a.attempt} of {attempts.length}
                      {i === 0 ? " · latest" : ""}
                    </span>
                  </span>
                  {style ? (
                    <span className={`shrink-0 text-xs font-bold ${style.text}`}>{style.label}</span>
                  ) : null}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>

                {!open ? null : (
                <div className="border-t border-border p-3">
                {steps.length ? (
                  <div className="mb-2 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(a.attempt)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                ) : null}

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Sets logged
                    </p>
                    <p className="font-bold">
                      {c.setsLogged}
                      {c.setsPlanned !== null ? ` of ${c.setsPlanned} prescribed` : ""}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Reps logged
                    </p>
                    <p className="font-bold">
                      {c.repsLogged === null
                        ? "Not logged"
                        : `${c.repsLogged}${c.repsPlanned !== null ? ` of ${c.repsPlanned} prescribed` : ""}`}
                    </p>
                  </div>
                </div>

                {/* Read-only session statistics. Editing is a separate, explicit action. */}
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Stat
                    label="RPE"
                    value={a.rpe === null ? "Not logged" : `${a.rpe} / 10`}
                  />
                  <Stat
                    label="Strength load"
                    value={a.strengthLoad === null ? "Not logged" : String(Math.round(a.strengthLoad))}
                  />
                  <Stat
                    label="Conditioning load"
                    value={
                      a.conditioningLoad === null ? "Not logged" : String(Math.round(a.conditioningLoad))
                    }
                  />
                  <Stat
                    label="Session load"
                    value={
                      a.strengthLoad === null && a.conditioningLoad === null
                        ? "Not logged"
                        : String(Math.round((a.strengthLoad ?? 0) + (a.conditioningLoad ?? 0)))
                    }
                  />
                  <Stat
                    label="Volume"
                    value={a.totalVolumeKg === null ? "Not logged" : `${Math.round(a.totalVolumeKg)} kg`}
                  />
                  <Stat label="Session time" value={fmtTime(a.result?.duration_seconds ?? null)} />
                </div>


                {a.resultText ? (
                  <p className="mt-2 text-sm">
                    <span className="font-semibold text-primary">Result:</span> {a.resultText}
                  </p>
                ) : null}

                {a.comparison && a.comparison.reason === "version_changed" ? (
                  <p className="mt-2 rounded-lg border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                    This session used a different version of the workout, so it is not directly
                    comparable with the previous one. Both are kept in full.
                  </p>
                ) : a.comparison && a.comparison.metrics.length ? (
                  <ul className="mt-2">
                    {a.comparison.metrics.map((m) => (
                      <DeltaRow key={m.key} m={m} />
                    ))}
                  </ul>
                ) : null}

                {a.debrief &&
                (a.debrief.rpe !== null ||
                  a.debrief.feeling ||
                  a.debrief.difficulty ||
                  a.debrief.enjoyed ||
                  a.debrief.wouldRepeat) ? (
                  <div className="mt-2 rounded-lg border border-primary/40 bg-primary/5 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      How it felt
                    </p>
                    <p className="text-sm font-semibold">
                      {[
                        a.debrief.rpe !== null ? `RPE ${a.debrief.rpe}` : null,
                        a.debrief.feeling ? `felt ${a.debrief.feeling.toLowerCase()}` : null,
                        a.debrief.difficulty ? a.debrief.difficulty.toLowerCase() : null,
                        a.debrief.enjoyed ? `enjoyed: ${a.debrief.enjoyed.toLowerCase()}` : null,
                        a.debrief.wouldRepeat
                          ? `repeat: ${a.debrief.wouldRepeat.toLowerCase()}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {a.debrief.comment ? (
                      <p className="mt-1 text-xs text-muted-foreground">“{a.debrief.comment}”</p>
                    ) : null}
                  </div>
                ) : null}

                {a.note ? (
                  <p className="mt-2 text-sm text-muted-foreground">{a.note}</p>
                ) : null}
                </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {editing !== null ? (
        <PerformanceEditorDialog
          open
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
          workoutId={workoutId}
          attempt={editing}
          steps={steps}
          category={category}
          format={format}
          title="Edit this session"
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}
    </section>
  );
}
