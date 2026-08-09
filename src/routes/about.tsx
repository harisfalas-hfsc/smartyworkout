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
              className="font-semibold text-primary underline underline-offset-2"
            >
              Sports Scientist Haris Falas
            </Link>
            .
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

      <div className="mt-8 flex justify-center">
        <Button asChild size="lg" className="font-extrabold uppercase">
          <Link to="/coach">Create your workout</Link>
        </Button>
      </div>
    </div>
  );
}
