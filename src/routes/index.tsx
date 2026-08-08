import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Info,
  ListChecks,
  HelpCircle,
  CalendarCheck,
  Dumbbell,
  Crown,
  Wrench,
  Mail,
  Sparkles,
  BookOpen,
  ClipboardList,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "SmartyWorkout — Your personal training plan, built in minutes",
      },
      {
        name: "description",
        content:
          "Answer a smart questionnaire, get a fully personalized workout plan built around your body, goals, food preferences and constraints. Completely free.",
      },
      {
        property: "og:title",
        content: "SmartyWorkout — Your personal training plan, built in minutes",
      },
      {
        property: "og:description",
        content:
          "Personalized AI workout plans with equipment list, macros and PDF export. Plus free BMR, TDEE, macro and calorie tools.",
      },
      { property: "og:url", content: "https://smartyworkout.com/" },
      {
        property: "og:image",
        content:
          "https://smartyworkout.com/__l5e/assets-v1/d1e59921-5974-44b4-96d8-9bfbec15c871/smartydiet-social.png",
      },
      {
        name: "twitter:image",
        content:
          "https://smartyworkout.com/__l5e/assets-v1/d1e59921-5974-44b4-96d8-9bfbec15c871/smartydiet-social.png",
      },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/" }],
  }),
  component: Home,
});

type CtaState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "has-active"; sessionId: string }
  | { kind: "no-active" };

function Home() {
  const DISCOVER = [
    { to: "/wod", icon: CalendarCheck, title: "Workout of the Day", desc: "Two fresh workouts daily." },
    { to: "/about", icon: Info, title: "About", desc: "Who we are and why." },
    { to: "/how-it-works", icon: ListChecks, title: "How it works", desc: "Answer. Build. Train." },
    { to: "/exercise-library", icon: Dumbbell, title: "Exercise Library", desc: "1,300+ demonstrations." },
    { to: "/pricing", icon: Crown, title: "Pricing", desc: "One simple plan." },
    { to: "/tools", icon: Wrench, title: "Tools", desc: "Timer, rounds, 1RM." },
    { to: "/faq", icon: HelpCircle, title: "FAQ", desc: "Common questions." },
    { to: "/contact", icon: Mail, title: "Contact", desc: "Talk to us." },
  ] as const;

  const MY_APP = [
    { to: "/coach", icon: Sparkles, title: "Smarty Coach", desc: "Create your workout." },
    { to: "/logbook", icon: BookOpen, title: "Logbook", desc: "History and schedule." },
    { to: "/progress", icon: ClipboardList, title: "Progress", desc: "Your training stats." },
    { to: "/profile", icon: Info, title: "Training profile", desc: "Keep your data fresh." },
    { to: "/account", icon: User, title: "My account", desc: "Plan and settings." },
  ] as const;

  const { user, loading } = useAuth();
  const [cta, setCta] = useState<CtaState>({ kind: "loading" });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setCta({ kind: "guest" });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("generation_sessions")
        .select("id,credits_used,credits_total,created_at")
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      const active = (data ?? []).find(
        (r) => (r.credits_used ?? 0) < (r.credits_total ?? 0),
      );
      if (active) setCta({ kind: "has-active", sessionId: active.id });
      else setCta({ kind: "no-active" });
    })();
  }, [user, loading]);



  const heroCtaLabel =
    cta.kind === "has-active" ? "Open Smarty Coach" : "Create your workout";
  const heroCtaTo = "/coach";


  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12 lg:px-8 lg:py-16">
      <PageHeader
        title={
          <>
            Your personal workout
            <br />
            <span className="text-primary">anytime, anywhere.</span>
          </>
        }
        subtitle="Answer a smart questionnaire. Get a full tailor-made workout built around your body, goals, equipment and constraints."
      />

      <div className="mx-auto flex max-w-sm flex-col gap-2.5 sm:max-w-md sm:flex-row sm:justify-center">
        <Link
          to={heroCtaTo}
          className="flex h-12 min-h-12 shrink-0 items-center justify-center truncate whitespace-nowrap rounded-2xl bg-primary px-4 text-[15px] font-extrabold leading-none text-primary-foreground transition hover:opacity-95 sm:flex-1"
        >
          {heroCtaLabel}
        </Link>
        <Link
          to="/pricing"
          className="flex h-12 min-h-12 shrink-0 items-center justify-center truncate whitespace-nowrap rounded-2xl border-2 border-primary px-4 text-[15px] font-extrabold leading-none text-primary transition hover:bg-primary/10 sm:flex-1"
        >
          See pricing
        </Link>
      </div>

      {user && (
        <div className="mt-10">
          <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-primary">
            My app
          </h2>
          <div className="mx-auto grid max-w-xl grid-cols-3 gap-3 sm:max-w-3xl sm:grid-cols-4 lg:max-w-5xl lg:grid-cols-5 lg:gap-5">
            {MY_APP.map((d) => (
              <Link
                key={d.to}
                to={d.to}
                className="flex flex-col items-center gap-1 rounded-2xl border-2 border-blue-400 bg-card px-3 py-4 text-center transition hover:bg-blue-50 lg:py-6 dark:hover:bg-blue-500/10"
              >
                <d.icon className="h-5 w-5 text-primary lg:h-6 lg:w-6" />
                <p className="text-sm font-bold leading-5">{d.title}</p>
                <p className="hidden text-xs leading-5 text-muted-foreground sm:block">{d.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-primary">
          Discover
        </h2>
        <div className="mx-auto grid max-w-xl grid-cols-3 gap-3 sm:max-w-3xl sm:grid-cols-4 lg:max-w-5xl lg:gap-5">
          {DISCOVER.map((d) => (
            <Link
              key={d.to}
              to={d.to}
              className="flex flex-col items-center gap-1 rounded-2xl border-2 border-blue-400 bg-card px-3 py-4 text-center transition hover:bg-blue-50 lg:py-6 dark:hover:bg-blue-500/10"
            >
              <d.icon className="h-5 w-5 text-primary lg:h-6 lg:w-6" />
              <p className="text-sm font-bold leading-5">{d.title}</p>
              <p className="hidden text-xs leading-5 text-muted-foreground sm:block">{d.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}




