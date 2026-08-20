/**
 * Every automated (cron) job in SmartyWorkout, described in one place.
 *
 * The hourly scheduler (`/api/public/hooks/daily-run`, pg_cron, every hour at :05)
 * is the only trigger. Each job below decides whether it is due, and the Admin
 * panel edits the switch / time / content stored in the `cron_jobs` table.
 */

export type CronJobKey =
  | "daily-motivation"
  | "wod-auto-delivery"
  | "schedule-reminders"
  | "renewal-reminders"
  | "seo-refresh";

export type CronTiming = "per-member" | "fixed" | "continuous";

export interface CronJobDefinition {
  key: CronJobKey;
  label: string;
  /** What the job does, in plain language. */
  description: string;
  /** How its run time is decided. */
  timing: CronTiming;
  timingNote: string;
  /** Exactly what the member (or the admin) receives. */
  sends: { title: string; body: string }[];
  /** Whether the admin can change the hour/minute. */
  timeEditable: boolean;
  /** Whether the job has editable content (message pool, extra keywords, ...). */
  contentEditable: boolean;
  contentLabel?: string;
  contentHelp?: string;
  defaults: {
    enabled: boolean;
    hour: number;
    minute: number;
  };
}

export const CRON_JOBS: CronJobDefinition[] = [
  {
    key: "daily-motivation",
    label: "Daily motivation message",
    description:
      "Posts one motivational notification to every member who has daily motivation switched on. Deterministic per member and per day, so nobody gets the same line twice in a row and nobody gets two in one day.",
    timing: "per-member",
    timingNote:
      "Sent at each member's own local hour (their Training Profile setting, 07:00 by default). The global switch below turns it on or off for everyone.",
    sends: [
      {
        title: "Good morning from Smarty Coach",
        body: "One line from the message pool below — for example: “Show up today. The plan does the rest.”",
      },
      {
        title: "5-day streak alive — keep it going.",
        body: "Members on a streak of 2+ completed days get the streak headline instead.",
      },
    ],
    timeEditable: false,
    contentEditable: true,
    contentLabel: "Motivation message pool",
    contentHelp:
      "One message per line. A member gets the same line for a whole day. Leave empty to use the built-in pool.",
    defaults: { enabled: true, hour: 7, minute: 0 },
  },
  {
    key: "wod-auto-delivery",
    label: "Workout of the Day auto-delivery",
    description:
      "Builds today's Workout of the Day (bodyweight + equipment variants, or one recovery session) for every member with auto-delivery on, then notifies them that it is ready.",
    timing: "per-member",
    timingNote:
      "Runs at each member's own chosen local hour (07:00 by default). Skips members without a Training Profile or an active membership.",
    sends: [
      {
        title: "Your bodyweight Workout of the Day is ready",
        body: "CATEGORY — workout name (links straight into the workout).",
      },
      {
        title: "Your equipment Workout of the Day is ready",
        body: "CATEGORY — workout name.",
      },
    ],
    timeEditable: false,
    contentEditable: false,
    defaults: { enabled: true, hour: 7, minute: 0 },
  },
  {
    key: "schedule-reminders",
    label: "Scheduled workout reminders",
    description:
      "Reminds members about workouts they scheduled in the Logbook: 30 minutes before, at the scheduled time, and a follow-up the next day when the session was never completed.",
    timing: "continuous",
    timingNote:
      "Checked every hour, because each member schedules at a different time. Every reminder is deduplicated, so nobody is reminded twice.",
    sends: [
      { title: "Your workout starts in 30 minutes", body: "CATEGORY — workout name." },
      { title: "Time to train", body: "CATEGORY — workout name." },
      { title: "Did you train yesterday?", body: "Mark it done, or reschedule it in your Logbook." },
    ],
    timeEditable: false,
    contentEditable: false,
    defaults: { enabled: true, hour: 0, minute: 0 },
  },
  {
    key: "renewal-reminders",
    label: "Membership renewal reminders",
    description:
      "Tells members with an auto-renewing membership that their subscription is about to renew, three days before and again the day before.",
    timing: "continuous",
    timingNote:
      "Checked every hour and sent once per billing period, based on each member's own renewal date.",
    sends: [
      {
        title: "Your membership renews in 3 days",
        body: "Your SmartyWorkout membership renews on DD Month YYYY.",
      },
      {
        title: "Your membership renews tomorrow",
        body: "Your SmartyWorkout membership renews on DD Month YYYY.",
      },
    ],
    timeEditable: false,
    contentEditable: false,
    defaults: { enabled: true, hour: 0, minute: 0 },
  },
  {
    key: "seo-refresh",
    label: "Automatic SEO update",
    description:
      "Rebuilds the site-wide keyword index from every public page, every training topic, the whole exercise library and every workout ever generated (name, category, format, focus, muscles, equipment, patterns and tags). Nothing is deleted — the index is merged and extended. When nothing changed since the last run, the job stops without touching anything. Every completed run emails a report to the administrator.",
    timing: "fixed",
    timingNote: "Runs once a day at the time set below (site timezone).",
    sends: [
      {
        title: "[Admin] SEO update — X new keywords",
        body: "Email to smartyworkout@outlook.com with the run time, what was updated, the new keywords and anything that failed.",
      },
    ],
    timeEditable: true,
    contentEditable: true,
    contentLabel: "Extra keywords to always include",
    contentHelp:
      "One keyword or phrase per line. These are merged into the index on every run and never removed.",
    defaults: { enabled: true, hour: 0, minute: 0 },
  },
];

export const CRON_JOB_BY_KEY: Record<string, CronJobDefinition> = Object.fromEntries(
  CRON_JOBS.map((j) => [j.key, j]),
) as Record<string, CronJobDefinition>;
