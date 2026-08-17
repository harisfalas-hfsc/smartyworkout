import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Trophy, Users, Star, MessageSquare, Dumbbell, Flame } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { SwipeToExplore } from "@/components/ui/SwipeToExplore";
import { MemberAvatar } from "@/components/community/MemberCard";
import {
  CommunityGateDialog,
  useCommunityAccess,
} from "@/components/community/useCommunityAccess";
import {
  fetchCategories,
  fetchCommunityCreators,
  fetchCommunityWorkouts,
  fetchLatestComments,
  fetchLeaders,
} from "@/lib/community-queries";
import { startSharedWorkout } from "@/lib/community.functions";
import type {
  CommunityComment,
  CommunityMember,
  CommunityWorkoutCard as CardData,
} from "@/lib/community";

export const Route = createFileRoute("/community/")({
  head: () => ({
    meta: [
      { title: "Smarty Community — Train together | Smarty Workout" },
      {
        name: "description",
        content:
          "Shared workouts from every Smarty member, member rankings, workout rankings and the comments on every shared session.",
      },
      { property: "og:title", content: "Smarty Community — Train together" },
      {
        property: "og:description",
        content: "Shared workouts, member rankings, workout rankings and shared-workout comments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

type WorkoutSortKey = "latest" | "completed" | "liked" | "rated";
type MemberSortKey = "score" | "current_streak" | "workouts_completed" | "workouts_shared";
type RankSortKey = "completions" | "likes";
type TalkSortKey = "newest" | "oldest" | "discussed";

const SLOTS = 10;

const MEMBER_FILTERS: { value: MemberSortKey; label: string; unit: string }[] = [
  { value: "score", label: "Score", unit: "pts" },
  { value: "current_streak", label: "Streak", unit: "days" },
  { value: "workouts_completed", label: "Completed", unit: "done" },
  { value: "workouts_shared", label: "Shared", unit: "shared" },
];

const WORKOUT_FILTERS: { value: WorkoutSortKey; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "completed", label: "Most completed" },
  { value: "liked", label: "Most liked" },
  { value: "rated", label: "Top rated" },
];

const RANK_FILTERS: { value: RankSortKey; label: string; unit: string }[] = [
  { value: "completions", label: "Most completed", unit: "done" },
  { value: "likes", label: "Most liked", unit: "likes" },
];

const TALK_FILTERS: { value: TalkSortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "discussed", label: "Most discussed" },
];

/** A distinct badge for every one of the ten positions. */
const POSITION_BADGES = ["🥇", "🥈", "🥉", "🏅", "🎖️", "⭐", "🔥", "💪", "⚡", "🎯"];

function badgeFor(index: number) {
  return POSITION_BADGES[index] ?? "•";
}

function CommunityPage() {
  const navigate = useNavigate();
  const access = useCommunityAccess();
  const doWorkout = useServerFn(startSharedWorkout);

  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [desktopApi, setDesktopApi] = useState<CarouselApi>();

  const [workoutSort, setWorkoutSort] = useState<WorkoutSortKey>("latest");
  const [category, setCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [memberSort, setMemberSort] = useState<MemberSortKey>("score");
  const [rankSort, setRankSort] = useState<RankSortKey>("completions");
  const [talkSort, setTalkSort] = useState<TalkSortKey>("newest");

  const [workouts, setWorkouts] = useState<CardData[] | null>(null);
  const [members, setMembers] = useState<CommunityMember[] | null>(null);
  const [ranked, setRanked] = useState<CardData[] | null>(null);
  const [comments, setComments] = useState<
    (CommunityComment & { workout_name?: string | null })[] | null
  >(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    void fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    let active = true;
    setWorkouts(null);
    void fetchCommunityWorkouts({
      sort: workoutSort,
      category: category === "all" ? null : category,
      limit: SLOTS,
    }).then((r) => {
      if (active) setWorkouts(r);
    });
    return () => {
      active = false;
    };
  }, [workoutSort, category]);

  useEffect(() => {
    let active = true;
    setMembers(null);
    const load =
      memberSort === "workouts_shared"
        ? fetchCommunityCreators("workouts_shared", SLOTS)
        : fetchLeaders(memberSort, SLOTS);
    void load.then((r) => {
      if (active) setMembers(r);
    });
    return () => {
      active = false;
    };
  }, [memberSort]);

  useEffect(() => {
    let active = true;
    setRanked(null);
    const sort = rankSort === "completions" ? "completed" : "liked";
    void fetchCommunityWorkouts({ sort, limit: SLOTS }).then((r) => {
      if (active) setRanked(r);
    });
    return () => {
      active = false;
    };
  }, [rankSort]);

  useEffect(() => {
    let active = true;
    setComments(null);
    void fetchLatestComments(30, talkSort === "oldest" ? "oldest" : "newest").then((rows) => {
      if (!active) return;
      if (talkSort !== "discussed") return setComments(rows.slice(0, SLOTS));
      const counts = new Map<string, number>();
      for (const c of rows) counts.set(c.workout_id, (counts.get(c.workout_id) ?? 0) + 1);
      setComments(
        [...rows]
          .sort(
            (a, b) =>
              (counts.get(b.workout_id) ?? 0) - (counts.get(a.workout_id) ?? 0) ||
              +new Date(b.created_at) - +new Date(a.created_at),
          )
          .slice(0, SLOTS),
      );
    });
    return () => {
      active = false;
    };
  }, [talkSort]);

  function open(id: string) {
    access.guard(() =>
      navigate({ to: "/community/workout/$workoutId", params: { workoutId: id } }),
    );
  }

  function start(id: string) {
    access.guard(() => {
      if (starting) return;
      setStarting(true);
      void doWorkout({ data: { workoutId: id } })
        .then((r) => navigate({ to: "/workout/$workoutId", params: { workoutId: r.workoutId } }))
        .catch((e: Error) => toast.error(e.message))
        .finally(() => setStarting(false));
    });
  }

  const panels = [
    <SharedWorkoutsPanel
      key="shared"
      rows={workouts}
      sort={workoutSort}
      onSort={setWorkoutSort}
      category={category}
      categories={categories}
      onCategory={setCategory}
      onOpen={open}
      onDo={start}
    />,
    <MemberRankingPanel key="members" rows={members} sort={memberSort} onSort={setMemberSort} />,
    <WorkoutRankingPanel
      key="ranked"
      rows={ranked}
      sort={rankSort}
      onSort={setRankSort}
      onOpen={open}
    />,
    <TalkPanel
      key="talk"
      comments={comments}
      sort={talkSort}
      onSort={setTalkSort}
      onOpen={open}
    />,
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <PageHeader
        eyebrow="Smarty Community"
        icon={Users}
        title="Together"
        subtitle="Train together. Share your workouts. Discover sessions from every Smarty member, climb the rankings and take your place in the community."
      />

      {access.checked && !access.premium && (
        <div className="mx-auto mb-6 max-w-2xl rounded-3xl border-2 border-blue-400 bg-card p-5 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Members only</p>
          <p className="mt-2 text-sm text-muted-foreground">
            You can read the community, but opening workouts, liking, commenting and training shared
            sessions are part of the membership.
          </p>
          <Button asChild className="mt-4 h-12 rounded-2xl font-bold">
            <Link to="/pricing">{access.signedIn ? "Renew membership" : "Join Smarty Workout"}</Link>
          </Button>
        </div>
      )}

      <div className="md:hidden">
        <SwipeToExplore
          onPrev={() => mobileApi?.scrollPrev()}
          onNext={() => mobileApi?.scrollNext()}
        />
        <Carousel setApi={setMobileApi} className="w-full">
          <CarouselContent className="-ml-2">
            {panels.map((panel, i) => (
              <CarouselItem key={i} className="basis-[88%] pl-2">
                <div className="h-[560px]">{panel}</div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <div className="hidden md:block">
        <SwipeToExplore
          onPrev={() => desktopApi?.scrollPrev()}
          onNext={() => desktopApi?.scrollNext()}
        />
        <Carousel setApi={setDesktopApi} className="w-full">
          <CarouselContent className="-ml-4">
            {panels.map((panel, i) => (
              <CarouselItem key={i} className="basis-[70%] pl-4 lg:basis-[55%]">
                <div className="h-[620px]">{panel}</div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <div className="mt-8 text-center">
        <Button asChild variant="secondary" className="h-12 rounded-2xl font-bold">
          <Link to="/community/workouts" search={{ sort: "latest", difficulty: 0, category: "", q: "" }}>
            See all shared workouts
          </Link>
        </Button>
      </div>

      <CommunityGateDialog
        open={access.gateOpen}
        onOpenChange={access.setGateOpen}
        signedIn={access.signedIn}
      />
    </div>
  );
}

/* ---------------- shared shell ---------------- */

type FilterDef = { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void };

function Panel({
  title,
  icon: Icon,
  filters,
  children,
}: {
  title: string;
  icon: typeof Trophy;
  filters: FilterDef[];
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-3xl border-2 border-blue-400 bg-card shadow-soft">
      <header className="border-b border-blue-200 bg-blue-50 p-4 dark:border-blue-500/40 dark:bg-blue-500/10">
        <h2 className="flex h-7 items-center gap-2 text-lg font-extrabold uppercase tracking-tight">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </h2>
        <div className="mt-3 rounded-2xl border border-blue-300 p-3 dark:border-blue-500/40">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Filters</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[0, 1].map((i) => {
              const f = filters[i];
              if (!f) return <div key={i} aria-hidden className="hidden sm:block" />;
              return (
                <div key={f.label}>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {f.label}
                  </p>
                  <Select value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger className="h-10 rounded-xl border-blue-300 text-sm font-semibold dark:border-blue-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </section>
  );
}

function Spinner() {
  return (
    <div className="grid h-full place-items-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

/** Reserved position for a rank that nobody has claimed yet. */
function EmptySlot({ index, label }: { index: number; label: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-dashed border-blue-200 p-2.5 opacity-70 dark:border-blue-500/30">
      <span className="w-7 shrink-0 text-center text-sm">{badgeFor(index)}</span>
      <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-muted-foreground">
        {label}
      </p>
    </li>
  );
}

function fillSlots(count: number) {
  return Array.from({ length: Math.max(0, SLOTS - count) }, (_, i) => count + i);
}

/* ---------------- panels ---------------- */

function SharedWorkoutsPanel({
  rows,
  sort,
  onSort,
  category,
  categories,
  onCategory,
  onOpen,
  onDo,
}: {
  rows: CardData[] | null;
  sort: WorkoutSortKey;
  onSort: (s: WorkoutSortKey) => void;
  category: string;
  categories: string[];
  onCategory: (c: string) => void;
  onOpen: (id: string) => void;
  onDo: (id: string) => void;
}) {
  return (
    <Panel
      title="Shared workouts"
      icon={Dumbbell}
      filters={[
        {
          label: "Type",
          value: category,
          onChange: onCategory,
          options: [
            { value: "all", label: "All" },
            ...categories.map((c) => ({ value: c, label: c })),
          ],
        },
        {
          label: "Sort",
          value: sort,
          onChange: (v) => onSort(v as WorkoutSortKey),
          options: WORKOUT_FILTERS.map((f) => ({ value: f.value, label: f.label })),
        },
      ]}
    >
      {!rows ? (
        <Spinner />
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, SLOTS).map((w) => (
            <li
              key={w.id}
              className="rounded-2xl border border-blue-200 p-3 dark:border-blue-500/40"
            >
              <button
                type="button"
                onClick={() => onOpen(w.id)}
                className="flex w-full items-start gap-3 text-left"
              >
                <MemberAvatar name={w.creator_name} avatar={w.creator_avatar} size={8} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{w.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {w.creator_name || "Smarty member"} · {w.category} · {w.duration_min} min ·{" "}
                    {"★".repeat(Math.max(1, Math.min(6, w.difficulty_stars)))}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                    👍 {w.likes} · 💬 {w.comments_count} · ✅ {w.completions}
                  </p>
                </div>
              </button>
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="h-9 flex-1 rounded-xl font-bold" onClick={() => onDo(w.id)}>
                  Do workout
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 flex-1 rounded-xl"
                  onClick={() => onOpen(w.id)}
                >
                  View
                </Button>
              </div>
            </li>
          ))}
          {fillSlots(rows.length).map((i) => (
            <EmptySlot key={i} index={i} label="Free slot — share a workout to fill it" />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function MemberRankingPanel({
  rows,
  sort,
  onSort,
}: {
  rows: CommunityMember[] | null;
  sort: MemberSortKey;
  onSort: (s: MemberSortKey) => void;
}) {
  const unit = MEMBER_FILTERS.find((f) => f.value === sort)?.unit ?? "";
  const valueOf = (m: CommunityMember) =>
    sort === "score"
      ? m.score
      : sort === "current_streak"
        ? m.current_streak
        : sort === "workouts_completed"
          ? m.workouts_completed
          : m.workouts_shared;

  return (
    <Panel
      title="Member ranking"
      icon={Trophy}
      filters={[
        {
          label: "Sort",
          value: sort,
          onChange: (v) => onSort(v as MemberSortKey),
          options: MEMBER_FILTERS.map((f) => ({ value: f.value, label: f.label })),
        },
      ]}
    >
      {!rows ? (
        <Spinner />
      ) : (
        <ol className="space-y-2">
          {rows.slice(0, SLOTS).map((m, i) => (
            <li
              key={m.user_id}
              className="flex items-center gap-3 rounded-2xl border border-blue-200 p-2.5 dark:border-blue-500/40"
            >
              <span className="w-7 shrink-0 text-center text-sm font-black text-primary">
                {badgeFor(i)}
              </span>
              <MemberAvatar name={m.display_name} avatar={m.avatar_url} size={8} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{m.display_name || "Smarty member"}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  <Flame className="mr-0.5 inline h-3 w-3" />
                  {m.current_streak} day streak · {m.workouts_shared} shared
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
                {valueOf(m).toLocaleString()}{" "}
                <span className="text-[10px] font-semibold uppercase">{unit}</span>
              </span>
            </li>
          ))}
          {fillSlots(rows.length).map((i) => (
            <EmptySlot key={i} index={i} label="Waiting for someone to take this position" />
          ))}
        </ol>
      )}
    </Panel>
  );
}

function WorkoutRankingPanel({
  rows,
  sort,
  onSort,
  onOpen,
}: {
  rows: CardData[] | null;
  sort: RankSortKey;
  onSort: (s: RankSortKey) => void;
  onOpen: (id: string) => void;
}) {
  const unit = RANK_FILTERS.find((f) => f.value === sort)?.unit ?? "";
  const valueOf = (w: CardData) => (sort === "completions" ? w.completions : w.likes);

  return (
    <Panel
      title="Workout ranking"
      icon={Star}
      filters={[
        {
          label: "Sort",
          value: sort,
          onChange: (v) => onSort(v as RankSortKey),
          options: RANK_FILTERS.map((f) => ({ value: f.value, label: f.label })),
        },
      ]}
    >
      {!rows ? (
        <Spinner />
      ) : (
        <ol className="space-y-2">
          {rows.slice(0, SLOTS).map((w, i) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => onOpen(w.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-blue-200 p-2.5 text-left transition hover:border-primary dark:border-blue-500/40"
              >
                <span className="w-7 shrink-0 text-center text-sm font-black text-primary">
                  {badgeFor(i)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{w.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    by {w.creator_name || "Smarty member"} · {w.category} · {w.duration_min} min
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
                  {valueOf(w).toLocaleString()}{" "}
                  <span className="text-[10px] font-semibold uppercase">{unit}</span>
                </span>
              </button>
            </li>
          ))}
          {fillSlots(rows.length).map((i) => (
            <EmptySlot key={i} index={i} label="Waiting for a shared workout to take this position" />
          ))}
        </ol>
      )}
    </Panel>
  );
}

function TalkPanel({
  comments,
  sort,
  onSort,
  onOpen,
}: {
  comments: (CommunityComment & { workout_name?: string | null })[] | null;
  sort: TalkSortKey;
  onSort: (s: TalkSortKey) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <Panel
      title="Workout comments"
      icon={MessageSquare}
      filters={[
        {
          label: "Sort",
          value: sort,
          onChange: (v) => onSort(v as TalkSortKey),
          options: TALK_FILTERS.map((f) => ({ value: f.value, label: f.label })),
        },
      ]}
    >
      {!comments ? (
        <Spinner />
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onOpen(c.workout_id)}
                className="flex w-full gap-3 rounded-2xl border border-blue-200 p-3 text-left transition hover:border-primary dark:border-blue-500/40"
              >
                <MemberAvatar name={c.author_name} avatar={c.author_avatar} size={8} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">
                    {c.author_name || "Smarty member"}
                    <span className="ml-1 font-normal text-muted-foreground">on</span>{" "}
                    <span className="text-primary">{c.workout_name || "a shared workout"}</span>
                  </p>
                  <p className="mt-1 line-clamp-3 break-words text-sm">{c.body}</p>
                </div>
              </button>
            </li>
          ))}
          {fillSlots(comments.length).map((i) => (
            <EmptySlot key={i} index={i} label="No comment here yet — open a shared workout to talk" />
          ))}
        </ul>
      )}
    </Panel>
  );
}
