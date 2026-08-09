import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CalendarClock, CheckCircle2, RotateCcw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { setWorkoutStatus } from "@/lib/coach.functions";
import { getMyAccessState } from "@/lib/access.functions";
import { toast } from "sonner";
import { WorkoutDisplay, type WorkoutRow } from "@/components/workout/WorkoutDisplay";

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
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              value === o
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary/50"
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
  const [showSchedule, setShowSchedule] = useState(false);
  const saveStatus = useServerFn(setWorkoutStatus);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("workouts").select("*").eq("id", workoutId).maybeSingle();
      const row = (data as unknown as WorkoutRow) ?? null;
      setW(row);
      if ((row as { is_wod?: boolean } | null)?.is_wod) {
        const access = await getMyAccessState({}).catch(() => null);
        setLocked(!access?.premium);
      }
      if (row?.status === "completed") setDone(true);
      const sched = (data as { scheduled_at?: string | null } | null)?.scheduled_at;
      if (sched) setScheduledAt(new Date(sched).toISOString().slice(0, 16));
      setLoading(false);
    })();
  }, [workoutId]);

  async function complete() {
    await saveStatus({ data: { workoutId, status: "completed" } });
    setDone(true);
    toast.success("Marked as completed.");
  }

  async function markNotCompleted() {
    await saveStatus({ data: { workoutId, status: "created" } });
    setDone(false);
    setSaved(false);
    toast.success("Marked as not completed.");
  }

  async function schedule() {
    if (!scheduledAt) return;
    await saveStatus({
      data: {
        workoutId,
        status: "scheduled",
        scheduled_at: new Date(scheduledAt).toISOString(),
      },
    });
    setShowSchedule(false);
    toast.success("Scheduled — it will show in your logbook calendar.");
  }

  async function clearSchedule() {
    await saveStatus({ data: { workoutId, status: "created", scheduled_at: null } });
    setScheduledAt("");
    setShowSchedule(false);
    toast.success("Schedule removed.");
  }

  async function saveFeedback() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
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
      toast.error(error.message);
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

  return (
    <WorkoutDisplay workout={w} onComplete={complete}>
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-lg font-bold">Workout status</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {done
            ? "Completed — nice work."
            : scheduledAt
              ? `Scheduled for ${new Date(scheduledAt).toLocaleString()}`
              : "Not completed yet."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button size="lg" className="h-12 rounded-2xl" onClick={complete} disabled={done}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Completed
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-12 rounded-2xl"
            onClick={markNotCompleted}
            disabled={!done}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Not completed
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-12 rounded-2xl"
            onClick={() => setShowSchedule((v) => !v)}
          >
            <CalendarClock className="mr-2 h-4 w-4" /> Schedule
          </Button>
        </div>
        {showSchedule ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-12 flex-1 rounded-2xl border border-border bg-background px-3 text-sm"
            />
            <Button className="h-12 rounded-2xl" onClick={schedule}>
              Save date
            </Button>
            {scheduledAt ? (
              <Button variant="ghost" className="h-12 rounded-2xl" onClick={clearSchedule}>
                Clear
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      {!done ? (
        <Button size="lg" className="mt-6 h-14 w-full rounded-2xl text-base font-bold" onClick={complete}>
          I finished this workout
        </Button>
      ) : saved ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="flex-1">
            <Link to="/coach">Next workout</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="flex-1">
            <Link to="/logbook" search={{ filter: "all" as const, view: "list" as const }}>Open logbook</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-lg font-bold">How was the workout?</h3>
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
          <Button size="lg" className="w-full" onClick={saveFeedback}>
            Save feedback
          </Button>
        </div>
      )}
    </WorkoutDisplay>
  );
}
