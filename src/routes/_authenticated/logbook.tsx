import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Star, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/logbook")({
  head: () => ({
    meta: [
      { title: "Logbook — your training history" },
      {
        name: "description",
        content: "Every workout Smarty Coach built for you, with feedback, mood and completion status.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Logbook,
});

type Row = {
  id: string;
  name: string;
  category: string;
  duration_min: number;
  difficulty_stars: number;
  mood: string | null;
  status: string;
  created_at: string;
  workout_feedback: Array<{ difficulty_rating: string | null; feeling: string | null }>;
};

function Logbook() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("workouts")
        .select(
          "id,name,category,duration_min,difficulty_stars,mood,status,created_at,workout_feedback(difficulty_rating,feeling)",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data as unknown as Row[]) ?? []);
    })();
  }, []);

  if (!rows)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-black">Logbook</h1>
      <p className="mt-1 text-muted-foreground">Your complete training history.</p>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No workouts yet.</p>
          <Button asChild className="mt-4">
            <Link to="/coach">Ask Smarty Coach</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                to="/workout/$workoutId"
                params={{ workoutId: r.id }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50"
              >
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-primary">
                    {new Date(r.created_at).toLocaleDateString()} · {r.category}
                  </p>
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      r.mood ? `mood: ${r.mood}` : null,
                      r.workout_feedback?.[0]?.difficulty_rating
                        ? `felt ${r.workout_feedback[0]!.difficulty_rating}`
                        : null,
                      r.status,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {r.duration_min}m
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: r.difficulty_stars }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                    ))}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
