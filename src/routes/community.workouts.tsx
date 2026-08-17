import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommunityWorkoutCard } from "@/components/community/CommunityWorkoutCard";
import {
  CommunityGateDialog,
  useCommunityAccess,
} from "@/components/community/useCommunityAccess";
import { fetchBadgesFor, fetchCategories, fetchCommunityWorkouts } from "@/lib/community-queries";
import { SORTS, type CommunityBadge, type CommunitySort, type CommunityWorkoutCard as CardData } from "@/lib/community";
import { CATEGORIES, MAX_STARS } from "@/lib/workout/spec";

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

  const [rows, setRows] = useState<CardData[]>([]);
  const [badges, setBadges] = useState<Record<string, CommunityBadge[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [page, setPage] = useState(0);
  const [creatorQuery, setCreatorQuery] = useState("");

  const sort = (SORTS.some((s) => s.id === search.sort) ? search.sort : "latest") as CommunitySort;
  const difficulty = Math.max(0, Math.min(MAX_STARS, search.difficulty));

  useEffect(() => {
    void fetchCategories().then((rows) => {
      const merged = Array.from(new Set([...CATEGORIES, ...rows]));
      setCategories(merged);
    });
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

  function open(id: string) {
    access.guard(() => window.location.assign(`/community/workout/${id}`));
  }

  const filtersActive =
    sort !== "latest" || difficulty > 0 || Boolean(search.category) || Boolean(search.q) || Boolean(creatorQuery);

  const filterBody = (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={sort} onValueChange={(v) => update({ sort: v })}>
          <SelectTrigger className="h-11 rounded-2xl border-blue-300 text-sm font-semibold dark:border-blue-500/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((sOpt) => (
              <SelectItem key={sOpt.id} value={sOpt.id}>
                {sOpt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(difficulty)}
          onValueChange={(v) => update({ difficulty: Number(v) })}
        >
          <SelectTrigger className="h-11 rounded-2xl border-blue-300 text-sm font-semibold dark:border-blue-500/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any difficulty</SelectItem>
            {Array.from({ length: MAX_STARS }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} {n === 1 ? "star" : "stars"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={search.category || "all"}
          onValueChange={(v) => update({ category: v === "all" ? "" : v })}
        >
          <SelectTrigger className="h-11 rounded-2xl border-blue-300 text-sm font-semibold dark:border-blue-500/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={search.q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Search workouts"
          className="h-11 rounded-2xl"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={creatorQuery}
          onChange={(e) => setCreatorQuery(e.target.value)}
          placeholder="Search creator"
          className="h-11 rounded-2xl"
        />
        {filtersActive && (
          <Button
            variant="secondary"
            className="h-11 rounded-2xl font-bold"
            onClick={() => {
              setCreatorQuery("");
              update({ sort: "latest", difficulty: 0, category: "", q: "" });
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
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
      </div>

      <div className="rounded-3xl border-2 border-blue-400 bg-card p-5">{filterBody}</div>

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
