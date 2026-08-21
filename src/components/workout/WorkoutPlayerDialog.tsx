import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Check, ChevronLeft, ChevronRight, Cylinder, Dumbbell, Minus, Pause, Play, Plus, RotateCcw, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useKeepScreenAwake } from "@/hooks/useKeepScreenAwake";
import { buildSlides, parseStepTiming, type WorkoutStep } from "@/lib/workout/parse-steps";
import {
  deriveStepTracking,
  deriveWorkoutResultModel,
  parsePlanned,
} from "@/lib/workout/tracking-model";
import { saveWorkoutResult, startWorkoutAttempt } from "@/lib/performance.functions";
import { prescriptionHash } from "@/lib/workout/prescription-fingerprint";
import { PerformanceEditorDialog } from "./PerformanceEditorDialog";
import { WorkoutResultDialog, type WorkoutResultInput } from "./WorkoutResultDialog";
import { SessionDebriefDialog } from "./SessionDebriefDialog";
import { getSessionFeedback } from "@/lib/feedback.functions";
import { setWorkoutStatus } from "@/lib/coach.functions";
import { useExerciseMedia } from "./ExerciseMediaProvider";
import { useAuth } from "@/hooks/useAuth";
import {
  completeLocalAttempt,
  createLocalAttempt,
  readLocalPerformance,
  saveLocalResult,
  saveLocalSet,
} from "@/lib/offline/performance-store";
import { enqueueAction } from "@/lib/offline/queue";


