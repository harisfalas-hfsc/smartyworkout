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
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto overflow-x-hidden rounded-2xl border-2 border-primary p-0">
        {/* Media hero — edge to edge */}
        <div className="relative w-full overflow-hidden rounded-t-2xl border-b-2 border-primary bg-secondary">
          {ex?.gif_url ? (
            <img
              src={ex.gif_url}
              alt={`${ex.name} demonstration`}
              loading="lazy"
              className="aspect-square w-full bg-white object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center text-muted-foreground">
              {loading ? (
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              ) : (
                <Dumbbell className="h-9 w-9" />
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-left text-xl font-bold capitalize leading-tight">
              {ex?.name ?? "Exercise"}
            </DialogTitle>
          </DialogHeader>

          {!ex ? (
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading exercise…" : "Exercise not available."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Body part", ex.body_part],
                  ["Target", ex.target_muscle],
                  ["Equipment", ex.equipment],
                  ["Level", ex.difficulty],
                ].map(([label, value]) =>
                  value ? (
                    <div
                      key={label as string}
                      className="rounded-xl border-2 border-primary/60 bg-primary/5 p-2.5"
                    >
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
                        {label}
                      </p>
                      <p className="font-medium capitalize">{value as string}</p>
                    </div>
                  ) : null,
                )}
              </div>

              {ex.secondary_muscles?.length ? (
                <div className="rounded-xl border-2 border-primary/60 bg-primary/5 p-3 text-sm">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
                    Secondary muscles
                  </p>
                  <p className="capitalize">{ex.secondary_muscles.join(", ")}</p>
                </div>
              ) : null}

              {ex.description ? (
                <div className="rounded-xl border-2 border-primary/60 p-3 text-sm leading-relaxed">
                  {ex.description}
                </div>
              ) : null}

              {ex.instructions?.length ? (
                <div className="rounded-xl border-2 border-primary/60 p-3">
                  <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
                    How to perform
                  </p>
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                    {ex.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
