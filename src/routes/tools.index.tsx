import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, PieChart, Calculator } from "lucide-react";
import { SmartyCard, SmartyRow } from "@/components/SmartyCard";

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: "SmartyWorkout Tools — Free training calculators (BMR, TDEE, macros, calories)" },
      {
        name: "description",
        content:
          "Free SmartyWorkout training tools: BMR calculator (Mifflin-St Jeor), TDEE, macro calculator and USDA-powered calorie counter. Part of the AI Training Intelligence Platform.",
      },
      { property: "og:title", content: "SmartyWorkout Tools — Free training calculators" },
      {
        property: "og:description",
        content: "BMR, TDEE, macros and calorie lookup — free tools by SmartyWorkout.",
      },
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
          Simple, science-based calculators you can use without signing up.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <SmartyCard
          tone="orange"
          eyebrow="Energy"
          eyebrowIcon="🔥"
          cornerIcon={Flame}
          title="BMR"
          accent="Calculator"
          description="Calculate your basal metabolic rate and daily calorie needs using the Mifflin-St Jeor equation."
          ctaLabel="Open BMR calculator"
          ctaTo="/tools/bmr-calculator"
        >
          <div className="hidden space-y-3 md:block">
            <SmartyRow tone="orange" icon="🧬" title="Mifflin-St Jeor equation" subtitle="The standard for BMR estimates." />
            <SmartyRow tone="orange" icon="🏃" title="Activity levels" subtitle="Sedentary → very active." />
          </div>
        </SmartyCard>

        <SmartyCard
          tone="purple"
          eyebrow="Macros"
          eyebrowIcon="🥧"
          cornerIcon={PieChart}
          title="Macro"
          accent="Calculator"
          description="Get personalized calories, protein, carbs, fats, fiber and water targets based on your goal."
          ctaLabel="Open macro calculator"
          ctaTo="/tools/macro-calculator"
        >
          <div className="hidden space-y-3 md:block">
            <SmartyRow tone="purple" icon="🎯" title="Goal-aware" subtitle="Lose, maintain, recomp or gain." />
            <SmartyRow tone="purple" icon="💧" title="Hydration & fiber" subtitle="Complete daily targets." />
          </div>
        </SmartyCard>

        <SmartyCard
          tone="green"
          eyebrow="Lookup"
          eyebrowIcon="🍎"
          cornerIcon={Calculator}
          title="Calorie"
          accent="Counter"
          description="Look up calories and macros for common foods and calculate totals for any portion size."
          ctaLabel="Open calorie counter"
          ctaTo="/tools/calorie-counter"
        >
          <div className="hidden space-y-3 md:block">
            <SmartyRow tone="green" icon="🔎" title="USDA-powered" subtitle="Standardized food data." />
            <SmartyRow tone="green" icon="⚖️" title="Any portion size" subtitle="Grams, ounces, servings." />
          </div>
        </SmartyCard>
      </div>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        Want a full plan built from your numbers?{" "}
        <Link to="/questionnaire" className="font-semibold text-primary">
          Create your Smarty Workout Plan™ →
        </Link>
      </div>
    </div>
  );
}
