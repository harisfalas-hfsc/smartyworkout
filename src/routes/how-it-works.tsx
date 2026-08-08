import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { SmartyCard } from "@/components/SmartyCard";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How SmartyWorkout works — from questionnaire to your Smarty Workout Plan™" },
      {
        name: "description",
        content:
          "Three simple steps: answer, pay once, get your personalized Smarty Workout Plan™.",
      },
      { property: "og:title", content: "How SmartyWorkout works" },
      {
        property: "og:description",
        content: "Three simple steps to your personalized Smarty Workout Plan™.",
      },
      { property: "og:url", content: "https://smartyworkout.com/how-it-works" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/how-it-works" }],
  }),
  component: HowItWorks,
});

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
    title: "Pay once",
    desc: "€9.99. No subscription.",
  },
  {
    n: 3,
    color: "text-sky-500",
    title: "Get your plan",
    desc: "Meals, macros & equipment list.",
  },
];

function HowItWorks() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          How it works
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Three steps to your <span className="text-primary">Smarty Workout Plan™</span>
        </h1>
      </div>

      <SmartyCard
        tone="green"
        eyebrow="Simple & Transparent"
        eyebrowIcon="✨"
        cornerIcon={Sparkles}
        title="From questionnaire"
        accent="to plan."
        description="No fluff. Just three steps."
      >
        <div className="mt-2 grid gap-6 sm:grid-cols-3 sm:gap-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex flex-col items-center text-center"
            >
              <div className={`text-5xl font-black leading-none ${s.color}`}>
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
      </SmartyCard>

      <div className="mt-8 flex justify-center">
        <Button asChild size="lg">
          <Link to="/questionnaire">Start my plan — €9.99</Link>
        </Button>
      </div>
    </div>
  );
}
