import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { HandCoins } from "lucide-react";
import { SmartyCard, SmartyPill, toneClasses } from "@/components/SmartyCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — SmartyWorkout AI workout plan — free" },
      {
        name: "description",
        content:
          "One personalized Smarty Workout Plan™ for free. Includes 1, 2 or 4-week workout plan, macros, equipment list, 2 free refinements and PDF export. No subscription.",
      },
      { property: "og:title", content: "SmartyWorkout Pricing — free" },
      {
        property: "og:description",
        content: "One personalized Smarty Workout Plan™. Yours to keep. No subscription.",
      },
      { property: "og:url", content: "https://smartyworkout.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/pricing" }],
  }),
  component: PricingPage,
});

const INCLUDES: { icon: string; label: string }[] = [
  { icon: "🎯", label: "Calorie & macro targets" },
  { icon: "🗓️", label: "1, 2 or 4-week workout plan" },
  { icon: "🛒", label: "Weekly equipment list" },
  { icon: "✏️", label: "2 free refinements" },
  { icon: "📄", label: "PDF export + printable list" },
  { icon: "☁️", label: "Saved to your account" },
];

const FREE_TOOLS: { icon: string; label: string }[] = [
  { icon: "🔥", label: "BMR Calculator" },
  { icon: "🥧", label: "Macro Calculator" },
  { icon: "🍎", label: "Calorie Counter" },
];

function PricingPage() {
  const t = toneClasses("pink");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Pricing
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Simple pricing. <span className="text-primary">No subscription.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Pay once, get your personalized plan. Come back only if you want a new one.
        </p>
      </div>

      <SmartyCard
        tone="pink"
        eyebrow="Always free"
        eyebrowIcon="💳"
        cornerIcon={HandCoins}
        title="Free"
        accent="once."
        description="One personalized plan. Yours to keep. No subscription, no hidden add-ons, no monthly fee."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div
            className={cn(
              "rounded-2xl border p-4",
              t.softBorder,
              t.softBg,
            )}
          >
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              Your plan includes
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {INCLUDES.map((it) => (
                <SmartyPill tone="pink" key={it.label} icon={it.icon}>
                  {it.label}
                </SmartyPill>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "rounded-2xl border p-4",
              t.softBorder,
              t.softBg,
            )}
          >
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              Free tools
            </h3>
            <div className="grid gap-2">
              {FREE_TOOLS.map((it) => (
                <SmartyPill tone="pink" key={it.label} icon={it.icon}>
                  {it.label}
                </SmartyPill>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Use BMR, TDEE, macro and calorie counter — no account required.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/questionnaire">Create my workout plan — free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/how-it-works">How it works</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Not medical advice. Consult a professional for medical conditions.
        </p>
      </SmartyCard>
    </div>
  );
}

