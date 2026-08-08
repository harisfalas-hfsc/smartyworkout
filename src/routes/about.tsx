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

const POINTS = [
  {
    icon: "🧠",
    tone: "purple" as const,
    title: "SMART",
    text: "Understands you, your goals and your training history.",
  },
  {
    icon: "🎯",
    tone: "orange" as const,
    title: "PERSONALIZED",
    text: "Your mood, time, equipment, location and level.",
  },
  {
    icon: "🔬",
    tone: "cyan" as const,
    title: "SCIENCE-INFORMED",
    text: "Sports science, safety, health and performance.",
  },
  {
    icon: "🔄",
    tone: "green" as const,
    title: "ADAPTIVE",
    text: "Learns from your workouts and feedback.",
  },
];

function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-4">
      <SmartyCard
        tone="purple"
        eyebrow="About"
        eyebrowIcon="💪"
        cornerIcon={Brain}
        className="p-5 sm:p-6"
      >
        <h1 className="-mt-7 text-2xl font-extrabold uppercase leading-[1.05] tracking-tight">
          Not another <span className="text-violet-500 dark:text-violet-300">workout app.</span>
        </h1>
        <p className="mt-1.5 text-sm font-bold">Meet Smarty Coach.</p>
        <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
          An intelligent AI fitness coach trained around the sports science and training philosophy
          of{" "}
          <a
            href="https://smartygym.com/coach"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline underline-offset-2"
          >
            Sports Scientist Haris Falas
          </a>
          .
        </p>

        <div className="mt-4 space-y-1">
          {POINTS.map((p) => (
            <SmartyRow
              key={p.title}
              tone={p.tone}
              icon={p.icon}
              title={p.title}
              subtitle={p.text}
            />
          ))}
        </div>

        <p className="mt-4 text-center text-[13px] font-bold leading-snug">
          You don&apos;t choose a workout.
          <br />
          <span className="text-violet-500 dark:text-violet-300">
            Smarty Coach creates the workout you need today.
          </span>
        </p>

        <Button
          asChild
          size="lg"
          className="mt-4 w-full rounded-full text-sm font-extrabold uppercase"
        >
          <Link to="/coach">Meet Smarty Coach</Link>
        </Button>
      </SmartyCard>
    </div>
  );
}
