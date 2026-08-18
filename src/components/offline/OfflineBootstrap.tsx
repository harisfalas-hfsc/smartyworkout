import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getMyAccessState } from "@/lib/access.functions";
import { getDailyHub } from "@/lib/daily.functions";
import { listNotifications } from "@/lib/daily.functions";
import { listMyThreads } from "@/lib/support.functions";
import { scopedKey, trimCache, writeCache } from "@/lib/offline/store";

const LOGBOOK_COLUMNS =
  "id,name,category,duration_min,difficulty_stars,difficulty_label,mood,status,is_favorite,scheduled_at,completed_at,created_at,is_wod,created_by,workout_feedback(difficulty_rating,feeling)";

/** Builds the signed-in member's offline copy as soon as the app starts online. */
export function OfflineBootstrap() {
  const { user } = useAuth();
  const loadAccess = useServerFn(getMyAccessState);
  const loadHub = useServerFn(getDailyHub);
  const loadNotifications = useServerFn(listNotifications);
  const loadThreads = useServerFn(listMyThreads);
  const running = useRef(false);

  useEffect(() => {
    if (!user || !navigator.onLine || running.current) return;
    let active = true;

    const prefetch = async () => {
      running.current = true;
      try {
        const [accessResult, hubResult, notificationResult, threadResult, logbookResult, workoutResult] =
          await Promise.allSettled([
            loadAccess({}),
            loadHub({}),
            loadNotifications({}),
            loadThreads({}),
            supabase.from("workouts").select(LOGBOOK_COLUMNS).order("created_at", { ascending: false }).limit(300),
            supabase.from("workouts").select("*").order("created_at", { ascending: false }).limit(300),
          ]);
        if (!active) return;

        const save = (key: string, value: unknown) =>
          writeCache(scopedKey(user.id, key), value);
        if (accessResult.status === "fulfilled") void save("account:access", accessResult.value);
        if (hubResult.status === "fulfilled") void save("wod:hub", hubResult.value);
        if (notificationResult.status === "fulfilled")
          void save("inbox:notifications", notificationResult.value);
        if (threadResult.status === "fulfilled") void save("inbox:threads", threadResult.value);
        if (logbookResult.status === "fulfilled" && !logbookResult.value.error)
          void save("logbook:list", logbookResult.value.data ?? []);
        if (workoutResult.status === "fulfilled" && !workoutResult.value.error) {
          for (const workout of workoutResult.value.data ?? []) {
            void save(`workout:${workout.id}`, {
              row: workout,
              access: accessResult.status === "fulfilled" ? accessResult.value : null,
            });
          }
        }

        const exercises: Record<string, unknown>[] = [];
        for (let page = 0; page < 3; page += 1) {
          const { data, error } = await supabase
            .from("exercises")
            .select("id,name,body_part,equipment,target_muscle,secondary_muscles,instructions,difficulty,category,description,gif_path")
            .order("name")
            .range(page * 1000, (page + 1) * 1000 - 1);
          if (error || !data?.length) break;
          exercises.push(...data);
          if (data.length < 1000) break;
        }
        if (active && exercises.length) {
          void writeCache(scopedKey(null, "library:list:All|All|All|All|"), exercises);
          const unique = (key: string) =>
            [...new Set(exercises.map((row) => row[key]).filter(Boolean))].sort();
          void writeCache(scopedKey(null, "library:filters"), {
            bodyParts: unique("body_part"),
            equipment: unique("equipment"),
            targets: unique("target_muscle"),
            difficulties: unique("difficulty"),
          });
        }
        void trimCache(800);
      } finally {
        running.current = false;
      }
    };

    void prefetch();
    const onOnline = () => void prefetch();
    window.addEventListener("online", onOnline);
    return () => {
      active = false;
      window.removeEventListener("online", onOnline);
    };
  }, [user?.id, loadAccess, loadHub, loadNotifications, loadThreads]);

  return null;
}
