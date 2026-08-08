import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CoachRequest } from "@/lib/coach-engine.server";

export const generateWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CoachRequest) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const engine = await import("@/lib/coach-engine.server");

    const req: CoachRequest = {
      goal: String(data.goal ?? "fullbody"),
      mood: String(data.mood ?? "normal"),
      minutes: Math.max(5, Math.min(120, Number(data.minutes) || 20)),
      location: String(data.location ?? "anywhere"),
      equipment: Array.isArray(data.equipment) ? data.equipment.map(String) : ["bodyweight"],
      ...(data.note ? { note: String(data.note).slice(0, 500) } : {}),
      ...(data.surprise ? { surprise: true } : {}),
    };

    const [{ data: profile }, { data: history }, { data: feedback }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("workouts")
        .select("name,category,focus,duration_min,status,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("workout_feedback")
        .select("difficulty_rating,feeling,enjoyed,would_repeat,comment")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const disliked = ((profile as any)?.disliked_exercises ?? []) as string[];
    const equipment = engine.resolveEquipment(req.equipment);
    const pool = await engine.loadPool(supabase, equipment, disliked);
    if (!pool.length) throw new Error("No exercises match that equipment. Try different equipment.");

    const { system, user } = engine.buildPrompt({
      req,
      profile: (profile as any) ?? null,
      history: (history as any[]) ?? [],
      feedback: (feedback as any[]) ?? [],
      pool,
    });

    let result = engine.validateWorkout(await engine.askCoach(system, user), pool, req);
    if (!result.ok) {
      result = engine.validateWorkout(
        await engine.askCoach(
          system,
          `${user}\n\nYour previous attempt failed validation (invalid or missing exercises). Use ONLY ids from the library list above.`,
        ),
        pool,
        req,
      );
    }
    if (!result.ok) throw new Error("Smarty Coach could not build a valid workout. Please try again.");

    const { data: inserted, error } = await supabase
      .from("workouts")
      .insert({
        user_id: userId,
        ...result.workout,
        location: req.location,
        mood: req.mood,
        status: "created",
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (inserted as { id: string }).id };
  });
