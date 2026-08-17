import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Trophy, Users, Star, MessageSquare, Dumbbell, Flame } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/community/")({
  head: () => ({
    meta: [
      { title: "Smarty Community — Train together | Smarty Workout" },
      {
        name: "description",
        content:
          "Shared workouts from every Smarty member, member rankings, workout rankings and the latest community activity.",
      },
      { property: "og:title", content: "Smarty Community — Train together" },
      {
        property: "og:description",
        content: "Shared workouts, member rankings, workout rankings and community activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

type WorkoutSortKey = "latest" | "completed" | "liked" | "rated";
type MemberSortKey = "score" | "current_streak" | "workouts_completed" | "workouts_shared";
type RankSortKey = "completions" | "likes" | "comments";

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
  { value: "completions", label: "Completions", unit: "done" },
  { value: "likes", label: "Likes", unit: "likes" },
  { value: "comments", label: "Comments", unit: "talk" },
];

function medal(index: number) {
  return index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
}

function CommunityPage() {
  const navigate = useNavigate();
  const access = useCommunityAccess();
  const doWorkout = useServerFn(startSharedWorkout);

  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [desktopApi, setDesktopApi] = useState<CarouselApi>();

  const [workoutSort, setWorkoutSort] = useState<WorkoutSortKey>("latest");
  const [memberSort, setMemberSort] = useState<MemberSortKey>("score");
  const [rankSort, setRankSort] = useState<RankSortKey>("completions");

  const [workouts, setWorkouts] = useState<CardData[] | null>(null);
  const [members, setMembers] = useState<CommunityMember[] | null>(null);
  const [ranked, setRanked] = useState<CardData[] | null>(null);
  const [comments, setComments] = useState<(CommunityComment & { workout_name?: string | null })[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;
    setWorkouts(null);
    void fetchCommunityWorkouts({ sort: workoutSort, limit: 12 }).then((r) => {
      if (active) setWorkouts(r);
    });
    return () => {
      active = false;
    };
  }, [workoutSort]);

  useEffect(() => {
    let active = true;
    setMembers(null);
    const load =
      memberSort === "workouts_shared"
        ? fetchCommunityCreators("workouts_shared", 10)
        : fetchLeaders(memberSort, 10);
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
    const sort = rankSort === "completions" ? "completed" : rankSort === "likes" ? "liked" : "commented";
    void fetchCommunityWorkouts({ sort, limit: 10 }).then((r) => {
      if (active) setRanked(r);
    });
    return () => {
      active = false;
    };
  }, [rankSort]);

  useEffect(() => {
    void fetchLatestComments(15).then(setComments);
  }, []);

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
    <ActivityPanel key="activity" comments={comments} onOpen={open} />,
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
                <div className="h-[520px]">{panel}</div>
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
                <div className="h-[600px]">{panel}</div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <div className="mt-8 text-center">
        <Button asChild variant="secondary" className="h-12 rounded-2xl font-bold">
          <Link to="/community/workouts" search={{ sort: "latest", difficulty: 0, category: "", q: "" }}>
            Browse every shared workout
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

/* ---------------- panels ---------------- */

function Panel({
  title,
  icon: Icon,
  filters,
  children,
}: {
  title: string;
  icon: typeof Trophy;
  filters: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-3xl border-2 border-blue-400 bg-card shadow-soft">
      <header className="border-b border-blue-200 bg-blue-50 p-4 dark:border-blue-500/40 dark:bg-blue-500/10">
        <h2 className="flex items-center gap-2 text-lg font-extrabold uppercase tracking-tight">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </h2>
        <div className="mt-3 flex flex-wrap gap-1.5">{filters}</div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </section>
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
        "rounded-full border px-3 py-1 text-[11px] font-bold transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-blue-300 text-primary hover:bg-primary/10 dark:border-blue-500/50",
      )}
    >
      {children}
    </button>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="px-2 py-6 text-center text-sm text-muted-foreground">{label}</p>;
}

function Spinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function SharedWorkoutsPanel({
  rows,
  sort,
  onSort,
  onOpen,
  onDo,
}: {
  rows: CardData[] | null;
  sort: WorkoutSortKey;
  onSort: (s: WorkoutSortKey) => void;
  onOpen: (id: string) => void;
  onDo: (id: string) => void;
}) {
  return (
    <Panel
      title="Shared workouts"
      icon={Dumbbell}
      filters={WORKOUT_FILTERS.map((f) => (
        <Chip key={f.value} active={sort === f.value} onClick={() => onSort(f.value)}>
          {f.label}
        </Chip>
      ))}
    >
      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty label="No shared workouts yet — be the first to share one from your logbook." />
      ) : (
        <ul className="space-y-2">
          {rows.map((w) => (
            <li
              key={w.id}
              className="rounded-2xl border border-blue-200 p-3 dark:border-blue-500/40"
            >
              <div className="flex items-start gap-3">
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
              </div>
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
      filters={MEMBER_FILTERS.map((f) => (
        <Chip key={f.value} active={sort === f.value} onClick={() => onSort(f.value)}>
          {f.label}
        </Chip>
      ))}
    >
      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty label="The ranking fills up as members train." />
      ) : (
        <ol className="space-y-2">
          {rows.map((m, i) => (
            <li
              key={m.user_id}
              className="flex items-center gap-3 rounded-2xl border border-blue-200 p-2.5 dark:border-blue-500/40"
            >
              <span className="w-7 shrink-0 text-center text-sm font-black text-primary">
                {medal(i)}
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
  const valueOf = (w: CardData) =>
    sort === "completions" ? w.completions : sort === "likes" ? w.likes : w.comments_count;

  return (
    <Panel
      title="Workout ranking"
      icon={Star}
      filters={RANK_FILTERS.map((f) => (
        <Chip key={f.value} active={sort === f.value} onClick={() => onSort(f.value)}>
          {f.label}
        </Chip>
      ))}
    >
      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty label="Rankings appear once members share and train workouts." />
      ) : (
        <ol className="space-y-2">
          {rows.map((w, i) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => onOpen(w.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-blue-200 p-2.5 text-left transition hover:border-primary dark:border-blue-500/40"
              >
                <span className="w-7 shrink-0 text-center text-sm font-black text-primary">
                  {medal(i)}
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
        </ol>
      )}
    </Panel>
  );
}

function ActivityPanel({
  comments,
  onOpen,
}: {
  comments: (CommunityComment & { workout_name?: string | null })[];
  onOpen: (id: string) => void;
}) {
  return (
    <Panel title="Community talk" icon={MessageSquare} filters={null}>
      {comments.length === 0 ? (
        <Empty label="No comments yet — say something about a shared workout." />
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
                    <span className="ml-1 font-normal text-muted-foreground">
                      on {c.workout_name || "a workout"}
                    </span>
                  </p>
                  <p className="mt-1 line-clamp-3 break-words text-sm">{c.body}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
