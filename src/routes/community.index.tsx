import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Trophy, Users, Flame, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselItem } from "@/components/community/Carousel";
import { CommunityWorkoutCard } from "@/components/community/CommunityWorkoutCard";
import { LeaderRow, MemberCard } from "@/components/community/MemberCard";
import {
  CommunityGateDialog,
  useCommunityAccess,
} from "@/components/community/useCommunityAccess";
import {
  fetchBadgesFor,
  fetchCommunityCreators,
  fetchCommunityWorkouts,
  fetchLeaders,
} from "@/lib/community-queries";
import { startSharedWorkout } from "@/lib/community.functions";
import type { CommunityBadge, CommunityMember, CommunityWorkoutCard as CardData } from "@/lib/community";

export const Route = createFileRoute("/community/")({
  head: () => ({
    meta: [
      { title: "Smarty Community — Train together | Smarty Workout" },
      {
        name: "description",
        content:
          "Share your workouts, discover sessions from other Smarty members, climb the rankings and take your place in the Smarty Hall of Fame.",
      },
      { property: "og:title", content: "Smarty Community — Train together" },
      {
        property: "og:description",
        content:
          "Shared workouts, creator rankings, streak leaders and the Smarty Hall of Fame.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

type Feed = {
  latest: CardData[];
  completed: CardData[];
  liked: CardData[];
  discussed: CardData[];
  rated: CardData[];
};

function CommunityPage() {
  const navigate = useNavigate();
  const access = useCommunityAccess();
  const doWorkout = useServerFn(startSharedWorkout);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [badges, setBadges] = useState<Record<string, CommunityBadge[]>>({});
  const [creators, setCreators] = useState<Record<string, CommunityMember[]>>({});
  const [leaders, setLeaders] = useState<Record<string, CommunityMember[]>>({});
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [latest, completed, liked, discussed, rated] = await Promise.all([
        fetchCommunityWorkouts({ sort: "latest", limit: 10 }),
        fetchCommunityWorkouts({ sort: "completed", limit: 10 }),
        fetchCommunityWorkouts({ sort: "liked", limit: 10 }),
        fetchCommunityWorkouts({ sort: "commented", limit: 10 }),
        fetchCommunityWorkouts({ sort: "rated", limit: 10 }),
      ]);
      const [shared, byCompletions, byLikes, byComments, topRanked] = await Promise.all([
        fetchCommunityCreators("workouts_shared"),
        fetchCommunityCreators("received_completions"),
        fetchCommunityCreators("received_likes"),
        fetchCommunityCreators("received_comments"),
        fetchCommunityCreators("score"),
      ]);
      const [streak, completionLeaders, generationLeaders] = await Promise.all([
        fetchLeaders("current_streak"),
        fetchLeaders("workouts_completed"),
        fetchLeaders("workouts_generated"),
      ]);
      if (!active) return;
      setFeed({ latest, completed, liked, discussed, rated });
      setCreators({ shared, byCompletions, byLikes, byComments, topRanked });
      setLeaders({ streak, completionLeaders, generationLeaders });

      const ids = new Set<string>();
      for (const list of [latest, completed, liked, discussed, rated])
        for (const w of list) ids.add(w.creator_id);
      for (const list of [shared, byCompletions, byLikes, byComments, topRanked, streak, completionLeaders, generationLeaders])
        for (const m of list) ids.add(m.user_id);
      const map = await fetchBadgesFor(Array.from(ids));
      if (active) setBadges(map);
    })();
    return () => {
      active = false;
    };
  }, []);

  function open(id: string) {
    access.guard(() => navigate({ to: "/community/workout/$workoutId", params: { workoutId: id } }));
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

  const cards = (list: CardData[] | undefined, compact = false) =>
    (list ?? []).map((w) => (
      <CarouselItem key={w.id}>
        <CommunityWorkoutCard
          workout={w}
          badges={badges[w.creator_id] ?? []}
          onOpen={open}
          onDo={start}
          compact={compact}
        />
      </CarouselItem>
    ));

  const empty = feed && feed.latest.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <PageHeader
        eyebrow="Smarty Community"
        icon={Users}
        title="Together"
        subtitle="Train together. Share your workouts. Discover workouts from other Smarty members. Challenge yourself, support others and take your place in the SmartyWorkout community."
      />

      {!access.premium && access.checked && (
        <div className="mx-auto mb-8 max-w-2xl rounded-3xl border-2 border-blue-400 bg-card p-5 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Members only</p>
          <p className="mt-2 text-sm text-muted-foreground">
            You can browse the community, but opening workouts, liking, commenting and rankings are
            part of the membership.
          </p>
          <Button asChild className="mt-4 h-12 rounded-2xl font-bold">
            <Link to="/pricing">{access.signedIn ? "Renew membership" : "Join Smarty Workout"}</Link>
          </Button>
        </div>
      )}

      {!feed ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : empty ? (
        <div className="mx-auto max-w-xl rounded-3xl border-2 border-blue-400 bg-card p-8 text-center">
          <Sparkles className="mx-auto h-7 w-7 text-primary" />
          <h2 className="mt-3 text-xl font-extrabold uppercase">No shared workouts yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Be the first. Open any workout in your logbook and share it with the community.
          </p>
          <Button asChild className="mt-4 h-12 rounded-2xl font-bold">
            <Link to="/logbook" search={{ filter: "all" as const, view: "list" as const }}>
              Open my logbook
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <Carousel
            title="Latest workouts"
            subtitle="The newest sessions shared by Smarty members."
            viewAllTo="/community/workouts"
            viewAllSearch={{ sort: "latest" }}
          >
            {cards(feed.latest)}
          </Carousel>

          <Carousel
            title="Most completed"
            subtitle="What the community actually trains."
            viewAllTo="/community/workouts"
            viewAllSearch={{ sort: "completed" }}
          >
            {cards(feed.completed, true)}
          </Carousel>

          <Carousel
            title="Most liked"
            viewAllTo="/community/workouts"
            viewAllSearch={{ sort: "liked" }}
          >
            {cards(feed.liked, true)}
          </Carousel>

          <Carousel
            title="Most discussed"
            viewAllTo="/community/workouts"
            viewAllSearch={{ sort: "commented" }}
          >
            {cards(feed.discussed, true)}
          </Carousel>

          {feed.rated.length > 0 && (
            <Carousel
              title="Top rated"
              subtitle="Highest approval, minimum three reactions."
              viewAllTo="/community/workouts"
              viewAllSearch={{ sort: "rated" }}
            >
              {cards(feed.rated, true)}
            </Carousel>
          )}

          <Carousel title="Top creators" subtitle="Members shaping the community.">
            {(creators["shared"] ?? []).map((m, i) => (
              <CarouselItem key={m.user_id} width="narrow">
                <MemberCard
                  member={m}
                  rank={i + 1}
                  badges={badges[m.user_id] ?? []}
                  stats={[
                    { label: "Shared", value: m.workouts_shared },
                    { label: "Community done", value: m.received_completions },
                    { label: "Likes", value: m.received_likes },
                    { label: "Score", value: m.score },
                  ]}
                />
              </CarouselItem>
            ))}
          </Carousel>

          <Carousel title="Smarty achievers" subtitle="Milestones from the existing awards system.">
            {(creators["topRanked"] ?? []).map((m, i) => (
              <CarouselItem key={m.user_id} width="narrow">
                <MemberCard
                  member={m}
                  rank={i + 1}
                  badges={badges[m.user_id] ?? []}
                  stats={[
                    { label: "Score", value: m.score },
                    { label: "Longest streak", value: m.longest_streak },
                    { label: "Completed", value: m.workouts_completed },
                    { label: "Months", value: m.subscription_months },
                  ]}
                />
              </CarouselItem>
            ))}
          </Carousel>

          <section className="mt-12 grid gap-5 lg:grid-cols-3">
            <LeaderBoard
              title="Streak leaders"
              icon={Flame}
              members={leaders["streak"] ?? []}
              value={(m) => m.current_streak}
              unit="days"
              badges={badges}
            />
            <LeaderBoard
              title="Completion leaders"
              icon={Trophy}
              members={leaders["completionLeaders"] ?? []}
              value={(m) => m.workouts_completed}
              unit="done"
              badges={badges}
            />
            <LeaderBoard
              title="Generation leaders"
              icon={Sparkles}
              members={leaders["generationLeaders"] ?? []}
              value={(m) => m.workouts_generated}
              unit="made"
              badges={badges}
            />
          </section>

          <HallOfFame creators={creators} leaders={leaders} />
        </>
      )}

      <CommunityGateDialog
        open={access.gateOpen}
        onOpenChange={access.setGateOpen}
        signedIn={access.signedIn}
      />
    </div>
  );
}

function LeaderBoard({
  title,
  icon: Icon,
  members,
  value,
  unit,
  badges,
}: {
  title: string;
  icon: typeof Flame;
  members: CommunityMember[];
  value: (m: CommunityMember) => number;
  unit: string;
  badges: Record<string, CommunityBadge[]>;
}) {
  return (
    <div className="rounded-3xl border-2 border-blue-400 bg-card p-5">
      <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-primary">
        <Icon className="h-4 w-4" /> {title}
      </h3>
      {members.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {members.map((m, i) => (
            <LeaderRow
              key={m.user_id}
              rank={i + 1}
              member={m}
              value={value(m)}
              unit={unit}
              badge={badges[m.user_id]?.[0]}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function HallOfFame({
  creators,
  leaders,
}: {
  creators: Record<string, CommunityMember[]>;
  leaders: Record<string, CommunityMember[]>;
}) {
  const entries: { title: string; member: CommunityMember | undefined; stat: string }[] = [
    {
      title: "Top progress score",
      member: creators["topRanked"]?.[0],
      stat: `${(creators["topRanked"]?.[0]?.score ?? 0).toLocaleString()} pts`,
    },
    {
      title: "Longest streak",
      member: leaders["streak"]?.[0],
      stat: `${leaders["streak"]?.[0]?.current_streak ?? 0} days`,
    },
    {
      title: "Most completed",
      member: leaders["completionLeaders"]?.[0],
      stat: `${(leaders["completionLeaders"]?.[0]?.workouts_completed ?? 0).toLocaleString()} workouts`,
    },
    {
      title: "Most generated",
      member: leaders["generationLeaders"]?.[0],
      stat: `${(leaders["generationLeaders"]?.[0]?.workouts_generated ?? 0).toLocaleString()} workouts`,
    },
    {
      title: "Top creator",
      member: creators["shared"]?.[0],
      stat: `${creators["shared"]?.[0]?.workouts_shared ?? 0} shared`,
    },
    {
      title: "Most community completions",
      member: creators["byCompletions"]?.[0],
      stat: `${(creators["byCompletions"]?.[0]?.received_completions ?? 0).toLocaleString()} done by others`,
    },
    {
      title: "Most liked creator",
      member: creators["byLikes"]?.[0],
      stat: `${(creators["byLikes"]?.[0]?.received_likes ?? 0).toLocaleString()} likes`,
    },
    {
      title: "Most discussed creator",
      member: creators["byComments"]?.[0],
      stat: `${(creators["byComments"]?.[0]?.received_comments ?? 0).toLocaleString()} comments`,
    },
  ];

  return (
    <section className="mt-14 overflow-hidden rounded-3xl border-2 border-blue-400 bg-card p-6 sm:p-9">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Smarty Hall of Fame</p>
        <h2 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">
          Take your place in the Smarty Hall of Fame
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Complete workouts. Build your streak. Earn your awards. Share great workouts. Help other
          members train. Climb the rankings.
        </p>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((e) => (
          <div
            key={e.title}
            className="rounded-2xl border border-blue-200 p-4 dark:border-blue-500/40"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{e.title}</p>
            <p className="mt-2 truncate text-base font-extrabold">
              {e.member?.display_name || "—"}
            </p>
            <p className="text-xs text-muted-foreground">{e.member ? e.stat : "Waiting for you"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
