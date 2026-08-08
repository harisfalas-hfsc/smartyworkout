import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import { SmartyCard, SmartyRow } from "@/components/SmartyCard";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Smarty Workout — Meet Smarty Coach" },
      {
        name: "description",
        content:
          "Smarty Workout is not another workout app. Smarty Coach is an AI fitness coach built around the sports science of Haris Falas.",
      },
      { property: "og:title", content: "About Smarty Workout — Meet Smarty Coach" },
      {
        property: "og:description",
        content: "An intelligent AI fitness coach. Smart, personalized, science-informed, adaptive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://smartyworkout.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">About</p>
        <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
          Not another <span className="text-primary">workout app.</span>
        </h1>
      </div>

      <SmartyCard
        tone="purple"
        align="center"
        eyebrow="Meet Smarty Coach"
        eyebrowIcon="🧠"
        title="Meet"
        accent="Smarty Coach."
        description={
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
      >
        <div className="mx-auto grid max-w-xl gap-3 sm:grid-cols-2">
          {[
            { icon: "🧠", title: "SMART", subtitle: "Knows you and your history." },
            { icon: "🎯", title: "PERSONALIZED", subtitle: "Mood, time, gear, level." },
            { icon: "🔬", title: "SCIENCE-INFORMED", subtitle: "Safe, proven programming." },
            { icon: "🔄", title: "ADAPTIVE", subtitle: "Learns from your feedback." },
          ].map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center gap-1 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-4 text-center dark:border-violet-500/40 dark:bg-violet-500/10"
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
      </SmartyCard>


      <div className="mt-8 flex justify-center">
        <Button asChild size="lg" className="font-extrabold uppercase">
          <Link to="/coach">Meet Smarty Coach</Link>
        </Button>
      </div>
    </div>
  );
}
