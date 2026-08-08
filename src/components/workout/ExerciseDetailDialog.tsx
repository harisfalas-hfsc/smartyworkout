import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dumbbell, Loader2 } from "lucide-react";
import { useExerciseMedia } from "./ExerciseMediaProvider";

export function ExerciseDetailDialog({
  exerciseId,
  onClose,
}: {
  exerciseId: string | null;
  onClose: () => void;
}) {
  const { details, loading } = useExerciseMedia();
  const ex = exerciseId ? details[exerciseId] : undefined;

  return (
    <Dialog open={Boolean(exerciseId)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 text-left text-xl capitalize">
            {ex?.name ?? "Exercise"}
          </DialogTitle>
        </DialogHeader>

        {!ex ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Exercise not available."}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-muted">
              {ex.gif_url ? (
                <img
                  src={ex.gif_url}
                  alt={`${ex.name} demonstration`}
                  loading="lazy"
                  className="h-64 w-full object-contain"
                />
              ) : (
                <div className="flex h-48 w-full items-center justify-center text-muted-foreground">
                  <Dumbbell className="h-8 w-8" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["Body part", ex.body_part],
                ["Target", ex.target_muscle],
                ["Equipment", ex.equipment],
                ["Level", ex.difficulty],
              ].map(([label, value]) =>
                value ? (
                  <div key={label as string} className="rounded-xl border border-border p-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="font-medium capitalize">{value as string}</p>
                  </div>
                ) : null,
              )}
            </div>

            {ex.secondary_muscles?.length ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Secondary: </span>
                {ex.secondary_muscles.join(", ")}
              </p>
            ) : null}

            {ex.description ? <p className="text-sm">{ex.description}</p> : null}

            {ex.instructions?.length ? (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {ex.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
