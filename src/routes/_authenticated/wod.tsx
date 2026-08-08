import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateTodayWod, getDailyHub, setWodSubscription } from "@/lib/daily.functions";
import type { WodLevel } from "@/lib/wod-cycle";

export const Route = createFileRoute("/_authenticated/wod")({
  head: () => ({
    meta: [
      { title: "Workout of the Day — Smarty Workout" },
      {
        name: "description",
        content: "Today's Workout of the Day, delivered automatically every night at midnight.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WodPage,
});

type Hub = Awaited<ReturnType<typeof getDailyHub>>;
type DayInfo = Hub["days"]["today"];

const LEVELS: { id: WodLevel; label: string }[] = [
  { id: "cycle", label: "Programme" },
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

function DayCell({ day, label, active }: { day: DayInfo; label: string; active?: boolean }) {
  return (
    <div
      className={`min-w-0 rounded-2xl border p-2.5 text-center ${
        active ? "border-primary bg-primary/10" : "border-border bg-background"
      }`}
    >
      <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-[12px] font-extrabold leading-tight">{day.category}</p>
      <p className="mt-1 truncate text-[10px] text-muted-foreground">{day.difficulty}</p>
    </div>
  );
}

function WodPage() {
  const navigate = useNavigate();
  const load = useServerFn(getDailyHub);
  const build = useServerFn(generateTodayWod);
  const setSub = useServerFn(setWodSubscription);
  const [hub, setHub] = useState<Hub | null>(null);
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState<WodLevel>("cycle");

  useEffect(() => {
    void load({})
      .then((h) => {
        setHub(h);
        setLevel(h.settings.wod_level ?? "cycle");
      })
      .catch(() => setHub(null));
  }, [load]);

  async function refresh() {
    const h = await load({});
    setHub(h);
    setLevel(h.settings.wod_level ?? "cycle");
  }

  async function make() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await build({});
      navigate({ to: "/workout/$workoutId", params: { workoutId: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build today's workout.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSub(subscribe: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      await setSub({ data: { subscribe, level } });
      await refresh();
      toast.success(
        subscribe
          ? "You're in. Your workout lands at midnight, every night."
          : "Unsubscribed. You can create your own workouts again.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update your subscription.");
    } finally {
      setBusy(false);
    }
  }

  async function pickLevel(next: WodLevel) {
    setLevel(next);
    if (!hub?.settings.wod_mode) return;
    try {
      await setSub({ data: { subscribe: true, level: next } });
      await refresh();
    } catch {
      /* keep local choice */
    }
  }

  if (!hub) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const { days, workout, settings } = hub;
  const subscribed = settings.wod_mode;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <header className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
          Smarty Workout
        </p>
        <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">Workout of the Day</h1>
      </header>

      <section className="mt-4 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-sm leading-6 text-muted-foreground">
          One shared session for every Smarty athlete, every day. It follows a structured
          programme that rotates strength, cardio, metabolic, mobility, pilates and challenge days,
          with recovery days built in — so nothing is repeated and nothing is overloaded. Your copy
          is still built around your equipment, level and history.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <DayCell day={days.yesterday} label="Yesterday" />
          <DayCell day={days.today} label="Today" active />
          <DayCell day={days.tomorrow} label="Tomorrow" />
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-sm font-extrabold">Difficulty</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Follow the programme, or lock one level.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => void pickLevel(l.id)}
              className={`h-11 truncate whitespace-nowrap rounded-2xl border px-2 text-[13px] font-bold transition ${
                level === l.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/50"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
        {workout ? (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Ready</p>
            <p className="mt-1 text-base font-extrabold leading-tight">{workout.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {workout.duration_min} min · {workout.difficulty_stars}★ ·{" "}
              {workout.status === "completed" ? "Completed" : "Not done yet"}
            </p>
            <Button
              asChild
              className="mt-3 h-12 w-full rounded-2xl text-[15px] font-extrabold"
            >
              <Link to="/workout/$workoutId" params={{ workoutId: workout.id }}>
                <Play className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">Open today's workout</span>
              </Link>
            </Button>
          </div>
        ) : (
          <Button
            className="h-12 w-full rounded-2xl text-[15px] font-extrabold"
            disabled={busy}
            onClick={() => void make()}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{busy ? "Building…" : "Build today's workout"}</span>
          </Button>
        )}

        {subscribed ? (
          <>
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Subscribed — your workout is generated automatically at midnight, your local time.
              While subscribed you train the daily programme only. Renews monthly.
            </p>
            <Button
              variant="secondary"
              className="mt-3 h-12 w-full rounded-2xl text-[15px] font-extrabold"
              disabled={busy}
              onClick={() => void toggleSub(false)}
            >
              <span className="truncate">Unsubscribe</span>
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              className="mt-3 h-12 w-full rounded-2xl text-[15px] font-extrabold"
              disabled={busy}
              onClick={() => void toggleSub(true)}
            >
              <span className="truncate">Subscribe to Workout of the Day</span>
            </Button>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Subscribed, your workout is created automatically at midnight wherever you live and
              waits in your account. You won't create your own workouts while subscribed.
              Unsubscribe any time and go back to your own sessions.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
