import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Navigate } from "@tanstack/react-router";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { PageHeader } from "@/components/PageHeader";
import { MEMBERSHIP_PRICE_ID } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/checkout")({
  beforeLoad: async () => {
    const { getFreeAccessMode } = await import("@/lib/free-access.functions");
    let free = false;
    try {
      free = (await getFreeAccessMode()).freeAccessMode;
    } catch {
      free = false;
    }
    // Free Access Mode: never render or index any paid screen.
    if (free) throw redirect({ to: "/", replace: true });
  },

  head: () => ({
    meta: [
      { title: "Checkout — Smarty Workout membership" },
      {
        name: "description",
        content: "Activate your Smarty Workout membership — €9.99 per month, cancel anytime.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { freeAccessMode, loading } = useFreeAccessMode();
  if (loading) return null;
  if (freeAccessMode) return <Navigate to="/" replace />;
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <PaymentTestModeBanner />
      <PageHeader
        className="mb-2"
        eyebrow="Membership"
        title="Checkout"
        subtitle="Smarty Workout · €9.99 per month · cancel anytime."
      />
      <div className="mt-6 rounded-2xl border-2 border-blue-400 bg-card p-4">
        <StripeEmbeddedCheckout
          priceId={MEMBERSHIP_PRICE_ID}
          returnUrl={
            typeof window !== "undefined"
              ? `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`
              : undefined
          }
        />
      </div>
    </div>
  );
}
