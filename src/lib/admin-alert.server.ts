import { ADMIN_EMAILS } from "@/lib/admin.server";

/**
 * Single fan-out for anything that lands in the Admin panel (reports, contact
 * messages, requests, ...): an in-app notification for every administrator and
 * an email to the support mailbox. Never throws.
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
        kind: "admin",
        title,
        body: details.slice(0, 300),
        dedupe_key: `${dedupeKey}-${id}`,
      }));
      await supabaseAdmin.from("notifications").insert(rows as never);
    }
  } catch (e) {
    console.error("[admin-alert] in-app notification failed:", e);
  }

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
