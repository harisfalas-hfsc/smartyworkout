import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Sparkles,
  Activity,
  Gauge,
  Salad,
  Users,
  Compass,
} from "lucide-react";
import { SmartyCard, SmartyRow, SmartyPill, toneClasses } from "@/components/SmartyCard";
import { cn } from "@/lib/utils";

const URL = "https://smartyworkout.com/training-intelligence";
const TITLE =
  "Training Intelligence — The AI Training Intelligence Platform | SmartyWorkout";
const DESCRIPTION =
  "What training intelligence is, why it matters, and how SmartyWorkout's Smarty Training Score™ and Metabolic Age™ turn assessment into a personalized workout plan.";

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${URL}#webpage`,
      url: URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": "https://smartyworkout.com/#website" },
      about: [
        "Training Intelligence",
        "AI Training Analysis",
        "Personalized Training",
        "Metabolic Health",
      ],
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["h1", "h2", "article p"],
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
        { "@type": "ListItem", position: 2, name: "Training Intelligence", item: URL },
      ],
    },
  ],
};

export const Route = createFileRoute("/training-intelligence")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(JSONLD) }],
  }),
  component: TrainingIntelligencePage,
});

function TrainingIntelligencePage() {
  const blue = toneClasses("blue");
  const purple = toneClasses("purple");
  const green = toneClasses("green");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Hero */}
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          🧠 Pillar guide
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-primary">Training</span>{" "}
          <span className="text-green-500">Intelligence</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          The layer of understanding above raw tracking. SmartyWorkout turns your
          body, goals and habits into a plan you can actually follow — instantly
          and transparently.
        </p>
      </div>

      {/* What & Why */}
      <SmartyCard
        tone="blue"
        eyebrow="The idea"
        eyebrowIcon="💡"
        cornerIcon={Brain}
        title="What is training"
        accent="intelligence?"
        description="A calorie counter tells you a number. A training intelligence platform tells you what that number means for your goal, your body, and your habits — and what to change next."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={cn("rounded-2xl border p-4", blue.softBorder, blue.softBg)}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              🧬 What it is
            </h3>
            <div className="space-y-3">
              <SmartyRow tone="blue" icon="📐" title="Classical dietetics" subtitle="Mifflin-St Jeor BMR, TDEE, macro splits, portions." />
              <SmartyRow tone="blue" icon="🤖" title="Modern AI reasoning" subtitle="Scores your diet and personalizes your plan." />
              <SmartyRow tone="blue" icon="🔄" title="Adaptive" subtitle="Refines as your goals and body change." />
            </div>
          </div>

          <div className={cn("rounded-2xl border p-4", blue.softBorder, blue.softBg)}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              🎯 Why it matters
            </h3>
            <div className="space-y-3">
              <SmartyRow tone="blue" icon="🚫" title="Generic advice fails" subtitle="Bodies, goals and lifestyles aren't generic." />
              <SmartyRow tone="blue" icon="👤" title="Respects you" subtitle="Allergies, preferences, culture, budget, schedule." />
              <SmartyRow tone="blue" icon="📈" title="Closes the gap" subtitle="Turns assessment into an actionable plan." />
            </div>
          </div>
        </div>
      </SmartyCard>

      {/* Signature metrics */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SmartyCard
          tone="green"
          eyebrow="Signature metric"
          eyebrowIcon="🌟"
          cornerIcon={Gauge}
          title="Smarty Training"
          accent="Score™"
          description="A composite score of your current diet across four axes — so progress isn't a vibe, it's a number."
        >
          <div className={cn("rounded-2xl border p-4", green.softBorder, green.softBg)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <SmartyPill tone="green" icon="⚖️">Macro balance</SmartyPill>
              <SmartyPill tone="green" icon="🥦">Micronutrient coverage</SmartyPill>
              <SmartyPill tone="green" icon="🌾">Food quality</SmartyPill>
              <SmartyPill tone="green" icon="⏱️">Behavior & timing</SmartyPill>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Every plan raises the score you can realistically hit — no crash
              diets, no impossible discipline.
            </p>
          </div>
        </SmartyCard>

        <SmartyCard
          tone="purple"
          eyebrow="Signature metric"
          eyebrowIcon="⏳"
          cornerIcon={Activity}
          title="Smarty Metabolic"
          accent="Age™"
          description="Estimates the age your metabolism is behaving like — from BMR, body composition, activity and dietary patterns."
        >
          <div className={cn("rounded-2xl border p-4", purple.softBorder, purple.softBg)}>
            <div className="space-y-3">
              <SmartyRow tone="purple" icon="🔥" title="BMR-based" subtitle="Grounded in your true resting burn." />
              <SmartyRow tone="purple" icon="🏃" title="Activity-aware" subtitle="Adjusts for how you move day to day." />
              <SmartyRow tone="purple" icon="🎯" title="Motivating goal" subtitle="Aim: metabolic age below your calendar age." />
            </div>
          </div>
        </SmartyCard>
      </div>

      {/* From assessment to plan */}
      <div className="mt-8">
        <SmartyCard
          tone="cyan"
          eyebrow="The engine"
          eyebrowIcon="⚙️"
          cornerIcon={Sparkles}
          title="From assessment to your"
          accent="workout plan"
          description="You answer a smart questionnaire — body, goals, activity, preferences, allergies, schedule. Our engines do the rest."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <SmartyRow tone="cyan" icon="🔥" title="Smarty Calorie Engine™" subtitle="Your daily target, calibrated to your goal." />
            <SmartyRow tone="cyan" icon="🧮" title="Smarty Macro Index™" subtitle="Protein, carbs and fats split for your body." />
            <SmartyRow tone="cyan" icon="🍽️" title="Smarty Workout Plan™" subtitle="Meals, portions & a weekly equipment list." />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            ✨ You get 2 refinements included — the first plan is a starting
            point, not a final verdict.
          </p>
        </SmartyCard>
      </div>

      {/* Macros */}
      <div className="mt-8">
        <SmartyCard
          tone="orange"
          eyebrow="The building blocks"
          eyebrowIcon="🥗"
          cornerIcon={Salad}
          title="Macros, calories"
          accent="& micronutrients"
          description="Calories decide weight direction. Macros decide body composition. Micronutrients decide how you feel. A good plan pays attention to all three."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SmartyRow tone="orange" icon="💪" title="Protein prioritized" subtitle="Protects lean mass during a deficit." />
            <SmartyRow tone="orange" icon="🍚" title="Carbs, timed" subtitle="Around activity where it actually matters." />
            <SmartyRow tone="orange" icon="🥑" title="Fats for hormones" subtitle="Keeps satiety and hormones in a healthy range." />
            <SmartyRow tone="orange" icon="💧" title="Fiber & water" subtitle="Tracked as guardrails, not afterthoughts." />
          </div>
        </SmartyCard>
      </div>

      {/* Who it's for */}
      <div className="mt-8">
        <SmartyCard
          tone="pink"
          eyebrow="Who it's for"
          eyebrowIcon="👥"
          cornerIcon={Users}
          title="Built for"
          accent="everyone with a goal"
          description="Whatever direction you're heading, training intelligence gets you there faster — without the subscription trap."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SmartyPill tone="pink" icon="⚖️">Losing weight</SmartyPill>
            <SmartyPill tone="pink" icon="💪">Gaining muscle</SmartyPill>
            <SmartyPill tone="pink" icon="🩺">Managing conditions</SmartyPill>
            <SmartyPill tone="pink" icon="🌱">Eating better</SmartyPill>
          </div>
        </SmartyCard>
      </div>

      {/* Deeper */}
      <div className="mt-8">
        <SmartyCard
          tone="cyan"
          eyebrow="Go deeper"
          eyebrowIcon="🔬"
          cornerIcon={Compass}
          title="Related"
          accent="reading"
          description="Keep learning — the science, the terms, and the tools that back the platform."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Link to="/training-science" className="block">
              <SmartyRow tone="cyan" icon="🔬" title="The Diet Science" subtitle="Evidence, myths & sources." />
            </Link>
            <Link to="/glossary" className="block">
              <SmartyRow tone="cyan" icon="📖" title="Glossary" subtitle="Every metric and concept, defined." />
            </Link>
            <Link to="/tools" className="block">
              <SmartyRow tone="cyan" icon="🛠️" title="Free tools" subtitle="BMR, macros, calorie counter." />
            </Link>
          </div>
        </SmartyCard>
      </div>

      {/* CTA */}
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link to="/questionnaire">Create my workout plan</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/about">About SmartyWorkout</Link>
        </Button>
      </div>
    </div>
  );
}
