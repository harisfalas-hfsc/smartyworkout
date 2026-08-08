import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Compass, BookOpen, Brain } from "lucide-react";


import { cn } from "@/lib/utils";
import {
  SmartyCard,
  SmartyPill,
  SmartyRow,
  toneClasses,
} from "@/components/SmartyCard";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About SmartyWorkout — The AI Training Intelligence Platform" },
      {
        name: "description",
        content:
          "SmartyWorkout is the AI Training Intelligence Platform — a pocket coach and diet coach that builds personalized plans based on established sports-science methods.",
      },
      { property: "og:title", content: "About SmartyWorkout — AI Training Intelligence Platform" },
      {
        property: "og:description",
        content:
          "The AI Training Intelligence Platform: pocket coach, training consultant and diet coach, powered by science.",
      },
      { property: "og:url", content: "https://smartyworkout.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const t = toneClasses("purple");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">About us</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          The <span className="text-primary">AI Training Intelligence</span> Platform
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          SmartyWorkout combines personalized workout planning with free tools so anyone can eat
          with intention — no subscription, no guesswork.
        </p>
      </div>

      <SmartyCard
        tone="purple"
        eyebrow="Our mission"
        eyebrowIcon="🌱"
        cornerIcon={Compass}
        title="Training made"
        accent="personal."
        description="We package the assessment, calculation and planning work of a coach into an always-available AI — accessible for one €9.99 payment."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={cn("rounded-2xl border p-4", t.softBorder, t.softBg)}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              Mission
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <SmartyPill tone="purple" icon="🎯">Personalized to your body</SmartyPill>
              <SmartyPill tone="purple" icon="🧪">Evidence-based methods</SmartyPill>
              <SmartyPill tone="purple" icon="🔎">Transparent numbers</SmartyPill>
              <SmartyPill tone="purple" icon="🚫">No subscription trap</SmartyPill>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
                <span className="text-base">✨</span>
                Smarty family
              </h3>
              <div className="space-y-3">
                <SmartyRow tone="purple" icon="🏋️" title="SmartyGym" subtitle="Your smart training partner." />
                <SmartyRow tone="purple" icon="🤸" title="SmartyMove" subtitle="Your pocket movement coach." />
              </div>
            </div>
          </div>

          <div className={cn("rounded-2xl border p-4", t.softBorder, t.softBg)}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              Approach
            </h3>
            <div className="space-y-3">
              <SmartyRow tone="purple" icon="📋" title="Smart questionnaire" subtitle="Body, activity, goal, food & allergies." />
              <SmartyRow tone="purple" icon="⚙️" title="Mifflin-St Jeor engine" subtitle="Standard BMR + TDEE multipliers." />
              <SmartyRow tone="purple" icon="🍽️" title="Full personalized plan" subtitle="Meals, macros, portions, equipment list." />
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
                <span className="text-base">🎯</span>
                Principles
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <SmartyRow tone="purple" icon="🎯" title="Personalization first" subtitle="Plans built around your body and preferences." />
                <SmartyRow tone="purple" icon="🧪" title="Evidence-based" subtitle="Methods used by coachs." />
                <SmartyRow tone="purple" icon="🔎" title="Transparent" subtitle="See the calories, macros and rationale." />
                <SmartyRow tone="purple" icon="🚫" title="No subscription trap" subtitle="Pay once, own your plan." />
              </div>
            </div>
          </div>
        </div>
      </SmartyCard>

      <div className="mt-8">
        <SmartyCard
          tone="blue"
          eyebrow="What powers SmartyWorkout"
          eyebrowIcon="🧠"
          cornerIcon={Brain}
          title="Training"
          accent="Intelligence"
          description="An AI training engine that assesses your body, activity and goals, then plans meals, macros and portions the way a coach would — instantly and transparently."
          ctaLabel="Learn more about Training Intelligence"
          ctaTo="/training-intelligence"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SmartyRow tone="blue" icon="📊" title="Personal assessment" subtitle="Body, activity, goal, preferences & allergies." />
            <SmartyRow tone="blue" icon="⚙️" title="Mifflin-St Jeor engine" subtitle="Standard BMR + TDEE multipliers." />
            <SmartyRow tone="blue" icon="🍽️" title="Complete workout plan" subtitle="Meals, macros, portions, equipment list." />
            <SmartyRow tone="blue" icon="🔎" title="Transparent numbers" subtitle="See the calories, macros and rationale." />
          </div>
        </SmartyCard>
      </div>


      <div className="mt-8">
        <SmartyCard
          tone="cyan"
          eyebrow="Learn more"
          eyebrowIcon="🔬"
          cornerIcon={BookOpen}
          title="The Diet"
          accent="Science"
          description="Explore the evidence behind our approach: diet schedules decoded, the role of protein, carbs and fats, how human training evolved, common myths, and the sources we rely on."
          ctaLabel="Read The Diet Science"
          ctaTo="/training-science"
        />
      </div>



      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link to="/questionnaire">Create my workout plan</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/tools">Explore free tools</Link>
        </Button>
      </div>
    </div>
  );
}


