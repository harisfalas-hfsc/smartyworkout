import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * One post-workout debrief per workout attempt. The player and the workout
 * page read and write this same row, so a question is never asked twice.
 */
export type SessionFeedback = {
  attempt: number;
  rpe: number | null;
  feeling: string | null;
  enjoyed: string | null;
  wouldRepeat: string | null;
  note: string | null;
  answeredAt: string | null;
};

const FEELING = ["Excellent", "Good", "Normal", "Tired", "Exhausted"];
const ENJOY = ["Yes", "Neutral", "No"];
const REPEAT = ["Yes", "Maybe", "No"];

function pick(value: unknown, allowed: string[]): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return allowed.includes(v) ? v : null;
}

export const getSessionFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workoutId: string; attempt?: number | null }) => ({
    workoutId: String(input.workoutId),
    attempt: input.attempt && input.attempt > 0 ? Number(input.attempt) : null,
  }))
  .handler(async ({ data, context }) => {
    const db = context.supabase as never as { from: (t: string) => any };
    let q = db
      .from("workout_feedback")
      .select("attempt,rpe,feeling,enjoyed,would_repeat,comment,created_at")
      .eq("user_id", context.userId)
      .eq("workout_id", data.workoutId)
      .order("attempt", { ascending: false })
      .limit(1);
    if (data.attempt) q = q.eq("attempt", data.attempt);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const row = (rows ?? [])[0] as
      | {
          attempt: number;
          rpe: number | null;
          feeling: string | null;
          enjoyed: string | null;
          would_repeat: string | null;
          comment: string | null;
          created_at: string;
        }
      | undefined;
    if (!row) return { feedback: null as SessionFeedback | null };
    return {
      feedback: {
        attempt: row.attempt,
        rpe: row.rpe,
        feeling: row.feeling,
        enjoyed: row.enjoyed,
        wouldRepeat: row.would_repeat,
        note: row.comment,
        answeredAt: row.created_at,
      } satisfies SessionFeedback,
    };
  });

/**
 * Upsert on (workout_id, user_id, attempt): editing always updates the same
 * record. RPE is mirrored onto the attempt's result row so the existing
 * training-load model keeps its single effort input — no extra load term.
 */
export const saveSessionFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      workoutId: string;
      attempt?: number | null;
      rpe?: number | null;
      feeling?: string | null;
      enjoyed?: string | null;
      wouldRepeat?: string | null;
      note?: string | null;
    }) => ({
      workoutId: String(input.workoutId),
      attempt: input.attempt && input.attempt > 0 ? Number(input.attempt) : null,
      rpe:
        input.rpe === null || input.rpe === undefined
          ? null
          : Math.max(1, Math.min(10, Math.round(Number(input.rpe)))),
      feeling: pick(input.feeling, FEELING),
      enjoyed: pick(input.enjoyed, ENJOY),
      wouldRepeat: pick(input.wouldRepeat, REPEAT),
      note: input.note ? String(input.note).slice(0, 500) : null,
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = supabase as never as { from: (t: string) => any };
    const { nextAttemptNumber } = await import("@/lib/performance.server");

    const attempt =
      data.attempt ?? (await nextAttemptNumber(supabase as never, userId, data.workoutId));

    const { error } = await db.from("workout_feedback").upsert(
      {
        user_id: userId,
        workout_id: data.workoutId,
        attempt,
        rpe: data.rpe,
        feeling: data.feeling,
        enjoyed: data.enjoyed,
        would_repeat: data.wouldRepeat,
        comment: data.note,
      },
      { onConflict: "workout_id,user_id,attempt" },
    );
    if (error) throw new Error(error.message);

    if (data.rpe !== null) {
      const { data: existing } = await db
        .from("workout_results")
        .select("id")
        .eq("user_id", userId)
        .eq("workout_id", data.workoutId)
        .eq("attempt", attempt)
        .maybeSingle();
      if (existing?.id) {
        await db.from("workout_results").update({ rpe: data.rpe }).eq("id", existing.id);
      } else {
        await db.from("workout_results").insert({
          user_id: userId,
          workout_id: data.workoutId,
          attempt,
          rpe: data.rpe,
          data_points: 1,
        });
      }
    }

    return { attempt };
  });
