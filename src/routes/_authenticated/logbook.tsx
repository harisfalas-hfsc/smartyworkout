import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineData } from "@/lib/offline/useOfflineData";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import { CachedNotice } from "@/components/offline/CachedNotice";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { setWorkoutMeta, setWorkoutStatus } from "@/lib/coach.functions";
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
  CalendarDays,
  Dumbbell,
  TrendingUp,
  CalendarRange,
  CalendarCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PeriodTrendChart } from "@/components/performance/PeriodTrendChart";
import {
  formatDate,
  formatMonthYear,
  formatWeekdayLong,
  scheduleTone,
  SCHEDULE_TONE_DOT,
  SCHEDULE_TONE_LABEL,
  SCHEDULE_TONE_TEXT,
} from "@/lib/date-format";
import {
  LOGBOOK_FILTERS as FILTERS,
  anchorDate,
  dayKey,
  equipmentOptions as equipmentOptionsOf,
  filterMenuLabel,
  filterRows,
  matchesFilter as matches,
  parseFilters,
  sourceLabel,
  type LogbookFilter as Filter,
} from "@/lib/logbook/rows";
import { equipmentBadges } from "@/lib/format/labels";
import { getSessionLoads } from "@/lib/performance.functions";
import { ProgressSection } from "@/components/progress/ProgressSection";

type View = "list" | "calendar" | "progress";
type LogSearch = { filter: string; view: View; equip?: string };


