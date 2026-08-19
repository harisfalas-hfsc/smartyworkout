import { classifySupportMessage, escalationMessage } from "@/lib/support-autoreply";

const AUTO_REPLY_FOOTER =
  "If this does not answer your question, reply in this conversation. We can answer automatically up to twice. Your third message is sent to Haris for a personal reply within 24–48 hours.\n\n" +
  "Yours in good health,\nHaris Falas, BSc Sports Science, Exo Specialist, CSCS";

/**
 * Instant, credit-free support answering.
 *
 * Runs after every inbound support message: classifies it with the built-in
 * knowledge base, posts the answer into the thread, emails it to the member and
 * copies the whole interaction to the administrator. When the question is
 * outside the knowledge base — or the member keeps writing — the thread is
 * escalated to the administrator instead. Never throws.
 */
export async function autoRespondToSupportMessage(input: {
  threadId: string;
  userId?: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ answered: boolean; escalated: boolean }> {
  const { threadId, name, email, subject, message } = input;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // How many times has this member written in this thread already?
    const { count: inboundCount } = await supabaseAdmin
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("thread_id", threadId)
      .eq("sender", "user");

    const answer = classifySupportMessage(subject, message);
    const tooManyRounds = (inboundCount ?? 1) >= 3;
    const escalated = !answer || tooManyRounds;
    const body = escalated ? escalationMessage() : `${answer?.body ?? ""}\n\n${AUTO_REPLY_FOOTER}`;
    const label = answer?.label ?? "Needs a human";

    const { data: inserted } = await supabaseAdmin
      .from("support_messages")
      .insert({ thread_id: threadId, sender: "admin", body } as never)
      .select("id")
      .single();

    await supabaseAdmin
      .from("support_threads")
      .update({
        user_unread: true,
        admin_unread: escalated,
        status: escalated ? "open" : "answered",
        last_message_at: new Date().toISOString(),
      } as never)
      .eq("id", threadId);

    const userId = input.userId ?? null;
    if (userId) {
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        kind: "support",
        title: escalated
          ? "Your message is with Haris"
          : "Smarty Workout answered your message",
        body: body.slice(0, 240),
        dedupe_key: `support-auto-${(inserted as any)?.id ?? threadId}`,
      } as never);
    }

    // The member gets the answer by email too.
    if (email) {
      try {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("support-reply", email, {
          templateData: { name, subject, message: body },
          idempotencyKey: `support-auto-${(inserted as any)?.id ?? threadId}`,
        });
      } catch (e) {
        console.error("[support-auto] member email failed:", e);
      }
    }

    // The administrator sees the whole interaction, and is told explicitly when
    // a personal reply is expected.
    try {
      const { notifyAdmins } = await import("@/lib/admin-alert.server");
      await notifyAdmins({
        kind: escalated ? "support-escalation" : "support-auto-reply",
        title: escalated
          ? `Reply expected: ${name || email} — ${subject}`
          : `Auto-answered (${label}): ${name || email}`,
        details:
          `From: ${name} <${email}>\nSubject: ${subject}\nTopic: ${label}` +
          (tooManyRounds ? "\nReason: member has written 3+ times in this thread" : "") +
          `\n\n--- Their message ---\n${message}` +
          `\n\n--- ${escalated ? "Holding reply sent" : "Automatic reply sent"} ---\n${body}`,
        link: "/admin",
        dedupeKey: `support-auto-${(inserted as any)?.id ?? threadId}`,
      });
    } catch (e) {
      console.error("[support-auto] admin alert failed:", e);
    }

    return { answered: !escalated, escalated };
  } catch (e) {
    console.error("[support-auto] failed:", e);
    return { answered: false, escalated: true };
  }
}
