import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Crown, Dumbbell, Home, Loader2, Play, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SwipeToExplore } from "@/components/ui/SwipeToExplore";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { getDailyHub, setWodSubscription } from "@/lib/daily.functions";
import { getCycleDay, localDateISO, starsForCycleDay } from "@/lib/wod-cycle";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/wod")({
  head: () => ({
    meta: [
      { title: "Workout of the Day — Smarty Workout" },
      {
        name: "description",
        content:
          "Two Workouts of the Day — one bodyweight, one with equipment — built automatically for your profile every night at midnight.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Workout of the Day — Smarty Workout" },
      {
        property: "og:description",
        content: "A balanced daily workout programme adapted to your profile by Smarty Coach.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WodPage,
});

type Hub = Awaited<ReturnType<typeof getDailyHub>>;
type DayInfo = Hub["days"]["today"];
type WodWorkout = Hub["workouts"][number];

function DaySlide({ day, label }: { day: DayInfo; label: string }) {
  const formatted = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day.date}T12:00:00Z`));

  return (
    <div className="flex h-[165px] flex-col justify-center rounded-xl border-2 border-primary/40 bg-card px-3 py-3 text-center transition-all duration-300 hover:border-primary">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{label}</p>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{formatted}</p>
      <p className="mt-2 line-clamp-2 text-sm font-bold uppercase leading-tight">{day.category}</p>
      <p className="mx-auto mt-2 w-fit rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
        {day.difficulty || "Recovery"}
      </p>
    </div>
  );
}


function WorkoutCard({ workout }: { workout: WodWorkout }) {
  const bodyweight = workout.wod_variant === "bodyweight";
  const Icon = bodyweight ? Home : Dumbbell;
  return (
    <div className="rounded-xl border-2 border-primary/40 bg-card p-3 transition-colors hover:border-primary">
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
      <Button
        asChild
        variant="outline"
        className="mt-3 h-11 w-full rounded-xl border-2 border-primary/40 bg-transparent text-[14px] font-extrabold text-primary hover:border-primary hover:bg-transparent hover:text-primary"
      >
        <Link to="/workout/$workoutId" params={{ workoutId: workout.id }}>
          <Play className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">Open</span>
        </Link>
      </Button>
    </div>
  );
}

function WodPage() {
  const { user, loading: authLoading } = useAuth();
  const load = useServerFn(getDailyHub);
  const setSub = useServerFn(setWodSubscription);
  const [hub, setHub] = useState<Hub | null>(null);
  const [busy, setBusy] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(1);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load({})
      .then(setHub)
      .catch(() => setHub(null));
  }, [authLoading, load, user]);



  async function refresh() {
    setHub(await load({}));
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

  if (authLoading || (user && !hub)) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const publicDays: DayInfo[] = ([-1, 0, 1] as const).map((offset) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offset);
    const dateISO = localDateISO(date);
    const cycle = getCycleDay(dateISO);
    return {
      date: dateISO,
      category: cycle.category,
      difficulty: cycle.difficulty ?? "Recovery",
      stars: starsForCycleDay(cycle),
      focus: cycle.strengthFocus ?? null,
      isRecovery: cycle.category === "RECOVERY",
    };
  });
  const days = hub?.days;
  const workouts = hub?.workouts ?? [];
  const subscribed = hub?.settings.wod_mode ?? false;
  const access = hub?.access;
  const daySlides = [
    { day: days?.yesterday ?? publicDays[0], label: "Yesterday" },
    { day: days?.today ?? publicDays[1], label: "Today" },
    { day: days?.tomorrow ?? publicDays[2], label: "Tomorrow" },
  ];

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 px-4 py-8 sm:py-12 lg:max-w-5xl lg:px-8 lg:py-16">
      <PageHeader
        className="mb-2"
        eyebrow="Smarty Coach"
        title="Workout of the Day"
        subtitle="Your daily programme, chosen for you by Smarty Coach."
      />

      <section className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm sm:px-8">
        <p className="text-center text-[14px] leading-6 text-muted-foreground">
          Get <strong className="text-foreground">two workouts</strong> every day: one bodyweight
          and one using your equipment. <strong className="text-primary">Smarty Coach</strong>{" "}
          follows a balanced periodization plan and adapts every workout to your profile. It is
          like having a personal trainer choose the best workout for you.
        </p>

      </section>

      <section className="relative px-1 py-1">
        <SwipeToExplore onPrev={() => api?.scrollPrev()} onNext={() => api?.scrollNext()} />

        <Carousel
          setApi={setApi}
          opts={{ align: "center", loop: true, startIndex: 1 }}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {daySlides.map((item) => (
              <CarouselItem key={item.label} className="basis-[75%] pl-3 md:basis-[32%]">
                <DaySlide day={item.day} label={item.label} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-4 h-8 w-8 border-border bg-background/80 hover:bg-accent" />
          <CarouselNext className="-right-4 h-8 w-8 border-border bg-background/80 hover:bg-accent" />
        </Carousel>

        <div className="mt-3 flex justify-center gap-2">
          {daySlides.map((item, index) => (
            <button
              key={item.label}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                current === index ? "w-3 bg-primary" : "w-1.5 bg-primary/30 hover:bg-primary/50",
              )}
              aria-label={`Go to ${item.label}`}
            />
          ))}
        </div>
      </section>




      <section className="lg:flex lg:flex-col lg:items-center">
        {workouts.length ? (
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:gap-5">

            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        ) : null}

        {user && access?.profileComplete && access.healthAcknowledged && access.premium ? (
          <Button
            variant={subscribed ? "secondary" : "default"}
            className={`${workouts.length ? "mt-3 " : ""}h-12 w-full rounded-lg text-[15px] font-extrabold lg:w-80`}
            disabled={busy}
            onClick={() => void toggleSub(!subscribed)}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : null}
            <span className="truncate">
              {busy ? "Please wait…" : subscribed ? "Unsubscribe" : "Subscribe"}
            </span>
          </Button>
        ) : !user ? (
          <Button asChild className="h-12 w-full rounded-lg text-[15px] font-extrabold lg:w-80">
            <Link to="/auth" search={{ next: "/wod", mode: "signup" }}>
              Create an account
            </Link>
          </Button>
        ) : !access?.profileComplete || !access.healthAcknowledged ? (
          <div className="w-full max-w-xl rounded-xl border border-border bg-card p-4 text-center">
            <UserRound className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 font-extrabold">Complete your Training Profile first</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Smarty Coach needs your age, level, goal, equipment, environment, duration and safety acknowledgement before it can personalize a workout.
            </p>
            <Button asChild className="mt-3 h-12 w-full rounded-lg font-extrabold">
              <Link to="/profile">Complete Training Profile</Link>
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-xl rounded-xl border border-border bg-card p-4 text-center">
            <Crown className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 font-extrabold">Premium membership required</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Your profile is ready. Activate your €9.99 monthly membership before joining Workout of the Day.
            </p>
            <Button asChild className="mt-3 h-12 w-full rounded-lg font-extrabold">
              <Link to="/pricing">Become Premium</Link>
            </Button>
          </div>
        )}
        <p className="mt-2 text-center text-[11px] leading-4 text-muted-foreground">
          {!user
            ? "Explore the programme above, then sign in to receive your two personalized workouts every day."
            : !access?.profileComplete || !access.healthAcknowledged
              ? "Profile completion and the health acknowledgement are mandatory before any workout can be created."
              : !access.premium
                ? "Workout of the Day cannot be activated without a verified premium membership."
            : subscribed
            ? "Your two daily workouts arrive automatically. You can still open every workout you already have, but manual generation stays paused until you unsubscribe."
            : "Subscribe and today's two workouts are built right away, then every night automatically. Manual generation is paused while subscribed because Smarty Coach already creates your daily pair."}
        </p>

      </section>
    </div>
  );
}

