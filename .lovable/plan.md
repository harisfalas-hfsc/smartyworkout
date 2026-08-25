# Nightly Health Check + Instant Error Alerts

Two new automated systems, both managed from Admin → Cron jobs, both emailing smartyworkout@outlook.com.

## 1. Nightly system health check (00:00 Cyprus time)

A new job `health-check` joins the existing hourly scheduler (`/api/public/hooks/daily-run`, which already runs every hour and decides per job whether it is due). It runs once a day at the hour/minute set in the Admin panel (default 00:00, Europe/Athens = Cyprus time), records a run row, and emails a numbered report.

Checks in the report (each one PASS / WARN / FAIL with a one-line detail):

1. Database reachable — a lightweight read.
2. Key tables readable — profiles, workouts, exercises, subscriptions, notifications, community tables, support threads.
3. Exercise library health — total exercises, how many are missing media files.
4. Exercise media storage — a signed URL is created and fetched for one real exercise (this is exactly the failure that showed blank images in the player).
5. AI credits / workout generation — a tiny probe call to the AI gateway; reports the status code, and explicitly flags "out of AI credits" (402) or "AI blocked" (403) so you know before members do.
6. Workout of the Day — today's WOD exists / can be built; number of members with auto-delivery on.
7. Email delivery — the email sender is configured and the sending domain is healthy.
8. Payments — Stripe key reachable, live vs sandbox mode, whether Global Free Access Mode is ON (i.e. no revenue collected).
9. Scheduled jobs themselves — every other cron job's last run and whether any is overdue or failing.
10. Public pages reachable — home, how-it-works, pricing, FAQ, exercise library, tools, training hub, community, sitemap.xml, llms.txt, /api/public/health (HTTP status per page; a broken build shows up here).
11. Sharing — share links (/w/:id) resolve for a real recent workout.
12. Logbook / progress / player data paths — the server functions and queries behind them return without error.
13. Support inbox — unanswered member messages older than 24h.
14. Errors in the last 24h — count and top messages from the new error log (section 2).
15. Activity snapshot — signups, workouts generated, sessions completed, active members in the last 24h.

Email is organised as a numbered list with a summary line at the top ("14 of 15 checks passed — 1 failure"). Sent every night regardless of outcome, so silence means the job itself is broken.

## 2. Instant error alerts

A new `error_events` table captures real failures with the message, where it happened, the timestamp, and the affected member (id + email).

Reporting points:
- Every server function / API route already wrapped in try/catch (workout generation, WOD, logbook, progress, player, sharing, community, payments, support) records the failure.
- Client-side crashes and failed page loads report through the existing error-reporting hook into the same table.

Alerting:
- Each distinct problem emails you immediately: what broke, plain-language explanation, exact time (Cyprus time), the user affected, and the route.
- Grouped and rate-limited per problem+user so one broken thing hitting 50 members sends one email plus a count, not 50 emails.
- A daily digest of anything that was rate-limited is folded into the nightly report.

## 3. Admin panel controls (Admin → Cron jobs)

Only controls that actually do something are shown.

Health check job card:
- On/off switch
- Time (hour + minute) — editable, site timezone
- Recipient email — editable (defaults to smartyworkout@outlook.com)
- Checkbox list: which of the checks above to include
- "Send report now" button (runs the full check on demand and emails it)
- Last run, status, and summary

Error alerts job card:
- On/off switch for instant emails
- Recipient email
- Minimum severity to email (all errors / important only)
- Grouping window in minutes (how long before the same problem can email again)
- Last 20 errors listed with time, user, and message; each can be marked resolved

Existing job cards are untouched.

## Technical notes

- `src/lib/cron/registry.ts` — add `health-check` and `error-alerts` definitions, with the new editable fields.
- `src/lib/cron/health-check.server.ts` — new; runs all checks, returns a structured result.
- `src/lib/errors/report.server.ts` — new; writes to `error_events`, handles grouping + immediate email.
- `src/routes/api/public/hooks/daily-run.ts` — run the health check when due; no change to existing jobs.
- Two new email templates (`health-report`, `error-alert`) registered in the email template registry.
- Database migration: `error_events` table (with grants + RLS: members write nothing directly, admins read), and extra columns on `cron_jobs` content JSON for the new settings — no schema change to existing job rows.
- No visual changes outside the Admin → Cron jobs tab.
