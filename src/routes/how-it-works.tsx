import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { SmartyCard, SmartyRow } from "@/components/SmartyCard";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Smarty Workout works — answer, analyze, train" },
      {
        name: "description",
        content:
          "You answer. Smarty Coach thinks. You train. Four simple steps from your goal to a personalized workout.",
      },
      { property: "og:title", content: "How Smarty Workout works" },
      { property: "og:description", content: "You answer. Smarty Coach thinks. You train." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://smartyworkout.com/how-it-works" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/how-it-works" }],
  }),
  component: HowItWorks,
});

const STEPS = [
  {
    icon: "01",
    tone: "green" as const,
    title: "YOU ANSWER",
    text: "Goal • Mood • Time • Location • Equipment",
  },
  {
    icon: "02",
    tone: "purple" as const,
    title: "SMARTY COACH ANALYZES",
    text: "Profile • Fitness level • Goals • History",
  },
  {
    icon: "03",
    tone: "cyan" as const,
    title: "TRAINING PHILOSOPHY",
    text: "Sports science • Safety • Health • Performance",
  },
  {
    icon: "04",
    tone: "orange" as const,
    title: "YOUR WORKOUT",
    text: "The right exercises, built into your session.",
  },
];

function HowItWorks() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-4">
      <SmartyCard
        tone="cyan"
        eyebrow="How it works"
        eyebrowIcon="⚡"
        cornerIcon={Sparkles}
        className="p-5 sm:p-6"
      >
        <h1 className="-mt-7 text-2xl font-extrabold uppercase leading-[1.05] tracking-tight">
          How it <span className="text-sky-500 dark:text-sky-300">works</span>
        </h1>
        <p className="mt-1.5 text-sm font-bold">You answer. Smarty Coach thinks. You train.</p>

        <ol className="mt-4 space-y-1">
          {STEPS.map((s) => (
            <li key={s.icon}>
              <SmartyRow tone={s.tone} icon={s.icon} title={s.title} subtitle={s.text} />
            </li>
          ))}
        </ol>

        <p className="mt-4 text-center text-[12px] font-semibold leading-snug text-muted-foreground">
          Then you train, give feedback, and Smarty Coach makes your next workout{" "}
          <span className="text-sky-500 dark:text-sky-300">even smarter.</span>
        </p>

        <Button
          asChild
          size="lg"
          className="mt-4 w-full rounded-full text-sm font-extrabold uppercase"
        >
          <Link to="/coach">Create my workout</Link>
        </Button>
      </SmartyCard>
    </div>
  );
}
