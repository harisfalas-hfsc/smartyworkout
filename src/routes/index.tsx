import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import heroTraining from "@/assets/hero-training.jpg";
import { SmartyCard } from "@/components/SmartyCard";

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

const STEPS = [
  {
    n: 1,
    color: "text-emerald-500",
    title: "Answer",
    desc: "A short questionnaire about you.",
  },
  {
    n: 2,
    color: "text-orange-500",
    title: "Build",
    desc: "We generate your tailored workout.",
  },
  {
    n: 3,
    color: "text-sky-500",
    title: "Get",
    desc: "Your tailor-made workout.",
  },
];

const INCLUDES = [
  "Your training program",
  "PDF export + printable list",
  "Saved to your account",
];


function Home() {
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

  const primary = (() => {
    if (cta.kind === "loading")
      return (
        <Button size="lg" disabled className="w-full sm:w-auto">
          Get started
        </Button>
      );
    if (cta.kind === "has-active")
      return (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to="/coach">Open Smarty Coach</Link>
        </Button>
      );

    return (
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link to="/coach">Start with Smarty Coach</Link>
      </Button>
    );
  })();


  const heroCtaLabel =
    cta.kind === "has-active" ? "Open Smarty Coach" : "Start with Smarty Coach";
  const heroCtaTo = "/coach";


  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 pb-8 pt-0 sm:pb-12">
      {/* MOBILE HERO CARD — matches SmartyMove mobile layout */}
      <section
        className="mt-4 mb-4 overflow-hidden rounded-[15px] border-[1.5px] border-sky-300/70 bg-cover bg-[68%_center] bg-no-repeat p-5 shadow-[0_12px_36px_-28px_rgba(0,0,0,0.8)] sm:hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(4,10,18,0.55), rgba(4,10,18,0.88)), url(${heroTraining})`,
        }}
      >
        <h1 className="text-[30px] font-black leading-[1.08] tracking-tight text-[#E8EEF7]">
          Your personal workout,
          <br />
          <span className="text-primary">built in minutes.</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[rgba(232,238,247,0.82)]">
          Answer a smart questionnaire. Get a full tailor-made workout built
          around your body, goals, equipment and constraints.
        </p>
        <Link
          to={heroCtaTo}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-extrabold text-primary-foreground"
        >
          {heroCtaLabel}
        </Link>
        <Link
          to="/how-it-works"
          className="mt-2.5 flex h-[46px] w-full items-center justify-center rounded-full border-2 border-primary bg-[rgba(4,10,18,0.35)] text-[15px] font-extrabold text-primary"
        >
          How it works
        </Link>

      </section>

      {/* FULL-BLEED HERO — desktop/tablet */}
      <section className="relative left-1/2 mb-8 hidden w-screen -translate-x-1/2 overflow-hidden sm:mb-14 sm:block">
        <img
          src={heroTraining}
          alt="Fresh healthy food ingredients arranged for a personalized training plan"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-[60%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/75 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-16 lg:px-6 lg:py-36">

          <div className="max-w-xl">
            <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[44px] lg:text-[60px]">
              Your personal workout,
              <br />
              <span className="text-primary">built in minutes.</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/80 lg:mt-6 lg:text-lg">
              Answer a smart questionnaire. Get a full tailor-made workout built
              around your body, goals, equipment and constraints.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to={heroCtaTo}
                className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-base font-bold text-primary-foreground hover:opacity-95"
              >
                {heroCtaLabel}
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex h-12 items-center rounded-full border-2 border-primary px-8 text-base font-bold text-primary hover:bg-primary/10"
              >
                How it works
              </Link>
            </div>

          </div>
        </div>
      </section>



      {/* Single info card */}
      <section className="mx-auto w-full max-w-4xl">
        <SmartyCard
          tone="green"
          eyebrow="How it works"
          eyebrowIcon="🥗"
          cornerIcon={Sparkles}
          title="From questionnaire"
          accent="to plan."
          description="Three steps. No payment. No subscription."
        >
          <div className="mt-2 grid gap-6 sm:grid-cols-3 sm:gap-4">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="flex flex-col items-center text-center"
              >
                <div
                  className={`text-5xl font-black leading-none ${s.color}`}
                >
                  {s.n}
                </div>
                <div className="mt-3 whitespace-nowrap text-base font-bold">
                  {s.title}
                </div>
                <div className="mt-1 whitespace-nowrap text-sm text-muted-foreground">
                  {s.desc}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-border pt-8">
            <h3 className="text-center text-lg font-bold">What&apos;s included</h3>
            <ul className="mx-auto mt-5 grid max-w-lg gap-3 sm:grid-cols-2">
              {INCLUDES.map((it) => (
                <li key={it} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 flex-none text-primary" />
                  <span className="whitespace-nowrap">{it}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 border-t border-border pt-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Always free
            </p>
            <p className="mt-2 text-5xl font-extrabold tracking-tight">
              Free
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              One personalized plan. Yours to keep.
            </p>
            <div className="mt-6 flex justify-center">{primary}</div>
            {cta.kind === "guest" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Not medical advice. Consult a professional for medical
                conditions.
              </p>
            )}
          </div>
        </SmartyCard>
      </section>
    </div>
  );
}
