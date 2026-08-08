import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Dumbbell, Home, Loader2, Play, Sparkles } from "lucide-react";
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

function DaySlide({ day, label, active }: { day: DayInfo; label: string; active: boolean }) {
  const formatted = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day.date}T12:00:00Z`));

  return (
    <div
      className={`w-[72%] shrink-0 snap-center rounded-lg border-2 px-3 py-4 text-center transition-all sm:w-[46%] ${
        active
          ? "border-primary bg-primary/10 opacity-100"
          : "border-border bg-muted/40 opacity-60"
      }`}
    >
      <p className="text-xs font-bold text-primary">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-primary">{formatted}</p>
      <p className="mt-3 truncate text-sm font-black uppercase">{day.category}</p>
      <p className="mx-auto mt-2 w-fit rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold text-primary">
        {day.difficulty || "Recovery"}
      </p>
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
  const [activeDay, setActiveDay] = useState(1);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const centeredRef = useRef(false);

  function onTrackScroll() {
    const el = trackRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, index) => {
      const node = child as HTMLElement;
      const dist = Math.abs(node.offsetLeft + node.offsetWidth / 2 - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    setActiveDay(best);
  }

  useEffect(() => {
    void load({})
      .then(setHub)
      .catch(() => setHub(null));
  }, [load]);

  useEffect(() => {
    if (!hub || centeredRef.current) return;
    const el = trackRef.current;
    const today = el?.children[1] as HTMLElement | undefined;
    if (!el || !today) return;
    centeredRef.current = true;
    el.scrollLeft = today.offsetLeft - (el.clientWidth - today.offsetWidth) / 2;
  }, [hub]);


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
  const daySlides = [
    { day: days.yesterday, label: "Yesterday" },
    { day: days.today, label: "Today" },
    { day: days.tomorrow, label: "Tomorrow" },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6 sm:py-10">
      <header>
        <h1 className="text-3xl font-black">Workout of the Day</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your daily programme, chosen for you by Smarty Coach.
        </p>
      </header>

      <section className="rounded-lg border-2 border-primary/60 bg-card px-5 py-6 text-center shadow-sm sm:px-8">
        <p className="text-[14px] leading-6 text-muted-foreground">
          Get <strong className="text-foreground">two workouts</strong> every day: one bodyweight
          and one using your equipment. <strong className="text-primary">Smarty Coach</strong>{" "}
          follows a balanced periodization plan and adapts every workout to your profile. It is
          like having a personal trainer choose the best workout for you.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card py-3 shadow-sm">
        <div className="flex items-center justify-center gap-5 py-1 text-xs font-medium text-muted-foreground">
          <ChevronLeft className="h-5 w-5" />
          <span>Swipe to explore</span>
          <ChevronRight className="h-5 w-5" />
        </div>
        <div
          ref={trackRef}
          onScroll={onTrackScroll}
          className="mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[14%] pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-[27%] [&::-webkit-scrollbar]:hidden"
        >
          {daySlides.map((item, index) => (
            <DaySlide
              key={item.label}
              day={item.day}
              label={item.label}
              active={index === activeDay}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-2" aria-hidden="true">
          {daySlides.map((item, index) => (
            <span
              key={item.label}
              className={`h-2.5 w-2.5 rounded-full border border-primary ${
                index === activeDay ? "bg-primary" : "bg-transparent"
              }`}
            />
          ))}
        </div>
      </section>


      <section>
        {workouts.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        ) : (
          <Button
            className="h-12 w-full rounded-lg text-[15px] font-extrabold"
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
          className="mt-3 h-12 w-full rounded-lg text-[15px] font-extrabold"
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

