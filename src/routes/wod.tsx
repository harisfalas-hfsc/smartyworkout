import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { offlineFirst } from "@/lib/offline/offline-first";
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
import {
  generateTodayWod,
  getDailyHub,
  getPublicWodDays,
  setWodSubscription,
} from "@/lib/daily.functions";

import { ParqWaiverDialog } from "@/components/ParqWaiverDialog";
import { MembershipRequiredDialog } from "@/components/MembershipRequiredDialog";
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
      { property: "og:title", content: "Workout of the Day — Smarty Workout" },
      {
        property: "og:description",
        content: "A balanced daily workout programme adapted to your profile by Smarty Coach.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://smartyworkout.com/wod" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/wod" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              url: "https://smartyworkout.com/wod",
              name: "Workout of the Day — Smarty Workout",
              description:
                "Two Workouts of the Day — one bodyweight, one with equipment — built automatically for your profile every night at midnight.",
              inLanguage: "en",
              isPartOf: { "@id": "https://smartyworkout.com/#website" },
              about: { "@id": "https://smartyworkout.com/#software" },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Workout of the Day",
                  item: "https://smartyworkout.com/wod",
                },
              ],
            },
          ],
        }),
      },
    ],
  }),

  component: WodPage,
});

type Hub = Awaited<ReturnType<typeof getDailyHub>>;
type DayInfo = {
  date: string;
  category: string;
  difficulty: string;
  stars: number;
  focus: string | null;
  isRecovery: boolean;
};
type WodWorkout = Hub["workouts"][number];

