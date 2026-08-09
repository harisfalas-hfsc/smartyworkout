import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import harisPhoto from "@/assets/haris-falas-coach.png";
import { PageHeader } from "@/components/PageHeader";

const URL = "https://smartyworkout.com/founder-note";
const TITLE = "A Note From The Founder | Smarty Workout";
const DESCRIPTION =
  "Why Smarty Workout exists, how the AI coach builds every workout from a real 1,384-movement library, and why €9.99 a month is worth it.";

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

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">{children}</p>;
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-3 text-sm leading-7 text-muted-foreground sm:text-base">
          <span className="mt-1 shrink-0 text-primary">•</span>
          <span className="min-w-0">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function FounderNotePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12 lg:max-w-4xl lg:px-8 lg:py-16">
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

      <P>
        Let me tell you what I built and why I believe it&apos;s worth your €9.99.
      </P>
      <P>
        Smarty Workout is an AI fitness coach that builds every workout specifically for you, using
        only a real exercise library of 1,384 movements with GIFs. It is not a chatbot that invents
        exercises from the internet. It does not give you a generic “Monday chest, Tuesday legs”
        template. It asks you who you are, what you have, how much time you have, and what your body
        needs, then creates a workout you can actually do today.
      </P>

      <H>What makes it different from the usual workout generators?</H>
      <List
        items={[
          "It learns from your profile. Age, biometrics, fitness level, goal, equipment, environment, injuries, time budget, and a short health questionnaire. Change your profile and the next workout changes immediately.",
          "It uses two pools of information. Your saved Training Profile plus what you tell it right before generating a workout (mood, focus, duration, equipment). Most apps use one or the other; we combine both.",
          "The exercises are real. Every movement comes from our own exercise library. The AI is constrained to pick from that library, so it will not invent a “Smith machine Bulgarian split squat” if you only have dumbbells and a kettlebell.",
          "Three clear levels. Beginner, Intermediate, Advanced. Internally we have six stars, but we present them as three bands so you are not confused.",
          "Safety is built in. The PAR-Q questionnaire is mandatory. If you answer YES to a health question, you see a red warning box and must consent before training.",
        ]}
      />

      <H>The Workout of the Day is the real innovation</H>
      <P>
        Every subscriber gets a fixed 84-day periodization calendar. All subscribers see the same
        category, focus, and difficulty for the day — but the actual workout is generated from your
        profile and equipment. You get two versions each day: one bodyweight, one using your
        equipment. On recovery days, you get a single session. It is not the same workout for
        everyone, but it is the same programme. That means you can train with your friends, compare
        the day, and still each get a personal workout.
      </P>
      <P>
        This is different from a standard generator where you open the app and ask “make me a chest
        workout.” That is random. The Workout of the Day is a structured system: strength, cardio,
        metabolic, challenge, and recovery days are balanced over time. It removes the decision
        fatigue. You wake up, open the app, and train.
      </P>

      <H>Why €9.99 a month is worth it</H>
      <P>Think of what you are paying for:</P>
      <List
        items={[
          "A personal trainer normally costs €30–€100 per session.",
          "A generic fitness app gives you cookie-cutter plans.",
          "Smarty Workout gives you a daily personal programme plus unlimited manual generation.",
        ]}
      />
      <P>For less than one coffee per week, you get:</P>
      <List
        items={[
          "Two daily workouts built for your profile (bodyweight + equipment).",
          "Up to two manual workouts per day from Smarty Coach.",
          "A logbook with a calendar, history, and progress tracking.",
          "A complete exercise library with demonstrations.",
          "Tools like the Workout Timer, Rounds Tracker, and 1RM Calculator.",
          "Motivational morning messages at your chosen time.",
        ]}
      />

      <H>How does it work?</H>
      <List
        items={[
          "Sign up and create your Training Profile. This is mandatory and takes a few minutes. It is not a gimmick; it is the data the AI needs to avoid giving you something useless.",
          "Choose a path. You can either follow the Workout of the Day or ask Smarty Coach to generate a custom workout on demand.",
          "Generate a workout. You answer a short questionnaire about today: focus, equipment, duration, energy, maybe a note. The AI merges this with your profile, filters the exercise library, and writes a workout.",
          "Train. You get a clean Reader Mode and a Player with timers, rest periods, and swipe navigation. The app can keep your screen awake.",
          "Track. Completed workouts go to your Logbook. You can mark favorites, schedule workouts, and leave feedback. Your feedback is stored and influences future workouts.",
        ]}
      />

      <H>The Workout of the Day is the premium feature</H>
      <P>
        If you subscribe, the app automatically creates two workouts every day at midnight. You do
        not think. You do not plan. You just train. If you prefer to freestyle, you can still
        generate manual workouts with Smarty Coach, but while you are subscribed to the Workout of
        the Day, manual generation is paused because the daily programme already covers you.
      </P>

      <H>Is it easy to use?</H>
      <P>
        Yes. The app is built for mobile first. The Coach asks you questions in simple cards, one at
        a time. Buttons are large. The player is swipeable. The calendar shows scheduled, completed,
        favorites, and skipped workouts. Everything is designed to be usable while you are in gym
        clothes or on the floor.
      </P>

      <H>Why is it better than just asking ChatGPT or another generator?</H>
      <P>ChatGPT can write a workout, but it does not know:</P>
      <List
        items={[
          "which exercises you have access to,",
          "your health limits,",
          "whether your gym has a cable machine or only dumbbells,",
          "the exact progression you need,",
          "or the 84-day plan you should follow.",
        ]}
      />
      <P>
        It also cannot track your history, save your preferences, or guarantee it is not
        hallucinating an exercise. Smarty Workout does all of that.
      </P>
      <P>
        So, from my perspective as the person who built it, this is the core pitch: €9.99 per month
        for a daily personal workout that is built from a real exercise library, respects your body,
        follows a long-term plan, and removes the decision fatigue of “what should I train today?”
      </P>
      <P>
        If you want to try it, start with the free parts. Create a profile, browse the exercise
        library, play with the tools. When you are ready, subscribe to the Workout of the Day. That
        is the moment the app becomes a real coach in your pocket.
      </P>

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
