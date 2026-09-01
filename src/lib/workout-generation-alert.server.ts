/**
 * Three-recipient alerting for workout generation.
 *
 * A real failure always reaches:
 *   1. the system inbox (smartyworkout@outlook.com)
 *   2. the administrator's personal address (ALERT_BACKUP_EMAIL) so a junk
 *      rule in Outlook can never hide a failure
 *   3. the member — a branded, non-technical apology, sent ONCE per session
 *
 * The happy path sends nothing at all.
 */
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { generationIdempotencyKey, type FailureKind } from "@/lib/workout-validation";

export const SYSTEM_INBOX = "smartyworkout@outlook.com";
export const SUPPORT_REPLY_TO = "smartyworkout@outlook.com";

export function adminRecipients(): string[] {
  return [SYSTEM_INBOX, "harisforas@gmail.com"];
}

export function siteOrigin(): string {
  return (process.env["PUBLIC_SITE_URL"] || "https://smartyworkout.com").replace(/\/$/, "");
}

export const STAGE_LABEL: Record<string, string> = {
  initial: "initial generation",
  wod: "workout of the day",
  refinement: "refinement",
};

export type DeliveryRecord = {
  email_status: string;
  email_error: string | null;
  email_recipient: string;
  email_message_id: string | null;
  email_dispatched_at: string;
};

async function dispatch(
  templateName: string,
  recipient: string,
  templateData: Record<string, unknown>,
  sessionId: string,
): Promise<{ recipient: string; status: string; error: string | null }> {
  try {
    const res = await sendTemplateEmail(templateName, recipient, {
      templateData,
      idempotencyKey: generationIdempotencyKey(sessionId, templateName, recipient),
      replyTo: SUPPORT_REPLY_TO,
    });
    return { recipient, status: res.sent ? "sent" : (res.reason ?? "not_sent"), error: null };
  } catch (e) {
    return {
      recipient,
      status: "error",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export type FailureAlertInput = {
  sessionId: string;
  stage: string;
  reason: string;
  failureKind: FailureKind;
  refinementText?: string | null;
  attempt: number;
  urgent?: boolean;
  notifyCustomer: boolean;
  questionnaireId?: string | null;
  paymentState?: string;
  user: { id: string; email?: string | null; name?: string | null };
};

/** Sends admin + backup + (optionally) member emails. Never throws. */
export async function sendGenerationFailureAlerts(input: FailureAlertInput): Promise<DeliveryRecord> {
  const adminData = {
    urgent: Boolean(input.urgent),
    userName: input.user.name ?? "Unknown",
    userEmail: input.user.email ?? "",
    userId: input.user.id,
    sessionId: input.sessionId,
    questionnaireId: input.questionnaireId ?? "",
    stage: STAGE_LABEL[input.stage] ?? input.stage,
    paymentState: input.paymentState ?? "unknown",
    failureKind: input.failureKind,
    reason: input.reason,
    refinementText: input.refinementText ?? "",
    attempt: input.attempt,
    occurredAt: new Date().toISOString(),
  };

  const results = await Promise.all(
    adminRecipients().map((to) =>
      dispatch("workout-generation-failure", to, { ...adminData }, `${input.sessionId}:${input.attempt}${input.urgent ? ":urgent" : ""}`),
    ),
  );

  if (input.notifyCustomer && input.user.email) {
    results.push(
      await dispatch(
        "workout-delay-customer",
        input.user.email,
        { name: input.user.name ?? "" },
        input.sessionId,
      ),
    );
  }

  return summarise(results);
}

export type RecoveryAlertInput = {
  sessionId: string;
  stage: string;
  attempts: number;
  workoutId: string;
  workoutName: string;
  user: { id: string; email?: string | null; name?: string | null };
};

/** "Your workout is ready" to the member and both admin addresses. Never throws. */
export async function sendGenerationRecoveryAlerts(input: RecoveryAlertInput): Promise<DeliveryRecord> {
  const results = await Promise.all(
    adminRecipients().map((to) =>
      dispatch(
        "workout-ready-admin",
        to,
        {
          userName: input.user.name ?? "Unknown",
          userEmail: input.user.email ?? "",
          userId: input.user.id,
          sessionId: input.sessionId,
          stage: STAGE_LABEL[input.stage] ?? input.stage,
          workoutName: input.workoutName,
          workoutId: input.workoutId,
          attempts: input.attempts,
        },
        input.sessionId,
      ),
    ),
  );

  if (input.user.email) {
    results.push(
      await dispatch(
        "workout-ready-customer",
        input.user.email,
        {
          name: input.user.name ?? "",
          workoutName: input.workoutName,
          workoutUrl: `${siteOrigin()}/workout/${input.workoutId}`,
        },
        input.sessionId,
      ),
    );
  }

  return summarise(results);
}

function summarise(results: { recipient: string; status: string; error: string | null }[]): DeliveryRecord {
  const failed = results.filter((r) => r.status === "error");
  return {
    email_status: failed.length ? (failed.length === results.length ? "error" : "partial") : "sent",
    email_error: failed.length ? failed.map((f) => `${f.recipient}: ${f.error}`).join(" | ") : null,
    email_recipient: results.map((r) => r.recipient).join(", "),
    email_message_id: null,
    email_dispatched_at: new Date().toISOString(),
  };
}
