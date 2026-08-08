import { createFileRoute } from "@tanstack/react-router";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { PageHeader } from "@/components/PageHeader";
import { MEMBERSHIP_PRICE_ID } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/checkout")({
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
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 lg:max-w-4xl lg:px-8 lg:py-16">
      <PaymentTestModeBanner />
      <PageHeader
        className="mb-2"
        eyebrow="Membership"
        title="Checkout"
        subtitle="Smarty Workout · €9.99 per month · cancel anytime."
      />
      <div className="mt-6 rounded-2xl border border-blue-400 bg-card p-4">
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
