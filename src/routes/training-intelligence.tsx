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
        description="A workout app gives you a session. A training intelligence platform decides which session you actually need today — for your goal, your body, your fatigue and your equipment."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={cn("rounded-2xl border p-4", blue.softBorder, blue.softBg)}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              🧬 What it is
            </h3>
            <div className="space-y-3">
              <SmartyRow tone="blue" icon="📐" title="Sports science" subtitle="Progressive overload, volume, intensity, recovery." />
              <SmartyRow tone="blue" icon="🤖" title="AI reasoning" subtitle="Reads your profile and builds today's session." />
              <SmartyRow tone="blue" icon="🔄" title="Adaptive" subtitle="Learns from every workout and every feedback." />
            </div>
          </div>

          <div className={cn("rounded-2xl border p-4", blue.softBorder, blue.softBg)}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              🎯 Why it matters
            </h3>
            <div className="space-y-3">
              <SmartyRow tone="blue" icon="🚫" title="Generic plans fail" subtitle="Bodies, schedules and gyms aren't generic." />
              <SmartyRow tone="blue" icon="👤" title="Respects you" subtitle="Injuries, experience, time, location, equipment." />
              <SmartyRow tone="blue" icon="📈" title="Keeps you training" subtitle="The right session today beats the perfect plan you quit." />
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
          description="A composite picture of your training across four axes — so progress isn't a feeling, it's a number."
        >
          <div className={cn("rounded-2xl border p-4", green.softBorder, green.softBg)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <SmartyPill tone="green" icon="🏋️">Strength &amp; power</SmartyPill>
              <SmartyPill tone="green" icon="❤️">Conditioning</SmartyPill>
              <SmartyPill tone="green" icon="🤸">Mobility &amp; control</SmartyPill>
              <SmartyPill tone="green" icon="📅">Consistency</SmartyPill>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Smarty Coach builds sessions that raise the axis you're neglecting
              — no junk volume, no random workouts.
            </p>
          </div>
        </SmartyCard>

        <SmartyCard
          tone="purple"
          eyebrow="Signature metric"
          eyebrowIcon="⚡"
          cornerIcon={Activity}
          title="Smarty Readiness"
          accent="Check™"
          description="Before every session Smarty Coach reads your mood, time, recent training load and feedback — then sets today's intensity."
        >
          <div className={cn("rounded-2xl border p-4", purple.softBorder, purple.softBg)}>
            <div className="space-y-3">
              <SmartyRow tone="purple" icon="😴" title="Fatigue-aware" subtitle="Low energy day? You get a smarter, lighter session." />
              <SmartyRow tone="purple" icon="⏱️" title="Time-aware" subtitle="10 minutes or 60 — the structure changes, not the quality." />
              <SmartyRow tone="purple" icon="🩹" title="Safety first" subtitle="Injuries and limitations filter the exercise pool." />
            </div>
          </div>
        </SmartyCard>
      </div>

      {/* From assessment to workout */}
      <div className="mt-8">
        <SmartyCard
          tone="cyan"
          eyebrow="The engine"
          eyebrowIcon="⚙️"
          cornerIcon={Sparkles}
          title="From answers to your"
          accent="workout"
          description="You tell Smarty Coach your goal, mood, time, location and equipment. The engines do the rest."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <SmartyRow tone="cyan" icon="🎯" title="Smarty Goal Engine™" subtitle="Turns your goal into the right training stimulus." />
            <SmartyRow tone="cyan" icon="📚" title="Smarty Exercise Index™" subtitle="1,300+ exercises filtered to what you can actually do." />
            <SmartyRow tone="cyan" icon="🏗️" title="Smarty Session Builder™" subtitle="Warm-up, main blocks, finisher and cool-down." />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            ✨ Every session you complete and rate makes the next one sharper.
          </p>
        </SmartyCard>
      </div>

      {/* Training principles */}
      <div className="mt-8">
        <SmartyCard
          tone="orange"
          eyebrow="The building blocks"
          eyebrowIcon="🏋️"
          cornerIcon={Dumbbell}
          title="Volume, intensity"
          accent="& recovery"
          description="Intensity drives adaptation. Volume drives accumulation. Recovery decides whether any of it counts. A good session respects all three."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SmartyRow tone="orange" icon="📈" title="Progressive overload" subtitle="Small, sustainable jumps session to session." />
            <SmartyRow tone="orange" icon="🔁" title="Movement balance" subtitle="Push, pull, hinge, squat, carry, core." />
            <SmartyRow tone="orange" icon="🤸" title="Mobility built in" subtitle="Prep and cool-down are part of the session." />
            <SmartyRow tone="orange" icon="🛌" title="Recovery respected" subtitle="Load is spread so you can train again tomorrow." />
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
          description="Whatever you're training for, training intelligence gets you there faster — without the subscription trap."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SmartyPill tone="pink" icon="💪">Building muscle</SmartyPill>
            <SmartyPill tone="pink" icon="🔥">Losing fat</SmartyPill>
            <SmartyPill tone="pink" icon="🏃">Getting fitter</SmartyPill>
            <SmartyPill tone="pink" icon="🤸">Moving better</SmartyPill>
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
          description="Keep learning — the science, the terms and the coach behind the platform."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/glossary" className="block">
              <SmartyRow tone="cyan" icon="📖" title="Glossary" subtitle="Every training term and metric, defined." />
            </Link>
            <Link to="/haris-falas" className="block">
              <SmartyRow tone="cyan" icon="🧑‍🏫" title="Haris Falas" subtitle="The sports scientist behind Smarty Coach." />
            </Link>
          </div>
        </SmartyCard>
      </div>

      {/* CTA */}
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link to="/coach">Create my workout</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/about">About SmartyWorkout</Link>
        </Button>
      </div>

    </div>
  );
}
