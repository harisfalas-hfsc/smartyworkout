import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  BookOpen,
  Clock,
  Dumbbell,
  Heart,
  MapPin,
  Minus,
  Plus,
  Share2,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ExerciseHTMLContent } from "./ExerciseHTMLContent";
import { ExerciseDetailDialog } from "./ExerciseDetailDialog";
import { ExerciseMediaProvider } from "./ExerciseMediaProvider";
import { WorkoutPlayerDialog } from "./WorkoutPlayerDialog";
import { extractSoftTissue, parseWorkoutSteps } from "@/lib/workout/parse-steps";
import { uniqueTokenIds } from "@/lib/workout/tokens";
import { difficultyLabel, MAX_STARS, normalizeStars } from "@/lib/workout/spec";
import { setWorkoutMeta } from "@/lib/coach.functions";

export type WorkoutRow = {
  id: string;
  serial?: number | null;
  name: string;
  category: string;
  format: string | null;
  focus: string | null;
  difficulty_stars: number;
  difficulty_label: string | null;
  duration_min: number;
  duration_label: string | null;
  equipment: string[] | null;
  location: string | null;
  image_url: string | null;
  description_html: string | null;
  instructions_html: string | null;
  tips_html: string | null;
  main_workout: string | null;
  created_by: string | null;
  is_favorite?: boolean | null;
  rating?: number | null;
  status: string;
};

function Stars({ n }: { n: number }) {
  const filled = normalizeStars(n);
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: MAX_STARS }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < filled ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
        />
      ))}
    </span>
  );
}

