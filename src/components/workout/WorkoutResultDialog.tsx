import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkoutResultModel } from "@/lib/workout/tracking-model";

export type WorkoutResultInput = {
  durationSeconds: number | null;
  rounds: number | null;
  extraReps: number | null;
  intervalsDone: number | null;
  finished: boolean | null;
  rpe: number | null;
};

function num(value: string): number | null {
  const t = value.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Optional. Everything left blank stays unavailable — nothing is estimated,
 * and skipping this never changes whether the workout counts as completed.
 */
export function WorkoutResultDialog({
  open,
  onOpenChange,
  model,
  elapsedSeconds,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: WorkoutResultModel;
  elapsedSeconds: number | null;
  onSubmit: (result: WorkoutResultInput) => void;
}) {
  const [rounds, setRounds] = useState("");
  const [extraReps, setExtraReps] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [intervals, setIntervals] = useState("");
  const [finished, setFinished] = useState<boolean | null>(null);
  const [rpe, setRpe] = useState<number | null>(null);

  function submit() {
    const m = num(minutes);
    const s = num(seconds);
    const duration =
      m === null && s === null ? null : Math.round((m ?? 0) * 60 + (s ?? 0));
    onSubmit({
      durationSeconds: duration,
      rounds: num(rounds),
      extraReps: num(extraReps),
      intervalsDone: num(intervals),
      finished,
      rpe,
    });
  }

  const showTime = model.metric === "for_time" || model.metric === "challenge";
  const showRounds = model.metric === "amrap" || model.metric === "challenge";
  const showIntervals = model.metric === "intervals";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl border-2 border-primary bg-neutral-950 p-5 text-neutral-50">
        <DialogTitle>Record your result</DialogTitle>
        <p className="text-sm text-neutral-400">
          Optional. Anything you leave blank is simply not recorded — the workout still counts as
          completed.
        </p>

        {showRounds ? (
          <div className="grid grid-cols-2 gap-2">
            <Input
              inputMode="numeric"
              placeholder="Rounds"
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
              className="h-11 border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500"
            />
            <Input
              inputMode="numeric"
              placeholder="+ extra reps"
              value={extraReps}
              onChange={(e) => setExtraReps(e.target.value)}
              className="h-11 border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500"
            />
          </div>
        ) : null}

        {showIntervals ? (
          <Input
            inputMode="numeric"
            placeholder={
              model.intervalsTotal
                ? `Intervals completed (of ${model.intervalsTotal})`
                : "Intervals completed"
            }
            value={intervals}
            onChange={(e) => setIntervals(e.target.value)}
            className="h-11 border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500"
          />
        ) : null}

        {showTime ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                inputMode="numeric"
                placeholder="Minutes"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="h-11 border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500"
              />
              <Input
                inputMode="numeric"
                placeholder="Seconds"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                className="h-11 border-neutral-700 bg-neutral-900 text-neutral-50 placeholder:text-neutral-500"
              />
            </div>
            {elapsedSeconds !== null ? (
              <Button
                variant="secondary"
                className="h-9 w-full text-xs"
                onClick={() => {
                  setMinutes(String(Math.floor(elapsedSeconds / 60)));
                  setSeconds(String(elapsedSeconds % 60));
                }}
              >
                Use measured time {Math.floor(elapsedSeconds / 60)}:
                {String(elapsedSeconds % 60).padStart(2, "0")}
              </Button>
            ) : null}
            <div className="flex gap-2">
              <Button
                variant={finished === true ? "default" : "secondary"}
                className="h-9 flex-1 text-xs"
                onClick={() => setFinished(finished === true ? null : true)}
              >
                Finished
              </Button>
              <Button
                variant={finished === false ? "default" : "secondary"}
                className="h-9 flex-1 text-xs"
                onClick={() => setFinished(finished === false ? null : false)}
              >
                Did not finish
              </Button>
            </div>
          </div>
        ) : null}

        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-neutral-500">
            Effort (optional)
          </p>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                size="sm"
                variant={rpe === n ? "default" : "secondary"}
                className="h-8 w-8 p-0 text-xs"
                onClick={() => setRpe(rpe === n ? null : n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="h-11 flex-1"
            onClick={() =>
              onSubmit({
                durationSeconds: null,
                rounds: null,
                extraReps: null,
                intervalsDone: null,
                finished: null,
                rpe: null,
              })
            }
          >
            Skip
          </Button>
          <Button className="h-11 flex-1" onClick={submit}>
            Save result
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
