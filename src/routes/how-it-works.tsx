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

const WOD_STEPS = [
  {
    n: "01",
    title: "You subscribe",
    desc: "Training Profile • One tap",
  },
  {
    n: "02",
    title: "The cycle decides",
    desc: "Periodized calendar • Same day for everyone",
  },
  {
    n: "03",
    title: "Two workouts are built",
    desc: "One with equipment • One bodyweight only",
  },
  {
    n: "04",
    title: "You just train",
    desc: "Open, follow, log. Every single day.",
  },
];

const COMMUNITY_STEPS = [
  {
    n: "01",
    title: "Members share",
    desc: "Any workout • Exactly as generated • Never edited",
  },
  {
    n: "02",
    title: "You browse",
    desc: "Shared workouts • Member ranking • Workout ranking • Comments",
  },
  {
    n: "03",
    title: "You train it",
    desc: "A copy lands in your logbook • Completed, not completed or scheduled",
  },
  {
    n: "04",
    title: "You react",
    desc: "Like it • Comment in 160 characters • Climb the rankings",
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
        subtitle="Three ways to train: create your own workout on demand, follow the Workout of the Day, or train a workout shared by the Smarty Community."
      />

      <section className="rounded-2xl border-2 border-blue-400 bg-card p-5 sm:p-8">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          Way 1 — Create any workout
        </p>
        <h2 className="mt-2 text-center text-xl font-extrabold uppercase sm:text-2xl">
          You answer. Smarty Coach thinks. You train.
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-6 text-muted-foreground">
          For the days you know what you want: your goal, your mood, your time, your equipment.
          Smarty Coach builds a one-off session around exactly that.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-4 sm:gap-4">
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

        <div className="mt-6 flex justify-center">
          <Button asChild size="lg" className="font-extrabold uppercase">
            <Link to="/coach">Create my workout</Link>
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border-2 border-blue-400 bg-card p-5 sm:p-8">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          Way 2 — Workout of the Day
        </p>
        <h2 className="mt-2 text-center text-xl font-extrabold uppercase sm:text-2xl">
          You subscribe once. Your training is planned.
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-6 text-muted-foreground">
          Every day you get two ready workouts — one with equipment, one bodyweight only — built
          automatically around your Training Profile. Both follow a scientific periodization plan:
          strength, endurance, power, mobility and recovery days are sequenced so you never
          overtrain, never undertrain, and every fitness quality is developed in the right order.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-4 sm:gap-4">
          {WOD_STEPS.map((s) => (
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
          Instead of improvising something different every day, it is like having a{" "}
          <span className="text-primary">personal trainer</span> who already knows what you must do
          today, next week and next month.
        </p>

        <div className="mt-6 flex justify-center">
          <Button asChild size="lg" className="font-extrabold uppercase">
            <Link to="/wod">Follow Workout of the Day</Link>
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border-2 border-blue-400 bg-card p-5 sm:p-8">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          Way 3 — Smarty Community
        </p>
        <h2 className="mt-2 text-center text-xl font-extrabold uppercase sm:text-2xl">
          Train the workouts other members share.
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-6 text-muted-foreground">
          Every shared workout opens exactly like a workout in your own logbook — same reader, same
          player. Do it, mark it completed, not completed or scheduled, like it and leave a short
          comment. Your comment appears in the community comments card for everyone to read.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-4 sm:gap-4">
          {COMMUNITY_STEPS.map((s) => (
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
          Training alone is hard. Training with{" "}
          <span className="text-primary">other Smarty members</span> keeps you accountable.
        </p>

        <div className="mt-6 flex justify-center">
          <Button asChild size="lg" className="font-extrabold uppercase">
            <Link to="/community">Open Smarty Community</Link>
          </Button>
        </div>
      </section>

    </div>
  );
}
