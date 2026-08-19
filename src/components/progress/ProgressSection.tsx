import { Link } from "@tanstack/react-router";
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
import { TrainingLoadPanel } from "@/components/performance/TrainingLoadPanel";
import { RecentLoadTrend } from "@/components/performance/RecentLoadTrend";

import { getProgressOverview, type ProgressOverview } from "@/lib/progress.functions";
import { CATEGORY_LABEL, CATEGORY_UNIT } from "@/lib/progress-config";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-format";
import { SCORE_RULES } from "@/lib/progress-config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  onClick,
}: {
  icon: typeof Flame;
  label: string;
  value: string | number;
  to?: { filter: "all" | "completed" | "planned" | "favorites" | "scheduled" };
  onClick?: () => void;
}) {
  const body = (
    <>
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </>
  );
  if (onClick)
    return (
      <Button
        type="button"
        variant="outline"
        onClick={onClick}
        className="h-auto min-h-32 w-full items-start justify-start whitespace-normal rounded-2xl border-2 border-blue-400 bg-card p-4 text-left text-foreground"
      >
        <span>{body}</span>
      </Button>
    );
  if (!to) return <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">{body}</div>;
  return (
    <Link
      to="/logbook"
      search={{ filter: to.filter, view: "list" as const }}
      className="block rounded-2xl border-2 border-blue-400 bg-card p-4 transition hover:border-primary/60"
    >
      {body}
      <span className="mt-2 block text-[11px] font-semibold text-primary">See these workouts →</span>
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
      <button type="button" onClick={onClose} className="mt-3 text-xs font-semibold text-primary">
        Nice!
      </button>
    </div>
  );
}

/**
 * The whole progress picture. It lives inside the logbook so history, calendar
 * and progress are one place, never three.
 */
export function ProgressSection() {
  const fetchOverview = useServerFn(getProgressOverview);
  const [data, setData] = useState<ProgressOverview | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [detail, setDetail] = useState<"score" | "rank" | "current" | "longest" | "days" | "membership" | "awards" | null>(null);

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
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const s = data.stats;
  const scoreParts = [
    { label: "Completed workouts", value: s.workouts_completed, points: s.workouts_completed * SCORE_RULES.perCompletedWorkout },
    { label: "Generated workouts", value: s.workouts_generated, points: s.workouts_generated * SCORE_RULES.perGeneratedWorkout },
    { label: "Active training days", value: s.active_days, points: s.active_days * SCORE_RULES.perStreakDay },
    { label: "Membership months", value: s.subscription_months, points: s.subscription_months * SCORE_RULES.perSubscriptionMonth },
    { label: "Award points", value: data.badges.length, points: s.badge_points },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border-2 border-blue-400 bg-card p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Smarty Progress</p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button type="button" onClick={() => setDetail("score")} className="text-left">
            <p className="text-3xl font-black leading-none">{num(s.score)}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-primary">Score · View details</p>
          </button>
          <button type="button" onClick={() => setDetail("rank")} className="text-left">
            <p className="text-3xl font-black leading-none">#{data.rank}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-primary">
              Rank of {num(data.totalRanked)} · Details
            </p>
          </button>
          <button type="button" onClick={() => setDetail("current")} className="text-left">
            <p className="text-3xl font-black leading-none">{s.current_streak}d</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-primary">
              Current streak · Details
            </p>
          </button>
          <button type="button" onClick={() => setDetail("longest")} className="text-left">
            <p className="text-3xl font-black leading-none">{s.longest_streak}d</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-primary">
              Longest streak · Details
            </p>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold">Workouts</h2>
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
          <Stat icon={Timer} label="Training days" value={num(s.active_days)} onClick={() => setDetail("days")} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold">Training load</h2>
        <TrainingLoadPanel />
        <div className="mt-3">
          <RecentLoadTrend />
        </div>
      </section>


      <section>
        <h2 className="text-lg font-extrabold">Awards</h2>
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
                    <p className="text-sm font-semibold">Next: {next.name}</p>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {num(value)} / {num(next.threshold)}. {" "}
                      {num(Math.max(0, next.threshold - value))} {unit} to go
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-semibold text-primary">
                    Maximum current level. Keep improving your score and ranking.
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
                          has && when ? `${d.description}. Earned ${formatDate(when)}` : d.description
                        }
                        className={cn(
                          "flex min-w-[92px] flex-1 flex-col items-center gap-1 rounded-xl border p-3 text-center sm:flex-none",
                          has
                            ? "border-blue-400 bg-primary/10 text-foreground"
                            : "border-border bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {has ? <Icon className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5" />}
                        <span className="text-[11px] font-semibold leading-tight">
                          {num(d.threshold)} {unit}
                        </span>
                        {has && when && <span className="text-[10px]">{formatDate(when)}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Button asChild>
        <Link to="/coach">Train now</Link>
      </Button>

      {unlocked.length > 0 && <BadgeUnlockedToast names={unlocked} onClose={() => setUnlocked([])} />}

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[82vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl p-5">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle>
              {detail === "score" ? "Progress score" : detail === "rank" ? "Your ranking" : detail === "current" ? "Current streak" : detail === "longest" ? "Longest streak" : detail === "days" ? "Training days" : detail === "membership" ? "Membership" : "Awards earned"}
            </DialogTitle>
            <DialogDescription>
              {detail === "score" ? "A transparent total built from your saved training activity and awards." : detail === "rank" ? "Members are ordered by score, then completed workouts, longest streak, and the time the score was reached." : detail === "current" ? "Consecutive calendar days with a completed workout, ending today or yesterday." : detail === "longest" ? "Your best run of consecutive calendar days with completed workouts." : detail === "days" ? "The number of different calendar days on which you completed at least one workout." : detail === "membership" ? "Whole active membership months recorded on your account." : "Awards already unlocked from completed workouts, generated workouts, streaks, and membership."}
            </DialogDescription>
          </DialogHeader>

          {detail === "score" ? (
            <div className="space-y-2">
              {scoreParts.map((part) => (
                <div key={part.label} className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm">
                  <span>{part.label} <span className="text-muted-foreground">× {part.value}</span></span>
                  <strong>{num(part.points)} pts</strong>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-black"><span>Total</span><span>{num(s.score)} pts</span></div>
            </div>
          ) : detail === "awards" ? (
            data.badges.length ? (
              <ul className="space-y-2">
                {data.badges.map((badge) => <li key={badge.badge_id} className="rounded-xl border border-border p-3"><p className="font-bold">{badge.badge_name}</p><p className="text-xs text-muted-foreground">{badge.points} points · earned {formatDate(badge.earned_at)}</p></li>)}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No awards earned yet. The Awards section shows the next target in each category.</p>
          ) : (
            <div className="rounded-xl border border-border p-4">
              <p className="text-3xl font-black">{detail === "rank" ? `#${data.rank} of ${num(data.totalRanked)}` : detail === "current" ? `${s.current_streak} days` : detail === "longest" ? `${s.longest_streak} days` : detail === "days" ? `${s.active_days} days` : `${s.subscription_months} months`}</p>
              {(detail === "current" || detail === "longest" || detail === "days") ? <Button asChild variant="outline" className="mt-4 w-full"><Link to="/logbook" search={{ filter: "completed", view: "calendar" as const }}>View completed days</Link></Button> : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
