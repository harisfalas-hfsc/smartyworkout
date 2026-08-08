import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Flame, Trophy, Timer, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Smarty Workout" },
      {
        name: "description",
        content: "Streaks, training minutes, favourite categories and consistency at a glance.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Progress,
});

type Row = {
  id: string;
  category: string;
  duration_min: number;
  status: string;
  is_favorite: boolean | null;
  created_at: string;
};

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function streaks(dates: string[]) {
  const set = new Set(dates);
  let current = 0;
  const cursor = new Date();
  // allow today or yesterday to keep a streak alive
  if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(dayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const sorted = Array.from(set).sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of sorted) {
    const cur = new Date(d);
    run = prev && (cur.getTime() - prev.getTime()) / 86400000 === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = cur;
  }
  return { current, longest };
}

function Stat({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Flame;
  label: string;
  value: string | number;
  to?: { filter: "all" | "completed" | "planned" | "favorites" | "scheduled" };
}) {
  const body = (
    <>
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </>
  );
  if (!to)
    return <div className="rounded-2xl border border-border bg-card p-4">{body}</div>;
  return (
    <Link
      to="/logbook"
      search={{ filter: to.filter, view: "list" as const }}
      className="block rounded-2xl border border-border bg-card p-4 transition hover:border-primary/60"
    >
      {body}
      <span className="mt-2 block text-[11px] font-semibold text-primary">View in logbook →</span>
    </Link>
  );
}


function Progress() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("workouts")
        .select("id,category,duration_min,status,is_favorite,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data as unknown as Row[]) ?? []);
    })();
  }, []);

  if (!rows)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const completed = rows.filter((r) => r.status === "completed");
  const now = Date.now();
  const week = completed.filter((r) => now - new Date(r.created_at).getTime() < 7 * 86400000);
  const month = completed.filter((r) => now - new Date(r.created_at).getTime() < 30 * 86400000);
  const minutes = completed.reduce((s, r) => s + (r.duration_min || 0), 0);
  const { current, longest } = streaks(completed.map((r) => r.created_at.slice(0, 10)));
  const favourites = rows.filter((r) => r.is_favorite).length;
  const counts = new Map<string, number>();
  for (const r of completed) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  const favourite = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="mb-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          Your training
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Progress</h1>
        <p className="mt-2 text-muted-foreground">
          Keep showing up — Smarty Coach is tracking it all.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={Activity}
          label="Completed"
          value={completed.length}
          to={{ filter: "completed" }}
        />
        <Stat
          icon={Activity}
          label="Not completed"
          value={rows.length - completed.length}
          to={{ filter: "planned" }}
        />
        <Stat icon={Timer} label="Training minutes" value={minutes} />
        <Stat icon={Flame} label="Current streak" value={`${current}d`} />
        <Stat icon={Trophy} label="Longest streak" value={`${longest}d`} />
        <Stat
          icon={Activity}
          label="This week"
          value={week.length}
          to={{ filter: "completed" }}
        />
        <Stat
          icon={Activity}
          label="Favourites"
          value={favourites}
          to={{ filter: "favorites" }}
        />
        <Stat icon={Trophy} label="Favourite category" value={favourite} />
        <Stat icon={Activity} label="Created" value={rows.length} to={{ filter: "all" }} />
      </div>


      <Button asChild className="mt-8">
        <Link to="/coach">Train now</Link>
      </Button>
    </div>
  );
}
