/** Every check the nightly health report can run. Client-safe (used by the admin panel). */
export const HEALTH_CHECKS: { key: string; label: string }[] = [
  { key: "database", label: "Database reachable" },
  { key: "tables", label: "Key tables readable" },
  { key: "library", label: "Exercise library health" },
  { key: "media", label: "Exercise media storage (player images)" },
  { key: "ai", label: "AI credits / workout generation" },
  { key: "wod", label: "Workout of the Day" },
  { key: "email", label: "Email delivery" },
  { key: "payments", label: "Payments and access mode" },
  { key: "jobs", label: "Scheduled jobs" },
  { key: "pages", label: "Public pages reachable" },
  { key: "sharing", label: "Shared workout links" },
  { key: "memberdata", label: "Logbook / progress / player data" },
  { key: "support", label: "Support inbox" },
  { key: "errors", label: "Errors in the last 24 hours" },
  { key: "activity", label: "Activity in the last 24 hours" },
];

export const DEFAULT_HEALTH_RECIPIENT = "smartyworkout@outlook.com";
