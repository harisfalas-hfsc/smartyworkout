# No workout generation ever gets lost

Build a permanent delivery system so every requested workout is either delivered immediately or safely completed in the background. A member never loses their answers, request, or paid workout because of a temporary service failure or a cosmetic validation warning.

## 1. Guaranteed workout delivery

Every Coach, Workout of the Day, and refinement request is saved before generation begins.

Validation is split into two classes:

- **Soft issue — deliver the workout:** duration/volume drift, naming concerns, formatting, repetition, quality score, or minor Activation/Cool Down count differences. These may add a caution note but never discard the workout.
- **Structural issue — repair before delivery:** missing Main Workout, too few required exercises, missing prescriptions, an exercise outside the approved library or available equipment, an incompatible format, or a required section that is absent.

For structural issues:

1. Run up to **3 targeted repair passes**, repairing only the broken section.
2. Revalidate after every repair.
3. If targeted repair still fails, deterministically salvage the workout from the approved exercise pool.
4. Deliver the safest compliant result instead of throwing it away.

Contradictory answers are resolved in this exact priority:

1. Injuries and medical limitations
2. Available equipment
3. Experience level
4. Training goal
5. Liked exercises
6. Disliked exercises

A hard failure is reserved for a genuine external outage, unavailable AI balance, or network/service failure. Technical details are never shown to the member.

## 2. Exactly three failure notifications

When a real generation failure occurs, notify exactly these three recipients:

1. **System inbox:** `smartyworkout@outlook.com`
2. **Administrator:** `harisforas@gmail.com`
3. **The member:** the email address belonging to the user whose workout failed

These addresses are fixed by the application. There is no “alert backup email” field, no email secret to enter, and no setup form for you to submit.

### Administrator notifications

Both administrator addresses receive the complete technical report:

- Member name and email
- User and generation-request IDs
- Questionnaire/preferences ID
- Request type: Coach, Workout of the Day, or refinement
- Membership/payment state
- Failure category and complete technical reason
- Retry attempt and timestamp

The subject begins with `[SmartyWorkout ALERT]`. If all recovery attempts remain unsuccessful, it becomes `[SmartyWorkout URGENT]`.

### Member notification

The member receives a branded, non-technical message only:

> We hit a temporary snag building your workout. Your payment and your answers are safe, we are already on it, and you will get your workout shortly — nothing for you to do.

The member never sees error codes, AI balance information, provider details, or internal diagnostics. This apology is sent only once for each failed request, not once per retry.

## 3. What the member sees

- **First 90 seconds:** keep the existing “Building your workout” screen with rotating fitness tips.
- **After 90 seconds:** show a calm handoff message explaining that the member can leave and the workout will continue in the background.
- Provide **Keep waiting** and **Leave it with us** actions.
- Closing the page or app cannot lose the request because it was already saved.
- Show a small **Workout in progress** status card on Coach and Logbook while recovery is running.
- If the workout finishes while the member is waiting, open it immediately.
- If it finishes later, place it in the Logbook and create an in-app “Your workout is ready” notification.

## 4. Automatic recovery

- Retry failed requests automatically every **5 minutes**.
- Use exponential backoff with no more than **5 recovery attempts**.
- Preserve the original request and questionnaire answers for every retry.
- Preserve refinement instructions when retrying a refinement.
- Retry WOD requests as WOD requests rather than converting them into normal Coach workouts.
- Run a daily safety sweep for requests that are still waiting without a scheduled retry.
- Once a failed request succeeds, send “Your workout is ready” to the same three recipients:
  - `smartyworkout@outlook.com`
  - `harisforas@gmail.com`
  - The affected member’s email
- The member email contains a direct button to open the completed workout.
- A normal successful generation sends **zero emails**.

The scheduler authorization remains internal and automatic. It is not an email address, is not shown as a user setting, and requires no form submission from you.

## 5. Administrator visibility

Add a **Generation failures** tab to the Admin Panel showing:

- Member
- Date and time
- Request type
- Failure category
- Technical reason
- Retry count and next retry
- Current request status
- Email recipients and delivery status
- Read/unread state

Actions:

- **Mark as read**
- **Send test failure email** to the two fixed administrator addresses only
- **Retry now** for a pending failed request

## 6. Data and security

Store one durable lifecycle record per generation request and a separate failure history. Members can read only their own request status. Administrator-only failure details remain protected. Background services can update lifecycle records and complete retries.

Do not expose technical failure details, internal scheduler credentials, or administrator controls to members.

## 7. Implementation structure

- `src/lib/workout-validation.ts` — soft/structural classification and conflict priority
- `src/lib/workout-generation.server.ts` — durable lifecycle, repair, salvage, retries, and recovery
- `src/lib/workout-generation-alert.server.ts` — fixed three-recipient notifications
- `src/lib/email-templates/` — administrator failure, member delay, administrator recovery, and member-ready emails
- Protected scheduled endpoints for retries and abandoned-request recovery
- Admin failure-management functions and tab
- Pending-generation status UI on Coach and Logbook
- Existing Coach, WOD, and refinement flows routed through the same guarantee

## 8. Acceptance checks

Before completion, verify all of the following:

1. Simulated AI-balance failure creates a durable pending request.
2. Exactly three notifications are attempted: the two fixed administrator addresses and the affected member.
3. The member email contains no technical details.
4. Recovery succeeds automatically after the simulated outage clears.
5. Recovery sends “Your workout is ready” to all three recipients once.
6. A soft validation issue still delivers the workout.
7. A structural issue runs targeted repairs and deterministic salvage.
8. Closing the page does not lose the request.
9. WOD and refinement preserve their original request type during retry.
10. Happy-path generation sends zero emails.
11. Duplicate retries do not create duplicate workouts or duplicate notifications.
12. Admin mark-as-read, test email, and retry-now actions work.
13. Full workout-engine tests pass.
14. Full application build passes.
