import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, Maximize2, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeepScreenAwake } from "@/hooks/useKeepScreenAwake";
import { PageHeader } from "@/components/PageHeader";

const URL = "https://smartyworkout.com/tools/workout-timer";
const TITLE = "Workout Timer — Interval training timer | SmartyWorkout";
const DESCRIPTION =
  "Free workout interval timer. Customizable work/rest periods and rounds — perfect for HIIT, Tabata and circuit training.";

export const Route = createFileRoute("/tools/workout-timer")({
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              name: "Workout Timer",
              url: URL,
              applicationCategory: "HealthApplication",
              operatingSystem: "Web",
              description: DESCRIPTION,
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
              publisher: { "@id": "https://smartyworkout.com/#organization" },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://smartyworkout.com/" },
                { "@type": "ListItem", position: 2, name: "Tools", item: "https://smartyworkout.com/tools" },
                { "@type": "ListItem", position: 3, name: "Workout Timer", item: URL },
              ],
            },
          ],
        }),
      },
    ],
  }),

  component: WorkoutTimerPage,
});

function WorkoutTimerPage() {
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [workTimeInput, setWorkTimeInput] = useState("20");
  const [restTimeInput, setRestTimeInput] = useState("10");
  const [roundsInput, setRoundsInput] = useState("8");
  const [currentRound, setCurrentRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [isWorking, setIsWorking] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const [locked, setLocked] = useState(false);
  const [unlockHold, setUnlockHold] = useState(0);
  const unlockTimerRef = useRef<number | null>(null);

  useKeepScreenAwake(true);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement && locked) setLocked(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [locked]);

  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);

  const enterLock = () => {
    setLocked(true);
    try {
      const el = document.documentElement as any;
      el.requestFullscreen?.().catch(() => {});
    } catch {
      /* ignore */
    }
    try {
      (screen.orientation as any)?.lock?.("portrait")?.catch?.(() => {});
    } catch {
      /* ignore */
    }
  };

  const exitLock = async () => {
    setLocked(false);
    setUnlockHold(0);
    if (unlockTimerRef.current) {
      window.clearInterval(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  };

  const startUnlock = () => {
    if (unlockTimerRef.current) return;
    const start = Date.now();
    unlockTimerRef.current = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / 1200) * 100);
      setUnlockHold(pct);
      if (pct >= 100) {
        window.clearInterval(unlockTimerRef.current!);
        unlockTimerRef.current = null;
        exitLock();
      }
    }, 50);
  };

  const cancelUnlock = () => {
    if (unlockTimerRef.current) {
      window.clearInterval(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
    setUnlockHold(0);
  };

  useEffect(() => {
    if (!isRunning && currentRound === 0) setTimeLeft(workTime);
  }, [workTime, isRunning, currentRound]);

  const handleBlur = (field: "work" | "rest" | "rounds") => {
    if (field === "work") {
      const clamped = Math.max(1, parseInt(workTimeInput) || 1);
      setWorkTime(clamped);
      setWorkTimeInput(String(clamped));
    } else if (field === "rest") {
      const clamped = Math.max(1, parseInt(restTimeInput) || 1);
      setRestTime(clamped);
      setRestTimeInput(String(clamped));
    } else {
      const clamped = Math.max(1, parseInt(roundsInput) || 1);
      setRounds(clamped);
      setRoundsInput(String(clamped));
    }
  };

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          playBeep();
          if (isWorking) {
            setIsWorking(false);
            return restTime;
          }
          if (currentRound < rounds) {
            setCurrentRound((r) => r + 1);
            setIsWorking(true);
            return workTime;
          }
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isWorking, currentRound, rounds, workTime, restTime, playBeep]);

  const handleStartStop = () => {
    if (!isRunning && currentRound === 0) setCurrentRound(1);
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentRound(0);
    setIsWorking(true);
    setTimeLeft(workTime);
  };

  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 lg:max-w-4xl lg:px-8 lg:py-16">
        <PageHeader
          eyebrow="SmartyWorkout tools"
          title={
            <>
              Workout <span className="text-primary">Timer</span>
            </>
          }
          subtitle="Customizable interval timer for HIIT, Tabata and circuit training."
        />

        <Card>
          <CardContent className="p-6">
            <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
              <div>
                <Label className="text-xs font-semibold sm:text-sm">Work (sec)</Label>
                <Input
                  type="number"
                  value={workTimeInput}
                  onChange={(e) => setWorkTimeInput(e.target.value)}
                  onBlur={() => handleBlur("work")}
                  disabled={isRunning}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold sm:text-sm">Rest (sec)</Label>
                <Input
                  type="number"
                  value={restTimeInput}
                  onChange={(e) => setRestTimeInput(e.target.value)}
                  onBlur={() => handleBlur("rest")}
                  disabled={isRunning}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold sm:text-sm">Rounds</Label>
                <Input
                  type="number"
                  value={roundsInput}
                  onChange={(e) => setRoundsInput(e.target.value)}
                  onBlur={() => handleBlur("rounds")}
                  disabled={isRunning}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="mb-6 rounded-lg bg-muted/50 py-8 text-center">
              <div
                className={cn(
                  "text-7xl font-bold tabular-nums",
                  isWorking ? "text-primary" : "text-orange-500",
                )}
              >
                {timeLeft}s
              </div>
              <div className="mt-2 text-lg font-medium">
                {isRunning ? (isWorking ? "💪 Work" : "😮‍💨 Rest") : "Ready"} • Round{" "}
                {currentRound}/{rounds}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleStartStop}
                className="h-12 flex-1 text-lg"
                variant={isRunning ? "destructive" : "default"}
              >
                {isRunning ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" /> Start
                  </>
                )}
              </Button>
              <Button onClick={handleReset} variant="outline" className="h-12 px-6">
                <RotateCcw className="h-5 w-5" />
              </Button>
              <Button
                onClick={enterLock}
                variant="outline"
                className="h-12 px-6"
                aria-label="Maximize fullscreen"
              >
                <Maximize2 className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {locked && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-background" style={{ touchAction: "manipulation" }}>
          <div
            className={cn(
              "flex w-full flex-1 flex-col items-center justify-center px-6 py-10 transition-colors duration-150",
              isRunning ? (isWorking ? "bg-primary" : "bg-orange-500") : "bg-muted",
            )}
          >
            <div
              className={cn(
                "mb-8 text-sm font-semibold uppercase tracking-[0.2em] opacity-80 sm:text-base",
                isRunning ? "text-primary-foreground" : "text-foreground",
              )}
            >
              {isRunning ? (isWorking ? "Work" : "Rest") : "Ready"} · Round {currentRound}/{rounds}
            </div>
            <div
              className={cn(
                "text-center font-black leading-none tabular-nums drop-shadow-md",
                isRunning ? "text-primary-foreground" : "text-foreground",
              )}
              style={{ fontSize: "clamp(80px, min(22vh, 38vw), 220px)" }}
            >
              {timeLeft}
              <span className="ml-2 font-semibold opacity-60" style={{ fontSize: "clamp(28px, 6vh, 64px)" }}>
                s
              </span>
            </div>
            <div className="mt-12 flex gap-3">
              <Button
                onClick={handleStartStop}
                className="h-14 px-8 text-base"
                variant={isRunning ? "destructive" : "secondary"}
              >
                {isRunning ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" /> Start
                  </>
                )}
              </Button>
              <Button onClick={handleReset} variant="outline" className="h-14 px-6">
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              startUnlock();
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              cancelUnlock();
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              cancelUnlock();
            }}
            onPointerCancel={(e) => {
              e.stopPropagation();
              cancelUnlock();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            aria-label="Hold to unlock"
            className="fixed right-4 z-[10000] flex h-20 w-20 select-none items-center justify-center rounded-full border-4 border-primary bg-background text-foreground shadow-2xl"
            style={{
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
              backgroundImage: `conic-gradient(hsl(var(--primary)) ${unlockHold}%, transparent ${unlockHold}%)`,
              touchAction: "none",
            }}
          >
            <div className="pointer-events-none flex h-14 w-14 select-none flex-col items-center justify-center gap-0.5 rounded-full bg-background">
              {unlockHold > 0 ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              <span className="text-[9px] font-bold leading-none">HOLD</span>
            </div>
          </button>
        </div>
      )}
    </>
  );
}
