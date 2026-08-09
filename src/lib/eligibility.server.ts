import type { SupabaseClient } from "@supabase/supabase-js";

export type AccessState = {
  profileComplete: boolean;
  healthAcknowledged: boolean;
  readinessComplete: boolean;
  /** True when the athlete answered YES to at least one PAR-Q question. */
  readinessFlagged: boolean;
  /** Plain-language list of the PAR-Q answers that were YES. */
  readinessFlags: string[];
  premium: boolean;
  missingProfileFields: string[];
  /** Manual (coach) generations already used today. */
  generationsUsedToday: number;
  /** Manual generations included per day with an active membership. */
  generationsLimit: number;
  generationsLeftToday: number;
};

/** PAR-Q questions, keyed exactly as they are stored on the profile. */
export const READINESS_LABELS: Record<string, string> = {
  heart: "A doctor has said you have a heart condition",
  chestPain: "You get chest pain during physical activity",
  dizziness: "You lose balance from dizziness or lose consciousness",
  jointProblem: "You have a bone or joint problem that activity could make worse",
  otherReason: "You know of another reason why you should not exercise",
};


/** Membership includes two coach generations per day (Workout of the Day is extra). */
export const DAILY_GENERATION_LIMIT = 2;

function startOfLocalDayIso(timezone: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const localMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  const offset = localMs - Math.floor(now.getTime() / 1000) * 1000;
  const startLocal = Date.UTC(get("year"), get("month") - 1, get("day"), 0, 0, 0);
  return new Date(startLocal - offset).toISOString();
}

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
          "onboarded,health_acknowledged_at,readiness_answers,readiness_warning_acknowledged_at,age,fitness_level,primary_goal,preferred_environment,preferred_equipment,typical_duration_min,timezone",
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
  const readinessAnswers = (row?.["readiness_answers"] ?? {}) as Record<string, unknown>;
  const readinessValues = ["heart", "chestPain", "dizziness", "jointProblem", "otherReason"].map(
    (key) => readinessAnswers[key],
  );
  const readinessAnswered = readinessValues.every((value) => typeof value === "boolean");
  const hasReadinessWarning = readinessValues.some((value) => value === true);
  const readinessComplete =
    readinessAnswered &&
    (!hasReadinessWarning || Boolean(row?.["readiness_warning_acknowledged_at"]));
  const profileComplete =
    Boolean(row?.["onboarded"]) && missingProfileFields.length === 0 && readinessComplete;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : null;
  const premium = Boolean(
    subscription && (!periodEnd || Number.isNaN(periodEnd) || periodEnd > Date.now()),
  );

  const { getWorkoutRules } = await import("@/lib/settings.server");
  const rules = await getWorkoutRules();
  const dailyLimit = rules.dailyGenerationLimit;

  const timezone = (row?.["timezone"] as string) || "Europe/Athens";
  let generationsUsedToday = 0;
  try {
    const { count } = await db
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_wod", false)
      .gte("created_at", startOfLocalDayIso(timezone));
    generationsUsedToday = count ?? 0;
  } catch {
    generationsUsedToday = 0;
  }

  return {
    profileComplete,
    healthAcknowledged,
    readinessComplete,
    readinessFlagged: hasReadinessWarning,
    readinessFlags: Object.keys(READINESS_LABELS).filter(
      (key) => readinessAnswers[key] === true,
    ).map((key) => READINESS_LABELS[key] as string),
    premium,

    generationsUsedToday,
    generationsLimit: dailyLimit,
    generationsLeftToday: Math.max(0, dailyLimit - generationsUsedToday),
  };
}

export async function requireWorkoutAccess(
  db: SupabaseClient,
  userId: string,
  options: { countsAgainstDailyQuota?: boolean } = {},
) {
  const access = await getAccessStateForUser(db, userId);
  if (!access.healthAcknowledged) {
    throw new Error("Accept the health and safety acknowledgement in your Training Profile first.");
  }
  if (!access.readinessComplete) {
    throw new Error("Complete the readiness questionnaire in your Training Profile first.");
  }
  if (!access.profileComplete) {
    throw new Error("Complete your Training Profile before creating a workout.");
  }
  if (!access.premium) {
    throw new Error("An active Smarty Workout membership is required.");
  }
  if (options.countsAgainstDailyQuota && access.generationsLeftToday <= 0) {
    throw new Error(
      `Your membership includes ${access.generationsLimit} workout generations per day. You've used both today — your Workout of the Day is still available, and your allowance resets tomorrow.`,
    );
  }
  return access;
}