export const Route = createFileRoute("/_authenticated/logbook")({
  validateSearch: (search: Record<string, unknown>): LogSearch => ({
    filter: String(search["filter"] ?? "all"),
    equip: String(search["equip"] ?? "all"),
    view:
      search["view"] === "calendar" || search["view"] === "scheduled"
        ? ("calendar" as const)
        : search["view"] === "progress"
          ? ("progress" as const)
          : ("list" as const),

  }),
  head: () => ({
    meta: [
      { title: "Logbook | Your training history" },
      {
        name: "description",
        content:
          "Your complete training record, bringing workouts, performance, progress, records and planning together.",
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
  is_wod: boolean | null;
  created_by: string | null;
  equipment: string[] | null;
  workout_feedback: Array<{ difficulty_rating: string | null; feeling: string | null }>;
};

/** Colour of the dot a workout gets in the calendar. */
function dotClass(r: Row) {
  if (r.status === "completed") return "bg-primary";
  const tone = scheduleTone(r.scheduled_at, false);
  if (tone) return SCHEDULE_TONE_DOT[tone];
  return "bg-muted-foreground/50";
}

function StatusLine({ r }: { r: Row }) {
  if (r.status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-primary">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Completed {formatDate(r.completed_at)}
      </span>
    );
  }
  const tone = scheduleTone(r.scheduled_at, false);
  if (tone) {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold ${SCHEDULE_TONE_TEXT[tone]}`}>
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
        {SCHEDULE_TONE_LABEL[tone]} {formatDate(r.scheduled_at)}
      </span>
    );
  }
  return <span className="text-muted-foreground">Not done</span>;
}

function WorkoutCard({
  r,
  onToggleFavorite,
  actions,
}: {
  r: Row;
  onToggleFavorite?: (id: string, next: boolean) => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-blue-400 bg-card">
      <Link
        to="/workout/$workoutId"
        params={{ workoutId: r.id }}
        className="block flex-1 p-4 transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
      >
        <div className="flex items-center justify-between gap-2 pr-10">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {r.category}
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            Created {formatDate(r.created_at)}
          </span>
        </div>

        <p className="mt-1 pr-10 font-bold leading-tight">{r.name}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sourceLabel(r)}</p>

        <div className="mt-2 grid grid-cols-3 items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
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
          <span className="justify-self-end text-right">
            <StatusLine r={r} />
          </span>
        </div>

        {r.equipment?.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {equipmentBadges(r.equipment).shown.map((e) => (
              <span
                key={e}
                className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-primary"
              >
                {e}
              </span>
            ))}
            {equipmentBadges(r.equipment).overflow ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                +{equipmentBadges(r.equipment).overflow}
              </span>
            ) : null}
          </div>
        ) : null}

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

      {actions ? <div className="px-4 pb-4">{actions}</div> : null}

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

function DayActions({
  r,
  onComplete,
  onReschedule,
  onClear,
  busy,
}: {
  r: Row;
  onComplete: (id: string) => void;
  onReschedule: (id: string, iso: string) => void;
  onClear: (id: string) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() =>
    r.scheduled_at ? new Date(r.scheduled_at).toISOString().slice(0, 16) : "",
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 items-center">
        <Button
          variant="ghost"
          className="h-auto min-w-0 rounded-none px-1 py-1 text-xs font-semibold text-primary hover:bg-transparent hover:text-primary/80"
          disabled={busy}
          onClick={() => onComplete(r.id)}
        >
          Mark done
        </Button>
        <Button
          variant="ghost"
          className="h-auto min-w-0 rounded-none px-1 py-1 text-xs font-semibold text-primary hover:bg-transparent hover:text-primary/80"
          disabled={busy}
          onClick={() => setOpen((v) => !v)}
        >
          Reschedule
        </Button>
        <Button
          variant="ghost"
          className="h-auto min-w-0 rounded-none px-1 py-1 text-xs font-semibold text-destructive hover:bg-transparent hover:text-destructive/80"
          disabled={busy || !r.scheduled_at}
          onClick={() => onClear(r.id)}
        >
          Remove
        </Button>
      </div>
      {open ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="datetime-local"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <Button
            className="h-11 w-full rounded-xl sm:w-auto sm:px-6"
            disabled={busy || !draft}
            onClick={() => {
              onReschedule(r.id, new Date(draft).toISOString());
              setOpen(false);
            }}
          >
            Save date
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function MonthGrid({
  cursor,
  byDay,
  selected,
  onSelect,
  onlyScheduled,
  inRange,
}: {
  cursor: Date;
  byDay: Map<string, Row[]>;
  selected: string;
  onSelect: (key: string) => void;
  onlyScheduled?: boolean;
  /** When given, highlights every day of the selected period. */
  inRange?: (key: string) => boolean;
}) {

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

  return (
    <>
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
          const isSelected = inRange ? inRange(key) : key === selected;
          const dim = onlyScheduled && items.length === 0;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelect(key)}
              className={`min-h-14 rounded-xl border p-1 text-left text-[10px] transition ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : key === today
                    ? "border-primary/60"
                    : "border-border hover:border-primary/40"
              } ${dim ? "opacity-40" : ""}`}
            >
              <span className="font-bold">{d.getDate()}</span>
              <span className="mt-1 flex flex-wrap gap-0.5">
                {items.slice(0, 4).map((r) => (
                  <span key={r.id} className={`h-1.5 w-1.5 rounded-full ${dotClass(r)}`} />
                ))}
                {items.length > 4 ? (
                  <span className="text-muted-foreground">+{items.length - 4}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-primary" /> Completed
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-blue-500" /> Scheduled today
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Scheduled ahead
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-red-500" /> Missed
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Created, not done
      </span>
    </div>
  );
}

type SessionLoad = {
  workoutId: string;
  attempt: number;
  performedAt: string;
  rpe: number | null;
  strengthLoad: number | null;
  conditioningLoad: number | null;
  durationSeconds: number | null;
};

type PeriodTotals = {
  sessions: number;
  strength: number | null;
  conditioning: number | null;
  avgRpe: number | null;
  minutes: number | null;
};

/** Adds up only what was actually recorded — nothing is estimated. */
function summariseSessions(list: SessionLoad[]): PeriodTotals {
  const sum = (pick: (s: SessionLoad) => number | null) => {
    const values = list.map(pick).filter((v): v is number => v !== null);
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  };
  const strength = sum((s) => s.strengthLoad);
  const conditioning = sum((s) => s.conditioningLoad);
  const rpes = list.map((s) => s.rpe).filter((v): v is number => v !== null);
  const seconds = sum((s) => s.durationSeconds);
  return {
    sessions: list.length,
    strength,
    conditioning,
    avgRpe: rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null,
    minutes: seconds === null ? null : Math.round(seconds / 60),
  };
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function PeriodSummary({
  title,
  totals,
  completedCount,
  sessions,
  start,
  end,
  onClear,
}: {
  title: string;
  totals: PeriodTotals;
  completedCount: number;
  sessions: SessionLoad[];
  start: string;
  end: string;
  onClear?: () => void;
}) {
  const [view, setView] = useState<"numbers" | "graph">("numbers");
  const n = (v: number | null, suffix = "") =>
    v === null ? "Not logged" : `${Math.round(v).toLocaleString()}${suffix}`;
  return (
    <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold">{title}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView(view === "numbers" ? "graph" : "numbers")}
          >
            {view === "numbers" ? "View as graph" : "View numbers"}
          </Button>
          {onClear ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Back to one day
            </Button>
          ) : null}
        </div>
      </div>
      {view === "numbers" ? (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Tile label="Completed" value={String(completedCount)} />
          <Tile label="Sessions logged" value={String(totals.sessions)} />
          <Tile label="Strength volume" value={n(totals.strength, " kg")} />
          <Tile label="Conditioning work" value={n(totals.conditioning, " sec")} />
          <Tile label="Average RPE" value={totals.avgRpe === null ? "Not logged" : `${totals.avgRpe} / 10`} />
          <Tile label="Recorded duration" value={n(totals.minutes, " min")} />
        </div>
      ) : (
        <div className="mt-3">
          <PeriodTrendChart sessions={sessions} start={start} end={end} />
        </div>
      )}
    </div>
  );
}


function CalendarView({
  rows,
  sessions,
  onToggleFavorite,
  actions,
  busy,
}: {
  rows: Row[];
  sessions: SessionLoad[];
  onToggleFavorite: (id: string, next: boolean) => void;
  actions: {
    complete: (id: string) => void;
    reschedule: (id: string, iso: string) => void;
    clear: (id: string) => void;
  };
  busy: boolean;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [start, setStart] = useState<string>(() => dayKey(new Date()));
  const [end, setEnd] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<"day" | "period" | "scheduled">("day");

  const byDay = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const key = dayKey(anchorDate(r));
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return map;
  }, [rows]);

  function pick(key: string) {
    if (selectionMode === "day") {
      setStart(key);
      setEnd(null);
      return;
    }
    if (end) {
      setStart(key);
      setEnd(null);
      return;
    }
    if (key < start) {
      setEnd(start);
      setStart(key);
    } else if (key === start) {
      setEnd(null);
    } else {
      setEnd(key);
    }
  }

  const inRange = (key: string) => (end ? key >= start && key <= end : key === start);
  const periodRows = rows.filter((r) => inRange(dayKey(anchorDate(r))));
  const periodSessions = sessions.filter((s) => inRange(dayKey(new Date(s.performedAt))));
  const totals = summariseSessions(periodSessions);
  const completedCount = periodRows.filter((r) => r.status === "completed").length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
        <div className="mb-3 grid grid-cols-3 gap-2" aria-label="Calendar selection mode">
          {([
            { id: "day", label: "Day", Icon: CalendarDays },
            { id: "period", label: "Dates", Icon: CalendarRange },
            { id: "scheduled", label: "Scheduled", Icon: CalendarCheck },
          ] as const).map(({ id, label, Icon }) => (
            <Button
              key={id}
              type="button"
              variant={selectionMode === id ? "default" : "secondary"}
              className="h-11 w-full min-w-0 rounded-2xl px-2"
              onClick={() => { setSelectionMode(id); setEnd(null); }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate text-xs sm:text-sm">{label}</span>
            </Button>
          ))}
        </div>
        {selectionMode === "scheduled" ? null : (
        <>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="font-bold">{formatMonthYear(cursor)}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <MonthGrid
          cursor={cursor}
          byDay={byDay}
          selected={start}
          onSelect={pick}
          inRange={inRange}
        />
        <Legend />
        <p className="mt-2 text-sm font-medium text-foreground">
          {selectionMode === "day"
            ? "Select any day to see its workouts, recorded load, duration, and RPE."
            : end
              ? "Range selected. Select another day to start a new range."
              : "Select the first day, then select the last day of the range."}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">A blue filled cell is selected. A blue outline without fill marks today.</p>
        </>
        )}
      </div>

      {selectionMode === "scheduled" ? (
        <ScheduledView rows={rows} onToggleFavorite={onToggleFavorite} actions={actions} busy={busy} />
      ) : (
      <>
      <PeriodSummary
        title={
          end
            ? `${formatDate(`${start}T00:00:00`)} → ${formatDate(`${end}T00:00:00`)}`
            : formatWeekdayLong(new Date(`${start}T00:00:00`))
        }
        totals={totals}
        completedCount={completedCount}
        sessions={periodSessions}
        start={start}
        end={end ?? start}
        onClear={end ? () => { setSelectionMode("day"); setEnd(null); } : undefined}
      />

      {periodRows.length === 0 ? (
        <div className="rounded-2xl border-2 border-blue-400 bg-card p-6 text-center text-sm text-muted-foreground">
          Nothing on {end ? "these days" : "this day"}.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {periodRows.map((r) => (
            <li key={r.id}>
              <WorkoutCard
                r={r}
                onToggleFavorite={onToggleFavorite}
                actions={
                  <DayActions
                    r={r}
                    busy={busy}
                    onComplete={actions.complete}
                    onReschedule={actions.reschedule}
                    onClear={actions.clear}
                  />
                }
              />
            </li>
          ))}
        </ul>
      )}
      </>
      )}
    </div>
  );
}


/** Scheduled-only calendar: hops month by month through everything you planned. */
function ScheduledView({
  rows,
  onToggleFavorite,
  actions,
  busy,
}: {
  rows: Row[];
  onToggleFavorite: (id: string, next: boolean) => void;
  actions: {
    complete: (id: string) => void;
    reschedule: (id: string, iso: string) => void;
    clear: (id: string) => void;
  };
  busy: boolean;
}) {
  const scheduled = useMemo(
    () =>
      rows
        .filter((r) => Boolean(r.scheduled_at))
        .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime()),
    [rows],
  );

  const months = useMemo(() => {
    const keys = new Set<string>();
    for (const r of scheduled) {
      const d = new Date(r.scheduled_at!);
      keys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return [...keys].sort();
  }, [scheduled]);

  const nowKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [index, setIndex] = useState(() => {
    const i = months.findIndex((m) => m >= nowKey);
    return i === -1 ? Math.max(months.length - 1, 0) : i;
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of scheduled) {
      const key = dayKey(new Date(r.scheduled_at!));
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return map;
  }, [scheduled]);

  if (!months.length) {
    return (
      <div className="rounded-2xl border-2 border-blue-400 bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Nothing scheduled yet. Open a workout and pick a date to plan it.
        </p>
        <Button asChild className="mt-4 h-11 rounded-2xl">
          <Link to="/coach">Create your workout</Link>
        </Button>
      </div>
    );
  }

  const safeIndex = Math.min(index, months.length - 1);
  const monthKey = months[safeIndex]!;
  const [y, m] = monthKey.split("-").map(Number);
  const cursor = new Date(y!, m! - 1, 1);
  const monthRows = scheduled.filter((r) => {
    const d = new Date(r.scheduled_at!);
    return d.getFullYear() === y && d.getMonth() === m! - 1;
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous scheduled month"
            disabled={safeIndex === 0}
            onClick={() => setIndex(safeIndex - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="font-bold">{formatMonthYear(cursor)}</p>
            <p className="text-[11px] text-muted-foreground">
              {monthRows.length} workout{monthRows.length === 1 ? "" : "s"} scheduled
            </p>
            <p className="text-[11px] text-muted-foreground">
              Month {safeIndex + 1} of {months.length} containing scheduled workouts
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next scheduled month"
            disabled={safeIndex >= months.length - 1}
            onClick={() => setIndex(safeIndex + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {months.length > 1 ? (
          <label className="mt-3 block text-xs font-semibold text-muted-foreground">
            Jump to a scheduled month
            <select
              value={safeIndex}
              onChange={(event) => setIndex(Number(event.target.value))}
              className="mt-1 h-11 w-full rounded-xl border-2 border-primary bg-background px-3 text-sm font-semibold text-foreground"
            >
              {months.map((key, monthIndex) => {
                const [year, month] = key.split("-").map(Number);
                return (
                  <option key={key} value={monthIndex}>
                    {formatMonthYear(new Date(year!, month! - 1, 1))}
                  </option>
                );
              })}
            </select>
          </label>
        ) : null}

        <MonthGrid cursor={cursor} byDay={byDay} selected="" onSelect={() => {}} onlyScheduled />
        <Legend />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {monthRows.map((r) => (
          <li key={r.id}>
            <WorkoutCard
              r={r}
              onToggleFavorite={onToggleFavorite}
              actions={
                <DayActions
                  r={r}
                  busy={busy}
                  onComplete={actions.complete}
                  onReschedule={actions.reschedule}
                  onClear={actions.clear}
                />
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Logbook() {
  const { filter, view } = Route.useSearch();
  const equip = Route.useSearch().equip ?? "all";
  const navigate = useNavigate({ from: "/logbook" });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const saveMeta = useServerFn(setWorkoutMeta);
  const saveStatus = useServerFn(setWorkoutStatus);
  const { user } = useAuth();

  const loadRows = useCallback(async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select(
        "id,name,category,duration_min,difficulty_stars,difficulty_label,mood,status,is_favorite,scheduled_at,completed_at,created_at,is_wod,created_by,equipment,workout_feedback(difficulty_rating,feeling)",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return (data as unknown as Row[]) ?? [];
  }, []);

  const cached = useOfflineData<Row[]>("logbook:list", loadRows, {
    userId: user?.id ?? null,
    enabled: !!user?.id,
  });
  const online = useOnlineStatus();
  const noSavedCopy = !online && cached.error !== null;

  const active = useMemo(() => parseFilters(filter), [filter]);

  // Logged sessions power the calendar's day/period training-load totals.
  const fetchSessionLoads = useServerFn(getSessionLoads);
  const [sessions, setSessions] = useState<SessionLoad[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    void fetchSessionLoads({ data: {} })
      .then((res) => {
        if (alive) setSessions(res.sessions as SessionLoad[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user?.id, fetchSessionLoads]);

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

  async function patchStatus(
    id: string,
    patch: { status?: string; scheduled_at?: string | null },
    optimistic: Partial<Row>,
    message: string,
  ) {
    if (busy) return;
    setBusy(true);
    const before = rows;
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, ...optimistic } : r)) ?? prev);
    try {
      await saveStatus({ data: { workoutId: id, ...patch } });
      toast.success(message);
    } catch (e) {
      setRows(before ?? null);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const actions = {
    complete: (id: string) =>
      void patchStatus(
        id,
        { status: "completed", scheduled_at: null },
        { status: "completed", scheduled_at: null, completed_at: new Date().toISOString() },
        "Marked as completed.",
      ),
    reschedule: (id: string, iso: string) =>
      void patchStatus(
        id,
        { status: "scheduled", scheduled_at: iso },
        { status: "scheduled", scheduled_at: iso },
        "Rescheduled.",
      ),
    clear: (id: string) =>
      void patchStatus(
        id,
        { status: "created", scheduled_at: null },
        { status: "created", scheduled_at: null },
        "Removed from the schedule.",
      ),
  };

  function setEquip(next: string) {
    void navigate({ search: (p: LogSearch) => ({ ...p, equip: next }) });
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
  const filtered = filterRows(rows, { filters: active, equipment: equip });
  const equipmentOptions = equipmentOptionsOf(rows);
  const menuLabel = filterMenuLabel(active, equip);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <CachedNotice savedAt={cached.savedAt} show={cached.fromCache} />
      <PageHeader
        className="mb-2"
        eyebrow="Your history"
        title="Logbook"
        subtitle="Your complete training record, with workouts, performance, progress, records and planning in one place."
      />

      {/* Three views, one line on every width. */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {([
          { id: "list", label: "Workouts", Icon: Dumbbell },
          { id: "calendar", label: "Calendar", Icon: CalendarDays },
          { id: "progress", label: "Progress", Icon: TrendingUp },
        ] as const).map(({ id, label, Icon }) => (
          <Button
            key={id}
            variant={view === id ? "default" : "secondary"}
            className="h-11 w-full min-w-0 rounded-2xl px-2"
            onClick={() => navigate({ search: (p: LogSearch) => ({ ...p, view: id }) })}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate text-xs sm:text-sm">{label}</span>
          </Button>
        ))}
      </div>

      {view === "progress" ? (
        <div className="mt-4">
          <ProgressSection />
        </div>
      ) : view === "calendar" ? (
        <div className="mt-4">
          <CalendarView
            rows={rows}
            sessions={sessions}
            onToggleFavorite={toggleFavorite}
            actions={actions}
            busy={busy}
          />
        </div>
      ) : (
        <>
          <div className="mt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 w-full justify-between rounded-2xl">
                  <span className="inline-flex items-center gap-2 truncate">
                    <ListFilter className="h-4 w-4 shrink-0" />
                    {menuLabel}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{filtered.length}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[min(20rem,90vw)]">
                <DropdownMenuLabel>Show</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={active.length === 0}
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
                    onCheckedChange={(checked) =>
                      setActive(checked ? [...active, f.id] : active.filter((a) => a !== f.id))
                    }
                    className="h-11"
                  >
                    {f.label} · {rows.filter((r) => matches(r, f.id)).length}
                  </DropdownMenuCheckboxItem>
                ))}
                {equipmentOptions.length ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Equipment</DropdownMenuLabel>
                    <DropdownMenuCheckboxItem
                      checked={equip === "all"}
                      onCheckedChange={() => setEquip("all")}
                      className="h-11"
                    >
                      Any equipment
                    </DropdownMenuCheckboxItem>
                    {equipmentOptions.map((e) => (
                      <DropdownMenuCheckboxItem
                        key={e}
                        checked={equip === e}
                        onCheckedChange={(checked) => setEquip(checked ? e : "all")}
                        className="h-11 capitalize"
                      >
                        {e} · {rows.filter((r) => (r.equipment ?? []).includes(e)).length}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-6 rounded-2xl border-2 border-blue-400 bg-card p-8 text-center">
              <p className="text-muted-foreground">
                {noSavedCopy
                  ? "You're offline and this device has no saved copy of your logbook yet. Connect to the internet once and it will be stored here."
                  : active.length
                    ? "No workouts match this filter yet."
                    : "You haven't created a workout yet."}
              </p>
              {!noSavedCopy && (
                <Button asChild className="mt-4 h-11 rounded-2xl">
                  <Link to="/coach">Create your workout</Link>
                </Button>
              )}
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
