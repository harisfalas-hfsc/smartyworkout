import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getMyAccessState } from "@/lib/access.functions";
import { getDailyHub } from "@/lib/daily.functions";
import { listNotifications } from "@/lib/daily.functions";
import { listMyThreads } from "@/lib/support.functions";
import { scopedKey, trimCache, writeCache } from "@/lib/offline/store";
import {
  fetchComments,
  fetchCommunityCreators,
  fetchCommunityWorkouts,
  fetchLatestComments,
  fetchLeaders,
} from "@/lib/community-queries";
import { getSharedWorkout } from "@/lib/community.functions";
import { getProgressOverview } from "@/lib/progress.functions";

const LOGBOOK_COLUMNS =
  "id,name,category,duration_min,difficulty_stars,difficulty_label,mood,status,is_favorite,scheduled_at,completed_at,created_at,is_wod,created_by,workout_feedback(difficulty_rating,feeling)";

/** Builds the signed-in member's offline copy as soon as the app starts online. */
export function OfflineBootstrap() {
  const { user } = useAuth();
  const loadAccess = useServerFn(getMyAccessState);
  const loadHub = useServerFn(getDailyHub);
  const loadNotifications = useServerFn(listNotifications);
  const loadThreads = useServerFn(listMyThreads);
  const loadSharedWorkout = useServerFn(getSharedWorkout);
  const loadProgressOverview = useServerFn(getProgressOverview);
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
        // Community: shared workouts, leaderboards, talk and each shared
        // workout's full detail + comments, so the whole community is readable
        // offline.
        try {
          const [latest, top, rated, completedRank, leadersScore, creators, talk] =
            await Promise.all([
              fetchCommunityWorkouts({ sort: "latest", limit: 30 }),
              fetchCommunityWorkouts({ sort: "liked", limit: 30 }).catch(() => []),
              fetchCommunityWorkouts({ sort: "rated", limit: 30 }).catch(() => []),
              fetchCommunityWorkouts({ sort: "completed", limit: 30 }).catch(() => []),
              fetchLeaders("score", 30).catch(() => []),
              fetchCommunityCreators("workouts_shared", 30).catch(() => []),
              fetchLatestComments(30, "newest").catch(() => []),
            ]);
          if (!active) return;
          void save("community:workouts:latest", latest);
          void save("community:workouts:liked", top);
          void save("community:workouts:rated", rated);
          void save("community:ranked:completed", completedRank);
          void save("community:members:score", leadersScore);
          void save("community:members:workouts_shared", creators);
          void save("community:comments:newest", talk);

          const ids = [...new Set(latest.map((w) => w.id))].slice(0, 20);
          for (const id of ids) {
            void loadSharedWorkout({ data: { workoutId: id } })
              .then((detail) => save(`community:workout:${id}`, detail))
              .catch(() => undefined);
            void fetchComments(id)
              .then((rows) => save(`community:workout-comments:${id}`, rows))
              .catch(() => undefined);
          }
        } catch {
          /* community copy is best-effort */
        }

        // Progress + badges
        void loadProgressOverview({ data: {} } as never)
          .then((overview) => save("progress:overview", overview))
          .catch(() => undefined);

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
