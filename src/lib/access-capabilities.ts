// One place that turns the access state into "what can this member do".
//
// Every route, dialog and server function reads these capabilities instead of
// re-deriving "premium && profileComplete && ..." locally, so a paying member
// can never hit a wall one screen forgot to update.

export type AccessLike = {
  profileComplete: boolean;
  healthAcknowledged: boolean;
  readinessComplete: boolean;
  premium: boolean;
  missingProfileFields: string[];
  generationsLeftToday: number;
  generationsLimit: number;
};

export type CapabilityId =
  | "generateWorkout"
  | "workoutOfTheDay"
  | "community"
  | "exerciseLibraryPreferences";

export type Capability = {
  allowed: boolean;
  /** Where to send the member to unblock themselves. */
  action: "none" | "profile" | "membership";
  reason: string | null;
};

export type Capabilities = Record<CapabilityId, Capability>;

const OK: Capability = { allowed: true, action: "none", reason: null };

function profileGate(access: AccessLike): Capability | null {
  if (!access.healthAcknowledged) {
    return {
      allowed: false,
      action: "profile",
      reason: "Accept the health and safety acknowledgement in your Training Profile first.",
    };
  }
  if (!access.readinessComplete) {
    return {
      allowed: false,
      action: "profile",
      reason: "Complete the readiness questionnaire in your Training Profile first.",
    };
  }
  if (!access.profileComplete) {
    return {
      allowed: false,
      action: "profile",
      reason: access.missingProfileFields.length
        ? `Add your ${access.missingProfileFields.join(", ")} to your Training Profile first.`
        : "Complete your Training Profile first.",
    };
  }
  return null;
}

function membershipGate(access: AccessLike): Capability | null {
  if (access.premium) return null;
  return {
    allowed: false,
    action: "membership",
    reason: "An active Smarty Workout membership is required.",
  };
}

export function capabilitiesFrom(access: AccessLike): Capabilities {
  const profile = profileGate(access);
  const membership = membershipGate(access);

  const quota: Capability | null =
    profile === null && membership === null && access.generationsLeftToday <= 0
      ? {
          allowed: false,
          action: "none",
          reason: `Your membership includes ${access.generationsLimit} workout generations per day. Your Workout of the Day is still available and your allowance resets tomorrow.`,
        }
      : null;

  return {
    generateWorkout: profile ?? membership ?? quota ?? OK,
    // The Workout of the Day never consumes the daily generation allowance.
    workoutOfTheDay: profile ?? membership ?? OK,
    community: membership ?? OK,
    exerciseLibraryPreferences: membership ?? OK,
  };
}

/** First blocking reason across a set of capabilities, for a single banner. */
export function firstBlock(
  capabilities: Capabilities,
  ids: CapabilityId[],
): { id: CapabilityId; capability: Capability } | null {
  for (const id of ids) {
    const capability = capabilities[id];
    if (!capability.allowed) return { id, capability };
  }
  return null;
}
