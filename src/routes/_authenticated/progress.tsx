import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { offlineFirst } from "@/lib/offline/offline-first";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Flame,
  Trophy,
  Timer,
  Activity,
  Crown,
  Sparkles,
  Medal,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { TrainingLoadPanel } from "@/components/performance/TrainingLoadPanel";

import { getProgressOverview, type ProgressOverview } from "@/lib/progress.functions";
import { CATEGORY_LABEL, CATEGORY_UNIT } from "@/lib/progress-config";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-format";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Smarty Workout" },
      {
        name: "description",
        content:
          "Your Smarty Progress Score, ranking, streaks, awards and personal training records.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Progress,
});

const ICONS: Record<string, typeof Trophy> = {
  trophy: Trophy,
  flame: Flame,
  crown: Crown,
  sparkles: Sparkles,
  medal: Medal,
};

function num(n: number) {
  return n.toLocaleString();
}

function Stat({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Flame;
  label: string;
  value: string | number;
  to?: { filter: "all" | "completed" | "planned" | "favorites" | "scheduled" };
}) {
  const body = (
    <>
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </>
  );
  if (!to) return <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">{body}</div>;
  return (
    <Link
      to="/logbook"
      search={{ filter: to.filter, view: "list" as const }}
      className="block rounded-2xl border-2 border-blue-400 bg-card p-4 transition hover:border-primary/60"
    >
      {body}
      <span className="mt-2 block text-[11px] font-semibold text-primary">View in logbook →</span>
    </Link>
  );
}

function BadgeUnlockedToast({ names, onClose }: { names: string[]; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-sm animate-in fade-in slide-in-from-bottom-4 rounded-2xl border-2 border-blue-400 bg-card p-4 shadow-lg sm:bottom-6">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">Badge unlocked</p>
      <p className="mt-1 font-extrabold">{names.join(" • ")}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Your Smarty Progress Score has increased.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 text-xs font-semibold text-primary"
      >
        Nice!
      </button>
    </div>
  );
}

