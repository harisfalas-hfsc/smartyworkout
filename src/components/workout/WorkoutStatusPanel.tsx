import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setWorkoutStatus } from "@/lib/coach.functions";
import { cn } from "@/lib/utils";

export type WorkoutStatusState = { status: string; scheduledAt: string };

/**
 * Completed / Not completed / Scheduled controls.
 * Every button is always clickable and only the button matching the current
 * state is highlighted, so the athlete always sees where the workout stands.
 * `resolveWorkoutId` lets the community page create the member's own copy
 * lazily, the first time a status is set.
 */
export function WorkoutStatusPanel({
  workoutId,
  status,
  scheduledAt,
  onChange,
  resolveWorkoutId,
  className,
}: {
  workoutId: string | null;
  status: string;
  scheduledAt: string;
  onChange: (next: WorkoutStatusState) => void;
  resolveWorkoutId?: () => Promise<string>;
  className?: string;
}) {
  const save = useServerFn(setWorkoutStatus);
  const [busy, setBusy] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [draftDate, setDraftDate] = useState(scheduledAt);

  const done = status === "completed";
  const scheduled = !done && Boolean(scheduledAt);
  const notCompleted = !done && !scheduled;

  async function target(): Promise<string> {
    if (resolveWorkoutId) return resolveWorkoutId();
    if (!workoutId) throw new Error("Workout not found.");
    return workoutId;
  }

  async function run(
    patch: { status?: string; scheduled_at?: string | null },
    next: WorkoutStatusState,
    message: string,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const id = await target();
      await save({ data: { workoutId: id, ...patch } });
      onChange(next);
      toast.success(message);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cn("mt-6 rounded-2xl border-2 border-blue-400 bg-card p-5", className)}>
      <h3 className="text-lg font-bold">Workout status</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {done
          ? "Completed — nice work."
          : scheduled
            ? `Scheduled for ${new Date(scheduledAt).toLocaleString()} — you will get a reminder.`
            : "Not completed yet."}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Button
          size="lg"
          variant={done ? "default" : "outline"}
          className="h-12 rounded-2xl"
          disabled={busy}
          onClick={() =>
            run(
              { status: "completed", scheduled_at: null },
              { status: "completed", scheduledAt: "" },
              "Marked as completed.",
            )
          }
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> Completed
        </Button>
        <Button
          size="lg"
          variant={notCompleted ? "default" : "outline"}
          className="h-12 rounded-2xl"
          disabled={busy}
          onClick={() =>
            run(
              { status: "created", scheduled_at: null },
              { status: "created", scheduledAt: "" },
              "Marked as not completed.",
            )
          }
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Not completed
        </Button>
        <Button
          size="lg"
          variant={scheduled ? "default" : "outline"}
          className="h-12 rounded-2xl"
          disabled={busy}
          onClick={() => {
            setDraftDate(scheduledAt);
            setShowSchedule((v) => !v);
          }}
        >
          <CalendarClock className="mr-2 h-4 w-4" /> {scheduled ? "Scheduled" : "Schedule"}
        </Button>
      </div>

      {showSchedule ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            className="h-12 flex-1 rounded-2xl border border-input bg-background px-3 text-sm"
          />
          <Button
            className="h-12 rounded-2xl"
            disabled={busy || !draftDate}
            onClick={() =>
              run(
                { status: "scheduled", scheduled_at: new Date(draftDate).toISOString() },
                { status: "scheduled", scheduledAt: draftDate },
                "Scheduled — you will be reminded before it starts.",
              ).then(() => setShowSchedule(false))
            }
          >
            {scheduled ? "Reschedule" : "Save date"}
          </Button>
          {scheduled ? (
            <Button
              variant="ghost"
              className="h-12 rounded-2xl"
              disabled={busy}
              onClick={() =>
                run(
                  { status: "created", scheduled_at: null },
                  { status: "created", scheduledAt: "" },
                  "Schedule removed.",
                ).then(() => setShowSchedule(false))
              }
            >
              Clear
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
