import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotateCcw, Plus, Minus, Volume2, VolumeX, Vibrate } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeepScreenAwake } from "@/hooks/useKeepScreenAwake";

const URL = "https://smartyworkout.com/tools/rounds-tracker";
const TITLE = "Rounds Tracker — Tap to count rounds & reps | SmartyWorkout";
const DESCRIPTION =
  "Free big-button rounds and reps counter. Tap to count rounds during your workout — perfect for AMRAP, EMOM and circuit training.";

export const Route = createFileRoute("/tools/rounds-tracker")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: RoundsTrackerPage,
});

type Mode = "rounds" | "rounds-reps";
type Direction = "down" | "up";

function Stepper({
  label,
  inputValue,
  onInputChange,
  onCommit,
  onDec,
  onInc,
}: {
  label: string;
  inputValue: string;
  onInputChange: (s: string) => void;
  onCommit: () => void;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="flex h-11 items-center overflow-hidden rounded-xl bg-muted/60">
        <button
          onClick={onDec}
          className="flex h-full w-11 items-center justify-center text-foreground transition hover:bg-muted active:scale-95"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <Input
          type="number"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onBlur={onCommit}
          className="h-full flex-1 border-0 bg-transparent p-0 text-center text-lg font-bold tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <button
          onClick={onInc}
          className="flex h-full w-11 items-center justify-center text-foreground transition hover:bg-muted active:scale-95"
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function IconToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function RoundsTrackerPage() {
  const [mode, setMode] = useState<Mode>("rounds");
  const [direction, setDirection] = useState<Direction>("down");
  const [targetRounds, setTargetRounds] = useState(10);
  const [targetReps, setTargetReps] = useState(10);
  const [targetRoundsInput, setTargetRoundsInput] = useState("10");
  const [targetRepsInput, setTargetRepsInput] = useState("10");

  const [roundsDone, setRoundsDone] = useState(0);
  const [repsDone, setRepsDone] = useState(0);

  const [soundOn, setSoundOn] = useState(true);
  const [hapticOn, setHapticOn] = useState(true);
  const [flash, setFlash] = useState<"none" | "tap" | "done">("none");
  const audioCtxRef = useRef<AudioContext | null>(null);

  useKeepScreenAwake(true);

  const beep = useCallback(
    (freq = 800, dur = 0.15) => {
      if (!soundOn) return;
      try {
        let ctx = audioCtxRef.current;
        if (!ctx) {
          const Ctor = window.AudioContext || (window as any).webkitAudioContext;
          if (!Ctor) return;
          ctx = new Ctor();
          audioCtxRef.current = ctx;
        }
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dur);
      } catch {
        /* ignore */
      }
    },
    [soundOn],
  );

  const vibrate = useCallback(
    (ms: number | number[]) => {
      if (!hapticOn) return;
      try {
        navigator.vibrate?.(ms);
      } catch {
        /* ignore */
      }
    },
    [hapticOn],
  );

  const isDone = roundsDone >= targetRounds;

  const handleReset = () => {
    setRoundsDone(0);
    setRepsDone(0);
    setFlash("none");
  };

  const tapRound = () => {
    const next = roundsDone + 1;
    setRoundsDone(next);
    setRepsDone(0);
    if (next >= targetRounds) {
      beep(1200, 0.6);
      vibrate([80, 60, 80, 60, 200]);
      setFlash("done");
      setTimeout(() => setFlash("none"), 1200);
    } else {
      beep(800, 0.15);
      vibrate(50);
      setFlash("tap");
      setTimeout(() => setFlash("none"), 180);
    }
  };

  const tapRep = () => {
    const nextReps = repsDone + 1;
    if (nextReps >= targetReps) {
      const nextRounds = roundsDone + 1;
      setRoundsDone(nextRounds);
      setRepsDone(0);
      if (nextRounds >= targetRounds) {
        beep(1200, 0.6);
        vibrate([80, 60, 80, 60, 200]);
        setFlash("done");
        setTimeout(() => setFlash("none"), 1200);
      } else {
        beep(1000, 0.25);
        vibrate([60, 40, 60]);
        setFlash("tap");
        setTimeout(() => setFlash("none"), 220);
      }
    } else {
      setRepsDone(nextReps);
      beep(700, 0.08);
      vibrate(30);
      setFlash("tap");
      setTimeout(() => setFlash("none"), 120);
    }
  };

  const handleBigTap = () => {
    if (isDone) return;
    if (mode === "rounds") tapRound();
    else tapRep();
  };

  const handleUndo = () => {
    if (mode === "rounds") {
      setRoundsDone((r) => Math.max(0, r - 1));
    } else if (repsDone > 0) {
      setRepsDone((r) => r - 1);
    } else if (roundsDone > 0) {
      setRoundsDone((r) => r - 1);
      setRepsDone(Math.max(0, targetReps - 1));
    }
    vibrate(20);
  };

  const commitNumber = (
    val: string,
    setVal: (n: number) => void,
    setInput: (s: string) => void,
  ) => {
    const n = Math.max(1, parseInt(val) || 1);
    setVal(n);
    setInput(String(n));
  };

  const roundsRemaining = Math.max(0, targetRounds - roundsDone);
  const bigDisplay =
    mode === "rounds" ? (direction === "down" ? roundsRemaining : roundsDone) : repsDone;
  const bigSub =
    mode === "rounds"
      ? direction === "down"
        ? `of ${targetRounds} left`
        : `of ${targetRounds} done`
      : `rep of ${targetReps}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          SmartyWorkout Tools
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Rounds <span className="text-primary">Tracker</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Big-button rounds and reps counter for AMRAP, EMOM and circuit sessions.
        </p>
      </div>

      <Card className="overflow-hidden rounded-2xl">
        <CardContent className="flex flex-col gap-3 p-3 sm:p-4 lg:gap-4 lg:p-6">
          <div className="inline-flex w-full max-w-sm self-center rounded-full bg-muted p-1">
            <button
              onClick={() => {
                setMode("rounds");
                handleReset();
              }}
              className={cn(
                "h-9 flex-1 rounded-full text-sm font-semibold transition-colors",
                mode === "rounds" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              Rounds
            </button>
            <button
              onClick={() => {
                setMode("rounds-reps");
                handleReset();
              }}
              className={cn(
                "h-9 flex-1 rounded-full text-sm font-semibold transition-colors",
                mode === "rounds-reps"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              Rounds + Reps
            </button>
          </div>

          <div className={cn("grid gap-2", mode === "rounds-reps" ? "grid-cols-2" : "grid-cols-1")}>
            <Stepper
              label="Rounds"
              inputValue={targetRoundsInput}
              onInputChange={setTargetRoundsInput}
              onCommit={() => commitNumber(targetRoundsInput, setTargetRounds, setTargetRoundsInput)}
              onDec={() => {
                const n = Math.max(1, targetRounds - 1);
                setTargetRounds(n);
                setTargetRoundsInput(String(n));
              }}
              onInc={() => {
                const n = targetRounds + 1;
                setTargetRounds(n);
                setTargetRoundsInput(String(n));
              }}
            />
            {mode === "rounds-reps" && (
              <Stepper
                label="Reps"
                inputValue={targetRepsInput}
                onInputChange={setTargetRepsInput}
                onCommit={() => commitNumber(targetRepsInput, setTargetReps, setTargetRepsInput)}
                onDec={() => {
                  const n = Math.max(1, targetReps - 1);
                  setTargetReps(n);
                  setTargetRepsInput(String(n));
                }}
                onInc={() => {
                  const n = targetReps + 1;
                  setTargetReps(n);
                  setTargetRepsInput(String(n));
                }}
              />
            )}
          </div>

          <button
            onClick={handleBigTap}
            aria-label="Tap to count"
            className={cn(
              "relative w-full select-none touch-manipulation rounded-2xl",
              "h-[26svh] lg:h-[420px]",
              "border-4 text-center shadow-xl transition-all duration-150 active:scale-[0.99]",
              flash === "done"
                ? "border-emerald-300 bg-emerald-500"
                : flash === "tap"
                  ? "border-primary bg-primary/90"
                  : "border-primary/70 bg-primary hover:bg-primary/95",
            )}
          >
            <div className="flex h-full flex-col items-center justify-center px-3 text-primary-foreground lg:px-4">
              {mode === "rounds-reps" && (
                <div className="mb-0.5 text-xs font-semibold opacity-90 lg:mb-2 lg:text-lg">
                  Round {Math.min(roundsDone + (isDone ? 0 : 1), targetRounds)} / {targetRounds}
                </div>
              )}
              <div
                className="font-black leading-none tabular-nums drop-shadow-lg"
                style={{ fontSize: "clamp(56px, 12vh, 160px)" }}
              >
                {bigDisplay}
              </div>
              <div className="mt-1 text-xs font-semibold opacity-90 lg:mt-2 lg:text-xl">
                {isDone ? "🎉 Done!" : bigSub}
              </div>
              <div className="mt-0.5 text-[10px] opacity-70 lg:mt-3 lg:text-sm">
                {isDone
                  ? "Reset to start again"
                  : mode === "rounds"
                    ? "Tap anywhere to count a round"
                    : "Tap anywhere to count a rep"}
              </div>
            </div>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="ghost"
              onClick={handleUndo}
              className="h-11 rounded-xl bg-muted/60 text-sm font-semibold hover:bg-muted"
            >
              <Minus className="mr-1.5 h-4 w-4" />
              Undo
            </Button>
            <Button
              variant="ghost"
              onClick={handleReset}
              className="h-11 rounded-xl bg-muted/60 text-sm font-semibold hover:bg-muted"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
            <Button
              variant="ghost"
              onClick={tapRound}
              disabled={isDone}
              className="h-11 rounded-xl bg-muted/60 text-sm font-semibold hover:bg-muted"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Round
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="text-xs tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{roundsDone}</span>/{targetRounds}
              {mode === "rounds-reps" && (
                <>
                  {" · "}
                  <span className="font-semibold text-foreground">{repsDone}</span>/{targetReps}
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {mode === "rounds" && (
                <button
                  onClick={() => {
                    setDirection(direction === "down" ? "up" : "down");
                    handleReset();
                  }}
                  className="h-9 rounded-full bg-muted/60 px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                  aria-label="Toggle count direction"
                >
                  {direction === "down" ? "⬇ Down" : "⬆ Up"}
                </button>
              )}
              <IconToggle active={soundOn} onClick={() => setSoundOn(!soundOn)} label="Toggle sound">
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </IconToggle>
              <IconToggle
                active={hapticOn}
                onClick={() => setHapticOn(!hapticOn)}
                label="Toggle vibration"
              >
                <Vibrate className="h-4 w-4" />
              </IconToggle>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
