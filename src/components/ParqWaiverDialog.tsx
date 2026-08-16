import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Waiver / release of liability shown every time a user with a YES answer on the
 * PAR-Q readiness questionnaire creates, opens or subscribes to a workout.
 */
export function ParqWaiverDialog({
  open,
  flags,
  confirmLabel = "I confirm — continue",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  flags: string[];
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setChecked(false);
          onCancel();
        }
      }}
    >
      <DialogContent className="mx-auto max-h-[80vh] w-[calc(100%-2.5rem)] max-w-md overflow-y-auto rounded-3xl border-2 border-destructive p-5 sm:p-6">
        <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-[0.14em] text-destructive">
          <AlertTriangle className="h-5 w-5" /> Health warning
        </DialogTitle>

        <p className="text-sm text-muted-foreground">
          Your readiness questionnaire (PAR-Q) has a YES answer:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {flags.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>

        <p className="text-sm text-muted-foreground">
          Smarty Coach is not a doctor. We strongly suggest you speak to your physician before
          training. By continuing you train entirely at your own responsibility and release Smarty
          Workout from any liability for injury or health issues arising from this workout.
        </p>

        <label className="flex items-start gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-[hsl(var(--destructive))]"
          />
          <span>
            I confirm I train at my own responsibility and accept this waiver and release of
            liability.
          </span>
        </label>

        <div className="grid gap-2">
          <Button
            className="h-12 rounded-2xl font-extrabold"
            disabled={!checked}
            onClick={() => {
              setChecked(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
          <Button asChild variant="secondary" className="h-11 rounded-2xl">
            <Link to="/profile">Update my PAR-Q answers</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
