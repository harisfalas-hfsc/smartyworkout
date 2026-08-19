// Logbook derivations, kept out of the route so they can be tested.
// The route is composition only: it must not decide what "planned" means.

import { scheduleTone } from "@/lib/date-format";

export type LogbookRow = {
  id: string;
  name: string;
  status: string;
  is_favorite: boolean | null;
  is_wod: boolean | null;
  created_by: string | null;
  equipment: string[] | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type LogbookFilter = "completed" | "planned" | "favorites" | "scheduled";

export const LOGBOOK_FILTERS: { id: LogbookFilter; label: string }[] = [
  { id: "completed", label: "Completed" },
  { id: "planned", label: "Not done" },
  { id: "scheduled", label: "Scheduled" },
  { id: "favorites", label: "Favourites" },
];

export const LOGBOOK_FILTER_IDS = LOGBOOK_FILTERS.map((f) => f.id) as string[];

export function parseFilters(value: string | null | undefined): LogbookFilter[] {
  return String(value ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter((f) => LOGBOOK_FILTER_IDS.includes(f)) as LogbookFilter[];
}

export function matchesFilter(row: LogbookRow, filter: LogbookFilter): boolean {
  if (filter === "completed") return row.status === "completed";
  if (filter === "planned") return row.status !== "completed";
  if (filter === "favorites") return Boolean(row.is_favorite);
  return Boolean(row.scheduled_at);
}

/** Filters combine as "any of"; equipment narrows the result. */
export function filterRows<T extends LogbookRow>(
  rows: readonly T[],
  options: { filters: LogbookFilter[]; equipment?: string },
): T[] {
  const byStatus = options.filters.length
    ? rows.filter((r) => options.filters.some((f) => matchesFilter(r, f)))
    : [...rows];
  const equip = options.equipment ?? "all";
  return equip === "all" ? byStatus : byStatus.filter((r) => (r.equipment ?? []).includes(equip));
}

export function equipmentOptions(rows: readonly LogbookRow[]): string[] {
  return Array.from(new Set(rows.flatMap((r) => r.equipment ?? []).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Which calendar day a workout belongs to: when you plan it, else when it happened. */
export function anchorDate(row: LogbookRow): Date {
  return new Date(row.scheduled_at ?? row.completed_at ?? row.created_at);
}

export function sourceLabel(row: LogbookRow): string {
  if (row.is_wod) return "Workout of the Day";
  if (row.created_by === "member" || row.created_by === "community") return "Community copy";
  return "Smarty Coach";
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Colour of the dot a workout gets in the calendar. */
export function dotClass(row: LogbookRow): string {
  if (row.status === "completed") return "bg-primary";
  const tone = scheduleTone(row.scheduled_at, false);
  if (tone === "missed") return "bg-red-500";
  if (tone === "today") return "bg-blue-500";
  if (tone === "upcoming") return "bg-emerald-500";
  return "bg-muted-foreground/50";
}

export function filterMenuLabel(filters: LogbookFilter[], equipment: string): string {
  const base =
    filters.length === 0
      ? "All workouts"
      : filters.length === 1
        ? (LOGBOOK_FILTERS.find((f) => f.id === filters[0])?.label ?? "All workouts")
        : `${filters.length} filters`;
  return equipment === "all" ? base : `${base} · ${equipment}`;
}
