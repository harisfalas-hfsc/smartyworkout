import type { SupabaseClient } from "@supabase/supabase-js";

export type AccessState = {
  profileComplete: boolean;
  healthAcknowledged: boolean;
  premium: boolean;
  missingProfileFields: string[];
};

const REQUIRED_PROFILE_FIELDS = [
  ["age", "age"],
  ["fitness_level", "fitness level"],
  ["primary_goal", "primary goal"],
  ["preferred_environment", "training environment"],
  ["typical_duration_min", "workout duration"],
] as const;

export async function getAccessStateForUser(
  db: SupabaseClient,
  userId: string,
): Promise<AccessState> {
  const [{ data: profile, error: profileError }, { data: subscription, error: subscriptionError }] =
    await Promise.all([
      db
        .from("profiles")
        .select(
          "onboarded,health_acknowledged_at,age,fitness_level,primary_goal,preferred_environment,preferred_equipment,typical_duration_min",
        )
        .eq("id", userId)
        .maybeSingle(),
      db
        .from("subscriptions")
        .select("status,current_period_end")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (profileError) throw new Error(profileError.message);
  if (subscriptionError) throw new Error(subscriptionError.message);

  const row = (profile ?? null) as Record<string, unknown> | null;
  const missingProfileFields: string[] = REQUIRED_PROFILE_FIELDS.filter(([key]) => {
    const value = row?.[key];
    return value === null || value === undefined || value === "";
  }).map(([, label]) => label);

  if (!Array.isArray(row?.["preferred_equipment"]) || row["preferred_equipment"].length === 0) {
    missingProfileFields.push("available equipment");
  }

  const healthAcknowledged = Boolean(row?.["health_acknowledged_at"]);
  const profileComplete = Boolean(row?.["onboarded"]) && missingProfileFields.length === 0;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : null;
  const premium = Boolean(
    subscription && (!periodEnd || Number.isNaN(periodEnd) || periodEnd > Date.now()),
  );

  return { profileComplete, healthAcknowledged, premium, missingProfileFields };
}

export async function requireWorkoutAccess(db: SupabaseClient, userId: string) {
  const access = await getAccessStateForUser(db, userId);
  if (!access.profileComplete) {
    throw new Error("Complete your Training Profile before creating a workout.");
  }
  if (!access.healthAcknowledged) {
    throw new Error("Accept the health and safety acknowledgement in your Training Profile first.");
  }
  if (!access.premium) {
    throw new Error("An active Smarty Workout membership is required.");
  }
  return access;
}