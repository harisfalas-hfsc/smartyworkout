import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Shown when a signed-in athlete without an active membership tries to use a
 * members-only action (generating a workout, subscribing to WOD).
 *
 * Never rendered when Global Free Access Mode is on: in that mode the server
 * reports `premium: true` for every signed-in user, so callers never open it.
 */
export function MembershipRequiredDialog({
  open,
  onOpenChange,
  title = "Your workout is one step away",
  description = "Smarty Coach builds every session around your profile, your equipment and how you feel today — and remembers what worked. Membership unlocks unlimited coaching, the Workout of the Day and the full community.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-auto max-h-[80vh] w-[calc(100%-2.5rem)] max-w-md overflow-y-auto rounded-3xl border-2 border-primary p-5 sm:p-6">
        <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-[0.14em] text-primary">
          <Sparkles className="h-5 w-5" /> Members only
        </DialogTitle>

        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>

        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3 text-center">
          <p className="text-sm font-extrabold text-foreground">€9.99 / month</p>
          <p className="text-xs text-muted-foreground">Cancel anytime.</p>
        </div>

        <div className="mt-1 grid gap-2">
          <Button asChild className="h-14 rounded-2xl text-base font-extrabold">
            <Link to="/checkout" onClick={() => onOpenChange(false)}>
              Subscribe now
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="h-11 rounded-2xl"
            onClick={() => onOpenChange(false)}
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
