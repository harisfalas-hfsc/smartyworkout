import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

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
      {
        property: "og:description",
        content: "You answer. Smarty Coach thinks. You train.",
      },
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
    n: "01",
    title: "YOU ANSWER",
    text: "Goal • Mood • Time • Location • Equipment",
    border: "border-emerald-400",
    tint: "text-emerald-500 dark:text-emerald-300",
  },
  {
    n: "02",
    title: "SMARTY COACH ANALYZES",
    text: "Your profile • Fitness level • Goals • History",
    border: "border-violet-400",
    tint: "text-violet-500 dark:text-violet-300",
  },
  {
    n: "03",
    title: "TRAINING PHILOSOPHY",
    text: "Sports science • Safety • Health • Performance",
    border: "border-sky-400",
    tint: "text-sky-500 dark:text-sky-300",
  },
  {
    n: "04",
    title: "YOUR WORKOUT",
    text: "The right exercises, built into your personalized session.",
    border: "border-orange-400",
    tint: "text-orange-500 dark:text-orange-300",
  },
];

function HowItWorks() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4">
      <header>
        <h1 className="text-[26px] font-extrabold uppercase leading-[1.05] tracking-tight">
          How it <span className="text-primary">works</span>
        </h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          You answer. Smarty Coach thinks. You train.
        </p>
      </header>

      <ol className="flex flex-col gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s.n}>
            <div
              className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border-2 bg-card px-3.5 py-2.5 shadow-soft ${s.border}`}
            >
              <span className={`text-lg font-extrabold tabular-nums ${s.tint}`}>{s.n}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-wide">{s.title}</p>
                <p className="text-[11px] leading-snug text-muted-foreground">{s.text}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="text-center text-[11px] leading-none text-muted-foreground">↓</div>
            )}
          </li>
        ))}
      </ol>

      <p className="text-center text-[12px] font-semibold leading-snug text-muted-foreground">
        Then you train, give feedback, and Smarty Coach makes your next workout{" "}
        <span className="text-primary">even smarter.</span>
      </p>

      <Button asChild size="lg" className="w-full rounded-full text-sm font-extrabold uppercase">
        <Link to="/coach">Create my workout</Link>
      </Button>
    </div>
  );
}
