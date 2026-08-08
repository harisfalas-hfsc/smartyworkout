import { createFileRoute, Link } from "@tanstack/react-router";
import { Timer, Repeat, Dumbbell, type LucideIcon } from "lucide-react";
import timerCard from "@/assets/tools/timer-card.jpg";
import roundsCard from "@/assets/tools/rounds-card.jpg";
import oneRmCard from "@/assets/tools/1rm-card.jpg";

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: "SmartyWorkout Tools — Workout timer, rounds tracker, 1RM calculator" },
      {
        name: "description",
        content:
          "Free SmartyWorkout training tools: interval workout timer, big-button rounds tracker and Brzycki 1RM calculator.",
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

type Tool = {
  id: string;
  title: string;
  description: string;
  to: string;
  image: string;
  icon: LucideIcon;
};

const TOOLS: Tool[] = [
  {
    id: "workout-timer",
    title: "Workout Timer",
    description: "Customizable interval timer for HIIT, Tabata and circuit training sessions.",
    to: "/tools/workout-timer",
    image: timerCard,
    icon: Timer,
  },
  {
    id: "rounds-tracker",
    title: "Rounds Tracker",
    description: "Big-button counter — tap to track rounds and optional reps during your workout.",
    to: "/tools/rounds-tracker",
    image: roundsCard,
    icon: Repeat,
  },
  {
    id: "1rm-calculator",
    title: "1RM Calculator",
    description: "Estimate your one-rep maximum and get your training percentages instantly.",
    to: "/tools/1rm-calculator",
    image: oneRmCard,
    icon: Dumbbell,
  },
];

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <Link
      to={tool.to as never}
      className="group relative block h-56 overflow-hidden rounded-2xl border-2 border-primary/30 transition-all duration-300 hover:border-primary hover:shadow-xl sm:h-64"
    >
      <img
        src={tool.image}
        alt={tool.title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
      <div className="relative flex h-full flex-col justify-end p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold leading-tight sm:text-xl">{tool.title}</h2>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/40 bg-card text-primary shadow-sm transition-transform duration-300 group-hover:scale-110">
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <p className="text-sm leading-snug text-muted-foreground">{tool.description}</p>
      </div>
    </Link>
  );
}

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
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Simple training tools you can use straight from your phone, mid-session.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
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