function Progress() {
  const fetchOverview = useServerFn(getProgressOverview);
  const [data, setData] = useState<ProgressOverview | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void offlineFirst("progress:overview", () => fetchOverview({ data: {} } as never))
      .then((r) => {
        if (!active) return;
        setData(r);
        if (r.newlyEarned.length) setUnlocked(r.newlyEarned.map((b) => b.name));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [fetchOverview]);

  const byCategory = useMemo(() => {
    if (!data) return [];
    const earned = new Set(data.badges.map((b) => b.badge_id));
    const value = (c: string) =>
      c === "subscription"
        ? data.stats.subscription_months
        : c === "generated"
          ? data.stats.workouts_generated
          : c === "completed"
            ? data.stats.workouts_completed
            : data.stats.longest_streak;
    const cats = ["completed", "streak", "generated", "subscription"];
    return cats.map((c) => {
      const defs = data.definitions
        .filter((d) => d.category === c)
        .sort((a, b) => a.threshold - b.threshold);
      const next = defs.find((d) => !earned.has(d.id));
      return { category: c, defs, next, value: value(c), earned };
    });
  }, [data]);

  if (!data)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const s = data.stats;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <PageHeader
        className="mb-2"
        eyebrow="Your training"
        title="Progress"
        subtitle="Keep showing up — Smarty Coach is tracking it all."
      />

      {/* Smarty Progress summary */}
      <section className="mt-6 rounded-3xl border-2 border-blue-400 bg-card p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Smarty Progress</p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-3xl font-black leading-none">{num(s.score)}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Score</p>
          </div>
          <div>
            <p className="text-3xl font-black leading-none">#{data.rank}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              Rank of {num(data.totalRanked)}
            </p>
          </div>
          <div>
            <p className="text-3xl font-black leading-none">{s.current_streak}d</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              Current streak
            </p>
          </div>
          <div>
            <p className="text-3xl font-black leading-none">{s.longest_streak}d</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              Longest streak
            </p>
          </div>
        </div>
      </section>

      {/* Workout progress */}
      <h2 className="mt-8 text-lg font-extrabold">Workout progress</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={Activity}
          label="Completed"
          value={num(s.workouts_completed)}
          to={{ filter: "completed" }}
        />
        <Stat
          icon={Sparkles}
          label="Generated"
          value={num(s.workouts_generated)}
          to={{ filter: "all" }}
        />
        <Stat
          icon={Activity}
          label="Not completed"
          value={num(Math.max(0, s.workouts_generated - s.workouts_completed))}
          to={{ filter: "planned" }}
        />
        <Stat icon={Timer} label="Training days" value={num(s.active_days)} />
      </div>

      {/* Training load & demonstrated performance */}
      <h2 className="mt-8 text-lg font-extrabold">Training load</h2>
      <TrainingLoadPanel />

      {/* Awards */}
      <h2 className="mt-8 text-lg font-extrabold">Awards</h2>

      <div className="mt-3 space-y-4">
        {byCategory.map(({ category, defs, next, value, earned }) => {
          const unit = CATEGORY_UNIT[category] ?? "";
          const pct = next ? Math.min(100, Math.round((value / next.threshold) * 100)) : 100;
          return (
            <div key={category} className="rounded-2xl border-2 border-blue-400 bg-card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-bold">{CATEGORY_LABEL[category]}</p>
                <p className="text-xs text-muted-foreground">
                  {defs.filter((d) => earned.has(d.id)).length}/{defs.length} earned
                </p>
              </div>

              {next ? (
                <div className="mt-3">
                  <p className="text-sm font-semibold">
                    Next: {next.name}
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {num(value)} / {num(next.threshold)} — {num(Math.max(0, next.threshold - value))}{" "}
                    {unit} to go
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-primary">
                  Maximum current level — keep improving your score and ranking.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {defs.map((d) => {
                  const Icon = ICONS[d.icon] ?? Trophy;
                  const has = earned.has(d.id);
                  const when = data.badges.find((b) => b.badge_id === d.id)?.earned_at;
                  return (
                    <div
                      key={d.id}
                      title={
                        has && when
                          ? `${d.description} — earned ${formatDate(when)}`
                          : d.description
                      }
                      className={cn(
                        "flex min-w-[92px] flex-1 flex-col items-center gap-1 rounded-xl border p-3 text-center sm:flex-none",
                        has
                          ? "border-blue-400 bg-primary/10 text-foreground"
                          : "border-border bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {has ? (
                        <Icon className="h-5 w-5 text-primary" />
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                      <span className="text-[11px] font-semibold leading-tight">
                        {num(d.threshold)} {unit}
                      </span>
                      {has && when && (
                        <span className="text-[10px]">
                          {formatDate(when)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Personal records */}
      <h2 className="mt-8 text-lg font-extrabold">Personal records</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Sparkles} label="Total generated" value={num(s.workouts_generated)} />
        <Stat icon={Trophy} label="Total completed" value={num(s.workouts_completed)} />
        <Stat icon={Flame} label="Current streak" value={`${s.current_streak}d`} />
        <Stat icon={Flame} label="Longest streak" value={`${s.longest_streak}d`} />
        <Stat
          icon={Crown}
          label="Membership"
          value={`${s.subscription_months} mo`}
        />
        <Stat icon={Medal} label="Progress score" value={num(s.score)} />
        <Stat icon={Trophy} label="Ranking" value={`#${data.rank}`} />
        <Stat icon={Medal} label="Awards earned" value={num(data.badges.length)} />
      </div>

      <Button asChild className="mt-8">
        <Link to="/coach">Train now</Link>
      </Button>

      {unlocked.length > 0 && (
        <BadgeUnlockedToast names={unlocked} onClose={() => setUnlocked([])} />
      )}
    </div>
  );
}
