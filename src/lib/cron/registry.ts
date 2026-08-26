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
  | "seo-refresh"
  | "health-check"
  | "error-alerts"
  | "generate-weekly-blog-article";

export type CronTiming = "per-member" | "fixed" | "weekly" | "continuous";

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
  /** Extra settings the admin panel renders for this job. */
  settings?: ("recipient" | "checks" | "severity" | "groupWindow")[];
  /** Whether the job can be triggered on demand from the admin panel. */
  runnable?: boolean;
  /** Weekly jobs only: day of week, 0 = Sunday. */
  weekday?: number;
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
    runnable: true,
  },
  {
    key: "health-check",
    label: "Nightly system health check",
    description:
      "Checks the whole system once every night — database, exercise library, player media, AI credits and workout generation, Workout of the Day, email, payments, every other scheduled job, all public pages, share links, logbook / progress / player data, the support inbox, errors from the last 24 hours and the day's activity. A numbered report is emailed every night, pass or fail.",
    timing: "fixed",
    timingNote:
      "Runs once a day at the time set below (Cyprus time). Default 00:00. The report is always emailed, so silence means the check itself did not run.",
    sends: [
      {
        title: "[Health] All 15 checks passed",
        body: "Numbered report with PASS / WARNING / FAILED and one line of detail per check.",
      },
      {
        title: "[Health] 1 FAILURE(S) — 14/15 checks passed",
        body: "Same report, headline naming the failures — for example “OUT OF AI CREDITS — members cannot generate workouts”.",
      },
    ],
    timeEditable: true,
    contentEditable: false,
    settings: ["recipient", "checks"],
    runnable: true,
    defaults: { enabled: true, hour: 0, minute: 0 },
  },
  {
    key: "error-alerts",
    label: "Instant problem alerts",
    description:
      "Emails you the moment something actually breaks for a member — a workout that will not generate, a Workout of the Day that fails, a logbook, progress, player, sharing, payment or messaging error, or an app crash on a member's device. Every alert names the problem, the exact time and the member affected. Repeats of the same problem are counted instead of re-sent.",
    timing: "continuous",
    timingNote:
      "Not scheduled — sent immediately when a problem is recorded. The switch below turns the emails on or off; problems are always logged either way.",
    sends: [
      {
        title: "[Problem] workout-generation — out of AI credits",
        body: "What broke, where, the exact Cyprus time, the member affected and the technical details.",
      },
    ],
    timeEditable: false,
    contentEditable: false,
    settings: ["recipient", "severity", "groupWindow"],
    defaults: { enabled: true, hour: 0, minute: 0 },
  },
  {
    key: "generate-weekly-blog-article",
    label: "Weekly blog article",
    description:
      "Writes and publishes one brand-new Fitness article on the Blog every week, in the SmartyWorkout voice, with an SEO title, summary and internal links to real pages only. Titles used in the last 90 days are never repeated, and if an article was already published this week the job stops without posting a second one.",
    timing: "weekly",
    timingNote: "Runs once a week, on Sunday at the time set below (site timezone).",
    sends: [
      {
        title: "New Fitness article published on /blog",
        body: "The article goes live immediately with an AI-generated cover image, bylined Haris Falas, Sports Scientist, CSCS certified. If the cover image cannot be created, nothing is published — no article ever goes live without a picture.",
      },
      {
        title: "Admin report email",
        body: "Every published article is emailed to the admin address below with its title, what it is about, read time and how many members were notified.",
      },
      {
        title: "Inbox notification for every member",
        body: "“New article: <title>” lands in each member's inbox with a Read article link straight to the new post.",
      },
    ],
    timeEditable: true,
    contentEditable: true,
    contentLabel: "Extra topics to write about",
    contentHelp:
      "One topic per line. These are added to the built-in topic rotation. Leave empty to use the built-in list only.",
    settings: ["recipient"],
    runnable: true,
    weekday: 0,
    defaults: { enabled: false, hour: 0, minute: 0 },
  },
];


export const CRON_JOB_BY_KEY: Record<string, CronJobDefinition> = Object.fromEntries(
  CRON_JOBS.map((j) => [j.key, j]),
) as Record<string, CronJobDefinition>;
