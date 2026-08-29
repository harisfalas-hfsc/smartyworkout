import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getMyAccessState } from "@/lib/access.functions";
import { getDailyHub } from "@/lib/daily.functions";
import { getPublicWodDays } from "@/lib/daily.functions";
import { listNotifications } from "@/lib/daily.functions";
import { listMyThreads } from "@/lib/support.functions";
import { readCache, scopedKey, trimCache, writeCache } from "@/lib/offline/store";
import {
  fetchComments,
  fetchCategories,
  fetchCommunityCreators,
  fetchCommunityWorkouts,
  fetchLatestComments,
  fetchLeaders,
} from "@/lib/community-queries";
import { getSharedWorkout } from "@/lib/community.functions";
import { getProgressOverview } from "@/lib/progress.functions";
import { isOnline, subscribeConnectivity } from "@/lib/connectivity";
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
import { cacheMediaUrls, getExerciseMediaItems, storedMediaCount, warmExerciseMedia } from "@/lib/exercise-media";
import { syncUserTables } from "@/lib/offline/data-sync";
import { resolveSyncOutcome } from "@/lib/offline/sync-result";
import { getMembershipSummary } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  OFFLINE_MEMBER_ROUTES,
  OFFLINE_PUBLIC_ROUTES,
  registerAppServiceWorker,
  warmOfflineRoutes,
} from "@/lib/offline/register-sw";

const LOGBOOK_COLUMNS =
  "id,name,category,duration_min,difficulty_stars,difficulty_label,mood,status,is_favorite,scheduled_at,completed_at,created_at,is_wod,created_by,equipment,workout_feedback(difficulty_rating,feeling)";

