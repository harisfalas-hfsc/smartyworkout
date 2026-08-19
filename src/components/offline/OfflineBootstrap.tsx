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
import { getExerciseDetails } from "@/lib/coach.functions";
import { isOnline, subscribeConnectivity } from "@/lib/offline/connectivity";
import { onSyncRequested, setSyncState } from "@/lib/offline/sync-bus";
import {
  bindUser,
  isPhaseDone,
  markPhaseDone,
  markSyncFinished,
  markSyncStarted,
  migrateLocalDatabase,
} from "@/lib/offline/db";
import { mergeServerPerformance } from "@/lib/offline/performance-store";
import { markOfflineReady, readOfflineReadiness } from "@/lib/offline/readiness";

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
  const loadExerciseDetails = useServerFn(getExerciseDetails);
  const running = useRef(false);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const save = (key: string, value: unknown) => writeCache(scopedKey(user.id, key), value);

    /** Priority 1 — identity, entitlements, today's hub, avatar image. */
    const phaseIdentity = async () => {
      const [accessResult, hubResult] = await Promise.allSettled([loadAccess({}), loadHub({})]);
      if (!active) return null;
      if (accessResult.status === "fulfilled") void save("account:access", accessResult.value);
      if (hubResult.status === "fulfilled") void save("wod:hub", hubResult.value);

      // Warm the avatar into the media cache so it paints instantly offline,
      // even if the member never opened a page that renders it this session.
      try {
        const raw = localStorage.getItem(`smarty:profile:${user.id}`);
        const url = raw ? (JSON.parse(raw) as { avatar_url?: string }).avatar_url : null;
        if (url) void fetch(url, { mode: "no-cors" }).catch(() => undefined);
      } catch {
        /* best effort */
      }
      return accessResult.status === "fulfilled" ? accessResult.value : null;
    };

    /** Priority 2 — the member's own data. */
    let preparedWorkouts = 0;
    let preparedExercises = 0;
    let preparedPerformance = 0;

    const phasePersonal = async (access: unknown) => {
      const [notificationResult, threadResult, logbookResult, workoutResult, profileResult, setsResult, resultsResult, feedbackResult] =
        await Promise.allSettled([
          loadNotifications({}),
          loadThreads({}),
          supabase
            .from("workouts")
            .select(LOGBOOK_COLUMNS)
            .order("created_at", { ascending: false })
            .limit(300),
          supabase
            .from("workouts")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(300),
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase.from("set_logs").select("*").order("completed_at", { ascending: false }).limit(3000),
          supabase.from("workout_results").select("*").order("performed_at", { ascending: false }).limit(1000),
          supabase.from("workout_feedback").select("*").order("created_at", { ascending: false }).limit(1000),
        ]);
      if (!active) return;
      if (notificationResult.status === "fulfilled")
        void save("inbox:notifications", notificationResult.value);
      if (threadResult.status === "fulfilled") void save("inbox:threads", threadResult.value);
      if (logbookResult.status === "fulfilled" && !logbookResult.value.error)
        void save("logbook:list", logbookResult.value.data ?? []);
      if (workoutResult.status === "fulfilled" && !workoutResult.value.error) {
        preparedWorkouts = workoutResult.value.data?.length ?? 0;
        for (const workout of workoutResult.value.data ?? []) {
          void save(`workout:${workout.id}`, { row: workout, access });
        }
      }
      if (profileResult.status === "fulfilled" && !profileResult.value.error && profileResult.value.data)
        void save("profile:full", profileResult.value.data);
      if (
        setsResult.status === "fulfilled" && !setsResult.value.error &&
        resultsResult.status === "fulfilled" && !resultsResult.value.error &&
        feedbackResult.status === "fulfilled" && !feedbackResult.value.error
      ) {
        const feedback = (feedbackResult.value.data ?? []).map((row) => ({
          id: row.id,
          workout_id: row.workout_id,
          attempt: row.attempt,
          rpe: row.rpe,
          feeling: row.feeling,
          enjoyed: row.enjoyed,
          wouldRepeat: row.would_repeat,
          note: row.comment,
          answeredAt: row.created_at,
        }));
        await mergeServerPerformance(user.id, {
          sets: (setsResult.value.data ?? []) as never,
          results: (resultsResult.value.data ?? []) as never,
          feedback,
        });
        preparedPerformance = (setsResult.value.data?.length ?? 0) + (resultsResult.value.data?.length ?? 0) + feedback.length;
      }
      void loadProgressOverview({ data: {} } as never)
        .then((overview) => save("progress:overview", overview))
        .catch(() => undefined);
    };

    /** Priority 3 — the exercise library, batched so it survives interruption. */
    const phaseLibrary = async () => {
      const exercises: Record<string, unknown>[] = [];
      for (let page = 0; page < 3; page += 1) {
        if (!active) return;
        const { data, error } = await supabase
          .from("exercises")
          .select(
            "id,name,body_part,equipment,target_muscle,secondary_muscles,instructions,difficulty,category,description,gif_path",
          )
          .order("name")
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data?.length) break;
        exercises.push(...data);
        if (data.length < 1000) break;
      }
      if (!active || !exercises.length) return;
      preparedExercises = exercises.length;
      void writeCache(scopedKey(null, "library:list:All|All|All|All|"), exercises);
      const unique = (key: string) =>
        [...new Set(exercises.map((row) => row[key]).filter(Boolean))].sort();
      void writeCache(scopedKey(null, "library:filters"), {
        bodyParts: unique("body_part"),
        equipment: unique("equipment"),
        targets: unique("target_muscle"),
        difficulties: unique("difficulty"),
      });
      for (const exercise of exercises) {
        if (typeof exercise["id"] === "string") void writeCache(`exercise:${exercise["id"]}`, exercise);
      }

      const ids = exercises.map((row) => String(row["id"] ?? "")).filter(Boolean);
      for (let i = 0; i < ids.length; i += 40) {
        const chunk = ids.slice(i, i + 40);
        try {
          const result = await loadExerciseDetails({ data: { ids: chunk } });
          for (const exercise of result.exercises as unknown as Array<{ id: string; gif_url?: string | null }>) {
            await writeCache(`exercise:${exercise.id}`, exercise);
            if (exercise.gif_url) void fetch(exercise.gif_url).catch(() => undefined);
          }
        } catch {
          /* metadata remains available even when media cannot be cached */
        }
      }
    };

    /** Priority 4 — community reading copy. */
    const phaseCommunity = async () => {
      const [latest, top, rated, completedRank, leadersScore, creators, talk] = await Promise.all([
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
    };

    const step = async (phase: string, maxAgeMs: number, work: () => Promise<void>) => {
      if (await isPhaseDone(phase, maxAgeMs)) return;
      await work();
      if (active) await markPhaseDone(phase);
    };

    const prefetch = async () => {
      if (!isOnline() || running.current) return;
      running.current = true;
      setSyncState("syncing");
      await markSyncStarted();
      try {
        await migrateLocalDatabase();
        await bindUser(user.id);

        let access: unknown = null;
        await step("identity", 60_000, async () => {
          access = await phaseIdentity();
        });
        await step("personal", 60_000, () => phasePersonal(access));
        await step("library", 24 * 60 * 60_000, phaseLibrary);
        await step("community", 15 * 60_000, () => phaseCommunity().catch(() => undefined));

        const previous = await readOfflineReadiness();
        await markOfflineReady({
          userId: user.id,
          workouts: preparedWorkouts || (previous.userId === user.id ? previous.workouts : 0),
          exercises: preparedExercises || previous.exercises,
          performanceRows: preparedPerformance || (previous.userId === user.id ? previous.performanceRows : 0),
        });

        void trimCache(800);
        await markSyncFinished();
        setSyncState("idle");
      } catch (error) {
        await markSyncFinished(error);
        setSyncState("error");
      } finally {
        running.current = false;
      }
    };

    void prefetch();
    const stopConnectivity = subscribeConnectivity((online) => {
      if (online) void prefetch();
    });
    const stopManual = onSyncRequested(() => void prefetch());
    const onFocus = () => void prefetch();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      stopConnectivity();
      stopManual();
      window.removeEventListener("focus", onFocus);
    };
  }, [
    user?.id,
    loadAccess,
    loadHub,
    loadNotifications,
    loadThreads,
    loadSharedWorkout,
    loadProgressOverview,
    loadExerciseDetails,
  ]);


  return null;
}
