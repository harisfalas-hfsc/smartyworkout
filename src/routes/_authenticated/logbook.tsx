import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineData } from "@/lib/offline/useOfflineData";
import { CachedNotice } from "@/components/offline/CachedNotice";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { setWorkoutMeta } from "@/lib/coach.functions";
import { toast } from "sonner";
import { MAX_STARS, normalizeStars } from "@/lib/workout/spec";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Star,
  Clock,
  Heart,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListFilter,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type Filter = "completed" | "planned" | "favorites" | "scheduled";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "completed", label: "Completed" },
  { id: "planned", label: "Not done" },
  { id: "scheduled", label: "Scheduled" },
  { id: "favorites", label: "Favourites" },
];

const FILTER_IDS = FILTERS.map((f) => f.id) as string[];

type LogSearch = { filter: string; view: "list" | "calendar" };

export const Route = createFileRoute("/_authenticated/logbook")({
  validateSearch: (search: Record<string, unknown>): LogSearch => ({
    filter: String(search["filter"] ?? "all"),
    view: search["view"] === "calendar" ? ("calendar" as const) : ("list" as const),
  }),
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
  completed_at: string | null;
  created_at: string;
  workout_feedback: Array<{ difficulty_rating: string | null; feeling: string | null }>;
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Which calendar day a workout belongs to: when you plan to do it, else when it happened. */
function anchorDate(r: Row) {
  return new Date(r.scheduled_at ?? r.completed_at ?? r.created_at);
}

function matches(r: Row, f: Filter) {
  if (f === "completed") return r.status === "completed";
  if (f === "planned") return r.status !== "completed";
  if (f === "favorites") return Boolean(r.is_favorite);
  return Boolean(r.scheduled_at);
}

function WorkoutCard({
  r,
  onToggleFavorite,
}: {
  r: Row;
  onToggleFavorite?: (id: string, next: boolean) => void;
}) {
  const scheduled = r.scheduled_at ? new Date(r.scheduled_at) : null;
  return (
    <div className="relative">
      <Link
        to="/workout/$workoutId"
        params={{ workoutId: r.id }}
        className="block rounded-2xl border-2 border-blue-400 bg-card p-4 transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
      >
        <div className="flex items-center justify-between gap-2 pr-10">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {r.category}
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {new Date(r.created_at).toLocaleDateString()}
          </span>
        </div>

        <p className="mt-1 pr-10 font-bold leading-tight">{r.name}</p>

        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {r.duration_min} min
          </span>
          <span className="inline-flex items-center gap-0.5">
            {Array.from({ length: MAX_STARS }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < normalizeStars(r.difficulty_stars)
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </span>
          <span className="inline-flex items-center justify-end gap-1">
            {r.status === "completed" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" /> Completed
              </>
            ) : scheduled ? (
              <>
                <CalendarClock className="h-3.5 w-3.5 shrink-0" /> {scheduled.toLocaleDateString()}
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

      <button
        type="button"
        aria-label={r.is_favorite ? "Remove from favourites" : "Mark as favourite"}
        aria-pressed={Boolean(r.is_favorite)}
        onClick={() => onToggleFavorite?.(r.id, !r.is_favorite)}
        className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
      >
        <Heart className={`h-5 w-5 ${r.is_favorite ? "fill-primary text-primary" : ""}`} />
      </button>
    </div>
  );
}

function Calendar({
  rows,
  onToggleFavorite,
}: {
  rows: Row[];
  onToggleFavorite: (id: string, next: boolean) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string>(() => dayKey(new Date()));

  const byDay = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const key = dayKey(anchorDate(r));
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return map;
  }, [rows]);

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from(
      { length: days },
      (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1),
    ),
  ];
  const today = dayKey(new Date());
  const selectedRows = byDay.get(selected) ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/40 bg-card p-4">
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
            const isSelected = key === selected;
            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelected(key)}
                className={`min-h-14 rounded-xl border p-1 text-left text-[10px] transition ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : key === today
                      ? "border-primary/60"
                      : "border-border hover:border-primary/40"
                }`}
              >
                <span className="font-bold">{d.getDate()}</span>
                <span className="mt-1 flex flex-wrap gap-0.5">
                  {items.slice(0, 4).map((r) => (
                    <span
                      key={r.id}
                      className={`h-1.5 w-1.5 rounded-full ${
                        r.status === "completed"
                          ? "bg-primary"
                          : r.scheduled_at
                            ? "bg-sky-500"
                            : "bg-muted-foreground/50"
                      }`}
                    />
                  ))}
                  {items.length > 4 ? (
                    <span className="text-muted-foreground">+{items.length - 4}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" /> Completed
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-500" /> Scheduled
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Created, not done
          </span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">
          {new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        {selectedRows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Nothing on this day.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {selectedRows.map((r) => (
              <li key={r.id}>
                <WorkoutCard r={r} onToggleFavorite={onToggleFavorite} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Logbook() {
  const { filter, view } = Route.useSearch();
  const navigate = useNavigate({ from: "/logbook" });
  const [rows, setRows] = useState<Row[] | null>(null);
  const saveMeta = useServerFn(setWorkoutMeta);
  const { user } = useAuth();

  const loadRows = useCallback(async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select(
        "id,name,category,duration_min,difficulty_stars,difficulty_label,mood,status,is_favorite,scheduled_at,completed_at,created_at,workout_feedback(difficulty_rating,feeling)",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return (data as unknown as Row[]) ?? [];
  }, []);

  const cached = useOfflineData<Row[]>("logbook:list", loadRows, { userId: user?.id ?? null });

  const active = useMemo(
    () => filter.split(",").filter((f: string) => FILTER_IDS.includes(f)) as Filter[],
    [filter],
  );

  useEffect(() => {
    if (cached.data) setRows(cached.data);
    else if (!cached.loading) setRows([]);
  }, [cached.data, cached.loading]);

  async function toggleFavorite(id: string, next: boolean) {
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, is_favorite: next } : r)) ?? prev);
    try {
      await saveMeta({ data: { workoutId: id, is_favorite: next } });
    } catch {
      setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, is_favorite: !next } : r)) ?? prev);
      toast.error("Could not save that.");
    }
  }

  function setActive(next: Filter[]) {
    const value = next.length ? next.join(",") : "all";
    void navigate({ search: (p: LogSearch) => ({ ...p, filter: value }) });
  }

  if (!rows)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  // Multiple filters combine as "any of" — pick favourites + scheduled to see both.
  const filtered = active.length ? rows.filter((r) => active.some((f) => matches(r, f))) : rows;

  const label =
    active.length === 0
      ? "All workouts"
      : active.length === 1
        ? FILTERS.find((f) => f.id === active[0])!.label
        : `${active.length} filters`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <CachedNotice savedAt={cached.savedAt} show={cached.fromCache} />
      <PageHeader
        className="mb-2"
        eyebrow="Your history"
        title="Logbook"
        subtitle="Every workout you created — completed, still to do, or scheduled."
      />

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button
          variant={view === "list" ? "default" : "secondary"}
          className="h-11 w-full rounded-2xl"
          onClick={() => navigate({ search: (p: LogSearch) => ({ ...p, view: "list" as const }) })}
        >
          List
        </Button>
        <Button
          variant={view === "calendar" ? "default" : "secondary"}
          className="h-11 w-full rounded-2xl"
          onClick={() =>
            navigate({ search: (p: LogSearch) => ({ ...p, view: "calendar" as const }) })
          }
        >
          Calendar
        </Button>
      </div>

      {view === "calendar" ? (
        <div className="mt-4">
          <Calendar rows={rows} onToggleFavorite={toggleFavorite} />
        </div>
      ) : (
        <>
          <div className="mt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 w-full justify-between rounded-2xl">
                  <span className="inline-flex items-center gap-2 truncate">
                    <ListFilter className="h-4 w-4 shrink-0" />
                    {label}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{filtered.length}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[min(20rem,90vw)]">
                <DropdownMenuLabel>Show</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={active.length === 0}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => setActive([])}
                  className="h-11"
                >
                  All workouts · {rows.length}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {FILTERS.map((f) => (
                  <DropdownMenuCheckboxItem
                    key={f.id}
                    checked={active.includes(f.id)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(checked) =>
                      setActive(
                        checked ? [...active, f.id] : active.filter((a) => a !== f.id),
                      )
                    }
                    className="h-11"
                  >
                    {f.label} · {rows.filter((r) => matches(r, f.id)).length}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">
                {active.length
                  ? "No workouts match this filter yet."
                  : "You haven't created a workout yet."}
              </p>
              <Button asChild className="mt-4 h-11 rounded-2xl">
                <Link to="/coach">Create your workout</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {filtered.map((r) => (
                <li key={r.id}>
                  <WorkoutCard r={r} onToggleFavorite={toggleFavorite} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
