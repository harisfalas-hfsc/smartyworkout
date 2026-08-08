import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Crown, LogOut, Mail, User, ClipboardList } from "lucide-react";
import { DailyCoachingSettings } from "@/components/DailyCoachingSettings";
import { getMyAccessState } from "@/lib/access.functions";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — Smarty Workout" },
      {
        name: "description",
        content: "Manage your Smarty Workout subscription, profile details and sign-in.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

function Account() {
  const { user, displayName } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [premium, setPremium] = useState<boolean | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  useEffect(() => {
    void getMyAccessState().then((a) => setPremium(a.premium)).catch(() => setPremium(false));
  }, []);

  async function openPortal() {
    setPortalBusy(true);
    try {
      const result = await createPortalSession({
        data: { returnUrl: window.location.href, environment: getStripeEnvironment() },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing");
    } finally {
      setPortalBusy(false);
    }
  }

  useEffect(() => {
    (async () => {
      const { count: c } = await supabase
        .from("workouts")
        .select("id", { count: "exact", head: true });
      setCount(c ?? 0);
    })();
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 lg:max-w-4xl lg:px-8 lg:py-16">
      <PageHeader
        className="mb-2"
        eyebrow="Smarty Workout"
        title="My account"
        subtitle="Your subscription and personal details."
      />

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-bold">{displayName ?? "Athlete"}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button asChild variant="secondary" className="h-12 rounded-2xl">
            <Link to="/profile">
              <ClipboardList className="mr-2 h-4 w-4" /> Training profile
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-12 rounded-2xl">
            <Link to="/logbook" search={{ filter: "all" as const, view: "list" as const }}>Logbook{count !== null ? ` (${count})` : ""}</Link>
          </Button>
        </div>
      </section>

      <DailyCoachingSettings />

      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Crown className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold">Subscription</p>
            <p className="text-sm text-muted-foreground">Smarty Workout · €9.99 / month</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {premium === null
            ? "Checking your membership…"
            : premium
              ? "Your membership is active. Manage payment method, invoices or cancellation in the billing portal."
              : "You don't have an active membership yet. Subscribe to unlock Smarty Coach, Workout of the Day and your full history."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {premium ? (
            <Button className="h-12 rounded-2xl" disabled={portalBusy} onClick={() => void openPortal()}>
              {portalBusy ? "Opening…" : "Manage billing"}
            </Button>
          ) : (
            <Button asChild className="h-12 rounded-2xl">
              <Link to="/checkout">Subscribe · €9.99 / month</Link>
            </Button>
          )}
          <Button asChild variant="secondary" className="h-12 rounded-2xl">
            <Link to="/contact">
              <Mail className="mr-2 h-4 w-4" /> Billing help
            </Link>
          </Button>
        </div>
      </section>

      <Button
        variant="ghost"
        className="mt-6 h-12 w-full rounded-2xl text-destructive"
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = "/";
        }}
      >
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}