function fmt(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutPlayerDialog({
  open,
  onOpenChange,
  steps,
  softTissue = [],
  workoutName,
  workoutId,
  category = null,
  format = null,
  html = null,
  onFinish,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: WorkoutStep[];
  softTissue?: string[];
  workoutName: string;
  workoutId: string;
  category?: string | null;
  format?: string | null;
  html?: string | null;
  onFinish: () => void;
}) {
  const slides = useMemo(() => buildSlides(steps, softTissue), [steps, softTissue]);
  const resultModel = useMemo(
    () => deriveWorkoutResultModel({ category, format, html, steps }),
    [category, format, html, steps],
  );
  const storeResult = useServerFn(saveWorkoutResult);
  useServerFn(startWorkoutAttempt);
  const readFeedback = useServerFn(getSessionFeedback);
  const markStatus = useServerFn(setWorkoutStatus);
  const { user } = useAuth();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const loggedAnythingRef = useRef(false);
  const planHash = useMemo(
    () => prescriptionHash({ format, category, steps }),
    [format, category, steps],
  );

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
  const [heldSeconds, setHeldSeconds] = useState("");
  const [distance, setDistance] = useState("");
  const [savingSet, setSavingSet] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<Awaited<ReturnType<typeof getSessionFeedback>>["feedback"]>(null);
  const [attempt, setAttempt] = useState(1);
  const [lastSet, setLastSet] = useState<Record<number, { reps: string; weight: string; seconds: string; distance: string }>>({});
  const beepRef = useRef<number>(0);
  const loggableRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  useKeepScreenAwake(open);

  useEffect(() => {
    if (open && startedAtRef.current === null) startedAtRef.current = Date.now();
    if (!open) startedAtRef.current = null;
  }, [open]);

  // Each run of a workout is its own attempt, so repeats never overwrite history.
  useEffect(() => {
    if (!open) return;
    let active = true;
    if (!user) return;
    createLocalAttempt(user.id, workoutId)
      .then((res) => {
        if (active) {
          setAttempt(res.attempt);
          setAttemptId(res.id);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [open, workoutId, user?.id]);

  // The phone back button steps back one slide instead of quitting the session.
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    window.history.pushState({ smartyPlayer: true }, "");
    const onPop = () => {
      if (api && api.canScrollPrev()) {
        api.scrollPrev();
        window.history.pushState({ smartyPlayer: true }, "");
        return;
      }
      onOpenChange(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, api, onOpenChange]);



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

  const equipment =
    slide?.kind === "exercise" ? (details[slide.step.exerciseId]?.equipment ?? null) : null;

  // What is worth recording on THIS step — never a blanket assumption.
  const tracking = useMemo(
    () =>
      slide?.kind === "exercise"
        ? deriveStepTracking({ step: slide.step, category, format, equipment })
        : null,
    [slide, category, format, equipment],
  );
  const planned = useMemo(
    () => (slide?.kind === "exercise" ? parsePlanned(slide.step.prescription) : null),
    [slide],
  );

  // The countdown must not jump away from a step that still wants numbers.
  useEffect(() => {
    loggableRef.current = Boolean(tracking && tracking.primary !== "completion");
  }, [tracking]);

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
    setHeldSeconds("");
    setDistance("");
    if (timing.mode === "timed") setRemaining(timing.seconds);
    else if (timing.mode === "tabata") setRemaining(timing.work);
    else setRemaining(0);
  }, [index, timing]);

  async function logSet() {
    if (!slide || slide.kind !== "exercise" || !tracking) return;
    const repsValue = tracking.primary === "reps" && reps.trim() ? Number(reps) : null;
    const weightValue = tracking.load && weight.trim() ? Number(weight) : null;
    const distanceValue = tracking.distance && distance.trim() ? Number(distance) : null;
    const typedSeconds = heldSeconds.trim() ? Number(heldSeconds) : null;
    const measuredSeconds =
      tracking.primary === "duration" && timing.mode === "timed" && remaining < timing.seconds
        ? timing.seconds - remaining
        : null;
    const secondsValue = typedSeconds ?? measuredSeconds;

    if (
      repsValue === null &&
      weightValue === null &&
      secondsValue === null &&
      distanceValue === null
    ) {
      toast.error("Nothing to log yet — add a value first.");
      return;
    }
    setSavingSet(true);
    if (!user) {
      setSavingSet(false);
      return;
    }
    const setNumber = (logged[index] ?? 0) + 1;
    const id = crypto.randomUUID();
    const completedAt = new Date().toISOString();
    const row = {
      id,
      workout_id: workoutId,
      attempt,
      step_index: index,
      exercise_id: slide.step.exerciseId || null,
      exercise_name: slide.step.name,
      section: slide.step.section ?? null,
      set_number: setNumber,
      reps: repsValue,
      weight_kg: weightValue,
      seconds: secondsValue,
      distance_m: distanceValue,
      metric: tracking.metric,
      // Planned values are parsed from the prescription so planned vs actual is
      // possible. Nothing is filled in on the athlete's behalf.
      planned_reps: planned?.reps ?? null,
      planned_weight_kg: planned?.weightKg ?? null,
      planned_seconds: planned?.seconds ?? null,
      partial:
        planned?.reps != null && repsValue != null ? repsValue < planned.reps : false,
      completed_at: completedAt,
      rpe: null,
      rounds: null,
      interval_index: null,
    };
    await saveLocalSet(user.id, row);
    await enqueueAction("set-log", { ...row, user_id: user.id }, user.id, 0);
    const { error } = await supabase.from("set_logs").upsert({ ...row, user_id: user.id } as never, {
      onConflict: "id",
    });
    setSavingSet(false);
    if (error) {
      toast.success(`Set ${setNumber} saved on this device.`);
    } else {
      toast.success(`Set ${setNumber} logged.`);
    }
    setLogged((prev) => ({ ...prev, [index]: setNumber }));
    setLastSet((prev) => ({
      ...prev,
      [index]: { reps, weight, seconds: heldSeconds, distance },
    }));
    setReps("");
    setWeight("");
    setHeldSeconds("");
    setDistance("");
    loggedAnythingRef.current = true;
  }

  /**
   * Leaving early never loses work: if anything was logged, the attempt is
   * still marked completed. Performance data is optional either way.
   */
  async function closePlayer() {
    onOpenChange(false);
    if (!loggedAnythingRef.current) return;
    loggedAnythingRef.current = false;
    if (user) {
      await completeLocalAttempt(user.id, workoutId, attempt);
      await enqueueAction(
        "workout-status",
        { workoutId, status: "completed" },
        user.id,
        0,
      );
    }
    try {
      await markStatus({ data: { workoutId, status: "completed" } });
      onFinish();
    } catch {
      toast.success("Workout completion saved on this device.");
      onFinish();
    }
  }

  function finishWorkout() {
    setRecapOpen(true);
  }

  function afterRecap() {
    setRecapOpen(false);
    if (resultModel.metric !== "none") {
      setResultOpen(true);
      return;
    }
    void openDebrief();
  }

  /**
   * One debrief per attempt. If the questions were already answered for this
   * attempt (for example on the workout page), they are never asked again.
   */
  async function openDebrief() {
    try {
      const res = await readFeedback({ data: { workoutId, attempt } });
      const fb = (res as { feedback: typeof existingFeedback }).feedback;
      if (fb && (fb.rpe !== null || fb.feeling || fb.enjoyed || fb.wouldRepeat)) {
        onFinish();
        return;
      }
      setExistingFeedback(fb);
    } catch {
      setExistingFeedback(null);
    }
    setDebriefOpen(true);
  }

  async function submitResult(result: WorkoutResultInput) {
    setResultOpen(false);
    const hasAnything =
      result.durationSeconds !== null ||
      result.rounds !== null ||
      result.intervalsDone !== null ||
      result.finished !== null;
    if (hasAnything) {
      if (user) {
        const id = attemptId ?? crypto.randomUUID();
        const performedAt = new Date(startedAtRef.current ?? Date.now()).toISOString();
        const local = await saveLocalResult(user.id, {
            id,
            workout_id: workoutId,
            attempt,
            prescription_hash: planHash,
            performed_at: performedAt,
            format,
            category,
            metric: resultModel.metric,
            duration_seconds: result.durationSeconds,
            rounds: result.rounds,
            extra_reps: result.extraReps,
            intervals_done: result.intervalsDone,
            intervals_total: resultModel.intervalsTotal,
            finished: result.finished,
            rpe: null,
            analysis_note: null,
            data_points: [result.durationSeconds, result.rounds, result.intervalsDone].filter((v) => v !== null).length,
            created_at: performedAt,
        });
        await enqueueAction("workout-result", local, user.id, 0);
        void storeResult({ data: {
          workoutId, attempt, prescriptionHash: planHash, performedAt, format, category,
          metric: resultModel.metric, durationSeconds: result.durationSeconds, rounds: result.rounds,
          extraReps: result.extraReps, intervalsDone: result.intervalsDone,
          intervalsTotal: resultModel.intervalsTotal, finished: result.finished,
        } }).catch(() => undefined);
      }
    }
    void openDebrief();
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
        // Loggable steps stop here so there is time to write the numbers down.
        if (!loggableRef.current) window.setTimeout(() => api?.scrollNext(), 400);
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
            onClick={() => void closePlayer()}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-3 h-1 w-full bg-neutral-800">
          <div className="h-1 bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="relative flex-1 overflow-hidden">
          <Carousel setApi={setApi} className="h-full overflow-hidden">
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

          <button
            type="button"
            aria-label="Previous exercise"
            onClick={() => api?.scrollPrev()}
            className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-neutral-900/70 text-neutral-50 shadow-lg backdrop-blur-sm transition hover:bg-neutral-800/90 active:scale-95"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Next exercise"
            onClick={() => api?.scrollNext()}
            className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-neutral-900/70 text-neutral-50 shadow-lg backdrop-blur-sm transition hover:bg-neutral-800/90 active:scale-95"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>



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

          {slide?.kind === "exercise" && tracking && tracking.primary !== "completion" ? (
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                {tracking.primary === "reps" ? (
                  <StepperField
                    label={
                      tracking.windowSeconds
                        ? `Reps in ${tracking.windowSeconds}s`
                        : "Reps completed"
                    }
                    value={reps}
                    onChange={setReps}
                    step={1}
                  />
                ) : (
                  <StepperField
                    label="Seconds held"
                    value={heldSeconds}
                    onChange={setHeldSeconds}
                    step={5}
                  />
                )}
                {tracking.load ? (
                  <StepperField label="Weight (kg)" value={weight} onChange={setWeight} step={2.5} />
                ) : null}
                {tracking.distance ? (
                  <StepperField label="Distance (m)" value={distance} onChange={setDistance} step={50} />
                ) : null}
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
              {lastSet[index] ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-neutral-300"
                  disabled={savingSet}
                  onClick={() => {
                    const prev = lastSet[index]!;
                    setReps(prev.reps);
                    setWeight(prev.weight);
                    setHeldSeconds(prev.seconds);
                    setDistance(prev.distance);
                  }}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Repeat last set
                </Button>
              ) : null}
              {planned && (planned.sets || planned.reps || planned.weightKg) ? (
                <p className="text-center text-[11px] text-neutral-500">
                  Prescribed{" "}
                  {planned.sets && planned.reps
                    ? `${planned.sets} × ${planned.reps}`
                    : planned.reps
                      ? `${planned.reps} reps`
                      : `${planned.sets} sets`}
                  {planned.weightKg ? ` @ ${planned.weightKg} kg` : ""} · logged{" "}
                  {logged[index] ?? 0}
                  {planned.sets ? ` of ${planned.sets}` : ""} · you can also fill this in at the end
                </p>
              ) : (
                <p className="text-center text-[11px] text-neutral-500">
                  Skip it if you are moving — you can fill it in on the recap at the end.
                </p>
              )}
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
              <Button onClick={finishWorkout}>Finish workout</Button>
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
            <Button variant="secondary" className="w-full" onClick={finishWorkout}>
              Finish workout
            </Button>
          ) : null}
        </div>

        <SessionDebriefDialog
          open={debriefOpen}
          onOpenChange={(o) => {
            setDebriefOpen(o);
            if (!o) onFinish();
          }}
          workoutId={workoutId}
          attempt={attempt}
          initial={existingFeedback}
          onSaved={() => {
            if (user) void completeLocalAttempt(user.id, workoutId, attempt);
          }}
        />

        <PerformanceEditorDialog
          open={recapOpen}
          onOpenChange={(o) => {
            if (!o) afterRecap();
            else setRecapOpen(true);
          }}
          workoutId={workoutId}
          attempt={attempt}
          steps={steps}
          category={category}
          format={format}
          title="Session recap"
          onSaved={afterRecap}
        />

        <WorkoutResultDialog
          open={resultOpen}
          onOpenChange={setResultOpen}
          model={resultModel}
          elapsedSeconds={
            startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : null
          }
          onSubmit={submitResult}
        />
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

function StepperField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  step: number;
}) {
  const bump = (delta: number) => {
    const current = value.trim() === "" ? 0 : Number(value);
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    onChange(String(next));
  };
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <p className="truncate text-[10px] uppercase tracking-[0.15em] text-neutral-400">{label}</p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-11 w-9 shrink-0"
          onClick={() => bump(-step)}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 min-w-0 flex-1 border-neutral-700 bg-neutral-900 text-center text-neutral-50"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-11 w-9 shrink-0"
          onClick={() => bump(step)}
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
