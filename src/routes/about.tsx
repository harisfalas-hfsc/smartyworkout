import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Smarty Workout — Your AI Fitness Coach" },
      {
        name: "description",
        content:
          "Smarty Workout is not another workout app. Smarty Coach is an AI fitness coach built around the sports science of Haris Falas.",
      },
      { property: "og:title", content: "About Smarty Workout — Your AI Fitness Coach" },
      {
        property: "og:description",
        content: "An intelligent AI fitness coach. Smart, personalized, science-informed, adaptive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://smartyworkout.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/about" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "AboutPage",
              url: "https://smartyworkout.com/about",
              name: "About Smarty Workout — Your AI Fitness Coach",
              description:
                "Smarty Workout is not another workout app. Smarty Coach is an AI fitness coach built around the sports science of Haris Falas.",
              inLanguage: "en",
              isPartOf: { "@id": "https://smartyworkout.com/#website" },
              mainEntity: { "@id": "https://smartyworkout.com/#organization" },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
                { "@type": "ListItem", position: 2, name: "About", item: "https://smartyworkout.com/about" },
              ],
            },
          ],
        }),
      },
    ],
  }),

  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <PageHeader
        eyebrow="About"
        title={
          <>
            Coaching expertise
            <br />
            <span className="text-primary">AI precision</span>
          </>
        }
        subtitle={
          <>
            An intelligent AI fitness coach trained around the sports science and training
            philosophy of{" "}
            <Link
              to="/haris-falas"
              className="whitespace-nowrap font-semibold text-primary underline underline-offset-2"
            >
              Sports Scientist Haris Falas
            </Link>
          </>
        }
      />

      <div className="mx-auto grid max-w-xl gap-3 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-4 lg:gap-5">
        {[
          { icon: "🧠", title: "SMART", subtitle: "Knows you and your history." },
          { icon: "🎯", title: "PERSONALIZED", subtitle: "Mood, time, gear, level." },
          { icon: "🔬", title: "SCIENCE-INFORMED", subtitle: "Safe, proven programming." },
          { icon: "🔄", title: "ADAPTIVE", subtitle: "Learns from your feedback." },
        ].map((f) => (
          <div
            key={f.title}
            className="flex flex-col items-center gap-1 rounded-2xl border-2 border-blue-400 bg-card px-3 py-4 text-center"
          >
            <span className="text-lg leading-none">{f.icon}</span>
            <p className="text-sm font-bold leading-5">{f.title}</p>
            <p className="text-xs leading-5 text-muted-foreground">{f.subtitle}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-sm font-bold leading-snug sm:text-base">
        You don&apos;t choose a workout.
        <br />
        <span className="text-primary">Smarty Coach creates the workout you need today.</span>
      </p>

      <h2 className="mt-10 text-center text-xl font-extrabold uppercase sm:text-2xl">
        Two ways to <span className="text-primary">benefit</span>
      </h2>

      <div className="mx-auto mt-4 grid max-w-xl gap-4 lg:max-w-5xl lg:grid-cols-2">
        <div className="rounded-2xl border-2 border-blue-400 bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Create your workout
          </p>
          <p className="mt-2 text-base font-extrabold uppercase">On demand, whenever you want</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Answer a short questionnaire — goal, mood, time, place, equipment — and Smarty Coach
            builds a complete one-off session around your Training Profile and your history. Ideal
            when your day, your energy or your available gear changes.
          </p>
          <Button asChild className="mt-4 w-full font-extrabold uppercase">
            <Link to="/coach">Create your workout</Link>
          </Button>
        </div>

        <div className="rounded-2xl border-2 border-blue-400 bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Workout of the Day
          </p>
          <p className="mt-2 text-base font-extrabold uppercase">Planned for you, every day</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Subscribe once and receive two ready workouts every day — one with equipment, one
            bodyweight only — adapted to your profile and sequenced by a scientific periodization
            plan, so you never overtrain, never undertrain and develop every fitness quality in the
            right order. It is like having a personal trainer who already knows what you must do
            today, next week and next month.
          </p>
          <Button asChild className="mt-4 w-full font-extrabold uppercase">
            <Link to="/wod">Follow Workout of the Day</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
