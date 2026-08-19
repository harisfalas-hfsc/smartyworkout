import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WorkoutStep } from "@/lib/workout/parse-steps";
import { deriveStepTracking, parsePlanned } from "@/lib/workout/tracking-model";
import {
  getWorkoutPerformance,
  savePerformanceEdits,
  type PerformanceEditRow,
} from "@/lib/performance.functions";

type Draft = {
  key: string;
  id: string | null;
  stepIndex: number;
  setNumber: number;
  name: string;
  section: string | null;
  exerciseId: string;
  metric: string;
  primary: "reps" | "duration" | "completion";
  load: boolean;
  distance: boolean;
  windowSeconds: number | null;
  plannedReps: number | null;
  plannedWeightKg: number | null;
  plannedSeconds: number | null;
  reps: string;
  weight: string;
  seconds: string;
  distanceM: string;
};

/**
 * Fill in or correct the numbers for ONE session, either right after the
 * player or any day later. It always writes back to the attempt it was opened
 * with — it never creates a new session.
 */
export function PerformanceEditorDialog({
  open,
  onOpenChange,
  workoutId,
  attempt,
  steps,
  category = null,
  format = null,
  title = "Log your performance",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  attempt: number;
  steps: WorkoutStep[];
  category?: string | null;
  format?: string | null;
  title?: string;
  onSaved?: () => void;
}) {
  const fetchPerformance = useServerFn(getWorkoutPerformance);
  const saveEdits = useServerFn(savePerformanceEdits);
  const [rows, setRows] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const trackable = useMemo(
    () =>
      steps
        .map((step, stepIndex) => ({
          step,
          stepIndex,
          tracking: deriveStepTracking({ step, category, format }),
          planned: parsePlanned(step.prescription),
        }))
        .filter((s) => s.tracking.primary !== "completion"),
    [steps, category, format],
  );

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    fetchPerformance({ data: { workoutId } })
      .then((perf) => {
        if (!active) return;
        const existing =
          (perf as { attempts?: Array<{ attempt: number; sets: any[] }> }).attempts?.find(
            (a) => a.attempt === attempt,
          )?.sets ?? [];

        const drafts: Draft[] = [];
        for (const s of trackable) {
          const logged = existing.filter((l: any) => l.step_index === s.stepIndex);
          const plannedSets = Math.max(1, s.planned.sets ?? 1, logged.length);
          for (let i = 0; i < plannedSets; i += 1) {
            const row = logged[i] ?? null;
            drafts.push({
              key: `${s.stepIndex}-${i + 1}`,
              id: row?.id ?? null,
              stepIndex: s.stepIndex,
              setNumber: row?.set_number ?? i + 1,
              name: s.step.name,
              section: s.step.section ?? null,
              exerciseId: s.step.exerciseId,
              metric: s.tracking.metric,
              primary: s.tracking.primary,
              load: s.tracking.load,
              distance: s.tracking.distance,
              windowSeconds: s.tracking.windowSeconds,
              plannedReps: s.planned.reps,
              plannedWeightKg: s.planned.weightKg,
              plannedSeconds: s.planned.seconds,
              reps: row?.reps != null ? String(row.reps) : "",
              weight: row?.weight_kg != null ? String(row.weight_kg) : "",
              seconds: row?.seconds != null ? String(row.seconds) : "",
              distanceM: row?.distance_m != null ? String(row.distance_m) : "",
            });
          }
        }
        setRows(drafts);
      })
      .catch(() => {
        toast.error("Could not load this session.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, workoutId, attempt, trackable, fetchPerformance]);

  function patch(key: string, field: keyof Draft, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  async function save() {
    const payload: PerformanceEditRow[] = rows
      .filter((r) => r.reps || r.weight || r.seconds || r.distanceM)
      .map((r) => ({
        id: r.id,
        stepIndex: r.stepIndex,
        exerciseId: r.exerciseId,
        exerciseName: r.name,
        section: r.section,
        setNumber: r.setNumber,
        metric: r.metric,
        reps: num(r.reps),
        weightKg: num(r.weight),
        seconds: num(r.seconds),
        distanceM: num(r.distanceM),
        plannedReps: r.plannedReps,
        plannedWeightKg: r.plannedWeightKg,
        plannedSeconds: r.plannedSeconds,
      }));

    if (!payload.length) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      await saveEdits({ data: { workoutId, attempt, rows: payload } });
      toast.success("Performance saved.");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Could not save your performance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-auto max-h-[85vh] w-[calc(100%-2.5rem)] max-w-md overflow-y-auto rounded-3xl border-2 border-primary p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in what you remember. Anything you leave blank simply stays unlogged, and saving
            updates this same session — it never creates a new one.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing measurable to log for this workout.
          </p>
        ) : (
          <ScrollArea className="max-h-[55vh] pr-3">
            <div className="space-y-4">
              {rows.map((r) => (
                <div key={r.key} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">
                    {r.name}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      · set {r.setNumber}
                    </span>
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {r.primary === "reps" ? (
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {r.windowSeconds ? `Reps in ${r.windowSeconds}s` : "Reps"}
                        </Label>
                        <Input
                          inputMode="numeric"
                          value={r.reps}
                          onChange={(e) => patch(r.key, "reps", e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-xs">Seconds held</Label>
                        <Input
                          inputMode="numeric"
                          value={r.seconds}
                          onChange={(e) => patch(r.key, "seconds", e.target.value)}
                        />
                      </div>
                    )}
                    {r.load ? (
                      <div className="space-y-1">
                        <Label className="text-xs">Weight (kg)</Label>
                        <Input
                          inputMode="decimal"
                          value={r.weight}
                          onChange={(e) => patch(r.key, "weight", e.target.value)}
                        />
                      </div>
                    ) : null}
                    {r.distance ? (
                      <div className="space-y-1">
                        <Label className="text-xs">Distance (m)</Label>
                        <Input
                          inputMode="numeric"
                          value={r.distanceM}
                          onChange={(e) => patch(r.key, "distanceM", e.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="secondary" className="h-11 rounded-2xl" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button className="h-11 rounded-2xl font-extrabold" onClick={save} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save performance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
