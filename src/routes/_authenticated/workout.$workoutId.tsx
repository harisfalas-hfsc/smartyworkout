import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ExerciseGif } from "@/components/ExerciseGif";
import { Loader2, Star, Clock, MapPin, Dumbbell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { WorkoutBlock, WorkoutPlan } from "@/lib/coach-options";

export const Route = createFileRoute("/_authenticated/workout/$workoutId")({
  head: () => ({
    meta: [
      { title: "Your workout — Smarty Coach" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkoutPage,
});

type Workout = {
  id: string;
  name: string;
  category: string;
  format: string | null;
  focus: string | null;
  difficulty_stars: number;
  duration_min: number;
  equipment: string[] | null;
  location: string | null;
  mood: string | null;
  description: string | null;
  instructions: string | null;
  tips: string[] | null;
  rationale: string | null;
  plan: WorkoutPlan;
  status: string;
};

const DIFF = ["Too Easy", "Just Right", "Hard", "Very Hard"];
const FEEL = ["Excellent", "Good", "Normal", "Tired", "Exhausted"];
const YESNO = ["Yes", "Neutral", "No"];
const REPEAT = ["Yes", "Maybe", "No"];

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < n ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
        />
      ))}
    </span>
  );
}

function Block({ block }: { block: WorkoutBlock }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold">{block.title}</h3>
        {block.format ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
            {block.format}
          </span>
        ) : null}
        {block.rounds ? (
          <span className="text-xs text-muted-foreground">{block.rounds} rounds</span>
        ) : null}
      </div>
      {block.instructions ? (
        <p className="mb-3 text-sm text-muted-foreground">{block.instructions}</p>
      ) : null}
      <ul className="space-y-3">
        {block.items.map((it, i) => (
          <li key={i} className="flex gap-3 rounded-xl border border-border/60 p-3">
            <ExerciseGif path={it.gif_path ?? null} alt={it.name} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{it.name}</p>
              <p className="text-sm text-muted-foreground">
                {[
                  it.sets ? `${it.sets} sets` : null,
                  it.reps ? `${it.reps} reps` : null,
                  it.duration,
                  it.tempo ? `tempo ${it.tempo}` : null,
                  it.rest ? `rest ${it.rest}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {it.notes ? <p className="mt-1 text-sm text-foreground/80">{it.notes}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  const [w, setW] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [difficulty, setDifficulty] = useState("Just Right");
  const [feeling, setFeeling] = useState("Good");
  const [enjoyed, setEnjoyed] = useState("Yes");
  const [repeat, setRepeat] = useState("Yes");
  const [comment, setComment] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("workouts").select("*").eq("id", workoutId).maybeSingle();
      const row = (data as unknown as Workout) ?? null;
      setW(row);
      if (row?.status === "completed") setDone(true);
      setLoading(false);
    })();
  }, [workoutId]);

  async function complete() {
    await supabase
      .from("workouts")
      .update({ status: "completed", completed_at: new Date().toISOString() } as never)
      .eq("id", workoutId);
    setDone(true);
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
  if (!w)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Workout not found.</p>
        <Button asChild className="mt-4">
          <Link to="/coach">Back to Smarty Coach</Link>
        </Button>
      </div>
    );

  const blocks = w.plan?.blocks ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {w.category} {w.format ? `· ${w.format}` : ""}
        </p>
        <h1 className="mt-1 text-3xl font-black">{w.name}</h1>
        {w.focus ? <p className="mt-1 text-muted-foreground">{w.focus}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <Stars n={w.difficulty_stars} />
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" /> {w.duration_min} min
          </span>
          {w.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {w.location}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Dumbbell className="h-4 w-4" /> {(w.equipment ?? []).join(", ") || "bodyweight"}
          </span>
        </div>
        {w.rationale ? (
          <div className="mt-5 rounded-2xl bg-primary/10 p-4 text-sm">
            <p className="font-semibold text-primary">Smarty Coach</p>
            <p className="mt-1">{w.rationale}</p>
          </div>
        ) : null}
        {w.description ? <p className="mt-4 text-sm">{w.description}</p> : null}
        {w.instructions ? (
          <p className="mt-3 text-sm text-muted-foreground">{w.instructions}</p>
        ) : null}

        {!started && !done ? (
          <Button size="lg" className="mt-6 w-full" onClick={() => setStarted(true)}>
            Start workout
          </Button>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        {blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>

      {w.tips?.length ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-bold">Coach tips</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {w.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!done ? (
        <Button size="lg" className="mt-6 w-full" onClick={complete}>
          <CheckCircle2 className="mr-2 h-4 w-4" /> I finished this workout
        </Button>
      ) : saved ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="flex-1">
            <Link to="/coach">Next workout</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="flex-1">
            <Link to="/logbook">Open logbook</Link>
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
    </div>
  );
}
