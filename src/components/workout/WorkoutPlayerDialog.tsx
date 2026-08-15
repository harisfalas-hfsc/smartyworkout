import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Check, ChevronLeft, ChevronRight, Dumbbell, Pause, Play, RotateCcw, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useKeepScreenAwake } from "@/hooks/useKeepScreenAwake";
import { buildSlides, parseStepTiming, type WorkoutStep } from "@/lib/workout/parse-steps";
import { useExerciseMedia } from "./ExerciseMediaProvider";


function fmt(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutPlayerDialog({
  open,
  onOpenChange,
  steps,
  workoutName,
  workoutId,
  onFinish,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: WorkoutStep[];
  workoutName: string;
  workoutId: string;
  onFinish: () => void;
}) {
  const slides = useMemo(() => buildSlides(steps), [steps]);
  const { details, ensure } = useExerciseMedia();
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"work" | "rest">("work");
  const [remaining, setRemaining] = useState(0);
  const [round, setRound] = useState(1);
  const [logged, setLogged] = useState<Record<number, number>>({});
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [savingSet, setSavingSet] = useState(false);
  const beepRef = useRef<number>(0);

  useKeepScreenAwake(open);


  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const slide = slides[index];
  const timing = useMemo(
    () => (slide?.kind === "exercise" ? parseStepTiming(slide.step) : { mode: "manual" as const }),
    [slide],
  );

  // Preload media for the current window of slides.
  useEffect(() => {
    if (!open) return;
    const window_ = slides
      .slice(Math.max(0, index - 1), index + 4)
      .filter((s) => s.kind === "exercise")
      .map((s) => (s.kind === "exercise" ? s.step.exerciseId : ""))
      .filter(Boolean);
    if (window_.length) ensure(window_);
  }, [index, open, slides, ensure]);

  // Reset the timer whenever the slide changes.
  useEffect(() => {
    setRunning(false);
    setPhase("work");
    setRound(1);
    setReps("");
    setWeight("");
    if (timing.mode === "timed") setRemaining(timing.seconds);
    else if (timing.mode === "tabata") setRemaining(timing.work);
    else setRemaining(0);
  }, [index, timing]);

  async function logSet() {
    if (!slide || slide.kind !== "exercise") return;
    const repsValue = reps.trim() ? Number(reps) : null;
    const weightValue = weight.trim() ? Number(weight) : null;
    const secondsValue = timing.mode === "timed" ? timing.seconds : null;
    if (repsValue === null && weightValue === null && secondsValue === null) {
      toast.error("Add reps or weight first.");
      return;
    }
    setSavingSet(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSavingSet(false);
      return;
    }
    const setNumber = (logged[index] ?? 0) + 1;
    const { error } = await supabase.from("set_logs").insert({
      user_id: auth.user.id,
      workout_id: workoutId,
      step_index: index,
      exercise_id: slide.step.exerciseId || null,
      exercise_name: slide.step.name,
      section: slide.step.section ?? null,
      set_number: setNumber,
      reps: repsValue,
      weight_kg: weightValue,
      seconds: secondsValue,
    } as never);
    setSavingSet(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLogged((prev) => ({ ...prev, [index]: setNumber }));
    setReps("");
    setWeight("");
    toast.success(`Set ${setNumber} logged.`);
  }


  useEffect(() => {
    if (!running || timing.mode === "manual") return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev > 1) return prev - 1;
        if (timing.mode === "tabata") {
          if (phase === "work") {
            setPhase("rest");
            return timing.rest;
          }
          if (round < timing.rounds) {
            setRound((r) => r + 1);
            setPhase("work");
            return timing.work;
          }
        }
        setRunning(false);
        beepRef.current += 1;
        window.setTimeout(() => api?.scrollNext(), 400);
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, timing, phase, round, api]);

  if (!open) return null;

  const total = slides.length;
  const progress = total ? ((index + 1) / total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[100dvh] max-w-none gap-0 overflow-hidden border-0 bg-neutral-950 p-0 text-neutral-50 [&>button]:hidden sm:h-[92vh] sm:max-w-md sm:rounded-3xl"
      >
        <DialogTitle className="sr-only">{workoutName} player</DialogTitle>

        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              {slide?.kind === "exercise" ? slide.step.section : "Transition"}
            </p>
            <p className="text-sm text-neutral-400">
              {index + 1} / {total}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-neutral-300 hover:text-neutral-50"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-3 h-1 w-full bg-neutral-800">
          <div className="h-1 bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>

        <Carousel setApi={setApi} className="flex-1 overflow-hidden">
          <CarouselContent className="ml-0 h-full">
            {slides.map((s, i) => (
              <CarouselItem key={i} className="pl-0">
                {s.kind === "soft-tissue" ? (
                  <SoftTissueSlide lines={s.lines} />
                ) : s.kind === "break" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                    <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">Next up</p>
                    <h2 className="text-3xl font-black">{s.next}</h2>
                    <p className="text-neutral-400">Take a breath and reset.</p>
                  </div>
                ) : (
                  <PlayerSlideView
                    step={s.step}
                    gifUrl={details[s.step.exerciseId]?.gif_url ?? null}
                  />
                )}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>


        <div className="space-y-3 border-t border-neutral-800 px-4 py-4">
          {timing.mode !== "manual" ? (
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
                {timing.mode === "tabata" ? `${phase} · round ${round}/${timing.rounds}` : phase}
              </p>
              <p className="font-mono text-5xl font-black tabular-nums">{fmt(remaining)}</p>
            </div>
          ) : (
            <p className="text-center text-sm text-neutral-400">
              Complete the prescribed reps, then swipe.
            </p>
          )}

          {slide?.kind === "exercise" ? (
            <div className="flex items-center gap-2">
              <Input
                inputMode="numeric"
                placeholder="Reps"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="h-11 flex-1 border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500"
              />
              <Input
                inputMode="decimal"
                placeholder="kg"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-11 flex-1 border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500"
              />
              <Button
                variant="secondary"
                className="h-11 shrink-0"
                disabled={savingSet}
                onClick={logSet}
              >
                <Check className="mr-1.5 h-4 w-4" />
                Log set {(logged[index] ?? 0) + 1}
              </Button>
            </div>
          ) : null}



          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-neutral-300"
              onClick={() => api?.scrollPrev()}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            {timing.mode !== "manual" ? (
              <div className="flex gap-2">
                <Button onClick={() => setRunning((r) => !r)} className="min-w-32">
                  {running ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {running ? "Pause" : "Start"}
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    setRunning(false);
                    setPhase("work");
                    setRound(1);
                    setRemaining(timing.mode === "tabata" ? timing.work : timing.seconds);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            ) : index === total - 1 ? (
              <Button onClick={onFinish}>Finish workout</Button>
            ) : (
              <Button onClick={() => api?.scrollNext()}>Done — next</Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="text-neutral-300"
              onClick={() => api?.scrollNext()}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {index === total - 1 && timing.mode !== "manual" ? (
            <Button variant="secondary" className="w-full" onClick={onFinish}>
              Finish workout
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SoftTissueSlide({ lines }: { lines: string[] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-40 w-40 items-center justify-center rounded-full bg-neutral-900">
        <Cylinder className="h-16 w-16 text-primary" />
      </div>
      <h2 className="text-2xl font-black">Soft Tissue Preparation</h2>
      <p className="text-sm text-neutral-400">
        Foam roller, lacrosse or trigger ball. Take your time before you move.
      </p>
      <ul className="w-full space-y-2 text-left">
        {lines.map((line, i) => (
          <li
            key={i}
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-200"
          >
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlayerSlideView({ step, gifUrl }: { step: WorkoutStep; gifUrl: string | null }) {

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-5 text-center">
      <div className="flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl bg-neutral-900">
        {gifUrl ? (
          <img
            src={gifUrl}
            alt={`${step.name} demonstration`}
            className="h-full w-full object-contain"
          />
        ) : (
          <Dumbbell className="h-10 w-10 text-neutral-600" />
        )}
      </div>
      {step.subSection ? (
        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {step.subSection}
        </span>
      ) : null}
      <h2 className="text-2xl font-black capitalize">{step.name}</h2>
      {step.prescription ? (
        <p className="text-lg text-neutral-300">{step.prescription}</p>
      ) : null}
    </div>
  );
}
