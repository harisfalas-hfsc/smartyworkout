import { createFileRoute, Link } from "@tanstack/react-router";
import { Timer, Repeat, Dumbbell } from "lucide-react";
import { SmartyCard, SmartyRow } from "@/components/SmartyCard";

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: "SmartyWorkout Tools — Workout timer, rounds tracker, 1RM calculator" },
      {
        name: "description",
        content:
          "Free SmartyWorkout training tools: interval workout timer, big-button rounds tracker and Brzycki 1RM calculator. Part of the AI Training Intelligence Platform.",
      },
      { property: "og:title", content: "SmartyWorkout Tools — Free training tools" },
      {
        property: "og:description",
        content: "Workout timer, rounds tracker and 1RM calculator — free tools by SmartyWorkout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://smartyworkout.com/tools" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/tools" }],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          SmartyWorkout Tools
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Free <span className="text-primary">training tools</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Simple training tools you can use straight from your phone, mid-session.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <SmartyCard
          tone="orange"
          eyebrow="Intervals"
          eyebrowIcon="⏱️"
          cornerIcon={Timer}
          title="Workout"
          accent="Timer"
          description="Customizable work/rest intervals and rounds for HIIT, Tabata and circuit training."
          ctaLabel="Open workout timer"
          ctaTo="/tools/workout-timer"
        >
          <div className="hidden space-y-3 md:block">
            <SmartyRow tone="orange" icon="🔔" title="Audio cues" subtitle="Beep on every work/rest switch." />
            <SmartyRow tone="orange" icon="🔒" title="Fullscreen lock" subtitle="Big display, screen stays awake." />
          </div>
        </SmartyCard>

        <SmartyCard
          tone="purple"
          eyebrow="Counting"
          eyebrowIcon="🔁"
          cornerIcon={Repeat}
          title="Rounds"
          accent="Tracker"
          description="Big-button rounds and reps counter for AMRAP, EMOM and circuit sessions."
          ctaLabel="Open rounds tracker"
          ctaTo="/tools/rounds-tracker"
        >
          <div className="hidden space-y-3 md:block">
            <SmartyRow tone="purple" icon="👆" title="Tap anywhere" subtitle="Count rounds or rounds + reps." />
            <SmartyRow tone="purple" icon="📳" title="Sound & haptics" subtitle="Feedback without looking down." />
          </div>
        </SmartyCard>

        <SmartyCard
          tone="green"
          eyebrow="Strength"
          eyebrowIcon="🏋️"
          cornerIcon={Dumbbell}
          title="1RM"
          accent="Calculator"
          description="Estimate your one-rep maximum with the Brzycki formula and get training percentages."
          ctaLabel="Open 1RM calculator"
          ctaTo="/tools/1rm-calculator"
        >
          <div className="hidden space-y-3 md:block">
            <SmartyRow tone="green" icon="🧮" title="Brzycki formula" subtitle="The standard 1RM estimate." />
            <SmartyRow tone="green" icon="📊" title="Training percentages" subtitle="60–95% of your max, instantly." />
          </div>
        </SmartyCard>
      </div>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        Want a session built around your goal?{" "}
        <Link to="/coach" className="font-semibold text-primary">
          Ask Smarty Coach →
        </Link>
      </div>
    </div>
  );
}
