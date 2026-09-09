/**
 * Single fan-out for anything that lands in the Admin panel (reports, contact
 * messages, requests, ...): an email to the system mailbox only. Admin alerts
 * are never posted to any personal in-app inbox, so an administrator's own
 * account always shows exactly what a customer sees. Never throws.
 */
export async function notifyAdmins(input: {
  kind: string;
  title: string;
  details: string;
  link?: string;
  dedupeKey: string;
}) {
  const { kind, title, details, link, dedupeKey } = input;

  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("admin-alert", "", {
      templateData: { alertType: kind, title, details, link },
      idempotencyKey: `admin-alert-${dedupeKey}`,
    });
  } catch (e) {
    console.error("[admin-alert] email failed:", e);
  }
}
