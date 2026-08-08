import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Star,
  Clock,
  Heart,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/logbook")({
  head: () => ({
    meta: [
      { title: "Logbook — your training history" },
      {
        name: "description",
        content:
          "Every workout Smarty Coach built for you, with feedback, mood, schedule and completion status.",
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
  difficulty_label: string | null;
  mood: string | null;
  status: string;
  is_favorite: boolean | null;
  scheduled_at: string | null;
  created_at: string;
  workout_feedback: Array<{ difficulty_rating: string | null; feeling: string | null }>;
};

type Filter = "all" | "completed" | "planned" | "favorites" | "scheduled";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "planned", label: "Not done" },
  { id: "scheduled", label: "Scheduled" },
  { id: "favorites", label: "Favourites" },
];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function WorkoutCard({ r }: { r: Row }) {
  const scheduled = r.scheduled_at ? new Date(r.scheduled_at) : null;
  return (
    <Link
      to="/workout/$workoutId"
      params={{ workoutId: r.id }}
      className="block rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          {r.category}
        </p>
        <span className="text-[11px] text-muted-foreground">
          {new Date(r.created_at).toLocaleDateString()}
        </span>
      </div>

      <p className="mt-1 flex items-center gap-2 font-bold leading-tight">
        <span className="min-w-0 flex-1">{r.name}</span>
        {r.is_favorite ? <Heart className="h-4 w-4 shrink-0 fill-primary text-primary" /> : null}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {r.duration_min} min
        </span>
        <span className="inline-flex items-center gap-0.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${
                i < r.difficulty_stars ? "fill-primary text-primary" : "text-muted-foreground/30"
              }`}
            />
          ))}
        </span>
        <span className="inline-flex items-center justify-end gap-1">
          {r.status === "completed" ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Completed
            </>
          ) : scheduled ? (
            <>
              <CalendarClock className="h-3.5 w-3.5" /> {scheduled.toLocaleDateString()}
            </>
          ) : (
            "Not done"
          )}
        </span>
      </div>

      {r.mood || r.workout_feedback?.[0]?.difficulty_rating ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {[
            r.mood ? `mood: ${r.mood}` : null,
            r.workout_feedback?.[0]?.difficulty_rating
              ? `felt ${r.workout_feedback[0]!.difficulty_rating}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
    </Link>
  );
}

function Calendar({ rows }: { rows: Row[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const src = r.scheduled_at ?? (r.status === "completed" ? r.created_at : null);
      if (!src) continue;
      const key = dayKey(new Date(src));
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return map;
  }, [rows]);

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  ];
  const today = dayKey(new Date());

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="font-bold">
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const key = dayKey(d);
          const items = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`min-h-14 rounded-xl border p-1 text-left text-[10px] ${
                key === today ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <span className="font-bold">{d.getDate()}</span>
              {items.slice(0, 2).map((r) => (
                <Link
                  key={r.id}
                  to="/workout/$workoutId"
                  params={{ workoutId: r.id }}
                  className={`mt-0.5 block truncate rounded px-1 ${
                    r.status === "completed"
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {r.name}
                </Link>
              ))}
              {items.length > 2 ? (
                <span className="block text-muted-foreground">+{items.length - 2}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Scheduled and completed workouts appear here. Schedule one from any workout page.
      </p>
    </div>
  );
}

function Logbook() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("workouts")
        .select(
          "id,name,category,duration_min,difficulty_stars,difficulty_label,mood,status,is_favorite,scheduled_at,created_at,workout_feedback(difficulty_rating,feeling)",
        )
        .order("created_at", { ascending: false })
        .limit(300);
      setRows((data as unknown as Row[]) ?? []);
    })();
  }, []);

  if (!rows)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const filtered = rows.filter((r) => {
    if (filter === "completed") return r.status === "completed";
    if (filter === "planned") return r.status !== "completed";
    if (filter === "favorites") return Boolean(r.is_favorite);
    if (filter === "scheduled") return Boolean(r.scheduled_at);
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-black">Logbook</h1>
      <p className="mt-1 text-muted-foreground">Your complete training history and schedule.</p>

      <div className="mt-5 flex gap-2">
        <Button
          variant={view === "list" ? "default" : "secondary"}
          className="h-11 flex-1 rounded-2xl"
          onClick={() => setView("list")}
        >
          List
        </Button>
        <Button
          variant={view === "calendar" ? "default" : "secondary"}
          className="h-11 flex-1 rounded-2xl"
          onClick={() => setView("calendar")}
        >
          Calendar
        </Button>
      </div>

      {view === "calendar" ? (
        <div className="mt-4">
          <Calendar rows={rows} />
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  filter === f.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">Nothing here yet.</p>
              <Button asChild className="mt-4">
                <Link to="/coach">Ask Smarty Coach</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {filtered.map((r) => (
                <li key={r.id}>
                  <WorkoutCard r={r} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
