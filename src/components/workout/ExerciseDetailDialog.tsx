import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dumbbell, Loader2, X } from "lucide-react";
import { useExerciseMedia } from "./ExerciseMediaProvider";
import { ExerciseImage } from "@/components/ExerciseImage";

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
      <DialogContent className="max-h-[78vh] w-[calc(100vw-3rem)] max-w-md gap-0 overflow-y-auto overflow-x-hidden rounded-2xl border-2 border-primary p-0 sm:max-h-[86vh] sm:w-full sm:max-w-lg [&>button]:hidden [&>div:first-child]:hidden">
        {/* Media hero — flush to the top edge of the card */}
        <div className="relative w-full overflow-hidden rounded-t-[calc(1rem-2px)] border-b-2 border-primary bg-white">
          {/* Close button sits inside the media area */}
          <DialogClose className="absolute right-2.5 top-2.5 z-20 grid h-9 w-9 place-items-center rounded-full border-2 border-primary bg-background/90 text-primary shadow-lg backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" strokeWidth={3} />
            <span className="sr-only">Close</span>
          </DialogClose>

          {ex?.gif_url || ex?.gif_path ? (
            <ExerciseImage
              path={ex.gif_path}
              url={ex.gif_url}
              alt={`${ex.name} demonstration`}
              className="block h-auto max-h-[38vh] w-full rounded-none bg-white object-contain sm:max-h-[34vh]"
              fallbackClassName="flex h-44 w-full items-center justify-center bg-secondary"
            />
          ) : (
            <div className="flex h-44 w-full items-center justify-center bg-secondary text-muted-foreground">
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
