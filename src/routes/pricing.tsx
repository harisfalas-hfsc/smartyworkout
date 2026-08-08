import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { SmartyCard, SmartyPill, toneClasses } from "@/components/SmartyCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — SmartyWorkout subscription €9.99/month" },
      {
        name: "description",
        content:
          "One SmartyWorkout subscription: €9.99 per month for 2 AI workouts a day, the full exercise library, all training tools, your logbook and every past workout.",
      },
      { property: "og:title", content: "SmartyWorkout Pricing — €9.99/month" },
      {
        property: "og:description",
        content: "2 AI workouts a day, full exercise library, all tools and your training history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://smartyworkout.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/pricing" }],
  }),
  component: PricingPage,
});

const INCLUDES: { icon: string; label: string }[] = [
  { icon: "🏋️", label: "2 AI workouts every day" },
  { icon: "🧠", label: "Smarty Coach personalization" },
  { icon: "📚", label: "Full exercise library" },
  { icon: "🕘", label: "All your previous workouts" },
  { icon: "📓", label: "Logbook & progress tracking" },
  { icon: "📄", label: "PDF export of any workout" },
];

const TOOLS: { icon: string; label: string }[] = [
  { icon: "⏱️", label: "Workout Timer" },
  { icon: "🔁", label: "Rounds Tracker" },
  { icon: "🏋️", label: "1RM Calculator" },
];

function PricingPage() {
  const t = toneClasses("pink");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pricing</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          One subscription. <span className="text-primary">Everything included.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Train with Smarty Coach every day — no add-ons, no upsells.
        </p>
      </div>

      <SmartyCard
        tone="pink"
        eyebrow="Membership"
        eyebrowIcon="👑"
        title="€9.99"
        accent="per month."
        description="Two personalized workouts a day plus every feature on the platform. Cancel anytime."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={cn("rounded-2xl border p-4", t.softBorder, t.softBg)}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              Your membership includes
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {INCLUDES.map((it) => (
                <SmartyPill tone="pink" key={it.label} icon={it.icon}>
                  {it.label}
                </SmartyPill>
              ))}
            </div>
          </div>

          <div className={cn("rounded-2xl border p-4", t.softBorder, t.softBg)}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
              Training tools
            </h3>
            <div className="grid gap-2">
              {TOOLS.map((it) => (
                <SmartyPill tone="pink" key={it.label} icon={it.icon}>
                  {it.label}
                </SmartyPill>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Timer, rounds tracker and 1RM calculator — ready mid-session.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/coach">Create your workout</Link>
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
