import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import type { BrandId } from "@/lib/brand";

/** Never let an email failure break a support action. */
async function safeSend(
  templateName: string,
  to: string,
  templateData: Record<string, unknown>,
  idempotencyKey: string,
  brandId: BrandId | undefined,
  replyTo?: string,
) {
  try {
    await sendTemplateEmail(templateName, to, { templateData, idempotencyKey, replyTo, brandId });
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
  brandId?: BrandId;
}) {
  const { threadId, name, email, subject, message, brandId } = input;
  // No "we received your message" email — the member gets a real answer from
  // the automatic support responder instead (see support-autoreply.server.ts).
  const { notifyAdminsOfInboundMessage } = await import("@/lib/support-notify.server");
  await notifyAdminsOfInboundMessage({ threadId, name, email, subject, message, brandId });
}


export async function sendSupportReplyEmail(input: {
  messageId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  brandId?: BrandId;
}) {
  const { messageId, name, email, subject, message, brandId } = input;
  await safeSend(
    "support-reply",
    email,
    { name, subject, message },
    `support-reply-${messageId}`,
    brandId,
  );
}
