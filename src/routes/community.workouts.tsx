import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommunityWorkoutCard } from "@/components/community/CommunityWorkoutCard";
import {
  CommunityGateDialog,
  useCommunityAccess,
} from "@/components/community/useCommunityAccess";
import { fetchBadgesFor, fetchCategories, fetchCommunityWorkouts } from "@/lib/community-queries";
import { startSharedWorkout } from "@/lib/community.functions";
import { SORTS, type CommunityBadge, type CommunitySort, type CommunityWorkoutCard as CardData } from "@/lib/community";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  sort: fallback(z.string(), "latest").default("latest"),
  difficulty: fallback(z.number().int(), 0).default(0),
  category: fallback(z.string(), "").default(""),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/community/workouts")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Shared workouts — Smarty Community" },
      {
        name: "description",
        content:
          "Browse every workout shared by Smarty members. Filter by difficulty, category, creator and popularity.",
      },
      { property: "og:title", content: "Shared workouts — Smarty Community" },
      {
        property: "og:description",
        content: "Browse and filter every workout shared by Smarty Workout members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrowsePage,
});

const PAGE = 12;

function BrowsePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/community/workouts" });
  const access = useCommunityAccess();
  const doWorkout = useServerFn(startSharedWorkout);

  const [rows, setRows] = useState<CardData[]>([]);
  const [badges, setBadges] = useState<Record<string, CommunityBadge[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState(false);
  const [creatorQuery, setCreatorQuery] = useState("");

  const sort = (SORTS.some((s) => s.id === search.sort) ? search.sort : "latest") as CommunitySort;
  const difficulty = Math.max(0, Math.min(6, search.difficulty));

  useEffect(() => {
    void fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search.sort, search.difficulty, search.category, search.q]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const list = await fetchCommunityWorkouts({
        sort,
        difficulty: difficulty || null,
        category: search.category || null,
        search: search.q || null,
        limit: PAGE,
        offset: page * PAGE,
      });
      if (!active) return;
      setRows((prev) => (page === 0 ? list : [...prev, ...list]));
      setDone(list.length < PAGE);
      setLoading(false);
      const map = await fetchBadgesFor(list.map((w) => w.creator_id));
      if (active) setBadges((prev) => ({ ...prev, ...map }));
    })();
    return () => {
      active = false;
    };
  }, [sort, difficulty, search.category, search.q, page]);

  const visible = creatorQuery.trim()
    ? rows.filter((w) =>
        (w.creator_name ?? "").toLowerCase().includes(creatorQuery.trim().toLowerCase()),
      )
    : rows;

  function update(patch: Record<string, unknown>) {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) as never });
  }

  function start(id: string) {
    access.guard(() => {
      void doWorkout({ data: { workoutId: id } })
        .then((r) => window.location.assign(`/workout/${r.workoutId}`))
        .catch((e: Error) => toast.error(e.message));
    });
  }

  function open(id: string) {
    access.guard(() => window.location.assign(`/community/workout/${id}`));
  }

  const filtersActive =
    sort !== "latest" || difficulty > 0 || Boolean(search.category) || Boolean(search.q) || Boolean(creatorQuery);

  const filterBody = (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sort</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <Chip key={s.id} active={sort === s.id} onClick={() => update({ sort: s.id })}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Difficulty</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Chip
              key={n}
              active={difficulty === n}
              onClick={() => update({ difficulty: difficulty === n ? 0 : n })}
            >
              {n} {n === 1 ? "star" : "stars"}
            </Chip>
          ))}
        </div>
      </div>
      {categories.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Category</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip
                key={c}
                active={search.category === c}
                onClick={() => update({ category: search.category === c ? "" : c })}
              >
                {c}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Workout name</p>
          <Input
            value={search.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search workouts"
            className="mt-2 h-11 rounded-2xl"
          />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Creator</p>
          <Input
            value={creatorQuery}
            onChange={(e) => setCreatorQuery(e.target.value)}
            placeholder="Search creator"
            className="mt-2 h-11 rounded-2xl"
          />
        </div>
      </div>
      {filtersActive && (
        <Button
          variant="secondary"
          className="h-11 w-full rounded-2xl font-bold"
          onClick={() => {
            setCreatorQuery("");
            update({ sort: "latest", difficulty: 0, category: "", q: "" });
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <PageHeader
        eyebrow="Smarty Community"
        title="Shared workouts"
        subtitle="Every workout shared by Smarty members, exactly as it was generated."
      />

      <div className="mb-6 flex items-center justify-between gap-3">
        <Link to="/community" className="text-xs font-bold uppercase tracking-wider text-primary">
          ← Community
        </Link>
        <Button
          variant="secondary"
          className="h-10 rounded-2xl lg:hidden"
          onClick={() => setPanel(true)}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="hidden rounded-3xl border-2 border-blue-400 bg-card p-5 lg:block">{filterBody}</div>

      {panel && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPanel(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-background p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-extrabold uppercase">Filters</p>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setPanel(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {filterBody}
            <Button className="mt-5 h-12 w-full rounded-2xl font-bold" onClick={() => setPanel(false)}>
              Show results
            </Button>
          </div>
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          No shared workouts match these filters.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((w) => (
            <CommunityWorkoutCard
              key={w.id}
              workout={w}
              badges={badges[w.creator_id] ?? []}
              onOpen={open}
              onDo={start}
            />
          ))}
        </div>
      )}

      {!done && rows.length > 0 && (
        <div className="mt-8 text-center">
          <Button
            variant="secondary"
            className="h-12 rounded-2xl font-bold"
            onClick={() => setPage((p) => p + 1)}
            disabled={loading}
          >
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      <CommunityGateDialog
        open={access.gateOpen}
        onOpenChange={access.setGateOpen}
        signedIn={access.signedIn}
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}
