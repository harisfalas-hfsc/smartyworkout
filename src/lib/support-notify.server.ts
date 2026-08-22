import { ADMIN_EMAILS } from "@/lib/admin.server";

/**
 * Fan-out for every inbound support message:
 *  - in-app notification for each administrator (shows in the bell + Admin panel)
 *  - email notification to the fixed support mailbox (reply-to = the member)
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
  const { threadId, messageId, name, email, subject, message, isReply } = input;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = new Set<string>();
    const { data: byEmail } = await supabaseAdmin
      .from("profiles")
      .select("id,email")
      .in("email", ADMIN_EMAILS);
    for (const p of ((byEmail as { id: string }[] | null) ?? [])) ids.add(p.id);
    const { data: byRole } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    for (const r of ((byRole as { user_id: string }[] | null) ?? [])) ids.add(r.user_id);

    if (ids.size) {
      const rows = Array.from(ids).map((id) => ({
        user_id: id,
        kind: "support",
        title: isReply ? `New reply from ${name || email}` : `New message from ${name || email}`,
        body: `${subject}: ${message.slice(0, 200)}`,
        dedupe_key: `support-admin-${messageId ?? threadId}-${id}`,
      }));
      await supabaseAdmin.from("notifications").insert(rows as never);
    }
  } catch (e) {
    console.error("[support-notify] admin notification failed:", e);
  }

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
