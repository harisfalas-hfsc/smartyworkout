import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { getMyAccessState } from "@/lib/access.functions";

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
  const [profileReady, setProfileReady] = useState<boolean | null>(null);

  useEffect(() => {
    void getMyAccessState()
      .then((access) =>
        setProfileReady(
          access.profileComplete && access.healthAcknowledged && access.readinessComplete,
        ),
      )
      .catch(() => setProfileReady(null));
  }, []);

  const needsProfile = profileReady === false;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 lg:max-w-4xl lg:px-8 lg:py-16">
      <PageHeader
        className="mb-2"
        eyebrow="Membership"
        title={sessionId ? "You're in" : "Checkout"}
        subtitle={
          sessionId
            ? needsProfile
              ? "One last step — complete your Training Profile so Smarty Coach knows what to build for you."
              : "Your membership is being activated — this takes a few seconds."
            : "No checkout session found."
        }
      />
      <div className="mt-6 rounded-2xl border border-blue-400 bg-card p-5">
        {sessionId ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            {needsProfile ? (
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            )}
            {needsProfile
              ? "Payment received. Your Training Profile is required once — your age, level, goal, equipment, environment, duration and health acknowledgement — before any workout can be created."
              : "Payment received. Head to Smarty Coach and create your first workout."}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Start from the pricing page to subscribe.</p>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {needsProfile ? (
            <Button asChild className="h-12 rounded-2xl">
              <Link to="/profile">Complete Training Profile</Link>
            </Button>
          ) : (
            <Button asChild className="h-12 rounded-2xl">
              <Link to="/coach">Create your workout</Link>
            </Button>
          )}
          <Button asChild variant="secondary" className="h-12 rounded-2xl">
            <Link to="/account">My account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

