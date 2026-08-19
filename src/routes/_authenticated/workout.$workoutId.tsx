import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineData } from "@/lib/offline/useOfflineData";
import { CachedNotice } from "@/components/offline/CachedNotice";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import { enqueueAction } from "@/lib/offline/queue";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { WorkoutStatusPanel } from "@/components/workout/WorkoutStatusPanel";

import { useServerFn } from "@tanstack/react-start";
import { setWorkoutStatus } from "@/lib/coach.functions";
import { shareWorkout } from "@/lib/community.functions";
import { Share2 } from "lucide-react";
import { getMyAccessState } from "@/lib/access.functions";
import { toast } from "sonner";
import { WorkoutDisplay, type WorkoutRow } from "@/components/workout/WorkoutDisplay";
import { PerformancePanel } from "@/components/workout/PerformancePanel";

import { ParqWaiverDialog } from "@/components/ParqWaiverDialog";

export const Route = createFileRoute("/_authenticated/workout/$workoutId")({
  head: () => ({
    meta: [
      { title: "Your workout — Smarty Coach" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkoutPage,
});

const DIFF = ["Too Easy", "Just Right", "Hard", "Very Hard"];
const FEEL = ["Excellent", "Good", "Normal", "Tired", "Exhausted"];
const YESNO = ["Yes", "Neutral", "No"];
const REPEAT = ["Yes", "Maybe", "No"];

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`h-11 w-full rounded-xl border-2 px-2 text-sm font-semibold transition ${
              value === o
                ? "border-primary bg-primary text-primary-foreground"
                : "border-blue-400/50 hover:border-primary"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function WorkoutPage() {
  const { workoutId } = Route.useParams();
  const [w, setW] = useState<WorkoutRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [difficulty, setDifficulty] = useState("Just Right");
  const [feeling, setFeeling] = useState("Good");
  const [enjoyed, setEnjoyed] = useState("Yes");
  const [repeat, setRepeat] = useState("Yes");
  const [comment, setComment] = useState("");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  
  const [parqFlags, setParqFlags] = useState<string[]>([]);
  const [parqOpen, setParqOpen] = useState(false);
  const [parqBlocked, setParqBlocked] = useState(false);
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);
  const saveStatus = useServerFn(setWorkoutStatus);
  const { user } = useAuth();
  const online = useOnlineStatus();
  const saveShare = useServerFn(shareWorkout);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("id", workoutId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const access = await getMyAccessState({}).catch(() => null);
    return { row: (data as unknown as WorkoutRow) ?? null, access };
  }, [workoutId]);

  const cached = useOfflineData<{
    row: WorkoutRow | null;
    access: Awaited<ReturnType<typeof getMyAccessState>> | null;
  }>(`workout:${workoutId}`, load, { userId: user?.id ?? null });

  useEffect(() => {
    if (!cached.data) {
      if (!cached.loading) setLoading(false);
      return;
    }
    const { row, access } = cached.data;
    setW(row);
    if ((row as { is_wod?: boolean } | null)?.is_wod) setLocked(!access?.premium);
    if (row && access?.readinessFlagged && access.readinessFlags.length > 0) {
      setParqFlags(access.readinessFlags);
      setParqBlocked(true);
      setParqOpen(true);
    }
    setShared(Boolean((row as { is_shared?: boolean } | null)?.is_shared));
    if (row?.status === "completed") setDone(true);
    const sched = (row as { scheduled_at?: string | null } | null)?.scheduled_at;
    if (sched) setScheduledAt(new Date(sched).toISOString().slice(0, 16));
    setLoading(false);
  }, [cached.data, cached.loading]);


  async function complete() {
    setDone(true);
    try {
      await saveStatus({ data: { workoutId, status: "completed" } });
      toast.success("Marked as completed.");
    } catch {
      await enqueueAction("workout-status", { workoutId, status: "completed" });
      toast.success("Saved on your device — it will sync when you are back online.");
    }
  }

  async function toggleShare() {
    if (!online) {
      toast.error("Sharing needs an internet connection.");
      return;
    }
    const next = !shared;
    setSharing(true);
    try {
      await saveShare({ data: { workoutId, shared: next } });
      setShared(next);
      toast.success(
        next
          ? "Shared with the Smarty Community."
          : "Removed from the Smarty Community.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSharing(false);
    }
  }


  async function saveFeedback() {
    const { data: auth } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    if (!auth.user) {
      await enqueueAction("workout-feedback", {
        workout_id: workoutId,
        difficulty_rating: difficulty,
        feeling,
        enjoyed,
        would_repeat: repeat,
        comment: comment.trim() || null,
      });
      setSaved(true);
      toast.success("Saved on your device — it will sync when you are back online.");
      return;
    }
    const { error } = await supabase.from("workout_feedback").insert({
      user_id: auth.user.id,
      workout_id: workoutId,
      difficulty_rating: difficulty,
      feeling,
      enjoyed,
      would_repeat: repeat,
      comment: comment.trim() || null,
    } as never);
    if (error) {
      await enqueueAction("workout-feedback", {
        workout_id: workoutId,
        difficulty_rating: difficulty,
        feeling,
        enjoyed,
        would_repeat: repeat,
        comment: comment.trim() || null,
      });
      setSaved(true);
      toast.success("Saved on your device — it will sync when you are back online.");
      return;
    }
    setSaved(true);
    toast.success("Saved to your logbook — Smarty Coach just got smarter.");
  }

  if (loading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (w && locked)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-extrabold uppercase tracking-tight">Members only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The Workout of the Day is part of the Smarty Workout membership. Join to open today's two
          workouts and get a new pair every morning.
        </p>
        <Button asChild className="mt-4 h-12 rounded-2xl">
          <Link to="/pricing">See plans</Link>
        </Button>
      </div>
    );

  if (!w)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Workout not found.</p>
        <Button asChild className="mt-4">
          <Link to="/coach">Back to Smarty Coach</Link>
        </Button>
      </div>
    );

  if (parqBlocked)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-extrabold uppercase tracking-tight">Health warning</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your PAR-Q has a YES answer. Confirm the waiver to open this workout, or update your
          answers in your Training Profile.
        </p>
        <div className="mt-4 grid gap-2">
          <Button className="h-12 rounded-2xl" onClick={() => setParqOpen(true)}>
            Read and confirm
          </Button>
          <Button asChild variant="secondary" className="h-12 rounded-2xl">
            <Link to="/profile">Update my PAR-Q answers</Link>
          </Button>
        </div>
        <ParqWaiverDialog
          open={parqOpen}
          flags={parqFlags}
          confirmLabel="I confirm — open my workout"
          onConfirm={() => {
            setParqOpen(false);
            setParqBlocked(false);
          }}
          onCancel={() => setParqOpen(false)}
        />
      </div>
    );



  return (
    <WorkoutDisplay workout={w} onComplete={complete}>
      <CachedNotice savedAt={cached.savedAt} show={cached.fromCache} />
      <WorkoutStatusPanel
        workoutId={workoutId}
        status={done ? "completed" : scheduledAt ? "scheduled" : "created"}
        scheduledAt={scheduledAt}
        onChange={(next) => {
          setDone(next.status === "completed");
          if (next.status !== "completed") setSaved(false);
          setScheduledAt(next.scheduledAt);
        }}
      />

      <PerformancePanel workoutId={workoutId} />




      <section className="mt-6 rounded-2xl border-2 border-blue-400 bg-card p-5">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Share2 className="h-4 w-4 text-primary" /> Smarty Community
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {shared
            ? "This workout is shared. Members can discover it, do it, like it and comment on it — it can never be edited."
            : "Share this workout with the community so other members can train it exactly as generated."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            className="h-12 rounded-2xl font-bold"
            variant={shared ? "secondary" : "default"}
            onClick={toggleShare}
            disabled={sharing}
          >
            {shared ? "Stop sharing" : "Share with community"}
          </Button>
          <Button asChild variant="secondary" className="h-12 rounded-2xl">
            <Link to="/community">Open community</Link>
          </Button>
        </div>
      </section>

      {!done ? (
        <Button size="lg" className="mt-6 h-14 w-full rounded-2xl text-base font-bold" onClick={complete}>
          I finished this workout
        </Button>
      ) : saved ? (
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button asChild size="lg" className="h-12 w-full rounded-2xl font-bold">
            <Link to="/coach">Next workout</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-12 w-full rounded-2xl font-bold">
            <Link to="/logbook" search={{ filter: "all" as const, view: "list" as const }}>Open logbook</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-5 rounded-2xl border-2 border-blue-400 bg-card p-5">
          <div>
            <h3 className="text-lg font-bold">How was the workout?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Private — only you and Smarty Coach see this. It tunes your next workouts and never
              appears in the community.
            </p>
          </div>
          <Choice label="Difficulty" options={DIFF} value={difficulty} onChange={setDifficulty} />
          <Choice label="How did you feel?" options={FEEL} value={feeling} onChange={setFeeling} />
          <Choice label="Did you enjoy it?" options={YESNO} value={enjoyed} onChange={setEnjoyed} />
          <Choice label="Would you do it again?" options={REPEAT} value={repeat} onChange={setRepeat} />
          <Textarea
            rows={2}
            placeholder="Anything you want Smarty Coach to remember? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button size="lg" className="h-12 w-full rounded-2xl font-bold" onClick={saveFeedback}>
            Save feedback
          </Button>
        </div>
      )}
    </WorkoutDisplay>
  );
}
