import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { SmartyCard, SmartyRow } from "@/components/SmartyCard";
import {
  Brain,
  Compass,
  Clock,
  Sparkles,
  SlidersHorizontal,
  FlaskConical,
  RefreshCw,
  LineChart,
  PlayCircle,
  ClipboardCheck,
  NotebookPen,
  TrendingUp,
  Activity,
  Trophy,
  WifiOff,
  BookOpen,
} from "lucide-react";


export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Smarty Workout — Your Fitness Coach" },
      {
        name: "description",
        content:
          "Smarty Workout is not another workout app. Smarty Coach is a fitness coach built on the sports science of Haris Falas (BSc Sport Science, NSCA CSCS): strength, hypertrophy, conditioning and mobility programming with periodization and progressive overload.",
      },
      { property: "og:title", content: "About Smarty Workout — Your Fitness Coach" },
      {
        property: "og:description",
        content:
          "A smart, personalized, science-informed, adaptive fitness coach built on the training philosophy of sports scientist Haris Falas.",
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
              name: "About Smarty Workout — Your Fitness Coach",
              description:
                "Smarty Workout is not another workout app. Smarty Coach is a fitness coach built around the sports science of Haris Falas.",
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
            <span className="text-primary">Precision</span>
          </>
        }
        subtitle={
          <>
            An intelligent fitness coach trained around the sports science and training philosophy
            of{" "}
            <Link
              to="/haris-falas"
              className="whitespace-nowrap font-semibold text-primary underline underline-offset-2"
            >
              Sports Scientist Haris Falas
            </Link>
            .
          </>
        }
      />

      {/* What / How / When — the core story */}
      <div className="mx-auto grid max-w-xl gap-4 lg:max-w-6xl lg:grid-cols-3 lg:gap-5">
        <SmartyCard
          tone="blue"
          eyebrow="What"
          eyebrowIcon={Brain}
          title={
            <>
              A fitness coach built on{" "}
              <span className="text-primary">real science</span>
            </>
          }
          description={
            <>
              Smarty Workout is a fitness coach built on real Strength & Conditioning science. Every
              session is structured around{" "}
              <span className="font-semibold text-foreground">proven training principles</span> — not
              a lucky shuffle of exercises. That is the difference between a generic generator and a
              coach that thinks like a{" "}
              <span className="font-semibold text-foreground">sports scientist</span>.
            </>
          }
          className="lg:min-h-[420px]"
        />

        <SmartyCard
          tone="blue"
          eyebrow="How"
          eyebrowIcon={Compass}
          title={
            <>
              Adapts to your{" "}
              <span className="text-primary">mood, energy & gear</span>
            </>
          }
          description={
            <>
              Start from your Training Profile, then tell Smarty Coach how you feel today, how much
              time you have, and what equipment is around. It{" "}
              <span className="font-semibold text-foreground">recalculates</span> sets, reps, rest,
              and exercise selection in seconds — whether you are in a{" "}
              <span className="font-semibold text-foreground">gym, hotel, living room, or outdoors</span>
              .
            </>
          }
          className="lg:min-h-[420px]"
        />

        <SmartyCard
          tone="blue"
          eyebrow="When"
          eyebrowIcon={Clock}
          title={
            <>
              Anywhere life takes{" "}
              <span className="text-primary">you</span>
            </>
          }
          description={
            <>
              Early morning, lunch break, late night, abroad, at the office, or on the road. Whenever
              you need a session that fits your circumstances, Smarty Coach builds one that respects
              your <span className="font-semibold text-foreground">body, schedule, and space</span>.
            </>
          }
          className="lg:min-h-[420px]"
        />
      </div>

      {/* Four pillars in one card */}
      <SmartyCard
        tone="blue"
        eyebrow="Built to be"
        eyebrowIcon={Sparkles}
        title={
          <>
            Smart, Personal, Scientific,{" "}
            <span className="text-primary">Adaptive</span>
          </>
        }
        className="mx-auto mt-4 max-w-xl lg:max-w-6xl"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SmartyRow
            icon={Brain}
            title="Smart"
            subtitle="Knows you and your history."
            tone="blue"
          />
          <SmartyRow
            icon={SlidersHorizontal}
            title="Personalized"
            subtitle="Mood, time, gear, level."
            tone="blue"
          />
          <SmartyRow
            icon={FlaskConical}
            title="Science-informed"
            subtitle="Safe, proven programming."
            tone="blue"
          />
          <SmartyRow
            icon={RefreshCw}
            title="Adaptive"
            subtitle="Learns from your feedback."
            tone="blue"
          />
        </div>
      </SmartyCard>

      <p className="mt-6 text-center text-sm font-bold leading-snug sm:text-base">
        You don&apos;t choose a workout.
        <br />
        <span className="text-primary">Smarty Coach creates the workout you need today.</span>
      </p>

      <h2 className="mt-10 text-center text-xl font-extrabold uppercase sm:text-2xl">
        Three ways to <span className="text-primary">benefit</span>
      </h2>

      <div className="mx-auto mt-4 grid max-w-xl gap-4 lg:max-w-6xl lg:grid-cols-3">
        <div className="flex flex-col rounded-2xl border-2 border-blue-400 bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Create your workout
          </p>
          <p className="mt-2 text-base font-extrabold uppercase">On demand, whenever you want</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Answer a short questionnaire — goal, mood, time, place, equipment — and Smarty Coach
            builds a complete one-off session around your Training Profile and your history. Ideal
            when your day, your energy or your available gear changes.
          </p>
          <Button asChild className="mt-auto w-full font-extrabold uppercase">
            <Link to="/coach">Create your workout</Link>
          </Button>
        </div>

        <div className="flex flex-col rounded-2xl border-2 border-blue-400 bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Workout of the Day
          </p>
          <p className="mt-2 text-base font-extrabold uppercase">Planned for you, every day</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Turn it on once and receive two ready workouts every day — one with equipment, one
            bodyweight only — adapted to your profile and sequenced by a scientific periodization
            plan, so you never overtrain, never undertrain and develop every fitness quality in the
            right order. It is like having a personal trainer who already knows what you must do
            today, next week and next month.
          </p>
          <Button asChild className="mt-auto w-full font-extrabold uppercase">
            <Link to="/wod">Follow Workout of the Day</Link>
          </Button>
        </div>

        <div className="flex flex-col rounded-2xl border-2 border-blue-400 bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Smarty Community
          </p>
          <p className="mt-2 text-base font-extrabold uppercase">Train with the community</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Open a workout shared by another member, train it exactly as it was generated, mark it
            completed, like it and leave a short comment. Climb the member and workout rankings and
            see who is training, what they are training and what the community says about it.
          </p>
          <Button asChild className="mt-auto w-full font-extrabold uppercase">
            <Link to="/community">Open Smarty Community</Link>
          </Button>
        </div>
      </div>

      <SmartyCard
        tone="blue"
        eyebrow="After the workout"
        eyebrowIcon={LineChart}
        title={
          <>
            Your training is{" "}
            <span className="text-primary">tracked, measured & remembered</span>
          </>
        }
        description="Smarty Workout does not stop when the session ends. What you actually did, how it felt, and how it compares with last time all feed back into your next workout."
        className="mx-auto mt-6 max-w-xl lg:max-w-6xl"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SmartyRow
            icon={PlayCircle}
            title="Guided player"
            subtitle="Timers, rest, swipe — and logs your reps, weight, time and rounds set by set."
            tone="blue"
          />
          <SmartyRow
            icon={ClipboardCheck}
            title="One session debrief"
            subtitle="RPE, how you felt, enjoyment and notes — asked once, editable any time."
            tone="blue"
          />
          <SmartyRow
            icon={NotebookPen}
            title="Logbook & calendar"
            subtitle="Every workout saved, scheduled, favourited or repeated, with equipment badges."
            tone="blue"
          />
          <SmartyRow
            icon={TrendingUp}
            title="Progress & comparison"
            subtitle="Repeat a workout and each attempt is compared like-for-like — 20 reps then 24 is progress, and it is shown."
            tone="blue"
          />
          <SmartyRow
            icon={Activity}
            title="Training load"
            subtitle="Your recent workload against your own 21-day baseline, adjusted by your RPE."
            tone="blue"
          />
          <SmartyRow
            icon={Trophy}
            title="Achievements & reminders"
            subtitle="Milestones unlock as you train, and notifications keep scheduled sessions on track."
            tone="blue"
          />
          <SmartyRow
            icon={WifiOff}
            title="Offline mode"
            subtitle="Workouts, logbook and player keep working with no signal — everything syncs later."
            tone="blue"
          />
          <SmartyRow
            icon={BookOpen}
            title="Exercise library"
            subtitle="1,384 movements with GIFs, plus your own likes and dislikes fed to Smarty Coach."
            tone="blue"
          />
        </div>
      </SmartyCard>

    </div>

  );
}
