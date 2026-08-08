import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

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
    title: "SMART",
    text: "Understands you, your goals and your training history.",
    border: "border-violet-400",
    tint: "text-violet-500 dark:text-violet-300",
  },
  {
    icon: "🎯",
    title: "PERSONALIZED",
    text: "Considers your mood, time, equipment, location and fitness level.",
    border: "border-orange-400",
    tint: "text-orange-500 dark:text-orange-300",
  },
  {
    icon: "🔬",
    title: "SCIENCE-INFORMED",
    text: "Built around sports science, safety, health and performance.",
    border: "border-sky-400",
    tint: "text-sky-500 dark:text-sky-300",
  },
  {
    icon: "🔄",
    title: "ADAPTIVE",
    text: "Learns from your workouts and feedback to improve future sessions.",
    border: "border-emerald-400",
    tint: "text-emerald-500 dark:text-emerald-300",
  },
];

function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
      <header>
        <h1 className="text-[26px] font-extrabold uppercase leading-[1.05] tracking-tight">
          Not another <span className="text-primary">workout app.</span>
        </h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Meet Smarty Coach.</p>
        <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
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
      </header>

      <ul className="grid grid-cols-2 gap-2.5">
        {POINTS.map((p) => (
          <li
            key={p.title}
            className={`rounded-2xl border-2 bg-card p-3 shadow-soft ${p.border}`}
          >
            <span className="text-lg leading-none">{p.icon}</span>
            <p className={`mt-1 text-[11px] font-extrabold uppercase tracking-wide ${p.tint}`}>
              {p.title}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{p.text}</p>
          </li>
        ))}
      </ul>

      <p className="text-center text-sm font-bold leading-snug">
        You don&apos;t choose a workout.
        <br />
        <span className="text-primary">Smarty Coach creates the workout you need today.</span>
      </p>

      <Button asChild size="lg" className="w-full rounded-full text-sm font-extrabold uppercase">
        <Link to="/coach">Meet Smarty Coach</Link>
      </Button>
    </div>
  );
}
