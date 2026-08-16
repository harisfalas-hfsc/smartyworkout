import { sendTemplateEmail } from "@/lib/email-templates/send-email";

/** Never let an email failure break a support action. */
async function safeSend(
  templateName: string,
  to: string,
  templateData: Record<string, unknown>,
  idempotencyKey: string,
  replyTo?: string,
) {
  try {
    await sendTemplateEmail(templateName, to, { templateData, idempotencyKey, replyTo });
  } catch (e) {
    console.error(`[support-email] ${templateName} failed:`, e);
  }
}

export async function sendContactEmails(input: {
  threadId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const { threadId, name, email, subject, message } = input;
  await Promise.all([
    safeSend(
      "contact-confirmation",
      email,
      { name, subject, message },
      `contact-confirmation-${threadId}`,
    ),
    safeSend(
      "contact-notification",
      email,
      { name, email, subject, message },
      `contact-notification-${threadId}`,
      email,
    ),
  ]);
}

export async function sendSupportReplyEmail(input: {
  messageId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const { messageId, name, email, subject, message } = input;
  await safeSend(
    "support-reply",
    email,
    { name, subject, message },
    `support-reply-${messageId}`,
  );
}
