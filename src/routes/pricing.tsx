import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Navigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { SmartyCard, SmartyPill, toneClasses } from "@/components/SmartyCard";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/pricing")({
  beforeLoad: async () => {
    const { getFreeAccessMode } = await import("@/lib/free-access.functions");
    let free = false;
    try {
      free = (await getFreeAccessMode()).freeAccessMode;
    } catch {
      free = false;
    }
    // Free Access Mode: the page must never render or be indexed.
    if (free) throw redirect({ to: "/", replace: true });
  },

  head: () => ({
    meta: [
      { title: "Pricing — SmartyWorkout subscription €9.99/month" },
      {
        name: "description",
        content:
          "One SmartyWorkout subscription: €9.99 per month for 2 personalized workouts a day programmed on the sports science of Haris Falas (CSCS), the full 1,300+ exercise library, all training tools, your logbook and every past workout.",
      },

      { property: "og:title", content: "SmartyWorkout Pricing — €9.99/month" },
      {
        property: "og:description",
        content: "2 personalized workouts a day, full exercise library, all tools and your training history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://smartyworkout.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://smartyworkout.com/pricing" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Product",
              name: "SmartyWorkout Subscription",
              description:
                "One SmartyWorkout subscription: 2 personalized workouts a day, the full exercise library, all training tools, your logbook and every past workout.",
              brand: { "@id": "https://smartyworkout.com/#organization" },
              category: "Fitness subscription",
              image: "https://smartyworkout.com/og-social.jpg",
              offers: {
                "@type": "Offer",
                price: "9.99",
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock",
                url: "https://smartyworkout.com/pricing",
                category: "subscription",
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  price: "9.99",
                  priceCurrency: "EUR",
                  billingIncrement: 1,
                  unitCode: "MON",
                },
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
                { "@type": "ListItem", position: 2, name: "Pricing", item: "https://smartyworkout.com/pricing" },
              ],
            },
          ],
        }),
      },
    ],
  }),

  component: PricingPage,
});

const INCLUDES: { icon: string; label: string }[] = [
  { icon: "🏋️", label: "2 personalized workouts every day" },
  { icon: "🧠", label: "Smarty Coach personalization" },
  { icon: "📚", label: "Full exercise library" },
  { icon: "🕘", label: "All your previous workouts" },
  { icon: "📓", label: "Logbook & progress tracking" },
];

const TOOLS: { icon: string; label: string }[] = [
  { icon: "⏱️", label: "Workout Timer" },
  { icon: "🔁", label: "Rounds Tracker" },
  { icon: "🏋️", label: "1RM Calculator" },
];

function PricingPage() {
  const { freeAccessMode, loading } = useFreeAccessMode();
  if (loading) return null;
  if (freeAccessMode) return <Navigate to="/" replace />;
  const t = toneClasses("pink");
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <PageHeader
        eyebrow="Pricing"
        title={
          <>
            One subscription
            <br />
            <span className="text-primary">Everything included</span>
          </>
        }
        subtitle="Train with Smarty Coach every day — no add-ons, no upsells."
      />

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
            <Link to="/auth" search={{ next: "/checkout", mode: "signup" }}>Subscribe · €9.99 / month</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/how-it-works">How it works</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Flow: create your account → complete the mandatory Training Profile → activate Premium → choose Workout of the Day or create a workout.
        </p>
      </SmartyCard>
    </div>
  );
}
