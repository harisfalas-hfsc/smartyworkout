import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateWorkout, setWorkoutMeta, setWorkoutStatus } from "@/lib/coach.functions";
import { reactToWorkout, rateWorkout } from "@/lib/community.functions";
import { deleteNotifications, setNotificationsRead } from "@/lib/daily.functions";
import { deleteMyThreads, setThreadsRead } from "@/lib/support.functions";
import { saveSessionFeedback } from "@/lib/feedback.functions";
import { flushQueue, type QueuedAction } from "@/lib/offline/queue";
import { onSyncRequested } from "@/lib/offline/sync-bus";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import { announceInboxChanged } from "@/lib/inbox-sync";

/** Replays anything the member did while offline as soon as the network returns. */
export function OfflineSync() {
  const online = useOnlineStatus();
  const saveStatus = useServerFn(setWorkoutStatus);
  const saveMeta = useServerFn(setWorkoutMeta);
  const react = useServerFn(reactToWorkout);
  const rate = useServerFn(rateWorkout);
  const setNotificationRead = useServerFn(setNotificationsRead);
  const removeNotifications = useServerFn(deleteNotifications);
  const setThreadRead = useServerFn(setThreadsRead);
  const removeThreads = useServerFn(deleteMyThreads);
  const saveDebrief = useServerFn(saveSessionFeedback);
  const generate = useServerFn(generateWorkout);
  const busy = useRef(false);

  useEffect(() => {
    if (!online) return;

    const run = async (action: QueuedAction) => {
      const p = action.payload as never;
      switch (action.kind) {
        case "set-log": {
          const { clientKey: _clientKey, ...payload } = action.payload;
          const { error } = await supabase.from("set_logs").upsert(payload as never, {
            onConflict: "id",
          });
          if (error) throw new Error(error.message);
          return;
        }
        case "workout-result": {
          const { local_status: _localStatus, clientKey: _clientKey, ...payload } = action.payload;
          const { error } = await supabase.from("workout_results").upsert(payload as never, {
            onConflict: "workout_id,attempt",
          });
          if (error) throw new Error(error.message);
          return;
        }
        case "attempt-complete":
          return;
        case "profile-save": {
          const { clientKey: _clientKey, userId, ...payload } = action.payload as Record<string, unknown> & {
            userId: string;
          };
          const { error } = await supabase
            .from("profiles")
            .update(payload as never)
            .eq("id", userId);
          if (error) throw new Error(error.message);
          toast.success("Your training profile is now saved to your account.");
          return;
        }
        case "workout-generate": {
          const { clientKey: _clientKey, ...payload } = action.payload as Record<string, unknown>;
          await generate({ data: payload } as never);
          toast.success("Your saved workout request has been created.");
          return;
        }
        case "workout-status":
          await saveStatus({ data: p });
          return;
        case "workout-meta":
          await saveMeta({ data: p });
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
          const { clientKey: _clientKey, ...payload } = action.payload;
          const { error } = await supabase
            .from("workout_feedback")
            .upsert({ ...payload, user_id: auth.user.id } as never, {
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
  }, [online, generate, saveStatus, saveMeta, react, rate, setNotificationRead, removeNotifications, setThreadRead, removeThreads, saveDebrief]);

  return null;
}