export function WorkoutDisplay({
  workout,
  onComplete,
  children,
}: {
  workout: WorkoutRow;
  onComplete: () => void;
  children?: React.ReactNode;
}) {
  const html = workout.main_workout ?? "";
  const ids = useMemo(() => uniqueTokenIds(html), [html]);
  const steps = useMemo(() => parseWorkoutSteps(html), [html]);
  const softTissue = useMemo(() => extractSoftTissue(html), [html]);
  const saveMeta = useServerFn(setWorkoutMeta);

  const [openExercise, setOpenExercise] = useState<string | null>(null);
  const [reader, setReader] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [player, setPlayer] = useState(false);
  const [favorite, setFavorite] = useState(Boolean(workout.is_favorite));

  async function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    try {
      await saveMeta({ data: { workoutId: workout.id, is_favorite: next } });
    } catch {
      setFavorite(!next);
      toast.error("Could not save that.");
    }
  }

  async function shareWorkoutLink() {
    const url = `${window.location.origin}/w/${workout.id}`;
    const bits = [
      workout.category,
      workout.difficulty_label ?? difficultyLabel(workout.difficulty_stars),
      workout.duration_label ?? `${workout.duration_min} min`,
      workout.location,
    ].filter(Boolean);
    const payload = {
      title: `${workout.name} — Smarty Workout`,
      text: `${workout.name} · ${bits.join(" · ")}`,
      url,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(payload);
        return;
      }
      await navigator.clipboard.writeText(`${payload.text}\n${url}`);
      toast.success("Link copied — paste it anywhere.");
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      toast.error("Could not open the share menu.");
    }
  }

  return (
    <ExerciseMediaProvider ids={ids}>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12 lg:max-w-5xl lg:px-8">
        <header className="rounded-3xl border-2 border-blue-400 bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <span>{workout.category}</span>
            {workout.format ? <span>· {workout.format}</span> : null}
            {workout.serial ? (
              <span className="text-muted-foreground">· #{workout.serial}</span>
            ) : null}
          </div>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{workout.name}</h1>
          {workout.focus ? <p className="mt-1 text-muted-foreground">{workout.focus}</p> : null}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Stars n={workout.difficulty_stars} />
            <span>{workout.difficulty_label ?? difficultyLabel(workout.difficulty_stars)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" /> {workout.duration_label ?? `${workout.duration_min} min`}
            </span>
            {workout.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {workout.location}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Dumbbell className="h-4 w-4" />
              {(workout.equipment ?? []).join(", ") || "bodyweight"}
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Created by {workout.created_by ?? "Haris Falas"} · Smarty Coach
          </p>

          {workout.image_url ? (
            <img
              src={workout.image_url}
              alt={`${workout.name} cover`}
              className="mt-5 h-52 w-full rounded-2xl object-cover"
            />
          ) : null}

          {workout.description_html ? (
            <div
              className="workout-html mt-5 text-sm"
              dangerouslySetInnerHTML={{ __html: workout.description_html }}
            />
          ) : null}

          <Button size="lg" className="mt-6 w-full" onClick={() => setPlayer(true)}>
            Start Your Workout
          </Button>
        </header>

        <div className="sticky top-2 z-20 mt-5 grid grid-cols-3 gap-2 rounded-2xl border-2 border-blue-400 bg-card/95 p-2 backdrop-blur">
          <Button
            variant="secondary"
            className="h-11 w-full rounded-xl px-2 text-sm font-semibold"
            onClick={() => setReader(true)}
          >
            <BookOpen className="mr-1.5 h-4 w-4 shrink-0" /> Reader
          </Button>
          <Button
            variant="secondary"
            className="h-11 w-full rounded-xl px-2 text-sm font-semibold"
            onClick={toggleFavorite}
          >
            <Heart
              className={`mr-1.5 h-4 w-4 shrink-0 ${favorite ? "fill-primary text-primary" : ""}`}
            />
            {favorite ? "Saved" : "Save"}
          </Button>
          <Button
            variant="secondary"
            className="h-11 w-full rounded-xl px-2 text-sm font-semibold"
            onClick={shareWorkoutLink}
          >
            <Share2 className="mr-1.5 h-4 w-4 shrink-0" /> Share
          </Button>
        </div>

        <article className="workout-html mt-5 rounded-3xl border-2 border-blue-400 bg-card p-5 sm:p-7">
          <ExerciseHTMLContent html={html} onOpenExercise={setOpenExercise} />
        </article>

        {workout.instructions_html ? (
          <section className="workout-html mt-5 rounded-2xl border-2 border-blue-400 bg-card p-5">
            <h2 className="mb-2 text-lg font-bold">How to perform this workout</h2>
            <div dangerouslySetInnerHTML={{ __html: workout.instructions_html }} />
          </section>
        ) : null}

        {workout.tips_html ? (
          <section className="workout-html mt-5 rounded-2xl border-2 border-blue-400 bg-card p-5">
            <h2 className="mb-2 text-lg font-bold">Coach tips</h2>
            <div dangerouslySetInnerHTML={{ __html: workout.tips_html }} />
          </section>
        ) : null}

        {children}
      </div>

      <ExerciseDetailDialog exerciseId={openExercise} onClose={() => setOpenExercise(null)} />

      <WorkoutPlayerDialog
        open={player}
        onOpenChange={setPlayer}
        steps={steps}
        softTissue={softTissue}
        workoutName={workout.name}
        workoutId={workout.id}

        onFinish={() => {
          setPlayer(false);
          onComplete();
        }}
      />

      <Dialog open={reader} onOpenChange={setReader}>
        <DialogContent className="h-[100dvh] w-full max-w-none overflow-x-hidden overflow-y-auto border-0 bg-background p-0 text-foreground [&>button]:hidden sm:h-[92vh] sm:max-w-2xl sm:rounded-3xl">
          <DialogTitle className="sr-only">{workout.name} reader mode</DialogTitle>
          <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-4 sm:py-3">
            <p className="min-w-0 truncate text-sm font-semibold sm:text-base">{workout.name}</p>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Decrease text size"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setFontSize((s) => Math.max(12, s - 2))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-6 text-center text-xs text-muted-foreground">{fontSize}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Increase text size"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setFontSize((s) => Math.min(30, s + 2))}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                className="ml-1 h-8 rounded-full px-3 font-bold"
                onClick={() => setReader(false)}
              >
                <X className="mr-1 h-4 w-4" /> Close
              </Button>
            </div>
          </div>
          <div
            className="workout-html reader w-full max-w-full overflow-x-hidden px-4 py-6 sm:px-6"
            style={{ fontSize }}
          >
            <ExerciseHTMLContent html={html} onOpenExercise={setOpenExercise} />
            <Button className="mt-8 w-full rounded-2xl font-bold" size="lg" onClick={() => setReader(false)}>
              Exit reader mode
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ExerciseMediaProvider>
  );
}
