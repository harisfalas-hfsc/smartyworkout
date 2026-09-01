# No workout generation ever gets lost

Today a generation either succeeds or throws. `generateWorkout` (Coach) and the Workout-of-the-Day cron both call `createWorkoutForUser`, and any engine rejection — including cosmetic ones like "prescribed work is short of the advertised duration" — surfaces to the member as an error with nothing saved and no alert to anyone. This builds the full delivery guarantee, alerting, recovery and admin visibility around that engine.

Note on wording: this app generates one session at a time (there are no multi-week programs). "Session" below means one generation request — Coach generation, Workout of the Day, or a refinement/regeneration of a previous one.

## 1. Delivery guarantee

Split validation into two classes:

- **Soft (never fails a generation):** volume/duration drift, name-match suspicion, formatting, repetition, quality score, activation/cool-down count shortfalls. These become a caution note attached to the delivered workout.
- **Structural (may trigger repair):** missing Main Workout, fewer exercises than the blueprint minimum, missing dose on a prescribed line, missing warm-up/cool-down when the blueprint requires them, exercises outside the approved pool/equipment/focus, wrong format vs. what the member selected.

Flow for every generation:

1. Generate.
2. On a structural fault, run up to **3 targeted repair passes** that regenerate only the broken section (Activation, Main, Finisher, Cool Down) and re-validate — not the whole workout.
3. Still broken → **salvage**: rebuild the missing sections deterministically from the compliant sections and the approved pool (the existing template engine), then re-validate.
4. Contradictory answers are resolved by priority rather than rejected: injuries/medical limits > available equipment > experience level > goal > liked exercises > disliked exercises. Each override produces a plain-language line shown to the member ("Your knee limitation removed two jumping exercises; the session keeps the same training effect").
5. A hard failure is allowed only for a genuine outage (AI provider down / no AI balance / network dead). The member sees a polite generic apology only.

## 2. Failure alerts

On a true failure, three emails, once per session:

- `smartyworkout@outlook.com` — subject `[SmartyWorkout ALERT] …`, or `[SmartyWorkout URGENT] …` once a session is stuck after the final retry. Contains member name, email, user id, session id, questionnaire/preferences id, stage (initial generation / workout of the day / refinement), payment state, technical failure reason, timestamp.
- The administrator's personal address, read from a new `ALERT_BACKUP_EMAIL` secret, so a junk rule can never hide a failure.
- The member — branded, zero technical detail, no error codes, no mention of AI balance: "We hit a temporary snag building your workout. Your payment and your answers are safe, we are already on it, and you will get your workout shortly — nothing for you to do."

Reply-to on all of them is the support address. The member apology is sent once per failed session, guarded by `customer_notified_at` — never once per retry.

## 3. Automatic recovery

- A retry cron every few minutes retries each failed session with exponential backoff, up to 5 attempts. A failed refinement is retried **as a refinement**, restoring the saved refinement text, so the old workout is never mistaken for a success.
- A daily sweep re-alerts (URGENT) any session still failed with no retry scheduled and no workout.
- The first time a previously-failed session succeeds: "Your workout is ready" to the member (with a button opening the workout) and to both admin addresses, guarded by `recovery_notified_at`.
- Happy path with no prior failure sends **nothing**.
- After the admin tops up AI balance, pending sessions regenerate on the next cron run with no manual step; a protected admin endpoint also triggers recovery immediately.

## 4. Admin visibility

A new **Generation failures** tab in the admin panel: member, time, stage, failure kind, reason, email delivery status + recipient + message id, a "mark as read" action, and a "send test failure email" button.

## Technical section

**Database migration**
- New `workout_generation_requests` table (one row per generation attempt-set — the app has no existing per-generation session row): `id`, `user_id`, `stage`, `request` (jsonb payload), `refinement_text`, `status`, `workout_id`, `attempt_count`, `next_retry_at`, `last_error`, `customer_notified_at`, `recovery_notified_at`, `abandoned_alert_at`, timestamps.
- New `workout_generation_failures` table: `id`, `user_id`, `session_id`, `stage`, `reason`, `failure_kind` (`technical` | `ai_balance` | `outage`), `refinement_text`, `email_status`, `email_error`, `email_message_id`, `email_recipient`, `email_dispatched_at`, `occurred_at`, `read_at`.
- Both: explicit GRANTs, RLS on, admins read via `has_role`/`is_app_admin`, service role writes, members read their own request rows.
- pg_cron entries for the two new endpoints.

**Code**
- `src/lib/workout-validation.ts` — soft vs. structural classification over the existing `validateWorkout` output, plus questionnaire conflict resolution by priority. Unit tested.
- `src/lib/workout-generation.server.ts` — orchestrator around `createWorkoutForUser`: repair passes, salvage, outage detection (402/403/429/5xx from the AI gateway), request-row lifecycle.
- `src/lib/workout-generation-alert.server.ts` — the three-recipient fan-out, failure-row persistence, email status capture, recovery notifications.
- Templates in `src/lib/email-templates/` registered in `registry.ts`: `workout-generation-failure`, `workout-delay-customer`, `workout-ready-customer`, `workout-ready-admin`, sent through `sendTemplateEmail` with `idempotencyKey` derived from session id + template name.
- `src/routes/api/public/retry-generations.ts` and `src/routes/api/public/recover-abandoned.ts`, bearer `CRON_SECRET`; also registered in `src/lib/cron/registry.ts` so they appear in the existing Cron admin tab.
- `src/components/admin/AdminGenerationFailuresTab.tsx` wired into `admin.index.tsx`, backed by admin server functions.
- Coach and WOD call sites (`src/lib/coach.functions.ts`, `src/lib/daily.server.ts`) route through the new orchestrator; the Coach UI renders the caution/adjustment notes on the delivered workout.

**Secrets**: `ALERT_BACKUP_EMAIL`, `CRON_SECRET` (added if absent).

**Verification**: unit tests for classification, conflict priority, backoff, idempotency-key derivation and once-only notification guards; simulated ai-balance failure, recovery, soft-issue delivery and happy-path (zero emails) tests; full build and the existing engine test suite must pass.
