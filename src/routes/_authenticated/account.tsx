import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Crown, LogOut, Mail, User, ClipboardList } from "lucide-react";
import { DailyCoachingSettings } from "@/components/DailyCoachingSettings";

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

  useEffect(() => {
    (async () => {
      const { count: c } = await supabase
        .from("workouts")
        .select("id", { count: "exact", head: true });
      setCount(c ?? 0);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-black">My account</h1>
      <p className="mt-1 text-muted-foreground">Your subscription and personal details.</p>

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
          Billing isn't switched on yet, so your account currently has full access. When checkout
          goes live you'll be able to subscribe, change or cancel your plan right here.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button asChild className="h-12 rounded-2xl">
            <Link to="/pricing">See what's included</Link>
          </Button>
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