async function fetchAllRows(table: "workouts" | "set_logs" | "workout_results" | "workout_feedback", select = "*") {
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const result = await supabase
      .from(table)
      .select(select)
      .order("created_at", { ascending: false })
      .range(start, start + pageSize - 1);
    if (result.error) throw new Error(result.error.message);
    const page = (result.data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

/** Builds the signed-in member's offline copy as soon as the app starts online. */
export function OfflineBootstrap() {
  const { user } = useAuth();
  const loadAccess = useServerFn(getMyAccessState);
  const loadHub = useServerFn(getDailyHub);
  const loadPublicWod = useServerFn(getPublicWodDays);
  const loadNotifications = useServerFn(listNotifications);
  const loadThreads = useServerFn(listMyThreads);
  const loadSharedWorkout = useServerFn(getSharedWorkout);
  const loadProgressOverview = useServerFn(getProgressOverview);
  const loadMembership = useServerFn(getMembershipSummary);
  const running = useRef(false);

  useEffect(() => {
    let active = true;
    let periodicTimer = 0;

    // Public pages are prepared for every visitor, not only signed-in members.
    // This is deliberately independent from member-data synchronization.
    if (!user) {
      const preparePublicShell = async () => {
        if (!isOnline()) return;
        setSyncState("syncing");
        try {
          await registerAppServiceWorker();
          await warmOfflineRoutes(OFFLINE_PUBLIC_ROUTES);
          setSyncState("idle");
        } catch {
          setSyncState("error");
        }
      };
      void preparePublicShell();
      const stopPublicConnectivity = subscribeConnectivity((online) => {
        if (online) void preparePublicShell();
      });
      return () => {
        active = false;
        stopPublicConnectivity();
      };
    }

    const save = (key: string, value: unknown) => writeCache(scopedKey(user.id, key), value);
    const savePublic = (key: string, value: unknown) => writeCache(scopedKey(null, key), value);

    /** Priority 1 — identity, entitlements, today's hub, avatar image. */
    const phaseIdentity = async () => {
      const [accessResult, hubResult, publicWodResult, membershipResult] = await Promise.allSettled([
        loadAccess({}),
        loadHub({}),
        loadPublicWod({}),
        loadMembership({ data: { environment: getStripeEnvironment() } }),
      ]);
      if (!active) return null;
      if (accessResult.status === "fulfilled") await save("account:access", accessResult.value);
      if (hubResult.status === "fulfilled") await save("wod:hub", hubResult.value);
      if (publicWodResult.status === "fulfilled")
        await savePublic("wod:public-cycle", publicWodResult.value);
      if (membershipResult.status === "fulfilled")
        await save("account:membership", membershipResult.value);

      // Warm the avatar into the media cache so it paints instantly offline,
      // even if the member never opened a page that renders it this session.
      try {
        const raw = localStorage.getItem(`smarty:profile:${user.id}`);
        const url = raw ? (JSON.parse(raw) as { avatar_url?: string }).avatar_url : null;
        if (url) await cacheMediaUrls([url], { concurrency: 1, isActive: () => active });
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
          fetchAllRows("workouts", LOGBOOK_COLUMNS),
          fetchAllRows("workouts"),
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          fetchAllRows("set_logs"),
          fetchAllRows("workout_results"),
          fetchAllRows("workout_feedback"),
        ]);
      if (!active) return false;
      if (notificationResult.status === "fulfilled")
        await save("inbox:notifications", notificationResult.value);
      if (threadResult.status === "fulfilled") await save("inbox:threads", threadResult.value);
      if (logbookResult.status === "fulfilled")
        await save("logbook:list", logbookResult.value ?? []);
      if (workoutResult.status === "fulfilled")
        await save("account:workout-count", workoutResult.value.length);
      if (workoutResult.status === "fulfilled") {
        preparedWorkouts = workoutResult.value.length;
        for (const workout of workoutResult.value) {
          await save(`workout:${String(workout["id"])}`, { row: workout, access });
        }
      }
      if (profileResult.status === "fulfilled" && !profileResult.value.error && profileResult.value.data)
        await save("profile:full", profileResult.value.data);
      if (
        setsResult.status === "fulfilled" &&
        resultsResult.status === "fulfilled" &&
        feedbackResult.status === "fulfilled"
      ) {
        const feedback = feedbackResult.value.map((row) => ({
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
          sets: setsResult.value as never,
          results: resultsResult.value as never,
          feedback: feedback as never,
        });
        preparedPerformance = setsResult.value.length + resultsResult.value.length + feedback.length;
      }
      let overviewOk = true;
      await loadProgressOverview({ data: {} } as never)
        .then((overview) => save("progress:overview", overview))
        .catch(() => {
          overviewOk = false;
        });

      const workoutsVerified =
        workoutResult.status === "fulfilled" &&
        (
          await Promise.all(
            workoutResult.value.map((workout) =>
              readCache(scopedKey(user.id, `workout:${String(workout["id"])}`)),
            ),
          )
        ).every(Boolean);
      const profileVerified =
        profileResult.status === "fulfilled" &&
        !profileResult.value.error &&
        Boolean(await readCache(scopedKey(user.id, "profile:full")));

      // Only a fully downloaded copy counts as done, so a partial run retries.
      const everyFetchSucceeded = [
        notificationResult,
        threadResult,
        logbookResult,
        workoutResult,
        profileResult,
        setsResult,
        resultsResult,
        feedbackResult,
      ].every((result) => result.status === "fulfilled");
      return everyFetchSucceeded && workoutsVerified && profileVerified && overviewOk;
    };

    /** Priority 3 — the exercise library, batched so it survives interruption. */
    const phaseLibrary = async () => {
      const exercises: Record<string, unknown>[] = [];
      for (let page = 0; page < 3; page += 1) {
        if (!active) return false;
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
      if (!active || !exercises.length) return false;
      preparedExercises = exercises.length;
      await writeCache(scopedKey(null, "library:list:All|All|All|All|"), exercises);
      const unique = (key: string) =>
        [...new Set(exercises.map((row) => row[key]).filter(Boolean))].sort();
      await writeCache(scopedKey(null, "library:filters"), {
        bodyParts: unique("body_part"),
        equipment: unique("equipment"),
        targets: unique("target_muscle"),
        difficulties: unique("difficulty"),
      });
      for (const exercise of exercises) {
        if (typeof exercise["id"] === "string") await writeCache(`exercise:${exercise["id"]}`, exercise);
      }

      const metadataVerified = (
        await Promise.all(
          exercises.map((exercise) => readCache(`exercise:${String(exercise["id"] ?? "")}`)),
        )
      ).every(Boolean);

       const mediaItems = await getExerciseMediaItems(
         exercises.flatMap((exercise) =>
           typeof exercise["gif_path"] === "string" ? [exercise["gif_path"]] : [],
         ),
       );
       // Media is deliberately best-effort and resumable. It must never hold
       // the global sync indicator open because one remote file is unavailable.
       void warmExerciseMedia(mediaItems, {
         concurrency: 6,
         isActive: () => active,
       });
      return metadataVerified;
    };

    /** Priority 4 — community reading copy. */
    const phaseCommunity = async () => {
      const workoutSorts = ["latest", "liked", "rated"] as const;
      const rankSorts = ["completed", "liked", "rated", "commented"] as const;
      const memberSorts = ["score", "completed", "streak", "workouts_shared"] as const;
      const [workoutGroups, rankGroups, memberGroups, newestTalk, oldestTalk] = await Promise.all([
        Promise.all(workoutSorts.map((sort) => fetchCommunityWorkouts({ sort, limit: 30 }).catch(() => []))),
        Promise.all(rankSorts.map((sort) => fetchCommunityWorkouts({ sort, limit: 30 }).catch(() => []))),
        Promise.all(memberSorts.map((sort) => {
          if (sort === "workouts_shared") return fetchCommunityCreators(sort, 30).catch(() => []);
          const column = sort === "completed" ? "workouts_completed" : sort === "streak" ? "current_streak" : "score";
          return fetchLeaders(column, 30).catch(() => []);
        })),
        fetchLatestComments(30, "newest").catch(() => []),
        fetchLatestComments(30, "oldest").catch(() => []),
      ]);
      const categories = await fetchCategories().catch(() => []);
      if (!active) return;
      await Promise.all([
         ...workoutSorts.map((sort, index) => savePublic(`community:workouts:${sort}`, workoutGroups[index])),
         ...rankSorts.map((sort, index) => savePublic(`community:ranked:${sort}`, rankGroups[index])),
         ...memberSorts.map((sort, index) => savePublic(`community:members:${sort}`, memberGroups[index])),
         savePublic("community:comments:newest", newestTalk),
         savePublic("community:comments:oldest", oldestTalk),
         savePublic("community:comments:discussed", newestTalk),
         savePublic("community:categories", categories),
        ...workoutSorts.map((sort, index) =>
           savePublic(`community:browse:${sort}:0:all:all:0`, workoutGroups[index]?.slice(0, 12) ?? []),
        ),
      ]);

      // Store community workout covers and member avatars as bytes, not only
      // URL strings, so the last synchronized community view is complete.
      const communityMedia = [...workoutGroups.flat(), ...rankGroups.flat(), ...memberGroups.flat()]
        .flatMap((row) => {
          const record = row as unknown as Record<string, unknown>;
          return [record["image_url"], record["avatar_url"], record["creator_avatar"]];
        })
        .filter((value): value is string => typeof value === "string" && value.length > 0);
      await cacheMediaUrls(communityMedia, { concurrency: 6, isActive: () => active });

      const ids = [...new Set(workoutGroups.flat().map((w) => w.id))];
      for (const id of ids) {
        await Promise.allSettled([
           loadSharedWorkout({ data: { workoutId: id } }).then((detail) => savePublic(`community:workout:${id}`, detail)),
           fetchComments(id).then((rows) => savePublic(`community:workout-comments:${id}`, rows)),
        ]);
      }
    };

    /**
     * A phase is only remembered as done when it finished completely, so an
     * interrupted first start resumes on the next open instead of leaving gaps.
     */
    const step = async (
      phase: string,
      maxAgeMs: number,
      work: () => Promise<boolean | void>,
    ): Promise<boolean> => {
      if (await isPhaseDone(phase, maxAgeMs)) return true;
      const outcome = await work();
      const complete = outcome !== false;
      if (active && complete) await markPhaseDone(phase);
      return complete;
    };

    const prefetch = async () => {
      if (!isOnline() || running.current) return;
      running.current = true;
      setSyncState("syncing");
      await markSyncStarted();
      try {
        await registerAppServiceWorker();
        await migrateLocalDatabase();
        await bindUser(user.id);
        // Ask the browser not to evict the member's downloaded copy under
        // storage pressure. Browsers may decline; synchronization still works.
        await navigator.storage?.persist?.().catch(() => false);

        let access: unknown = null;
        const identityDone = await step("identity", 60_000, async () => {
          access = await phaseIdentity();
          return access !== null;
        });
        const personalDone = await step("personal", 60_000, () => phasePersonal(access));
        const structuredSync = await syncUserTables(user.id);
        const libraryDone = await step("library-media-v4", 24 * 60 * 60_000, phaseLibrary);
        await step("community", 15 * 60_000, () =>
          phaseCommunity().catch(() => false),
        );
        const outcome = resolveSyncOutcome({
          identityDone,
          personalDone,
          failedTables: structuredSync.failed.length,
        });
        const coreSynced = outcome === "success";

        // The shell is already installed, but warm every stable and member URL
        // with the signed-in session so direct offline navigation is reliable.
        await warmOfflineRoutes([...OFFLINE_PUBLIC_ROUTES, ...OFFLINE_MEMBER_ROUTES]);

        // Truthful reporting: the number shown to the user is the real count of
        // pictures stored on this device, never an optimistic estimate.
        const storedPictures = await storedMediaCount();
        const previous = await readOfflineReadiness();
        await markOfflineReady({
          userId: user.id,
          workouts: preparedWorkouts || (previous.userId === user.id ? previous.workouts : 0),
          exercises: storedPictures || (previous.userId === user.id ? previous.exercises : 0),
          performanceRows: preparedPerformance || (previous.userId === user.id ? previous.performanceRows : 0),
          complete: coreSynced && libraryDone,
        });

        // Large enough to keep the whole exercise library, whose entries are
        // expendable and were previously evicted on every start.
        await trimCache(6000);
        // Every pass terminates. Partial table/media failures remain visible in
        // diagnostics and retry on the next restrained trigger.
        await markSyncFinished(
          coreSynced ? undefined : new Error(`Partial sync: ${structuredSync.failed.length} table(s)`),
        );
        setSyncState(coreSynced ? "idle" : "error");
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
    periodicTimer = window.setInterval(() => void prefetch(), 15 * 60_000);
    return () => {
      active = false;
      if (periodicTimer) window.clearInterval(periodicTimer);
      stopConnectivity();
      stopManual();
      window.removeEventListener("focus", onFocus);
    };
  }, [
    user?.id,
    loadAccess,
    loadHub,
    loadPublicWod,
    loadNotifications,
    loadThreads,
    loadSharedWorkout,
    loadProgressOverview,
    loadMembership,
  ]);


  return null;
}
