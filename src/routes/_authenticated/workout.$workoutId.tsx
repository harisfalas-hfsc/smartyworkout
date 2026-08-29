import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRemoteData } from "@/lib/remote-data";
import { useOnlineStatus } from "@/lib/connectivity";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { SessionDebriefDialog } from "@/components/workout/SessionDebriefDialog";
import { getSessionFeedback, type SessionFeedback } from "@/lib/feedback.functions";

import { ParqWaiverDialog } from "@/components/ParqWaiverDialog";
import { hasParqAck, setParqAck } from "@/lib/parq-ack";

export const Route = createFileRoute("/_authenticated/workout/$workoutId")({
  head: () => ({
    meta: [
      { title: "Your workout — Smarty Coach" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkoutPage,
});

function WorkoutPage() {
  const { workoutId } = Route.useParams();
  const [w, setW] = useState<WorkoutRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [debriefOpen, setDebriefOpen] = useState(false);
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
  const readFeedback = useServerFn(getSessionFeedback);

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

  const cached = useRemoteData<{
    row: WorkoutRow | null;
    access: Awaited<ReturnType<typeof getMyAccessState>> | null;
  }>(`workout:${workoutId}`, load);

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
      if (!hasParqAck()) {
        setParqBlocked(true);
        setParqOpen(true);
      }
    }
    setShared(Boolean((row as { is_shared?: boolean } | null)?.is_shared));
    if (row?.status === "completed") setDone(true);
    const sched = (row as { scheduled_at?: string | null } | null)?.scheduled_at;
    if (sched) setScheduledAt(new Date(sched).toISOString().slice(0, 16));
    setLoading(false);
  }, [cached.data, cached.loading]);


  const refreshFeedback = useCallback(async () => {
    try {
      const res = await readFeedback({ data: { workoutId } });
      setFeedback((res as { feedback: SessionFeedback | null }).feedback);
    } catch {
      /* offline — the debrief can still be answered and queued */
    }
  }, [workoutId, readFeedback]);

  useEffect(() => {
    void refreshFeedback();
  }, [refreshFeedback]);

  async function complete() {
    setDone(true);
    void refreshFeedback();
    // Same rule as the player and the logbook: completing opens the recap right away.
    if (!hasAnswers) setDebriefOpen(true);
    try {
      await saveStatus({ data: { workoutId, status: "completed" } });
      toast.success("Marked as completed.");
    } catch {
      toast.error("Could not mark this workout as completed. Please try again.");
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
            setParqAck();
            setParqOpen(false);
            setParqBlocked(false);
          }}
          onCancel={() => setParqOpen(false)}
        />
      </div>
    );



  const hasAnswers = Boolean(
    feedback && (feedback.rpe !== null || feedback.feeling || feedback.enjoyed || feedback.wouldRepeat),
  );

  return (
    <WorkoutDisplay
      workout={w}
      onComplete={complete}
      onPlayerClosed={() => {
        void refreshFeedback();
      }}
    >
      <WorkoutStatusPanel
        workoutId={workoutId}
        status={done ? "completed" : scheduledAt ? "scheduled" : "created"}
        scheduledAt={scheduledAt}
        onChange={(next) => {
          setDone(next.status === "completed");
          setScheduledAt(next.scheduledAt);
        }}
      />

      <PerformancePanel
        workoutId={workoutId}
        html={w.main_workout ?? ""}
        category={w.category ?? null}
        format={w.format ?? null}
      />




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
      ) : (
        <section className="mt-6 space-y-4 rounded-2xl border-2 border-blue-400 bg-card p-5">
          <div>
            <h3 className="text-lg font-bold">Your session debrief</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasAnswers
                ? "Saved from your session — private, only you and Smarty Coach see it. Edit any answer and it updates everywhere."
                : "Private — only you and Smarty Coach see this. If you already answered in the player, your answers appear here automatically."}
            </p>
          </div>

          {hasAnswers ? (
            <div className="grid gap-2 text-sm">
              <SummaryRow label="Effort (RPE)" value={feedback?.rpe ? `${feedback.rpe} / 10` : "—"} />
              <SummaryRow label="How you felt" value={feedback?.feeling ?? "—"} />
              <SummaryRow label="Enjoyed it" value={feedback?.enjoyed ?? "—"} />
              <SummaryRow label="Would do again" value={feedback?.wouldRepeat ?? "—"} />
              {feedback?.note ? <SummaryRow label="Your note" value={feedback.note} /> : null}
            </div>
          ) : null}

          <Button
            size="lg"
            variant={hasAnswers ? "secondary" : "default"}
            className="h-12 w-full rounded-2xl font-bold"
            onClick={() => setDebriefOpen(true)}
          >
            {hasAnswers ? "Edit my answers" : "Answer 4 quick questions"}
          </Button>

          <SessionDebriefDialog
            open={debriefOpen}
            onOpenChange={setDebriefOpen}
            workoutId={workoutId}
            attempt={feedback?.attempt ?? 1}
            initial={feedback}
            onSaved={(fb) => setFeedback(fb)}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild size="lg" className="h-12 w-full rounded-2xl font-bold">
              <Link to="/coach">Next workout</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="h-12 w-full rounded-2xl font-bold">
              <Link to="/logbook" search={{ filter: "all" as const, view: "list" as const }}>Open logbook</Link>
            </Button>
          </div>
        </section>
      )}
    </WorkoutDisplay>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border-2 border-blue-400/40 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
