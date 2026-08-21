import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, RefreshCw, CalendarCheck, Dumbbell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExerciseHTMLContent } from "@/components/workout/ExerciseHTMLContent";
import { ExerciseMediaProvider } from "@/components/workout/ExerciseMediaProvider";
import { uniqueTokenIds } from "@/lib/workout/tokens";
import {
  adminListWorkouts,
  adminGetWorkout,
  type AdminWorkoutRow,
  type AdminWorkoutFacets,
  type AdminWorkoutDetail,
} from "@/lib/admin.functions";
import { formatDateTime } from "@/lib/date-format";

type Props = {
  /** When set, the archive is scoped to one member (their full logbook). */
  userId?: string;
  title?: string;
};

const PAGE_SIZE = 25;

const emptyFacets: AdminWorkoutFacets = {
  categories: [],
  focuses: [],
  equipment: [],
  statuses: [],
};

export function AdminWorkoutsTab({ userId, title }: Props) {
  const listWorkouts = useServerFn(adminListWorkouts);
  const getWorkout = useServerFn(adminGetWorkout);

  const [rows, setRows] = useState<AdminWorkoutRow[]>([]);
  const [facets, setFacets] = useState<AdminWorkoutFacets>(emptyFacets);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [focus, setFocus] = useState("all");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [stars, setStars] = useState("all");
  const [equipment, setEquipment] = useState("all");
  const [duration, setDuration] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminWorkoutDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await listWorkouts({
      data: {
        ...(userId ? { userId } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
        category,
        focus,
        source,
        status,
        equipment,
        duration,
        ...(stars !== "all" ? { stars: Number(stars) } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        page,
        pageSize: PAGE_SIZE,
      },
    });
    if ("error" in r) {
      setError(r.error);
      setRows([]);
    } else {
      setError(null);
      setRows(r.workouts);
      setTotal(r.total);
      setFacets(r.facets);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, searchTerm, category, focus, source, status, equipment, duration, stars, from, to, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, category, focus, source, status, equipment, duration, stars, from, to]);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    void (async () => {
      const r = await getWorkout({ data: { id: openId } });
      setDetail("error" in r ? null : r.workout);
      setDetailLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const detailIds = useMemo(
    () =>
      detail
        ? uniqueTokenIds(
            [
              detail.description_html,
              detail.main_workout,
              detail.instructions_html,
              detail.tips_html,
            ]
              .filter(Boolean)
              .join(" "),
          )
        : [],
    [detail],
  );

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilters = useMemo(
    () =>
      [category, focus, source, status, stars, equipment, duration].filter((v) => v !== "all")
        .length +
      (from ? 1 : 0) +
      (to ? 1 : 0) +
      (searchTerm ? 1 : 0),
    [category, focus, source, status, stars, equipment, duration, from, to, searchTerm],
  );

  function resetFilters() {
    setCategory("all");
    setFocus("all");
    setSource("all");
    setStatus("all");
    setStars("all");
    setEquipment("all");
    setDuration("all");
    setFrom("");
    setTo("");
    setSearch("");
    setSearchTerm("");
  }

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden">
      {title && <h2 className="text-lg font-extrabold">{title}</h2>}

      <div className="min-w-0 rounded-2xl border-2 border-blue-400 bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearchTerm(search.trim())}
              placeholder="Search workout, member name or email"
              className="w-full pl-9 text-base sm:text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 sm:flex-none" onClick={() => setSearchTerm(search.trim())}>
              Search
            </Button>
            <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <FilterSelect
            label="Category"
            value={category}
            onChange={setCategory}
            options={facets.categories}
          />
          <FilterSelect label="Focus" value={focus} onChange={setFocus} options={facets.focuses} />
          <FilterSelect
            label="Source"
            value={source}
            onChange={setSource}
            options={[
              { value: "wod", label: "Workout of the Day" },
              { value: "request", label: "By request" },
            ]}
          />
          <FilterSelect
            label="Difficulty"
            value={stars}
            onChange={setStars}
            options={[
              { value: "1", label: "Beginner" },
              { value: "2", label: "Intermediate" },
              { value: "3", label: "Advanced" },
            ]}
          />
          <FilterSelect
            label="Duration"
            value={duration}
            onChange={setDuration}
            options={[
              { value: "short", label: "Up to 15 min" },
              { value: "medium", label: "16-35 min" },
              { value: "long", label: "Over 35 min" },
            ]}
          />
          <FilterSelect
            label="Equipment"
            value={equipment}
            onChange={setEquipment}
            options={facets.equipment}
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={facets.statuses}
          />
          <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1 lg:col-span-1">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                From
              </span>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-10 w-full"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                To
              </span>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-10 w-full"
              />
            </label>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {loading ? "Loading…" : `${total.toLocaleString()} workouts`}
            {activeFilters > 0 ? ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""}` : ""}
          </p>
          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              <X className="mr-1 h-4 w-4" /> Clear filters
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-muted-foreground">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No workouts found.</p>
      ) : (
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          {rows.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setOpenId(w.id)}
              className="w-full min-w-0 overflow-hidden rounded-2xl border-2 border-blue-400 bg-card p-4 text-left transition hover:bg-accent"
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <p className="min-w-0 break-words font-semibold">{w.name}</p>
                <Badge variant={w.is_wod ? "default" : "outline"} className="shrink-0 gap-1">
                  {w.is_wod ? (
                    <>
                      <CalendarCheck className="h-3 w-3" /> WOD
                    </>
                  ) : (
                    <>
                      <Dumbbell className="h-3 w-3" /> Request
                    </>
                  )}
                </Badge>
              </div>

              <MemberLine
                name={w.user_name}
                email={w.user_email}
                userId={w.user_id}
                createdAt={w.created_at}
                wodDate={w.is_wod ? w.wod_date : null}
              />

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="secondary">{w.category}</Badge>
                {w.focus && <Badge variant="outline">{w.focus}</Badge>}
                <Badge variant="outline">{w.duration_min} min</Badge>
                <Badge variant="outline">
                  {w.difficulty_label ?? `${w.difficulty_stars}★`}
                </Badge>
                <Badge variant="outline">{w.status}</Badge>
                {w.location && <Badge variant="outline">{w.location}</Badge>}
              </div>
              {w.equipment.length > 0 && (
                <p className="mt-2 break-words text-xs text-muted-foreground">
                  Equipment: {w.equipment.join(", ")}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages || loading}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={Boolean(openId)} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[90dvh] max-w-[720px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-6 text-left text-base">
              {detail?.name ?? "Workout"}
            </DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <ExerciseMediaProvider ids={detailIds}>
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{detail.category}</Badge>
                  {detail.focus && <Badge variant="outline">{detail.focus}</Badge>}
                  <Badge variant="outline">{detail.duration_min} min</Badge>
                  <Badge variant="outline">
                    {detail.difficulty_label ?? `${detail.difficulty_stars}★`}
                  </Badge>
                  <Badge variant={detail.is_wod ? "default" : "outline"}>
                    {detail.is_wod ? "Workout of the Day" : "By request"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(detail.created_at)} ·{" "}
                  {detail.user_name || detail.user_email || "Unknown member"}
                </p>
                {detail.description_html && (
                  <Section title="Description" html={detail.description_html} />
                )}
                {detail.main_workout && <Section title="Workout" html={detail.main_workout} />}
                {detail.instructions_html && (
                  <Section title="Instructions" html={detail.instructions_html} />
                )}
                {detail.tips_html && <Section title="Tips" html={detail.tips_html} />}
              </div>
            </ExerciseMediaProvider>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, html }: { title: string; html: string }) {
  return (
    <div className="rounded-2xl border-2 border-blue-400 bg-card p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ExerciseHTMLContent html={html} onOpenExercise={() => {}} />
    </div>
  );
}

type Option = string | { value: string; label: string };

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="all">All</SelectItem>
          {normalized.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
