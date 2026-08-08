import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Membership activated — Smarty Workout" },
      { name: "description", content: "Your Smarty Workout membership checkout result." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 lg:max-w-4xl lg:px-8 lg:py-16">
      <PageHeader
        className="mb-2"
        eyebrow="Membership"
        title={sessionId ? "You're in" : "Checkout"}
        subtitle={
          sessionId
            ? "Your membership is being activated — this takes a few seconds."
            : "No checkout session found."
        }
      />
      <div className="mt-6 rounded-2xl border border-blue-400 bg-card p-5">
        {sessionId ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Payment received. Head to Smarty Coach and create your first workout.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Start from the pricing page to subscribe.</p>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button asChild className="h-12 rounded-2xl">
            <Link to="/coach">Create your workout</Link>
          </Button>
          <Button asChild variant="secondary" className="h-12 rounded-2xl">
            <Link to="/account">My account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