function DaySlide({ day, label }: { day: DayInfo; label: string }) {
  const formatted = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day.date}T12:00:00Z`));

  return (
    <div className="flex h-[165px] flex-col justify-center rounded-xl border-2 border-blue-400 bg-card px-3 py-3 text-center transition-all duration-300 hover:border-primary">
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
    <div className="rounded-xl border-2 border-blue-400 bg-card p-3 transition-colors hover:border-primary">
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
        className="mt-5 h-11 w-full rounded-xl border-2 border-primary/40 bg-transparent text-[14px] font-extrabold text-primary hover:border-primary hover:bg-transparent hover:text-primary"
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
  const loadPublic = useServerFn(getPublicWodDays);
  const setSub = useServerFn(setWodSubscription);
  const gen = useServerFn(generateTodayWod);
  const navigate = useNavigate();
  const [hub, setHub] = useState<Hub | null>(null);
  const [publicCycle, setPublicCycle] = useState<Awaited<
    ReturnType<typeof getPublicWodDays>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState(false);
  const [parqOpen, setParqOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    void offlineFirst("wod:public-cycle", () => loadPublic({}))
      .then(setPublicCycle)
      .catch(() => setPublicCycle(null));
  }, [loadPublic]);


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
    void offlineFirst("wod:hub", () => load({}), user.id)
      .then(setHub)
      .catch(() => setHub(null));
  }, [authLoading, load, user]);



  async function refresh() {
    setHub(await load({}));
  }

  async function handleSubscribeClick() {

    if (!user) {
      void navigate({ to: "/auth", search: { next: "/wod", mode: "signup" } });
      return;
    }
    if (!access?.profileComplete || !access.healthAcknowledged) {
      void navigate({ to: "/profile" });
      return;
    }
    if (!access.premium) {
      setMembershipOpen(true);
      return;
    }
    if (!subscribed && access.readinessFlagged && access.readinessFlags.length > 0) {
      setParqOpen(true);
      return;
    }
    await toggleSub(!subscribed);
  }

  async function toggleSub(subscribe: boolean) {
    if (busy || building) return;
    if (!navigator.onLine) {
      toast.error("You must be online to update Workout of the Day.");
      return;
    }
    setBusy(true);

    try {
      await setSub({ data: { subscribe } });
      await refresh();
      if (!subscribe) {
        toast.success("Unsubscribed. You can create your own workouts again.");
        return;
      }
      toast.success("You're in. Building today's two workouts now…");
      setBuilding(true);
      void gen({})
        .then(async () => {
          await refresh();
          toast.success("Today's two workouts are ready.");
        })
        .catch((e: unknown) => {
          toast.error(
            e instanceof Error ? e.message : "Today's workouts could not be built yet.",
          );
        })
        .finally(() => setBuilding(false));
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


  const days = hub?.days;
  const workouts = hub?.workouts ?? [];
  const subscribed = hub?.settings.wod_mode ?? false;
  const access = hub?.access;
  const daySlides = [
    { day: (days?.yesterday ?? publicCycle?.yesterday) as DayInfo | undefined, label: "Yesterday" },
    { day: (days?.today ?? publicCycle?.today) as DayInfo | undefined, label: "Today" },
    { day: (days?.tomorrow ?? publicCycle?.tomorrow) as DayInfo | undefined, label: "Tomorrow" },
  ].filter((s): s is { day: DayInfo; label: string } => Boolean(s.day));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <PageHeader
        className="mb-2"
        eyebrow="Smarty Coach"
        title="Workout of the Day"
        subtitle="Your daily programme, chosen for you by Smarty Coach."
      />

      <section className="space-y-3 rounded-2xl border-2 border-primary bg-card px-5 py-5 shadow-sm sm:px-8">
        <p className="text-center text-[14px] leading-6 text-muted-foreground">
          <strong className="text-primary">Workout of the Day is two ready workouts every
          day</strong> — one with equipment and one bodyweight only — built automatically around
          your Training Profile, so you simply open one and train.
        </p>
        <p className="text-center text-[14px] leading-6 text-muted-foreground">
          Both follow a <strong className="text-primary">scientific periodization plan</strong>:
          strength, endurance, power, mobility and recovery days are sequenced across the cycle so
          you never overtrain, never undertrain, and every fitness quality is developed in the right
          order.
        </p>
        <p className="text-center text-[14px] leading-6 text-muted-foreground">
          Instead of improvising a random workout each day, it is like having a{" "}
          <strong className="text-primary">personal trainer</strong> who already knows what you must
          do today, next week and next month — keeping you healthy, progressing and performing
          better over the long run.
        </p>
      </section>

      <WodContextNote />



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

      <MembershipRequiredDialog
        open={membershipOpen}
        onOpenChange={setMembershipOpen}
        title="Unlock your Workout of the Day"
        description="Every night at midnight Smarty Coach builds two Workouts of the Day for your profile — one bodyweight, one with equipment. Membership keeps them coming, plus unlimited coaching and the full community."
      />

      <ParqWaiverDialog
        open={parqOpen}
        flags={access?.readinessFlags ?? []}
        confirmLabel="I confirm — subscribe to the WOD"
        onConfirm={() => {
          setParqOpen(false);
          void toggleSub(true);
        }}
        onCancel={() => setParqOpen(false)}
      />


      <section className="flex flex-col items-center gap-5">
        {workouts.length ? (
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:gap-5">

            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        ) : null}

        <Button
          variant={subscribed ? "secondary" : "default"}
          className="h-12 w-full rounded-lg text-[15px] font-extrabold lg:w-80"
          disabled={busy || building}
          onClick={() => void handleSubscribeClick()}
        >
          {busy || building ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : null}
          <span className="truncate">
            {building
              ? "Building today's workouts…"
              : busy
                ? "Please wait…"
                : subscribed
                  ? "Unsubscribe"
                  : "Subscribe"}
          </span>
        </Button>

        {!user ? null : !access?.profileComplete || !access.healthAcknowledged ? (

          <div className="w-full max-w-xl rounded-2xl border-2 border-primary bg-card p-5 text-center">
            <UserRound className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 font-extrabold">Complete your Training Profile first</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Smarty Coach needs your age, level, goal, equipment, environment, duration and safety acknowledgement before it can personalize a workout.
            </p>
            <Button asChild className="mt-5 h-12 w-full rounded-xl font-extrabold">
              <Link to="/profile">Complete Training Profile</Link>
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-xl rounded-2xl border-2 border-primary bg-card p-5 text-center">
            <Crown className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 font-extrabold">Premium membership required</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Your profile is ready. Activate your €9.99 monthly membership before joining Workout of the Day.
            </p>
            <Button asChild className="mt-5 h-12 w-full rounded-xl font-extrabold">
              <Link to="/checkout">Become Premium · €9.99 / month</Link>
            </Button>
          </div>
        )}
        <p className="text-center text-[11px] leading-4 text-muted-foreground">
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

