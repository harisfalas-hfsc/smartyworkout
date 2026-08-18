import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setWorkoutStatus } from "@/lib/coach.functions";
import { reactToWorkout, rateWorkout } from "@/lib/community.functions";
import { flushQueue, type QueuedAction } from "@/lib/offline/queue";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

/** Replays anything the member did while offline as soon as the network returns. */
export function OfflineSync() {
  const online = useOnlineStatus();
  const saveStatus = useServerFn(setWorkoutStatus);
  const react = useServerFn(reactToWorkout);
  const rate = useServerFn(rateWorkout);
  const busy = useRef(false);

  useEffect(() => {
    if (!online || busy.current) return;
    busy.current = true;

    const run = async (action: QueuedAction) => {
      const p = action.payload as never;
      switch (action.kind) {
        case "workout-status":
          await saveStatus({ data: p });
          return;
        case "community-like":
          await react({ data: p });
          return;
        case "community-rating":
          await rate({ data: p });
          return;
        case "workout-feedback": {
          const { data: auth } = await supabase.auth.getUser();
          if (!auth.user) throw new Error("no session");
          const { error } = await supabase
            .from("workout_feedback")
            .insert({ ...p, user_id: auth.user.id } as never);
          if (error) throw new Error(error.message);
          return;
        }
      }
    };

    (async () => {
      try {
        const done = await flushQueue(run);
        if (done > 0) {
          toast.success(
            done === 1 ? "Your offline update synced." : `${done} offline updates synced.`,
          );
        }
      } finally {
        busy.current = false;
      }
    })();
  }, [online, saveStatus, react, rate]);

  return null;
}
