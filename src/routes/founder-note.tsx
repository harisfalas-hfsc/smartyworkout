import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import harisPhoto from "@/assets/haris-falas-coach.png";
import { PageHeader } from "@/components/PageHeader";
import {
  User,
  Dumbbell,
  Calendar,
  TrendingUp,
  Bot,
  CheckCircle2,
  Sparkles,
  Target,
  ShieldCheck,
  BookOpen,
  Zap,
  Coins,
} from "lucide-react";

const URL = "https://smartyworkout.com/founder-note";
const TITLE = "A Note From The Founder | Smarty Workout";
const DESCRIPTION =
  "Why Smarty Workout exists, how the trained AI coach builds every workout from a real 1,384-movement library, and why €9.99 a month is worth it.";

export const Route = createFileRoute("/founder-note")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: FounderNotePage,
});

function Brand({ children }: { children: React.ReactNode }) {
  return <span className="font-extrabold text-primary">{children}</span>;
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 text-lg font-extrabold uppercase tracking-tight text-foreground sm:text-xl">
      {children}
    </h2>
  );
}

function P({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={
        "mt-4 text-sm leading-7 text-muted-foreground sm:text-base" +
        (className ? " " + className : "")
      }
    >
      {children}
    </p>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 text-base font-semibold leading-8 text-foreground sm:text-lg">
      {children}
    </p>
  );
}

function List({
  items,
}: {
  items: { icon: React.ReactNode; text: React.ReactNode }[];
}) {
  return (
    <ul className="mt-5 space-y-4">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex items-start gap-4 rounded-lg border-2 border-blue-400 bg-card/50 p-3 text-sm leading-7 text-muted-foreground shadow-sm sm:text-base"
        >
          <span className="mt-0.5 shrink-0 rounded-md bg-primary/10 p-1.5 text-primary">
            {it.icon}
          </span>
          <span className="min-w-0">{it.text}</span>
        </li>
      ))}
    </ul>
  );
}

function FounderNotePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <div className="text-center">
        <div className="mx-auto mb-6 h-28 w-28 overflow-hidden rounded-full border-4 border-primary sm:h-36 sm:w-36">
          <img
            src={harisPhoto}
            alt="Haris Falas — founder of Smarty Workout"
            className="h-full w-full object-cover object-center"
            width={320}
            height={320}
            loading="eager"
            decoding="async"
          />
        </div>
        <PageHeader
          className="mb-0"
          eyebrow="A note from the founder"
          title={
            <>
              Haris <span className="text-primary">Falas</span>
            </>
          }
          subtitle={
            <Link
              to="/haris-falas"
              className="font-semibold text-primary underline underline-offset-2"
            >
              Read the full coach profile
            </Link>
          }
        />
      </div>

      <Lead>
        Let me tell you what I built and why I believe it is worth your €9.99.
      </Lead>

      <P>
        <Brand>Smarty Workout</Brand> is a powerful AI fitness coach — but it is
        not just another chatbot. It has been trained by me, Haris Falas, a
        sports scientist, so it thinks the way I think about programme design,
        progression, safety, and real human movement. It does not invent
        exercises from the internet. It does not hand you a generic “Monday
        chest, Tuesday back” template. It asks you who you are, what equipment
        you have, how much time you have, and what your body needs, then creates
        a workout you can actually do today — according to the principles of a
        sports scientist.
      </P>

      <H>What makes it different from ordinary workout generators?</H>
      <List
        items={[
          {
            icon: <User size={18} />,
            text: (
              <>
                It learns from <strong>your profile</strong>. Age, biometrics,
                fitness level, goal, equipment, environment, injuries, time
                budget, and a short health questionnaire. Change your profile
                and the next workout changes immediately.
              </>
            ),
          },
          {
            icon: <Sparkles size={18} />,
            text: (
              <>
                It uses <strong>two pools of information</strong>. Your saved
                Training Profile plus what you tell it right before generating a
                workout — mood, focus, duration, equipment. Most apps use one or
                the other; <Brand>Smarty Workout</Brand> merges both.
              </>
            ),
          },
          {
            icon: <BookOpen size={18} />,
            text: (
              <>
                The exercises are <strong>real</strong>. Every movement comes
                from our own curated library of 1,384 movements with GIFs. The
                AI is constrained to pick from that library, so it will not
                invent a “Smith machine Bulgarian split squat” if you only have
                dumbbells and a kettlebell.
              </>
            ),
          },
          {
            icon: <Target size={18} />,
            text: (
              <>
                <strong>Three clear levels</strong>. Beginner, Intermediate,
                Advanced. Internally we model intensity across six stars, but we
                present them as three bands so you always know exactly where you
                stand.
              </>
            ),
          },
          {
            icon: <ShieldCheck size={18} />,
            text: (
              <>
                <strong>Safety is built in</strong>. The PAR-Q questionnaire is
                mandatory. If you answer YES to a health question, you see a red
                warning box and must actively consent before training.
              </>
            ),
          },
        ]}
      />

      <H>The Workout of the Day is the real innovation</H>
      <P>
        Every subscriber follows a fixed 84-day periodization calendar. All
        subscribers see the same category, focus, and difficulty for the day —
        but the actual workout is generated from your individual profile and
        equipment. You receive two versions each day: one bodyweight, one using
        your equipment. On recovery days, you get a single session.
      </P>
      <P>
        It is not the same workout for everyone, but it is the same programme.
        That means you can train with your friends, compare the day, and still
        each get a personal workout. <Brand>Smarty Workout</Brand> removes the
        decision fatigue: you wake up, open the app, and train.
      </P>

      <H>Why €9.99 a month is worth it</H>
      <P>Think of what you are paying for:</P>
      <List
        items={[
          {
            icon: <Coins size={18} />,
            text: (
              <>
                A personal trainer normally costs €30–€100 per session. A generic
                app gives you cookie-cutter plans. <Brand>Smarty Workout</Brand>{" "}
                gives you a daily personal programme plus unlimited manual
                generation.
              </>
            ),
          },
          {
            icon: <Zap size={18} />,
            text: (
              <>
                For less than one coffee per week, you get two daily workouts
                built for your profile, up to two manual workouts per day, a
                logbook with calendar and history, a complete exercise library,
                and tools like the Workout Timer, Rounds Tracker, and 1RM
                Calculator.
              </>
            ),
          },
        ]}
      />

      <H>How does it work?</H>
      <List
        items={[
          {
            icon: <CheckCircle2 size={18} />,
            text: (
              <>
                <strong>Sign up and create your Training Profile.</strong> This
                is mandatory and takes a few minutes. It is not a gimmick; it is
                the data the trained agent needs to avoid giving you something
                useless.
              </>
            ),
          },
          {
            icon: <Calendar size={18} />,
            text: (
              <>
                <strong>Choose a path.</strong> Follow the Workout of the Day, or
                ask <Brand>Smarty Coach</Brand> to generate a custom workout on
                demand.
              </>
            ),
          },
          {
            icon: <Bot size={18} />,
            text: (
              <>
                <strong>Generate a workout.</strong> You answer a short
                questionnaire about today. The trained agent merges this with your
                profile, filters the exercise library, and writes a workout.
              </>
            ),
          },
          {
            icon: <Dumbbell size={18} />,
            text: (
              <>
                <strong>Train.</strong> You get a clean Reader Mode and a Player
                with timers, rest periods, and swipe navigation. The app can
                keep your screen awake.
              </>
            ),
          },
          {
            icon: <TrendingUp size={18} />,
            text: (
              <>
                <strong>Track.</strong> Completed workouts go to your Logbook.
                You can mark favorites, schedule workouts, and leave feedback.
                Your feedback is stored and influences future workouts.
              </>
            ),
          },
        ]}
      />

      <H>The Workout of the Day is the premium feature</H>
      <P>
        If you subscribe, the app automatically creates two workouts every day
        at midnight. You do not think. You do not plan. You just train. While you
        are subscribed to the Workout of the Day, manual generation is paused
        because the daily programme already covers you.
      </P>

      <H>Is it easy to use?</H>
      <P>
        Yes. The app is built for mobile first. The Coach asks you questions in
        simple cards, one at a time. Buttons are large. The player is swipeable.
        The calendar shows scheduled, completed, favorites, and skipped workouts.
        Everything is designed to be usable while you are in gym clothes or on
        the floor.
      </P>

      <H>Why is it better than just asking ChatGPT or another generator?</H>
      <P>
        ChatGPT can write a workout, but it does not know which exercises you
        have access to, your health limits, whether your gym has a cable machine
        or only dumbbells, the exact progression you need, or the 84-day plan
        you should follow. It also cannot track your history, save your
        preferences, or guarantee it is not hallucinating an exercise.
      </P>
      <P>
        <Brand>Smarty Workout</Brand> does all of that. It is a trained agent,
        not a chatbot.
      </P>

      <div className="mt-8 rounded-2xl border-2 border-blue-400 bg-primary/5 p-6 sm:p-8">
        <P className="mt-0">
          From my perspective as the person who built it, this is the core
          pitch: €9.99 per month for a daily personal workout that is built from
          a real exercise library, respects your body, follows a long-term plan,
          and removes the decision fatigue of “what should I train today?”
        </P>
        <P>
          If you want to try it, start with the free parts. Create a profile,
          browse the exercise library, play with the tools. When you are ready,
          subscribe to the Workout of the Day. That is the moment{" "}
          <Brand>Smarty Workout</Brand> becomes a real coach in your pocket.
        </P>
      </div>

      <div className="mt-10 text-center">
        <p className="text-sm font-semibold italic text-muted-foreground sm:text-base">
          Yours in good health,
        </p>
        <p className="mt-1 text-base font-extrabold text-foreground sm:text-lg">
          Haris Falas
        </p>
        <p className="text-sm text-muted-foreground">
          BSc Sports Science, EXO Specialist, CSCS
        </p>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Button asChild size="lg" className="font-extrabold uppercase">
          <Link to="/coach">Create your workout</Link>
        </Button>
        <Link
          to="/haris-falas"
          className="text-sm font-semibold text-primary underline underline-offset-2"
        >
          More about Haris Falas
        </Link>
      </div>
    </main>
  );
}
