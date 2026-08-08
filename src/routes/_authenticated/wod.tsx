import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Dumbbell, Home, Loader2, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateTodayWod, getDailyHub, setWodSubscription } from "@/lib/daily.functions";

export const Route = createFileRoute("/_authenticated/wod")({
  head: () => ({
    meta: [
      { title: "Workout of the Day — Smarty Workout" },
      {
        name: "description",
        content:
          "Two Workouts of the Day — one bodyweight, one with equipment — built automatically for your profile every night at midnight.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WodPage,
});

type Hub = Awaited<ReturnType<typeof getDailyHub>>;
type DayInfo = Hub["days"]["today"];
type WodWorkout = Hub["workouts"][number];

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

function WorkoutCard({ workout }: { workout: WodWorkout }) {
  const bodyweight = workout.wod_variant === "bodyweight";
  const Icon = bodyweight ? Home : Dumbbell;
  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {workout.wod_variant === "recovery"
            ? "Recovery"
            : bodyweight
              ? "Bodyweight"
              : "With equipment"}
        </span>
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-extrabold leading-tight">{workout.name}</p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">
        {workout.duration_min} min · {workout.difficulty_stars}★ ·{" "}
        {workout.status === "completed" ? "Completed" : "Not done yet"}
      </p>
      <Button asChild className="mt-3 h-11 w-full rounded-2xl text-[14px] font-extrabold">
        <Link to="/workout/$workoutId" params={{ workoutId: workout.id }}>
          <Play className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">Open</span>
        </Link>
      </Button>
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

  useEffect(() => {
    void load({})
      .then(setHub)
      .catch(() => setHub(null));
  }, [load]);

  async function refresh() {
    setHub(await load({}));
  }

  async function make() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await build({});
      if (res.ids.length > 1) {
        await refresh();
      } else {
        navigate({ to: "/workout/$workoutId", params: { workoutId: res.id } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build today's workouts.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSub(subscribe: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      await setSub({ data: { subscribe } });
      await refresh();
      toast.success(
        subscribe
          ? "You're in. Today's two workouts are in your account already."
          : "Unsubscribed. You can create your own workouts again.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update your subscription.");
    } finally {
      setBusy(false);
    }
  }

  if (!hub) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const { days, workouts, settings } = hub;
  const subscribed = settings.wod_mode;

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
      <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <header className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            Smarty Workout
          </p>
          <h1 className="mt-1 text-xl font-black leading-tight sm:text-2xl">Workout of the Day</h1>
        </header>

        <p className="mt-3 text-center text-[13px] leading-5 text-muted-foreground">
          Every day you get <strong className="text-foreground">two workouts</strong> — one
          bodyweight, one with equipment. Instead of choosing a workout every day,{" "}
          <strong className="text-primary">Smarty Coach</strong> picks the best one for you — a
          personal trainer in your pocket, built from your profile.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <DayCell day={days.yesterday} label="Yesterday" />
          <DayCell day={days.today} label="Today" active />
          <DayCell day={days.tomorrow} label="Tomorrow" />
        </div>

        {workouts.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        ) : (
          <Button
            className="mt-3 h-12 w-full rounded-2xl text-[15px] font-extrabold"
            disabled={busy}
            onClick={() => void make()}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{busy ? "Building…" : "Build today's workouts"}</span>
          </Button>
        )}

        <Button
          variant="secondary"
          className="mt-2 h-12 w-full rounded-2xl text-[15px] font-extrabold"
          disabled={busy}
          onClick={() => void toggleSub(!subscribed)}
        >
          <span className="truncate">{subscribed ? "Unsubscribe" : "Subscribe"}</span>
        </Button>
        <p className="mt-2 text-center text-[11px] leading-4 text-muted-foreground">
          {subscribed
            ? "Both workouts arrive automatically at midnight, your local time. Renews monthly."
            : "Subscribe and today's two workouts are built right away, then every night automatically."}
        </p>
      </section>
    </div>
  );
}

