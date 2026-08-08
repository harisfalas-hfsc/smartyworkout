import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Sparkles, ClipboardList } from "lucide-react";
import { SmartyCard, SmartyRow } from "@/components/SmartyCard";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: "My plans — SmartyWorkout" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlansList,
});

interface Row {
  id: string;
  duration_weeks: number;
  status: string;
  credits_used: number;
  credits_total: number;
  created_at: string;
}

const TONES: Array<"cyan" | "green" | "orange" | "purple" | "yellow" | "pink" | "blue"> = [
  "cyan",
  "green",
  "orange",
  "purple",
  "yellow",
  "pink",
  "blue",
];

function PlansList() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("generation_sessions")
        .select("id,duration_weeks,status,credits_used,credits_total,created_at")
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      setRows((data as Row[]) ?? []);
    })();
  }, []);

  if (pathname !== "/plans") return <Outlet />;

  const hasActive = (rows ?? []).some(
    (r) => (r.credits_used ?? 0) < (r.credits_total ?? 0),
  );
  const showNewPlanCard = rows !== null && rows.length > 0 && !hasActive;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Your plans
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            My <span className="text-primary">Smarty Workout Plans™</span>
          </h1>
        </div>
        {rows !== null && rows.length > 0 && (
          <Button asChild size="sm" variant={hasActive ? "outline" : "default"}>
            <Link to="/questionnaire">New plan</Link>
          </Button>
        )}
      </div>

      {rows === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <SmartyCard
          tone="cyan"
          eyebrow="Get started"
          eyebrowIcon="🚀"
          cornerIcon={FileText}
          title="No plans"
          accent="yet."
          description="Build your first personalized Smarty Workout Plan™ in a few minutes."
        >
          <Button asChild size="lg">
            <Link to="/questionnaire">Build my first plan</Link>
          </Button>
        </SmartyCard>
      ) : (
        <>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, i) => {
              const active = (r.credits_used ?? 0) < (r.credits_total ?? 0);
              const tone = active ? "green" : TONES[i % TONES.length];
              return (
                <SmartyCard
                  key={r.id}
                  tone={tone}
                  eyebrow={active ? "Active" : "Completed"}
                  eyebrowIcon={active ? "✅" : "📁"}
                  cornerIcon={ClipboardList}
                  title={`${r.duration_weeks}-week`}
                  accent="plan"
                >
                  <div className="space-y-3">
                    <SmartyRow
                      tone={tone}
                      icon="📅"
                      title="Created"
                      subtitle={new Date(r.created_at).toLocaleDateString()}
                    />
                    <SmartyRow
                      tone={tone}
                      icon="✏️"
                      title="Credits"
                      subtitle={`${r.credits_used}/${r.credits_total} used`}
                    />
                  </div>
                  <div className="mt-6">
                    <Button asChild size="sm">
                      <Link to="/plans/$sessionId" params={{ sessionId: r.id }}>
                        View plan →
                      </Link>
                    </Button>
                  </div>
                </SmartyCard>
              );
            })}
          </div>

          {showNewPlanCard && (
            <div className="mt-8">
              <SmartyCard
                tone="pink"
                eyebrow="Fresh start"
                eyebrowIcon="✨"
                cornerIcon={Sparkles}
                title="Want a"
                accent="new plan?"
                description="You've used all refinements on your current plans. Create a brand new personalized workout plan for free."
              >
                <Button asChild size="lg">
                  <Link to="/questionnaire">Create a new workout plan — free</Link>
                </Button>
              </SmartyCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}
