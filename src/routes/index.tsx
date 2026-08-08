import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Info, ListChecks, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import heroTraining from "@/assets/hero-training.jpg";

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
    {
      to: "/about",
      icon: Info,
      color: "text-emerald-500",
      title: "About",
      desc: "Who we are and why.",
    },
    {
      to: "/how-it-works",
      icon: ListChecks,
      color: "text-orange-500",
      title: "How it works",
      desc: "Answer. Build. Train.",
    },
    {
      to: "/faq",
      icon: HelpCircle,
      color: "text-sky-500",
      title: "FAQ",
      desc: "Common questions.",
    },
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
    cta.kind === "has-active" ? "Open Smarty Coach" : "Start with Smarty Coach";
  const heroCtaTo = "/coach";


  return (
    <div className="flex min-h-[calc(100svh-4.5rem)] items-center justify-center px-4 py-4">
      <section
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-primary bg-card p-6 text-center shadow-soft sm:p-10"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(4,10,18,0.82), rgba(4,10,18,0.94)), url(${heroTraining})`,
          backgroundSize: "cover",
          backgroundPosition: "65% center",
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[11px]">
          Smarty Workout
        </p>

        <h1 className="mt-3 text-[27px] font-extrabold leading-[1.1] tracking-tight text-[#E8EEF7] sm:text-[42px]">
          Your personal workout,
          <br />
          <span className="text-primary">built in minutes.</span>
        </h1>

        <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-[rgba(232,238,247,0.82)] sm:mt-4 sm:text-base">
          Answer a smart questionnaire. Get a full tailor-made workout built
          around your body, goals, equipment and constraints.
        </p>

        <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2.5 sm:max-w-md sm:flex-row sm:justify-center">
          <Link
            to={heroCtaTo}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-primary px-6 text-[15px] font-extrabold text-primary-foreground hover:opacity-95"
          >
            {heroCtaLabel}
          </Link>
          <Link
            to="/pricing"
            className="flex h-12 flex-1 items-center justify-center rounded-full border-2 border-primary px-6 text-[15px] font-extrabold text-primary hover:bg-primary/10"
          >
            See pricing
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {DISCOVER.map((d) => (
            <Link
              key={d.to}
              to={d.to}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-primary/30 bg-[rgba(4,10,18,0.45)] px-2 py-3 text-center transition hover:border-primary hover:bg-primary/10 sm:py-4"
            >
              <d.icon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
              <span className="text-[11px] font-bold leading-tight text-[#E8EEF7] sm:text-xs">
                {d.title}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}


