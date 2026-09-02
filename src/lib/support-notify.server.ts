/**
 * Fan-out for every inbound support message:
 *  - email notification to the fixed system mailbox (reply-to = the member)
 * No in-app admin notifications: an administrator's personal inbox always
 * shows exactly what a customer sees.
 * Never throws: support actions must not fail because of a notification.
 */
export async function notifyAdminsOfInboundMessage(input: {
  threadId: string;
  messageId?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isReply?: boolean;
}) {
  const { threadId, messageId, name, email, subject, message } = input;

  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("contact-notification", email, {
      templateData: { name, email, subject, message },
      idempotencyKey: `contact-notification-${messageId ?? threadId}`,
      replyTo: email,
    });
  } catch (e) {
    console.error("[support-notify] admin email failed:", e);
  }
}
