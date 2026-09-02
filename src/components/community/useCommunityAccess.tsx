import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { getMyAccessState } from "@/lib/access.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Community is members-only: visitors and expired members can read but not interact. */
export function useCommunityAccess() {
  const { user, loading } = useAuth();
  const [premium, setPremium] = useState(false);
  const [checked, setChecked] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (loading) return;
    if (!user) {
      setPremium(false);
      setChecked(true);
      return;
    }
    void getMyAccessState({})
      .then((a) => {
        if (active) setPremium(Boolean(a?.premium));
      })
      .catch(() => {
        if (active) setPremium(false);
      })
      .finally(() => {
        if (active) setChecked(true);
      });
    return () => {
      active = false;
    };
  }, [user, loading]);

  /** Wraps any interactive action: runs it for members, prompts everyone else. */
  function guard(action: () => void) {
    if (premium) {
      action();
      return;
    }
    setGateOpen(true);
  }

  return {
    signedIn: Boolean(user),
    premium,
    checked: checked && !loading,
    guard,
    gateOpen,
    setGateOpen,
  };
}

export function CommunityGateDialog({
  open,
  onOpenChange,
  signedIn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  signedIn: boolean;
}) {
  const { freeAccessMode } = useFreeAccessMode();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-tight">Members only</DialogTitle>
          <DialogDescription>
            {freeAccessMode
              ? "Sign in to open shared workouts, like, comment and take your place in the rankings."
              : "Smarty Community is part of the Smarty Workout membership. Join or renew to open shared workouts, like, comment and take your place in the rankings."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {freeAccessMode ? (
            <Button asChild className="h-12 rounded-2xl font-bold">
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : (
            <>
              <Button asChild className="h-12 rounded-2xl font-bold">
                <Link to="/pricing">{signedIn ? "Renew my membership" : "See membership"}</Link>
              </Button>
              {!signedIn && (
                <Button asChild variant="secondary" className="h-12 rounded-2xl">
                  <Link to="/auth">Sign in</Link>
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
