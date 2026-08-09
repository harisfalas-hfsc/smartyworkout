import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";

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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "HowTo",
              name: "How to get a personalized workout with SmartyWorkout",
              description:
                "Four steps from your goal to a complete personalized workout built by Smarty Coach.",
              totalTime: "PT2M",
              step: [
                {
                  "@type": "HowToStep",
                  position: 1,
                  name: "You answer",
                  text: "Set your goal, mood, available time, training location and equipment.",
                },
                {
                  "@type": "HowToStep",
                  position: 2,
                  name: "Smarty Coach analyses",
                  text: "Your training profile and today's answers are merged and matched against the exercise library.",
                },
                {
                  "@type": "HowToStep",
                  position: 3,
                  name: "Your workout is built",
                  text: "A full session with warm-up, activation, main work, finisher and cool-down, including sets, reps, tempo and rest.",
                },
                {
                  "@type": "HowToStep",
                  position: 4,
                  name: "You train and log it",
                  text: "Follow the guided player, then log the session so the next workout adapts to your feedback.",
                },
              ],
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: "https://smartyworkout.com/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "How it works",
                  item: "https://smartyworkout.com/how-it-works",
                },
              ],
            },
          ],
        }),
      },
    ],
  }),

  component: HowItWorks,
});

const STEPS = [
  {
    n: "01",
    title: "You answer",
    desc: "Goal • Mood • Time • Location • Equipment",
  },
  {
    n: "02",
    title: "Smarty Coach analyzes",
    desc: "Profile • Fitness level • Goals • History",
  },
  {
    n: "03",
    title: "Training philosophy",
    desc: "Sports science • Safety • Health • Performance",
  },
  {
    n: "04",
    title: "Your workout",
    desc: "The right exercises, built into your session.",
  },
];

function HowItWorks() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <PageHeader
        eyebrow="How it works"
        title={
          <>
            Simple &amp; <span className="text-primary">transparent</span>
          </>
        }
        subtitle="You answer. Smarty Coach thinks. You train. No fluff. Just four steps."
      />

      <div className="grid gap-6 sm:grid-cols-4 sm:gap-4">
        {STEPS.map((s) => (
          <div key={s.n} className="flex flex-col items-center text-center">
            <div className="text-4xl font-black leading-none text-primary sm:text-5xl">
              {s.n}
            </div>
            <div className="mt-3 text-base font-bold uppercase">{s.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.desc}</div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-sm font-semibold leading-snug text-muted-foreground">
        Then you train, give feedback, and Smarty Coach uses your history to make your next
        workout <span className="text-primary">even smarter.</span>
      </p>

      <div className="mt-8 flex justify-center">
        <Button asChild size="lg" className="font-extrabold uppercase">
          <Link to="/coach">Create my workout</Link>
        </Button>
      </div>
    </div>
  );
}
