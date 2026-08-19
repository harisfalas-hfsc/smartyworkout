import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setWorkoutStatus } from "@/lib/coach.functions";
import { reactToWorkout, rateWorkout } from "@/lib/community.functions";
import { deleteNotifications, setNotificationsRead } from "@/lib/daily.functions";
import { deleteMyThreads, setThreadsRead } from "@/lib/support.functions";
import { flushQueue, type QueuedAction } from "@/lib/offline/queue";
import { onSyncRequested } from "@/lib/offline/sync-bus";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import { announceInboxChanged } from "@/lib/inbox-sync";

/** Replays anything the member did while offline as soon as the network returns. */
export function OfflineSync() {
  const online = useOnlineStatus();
  const saveStatus = useServerFn(setWorkoutStatus);
  const react = useServerFn(reactToWorkout);
  const rate = useServerFn(rateWorkout);
  const setNotificationRead = useServerFn(setNotificationsRead);
  const removeNotifications = useServerFn(deleteNotifications);
  const setThreadRead = useServerFn(setThreadsRead);
  const removeThreads = useServerFn(deleteMyThreads);
  const busy = useRef(false);

  useEffect(() => {
    if (!online) return;

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
        case "notification-read":
          await setNotificationRead({ data: p });
          announceInboxChanged();
          return;
        case "notification-delete":
          await removeNotifications({ data: p });
          announceInboxChanged();
          return;
        case "thread-read":
          await setThreadRead({ data: p });
          announceInboxChanged();
          return;
        case "thread-delete":
          await removeThreads({ data: p });
          announceInboxChanged();
          return;
        case "session-debrief":
          await saveDebrief({ data: p });
          return;
        case "workout-feedback": {
          const { data: auth } = await supabase.auth.getUser();
          if (!auth.user) throw new Error("no session");
          const { error } = await supabase
            .from("workout_feedback")
            .upsert({ ...action.payload, user_id: auth.user.id } as never, {
              onConflict: "workout_id,user_id,attempt",
            });
          if (error) throw new Error(error.message);
          return;
        }
      }
    };

    const flush = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const done = await flushQueue(run, data.user.id);
        if (done > 0) {
          toast.success(
            done === 1 ? "Your offline update synced." : `${done} offline updates synced.`,
          );
        }
      } finally {
        busy.current = false;
      }
    };

    void flush();
    return onSyncRequested(() => void flush());
  }, [online, saveStatus, react, rate, setNotificationRead, removeNotifications, setThreadRead, removeThreads]);

  return null;
}
