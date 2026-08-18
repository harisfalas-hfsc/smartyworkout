import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { offlineFirst } from "@/lib/offline/offline-first";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ThumbsUp, ThumbsDown, Flag, Trash2, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WorkoutDisplay } from "@/components/workout/WorkoutDisplay";
import { MemberAvatar } from "@/components/community/MemberCard";
import {
  CommunityGateDialog,
  useCommunityAccess,
} from "@/components/community/useCommunityAccess";
import {
  addComment,
  deleteComment,
  getSharedWorkout,
  reactToWorkout,
  rateWorkout,
  reportContent,
  startSharedWorkout,
} from "@/lib/community.functions";
import { fetchComments } from "@/lib/community-queries";
import type { CommunityComment, SharedWorkoutFull } from "@/lib/community";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { WorkoutStatusPanel } from "@/components/workout/WorkoutStatusPanel";
import { COMMENT_MAX, RATING_STARS, creatorOrigin } from "@/lib/community";
import { formatDate } from "@/lib/date-format";


export const Route = createFileRoute("/community/workout/$workoutId")({
  head: () => ({
    meta: [
      { title: "Shared workout — Smarty Community" },
      {
        name: "description",
        content: "A workout shared with the Smarty Community by a member.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharedWorkoutPage,
});

function SharedWorkoutPage() {
  const { workoutId } = Route.useParams();
  const navigate = useNavigate();
  const access = useCommunityAccess();
  const load = useServerFn(getSharedWorkout);
  const react = useServerFn(reactToWorkout);
  const postComment = useServerFn(addComment);
  const removeComment = useServerFn(deleteComment);
  const report = useServerFn(reportContent);
  const doWorkout = useServerFn(startSharedWorkout);
  const rate = useServerFn(rateWorkout);

  const [workout, setWorkout] = useState<SharedWorkoutFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myReaction, setMyReaction] = useState<1 | -1 | 0>(0);
  const [counts, setCounts] = useState({ likes: 0, dislikes: 0 });
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [draft, setDraft] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copy, setCopy] = useState<{ id: string; status: string; scheduledAt: string } | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [ratingStats, setRatingStats] = useState({ avg: 0, count: 0 });
  const [creator, setCreator] = useState<{ display_name: string | null; avatar_url: string | null } | null>(
    null,
  );

  /** Lazily creates (or reuses) the member's own copy so status can be tracked. */
  async function ensureCopy(): Promise<string> {
    if (copy?.id) return copy.id;
    const r = await doWorkout({ data: { workoutId } });
    setCopy((c) => ({ id: r.workoutId, status: c?.status ?? "created", scheduledAt: c?.scheduledAt ?? "" }));
    return r.workoutId;
  }


  async function refreshCounts() {
    const { data } = await supabase
      .from("community_workouts_public")
      .select("likes,dislikes,rating_avg,rating_count")
      .eq("id", workoutId)
      .maybeSingle()
      .returns<{ likes: number; dislikes: number; rating_avg: number; rating_count: number }>();
    if (data) {
      setCounts({ likes: data.likes, dislikes: data.dislikes });
      setRatingStats({ avg: Number(data.rating_avg ?? 0), count: Number(data.rating_count ?? 0) });
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (active) setMe(auth.user?.id ?? null);
      try {
        const res = await offlineFirst(`community:workout:${workoutId}`, () =>
          load({ data: { workoutId } }),
        );
        if (!active) return;
        setWorkout(res.workout);
        setMyReaction(res.myReaction);
        if (res.myCopy) setCopy({ id: res.myCopy.id, status: res.myCopy.status, scheduledAt: "" });
        setMyRating(res.myRating ?? 0);
        setCreator(res.creator ?? null);

      } catch (e) {
        if (active) setError((e as Error).message);
      }
      const [list] = await Promise.all([
        offlineFirst(`community:workout-comments:${workoutId}`, () => fetchComments(workoutId)).catch(
          () => [] as CommunityComment[],
        ),
        refreshCounts(),
      ]);
      if (active) setComments(list);
    })();
    return () => {
      active = false;
    };
  }, [workoutId]);

  function toggleReaction(value: 1 | -1) {
    access.guard(() => {
      const next = myReaction === value ? 0 : value;
      setMyReaction(next);
      void react({ data: { workoutId, value: next } })
        .then(refreshCounts)
        .catch((e: Error) => {
          toast.error(e.message);
          setMyReaction(myReaction);
        });
    });
  }

  function setRating(value: number) {
    access.guard(() => {
      const next = myRating === value ? 0 : value;
      const previous = myRating;
      setMyRating(next);
      void rate({ data: { workoutId, value: next } })
        .then(refreshCounts)
        .catch((e: Error) => {
          toast.error(e.message);
          setMyRating(previous);
        });
    });
  }

  function submitComment() {
    access.guard(() => {
      const body = draft.trim();
      if (!body || busy) return;
      setBusy(true);
      void postComment({ data: { workoutId, body } })
        .then(async () => {
          setDraft("");
          setComments(await fetchComments(workoutId));
        })
        .catch((e: Error) => toast.error(e.message))
        .finally(() => setBusy(false));
    });
  }

  function removeMine(id: string) {
    void removeComment({ data: { commentId: id } })
      .then(() => setComments((c) => c.filter((x) => x.id !== id)))
      .catch((e: Error) => toast.error(e.message));
  }

  function reportTarget(type: "workout" | "comment", id: string) {
    access.guard(() => {
      void report({ data: { targetType: type, targetId: id } })
        .then(() => toast.success("Reported — an administrator will review it."))
        .catch((e: Error) => toast.error(e.message));
    });
  }

  function start() {
    access.guard(() => {
      if (busy) return;
      setBusy(true);
      void doWorkout({ data: { workoutId } })
        .then((r) => navigate({ to: "/workout/$workoutId", params: { workoutId: r.workoutId } }))
        .catch((e: Error) => toast.error(e.message))
        .finally(() => setBusy(false));
    });
  }

  if (error || (access.checked && !access.premium))
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-extrabold uppercase tracking-tight">Members only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error && access.premium
            ? error
            : "Shared workouts open with an active Smarty Workout membership."}
        </p>
        <div className="mt-4 grid gap-2">
          <Button asChild className="h-12 rounded-2xl font-bold">
            <Link to="/pricing">{access.signedIn ? "Renew membership" : "See membership"}</Link>
          </Button>
          <Button asChild variant="secondary" className="h-12 rounded-2xl">
            <Link to="/community">Back to community</Link>
          </Button>
        </div>
      </div>
    );

  if (!workout)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <WorkoutDisplay workout={{ ...workout, is_favorite: false, rating: null }} onComplete={start}>
      <WorkoutStatusPanel
        workoutId={copy?.id ?? null}
        status={copy?.status === "completed" ? "completed" : copy?.scheduledAt ? "scheduled" : "created"}
        scheduledAt={copy?.scheduledAt ?? ""}
        resolveWorkoutId={ensureCopy}
        onChange={(next) =>
          setCopy((c) => ({
            id: c?.id ?? "",
            status: next.status,
            scheduledAt: next.scheduledAt,
          }))
        }
      />

      <section className="mt-6 rounded-3xl border-2 border-blue-400 bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Community workout</p>

        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-blue-200 p-3 dark:border-blue-500/40">
          <MemberAvatar name={creator?.display_name ?? null} avatar={creator?.avatar_url ?? null} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              Shared by {creator?.display_name || "Smarty member"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{creatorOrigin(workout)}</p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-blue-200 p-3 dark:border-blue-500/40">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Rate this workout</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: RATING_STARS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  onClick={() => setRating(n)}
                  className="p-0.5"
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition",
                      n <= (myRating || Math.round(ratingStats.avg))
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/40",
                    )}
                    strokeWidth={myRating && n <= myRating ? 2 : 1.5}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {ratingStats.count > 0
                ? `${ratingStats.avg.toFixed(1)} / 5 · ${ratingStats.count} rating${ratingStats.count === 1 ? "" : "s"}`
                : "Be the first to rate"}
            </span>
          </div>
          {myRating > 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Your rating: {myRating}/5 — tap the same star to remove it.
            </p>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          This workout is shown exactly as its creator generated it and cannot be edited. Start it to
          add your own copy to your logbook — your completion is credited to the creator.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button className="h-12 rounded-2xl font-bold" onClick={start} disabled={busy}>
            Do workout
          </Button>
          <Button asChild variant="secondary" className="h-12 rounded-2xl">
            <Link to="/community">Open community</Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggleReaction(1)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition",
              myReaction === 1
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary/50",
            )}
          >
            <ThumbsUp className="h-4 w-4" /> {counts.likes}
          </button>
          <button
            type="button"
            onClick={() => toggleReaction(-1)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition",
              myReaction === -1
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary/50",
            )}
          >
            <ThumbsDown className="h-4 w-4" /> {counts.dislikes}
          </button>
          <button
            type="button"
            onClick={() => reportTarget("workout", workoutId)}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border-2 border-blue-400 px-4 text-sm font-semibold text-muted-foreground"
          >
            <Flag className="h-4 w-4" /> Report
          </button>
        </div>
      </section>

      <section id="comments" className="mt-6 rounded-3xl border-2 border-blue-400 bg-card p-5">
        <h3 className="text-lg font-bold">Comments ({comments.length})</h3>
        <div className="mt-3 flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX))}
            placeholder="Great workout. That finisher was brutal…"
            className="min-h-[3rem] rounded-2xl"
            maxLength={COMMENT_MAX}
          />
          <Button className="h-12 shrink-0 rounded-2xl" onClick={submitComment} disabled={busy}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-right text-[11px] text-muted-foreground">
          {draft.length}/{COMMENT_MAX}
        </p>

        <ul className="mt-5 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-2xl border-2 border-blue-400 p-3">
              <MemberAvatar name={c.author_name} avatar={c.author_avatar} size={8} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {c.author_name || "Smarty member"}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatDate(c.created_at)}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.body}</p>
              </div>
              {c.user_id === me ? (
                <button
                  type="button"
                  aria-label="Delete comment"
                  onClick={() => removeMine(c.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Report comment"
                  onClick={() => reportTarget("comment", c.id)}
                  className="shrink-0 text-muted-foreground hover:text-primary"
                >
                  <Flag className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
          {comments.length === 0 && (
            <li className="text-sm text-muted-foreground">No comments yet — start the conversation.</li>
          )}
        </ul>
      </section>

      <CommunityGateDialog
        open={access.gateOpen}
        onOpenChange={access.setGateOpen}
        signedIn={access.signedIn}
      />
    </WorkoutDisplay>
  );
}
